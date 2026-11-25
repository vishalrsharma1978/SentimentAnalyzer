import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReport, marketLadderRows, monthlyTrend } from "./reportData.ts";
import { categorizeSentimentReviews } from "./sentimentCategories.ts";

const NOW = new Date("2026-11-21T12:00:00Z");
const daysAgo = (days) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
const review = (text, sentiment, rating, days, source = "Google Play") => ({
  source,
  author: "A",
  text,
  sentiment,
  rating,
  publishedAt: daysAgo(days),
});
const reviews = [
  review("App crashes when I send money", "negative", 1, 2),
  review("Crash on login, fix it", "negative", 2, 5, "Apple App Store"),
  review("High fees and bad exchange rate", "negative", 1, 40),
  review("Great app, fast transfer", "positive", 5, 3),
  review("Love it", "positive", 5, 8),
  review("Works fine", "neutral", 3, 12),
];
const competitors = [
  { name: "Western Union", rating: 4.0, reviewCount: 500, status: "live" },
  { name: "Remitly", rating: 4.8, reviewCount: 1200, status: "live" },
  { name: "Wise", rating: 4.4, reviewCount: 900, status: "live" },
  { name: "Offline", rating: null, reviewCount: null, status: "unavailable" },
];
const markets = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "JP", name: "Japan" },
];
const store = (apple, google) => ({
  apple: { rating: apple, reviewCount: 10 },
  google: { rating: google, reviewCount: 10 },
});
const marketRatings = {
  US: store(4.4, 4.6),
  GB: store(3.6, 3.8),
  DE: store(4.8, 4.8),
  JP: store(2.4, 2.6),
};
const transferFees = {
  corridor: { from: "US", fromCurrency: "USD", to: "MX", toCurrency: "MXN" },
  fees: {
    Wise: {
      provider: "Wise",
      fee: 2.35,
      feeCurrency: "USD",
      exchangeRate: 18.6,
      midMarketRate: 18.9,
      totalCostPercent: 1.5,
      receivedAmount: 3700,
      sendAmount: 200,
      sendCurrency: "USD",
      receiveCurrency: "MXN",
      from: "US",
      to: "MX",
      collectedAt: null,
      source: "Wise price comparison",
    },
    "Western Union": {
      provider: "Western Union",
      fee: 1.99,
      feeCurrency: "USD",
      exchangeRate: 18.2,
      midMarketRate: 18.9,
      totalCostPercent: 5.5,
      receivedAmount: 3600,
      sendAmount: 200,
      sendCurrency: "USD",
      receiveCurrency: "MXN",
      from: "US",
      to: "MX",
      collectedAt: null,
      source: "Wise price comparison",
    },
  },
};
const base = {
  categorize: categorizeSentimentReviews,
  brand: "Western Union",
  countryName: "United States",
  countryCode: "US",
  months: 2,
  brandRating: 4.5,
  competitors,
  reviews,
  quotes: [
    {
      name: "Western Union",
      symbol: "WU",
      price: 9.5,
      currency: "USD",
      quoteTime: "2026-11-21T10:00:00Z",
      status: "live",
    },
    {
      name: "Wise",
      symbol: null,
      price: null,
      currency: null,
      quoteTime: null,
      status: "unavailable",
    },
  ],
  transferFees,
  markets,
  marketRatings,
  now: NOW,
};

test("the executive brief carries KPIs with comparisons and numeric callouts", () => {
  const report = buildReport({ ...base, kind: "executive" });
  const byLabel = Object.fromEntries(
    report.kpis.map((kpi) => [kpi.label, kpi]),
  );
  assert.equal(byLabel["Store rating"].value, "4.5 / 5");
  // Peers are 4.8 and 4.4, so the average is 4.6 and the brand is 0.1 below it.
  assert.equal(byLabel["Store rating"].delta, "-0.10 vs peer average");
  assert.equal(byLabel["Peer rank"].value, "#2 of 3");
  assert.equal(byLabel["Peer rank"].delta, "-0.3 vs Remitly");
  assert.equal(byLabel["Net sentiment"].value, "-17 pp");
  assert.equal(byLabel["Net sentiment"].delta, "33% positive · 50% negative");
  assert.equal(byLabel["Comments analysed"].value, "6");
  assert.ok(report.callouts.length <= 4);
  assert.ok(
    report.callouts.some((item) =>
      /Fix first: Crashes & bugs/.test(item.headline),
    ),
  );
  assert.ok(
    report.callouts.some(
      (item) => item.headline === "#2 of 3 in United States",
    ),
  );
});

