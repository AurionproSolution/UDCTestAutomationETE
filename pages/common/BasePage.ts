/**
 * BasePage - Parent class for all Page Objects across all portals
 * Contains common methods shared across DO, RSS, and CSS portals
 */

import { Locator, Page, expect } from "@playwright/test";
import { CommonUtils } from "../../utils/commonUtils";

export class BasePage {
  readonly page: Page;
  readonly utils: CommonUtils;

  // Common locators across all portals
  readonly itemsPerPageDropdown: Locator;
  readonly itemsPerPageOptions: Locator;
  readonly tableRows: Locator;
  readonly loadingSpinner: Locator;
  readonly toastMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.utils = new CommonUtils(page);

    // Common locators - override in child classes if needed
    this.itemsPerPageDropdown = page.locator(
      '#maxPerPage, [data-testid="items-per-page"]',
    );
    this.itemsPerPageOptions = page.locator("#maxPerPage option");
    this.tableRows = page.locator(
      "table tbody tr, div.table-container table tbody tr",
    );
    this.loadingSpinner = page.locator(
      '.loading, .spinner, [data-testid="loading"]',
    );
    this.toastMessage = page.locator('.toast, [role="alert"], .notification');
  }

  // ============ Navigation Methods ============

  /**
   * Navigate to a URL
   */
  async navigateTo(url: string): Promise<void> {
    console.log(`📍 Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
  }

  /**
   * Scrolls the element into view if needed
   */
  async scrollIfNeeded(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get current page URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Get page title
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  // ============ Interaction Methods (with highlighting) ============

  /**
   * Click element with visual highlight
   */
  async clickElement(locator: Locator): Promise<void> {
    await this.utils.click(locator);
  }

  /**
   * Fill input with visual highlight
   */
  async fillElement(locator: Locator, text: string): Promise<void> {
    await this.utils.fill(locator, text);
  }

  /**
   * Click and fill element with visual highlight
   */
  async clickAndFillElement(locator: Locator, text: string): Promise<void> {
    await this.utils.click(locator);
    await this.utils.fill(locator, text);
  }

  /**
   * Type text character by character with visual highlight
   */
  async type(locator: Locator, text: string): Promise<void> {
    await this.utils.type(locator, text);
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(locator: Locator, timeout?: number): Promise<void> {
    await this.utils.waitForVisible(locator, timeout);
  }

  /**
   * Get text content of element
   */
  async getText(locator: Locator): Promise<string> {
    return await this.utils.getText(locator);
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return await this.utils.isVisible(locator);
  }

  // ============ Table/Pagination Methods ============

  /**
   * Select items per page from dropdown
   */
  async selectItemsPerPage(count: number): Promise<void> {
    await this.itemsPerPageDropdown.selectOption(count.toString());
    await this.utils.waitForVisible(this.tableRows.first(), 90000);
  }

  /**
   * Validate items per page options
   */
  async validateItemsPerPageOptions(
    expected: string[] = ["10", "25", "50"],
  ): Promise<void> {
    await this.itemsPerPageDropdown.click();
    const actual = (await this.itemsPerPageOptions.allTextContents()).map((t) =>
      t.trim(),
    );
    expect(actual).toEqual(expected);
  }

  // ============ Wait Methods ============

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingComplete(timeout: number = 30000): Promise<void> {
    try {
      await this.loadingSpinner.waitFor({ state: "hidden", timeout });
    } catch {
      // Spinner may not exist, continue
    }
  }

  /**
   * Wait for toast/notification message
   */
  async waitForToast(timeout: number = 10000): Promise<string> {
    await this.toastMessage.waitFor({ state: "visible", timeout });
    return await this.getText(this.toastMessage);
  }

  // ============ Screenshot & Debug ============

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.utils.takeScreenshot(name);
  }

  /**
   * Log action for debugging
   */
  log(message: string): void {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}
