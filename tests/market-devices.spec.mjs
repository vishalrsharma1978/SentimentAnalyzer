import { test, expect } from "@playwright/test";
import { openExplorer } from "./explorer-fixture.mjs";

const review = (source, author, text, sentiment, rating, day) => ({
  source,
  author,
  text,
  sentiment,
  rating,
  publishedAt: `2025-01-0${day}T00:00:00Z`,
});

const reviews = [
  review(
    "Apple App Store",
    "A1",
    "Login fails on my iPhone 14 Pro",
    "negative",
    1,
    1,
  ),
  review(
    "Apple App Store",
    "A2",
    "iPhone 14 Pro crashes after iOS 17",
    "negative",
    1,
    2,
  ),
  review(
    "Apple App Store",
    "A3",
    "Works well on my iPhone 13",
    "positive",
    5,
    3,
  ),
  review("Google Play", "G1", "Fine on Pixel 8", "positive", 4, 4),
  review("Google Play", "G2", "Smooth and quick", "positive", 5, 5),
];

async function openWithReviews(page) {
  const explorer = await openExplorer(page);
  await page.route("**/api/reviews**", (route) =>
    route.fulfill({ json: { reviews } }),
  );
  await page.reload();
  await expect(page.getByTestId("brand-headline")).toBeVisible();
  return explorer;
}

test("iOS card lists devices and operating systems and calls out the failing ones in red", async ({
  page,
}) => {
  const explorer = await openWithReviews(page);
  await expect(explorer.getByTestId("device-table")).toHaveCount(0);

  await explorer
    .getByRole("button", { name: "Focus iOS", exact: true })
    .click();
  const table = explorer.getByTestId("device-table");
  await expect(table).toBeVisible();

  const callout = table.getByTestId("device-failure-callout");
  await expect(callout).toContainText("Failing on 1 device or OS");
  await expect(callout).toContainText(
    "iPhone 14 Pro (2 of 2 reviews negative)",
  );

  const failing = table.getByLabel(
    "iPhone 14 Pro, 2 reviews, 2 negative, failing",
  );
  await expect(failing).toBeVisible();
  await expect(failing.getByText("Failing", { exact: true })).toHaveCSS(
    "color",
    "rgb(180, 35, 24)",
  );
  const healthy = table.getByLabel("iPhone 13, 1 reviews, 0 negative");
  await expect(healthy.getByText("OK", { exact: true })).toBeVisible();
  await expect(table.getByLabel(/^iOS 17,/)).toBeVisible();
  await expect(table.getByLabel(/Pixel 8/)).toHaveCount(0);
});

test("Android card shows its own table and an honest empty state when nothing is named", async ({
  page,
}) => {
  const explorer = await openWithReviews(page);
  await explorer
    .getByRole("button", { name: "Focus Android", exact: true })
    .click();
  const table = explorer.getByTestId("device-table");
  await expect(
    table.getByLabel("Pixel 8, 1 reviews, 0 negative"),
  ).toBeVisible();
  await expect(table.getByTestId("device-failure-callout")).toHaveCount(0);
  await expect(table.getByLabel(/iPhone/)).toHaveCount(0);

  await page.route("**/api/reviews**", (route) =>
    route.fulfill({
      json: {
        reviews: [
          review("Google Play", "G9", "Fast and reliable", "positive", 5, 6),
        ],
      },
    }),
  );
  await page.reload();
  await explorer
    .getByRole("button", { name: "Focus Android", exact: true })
    .click();
  await expect(explorer.getByTestId("device-table-empty")).toContainText(
    "name a device or operating system",
  );
});
