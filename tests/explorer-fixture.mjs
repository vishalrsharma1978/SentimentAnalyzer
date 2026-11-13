import { expect } from '@playwright/test';

export async function openExplorer(page, sourceMode = 'live', brand = 'Western Union') {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/platform-ratings') {
      if (sourceMode === 'error') {
        return route.fulfill({ status: 503, json: { error: 'Test source offline' } });
      }
      const country = url.searchParams.get('country');
      const value = sourceMode === 'empty' ? null : ({ US: 4.5, GB: 4, DE: 4.8, FR: 4 })[country] ?? 3.7;
      return route.fulfill({ json: {
        apple: { rating: value, reviewCount: value === null ? 0 : 100 },
        google: { rating: sourceMode === 'single' ? null : value, reviewCount: sourceMode === 'single' || value === null ? 0 : 200 },
      } });
    }
    if (url.pathname === '/api/store-chart-ranks') {
      if (sourceMode === 'error') return route.fulfill({ status: 503, json: { error: 'Test source offline' } });
      return route.fulfill({ json: {
        apple: { rank: 67, chartSize: 100, category: 'Finance' },
        google: { rank: null, chartSize: 200, category: 'Finance' },
      } });
    }
    if (url.pathname === '/api/channel-ratings') {
      const country = url.searchParams.get('country');
      if (sourceMode !== 'live' && sourceMode !== 'single') {
        const none = { rating: null, sampleSize: 0, basis: 'Country website could not be reached', components: [] };
        return route.fulfill({ json: { brand: none, web: none, country } });
      }
      const brand = ({ US: 3.4, GB: 3.9, DE: 2.8 })[country] ?? null;
      const web = ({ US: 4.35, GB: 4.1, DE: 3.6, FR: 4.2 })[country] ?? 3.9;
      return route.fulfill({ json: {
        brand: { rating: brand, sampleSize: brand === null ? 2 : 80, basis: brand === null ? 'Fewer than 5 service-related customer reviews in this storefront' : 'Mean star rating of 80 customer reviews about fees, rates, payouts, agents, support and trust', components: brand === null ? [] : [{ label: 'Promoters (4–5★)', score: 0.55 }] },
        web: { rating: web, sampleSize: 14, basis: `Live check of the ${country} site`, components: [{ label: 'Security headers', score: 0.2 }, { label: 'Mobile & SEO markup', score: 1 }] },
        country,
      } });
    }
    if (url.pathname === '/api/competitor-ratings') {
      return route.fulfill({ json: { competitors: [
        { name: 'Western Union', rating: 3.0, reviewCount: 500, status: 'live' },
        { name: 'Remitly', rating: 4.8, reviewCount: 1200, status: 'live' },
        { name: 'Wise', rating: 4.4, reviewCount: 900, status: 'live' },
      ] } });
    }
    return route.fulfill({ json: { items: [], reviews: [], competitors: [] } });
  });
  await page.route('https://itunes.apple.com/**', (route) => route.fulfill({ json: { results: [] } }));
  await page.route('https://www.reddit.com/**', (route) => route.fulfill({ json: { data: { children: [] } } }));
  await page.goto(`/dashboard?brand=${encodeURIComponent(brand)}`);
  const explorer = page.getByTestId('global-ratings-explorer');
  await expect(page.getByTestId('brand-headline')).toBeVisible();
  await expect(explorer.getByRole('button', { name: 'Refresh country ratings', exact: true })).toHaveText('Refresh ratings');
  return explorer;
}

export async function clickSunburstArc(explorer, radius, degrees) {
  const chart = explorer.getByTestId('rating-sunburst-touch-surface');
  const box = await chart.boundingBox();
  const scale = Math.min(box.width, box.height) / 400;
  const angle = (degrees - 90) * Math.PI / 180;
  await chart.click({ position: {
    x: box.width / 2 + radius * scale * Math.cos(angle),
    y: box.height / 2 + radius * scale * Math.sin(angle),
  } });
}
