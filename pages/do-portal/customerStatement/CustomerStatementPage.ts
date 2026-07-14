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

  /** FL statement uses **Lease Summary** / **Lease Schedule** instead of Payment tabs. */
  leaseTab(name: "Lease Summary" | "Lease Schedule"): Locator {
    return this.paymentDetailsRoot().getByRole("radio", { name }).first();
  }

  /** OL statement uses **Rental Summary** / **Rental Schedule** (or Payment Summary / Schedule). */
  rentalTab(name: "Rental Summary" | "Rental Schedule"): Locator {
    const pattern =
      name === "Rental Summary" ? /Rental\s*Summary|Payment\s*Summary/i : /Rental\s*Schedule|Payment\s*Schedule/i;
    return this.paymentDetailsRoot().getByRole("radio", { name: pattern }).first();
  }

  /** Active payment-details table for the selected summary / schedule tab. */
  paymentDetailsActiveTable(): Locator {
    return this.paymentDetailsRoot().locator(".p-datatable").first();
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

  async selectLeaseTab(name: "Lease Summary" | "Lease Schedule"): Promise<void> {
    await this.selectPaymentDetailsTab(this.leaseTab(name), name === "Lease Summary" ? /Lease\s*Summary/i : /Lease\s*Schedule/i);
  }

  async selectRentalTab(name: "Rental Summary" | "Rental Schedule"): Promise<void> {
    const cardTitle =
      name === "Rental Summary" ? /Rental\s*Summary|Payment\s*Summary/i : /Rental\s*Schedule|Payment\s*Schedule/i;
    await this.selectPaymentDetailsTab(this.rentalTab(name), cardTitle);
  }

  private async selectPaymentDetailsTab(tab: Locator, cardTitle: RegExp): Promise<void> {
    await expect(tab).toBeVisible({ timeout: 15_000 });
    if ((await tab.getAttribute("aria-checked")) === "true") {
      await this.waitForPaymentDetailsTabContent(cardTitle);
      return;
    }
    await tab.click({ timeout: 15_000 });
    await expect(tab).toHaveAttribute("aria-checked", "true", { timeout: 15_000 });
    await this.waitForPaymentDetailsTabContent(cardTitle);
  }

  private async waitForPaymentDetailsTabContent(cardTitle: RegExp): Promise<void> {
    await this.page
      .locator(".app-loader-overlay, .p-blockui, .p-progress-spinner, p-progressspinner")
      .first()
      .waitFor({ state: "hidden", timeout: 60_000 })
      .catch(() => {});
    await expect(this.paymentDetailsRoot().getByText(cardTitle).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.paymentDetailsActiveTable()).toBeVisible({ timeout: 30_000 });
  }

  private async waitForLeaseTabContent(name: "Lease Summary" | "Lease Schedule"): Promise<void> {
    const cardTitle = name === "Lease Summary" ? /Lease\s*Summary/i : /Lease\s*Schedule/i;
    await this.waitForPaymentDetailsTabContent(cardTitle);
  }

  /** `app-payment-schedule` host (FL lease summary / schedule tables). */
  leasePaymentScheduleRoot(): Locator {
    return this.root.locator("app-payment-schedule").first();
  }

  /** Visible FL table for the selected lease tab (summary or schedule). */
  leaseActiveTable(): Locator {
    return this.paymentDetailsActiveTable();
  }

  /** **Residual Value** / **Assumed Residual Value** table under Lease Summary. */
  residualValueTable(): Locator {
    return this.paymentDetailsRoot().locator(".p-datatable").nth(1);
  }

  residualValueSectionLabel(): Locator {
    return this.paymentDetailsRoot()
      .getByText(/Assumed\s*Residual\s*Value|Residual\s*Value/i)
      .first();
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

  private tableColumnHeader(table: Locator, column: RegExp): Locator {
    const pattern = DOCustomerStatementPage.columnHeaderPattern(column);
    return table
      .getByRole("columnheader", { name: pattern })
      .or(table.locator("thead th").filter({ hasText: column }))
      .first();
  }

  private async expectTableColumnVisible(table: Locator, column: RegExp): Promise<void> {
    await expect(this.tableColumnHeader(table, column)).toBeVisible({
      timeout: 20_000,
    });
  }

  private async expectTableColumnAnyVisible(table: Locator, columns: RegExp[]): Promise<void> {
    for (const column of columns) {
      if (await this.tableColumnHeader(table, column).isVisible({ timeout: 3_000 }).catch(() => false)) {
        return;
      }
    }
    throw new Error(`Expected one of [${columns.map(String).join(", ")}] column headers to be visible.`);
  }

  /** FL **Lease Schedule** exposes a **GST** column (not present on CSA/TL schedules). */
  async leaseScheduleHasGstColumn(): Promise<boolean> {
    await this.selectLeaseTab("Lease Schedule");
    return this.tableColumnHeader(this.leaseActiveTable(), /^GST$/i)
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
  }

  async clickPreviousToDashboard(): Promise<void> {
    await this.root.getByRole("button", { name: /Previous/i }).click({ timeout: 15_000 });
    await expect(this.page.locator("app-dashboard, app-quote-list").first()).toBeVisible({
      timeout: 60_000,
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

  /** UDP-T4382 — FL **Lease Summary**: Date, Number, Frequency, Payment, GST, Total Payment + Residual Value. */
  async expectFlLeaseSummaryColumnsVisible(): Promise<void> {
    await this.selectLeaseTab("Lease Summary");
    const table = this.leaseActiveTable();
    await expect(table).toBeVisible({ timeout: 20_000 });
    for (const col of [/^Date$/i, /^Number$/i, /^Frequency$/i, /^Payment$/i, /^GST$/i, /Total\s*Payment/i]) {
      await this.expectTableColumnVisible(table, col);
    }
    const residualLabel = this.residualValueSectionLabel();
    await residualLabel.scrollIntoViewIfNeeded();
    await expect(residualLabel).toBeVisible({ timeout: 15_000 });
    const residual = this.residualValueTable();
    await expect(residual).toBeVisible({ timeout: 15_000 });
    for (const col of [/End\s*Date/i, /GST\s*Excl/i, /^GST$/i, /GST\s*Incl/i]) {
      await this.expectTableColumnVisible(residual, col);
    }
  }

  /** UDP-T4381 — FL **Lease Schedule** (portal labels from FIS AF). */
  async expectFlLeaseScheduleColumnsVisible(): Promise<void> {
    await this.selectLeaseTab("Lease Schedule");
    const table = this.leaseActiveTable();
    await expect(table).toBeVisible({ timeout: 20_000 });
    for (const col of [
      /Payment\s*date/i,
      /Principal\s*Amount/i,
      /Interest\s*Payment/i,
      /Payment\s*Amount|Total\s*Payment/i,
      /^GST$/i,
      /Principal\s*Balance/i,
    ]) {
      await this.expectTableColumnVisible(table, col);
    }
  }

  /** UDP-T4384 — OL **Rental Summary** / Payment Summary: Date, Number, Frequency, Payment, GST, Total Payment. */
  async expectOlRentalSummaryColumnsVisible(): Promise<void> {
    await this.selectRentalTab("Rental Summary");
    const table = this.paymentDetailsActiveTable();
    await expect(table).toBeVisible({ timeout: 20_000 });
    for (const col of [/^Date$/i, /^Number$/i, /^Frequency$/i, /^Payment$/i, /^GST$/i, /Total\s*Payment/i]) {
      await this.expectTableColumnVisible(table, col);
    }
  }

  /** UDP-T4383 — OL **Rental Schedule**: Payment Date, Total Payment, Payment, GST. */
  async expectOlRentalScheduleColumnsVisible(): Promise<void> {
    await this.selectRentalTab("Rental Schedule");
    const table = this.paymentDetailsActiveTable();
    await expect(table).toBeVisible({ timeout: 20_000 });
    for (const col of [
      /Payment\s*date/i,
      /Total\s*Payment/i,
      /^Payment$/i,
      /^GST$/i,
    ]) {
      await this.expectTableColumnVisible(table, col);
    }
  }

  /** **Buyback Details** section host (OL — visible only when buyback party matches dealer party). */
  buybackDetailsRoot(): Locator {
    return this.root
      .locator("app-buyback-details, .buyback-details")
      .filter({ has: this.root.getByText(/Buyback\s*Details/i) })
      .first()
      .or(
        this.root.locator("gen-card, .card-body").filter({
          has: this.root.getByText(/Buyback\s*Details/i),
        }),
      )
      .first();
  }

  buybackDetailsTable(): Locator {
    return this.buybackDetailsRoot().locator(".p-datatable").first();
  }

  async hasBuybackDetailsSection(): Promise<boolean> {
    return this.buybackDetailsRoot()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
  }

  /** UDP-T4385 — Buyback Details when buyback party matches dealer party. */
  async expectBuybackDetailsVisible(): Promise<void> {
    const section = this.buybackDetailsRoot();
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible({ timeout: 15_000 });
    await expect(section.getByText(/Buyback\s*Details/i).first()).toBeVisible({ timeout: 15_000 });
    const table = this.buybackDetailsTable();
    if (await table.isVisible({ timeout: 3_000 }).catch(() => false)) {
      for (const col of [/Residual\s*Value\s*\(?\s*Excl/i, /^GST$/i, /Residual\s*Value\s*\(?\s*Incl/i, /End\s*Date/i]) {
        await this.expectTableColumnVisible(table, col);
      }
      return;
    }
    for (const field of [/Residual\s*Value\s*\(?\s*Excl/i, /^GST$/i, /Residual\s*Value\s*\(?\s*Incl/i, /End\s*Date/i]) {
      await expect(section.getByText(field).first()).toBeVisible({ timeout: 15_000 });
    }
  }

  /** UDP-T4385 — Buyback Details hidden when buyback party differs from dealer party. */
  async expectBuybackDetailsHidden(): Promise<void> {
    await expect(this.buybackDetailsRoot()).toHaveCount(0, { timeout: 10_000 });
  }

  /** Left-column **Loan Details** / AFV summary host (`app-payment-summary-details`). */
  loanDetailsRoot(): Locator {
    return this.root.locator("app-payment-summary-details").first();
  }

  /** Agreement hyperlink in Loan Details (contract link). */
  loanDetailsAgreementLink(): Locator {
    return this.loanDetailsRoot()
      .locator('a[href="javascript:void(0)"], a')
      .filter({ hasText: /Agreement|Lease Agreement/i })
      .first();
  }

  private async expectLoanDetailsFieldVisible(label: RegExp): Promise<void> {
    const section = this.loanDetailsRoot();
    await expect(section.getByText(label).first()).toBeVisible({ timeout: 15_000 });
  }

  /** UDP-T4386 — AFV Loan Details, Assured Future Value, Customer Decision. */
  async expectAfvLoanDetailsFieldsVisible(): Promise<void> {
    const section = this.loanDetailsRoot();
    await expect(section).toBeVisible({ timeout: 30_000 });
    await expect(section.getByText(/^Loan Details$/i).first()).toBeVisible({ timeout: 15_000 });

    const agreement = this.loanDetailsAgreementLink();
    await agreement.scrollIntoViewIfNeeded();
    await expect(agreement).toBeVisible({ timeout: 15_000 });

    for (const label of [
      /^Product$/i,
      /^Term$/i,
      /Interest\s*Rate/i,
      /Start\s*Date|Loan\s*Date/i,
      /Maturity\s*Date/i,
      /Amount\s*Financed|Loan\s*Amount/i,
      /Interest\s*Charge/i,
    ]) {
      await this.expectLoanDetailsFieldVisible(label);
    }

    const kmAllowance = section.getByText(/KM\s*Allowance\s*Per\s*Annum|Max(?:imum)?\s*Permitted\s*KM/i).first();
    if (await kmAllowance.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(kmAllowance).toBeVisible();
    }

    await expect(section.getByText(/Assured\s*Future\s*Value|Future\s*Value\s*Amount/i).first()).toBeVisible({
      timeout: 15_000,
    });
    for (const label of [/Future\s*Value\s*Amount/i, /Future\s*Value\s*Date/i]) {
      await this.expectLoanDetailsFieldVisible(label);
    }

    await expect(section.getByText(/^Customer Decision$/i).first()).toBeVisible({ timeout: 15_000 });
  }

  /** UDP-T4386 — AFV **Payment Schedule** columns (portal labels from FIS AF). */
  async expectAfvPaymentScheduleColumnsVisible(): Promise<void> {
    await this.selectPaymentTab("Payment Schedule");
    const table = this.paymentDetailsActiveTable();
    await expect(table).toBeVisible({ timeout: 20_000 });
    await this.expectTableColumnAnyVisible(table, [/^Date$/i, /Payment\s*date/i]);
    await this.expectTableColumnAnyVisible(table, [/^Principal$/i, /Principal\s*Amount/i]);
    await this.expectTableColumnAnyVisible(table, [/^Interest$/i, /Interest\s*Payment/i]);
    await this.expectTableColumnAnyVisible(table, [/Total\s*Payment/i, /Payment\s*Amount/i]);
    await this.expectTableColumnVisible(table, /Principal\s*Balance/i);
    await this.expectTableColumnVisible(table, /Remaining\s*Interest/i);
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
