import { test, expect } from "@playwright/test";
import { openExplorer } from "./explorer-fixture.mjs";

const reviews = [
  {
    source: "Google Play",
    author: "Ana",
    rating: 5,
    text: "Smooth transfers on my Samsung Galaxy S23 Ultra",
    sentiment: "positive",
    publishedAt: "2025-01-04T00:00:00Z",
    appVersion: "13.8",
    reviewUrl: "https://play.google.com/store/apps/details?id=x&reviewId=1",
  },
  {
    source: "Apple App Store",
    author: "Ben",
    rating: 4,
    text: "Great since iOS 17 on my iPhone 14 Pro",
    sentiment: "positive",
    publishedAt: "2025-01-03T00:00:00Z",
    appVersion: "17.9",
    reviewUrl: "https://itunes.apple.com/us/review?id=1&type=Purple%20Software",
    profileUrl: "https://itunes.apple.com/us/reviews/id236439135",
  },
  {
    source: "Google Play",
    author: "Cara",
    rating: 5,
    text: "Fast and reliable transfers",
    sentiment: "positive",
    publishedAt: "2025-01-02T00:00:00Z",
  },
];

test("review cards show store details and only the devices the reviewer wrote", async ({
  page,
}) => {
  await openExplorer(page);
  await page.route("**/api/reviews**", (route) =>
    route.fulfill({ json: { reviews } }),
  );
  await page.reload();
  await expect(page.getByTestId("brand-headline")).toBeVisible();

  const mentions = page.getByTestId("review-device-mention");
  await expect(mentions).toHaveCount(2);
  await expect(mentions.first()).toContainText("Galaxy S23 Ultra");
  await expect(mentions.nth(1)).toContainText("iPhone 14 Pro");
  await expect(mentions.nth(1)).toContainText("iOS 17");

  await expect(page.getByText("App version 13.8")).toBeVisible();
  await expect(page.getByText("App version 17.9")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Ben's review on Apple App Store" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Open Ben's reviewer profile on Apple App Store",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Ana's review on Google Play" }),
  ).toBeVisible();

  // A review with no store details and no device in its text shows no details row.
  await expect(page.getByText("Fast and reliable transfers")).toBeVisible();
  await expect(page.getByTestId("review-contact-details")).toHaveCount(2);
});
