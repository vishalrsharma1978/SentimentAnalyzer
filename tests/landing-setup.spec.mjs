import { test, expect } from '@playwright/test';

test('landing is brand-neutral and optional controls stay collapsed', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Every brand has a pulse.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Brand name', { exact: true })).toHaveValue('');
  await expect(page.getByText('Know what your customers feel', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Industry', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'More options', exact: true }).click();
  await page.getByRole('button', { name: 'Industry', exact: true }).click();
  await page.getByRole('radio', { name: 'Retail', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Industry', exact: true })).toContainText('Retail');
  await page.getByRole('button', { name: 'Platforms', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Desktop app', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Platforms', exact: true })).toContainText('4 selected');
});

test('any brand opens the dashboard with its website and selected markets', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Brand name', { exact: true }).fill('Acme Coffee');
  await page.getByLabel('Website', { exact: true }).fill('https://example.com');
  await page.getByRole('button', { name: 'Markets', exact: true }).click();
  await page.getByRole('checkbox', { name: 'India', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Create model', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get('brand')).toBe('Acme Coffee');
  expect(url.searchParams.get('website')).toBe('https://example.com');
  expect(JSON.parse(url.searchParams.get('countries'))).toEqual(['United States', 'India']);
});

test('invalid setup shows errors and empty market selections cannot submit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create model', exact: true }).click();
  await expect(page.getByText('Enter your brand name.', { exact: true })).toBeVisible();
  await page.getByLabel('Brand name', { exact: true }).fill('Acme');
  await page.getByLabel('Website', { exact: true }).fill('not-a-url');
  await page.getByRole('button', { name: 'Create model', exact: true }).click();
  await expect(page.getByText('Enter a valid http(s) website.', { exact: true })).toBeVisible();
  await page.getByLabel('Website', { exact: true }).fill('https://example.com');
  await page.getByRole('button', { name: 'Markets', exact: true }).click();
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Create model', exact: true }).click();
  await expect(page.getByText('Select at least one market.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('mobile setup fits the screen and dropdown choices persist after closing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Create model', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Markets', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Markets', exact: true })).toBeInViewport();
  await page.getByRole('checkbox', { name: 'Canada', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Markets', exact: true })).toContainText('2 countries');
  await page.getByRole('button', { name: 'Markets', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Canada', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Close Markets', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('searchable examples can be cleared to set up a custom brand', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Example brands', exact: true }).click();
  await page.getByLabel('Search example brands', { exact: true }).fill('Wise');
  await expect(page.getByRole('radio', { name: 'Western Union', exact: true })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Wise', exact: true }).click();
  await expect(page.getByLabel('Brand name', { exact: true })).toHaveValue('Wise');
  await expect(page.getByLabel('Website', { exact: true })).toHaveValue('https://wise.com');
  await page.getByRole('button', { name: 'Example brands', exact: true }).click();
  await page.getByRole('radio', { name: 'Your brand', exact: true }).click();
  await expect(page.getByLabel('Brand name', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Website', { exact: true })).toHaveValue('');
});

test('optional app name and source validation preserve the setup contract', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Brand name', { exact: true }).fill('Acme Coffee');
  await page.getByLabel('Website', { exact: true }).fill('https://example.com');
  await page.getByRole('button', { name: 'More options', exact: true }).click();
  await page.getByLabel('App name', { exact: true }).fill('Acme Rewards');
  await page.getByRole('button', { name: 'Sentiment sources', exact: true }).click();
  for (const source of ['App Store', 'Google Play', 'Reddit', 'Trustpilot']) {
    await page.getByRole('checkbox', { name: source, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Create model', exact: true }).click();
  await expect(page.getByText('Select at least one sentiment source.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sentiment sources', exact: true }).click();
  await page.getByRole('checkbox', { name: 'App Store', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Create model', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?/);
  expect(new URL(page.url()).searchParams.get('brand')).toBe('Acme Rewards');
});

test('demo sign in reports invalid input and still opens the demo workspace', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Demo sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Open demo workspace', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('at least 4 characters');
  await page.getByLabel('Work email', { exact: true }).fill('demo@example.com');
  await page.getByLabel('Password', { exact: true }).fill('demo');
  await page.getByRole('button', { name: 'Open demo workspace', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
