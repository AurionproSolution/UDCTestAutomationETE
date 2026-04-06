import { test } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.aurionpro.com/');
  await page.getByRole('button', { name: 'Business' }).click();
  await page.getByLabel('Navigation').getByRole('link', { name: 'Lending' }).click();
  await page.getByRole('button', { name: 'Insights' }).click();
  await page.getByLabel('Navigation').getByRole('link', { name: 'Investors' }).click();
  await page.locator('div').filter({ hasText: 'Financial Results Presenting' }).nth(5).click();
});