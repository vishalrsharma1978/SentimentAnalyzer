import { test, expect } from '@playwright/test';
import { openExplorer } from './explorer-fixture.mjs';

async function verifyPulse(page, signInAfterPulse = false) {
  const pulse = page.getByTestId('header-pulse');
  await expect(pulse).toBeInViewport();
  const sweep = pulse.locator('div[style*="pulseflow-sweep"]');
  await expect(sweep).toHaveCSS('animation-name', 'pulseflow-sweep');
  const initial = await sweep.evaluate((element) => getComputedStyle(element).transform);
  await expect.poll(() => sweep.evaluate((element) => getComputedStyle(element).transform)).not.toBe(initial);
  const aligned = await pulse.evaluate((element) => {
    const header = element.parentElement.parentElement;
    return header.getBoundingClientRect().right - element.getBoundingClientRect().right;
  });
  expect(aligned).toBeLessThanOrEqual(signInAfterPulse ? 140 : 40);
  expect(aligned).toBeGreaterThanOrEqual(0);
}

for (const width of [1440, 390]) {
  test(`headers display a right-aligned animated pulse at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await verifyPulse(page, true);
    const signIn = page.getByRole('button', { name: 'Demo sign in', exact: true });
    await expect(signIn).toBeInViewport();
    const pulseBox = await page.getByTestId('header-pulse').boundingBox();
    const signInBox = await signIn.boundingBox();
    expect(signInBox.x).toBeGreaterThanOrEqual(pulseBox.x + pulseBox.width);
    await openExplorer(page);
    await verifyPulse(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
