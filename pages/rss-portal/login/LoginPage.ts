/**
 * RSS Portal - Login Page
 * Page Object Model for RSS Portal authentication
 */

import { expect, Page, Locator } from '@playwright/test';
import speakeasy from 'speakeasy';
import { BasePage } from '../../common/BasePage';
import { RSS_BASE_URL } from '../../../config/env';
import { CommonUtils } from '../../../utils/commonUtils';

export class RSSLoginPage extends BasePage {
  // Page URL
  readonly url: string;

  /** Page used for the login form after “Login with FIS” (may be a new tab if the opener closes). */
  private sessionPage: Page | null = null;

  // Locators
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly logo: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorAlert: Locator;
  readonly ssoLoginButton: Locator;
  /** Landing-page control that routes to the FIS login experience (PrimeNG button). */
  readonly loginWithFisButton: Locator;

  constructor(page: Page) {
    super(page);
    this.url = RSS_BASE_URL();

    // RSS Portal specific selectors
    this.usernameInput = page.locator('#username, [data-testid="rss-username"]');
    this.passwordInput = page.locator('#password, [data-testid="rss-password"]');
    this.loginButton = page.locator('#submitBtn, [data-testid="rss-login-btn"]');
    this.logo = page.locator('.rss-logo, [data-testid="rss-logo"]');
    this.forgotPasswordLink = page.locator('a:has-text("Forgot Password")');
    this.errorAlert = page.locator(RSSLoginPage.LOGIN_ERROR_OUTCOME).first();
    this.ssoLoginButton = page.locator('#sso-login, [data-testid="sso-btn"]');
    this.loginWithFisButton = page.getByRole('button', { name: /Login with FIS/i });
  }

  protected stepLogPrefix(): string {
    return "RSS Portal — Login";
  }

  /**
   * Page that holds the RSS session after login (same as constructor `page`, or a window opened by FIS).
   * Use this for dashboard assertions when FIS opens a new tab.
   */
  getSessionPage(): Page {
    return this.sessionPage ?? this.page;
  }

  private static readonly USERNAME_SELECTOR =
    '#username, [data-testid="rss-username"], input[name="username"], input[type="email"]';
  private static readonly PASSWORD_SELECTOR =
    '#password, [data-testid="rss-password"]';
  private static readonly SUBMIT_SELECTOR =
    '#submitBtn, [data-testid="rss-login-btn"]';

  /**
   * Visible login / IdP failure UI for outcome racing.
   * Exclude RUF `role="alert"` strips (OTP / “trust this device” hints) — they are not auth failures and break strict mode when grouped with `.alert-danger`.
   */
  private static readonly LOGIN_ERROR_OUTCOME =
    '.alert-danger, [role="alert"]:not(.ruf-statusbar-wrapper)';

  /** FIS / IdP cookie strip — can block typing into Username until dismissed. */
  private async dismissCookieConsentIfPresent(p: Page): Promise<void> {
    const accept = p.getByRole('button', { name: /^Accept$/i }).first();
    if (await accept.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await accept.click({ timeout: 10_000 }).catch(() => {});
      await p.waitForTimeout(400);
      return;
    }
    const decline = p.getByRole('button', { name: /^Decline$/i }).first();
    if (await decline.isVisible({ timeout: 500 }).catch(() => false)) {
      await decline.click({ timeout: 10_000 }).catch(() => {});
      return;
    }
    const close = p
      .getByRole('button', { name: /^Close$/i })
      .or(p.locator('[aria-label="Close"], [aria-label="close"]'))
      .first();
    if (await close.isVisible({ timeout: 500 }).catch(() => false)) {
      await close.click({ timeout: 5_000 }).catch(() => {});
    }
  }

  /** First matching IdP username control (same family as DO portal FIS). */
  private async resolveIdpUsernameField(p: Page): Promise<Locator | null> {
    const candidates: Locator[] = [
      p.getByRole('searchbox', { name: /User ID\s*\/\s*Alias/i }),
      p.getByRole('textbox', { name: /User ID\s*\/\s*Alias/i }),
      p.getByRole('searchbox', { name: /Username/i }),
      p.getByRole('textbox', { name: /Username|Email|User ID/i }),
      p.getByLabel(/username|email|user id/i),
    ];
    for (const loc of candidates) {
      const target = loc.first();
      if (await target.isVisible({ timeout: 600 }).catch(() => false)) {
        return target;
      }
    }
    return null;
  }

