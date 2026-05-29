/**
 * DO Portal - Login Page
 * Page Object Model for DO Portal authentication
 */

import { expect, Locator, Page } from "@playwright/test";
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
    /** IdP / marketing shell: entry may be button or link; copy varies (Login with FIS, Sign in with FIS, spacing). */
    this.loginWithFisButton = page
      .getByRole("button", { name: /login\s*(with)?\s*fis/i })
      .or(page.getByRole("link", { name: /login\s*(with)?\s*fis/i }))
      .or(page.getByRole("button", { name: /sign\s*in\s*(with)?\s*fis/i }))
      .or(page.getByRole("link", { name: /sign\s*in\s*(with)?\s*fis/i }))
      .first();
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

  protected stepLogPrefix(): string {
    return "DO Portal — Login";
  }

  /**
   * Navigate to DO Portal login page
   */
  async navigate(urlOverride?: string): Promise<void> {
    this.logStep("Navigate");
    const targetUrl = urlOverride ?? this.url; // this.url = default from the page object
    this.log(`Navigating to DO Portal login page: ${targetUrl}`);
    await this.navigateTo(targetUrl);
    // domcontentloaded returns before SPA/SSO shell paints the FIS button; wait for the real login entry.
    await this.page.waitForLoadState("load");
    await expect(this.loginWithFisButton).toBeVisible({ timeout: 90_000 });
  }

  /**
   * Login with credentials
   */
  async login(username: string, password: string): Promise<void> {
    this.log(`Logging in as: ${username}`);
    this.log("Clicking Login with FIS button");
    await this.clickElement(this.loginWithFisButton, 90_000);

    this.log(`Entering username: ${username}`);
    await this.fillElement(this.usernameInput, username);

    this.log("Clicking Proceed");
    await this.clickElement(this.proceedButton);

    await this.fillElement(this.passwordInput, password);
    this.log("Entered password (value not logged).");

    // Blur so Angular/async validators can run and enable Sign in
    await this.passwordInput.press("Tab");
    this.log("Selecting 'Yes, this is my computer'");
    await this.clickElement(this.yesThisIsMyComputerRadio);
    await expect(this.yesThisIsMyComputerRadio).toBeChecked({ timeout: 15_000 });

    this.log('Waiting for Sign in button to become enabled');
    await expect(this.signinButton).toBeEnabled({ timeout: 90_000 });

    this.log('Clicking Sign in');
    await this.clickElement(this.signinButton);

    await this.waitForLoadingComplete();
    this.log('Verified dashboard is loaded or navigation completed');

    this.log('Clicking Quotes & Applications from dashboard');
    await expect(this.quoteAndAppButton).toBeVisible({ timeout: 90_000 });
    await this.clickElement(this.quoteAndAppButton);
    await this.waitForLoadingComplete();
    this.log('Opened Quotes & Applications');
  }

  /**
   * Login with test data from JSON
   */
  async loginWithTestData(testData: {
    username: string;
    password: string;
  }): Promise<void> {
    this.logStep("Login with test data");
    await this.login(testData.username, testData.password);
  }

  /**
   * Navigate to forgot password
   */
  async navigateToForgotPassword(): Promise<void> {
    this.logStep("Navigate To Forgot Password");
    await this.navigate();
    await this.clickElement(this.forgotPasswordLink);
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string> {
    this.logStep("Get Error Message");
    await this.waitForVisible(this.errorAlert, 10000);
    return await this.getText(this.errorAlert);
  }

  /**
   * Verify logo is visible
   */
  async isLogoVisible(): Promise<boolean> {
    this.logStep("Is Logo Visible");
    return await this.isVisible(this.logo);
  }

  /**
   * Toggle remember me checkbox
   */
  async toggleRememberMe(): Promise<void> {
    this.logStep("Toggle Remember Me");
    await this.clickElement(this.rememberMeCheckbox);
  }
}
