/**
 * DO Portal - Dashboard Tests
 * E2E tests for DO Portal main dashboard
 */

import { test, expect } from "@fixtures/doPortalTest";
import { DO_DEALER_STANDARD_QUOTE_URL } from '../../../config/env';
import { DODashboardPage } from '../../../pages';

const DEALER_NAME = 'Armstrong Prestige Wellington';

test.describe('DO Portal - Dashboard Module', () => {
  let dashboardPage: DODashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DODashboardPage(page);
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
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

  test('should select dealer from dashboard header @do', async () => {
    await dashboardPage.waitForAuthenticatedDashboard();
    await dashboardPage.selectDealer(DEALER_NAME);

    await expect(dashboardPage.dealerDropdownLabel).toHaveAttribute('aria-label', DEALER_NAME);
  });
});