  /** True when either legacy RSS inputs or the common FIS / IdP username step is present (matches DO portal). */
  private async isCredentialSurfaceReady(p: Page): Promise<boolean> {
    await p.waitForLoadState('domcontentloaded').catch(() => {});
    if ((await this.resolveIdpUsernameField(p)) !== null) return true;
    return p
      .locator(RSSLoginPage.USERNAME_SELECTOR)
      .first()
      .isVisible({ timeout: 400 })
      .catch(() => false);
  }

  private otpInputs(p: Page): Locator {
    return p.locator(
      [
        'input.otp-input',
        "input[name*='otp' i]",
        "input[id*='otp' i]",
        "input[autocomplete='one-time-code']",
      ].join(', '),
    );
  }

  private deviceTrustRadio(p: Page): Locator {
    return p.getByRole('radio', {
      name: /yes,?\s*this is my (computer|mobile device)/i,
    });
  }

  private async waitForManualOtpEntry(surface: Page, timeoutMs: number): Promise<void> {
    const otpInputs = this.otpInputs(surface);
    this.log(
      `Manual OTP required — enter the code in the browser (timeout ${Math.round(timeoutMs / 1000)}s).`,
    );

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const visible = await otpInputs
        .first()
        .isVisible({ timeout: 1_000 })
        .catch(() => false);
      if (!visible) {
        return;
      }

      const count = await otpInputs.count();
      let filledCount = 0;
      for (let i = 0; i < count; i++) {
        const value = await otpInputs.nth(i).inputValue().catch(() => "");
        if (value.trim()) filledCount++;
      }
      if (filledCount > 0 && (count === 1 || filledCount >= count)) {
        return;
      }

      await surface.waitForTimeout(500);
    }

