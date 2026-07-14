/**
 * DO Portal — Customer Statement (`app-customer-statement`) after View Statement from Active Loans grid.
 */

import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export class DOCustomerStatementPage extends BasePage {
  readonly root: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.locator("app-customer-statement").first();
  }

  async waitForReady(): Promise<void> {
    await expect(this.page).toHaveURL(/customer-statement\//i, { timeout: 120_000 });
    await expect(this.root).toBeVisible({ timeout: 60_000 });
    await expect(this.root.locator("app-customer-quote").first()).toBeVisible({
      timeout: 30_000,
    });
  }

  /** Top quote header card (Product, Program, Status, …). */
  headerQuoteCard(): Locator {
    return this.root.locator("app-customer-quote").first();
  }

  /** Left column asset summary (`app-asset-summary`). */
  assetSummaryRoot(): Locator {
    return this.root.locator("app-asset-summary").first();
  }

  /** Borrowers & Guarantors table host. */
  borrowersGuarantorsRoot(): Locator {
    return this.root.locator("app-borrowers-guarantors").first();
  }

  /** Current Position card. */
  currentPositionRoot(): Locator {
    return this.root.locator("app-current-position").first();
  }

  /** Payment Summary / Payment Schedule toggle region. */
  paymentDetailsRoot(): Locator {
    return this.root.locator(".payment-details").first();
  }

  /** Active payment table in the Payment Summary / Payment Schedule region. */
  paymentTable(): Locator {
    return this.paymentDetailsRoot().locator(".p-datatable").first();
  }

  paymentTab(name: "Payment Summary" | "Payment Schedule"): Locator {
    return this.paymentDetailsRoot().getByRole("radio", { name: name }).first();
  }

  async selectPaymentTab(name: "Payment Summary" | "Payment Schedule"): Promise<void> {
    const tab = this.paymentTab(name);
    await expect(tab).toBeVisible({ timeout: 15_000 });
    if ((await tab.getAttribute("aria-checked")) === "true") {
      return;
    }
    await tab.click({ timeout: 15_000 });
    await expect(tab).toHaveAttribute("aria-checked", "true", { timeout: 15_000 });
  }

  private static columnHeaderPattern(name: RegExp): RegExp {
    if (name instanceof RegExp) {
      const source = name.source.replace(/^\^/, "").replace(/\$$/, "");
      const flags = name.flags.includes("i") ? "i" : "";
      return new RegExp(`^\\s*${source}(\\b|\\s)`, flags);
    }
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^\\s*${escaped}(\\b|\\s)`, "i");
  }

  private async expectTableColumnVisible(table: Locator, column: RegExp): Promise<void> {
    const pattern = DOCustomerStatementPage.columnHeaderPattern(column);
    await expect(table.getByRole("columnheader", { name: pattern }).first()).toBeVisible({
      timeout: 20_000,
    });
  }

  async expectCommonHeaderFieldsVisible(): Promise<void> {
    const card = this.headerQuoteCard();
    for (const label of [/^Product$/i, /^Program$/i, /Originator/i, /Sales\s*Person/i, /^Status/i]) {
      await expect(card.locator("label").filter({ hasText: label }).first()).toBeVisible({
        timeout: 30_000,
      });
    }
  }

  async expectAssetSummaryVisible(): Promise<void> {
    const asset = this.assetSummaryRoot();
    await expect(asset).toBeVisible({ timeout: 30_000 });
    await expect(asset.getByText(/^Asset$/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(asset.getByText(/Reg\s*:/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(asset.getByText(/VIN\s*:/i).first()).toBeVisible({ timeout: 15_000 });
  }

  async expectBorrowersGuarantorsVisible(): Promise<void> {
    const section = this.borrowersGuarantorsRoot();
    await expect(section.getByText(/Borrowers?\s*&\s*Guarantors?/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      section.getByRole("columnheader", { name: /Customer Name/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  }

  /** Clickable borrower / guarantor name in a grid row (not the **Customer Name** column header). */
  borrowerCustomerNameLink(rowIndex = 0): Locator {
    return this.borrowersGuarantorsRoot()
      .locator("tbody tr")
      .nth(rowIndex)
      .locator("td")
      .first()
      .locator(".align-items-center.cursor-pointer, div.cursor-pointer")
      .first();
  }

  /** Prefer the first **Individual** borrower row name link when present. */
  individualBorrowerCustomerNameLink(): Locator {
    const section = this.borrowersGuarantorsRoot();
    const individualRow = section.locator("tbody tr").filter({ hasText: /Individual/i }).first();
    return individualRow
      .locator("td")
      .first()
      .locator(".align-items-center.cursor-pointer, div.cursor-pointer")
      .first();
  }

  async clickBorrowerCustomerNameLink(): Promise<void> {
    const section = this.borrowersGuarantorsRoot();
    const individualLink = this.individualBorrowerCustomerNameLink();
    const link = (await individualLink.isVisible({ timeout: 2_000 }).catch(() => false))
      ? individualLink
      : this.borrowerCustomerNameLink(0);
    await expect(link).toBeVisible({ timeout: 15_000 });
    await link.scrollIntoViewIfNeeded();
    await link.click({ timeout: 15_000 });
    await this.page
      .locator(".app-loader-overlay, .p-blockui, .p-progress-spinner, p-progressspinner")
      .first()
      .waitFor({ state: "hidden", timeout: 60_000 })
      .catch(() => {});
  }

  /** View-only Individual Customer Details opened from statement borrower name hyperlink. */
  async expectViewOnlyIndividualCustomerDetailsVisible(): Promise<void> {
    await expect(
      this.page
        .locator(':text-is("1. Personal Details")')
        .or(this.page.getByText(/^Personal Details$/i))
        .first(),
    ).toBeVisible({ timeout: 60_000 });

    const detailsRoot = this.page
      .locator("app-individual, app-personal-details")
      .filter({ visible: true })
      .first();
    await expect(detailsRoot).toBeVisible({ timeout: 30_000 });

    const personalRoot = this.page.locator("app-personal-details").first();
    await expect(personalRoot).toBeVisible({ timeout: 30_000 });
    const editable = personalRoot.locator(
      'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])',
    );
    await expect(editable.filter({ visible: true })).toHaveCount(0, { timeout: 15_000 });

    for (const step of [
      /Address Details/i,
      /Employment Details/i,
      /Financial Position/i,
      /Reference Details/i,
    ]) {
      await expect(this.page.getByText(step).first()).toBeVisible({ timeout: 15_000 });
    }
  }

  async expectPaymentSummaryColumnsVisible(): Promise<void> {
    await this.selectPaymentTab("Payment Summary");
    const table = this.paymentTable();
    await expect(table).toBeVisible({ timeout: 20_000 });
    for (const col of [/^Date$/i, /^Number$/i, /^Frequency$/i, /^Payment$/i]) {
      await this.expectTableColumnVisible(table, col);
    }
  }

  async expectPaymentScheduleColumnsVisible(): Promise<void> {
    await this.selectPaymentTab("Payment Schedule");
    const table = this.paymentTable();
    await expect(table).toBeVisible({ timeout: 20_000 });
    for (const col of [/Payment\s*date/i, /Principal\s*Amount/i, /Interest\s*Payment/i, /Payment\s*Amount/i]) {
      await this.expectTableColumnVisible(table, col);
    }
  }

  async expectCurrentPositionFieldsVisible(): Promise<void> {
    const section = this.currentPositionRoot();
    await expect(section.getByText(/Current Position/i).first()).toBeVisible({
      timeout: 30_000,
    });
    for (const field of [/Gross Balance/i, /Loan Balance/i, /interest rate/i, /Remaining Term/i]) {
      await expect(section.getByText(field).first()).toBeVisible({ timeout: 20_000 });
    }
  }

  /** Footer Previous / Cancel / Edit controls. */
  async expectFooterActionsVisible(): Promise<void> {
    const footer = this.root.locator("app-cutomer-statement-footer, app-customer-statement-footer").first();
    await expect(footer.getByRole("button", { name: /Previous/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(footer.getByRole("button", { name: /^Cancel$/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(footer.getByRole("button", { name: /^Edit$/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  }
}
