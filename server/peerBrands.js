// Store titles carry marketing text ("Remitly: Money transfer app", "PayPal - Pay, Send, Save").
// This reduces a title to the company name so listings and regional peers can be matched reliably.
const TITLE_SPLIT = /\s*(?::|\s[-–—|]\s|\s·\s)\s*/;
const TRAILING_NOISE =
  /\s+(mobile banking|mobile|money transfer|send money|app|online|wallet|bank)$/i;

function cleanBrandTitle(title) {
  let name = String(title ?? "")
    .replace(/[®™©]/g, "")
    .trim();
  name = name.split(TITLE_SPLIT)[0].trim();
  let previous;
  do {
    previous = name;
    name = name.replace(TRAILING_NOISE, "").trim();
  } while (name && name !== previous);
  return name;
}

// Listed companies per region that a money-transfer brand competes with. Only brands with a
// verified public listing belong here; private companies are never given a price.
const LISTED_PEERS = {
  "Western Union": "WU",
  Wise: "WISE.L",
  Remitly: "RELY",
  PayPal: "PYPL",
  "Al Ansari Exchange": "ALANSARI.AE",
  Euronet: "EEFT",
  Intermex: "IMXI",
  "International Money Express": "IMXI",
  Block: "XYZ",
  "Bank of China": "3988.HK",
  Citibank: "C",
  "Wells Fargo": "WFC",
  UBS: "UBS",
};

// Peers a brand's market is known to include, so regional competitors are not missed when the
// store search surfaces only a few. Each entry is searched in that country's own store.
const REGIONAL_PEERS = {
  money_transfer: {
    default: ["Remitly", "Wise", "PayPal", "MoneyGram", "Xoom"],
    US: ["Remitly", "Wise", "MoneyGram", "Xoom", "Intermex", "Zelle"],
    CA: ["Remitly", "Wise", "MoneyGram", "Xoom"],
    MX: ["Remitly", "Intermex", "MoneyGram", "Western Union"],
    BR: ["Remitly", "Wise", "MoneyGram"],
    GB: ["Wise", "Remitly", "WorldRemit", "Revolut", "Monzo"],
    DE: ["Wise", "Remitly", "WorldRemit", "N26"],
    FR: ["Wise", "Remitly", "WorldRemit", "Revolut"],
    ES: ["Wise", "Remitly", "WorldRemit", "Revolut"],
    IN: ["Wise", "Remitly", "BookMyForex", "PayPal", "Paytm"],
    PH: ["GCash", "Remitly", "Wise", "PayPal", "Maya"],
    AE: ["Al Ansari Exchange", "Wise", "Remitly", "Revolut"],
    SA: ["Al Ansari Exchange", "Remitly", "STC Pay"],
    AU: ["Wise", "Remitly", "WorldRemit", "OFX"],
    SG: ["Wise", "Remitly", "Revolut", "GrabPay"],
    JP: ["Wise", "Remitly", "PayPay"],
  },
};

const MONEY_TRANSFER_BRANDS = new Set([
  "western union",
  "wise",
  "remitly",
  "moneygram",
  "xoom",
  "worldremit",
  "ria",
  "ria money transfer",
  "intermex",
  "international money express",
  "euronet",
  "al ansari exchange",
  "gcash",
]);

const isMoneyTransferBrand = (brand) =>
  MONEY_TRANSFER_BRANDS.has(
    String(brand ?? "")
      .trim()
      .toLowerCase(),
  );

function regionalPeerNames(brand, country) {
  if (!isMoneyTransferBrand(brand)) return [];
  const table = REGIONAL_PEERS.money_transfer;
  const own = String(brand).trim().toLowerCase();
  return (table[String(country).toUpperCase()] || table.default).filter(
    (name) => name.toLowerCase() !== own,
  );
}

// Case-insensitive lookup so "wise" and "Wise" resolve to the same listing.
function listedSymbol(name) {
  const wanted = cleanBrandTitle(name).toLowerCase();
  const key = Object.keys(LISTED_PEERS).find(
    (candidate) => candidate.toLowerCase() === wanted,
  );
  return key ? LISTED_PEERS[key] : null;
}

module.exports = {
  cleanBrandTitle,
  isMoneyTransferBrand,
  listedSymbol,
  regionalPeerNames,
  LISTED_PEERS,
};