    throw new Error(
      `Timed out waiting for manual OTP entry after ${Math.round(timeoutMs / 1000)}s.`,
    );
  }

  private async fillTotpIfPrompted(
    surface: Page,
    options?: { totpSecret?: string; manualOtp?: boolean; manualOtpTimeoutMs?: number },
  ): Promise<boolean> {
    const otpInputs = this.otpInputs(surface);
    const firstVisible = await otpInputs
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (!firstVisible) return false;

    const totpSecret = options?.totpSecret;
    if (!totpSecret) {
      if (options?.manualOtp) {
        await this.waitForManualOtpEntry(surface, options.manualOtpTimeoutMs ?? 300_000);
        return true;
      }
      throw new Error(
        'SIT OTP prompt detected, but RSS_PORTAL_TOTP_SECRET is not set. Set it in your environment and retry.',
      );
    }

    const otp = speakeasy.totp({
      secret: totpSecret,
      encoding: 'base32',
      step: 30,
      digits: 6,
    });

    this.log('SIT OTP prompt detected; entering generated TOTP.');
    const count = await otpInputs.count();
    const visibleInputs: Locator[] = [];
    for (let i = 0; i < count; i++) {
      const input = otpInputs.nth(i);
      if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
        visibleInputs.push(input);
      }
    }

    if (visibleInputs.length > 1) {
      const digits = otp.split('');
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
      this.log('Device-trust prompt not shown — skipping.');
      return;
    }

    this.log('Selecting device-trust option (Yes, this is my computer / mobile device)');
    await radio.click({ timeout: 10_000 });
    await expect(radio).toBeChecked({ timeout: 5_000 }).catch(() => {});
  }

  /**
   * Same pattern as DO portal: always use “Login with FIS”, then resolve whether the form is on this page or a new one.
   * If the opener closes after FIS, fills must run on the new page or Playwright throws “Target page … has been closed”.
   */
  private async openFisLoginSurface(totalTimeoutMs = 45_000): Promise<Page> {
    this.log('Clicking Login with FIS');
    await this.waitForVisible(this.loginWithFisButton, 90_000);
    await this.clickElement(this.loginWithFisButton);
    try {
      await this.waitForLoadingComplete(15_000);
    } catch {
      // Spinner may be on a closing tab; continue — surface detection below.
    }

    const deadline = Date.now() + totalTimeoutMs;
    while (Date.now() < deadline) {
      const pages = this.page.context().pages().filter((p) => !p.isClosed());
      for (const p of pages) {
        if (await this.isCredentialSurfaceReady(p)) return p;
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    throw new Error(
      'Timed out waiting for username field after Login with FIS (check popup blockers or selectors).',
    );
  }

  /**
   * Post-SSO **Select Application** launcher with Retail Self Service card.
   */
  async isAppLauncherVisible(): Promise<boolean> {
    return this.isAppLauncherVisibleOn(this.page);
  }

  private async isAppLauncherVisibleOn(
    page: Page,
    options?: { quick?: boolean },
  ): Promise<boolean> {
    const selectTimeout = options?.quick ? 400 : 3_000;
    const cardTimeout = options?.quick ? 400 : 2_000;
    const selectApp = page.getByText(/Select Application/i).first();
    const onLauncher =
      (await selectApp.isVisible({ timeout: selectTimeout }).catch(() => false)) &&
      (await this.retailSelfServiceCardOn(page)
        .isVisible({ timeout: cardTimeout })
        .catch(() => false));
    return onLauncher;
  }

  /** True when a tab URL belongs to the configured RSS portal host (SIT, QAT, etc.). */
  private matchesRssPortalUrl(url: string): boolean {
    if (!url || url === "about:blank") return false;
    if (/udc-test\.fiscloudservices\.com\/SITRSSPortal/i.test(url)) return true;
    try {
      const base = new URL(RSS_BASE_URL());
      const current = new URL(url);
      return current.hostname === base.hostname;
    } catch {
      return false;
    }
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
        if (
          this.matchesRssPortalUrl(url) ||
          (await this.isAppLauncherVisibleOn(pg, { quick: true }))
        ) {
          await pg.bringToFront().catch(() => {});
          this.sessionPage = pg;
          return pg;
        }
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(
      'Expected RSS Portal URL after FIS sign-in on an open browser tab (check popup blocker / SSO redirect).',
    );
  }

  /**
   * FIS often lands on the same IdP flow as DO (searchbox → Proceed → password → Sign in).
   * Falls back to a single-page RSS form when those controls are absent.
   */
  private async enterCredentialsOnSurface(
    surface: Page,
    username: string,
    password: string,
    options?: { totpSecret?: string; manualOtp?: boolean; manualOtpTimeoutMs?: number },
  ): Promise<void> {
    const utils = new CommonUtils(surface);
    const idpUsername = await this.resolveIdpUsernameField(surface);
    const mfaOptions = {
      totpSecret: options?.totpSecret,
      manualOtp: options?.manualOtp,
      manualOtpTimeoutMs: options?.manualOtpTimeoutMs,
    };

    if (idpUsername) {
      this.log('Using IdP / FIS credential steps (username → Proceed → password → Sign in)');
      await this.dismissCookieConsentIfPresent(surface);
      await idpUsername.click({ timeout: 10_000 }).catch(() => {});
      await utils.fill(idpUsername, username);

      const proceed = surface.getByRole('button', { name: 'Proceed' });
      await proceed.waitFor({ state: 'visible', timeout: 20_000 });
      await utils.click(proceed);

      const idpPassword = surface.getByRole('textbox', { name: /Password/i });
      await idpPassword.waitFor({ state: 'visible', timeout: 30_000 });
      await utils.fill(idpPassword, password);
      await idpPassword.press('Tab').catch(() => {});

      await this.fillTotpIfPrompted(surface, mfaOptions);
      await this.selectDeviceTrustIfPrompted(surface);
      await this.fillTotpIfPrompted(surface, mfaOptions);

      const signIn = surface.getByRole('button', { name: /Sign in/i });
      await signIn.waitFor({ state: 'visible', timeout: 15_000 });
      await expect(signIn).toBeEnabled({ timeout: 90_000 });
      await utils.click(signIn);
      return;
    }

    this.log('Using legacy single-step RSS login fields');
    const userLoc = surface.locator(RSSLoginPage.USERNAME_SELECTOR).first();
    const passLoc = surface.locator(RSSLoginPage.PASSWORD_SELECTOR).first();
    const submitLoc = surface.locator(RSSLoginPage.SUBMIT_SELECTOR).first();
    await userLoc.waitFor({ state: 'visible', timeout: 15_000 });
    await utils.fill(userLoc, username);
    await utils.fill(passLoc, password);
    await utils.click(submitLoc);
  }

  private async waitForLoadingOn(page: Page, timeout = 30_000): Promise<void> {
    const spinner = page.locator(
      '.loading, .spinner, [data-testid="loading"], .app-loader-overlay, .p-progressspinner',
    );
    try {
      await spinner.waitFor({ state: 'hidden', timeout });
    } catch {
      // Spinner may be absent
    }
    await this.waitForPrimeNgProgressSpinnersHidden(page, timeout);
  }

  /** PrimeNG `p-progressspinner` on landing/dashboard — blocks clicks until gone (QAT). */
  private async waitForPrimeNgProgressSpinnersHidden(
    page: Page,
    timeoutMs: number,
  ): Promise<void> {
    await expect
      .poll(
        async () => {
          const items = page.locator('p-progressspinner');
          const count = await items.count();
          for (let i = 0; i < count; i++) {
            if (await items.nth(i).isVisible().catch(() => false)) {
              return false;
            }
          }
          return true;
        },
        { timeout: timeoutMs, intervals: [200, 400, 800] },
      )
      .toBe(true);
  }

  private async waitForLoginOutcomeOn(
    page: Page,
    navigationTimeoutMs: number,
  ): Promise<void> {
    const successSignal = page
      .locator(
        '.user-dropdown, [data-testid="user-menu"], .welcome-banner, [data-testid="welcome-banner"], .rss-header, app-landing',
      )
      .first();
    const errorAlert = page.locator(RSSLoginPage.LOGIN_ERROR_OUTCOME);

    await Promise.race([
      successSignal.waitFor({ state: 'visible', timeout: navigationTimeoutMs }),
      errorAlert.first().waitFor({ state: 'visible', timeout: navigationTimeoutMs }),
    ]);
  }

  /**
   * Navigate to RSS Portal login page
   * @param urlOverride optional base URL (e.g. QA host); defaults to {@link RSS_BASE_URL}
   */
  async navigate(urlOverride?: string): Promise<void> {
    this.logStep("Navigate");
    this.sessionPage = null;
    const targetUrl = urlOverride ?? this.url;
    this.log(`Navigating to RSS Portal login page: ${targetUrl}`);
    await this.navigateTo(targetUrl);
    await this.page.waitForLoadState('load');

    if (await this.isAppLauncherVisible()) {
      this.log('App launcher visible — SSO session already active; skipping Login with FIS.');
      return;
    }

    await expect(this.loginWithFisButton).toBeVisible({ timeout: 90_000 });
  }

  /**
   * Login with credentials
   * @param navigationTimeoutMs max time to reach authenticated shell after submit (use 120_000 for OTP flows)
   */
  async login(
    username: string,
    password: string,
    options?: {
      navigationTimeoutMs?: number;
      totpSecret?: string;
      manualOtp?: boolean;
      manualOtpTimeoutMs?: number;
    },
  ): Promise<void> {
    this.logStep("Login");
    const navigationTimeoutMs = options?.navigationTimeoutMs ?? 30_000;
    const mfaOptions = {
      totpSecret: options?.totpSecret,
      manualOtp: options?.manualOtp,
      manualOtpTimeoutMs: options?.manualOtpTimeoutMs,
    };

    if (await this.isAppLauncherVisible()) {
      await this.selectRetailSelfService();
      return;
    }

    this.log(`Logging in to RSS Portal as: ${username}`);
    const surface = await this.openFisLoginSurface();
    this.sessionPage = surface;

    await this.enterCredentialsOnSurface(surface, username, password, mfaOptions);

    const portalPage = await this.waitForPortalPageAfterSignIn(navigationTimeoutMs);
    await this.waitForLoadingOn(portalPage, 15_000);
    await this.waitForLoginOutcomeOn(portalPage, navigationTimeoutMs);
    await this.selectRetailSelfService();
  }

  /**
   * Login with test data from JSON
   */
  async loginWithTestData(
    testData: {
      username: string;
      password: string;
      totpSecret?: string;
      mfaMode?: "totp" | "manual";
    },
    options?: { navigationTimeoutMs?: number; manualOtpTimeoutMs?: number },
  ): Promise<void> {
    this.logStep("Login With Test Data");
    const manualOtp = testData.mfaMode === "manual";
    await this.login(testData.username, testData.password, {
      navigationTimeoutMs:
        options?.navigationTimeoutMs ?? (manualOtp ? 300_000 : undefined),
      totpSecret: manualOtp ? undefined : testData.totpSecret,
      manualOtp,
      manualOtpTimeoutMs: options?.manualOtpTimeoutMs,
    });
  }

  /**
   * Direct app-shell login (e.g. `localhost`) using `#username`, `#password`, and the primary **Login** button — no FIS / IdP popup flow.
   */
  async loginWithLocalShellForm(
    username: string,
    password: string,
    options?: {
      navigationTimeoutMs?: number;
      /** Wait for `p-progressspinner` to finish on `app-landing` before clicking Retail Self Service (QAT / slow hosts). Default 120s. */
      retailSelfServiceSpinnerWaitMs?: number;
      /** Playwright click timeout for the Retail Self Service card. Default 90s. */
      retailSelfServiceClickTimeoutMs?: number;
    },
  ): Promise<void> {
    this.logStep("Login With Local Shell Form");
    const navigationTimeoutMs = options?.navigationTimeoutMs ?? 30_000;
    const retailSpinnerWaitMs = options?.retailSelfServiceSpinnerWaitMs ?? 120_000;
    const retailClickTimeoutMs = options?.retailSelfServiceClickTimeoutMs ?? 90_000;
    this.sessionPage = null;
    const p = this.page;
    this.log('Logging in via local shell form (#username / #password)');
    const userField = p.locator('#username');
    const passField = p.locator('#password');
    await userField.waitFor({ state: 'visible', timeout: 15_000 });
    await this.fillElement(userField, username);
    await this.fillElement(passField, password);
    await this.clickElement(
      p.getByRole('button', { name: 'Login', exact: true }),
    );
    this.sessionPage = p;
    await this.waitForLoadingOn(p, 30_000);
    await this.waitForLoginOutcomeOn(p, navigationTimeoutMs);
    await this.selectRetailSelfService({
      spinnerWaitMs: retailSpinnerWaitMs,
      clickTimeoutMs: retailClickTimeoutMs,
    });
  }

  /**
   * Post-auth “Select Application” landing (`app-landing` card row).
   * Same idea as DO portal’s Quotes & Applications navigation after FIS sign-in.
   */
  private retailSelfServiceCardOn(page: Page): Locator {
    return page
      .locator('app-landing div.border-1.cursor-pointer')
      .filter({ hasText: /Retail Self Service/i });
  }

  private retailSelfServiceCard(): Locator {
    return this.retailSelfServiceCardOn(this.getSessionPage());
  }

  /** Chooses Retail Self Service so the RSS shell / dashboard can load. */
  async selectRetailSelfService(options?: {
    spinnerWaitMs?: number;
    clickTimeoutMs?: number;
  }): Promise<void> {
    const spinnerWaitMs = options?.spinnerWaitMs ?? 120_000;
    const clickTimeoutMs = options?.clickTimeoutMs ?? 90_000;
    this.log('Selecting Retail Self Service');
    const session = this.getSessionPage();
    const card = this.retailSelfServiceCard();
    await card.waitFor({ state: 'visible', timeout: spinnerWaitMs });
    await this.waitForPrimeNgProgressSpinnersHidden(session, spinnerWaitMs);
    await this.clickElement(card, clickTimeoutMs);
    await session.waitForLoadState('domcontentloaded');
    await this.waitForLoadingOn(session, 30_000);
  }

  /**
   * Login via SSO
   */
  async loginViaSSO(): Promise<void> {
    this.log('Logging in via SSO');
    await this.clickElement(this.ssoLoginButton);
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

  /** Landing page after logout — user must sign in again via FIS. */
  async expectLoginLandingVisible(): Promise<void> {
    this.logStep("Expect Login Landing Visible");
    await this.page.waitForLoadState("load");
    await expect(this.loginWithFisButton).toBeVisible({ timeout: 60_000 });
  }

  /** Deep-linking to dashboard after logout must not restore an authenticated session. */
  async expectProtectedRouteRequiresLogin(): Promise<void> {
    this.logStep("Expect Protected Route Requires Login");
    const dashboardUrl = `${RSS_BASE_URL().replace(/\/$/, "")}/rss/dashboard`;
    await this.page.goto(dashboardUrl, { waitUntil: "load" });
    await this.expectLoginLandingVisible();
  }
}

