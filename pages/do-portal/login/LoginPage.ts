/**
 * DO Portal - Login Page
 * Page Object Model for DO Portal authentication
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../common/BasePage';
import { DO_BASE_URL } from '../../../config/env';

export class DOLoginPage extends BasePage {
  // Page URL
  readonly url: string;

  // Locators
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly logo: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorAlert: Locator;
  readonly rememberMeCheckbox: Locator;

  constructor(page: Page) {
    super(page);
    this.url = DO_BASE_URL();

    // DO Portal specific selectors
    this.usernameInput = page.locator('#loginUsername, [data-testid="username"]');
    this.passwordInput = page.locator('#loginPassword, [data-testid="password"]');
    this.loginButton = page.locator('#login-button, [data-testid="login-btn"]');
    this.logo = page.locator('.logo, [data-testid="logo"]');
    this.forgotPasswordLink = page.locator('a:has-text("Forgot Password")');
    this.errorAlert = page.locator('[role="alert"], .error-message');
    this.rememberMeCheckbox = page.locator('#rememberMe, [data-testid="remember-me"]');
  }

  /**
   * Navigate to DO Portal login page
   */
  async navigate(): Promise<void> {
    this.log('Navigating to DO Portal login page');
    await this.navigateTo(this.url);
  }

  /**
   * Login with credentials
   */
  async login(username: string, password: string): Promise<void> {
    this.log(`Logging in as: ${username}`);
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

  /**
   * Toggle remember me checkbox
   */
  async toggleRememberMe(): Promise<void> {
    await this.click(this.rememberMeCheckbox);
  }
}




