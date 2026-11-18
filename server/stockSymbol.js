// Resolves a brand to a listed equity symbol without guessing: a search hit is accepted only when
// it is a stock and its full legal name is the brand itself (ignoring legal suffixes such as Inc or plc).
// shortname is not used: Yahoo abbreviates it (Acme United Corporation -> "Acme"), which would match the wrong company.
const LEGAL_WORDS = new Set([
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "co",
  "company",
  "the",
  "ltd",
  "limited",
  "plc",
  "llc",
  "lp",
  "ag",
  "sa",
  "nv",
  "se",
  "group",
  "holdings",
  "holding",
  "cls",
  "ord",
  "class",
  "a",
]);

function normalizeCompanyName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word && !LEGAL_WORDS.has(word))
    .join(" ");
}

function matchEquitySymbol(brand, quotes) {
  const wanted = normalizeCompanyName(brand);
  if (!wanted || !Array.isArray(quotes)) return null;
  const hit = quotes.find(
    (item) =>
      item &&
      typeof item.symbol === "string" &&
      item.quoteType === "EQUITY" &&
      normalizeCompanyName(item.longname) === wanted,
  );
  return hit ? hit.symbol : null;
}

async function resolveStockSymbol(brand, search) {
  const result = await search(brand);
  return matchEquitySymbol(brand, result?.quotes);
}

module.exports = {
  matchEquitySymbol,
  normalizeCompanyName,
  resolveStockSymbol,
};
