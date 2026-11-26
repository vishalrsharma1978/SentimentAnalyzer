import assert from "node:assert/strict";
import { test } from "node:test";
import { answerQuestion } from "./analyticsBot.ts";

const review = (source, sentiment, rating, text, day = 1) => ({
  source,
  sentiment,
  rating,
  text,
  author: "A",
  publishedAt: `2026-11-${String(day).padStart(2, "0")}T10:00:00.000Z`,
});

const reviews = [
  ...Array.from({ length: 6 }, (_, i) =>
    review("Google Play", "negative", 1, "The fees are too high", 2 + i),
  ),
  ...Array.from({ length: 2 }, (_, i) =>
    review("Google Play", "negative", 2, "App crashes on login", 8 + i),
  ),
  ...Array.from({ length: 10 }, (_, i) =>
    review("Apple App Store", "positive", 5, "Great and fast app", 10 + i),
  ),
  ...Array.from({ length: 2 }, (_, i) =>
    review("Apple App Store", "neutral", 3, "It is okay", 20 + i),
  ),
];

const context = {
  brand: "Acme Pay",
  country: "United States",
  months: 1,
  loading: false,
  ratings: {
    apple: { rating: 4.6, reviewCount: 1200 },
    google: { rating: 3.8, reviewCount: 3400 },
  },
  reviews,
  competitors: [
    {
      name: "Wise",
      rating: 4.8,
      reviewCount: 900,
      source: "Google Play",
      status: "live",
      updatedAt: null,
    },
    {
      name: "Acme Pay",
      rating: 4.2,
      reviewCount: 500,
      source: "Google Play",
      status: "live",
      updatedAt: null,
    },
    {
      name: "Remitly",
      rating: 3.9,
      reviewCount: 700,
      source: "Google Play",
      status: "live",
      updatedAt: null,
    },
  ],
  quotes: [],
  transferFees: {
    corridor: { from: "US", fromCurrency: "USD", to: "MX", toCurrency: "MXN" },
    fees: {
      Wise: {
        provider: "Wise",
        fee: 1.5,
        feeCurrency: "USD",
        exchangeRate: 18,
        midMarketRate: 18,
        totalCostPercent: 0.8,
        receivedAmount: 3580,
        sendAmount: 200,
        sendCurrency: "USD",
        receiveCurrency: "MXN",
        from: "US",
        to: "MX",
        collectedAt: null,
        source: "x",
      },
      "Acme Pay": {
        provider: "Acme Pay",
        fee: 4.99,
        feeCurrency: "USD",
        exchangeRate: 17.5,
        midMarketRate: 18,
        totalCostPercent: 5.2,
        receivedAmount: 3400,
        sendAmount: 200,
        sendCurrency: "USD",
        receiveCurrency: "MXN",
        from: "US",
        to: "MX",
        collectedAt: null,
        source: "x",
      },
    },
  },
  marketScores: [
    { code: "US", name: "United States", score: 4.2 },
    { code: "MX", name: "Mexico", score: 3.1 },
    { code: "GB", name: "United Kingdom", score: 4.6 },
  ],
};

// A crisp answer leads with the verdict and stays short.
const MAX_LINES = 5;
const MAX_LINE_LENGTH = 200;
const answer = (question, overrides = {}) =>
  answerQuestion({ ...context, ...overrides }, question);

test("every answer leads with a one-sentence verdict and stays short", () => {
  for (const question of [
    "executive summary",
    "what are customers complaining about",
    "how do we compare with competitors",
    "which store rates us better",
    "what do the transfer fees look like",
    "which markets perform best and worst",
    "how is sentiment trending",
    "what do customers like",
  ]) {
    const result = answer(question);
    assert.ok(result.lines.length >= 1, question);
    assert.ok(result.lines.length <= MAX_LINES, `${question}: too long`);
    for (const line of result.lines)
      assert.ok(line.length <= MAX_LINE_LENGTH, `${question}: ${line}`);
    assert.ok(result.title.split(" ").length <= 3, `${question}: title`);
  }
});

test("summary gives the verdict, shares, rank and top issue in four lines or fewer", () => {
  const { lines } = answer("executive summary");
  assert.match(
    lines[0],
    /Acme Pay sentiment in United States is mostly positive: 50% positive, 40% negative across 20 reviews \(1 month\)\./,
  );
  assert.match(lines[1], /Rating: 4\.2\/5, #2 of 3 vs competitors\./);
  assert.match(
    lines[2],
    /Top issue: Fees & exchange rates \(6 negative, 75% of complaints\)\./,
  );
});

test("complaints lead with the share and the top theme, then ranked themes with a quote", () => {
  const { lines } = answer("what are customers complaining about");
  assert.equal(
    lines[0],
    "40% of reviews are negative (8); Fees & exchange rates leads with 6.",
  );
  assert.match(
    lines[1],
    /^1\. Fees & exchange rates — 6, e\.g\. “The fees are too high”$/,
  );
  assert.ok(lines.length <= 4);
});

test("competitors state rank and gap to the leader in the first line", () => {
  const { lines } = answer("how do we compare with competitors");
  assert.equal(lines[0], "Acme Pay ranks #2 of 3 (4.2), 0.6 behind Wise.");
  assert.equal(lines[1], "Top: Wise 4.8 · Acme Pay 4.2 · Remitly 3.9");
  assert.equal(lines[2], "Ahead of 1 of 2 competitors.");
});

test("stores name the higher-rated store and the two ratings", () => {
  assert.equal(
    answer("which store rates us better").lines[0],
    "Apple App Store rates the app higher: 4.6 vs 3.8.",
  );
});

test("fees say where the brand ranks on total cost and by how much", () => {
  const { lines } = answer("what do the transfer fees look like");
  assert.equal(
    lines[0],
    "Acme Pay ranks #2 of 2 on cost (5.2%), 4.4 pts above Wise.",
  );
  assert.equal(lines[2], "1. Wise — 0.8% (fee 1.5 USD)");
});

test("markets give best, weakest and spread, without repeating a market in top and bottom", () => {
  const { lines } = answer("which markets perform best and worst");
  assert.equal(
    lines[0],
    "Best: United Kingdom 4.6; weakest: Mexico 3.1 (1.5-star spread across 3 markets).",
  );
  const rest = lines.slice(1).join(" ");
  assert.equal((rest.match(/United States/g) ?? []).length <= 1, true);
});

test("fees are never invented when no quote exists", () => {
  assert.equal(
    answer("what are the fees", { transferFees: null }).lines[0],
    "No live fee quotes for this market's corridor, so I won't estimate any.",
  );
});

test("an unmatched question searches reviews and de-duplicates the quotes it shows", () => {
  const found = answer("anything about crashes?");
  assert.equal(found.title, "Review search");
  assert.match(
    found.lines[0],
    /2 reviews mention it \(10%\): 100% negative, 0% positive\./,
  );
  const quotes = found.lines.slice(1);
  assert.equal(new Set(quotes).size, quotes.length);
  assert.equal(answer("zzzz qqqq").title, "Not sure");
});

test("it asks the user to wait while the model is still loading", () => {
  assert.equal(
    answer("executive summary", { loading: true, reviews: [] }).title,
    "Still collecting data",
  );
});
