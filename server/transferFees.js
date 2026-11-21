// Live transfer fees for money-transfer providers, taken from Wise's public price-comparison feed.
// Each quote is a real provider quote for the same send amount, so providers are comparable.
// The feed is unofficial and can change or be limited; a failure or an uncovered corridor returns
// nothing, and a fee is never estimated.
const COMPARISON_URL = "https://api.wise.com/v4/comparisons/";
const MID_RATE_URL = "https://wise.com/rates/live";
const SEND_AMOUNT = 200;
const CACHE_TTL_MS = 10 * 60 * 1000;
// Providers refresh their quotes at different times; one captured a day ago, compared with today's
// mid-market rate, gives a total cost that can even come out negative. Only recent quotes count.
const MAX_QUOTE_AGE_MS = 6 * 60 * 60 * 1000;

// The sending side of a market's main remittance corridor. Wise needs a currency and country for
// each side. Markets that mostly receive money are priced from the corridor that sends to them.
const CORRIDORS = {
  US: { from: "US", fromCurrency: "USD", to: "MX", toCurrency: "MXN" },
  MX: { from: "US", fromCurrency: "USD", to: "MX", toCurrency: "MXN" },
  IN: { from: "US", fromCurrency: "USD", to: "IN", toCurrency: "INR" },
  PH: { from: "US", fromCurrency: "USD", to: "PH", toCurrency: "PHP" },
  GB: { from: "GB", fromCurrency: "GBP", to: "IN", toCurrency: "INR" },
  DE: { from: "DE", fromCurrency: "EUR", to: "TR", toCurrency: "TRY" },
  FR: { from: "FR", fromCurrency: "EUR", to: "MA", toCurrency: "MAD" },
  IT: { from: "IT", fromCurrency: "EUR", to: "RO", toCurrency: "RON" },
  ES: { from: "ES", fromCurrency: "EUR", to: "CO", toCurrency: "COP" },
  AU: { from: "AU", fromCurrency: "AUD", to: "IN", toCurrency: "INR" },
  CA: { from: "CA", fromCurrency: "CAD", to: "IN", toCurrency: "INR" },
  SG: { from: "SG", fromCurrency: "SGD", to: "IN", toCurrency: "INR" },
  MY: { from: "US", fromCurrency: "USD", to: "MY", toCurrency: "MYR" },
  AE: { from: "US", fromCurrency: "USD", to: "AE", toCurrency: "AED" },
  SA: { from: "US", fromCurrency: "USD", to: "SA", toCurrency: "SAR" },
  BR: { from: "US", fromCurrency: "USD", to: "BR", toCurrency: "BRL" },
  NG: { from: "US", fromCurrency: "USD", to: "NG", toCurrency: "NGN" },
  ZA: { from: "US", fromCurrency: "USD", to: "ZA", toCurrency: "ZAR" },
  EG: { from: "US", fromCurrency: "USD", to: "EG", toCurrency: "EGP" },
  // Remaining markets. Where the feed has no quotes sent from the local currency (JPY, KRW, ISK,
  // CLP, ARS, PAB return no providers), the market is priced from the US corridor that sends to it,
  // like the receiving markets above. Markets the feed cannot price at all stay unlisted.
  JP: { from: "US", fromCurrency: "USD", to: "JP", toCurrency: "JPY" },
  KR: { from: "US", fromCurrency: "USD", to: "KR", toCurrency: "KRW" },
  ID: { from: "US", fromCurrency: "USD", to: "ID", toCurrency: "IDR" },
  SE: { from: "SE", fromCurrency: "SEK", to: "FI", toCurrency: "EUR" },
  NO: { from: "NO", fromCurrency: "NOK", to: "PL", toCurrency: "EUR" },
  DK: { from: "DK", fromCurrency: "DKK", to: "DE", toCurrency: "EUR" },
  FI: { from: "FI", fromCurrency: "EUR", to: "IN", toCurrency: "INR" },
  NL: { from: "NL", fromCurrency: "EUR", to: "TR", toCurrency: "TRY" },
  AR: { from: "US", fromCurrency: "USD", to: "AR", toCurrency: "ARS" },
  CL: { from: "US", fromCurrency: "USD", to: "CL", toCurrency: "CLP" },
  CO: { from: "US", fromCurrency: "USD", to: "CO", toCurrency: "COP" },
  PE: { from: "US", fromCurrency: "USD", to: "PE", toCurrency: "PEN" },
  IS: { from: "DE", fromCurrency: "EUR", to: "IS", toCurrency: "ISK" },
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Store titles carry marketing text ("Remitly: Money transfer app"), so a provider matches when its
// name is the whole title or starts it, never when it is only a word somewhere inside it.
function providerMatches(providerName, appName) {
  const provider = normalize(providerName);
  const app = normalize(appName);
  if (!provider || !app) return false;
  return app === provider || app.startsWith(`${provider} `);
}

function corridorFor(countryCode) {
  return CORRIDORS[String(countryCode || "").toUpperCase()] ?? null;
}

// A quote with no collection time cannot be shown to be current, so it does not count either.
function isRecent(dateCollected, now) {
  const collected = Date.parse(dateCollected);
  return Number.isFinite(collected) && now() - collected <= MAX_QUOTE_AGE_MS;
}

// The cheapest quote for the provider is the one that delivers the most money to the recipient.
function bestQuote(provider, now = Date.now) {
  const quotes = (provider?.quotes ?? []).filter(
    (quote) =>
      Number.isFinite(quote?.fee) &&
      quote.fee >= 0 &&
      Number.isFinite(quote?.rate) &&
      quote.rate > 0 &&
      Number.isFinite(quote?.receivedAmount) &&
      quote.receivedAmount > 0 &&
      isRecent(quote.dateCollected, now),
  );
  return quotes.sort((a, b) => b.receivedAmount - a.receivedAmount)[0] ?? null;
}

// Total cost = what the sender is out of pocket compared with a mid-market conversion: the fee plus
// the exchange-rate margin. `receivedAmount` is after the fee, so value it at the mid-market rate.
function totalCostPercent(sendAmount, receivedAmount, midRate) {
  if (!(midRate > 0) || !(sendAmount > 0)) return null;
  const valueDelivered = receivedAmount / midRate;
  return Number(
    (((sendAmount - valueDelivered) / sendAmount) * 100).toFixed(2),
  );
}

function toFee(provider, quote, corridor, midRate) {
  return {
    provider: provider.name,
    fee: quote.fee,
    feeCurrency: corridor.fromCurrency,
    exchangeRate: quote.rate,
    midMarketRate: midRate,
    totalCostPercent: totalCostPercent(
      SEND_AMOUNT,
      quote.receivedAmount,
      midRate,
    ),
    receivedAmount: quote.receivedAmount,
    sendAmount: SEND_AMOUNT,
    sendCurrency: corridor.fromCurrency,
    receiveCurrency: corridor.toCurrency,
    from: corridor.from,
    to: corridor.to,
    collectedAt: quote.dateCollected ?? null,
    source: "Wise price comparison",
  };
}

const cache = new Map();

// Returns { corridor, fees } where `fees` maps a requested name to its quote, or null when the
// corridor is not covered or the feed is unavailable.
async function collectTransferFees(
  countryCode,
  names,
  { fetchJson = defaultFetchJson, log = console, now = Date.now } = {},
) {
  const corridor = corridorFor(countryCode);
  if (!corridor) return null;
  const key = `${corridor.from}:${corridor.fromCurrency}:${corridor.to}:${corridor.toCurrency}`;
  let entry = cache.get(key);
  if (!entry || now() - entry.storedAt >= CACHE_TTL_MS) {
    try {
      const params = new URLSearchParams({
        sourceCurrency: corridor.fromCurrency,
        targetCurrency: corridor.toCurrency,
        sendAmount: String(SEND_AMOUNT),
        sourceCountry: corridor.from,
        targetCountry: corridor.to,
      });
      const [comparison, rate] = await Promise.all([
        fetchJson(`${COMPARISON_URL}?${params}`),
        fetchJson(
          `${MID_RATE_URL}?source=${corridor.fromCurrency}&target=${corridor.toCurrency}`,
        ),
      ]);
      entry = {
        storedAt: now(),
        providers: Array.isArray(comparison?.providers)
          ? comparison.providers
          : [],
        midRate: Number(rate?.value) > 0 ? Number(rate.value) : null,
      };
      cache.set(key, entry);
    } catch (error) {
      log.error(`Transfer fee lookup failed (${countryCode}):`, error.message);
      // Quotes from a recent successful lookup are still real, just a little older: keep using
      // them rather than dropping the whole market. The 6 hour age limit still applies per quote.
      if (!entry) return null;
    }
  }
  const fees = {};
  for (const name of names) {
    const provider = entry.providers.find((item) =>
      providerMatches(item.name, name),
    );
    const quote = provider ? bestQuote(provider, now) : null;
    fees[name] = quote ? toFee(provider, quote, corridor, entry.midRate) : null;
  }
  return { corridor, fees };
}

// A dropped connection is common on the first request after a restart, so network failures get one
// more attempt. An HTTP error status is an answer from the feed and is not retried.
async function defaultFetchJson(url, attempts = 2) {
  for (let attempt = 1; ; attempt += 1) {
    let response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400));
      continue;
    }
    if (!response.ok)
      throw new Error(`Fee feed returned HTTP ${response.status}`);
    return response.json();
  }
}

module.exports = {
  collectTransferFees,
  corridorFor,
  providerMatches,
  totalCostPercent,
  bestQuote,
  _cache: cache,
};
