const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");
const {
  _cache,
  bestQuote,
  collectTransferFees,
  corridorFor,
  providerMatches,
  totalCostPercent,
} = require("./transferFees");

const quiet = { error() {} };
const COLLECTED = "2026-11-20T05:37:03Z";
// A clock one hour after the quotes were collected, so they count as recent.
const now = () => Date.parse(COLLECTED) + 60 * 60 * 1000;
const quote = (fee, rate, receivedAmount, dateCollected = COLLECTED) => ({
  fee,
  rate,
  receivedAmount,
  dateCollected,
});
const feed =
  (providers, midRate = 20) =>
  async (url) =>
    url.includes("comparisons") ? { providers } : { value: midRate };

beforeEach(() => _cache.clear());

test("store titles match a provider by its full name, never by a word inside the title", () => {
  assert.equal(providerMatches("Remitly", "Remitly: Money transfer app"), true);
  assert.equal(
    providerMatches("Western Union", "Western Union Send Money"),
    true,
  );
  assert.equal(providerMatches("Xoom", "Xoom: Send Money & Transfer"), true);
  assert.equal(providerMatches("Wise", "Wise: International Transfers"), true);
  assert.equal(providerMatches("Wise", "Otherwise Money App"), false);
  assert.equal(providerMatches("PayPal", "Venmo by PayPal"), false);
  assert.equal(providerMatches("", "Remitly"), false);
});

test("total cost is the fee plus the exchange-rate margin against the mid-market rate", () => {
  // 200 sent, 3,700 received at a mid rate of 20 -> worth 185 -> 7.5% lost.
  assert.equal(totalCostPercent(200, 3700, 20), 7.5);
  assert.equal(totalCostPercent(200, 4000, 20), 0);
  assert.equal(totalCostPercent(200, 3700, 0), null);
  assert.equal(totalCostPercent(0, 3700, 20), null);
});

test("the best quote delivers the most money and malformed quotes are ignored", () => {
  const best = bestQuote(
    {
      quotes: [quote(2, 19, 3700), quote(1, 19.5, 3800), { fee: "x", rate: 1 }],
    },
    now,
  );
  assert.equal(best.receivedAmount, 3800);
  assert.equal(
    bestQuote(
      {
        quotes: [
          { fee: -1, rate: 1, receivedAmount: 5, dateCollected: COLLECTED },
        ],
      },
      now,
    ),
    null,
  );
  assert.equal(bestQuote({ quotes: [] }, now), null);
  assert.equal(bestQuote(undefined, now), null);
});

test("a quote that is more than six hours old, or has no collection time, is not used", () => {
  const hours = (count) =>
    new Date(Date.parse(COLLECTED) + count * 60 * 60 * 1000).toISOString();
  const at = (count) => () => Date.parse(COLLECTED) + count * 60 * 60 * 1000;
  const provider = { quotes: [quote(1, 19, 3800)] };
  assert.notEqual(bestQuote(provider, at(5.9)), null);
  assert.equal(bestQuote(provider, at(6.1)), null);
  assert.equal(
    bestQuote(
      { quotes: [{ ...quote(1, 19, 3800), dateCollected: undefined }] },
      now,
    ),
    null,
  );
  assert.equal(
    bestQuote(
      { quotes: [{ ...quote(1, 19, 3800), dateCollected: "not a date" }] },
      now,
    ),
    null,
  );
  // A stale quote is skipped in favour of a fresh one from the same provider.
  const mixed = {
    quotes: [quote(1, 19.5, 9999, hours(-20)), quote(2, 19, 3700)],
  };
  assert.equal(bestQuote(mixed, now).receivedAmount, 3700);
});

test("only markets with a known corridor are priced", () => {
  assert.equal(corridorFor("us").fromCurrency, "USD");
  assert.equal(corridorFor("GB").to, "IN");
  assert.equal(corridorFor("JP").toCurrency, "JPY");
  assert.equal(corridorFor("AE").from, "US");
  assert.equal(corridorFor("PA"), null);
  assert.equal(corridorFor(""), null);
});

