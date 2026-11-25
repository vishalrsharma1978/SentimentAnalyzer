import { test, expect } from "@playwright/test";
import { openExplorer } from "./explorer-fixture.mjs";

async function openFeatureMap(page) {
  await openExplorer(page);
  await page.getByText("Competitors", { exact: true }).first().click();
  const card = page.getByTestId("feature-map");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeVisible();
  return card;
}

test("the feature map compares the brand against mapped competitors", async ({
  page,
}) => {
  const card = await openFeatureMap(page);

  // Coverage chart lists the brand plus both mapped competitors.
  await expect(card.getByTestId("coverage-brand")).toContainText(
    "Western Union (you)",
  );
  await expect(card.getByTestId("coverage-competitor")).toHaveCount(2);

  // Matrix shows feature rows and per-brand cells.
  await expect(card.getByText("Capability matrix")).toBeVisible();
  await expect(card.getByText("Cash pickup", { exact: true })).toBeVisible();
  await expect(
    card.getByLabel("Cash pickup is offered by Western Union"),
  ).toBeVisible();
  await expect(
    card.getByLabel("Cash pickup is not offered by Wise"),
  ).toBeVisible();

  // Insights call out edges and gaps for next steps.
  await expect(card.getByTestId("feature-leads")).toContainText(
    "Physical agent network",
  );
  await expect(card.getByTestId("feature-gaps")).toContainText(
    "Mid-market FX rate",
  );
});

test("the feature map section can be hidden and shown", async ({ page }) => {
  const card = await openFeatureMap(page);
  await expect(card.getByText("Feature coverage")).toBeVisible();

  await card
    .getByRole("button", { name: "Hide feature map section" })
    .click();
  await expect(card.getByText("Feature coverage")).toHaveCount(0);

  await card
    .getByRole("button", { name: "Show feature map section" })
    .click();
  await expect(card.getByText("Feature coverage")).toBeVisible();
});
