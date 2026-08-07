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
    return this.page.getByText(/Amount Due/i);
  }

  /** Clicks the first visible active-loan summary card on Overview. */
  async clickFirstActiveLoanCard(): Promise<void> {
    this.logStep("Click First Active Loan Card");
    const amountDue = this.overviewContractCards().first();
    await amountDue.waitFor({ state: "visible", timeout: 30_000 });
    const card = amountDue.locator(
      "xpath=ancestor::ion-card[1] | ancestor::*[contains(@class,'card')][1]",
    );
    if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.clickElement(card.first());
    } else {
      await this.clickElement(amountDue);
    }
    await this.waitForRssShellIdle();
  }

  async getVisibleOverviewContractCardCount(): Promise<number> {
    return this.overviewContractCards().count();
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
    const visibleCards = await this.getVisibleOverviewContractCardCount();

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




