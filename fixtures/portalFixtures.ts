/**
 * Portal Fixtures - Custom Playwright fixtures for UDC portals
 * Provides pre-configured page objects and authenticated sessions
 */

import { test as base, Page } from '@playwright/test';
import { DOLoginPage, DODashboardPage } from '../pages/do-portal';
import { RSSLoginPage, RSSDashboardPage } from '../pages/rss-portal';
import { CSSLoginPage, CSSDashboardPage } from '../pages/css-portal';
import { CommonUtils } from '../utils/commonUtils';
import { TableUtils } from '../utils/tableUtils';

// Import test data
import doLoginData from '../testData/do-portal/loginData.json';
import rssLoginData from '../testData/rss-portal/loginData.json';
import cssLoginData from '../testData/css-portal/loginData.json';

// ============ Type Definitions ============

type PortalType = 'do' | 'rss' | 'css';

interface PortalFixtures {
  // Utility fixtures
  utils: CommonUtils;
  tableUtils: TableUtils;

  // DO Portal fixtures
  doLoginPage: DOLoginPage;
  doDashboardPage: DODashboardPage;
  doAuthenticatedPage: Page;

  // RSS Portal fixtures
  rssLoginPage: RSSLoginPage;
  rssDashboardPage: RSSDashboardPage;
  rssAuthenticatedPage: Page;

  // CSS Portal fixtures
  cssLoginPage: CSSLoginPage;
  cssDashboardPage: CSSDashboardPage;
  cssAuthenticatedPage: Page;
}

// ============ Extended Test with Fixtures ============

export const test = base.extend<PortalFixtures>({
  // Common Utils fixture
  utils: async ({ page }, use) => {
    const utils = new CommonUtils(page);
    await use(utils);
  },

  // Table Utils fixture
  tableUtils: async ({ page }, use) => {
    const tableUtils = new TableUtils(page);
    await use(tableUtils);
  },

  // -------- DO Portal Fixtures --------

  doLoginPage: async ({ page }, use) => {
    const loginPage = new DOLoginPage(page);
    await use(loginPage);
  },

  doDashboardPage: async ({ page }, use) => {
    const dashboardPage = new DODashboardPage(page);
    await use(dashboardPage);
  },

  // Pre-authenticated DO Portal page
  doAuthenticatedPage: async ({ page }, use) => {
    const loginPage = new DOLoginPage(page);
    await loginPage.navigate();
    await loginPage.loginWithTestData(doLoginData.validUsers[0]);
    await page.waitForLoadState('networkidle');
    await use(page);
  },

  // -------- RSS Portal Fixtures --------

  rssLoginPage: async ({ page }, use) => {
    const loginPage = new RSSLoginPage(page);
    await use(loginPage);
  },

  rssDashboardPage: async ({ page }, use) => {
    const dashboardPage = new RSSDashboardPage(page);
    await use(dashboardPage);
  },

  // Pre-authenticated RSS Portal page
  rssAuthenticatedPage: async ({ page }, use) => {
    const loginPage = new RSSLoginPage(page);
    await loginPage.navigate();
    await loginPage.loginWithTestData(rssLoginData.validUsers[0]);
    await page.waitForLoadState('networkidle');
    await use(page);
  },

  // -------- CSS Portal Fixtures --------

  cssLoginPage: async ({ page }, use) => {
    const loginPage = new CSSLoginPage(page);
    await use(loginPage);
  },

  cssDashboardPage: async ({ page }, use) => {
    const dashboardPage = new CSSDashboardPage(page);
    await use(dashboardPage);
  },

  // Pre-authenticated CSS Portal page
  cssAuthenticatedPage: async ({ page }, use) => {
    const loginPage = new CSSLoginPage(page);
    await loginPage.navigate();
    await loginPage.loginWithTestData(cssLoginData.validUsers[0]);
    await page.waitForLoadState('networkidle');
    await use(page);
  },
});

// Export expect from base
export { expect } from '@playwright/test';

// ============ Helper Functions ============

/**
 * Get authenticated page for specified portal
 */
export async function getAuthenticatedPage(page: Page, portal: PortalType): Promise<Page> {
  switch (portal) {
    case 'do': {
      const loginPage = new DOLoginPage(page);
      await loginPage.navigate();
      await loginPage.loginWithTestData(doLoginData.validUsers[0]);
      break;
    }
    case 'rss': {
      const loginPage = new RSSLoginPage(page);
      await loginPage.navigate();
      await loginPage.loginWithTestData(rssLoginData.validUsers[0]);
      break;
    }
    case 'css': {
      const loginPage = new CSSLoginPage(page);
      await loginPage.navigate();
      await loginPage.loginWithTestData(cssLoginData.validUsers[0]);
      break;
    }
  }
  await page.waitForLoadState('networkidle');
  return page;
}




