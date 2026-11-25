import { test, expect } from "@playwright/test";
import { openExplorer } from "./explorer-fixture.mjs";

test("the Competitive intelligence section can be hidden, shown again and stays hidden after a reload", async ({
  page,
}) => {
  await openExplorer(page);
  await page.getByText("Competitors", { exact: true }).first().click();

  const title = page.getByText("Competitive intelligence", { exact: true });
  const table = page.getByText("YOUR BRAND ·", { exact: false }).first();
  const hide = page.getByRole("button", {
    name: "Hide competitive intelligence",
    exact: true,
  });
  await expect(title).toBeVisible();
  await expect(table).toBeVisible();

  await hide.click();
  await expect(title).toBeVisible();
  await expect(table).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Show competitive intelligence",
      exact: true,
    }),
  ).toBeVisible();

  await page.reload();
  await page.getByText("Competitors", { exact: true }).first().click();
  await expect(title).toBeVisible();
  await expect(table).toHaveCount(0);

  await page
    .getByRole("button", { name: "Show competitive intelligence", exact: true })
    .click();
  await expect(table).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Hide competitive intelligence",
      exact: true,
    }),
  ).toBeVisible();
});
