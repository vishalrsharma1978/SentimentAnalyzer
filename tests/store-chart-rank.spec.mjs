import { test, expect } from '@playwright/test';
import { openExplorer } from './explorer-fixture.mjs';

test('header shows the real store top-chart rank instead of a monitored-market rank', async ({ page }) => {
  await openExplorer(page);
  const headline = page.getByTestId('brand-headline');
  await expect(headline.getByText('#67 · >200')).toBeVisible();
  await expect(headline.getByText('Finance · top free · iOS · Android')).toBeVisible();
  await expect(page.getByText(/mobile app rank in monitored markets/)).toHaveCount(0);
});

test('header chart rank shows N/A when the chart service fails', async ({ page }) => {
  await openExplorer(page);
  await page.route('**/api/store-chart-ranks**', (route) => route.fulfill({ status: 503, json: { error: 'offline' } }));
  await page.reload();
  await expect(page.getByTestId('brand-headline').getByLabel(/^Store chart rank N\/A/)).toBeVisible();
});
