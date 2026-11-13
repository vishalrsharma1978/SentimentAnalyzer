import { test, expect } from '@playwright/test';
import { clickSunburstArc, openExplorer } from './explorer-fixture.mjs';

test('sunburst arcs and accessible cards drill to platform and reset to region', async ({ page }) => {
  const explorer = await openExplorer(page);
  await clickSunburstArc(explorer, 120, 67.5);
  await expect(explorer.getByText('United Kingdom / Mobile app', { exact: true })).toBeVisible();
  await explorer.getByRole('button', { name: 'Focus iOS', exact: true }).click();
  await expect(explorer.getByText('United Kingdom / iOS', { exact: true })).toBeVisible();
  await clickSunburstArc(explorer, 175, 330);
  await expect(explorer.getByText('United Kingdom / Android', { exact: true })).toBeVisible();
  await explorer.getByRole('button', { name: 'Focus Website', exact: true }).click();
  await expect(explorer.getByText('United Kingdom / Website', { exact: true })).toBeVisible();
  await expect(explorer.getByText('Website breakdown · United Kingdom', { exact: true })).toBeVisible();
  await expect(explorer.getByLabel('Security headers 20 percent', { exact: true })).toBeVisible();
  await expect(explorer.getByText('Source not connected', { exact: true })).toHaveCount(0);
  await explorer.getByRole('button', { name: 'Focus Brand', exact: true }).click();
  await expect(explorer.getByText('Equal average of Apple App Store and Google Play ratings', { exact: true }).first()).toBeVisible();
  await expect(explorer.getByText('Brand breakdown · United Kingdom', { exact: true })).toBeVisible();
  await explorer.getByRole('button', { name: 'Chart Ranked bars', exact: true }).click();
  await expect(explorer.getByText('Global brand rating ladder', { exact: true })).toBeVisible();
  await expect(explorer.getByRole('button', { name: 'Explore Germany, rank 1, rating 4.80', exact: true })).toBeVisible();
  await explorer.getByRole('button', { name: 'Chart Sunburst', exact: true }).click();
  await explorer.getByRole('button', { name: 'Reset sunburst to all countries in region', exact: true }).click();
  await expect(explorer.getByText('/ select a country', { exact: true })).toBeVisible();
  await explorer.screenshot({ path: test.info().outputPath('sunburst-desktop.png') });
});

test('brand rating identifies when only the App Store is available', async ({ page }) => {
  const explorer = await openExplorer(page, 'single');
  await explorer.getByRole('button', { name: 'Focus Brand', exact: true }).click();
  await expect(explorer.getByText('Single source: Apple App Store', { exact: true }).first()).toBeVisible();
  await expect(explorer.getByText('United States / Brand', { exact: true })).toBeVisible();
  await expect(explorer.getByTestId('channel-breakdown').getByText('Single source: Apple App Store', { exact: true })).toBeVisible();
});

test('a different selected brand shows its provisional store-based rating', async ({ page }) => {
  const explorer = await openExplorer(page, 'live', 'Wise');
  await expect(page.getByTestId('brand-headline').getByText('Wise', { exact: true })).toBeVisible();
  await explorer.getByRole('button', { name: 'Focus Brand', exact: true }).click();
  await expect(explorer.getByText('United States / Brand', { exact: true })).toBeVisible();
  await expect(explorer.getByTestId('channel-breakdown').getByText('Equal average of Apple App Store and Google Play ratings', { exact: true })).toBeVisible();
});
