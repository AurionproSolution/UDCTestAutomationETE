/**
 * RSS Portal — My Requests list, search, sort/filter, and request preview.
 */

import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export type MyRequestRow = {
  requestLabel: string;
  requestNo: string;
  requestCategory: string;
  requestType: string;
  loanNo: string;
  assetType: string;
  date: string;
  status: string;
};

export class RSSMyRequestsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  protected stepLogPrefix(): string {
    return "RSS Portal — My Requests";
  }

  private requestsRoot(): Locator {
    return this.page.locator("app-request-details");
  }

  requestsTable(): Locator {
    return this.requestsRoot()
      .locator("gen-table#request-details table, #request-details table")
      .first();
  }

  /** Data rows currently shown in the requests grid (excludes filtered/hidden PrimeNG rows). */
  requestDataRows(): Locator {
    return this.requestsTable().locator("tbody tr:has(td):visible");
  }

  searchInput(): Locator {
    return this.requestsRoot()
      .locator('input[name="applicationSearchValue"]')
      .or(this.page.getByPlaceholder(/Search By Request No\. or Loan No\./i))
      .first();
  }

  searchSubmitButton(): Locator {
    return this.searchInput().locator("xpath=..").getByRole("button").first();
  }

  private escapeRx(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private rowMatchesSearchQuery(row: MyRequestRow, query: string): boolean {
    const normalizedQuery = this.normalizeCellText(query);
    if (!normalizedQuery) {
      return true;
    }
    const pattern = new RegExp(this.escapeRx(normalizedQuery), "i");
    return (
      pattern.test(row.requestNo) ||
      pattern.test(row.loanNo) ||
      pattern.test(row.requestLabel) ||
      pattern.test(row.requestType)
    );
  }

  requestPreviewRoot(): Locator {
    return this.page.locator("app-view-request-details");
  }

  columnHeader(name: RegExp): Locator {
    return this.requestsTable().getByRole("columnheader", { name });
  }

  columnSortButton(columnHeader: Locator): Locator {
    return columnHeader.locator(".p-sortable-column-icon, sortalticon, p-sorticon").first();
  }

  columnFilterButton(columnHeader: Locator): Locator {
    return columnHeader.locator("button.p-column-filter-menu-button").first();
  }

  columnFilterOverlay(): Locator {
    return this.page.locator(".p-column-filter-overlay").filter({ visible: true }).last();
  }

  columnFilterMatchDropdown(): Locator {
    return this.columnFilterOverlay()
      .locator(".p-column-filter-constraint [role='combobox']")
      .first();
  }

  columnFilterMatchDropdownPanel(): Locator {
    return this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
  }

  columnFilterValueInput(): Locator {
    return this.columnFilterOverlay()
      .locator(
        ".p-column-filter-constraint input.p-inputtext, .p-column-filter-constraint input[type='text'], input.p-column-filter",
      )
      .last();
  }

  columnFilterMatchOption(label: RegExp): Locator {
    return this.columnFilterMatchDropdownPanel()
      .getByRole("option", { name: label })
      .first()
      .or(
        this.columnFilterMatchDropdownPanel()
          .locator("li.p-dropdown-item, [role='option']")
          .filter({ hasText: label })
          .first(),
      );
  }

  private normalizeCellText(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  private parseRequestLabel(cellText: string): {
    requestNo: string;
    requestCategory: string;
  } {
    const normalized = this.normalizeCellText(cellText);
    const match = normalized.match(/^(\d+)\s*\|\s*(.+)$/);
    if (!match) {
      return { requestNo: normalized, requestCategory: "" };
    }
    return { requestNo: match[1], requestCategory: match[2] };
  }

  private parseDateValue(dateText: string): number {
    const match = this.normalizeCellText(dateText).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) return 0;
    const [, dd, mm, yyyy] = match;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime();
  }

  private isAscending(values: number[]): boolean {
    for (let i = 1; i < values.length; i++) {
      if (values[i] < values[i - 1]) return false;
    }
    return true;
  }

  private isDescending(values: number[]): boolean {
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) return false;
    }
    return true;
  }

  async expectMyRequestsScreen(): Promise<void> {
    this.logStep("Expect My Requests Screen");
    await expect(this.page).toHaveURL(/\/rss\/my-requests(?!\/dropdown)/i, {
      timeout: 30_000,
    });
    await expect(this.searchInput()).toBeVisible({ timeout: 15_000 });
    await expect(this.requestsTable()).toBeVisible({ timeout: 15_000 });
    await expect(this.columnHeader(/Request No\./i)).toBeVisible({ timeout: 10_000 });
    await expect(this.columnHeader(/Request Type/i)).toBeVisible({ timeout: 10_000 });
    await expect(this.columnHeader(/Loan No\./i)).toBeVisible({ timeout: 10_000 });
    await expect(this.columnHeader(/Asset Type/i)).toBeVisible({ timeout: 10_000 });
    await expect(this.columnHeader(/Date/i)).toBeVisible({ timeout: 10_000 });
    await expect(this.columnHeader(/Request Status/i)).toBeVisible({ timeout: 10_000 });
    await expect(this.columnHeader(/Action/i)).toBeVisible({ timeout: 10_000 });
  }

  async waitForRequestDataRows(minCount = 1, timeoutMs = 60_000): Promise<void> {
    this.logStep(`Wait For Request Data Rows — ${minCount}`);
    await expect
      .poll(async () => this.requestDataRows().count(), {
        timeout: timeoutMs,
        intervals: [250, 500, 1_000, 2_000],
      })
      .toBeGreaterThanOrEqual(minCount);
  }

  async expectMinimumRequestRows(minCount: number): Promise<void> {
    this.logStep(`Expect Minimum Request Rows — ${minCount}`);
    await this.waitForRequestDataRows(minCount);
    const rows = await this.getVisibleRequestRows();
    expect(rows.length).toBeGreaterThanOrEqual(minCount);
  }

  private async readVisibleRequestRows(): Promise<MyRequestRow[]> {
    const table = this.requestsTable();
    if (!(await table.isVisible().catch(() => false))) {
      return [];
    }

    const rowLocators = this.requestDataRows();
    const count = await rowLocators.count();
    const rows: MyRequestRow[] = [];

    for (let i = 0; i < count; i++) {
      const cells = rowLocators.nth(i).locator("td");
      const requestLabel = this.normalizeCellText(await cells.nth(0).innerText());
      const parsed = this.parseRequestLabel(requestLabel);
      rows.push({
        requestLabel,
        requestNo: parsed.requestNo,
        requestCategory: parsed.requestCategory,
        requestType: this.normalizeCellText(await cells.nth(1).innerText()),
        loanNo: this.normalizeCellText(await cells.nth(2).innerText()),
        assetType: this.normalizeCellText(await cells.nth(3).innerText()),
        date: this.normalizeCellText(await cells.nth(4).innerText()),
        status: this.normalizeCellText(await cells.nth(5).innerText()),
      });
    }

    return rows;
  }

  async getVisibleRequestRows(): Promise<MyRequestRow[]> {
    this.logStep("Get Visible Request Rows");
    await expect(this.requestsTable()).toBeVisible({ timeout: 15_000 });
    await this.waitForRequestDataRows(1);
    return this.readVisibleRequestRows();
  }

  requestRowByNumber(requestNo: string): Locator {
    return this.requestDataRows()
      .filter({ hasText: new RegExp(`\\b${requestNo}\\b`) })
      .first();
  }

  requestRowByLoanNo(loanNo: string): Locator {
    return this.requestDataRows()
      .filter({
        has: this.page.locator("td:nth-child(3)", {
          hasText: new RegExp(`^\\s*${loanNo}\\s*$`),
        }),
      })
      .first();
  }

  private async submitSearch(): Promise<void> {
    const button = this.searchSubmitButton();
    if (await button.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await this.clickElement(button);
    } else {
      await this.searchInput().press("Enter");
    }
    await this.waitForLoadingComplete();
  }

  async waitForSearchResults(query: string, timeoutMs = 30_000): Promise<void> {
    this.logStep(`Wait For Search Results — ${query}`);
    const normalizedQuery = this.normalizeCellText(query);
    await expect
      .poll(
        async () => {
          const rows = await this.readVisibleRequestRows();
          if (rows.length === 0) {
            return false;
          }
          return rows.every((row) => this.rowMatchesSearchQuery(row, normalizedQuery));
        },
        { timeout: timeoutMs, intervals: [250, 500, 1_000, 2_000] },
      )
      .toBe(true);
  }

  async searchRequests(query: string): Promise<void> {
    this.logStep(`Search Requests — ${query}`);
    const searchField = this.searchInput();
    await searchField.click();
    await searchField.fill(query);
    await this.submitSearch();
    await this.waitForSearchResults(query);
  }

  async clearSearch(): Promise<void> {
    this.logStep("Clear Search");
    await this.searchInput().fill("");
    await this.submitSearch();
    await this.waitForLoadingComplete();
  }

  async expectSearchResultsContainRequestNo(requestNo: string): Promise<void> {
    this.logStep(`Expect Search Results Contain Request No — ${requestNo}`);
    const rows = await this.getVisibleRequestRows();
    expect(rows.length).toBeGreaterThan(0);
    const pattern = new RegExp(this.escapeRx(requestNo), "i");
    expect(rows.some((row) => pattern.test(row.requestNo))).toBe(true);
    for (const row of rows) {
      expect(this.rowMatchesSearchQuery(row, requestNo)).toBe(true);
    }
  }

  async expectSearchResultsContainLoanNo(loanNo: string): Promise<void> {
    this.logStep(`Expect Search Results Contain Loan No — ${loanNo}`);
    const rows = await this.getVisibleRequestRows();
    expect(rows.length).toBeGreaterThan(0);
    const pattern = new RegExp(this.escapeRx(loanNo), "i");
    expect(rows.some((row) => pattern.test(row.loanNo))).toBe(true);
    for (const row of rows) {
      expect(pattern.test(row.loanNo)).toBe(true);
    }
  }

  async sortByColumn(column: RegExp): Promise<void> {
    this.logStep(`Sort By Column — ${String(column)}`);
    const header = this.columnHeader(column);
    await this.columnSortButton(header).click({ timeout: 15_000 });
    await this.waitForLoadingComplete();
  }

  async expectDateColumnSorted(direction: "asc" | "desc"): Promise<void> {
    this.logStep(`Expect Date Column Sorted — ${direction}`);
    const rows = await this.getVisibleRequestRows();
    expect(rows.length).toBeGreaterThan(1);
    const timestamps = rows.map((row) => this.parseDateValue(row.date)).filter((value) => value > 0);
    expect(timestamps.length).toBeGreaterThan(1);
    if (direction === "asc") {
      expect(this.isAscending(timestamps)).toBe(true);
    } else {
      expect(this.isDescending(timestamps)).toBe(true);
    }
  }

  async openColumnFilter(column: RegExp): Promise<void> {
    this.logStep(`Open Column Filter — ${String(column)}`);
    const header = this.columnHeader(column);
    await this.columnFilterButton(header).click({ timeout: 15_000 });
    await expect(this.columnFilterOverlay()).toBeVisible({ timeout: 15_000 });
  }

  async expectColumnFilterMatchOptions(labels: RegExp[]): Promise<void> {
    this.logStep("Expect Column Filter Match Options");
    const matchDropdown = this.columnFilterMatchDropdown();
    await expect(matchDropdown).toBeVisible({ timeout: 10_000 });
    await matchDropdown.click();
    await expect(this.columnFilterMatchDropdownPanel()).toBeVisible({ timeout: 10_000 });
    for (const label of labels) {
      await expect(this.columnFilterMatchOption(label)).toBeVisible({ timeout: 10_000 });
    }
    await this.page.keyboard.press("Escape").catch(() => undefined);
  }

  private async selectColumnFilterMatchType(matchType: RegExp): Promise<void> {
    const matchDropdown = this.columnFilterMatchDropdown();
    await expect(matchDropdown).toBeVisible({ timeout: 10_000 });
    await matchDropdown.click();
    const option = this.columnFilterMatchOption(matchType);
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();
    await this.columnFilterMatchDropdownPanel()
      .waitFor({ state: "hidden", timeout: 5_000 })
      .catch(() => undefined);
  }

  async filterColumn(column: RegExp, matchType: RegExp, value: string): Promise<void> {
    this.logStep(`Filter Column — ${String(column)} ${String(matchType)} ${value}`);
    await this.openColumnFilter(column);
    await this.selectColumnFilterMatchType(matchType);
    const valueInput = this.columnFilterValueInput();
    await expect(valueInput).toBeVisible({ timeout: 10_000 });
    await valueInput.fill(value);
    await this.columnFilterOverlay()
      .getByRole("button", { name: /^Apply$/i })
      .click({ timeout: 15_000 });
    await this.waitForLoadingComplete();
  }

  async clearColumnFilter(column: RegExp): Promise<void> {
    this.logStep(`Clear Column Filter — ${String(column)}`);
    if (!(await this.columnFilterOverlay().isVisible({ timeout: 1_000 }).catch(() => false))) {
      await this.openColumnFilter(column);
    }
    await this.columnFilterOverlay()
      .getByRole("button", { name: /^Clear$/i })
      .click({ timeout: 15_000 });
    await this.waitForLoadingComplete();
    await this.page.keyboard.press("Escape").catch(() => undefined);
  }

  async closeColumnFilterOverlay(): Promise<void> {
    this.logStep("Close Column Filter Overlay");
    await this.page.keyboard.press("Escape");
    await expect(this.columnFilterOverlay()).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
  }

  async expectVisibleRequestTypesMatch(pattern: RegExp): Promise<void> {
    this.logStep(`Expect Visible Request Types Match — ${String(pattern)}`);
    const rows = await this.getVisibleRequestRows();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.requestType).toMatch(pattern);
    }
  }

  async expectVisibleRequestNumbersMatch(pattern: RegExp): Promise<void> {
    this.logStep(`Expect Visible Request Numbers Match — ${String(pattern)}`);
    const rows = await this.getVisibleRequestRows();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.requestNo).toMatch(pattern);
    }
  }

  previewEyeIcon(row?: Locator): Locator {
    const targetRow = row ?? this.requestDataRows().first();
    return targetRow
      .locator("td")
      .last()
      .locator("i.pi-eye, .pi-eye, .cursor-pointer")
      .first();
  }

  async openRequestPreview(row?: Locator): Promise<void> {
    this.logStep("Open Request Preview");
    const eye = this.previewEyeIcon(row);
    await expect(eye).toBeVisible({ timeout: 15_000 });
    await this.clickElement(eye);
    await this.waitForLoadingComplete();
  }

  async expectRequestPreviewVisible(): Promise<void> {
    this.logStep("Expect Request Preview Visible");
    await expect(this.page).toHaveURL(/\/rss\/my-requests\/view/i, {
      timeout: 30_000,
    });
    const details = this.requestPreviewRoot();
    await expect(details).toBeVisible({ timeout: 15_000 });
    await expect(details.getByText(/Request No\./i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(details.getByText(/Status/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(details.getByRole("button", { name: /^Close$/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectRequestPreviewShowsRow(row: MyRequestRow): Promise<void> {
    this.logStep(`Expect Request Preview Shows Row — ${row.requestNo}`);
    const details = this.requestPreviewRoot();
    await expect(details).toContainText(row.requestType, { timeout: 10_000 });
    await expect(details).toContainText(row.requestNo, { timeout: 10_000 });
    await expect(details).toContainText(row.status, { timeout: 10_000 });
    if (row.date) {
      await expect(details).toContainText(row.date, { timeout: 10_000 });
    }
  }

  async closeRequestPreview(): Promise<void> {
    this.logStep("Close Request Preview");
    await this.clickElement(
      this.requestPreviewRoot().getByRole("button", { name: /^Close$/i }),
    );
    await this.expectMyRequestsScreen();
  }
}
