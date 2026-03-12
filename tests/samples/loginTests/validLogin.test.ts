import { expect, test } from '@playwright/test';

test.describe('Authentication Suite - Valid Login', () => {
  test('1.1. Valid Login with Correct Credentials', async ({ page }) => {
    // Step 1: Navigate to the login page
    await page.goto('https://the-internet.herokuapp.com/login');
    
    // Expectations: Login page is displayed, username and password textboxes are visible
    const pageHeading = page.locator('h2');
    await expect(pageHeading).toContainText('Login Page');
    
    const usernameInput = page.locator('input#username');
    const passwordInput = page.locator('input#password');
    
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Step 2: Enter valid username 'tomsmith'
    await usernameInput.click();
    await usernameInput.fill('tomsmith');
    
    // Expectation: Username field contains 'tomsmith'
    await expect(usernameInput).toHaveValue('tomsmith');

    // Step 3: Enter valid password 'SuperSecretPassword!'/*  */
        await passwordInput.click();
    await passwordInput.fill('SuperSecretPassword!');
    
    // Expectation: Password field is filled but masked
       await expect(passwordInput).toHaveValue('SuperSecretPassword!');
    // Verify the input type is password (for masking)
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Step 4: Click the Login button
    const loginButton = page.locator('button[type="submit"]');
    await Promise.all([
      page.waitForNavigation({ url: /.*\/secure.*/, waitUntil: 'load', timeout: 15000 }),
      loginButton.click(),
    ]);

    // Verify we're on the secure/success page
    await expect(page).toHaveURL(/.*\/secure.*/, { timeout: 15000 });

    const successMessage = page.locator('.flash.success');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    await expect(successMessage).toContainText('You logged into a secure area!');

    // Verify the logout button is present (indicating successful login)
    const logoutButton = page.locator('a.button');
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await expect(logoutButton).toContainText('Logout');
  });
});