test("charts hold the same figures as the KPIs and highlight the brand", () => {
  const report = buildReport({ ...base, kind: "competitive" });
  assert.deepEqual(
    report.ratingBars.map((bar) => [bar.label, bar.display]),
    [
      ["Remitly", "4.8"],
      ["Western Union", "4.5"],
      ["Wise", "4.4"],
    ],
  );
  assert.equal(
    report.ratingBars.find((bar) => bar.highlight).label,
    "Western Union",
  );
  assert.deepEqual(
    report.marketBars.map((bar) => [bar.label, bar.display, bar.tone]),
    [
      ["Germany", "4.8", "good"],
      ["United States", "4.5", "good"],
      ["United Kingdom", "3.7", "watch"],
      ["Japan", "2.5", "risk"],
    ],
  );
  assert.equal(
    report.marketBars.find((bar) => bar.highlight).label,
    "United States",
  );
  assert.deepEqual(
    report.feeBars.map((bar) => [bar.label, bar.display]),
    [
      ["Wise", "1.5%"],
      ["Western Union", "5.5%"],
    ],
  );
  assert.ok(
    report.callouts.some((item) =>
      /Total transfer cost 1\.5% to 5\.5%/.test(item.headline),
    ),
  );
});

test("the competitive review adds peer, share-price, fee and market tables", () => {
  const report = buildReport({ ...base, kind: "competitive" });
  const titles = report.tables.map((table) => table.title);
  assert.ok(titles.includes("Peer comparison"));
  assert.ok(titles.includes("Share prices"));
  assert.ok(titles.includes("Market comparison"));
  assert.ok(titles.some((title) => title.startsWith("Transfer fees · US→MX")));
  const peers = report.tables.find(
    (table) => table.title === "Peer comparison",
  );
  assert.deepEqual(peers.rows[0].cells, [
    "1",
    "Remitly",
    "4.8",
    "+0.3",
    "1,200",
  ]);
  assert.equal(peers.rows[1].highlight, true);
  const prices = report.tables.find((table) => table.title === "Share prices");
  assert.equal(prices.rows.length, 1);
  assert.equal(report.sentiment, null);
});

test("the customer voice report has the split, trend, themes and quotes", () => {
  const report = buildReport({ ...base, kind: "customer" });
  assert.deepEqual(report.sentiment, {
    positive: 2,
    neutral: 1,
    negative: 3,
    total: 6,
  });
  assert.equal(report.ratingBars, null);
  assert.equal(report.feeBars, null);
  assert.equal(report.themeBars[0].label, "Crashes & bugs");
  assert.equal(report.themeBars[0].display, "2 (67%)");
  assert.equal(report.quotes.filter((quote) => quote.rating <= 2).length, 3);
  assert.equal(report.quotes.filter((quote) => quote.rating >= 4).length, 2);
  assert.equal(report.quotes[0].text, "App crashes when I send money");
  const themes = report.tables.find((table) => table.title === "Issue themes");
  assert.ok(themes.rows.length > 0);
});

test("monthlyTrend buckets dated comments by month and ignores undated or future ones", () => {
  const trend = monthlyTrend(
    [
      ...reviews,
      {
        ...review("future", "positive", 5, 0),
        publishedAt: "2027-01-01T00:00:00Z",
      },
      { ...review("undated", "positive", 5, 0), publishedAt: null },
    ],
    2,
    NOW,
  );
  assert.deepEqual(
    trend.map((month) => month.label),
    ["Sep", "Oct", "Nov"],
  );
  const november = trend[trend.length - 1];
  assert.equal(november.positive, 2);
  assert.equal(november.negative, 2);
  // Six dated comments are inside the two-month window; the future and undated ones are dropped.
  assert.equal(
    trend.reduce((sum, month) => sum + month.total, 0),
    6,
  );
  assert.equal(november.net, 0);
});

