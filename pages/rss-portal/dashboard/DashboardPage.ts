/**
 * RSS Portal - Dashboard Page
 * Page Object Model for RSS Portal main dashboard
 */

import { Page, Locator } from '@playwright/test';
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
  /** Bottom tab bar (mobile): Apply Now */
  readonly applyNowTabBottom: Locator;

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
    this.applyNowTabBottom = page
      .locator('.bottom-tab-container ion-tab-button')
      .filter({ hasText: 'Apply Now' });
  }

  /**
   * Verify dashboard is loaded
   */
  async isDashboardLoaded(): Promise<boolean> {
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
    try {
      await this.applyNowSegmentTop.waitFor({ state: 'visible', timeout: 15_000 });
      await this.clickElement(this.applyNowSegmentTop);
    } catch {
      await this.applyNowTabBottom.waitFor({ state: 'visible', timeout: 15_000 });
      await this.clickElement(this.applyNowTabBottom);
    }
    await this.waitForLoadingComplete();
  }

  /** True when Apply Now is the selected segment/tab (desktop or mobile layout). */
  async isApplyNowSelected(): Promise<boolean> {
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

    await this.waitForLoadingComplete();
  }

  /**
   * SelectorHub-style exact label: `page.locator(':text-is("Christopher Ngahina Robinson")')` inside the open borrower panel.
   */
  async selectHeaderBorrowerProfileByTextIs(
    exactDisplayName: string,
    clickTimeoutMs = 90_000,
  ): Promise<void> {
    const panel = await this.openHeaderBorrowerDropdownPanel(clickTimeoutMs);
    const textIsSel = `:text-is(${JSON.stringify(exactDisplayName)})`;
    const option = panel.locator(textIsSel).filter({ visible: true }).first();
    await option.waitFor({ state: 'visible', timeout: 25_000 });
    await this.scrollIfNeeded(option);
    await this.clickElement(option, clickTimeoutMs);
    await this.waitForLoadingComplete();
  }

  /**
   * Navigate to menu item
   */
  async navigateToMenuItem(menuText: string): Promise<void> {
    const menuItem = this.navigationMenu.locator(`text=${menuText}`);
    await this.clickElement(menuItem);
    await this.waitForLoadingComplete();
  }

  /**
   * Perform global search
   */
  async globalSearch(searchText: string): Promise<void> {
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
    await this.clickElement(this.reportsSection);
    await this.waitForLoadingComplete();
  }
}




