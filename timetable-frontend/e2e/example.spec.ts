import { test, expect } from '@playwright/test';

test.describe('Basic App E2E', () => {
  test('homepage loads and shows the app title', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for root element
    await page.waitForSelector('body');

    // Basic smoke: ensure the document has a title or header
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
