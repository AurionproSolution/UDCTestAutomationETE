/**
 * DO Portal - Login Page
 * Page Object Model for DO Portal authentication
 */
 
import { expect, Locator, Page } from "@playwright/test";
import speakeasy from "speakeasy";
import { DO_BASE_URL } from "../../../config/env";
import { CommonUtils } from "../../../utils/commonUtils";
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
 
    // IdP step: FIS often labels the first step "User ID / Alias" (Material); avoid #mat-input-* (unstable).
    this.usernameInput = page
      .getByRole("searchbox", { name: /User ID\s*\/\s*Alias/i })
      .or(page.getByRole("textbox", { name: /User ID\s*\/\s*Alias/i }))
      .or(page.getByRole("combobox", { name: /User ID\s*\/\s*Alias/i }))
      .or(page.getByLabel(/User ID\s*\/\s*Alias/i))
      .or(page.getByRole("searchbox", { name: /Username/i }))
      .or(page.getByRole("textbox", { name: /Username/i }))
      .or(page.getByRole("combobox", { name: /Username/i }))
      .or(page.getByLabel(/^Username/i));
    this.proceedButton = page.getByRole("button", { name: "Proceed" });
    this.passwordInput = page.getByRole("textbox", { name: "Password" });
    this.yesThisIsMyComputerRadio = page.getByRole("radio", {
      name: /yes,?\s*this is my (computer|mobile device)/i,
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
 
  /** FIS / IdP cookie strip — can block typing into Username until dismissed. */
  private async dismissCookieConsentIfPresent(p: Page): Promise<void> {
    const accept = p.getByRole("button", { name: /^Accept$/i }).first();
    if (await accept.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await accept.click({ timeout: 10_000 }).catch(() => {});
      await p.waitForTimeout(400);
      return;
    }
    const decline = p.getByRole("button", { name: /^Decline$/i }).first();
    if (await decline.isVisible({ timeout: 500 }).catch(() => false)) {
      await decline.click({ timeout: 10_000 }).catch(() => {});
      return;
    }
    const close = p
      .getByRole("button", { name: /^Close$/i })
      .or(p.locator('[aria-label="Close"], [aria-label="close"]'))
      .first();
    if (await close.isVisible({ timeout: 500 }).catch(() => false)) {
      await close.click({ timeout: 5_000 }).catch(() => {});
    }
  }
 
  /** First matching IdP username control (FIS Aurionpro / PrimeNG variants). */
  private async resolveIdpUsernameField(p: Page): Promise<Locator | null> {
    const candidates: Locator[] = [
      // FIS / Angular Material "User Login" step (see udc-perf-test-data.test.ts)
      p.getByRole("searchbox", { name: /User ID\s*\/\s*Alias/i }),
      p.getByRole("textbox", { name: /User ID\s*\/\s*Alias/i }),
      p.getByRole("combobox", { name: /User ID\s*\/\s*Alias/i }),
      p.getByLabel(/User ID\s*\/\s*Alias/i),
      p.getByRole("searchbox", { name: /Username/i }),
      p.getByRole("textbox", { name: /Username/i }),
      p.getByRole("combobox", { name: /Username/i }),
      p.getByLabel(/^Username/i),
      p.locator('input[name="username"]').first(),
      p.locator("#username").first(),
    ];
    for (const loc of candidates) {
      const target = loc.first();
      if (await target.isVisible({ timeout: 900 }).catch(() => false)) {
        return target;
      }
    }
    return null;
  }
 
  private async isCredentialSurfaceReady(p: Page): Promise<boolean> {
    await p.waitForLoadState("domcontentloaded").catch(() => {});
    return (await this.resolveIdpUsernameField(p)) !== null;
  }

  private otpInputs(p: Page): Locator {
    return p.locator(
      [
        "input.otp-input",
        "input[name*='otp' i]",
        "input[id*='otp' i]",
        "input[autocomplete='one-time-code']",
      ].join(", "),
    );
  }

  private deviceTrustRadio(p: Page): Locator {
    return p.getByRole("radio", {
      name: /yes,?\s*this is my (computer|mobile device)/i,
    });
  }

  private async fillTotpIfPrompted(surface: Page, totpSecret?: string): Promise<boolean> {
    const otpInputs = this.otpInputs(surface);
    const firstVisible = await otpInputs
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (!firstVisible) return false;

    if (!totpSecret) {
      throw new Error(
        "SIT OTP prompt detected, but DO_PORTAL_TOTP_SECRET is not set. Set it in your environment and retry.",
      );
    }

    const otp = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
      step: 30,
      digits: 6,
    });

    this.log("SIT OTP prompt detected; entering generated TOTP.");
    const count = await otpInputs.count();
    const visibleInputs: Locator[] = [];
    for (let i = 0; i < count; i++) {
      const input = otpInputs.nth(i);
      if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
        visibleInputs.push(input);
      }
    }

    if (visibleInputs.length > 1) {
      const digits = otp.split("");
      for (let index = 0; index < digits.length && index < visibleInputs.length; index++) {
        await visibleInputs[index].focus();
        await surface.keyboard.type(digits[index]);
      }
      await surface.waitForTimeout(500);
      return true;
    }

    const target = visibleInputs[0] ?? otpInputs.first();
    await target.focus();
    await target.fill(otp);
    await surface.waitForTimeout(500);
    return true;
  }

  /** FIS may skip device-trust when the browser is already trusted. */
  private async selectDeviceTrustIfPrompted(surface: Page): Promise<void> {
    const radio = this.deviceTrustRadio(surface).first();
    const visible = await radio.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!visible) {
      this.log("Device-trust prompt not shown — skipping.");
      return;
    }

    this.log("Selecting device-trust option (Yes, this is my computer / mobile device)");
    await radio.click({ timeout: 10_000 });
    await expect(radio).toBeChecked({ timeout: 5_000 }).catch(() => {});
  }
 
  /**
   * After **Login with FIS**, the IdP form may be on this tab or a new one; the opener can close.
   */
  private async openFisLoginSurface(totalTimeoutMs = 45_000): Promise<Page> {
    try {
      await this.waitForLoadingComplete(15_000);
    } catch {
      // Spinner may be on a closing tab; continue.
    }
 
    const deadline = Date.now() + totalTimeoutMs;
    while (Date.now() < deadline) {
      const pages = this.page.context().pages().filter((pg) => !pg.isClosed());
      for (const pg of pages) {
        if (await this.isCredentialSurfaceReady(pg)) return pg;
      }
      await this.page.waitForTimeout(300);
    }
 
    throw new Error(
      "Timed out waiting for IdP username field after Login with FIS (popup blocked, wrong tab, or UI change).",
    );
  }
 
  /**
   * Post-SSO **Select Application** launcher (no Login with FIS on screen).
   */
  async isAppLauncherVisible(): Promise<boolean> {
    const selectApp = this.page.getByText(/Select Application/i).first();
    const onLauncher =
      (await selectApp.isVisible({ timeout: 3_000 }).catch(() => false)) &&
      (await this.quoteAndAppButton.isVisible({ timeout: 2_000 }).catch(() => false));
    return onLauncher;
  }

  /**
   * After FIS sign-in the IdP tab may close; the portal may be on another tab in the same context.
   */
  private async waitForPortalPageAfterSignIn(timeoutMs = 90_000): Promise<Page> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (const pg of this.page.context().pages()) {
        if (pg.isClosed()) continue;
        const url = pg.url();
        if (/udc-test\.fiscloudservices\.com\/SITDOPortal/i.test(url)) {
          await pg.bringToFront().catch(() => {});
          return pg;
        }
      }
      await this.page.waitForTimeout(300);
    }
    throw new Error(
      "Expected DO Portal URL after FIS sign-in on an open browser tab (check popup blocker / SSO redirect).",
    );
  }

  private async enterDealerFromAppLauncherOn(page: Page): Promise<void> {
    this.log("App launcher detected — opening Quotes & Applications…");
    const quoteAndApp = page.getByRole("link", {
      name: /Quotes & Applications/i,
    });
    await expect(quoteAndApp).toBeVisible({ timeout: 60_000 });
    await page
      .locator(".app-loader-overlay, .p-progressspinner")
      .first()
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => {});
    await quoteAndApp.click({ timeout: 30_000 });
    await page
      .locator(".loading, .spinner, [data-testid='loading']")
      .first()
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => {});
    await page.waitForURL(/\/dealer(\/|$)/i, { timeout: 60_000 }).catch(() => {});
    this.log("Opened Quotes & Applications");
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

    if (await this.isAppLauncherVisible()) {
      this.log("App launcher visible — SSO session already active; skipping Login with FIS.");
      return;
    }

    await expect(this.loginWithFisButton).toBeVisible({ timeout: 90_000 });
  }
 
  /**
   * Login with credentials
   */
  async login(
    username: string,
    password: string,
    options?: { totpSecret?: string },
  ): Promise<void> {
    if (await this.isAppLauncherVisible()) {
      await this.enterDealerFromAppLauncher();
      return;
    }

    this.log(`Logging in as: ${username}`);
    this.log("Clicking Login with FIS button");
    await this.clickElement(this.loginWithFisButton, 90_000);
 
    const surface = await this.openFisLoginSurface(45_000);
    const utils = new CommonUtils(surface);
 
    await this.dismissCookieConsentIfPresent(surface);
 
    this.log(`Entering username: ${username}`);
    const idpUsername = await this.resolveIdpUsernameField(surface);
    if (!idpUsername) {
      throw new Error(
        "IdP username field not found after Login with FIS (check FIS Aurionpro markup / overlays).",
      );
    }
    await idpUsername.click({ timeout: 10_000 }).catch(() => {});
    await utils.fill(idpUsername, username);
 
    this.log("Clicking Proceed");
    const proceed = surface.getByRole("button", { name: "Proceed" });
    await proceed.waitFor({ state: "visible", timeout: 20_000 });
    await utils.click(proceed);
 
    const passwordInput = surface.getByRole("textbox", { name: "Password" });
    await passwordInput.waitFor({ state: "visible", timeout: 30_000 });
    await utils.fill(passwordInput, password);
    this.log("Entered password (value not logged).");

    // Blur so Angular/async validators can run and enable Sign in
    await passwordInput.press("Tab").catch(() => {});

    await this.fillTotpIfPrompted(surface, options?.totpSecret);
    await this.selectDeviceTrustIfPrompted(surface);
    // Some FIS flows show OTP only after device-trust selection.
    await this.fillTotpIfPrompted(surface, options?.totpSecret);

    this.log("Waiting for Sign in button to become enabled");
    const signinButton = surface.getByRole("button", { name: "Sign in" });
    await expect(signinButton).toBeEnabled({ timeout: 90_000 });
 
    this.log("Clicking Sign in");
    await utils.click(signinButton);

    const portalPage = await this.waitForPortalPageAfterSignIn();
    await portalPage
      .locator(".loading, .spinner, [data-testid='loading'], .app-loader-overlay, .p-progressspinner")
      .first()
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => {});

    this.log("Verified portal shell after FIS sign-in");

    const selectApp = portalPage.getByText(/Select Application/i).first();
    const onLauncher =
      (await selectApp.isVisible({ timeout: 5_000 }).catch(() => false)) &&
      (await portalPage
        .getByRole("link", { name: /Quotes & Applications/i })
        .isVisible({ timeout: 3_000 })
        .catch(() => false));

    if (onLauncher) {
      this.log("Clicking Quotes & Applications from app launcher");
      await this.enterDealerFromAppLauncherOn(portalPage);
    }
  }

  /** From `/landing` — same step as after successful FIS sign-in. */
  async enterDealerFromAppLauncher(): Promise<void> {
    await this.enterDealerFromAppLauncherOn(this.page);
  }
 
  /**
   * Login with test data from JSON
   */
  async loginWithTestData(testData: {
    username: string;
    password: string;
    totpSecret?: string;
  }): Promise<void> {
    this.logStep("Login with test data");
    await this.login(testData.username, testData.password, {
      totpSecret: testData.totpSecret,
    });
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
 
 
 