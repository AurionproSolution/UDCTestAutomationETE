/**
 * RSS Portal - Login Page
 * Page Object Model for RSS Portal authentication
 */

import { expect, Page, Locator } from '@playwright/test';
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

  /** First matching IdP username control (same family as DO portal FIS). */
  private async resolveIdpUsernameField(p: Page): Promise<Locator | null> {
    const candidates: Locator[] = [
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

  /**
   * Same pattern as DO portal: always use “Login with FIS”, then resolve whether the form is on this page or a new one.
   * If the opener closes after FIS, fills must run on the new page or Playwright throws “Target page … has been closed”.
   */
  private async openFisLoginSurface(totalTimeoutMs = 30_000): Promise<Page> {
    this.log('Clicking Login with FIS');
    await this.waitForVisible(this.loginWithFisButton, 15_000);
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
   * FIS often lands on the same IdP flow as DO (searchbox → Proceed → password → Sign in).
   * Falls back to a single-page RSS form when those controls are absent.
   */
  private async enterCredentialsOnSurface(
    surface: Page,
    username: string,
    password: string,
  ): Promise<void> {
    const utils = new CommonUtils(surface);
    const idpUsername = await this.resolveIdpUsernameField(surface);

    if (idpUsername) {
      this.log('Using IdP / FIS credential steps (username → Proceed → password → Sign in)');
      await utils.fill(idpUsername, username);
      const proceed = surface.getByRole('button', { name: 'Proceed' });
      await proceed.waitFor({ state: 'visible', timeout: 15_000 });
      await utils.click(proceed);

      const idpPassword = surface.getByRole('textbox', { name: /Password/i });
      await idpPassword.waitFor({ state: 'visible', timeout: 15_000 });
      await utils.fill(idpPassword, password);
      await idpPassword.press('Tab').catch(() => {});

      const trustComputer = surface.getByRole('radio', {
        name: /Yes, this is my computer/i,
      });
      if (
        await trustComputer.isVisible({ timeout: 15_000 }).catch(() => false)
      ) {
        await utils.click(trustComputer);
      }

      const signIn = surface.getByRole('button', { name: /Sign in/i });
      await signIn.waitFor({ state: 'visible', timeout: 15_000 });
      await expect(signIn).toBeEnabled({ timeout: 60_000 });
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
      '.loading, .spinner, [data-testid="loading"]',
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
  }

  /**
   * Login with credentials
   * @param navigationTimeoutMs max time to reach authenticated shell after submit (use 120_000 for OTP flows)
   */
  async login(
    username: string,
    password: string,
    options?: { navigationTimeoutMs?: number },
  ): Promise<void> {
    this.logStep("Login");
    const navigationTimeoutMs = options?.navigationTimeoutMs ?? 30_000;
    this.log(`Logging in to RSS Portal as: ${username}`);
    const surface = await this.openFisLoginSurface();
    this.sessionPage = surface;

    await this.enterCredentialsOnSurface(surface, username, password);
    await this.waitForLoadingOn(surface, 15_000);
    await this.waitForLoginOutcomeOn(surface, navigationTimeoutMs);
    await this.selectRetailSelfService();
  }

  /**
   * Login with test data from JSON
   */
  async loginWithTestData(
    testData: { username: string; password: string },
    options?: { navigationTimeoutMs?: number },
  ): Promise<void> {
    this.logStep("Login With Test Data");
    await this.login(testData.username, testData.password, options);
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
  private retailSelfServiceCard(): Locator {
    return this.getSessionPage()
      .locator('app-landing div.border-1.cursor-pointer')
      .filter({ hasText: /Retail Self Service/i });
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
}




