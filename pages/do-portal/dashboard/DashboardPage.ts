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
  async openQuoteFromGridByReference(referenceOrQuoteId: string): Promise<void> {
    this.logStep(`Open Quote From Grid: ${this.stepValueDisplay(referenceOrQuoteId)}`);
    await this.searchQuotesGrid(referenceOrQuoteId);
    const row = this.quoteGridRowByReference(referenceOrQuoteId);
    await expect(row).toBeVisible({ timeout: 45_000 });
    const quoteIdCell = row
      .locator("div.cursor-pointer.text-primary")
      .filter({ hasText: new RegExp(referenceOrQuoteId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })
      .first()
      .or(row.getByRole("link").first())
      .or(row.locator("a[href*='standard-quote']").first());
    await quoteIdCell.click({ timeout: 30_000 });
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
    await this.openStandardQuoteByQuoteId(quoteId);
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
}
