import { expect, test } from "@playwright/test";

test("frequently used brands are remembered, reusable and removable", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Your frequent brands", { exact: true }),
  ).toHaveCount(0);

  await page.getByLabel("Brand name", { exact: true }).fill("Acme Coffee");
  await page.getByLabel("Website", { exact: true }).fill("https://example.com");
  await page.getByRole("button", { name: "Create model", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?/);

  await page.goto("/");
  await expect(
    page.getByText("Your frequent brands", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use Acme Coffee", exact: true })
    .click();
  await expect(page.getByLabel("Brand name", { exact: true })).toHaveValue(
    "Acme Coffee",
  );
  await expect(page.getByLabel("Website", { exact: true })).toHaveValue(
    "https://example.com",
  );

  await page
    .getByRole("button", { name: "Forget Acme Coffee", exact: true })
    .click();
  await expect(
    page.getByText("Your frequent brands", { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Your frequent brands", { exact: true }),
  ).toHaveCount(0);
});
