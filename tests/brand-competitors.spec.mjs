import { test, expect } from "@playwright/test";
import { openExplorer } from "./explorer-fixture.mjs";

test("competitor request uses the searched brand and renders its live peers", async ({
  page,
}) => {
  const requests = [];
  const explorer = await openExplorer(page, "live", "Acme Coffee");
  await page.route("**/api/competitor-ratings?**", async (route) => {
    const url = new URL(route.request().url());
    requests.push({
      brand: url.searchParams.get("brand"),
      country: url.searchParams.get("country"),
    });
    await route.fulfill({
      json: {
        competitors: [
          {
            name: "Acme Coffee",
            rating: 4.5,
            reviewCount: 100,
            source: "Google Play",
            status: "live",
          },
          {
            name: "Coffee Peer",
            rating: 4.7,
            reviewCount: 500,
            source: "Google Play",
            status: "live",
          },
        ],
      },
    });
  });
  await explorer
    .getByRole("button", { name: "Refresh country ratings", exact: true })
    .click();
  await page.getByText("Competitors", { exact: true }).first().click();
  await expect(page.getByText("Coffee Peer", { exact: true })).toBeVisible();
  expect(requests.at(-1)).toEqual({ brand: "Acme Coffee", country: "US" });
  await expect(page.getByText("MoneyGram", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Remitly", { exact: true })).toHaveCount(0);
});

test("empty discovery never substitutes remittance peers", async ({ page }) => {
  const quoteRequests = [];
  await openExplorer(page, "live", "Unknown Brand");
  await page.route("**/api/competitor-ratings?**", (route) =>
    route.fulfill({ json: { competitors: [] } }),
  );
  await page.route("**/api/competitor-share-prices?**", (route) => {
    quoteRequests.push(route.request().url());
    return route.fulfill({ json: { items: [] } });
  });
  await page.reload();
  await page.getByText("Competitors", { exact: true }).first().click();
  await expect(
    page.getByText(/No live category peers found for Unknown Brand/),
  ).toBeVisible();
  await expect(page.getByText("MoneyGram", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Remitly", { exact: true })).toHaveCount(0);
  expect(quoteRequests).toHaveLength(0);
});

test("discovery outage reports an error without inventing competitors", async ({
  page,
}) => {
  await openExplorer(page, "live", "Acme Coffee");
  await page.route("**/api/competitor-ratings?**", (route) =>
    route.fulfill({ status: 502, json: { error: "Store offline" } }),
  );
  await page.reload();
  await page.getByText("Competitors", { exact: true }).first().click();
  await expect(
    page.getByText(
      "Live peer discovery is temporarily unavailable. Refresh ratings to retry.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Remitly", { exact: true })).toHaveCount(0);
});
