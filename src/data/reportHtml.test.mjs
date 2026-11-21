import assert from "node:assert/strict";
import { test } from "node:test";
import { reportToHtml } from "./reportHtml.ts";

const report = {
  kind: "executive",
  title: "Executive brief · <Acme & Co>",
  subtitle: "Where the brand stands · United States",
  generatedAt: "2026-11-21T12:00:00Z",
  kpis: [
    {
      label: "Store rating",
      value: "4.5 / 5",
      delta: "-0.10 vs peer average",
      tone: "watch",
    },
    { label: "Net sentiment", value: "-25 pp", delta: null, tone: "risk" },
  ],
  callouts: [
    {
      tone: "risk",
      headline: "Fix first: Crashes & bugs",
      detail: "2 negative comments, 100% of all negative feedback.",
    },
  ],
  ratingBars: [
    { label: "Remitly", value: 4.8, display: "4.8" },
    { label: "Western Union", value: 4.5, display: "4.5", highlight: true },
  ],
  marketBars: null,
  sentiment: { positive: 1, neutral: 1, negative: 2, total: 4 },
  trend: [
    { label: "Oct", positive: 0, neutral: 0, negative: 0, total: 0, net: null },
    { label: "Nov", positive: 1, neutral: 1, negative: 2, total: 4, net: -25 },
  ],
  themeBars: [
    { label: "Crashes & bugs", value: 2, display: "2 (100%)", tone: "risk" },
  ],
  feeBars: null,
  tables: [
    {
      title: "Peer comparison",
      headers: ["#", "Brand", "Rating"],
      rows: [
        { cells: ["1", "Remitly", "4.8"] },
        { cells: ["2", "Western Union", "4.5"], highlight: true },
      ],
    },
  ],
  quotes: [
    {
      source: "Google Play",
      rating: 1,
      text: "It <b>crashes</b> a lot",
      date: "2026-11-19",
    },
  ],
  gaps: ["No live share prices were available."],
};

test("the printable report holds the figures, charts, tables and comments", () => {
  const html = reportToHtml(report);
  assert.match(html, /^<!doctype html>/);
  for (const text of [
    "4.5 / 5",
    "-0.10 vs peer average",
    "-25 pp",
    "Fix first: Crashes &amp; bugs",
    "Store rating vs peers",
    "Sentiment split",
    "Monthly net sentiment",
    "Negative comments by theme",
    "Peer comparison",
    "NOT INCLUDED",
    "No live share prices were available.",
  ])
    assert.ok(html.includes(text), `missing: ${text}`);
  // Bars are scaled against 5, so 4.5 fills 90% and the brand bar is highlighted.
  assert.ok(html.includes("width:90.0%"));
  assert.ok(html.includes('class="bar-label strong">Western Union'));
  assert.ok(html.includes('<tr class="hl">'));
  // Sentiment split widths add up to the whole bar.
  assert.ok(html.includes("width:25.0%") && html.includes("width:50.0%"));
});

test("text from reviews and titles is escaped so it cannot inject markup", () => {
  const html = reportToHtml(report);
  assert.ok(html.includes("Executive brief · &lt;Acme &amp; Co&gt;"));
  assert.ok(html.includes("It &lt;b&gt;crashes&lt;/b&gt; a lot"));
  assert.ok(!html.includes("<b>crashes</b>"));
});

test("sections with no data are left out instead of printed empty", () => {
  const html = reportToHtml({
    ...report,
    kpis: [],
    callouts: [],
    ratingBars: null,
    sentiment: null,
    trend: null,
    themeBars: null,
    tables: [],
    quotes: [],
    gaps: [],
  });
  for (const text of [
    "Key callouts",
    "Charts",
    "NOT INCLUDED",
    "customers&#39; words",
  ])
    assert.ok(!html.includes(text), `unexpected: ${text}`);
});
