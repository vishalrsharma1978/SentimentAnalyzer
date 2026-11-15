import { test, expect } from '@playwright/test';

async function mockSources(page, pending = {}, failedSource = '') {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const gate = path === '/api/channel-ratings' && url.searchParams.get('country') === 'IN'
      ? pending.market : path === '/api/store-chart-ranks' ? pending.chart :
        path === '/api/competitor-share-prices' ? pending.quotes : null;
    if (gate) await gate;
    if (path === failedSource) return route.fulfill({ status: 503, json: { error: 'Source offline' } });
    if (path === '/api/platform-ratings') {
      return route.fulfill({ json: { apple: { rating: 4.2, reviewCount: 100 }, google: { rating: 4.2, reviewCount: 200 } } });
    }
    if (path === '/api/channel-ratings') {
      const score = { rating: 4, sampleSize: 10, basis: 'Verified fixture', components: [] };
      return route.fulfill({ json: { brand: score, web: score } });
    }
    if (path === '/api/store-chart-ranks') {
      const rank = { rank: 20, chartSize: 100, category: 'Finance' };
      return route.fulfill({ json: { apple: rank, google: rank } });
    }
    if (path === '/api/competitor-ratings') {
      return route.fulfill({ json: { competitors: [{ name: 'Wise', rating: 4.2, reviewCount: 100, status: 'live' }] } });
    }
    return route.fulfill({ json: { reviews: [], mentions: [], items: [] } });
  });
}

async function startModel(page, includeIndia = false) {
  await page.goto('/');
  await page.getByLabel('Brand name', { exact: true }).fill('Acme');
  await page.getByLabel('Website', { exact: true }).fill('https://example.com');
  if (includeIndia) {
    await page.getByRole('button', { name: 'Markets', exact: true }).click();
    await page.getByRole('checkbox', { name: 'India', exact: true }).click();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Create model', exact: true }).click();
}

test('animated pulse preparation popup waits for every market, chart ranks and share prices', async ({ page }) => {
  let releaseMarket;
  let releaseChart;
  let releaseQuotes;
  await mockSources(page, {
    market: new Promise((resolve) => { releaseMarket = resolve; }),
    chart: new Promise((resolve) => { releaseChart = resolve; }),
    quotes: new Promise((resolve) => { releaseQuotes = resolve; }),
  });
  await startModel(page, true);
  const popup = page.getByRole('dialog', { name: 'Preparing model', exact: true });
  await expect(popup).toBeVisible();
  const graphic = popup.getByRole('img', { name: 'PulseBoard pulse', exact: true }).first();
  await expect(graphic).toBeVisible();
  await expect(popup.getByTestId('preparation-pulse-animation')).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\?/);
  const progress = popup.getByRole('progressbar');
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
  releaseMarket();
  await expect(progress).toHaveAttribute('aria-valuenow', '50');
  releaseChart();
  await expect(progress).toHaveAttribute('aria-valuenow', '75');
  await expect(popup).toBeVisible();
  releaseQuotes();
  await expect(popup).toHaveCount(0);
  await expect(page.getByTestId('brand-headline').getByLabel('Brand rating 4.2 /5')).toBeVisible();
});

test('pulse graphic stays visible while preparation continues', async ({ page }) => {
  let releaseChart;
  await mockSources(page, { chart: new Promise((resolve) => { releaseChart = resolve; }) });
  await startModel(page);
  const popup = page.getByRole('dialog', { name: 'Preparing model', exact: true });
  await expect(popup.getByRole('img', { name: 'PulseBoard pulse', exact: true }).first()).toBeVisible();
  await expect(popup.getByTestId('preparation-pulse-animation')).toBeVisible();
  releaseChart();
  await expect(popup).toHaveCount(0);
});

for (const [source, warning] of [
  ['/api/reviews', 'customer and competitor sources'],
  ['/api/competitor-share-prices', 'customer and competitor sources'],
  ['/api/channel-ratings', 'United States'],
  ['/api/store-chart-ranks', 'store rankings'],
]) {
test(`${source} failure finishes with a clear warning and allows viewing available data`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSources(page, {}, source);
  await startModel(page);
  const popup = page.getByRole('dialog', { name: 'Preparing model', exact: true });
  await expect(popup.getByText('Model ready with limited data', { exact: true })).toBeVisible();
  await expect(popup.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await expect(popup.getByRole('alert')).toContainText(warning);
  await expect(popup).toBeInViewport();
  await popup.getByRole('button', { name: 'View available dashboard', exact: true }).click();
  await expect(popup).toHaveCount(0);
  await expect(page.getByTestId('brand-headline')).toBeVisible();
});
}

test('preparation can be cancelled without a late response reopening it', async ({ page }) => {
  let releaseChart;
  await mockSources(page, { chart: new Promise((resolve) => { releaseChart = resolve; }) });
  await startModel(page);
  await page.getByRole('button', { name: 'Cancel preparation', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  releaseChart();
  await expect(page.getByRole('dialog', { name: 'Preparing model', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Brand name', exact: true })).toHaveValue('Acme');
});
