import { test, expect } from '@playwright/test';
import { openExplorer } from './explorer-fixture.mjs';

for (const width of [1440, 390]) {
  test(`landing and dashboard share hero and control colors at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const landingHero = page.getByTestId('landing-hero');
    await expect(landingHero).toHaveCSS('background-color', 'rgb(15, 43, 87)');
    await expect(landingHero.getByRole('heading')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(page.getByTestId('landing-logo')).toHaveCSS('background-color', 'rgb(15, 43, 87)');
    if (width >= 560) {
      await expect(page.getByTestId('landing-preview')).toHaveCSS('background-color', 'rgb(15, 43, 87)');
    }
    await expect(page.getByRole('button', { name: 'Create model', exact: true }))
      .toHaveCSS('background-color', 'rgb(15, 43, 87)');
    await page.getByRole('button', { name: 'Markets', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Done', exact: true }))
      .toHaveCSS('background-color', 'rgb(15, 43, 87)');
    await page.getByRole('button', { name: 'Done', exact: true }).click();

    const explorer = await openExplorer(page);
    const headline = page.getByTestId('brand-headline');
    await expect(headline.getByTestId('brand-headline-logo')).toHaveCSS('background-color', 'rgb(15, 43, 87)');
    await expect(headline).toHaveCSS('background-color', 'rgb(15, 43, 87)');
    await expect(headline.getByText('Western Union', { exact: true })).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(explorer).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(explorer).toHaveCSS('border-top-color', 'rgb(228, 234, 246)');
    await expect(explorer.getByTestId('rating-sunburst-touch-surface').locator('circle').last())
      .toHaveAttribute('fill', '#0F2B57');
    await explorer.getByRole('button', { name: 'Chart Heatmap', exact: true }).click();
    await expect(explorer.getByRole('button', { name: 'Chart Heatmap', exact: true }))
      .toHaveCSS('background-color', 'rgb(15, 43, 87)');
    await expect(explorer.getByText('Heatmap', { exact: true }))
      .toHaveCSS('color', 'rgb(255, 255, 255)');
  });
}
