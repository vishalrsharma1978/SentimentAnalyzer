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
    rating: 1,
    sentiment: "negative",
    text: "Fees are far too high and the exchange rate is bad",
    publishedAt: daysAgo(4),
  },
  {
    source: "Google Play",
    author: "D",
    rating: 5,
    sentiment: "positive",
    text: "Great app and the transfer was quick",
    publishedAt: daysAgo(5),
  },
  {
    source: "Apple App Store",
    author: "E",
    rating: 3,
    sentiment: "neutral",
    text: "Works fine most of the time",
    publishedAt: daysAgo(6),
  },
];

async function openInsights(page) {
  await openExplorer(page);
  // Routes registered later win, so this must come after the fixture's catch-all API route.
  await page.route("**/api/reviews**", (route) =>
    route.fulfill({ json: { reviews } }),
  );
  await page.reload();
  await expect(page.getByTestId("brand-headline")).toBeVisible();
  await page.getByText("AI Insights", { exact: true }).first().click();
  await expect(page.getByTestId("insight-card-negative")).toBeVisible();
}

test("the summary cards open a detail panel with the breakdown, customer comments and a next step", async ({
  page,
}) => {
  await openInsights(page);
  const card = page.getByTestId("insight-card-negative");
  await expect(card.getByText("View details")).toBeVisible();
  await expect(page.getByTestId("insight-detail-negative")).toHaveCount(0);

  await card.click();
  const detail = page.getByTestId("insight-detail-negative");
  await expect(detail).toBeVisible();
  await expect(
    detail.getByText("3 of 5 collected comments are negative (60%)", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(detail.getByText("WHAT CUSTOMERS SAID")).toBeVisible();
  await expect(
    detail.getByText("Crash on login again, please fix", { exact: false }),
  ).toBeVisible();
  await expect(detail.getByText("SUGGESTED NEXT STEP")).toBeVisible();
  await expect(card.getByText("Hide details")).toBeVisible();

  // Only one card is open at a time, and the same card closes again.
  await page.getByTestId("insight-card-positive").click();
  await expect(detail).toHaveCount(0);
  await expect(
    page
      .getByTestId("insight-detail-positive")
      .getByText("Great app and the transfer was quick", { exact: false }),
  ).toBeVisible();
  await page.getByTestId("insight-card-positive").click();
  await expect(page.getByTestId("insight-detail-positive")).toHaveCount(0);
});

test("the rating gap card compares the brand with each rated peer", async ({
  page,
}) => {
  await openInsights(page);
  await page.getByTestId("insight-card-gap").click();
  const detail = page.getByTestId("insight-detail-gap");
  // Fixture: Western Union is 4.5 and the best peer, Remitly, is 4.8.
  await expect(
    detail.getByText("highest-rated peer, Remitly, is 4.8 / 5", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(detail.getByText("Wise", { exact: true })).toBeVisible();
});

test("an improvement action expands its own breakdown without leaving the page", async ({
  page,
}) => {
  await openInsights(page);
  const action = page.getByTestId("insight-action-stability");
  await action.click();
  const detail = page.getByTestId("insight-detail-action-stability");
  await expect(
    detail.getByText("2 of 3 negative comments (67%) mention crashes & bugs", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    detail.getByText("The app crashes every time I send money", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("AI executive brief", { exact: true }).first(),
  ).toBeVisible();
  await action.click();
  await expect(detail).toHaveCount(0);
});
