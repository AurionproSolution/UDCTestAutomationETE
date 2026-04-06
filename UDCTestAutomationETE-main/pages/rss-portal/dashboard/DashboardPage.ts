/**
 * RSS Portal - Dashboard Page
 * Page Object Model for RSS Portal main dashboard
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../common/BasePage';

export class RSSDashboardPage extends BasePage {
  // Locators
  readonly pageHeader: Locator;
  readonly welcomeBanner: Locator;
  readonly navigationMenu: Locator;
  readonly userDropdown: Locator;
  readonly logoutLink: Locator;
  readonly searchBox: Locator;
  readonly reportsSection: Locator;

  constructor(page: Page) {
    super(page);

    // RSS Portal dashboard specific selectors
    this.pageHeader = page.locator('.rss-header, h1');
    this.welcomeBanner = page.locator('.welcome-banner, [data-testid="welcome-banner"]');
    this.navigationMenu = page.locator('.nav-menu, [data-testid="nav-menu"]');
    this.userDropdown = page.locator('.user-dropdown, [data-testid="user-menu"]');
    this.logoutLink = page.locator('a:has-text("Logout"), [data-testid="logout-link"]');
    this.searchBox = page.locator('#globalSearch, [data-testid="search"]');
    this.reportsSection = page.locator('.reports-section, [data-testid="reports"]');
  }

  /**
   * Verify dashboard is loaded
   */
  async isDashboardLoaded(): Promise<boolean> {
    await this.waitForLoadingComplete();
    return await this.isVisible(this.pageHeader);
  }

  /**
   * Navigate to menu item
   */
  async navigateToMenuItem(menuText: string): Promise<void> {
    const menuItem = this.navigationMenu.locator(`text=${menuText}`);
    await this.click(menuItem);
    await this.waitForLoadingComplete();
  }

  /**
   * Perform global search
   */
  async globalSearch(searchText: string): Promise<void> {
    await this.fill(this.searchBox, searchText);
    await this.page.keyboard.press('Enter');
    await this.waitForLoadingComplete();
  }

  /**
   * Logout from portal
   */
  async logout(): Promise<void> {
    this.log('Logging out from RSS Portal');
    await this.click(this.userDropdown);
    await this.click(this.logoutLink);
  }

  /**
   * Open reports section
   */
  async openReports(): Promise<void> {
    await this.click(this.reportsSection);
    await this.waitForLoadingComplete();
  }
}




