import assert from "node:assert/strict";
import { test } from "node:test";
import { STARTER_QUESTIONS, answerQuestion } from "./analyticsBot.ts";

const context = {
  brand: "Acme Pay",
  country: "United States",
  months: 1,
  loading: false,
  ratings: {
    apple: { rating: 4.6, reviewCount: 10 },
    google: { rating: 3.8, reviewCount: 10 },
  },
  reviews: [
    {
      source: "Google Play",
      sentiment: "negative",
      rating: 1,
      text: "The fees are too high",
      author: "A",
      publishedAt: "2026-11-02T10:00:00.000Z",
    },
    {
      source: "Apple App Store",
      sentiment: "positive",
      rating: 5,
      text: "Great and fast app",
      author: "B",
      publishedAt: "2026-11-03T10:00:00.000Z",
    },
  ],
  competitors: [],
  quotes: [],
  transferFees: null,
  marketScores: [{ code: "US", name: "United States", score: 4.2 }],
};

// Every suggested question must reach the topic it advertises.
const EXPECTED_TITLE = {
  "Give me an executive summary": /^Summary$/,
  "What are customers complaining about?": /^Complaints$/,
  "How do we compare with competitors?": /^Competitors$/,
  "Which store rates us better?": /^Stores$/,
  "What do the transfer fees look like?": /^Fees$/,
  "Which markets perform best and worst?": /^Markets$/,
};

test("each starter question is routed to the topic it names", () => {
  for (const question of STARTER_QUESTIONS) {
    const answer = answerQuestion(context, question);
    assert.match(answer.title, EXPECTED_TITLE[question], question);
  }
});

test("free-form phrasings reach the right analysis", () => {
  const cases = [
    ["how much does it cost to send money", /^Fees$/],
    ["what do people love about the app", /^Strengths$/],
    ["is sentiment getting better over time", /^Trend$/],
    ["which countries are weakest", /^Markets$/],
    ["who is the market leader", /^Competitors$/],
  ];
  for (const [question, title] of cases) {
    assert.match(answerQuestion(context, question).title, title, question);
  }
});
