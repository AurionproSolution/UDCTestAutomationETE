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
  readonly dashboardRoot: Locator;
  readonly monthlyVolumesWidget: Locator;
  readonly workflowStatusWidget: Locator;
  readonly averageSalesWidget: Locator;
  readonly applicationOutcomeWidget: Locator;
  readonly notificationsWidget: Locator;
  readonly createQuickQuoteButton: Locator;
  readonly breadcrumbDashboard: Locator;
  readonly assignLink: Locator;
  readonly exportLink: Locator;
  readonly printLink: Locator;
  readonly quotesGridResetButton: Locator;
  readonly quotesGridFromDate: Locator;
  readonly quotesGridToDate: Locator;

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
    this.dashboardRoot = page.locator("app-dashboard").first();
    this.monthlyVolumesWidget = page.locator("app-monthly-volumes").first();
    this.workflowStatusWidget = this.workflowStatusRoot();
    this.averageSalesWidget = page.locator("app-average-sales").first();
    this.applicationOutcomeWidget = page.locator("app-application-outcome").first();
    this.notificationsWidget = page.locator("app-notification").first();
    this.createQuickQuoteButton = page
      .getByRole("button", { name: /Create\s+Quick\s+Quote/i })
      .first();
    this.breadcrumbDashboard = page
      .locator("p-breadcrumb")
      .getByText(/Dashboard/i)
      .first();
    const listing = page.locator("app-quote-list").first();
    this.assignLink = listing
      .getByRole("link", { name: /^\s*Assign\s*$/i })
      .first()
      .or(listing.locator("a").filter({ hasText: /^\s*Assign\s*$/i }).first());
    this.exportLink = listing
      .getByRole("link", { name: /Export/i })
      .first()
      .or(listing.locator("a").filter({ hasText: /Export/i }).first());
    this.printLink = listing
      .getByRole("link", { name: /Print/i })
      .first()
      .or(listing.locator("a").filter({ hasText: /Print/i }).first());
    this.quotesGridResetButton = listing
      .getByRole("button", { name: /^Reset$/i })
      .first();
    this.quotesGridFromDate = listing
      .locator("p-calendar")
      .first()
      .locator("input")
      .first();
    this.quotesGridToDate = listing
      .locator("p-calendar")
      .nth(1)
      .locator("input")
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

    await this.ensureDealerShellFromLandingIfNeeded();

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
   * After `storageState` restore the portal may stop on `/landing` (Select Application)
   * even when IdP cookies are valid. Enter **Quotes & Applications** like post-MFA login.
   */
  async ensureDealerShellFromLandingIfNeeded(): Promise<void> {
    const onLanding = /\/landing(\/|$|\?)/i.test(this.page.url());
    const selectApp = this.page.getByText(/Select Application/i).first();
    const onLauncher =
      onLanding ||
      (await selectApp.isVisible({ timeout: 2_000 }).catch(() => false));

    if (!onLauncher) return;

    this.log("App launcher detected — opening Quotes & Applications…");
    const quoteAndApp = this.page
      .getByRole("link", { name: /Quotes\s*&\s*Applications/i })
      .first();
    await expect(quoteAndApp).toBeVisible({ timeout: 60_000 });
    await this.waitForAppLoaderOverlayGone(30_000);
    await quoteAndApp.click({ timeout: 30_000 });
    await this.waitForAppLoaderOverlayGone(90_000);
    await this.page
      .waitForURL(/\/dealer(\/|$)/i, { timeout: 60_000 })
      .catch(() => {});
    this.log("Entered dealer shell from app launcher.");
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
    await expect(dialog).toBeHidden({ timeout: 60_000 });
    await this.waitForAppLoaderOverlayGone(120_000);
  }

  /** Select Operating Lease from the Create Standard Quote product dialog. */
  async selectOperatingLeaseProduct(): Promise<void> {
    this.logStep("Select Operating Lease product");
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const option = dialog.getByText(/Operating\s*Lease/i).first();
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

  /** Dashboard quote list (`app-quote-list` / `gen-table#quote-list`). */
  private quotesListingRoot(): Locator {
    return this.page.locator("app-quote-list").first();
  }

  /** Scroll to the embedded **Quotes** grid on the dealer dashboard. */
  async openQuotesAndApplications(): Promise<void> {
    this.logStep("Open Quotes And Applications");
    await this.waitForAppLoaderOverlayGone(120_000);
    const quoteList = this.quotesListingRoot();
    await expect(quoteList).toBeVisible({ timeout: 60_000 });
    await quoteList.scrollIntoViewIfNeeded();
    await expect(this.quotesGridTable()).toBeVisible({ timeout: 30_000 });
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
  }

  /** PrimeNG quotes table on dashboard (`#quote-list` / `pn_id_*-table`). */
  quotesGridTable(): Locator {
    const root = this.quotesListingRoot();
    return root
      .locator("gen-table#quote-list table.p-datatable-table")
      .first()
      .or(root.locator("table.p-datatable-table").first())
      .or(this.page.locator("gen-table#quote-list table.p-datatable-table").first());
  }

  /** **Search Quote** filter above the dashboard grid. */
  quotesGridSearchInput(): Locator {
    return this.quotesListingRoot()
      .locator('input[placeholder="Search Quote"]')
      .first()
      .or(this.page.locator('app-quote-list input[placeholder="Search Quote"]').first());
  }

  /** **View** applies search + date filters on the quote list. */
  quotesGridViewButton(): Locator {
    return this.quotesListingRoot()
      .getByRole("button", { name: /^View$/i })
      .first();
  }

  /** Quote-type dropdown (active **Quote** vs expired listing). */
  quotesGridTypeDropdown(): Locator {
    return this.quotesListingRoot().locator("p-dropdown").first().getByRole("combobox");
  }

  /** Filter grid by origination reference or quote id, then click **View**. */
  async searchQuotesGrid(query: string): Promise<void> {
    this.logStep(`Search Quotes Grid: ${this.stepValueDisplay(query)}`);
    const search = this.quotesGridSearchInput();
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill(query);
    const viewBtn = this.quotesGridViewButton();
    if (await viewBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await viewBtn.click({ timeout: 15_000 });
    } else {
      await search.press("Enter").catch(() => {});
    }
    await this.waitForAppLoaderOverlayGone(60_000);
    await this.page.waitForTimeout(500);
  }

  /** Row in quotes grid matching origination ref or quote id. */
  quoteGridRowByReference(referenceOrQuoteId: string): Locator {
    const escaped = referenceOrQuoteId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.quotesGridTable()
      .locator("tbody tr")
      .filter({ hasText: new RegExp(escaped, "i") })
      .first();
  }

  /** Click target for a grid row — numeric **Quote ID** cell, or orig-ref match when `referenceOrQuoteId` is the QID. */
  private quoteGridOpenTargetInRow(row: Locator, referenceOrQuoteId: string): Locator {
    const trimmed = referenceOrQuoteId.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const isNumericQuoteId = /^\d{3,}$/.test(trimmed);
    const quoteIdPattern = isNumericQuoteId
      ? new RegExp(`^\\s*${escaped}\\s*$`)
      : /^\s*\d{3,}\s*$/;
    return row
      .locator("td.cursor-pointer.text-primary, td.text-primary.cursor-pointer")
      .filter({ hasText: quoteIdPattern })
      .first();
  }

  /** **Quotes & Applications** listing — filter grid by **QID** / Quote ID, then **View**. */
  async searchDealerListingByQuoteId(quoteId: string): Promise<void> {
    const id = quoteId.trim();
    if (!id) {
      throw new Error("searchDealerListingByQuoteId: quoteId is required.");
    }
    this.logStep(`Search Dealer Listing By Quote ID ${id}`);
    await this.waitForAppLoaderOverlayGone(30_000);

    const search = this.page
      .getByRole("textbox", { name: /QID|Quote\s*ID|Search Quote|Search/i })
      .first();
    await expect(search).toBeVisible({ timeout: 20_000 });
    await search.fill(id);

    const viewBtn = this.page.getByRole("button", { name: /^View$/i }).first();
    if (await viewBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await viewBtn.click({ timeout: 15_000 });
    } else {
      await search.press("Enter");
    }
    await this.waitForAppLoaderOverlayGone(60_000);

    const row = this.page.locator("table tbody tr").filter({ hasText: new RegExp(`\\b${id}\\b`) }).first();
    await expect(row).toBeVisible({ timeout: 45_000 });
    this.log(`Dealer listing filtered to QID ${id}.`);
  }

  /** Dealer dashboard → open an existing Standard Quote by Quote ID from the listing grid. */
  async openStandardQuoteByQuoteId(quoteId: string): Promise<void> {
    const id = quoteId.trim();
    if (!id) {
      throw new Error("openStandardQuoteByQuoteId: quoteId is required.");
    }

    this.logStep(`Open Standard Quote By Quote ID ${id}`);
    await this.waitForAppLoaderOverlayGone(30_000);

    const row = this.page
      .locator("table tbody tr")
      .filter({ hasText: new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`) })
      .first();
    if (await row.isVisible({ timeout: 8_000 }).catch(() => false)) {
      const quoteIdCell = row
        .locator("div.cursor-pointer.text-primary")
        .filter({ hasText: new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })
        .first()
        .or(row.getByRole("link").first())
        .or(row.locator("a[href*='standard-quote']").first());
      await quoteIdCell.scrollIntoViewIfNeeded();
      await quoteIdCell.click({ timeout: 30_000 });
    } else {
      const quoteLink = this.page
        .locator(`:text-is("${id}")`)
        .or(this.page.getByText(id, { exact: true }))
        .first();
      await expect(quoteLink).toBeVisible({ timeout: 45_000 });
      await quoteLink.scrollIntoViewIfNeeded();
      await quoteLink.click({ timeout: 20_000 });
    }

    await this.waitForAppLoaderOverlayGone(120_000);
    await expect(
      this.page.locator("app-quote-details, app-standard-quote").first(),
    ).toBeVisible({ timeout: 120_000 });
    this.log(`Opened Standard Quote ${id}.`);
  }

  /** Read a column cell value for a quote row (header text match). */
  async readQuoteGridColumnForRow(
    row: Locator,
    columnHeader: RegExp,
  ): Promise<string> {
    const colIndex = await this.findQuotesGridColumnIndex(columnHeader);
    if (colIndex < 0) {
      const rowText = ((await row.innerText()) ?? "").replace(/\s+/g, " ").trim();
      return rowText;
    }
    return ((await row.locator("td").nth(colIndex).innerText()) ?? "").replace(/\s+/g, " ").trim();
  }

  private async findQuotesGridColumnIndex(columnHeader: RegExp): Promise<number> {
    const headers = this.quotesGridTable().locator("thead th");
    const count = await headers.count();
    for (let i = 0; i < count; i++) {
      const text = DODashboardPage.normalizeQuotesGridHeaderLabel(
        (await headers.nth(i).innerText()) ?? "",
      );
      if (DODashboardPage.quotesGridColumnHeaderNamePattern(columnHeader).test(text)) {
        return i;
      }
    }
    return -1;
  }

  /** UDP-T3867 / T3891 — **Assigned To** column for a quote row. */
  async expectQuoteGridAssignedTo(
    referenceOrQuoteId: string,
    expected: string | null,
  ): Promise<void> {
    this.logStep(`Expect Quote Grid Assigned To: ${expected ?? "(empty)"}`);
    const row = this.quoteGridRowByReference(referenceOrQuoteId);
    await expect(row).toBeVisible({ timeout: 45_000 });
    const assigned = await this.readQuoteGridColumnForRow(row, /Assigned\s*To/i);
    if (expected === null || expected === "") {
      expect(assigned).toMatch(/^(—|-|N\/A|)$/i);
      return;
    }
    expect(assigned).toContain(expected);
  }

  /** UDP-T3873+ — dashboard **Workflow Status** column. */
  async expectQuoteGridWorkflowStatus(
    referenceOrQuoteId: string,
    expectedStatus: RegExp | string,
  ): Promise<void> {
    this.logStep(`Expect Quote Grid Workflow Status: ${String(expectedStatus)}`);
    const row = this.quoteGridRowByReference(referenceOrQuoteId);
    await expect(row).toBeVisible({ timeout: 45_000 });
    const status = await this.readQuoteGridColumnForRow(row, /Workflow\s*Status/i);
    if (expectedStatus instanceof RegExp) {
      expect(status).toMatch(expectedStatus);
      return;
    }
    expect(status).toContain(expectedStatus);
  }

  /** Open quote from grid by clicking the blue **Quote ID** cell. */
  async openQuoteFromGridByReference(
    referenceOrQuoteId: string,
    opts?: { skipSearch?: boolean },
  ): Promise<void> {
    this.logStep(`Open Quote From Grid: ${this.stepValueDisplay(referenceOrQuoteId)}`);
    if (!opts?.skipSearch) {
      await this.searchQuotesGrid(referenceOrQuoteId);
    }
    const row = this.quoteGridRowByReference(referenceOrQuoteId);
    await expect(row).toBeVisible({ timeout: 45_000 });
    const openTarget = this.quoteGridOpenTargetInRow(row, referenceOrQuoteId);
    await openTarget.click({ timeout: 30_000 });
    await this.waitForAppLoaderOverlayGone(120_000);
    await expect(
      this.page.locator("app-quote-details, app-standard-quote").first(),
    ).toBeVisible({ timeout: 120_000 });
  }

  /** Switch quote-type dropdown from **Quote** to **Expired** listing. */
  async openExpiredQuotesListing(): Promise<void> {
    this.logStep("Open Expired Quotes Listing");
    await this.ensureNoBlockingQuoteDialog();
    await this.openQuotesAndApplications();
    const typeDropdown = this.quotesGridTypeDropdown();
    await expect(typeDropdown).toBeVisible({ timeout: 30_000 });
    await typeDropdown.click({ timeout: 15_000 });
    const expiredOption = this.page
      .getByRole("option", { name: /Expired/i })
      .first();
    await expect(expiredOption).toBeVisible({ timeout: 15_000 });
    await expiredOption.click({ timeout: 15_000 });
    const viewBtn = this.quotesGridViewButton();
    if (await viewBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await viewBtn.click({ timeout: 15_000 });
    }
    await this.waitForAppLoaderOverlayGone(60_000);
  }

  /** Open quote by direct edit URL when quoteId is known (seed catalog). */
  async openQuoteById(quoteId: string): Promise<void> {
    this.logStep(`Open Quote By Id: ${quoteId}`);
    const base = this.page.url().replace(/\/dealer\/?.*$/i, "/dealer");
    const url = `${base}/standard-quote/edit/${quoteId}`;
    await this.page.goto(url);
    await this.waitForAppLoaderOverlayGone(120_000);
    await expect(
      this.page.locator("app-quote-details, app-standard-quote").first(),
    ).toBeVisible({ timeout: 120_000 });
  }

  /** Post-login dealer home → **Quotes & Applications** listing grid. */
  async navigateToQuotesAndApplicationsListing(): Promise<void> {
    this.logStep("Navigate To Quotes And Applications Listing");
    await this.waitForAppLoaderOverlayGone(120_000);
    const link = this.page
      .getByRole("link", { name: /Quotes\s*&\s*Applications/i })
      .first();
    if (await link.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await link.click({ timeout: 20_000 });
      await this.waitForAppLoaderOverlayGone(60_000);
    }
    await this.waitForLoadingComplete(30_000);
  }

  /**
   * Switch listing grid type when the dealer dashboard exposes a **Quote** / **Application** combobox.
   * No-op when the control is absent (single combined grid).
   */
  async selectDealerListingGridType(gridLabel: RegExp): Promise<void> {
    this.logStep(`Select Dealer Listing Grid Type ${gridLabel}`);
    await this.waitForAppLoaderOverlayGone(60_000);
    const listingType = this.page
      .getByRole("combobox", { name: /^(Quote|Application|Listing|Loan)$/i })
      .first();
    if (!(await listingType.isVisible({ timeout: 12_000 }).catch(() => false))) {
      return;
    }
    await listingType.click({ timeout: 10_000 });
    const option = this.page.getByRole("option", { name: gridLabel }).first();
    if (await option.isVisible({ timeout: 12_000 }).catch(() => false)) {
      await option.click({ timeout: 10_000 });
      await this.waitForAppLoaderOverlayGone(60_000);
    } else {
      await this.page.keyboard.press("Escape").catch(() => {});
    }
  }

  /**
   * **Applications** grid → open first row with **Submitted** status (navigation-only; no new quote).
   * @returns Quote / Application ID opened from the grid.
   */
  async openSubmittedApplicationFromListing(): Promise<string> {
    this.logStep("Open Submitted Application From Listing");
    await this.navigateToQuotesAndApplicationsListing();
    await this.selectDealerListingGridType(/^Application/i);

    const row = this.page
      .locator("table tbody tr")
      .filter({ hasText: /\bSubmitted\b/i })
      .first();
    await expect(row).toBeVisible({ timeout: 60_000 });

    const rowText = (await row.innerText()).replace(/\s+/g, " ").trim();
    const quoteId = rowText.match(/\b(\d{3,})\b/)?.[1] ?? "";

    const openTarget = row
      .getByRole("link")
      .first()
      .or(row.locator("td").filter({ hasText: /^\d{3,}$/ }).first())
      .or(row.getByText(/^\d{3,}$/).first());
    await openTarget.scrollIntoViewIfNeeded();
    await openTarget.click({ timeout: 20_000 });

    await expect(
      this.page.locator("app-quote-details, app-standard-quote").first(),
    ).toBeVisible({ timeout: 120_000 });

    if (!quoteId) {
      throw new Error(
        "openSubmittedApplicationFromListing: could not resolve Quote/Application ID from the Submitted row.",
      );
    }
    this.log(`Opened submitted application ${quoteId} from dashboard listing.`);
    return quoteId;
  }

  /**
   * **Quotes** grid → open an existing **Open Quote** by ID (navigation-only; no create/submit).
   * Alias path for {@link openStandardQuoteByQuoteId} after ensuring Quotes listing view.
   */
  async openOpenQuoteFromListing(quoteId: string): Promise<void> {
    await this.navigateToQuotesAndApplicationsListing();
    await this.selectDealerListingGridType(/^Quote/i);
    await this.searchDealerListingByQuoteId(quoteId);
    await this.openStandardQuoteByQuoteId(quoteId);
  }

  /**
   * **Quotes** grid → open **Open Quote** by origination reference (OL builds may omit Quote ID in header).
   */
  async openOpenQuoteFromListingByReference(originationReference: string): Promise<void> {
    const ref = originationReference.trim();
    await this.openQuotesAndApplications();
    await this.selectDealerListingGridType(/^Quote/i);
    await expect
      .poll(
        async () => {
          await this.searchQuotesGrid(ref);
          return await this.quoteGridRowByReference(ref).isVisible().catch(() => false);
        },
        { timeout: 90_000, intervals: [1_000, 2_000, 3_000] },
      )
      .toBe(true);
    await this.openQuoteFromGridByReference(ref, { skipSearch: true });
  }

  /**
   * **Applications** grid → open an application in **Ready for Documentation** (navigation-only).
   * When `quoteId` is set, opens that row; otherwise the first matching listing row.
   * @returns Quote / Application ID opened from the grid.
   */
  async openReadyForDocumentationApplicationFromListing(quoteId?: string): Promise<string> {
    this.logStep("Open Ready For Documentation Application From Listing");
    await this.navigateToQuotesAndApplicationsListing();
    await this.selectDealerListingGridType(/^Application/i);

    const id = quoteId?.trim() ?? "";
    if (id) {
      await this.searchDealerListingByQuoteId(id);
      await this.openStandardQuoteByQuoteId(id);
      this.log(`Opened Ready for Documentation application ${id} from dashboard listing (QID).`);
      return id;
    }

    const row = this.page
      .locator("table tbody tr")
      .filter({ hasText: /Ready\s+for\s+Documentation/i })
      .first();
    await expect(row).toBeVisible({ timeout: 60_000 });

    const rowText = (await row.innerText()).replace(/\s+/g, " ").trim();
    const resolvedId = rowText.match(/\b(\d{3,})\b/)?.[1] ?? "";

    const openTarget = row
      .getByRole("link")
      .first()
      .or(row.locator("td").filter({ hasText: /^\d{3,}$/ }).first())
      .or(row.getByText(/^\d{3,}$/).first());
    await openTarget.scrollIntoViewIfNeeded();
    await openTarget.click({ timeout: 20_000 });

    await expect(
      this.page.locator("app-quote-details, app-standard-quote").first(),
    ).toBeVisible({ timeout: 120_000 });

    if (!resolvedId) {
      throw new Error(
        "openReadyForDocumentationApplicationFromListing: could not resolve Quote/Application ID from the Ready for Documentation row.",
      );
    }
    this.log(`Opened Ready for Documentation application ${resolvedId} from dashboard listing.`);
    return resolvedId;
  }

  // ─── Dashboard widgets (UDP-T4352–T4362) ───────────────────────────────────

  /** PrimeNG dashboard shell (`app-dashboard`). */
  dashboardApp(): Locator {
    return this.page.locator("app-dashboard").first();
  }

  /** Workflow Status card — `app-workflow-status` or `.card-body` with the widget header. */
  workflowStatusRoot(): Locator {
    return this.page
      .locator("app-workflow-status, .card-body")
      .filter({ has: this.page.getByText(/^Workflow\s+Status$/i) })
      .first();
  }

  /** Workflow Status bucket tile by portal label (Quote, Assessment, …). */
  workflowStatusBucket(label: string | RegExp): Locator {
    const labelPattern = DODashboardPage.workflowStatusBucketLabelPattern(label);
    const root = this.workflowStatusRoot();
    const bySummary = root
      .locator(".bordersummary")
      .filter({ has: this.page.locator(".borderunit").filter({ hasText: labelPattern }) });
    const byGridTile = root.locator(".grid > div").filter({
      has: this.page.getByText(labelPattern),
    });
    return bySummary.or(byGridTile).first();
  }

  /** Dollar / count line inside a workflow bucket tile. */
  workflowStatusBucketMetric(bucket: Locator): Locator {
    return bucket
      .locator(".amount-section p")
      .first()
      .or(bucket.getByText(/\$[\d,]+(?:\.\d+)?K?|\$0\b/).first());
  }

  /**
   * Portal bucket labels render with surrounding whitespace in `.borderunit`
   * (e.g. `" Quote "`). Anchor on the label text, not exact `^Quote$`.
   */
  private static workflowStatusBucketLabelPattern(label: string | RegExp): RegExp {
    if (label instanceof RegExp) {
      const source = label.source.replace(/^\^/, "").replace(/\$$/, "");
      return new RegExp(`^\\s*${source}\\s*$`, label.flags.includes("i") ? "i" : "");
    }
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^\\s*${escaped}\\s*$`, "i");
  }

  /** Application Outcome legend row (Paid Out, Pending, …). */
  applicationOutcomeLegend(label: RegExp): Locator {
    return this.applicationOutcomeWidget
      .locator(".legend-item")
      .filter({ hasText: label })
      .first();
  }

  /** Online Application Status metric card (Started, Submitted, Applications Value). */
  onlineApplicationStatusCard(label: RegExp): Locator {
    return this.applicationOutcomeWidget
      .locator(".border-0.border-round-lg")
      .filter({ hasText: label })
      .first();
  }

  /** Top-bar notification badge count. */
  notificationBadge(): Locator {
    return this.page.locator(".bell-icon .p-badge, [id$='_badge'].p-badge").first();
  }

  /** Workflow Status **View All** / **View Less** toggle. */
  workflowStatusViewToggle(): Locator {
    return this.workflowStatusRoot().locator("a.view-toggle").first();
  }

  /** Year stepper label inside Monthly Volumes or Average Sales widgets. */
  widgetYearLabel(widget: Locator): Locator {
    return widget.locator("p.text-sm").filter({ hasText: /^\d{4}$/ }).first();
  }

  /** Year stepper arrows (`pi-angle-up` / `pi-angle-down`) beside the year label. */
  widgetYearStepDown(widget: Locator): Locator {
    return widget.locator("p.upDown i.pi-angle-down").first();
  }

  widgetYearStepUp(widget: Locator): Locator {
    return widget.locator("p.upDown i.pi-angle-up").first();
  }

  async readWidgetYear(widget: Locator): Promise<number> {
    const text = ((await this.widgetYearLabel(widget).innerText()) ?? "").trim();
    const year = Number.parseInt(text, 10);
    if (!Number.isFinite(year)) {
      throw new Error(`Could not read widget year from "${text}"`);
    }
    return year;
  }

  /** Fees & Commission row (Fees + Commission labels + MTD/YTD dropdown). */
  feesAndCommissionPanel(): Locator {
    return this.averageSalesWidget
      .locator(".grid")
      .filter({ has: this.averageSalesWidget.getByText(/^Fees$/i) })
      .filter({ has: this.averageSalesWidget.getByText(/^Commission$/i) })
      .first();
  }

  /** Margins on Loans Paid Out card (sibling of Fees grid inside average-sales). */
  marginsPanel(): Locator {
    return this.averageSalesWidget
      .locator("div")
      .filter({ has: this.averageSalesWidget.getByText(/Margins on Loans Paid Out/i) })
      .filter({ has: this.averageSalesWidget.getByRole("combobox", { name: /YTD|MTD/i }) })
      .filter({ hasNot: this.averageSalesWidget.getByText(/^Fees$/i) })
      .first();
  }

  /** Fees amount label in Fees & Commission card. */
  feesAmountLabel(): Locator {
    const panel = this.feesAndCommissionPanel();
    return panel
      .locator("amount label.text-right")
      .first()
      .or(panel.getByText(/\$[\d,]+\.\d{2}/).first());
  }

  /** Commission amount label in Fees & Commission card. */
  commissionAmountLabel(): Locator {
    const panel = this.feesAndCommissionPanel();
    return panel
      .locator("amount label.text-right")
      .nth(1)
      .or(panel.getByText(/\$[\d,]+\.\d{2}/).nth(1));
  }

  /** MTD/YTD dropdown on the Fees & Commission widget only. */
  feesCommissionPeriodDropdown(): Locator {
    return this.feesAndCommissionPanel().locator("p-dropdown").getByRole("combobox").first();
  }

  /** MTD/YTD dropdown on the Margins widget only. */
  marginsPeriodDropdown(): Locator {
    return this.marginsPanel().getByRole("combobox", { name: /YTD|MTD/i }).first();
  }

  /** Margins percentage value (e.g. 6.75% or -67.2%). */
  marginsPercentageLabel(): Locator {
    return this.marginsPanel().getByText(/-?\d+(?:\.\d+)?%/).first();
  }

  /** Margins paid-out date range line (e.g. Jan 23 - Nov 23). */
  marginsDateRangeLabel(): Locator {
    return this.marginsPanel().getByText(/\w{3}\s+\d{2}\s*-\s*\w{3}\s+\d{2}/).first();
  }

  /** Average Sales Price metric type dropdown. */
  averageSalesMetricDropdown(): Locator {
    return this.averageSalesWidget
      .getByRole("combobox", { name: /Average Sales Price|Average Commission|Average Amount Financed/i })
      .first();
  }

  /** Monthly Volumes / Average Sales year dropdown (`aria-label="Year"`). */
  widgetYearDropdown(widget: Locator): Locator {
    return widget.getByRole("combobox", { name: /^Year$/i }).first();
  }

  /** Notifications panel body (list container or empty-state wrapper). */
  notificationsPanelBody(): Locator {
    return this.notificationsWidget.locator(".notification-card-body").first();
  }

  async expectDashboardWidgetsVisible(): Promise<void> {
    this.logStep("Expect Dashboard Widgets Visible");
    await expect(this.dashboardApp()).toBeVisible({ timeout: 60_000 });
    await expect(this.monthlyVolumesWidget).toBeVisible({ timeout: 30_000 });
    await expect(this.workflowStatusWidget).toBeVisible({ timeout: 30_000 });
    await expect(this.averageSalesWidget).toBeVisible({ timeout: 30_000 });
    await expect(this.applicationOutcomeWidget).toBeVisible({ timeout: 30_000 });
    await expect(this.notificationsWidget).toBeVisible({ timeout: 30_000 });
    await expect(this.createQuickQuoteButton).toBeVisible({ timeout: 30_000 });
    await expect(this.createStandardQuoteButton).toBeVisible({ timeout: 30_000 });
    await this.openQuotesAndApplications();
  }

  async expectWorkflowStatusBucketsVisible(
    labels: Array<string | RegExp>,
  ): Promise<void> {
    const root = this.workflowStatusRoot();
    await expect(root).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(
        async () => {
          const summary = await root.locator(".bordersummary").count();
          const grid = await root.locator(".grid > div").count();
          return Math.max(summary, grid);
        },
        { timeout: 30_000 },
      )
      .toBeGreaterThan(0);
    for (const label of labels) {
      await expect(this.workflowStatusBucket(label)).toBeVisible({ timeout: 15_000 });
    }
  }

  async toggleWorkflowStatusView(): Promise<string> {
    const toggle = this.workflowStatusViewToggle();
    await expect(toggle).toBeVisible({ timeout: 15_000 });
    const before = ((await toggle.innerText()) ?? "").trim();
    await toggle.click({ timeout: 10_000 });
    await this.waitForAppLoaderOverlayGone(30_000);
    const after = ((await toggle.innerText()) ?? "").trim();
    expect(after).not.toBe(before);
    return after;
  }

  async selectWidgetYear(widget: Locator, year: string): Promise<void> {
    const target = Number.parseInt(year, 10);
    if (!Number.isFinite(target)) {
      throw new Error(`Invalid widget year: ${year}`);
    }

    await expect(this.widgetYearLabel(widget)).toBeVisible({ timeout: 15_000 });

    const stepDown = this.widgetYearStepDown(widget);
    const stepUp = this.widgetYearStepUp(widget);
    const hasStepper =
      (await stepDown.isVisible({ timeout: 3_000 }).catch(() => false)) &&
      (await stepUp.isVisible({ timeout: 3_000 }).catch(() => false));

    if (hasStepper) {
      for (let step = 0; step < 12; step++) {
        const current = await this.readWidgetYear(widget);
        if (current === target) break;

        const arrow = current > target ? stepDown : stepUp;
        await arrow.click({ timeout: 10_000 });
        await this.waitForAppLoaderOverlayGone(20_000);
        await expect
          .poll(async () => await this.readWidgetYear(widget), { timeout: 15_000 })
          .not.toBe(current);
      }

      await expect(this.widgetYearLabel(widget)).toHaveText(year, { timeout: 30_000 });
      return;
    }

    const dropdown = this.widgetYearDropdown(widget);
    await expect(dropdown).toBeVisible({ timeout: 15_000 });
    await dropdown.click({ timeout: 10_000 });
    const option = this.page.getByRole("option", { name: year, exact: true }).first();
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click({ timeout: 10_000 });
    await this.waitForAppLoaderOverlayGone(30_000);
    await expect(this.widgetYearLabel(widget)).toHaveText(year, { timeout: 30_000 });
  }

  async selectAverageSalesMetric(metric: RegExp): Promise<void> {
    const dropdown = this.averageSalesMetricDropdown();
    await dropdown.click({ timeout: 10_000 });
    const option = this.page.getByRole("option", { name: metric }).first();
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click({ timeout: 10_000 });
    await this.waitForAppLoaderOverlayGone(30_000);
    await expect(dropdown).toHaveAttribute("aria-label", metric, { timeout: 15_000 });
  }

  async selectFeesCommissionPeriod(period: "YTD" | "MTD"): Promise<void> {
    await this.selectWidgetPeriodDropdown(this.feesCommissionPeriodDropdown(), period);
  }

  async selectMarginsPeriod(period: "YTD" | "MTD"): Promise<void> {
    await this.selectWidgetPeriodDropdown(this.marginsPeriodDropdown(), period);
  }

  private async selectWidgetPeriodDropdown(
    dropdown: Locator,
    period: "YTD" | "MTD",
  ): Promise<void> {
    await dropdown.click({ timeout: 10_000 });
    const option = this.page.getByRole("option", { name: period, exact: true }).first();
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click({ timeout: 10_000 });
    await this.waitForAppLoaderOverlayGone(30_000);
    await expect(dropdown).toHaveAttribute("aria-label", period, { timeout: 15_000 });
  }

  // ─── Applications grid (UDP-T4363–T4413) ─────────────────────────────────

  /** Assign / Export / Print links above the quotes grid. */
  quotesGridToolbarLink(name: RegExp): Locator {
    return this.quotesListingRoot()
      .getByRole("link", { name })
      .first()
      .or(this.quotesListingRoot().locator("a").filter({ hasText: name }).first());
  }

  /** Column header cell in the dashboard listing grid. */
  quotesGridColumnHeader(name: RegExp): Locator {
    const pattern = DODashboardPage.quotesGridColumnHeaderNamePattern(name);
    return this.quotesGridTable().getByRole("columnheader", { name: pattern }).first();
  }

  /**
   * PrimeNG headers include sort/filter controls in the accessible name
   * (e.g. `"Date Show Filter Menu"`). Match the column label prefix only.
   */
  private static quotesGridColumnHeaderNamePattern(name: RegExp): RegExp {
    if (name instanceof RegExp) {
      const source = name.source.replace(/^\^/, "").replace(/\$$/, "");
      const flags = name.flags.includes("i") ? "i" : "";
      return new RegExp(`^\\s*${source}(\\b|\\s)`, flags);
    }
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^\\s*${escaped}(\\b|\\s)`, "i");
  }

  private static normalizeQuotesGridHeaderLabel(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/\s*Show Filter Menu.*$/i, "")
      .trim();
  }

  /** Row ellipsis (Actions) control in the listing grid. */
  quoteGridRowActionsButton(row: Locator): Locator {
    return row.locator("i.fa-ellipsis, i.fa-solid.fa-ellipsis").first();
  }

  /** Quote row action overlay opened from the Actions ellipsis (View/Copy/Cancel/Reopen). */
  quoteGridRowActionsOverlay(): Locator {
    return this.page
      .locator(".p-overlaypanel")
      .filter({ has: this.page.getByText(/View Quote|Copy Quote|Reopen Quote/i) })
      .last();
  }

  /** Quote row action items inside the ellipsis overlay. */
  quoteGridActionItems(): Locator {
    const overlay = this.quoteGridRowActionsOverlay();
    return overlay
      .locator(".action-item")
      .or(overlay.getByText(/View Quote|Copy Quote|Cancel Quote|Reopen Quote/i));
  }

  /** Loan row action overlay from the Actions ellipsis (View Statement, …). */
  quoteGridLoanRowActionsOverlay(): Locator {
    return this.page
      .locator(".p-overlaypanel")
      .filter({
        has: this.page.getByText(/View Statement|Create Settlement Quote|Email P&I Schedule/i),
      })
      .last();
  }

  /** Loan row action items inside the ellipsis overlay. */
  loanGridRowActionItems(): Locator {
    const overlay = this.quoteGridLoanRowActionsOverlay();
    return overlay
      .locator(".action-item")
      .or(
        overlay.getByText(
          /View Statement|Create Settlement Quote|Email Statement|Email P&I Schedule/i,
        ),
      );
  }

  /** Loan listing statement actions host above the grid (Create Settlement Quote, View Statement, …). */
  quotesListStatementActionHost(): Locator {
    return this.quotesListingRoot().locator("app-quote-list-action").first();
  }

  /** Loan listing statement actions host (Create Settlement Quote, View Statement, …). */
  quotesListStatementActionItems(): Locator {
    return this.quotesListStatementActionHost().locator(".action-item");
  }

  private async loanRowActionsOverlayVisible(): Promise<boolean> {
    return this.quoteGridLoanRowActionsOverlay().isVisible({ timeout: 1_000 }).catch(() => false);
  }

  private async usesQuoteRowActionsOverlay(): Promise<boolean> {
    const label = ((await this.quotesGridTypeDropdown().getAttribute("aria-label")) ?? "").trim();
    if (/Activated Loans|Active Loans|AFV\s*Loans?/i.test(label)) {
      return false;
    }
    return /Quote|Expired/i.test(label);
  }

  private async activeQuoteGridActionItems(): Promise<Locator> {
    if (await this.usesQuoteRowActionsOverlay()) {
      return this.quoteGridActionItems();
    }
    if (await this.loanRowActionsOverlayVisible()) {
      return this.loanGridRowActionItems();
    }
    return this.quotesListStatementActionItems();
  }

  private async scrollQuoteGridActionItemIntoView(item: Locator): Promise<void> {
    if (await this.quotesListStatementActionHost().isVisible({ timeout: 500 }).catch(() => false)) {
      await this.quotesListStatementActionHost().evaluate((el) => {
        el.scrollIntoView({ block: "center", inline: "nearest" });
      });
    }
    await item.evaluate((el) => {
      el.scrollIntoView({ block: "center", inline: "nearest" });
    });
  }

  private async waitForQuoteGridActionsMenu(): Promise<void> {
    if (await this.usesQuoteRowActionsOverlay()) {
      await expect(this.quoteGridRowActionsOverlay()).toBeVisible({ timeout: 15_000 });
      return;
    }
    if (await this.loanRowActionsOverlayVisible()) {
      await expect(this.quoteGridLoanRowActionsOverlay()).toBeVisible({ timeout: 15_000 });
      return;
    }
    await this.quotesListStatementActionHost().scrollIntoViewIfNeeded();
    await expect(this.quotesListStatementActionItems().first()).toBeVisible({ timeout: 15_000 });
  }

  /** Prime column filter menu button on a header. */
  quotesGridColumnFilterButton(columnHeader: Locator): Locator {
    return columnHeader.locator("button.p-column-filter-menu-button").first();
  }

  /** PrimeNG column filter dialog / overlay opened from a grid header. */
  quotesGridColumnFilterOverlay(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ has: this.page.getByRole("button", { name: /^Apply$/i }) })
      .filter({ visible: true })
      .first()
      .or(
        this.page
          .locator(".p-column-filter-overlay, .p-overlaypanel")
          .filter({ visible: true })
          .last(),
      );
  }

  /** Match criterion dropdown (Starts with, Contains, …) inside the filter dialog. */
  quotesGridColumnFilterMatchDropdown(): Locator {
    const overlay = this.quotesGridColumnFilterOverlay();
    return overlay
      .locator(".p-column-filter-constraint")
      .getByRole("combobox")
      .first()
      .or(overlay.getByRole("combobox").nth(1));
  }

  /** Visible PrimeNG panel for the column-filter match-type dropdown. */
  private quotesGridColumnFilterMatchDropdownPanel(): Locator {
    return this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
  }

  /** Option in the open match-type listbox inside the filter dialog. */
  quotesGridColumnFilterMatchOption(label: RegExp): Locator {
    const listbox = this.quotesGridColumnFilterOverlay()
      .getByRole("listbox", { name: /Option List/i })
      .first();
    return listbox
      .getByRole("option", { name: label })
      .first()
      .or(listbox.locator('[role="option"]').filter({ hasText: label }).first());
  }

  async openQuotesGridColumnFilterMatchDropdown(): Promise<void> {
    const dropdown = this.quotesGridColumnFilterMatchDropdown();
    await expect(dropdown).toBeVisible({ timeout: 10_000 });
    const listbox = this.quotesGridColumnFilterOverlay()
      .getByRole("listbox", { name: /Option List/i })
      .first();
    if (!(await listbox.isVisible({ timeout: 1_000 }).catch(() => false))) {
      await dropdown.click({ timeout: 10_000 });
    }
    await expect(listbox).toBeVisible({ timeout: 10_000 });
  }

  async expectQuotesGridColumnFilterMatchOptions(labels: RegExp[]): Promise<void> {
    this.logStep("Expect quotes grid column filter match options");
    await this.openQuotesGridColumnFilterMatchDropdown();
    for (const label of labels) {
      await expect(this.quotesGridColumnFilterMatchOption(label)).toBeVisible({ timeout: 10_000 });
    }
  }

  /** Portal clears column filters via **Clear** (no separate **No Filter** list item). */
  async expectQuotesGridColumnFilterClearVisible(): Promise<void> {
    await expect(
      this.quotesGridColumnFilterOverlay().getByRole("button", { name: /^Clear$/i }),
    ).toBeVisible({ timeout: 10_000 });
  }

  async openQuotesGridColumnFilter(column: RegExp): Promise<void> {
    this.logStep(`Open Quotes Grid Column Filter: ${String(column)}`);
    const header = this.quotesGridColumnHeader(column);
    await this.quotesGridColumnFilterButton(header).click({ timeout: 10_000 });
    await expect(this.quotesGridColumnFilterOverlay()).toBeVisible({ timeout: 15_000 });
  }

  async closeQuotesGridColumnFilterOverlay(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.quotesGridColumnFilterOverlay()).toBeHidden({ timeout: 10_000 }).catch(() => {});
  }

  /** Sort icon on a column header. */
  quotesGridColumnSortButton(columnHeader: Locator): Locator {
    return columnHeader.locator(".p-sortable-column-icon, sortalticon").first();
  }

  /** Paginator rows-per-page dropdown. */
  quotesGridRowsPerPageDropdown(): Locator {
    return this.quotesListingRoot()
      .locator(".p-paginator-rpp-options")
      .getByRole("combobox")
      .first();
  }

  /** Paginator next-page control. */
  quotesGridNextPageButton(): Locator {
    return this.quotesListingRoot()
      .getByRole("button", { name: /Next Page/i })
      .first();
  }

  /** Visible PrimeNG panel for the quotes listing-type dropdown. */
  private quotesGridListingTypeDropdownPanel(): Locator {
    return this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
  }

  /** Option in the open listing-type dropdown (Quote, Active Loans, AFV Loans, …). */
  private quotesGridListingTypeOption(type: RegExp): Locator {
    const panel = this.quotesGridListingTypeDropdownPanel();
    return panel
      .getByRole("option", { name: type })
      .first()
      .or(panel.locator(".p-dropdown-item").filter({ hasText: type }).first())
      .or(this.page.getByRole("option", { name: type }).first());
  }

  async trySelectQuotesGridListingType(type: RegExp): Promise<boolean> {
    this.logStep(`Try Select Quotes Grid Listing Type ${type}`);
    await this.openQuotesAndApplications();
    const dropdown = this.quotesGridTypeDropdown();
    await expect(dropdown).toBeVisible({ timeout: 30_000 });
    const current = ((await dropdown.getAttribute("aria-label")) ?? (await dropdown.textContent()) ?? "").trim();
    if (type.test(current)) return true;

    await dropdown.click({ timeout: 15_000 });
    await expect(this.quotesGridListingTypeDropdownPanel()).toBeVisible({ timeout: 15_000 });
    const option = this.quotesGridListingTypeOption(type);
    if (!(await option.isVisible({ timeout: 5_000 }).catch(() => false))) {
      await this.page.keyboard.press("Escape").catch(() => {});
      return false;
    }
    await option.click({ timeout: 15_000 });
    const viewBtn = this.quotesGridViewButton();
    if (await viewBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await viewBtn.click({ timeout: 15_000 });
    }
    await this.waitForAppLoaderOverlayGone(60_000);
    return true;
  }

  async selectQuotesGridListingType(type: RegExp): Promise<void> {
    const selected = await this.trySelectQuotesGridListingType(type);
    if (!selected) {
      throw new Error(`Quotes grid listing type not found in dropdown: ${type}`);
    }
  }

  async expectQuotesGridColumnsVisible(headers: RegExp[]): Promise<void> {
    const table = this.quotesGridTable();
    await expect(table).toBeVisible({ timeout: 30_000 });
    for (const header of headers) {
      await expect(this.quotesGridColumnHeader(header)).toBeVisible({ timeout: 15_000 });
    }
  }

  async openQuoteGridRowActions(referenceOrRowText?: string): Promise<void> {
    const row = referenceOrRowText
      ? this.quoteGridRowByReference(referenceOrRowText)
      : this.quotesGridTable().locator("tbody tr").first();
    await expect(row).toBeVisible({ timeout: 45_000 });
    await row.scrollIntoViewIfNeeded();
    const actions = this.quoteGridRowActionsButton(row);
    await actions.click({ timeout: 15_000 });
    await this.waitForQuoteGridActionsMenu();
  }

  async clickQuoteGridAction(actionName: RegExp): Promise<void> {
    const items = await this.activeQuoteGridActionItems();
    const item = items.filter({ hasText: actionName }).first();
    await expect(item).toBeVisible({ timeout: 15_000 });
    await this.scrollQuoteGridActionItemIntoView(item);
    await item.click({ timeout: 15_000 });
    const requiresConfirm = /Cancel\s+Quote/i.test(actionName.source);
    await this.confirmQuoteGridActionDialogIfPresent({ required: requiresConfirm });
    await this.waitForAppLoaderOverlayGone(60_000);
  }

  /** PrimeNG / dynamic-dialog confirmation after grid actions such as **Cancel Quote**. */
  private quoteGridActionConfirmDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({
        hasText: /withdraw this quote|Expired Listing|Do you want to continue/i,
      })
      .filter({ visible: true })
      .first()
      .or(
        this.page
          .locator(
            "p-dynamicdialog, p-confirmdialog, .p-confirm-dialog, p-dialog.loan-date-dialog .p-dialog",
          )
          .filter({ visible: true })
          .filter({
            hasText: /withdraw|cancel|Expired Listing|Are you sure/i,
          })
          .first(),
      );
  }

  async confirmQuoteGridActionDialogIfPresent(opts?: { required?: boolean }): Promise<void> {
    const dialog = this.quoteGridActionConfirmDialog();
    const timeout = opts?.required ? 20_000 : 5_000;
    const visible = await dialog.isVisible({ timeout }).catch(() => false);
    if (!visible) {
      if (opts?.required) {
        throw new Error("Expected quote grid confirm dialog after action, but none appeared.");
      }
      return;
    }
    const confirm = dialog
      .getByRole("button", { name: /Yes,\s*Cancel/i })
      .or(dialog.locator("button.yes-btn").first())
      .or(dialog.getByRole("button", { name: /^Yes$|^Confirm$|^OK$/i }))
      .first();
    await expect(confirm).toBeVisible({ timeout: 15_000 });
    await confirm.click({ timeout: 15_000 });
    await expect(dialog).toBeHidden({ timeout: 30_000 });
    await this.page
      .locator(".p-dialog-mask.p-component-overlay")
      .filter({ visible: true })
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => {});
  }

  private async ensureNoBlockingQuoteDialog(): Promise<void> {
    await this.confirmQuoteGridActionDialogIfPresent({ required: false });
    await this.page
      .locator(".p-dialog-mask.p-component-overlay")
      .filter({ visible: true })
      .waitFor({ state: "hidden", timeout: 5_000 })
      .catch(() => {});
  }

  /** Open row actions → **Cancel Quote** → confirm → wait for listing refresh. */
  async cancelQuoteFromGrid(referenceOrQuoteId?: string): Promise<void> {
    this.logStep(`Cancel Quote From Grid: ${this.stepValueDisplay(referenceOrQuoteId ?? "(first row)")}`);
    if (referenceOrQuoteId) {
      await this.openQuoteGridRowActions(referenceOrQuoteId);
    } else {
      await this.openQuoteGridRowActions();
    }
    await this.clickQuoteGridAction(/Cancel Quote/i);
  }

  async expectQuoteGridActionVisible(actionName: RegExp, visible: boolean): Promise<void> {
    const items = await this.activeQuoteGridActionItems();
    const item = items.filter({ hasText: actionName });
    if (visible) {
      await expect(item.first()).toBeVisible({ timeout: 15_000 });
      return;
    }
    await expect(item).toHaveCount(0);
  }

  async expectQuoteGridActionEnabled(actionName: RegExp, enabled: boolean): Promise<void> {
    const items = await this.activeQuoteGridActionItems();
    const item = items.filter({ hasText: actionName }).first();
    await expect(item).toBeVisible({ timeout: 15_000 });
    if (enabled) {
      await expect(item).not.toHaveClass(/disabled|p-disabled/i);
    } else {
      const disabled =
        (await item.getAttribute("class"))?.includes("disabled") ||
        (await item.getAttribute("aria-disabled")) === "true";
      expect(disabled).toBeTruthy();
    }
  }

  async closeQuoteGridRowActionsOverlay(): Promise<void> {
    if (await this.quoteGridRowActionsOverlay().isVisible({ timeout: 1_000 }).catch(() => false)) {
      await this.page.keyboard.press("Escape");
      await expect(this.quoteGridRowActionsOverlay()).toBeHidden({ timeout: 5_000 });
    }
  }

  async readQuoteGridActionLabels(): Promise<string[]> {
    const items = await this.activeQuoteGridActionItems();
    const count = await items.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      labels.push(((await items.nth(i).innerText()) ?? "").replace(/\s+/g, " ").trim());
    }
    return labels;
  }

  async setQuotesGridDateRange(from: string, to: string): Promise<void> {
    const fromInput = this.quotesGridFromDate;
    const toInput = this.quotesGridToDate;
    await expect(fromInput).toBeVisible({ timeout: 15_000 });
    await fromInput.click({ clickCount: 3 });
    await fromInput.fill(from);
    await fromInput.press("Enter");
    await toInput.click({ clickCount: 3 });
    await toInput.fill(to);
    await toInput.press("Enter");
  }

  async clickQuotesGridView(): Promise<void> {
    await this.quotesGridViewButton().click({ timeout: 15_000 });
    await this.waitForAppLoaderOverlayGone(60_000);
  }

  async clickQuotesGridReset(): Promise<void> {
    await this.quotesGridResetButton.click({ timeout: 15_000 });
    await this.waitForAppLoaderOverlayGone(30_000);
  }

  /** Toolbar links (Assign / Export / Print) — scroll the link to viewport center; JS click if topbar overlaps. */
  private async clickQuotesGridToolbarLink(name: RegExp): Promise<void> {
    await this.openQuotesAndApplications();
    const link = this.quotesGridToolbarLink(name);
    await expect(link).toBeVisible({ timeout: 30_000 });
    await link.evaluate((el) => {
      el.scrollIntoView({ block: "center", inline: "nearest" });
    });
    try {
      await link.click({ timeout: 10_000 });
    } catch {
      await link.evaluate((el: HTMLElement) => el.click());
    }
  }

  async clickAssignLink(): Promise<void> {
    await this.clickQuotesGridToolbarLink(/^\s*Assign\s*$/i);
  }

  async clickExportLink(): Promise<void> {
    await this.clickExportLinkExpectingDatePromptOrDialog();
  }

  async clickExportLinkExpectingDatePromptOrDialog(): Promise<void> {
    await this.clickQuotesGridToolbarLink(/Export/i);
    await this.exportDateFilterPrompt()
      .or(this.exportFormatDialog())
      .waitFor({ state: "visible", timeout: 15_000 })
      .catch(() => {});
  }

  /** Export format dialog (`Export As` / **Select Export Format**). */
  exportFormatDialog(): Locator {
    return this.page.getByRole("dialog", { name: /^Export$/i }).first();
  }

  /** Toast / inline prompt when export is clicked without a date filter. */
  exportDateFilterPrompt(): Locator {
    return this.page
      .getByText(/date filter|add a date|select.*date|please.*date range/i)
      .first()
      .or(
        this.page
          .locator(".p-toast-message-text, .p-confirm-dialog-message, .p-dialog-content")
          .filter({ hasText: /date filter|add a date|select.*date|please.*date range/i })
          .first(),
      );
  }

  async expectExportDateFilterPromptVisible(): Promise<void> {
    this.logStep("Expect Export date-filter prompt");
    await expect(this.exportDateFilterPrompt()).toBeVisible({ timeout: 15_000 });
  }

  async expectExportFormatDialogVisible(): Promise<void> {
    this.logStep("Expect Export format dialog");
    const dialog = this.exportFormatDialog();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(/Export As/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(/Select Export Format/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(dialog.getByRole("button", { name: /^Export$/i })).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole("button", { name: /^Cancel$/i })).toBeVisible({ timeout: 15_000 });
  }

  async clearQuotesGridDateRange(): Promise<void> {
    await expect(this.quotesGridFromDate).toBeVisible({ timeout: 15_000 });
    await this.quotesGridFromDate.fill("");
    await this.quotesGridToDate.fill("");
  }

  async clickPrintLink(): Promise<void> {
    await this.clickQuotesGridToolbarLink(/Print/i);
  }

  /** Assign salesperson dialog (`app-assign-salesperson`). */
  assignDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ has: this.page.locator("app-assign-salesperson") })
      .first();
  }

  async expectAssignDialogVisible(): Promise<void> {
    await expect(this.assignDialog()).toBeVisible({ timeout: 30_000 });
  }

  /** Single-quote assign pop-up fields (UDP-T4396). */
  async expectAssignSingleQuoteDialogFields(): Promise<void> {
    this.logStep("Expect Assign single-quote dialog fields");
    const dialog = this.assignDialog();
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    for (const label of [
      /Quote\s*ID/i,
      /Customer\s*Name/i,
      /Originator\s*Name/i,
      /Originator\s*Number/i,
      /Salesperson/i,
    ]) {
      await expect(dialog.locator("label").filter({ hasText: label }).first()).toBeVisible({
        timeout: 15_000,
      });
    }
    const originatorDropdown = dialog
      .locator("label")
      .filter({ hasText: /Originator\s*Name/i })
      .locator("xpath=ancestor::span[1]")
      .getByRole("combobox")
      .first();
    const salespersonDropdown = dialog
      .locator("label")
      .filter({ hasText: /Salesperson/i })
      .locator("xpath=ancestor::span[1]")
      .getByRole("combobox")
      .first();
    await expect(originatorDropdown).toBeVisible({ timeout: 15_000 });
    await expect(originatorDropdown).toHaveAttribute("aria-disabled", "false");
    await expect(salespersonDropdown).toBeVisible({ timeout: 15_000 });
    await expect(salespersonDropdown).toHaveAttribute("aria-disabled", "false");
    await expect(dialog.getByRole("button", { name: /^Assign$/i })).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole("button", { name: /^Cancel$/i })).toBeVisible({ timeout: 15_000 });
  }

  async expectAssignSameOriginatorError(): Promise<void> {
    await expect(
      this.page.getByText(/Quote must all belong to the same originator/i),
    ).toBeVisible({ timeout: 30_000 });
  }

  /** Row-selection checkbox in the first column (not Webform / other row checkboxes). */
  quoteGridRowSelectionCheckbox(row: Locator): Locator {
    return row.locator("td").first().locator(".p-checkbox .p-checkbox-box").first();
  }

  async selectQuotesGridRows(...identifiers: string[]): Promise<void> {
    for (const id of identifiers) {
      const row = this.quoteGridRowByReference(id);
      await expect(row).toBeVisible({ timeout: 45_000 });
      await this.quoteGridRowSelectionCheckbox(row).click({ timeout: 10_000 });
    }
  }

  async selectQuotesGridRowByIndex(rowIndex: number): Promise<void> {
    const row = this.quotesGridTable().locator("tbody tr").nth(rowIndex);
    await expect(row).toBeVisible({ timeout: 45_000 });
    await this.quoteGridRowSelectionCheckbox(row).click({ timeout: 10_000 });
  }

  async sortQuotesGridByColumn(column: RegExp): Promise<void> {
    const header = this.quotesGridColumnHeader(column);
    await this.quotesGridColumnSortButton(header).click({ timeout: 10_000 });
    await this.waitForAppLoaderOverlayGone(30_000);
  }

  async filterQuotesGridColumn(column: RegExp, matchType: RegExp, value: string): Promise<void> {
    await this.openQuotesGridColumnFilter(column);
    const overlay = this.quotesGridColumnFilterOverlay();
    const matchDropdown = this.quotesGridColumnFilterMatchDropdown();
    if (await matchDropdown.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await matchDropdown.click();
      await this.quotesGridColumnFilterMatchOption(matchType).click();
    }
    const valueInput = overlay.locator("input").first();
    await valueInput.fill(value);
    await overlay.getByRole("button", { name: /Apply/i }).click({ timeout: 10_000 }).catch(async () => {
      await this.page.keyboard.press("Enter");
    });
    await this.waitForAppLoaderOverlayGone(60_000);
  }

  /** `+` beside a listing grid column header — expands hidden columns (Customer Name or Loan Id on AFV). */
  quotesGridColumnExpandToggle(columnHeader: RegExp): Locator {
    return this.quotesGridTable()
      .locator("thead th")
      .filter({ hasText: columnHeader })
      .getByRole("button", { name: "+", exact: true })
      .first();
  }

  /** `+` beside **Customer Name** header — expands Email / Phone columns for all rows. */
  activeLoanCustomerNameExpandToggle(): Locator {
    return this.quotesGridColumnExpandToggle(/Customer\s*Name/i);
  }

  /** `+` beside **Loan Id** header — AFV Loans expand (Email / Phone / Max Permitted KM). */
  afvLoanIdExpandToggle(): Locator {
    return this.quotesGridColumnExpandToggle(/Loan\s*Id/i);
  }

  /** `-` beside **Customer Name** header — collapses Email / Phone columns. */
  activeLoanCustomerNameCollapseToggle(): Locator {
    return this.quotesGridTable()
      .locator("thead th")
      .filter({ hasText: /Customer\s*Name/i })
      .getByRole("button", { name: /^-$/, exact: true })
      .first();
  }

  private activeLoanExpandedColumnHeader(label: RegExp): Locator {
    return this.quotesGridColumnHeader(label);
  }

  private async isActiveLoanCustomerDetailsExpanded(): Promise<boolean> {
    const emailHeader = this.activeLoanExpandedColumnHeader(/^Email$/i);
    if (await emailHeader.isVisible({ timeout: 500 }).catch(() => false)) {
      return true;
    }
    const table = this.quotesGridTable().locator("tbody");
    const emailLabel = await table.getByText(/^Email$/i).count();
    const phoneLabel = await table.getByText(/^Phone$/i).count();
    return emailLabel > 0 && phoneLabel > 0;
  }

  async expandActiveLoanRow(reference: string): Promise<void> {
    this.logStep(`Expand Active Loan Row: ${this.stepValueDisplay(reference)}`);
    const row = this.quoteGridRowByReference(reference);
    await expect(row).toBeVisible({ timeout: 45_000 });

    if (await this.isActiveLoanCustomerDetailsExpanded()) {
      return;
    }

    const headerToggles = [
      this.activeLoanCustomerNameExpandToggle(),
      this.afvLoanIdExpandToggle(),
    ];
    for (const headerToggle of headerToggles) {
      if (await headerToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await headerToggle.scrollIntoViewIfNeeded();
        await headerToggle.click({ timeout: 10_000 });
        await this.waitForAppLoaderOverlayGone(30_000);
        await expect
          .poll(async () => this.isActiveLoanCustomerDetailsExpanded(), { timeout: 15_000 })
          .toBeTruthy();
        return;
      }
    }

    const rowToggle = row
      .locator("button.column-toggle-btn, i.pi-plus, .pi-plus")
      .filter({ hasText: /^\+$/ })
      .first();
    await expect(rowToggle).toBeVisible({ timeout: 15_000 });
    await rowToggle.click({ timeout: 10_000 });
    await expect
      .poll(async () => this.isActiveLoanCustomerDetailsExpanded(), { timeout: 15_000 })
      .toBeTruthy();
  }

  async expectActiveLoanExpandedEmailAndPhoneVisible(reference?: string): Promise<void> {
    this.logStep("Expect Active Loan expanded Email and Phone columns");
    const table = this.quotesGridTable();
    const emailHeader = this.activeLoanExpandedColumnHeader(/^Email$/i);
    const phoneHeader = this.activeLoanExpandedColumnHeader(/^Phone$/i);
    const emailInBody = table.locator("tbody").getByText(/^Email$/i).first();
    const phoneInBody = table.locator("tbody").getByText(/^Phone$/i).first();

    await expect(emailHeader.or(emailInBody)).toBeVisible({ timeout: 15_000 });
    await expect(phoneHeader.or(phoneInBody)).toBeVisible({ timeout: 15_000 });
    if (reference) {
      const row = this.quoteGridRowByReference(reference);
      await expect(row).toBeVisible({ timeout: 15_000 });
    }
  }

  /** AFV Loans expanded row — Email, Phone, and Maximum Permitted KM (UDP-T4391). */
  async expectAfvLoanExpandedDetailsVisible(reference?: string): Promise<void> {
    this.logStep("Expect AFV Loan expanded Email, Phone, and Max Permitted KM");
    await this.expectActiveLoanExpandedEmailAndPhoneVisible(reference);
    const table = this.quotesGridTable();
    const maxKmHeader = this.activeLoanExpandedColumnHeader(/Max(?:imum)?\s*Permitted\s*KM/i);
    const maxKmInBody = table.locator("tbody").getByText(/Max(?:imum)?\s*Permitted\s*KM/i).first();
    await expect(maxKmHeader.or(maxKmInBody)).toBeVisible({ timeout: 15_000 });
  }

  /** PrimeNG / native tooltip for **Outstanding Balance** info icon (Active + AFV loan grids). */
  outstandingBalanceTooltip(): Locator {
    const pattern = /principal balance.*interest accrued.*settlement/i;
    return this.page
      .locator(".p-tooltip-text, .p-tooltip, [role='tooltip']")
      .filter({ hasText: pattern })
      .first()
      .or(this.page.getByText(pattern).first());
  }

  private async outstandingBalanceInfoTriggers(reference?: string): Promise<Locator[]> {
    const header = this.quotesGridColumnHeader(/Outstanding\s*Balance/i);
    const triggers: Locator[] = [
      header.locator("i.fa-circle-info, i.fa-info-circle, i[class*='circle-info']").first(),
      header.locator("[class*='info'], i[class*='info'], [ptooltip], [pTooltip]").first(),
    ];
    if (!reference) {
      return triggers;
    }
    const row = this.quoteGridRowByReference(reference);
    const colIndex = await this.findQuotesGridColumnIndex(/Outstanding\s*Balance/i);
    if (colIndex >= 0) {
      const cell = row.locator("td").nth(colIndex);
      triggers.unshift(
        cell.locator("i.fa-circle-info, i.fa-info-circle, i[class*='circle-info']").first(),
      );
      triggers.unshift(cell.locator("[class*='info'], i[class*='info']").first());
    }
    triggers.push(
      row.locator("i[class*='info'], [class*='info-circle'], .pi-info, .fa-info").first(),
    );
    return triggers;
  }

  async expectOutstandingBalanceTooltipVisible(reference?: string): Promise<void> {
    this.logStep("Expect Outstanding Balance tooltip");
    const tooltip = this.outstandingBalanceTooltip();
    const triggers = await this.outstandingBalanceInfoTriggers(reference);
    await this.quotesGridColumnHeader(/Outstanding\s*Balance/i).scrollIntoViewIfNeeded();

    await expect(async () => {
      for (const trigger of triggers) {
        if (!(await trigger.isVisible().catch(() => false))) {
          continue;
        }
        await trigger.scrollIntoViewIfNeeded();
        await trigger.hover({ force: true });
        if (await tooltip.isVisible().catch(() => false)) {
          return;
        }
        await trigger.click({ force: true });
        if (await tooltip.isVisible().catch(() => false)) {
          return;
        }
      }
      throw new Error("Outstanding Balance tooltip did not appear.");
    }).toPass({ timeout: 20_000 });

    await expect(tooltip).toBeVisible({ timeout: 5_000 });
  }

  async hoverActiveLoanInfoIcon(reference?: string): Promise<void> {
    await this.expectOutstandingBalanceTooltipVisible(reference);
  }

  /** Dealer listing → **Activated Loans** / **Active Loans** view. */
  async navigateToDealerListingActiveLoans(): Promise<void> {
    this.logStep("Navigate To Dealer Listing Active Loans");
    await this.selectQuotesGridListingType(/Activated Loans|Active Loans/i);
  }

  /** Dealer listing → **AFV Loans** view. */
  async navigateToDealerListingAfvLoans(): Promise<void> {
    this.logStep("Navigate To Dealer Listing AFV Loans");
    await this.selectQuotesGridListingType(/AFV\s*Loans?/i);
  }

  /** Returns false when the dealer dashboard does not expose an AFV Loans listing. */
  async tryNavigateToDealerListingAfvLoans(): Promise<boolean> {
    this.logStep("Try Navigate To Dealer Listing AFV Loans");
    return this.trySelectQuotesGridListingType(/AFV\s*Loans?/i);
  }

  /** Open row Actions → **Create Settlement Quote** for a loan (Rego/VIN/Loan ID). */
  async clickCreateSettlementQuoteForLoan(loanReference: string): Promise<void> {
    this.logStep(`Click Create Settlement Quote For Loan ${loanReference}`);
    await this.searchQuotesGrid(loanReference);
    await this.openQuoteGridRowActions(loanReference);
    await this.clickQuoteGridAction(/Create Settlement Quote/i);
  }

  /** Open row Actions → **View Statement** for a loan row. */
  async openViewStatementForLoan(loanReference: string): Promise<void> {
    this.logStep(`Open View Statement For Loan ${loanReference}`);
    await this.searchQuotesGrid(loanReference);
    await this.openQuoteGridRowActions(loanReference);
    await this.clickQuoteGridAction(/View Statement/i);
    await expect(this.page).toHaveURL(/customer-statement\//i, { timeout: 120_000 });
    await expect(this.page.locator("app-customer-statement").first()).toBeVisible({
      timeout: 60_000,
    });
  }

  /** Open row Actions → **Email Statement** for a loan row. */
  async openEmailStatementForLoan(loanReference: string): Promise<void> {
    this.logStep(`Open Email Statement For Loan ${loanReference}`);
    await this.searchQuotesGrid(loanReference);
    await this.openQuoteGridRowActions(loanReference);
    await this.clickQuoteGridAction(/Email Statement|Email P&I Schedule/i);
  }
}
