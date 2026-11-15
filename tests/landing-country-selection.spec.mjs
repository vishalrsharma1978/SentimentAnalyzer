import { test, expect } from '@playwright/test';

const excludedCountries = ['South Korea', 'Indonesia', 'South Africa', 'Egypt', 'Iceland', 'Nigeria'];

async function selectBrand(page, name) {
  await page.getByRole('button', { name: 'Example brands', exact: true }).click();
  await page.getByRole('radio', { name, exact: true }).click();
}

test('Western Union excludes unverified app markets from individual, bundle and suggested selections', async ({ page }) => {
  await page.goto('/');
  await selectBrand(page, 'Western Union');
  await page.getByRole('button', { name: 'Markets', exact: true }).click();
  await expect(page.getByText('Countries', { exact: true })).toBeVisible();
  for (const country of excludedCountries) {
    await expect(page.getByText(country, { exact: true })).toHaveCount(0);
  }
  await expect(page.getByText('India', { exact: true })).toBeVisible();

  await page.getByText('APAC', { exact: true }).click();
  await page.getByText('Nordics', { exact: true }).click();
  await page.getByText('Middle East & Africa', { exact: true }).click();
  await expect(page.getByText(/South Korea|Indonesia|South Africa|Egypt|Iceland|Nigeria/)).toHaveCount(0);

  await page.getByText('Global', { exact: true }).click();
  await expect(page.getByText('17 countries selected')).toBeVisible();
  await page.getByText('Global', { exact: true }).click();
  await expect(page.getByText('0 countries selected')).toBeVisible();

  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'More options', exact: true }).click();
  await page.getByText('Use setup', { exact: true }).click();
  await page.getByRole('button', { name: 'Markets', exact: true }).click();
  await expect(page.getByText(/Iceland/)).toHaveCount(0);
});

test('other brands retain all markets and switching to Western Union removes excluded selections', async ({ page }) => {
  await page.goto('/');
  await selectBrand(page, 'Wise');
  await page.getByRole('button', { name: 'Markets', exact: true }).click();
  for (const country of excludedCountries) {
    await expect(page.getByText(country, { exact: true })).toBeVisible();
  }
  await page.getByText('South Korea', { exact: true }).click();
  await page.getByText('Iceland', { exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await selectBrand(page, 'Western Union');
  await page.getByRole('button', { name: 'Markets', exact: true }).click();
  for (const country of excludedCountries) {
    await expect(page.getByText(new RegExp(country))).toHaveCount(0);
  }
  await expect(page.getByRole('checkbox', { name: 'United States', exact: true })).toBeVisible();
});

test('typed brand names also restrict Western Union markets', async ({ page }) => {
  await page.goto('/');
  await selectBrand(page, 'Wise');
  await page.getByRole('button', { name: 'Markets', exact: true }).click();
  await page.getByText('Nigeria', { exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByLabel('Brand name', { exact: true }).fill(' western union ');
  await page.getByRole('button', { name: 'Markets', exact: true }).click();
  for (const country of excludedCountries) {
    await expect(page.getByText(new RegExp(country))).toHaveCount(0);
  }
});
