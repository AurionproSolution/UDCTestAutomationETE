/**
 * RSS Portal — left drawer / side navigation (`app-sidemenu`).
 */

import { expect, Locator, Page } from "@playwright/test";
import { RSS_BASE_URL } from "../../../config/env";
import { BasePage } from "../../common/BasePage";

export type RssDrawerMenuItem =
  | "Home"
  | "My Info"
  | "My Requests"
  | "Create Request"
  | "Reports"
  | "Contact Us";

export class RSSSideMenuPage extends BasePage {
  readonly sideMenuNav: Locator;
  readonly topbarHamburger: Locator;
  readonly sideMenuHamburger: Locator;

  constructor(page: Page) {
    super(page);
    this.sideMenuNav = page.locator("app-sidemenu nav.sidebar");
    this.topbarHamburger = page.locator("span.sidebar-control i.fa-bars").first();
    this.sideMenuHamburger = this.sideMenuNav
      .locator("li.nav-item")
      .first()
      .locator("i.fa-bars");
  }

  protected stepLogPrefix(): string {
    return "RSS Portal — Side Menu";
  }

  private async waitForRssShellReady(timeout = 30_000): Promise<void> {
    await this.page
      .locator("app-sidemenu nav.sidebar")
      .waitFor({ state: "visible", timeout })
      .catch(() => undefined);
    const spinner = this.page.locator(
      ".app-loader-overlay, .p-progressspinner, .p-blockui, .loading, .spinner",
    );
    await spinner.first().waitFor({ state: "hidden", timeout }).catch(() => undefined);
  }

  menuItemLabel(label: RssDrawerMenuItem): Locator {
    return this.sideMenuNav
      .locator("li.nav-item .icon-label")
      .filter({ hasText: new RegExp(`^\\s*${this.escapeRx(label)}\\s*$`, "i") });
  }

