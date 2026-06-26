/**
 * DO Portal - Dashboard Page
 * Page Object Model for DO Portal main dashboard
 */

import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export class DODashboardPage extends BasePage {
  // Locators
  readonly createStandardQuoteButton: Locator;
  readonly dialogBox: Locator;
  readonly pageHeader: Locator;
  readonly welcomeMessage: Locator;
  readonly sideMenu: Locator;
  readonly userProfile: Locator;
  readonly logoutButton: Locator;
  readonly notificationBell: Locator;
  readonly quickActions: Locator;
  readonly dealerDropdownLabel: Locator;

  constructor(page: Page) {
    super(page);

    // Dealer shell: Prime often renders **+ Create Standard Quote** as a **button** (split / icon prefix);
    // prefer **hasText** + **role** over link-only `href` (see dashboard snapshot).
    this.createStandardQuoteButton = page
      .getByRole("button", { name: /Create\s+Standard\s+Quote/i })
      .or(
        page
          .locator("button")
          .filter({ hasText: /Create\s+Standard\s+Quote/i }),
      )
      .or(page.getByRole("link", { name: /Create\s+Standard\s+Quote/i }))
      .or(
        page
          .locator("a[href*='standard-quote'], a[href*='StandardQuote']")
          .filter({ hasText: /Create\s+Standard\s+Quote|Standard\s+Quote/i }),
      )
      .or(
        page
          .locator('a[href="/dealer/standard-quote"]')
          .filter({ hasText: /Create\s+Standard\s+Quote/i }),
      )
      .first();
    this.dialogBox = page.getByRole("dialog");
    this.pageHeader = page.locator("h1, h2, .page-header");
    this.welcomeMessage = page.locator(
      '.welcome-message, [data-testid="welcome"]',
    );
    this.sideMenu = page.locator('.side-menu, nav, [data-testid="side-nav"]');
    this.userProfile = page.locator(
      '.user-profile, [data-testid="user-profile"]',
    );
    this.logoutButton = page.locator(
      'button:has-text("Logout"), [data-testid="logout"]',
    );
    this.notificationBell = page.locator(
      '.notification-bell, [data-testid="notifications"]',
    );
    this.quickActions = page.locator(
      '.quick-actions, [data-testid="quick-actions"]',
    );
    this.dealerDropdownLabel = page
      .locator("span[role='combobox'].p-dropdown-label")
      .filter({ hasText: /\S/ })
      .first();
  }

  protected stepLogPrefix(): string {
    return "DO Portal — Dashboard";
  }

  /**
   * After login, Prime may show a full-page blocking overlay (app-loader + progress spinner) that
   * intercepts pointer events. Wait until it is gone before clicking dashboard CTAs.
   */
  private async waitForAppLoaderOverlayGone(timeoutMs: number = 120_000): Promise<void> {
    const overlay = this.page.locator(".app-loader-overlay, [class*='app-loader']");
    const n = await overlay.count();
    if (n > 0) {
      const first = overlay.first();
      if (await first.isVisible().catch(() => false)) {
        await first.waitFor({ state: "hidden", timeout: timeoutMs });
      } else {
        await first
          .waitFor({ state: "hidden", timeout: 5_000 })
          .catch(() => {});
      }
    }
    const spinner = this.page.locator(
      ".app-loader-overlay p-progressspinner, .app-loader p-progressspinner",
    ).first();
    const spinnerBudget = Math.min(Math.max(timeoutMs, 30_000), 120_000);
    try {
      await spinner.waitFor({ state: "hidden", timeout: spinnerBudget });
    } catch {
      /* Slow QAT: spinner can linger after overlay; Create Standard Quote wait still gates readiness. */
    }
  }

  /**
   * After `storageState` restore: ensure dealer shell is ready (same gate as before **Create Standard Quote**).
   *
   * @param options.requireCtaEnabled — default **true**; set **false** for auth setup if the split CTA stays
   *   busy while charts load but the session is already valid (**visible** is enough to save `storageState`).
   */
  async waitForAuthenticatedDashboard(options?: {
    requireCtaEnabled?: boolean;
  }): Promise<void> {
    const requireCtaEnabled = options?.requireCtaEnabled !== false;

    this.log("Waiting for authenticated dashboard (session restored or after login)…");
    await this.page
      .waitForLoadState("domcontentloaded", { timeout: 30_000 })
      .catch(() => {});
    await this.page.waitForURL(/\/dealer(\/|$)/i, { timeout: 60_000 }).catch(() => {});

    // Top-level Prime **progressbar** (not always tied to `.app-loader-overlay`); cap wait so auth setup
    // does not burn the whole **test** timeout before the CTA gate runs.
    await this.page
      .getByRole("progressbar")
      .first()
      .waitFor({ state: "hidden", timeout: 45_000 })
      .catch(() => {});
    await this.waitForAppLoaderOverlayGone(60_000);

    await this.createStandardQuoteButton.waitFor({ state: "visible", timeout: 90_000 });
    if (requireCtaEnabled) {
      await expect(this.createStandardQuoteButton).toBeEnabled({ timeout: 45_000 });
      this.log(
        "Verified dashboard is loaded (Create Standard Quote is visible and enabled).",
      );
    } else {
      this.log(
        "Verified dealer shell (Create Standard Quote visible; skipped strict enabled for auth save).",
      );
    }
  }

  /**
   * Selects the dealer shown in the top header dealer dropdown.
   */
  async ensureDealerSelected(dealerName: string): Promise<void> {
    this.logStep("Ensure Dealer Selected");
    await this.waitForAppLoaderOverlayGone(120_000);
    await expect(this.dealerDropdownLabel).toBeVisible({ timeout: 60_000 });

    const selectedDealer =
      (await this.dealerDropdownLabel.getAttribute("aria-label")) ??
      (await this.dealerDropdownLabel.textContent()) ??
      "";
    if (selectedDealer.trim() === dealerName) {
      this.log(`Dealer already selected: ${dealerName}`);
      return;
    }

    this.log(`Selecting dealer: ${dealerName}`);
    await this.dealerDropdownLabel.click();
    await expect(this.page.getByRole("listbox")).toBeVisible({ timeout: 30_000 });

    const dealerOption = this.page
      .getByRole("option", { name: dealerName, exact: true })
      .first();
    await dealerOption.click();
    await expect(this.dealerDropdownLabel).toHaveAttribute("aria-label", dealerName, {
      timeout: 30_000,
    });
    await this.waitForAppLoaderOverlayGone(120_000);
    this.log(`Verified dealer selected: ${dealerName}`);
  }

  async selectDealer(dealerName: string): Promise<void> {
    this.logStep("Select Dealer");
    await this.ensureDealerSelected(dealerName);
  }

  /**
   * Click "Create Standard Quote" — wait out the blocking loader, then click (with force retry).
   */
  async clickCreateStandardQuote(): Promise<void> {
    this.logStep("Click Create Standard Quote");
    await this.page
      .waitForLoadState("domcontentloaded", { timeout: 30_000 })
      .catch(() => {});
    await this.waitForAppLoaderOverlayGone(120_000);

    const btn = this.createStandardQuoteButton;
    await btn.waitFor({ state: "visible", timeout: 120_000 });
    await expect(btn).toBeEnabled({ timeout: 60_000 });

    this.log('Clicking Create Standard Quote from dashboard');
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await this.waitForAppLoaderOverlayGone(30_000);
      }
      try {
        await btn.click({ timeout: 30_000, force: attempt > 0 });
        break;
      } catch {
        if (attempt === 2) {
          throw new Error(
            "Create Standard Quote: click failed after waiting for .app-loader-overlay; overlay may still be blocking.",
          );
        }
        await this.page.waitForTimeout(500);
      }
    }
    await this.waitForLoadingComplete(30_000);
    this.log("Create Standard Quote navigation completed.");
  }

  /**
   * Alias for tests: dashboard control labelled "Create Standard Quote" opens the Standard Quote flow.
   * Same implementation as {@link clickCreateStandardQuote}.
   */
  async clickStandardQuote(): Promise<void> {
    return this.clickCreateStandardQuote();
  }

  /**
   * Select the Credit Sale Agreement (CSA) product from dialog box
   */
  async selectCSAproduct(): Promise<void> {
    this.logStep("Select CSA product");
    // wait for the dialog to be visible
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // locate and click the CSA option
    const option = dialog.locator("text= Credit Sale Agreement ");
    await option.waitFor({ state: "attached" });
    await option.click({ force: false });
  }

  /** Select the Finance Lease product from the product dialog. */
  async selectFinanceLeaseProduct(): Promise<void> {
    this.logStep("Select Finance Lease product");
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const option = dialog.locator("text= Finance Lease ");
    await option.waitFor({ state: "attached" });
    await option.click({ force: false });
  }

  /** Select Assured Future Value from the Create Standard Quote product dialog. */
  async selectAssuredFutureValueProduct(): Promise<void> {
    this.logStep("Select Assured Future Value product");
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const option = dialog.getByText(/Assured\s*Future\s*Value/i).first();
    await option.waitFor({ state: "attached" });
    await option.click({ force: false });
  }

  /** Select Term Loan from the Create Standard Quote product dialog (TL-B / TL-C Standard Quote). */
  async selectTermLoanProduct(): Promise<void> {
    this.logStep("Select Term Loan product");
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const option = dialog.getByText(/Term\s*Loan/i).first();
    await option.waitFor({ state: "attached" });
    await option.click({ force: false });
  }

  /**
   * Verify dashboard is loaded
   */
  async isDashboardLoaded(): Promise<boolean> {
    this.logStep("Is Dashboard Loaded");
    await this.waitForLoadingComplete();
    return await this.isVisible(this.pageHeader);
  }

  /**
   * Get welcome message text
   */
  async getWelcomeMessage(): Promise<string> {
    this.logStep("Get Welcome Message");
    return await this.getText(this.welcomeMessage);
  }

  /**
   * Navigate to menu item
   */
  async navigateToMenuItem(menuText: string): Promise<void> {
    this.logStep("Navigate To Menu Item");
    const menuItem = this.sideMenu.locator(`text=${menuText}`);
    await this.clickElement(menuItem);
    await this.waitForLoadingComplete();
  }

  /**
   * Logout from portal
   */
  async logout(): Promise<void> {
    this.log("Logging out from DO Portal");
    await this.clickElement(this.userProfile);
    await this.clickElement(this.logoutButton);
  }

  /**
   * Get notification count
   */
  async getNotificationCount(): Promise<number> {
    this.logStep("Get Notification Count");
    const badge = this.notificationBell.locator(".badge, .count");
    const text = await this.getText(badge);
    return parseInt(text) || 0;
  }

  /**
   * Click quick action by name
   */
  async clickQuickAction(actionName: string): Promise<void> {
    this.logStep("Click Quick Action");
    const action = this.quickActions.locator(`text=${actionName}`);
    await this.clickElement(action);
  }

  /** Dealer dashboard listing → **Activated Loans** view (SIT: grid is on home; switch via listing-type combobox). */
  async navigateToDealerListingActiveLoans(): Promise<void> {
    this.logStep("Navigate To Dealer Listing Active Loans");
    await this.waitForAppLoaderOverlayGone(120_000);

    const listingType = this.page
      .getByRole("combobox", { name: /^(Quote|Listing|Loan)$/i })
      .first();
    if (await listingType.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await listingType.click({ timeout: 10_000 });
      const activated = this.page
        .getByRole("option", { name: /Activated Loans|Active Loans/i })
        .first();
      if (await activated.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await activated.click({ timeout: 10_000 });
        await this.waitForAppLoaderOverlayGone(60_000);
        return;
      }
      await this.page.keyboard.press("Escape").catch(() => {});
    }

    const listingLink = this.page
      .getByRole("link", { name: /Dealer Listing/i })
      .or(this.page.getByRole("button", { name: /Dealer Listing/i }))
      .or(this.sideMenu.getByText(/Dealer Listing/i))
      .first();
    if (await listingLink.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await listingLink.click({ timeout: 20_000 });
      await this.waitForAppLoaderOverlayGone(60_000);
    }
    await this.waitForLoadingComplete(30_000);
  }

  /** Dealer dashboard → open an existing Standard Quote by Quote ID from the listing grid. */
  async openStandardQuoteByQuoteId(quoteId: string): Promise<void> {
    const id = quoteId.trim();
    if (!id) {
      throw new Error("openStandardQuoteByQuoteId: quoteId is required.");
    }

    this.logStep(`Open Standard Quote By Quote ID ${id}`);
    await this.waitForAppLoaderOverlayGone(30_000);

    const quoteLink = this.page
      .locator(`:text-is("${id}")`)
      .or(this.page.getByText(id, { exact: true }))
      .first();
    await expect(quoteLink).toBeVisible({ timeout: 45_000 });
    await quoteLink.scrollIntoViewIfNeeded();
    await quoteLink.click({ timeout: 20_000 });

    await expect(
      this.page.locator("app-quote-details, app-standard-quote").first(),
    ).toBeVisible({ timeout: 120_000 });
    this.log(`Opened Standard Quote ${id}.`);
  }

  /** Search the dealer listing grid and open **Create Settlement Quote** for a loan row. */
  async clickCreateSettlementQuoteForLoan(regoOrVin: string): Promise<void> {
    this.logStep(`Click Create Settlement Quote For Loan ${regoOrVin}`);
    const search = this.page
      .getByRole("textbox", { name: /Search Quote|Search Loan|Search/i })
      .first();
    if (await search.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await search.fill(regoOrVin);
      const viewBtn = this.page.getByRole("button", { name: /^View$/i }).first();
      if (await viewBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await viewBtn.click({ timeout: 15_000 });
        await this.waitForAppLoaderOverlayGone(60_000);
      }
    }

    const row = this.tableRows.filter({ hasText: new RegExp(regoOrVin, "i") }).first();
    await expect(row).toBeVisible({ timeout: 45_000 });
    const rowCheckbox = row.locator('input[type="checkbox"]').first();
    if (await rowCheckbox.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await rowCheckbox.check({ force: true });
    }

    const bulkAction = this.page
      .getByText("Create Settlement Quote", { exact: true })
      .or(this.page.getByRole("button", { name: /Create Settlement Quote/i }))
      .or(this.page.getByRole("link", { name: /Create Settlement Quote/i }))
      .first();
    await bulkAction.scrollIntoViewIfNeeded();
    await bulkAction.click({ force: true, timeout: 20_000 });
    await this.waitForAppLoaderOverlayGone(90_000);
  }
}
