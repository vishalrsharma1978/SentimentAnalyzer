const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  fallbackQuote,
  isUsSymbol,
  nasdaqQuote,
  parseNasdaqTime,
  parseUsDollars,
} = require("./quoteFallback");

const reply =
  (body, status = 200) =>
  async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
const nasdaqBody = (price, time = "Nov 17, 2026 12:02 PM ET") => ({
  data: { primaryData: { lastSalePrice: price, lastTradeTimestamp: time } },
  status: { rCode: 200 },
});
const quiet = { error() {} };

test("only plain US ticker symbols go to Nasdaq", () => {
  assert.equal(isUsSymbol("WU"), true);
  assert.equal(isUsSymbol("RELY"), true);
  assert.equal(isUsSymbol("WISE.L"), false);
  assert.equal(isUsSymbol("3988.HK"), false);
  assert.equal(isUsSymbol(""), false);
});

test("parses dollar prices and refuses anything that is not a positive number", () => {
  assert.equal(parseUsDollars("$6.28"), 6.28);
  assert.equal(parseUsDollars("$1,234.50"), 1234.5);
  assert.equal(parseUsDollars("N/A"), null);
  assert.equal(parseUsDollars("$0"), null);
  assert.equal(parseUsDollars(undefined), null);
});

test("converts the Nasdaq timestamp to UTC and rejects other formats", () => {
  assert.equal(
    parseNasdaqTime("Nov 17, 2026 12:02 PM ET"),
    "2026-11-17T17:02:00.000Z",
  );
  assert.equal(
    parseNasdaqTime("Jul 1, 2026 9:30 AM ET"),
    "2026-07-01T13:30:00.000Z",
  );
  assert.equal(parseNasdaqTime("yesterday"), null);
});

test("nasdaqQuote returns a USD price with its provider and time", async () => {
  const quote = await nasdaqQuote("WU", reply(nasdaqBody("$6.28")));
  assert.deepEqual(quote, {
    price: 6.28,
    currency: "USD",
    quoteTime: "2026-11-17T17:02:00.000Z",
    provider: "Nasdaq",
  });
});

test("nasdaqQuote never invents a price for unknown symbols, errors or non-US symbols", async () => {
  const missing = {
    status: {
      rCode: 400,
      bCodeMessage: [{ errorMessage: "Symbol not exists." }],
    },
  };
  assert.equal(await nasdaqQuote("NOPE", reply(missing)), null);
  assert.equal(await nasdaqQuote("WU", reply(nasdaqBody("N/A"))), null);
  assert.equal(
    await nasdaqQuote("WISE.L", () => {
      throw new Error("must not be called");
    }),
    null,
  );
  await assert.rejects(() => nasdaqQuote("WU", reply({}, 503)), /HTTP 503/);
});

test("fallbackQuote tries providers in order, skips failures and returns null when none confirm a price", async () => {
  const broken = {
    name: "Broken",
    quote: async () => {
      throw new Error("offline");
    },
  };
  const empty = { name: "Empty", quote: async () => null };
  const good = {
    name: "Good",
    quote: async (symbol) => ({
      price: 10,
      currency: "USD",
      quoteTime: null,
      provider: symbol,
    }),
  };
  assert.equal(
    (await fallbackQuote("WU", [broken, empty, good], quiet)).price,
    10,
  );
  assert.equal(await fallbackQuote("WU", [broken, empty], quiet), null);
  assert.equal(await fallbackQuote("WU", [], quiet), null);
});
