import { test, expect } from '@playwright/test';
import { openExplorer } from './explorer-fixture.mjs';

const sections = [
  ['Sentiment', 'Sentiment intelligence'],
  ['Markets', 'Global market performance'],
  ['Competitors', 'Competitive analysis'],
  ['AI Insights', 'AI executive brief'],
  ['Reports', 'Executive reports'],
  ['Alerts', 'Alert center'],
  ['Team', 'Partner team'],
  ['Sources', 'Data sources'],
  ['Settings', 'Workspace settings'],
  ['Overview', 'Executive overview'],
];

async function mainScroll(explorer, page) {
  await explorer.evaluate((element) => {
    let node = element.parentElement;
    while (node && !['auto', 'scroll'].includes(getComputedStyle(node).overflowY)) node = node.parentElement;
    if (!node) throw new Error('Dashboard scroll container not found');
    node.dataset.testid = 'dashboard-main-scroll';
  });
  return page.getByTestId('dashboard-main-scroll');
}

test('sidebar selections show each section at the top even after scrolling', async ({ page }) => {
  const explorer = await openExplorer(page);
  const scroll = await mainScroll(explorer, page);
  for (const [label, heading] of sections) {
    await scroll.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.getByText(label, { exact: true }).first().click();
    await expect(page.getByText(heading, { exact: true }).first()).toBeInViewport();
    await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBeLessThan(5);
  }
  await scroll.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.getByText('Overview', { exact: true }).first().click();
  await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBeLessThan(5);
});

test('mobile menu selection restores the top of the selected section', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const explorer = await openExplorer(page);
  const scroll = await mainScroll(explorer, page);
  await scroll.evaluate((element) => { element.scrollTop = 500; });
  await page.getByText('Sentiment', { exact: true }).first().click();
  await expect(page.getByText('Sentiment intelligence', { exact: true })).toBeInViewport();
  await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBeLessThan(5);
});
