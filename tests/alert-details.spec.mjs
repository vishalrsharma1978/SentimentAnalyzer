import { test, expect } from "@playwright/test";
import { openExplorer } from "./explorer-fixture.mjs";

const reviews = [
  {
    source: "Google Play",
    author: "Ana",
    rating: 1,
    text: "Transfer was delayed and support never replied",
    sentiment: "negative",
    publishedAt: "2025-01-02T00:00:00Z",
  },
  {
    source: "Apple App Store",
    author: "Ben",
    rating: 2,
    text: "Fees were higher than quoted",
    sentiment: "negative",
    publishedAt: "2025-01-03T00:00:00Z",
  },
  {
    source: "Google Play",
    author: "Cara",
    rating: 5,
    text: "Fast and reliable transfers",
    sentiment: "positive",
    publishedAt: "2025-01-04T00:00:00Z",
  },
];

test("alert rows open a detail view and link to the filtered review feed", async ({
  page,
}) => {
  await openExplorer(page);
  await page.route("**/api/reviews**", (route) =>
    route.fulfill({ json: { reviews } }),
  );
  await page.reload();
  await expect(page.getByTestId("brand-headline")).toBeVisible();
  await page.getByText("Alerts", { exact: true }).first().click();
  await expect(
    page.getByText("Alert center", { exact: true }).first(),
  ).toBeInViewport();

  const negativeRow = page.getByRole("button", {
    name: /2 verified negative customer records returned/,
  });
  await expect(negativeRow).toBeVisible();
  await negativeRow.click();

  await expect(
    page.getByText("Negative feedback alert", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Transfer was delayed and support never replied"),
  ).toBeVisible();
  await expect(page.getByText("Fees were higher than quoted")).toBeVisible();
  await expect(page.getByText("Fast and reliable transfers")).toHaveCount(0);

  await page.getByRole("button", { name: "Close alert details" }).click();
  await expect(
    page.getByText("Negative feedback alert", { exact: true }),
  ).toHaveCount(0);

  await page
    .getByRole("button", {
      name: /1 verified positive customer records returned/,
    })
    .click();
  await expect(
    page.getByText("Positive feedback alert", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Fast and reliable transfers")).toBeVisible();
});
