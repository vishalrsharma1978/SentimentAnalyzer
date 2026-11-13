import { test, expect } from '@playwright/test';
import { openExplorer } from './explorer-fixture.mjs';

test('the same brand headline and takeaways appear on Overview, Markets, Competitors and AI Insights', async ({ page }) => {
  await openExplorer(page);
  const headline = page.getByTestId('brand-headline');
  // Fixture: US store rating 4.5 ranks Western Union #2 of 3, 0.3 behind Remitly 4.8.
  for (const section of ['Overview', 'Markets', 'Competitors', 'AI Insights']) {
    await page.getByText(section, { exact: true }).first().click();
    await expect(headline.getByText(`${section.toUpperCase()} · UNITED STATES`)).toBeVisible();
    await expect(headline.getByLabel('Brand rating 4.5 /5')).toBeVisible();
    await expect(headline.getByLabel('Vs competitors #2 of 3')).toBeVisible();
    await expect(headline.getByText('-0.3 vs Remitly')).toBeVisible();
    await expect(page.getByTestId('key-takeaways').getByText('#2 of 3 in United States, 0.3 behind Remitly.')).toBeVisible();
  }
  await page.getByText('Competitors', { exact: true }).first().click();
  await expect(page.getByText('Ranked #2 of 3 in United States', { exact: false })).toBeVisible();
});
