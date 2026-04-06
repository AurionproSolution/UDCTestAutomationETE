/**
 * RSS Portal - Login Page
 * Page Object Model for RSS Portal authentication
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../common/BasePage';
import { RSS_BASE_URL } from '../../../config/env';

export class RSSLoginPage extends BasePage {
  // Page URL
  readonly url: string;

  // Locators
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly logo: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorAlert: Locator;
  readonly ssoLoginButton: Locator;

  constructor(page: Page) {
    super(page);
    this.url = RSS_BASE_URL();

    // RSS Portal specific selectors
    this.usernameInput = page.locator('#username, [data-testid="rss-username"]');
    this.passwordInput = page.locator('#password, [data-testid="rss-password"]');
    this.loginButton = page.locator('#submitBtn, [data-testid="rss-login-btn"]');
    this.logo = page.locator('.rss-logo, [data-testid="rss-logo"]');
    this.forgotPasswordLink = page.locator('a:has-text("Forgot Password")');
    this.errorAlert = page.locator('.alert-danger, [role="alert"]');
    this.ssoLoginButton = page.locator('#sso-login, [data-testid="sso-btn"]');
  }

  /**
   * Navigate to RSS Portal login page
   */
  async navigate(): Promise<void> {
    this.log('Navigating to RSS Portal login page');
    await this.navigateTo(this.url);
  }

  /**
   * Login with credentials
   */
  async login(username: string, password: string): Promise<void> {
    this.log(`Logging in to RSS Portal as: ${username}`);
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);
    await this.waitForLoadingComplete();
  }

  /**
   * Login with test data from JSON
   */
  async loginWithTestData(testData: { username: string; password: string }): Promise<void> {
    await this.login(testData.username, testData.password);
  }

  /**
   * Login via SSO
   */
  async loginViaSSO(): Promise<void> {
    this.log('Logging in via SSO');
    await this.click(this.ssoLoginButton);
  }

  /**
   * Navigate to forgot password
   */
  async navigateToForgotPassword(): Promise<void> {
    await this.navigate();
    await this.click(this.forgotPasswordLink);
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string> {
    await this.waitForVisible(this.errorAlert, 10000);
    return await this.getText(this.errorAlert);
  }

  /**
   * Verify logo is visible
   */
  async isLogoVisible(): Promise<boolean> {
    return await this.isVisible(this.logo);
  }
}




