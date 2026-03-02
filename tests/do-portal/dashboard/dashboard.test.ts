/**
 * DO Portal - Dashboard Tests
 * E2E tests for DO Portal main dashboard
 */

import { test, expect } from '@playwright/test';
import { DOLoginPage, DODashboardPage } from '../../../pages';
import doLoginData from '../../../testData/do-portal/loginData.json';

test.describe('DO Portal - Dashboard Module', () => {
  let loginPage: DOLoginPage;
  let dashboardPage: DODashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new DOLoginPage(page);
    dashboardPage = new DODashboardPage(page);

    // Login before each test
    await loginPage.navigate();
    await loginPage.loginWithTestData(doLoginData.validUsers[0]);
  });

  test('should display dashboard after login @smoke @do', async () => {
    const isLoaded = await dashboardPage.isDashboardLoaded();
    expect(isLoaded).toBe(true);
  });

  test('should display correct welcome message @do', async () => {
    const welcomeMsg = await dashboardPage.getWelcomeMessage();
    expect(welcomeMsg).toBeTruthy();
  });

  test('should navigate to menu items @do @regression', async () => {
    // Navigate to a menu item - update with actual menu text
    await dashboardPage.navigateToMenuItem('Users');

    // Verify navigation
    expect(dashboardPage.getCurrentUrl()).toContain('users');
  });

  test('should logout successfully @smoke @do', async ({ page }) => {
    await dashboardPage.logout();

    // Verify redirect to login page
    expect(page.url()).toContain('login');
  });

  test('should display notification count @do', async () => {
    const count = await dashboardPage.getNotificationCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});




