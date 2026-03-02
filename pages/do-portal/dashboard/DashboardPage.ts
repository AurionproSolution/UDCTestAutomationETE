/**
 * DO Portal - Dashboard Page
 * Page Object Model for DO Portal main dashboard
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../common/BasePage';

export class DODashboardPage extends BasePage {
  // Locators
  readonly pageHeader: Locator;
  readonly welcomeMessage: Locator;
  readonly sideMenu: Locator;
  readonly userProfile: Locator;
  readonly logoutButton: Locator;
  readonly notificationBell: Locator;
  readonly quickActions: Locator;

  constructor(page: Page) {
    super(page);

    // DO Portal dashboard specific selectors
    this.pageHeader = page.locator('h1, h2, .page-header');
    this.welcomeMessage = page.locator('.welcome-message, [data-testid="welcome"]');
    this.sideMenu = page.locator('.side-menu, nav, [data-testid="side-nav"]');
    this.userProfile = page.locator('.user-profile, [data-testid="user-profile"]');
    this.logoutButton = page.locator('button:has-text("Logout"), [data-testid="logout"]');
    this.notificationBell = page.locator('.notification-bell, [data-testid="notifications"]');
    this.quickActions = page.locator('.quick-actions, [data-testid="quick-actions"]');
  }

  /**
   * Verify dashboard is loaded
   */
  async isDashboardLoaded(): Promise<boolean> {
    await this.waitForLoadingComplete();
    return await this.isVisible(this.pageHeader);
  }

  /**
   * Get welcome message text
   */
  async getWelcomeMessage(): Promise<string> {
    return await this.getText(this.welcomeMessage);
  }

  /**
   * Navigate to menu item
   */
  async navigateToMenuItem(menuText: string): Promise<void> {
    const menuItem = this.sideMenu.locator(`text=${menuText}`);
    await this.click(menuItem);
    await this.waitForLoadingComplete();
  }

  /**
   * Logout from portal
   */
  async logout(): Promise<void> {
    this.log('Logging out from DO Portal');
    await this.click(this.userProfile);
    await this.click(this.logoutButton);
  }

  /**
   * Get notification count
   */
  async getNotificationCount(): Promise<number> {
    const badge = this.notificationBell.locator('.badge, .count');
    const text = await this.getText(badge);
    return parseInt(text) || 0;
  }

  /**
   * Click quick action by name
   */
  async clickQuickAction(actionName: string): Promise<void> {
    const action = this.quickActions.locator(`text=${actionName}`);
    await this.click(action);
  }
}




