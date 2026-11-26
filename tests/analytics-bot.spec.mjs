import { test, expect } from "@playwright/test";
import { openExplorer } from "./explorer-fixture.mjs";

test("landing page assistant explains what it will answer once a brand is set up", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Every brand has a pulse.", { exact: true }),
  ).toBeVisible();
  await page.getByTestId("analytics-bot-launcher").click();
  const panel = page.getByTestId("analytics-bot-panel");
  await expect(panel).toBeVisible();
  await expect(
    panel.getByText("Analytics assistant", { exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByText("Your analytics assistant", { exact: true }),
  ).toBeVisible();
  await page.getByTestId("analytics-bot-close").click();
  await expect(panel).toHaveCount(0);
});

test("dashboard assistant answers from the model's data with figures", async ({
  page,
}) => {
  await openExplorer(page);
  await page.getByTestId("analytics-bot-launcher").click();
  const panel = page.getByTestId("analytics-bot-panel");
  await expect(panel.getByText("Western Union · United States")).toBeVisible();

  // The competitor feed in the fixture is Remitly 4.8, Wise 4.4, Western Union 3.0.
  await panel
    .getByRole("button", { name: "How do we compare with competitors?" })
    .click();
  const answer = panel.getByTestId("analytics-bot-answer").last();
  await expect(answer).toContainText("Competitors");
  await expect(answer).toContainText(
    "Western Union ranks #3 of 3 (3.0), 1.8 behind Remitly.",
  );
  await expect(answer).toContainText(
    "Top: Remitly 4.8 · Wise 4.4 · Western Union 3.0",
  );

  // Free-text questions work as well as the suggested ones.
  await panel
    .getByLabel("Ask the analytics assistant")
    .fill("what do the transfer fees look like");
  await page.getByTestId("analytics-bot-send").click();
  await expect(panel.getByTestId("analytics-bot-answer").last()).toContainText(
    "won't estimate any",
  );
});
