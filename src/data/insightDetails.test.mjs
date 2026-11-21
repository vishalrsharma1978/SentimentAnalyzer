import assert from "node:assert/strict";
import { test } from "node:test";
import {
  actionDetail,
  pickQuotes,
  prioritySignalDetail,
  ratingGapDetail,
  sentimentDetail,
} from "./insightDetails.ts";
import { categorizeSentimentReviews } from "./sentimentCategories.ts";

const review = (
  text,
  sentiment,
  rating,
  publishedAt,
  source = "Google Play",
) => ({
  source,
  author: "A",
  text,
  sentiment,
  rating,
  publishedAt,
});
const reviews = [
  review(
    "App crashes when I send money",
    "negative",
    1,
    "2026-11-10T00:00:00Z",
  ),
  review(
    "Crash on login, very slow",
    "negative",
    2,
    "2026-11-18T00:00:00Z",
    "Apple App Store",
  ),
  review(
    "High fees and bad exchange rate",
    "negative",
    1,
    "2026-11-05T00:00:00Z",
  ),
  review("Great app, fast transfer", "positive", 5, "2026-11-15T00:00:00Z"),
  review("Works fine", "neutral", 3, "2026-11-12T00:00:00Z"),
];
const categories = categorizeSentimentReviews(reviews);

test("pickQuotes returns the most recent comments of the requested sentiment only", () => {
  const quotes = pickQuotes(reviews, "negative", 2);
  assert.equal(quotes.length, 2);
  assert.equal(quotes[0].text, "Crash on login, very slow");
  assert.equal(quotes[0].date, "2026-11-18");
  assert.ok(quotes.every((quote) => quote.rating <= 2));
});

test("pickQuotes shortens long comments and skips empty ones", () => {
  const long = review("x".repeat(500), "positive", 5, "2026-11-01T00:00:00Z");
  const [quote] = pickQuotes(
    [long, review("   ", "positive", 5, null)],
    "positive",
  );
  assert.ok(quote.text.length <= 220);
  assert.ok(quote.text.endsWith("…"));
  assert.equal(
    pickQuotes([review("   ", "positive", 5, null)], "positive").length,
    0,
  );
});

test("sentimentDetail explains the share, splits it by source and gives a next step", () => {
  const detail = sentimentDetail(reviews, "negative", categories);
  assert.match(
    detail.explanation,
    /3 of 5 collected comments are negative \(60%\)/,
  );
  assert.ok(
    detail.rows.some(
      (row) =>
        row.label === "Google Play · negative" && row.value === "2 (67%)",
    ),
  );
  assert.ok(detail.rows.some((row) => row.label.startsWith("Theme ·")));
  assert.equal(detail.quotes.length, 3);
  assert.match(detail.nextStep, /^Start with /);
  assert.equal(sentimentDetail(reviews, "positive", categories).nextStep, null);
});

test("prioritySignalDetail names the top category and handles none", () => {
  const top = categories
    .filter((item) => item.negative > 0)
    .sort((a, b) => b.negative - a.negative)[0];
  const detail = prioritySignalDetail(top, 3);
  assert.match(
    detail.explanation,
    new RegExp(`^${top.label} has the most negative comments`),
  );
  assert.ok(detail.quotes.every((quote) => quote.rating <= 2));
  const none = prioritySignalDetail(undefined, 0);
  assert.equal(none.rows.length, 0);
  assert.equal(none.nextStep, null);
});

test("ratingGapDetail compares with the best peer and refuses to guess without data", () => {
  const peers = [
    { name: "Western Union", rating: 4.0, reviewCount: 10 },
    { name: "Wise", rating: 4.6, reviewCount: 2000 },
    { name: "Remitly", rating: 4.8, reviewCount: 1200 },
    { name: "Unrated", rating: null, reviewCount: null },
  ];
  const detail = ratingGapDetail("Western Union", 4.5, peers);
  assert.match(detail.explanation, /a gap of -0\.3/);
  assert.equal(detail.rows[0].label, "Western Union");
  assert.equal(detail.rows[1].label, "Remitly");
  assert.ok(!detail.rows.some((row) => row.label === "Unrated"));
  assert.match(detail.nextStep, /0\.3 point gap to Remitly/);
  assert.equal(ratingGapDetail("Western Union", null, peers).rows.length, 0);
  assert.equal(ratingGapDetail("Western Union", 4.5, []).nextStep, null);
});

test("actionDetail reports the category's share of negative comments", () => {
  const crash = categories.find((item) => item.id === "stability");
  const detail = actionDetail(crash, 3);
  assert.match(detail.explanation, /2 of 3 negative comments \(67%\)/);
  assert.ok(detail.rows.some((row) => row.label === "Positive mentions"));
  assert.equal(detail.quotes.length, 2);
});
