// Fallback quote sources, tried in order when Yahoo Finance returns nothing (it rate-limits with HTTP 429).
// Each returns { price, currency, quoteTime, provider } or null. Nothing is estimated: a source that
// cannot confirm a price for the exact symbol returns null.

const NASDAQ_INFO_URL = "https://api.nasdaq.com/api/quote";
const NASDAQ_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

// Nasdaq's API covers US-listed stocks only; suffixed symbols such as WISE.L or 3988.HK belong to other exchanges.
const isUsSymbol = (symbol) => /^[A-Z]{1,5}$/.test(symbol);

function parseUsDollars(text) {
  const match = String(text ?? "")
    .replace(/,/g, "")
    .match(/^\$?\s*(\d+(?:\.\d+)?)$/);
  const value = match ? Number(match[1]) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

// "Nov 17, 2026 12:02 PM ET" -> ISO time. Eastern offset is derived from the month (DST Mar-Nov), which is
// close enough for a quote timestamp; unparseable values return null rather than a guess.
function parseNasdaqTime(text) {
  const match = String(text ?? "").match(
    /^([A-Za-z]{3}) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}) (AM|PM) ET$/,
  );
  if (!match) return null;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months.indexOf(match[1]);
  if (month < 0) return null;
  let hour = Number(match[4]) % 12;
  if (match[6] === "PM") hour += 12;
  const offset = month >= 2 && month <= 9 ? 4 : 5;
  const date = new Date(
    Date.UTC(
      Number(match[3]),
      month,
      Number(match[2]),
      hour + offset,
      Number(match[5]),
    ),
  );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function nasdaqQuote(symbol, fetchImpl = fetch) {
  if (!isUsSymbol(symbol)) return null;
  const response = await fetchImpl(
    `${NASDAQ_INFO_URL}/${encodeURIComponent(symbol)}/info?assetclass=stocks`,
    {
      headers: NASDAQ_HEADERS,
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok)
    throw new Error(`Nasdaq quote returned HTTP ${response.status}.`);
  const body = await response.json();
  if (body?.status?.rCode !== 200) return null;
  const primary = body?.data?.primaryData;
  const price = parseUsDollars(primary?.lastSalePrice);
  if (price === null) return null;
  return {
    price,
    currency: "USD",
    quoteTime: parseNasdaqTime(primary?.lastTradeTimestamp),
    provider: "Nasdaq",
  };
}

const FALLBACK_PROVIDERS = [{ name: "Nasdaq", quote: nasdaqQuote }];

async function fallbackQuote(
  symbol,
  providers = FALLBACK_PROVIDERS,
  log = console,
) {
  for (const provider of providers) {
    try {
      const result = await provider.quote(symbol);
      if (result) return result;
    } catch (error) {
      log.error(
        `${provider.name} quote failed for ${symbol}:`,
        error.message || "unknown error",
      );
    }
  }
  return null;
}

module.exports = {
  fallbackQuote,
  nasdaqQuote,
  parseNasdaqTime,
  parseUsDollars,
  isUsSymbol,
};