  private escapeRx(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private menuItemRow(label: RssDrawerMenuItem): Locator {
    return this.sideMenuNav.locator("li.nav-item").filter({
      has: this.page.locator(".icon-label", {
        hasText: new RegExp(`^\\s*${this.escapeRx(label)}\\s*$`, "i"),
      }),
    });
  }

  private async recoverShellIfNeeded(): Promise<void> {
    const is404 = await this.page
      .getByText(/404 - File or directory not found/i)
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    const isLogin = await this.page
      .getByRole("button", { name: /Login with FIS/i })
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (!is404 && !isLogin) return;

    const dashboardUrl = `${RSS_BASE_URL().replace(/\/$/, "")}/rss/dashboard`;
    await this.page.goto(dashboardUrl, { waitUntil: "load" });
  }

  async waitForSideMenu(timeout = 90_000): Promise<void> {
    await this.recoverShellIfNeeded();
    await expect(this.sideMenuNav).toBeVisible({ timeout });
  }

  /** Topbar or in-drawer hamburger — expands labels when the drawer is collapsed. */
  async openDrawerIfNeeded(): Promise<void> {
    this.logStep("Open Drawer If Needed");
    await this.waitForRssShellReady(90_000);
    await this.waitForSideMenu(90_000);
    const homeLabel = this.menuItemLabel("Home");
    if (await homeLabel.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return;
    }

    const toggleCandidates: Locator[] = [
      this.page.locator("span.sidebar-control").first(),
      this.sideMenuNav.locator("li.nav-item").first(),
      this.topbarHamburger,
      this.sideMenuHamburger,
    ];

    for (const toggle of toggleCandidates) {
      if (!(await toggle.isVisible({ timeout: 2_000 }).catch(() => false))) continue;
      await toggle.click();
      if (await homeLabel.isVisible({ timeout: 5_000 }).catch(() => false)) {
        return;
      }
    }

    // Icon font can be CSS-hidden while the parent nav row is the real click target.
    const inDrawerBars = this.sideMenuNav.locator("i.fa-bars").first();
    if ((await inDrawerBars.count()) > 0) {
      await inDrawerBars.click({ force: true });
      if (await homeLabel.isVisible({ timeout: 5_000 }).catch(() => false)) {
        return;
      }
    }

    await expect(homeLabel).toBeVisible({ timeout: 15_000 });
  }

  async expectDrawerMenuItemsVisible(): Promise<void> {
    this.logStep("Expect Drawer Menu Items Visible");
    const items: RssDrawerMenuItem[] = [
      "Home",
      "My Info",
      "My Requests",
      "Create Request",
      "Contact Us",
    ];
    for (const item of items) {
      await expect(this.menuItemLabel(item)).toBeVisible({ timeout: 10_000 });
    }
  }

  async clickDrawerMenuItem(label: RssDrawerMenuItem): Promise<void> {
    this.logStep(`Click Drawer Menu Item — ${label}`);
    await this.openDrawerIfNeeded();
    const row = this.menuItemRow(label);
    await row.scrollIntoViewIfNeeded();
    await this.clickElement(row);
    await this.waitForRssShellReady();
  }

  async expectOverviewScreen(): Promise<void> {
    this.logStep("Expect Overview Screen");
    await expect(this.page).toHaveURL(/\/rss\/dashboard/i, { timeout: 30_000 });
    await expect(this.page.getByText(/Welcome Back/i).first()).toBeVisible({
      timeout: 20_000,
    });
    const overviewTab = this.page.locator(
      'app-rss ion-segment-button[value="overview"].segment-button-checked',
    );
    await expect(overviewTab).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByText(/Active Loans/i).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectMyProfileScreen(): Promise<void> {
    this.logStep("Expect My Profile Screen");
    await expect(this.page).toHaveURL(/\/rss\/profile/i, { timeout: 30_000 });
    // Profile sections are PrimeNG/accordion headings — not plain text nodes.
    await expect(this.page.getByRole("heading", { name: /^Name$/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.page.getByRole("heading", { name: /^Contact/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.page.getByRole("heading", { name: /^Address/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      this.page.getByText(/First Name/i).or(this.page.getByText(/Business Name/i)).first(),
    ).toBeVisible({ timeout: 10_000 });
  }

  async expectMyRequestsScreen(): Promise<void> {
    this.logStep("Expect My Requests Screen");
    await expect(this.page).toHaveURL(/\/rss\/my-requests(?!\/dropdown)/i, {
      timeout: 30_000,
    });
    await expect(
      this.page.getByPlaceholder(/Search By Request No\. or Loan No\./i),
    ).toBeVisible({ timeout: 15_000 });
    const requestsTable = this.page.getByRole("table").first();
    await expect(requestsTable).toBeVisible({ timeout: 15_000 });
    await expect(
      this.page.getByRole("columnheader", { name: /Request No\./i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      this.page.getByRole("columnheader", { name: /Request Type/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(this.page.getByRole("columnheader", { name: /Loan No\./i })).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectServiceRequestScreen(): Promise<void> {
    this.logStep("Expect Service Request Screen");
    await expect(this.page).toHaveURL(/\/rss\/my-requests\/dropdown/i, {
      timeout: 30_000,
    });
    const serviceRequestPanel = this.page
      .locator("div, section, article")
      .filter({ hasText: /Select Service Request/i })
      .first();
    await expect(serviceRequestPanel).toBeVisible({ timeout: 15_000 });
    await expect(serviceRequestPanel.getByText("Category", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(serviceRequestPanel.getByRole("combobox").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.page.getByRole("button", { name: /^Cancel$/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectContactUdcPopup(): Promise<void> {
    this.logStep("Expect Contact UDC Popup");
    const dialog = this.page.getByRole("dialog").filter({ hasText: /Contact UDC/i });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(/How can we help\?/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(dialog.getByText(/Message Category/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(dialog.getByText(/0800 500 832/i).first()).toBeVisible({
      timeout: 10_000,
    });
  }
}
