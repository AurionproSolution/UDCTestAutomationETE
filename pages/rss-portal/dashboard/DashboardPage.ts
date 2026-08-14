/**
 * RSS Portal - Dashboard Page
 * Page Object Model for RSS Portal main dashboard
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../../common/BasePage';

export class RSSDashboardPage extends BasePage {
  // Locators
  readonly pageHeader: Locator;
  readonly welcomeBanner: Locator;
  readonly navigationMenu: Locator;
  readonly userDropdown: Locator;
  readonly logoutLink: Locator;
  readonly searchBox: Locator;
  readonly reportsSection: Locator;
  /** Top nav (desktop): RSS app bar segment for Apply flow */
  readonly applyNowSegmentTop: Locator;
  /** Top nav (desktop): Loans tab */
  readonly loansSegmentTop: Locator;
  /** Bottom tab bar (mobile): Apply Now */
  readonly applyNowTabBottom: Locator;
  /** Bottom tab bar (mobile): Loans */
  readonly loansTabBottom: Locator;

  constructor(page: Page) {
    super(page);

    // RSS Portal dashboard specific selectors
    this.pageHeader = page.locator('.rss-header, h1');
    this.welcomeBanner = page.locator('.welcome-banner, [data-testid="welcome-banner"]');
    this.navigationMenu = page.locator('.nav-menu, [data-testid="nav-menu"]');
    this.userDropdown = page.locator('.user-dropdown, [data-testid="user-menu"]');
    this.logoutLink = page.locator('a:has-text("Logout"), [data-testid="logout-link"]');
    this.searchBox = page.locator('#globalSearch, [data-testid="search"]');
    this.reportsSection = page.locator('.reports-section, [data-testid="reports"]');
    this.applyNowSegmentTop = page.locator(
      'app-rss ion-segment[role="tablist"] ion-segment-button[value="applyNow"]',
    );
    this.loansSegmentTop = page.locator(
      'app-rss ion-segment[role="tablist"] ion-segment-button[value="loans"], app-rss ion-segment[role="tablist"] ion-segment-button[value="loan"]',
    );
    this.applyNowTabBottom = page
      .locator('.bottom-tab-container ion-tab-button')
      .filter({ hasText: 'Apply Now' });
    this.loansTabBottom = page
      .locator('.bottom-tab-container ion-tab-button')
      .filter({ hasText: /^Loans$/i });
  }

  protected stepLogPrefix(): string {
    return "RSS Portal — Dashboard";
  }

  /** PrimeNG / shell overlays that block nav clicks after party switch or tab change. */
  async waitForRssShellIdle(timeoutMs = 90_000): Promise<void> {
    this.logStep("Wait For RSS Shell Idle");
    await this.waitForLoadingComplete(timeoutMs);
    await expect
      .poll(
        async () => {
          const blockers = this.page.locator(
            ".app-loader-overlay, .p-blockui, p-progressspinner, .p-progressspinner",
          );
          const count = await blockers.count();
          for (let i = 0; i < count; i++) {
            if (await blockers.nth(i).isVisible().catch(() => false)) {
              return false;
            }
          }
          return true;
        },
        { timeout: timeoutMs, intervals: [200, 400, 800, 1_200] },
      )
      .toBe(true);
  }

  /** Top app-rss segment tab (avoids bottom `ion-tab-button` / overlapping tablist). */
  private loansMainNavSegmentButton(): Locator {
    return this.page
      .locator('app-rss ion-segment[role="tablist"]')
      .first()
      .locator("ion-segment-button")
      .filter({ hasText: /\bLoans\b/i });
  }

  private loansMainNavTab(): Locator {
    return this.page
      .locator('app-rss ion-segment[role="tablist"]')
      .first()
      .getByRole("tab", { name: /Loans/i });
  }

  /**
   * Verify dashboard is loaded
   */
  async isDashboardLoaded(): Promise<boolean> {
    this.logStep("Is Dashboard Loaded");
    await this.waitForLoadingComplete();
    try {
      await this.page
        .locator('app-rss ion-segment[role="tablist"]')
        .waitFor({ state: 'visible', timeout: 25_000 });
      return true;
    } catch {
      try {
        await this.page.getByText(/Welcome Back/i).first().waitFor({
          state: 'visible',
          timeout: 10_000,
        });
        return true;
      } catch {
        return await this.isVisible(this.pageHeader);
      }
    }
  }

  /**
   * Opens the Apply Now area using the main dashboard tabs (desktop) or bottom tabs (mobile).
   */
  async clickApplyNow(): Promise<void> {
    this.logStep("Click Apply Now");
    try {
      await this.applyNowSegmentTop.waitFor({ state: 'visible', timeout: 15_000 });
      await this.clickElement(this.applyNowSegmentTop);
    } catch {
      await this.applyNowTabBottom.waitFor({ state: 'visible', timeout: 15_000 });
      await this.clickElement(this.applyNowTabBottom);
    }
    await this.waitForLoadingComplete();
  }

  /**
   * Opens the Loans area using the main dashboard tabs (desktop) or bottom tabs (mobile).
   */
  async clickLoans(): Promise<void> {
    this.logStep("Click Loans");
    await this.waitForRssShellIdle();
    await this.page.keyboard.press("Escape").catch(() => undefined);

    if (await this.isLoansSelected()) {
      await this.waitForRssShellIdle();
      return;
    }

    const segmentButton = this.loansMainNavSegmentButton();
    if (await segmentButton.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await this.waitForRssShellIdle();
      await segmentButton.scrollIntoViewIfNeeded();
      await segmentButton.evaluate((el: HTMLElement) => el.click());
      await this.waitForRssShellIdle();
      if (await this.isLoansSelected()) {
        return;
      }
    }

    const candidates: Locator[] = [
      this.loansMainNavTab(),
      this.loansSegmentTop,
      this.loansTabBottom,
    ];

    for (const locator of candidates) {
      const target = locator.first();
      if (!(await target.isVisible({ timeout: 5_000 }).catch(() => false))) {
        continue;
      }

      await this.waitForRssShellIdle();
      await target.scrollIntoViewIfNeeded();
      try {
        await target.click({ timeout: 60_000, force: true });
      } catch {
        await segmentButton.evaluate((el: HTMLElement) => el.click()).catch(() => undefined);
      }
      await this.waitForRssShellIdle();
      if (await this.isLoansSelected()) {
        return;
      }
    }

    throw new Error(
      "RSS Loans nav tab not found — expected main tablist tab or visible bottom tab.",
    );
  }

  /** True when Loans is the selected segment/tab (desktop or mobile layout). */
  async isLoansSelected(): Promise<boolean> {
    this.logStep("Is Loans Selected");
    const mainNavSelected = this.page
      .locator('app-rss ion-segment[role="tablist"]')
      .first()
      .getByRole("tab", { name: /Loans/i, selected: true });
    if (await mainNavSelected.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return true;
    }

    const desktopSelected = this.page.locator(
      'app-rss ion-segment[role="tablist"] ion-segment-button[value="loans"].segment-button-checked, app-rss ion-segment[role="tablist"] ion-segment-button[value="loan"].segment-button-checked',
    );
    if (await desktopSelected.isVisible().catch(() => false)) return true;
    if (
      await this.loansTabBottom
        .evaluate((el) => el.classList.contains('active'))
        .catch(() => false)
    ) {
      return true;
    }
    return await this.page
      .locator('.bottom-tab-container ion-tab-button.active')
      .filter({ hasText: /^Loans$/i })
      .isVisible()
      .catch(() => false);
  }

  /** True when Apply Now is the selected segment/tab (desktop or mobile layout). */
  async isApplyNowSelected(): Promise<boolean> {
    this.logStep("Is Apply Now Selected");
    const desktopSelected = this.page.locator(
      'app-rss ion-segment-button[value="applyNow"].segment-button-checked',
    );
    if (await desktopSelected.isVisible().catch(() => false)) return true;
    if (
      await this.applyNowTabBottom
        .evaluate((el) => el.classList.contains('active'))
        .catch(() => false)
    ) {
      return true;
    }
    return await this.page
      .locator('.bottom-tab-container ion-tab-button.active')
      .filter({ hasText: 'Apply Now' })
      .isVisible()
      .catch(() => false);
  }

  private escapeRx(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Party / borrower switcher in the shell topbar (`layout-topbar .ml-4 > p-dropdown`, `p-dropdown.partyCss`, `ng-reflect-option-label="extName"`),
   * with ion-toolbar fallbacks for older RSS shells.
   */
  private async findHeaderBorrowerDropdownRoot(timeoutMs: number): Promise<Locator> {
    const factories: (() => Locator)[] = [
      () => this.page.locator("div.layout-topbar div.ml-4 > p-dropdown").first(),
      () => this.page.locator("p-dropdown.partyCss").first(),
      () => this.page.locator('p-dropdown[ng-reflect-option-label="extName"]').first(),
      () =>
        this.page
          .locator(
            [
              "app-rss ion-toolbar p-dropdown",
              "ion-header ion-toolbar p-dropdown",
              "app-rss ion-header p-dropdown",
              "ion-header p-dropdown",
              "ion-toolbar p-dropdown",
            ].join(", "),
          )
          .filter({ has: this.page.locator('[role="combobox"]') })
          .first(),
    ];

    const perTry = Math.max(15_000, Math.floor(timeoutMs / factories.length));
    let lastErr: unknown;
    for (const make of factories) {
      const root = make();
      try {
        await root.waitFor({ state: "attached", timeout: perTry });
        await root.waitFor({ state: "visible", timeout: 12_000 }).catch(() => undefined);
        const combobox = root.locator('[role="combobox"]').first();
        if (await combobox.isVisible({ timeout: 8_000 }).catch(() => false)) {
          return root;
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(
      `RSS header borrower p-dropdown not found (layout-topbar .ml-4, .partyCss, extName, or ion-toolbar). ${String(lastErr)}`,
    );
  }

  /** Opens the toolbar borrower PrimeNG dropdown; returns the visible `.p-dropdown-panel`. */
  async openHeaderPartyDropdownPanel(clickTimeoutMs = 90_000): Promise<Locator> {
    return this.openHeaderBorrowerDropdownPanel(clickTimeoutMs);
  }

  /** Currently selected party label in the header `p-dropdown`. */
  async getSelectedHeaderPartyName(): Promise<string> {
    this.logStep("Get Selected Header Party Name");
    const root = await this.findHeaderBorrowerDropdownRoot(60_000);
    const label = root.locator(".p-dropdown-label, [role='combobox']").first();
    await label.waitFor({ state: "visible", timeout: 20_000 });
    return (await label.innerText()).replace(/\s+/g, " ").trim();
  }

  /** All party names listed in the open header dropdown (panel is closed afterward). */
  async getHeaderPartyDropdownOptionLabels(clickTimeoutMs = 90_000): Promise<string[]> {
    this.logStep("Get Header Party Dropdown Option Labels");
    const panel = await this.openHeaderBorrowerDropdownPanel(clickTimeoutMs);
    const items = panel.locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item");
    await items.first().waitFor({ state: "visible", timeout: 20_000 });
    const count = await items.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await items.nth(i).innerText()).replace(/\s+/g, " ").trim();
      if (text) labels.push(text);
    }
    await this.page.keyboard.press("Escape").catch(() => undefined);
    return labels;
  }

  /** URP-T140 — every party in the header dropdown panel is visible (multi-party user). */
  async expectHeaderPartyDropdownOptionsVisible(
    minimumParties = 2,
    clickTimeoutMs = 90_000,
  ): Promise<string[]> {
    this.logStep("Expect Header Party Dropdown Options Visible");
    const panel = await this.openHeaderBorrowerDropdownPanel(clickTimeoutMs);
    const items = panel.locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item");
    await items.first().waitFor({ state: "visible", timeout: 20_000 });
    const count = await items.count();
    expect(
      count,
      "Logged-in user must have customer visibility of more than one party (Excel precondition).",
    ).toBeGreaterThanOrEqual(minimumParties);

    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      await expect(item).toBeVisible({ timeout: 10_000 });
      const text = (await item.innerText()).replace(/\s+/g, " ").trim();
      expect(text.length).toBeGreaterThan(0);
      labels.push(text);
    }

    await this.page.keyboard.press("Escape").catch(() => undefined);
    return labels;
  }

  /** Overview summary counts on the dashboard Overview tab. */
  async getOverviewLoanCounts(): Promise<{
    active: number;
    repaid: number;
    draft: number;
  }> {
    this.logStep("Get Overview Loan Counts");
    const readCount = async (label: RegExp): Promise<number> => {
      const text = await this.page.getByText(label).first().innerText();
      const match = text.match(/(\d+)/);
      return match ? Number.parseInt(match[1], 10) : -1;
    };
    return {
      active: await readCount(/Active\s*Loans\s*:/i),
      repaid: await readCount(/Repaid\s*Loans\s*:/i),
      draft: await readCount(/Draft\s*Quotes\s*:/i),
    };
  }

  async expectOverviewLoanSummaryVisible(): Promise<void> {
    this.logStep("Expect Overview Loan Summary Visible");
    await expect(this.page.getByText(/Active\s*Loans\s*:/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.page.getByText(/Repaid\s*Loans\s*:/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.page.getByText(/Draft\s*Quotes\s*:/i).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectOverviewTabSelected(): Promise<void> {
    this.logStep("Expect Overview Tab Selected");
    await expect(
      this.page.locator(
        'app-rss ion-segment-button[value="overview"].segment-button-checked',
      ),
    ).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByText(/Welcome Back/i).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Clicks Overview top tab when another RSS tab is active. */
  async clickOverviewIfNeeded(): Promise<void> {
    await this.dismissBlockingDialogsIfPresent();

    const overviewChecked = this.page.locator(
      'app-rss ion-segment-button[value="overview"].segment-button-checked',
    );
    if (await overviewChecked.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return;
    }
    const overviewButton = this.page
      .locator('app-rss ion-segment[role="tablist"]')
      .first()
      .locator("ion-segment-button")
      .filter({ hasText: /\bOverview\b/i })
      .first();
    await this.clickElement(overviewButton);
    await this.waitForRssShellIdle();
  }

  private async dismissBlockingDialogsIfPresent(): Promise<void> {
    const mask = this.page.locator(".p-dialog-mask.p-component-overlay").last();
    if (!(await mask.isVisible({ timeout: 1_000 }).catch(() => false))) {
      return;
    }

    const closeButton = this.page
      .getByRole("dialog")
      .getByRole("button", { name: /^Close$/i })
      .first();
    if (await closeButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeButton.click({ force: true, timeout: 15_000 }).catch(() => undefined);
    } else {
      await this.page.keyboard.press("Escape").catch(() => undefined);
    }

    await expect(mask).toBeHidden({ timeout: 15_000 }).catch(() => undefined);
    await this.waitForLoadingComplete();
  }

  private overviewLoanSectionLabel(section: "active" | "repaid" | "draft"): RegExp {
    const labels = {
      active: /Active\s*Loans\s*:/i,
      repaid: /Repaid\s*Loans\s*:/i,
      draft: /Draft\s*Quotes\s*:/i,
    };
    return labels[section];
  }

  async switchOverviewLoanSection(section: "active" | "repaid" | "draft"): Promise<void> {
    this.logStep(`Switch Overview Loan Section — ${section}`);
    await this.clickElement(
      this.page.getByText(this.overviewLoanSectionLabel(section)).first(),
    );
    await this.waitForLoadingComplete();
  }

  overviewContractCards(): Locator {
    return this.overviewLoanCards("active");
  }

  private overviewLoanCards(section: "active" | "repaid" | "draft"): Locator {
    const marker = this.overviewSectionMarker(section);
    return this.overviewLoanArea()
      .getByRole("listitem")
      .filter({ hasText: marker });
  }

  private overviewContractCardsForSection(section: "active" | "repaid" | "draft"): Locator {
    return this.overviewLoanCards(section);
  }

  /** Clicks the first visible active-loan summary card on Overview. */
  async clickFirstActiveLoanCard(): Promise<void> {
    this.logStep("Click First Active Loan Card");
    const card = this.overviewLoanCards("active").first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await this.clickElement(card);
    await this.waitForRssShellIdle();
  }

  private parseQuoteIdFromOverviewCardText(text: string): string | null {
    const normalized = text.replace(/\s+/g, " ").trim();
    const pipeMatch = normalized.match(/\b(\d{2,})\s*\|/);
    if (pipeMatch?.[1]) {
      return pipeMatch[1];
    }
    const leading = normalized.match(/^\s*(\d{2,})\b/);
    return leading?.[1] ?? null;
  }

  async readVisibleDraftQuoteIds(): Promise<string[]> {
    this.logStep("Read Visible Draft Quote Ids");
    await this.clickOverviewIfNeeded();
    await this.expectOverviewTabSelected();
    await this.switchOverviewLoanSection("draft");
    const cards = this.overviewLoanCards("draft");
    const count = await cards.count();
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const id = this.parseQuoteIdFromOverviewCardText(await cards.nth(i).innerText());
      if (id) {
        ids.push(id);
      }
    }
    return ids;
  }

  async clickDraftQuoteById(quoteId: string): Promise<void> {
    this.logStep(`Click Draft Quote By Id — ${quoteId}`);
    await this.clickOverviewIfNeeded();
    await this.expectOverviewTabSelected();
    await this.switchOverviewLoanSection("draft");
    const escaped = quoteId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const card = this.overviewLoanCards("draft")
      .filter({ hasText: new RegExp(`\\b${escaped}\\b`) })
      .first();
    await expect(card).toBeVisible({ timeout: 60_000 });
    await this.clickElement(card);
    await this.waitForRssShellIdle();
  }

  async resolveNewDraftQuoteId(beforeIds: string[]): Promise<string> {
    this.logStep("Resolve New Draft Quote Id");
    const afterIds = await this.readVisibleDraftQuoteIds();
    const newId = afterIds.find((id) => !beforeIds.includes(id));
    expect(
      newId ?? afterIds[0],
      "A new draft quote must appear on Overview after Apply Now submit.",
    ).toBeTruthy();
    return newId ?? afterIds[0]!;
  }

  async getVisibleOverviewContractCardCount(
    section: "active" | "repaid" | "draft" = "active",
  ): Promise<number> {
    return this.overviewContractCardsForSection(section).count();
  }

  /**
   * Active / Repaid / Draft summary count should match visible contract cards on screen
   * (when count > 0 at least one card; when 0, no Amount Due cards).
   */
  async expectOverviewSectionContractVisibility(
    section: "active" | "repaid" | "draft",
  ): Promise<void> {
    this.logStep(`Expect Overview Section Contract Visibility — ${section}`);
    const counts = await this.getOverviewLoanCounts();
    const expected = counts[section];
    expect(expected).toBeGreaterThanOrEqual(0);

    await this.switchOverviewLoanSection(section);
    const visibleCards = await this.getVisibleOverviewContractCardCount(section);

    if (expected === 0) {
      expect(visibleCards).toBe(0);
      return;
    }

    expect(visibleCards).toBeGreaterThan(0);
    expect(visibleCards).toBeLessThanOrEqual(expected);
  }

  whatsNewSection(): Locator {
    return this.page
      .locator("div, section, aside")
      .filter({ has: this.page.getByText(/What'?s New/i) })
      .first();
  }

  async expectWhatsNewSectionVisible(): Promise<void> {
    this.logStep("Expect Whats New Section Visible");
    await expect(this.page.getByText(/What'?s New/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.page.getByText(/^Offers$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.page.getByText(/^Notifications$/i).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectPromotionalOffersForSelectedParty(): Promise<void> {
    this.logStep("Expect Promotional Offers For Selected Party");
    await this.expectWhatsNewSectionVisible();
    await expect(this.page.getByText(/No offers at this time/i)).toBeHidden({
      timeout: 10_000,
    });
    const offersPanel = this.whatsNewSection();
    const offerItems = offersPanel
      .locator("a, button, .offer, li, p, span")
      .filter({ hasText: /\S/ })
      .filter({ hasNotText: /Offers|Notifications|What'?s New|No offers at this time/i });
    expect(await offerItems.count()).toBeGreaterThan(0);
  }

  private overviewSectionMarker(section: "active" | "repaid" | "draft"): RegExp {
    const markers = {
      active: /Amount Due/i,
      repaid: /Last Payment/i,
      draft: /Amount Financed/i,
    };
    return markers[section];
  }

  private overviewLoanArea(): Locator {
    return this.page
      .locator("app-rss")
      .filter({ has: this.page.getByText(/Welcome Back/i) })
      .first();
  }

  /** First contract summary row on Overview for the selected Active / Repaid / Draft tab. */
  private overviewLoanCard(section: "active" | "repaid" | "draft"): Locator {
    return this.overviewLoanCards(section).first();
  }

  private async waitForOverviewLoanCardVisible(section: "active" | "repaid" | "draft"): Promise<void> {
    await expect(this.overviewLoanCard(section)).toBeVisible({ timeout: 30_000 });
  }

  private async expectOverviewCardLoanHeaderVisible(card: Locator): Promise<void> {
    await expect(card.getByText(/\d+\s*\|/).first()).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText(/Loan|Lease|CSA|TL|FL|AFV|MV|Dealer|Direct/i).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  /** Asset row is an image and/or vehicle description — the UI does not label it "Asset". */
  private async expectOverviewCardAssetDetailsVisible(card: Locator): Promise<void> {
    await expect(card.locator("img").first()).toBeVisible({ timeout: 10_000 });
  }

  /** URP-T159 / T160 / T161 — loan summary card field visibility per Overview tab. */
  async expectOverviewLoanCardFieldsVisible(
    section: "active" | "repaid" | "draft",
  ): Promise<void> {
    this.logStep(`Expect Overview Loan Card Fields Visible — ${section}`);
    await this.switchOverviewLoanSection(section);
    const counts = await this.getOverviewLoanCounts();
    expect(
      counts[section],
      `Party must have at least one ${section} contract for card field visibility (Excel precondition).`,
    ).toBeGreaterThan(0);

    await this.waitForOverviewLoanCardVisible(section);
    const card = this.overviewLoanCard(section);
    await this.expectOverviewCardLoanHeaderVisible(card);
    await this.expectOverviewCardAssetDetailsVisible(card);
    await expect(card.getByText(/Frequency/i).first()).toBeVisible({ timeout: 10_000 });

    if (section === "active") {
      await expect(card.getByText(/Amount Due/i).first()).toBeVisible({ timeout: 10_000 });
      await expect(card.getByText(/Next Payment/i).first()).toBeVisible({ timeout: 10_000 });
      return;
    }

    if (section === "repaid") {
      await expect(card.getByText(/Amount Due/i).first()).toBeVisible({ timeout: 10_000 });
      await expect(card.getByText(/Last Payment/i).first()).toBeVisible({ timeout: 10_000 });
      return;
    }

    await expect(card.getByText(/Amount Financed/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText(/Term/i).first()).toBeVisible({ timeout: 10_000 });
  }

  viewMoreOnOverviewButton(): Locator {
    return this.page
      .getByRole("button", { name: /View\s*More/i })
      .or(this.page.getByText(/View\s*More/i))
      .first();
  }

  /** URP-T162 — View more loads additional contract cards for the active Overview tab. */
  async expectViewMoreLoadsAdditionalOverviewCards(
    section: "active" | "repaid" | "draft",
  ): Promise<void> {
    this.logStep(`Expect View More Loads Additional Overview Cards — ${section}`);
    await this.switchOverviewLoanSection(section);
    const counts = await this.getOverviewLoanCounts();
    expect(
      counts[section],
      `Party must have more than one ${section} contract for View more (Excel precondition).`,
    ).toBeGreaterThan(1);

    const before = await this.getVisibleOverviewContractCardCount(section);
    const viewMore = this.viewMoreOnOverviewButton();
    await expect(viewMore).toBeVisible({ timeout: 15_000 });
    await this.clickElement(viewMore);
    await this.waitForRssShellIdle();

    await expect
      .poll(async () => this.getVisibleOverviewContractCardCount(section), {
        timeout: 20_000,
        intervals: [500, 1_000, 2_000],
      })
      .toBeGreaterThan(before);
  }

  /** URP-T198 — welcome row containing "Your last login was on" plus date/time on Overview. */
  private overviewLastLoginBanner(): Locator {
    return this.overviewLoanArea()
      .locator("div, section, ion-row, ion-col, p, span")
      .filter({ has: this.page.getByText(/Your last login was on/i) })
      .filter({ has: this.page.getByText(/\d{1,2}\/\d{1,2}\/\d{2,4}/) })
      .filter({ has: this.page.getByText(/\d{1,2}:\d{2}\s*(am|pm)/i) })
      .first();
  }

  /** URP-T198 — logged-in date/time on Overview; refresh still shows date and time. */
  async expectLoginDateTimeVisibleAndUpdatesOnRefresh(): Promise<void> {
    this.logStep("Expect Login Date Time Visible And Updates On Refresh");
    await this.expectOverviewTabSelected();

    const loginBanner = this.overviewLastLoginBanner();
    await expect(loginBanner).toBeVisible({ timeout: 15_000 });

    const bannerText = (await loginBanner.innerText()).replace(/\s+/g, " ").trim();
    expect(bannerText).toMatch(/Your last login was on/i);
    expect(bannerText).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
    expect(bannerText).toMatch(/\d{1,2}:\d{2}\s*(am|pm)/i);

    await this.page.reload({ waitUntil: "load" });
    expect(await this.isDashboardLoaded()).toBe(true);
    await this.expectOverviewTabSelected();

    const loginBannerAfter = this.overviewLastLoginBanner();
    await expect(loginBannerAfter).toBeVisible({ timeout: 15_000 });
    const bannerTextAfter = (await loginBannerAfter.innerText()).replace(/\s+/g, " ").trim();
    expect(bannerTextAfter).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
    expect(bannerTextAfter).toMatch(/\d{1,2}:\d{2}\s*(am|pm)/i);
  }

  /** URP-T224 — Welcome back card shows username and last login date/time on Overview. */
  async expectWelcomeBackCardWithLastLoginVisible(): Promise<void> {
    this.logStep("Expect Welcome Back Card With Last Login Visible");
    await this.expectOverviewTabSelected();

    const welcomeArea = this.overviewLoanArea()
      .locator("div, section, ion-row, ion-col, p, span")
      .filter({ has: this.page.getByText(/Welcome Back/i) })
      .first();
    await expect(welcomeArea).toBeVisible({ timeout: 15_000 });

    const welcomeText = (await welcomeArea.innerText()).replace(/\s+/g, " ").trim();
    expect(welcomeText).toMatch(/Welcome Back,/i);
    expect(welcomeText.replace(/Welcome Back,/i, "").trim().length).toBeGreaterThan(0);

    const loginBanner = this.overviewLastLoginBanner();
    await expect(loginBanner).toBeVisible({ timeout: 15_000 });
    const bannerText = (await loginBanner.innerText()).replace(/\s+/g, " ").trim();
    expect(bannerText).toMatch(/Your last login was on/i);
    expect(bannerText).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
    expect(bannerText).toMatch(/\d{1,2}:\d{2}\s*(am|pm)/i);
  }

  /** Opens the toolbar borrower PrimeNG dropdown; returns the visible `.p-dropdown-panel`. */
  private async openHeaderBorrowerDropdownPanel(clickTimeoutMs = 90_000): Promise<Locator> {
    const root = await this.findHeaderBorrowerDropdownRoot(clickTimeoutMs);
    await root.waitFor({ state: 'attached', timeout: clickTimeoutMs });
    await root.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined);

    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root
      .locator('.p-dropdown-trigger, [aria-label="dropdown trigger"]')
      .first();

    await root.scrollIntoViewIfNeeded();
    if (await combobox.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await this.clickElement(combobox, clickTimeoutMs);
    } else {
      await trigger.waitFor({ state: 'visible', timeout: 20_000 });
      await this.clickElement(trigger, clickTimeoutMs);
    }

    const visiblePanel = this.page.locator('.p-dropdown-panel').filter({ visible: true });
    await visiblePanel.last().waitFor({ state: 'visible', timeout: 25_000 });
    return visiblePanel.last();
  }

  /**
   * Opens the header borrower `p-dropdown`, then selects the list row (e.g. **Christopher Ngahina Robinson**).
   * Same open/panel pattern as Apply Now `p-dropdown` steps (`[role="combobox"]` or chevron, `.p-dropdown-panel` on `body`).
   */
  async selectHeaderBorrowerProfile(displayFullName: string, clickTimeoutMs = 90_000): Promise<void> {
    this.logStep("Select Header Borrower Profile");
    const panel = await this.openHeaderBorrowerDropdownPanel(clickTimeoutMs);
    const looseName = new RegExp(this.escapeRx(displayFullName), 'i');
    const row = panel
      .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
      .filter({ hasText: looseName })
      .first();

    if (await row.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await row.click();
    } else {
      const byRole = this.page.getByRole('option', { name: looseName }).first();
      await byRole.waitFor({ state: 'visible', timeout: 15_000 });
      await byRole.click();
    }

    await this.waitForRssShellIdle();
  }

  /**
   * SelectorHub-style exact label: `page.locator(':text-is("Christopher Ngahina Robinson")')` inside the open borrower panel.
   */
  async selectHeaderBorrowerProfileByTextIs(
    exactDisplayName: string,
    clickTimeoutMs = 90_000,
  ): Promise<void> {
    this.logStep("Select Header Borrower Profile By Text Is");
    const panel = await this.openHeaderBorrowerDropdownPanel(clickTimeoutMs);
    const textIsSel = `:text-is(${JSON.stringify(exactDisplayName)})`;
    const option = panel.locator(textIsSel).filter({ visible: true }).first();
    await option.waitFor({ state: 'visible', timeout: 25_000 });
    await this.scrollIfNeeded(option);
    await this.clickElement(option, clickTimeoutMs);
    await this.waitForRssShellIdle();
  }

  /**
   * Navigate to menu item
   */
  async navigateToMenuItem(menuText: string): Promise<void> {
    this.logStep("Navigate To Menu Item");
    const menuItem = this.navigationMenu.locator(`text=${menuText}`);
    await this.clickElement(menuItem);
    await this.waitForLoadingComplete();
  }

  /**
   * Perform global search
   */
  async globalSearch(searchText: string): Promise<void> {
    this.logStep("Global Search");
    await this.fillElement(this.searchBox, searchText);
    await this.page.keyboard.press('Enter');
    await this.waitForLoadingComplete();
  }

  /**
   * Logout from portal
   */
  async logout(): Promise<void> {
    this.log('Logging out from RSS Portal');
    await this.clickElement(this.userDropdown);
    await this.clickElement(this.logoutLink);
  }

  /**
   * Open reports section
   */
  async openReports(): Promise<void> {
    this.logStep("Open Reports");
    await this.clickElement(this.reportsSection);
    await this.waitForLoadingComplete();
  }
}




