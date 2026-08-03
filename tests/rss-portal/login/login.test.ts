/**
 * RSS Portal - Login Tests
 * E2E tests for RSS Portal authentication
 */

import { test as base, expect } from '@playwright/test';
import { test as rssTest, expect as rssExpect } from '../../../fixtures/rssPortalTest';
import { RSSLoginPage, RSSDashboardPage } from '../../../pages';

base.describe('RSS Portal - Login Module (unauthenticated)', () => {
  let loginPage: RSSLoginPage;

  base.beforeEach(async ({ page }) => {
    loginPage = new RSSLoginPage(page);
  });

  base('should show error for invalid credentials @regression @rss', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login('invalidUser', 'wrongPassword');

    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toBeTruthy();
  });

  base('should have SSO login option @rss', async ({ page }) => {
    await loginPage.navigate();
    await expect(loginPage.ssoLoginButton).toBeVisible();
  });
});

rssTest.describe('RSS Portal - Login Module (SIT authenticated)', () => {
  rssTest('should login with valid credentials @smoke @rss @regression', async ({ page }) => {
    const dashboard = new RSSDashboardPage(page);
    rssExpect(await dashboard.isDashboardLoaded()).toBe(true);
  });
});

// Data-Driven Tests (unauthenticated — QAT/local shell)
base.describe('RSS Portal - Data-Driven Login Tests', () => {
  const testScenarios = [
    { username: 'rss_user1', password: 'pass1', shouldPass: true },
    { username: 'rss_user2', password: 'pass2', shouldPass: true },
    { username: 'invalid', password: 'wrong', shouldPass: false },
  ];

  for (const scenario of testScenarios) {
    base(`Login scenario - user: ${scenario.username} @rss`, async ({ page }) => {
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

