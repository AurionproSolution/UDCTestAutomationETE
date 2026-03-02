/**
 * CSS Portal - Login Page
 * Page Object Model for CSS Portal authentication
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from '../../common/BasePage';
import { CSS_BASE_URL } from '../../../config/env';

export class CSSLoginPage extends BasePage {
  // Page URL
  readonly url: string;

  // Locators
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly logo: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  readonly captchaBox: Locator;

  constructor(page: Page) {
    super(page);
    this.url = CSS_BASE_URL();

    // CSS Portal specific selectors
    this.usernameInput = page.locator('#css-username, [data-testid="css-username"]');
    this.passwordInput = page.locator('#css-password, [data-testid="css-password"]');
    this.loginButton = page.locator('#css-login-btn, [data-testid="css-login"]');
    this.logo = page.locator('.css-logo, [data-testid="css-logo"]');
    this.forgotPasswordLink = page.locator('a:has-text("Reset Password")');
    this.errorMessage = page.locator('.error-text, [data-testid="error"]');
    this.captchaBox = page.locator('.captcha, [data-testid="captcha"]');
  }

  /**
   * Navigate to CSS Portal login page
   */
  async navigate(): Promise<void> {
    this.log('Navigating to CSS Portal login page');
    await this.navigateTo(this.url);
  }

  /**
   * Login with credentials
   */
  async login(username: string, password: string): Promise<void> {
    this.log(`Logging in to CSS Portal as: ${username}`);
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
    await this.waitForVisible(this.errorMessage, 10000);
    return await this.getText(this.errorMessage);
  }

  /**
   * Verify logo is visible
   */
  async isLogoVisible(): Promise<boolean> {
    return await this.isVisible(this.logo);
  }

  /**
   * Check if captcha is present
   */
  async isCaptchaPresent(): Promise<boolean> {
    return await this.isVisible(this.captchaBox);
  }
}