test("missing data is listed under 'not included' and never estimated", () => {
  const report = buildReport({
    ...base,
    kind: "competitive",
    reviews: [],
    brandRating: null,
    competitors: [],
    quotes: [],
    transferFees: null,
    markets: [{ code: "US", name: "United States" }],
    marketRatings: { US: store(4.4, 4.6) },
  });
  assert.equal(report.ratingBars, null);
  assert.equal(report.marketBars, null);
  assert.equal(report.feeBars, null);
  assert.equal(report.kpis.length, 0);
  assert.ok(report.gaps.some((gap) => /No customer comments/.test(gap)));
  assert.ok(report.gaps.some((gap) => /No verified store rating/.test(gap)));
  assert.ok(report.gaps.some((gap) => /No rated peers/.test(gap)));
  assert.ok(report.gaps.some((gap) => /No live share prices/.test(gap)));
  assert.ok(report.gaps.some((gap) => /Fewer than two markets/.test(gap)));
});

test("peer names drop store marketing text and a near-zero gap never prints as -0.0", () => {
  const report = buildReport({
    ...base,
    kind: "competitive",
    brandRating: 4.8,
    competitors: [
      { name: "Western Union", rating: 4.8, reviewCount: 1, status: "live" },
      {
        name: "Remitly: Money transfer app",
        rating: 4.8,
        reviewCount: 9,
        status: "live",
      },
      { name: "Cash App", rating: 4.79, reviewCount: 5, status: "live" },
    ],
  });
  const peers = report.tables.find(
    (table) => table.title === "Peer comparison",
  );
  // On a tie the brand stays first, and the peer name shows without the store's marketing text.
  assert.equal(peers.rows[0].cells[1], "Western Union");
  assert.equal(peers.rows[1].cells[1], "Remitly");
  assert.ok(report.ratingBars.some((bar) => bar.label === "Remitly"));
  assert.ok(peers.rows.every((row) => !row.cells.includes("-0.0")));
  assert.ok(peers.rows.some((row) => row.cells[3] === "0.0"));
  assert.ok(
    report.kpis.some(
      (kpi) =>
        kpi.delta === "0.0 vs Remitly" || kpi.delta === "Category leader",
    ),
  );
});

test("marketLadderRows skips unrated markets and sorts best first", () => {
  const rows = marketLadderRows(markets, { ...marketRatings, JP: undefined });
  assert.deepEqual(
    rows.map((row) => row.code),
    ["DE", "US", "GB"],
  );
});

test("competitive reports compare curated feature coverage and call out edges and gaps", () => {
  const report = buildReport({ ...base, kind: "competitive" });
  const coverage = report.kpis.find((kpi) => kpi.label === "Feature coverage");
  assert.ok(coverage, "feature coverage KPI present");
  assert.match(coverage.value, /^\d+%$/);
  assert.match(coverage.delta, /peer average \d+%/);
  const featureTable = report.tables.find(
    (table) => table.title === "Feature map · curated capabilities",
  );
  assert.ok(featureTable, "feature table present");
  assert.deepEqual(featureTable.headers.slice(0, 2), [
    "Feature",
    "Western Union",
  ]);
  assert.ok(featureTable.headers.includes("Wise"));
  const cashPickup = featureTable.rows.find(
    (row) => row.cells[0] === "Cash pickup",
  );
  assert.equal(cashPickup.cells[1], "Yes");
  assert.ok(
    report.callouts.some((callout) =>
      callout.headline.startsWith("Feature edge:"),
    ),
  );
  assert.ok(
    report.callouts.some((callout) =>
      callout.headline.startsWith("Feature gap:"),
    ),
  );
});

test("customer reports include no feature comparison", () => {
  const report = buildReport({ ...base, kind: "customer" });
  assert.ok(!report.kpis.some((kpi) => kpi.label === "Feature coverage"));
  assert.ok(
    !report.tables.some((table) => table.title.startsWith("Feature map")),
  );
});
