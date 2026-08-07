/**
 * RSS Portal — Loans tab (contract detail: summary, asset, transactions, documents).
 */

import { Download, expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export type LoanDetailTab = "assets" | "transactions" | "documents" | "settlements";

export class RSSLoansPage extends BasePage {
  readonly loansContentRoot: Locator;
  readonly loanDetailCard: Locator;
  readonly loanDetailSegment: Locator;
  readonly assetDetailsPanel: Locator;
  readonly transactionsPanel: Locator;
  readonly documentsPanel: Locator;

  constructor(page: Page) {
    super(page);
    this.loansContentRoot = page.locator("app-rss").locator(
      "app-contract-details, app-loan-details, app-loans, app-rss-loans",
    ).first();
    this.loanDetailCard = page
      .locator("ion-card")
      .filter({ has: page.locator("ion-segment-button[value='assets']") })
      .first();
    this.loanDetailSegment = this.loanDetailCard.locator("ion-segment[role='tablist']").first();
    this.assetDetailsPanel = this.loanDetailCard.locator("app-asset-details").first();
    this.transactionsPanel = this.loanDetailCard;
    this.documentsPanel = this.loanDetailCard.locator("app-documents").first();
  }

  protected stepLogPrefix(): string {
    return "RSS Portal — Loans";
  }

  async waitForLoansScreen(timeoutMs = 60_000): Promise<void> {
    await this.waitForContractDetailScreen(timeoutMs);
  }

  /** Contract detail after Overview card click or Loans tab (`quotes-contracts` or Loans shell). */
  async waitForContractDetailScreen(timeoutMs = 60_000): Promise<void> {
    this.logStep("Wait For Contract Detail Screen");
    await this.waitForLoadingComplete();
    await expect
      .poll(
        async () => {
          const onContractUrl = /\/rss\/quotes-contracts/i.test(this.page.url());
          const loansTabSelected = await this.page
            .locator('app-rss ion-segment[role="tablist"]')
            .first()
            .getByRole("tab", { name: /Loans/i, selected: true })
            .isVisible()
            .catch(() => false);
          const segmentVisible = await this.loanDetailSegment.isVisible().catch(() => false);
          return onContractUrl || (loansTabSelected && segmentVisible) || segmentVisible;
        },
        { timeout: timeoutMs, intervals: [250, 500, 1_000, 2_000] },
      )
      .toBe(true);
    await expect(this.loanDetailSegment).toBeVisible({ timeout: timeoutMs });
  }

  /** Ion agreement picker on Loans detail (ion-select; label is in aria-label). */
  private agreementPickerButton(): Locator {
    return this.page
      .getByRole("button", { name: /^Agreement,/i })
      .or(this.page.locator('button[aria-label^="Agreement,"]'))
      .first();
  }

  private loansListOverlayPanel(): Locator {
    return this.page
      .locator(
        "ion-alert, ion-modal, [role='dialog'], .p-dropdown-panel, ion-popover, ion-action-sheet, ion-select-popover, [role='listbox']",
      )
      .filter({ visible: true });
  }

  /** PrimeNG loan/agreement picker when present on Loans screen. */
  private async findPrimeNgLoansDropdownRoot(timeoutMs = 60_000): Promise<Locator> {
    const factories: (() => Locator)[] = [
      () => this.page.locator("p-dropdown.loanCss, p-dropdown.contractCss").first(),
      () =>
        this.page
          .locator("p-dropdown")
          .filter({
            has: this.page.locator(".p-dropdown-label").filter({ hasText: /^Agreement$/i }),
          })
          .first(),
      () =>
        this.page
          .locator("p-dropdown")
          .filter({
            has: this.page.locator(".p-dropdown-label").filter({ hasText: /^Loan$/i }),
          })
          .first(),
      () =>
        this.page
          .locator("app-rss")
          .locator("p-dropdown")
          .filter({ has: this.page.locator('[role="combobox"]') })
          .nth(1),
    ];

    const perTry = Math.max(10_000, Math.floor(timeoutMs / factories.length));
    for (const make of factories) {
      const root = make();
      try {
        await root.waitFor({ state: "attached", timeout: perTry });
        const combobox = root.locator('[role="combobox"]').first();
        if (await combobox.isVisible({ timeout: 8_000 }).catch(() => false)) {
          return root;
        }
      } catch {
        // try next factory
      }
    }
    throw new Error("RSS Loans list p-dropdown not found on Loans screen.");
  }

  async openLoansListDropdownPanel(timeoutMs = 60_000): Promise<Locator> {
    this.logStep("Open Loans List Dropdown Panel");
    if (await this.agreementPickerButton().isVisible({ timeout: 8_000 }).catch(() => false)) {
      await this.clickElement(this.agreementPickerButton(), timeoutMs);
      const panel = this.loansListOverlayPanel().last();
      await panel.waitFor({ state: "visible", timeout: 25_000 });
      return panel;
    }

    const root = await this.findPrimeNgLoansDropdownRoot(timeoutMs);
    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root.locator(".p-dropdown-trigger, [aria-label='dropdown trigger']").first();
    await root.scrollIntoViewIfNeeded();
    if (await combobox.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await this.clickElement(combobox, timeoutMs);
    } else {
      await trigger.waitFor({ state: "visible", timeout: 20_000 });
      await this.clickElement(trigger, timeoutMs);
    }
    const panel = this.loansListOverlayPanel().last();
    await panel.waitFor({ state: "visible", timeout: 25_000 });
    return panel;
  }

  async expectLoansDropdownVisible(): Promise<void> {
    this.logStep("Expect Loans Dropdown Visible");
    if (await this.agreementPickerButton().isVisible({ timeout: 15_000 }).catch(() => false)) {
      await expect(this.agreementPickerButton()).toBeVisible({ timeout: 15_000 });
      return;
    }

    const root = await this.findPrimeNgLoansDropdownRoot(60_000);
    await expect(root).toBeVisible({ timeout: 15_000 });
  }

  async expectLoansDropdownShowsPartyLoanSections(): Promise<void> {
    this.logStep("Expect Loans Dropdown Shows Party Loan Sections");
    const picker = this.agreementPickerButton();
    if (await picker.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(picker).toHaveAccessibleName(/Agreement|Credit Sale|Loan/i);

      await this.clickElement(picker);
      const panel = this.loansListOverlayPanel().last();
      if (await panel.isVisible({ timeout: 8_000 }).catch(() => false)) {
        const sectionLabels = [/Active\s*Loans/i, /Repaid\s*Loans/i, /Draft\s*Quotes/i] as const;
        const visibleSections = await Promise.all(
          sectionLabels.map((label) =>
            panel
              .getByText(label)
              .first()
              .isVisible({ timeout: 3_000 })
              .catch(() => false),
          ),
        );
        if (visibleSections.some(Boolean)) {
          for (const label of sectionLabels) {
            await expect(panel.getByText(label).first()).toBeVisible({ timeout: 10_000 });
          }
        } else {
          await expect(
            panel
              .locator("button, li, ion-item, ion-radio, [role='option'], [role='radio']")
              .filter({ hasText: /Agreement|Credit Sale|Loan/i })
              .first(),
          ).toBeVisible({ timeout: 10_000 });
        }
        await this.page.keyboard.press("Escape").catch(() => undefined);
        return;
      }

      await expect(
        this.page.getByText(/Credit Sale Agreement|Agreement -/i).first(),
      ).toBeVisible({ timeout: 10_000 });
      return;
    }

    try {
      const panel = await this.openLoansListDropdownPanel();
      await expect(panel.getByText(/Active\s*Loans/i).first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(panel.getByText(/Repaid\s*Loans/i).first()).toBeVisible({
        timeout: 10_000,
      });
      await expect(panel.getByText(/Draft\s*Quotes/i).first()).toBeVisible({
        timeout: 10_000,
      });
      await this.page.keyboard.press("Escape").catch(() => undefined);
    } catch {
      const content = this.page.locator("app-rss").first();
      await expect(content.getByText(/Active\s*Loans/i).first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(content.getByText(/Repaid\s*Loans/i).first()).toBeVisible({
        timeout: 10_000,
      });
      await expect(content.getByText(/Draft\s*Quotes/i).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  }

  private loanDetailTabLabel(tab: LoanDetailTab): RegExp {
    const labels: Record<LoanDetailTab, RegExp> = {
      assets: /Asset Details/i,
      transactions: /Transactions/i,
      documents: /Documents/i,
      settlements: /Settlements?/i,
    };
    return labels[tab];
  }

  /** Contract status chip on loan summary (e.g. Active, Quote, Repaid). */
  async readLoanContractStatus(): Promise<string> {
    const statusRow = this.page
      .locator("div, ion-col, ion-row, span")
      .filter({ has: this.page.getByText(/^Status$/i) })
      .first();
    if (await statusRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const text = (await statusRow.innerText()).replace(/\s+/g, " ").trim();
      const match = text.match(
        /Status\s+([A-Za-z][A-Za-z\s]*?)(?:\s+Start|\s+End|\s+Next|$)/i,
      );
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    const sibling = this.page
      .locator('xpath=//*[normalize-space(.)="Status"]/following-sibling::*[1]')
      .first();
    if (await sibling.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return (await sibling.innerText()).replace(/\s+/g, " ").trim();
    }
    return "";
  }

  async hasSettlementsTab(timeoutMs = 3_000): Promise<boolean> {
    const button = this.loanDetailSegment
      .locator("ion-segment-button")
      .filter({ hasText: /Settlements?/i })
      .first();
    return button.isVisible({ timeout: timeoutMs }).catch(() => false);
  }

  /** True when the open contract is an active/live loan (not quote/draft/repaid). */
  async isActiveLoanDetail(): Promise<boolean> {
    const status = (await this.readLoanContractStatus()).toLowerCase();
    if (status) {
      if (/quote|draft|repaid|closed|settled|cancelled/i.test(status)) {
        return false;
      }
      if (/active|live|current|open/i.test(status)) {
        return true;
      }
    }
    return this.hasSettlementsTab();
  }

  private isLoanPickerSectionHeader(text: string): boolean {
    const normalized = text.replace(/\s+/g, " ").trim();
    return /^(Active|Repaid|Draft)\s*(Loans?|Quotes?)?$/i.test(normalized);
  }

  private async listActiveLoanPickerLabels(panel: Locator): Promise<string[]> {
    const items = panel.locator(
      "button, li, ion-item, ion-radio, [role='option'], [role='radio']",
    );
    const count = await items.count();
    const labels: string[] = [];
    let inActiveSection = false;

    for (let i = 0; i < count; i++) {
      const text = ((await items.nth(i).innerText().catch(() => "")) || "")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) continue;

      if (/Active\s*Loans/i.test(text) && text.length < 30) {
        inActiveSection = true;
        continue;
      }
      if (/Repaid\s*Loans|Draft\s*Quotes?/i.test(text)) {
        break;
      }
      if (!inActiveSection) continue;
      if (this.isLoanPickerSectionHeader(text)) continue;
      if (!labels.includes(text)) {
        labels.push(text);
      }
    }

    return labels;
  }

  private async selectLoanLabelInOpenPicker(
    panel: Locator,
    label: string,
    timeoutMs: number,
  ): Promise<void> {
    const loose = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const row = panel
      .locator("button, li, ion-item, ion-radio, [role='option'], [role='radio']")
      .filter({ hasText: loose })
      .first();
    await row.waitFor({ state: "visible", timeout: 10_000 });
    await row.click({ timeout: timeoutMs });
    await panel.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => undefined);
    await this.waitForLoadingComplete();
  }

  private async trySelectActiveLoanFromPicker(timeoutMs: number): Promise<boolean> {
    const picker = this.agreementPickerButton();
    if (!(await picker.isVisible({ timeout: 8_000 }).catch(() => false))) {
      return false;
    }

    await this.clickElement(picker, timeoutMs);
    const panel = this.loansListOverlayPanel().last();
    await panel.waitFor({ state: "visible", timeout: 25_000 });

    const labels = await this.listActiveLoanPickerLabels(panel);
    if (labels.length === 0) {
      await this.page.keyboard.press("Escape").catch(() => undefined);
      return false;
    }

    for (const label of labels) {
      if (!(await panel.isVisible().catch(() => false))) {
        await this.clickElement(picker, timeoutMs);
        await panel.waitFor({ state: "visible", timeout: 25_000 });
      }
      await this.selectLoanLabelInOpenPicker(panel, label, timeoutMs);
      if (await this.isActiveLoanDetail()) {
        return true;
      }
    }

    await this.page.keyboard.press("Escape").catch(() => undefined);
    return false;
  }

  private async trySelectActiveLoanFromPrimeNgPicker(timeoutMs: number): Promise<boolean> {
    try {
      const panel = await this.openLoansListDropdownPanel(timeoutMs);
      const labels = await this.listActiveLoanPickerLabels(panel);
      if (labels.length === 0) {
        await this.page.keyboard.press("Escape").catch(() => undefined);
        return false;
      }

      for (const label of labels) {
        if (!(await panel.isVisible().catch(() => false))) {
          await this.openLoansListDropdownPanel(timeoutMs);
        }
        await this.selectLoanLabelInOpenPicker(panel, label, timeoutMs);
        if (await this.isActiveLoanDetail()) {
          return true;
        }
      }
      await this.page.keyboard.press("Escape").catch(() => undefined);
    } catch {
      // picker not available
    }
    return false;
  }

  /** Picks an active loan when the agreement picker lists multiple contracts. */
  async ensureActiveLoanSelected(timeoutMs = 60_000): Promise<void> {
    this.logStep("Ensure Active Loan Selected");
    if (await this.isActiveLoanDetail()) {
      return;
    }

    if (await this.trySelectActiveLoanFromPicker(timeoutMs)) {
      return;
    }
    if (await this.trySelectActiveLoanFromPrimeNgPicker(timeoutMs)) {
      return;
    }
    if (await this.isActiveLoanDetail()) {
      return;
    }

    const status = await this.readLoanContractStatus();
    throw new Error(
      `No active loan available for the test party (current status: ${status || "unknown"}). ` +
        "Variation and settlement tests require at least one active loan.",
    );
  }

  variationRequestButton(): Locator {
    return this.page
      .locator("button.variation-btn")
      .or(
        this.page
          .locator("button, ion-button, gen-button, a")
          .filter({ hasText: /^Variation Request$/i }),
      )
      .or(
        this.page
          .getByText(/^Variation Request$/i)
          .locator("xpath=ancestor::button[1]"),
      )
      .first();
  }

  async openVariationRequestFromLoan(): Promise<void> {
    this.logStep("Open Variation Request From Loan");
    const trigger = this.variationRequestButton();
    await trigger.waitFor({ state: "visible", timeout: 30_000 });
    await trigger.scrollIntoViewIfNeeded();
    await this.clickElement(trigger, 60_000);
    await this.waitForLoadingComplete();
  }

  private settlementsPanel(): Locator {
    return this.loanDetailCard
      .locator("app-settlement, app-settlements, app-loan-settlement")
      .first();
  }

  async expectSettlementsSectionVisible(): Promise<void> {
    this.logStep("Expect Settlements Section Visible");
    const panel = this.settlementsPanel();
    await expect(panel).toBeVisible({ timeout: 30_000 });
    await expect(
      panel.getByText(/Estimated balance to settle this loan today/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  }

  getAmountButton(): Locator {
    return this.settlementsPanel()
      .getByRole("button", { name: /Get Amount/i })
      .or(this.page.getByRole("button", { name: /Get Amount/i }))
      .first();
  }

  async clickGetAmount(): Promise<void> {
    this.logStep("Click Get Amount");
    await this.clickElement(this.getAmountButton(), 60_000);
    await this.waitForLoadingComplete();
  }

  async expectSettlementAmountPopulated(): Promise<void> {
    this.logStep("Expect Settlement Amount Populated");
    const panel = this.settlementsPanel();
    await expect
      .poll(
        async () => {
          const text = (await panel.innerText()).replace(/\s+/g, " ");
          return /\$[\d,]+(?:\.\d{2})?/.test(text) || /\d[\d,]*\.\d{2}/.test(text);
        },
        { timeout: 60_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(true);
  }

  private normalizeCurrency(value: string): string {
    const match = value.replace(/\s+/g, " ").match(/[\d,]+(?:\.\d{2})?/);
    return match ? match[0].replace(/,/g, "") : value.trim();
  }

  async getLoanOverdueAmountText(): Promise<string | null> {
    this.logStep("Get Loan Overdue Amount Text");
    const summary = this.loanSummaryPanel();
    const overdueLabel = summary.getByText(/^Overdue$/i).first();
    if (!(await overdueLabel.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return null;
    }
    const row = overdueLabel.locator("xpath=ancestor::*[self::div or self::tr or self::p][1]");
    return (await row.innerText()).replace(/\s+/g, " ").trim();
  }

  async getSettlementAmountText(): Promise<string> {
    this.logStep("Get Settlement Amount Text");
    const panel = this.settlementsPanel();
    const text = (await panel.innerText()).replace(/\s+/g, " ");
    const match = text.match(/\$[\d,]+(?:\.\d{2})?/) ?? text.match(/\d[\d,]*\.\d{2}/);
    expect(match, "Settlement amount must be populated before reading value.").toBeTruthy();
    return match![0];
  }

  isSettlementAmountAtLeast9999(amountText: string): boolean {
    const numeric = Number(this.normalizeCurrency(amountText));
    return Number.isFinite(numeric) && numeric >= 9999.99;
  }

  requestFormalSettlementQuoteButton(): Locator {
    return this.settlementsPanel()
      .locator("gen-button, p-button, button")
      .filter({ hasText: /Request Formal Settlement Quote/i })
      .or(
        this.page
          .locator("gen-button, p-button, button")
          .filter({ hasText: /Request Formal Settlement Quote/i }),
      )
      .or(
        this.page
          .getByText(/Request Formal Settlement Quote/i)
          .locator("xpath=ancestor::button[1] | ancestor::gen-button[1] | ancestor::p-button[1]"),
      )
      .first();
  }

  async clickRequestFormalSettlementQuote(): Promise<void> {
    this.logStep("Click Request Formal Settlement Quote");
    await this.clickElement(this.requestFormalSettlementQuoteButton(), 60_000);
    await this.waitForLoadingComplete();
  }

  async selectLoanDetailTab(tab: LoanDetailTab): Promise<void> {
    this.logStep(`Select Loan Detail Tab — ${tab}`);
    const valueCandidates =
      tab === "settlements" ? ["settlements", "settlement"] : [tab];
    let clicked = false;
    for (const value of valueCandidates) {
      const button = this.loanDetailSegment.locator(`ion-segment-button[value="${value}"]`);
      if (await button.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await this.clickElement(button);
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      const byLabel = this.loanDetailSegment
        .locator("ion-segment-button")
        .filter({ hasText: this.loanDetailTabLabel(tab) })
        .first();
      await this.clickElement(byLabel);
    }
    await expect(
      this.loanDetailSegment.getByRole("tab", {
        name: this.loanDetailTabLabel(tab),
        selected: true,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await this.waitForLoadingComplete();
  }

  async expectAssetDetailsTabSelected(): Promise<void> {
    this.logStep("Expect Asset Details Tab Selected");
    await expect(
      this.loanDetailSegment.locator(
        'ion-segment-button[value="assets"].segment-button-checked',
      ),
    ).toBeVisible({ timeout: 15_000 });
    await expect(this.assetDetailsPanel).toBeVisible({ timeout: 15_000 });
  }

  private loanSummaryPanel(): Locator {
    return this.page
      .locator("ion-card, div")
      .filter({ has: this.page.getByText(/^Purpose$/i) })
      .filter({ has: this.page.getByText(/^Summary$/i) })
      .first();
  }

  async expectLoanSummaryPanelVisible(): Promise<void> {
    this.logStep("Expect Loan Summary Panel Visible");
    const summary = this.loanSummaryPanel();
    await expect(summary.getByText(/^Purpose$/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(summary.getByText(/^Borrower$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(summary.getByText(/^Summary$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(summary.getByText(/Amount Financed/i).first()).toBeVisible({
      timeout: 10_000,
    });
    // Label is split across sibling nodes: "Outstanding" + "Balance".
    await expect(summary.getByText(/^Outstanding$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(summary.getByText(/^Balance$/i).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectAssetDetailsFieldsVisible(): Promise<void> {
    this.logStep("Expect Asset Details Fields Visible");
    await this.expectAssetDetailsTabSelected();
    const panel = this.assetDetailsPanel.first();
    await expect(panel.getByText(/Rego\s*No\.?/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(panel.getByText(/VIN\/Serial\s*No\.?/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(panel.getByText(/^Insurer$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      panel.locator("button.valuation-btn, button").filter({ hasText: /Get Valuation/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  }

  getValuationButton(): Locator {
    return this.assetDetailsPanel
      .locator("button.valuation-btn, button")
      .filter({ hasText: /Get Valuation/i })
      .first();
  }

  async clickGetValuation(): Promise<void> {
    this.logStep("Click Get Valuation");
    await this.clickElement(this.getValuationButton());
    await this.waitForLoadingComplete();
  }

  async expectValuationBandsVisible(): Promise<void> {
    this.logStep("Expect Valuation Bands Visible");
    await expect(this.page.getByText(/^Low$/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText(/^Medium$/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(this.page.getByText(/^High$/i).first()).toBeVisible({ timeout: 10_000 });
  }

  private transactionsSectionButton(label: RegExp): Locator {
    return this.transactionsPanel
      .getByRole("button", { name: label })
      .or(
        this.transactionsPanel
          .locator(".p-accordion-header-link, .p-accordion-header-text")
          .filter({ hasText: label }),
      )
      .first();
  }

  private transactionsSectionRegion(label: RegExp): Locator {
    return this.transactionsPanel
      .getByRole("region", { name: label })
      .or(this.transactionsPanel.locator(".p-accordion-tab").filter({ hasText: label }))
      .first();
  }

  async expectTransactionsSectionsVisible(): Promise<void> {
    this.logStep("Expect Transactions Sections Visible");
    await expect(this.transactionsSectionButton(/^Transactions$/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.transactionsSectionRegion(/^Transactions$/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.transactionsSectionButton(/Payment Schedule/i)).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectTransactionsTableColumnsVisible(): Promise<void> {
    this.logStep("Expect Transactions Table Columns Visible");
    const region = this.transactionsSectionRegion(/^Transactions$/i);
    const table = region.locator("#transactionList-table, #transactionList table, table").first();
    await expect(table).toBeVisible({ timeout: 15_000 });
    await expect(table.getByRole("columnheader", { name: /^Date\b/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(table.getByRole("columnheader", { name: /^Description\b/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(table.getByRole("columnheader", { name: /^Debit\b/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(table.getByRole("columnheader", { name: /^Credit\b/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      region
        .getByRole("button", { name: /Download/i })
        .or(region.locator(".download-btn button, button").filter({ hasText: /^Download$/i }))
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  }

  private paymentScheduleRegion(): Locator {
    return this.transactionsPanel.getByRole("region", { name: /Payment Schedule/i }).first();
  }

  private paymentScheduleHeaderButton(): Locator {
    return this.transactionsPanel
      .getByRole("heading", { name: /^Payment Schedule$/i })
      .getByRole("button", { name: /^Payment Schedule$/i });
  }

  async expandPaymentScheduleAccordion(): Promise<void> {
    this.logStep("Expand Payment Schedule Accordion");
    const header = this.paymentScheduleHeaderButton();
    const expanded = await header
      .getAttribute("aria-expanded")
      .then((value) => value === "true")
      .catch(() => false);
    if (!expanded) {
      await this.clickElement(header);
    }
    const region = this.paymentScheduleRegion();
    await expect(region).toBeVisible({ timeout: 20_000 });
    await expect(region.getByRole("button", { name: /^Payment Summary$/i })).toBeVisible({
      timeout: 20_000,
    });
  }

  private async ensurePaymentSummaryViewSelected(): Promise<void> {
    const region = this.paymentScheduleRegion();
    const summaryVisible = await region
      .getByRole("columnheader", { name: /^Number\b/i })
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (summaryVisible) return;

    await this.clickElement(region.getByRole("button", { name: /^Payment Summary$/i }));
    await this.waitForLoadingComplete();
  }

  private async ensurePaymentScheduleViewSelected(): Promise<void> {
    const region = this.paymentScheduleRegion();
    const scheduleVisible = await region
      .getByRole("columnheader", { name: /^Principal\b/i })
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (scheduleVisible) return;

    await this.clickElement(region.getByRole("button", { name: /^Payment Schedule$/i }));
    await this.waitForLoadingComplete();
  }

  async expectPaymentSummaryTableVisible(): Promise<void> {
    this.logStep("Expect Payment Summary Table Visible");
    const region = this.paymentScheduleRegion();
    await this.ensurePaymentSummaryViewSelected();
    await expect(region.getByRole("columnheader", { name: /^Date\b/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(region.getByRole("columnheader", { name: /^Number\b/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(region.getByRole("columnheader", { name: /^Frequency\b/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(region.getByRole("columnheader", { name: /^Payment\b/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  async clickPaymentScheduleToggle(): Promise<void> {
    this.logStep("Click Payment Schedule Toggle");
    await this.ensurePaymentScheduleViewSelected();
  }

  async expectPaymentScheduleTableVisible(): Promise<void> {
    this.logStep("Expect Payment Schedule Table Visible");
    const region = this.paymentScheduleRegion();
    await this.ensurePaymentScheduleViewSelected();
    await expect(region.getByRole("columnheader", { name: /^Principal\b/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(region.getByRole("columnheader", { name: /^Interest\b/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(region.getByRole("columnheader", { name: /Total Payment/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  private documentsTabContent(): Locator {
    return this.loanDetailCard;
  }

  async expectDocumentsTabActionsVisible(): Promise<void> {
    this.logStep("Expect Documents Tab Actions Visible");
    const content = this.documentsTabContent();
    await expect(content).toBeVisible({ timeout: 15_000 });
    await expect(content.getByRole("button", { name: /Generate Statement/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(content.getByRole("button", { name: /Download/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  async hasDocumentRows(): Promise<boolean> {
    const content = this.documentsTabContent();
    const noRecord = await content
      .getByText(/No Record Found/i)
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (noRecord) return false;

    return await content
      .locator("table, .p-datatable, [role='grid']")
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
  }

  async expectDocumentsListOrEmptyState(): Promise<void> {
    this.logStep("Expect Documents List Or Empty State");
    const content = this.documentsTabContent();
    await expect(content).toBeVisible({ timeout: 15_000 });

    if (await this.hasDocumentRows()) {
      const table = content.locator("table, .p-datatable").first();
      await expect(table).toBeVisible({ timeout: 15_000 });
      await expect(table.getByRole("columnheader").first()).toBeVisible({ timeout: 10_000 });
      return;
    }

    await expect(content.getByText(/No Record Found/i).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectDocumentPreviewOpensNewTab(): Promise<void> {
    this.logStep("Expect Document Preview Opens New Tab");
    const preview = this.documentsTabContent()
      .locator("button, a, i, img")
      .filter({ has: this.page.locator("[class*='preview'], [aria-label*='preview' i]") })
      .first();
    const fallbackPreview = this.documentsTabContent().locator("button.pi-eye, a.pi-eye, .preview-btn").first();
    const target = (await preview.isVisible({ timeout: 5_000 }).catch(() => false))
      ? preview
      : fallbackPreview;
    await expect(target).toBeVisible({ timeout: 15_000 });

    const popupPromise = this.page.context().waitForEvent("page", { timeout: 30_000 });
    await target.click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup).not.toHaveURL(/about:blank/i);
    await popup.close();
  }

  downloadButtonInSection(sectionLabel: RegExp): Locator {
    return this.page
      .locator(".transaction-tab, app-principal-intrestschedule, app-documents")
      .filter({ hasText: sectionLabel })
      .locator(".download-btn button, button")
      .filter({ hasText: /^Download$/i })
      .first();
  }

  private downloadButtonIn(region: Locator): Locator {
    return region
      .locator("gen-button.download-btn button, .download-btn button, button")
      .filter({ hasText: /^Download$/i })
      .or(region.getByRole("button", { name: /Download/i }))
      .first();
  }

  private async expandTransactionsAccordion(): Promise<void> {
    const header = this.transactionsSectionButton(/^Transactions$/i);
    const expanded = await header
      .getAttribute("aria-expanded")
      .then((value) => value === "true")
      .catch(() => false);
    if (!expanded) {
      await this.clickElement(header);
      await this.waitForLoadingComplete();
    }
  }

  private async clickDownloadInRegion(region: Locator, stepLabel: string): Promise<Download> {
    this.logStep(stepLabel);
    const button = this.downloadButtonIn(region);
    const downloadPromise = this.page.waitForEvent("download", { timeout: 120_000 });
    await this.clickElement(button, 60_000);
    return await downloadPromise;
  }

  async clickDownloadInTransactionsSection(): Promise<Download> {
    await this.expandTransactionsAccordion();
    return this.clickDownloadInRegion(
      this.transactionsSectionRegion(/^Transactions$/i),
      "Click Download In Transactions Section",
    );
  }

  async clickDownloadInPaymentSummarySection(): Promise<Download> {
    await this.expandPaymentScheduleAccordion();
    await this.ensurePaymentSummaryViewSelected();
    return this.clickDownloadInRegion(
      this.paymentScheduleRegion(),
      "Click Download In Payment Summary Section",
    );
  }

  async clickDownloadInPaymentScheduleSection(): Promise<Download> {
    await this.expandPaymentScheduleAccordion();
    await this.ensurePaymentScheduleViewSelected();
    return this.clickDownloadInRegion(
      this.paymentScheduleRegion(),
      "Click Download In Payment Schedule Section",
    );
  }

  private generateStatementPanel(): Locator {
    return this.documentsTabContent().filter({
      has: this.page.getByRole("button", { name: /Add to Document List/i }),
    });
  }

  async clickGenerateStatement(): Promise<void> {
    this.logStep("Click Generate Statement");
    const button = this.documentsTabContent()
      .getByRole("button", { name: /Generate Statement/i })
      .first();
    await this.clickElement(button);
    await this.waitForLoadingComplete();
  }

  async expectGenerateStatementDateRangeVisible(): Promise<void> {
    this.logStep("Expect Generate Statement Date Range Visible");
    const panel = this.generateStatementPanel();
    await expect(
      panel.getByRole("button", { name: /Add to Document List/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    const dateFields = panel.getByRole("combobox");
    await expect(dateFields.nth(0)).toBeVisible({ timeout: 10_000 });
    await expect(dateFields.nth(1)).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByRole("button", { name: /Choose Date/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  private columnHeaderInTable(table: Locator, name: RegExp): Locator {
    return table.getByRole("columnheader", { name });
  }

  private columnSortButton(columnHeader: Locator): Locator {
    return columnHeader.locator(".p-sortable-column-icon, sortalticon, p-sorticon").first();
  }

  private columnFilterButton(columnHeader: Locator): Locator {
    return columnHeader.locator("button.p-column-filter-menu-button").first();
  }

  private columnFilterOverlay(): Locator {
    return this.page.locator(".p-column-filter-overlay").filter({ visible: true }).last();
  }

  private columnFilterMatchDropdown(): Locator {
    return this.columnFilterOverlay()
      .locator(".p-column-filter-constraint [role='combobox']")
      .first();
  }

  private columnFilterMatchOption(label: RegExp): Locator {
    return this.page
      .locator(".p-dropdown-panel")
      .filter({ visible: true })
      .last()
      .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
      .filter({ hasText: label })
      .first();
  }

  private columnFilterValueInput(): Locator {
    return this.columnFilterOverlay().locator("input.p-column-filter").first();
  }

  async sortTableColumn(table: Locator, column: RegExp): Promise<void> {
    this.logStep(`Sort Table Column — ${String(column)}`);
    const header = this.columnHeaderInTable(table, column);
    await this.columnSortButton(header).click({ timeout: 15_000 });
    await this.waitForLoadingComplete();
  }

  async openTableColumnFilter(table: Locator, column: RegExp): Promise<void> {
    this.logStep(`Open Table Column Filter — ${String(column)}`);
    const header = this.columnHeaderInTable(table, column);
    await this.columnFilterButton(header).click({ timeout: 15_000 });
    await expect(this.columnFilterOverlay()).toBeVisible({ timeout: 15_000 });
  }

  async expectTableColumnFilterMatchOptions(labels: RegExp[]): Promise<void> {
    this.logStep("Expect Table Column Filter Match Options");
    const matchDropdown = this.columnFilterMatchDropdown();
    await expect(matchDropdown).toBeVisible({ timeout: 10_000 });
    await matchDropdown.click();
    for (const label of labels) {
      await expect(this.columnFilterMatchOption(label)).toBeVisible({ timeout: 10_000 });
    }
    await this.page.keyboard.press("Escape").catch(() => undefined);
  }

  private async selectTableColumnFilterMatchType(matchType: RegExp): Promise<void> {
    const matchDropdown = this.columnFilterMatchDropdown();
    await expect(matchDropdown).toBeVisible({ timeout: 10_000 });
    await matchDropdown.click();
    const option = this.columnFilterMatchOption(matchType);
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();
    await this.page
      .locator(".p-dropdown-panel")
      .filter({ visible: true })
      .last()
      .waitFor({ state: "hidden", timeout: 5_000 })
      .catch(() => undefined);
  }

  async filterTableColumn(
    table: Locator,
    column: RegExp,
    matchType: RegExp,
    value: string,
  ): Promise<void> {
    this.logStep(`Filter Table Column — ${String(column)} ${String(matchType)} ${value}`);
    await this.openTableColumnFilter(table, column);
    await this.selectTableColumnFilterMatchType(matchType);
    const valueInput = this.columnFilterValueInput();
    await expect(valueInput).toBeVisible({ timeout: 10_000 });
    await valueInput.fill(value);
    await this.columnFilterOverlay()
      .getByRole("button", { name: /^Apply$/i })
      .click({ timeout: 15_000 });
    await this.waitForLoadingComplete();
  }

  async clearTableColumnFilter(table: Locator, column: RegExp): Promise<void> {
    this.logStep(`Clear Table Column Filter — ${String(column)}`);
    if (!(await this.columnFilterOverlay().isVisible({ timeout: 1_000 }).catch(() => false))) {
      await this.openTableColumnFilter(table, column);
    }
    await this.columnFilterOverlay()
      .getByRole("button", { name: /^Clear$/i })
      .click({ timeout: 15_000 });
    await this.waitForLoadingComplete();
    await this.page.keyboard.press("Escape").catch(() => undefined);
  }

  private parseTableDateValue(value: string): number {
    const match = value.replace(/\s+/g, " ").trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) return 0;
    const [, day, month, year] = match;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
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

  async readVisibleTableColumnTexts(table: Locator, columnIndex: number): Promise<string[]> {
    const rows = table.locator("tbody tr:has(td):visible");
    const count = await rows.count();
    const values: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await rows.nth(i).locator("td").nth(columnIndex).innerText())
        .replace(/\s+/g, " ")
        .trim();
      if (text) values.push(text);
    }
    return values;
  }

  async expectTableDateColumnSorted(
    table: Locator,
    columnIndex: number,
    direction: "asc" | "desc",
  ): Promise<void> {
    this.logStep(`Expect Table Date Column Sorted — ${direction}`);
    const values = await this.readVisibleTableColumnTexts(table, columnIndex);
    const timestamps = values.map((value) => this.parseTableDateValue(value)).filter((v) => v > 0);
    expect(timestamps.length).toBeGreaterThan(1);
    if (direction === "asc") {
      expect(this.isAscending(timestamps)).toBe(true);
    } else {
      expect(this.isDescending(timestamps)).toBe(true);
    }
  }

  transactionsTable(): Locator {
    return this.transactionsSectionRegion(/^Transactions$/i)
      .locator("#transactionList-table, #transactionList table, table")
      .first();
  }

  paymentSummaryTable(): Locator {
    return this.paymentScheduleRegion().locator("table").first();
  }

  paymentScheduleTable(): Locator {
    return this.paymentScheduleRegion().locator("table").last();
  }

  documentsTable(): Locator {
    return this.documentsTabContent().locator("table").first();
  }

  async expectGenerateStatementDefaultDateRange(): Promise<void> {
    this.logStep("Expect Generate Statement Default Date Range");
    const panel = this.generateStatementPanel();
    const dateFields = panel.getByRole("combobox");
    const fromValue = await dateFields.nth(0).inputValue().catch(async () =>
      (await dateFields.nth(0).innerText()).replace(/\s+/g, " ").trim(),
    );
    const toValue = await dateFields.nth(1).inputValue().catch(async () =>
      (await dateFields.nth(1).innerText()).replace(/\s+/g, " ").trim(),
    );
    expect(fromValue).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(toValue).toMatch(/\d{2}\/\d{2}\/\d{4}/);

    const summaryText = (await this.loanSummaryPanel().innerText()).replace(/\s+/g, " ");
    const startMatch = summaryText.match(/Start\s*Date\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (startMatch?.[1]) {
      expect(fromValue).toContain(startMatch[1]);
    } else {
      expect(fromValue.length).toBeGreaterThan(0);
    }

    const today = new Date();
    const todayLabel = today.toLocaleDateString("en-NZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    expect(toValue).toContain(todayLabel);
  }
}
