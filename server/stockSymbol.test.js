const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  matchEquitySymbol,
  normalizeCompanyName,
  resolveStockSymbol,
} = require("./stockSymbol");

const equity = (symbol, longname, shortname = longname) => ({
  symbol,
  quoteType: "EQUITY",
  longname,
  shortname,
});

test("normalizes legal suffixes so a brand matches its listed company name", () => {
  assert.equal(
    normalizeCompanyName("The Western Union Company"),
    "western union",
  );
  assert.equal(normalizeCompanyName("Wise Group plc"), "wise");
  assert.equal(normalizeCompanyName("Block, Inc."), "block");
});

test("accepts only an equity whose company name is the brand", () => {
  const quotes = [
    {
      symbol: "WISE",
      quoteType: "ETF",
      longname: "Themes Generative Artificial Intelligence ETF",
      shortname: "Themes",
    },
    {
      symbol: "FBTC",
      quoteType: "ETF",
      longname: "Fidelity Wise Origin Bitcoin Fund",
    },
    equity("WSE", "Wise Group plc"),
  ];
  assert.equal(matchEquitySymbol("Wise", quotes), "WSE");
});

test("rejects similar but different companies and non-stock instruments", () => {
  assert.equal(
    matchEquitySymbol("Acme", [equity("ACU", "Acme United Corporation")]),
    null,
  );
  assert.equal(
    matchEquitySymbol("Block", [equity("HRB", "H&R Block, Inc.")]),
    null,
  );
  assert.equal(
    matchEquitySymbol("Acme", [
      { symbol: "X.LU", quoteType: "MUTUALFUND", longname: "Acme" },
    ]),
    null,
  );
  assert.equal(matchEquitySymbol("", [equity("WU", "Western Union")]), null);
  assert.equal(matchEquitySymbol("Acme", undefined), null);
});

test("a short display name alone never proves the company is the brand", () => {
  const acmeUnited = equity("ACU", "Acme United Corporation", "Acme");
  assert.equal(matchEquitySymbol("Acme", [acmeUnited]), null);
  assert.equal(matchEquitySymbol("Acme United", [acmeUnited]), "ACU");
});

test("resolveStockSymbol searches by brand and returns null when nothing matches", async () => {
  const search = async (query) => ({
    quotes: query === "Block" ? [equity("XYZ", "Block, Inc.")] : [],
  });
  assert.equal(await resolveStockSymbol("Block", search), "XYZ");
  assert.equal(await resolveStockSymbol("Unknown Brand", search), null);
});
