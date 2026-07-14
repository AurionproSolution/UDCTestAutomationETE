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
    this.workflowStatusWidget = page.locator("app-workflow-status").first();
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
    this.assignLink = listing.locator("a").filter({ hasText: /^Assign$/i }).first();
    this.exportLink = listing.locator("a").filter({ hasText: /Export/i }).first();
    this.printLink = listing.locator("a").filter({ hasText: /Print/i }).first();
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
    const table = this.quotesGridTable();
    const headers = table.locator("thead th");
    const count = await headers.count();
    let colIndex = -1;
    for (let i = 0; i < count; i++) {
      const text = ((await headers.nth(i).innerText()) ?? "").replace(/\s+/g, " ").trim();
      if (columnHeader.test(text)) {
        colIndex = i;
        break;
      }
    }
    if (colIndex < 0) {
      const rowText = ((await row.innerText()) ?? "").replace(/\s+/g, " ").trim();
      return rowText;
    }
    return ((await row.locator("td").nth(colIndex).innerText()) ?? "").replace(/\s+/g, " ").trim();
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
    const status = await this.readQuoteGridColumnForRow(row, /Workflow\s*Status|Status/i);
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

  /** Workflow Status bucket tile by portal label (Quote, Assessment, …). */
  workflowStatusBucket(label: string | RegExp): Locator {
    return this.workflowStatusWidget
      .locator(".bordersummary")
      .filter({ has: this.page.locator(".borderunit").filter({ hasText: label }) })
      .first();
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
    return this.workflowStatusWidget.locator("a.view-toggle").first();
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

  /** Fees amount label in Fees & Commission card. */
  feesAmountLabel(): Locator {
    return this.averageSalesWidget
      .locator("amount label.text-right")
      .first()
      .or(this.averageSalesWidget.getByText(/\$[\d,]+\.\d{2}/).first());
  }

  /** Commission amount label in Fees & Commission card. */
  commissionAmountLabel(): Locator {
    return this.averageSalesWidget
      .locator("amount label.text-right")
      .nth(1)
      .or(this.averageSalesWidget.getByText(/\$[\d,]+\.\d{2}/).nth(1));
  }

  /** MTD/YTD dropdown adjacent to Fees/Commission or Margins. */
  feesOrMarginsPeriodDropdown(label: RegExp = /YTD|MTD/i): Locator {
    return this.averageSalesWidget
      .getByRole("combobox", { name: label })
      .first()
      .or(this.averageSalesWidget.locator("p-dropdown").getByRole("combobox").last());
  }

  /** Margins percentage value (e.g. -64.9%). */
  marginsPercentageLabel(): Locator {
    return this.averageSalesWidget
      .locator("span.font-bold")
      .filter({ hasText: /%/ })
      .first();
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

  /** Notifications panel empty-state or list body. */
  notificationsPanelBody(): Locator {
    return this.notificationsWidget
      .locator(".notification-card-body")
      .first()
      .or(this.notificationsWidget.getByRole("status"));
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

  async selectFeesOrMarginsPeriod(period: "YTD" | "MTD"): Promise<void> {
    const dropdown = this.feesOrMarginsPeriodDropdown(/YTD|MTD/i);
    await dropdown.click({ timeout: 10_000 });
    const option = this.page.getByRole("option", { name: period, exact: true }).first();
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click({ timeout: 10_000 });
    await this.waitForAppLoaderOverlayGone(30_000);
  }

  // ─── Applications grid (UDP-T4363–T4413) ─────────────────────────────────

  /** Assign / Export / Print links above the quotes grid. */
  quotesGridToolbarLink(name: RegExp): Locator {
    return this.quotesListingRoot()
      .locator("a")
      .filter({ hasText: name })
      .first();
  }

  /** Column header cell in the dashboard listing grid. */
  quotesGridColumnHeader(name: RegExp): Locator {
    return this.quotesGridTable()
      .locator("thead th")
      .filter({ hasText: name })
      .first();
  }

  /** Row ellipsis (Actions) control in the listing grid. */
  quoteGridRowActionsButton(row: Locator): Locator {
    return row.locator("i.fa-ellipsis, i.fa-solid.fa-ellipsis").first();
  }

  /** Overlay / popover action menu after clicking row Actions. */
  quoteGridActionsMenu(): Locator {
    return this.page
      .locator("app-quote-list-action .action-item, .p-overlaypanel-content .action-item")
      .first()
      .locator("xpath=ancestor::*[contains(@class,'action-item') or contains(@class,'overlay')][1]")
      .or(this.page.locator("app-quote-list-action"));
  }

  /** Visible action menu items (View Quote, Copy Quote, …). */
  quoteGridActionItems(): Locator {
    return this.page
      .locator("app-quote-list-action")
      .filter({ visible: true })
      .last()
      .locator(".action-item");
  }

  /** Prime column filter menu button on a header. */
  quotesGridColumnFilterButton(columnHeader: Locator): Locator {
    return columnHeader.locator("button.p-column-filter-menu-button").first();
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

  async selectQuotesGridListingType(type: RegExp): Promise<void> {
    this.logStep(`Select Quotes Grid Listing Type ${type}`);
    await this.openQuotesAndApplications();
    const dropdown = this.quotesGridTypeDropdown();
    await expect(dropdown).toBeVisible({ timeout: 30_000 });
    const current = ((await dropdown.getAttribute("aria-label")) ?? (await dropdown.textContent()) ?? "").trim();
    if (type.test(current)) return;

    await dropdown.click({ timeout: 15_000 });
    const option = this.page.getByRole("option", { name: type }).first();
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click({ timeout: 15_000 });
    const viewBtn = this.quotesGridViewButton();
    if (await viewBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await viewBtn.click({ timeout: 15_000 });
    }
    await this.waitForAppLoaderOverlayGone(60_000);
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
    await expect(this.quoteGridActionItems().first()).toBeVisible({ timeout: 15_000 });
  }

  async clickQuoteGridAction(actionName: RegExp): Promise<void> {
    const item = this.quoteGridActionItems().filter({ hasText: actionName }).first();
    await expect(item).toBeVisible({ timeout: 15_000 });
    const clicked = await item
      .click({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!clicked) {
      await item.evaluate((el) => (el as HTMLElement).click());
    }
    await this.waitForAppLoaderOverlayGone(60_000);
  }

  async expectQuoteGridActionEnabled(actionName: RegExp, enabled: boolean): Promise<void> {
    const item = this.quoteGridActionItems().filter({ hasText: actionName }).first();
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

  async readQuoteGridActionLabels(): Promise<string[]> {
    const items = this.quoteGridActionItems();
    const count = await items.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      labels.push(((await items.nth(i).innerText()) ?? "").replace(/\s+/g, " ").trim());
    }
    return labels;
  }

  async setQuotesGridDateRange(from: string, to: string): Promise<void> {
    await expect(this.quotesGridFromDate).toBeVisible({ timeout: 15_000 });
    await this.quotesGridFromDate.fill(from);
    await this.quotesGridToDate.fill(to);
  }

  async clickQuotesGridView(): Promise<void> {
    await this.quotesGridViewButton().click({ timeout: 15_000 });
    await this.waitForAppLoaderOverlayGone(60_000);
  }

  async clickQuotesGridReset(): Promise<void> {
    await this.quotesGridResetButton.click({ timeout: 15_000 });
    await this.waitForAppLoaderOverlayGone(30_000);
  }

  async clickAssignLink(): Promise<void> {
    await this.assignLink.scrollIntoViewIfNeeded();
    await this.assignLink.click({ timeout: 15_000 });
  }

  async clickExportLink(): Promise<void> {
    await this.exportLink.scrollIntoViewIfNeeded();
    await this.clickExportLinkExpectingDatePromptOrDialog();
  }

  async clickExportLinkExpectingDatePromptOrDialog(): Promise<void> {
    await this.exportLink.click({ timeout: 15_000 });
  }

  async clickPrintLink(): Promise<void> {
    await this.printLink.scrollIntoViewIfNeeded();
    await this.printLink.click({ timeout: 15_000 });
  }

  async expectAssignDialogVisible(): Promise<void> {
    await expect(this.page.getByRole("dialog").first()).toBeVisible({ timeout: 30_000 });
  }

  async expectAssignSameOriginatorError(): Promise<void> {
    await expect(
      this.page.getByText(/Quote must all belong to the same originator/i),
    ).toBeVisible({ timeout: 30_000 });
  }

  async selectQuotesGridRows(...identifiers: string[]): Promise<void> {
    for (const id of identifiers) {
      const row = this.quoteGridRowByReference(id);
      await expect(row).toBeVisible({ timeout: 45_000 });
      const checkbox = row.locator(".p-checkbox-box").first();
      await checkbox.click({ timeout: 10_000 });
    }
  }

  async sortQuotesGridByColumn(column: RegExp): Promise<void> {
    const header = this.quotesGridColumnHeader(column);
    await this.quotesGridColumnSortButton(header).click({ timeout: 10_000 });
    await this.waitForAppLoaderOverlayGone(30_000);
  }

  async filterQuotesGridColumn(column: RegExp, matchType: RegExp, value: string): Promise<void> {
    const header = this.quotesGridColumnHeader(column);
    await this.quotesGridColumnFilterButton(header).click({ timeout: 10_000 });
    const overlay = this.page.locator(".p-column-filter-overlay, .p-overlaypanel").last();
    await expect(overlay).toBeVisible({ timeout: 10_000 });
    const matchDropdown = overlay.getByRole("combobox").first();
    if (await matchDropdown.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await matchDropdown.click();
      await this.page.getByRole("option", { name: matchType }).first().click();
    }
    const valueInput = overlay.locator("input").first();
    await valueInput.fill(value);
    await overlay.getByRole("button", { name: /Apply/i }).click({ timeout: 10_000 }).catch(async () => {
      await this.page.keyboard.press("Enter");
    });
    await this.waitForAppLoaderOverlayGone(60_000);
  }

  async expandActiveLoanRow(reference: string): Promise<void> {
    const row = this.quoteGridRowByReference(reference);
    await expect(row).toBeVisible({ timeout: 45_000 });
    const expand = row.locator("i.pi-plus, .pi-plus").first();
    if (await expand.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expand.click({ timeout: 10_000 });
    }
  }

  async hoverActiveLoanInfoIcon(reference: string): Promise<void> {
    const row = this.quoteGridRowByReference(reference);
    await expect(row).toBeVisible({ timeout: 45_000 });
    const info = row.locator("i.pi-info, img[alt='Info'], .pi-info-circle").first();
    await info.hover({ timeout: 10_000 }).catch(async () => {
      await info.click({ timeout: 10_000 });
    });
  }

  /** Dealer listing → **Activated Loans** / **Active Loans** view. */
  async navigateToDealerListingActiveLoans(): Promise<void> {
    this.logStep("Navigate To Dealer Listing Active Loans");
    await this.selectQuotesGridListingType(/Activated Loans|Active Loans/i);
  }

  /** Dealer listing → **AFV Loans** view. */
  async navigateToDealerListingAfvLoans(): Promise<void> {
    this.logStep("Navigate To Dealer Listing AFV Loans");
    await this.selectQuotesGridListingType(/AFV Loans/i);
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
  }

  /** Open row Actions → **Email Statement** for a loan row. */
  async openEmailStatementForLoan(loanReference: string): Promise<void> {
    this.logStep(`Open Email Statement For Loan ${loanReference}`);
    await this.searchQuotesGrid(loanReference);
    await this.openQuoteGridRowActions(loanReference);
    await this.clickQuoteGridAction(/Email Statement|Email P&I Schedule/i);
  }

  /** View Statement — **Payment / Rental Schedule** table (OL label is **Rental Schedule**). */
  statementPaymentScheduleTable(): Locator {
    const scheduleHost = this.page
      .locator("p-card, section, div")
      .filter({ hasText: /Rental\s+Schedule|Payment\s+Schedule/i })
      .filter({ has: this.page.locator("table, .p-datatable") })
      .first();
    return scheduleHost.locator("table, .p-datatable-table").first();
  }

  /** UDP-T4383 — schedule column headers on View Statement. */
  async expectStatementPaymentScheduleColumnsVisible(headers: RegExp[]): Promise<void> {
    this.logStep("Expect statement payment schedule columns visible");
    const table = this.statementPaymentScheduleTable();
    await expect(table).toBeVisible({ timeout: 30_000 });
    const headerRow = table.locator("thead tr").first().or(table.locator("tr").first());
    const headerTexts = ((await headerRow.locator("th, td").allTextContents()) ?? [])
      .map((text) => text.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    for (const header of headers) {
      const matched = headerTexts.some((text) => header.test(text));
      expect(matched, `Expected schedule column matching ${header}`).toBeTruthy();
    }
  }

  /** UDP-T4383 — schedule rows are display-only (values fetched from FIS AF). */
  async expectStatementPaymentScheduleRowsDisplayOnly(): Promise<void> {
    this.logStep("Expect statement payment schedule rows display only");
    const table = this.statementPaymentScheduleTable();
    const dataRows = table.locator("tbody tr").filter({ visible: true });
    await expect(dataRows.first()).toBeVisible({ timeout: 15_000 });
    const rowCount = await dataRows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = dataRows.nth(i);
      const editable = row.locator(
        "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), [role='spinbutton']:not([disabled]), select:not([disabled])",
      );
      expect(await editable.count()).toBe(0);
    }
  }

  /** UDP-T4383 — **Payment Date** cells use DD/MM/YYYY format. */
  async expectStatementPaymentScheduleDatesFormatted(): Promise<void> {
    this.logStep("Expect statement payment schedule dates formatted");
    const table = this.statementPaymentScheduleTable();
    const firstDateCell = table
      .locator("tbody tr td")
      .filter({ hasText: /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/ })
      .first();
    await expect(firstDateCell).toBeVisible({ timeout: 15_000 });
  }

  /** UDP-T4383 — schedule shows currency amounts from FIS AF. */
  async expectStatementPaymentScheduleHasFetchedAmounts(): Promise<void> {
    this.logStep("Expect statement payment schedule has fetched amounts");
    const table = this.statementPaymentScheduleTable();
    const moneyCell = table
      .locator("tbody tr td")
      .filter({ hasText: /\$\s*[\d,]+\.\d{2}/ })
      .first();
    await expect(moneyCell).toBeVisible({ timeout: 15_000 });
  }
}