test("collects a real fee, rate and total cost for each matching provider", async () => {
  const result = await collectTransferFees(
    "US",
    ["Western Union", "Remitly: Money transfer app", "Intermex"],
    {
      log: quiet,
      now,
      fetchJson: feed([
        { name: "Western Union", quotes: [quote(1.99, 18.6, 3688.27)] },
        { name: "Remitly", quotes: [quote(1.99, 18.5, 3663.19)] },
      ]),
    },
  );
  const wu = result.fees["Western Union"];
  assert.equal(wu.fee, 1.99);
  assert.equal(wu.feeCurrency, "USD");
  assert.equal(wu.exchangeRate, 18.6);
  assert.equal(
    wu.totalCostPercent,
    Number((((200 - 3688.27 / 20) / 200) * 100).toFixed(2)),
  );
  assert.equal(wu.source, "Wise price comparison");
  assert.equal(result.fees["Remitly: Money transfer app"].provider, "Remitly");
  // A provider the feed does not list gets nothing, never an estimate.
  assert.equal(result.fees.Intermex, null);
});

test("an uncovered corridor or a failing feed returns nothing instead of a guess", async () => {
  assert.equal(await collectTransferFees("PA", ["Wise"], { log: quiet }), null);
  const result = await collectTransferFees("US", ["Wise"], {
    log: quiet,
    fetchJson: async () => {
      throw new Error("HTTP 429");
    },
  });
  assert.equal(result, null);
});

test("a corridor with no providers yields no fees for anyone", async () => {
  const result = await collectTransferFees("AE", ["Western Union"], {
    log: quiet,
    now,
    fetchJson: feed([]),
  });
  assert.equal(result.fees["Western Union"], null);
});

test("a provider whose only quote is stale gets no fee instead of a misleading one", async () => {
  const result = await collectTransferFees("US", ["Xoom", "Wise"], {
    log: quiet,
    now,
    fetchJson: feed([
      {
        name: "Xoom",
        quotes: [quote(0, 19.45, 3890.76, "2026-11-19T05:37:03Z")],
      },
      { name: "Wise", quotes: [quote(2.35, 19.163, 3787.57)] },
    ]),
  });
  assert.equal(result.fees.Xoom, null);
  assert.equal(result.fees.Wise.fee, 2.35);
});

test("quotes are cached per corridor and refreshed after ten minutes", async () => {
  let calls = 0;
  let clock = Date.parse(COLLECTED) + 60 * 60 * 1000;
  const fetchJson = async (url) => {
    calls += 1;
    return url.includes("comparisons")
      ? { providers: [{ name: "Wise", quotes: [quote(2, 19, 3800)] }] }
      : { value: 20 };
  };
  const options = { log: quiet, fetchJson, now: () => clock };
  await collectTransferFees("US", ["Wise"], options);
  await collectTransferFees("MX", ["Wise"], options); // same US-MX corridor
  assert.equal(calls, 2);
  clock += 11 * 60 * 1000;
  await collectTransferFees("US", ["Wise"], options);
  assert.equal(calls, 4);
});

test("a failed refresh keeps the recent quotes, but a failure with nothing cached returns nothing", async () => {
  let clock = Date.parse(COLLECTED) + 60 * 60 * 1000;
  let failing = false;
  const fetchJson = async (url) => {
    if (failing) throw new Error("fetch failed");
    return url.includes("comparisons")
      ? { providers: [{ name: "Wise", quotes: [quote(2, 19, 3800)] }] }
      : { value: 20 };
  };
  const options = { log: quiet, fetchJson, now: () => clock };
  failing = true;
  assert.equal(await collectTransferFees("US", ["Wise"], options), null);
  failing = false;
  const first = await collectTransferFees("US", ["Wise"], options);
  assert.equal(first.fees.Wise.fee, 2);
  // The cache expires, the refresh fails, and the earlier real quote is still used.
  clock += 11 * 60 * 1000;
  failing = true;
  const second = await collectTransferFees("US", ["Wise"], options);
  assert.equal(second.fees.Wise.fee, 2);
  // Once the quote is older than six hours it is no longer shown.
  clock += 6 * 60 * 60 * 1000;
  const third = await collectTransferFees("US", ["Wise"], options);
  assert.equal(third.fees.Wise, null);
});
