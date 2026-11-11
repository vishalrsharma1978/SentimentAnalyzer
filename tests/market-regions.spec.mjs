import { test, expect } from '@playwright/test';
import { openExplorer } from './explorer-fixture.mjs';

test('region and country changes keep scope, ranking and selected detail synchronized', async ({ page }) => {
  const explorer = await openExplorer(page);
  await expect(explorer.getByRole('button', { name: /^Country / })).toHaveCount(8);
  await explorer.getByRole('button', { name: 'Region Europe', exact: true }).click();
  await expect(explorer.getByRole('button', { name: /^Country / })).toHaveCount(3);
  await expect(explorer.getByText(/Rank scope: Europe · 3 rated \/ 3 monitored/)).toBeVisible();
  await explorer.getByRole('button', { name: 'Country Germany', exact: true }).click();
  await expect(explorer.getByText('Germany / Mobile app', { exact: true })).toBeVisible();
  await explorer.getByRole('button', { name: 'Chart Ranked bars', exact: true }).click();
  await expect(explorer.getByRole('button', { name: 'Explore Germany, rank 1, rating 4.80', exact: true })).toBeVisible();
  await explorer.getByRole('button', { name: 'Region Global', exact: true }).click();
  await expect(explorer.getByRole('button', { name: /^Country / })).toHaveCount(8);
});
