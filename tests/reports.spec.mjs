import { test, expect } from "@playwright/test";
import { openExplorer } from "./explorer-fixture.mjs";

const daysAgo = (days) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const reviews = [
  {
    source: "Google Play",
    author: "A",
    rating: 1,
    sentiment: "negative",
    text: "The app crashes every time I send money",
    publishedAt: daysAgo(2),
  },
  {
    source: "Apple App Store",
    author: "B",
    rating: 2,
    sentiment: "negative",
    text: "Crash on login again, please fix",
    publishedAt: daysAgo(3),
  },
  {
    source: "Google Play",
    author: "C",
    rating: 5,
    sentiment: "positive",
    text: "Great app and the transfer was quick",
    publishedAt: daysAgo(5),
  },
  {
    source: "Apple App Store",
    author: "D",
    rating: 3,
    sentiment: "neutral",
    text: "Works fine most of the time",
    publishedAt: daysAgo(6),
  },
];

async function openReports(page) {
  await openExplorer(page);
  // Routes registered later win, so this must come after the fixture's catch-all API route.
  await page.route("**/api/reviews**", (route) =>
    route.fulfill({ json: { reviews } }),
  );
  await page.reload();
  await expect(page.getByTestId("brand-headline")).toBeVisible();
  await page.getByText("Reports", { exact: true }).first().click();
  await expect(page.getByTestId("generate-report-executive")).toBeVisible();
}

test("Reports offers the report types and builds an executive brief from live data", async ({
  page,
}) => {
  await openReports(page);
  await expect(page.getByTestId("generate-report-competitive")).toBeVisible();
  await expect(page.getByTestId("generate-report-customer")).toBeVisible();

  await page.getByTestId("generate-report-executive").click();
  await expect(page.getByTestId("report-title")).toHaveText(
    "Executive brief · Western Union",
  );
  const kpis = page.getByTestId("report-kpis");
  // Fixture: brand 4.5, peers Remitly 4.8 and Wise 4.4 (average 4.6), 4 comments with 1 positive and 2 negative.
  await expect(kpis.getByText("4.5 / 5")).toBeVisible();
  await expect(kpis.getByText("-0.10 vs peer average")).toBeVisible();
  await expect(kpis.getByText("#2 of 3")).toBeVisible();
  await expect(kpis.getByText("-0.3 vs Remitly")).toBeVisible();
  await expect(kpis.getByText("-25 pp")).toBeVisible();
  await expect(kpis.getByText("25% positive · 50% negative")).toBeVisible();
  const callouts = page.getByTestId("report-callouts");
  await expect(callouts.getByText("#2 of 3 in United States")).toBeVisible();
  await expect(callouts.getByText("Fix first: Crashes & bugs")).toBeVisible();
  await expect(page.getByTestId("report-print")).toBeVisible();
});

test("the customer voice report shows the sentiment charts and real comments", async ({
  page,
}) => {
  await openReports(page);
  await page.getByTestId("generate-report-customer").click();
  await expect(page.getByTestId("report-title")).toHaveText(
    "Customer voice · Western Union",
  );
  await expect(page.getByLabel("Sentiment split")).toBeVisible();
  await expect(page.getByLabel("Monthly net sentiment")).toBeVisible();
  await expect(
    page.getByText("Crash on login again, please fix", { exact: false }),
  ).toBeVisible();
  // A report without customer data for a source says so instead of inventing numbers.
  await expect(page.getByTestId("report-gaps")).toHaveCount(0);
});

test("the competitive review compares peers and the user can go back to the list", async ({
  page,
}) => {
  await openReports(page);
  await page.getByTestId("generate-report-competitive").click();
  await expect(page.getByLabel("Store rating vs peers")).toBeVisible();
  // The chart must actually draw bars: a track and a fill for each of the 3 rated brands.
  await expect(
    page.getByLabel("Store rating vs peers").locator("rect"),
  ).toHaveCount(6);
  await expect(
    page.getByText("Peer comparison", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("+0.3", { exact: true })).toBeVisible();
  await page.getByTestId("report-back").click();
  await expect(page.getByTestId("generate-report-executive")).toBeVisible();
});
