/**
 * CSS Portal - Dashboard Page
 * Page Object Model for CSS Portal main dashboard
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../common/BasePage';

export class CSSDashboardPage extends BasePage {
  // Locators
  readonly pageTitle: Locator;
  readonly mainNavigation: Locator;
  readonly userInfo: Locator;
  readonly signOutButton: Locator;
  readonly dashboardCards: Locator;
  readonly activityFeed: Locator;
  readonly helpButton: Locator;

  constructor(page: Page) {
    super(page);

    // CSS Portal dashboard specific selectors
    this.pageTitle = page.locator('.css-page-title, h1');
    this.mainNavigation = page.locator('.css-main-nav, [data-testid="main-nav"]');
    this.userInfo = page.locator('.user-info, [data-testid="user-info"]');
    this.signOutButton = page.locator('#signOut, [data-testid="sign-out"]');
    this.dashboardCards = page.locator('.dashboard-cards, [data-testid="cards"]');
    this.activityFeed = page.locator('.activity-feed, [data-testid="activity"]');
    this.helpButton = page.locator('#helpBtn, [data-testid="help"]');
  }

  /**
   * Verify dashboard is loaded
   */
  async isDashboardLoaded(): Promise<boolean> {
    await this.waitForLoadingComplete();
    return await this.isVisible(this.pageTitle);
  }

  /**
   * Navigate to menu item
   */
  async navigateToMenuItem(menuText: string): Promise<void> {
    const menuItem = this.mainNavigation.locator(`text=${menuText}`);
    await this.click(menuItem);
    await this.waitForLoadingComplete();
  }

  /**
   * Sign out from portal
   */
  async signOut(): Promise<void> {
    this.log('Signing out from CSS Portal');
    await this.click(this.signOutButton);
  }

  /**
   * Get user info text
   */
  async getUserInfo(): Promise<string> {
    return await this.getText(this.userInfo);
  }

  /**
   * Click on dashboard card
   */
  async clickDashboardCard(cardTitle: string): Promise<void> {
    const card = this.dashboardCards.locator(`text=${cardTitle}`);
    await this.click(card);
    await this.waitForLoadingComplete();
  }

  /**
   * Get activity feed items count
   */
  async getActivityCount(): Promise<number> {
    const items = this.activityFeed.locator('.activity-item, li');
    return await items.count();
  }

  /**
   * Open help
   */
  async openHelp(): Promise<void> {
    await this.click(this.helpButton);
  }
}




