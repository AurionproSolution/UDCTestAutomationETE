/**
 * DO Portal - Login Page
 * Page Object Model for DO Portal authentication
 */

import { Locator, Page } from "@playwright/test";
import { DO_BASE_URL } from "../../../config/env";
import { BasePage } from "../../common/BasePage";

export class DOLoginPage extends BasePage {
  // Page URL
  readonly url: string;

  // Locators
  readonly usernameInput: Locator;
  readonly proceedButton: Locator;
  readonly passwordInput: Locator;
  readonly yesThisIsMyComputerRadio: Locator;
  readonly loginWithFisButton: Locator;
  readonly signinButton: Locator;
  readonly quoteAndAppButton: Locator;
  readonly logo: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorAlert: Locator;
  readonly rememberMeCheckbox: Locator;

  constructor(page: Page) {
    super(page);
    this.url = DO_BASE_URL();

    // DO Portal specific selectors
    this.usernameInput = page.getByRole("searchbox", { name: "Username" });
    this.proceedButton = page.getByRole("button", { name: "Proceed" });
    this.passwordInput = page.getByRole("textbox", { name: "Password" });
    this.yesThisIsMyComputerRadio = page.getByRole("radio", {
      name: "Yes, this is my computer",
    });
    this.loginWithFisButton = page.getByRole("button", {
      name: "Login with FIS",
    });
    this.signinButton = page.getByRole("button", { name: "Sign in" });
    this.quoteAndAppButton = page.getByRole("link", {
      name: /Quotes & Applications/i,
    });
    this.logo = page.locator('.logo, [data-testid="logo"]');
    this.forgotPasswordLink = page.locator('a:has-text("Forgot Password")');
    this.errorAlert = page.locator('[role="alert"], .error-message');
    this.rememberMeCheckbox = page.locator(
      '#rememberMe, [data-testid="remember-me"]',
    );
  }

  /**
   * Navigate to DO Portal login page
   */
  async navigate(urlOverride?: string): Promise<void> {
    const targetUrl = urlOverride ?? this.url; // this.url = default from the page object
    this.log(`Navigating to DO Portal login page: ${targetUrl}`);
    await this.navigateTo(targetUrl);
  }

  /**
   * Login with credentials
   */
  async login(username: string, password: string): Promise<void> {
    this.log(`Logging in as: ${username}`);
    await this.clickElement(this.loginWithFisButton);
    await this.fillElement(this.usernameInput, username);
    await this.clickElement(this.proceedButton);
    await this.fillElement(this.passwordInput, password);
    await this.clickElement(this.yesThisIsMyComputerRadio);
    await this.clickElement(this.signinButton);
    await this.waitForLoadingComplete();
    await this.clickElement(this.quoteAndAppButton);
    await this.waitForLoadingComplete();
  }

  /**
   * Login with test data from JSON
   */
  async loginWithTestData(testData: {
    username: string;
    password: string;
  }): Promise<void> {
    await this.login(testData.username, testData.password);
  }

  /**
   * Navigate to forgot password
   */
  async navigateToForgotPassword(): Promise<void> {
    await this.navigate();
    await this.clickElement(this.forgotPasswordLink);
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
    await this.clickElement(this.rememberMeCheckbox);
  }
}
