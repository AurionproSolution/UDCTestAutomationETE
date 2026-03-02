import { test, expect } from '@playwright/test';

/**
 * Example Test Suite
 * Basic Playwright tests to verify framework setup
 */
test.describe('Example Tests - Framework Verification', () => {
  
  test('should navigate to Playwright homepage', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    
    // Verify page title
    await expect(page).toHaveTitle(/Playwright/);
  });

  test('should have Get Started link', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    
    // Click the get started link
    const getStartedLink = page.getByRole('link', { name: 'Get started' });
    await expect(getStartedLink).toBeVisible();
  });

  test('should navigate to docs page', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    
    // Click the get started link
    await page.getByRole('link', { name: 'Get started' }).click();
    
    // Expects page to have a heading with the name of Installation
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  });
});

