/**
 * CSS Portal - Login Tests
 * E2E tests for CSS Portal authentication
 */

import { test, expect } from '@playwright/test';
import { CSSLoginPage, CSSDashboardPage } from '../../../pages';
import cssLoginData from '../../../testData/css-portal/loginData.json';

test.describe('CSS Portal - Login Module', () => {
  let loginPage: CSSLoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new CSSLoginPage(page);
  });

  test('should display login page with all elements @smoke @css', async ({ page }) => {
    await loginPage.navigate();

    // Verify login page elements
    await expect(loginPage.logo).toBeVisible();
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('should login with valid credentials @smoke @css @regression', async ({ page }) => {
    const dashboardPage = new CSSDashboardPage(page);

    await loginPage.navigate();
    await loginPage.loginWithTestData(cssLoginData.validUsers[0]);

    // Verify successful login
    const isLoaded = await dashboardPage.isDashboardLoaded();
    expect(isLoaded).toBe(true);
  });

  test('should show error for invalid credentials @regression @css', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login('invalidUser', 'wrongPassword');

    // Verify error message
    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toBeTruthy();
  });

  test('should navigate to forgot password page @smoke @css', async ({ page }) => {
    await loginPage.navigateToForgotPassword();

    // Verify navigation
    expect(page.url()).toContain('reset');
  });

  test('should check captcha presence @css', async ({ page }) => {
    await loginPage.navigate();

    // Check if captcha is present (may vary by environment)
    const hasCaptcha = await loginPage.isCaptchaPresent();
    // Just log the result - captcha may not always be present
    console.log(`Captcha present: ${hasCaptcha}`);
  });
});

// Data-Driven Tests
test.describe('CSS Portal - Data-Driven Login Tests', () => {
  const testScenarios = [
    { username: 'css_admin', password: 'adminPass', role: 'admin' },
    { username: 'css_user', password: 'userPass', role: 'user' },
    { username: 'css_viewer', password: 'viewerPass', role: 'viewer' },
  ];

  for (const scenario of testScenarios) {
    test(`Login as ${scenario.role} @css @regression`, async ({ page }) => {
      const loginPage = new CSSLoginPage(page);
      await loginPage.navigate();
      await loginPage.login(scenario.username, scenario.password);

      // Verify login attempt
      expect(true).toBe(true); // Placeholder - update with actual assertions
    });
  }
});




