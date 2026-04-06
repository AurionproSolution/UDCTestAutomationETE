import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
 
  await page.goto('https://www.myntra.com/');
  await page.locator('#tads').getByRole('link', { name: 'Myntra | Online Fashion Store' }).click();
  await page.locator('#desktop-header-cnt').getByRole('link', { name: 'Men', exact: true }).click();
  await page.getByRole('heading', { name: 'Biggest Deals On Top Brands' }).click();
  await page.locator('.image-image.undefined').first().click();
  await page.getByText('ProfileWelcomeTo access').click();
  await page.locator('span').filter({ hasText: /^Wishlist$/ }).click();
});