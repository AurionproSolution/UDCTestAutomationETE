/**
 * RSS Portal - Login Tests
 * E2E tests for RSS Portal authentication
 */

import { test, expect } from '@playwright/test';
import { RSSLoginPage, RSSDashboardPage } from '../../../pages';
import rssLoginData from '../../../testData/rss-portal/loginData.json';

test.describe('RSS Portal - Login Module', () => {
  let loginPage: RSSLoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new RSSLoginPage(page);
  });

  test('should display login page with all elements @smoke @rss', async ({ page }) => {
    await loginPage.navigate();

    // Verify login page elements
    await expect(loginPage.logo).toBeVisible();
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('should login with valid credentials @smoke @rss @regression', async ({ page }) => {
    const dashboardPage = new RSSDashboardPage(page);

    await loginPage.navigate();
    await loginPage.loginWithTestData(rssLoginData.validUsers[0]);

    // Verify successful login
    const isLoaded = await dashboardPage.isDashboardLoaded();
    expect(isLoaded).toBe(true);
  });

  test('should show error for invalid credentials @regression @rss', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login('invalidUser', 'wrongPassword');

    // Verify error message
    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toBeTruthy();
  });

  test('should have SSO login option @rss', async ({ page }) => {
    await loginPage.navigate();

    // Verify SSO button is visible
    await expect(loginPage.ssoLoginButton).toBeVisible();
  });
});

// Data-Driven Tests
test.describe('RSS Portal - Data-Driven Login Tests', () => {
  const testScenarios = [
    { username: 'rss_user1', password: 'pass1', shouldPass: true },
    { username: 'rss_user2', password: 'pass2', shouldPass: true },
    { username: 'invalid', password: 'wrong', shouldPass: false },
  ];

  for (const scenario of testScenarios) {
    test(`Login scenario - user: ${scenario.username} @rss`, async ({ page }) => {
      const loginPage = new RSSLoginPage(page);
      await loginPage.navigate();
      await loginPage.login(scenario.username, scenario.password);

      if (scenario.shouldPass) {
        expect(page.url()).not.toContain('login');
      } else {
        expect(page.url()).toContain('login');
      }
    });
  }
});




