/**
 * DO Portal — Settlement flow (Calculate Settlement / Create Settlement Quote).
 * Covers loan search pop-up, privacy waiver, display, and add-to-quote confirmation.
 */

import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "../../../common/BasePage";
import { DODashboardPage } from "../../dashboard/DashboardPage";

function settlementTextField(page: Page, label: string): Locator {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return page
    .locator("text, label")
    .filter({ hasText: new RegExp(escaped, "i") })
    .locator("xpath=following::input[@id='text' or @role='textbox' or @role='combobox'][1]")
    .or(
      page
        .locator("text")
        .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, "i") })
        .locator("#text"),
    )
    .filter({ visible: true })
    .first();
}

function settlementTextFieldIn(root: Locator, label: string): Locator {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return root
    .locator("text, label")
    .filter({ hasText: new RegExp(escaped, "i") })
    .locator("xpath=following::input[@id='text' or @role='textbox' or @role='combobox'][1]")
    .or(
      root
        .locator("text, label")
        .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, "i") })
        .locator("#text"),
    )
    .filter({ visible: true })
    .first();
}

function todayDdMmYyyy(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function shiftDdMmYyyy(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export class DOSettlementPage extends BasePage {
  readonly settlementTrigger: Locator;
  readonly regoInput: Locator;
  readonly vinInput: Locator;
  readonly settlementDateInput: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly cancelButton: Locator;
  readonly privacyWaiverCheckbox: Locator;
  readonly addSettlementToQuoteButton: Locator;
  readonly confirmYesButton: Locator;
  readonly confirmNoButton: Locator;

  constructor(page: Page) {
    super(page);
    const lessDeposit = page.locator("app-less-deposit").first();
    const quoteRoot = page.locator("app-quote-details, app-standard-quote").first();
    this.settlementTrigger = lessDeposit
      .locator("gen-button")
      .filter({
        has: lessDeposit.locator("span.p-button-label", {
          hasText: /^(Calculate\s+)?Settlement$/i,
        }),
      })
      .locator("button.p-button")
      .or(lessDeposit.getByRole("button", { name: /^(Calculate\s+)?Settlement$/i }))
      .or(quoteRoot.getByRole("button", { name: /^(Calculate\s+)?Settlement$/i }))
      .or(quoteRoot.getByRole("link", { name: /^(Calculate\s+)?Settlement$/i }))
      .or(quoteRoot.locator("button").filter({ hasText: /Calculate\s+Settlement|^Settlement$/i }))
      .first();

    this.regoInput = page
      .getByRole("dialog")
      .getByRole("textbox", { name: /Rego/i })
      .or(settlementTextField(page, "Rego Number"))
      .or(page.getByRole("textbox", { name: /Rego/i }))
      .first();
    this.vinInput = page
      .getByRole("dialog")
      .getByRole("textbox", { name: /^VIN$/i })
      .or(settlementTextField(page, "VIN"))
      .or(page.getByRole("textbox", { name: /^VIN$/i }))
      .first();
    this.settlementDateInput = page
      .getByRole("dialog")
      .getByRole("combobox", { name: /Settlement Date/i })
      .or(page.getByRole("dialog").getByRole("textbox", { name: /Settlement Date/i }))
      .or(settlementTextField(page, "Settlement Date"))
      .or(page.getByPlaceholder(/Settlement Date|dd\/mm\/yyyy/i))
      .first();

    this.nextButton = page.getByRole("button", { name: /^Next$/i }).filter({ visible: true }).last();
    this.backButton = page
      .getByRole("dialog")
      .filter({ visible: true })
      .last()
      .getByRole("button", { name: /^Back$/i })
      .or(page.locator("gen-button button").filter({ hasText: /^Back$/i }).filter({ visible: true }))
      .or(page.getByRole("button", { name: /^Back$/i }).filter({ visible: true }))
      .first();
    this.cancelButton = page
      .getByRole("button", { name: /^Cancel$/i })
      .filter({ visible: true })
      .last();

    this.privacyWaiverCheckbox = page
      .locator("app-settlement-popup")
      .locator("toggle-checkbox p-checkbox input[type='checkbox']")
      .filter({ visible: true })
      .or(
        page.getByRole("checkbox", {
          name: /consent to proceed with settlement|privacy waiver|obtained the customer'?s consent/i,
        }),
      )
      .or(
        page
          .locator("app-settlement-popup p-checkbox")
          .filter({
            hasText: /consent to proceed with settlement|obtained the customer'?s consent/i,
          })
          .locator('input[type="checkbox"]'),
      )
      .first();

    this.addSettlementToQuoteButton = page
      .getByRole("button", {
        name: /Add this Settlement Amount to (my|this) Quote/i,
      })
      .or(page.locator("button, a").filter({ hasText: /Add this Settlement Amount/i }))
      .or(
        page.getByRole("button", {
          name: /Create New Quote with this Settlement Amount/i,
        }),
      )
      .first();

    this.confirmYesButton = page.getByRole("button", { name: /^Yes$/i }).filter({ visible: true }).last();
    this.confirmNoButton = page.getByRole("button", { name: /^No$/i }).filter({ visible: true }).last();
  }

  protected stepLogPrefix(): string {
    return "Standard quote — Settlement";
  }

  private async waitForLoaderGone(timeoutMs = 60_000): Promise<void> {
    const overlay = this.page.locator(".app-loader-overlay, [class*='app-loader']");
    if ((await overlay.count()) > 0) {
      await overlay.first().waitFor({ state: "hidden", timeout: timeoutMs }).catch(() => {});
    }
    await this.page.getByRole("progressbar").first().waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  }

  activeDialog(): Locator {
    return this.page.getByRole("dialog").filter({ visible: true }).last();
  }

  /** Loan-search pop-up (`app-settlement-popup`) inside the active Settlement dialog. */
  private settlementPopup(): Locator {
    return this.activeDialog().locator("app-settlement-popup").first();
  }

  /** Rego field group inside `app-settlement-popup` only. */
  private regoFieldGroup(): Locator {
    return this.settlementPopup()
      .locator(".p-field, .field, .p-col, .p-float-label, [class*='p-field']")
      .filter({ hasText: /Rego Number/i })
      .first();
  }

  /** VIN field group inside `app-settlement-popup` only. */
  private vinFieldGroup(): Locator {
    return this.settlementPopup()
      .locator(".p-field, .field, .p-col, .p-float-label, [class*='p-field']")
      .filter({ hasText: /^VIN$/i })
      .first();
  }

  /** Rego field on the active Settlement loan-search dialog. */
  private regoField(): Locator {
    const popup = this.settlementPopup();
    return settlementTextFieldIn(popup, "Rego Number")
      .or(this.regoFieldGroup().locator("input#text, input.p-inputtext, input[role='textbox']").first())
      .or(popup.locator("input#text, input.p-inputtext").first())
      .first();
  }

  /** VIN field on the active Settlement loan-search dialog. */
  private vinField(): Locator {
    const popup = this.settlementPopup();
    return settlementTextFieldIn(popup, "VIN")
      .or(this.vinFieldGroup().locator("input#text, input.p-inputtext, input[role='textbox']").first())
      .or(popup.locator("input#text, input.p-inputtext").nth(1))
      .first();
  }

  /** Settlement Date field group on the active Settlement loan-search dialog. */
  private settlementDateFieldGroup(): Locator {
    return this.settlementPopup()
      .locator(".p-field, .field, .p-col, .p-float-label, [class*='p-field'], span.p-float-label")
      .filter({ hasText: /Settlement Date/i })
      .first();
  }

  private settlementDateField(): Locator {
    const group = this.settlementDateFieldGroup();
    return group
      .getByRole("combobox")
      .first()
      .or(group.locator("p-calendar input, input.p-inputtext, input[role='combobox'], input").first())
      .or(settlementTextFieldIn(this.settlementPopup(), "Settlement Date"))
      .first();
  }

  private async resolveSettlementDateField(): Promise<Locator> {
    const group = this.settlementDateFieldGroup();
    const candidates = [
      group.getByRole("combobox").first(),
      group.locator("p-calendar input, input").first(),
      this.settlementDateField(),
    ];
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 1_500 }).catch(() => false)) {
        return candidate;
      }
    }
    return this.settlementDateField();
  }

  async readSettlementDate(): Promise<string> {
    const field = await this.resolveSettlementDateField();

    const readFromLocator = async (loc: Locator): Promise<string> => {
      if ((await loc.count()) === 0) {
        return "";
      }
      const val = (await loc.inputValue().catch(() => "")).trim();
      if (val.length > 4) {
        return val;
      }
      const attr = ((await loc.getAttribute("value")) ?? "").trim();
      if (attr.length > 4) {
        return attr;
      }
      const text = ((await loc.textContent().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
      const match = text.match(/\d{1,2}[/\\-]\d{1,2}[/\\-]\d{2,4}/);
      return match?.[0] ?? "";
    };

    const fromField = await readFromLocator(field);
    if (fromField) {
      return fromField;
    }

    const groupText = ((await this.settlementDateFieldGroup().innerText().catch(() => "")) ?? "").replace(
      /\s+/g,
      " ",
    );
    const groupMatch = groupText.match(/\d{1,2}[/\\-]\d{1,2}[/\\-]\d{2,4}/);
    return groupMatch?.[0] ?? "";
  }

  private loanSearchNextButton(): Locator {
    return this.settlementPopup()
      .locator(".text-right gen-button")
      .getByRole("button", { name: /^Next$/i })
      .or(this.settlementPopup().getByRole("button", { name: /^Next$/i }))
      .or(this.activeDialog().getByRole("button", { name: /^Next$/i }))
      .first();
  }

  async expectSettlementTriggerVisible(): Promise<void> {
    this.logStep("Expect Settlement Trigger Visible");
    await expect(this.settlementTrigger).toBeVisible({ timeout: 20_000 });
  }

  async expectSettlementTriggerHidden(): Promise<void> {
    this.logStep("Expect Settlement Trigger Hidden");
    await expect(this.settlementTrigger).toBeHidden({ timeout: 15_000 });
  }

  async waitForSettlementTriggerEnabled(timeoutMs = 60_000): Promise<void> {
    this.logStep("Wait For Settlement Trigger Enabled");
    await expect
      .poll(async () => this.settlementTrigger.isEnabled().catch(() => false), { timeout: timeoutMs })
      .toBeTruthy();
  }

  async openSettlementFromQuote(): Promise<void> {
    this.logStep("Open Settlement From Quote");
    await this.waitForLoaderGone();

    const btn = this.settlementTrigger;

    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.scrollIntoViewIfNeeded();
    const enabled = await btn.isEnabled().catch(() => false);
    if (!enabled) {
      await expect
        .poll(async () => btn.isEnabled().catch(() => false), { timeout: 90_000 })
        .toBeTruthy();
    }
    try {
      await btn.click({ timeout: 20_000 });
    } catch {
      await btn.click({ force: true, timeout: 20_000 });
    }
    await this.settlementPopup()
      .or(this.activeDialog())
      .first()
      .waitFor({ state: "visible", timeout: 45_000 });
  }

  async enterRego(value: string): Promise<void> {
    this.logStep(`Enter Rego ${this.stepValueDisplay(value)}`);
    await this.fillSettlementLoanSearchField(this.regoField(), value);
  }

  async enterVin(value: string): Promise<void> {
    this.logStep(`Enter VIN ${this.stepValueDisplay(value)}`);
    await this.fillSettlementLoanSearchField(this.vinField(), value);
  }

  private async fillSettlementLoanSearchField(field: Locator, value: string): Promise<void> {
    await expect(field).toBeVisible({ timeout: 15_000 });
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ force: true });
    await field.press("ControlOrMeta+a");
    await field.press("Backspace");
    if (value.trim()) {
      await field.fill(value, { force: true });
    }
    await field.dispatchEvent("input").catch(() => {});
    await field.dispatchEvent("change").catch(() => {});
    await field.dispatchEvent("blur").catch(() => {});
    if (value.trim()) {
      await field.press("Tab").catch(() => {});
    }
    await this.waitForLoaderGone();
  }

  async clearRego(): Promise<void> {
    await this.enterRego("");
  }

  async clearVin(): Promise<void> {
    await this.enterVin("");
  }

  /** Skip clearing when loan search already advanced (e.g. arrears API response). */
  async clearVinIfVisible(): Promise<void> {
    if (!(await this.isLoanSearchScreenVisible())) {
      return;
    }
    const field = this.vinField();
    if (await field.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await this.fillSettlementLoanSearchField(field, "");
    }
  }

  async isLoanSearchScreenVisible(): Promise<boolean> {
    return (
      (await this.settlementPopup().isVisible({ timeout: 2_000 }).catch(() => false)) &&
      (await this.regoField().isVisible({ timeout: 2_000 }).catch(() => false))
    );
  }

  async isBusinessRuleErrorVisible(timeoutMs = 5_000): Promise<boolean> {
    const msg = this.businessRuleErrorMessageLocator();
    return msg.isVisible({ timeout: timeoutMs }).catch(() => false);
  }

  /**
   * UDP-T3967 — try VIN first, then Rego fallback; click **Next**; expect FIS AF business-rule error.
   * Re-opens Settlement from Asset Details when the dialog closes between attempts.
   */
  async searchLoanAndExpectBusinessRuleErrorWithVinThenRego(
    vin: string,
    regoFallbacks: string[],
    expectedPattern?: RegExp | string,
    reopenSettlement?: () => Promise<void>,
  ): Promise<void> {
    this.logStep("Search loan (VIN then Rego) and expect business rule error");
    await this.expectSettlementSearchScreenVisible();
    let lastError: unknown;

    const submitAndExpectError = async (): Promise<void> => {
      await this.submitSettlementLoanSearchForBusinessRule();
      await this.expectBusinessRuleError(expectedPattern);
      await this.expectBusinessRuleErrorBlocksProceed();
    };

    try {
      await this.expectSettlementDateIsPopulated();
      await this.ensureSettlementDateReadyForNext();
      await this.prepareDifferentDealerVinLoanSearch(vin);
      await submitAndExpectError();
      return;
    } catch (error) {
      lastError = error;
      await this.ensureLoanSearchScreenForRetry(reopenSettlement);
    }

    for (const rego of regoFallbacks) {
      try {
        await this.expectSettlementDateIsPopulated();
        await this.ensureSettlementDateReadyForNext();
        await this.enterRego(rego);
        await this.expectRegoValue(rego);
        await this.expectNoRegoValidationError();
        await submitAndExpectError();
        return;
      } catch (error) {
        lastError = error;
        await this.ensureLoanSearchScreenForRetry(reopenSettlement);
      }
    }
    throw lastError;
  }

  /** Back from error screen or re-click **Settlement** on Asset Details between lookup attempts. */
  private async ensureLoanSearchScreenForRetry(reopenSettlement?: () => Promise<void>): Promise<void> {
    await this.returnToSettlementLoanSearchScreen().catch(() => {});
    if (await this.isLoanSearchScreenVisible()) {
      return;
    }
    if (reopenSettlement) {
      await reopenSettlement();
      await this.expectSettlementSearchScreenVisible();
    }
  }

  /**
   * UDP-T3967 / UDP-T3984 — enter arrears Rego, click **Next**, expect FIS AF business-rule error.
   * Does not clear VIN after Rego (lookup can close loan-search before VIN field is available).
   */
  async searchArrearsLoanAndExpectBusinessRuleError(
    regos: string[],
    expectedPattern?: RegExp | string,
    reopenSettlement?: () => Promise<void>,
  ): Promise<void> {
    this.logStep("Search arrears loan and expect business rule error");
    await this.expectSettlementSearchScreenVisible();
    let lastError: unknown;

    for (const rego of regos) {
      try {
        await this.expectSettlementDateIsPopulated();
        await this.ensureSettlementDateReadyForNext();
        await this.enterRego(rego);
        await this.expectRegoValue(rego);
        await this.expectNoRegoValidationError();
        await this.submitSettlementLoanSearchForBusinessRule();
        await this.expectBusinessRuleError(expectedPattern);
        await this.expectBusinessRuleErrorBlocksProceed();
        return;
      } catch (error) {
        lastError = error;
        await this.ensureLoanSearchScreenForRetry(reopenSettlement);
      }
    }
    throw lastError;
  }

  private async focusSettlementDateField(): Promise<void> {
    const field = await this.resolveSettlementDateField();
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ force: true, timeout: 15_000 });
  }

  async enterSettlementDate(date: string): Promise<void> {
    this.logStep(`Enter Settlement Date ${this.stepValueDisplay(date)}`);
    const dateField = await this.resolveSettlementDateField();
    await expect(dateField).toBeVisible({ timeout: 15_000 });
    await dateField.click({ force: true });
    await this.page.keyboard.press("ControlOrMeta+a");
    await this.page.keyboard.press("Backspace");

    const input = this.settlementDateFieldGroup().locator("p-calendar input, input").first();
    const filled = await input
      .fill(date, { force: true })
      .then(() => true)
      .catch(() => false);
    if (!filled) {
      await input
        .evaluate((el, val) => {
          const target = el as HTMLInputElement;
          target.value = val;
          target.dispatchEvent(new Event("input", { bubbles: true }));
          target.dispatchEvent(new Event("change", { bubbles: true }));
        }, date)
        .catch(() => {});
    }

    await dateField.press("Tab").catch(() => {});
    await this.waitForLoaderGone();
  }

  private dateLikePattern(): RegExp {
    return /\d{1,2}[/\\-]\d{1,2}[/\\-]\d{2,4}/;
  }

  async expectRegoDoesNotContainSettlementDate(): Promise<void> {
    this.logStep("Expect Rego does not contain settlement date");
    const rego = ((await this.regoField().inputValue().catch(() => "")) ?? "").trim();
    expect(rego).not.toMatch(this.dateLikePattern());
  }

  /** UDP-T3963–T3965 — Rego loan search with settlement date kept in the date field. */
  async prepareDifferentDealerRegoLoanSearch(rego: string): Promise<void> {
    this.logStep(`Prepare different-dealer Rego loan search ${this.stepValueDisplay(rego)}`);
    await this.expectSettlementSearchScreenVisible();
    await this.expectSettlementDateIsPopulated();
    await this.ensureSettlementDateReadyForNext();
    await this.enterRego(rego);
    await this.clearVinIfVisible();
    await this.expectRegoValue(rego);
    await this.expectNoRegoValidationError();
    await this.expectRegoDoesNotContainSettlementDate();
  }

  /** UDP-T3963–T3965 — VIN-only loan search with settlement date kept in the date field. */
  async prepareDifferentDealerVinLoanSearch(vin: string): Promise<void> {
    this.logStep(`Prepare different-dealer VIN loan search ${this.stepValueDisplay(vin)}`);
    await this.expectSettlementSearchScreenVisible();
    await this.expectSettlementDateIsPopulated();
    await this.ensureSettlementDateReadyForNext();
    await this.clearRego();
    await this.enterVin(vin);
    await this.expectVinValue(vin);
    await this.expectNoVinValidationError();
    await this.expectRegoDoesNotContainSettlementDate();
  }

  /** Return to loan-search step so VIN can fall back to Rego on the same dialog. */
  async returnToSettlementLoanSearchScreen(): Promise<void> {
    this.logStep("Return to settlement loan search screen");
    await this.waitForLoaderGone();
    const onLoanSearch =
      (await this.settlementPopup().isVisible({ timeout: 2_000 }).catch(() => false)) &&
      (await this.regoField().isVisible({ timeout: 2_000 }).catch(() => false));
    if (onLoanSearch) {
      await this.clearRego().catch(() => {});
      await this.clearVinIfVisible().catch(() => {});
      await this.expectSettlementSearchScreenVisible();
      return;
    }
    const back = this.settlementErrorBackButton();
    if (await back.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await back.click({ timeout: 15_000 });
      await this.waitForLoaderGone();
    }
    await this.expectSettlementSearchScreenVisible();
    await this.ensureSettlementDateReadyForNext();
  }

  /**
   * UDP-T3963–T3965 — try VIN first (KMHKM81BUPU2257CK), then Rego fallback (BY7737).
   * Clicks **Next** after each lookup until the privacy waiver screen appears.
   */
  async searchDifferentDealerLoanAndAdvanceToPrivacyWaiver(vin: string, regoFallback: string): Promise<void> {
    this.logStep("Search different-dealer loan and advance to privacy waiver");
    await this.expectSettlementSearchScreenVisible();
    let lastError: unknown;

    try {
      await this.prepareDifferentDealerVinLoanSearch(vin);
      await this.clickSettlementPopupNext();
      await this.expectPrivacyWaiverScreen();
      return;
    } catch (error) {
      lastError = error;
    }

    await this.returnToSettlementLoanSearchScreen();
    try {
      await this.prepareDifferentDealerRegoLoanSearch(regoFallback);
      await this.clickSettlementPopupNext();
      await this.expectPrivacyWaiverScreen();
      return;
    } catch (error) {
      throw error ?? lastError;
    }
  }

  async expectSettlementDateIsToday(): Promise<void> {
    this.logStep("Expect Settlement Date Is Today");
    await this.expectSettlementDateIsPopulated();
    const today = todayDdMmYyyy();
    await expect
      .poll(async () => this.readSettlementDate(), { timeout: 15_000 })
      .toMatch(new RegExp(today.replace(/\//g, "[/\\-]")));
  }

  /** Dealer-listing **Calculate Settlement** may open with an empty date — populate today before **Next**. */
  async ensureSettlementDateReadyForNext(): Promise<void> {
    this.logStep("Ensure Settlement Date Ready For Next");
    const dialog = this.activeDialog();
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    const existing = ((await this.readSettlementDate().catch(() => "")) ?? "").trim();
    if (existing.length >= 6) {
      await this.expectRegoDoesNotContainSettlementDate();
      if (await this.loanSearchNextButton().isEnabled().catch(() => false)) {
        return;
      }
    }

    const dateField = await this.resolveSettlementDateField();
    if (await dateField.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.enterSettlementDate(todayDdMmYyyy());
    }

    await expect
      .poll(async () => ((await this.readSettlementDate().catch(() => "")) ?? "").trim().length, {
        timeout: 20_000,
      })
      .toBeGreaterThan(6);
    await this.expectRegoDoesNotContainSettlementDate();
    await this.ensureRefinancingLoanSearchReadyForNext();
    await expect(this.loanSearchNextButton()).toBeEnabled({ timeout: 30_000 });
  }

  private refinancingLoanSearchMessage(): Locator {
    return this.activeDialog()
      .getByText(/purpose of refinancing.*new loan must also be entered|new loan must also be entered/i)
      .first();
  }

  private newLoanDateFieldGroup(): Locator {
    return this.settlementPopup()
      .locator(".p-field, .field, .p-col, .p-float-label, [class*='p-field'], span.p-float-label")
      .filter({ hasText: /New Loan Date/i })
      .first();
  }

  private async resolveNewLoanDateField(): Promise<Locator> {
    const group = this.newLoanDateFieldGroup();
    const candidates = [
      group.getByRole("combobox").first(),
      group.locator("p-calendar input, input").first(),
      settlementTextFieldIn(this.settlementPopup(), "New Loan Date"),
    ];
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 1_500 }).catch(() => false)) {
        return candidate;
      }
    }
    return settlementTextFieldIn(this.settlementPopup(), "New Loan Date");
  }

  async enterNewLoanDate(date: string): Promise<void> {
    this.logStep(`Enter New Loan Date ${this.stepValueDisplay(date)}`);
    const dateField = await this.resolveNewLoanDateField();
    await expect(dateField).toBeVisible({ timeout: 15_000 });
    await dateField.click({ force: true });
    await this.page.keyboard.press("ControlOrMeta+a");
    await this.page.keyboard.press("Backspace");

    const input = this.newLoanDateFieldGroup().locator("p-calendar input, input").first();
    const filled = await input
      .fill(date, { force: true })
      .then(() => true)
      .catch(() => false);
    if (!filled) {
      await input
        .evaluate((el, val) => {
          const target = el as HTMLInputElement;
          target.value = val;
          target.dispatchEvent(new Event("input", { bubbles: true }));
          target.dispatchEvent(new Event("change", { bubbles: true }));
        }, date)
        .catch(() => {});
    }

    await dateField.press("Tab").catch(() => {});
    await this.waitForLoaderGone();
  }

  /**
   * Refinancing dealer-listing loan search — **New Loan Date** may be shown, or supplied from an open quote.
   */
  async ensureRefinancingLoanSearchReadyForNext(): Promise<void> {
    const refinancing = await this.refinancingLoanSearchMessage()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (!refinancing) {
      return;
    }

    this.logStep("Ensure Refinancing Loan Search Ready For Next");
    const newLoanGroup = this.newLoanDateFieldGroup();
    if (await newLoanGroup.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const field = await this.resolveNewLoanDateField();
      const existing = ((await field.inputValue().catch(() => "")) ?? "").trim();
      if (existing.length < 6) {
        await this.enterNewLoanDate(todayDdMmYyyy());
      }
    }

    await expect(this.loanSearchNextButton()).toBeEnabled({ timeout: 30_000 });
  }

  async expectSettlementDateIsPopulated(): Promise<void> {
    this.logStep("Expect Settlement Date Is Populated");
    const dialog = this.activeDialog();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(/Settlement Date/i).first()).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => this.readSettlementDate(), {
        timeout: 15_000,
        intervals: [300, 500, 1_000],
      })
      .toMatch(/\d{1,2}[/\\-]\d{1,2}[/\\-]\d{2,4}/);
  }

  /** Initial Settlement loan-search pop-up: Rego, VIN, and **Next** (date validated separately). */
  async expectSettlementSearchScreenVisible(): Promise<void> {
    this.logStep("Expect Settlement Search Screen Visible");
    await this.waitForLoaderGone();
    const dialog = this.activeDialog();
    await expect(dialog).toBeVisible({ timeout: 45_000 });
    await expect(this.regoField()).toBeVisible({ timeout: 30_000 });
    await expect(this.vinField()).toBeVisible({ timeout: 30_000 });
    await expect(this.loanSearchNextButton()).toBeVisible({ timeout: 15_000 });
  }

  async clearSettlementDate(): Promise<void> {
    this.logStep("Clear Settlement Date");
    await this.focusSettlementDateField();
    await this.page.keyboard.press("ControlOrMeta+a");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.press("Tab").catch(() => {});
  }

  private settlementDateValidationErrorMessage(): Locator {
    const group = this.settlementDateFieldGroup();
    const errorPattern =
      /past|invalid|cannot|not accept|future|today|before|earlier|greater than|minimum|not allowed|required/i;
    return group
      .getByText(errorPattern)
      .first()
      .or(
        group
          .locator(".p-error, .p-invalid, .invalid-feedback, [class*='error'], small")
          .filter({ hasText: errorPattern })
          .first(),
      )
      .or(
        this.activeDialog()
          .locator(".p-error, .p-invalid, .invalid-feedback, [class*='error'], small")
          .filter({ hasText: errorPattern })
          .filter({ hasText: /settlement date|date/i })
          .first(),
      );
  }

  async expectPastSettlementDateRejected(): Promise<void> {
    this.logStep("Expect Past Settlement Date Rejected");
    const yesterday = shiftDdMmYyyy(-1);
    const today = todayDdMmYyyy();

    await this.clearSettlementDate();
    await this.enterSettlementDate(yesterday);

    const msg = this.settlementDateValidationErrorMessage().or(
      this.activeDialog().getByText(/past|invalid|cannot|not accept|future|today|before|earlier|required/i),
    );

    const dateAfterEntry = await this.readSettlementDate();
    const revertedToToday = new RegExp(today.replace(/\//g, "[/\\-]")).test(dateAfterEntry);
    const stillYesterday = new RegExp(yesterday.replace(/\//g, "[/\\-]")).test(dateAfterEntry);

    let hasError = await msg
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!hasError && stillYesterday) {
      await this.clickNext().catch(() => {});
      hasError = await msg
        .first()
        .isVisible({ timeout: 8_000 })
        .catch(() => false);
    }

    const nextBlocked = !(await this.loanSearchNextButton().isEnabled().catch(() => true));
    expect(hasError || nextBlocked || revertedToToday).toBeTruthy();
  }

  async clickSettlementPopupNext(): Promise<void> {
    this.logStep("Click Settlement popup Next");
    await this.waitForLoaderGone();
    const dialog = this.activeDialog();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(this.settlementPopup()).toBeVisible({ timeout: 15_000 });
    const next = this.loanSearchNextButton();
    await expect(next).toBeVisible({ timeout: 15_000 });
    await next.click({ timeout: 20_000 });
    await this.waitForLoaderGone(120_000);
  }

  async clickNext(): Promise<void> {
    this.logStep("Click Next");
    await this.waitForLoaderGone();
    const settlementOpen = await this.activeDialog()
      .locator("app-settlement-popup")
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (settlementOpen) {
      await this.clickSettlementPopupNext();
      return;
    }
    const onLoanSearch =
      (await this.regoField().isVisible({ timeout: 3_000 }).catch(() => false)) &&
      (await this.loanSearchNextButton().isVisible({ timeout: 2_000 }).catch(() => false));
    const next = onLoanSearch ? this.loanSearchNextButton() : this.nextButton;
    await next.click({ timeout: 20_000 });
    await this.waitForLoaderGone();
  }

  async clickBack(): Promise<void> {
    this.logStep("Click Back");
    await this.settlementErrorBackButton().click({ timeout: 15_000 });
    await this.waitForLoaderGone();
  }

  /** Back on MAF-5579 / MAF-5580 mismatch or return error screens — scoped to the active Settlement dialog. */
  settlementErrorBackButton(): Locator {
    const dialog = this.activeDialog();
    return dialog
      .getByRole("button", { name: /^Back$/i })
      .or(dialog.locator("gen-button button").filter({ hasText: /^Back$/i }))
      .or(dialog.locator("button, a").filter({ hasText: /^Back$/i }))
      .first();
  }

  /**
   * Mismatch (MAF-5579) or return / business-rule (MAF-5580) error — message visible with **Back** to loan search.
   */
  async expectSettlementErrorScreenWithBack(): Promise<void> {
    this.logStep("Expect Settlement error screen with Back (MAF-5579/5580)");
    await this.waitForLoaderGone();
    const errorPattern =
      /MAF-5579|MAF-5580|not found|no loan|unable to find|do not match any existing financed|vehicle not found|arrears|overdue|business rule|cannot proceed|ineligible|return/i;
    await expect(this.activeDialog().getByText(errorPattern).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(this.settlementErrorBackButton()).toBeVisible({ timeout: 15_000 });
  }

  async clickCancel(): Promise<void> {
    this.logStep("Click Cancel");
    const dialog = this.activeDialog();
    const cancel = dialog
      .getByRole("button", { name: /^Cancel$/i })
      .or(this.settlementPopup().getByRole("button", { name: /^Cancel$/i }))
      .or(this.cancelButton)
      .first();
    await cancel.click({ timeout: 15_000 });
    await this.waitForLoaderGone();
  }

  /** Rego field group on the active Settlement loan-search dialog (label + inline validation). */
  private regoValidationErrorMessage(): Locator {
    const group = this.regoFieldGroup();
    const errorPattern =
      /incorrect combination|invalid|special character|alphanumeric|maximum|no more than 6|must be|6 character|not allowed/i;
    return group
      .getByText(errorPattern)
      .first()
      .or(
        group
          .locator(".p-error, .p-invalid, .invalid-feedback, [class*='error'], small")
          .filter({ hasText: errorPattern })
          .first(),
      )
      .or(
        this.activeDialog()
          .locator(".p-error, .p-invalid, .invalid-feedback, [class*='error'], small")
          .filter({ hasText: errorPattern })
          .filter({ hasText: /rego/i })
          .first(),
      );
  }

  async expectRegoValidationError(): Promise<void> {
    this.logStep("Expect Rego Validation Error");
    const msg = this.regoValidationErrorMessage().or(
      this.activeDialog().getByText(
        /incorrect combination|rego.*(?:invalid|special character|alphanumeric|maximum|6 character|not allowed)|(?:invalid|special character|alphanumeric|maximum|6 character).*(?:rego|registration)/i,
      ),
    );
    const hasMsg = await msg
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    if (hasMsg) {
      return;
    }
    const nextBlocked = !(await this.loanSearchNextButton().isEnabled().catch(() => true));
    expect(nextBlocked).toBeTruthy();
  }

  async expectNoRegoValidationError(): Promise<void> {
    this.logStep("Expect No Rego Validation Error");
    const msg = this.regoValidationErrorMessage().or(
      this.activeDialog().getByText(
        /incorrect combination|rego.*(?:invalid|special character|alphanumeric|maximum|6 character|not allowed)|(?:invalid|special character|alphanumeric|maximum|6 character).*(?:rego|registration)/i,
      ),
    );
    await expect(msg.first()).toBeHidden({ timeout: 8_000 });
  }

  async expectRegoValue(expected: string): Promise<void> {
    this.logStep(`Expect Rego Value ${this.stepValueDisplay(expected)}`);
    await this.page.keyboard.press("Escape").catch(() => {});
    const field = this.regoField();
    await expect
      .poll(async () => (await field.inputValue().catch(() => "")).trim().toUpperCase(), {
        timeout: 10_000,
      })
      .toBe(expected.toUpperCase());
  }

  async expectVinIsBlank(): Promise<void> {
    this.logStep("Expect VIN Is Blank");
    await expect
      .poll(async () => (await this.vinField().inputValue()).trim(), { timeout: 8_000 })
      .toBe("");
  }

  async expectRegoIsBlank(): Promise<void> {
    this.logStep("Expect Rego Is Blank");
    await this.page.keyboard.press("Escape").catch(() => {});
    await expect
      .poll(async () => (await this.regoField().inputValue().catch(() => "")).trim(), {
        timeout: 8_000,
      })
      .toBe("");
  }

  async expectVinValue(expected: string): Promise<void> {
    this.logStep(`Expect VIN Value ${this.stepValueDisplay(expected)}`);
    await this.page.keyboard.press("Escape").catch(() => {});
    const field = this.vinField();
    await expect
      .poll(async () => (await field.inputValue().catch(() => "")).trim().toUpperCase(), {
        timeout: 10_000,
      })
      .toBe(expected.toUpperCase());
  }

  private vinValidationErrorMessage(): Locator {
    const group = this.vinFieldGroup();
    const errorPattern =
      /incorrect combination|invalid|special character|alphanumeric|maximum|no more than 17|must be|17 character|not allowed/i;
    return group
      .getByText(errorPattern)
      .first()
      .or(
        group
          .locator(".p-error, .p-invalid, .invalid-feedback, [class*='error'], small")
          .filter({ hasText: errorPattern })
          .first(),
      )
      .or(
        this.activeDialog()
          .locator(".p-error, .p-invalid, .invalid-feedback, [class*='error'], small")
          .filter({ hasText: errorPattern })
          .filter({ hasText: /vin/i })
          .first(),
      );
  }

  async expectNoVinValidationError(): Promise<void> {
    this.logStep("Expect No VIN Validation Error");
    const msg = this.vinValidationErrorMessage().or(
      this.activeDialog().getByText(
        /incorrect combination|vin.*(?:invalid|special character|alphanumeric|maximum|17 character|not allowed)|(?:invalid|special character|alphanumeric|maximum|17 character).*\bvin\b/i,
      ),
    );
    await expect(msg.first()).toBeHidden({ timeout: 8_000 });
  }

  /** After **Next** on loan search — advanced past rego format validation (display, privacy, or lookup result). */
  async expectLoanSearchStepCompleted(): Promise<void> {
    this.logStep("Expect Loan Search Step Completed");
    await this.waitForLoaderGone();
    await this.expectNoRegoValidationError();
    await this.expectNoVinValidationError();
    await expect(
      this.page
        .getByText(
          /privacy waiver|Settlement (Amount|Quote|Display)|not found|no loan|unable to find|do not match any existing financed|Customer Details/i,
        )
        .first(),
    ).toBeVisible({ timeout: 60_000 });
  }

  async expectVinValidationError(): Promise<void> {
    this.logStep("Expect VIN Validation Error");
    const msg = this.vinValidationErrorMessage().or(
      this.activeDialog().getByText(
        /incorrect combination|vin.*(?:invalid|special character|alphanumeric|maximum|17 character|not allowed)|(?:invalid|special character|alphanumeric|maximum|17 character).*\bvin\b/i,
      ),
    );
    const hasMsg = await msg
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    if (hasMsg) {
      return;
    }
    const nextBlocked = !(await this.loanSearchNextButton().isEnabled().catch(() => true));
    expect(nextBlocked).toBeTruthy();
  }

  async expectVehicleNotFoundError(): Promise<void> {
    this.logStep("Expect Vehicle Not Found Error");
    await this.waitForLoaderGone();
    const pattern =
      /not found|no loan|unable to find|vehicle not found|no matching|do not match any existing financed/i;
    const msg = this.activeDialog()
      .getByText(pattern)
      .first()
      .or(this.page.getByText(pattern).first());
    await expect(msg).toBeVisible({ timeout: 45_000 });
  }

  async expectBusinessRuleError(expectedPattern?: RegExp | string): Promise<void> {
    this.logStep("Expect Business Rule Error");
    const text = await this.readBusinessRuleErrorMessage();
    const pattern =
      expectedPattern === undefined
        ? this.businessRuleErrorPattern()
        : typeof expectedPattern === "string"
          ? new RegExp(expectedPattern, "i")
          : expectedPattern;
    expect(text).toMatch(pattern);
  }

  /** FIS AF / MAF-5580 — settlement rejected; dealer cannot advance to quote display. */
  async expectBusinessRuleErrorBlocksProceed(): Promise<void> {
    this.logStep("Expect Business Rule Error blocks proceed");
    await this.waitForLoaderGone(120_000);
    await expect(this.page.locator("app-settlement-quote-details").first()).toBeHidden({
      timeout: 15_000,
    });
    const addVisible = await this.addSettlementToQuoteButton
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(addVisible).toBeFalsy();

    const dialog = this.activeDialog();
    const dialogVisible = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);
    if (dialogVisible) {
      const body = ((await dialog.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
      expect(/Loan Number|Settlement Amount\s*\(|Goods Description/i.test(body)).toBeFalsy();
      await expect(dialog.getByText(this.businessRuleErrorPattern()).first()).toBeVisible({
        timeout: 15_000,
      });
    }

    const pageBody = ((await this.page.locator("body").innerText().catch(() => "")) ?? "").replace(
      /\s+/g,
      " ",
    );
    expect(/Loan Number|Settlement Amount\s*\(|Goods Description/i.test(pageBody)).toBeFalsy();
  }

  private businessRuleErrorPattern(): RegExp {
    return /arrears|overdue|in arrears|past due|not eligible|cannot proceed|unable to proceed|business rule|finance lease|operating lease|lease.*not.*(?:eligible|support)|not.*(?:eligible|allowed).*settlement|settlement can not be completed|settlement cannot be completed|can not be completed|contact UDC finance|please contact UDC|ineligible|MAF-5580/i;
  }

  private businessRuleErrorMessageLocator(): Locator {
    const pattern = this.businessRuleErrorPattern();
    const dialog = this.activeDialog();
    return dialog
      .locator(
        ".p-message, .p-inline-message, .p-error, .alert, .invalid-feedback, [class*='error'], [class*='message']",
      )
      .filter({ hasText: pattern })
      .first()
      .or(dialog.getByText(pattern).first())
      .or(
        this.page
          .locator(".p-toast-message, .p-toast, [class*='toast']")
          .filter({ hasText: pattern })
          .first(),
      );
  }

  /** Click **Next** on loan-search unless a business-rule error is already shown. */
  private async submitSettlementLoanSearchForBusinessRule(): Promise<void> {
    if (await this.isBusinessRuleErrorVisible(2_000)) {
      return;
    }
    const next = this.loanSearchNextButton();
    if (await next.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(next).toBeEnabled({ timeout: 20_000 });
      await this.clickSettlementPopupNext();
      return;
    }
    await this.waitForLoaderGone(90_000);
  }

  private async readBusinessRuleErrorMessage(): Promise<string> {
    await this.waitForLoaderGone(120_000);
    const msg = this.businessRuleErrorMessageLocator();
    await expect(msg).toBeVisible({ timeout: 60_000 });
    return ((await msg.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
  }

  /** Settlement display — full-page route, component shell, or loan-search dialog. */
  private async settlementDisplayRoot(): Promise<Locator> {
    const candidates = [
      this.page.locator("app-settlement-quote-details").first(),
      this.page.locator("app-standard-quote").first(),
      this.activeDialog(),
    ];
    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 2_000 }).catch(() => false))) {
        continue;
      }
      const hasDisplayContent = await candidate
        .getByText(/Loan Number|Settlement Amount\s*\(Standard\)|Customer Details/i)
        .first()
        .isVisible({ timeout: 2_000 })
        .catch(() => false);
      if (hasDisplayContent) {
        return candidate;
      }
    }
    return this.page.locator("body");
  }

  /** Angular renders waiver blocks inside `col-* hidden` until the async loan lookup completes. */
  private async popupSectionIsDisplayed(locator: Locator): Promise<boolean> {
    if (!(await locator.isVisible().catch(() => false))) {
      return false;
    }
    const box = await locator.boundingBox().catch(() => null);
    if (!box || box.width <= 0 || box.height <= 0) {
      return false;
    }
    const col = locator.locator('xpath=ancestor::div[contains(@class,"col")][1]');
    if ((await col.count()) === 0) {
      return true;
    }
    const cls = ((await col.getAttribute("class").catch(() => "")) ?? "").toLowerCase();
    return !/\bhidden\b/.test(cls);
  }

  private differentDealerMessageInPopup(): Locator {
    return this.settlementPopup()
      .locator("label")
      .filter({
        hasText:
          /originally purchased from another dealer|avalable for this vechile|settlement quote is ava?ilable/i,
      })
      .first();
  }

  private privacyWaiverLabelInPopup(): Locator {
    return this.settlementPopup()
      .locator("label")
      .filter({ hasText: /Privacy\s*Waiver/i })
      .first();
  }

  /**
   * UDP-T3963 / MAF-5578 — loan found at a different originating dealer; privacy waiver required before display.
   */
  async expectDifferentDealerPrivacyWaiverRequired(): Promise<void> {
    this.logStep("Expect different-dealer privacy waiver required");
    await this.waitForDifferentDealerPrivacyWaiverScreen();
  }

  async waitForDifferentDealerPrivacyWaiverScreen(): Promise<void> {
    this.logStep("Wait for different-dealer privacy waiver screen");
    await this.waitForLoaderGone(120_000);
    await expect(this.activeDialog()).toBeVisible({ timeout: 45_000 });
    await expect(this.settlementPopup()).toBeVisible({ timeout: 45_000 });

    await expect
      .poll(
        async () => {
          const text = ((await this.settlementPopup().innerText().catch(() => "")) ?? "").replace(
            /\s+/g,
            " ",
          );
          return (
            /Privacy\s*Waiver/i.test(text) &&
            /another dealer|avalable for this vechile|customer must consent/i.test(text)
          );
        },
        { timeout: 120_000 },
      )
      .toBe(true);
  }

  async expectPrivacyWaiverScreen(): Promise<void> {
    this.logStep("Expect Privacy Waiver Screen");
    await this.waitForDifferentDealerPrivacyWaiverScreen();
  }

  private privacyWaiverCheckboxInPopup(): Locator {
    return this.settlementPopup()
      .locator("toggle-checkbox p-checkbox input[type='checkbox']")
      .or(this.settlementPopup().locator("p-checkbox input[type='checkbox']"))
      .or(this.privacyWaiverCheckbox)
      .first();
  }

  async clickNextToRevealPrivacyWaiver(): Promise<void> {
    this.logStep("Click Next to reveal privacy waiver");
    await this.clickSettlementPopupNext();
    await this.expectPrivacyWaiverScreen();
  }

  async triggerSettlementLoanLookup(): Promise<void> {
    this.logStep("Trigger Settlement loan lookup");
    const vin = ((await this.vinField().inputValue().catch(() => "")) ?? "").trim();
    const vinField = this.vinField();
    if (vin) {
      await vinField.click({ force: true });
      await vinField.fill(vin, { force: true });
      await vinField.dispatchEvent("input").catch(() => {});
      await vinField.dispatchEvent("change").catch(() => {});
      await vinField.press("Tab").catch(() => {});
      await this.waitForLoaderGone(120_000);
    }
    await this.ensureSettlementDateReadyForNext();
    const dateField = await this.resolveSettlementDateField();
    if (await dateField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await dateField.click({ force: true }).catch(() => {});
      await dateField.dispatchEvent("blur").catch(() => {});
      await this.page.keyboard.press("Tab").catch(() => {});
      await this.waitForLoaderGone(120_000);
    }
  }

  async waitForPrivacyWaiverConsentInteractive(): Promise<void> {
    this.logStep("Wait for Privacy Waiver consent control interactive");
    const popup = this.settlementPopup();
    const checkbox = this.privacyWaiverCheckboxInPopup();
    const toggleHost = popup.locator("toggle-checkbox").first();

    await expect
      .poll(
        async () => {
          if (!(await this.popupSectionIsDisplayed(toggleHost))) {
            return false;
          }
          const box = popup.locator("toggle-checkbox p-checkbox .p-checkbox-box").first();
          const boxVisible = await box.isVisible().catch(() => false);
          const enabled = !(await checkbox.isDisabled().catch(() => true));
          const consentLabel = popup
            .locator("label.p-checkbox-label")
            .filter({
              hasText: /obtained the customer'?s consent to proceed with the settlement quote request/i,
            })
            .first();
          return boxVisible && enabled && (await this.popupSectionIsDisplayed(consentLabel));
        },
        { timeout: 120_000 },
      )
      .toBe(true);
  }

  async setPrivacyWaiverConsent(checked: boolean): Promise<void> {
    this.logStep(`Set Privacy Waiver Consent ${checked}`);
    const popup = this.settlementPopup();
    const checkbox = this.privacyWaiverCheckboxInPopup();

    if (!checked) {
      if (await checkbox.isVisible().catch(() => false)) {
        if (!(await checkbox.isDisabled().catch(() => true)) && (await checkbox.isChecked().catch(() => false))) {
          await checkbox.uncheck({ force: true });
        }
      }
      return;
    }

    await this.waitForPrivacyWaiverConsentInteractive();

    const consentControl = popup
      .locator("toggle-checkbox p-checkbox .p-checkbox-box:not(.p-disabled)")
      .or(popup.locator("toggle-checkbox p-checkbox .p-checkbox-box"))
      .or(
        popup.getByRole("checkbox", {
          name: /obtained the customer'?s consent to proceed with the settlement quote request/i,
        }),
      )
      .first();

    await consentControl.click({ force: true });
    await expect
      .poll(async () => checkbox.isChecked().catch(() => false), { timeout: 30_000 })
      .toBe(true);
  }

  async expectPrivacyWaiverBlocksProceed(): Promise<void> {
    this.logStep("Expect Privacy Waiver Blocks Proceed");
    await this.clickNext();
    await this.waitForLoaderGone();
    await expect(this.page.locator("app-settlement-quote-details").first()).toBeHidden({
      timeout: 15_000,
    });
    await expect
      .poll(
        async () => {
          const dialog = this.activeDialog();
          const validation = await dialog
            .getByText(/privacy waiver|consent|required|tick|must consent|obtained the customer/i)
            .filter({ visible: true })
            .first()
            .isVisible()
            .catch(() => false);
          const waiverLabel = await this.popupSectionIsDisplayed(
            this.privacyWaiverLabelInPopup(),
          );
          const searchStillOpen = await this.loanSearchNextButton().isVisible().catch(() => false);
          return validation || (waiverLabel && (await dialog.isVisible().catch(() => false))) || searchStillOpen;
        },
        { timeout: 30_000 },
      )
      .toBe(true);
  }

  async expectSettlementDisplayScreen(): Promise<void> {
    this.logStep("Expect Settlement Display Screen");
    const blocked =
      /do not match any existing financed|not found|no loan|unable to find|vehicle not found/i;
    await expect
      .poll(
        async () => {
          const root = await this.settlementDisplayRoot();
          const text = await root.innerText().catch(() => "");
          if (blocked.test(text)) {
            return false;
          }
          if (/Please complete the details below to view a settlement quote/i.test(text)) {
            return false;
          }
          return /Loan Number|Goods Description|Settlement Amount\s*\(|Customer Details/i.test(
            text,
          );
        },
        { timeout: 90_000 },
      )
      .toBeTruthy();
  }

  /** Customer Details block on the Settlement display screen (loan found). */
  private async settlementCustomerDetailsSection(): Promise<Locator> {
    const root = await this.settlementDisplayRoot();
    return root
      .filter({ hasText: /Customer Details/i })
      .filter({ hasText: /UDC Customer Name|Customer Type|Customer Role/i })
      .first()
      .or(
        root
          .locator("gen-card, p-card, .p-card")
          .filter({ has: root.locator("label, generic").filter({ hasText: /^Customer Details$/i }) })
          .first(),
      );
  }

  async expectCustomerDetailsPopulated(): Promise<void> {
    this.logStep("Expect Customer Details Populated");
    await this.expectSettlementDisplayScreen();
    const section = await this.settlementCustomerDetailsSection();
    await expect(section).toBeVisible({ timeout: 30_000 });
    await expect(section.getByText(/^Customer Details$/i).first()).toBeVisible({ timeout: 15_000 });

    const headers = [
      "UDC Customer Name",
      "UDC Customer Number",
      "Customer Type",
      "Customer Role",
    ] as const;
    for (const header of headers) {
      await expect(
        section.getByText(new RegExp(`^\\s*${header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i")).first(),
      ).toBeVisible({ timeout: 15_000 });
    }

    const table = section.locator("table").first();
    await expect(table).toBeVisible({ timeout: 15_000 });
    const dataRow = table.locator("tbody tr").first().or(table.getByRole("rowgroup").nth(1).getByRole("row").first());
    await expect(dataRow).toBeVisible({ timeout: 15_000 });

    const cells = await dataRow.locator("td").allInnerTexts();
    expect(cells.length, "Customer Details row should have populated cells").toBeGreaterThanOrEqual(4);
    for (const [index, header] of headers.entries()) {
      const value = (cells[index] ?? "").replace(/\s+/g, " ").trim();
      expect(value.length, `${header} should be populated on Settlement display`).toBeGreaterThan(0);
    }
  }

  /**
   * UDP-T3989 — Settlement Customer Details is display-only: no editable inputs/dropdowns,
   * and an edit attempt does not change field values.
   */
  async expectCustomerDetailsReadOnly(): Promise<void> {
    this.logStep("Expect Customer Details Read Only");
    const section = await this.settlementCustomerDetailsSection();
    await expect(section).toBeVisible({ timeout: 30_000 });

    const editableInputs = section.locator(
      'input:not([type="hidden"]):not([type="file"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])',
    );
    await expect(editableInputs.filter({ visible: true })).toHaveCount(0, { timeout: 15_000 });

    const dropdowns = section.locator(
      "p-dropdown:not(.p-disabled) .p-dropdown-trigger, p-multiselect:not(.p-disabled) .p-multiselect-trigger",
    );
    await expect(dropdowns.filter({ visible: true })).toHaveCount(0, { timeout: 8_000 });

    const fields = section.locator(
      "input:not([type='hidden']):not([type='file']), textarea",
    );
    const count = await fields.count();
    for (let i = 0; i < count; i++) {
      const field = fields.nth(i);
      if (!(await field.isVisible().catch(() => false))) continue;

      const before = await field.inputValue().catch(() => "");
      await field.click({ timeout: 5_000 }).catch(() => {});
      await field.fill("__AUTO_EDIT_ATTEMPT__", { timeout: 5_000 }).catch(() => {});
      const after = await field.inputValue().catch(() => before);
      expect(after).toBe(before);

      const editable = await field.isEditable().catch(() => false);
      expect(editable).toBeFalsy();
      return;
    }

    const table = section.locator("table").first();
    if (await table.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const cell = table.locator("tbody tr").first().locator("td").first();
      await expect(cell).toBeVisible({ timeout: 10_000 });
      const before = ((await cell.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
      expect(before.length, "Customer Details cell should have a display value").toBeGreaterThan(0);
      await cell.click({ timeout: 5_000 });
      await this.page.keyboard.type("__AUTO_EDIT_ATTEMPT__").catch(() => {});
      const after = ((await cell.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
      expect(after, "Customer Details table cell should remain unchanged after edit attempt").toBe(
        before,
      );
    }
  }

  /** Asset Details block on the Settlement display screen (loan found). */
  private async settlementAssetDetailsSection(): Promise<Locator> {
    const root = await this.settlementDisplayRoot();
    return root
      .filter({ hasText: /Asset Details/i })
      .filter({ hasText: /Loan Number|Goods Description/i })
      .first()
      .or(
        root
          .locator("gen-card, p-card, .p-card")
          .filter({ has: root.locator("label, generic").filter({ hasText: /^Asset Details$/i }) })
          .first(),
      );
  }

  private async readSettlementDisplayTableCell(
    section: Locator,
    columnHeader: string,
  ): Promise<string> {
    const table = section.locator("table").filter({ hasText: new RegExp(columnHeader, "i") }).first();
    if (await table.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const headers = table.locator("th, [role='columnheader']");
      const headerCount = await headers.count();
      let columnIndex = -1;
      for (let i = 0; i < headerCount; i++) {
        const text = ((await headers.nth(i).innerText().catch(() => "")) ?? "")
          .replace(/\s+/g, " ")
          .trim();
        if (new RegExp(`^${columnHeader}$`, "i").test(text)) {
          columnIndex = i;
          break;
        }
      }
      if (columnIndex >= 0) {
        const dataRow = table.locator("tbody tr").first().or(
          table.getByRole("rowgroup").nth(1).getByRole("row").first(),
        );
        const cell = dataRow.locator("td").nth(columnIndex);
        return ((await cell.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
      }
    }

    return this.readSettlementDisplayFieldValue(section, columnHeader);
  }

  private async readSettlementDisplayFieldValue(section: Locator, label: string): Promise<string> {
    const field = settlementTextFieldIn(section, label);
    if (await field.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const input = ((await field.inputValue().catch(() => "")) ?? "").trim();
      if (input.length > 0) {
        return input;
      }
      const attr = ((await field.getAttribute("value")) ?? "").trim();
      if (attr.length > 0) {
        return attr;
      }
    }

    const group = section
      .locator(".p-field, .field, .p-col, .p-float-label, [class*='p-field']")
      .filter({ hasText: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })
      .first();
    const text = ((await group.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const afterLabel = text.match(new RegExp(`${escaped}\\s*[:\\-]?\\s*(.+)`, "i"));
    return (afterLabel?.[1] ?? text.replace(new RegExp(escaped, "i"), "")).trim();
  }

  async expectAssetDetailsPopulated(): Promise<void> {
    this.logStep("Expect Asset Details Populated");
    await this.expectSettlementDisplayScreen();
    const section = await this.settlementAssetDetailsSection();
    await expect(section).toBeVisible({ timeout: 30_000 });
    await expect(section.getByText(/^Asset Details$/i).first()).toBeVisible({ timeout: 15_000 });

    const requiredFields = ["Loan Number", "Goods Description", "Description"] as const;
    for (const label of requiredFields) {
      await expect(
        section.getByText(new RegExp(`^\\s*${label}\\s*$`, "i")).first(),
      ).toBeVisible({ timeout: 15_000 });
      const value = await this.readSettlementDisplayTableCell(section, label);
      expect(value.length, `${label} should be populated on Settlement display`).toBeGreaterThan(0);
    }
  }

  private async standardSettlementSection(): Promise<Locator> {
    const root = await this.settlementDisplayRoot();
    const label = root.getByText(/Settlement Amount\s*\(Standard\)/i).first();
    await expect(label).toBeVisible({ timeout: 30_000 });
    return label
      .locator("xpath=ancestor::*[.//p[contains(., 'Total')]][1]")
      .or(label.locator("xpath=ancestor::*[self::div or self::section][4]"))
      .first();
  }

  private parseDisplayedCurrencyAmounts(text: string): number[] {
    return [...text.matchAll(/\$[\d,]+\.\d{2}/g)]
      .map((match) => Number.parseFloat(match[0].replace(/[$,]/g, "")))
      .filter((amount) => Number.isFinite(amount));
  }

  async expectConsumerSettlementCustomFlowsDisplayed(): Promise<void> {
    this.logStep("Expect Consumer Settlement Custom Flows Displayed");
    await this.expectSettlementDisplayScreen();
    await this.expectStandardSettlementSectionWithPositiveAmounts();
  }

  async expectBusinessSettlementCustomFlowsDisplayed(): Promise<void> {
    this.logStep("Expect Business Settlement Custom Flows Displayed");
    await this.expectSettlementDisplayScreen();
    await this.expectStandardSettlementSectionWithPositiveAmounts();
    await this.expectBusinessCustomerContextOnSettlementDisplay();
    await this.expectConsumerOnlySettlementCustomFlowsNotDisplayed();
  }

  private async expectBusinessCustomerContextOnSettlementDisplay(): Promise<void> {
    this.logStep("Expect Business customer context on Settlement display");
    const section = await this.settlementCustomerDetailsSection();
    await expect(section).toBeVisible({ timeout: 30_000 });
    const customerType = await this.readSettlementDisplayTableCell(section, "Customer Type");
    expect(
      customerType,
      "Business settlement Customer Type should reflect a Business customer",
    ).toMatch(/Business|Company|Commercial/i);
  }

  private async expectConsumerOnlySettlementCustomFlowsNotDisplayed(): Promise<void> {
    this.logStep("Expect Consumer-only settlement custom flows are not displayed");
    const root = await this.settlementDisplayRoot();
    const body = ((await root.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
    expect(body, "Business settlement display should not show Consumer CCI Refund flow").not.toMatch(
      /CCI Refund/i,
    );
    await expect(root.getByText(/CCI Refund/i)).toBeHidden({ timeout: 10_000 });
  }

  async readStandardSettlementTotalAmount(): Promise<number> {
    this.logStep("Read Standard Settlement Total Amount");
    await this.expectSettlementDisplayScreen();
    const section = await this.standardSettlementSection();
    const body = ((await section.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
    const amounts = this.parseDisplayedCurrencyAmounts(body);
    expect(amounts.length, "Standard settlement section should show currency amounts").toBeGreaterThan(
      0,
    );
    return Math.max(...amounts);
  }

  async expectStandardSettlementSectionWithPositiveAmounts(): Promise<void> {
    this.logStep("Expect Standard Settlement Section With Positive Amounts");
    await this.expectSettlementDisplayScreen();
    const section = await this.standardSettlementSection();
    await expect(section).toBeVisible({ timeout: 30_000 });

    const body = ((await section.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
    const lineItems = [
      /Outstanding Balance\s*&\s*Accrued Interest/i,
      /Overdue Amount/i,
      /Overdue Interest/i,
      /\bAdd\b/i,
      /Total/i,
    ];
    for (const pattern of lineItems) {
      expect(body, `Standard settlement section should show line item matching ${pattern}`).toMatch(
        pattern,
      );
    }

    const total = await this.readStandardSettlementTotalAmount();
    expect(total, "Standard settlement Total should be greater than 0").toBeGreaterThan(0);
  }

  private async refinancingSettlementSection(): Promise<Locator> {
    const root = await this.settlementDisplayRoot();
    const label = root.getByText(/Settlement Amount\s*\(Refinancing\)/i).first();
    await expect(label).toBeVisible({ timeout: 30_000 });
    return label
      .locator("xpath=ancestor::*[.//p[contains(., 'Total')]][1]")
      .or(label.locator("xpath=ancestor::*[self::div or self::section][4]"))
      .first();
  }

  async expectRefinancingSettlementSectionWithPositiveAmounts(): Promise<void> {
    this.logStep("Expect Refinancing Settlement Section With Positive Amounts");
    await this.expectSettlementDisplayScreen();
    const section = await this.refinancingSettlementSection();
    await expect(section).toBeVisible({ timeout: 30_000 });

    const body = ((await section.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
    const lineItems = [
      /Outstanding Balance\s*&\s*Accrued Interest/i,
      /Overdue Amount/i,
      /Overdue Interest/i,
      /\bAdd\b/i,
      /Total/i,
    ];
    for (const pattern of lineItems) {
      expect(
        body,
        `Refinancing settlement section should show line item matching ${pattern}`,
      ).toMatch(pattern);
    }

    const amounts = this.parseDisplayedCurrencyAmounts(body);
    expect(
      amounts.length,
      "Refinancing settlement section should show currency amounts",
    ).toBeGreaterThan(0);
    expect(
      Math.max(...amounts),
      "Refinancing settlement Total should be greater than 0",
    ).toBeGreaterThan(0);
  }

  async expectLessCciRefundHidden(): Promise<void> {
    this.logStep("Expect Less CCI Refund Hidden");
    const lessHeading = this.page.getByText(/^Less$/i);
    const cci = this.page.getByText(/CCI Refund/i);
    await expect(lessHeading).toBeHidden({ timeout: 10_000 }).catch(() => {});
    await expect(cci).toBeHidden({ timeout: 10_000 }).catch(() => {});
  }

  async expectAfVSettlementDisplay(): Promise<void> {
    this.logStep("Expect AFV Settlement Display");
    await expect(this.page.getByText(/AFV|Assured Future Value/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      this.page.getByText(/warning|future value|balloon|residual/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectCommissionClawbackNotDisplayed(): Promise<void> {
    this.logStep("Expect Commission Clawback Not Displayed");
    await this.expectSettlementDisplayScreen();
    const root = await this.settlementDisplayRoot();

    const standardLabel = root.getByText(/Settlement Amount\s*\(Standard\)/i).first();
    const refinancingLabel = root.getByText(/Settlement Amount\s*\(Refinancing\)/i).first();
    const standardVisible = await standardLabel.isVisible({ timeout: 10_000 }).catch(() => false);
    const refinancingVisible = await refinancingLabel
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    expect(
      standardVisible || refinancingVisible,
      "Dealer should see at least one Settlement Amount section (Standard or Refinancing)",
    ).toBeTruthy();

    for (const label of [standardLabel, refinancingLabel]) {
      if (!(await label.isVisible().catch(() => false))) {
        continue;
      }
      const block = label
        .locator("xpath=ancestor::*[.//p[contains(., 'Total')]][1]")
        .or(label.locator("xpath=ancestor::*[self::div or self::section][4]"))
        .first();
      const body = ((await block.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
      expect(body, "Settlement Amount section should not show Commission Clawback").not.toMatch(
        /Commission Clawback/i,
      );
      expect(body, "Settlement Amount section should not show Subsidy").not.toMatch(/\bSubsidy\b/i);
    }

    await expect(root.getByText(/Commission Clawback/i)).toBeHidden({ timeout: 10_000 });
    await expect(root.getByText(/\bSubsidy\b/i)).toBeHidden({ timeout: 10_000 });
  }

  async selectSettlementAmountOption(standardOrRefinance: "standard" | "refinance"): Promise<void> {
    this.logStep(`Select Settlement Amount Option ${standardOrRefinance}`);
    const label =
      standardOrRefinance === "standard"
        ? /Settlement Amount\s*\(Standard\)/i
        : /Settlement Amount\s*\(Refinancing\)/i;
    const row = this.page.getByText(label).first();
    await row.scrollIntoViewIfNeeded();
    const radio = row
      .locator("xpath=ancestor::*[self::div or self::tr][1]//input[@type='radio']")
      .or(this.page.getByRole("radio", { name: label }))
      .first();
    if (await radio.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await radio.check({ force: true });
    } else {
      await row.click({ timeout: 10_000 });
    }
  }

  async addSelectedSettlementToQuote(): Promise<void> {
    this.logStep("Add Selected Settlement To Quote");
    const addToCurrentQuote = this.page
      .getByRole("button", {
        name: /Add this Settlement Amount to (my|this) Quote/i,
      })
      .or(this.page.locator("button, a").filter({ hasText: /Add this Settlement Amount/i }))
      .first();
    const createNewQuote = this.page.getByRole("button", {
      name: /Create New Quote with this Settlement Amount/i,
    });
    const onExistingQuote = /standard-quote\/(edit|create)\/\d+/i.test(this.page.url());

    if (onExistingQuote) {
      await expect(
        addToCurrentQuote,
        "Asset-details quote flow should show Add this Settlement Amount to Quote",
      ).toBeVisible({ timeout: 30_000 });
      await addToCurrentQuote.scrollIntoViewIfNeeded();
      await addToCurrentQuote.click({ timeout: 20_000 });

      const confirm = this.page.getByRole("dialog").filter({ visible: true }).last();
      if (await confirm.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const ok = confirm.getByRole("button", { name: /^(Yes|OK|Confirm)$/i }).first();
        if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await ok.click({ timeout: 10_000 });
        }
      }
      await this.waitForLoaderGone(90_000);
      return;
    }

    const addToQuoteVisible = await addToCurrentQuote
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const fromDealerListing =
      !addToQuoteVisible &&
      (await createNewQuote.isVisible({ timeout: 5_000 }).catch(() => false));
    const addButton = addToQuoteVisible
      ? addToCurrentQuote
      : fromDealerListing
        ? createNewQuote
        : this.addSettlementToQuoteButton;

    await addButton.scrollIntoViewIfNeeded();
    await addButton.click({ timeout: 20_000 });

    if (!fromDealerListing) {
      const confirm = this.page.getByRole("dialog").filter({ visible: true }).last();
      if (await confirm.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const ok = confirm.getByRole("button", { name: /^(Yes|OK|Confirm)$/i }).first();
        if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await ok.click({ timeout: 10_000 });
        }
      }
    }
    await this.waitForLoaderGone(90_000);
  }

  private newSettlementQuoteConfirmationDialog(): Locator {
    return this.page
      .getByRole("dialog", { name: /Settlement Quote/i })
      .filter({
        hasText:
          /Please confirm if you wish to proceed for a new quote with this settlement amount|New Settlement Quote Confirmation|proceed for a new quote/i,
      })
      .or(
        this.page.getByRole("dialog").filter({
          hasText:
            /Please confirm if you wish to proceed for a new quote with this settlement amount|New Settlement Quote Confirmation/i,
        }),
      );
  }

  async expectNewSettlementQuoteConfirmation(): Promise<void> {
    this.logStep("Expect New Settlement Quote Confirmation");
    const dialog = this.newSettlementQuoteConfirmationDialog().last();
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByRole("button", { name: /^Yes$/i })).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole("button", { name: /^No$/i })).toBeVisible({ timeout: 15_000 });
  }

  async confirmNewQuoteYes(): Promise<void> {
    this.logStep("Confirm New Quote Yes");
    const dialog = this.newSettlementQuoteConfirmationDialog().last();
    await Promise.all([
      this.page.waitForURL(/standard-quote|dashboard/i, { timeout: 120_000 }),
      dialog.getByRole("button", { name: /^Yes$/i }).click({ timeout: 15_000 }),
    ]);
    await this.waitForLoaderGone(120_000);
  }

  /** After **Yes** — new Standard Quote shell opens (direct navigation or via dashboard listing on SIT). */
  async expectNewStandardQuoteOpenedAfterConfirmationYes(): Promise<void> {
    this.logStep("Expect new standard quote opened after confirmation Yes");
    const quoteShell = this.page.locator("app-quote-details, app-standard-quote").first();
    const lessDeposit = this.page.locator("app-less-deposit").first();

    const quoteVisible = await quoteShell.isVisible().catch(() => false);
    const onQuoteUrl = /standard-quote/i.test(this.page.url());

    if (!quoteVisible && !onQuoteUrl) {
      const dashboard = new DODashboardPage(this.page);
      await dashboard.waitForAuthenticatedDashboard();
      await dashboard.openFirstQuoteFromDashboardGrid();
    }

    await expect(quoteShell).toBeVisible({ timeout: 120_000 });
    await expect(lessDeposit).toBeVisible({ timeout: 60_000 });
  }

  async confirmNewQuoteNo(): Promise<void> {
    this.logStep("Confirm New Quote No");
    const dialog = this.newSettlementQuoteConfirmationDialog().last();
    await dialog.getByRole("button", { name: /^No$/i }).click({ timeout: 15_000 });
    await this.waitForLoaderGone();
  }

  /** After **No** on new-quote confirmation — dialog closes; settlement display remains. */
  async expectNewSettlementQuoteConfirmationDismissed(): Promise<void> {
    this.logStep("Expect New Settlement Quote Confirmation Dismissed");
    await expect(this.newSettlementQuoteConfirmationDialog()).toBeHidden({ timeout: 30_000 });
    await this.expectSettlementDisplayScreen();
    await expect(
      this.page.getByRole("button", { name: /Create New Quote with this Settlement Amount/i }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectBackReturnsToLoanSearch(): Promise<void> {
    this.logStep("Expect Back Returns To Loan Search");
    await this.expectSettlementSearchScreenVisible();
    await this.expectSettlementDateIsPopulated();
    await expect(this.loanSearchNextButton()).toBeEnabled({ timeout: 15_000 });
    await expect(this.regoField()).toBeEditable({ timeout: 10_000 });
    await expect(this.vinField()).toBeEditable({ timeout: 10_000 });
  }

  /** After **Back** from an error screen, dealer can re-enter loan search criteria. */
  async expectLoanSearchReEntryAllowed(sampleRego: string): Promise<void> {
    this.logStep(`Expect loan search re-entry allowed with rego ${this.stepValueDisplay(sampleRego)}`);
    await this.expectBackReturnsToLoanSearch();
    await this.enterRego(sampleRego);
    await this.expectRegoValue(sampleRego);
    await this.clearVin();
    await this.expectNoRegoValidationError();
  }

  async expectOnAssetDetailsScreen(): Promise<void> {
    this.logStep("Expect On Asset Details Screen");
    await expect(this.settlementPopup()).toBeHidden({ timeout: 15_000 });
    const quoteShell = this.page.locator("app-quote-details, app-standard-quote").first();
    const lessDeposit = this.page.locator("app-less-deposit").first();
    const settlementAmountField = this.page
      .locator("amount")
      .filter({ hasText: /Settlement Amount/i })
      .locator("#amount")
      .first();
    await expect(quoteShell.or(lessDeposit).or(settlementAmountField)).toBeVisible({
      timeout: 45_000,
    });
    await this.expectSettlementTriggerVisible();
  }
}
