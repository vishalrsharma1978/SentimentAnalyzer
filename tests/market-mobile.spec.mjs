import { test, expect } from '@playwright/test';
import { clickSunburstArc, openExplorer } from './explorer-fixture.mjs';

test('phone width supports country selection and horizontally scrollable heatmap without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const explorer = await openExplorer(page);
  await clickSunburstArc(explorer, 120, 67.5);
  await expect(explorer.getByText('United Kingdom / Mobile app', { exact: true })).toBeVisible();
  await explorer.getByRole('button', { name: 'Region Europe', exact: true }).click();
  await explorer.getByRole('button', { name: 'Country Germany', exact: true }).click();
  await explorer.getByRole('button', { name: 'Chart Heatmap', exact: true }).click();
  await expect(explorer.getByText('Country × experience heatmap')).toBeVisible();
  await explorer.getByRole('button', { name: 'Germany iOS 4.80', exact: true }).click();
  await expect(explorer.getByText('Germany / iOS', { exact: true })).toBeVisible();
  const bounds = await explorer.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(391);
  await explorer.screenshot({ path: test.info().outputPath('heatmap-mobile.png') });
});

test('unavailable country sources do not produce invented scores or ranks', async ({ page }) => {
  const explorer = await openExplorer(page, 'empty');
  await expect(explorer.getByText('No mobile app ratings available in this region.', { exact: true })).toBeVisible();
  await expect(explorer.getByText(/Rank scope: Global · 0 rated \/ 8 monitored/)).toBeVisible();
  await explorer.getByRole('button', { name: 'Chart Heatmap', exact: true }).click();
  await expect(explorer.getByRole('button', { name: 'United States iOS unavailable', exact: true })).toBeVisible();
  await expect(explorer.getByRole('button', { name: 'United States Website unavailable', exact: true })).toBeVisible();
});

test('collector failures display a retryable error instead of demo rankings', async ({ page }) => {
  const explorer = await openExplorer(page, 'error');
  await expect(explorer.getByRole('alert')).toContainText('Some countries could not be loaded');
  await expect(explorer.getByText(/Rank scope: Global · 0 rated \/ 8 monitored/)).toBeVisible();
  await explorer.getByRole('button', { name: 'Refresh country ratings', exact: true }).click();
  await expect(explorer.getByRole('alert')).toBeVisible();
});
