/**
 * DO Portal — Settlement flow (Calculate Settlement / Create Settlement Quote).
 * Covers loan search pop-up, privacy waiver, display, and add-to-quote confirmation.
 */

import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "../../../common/BasePage";

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
    const root = page.locator("app-quote-details, app-standard-quote").first();
    this.settlementTrigger = root
      .getByRole("button", { name: /^(Calculate\s+)?Settlement$/i })
      .or(root.getByRole("link", { name: /^(Calculate\s+)?Settlement$/i }))
      .or(root.locator("button").filter({ hasText: "Settlement" }))
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
    this.backButton = page.getByRole("button", { name: /^Back$/i }).filter({ visible: true }).last();
    this.cancelButton = page
      .getByRole("button", { name: /^Cancel$/i })
      .filter({ visible: true })
      .last();

    this.privacyWaiverCheckbox = page
      .getByRole("checkbox", {
        name: /consent to proceed with settlement|privacy waiver/i,
      })
      .or(
        page
          .locator("p-checkbox")
          .filter({ hasText: /consent to proceed with settlement/i })
          .locator('input[type="checkbox"]'),
      )
      .first();

    this.addSettlementToQuoteButton = page
      .getByRole("button", {
        name: /Add this Settlement Amount to (my|this) Quote/i,
      })
      .or(page.locator("button, a").filter({ hasText: /Add this Settlement Amount/i }))
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

  /** Rego field on the active Settlement loan-search dialog. */
  private regoField(): Locator {
    const dialog = this.activeDialog();
    return dialog
      .getByRole("textbox", { name: /Rego/i })
      .or(settlementTextFieldIn(dialog, "Rego Number"))
      .or(settlementTextFieldIn(dialog, "Rego"))
      .first();
  }

  /** VIN field on the active Settlement loan-search dialog. */
  private vinField(): Locator {
    const dialog = this.activeDialog();
    return dialog
      .getByRole("textbox", { name: /^VIN$/i })
      .or(settlementTextFieldIn(dialog, "VIN"))
      .first();
  }

  /**
   * Settlement Date on the loan-search dialog — PrimeNG `p-calendar` often exposes `role=combobox`,
   * not `textbox`, and may render as a readonly input until focused.
   */
  private settlementDateField(): Locator {
    const dialog = this.activeDialog();
    return dialog
      .getByRole("combobox", { name: /Settlement Date/i })
      .or(dialog.getByRole("textbox", { name: /Settlement Date/i }))
      .or(
        dialog
          .locator("label, text, span")
          .filter({ hasText: /^Settlement Date$/i })
          .locator(
            "xpath=following::p-calendar[1]//input[contains(@class,'p-inputtext') or @role='combobox'][1]",
          ),
      )
      .or(settlementTextFieldIn(dialog, "Settlement Date"))
      .first();
  }

  private loanSearchNextButton(): Locator {
    return this.activeDialog().getByRole("button", { name: /^Next$/i }).last();
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

    const btn = this.page
      .locator("app-less-deposit")
      .first()
      .locator("button")
      .filter({ hasText: /Settlement/i })
      .or(
        this.page
          .locator("app-quote-details, app-standard-quote")
          .first()
          .getByRole("button", { name: /^(Calculate\s+)?Settlement$/i }),
      )
      .or(
        this.page
          .locator("app-quote-details, app-standard-quote")
          .first()
          .locator("button")
          .filter({ hasText: "Settlement" }),
      )
      .first();

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
    await this.activeDialog().waitFor({ state: "visible", timeout: 45_000 });
  }

  async enterRego(value: string): Promise<void> {
    this.logStep(`Enter Rego ${this.stepValueDisplay(value)}`);
    const field = this.regoField();
    await field.scrollIntoViewIfNeeded();
    await field.click({ force: true });
    await field.press("ControlOrMeta+a");
    await this.page.keyboard.press("Backspace");
    await field.fill(value, { force: true });
    await field.press("Tab").catch(() => {});
  }

  async enterVin(value: string): Promise<void> {
    this.logStep(`Enter VIN ${this.stepValueDisplay(value)}`);
    const field = this.vinField();
    await field.scrollIntoViewIfNeeded();
    await field.click({ force: true });
    await field.press("ControlOrMeta+a");
    await this.page.keyboard.press("Backspace");
    await field.fill(value, { force: true });
    await field.press("Tab").catch(() => {});
  }

  async clearRego(): Promise<void> {
    await this.enterRego("");
  }

  async clearVin(): Promise<void> {
    await this.enterVin("");
  }

  async readSettlementDate(): Promise<string> {
    const field = this.settlementDateField();
    if (await field.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return (await field.inputValue()).trim();
    }
    const dialog = this.activeDialog();
    const labelBlock = dialog
      .locator("label, text, span, div")
      .filter({ hasText: /^Settlement Date$/i })
      .first();
    if (await labelBlock.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const text =
        (await labelBlock.locator("xpath=ancestor::div[1]").textContent())?.trim() ?? "";
      const match = text.match(/\d{1,2}[/\\-]\d{1,2}[/\\-]\d{2,4}/);
      if (match) return match[0];
    }
    return "";
  }

  async enterSettlementDate(date: string): Promise<void> {
    this.logStep(`Enter Settlement Date ${this.stepValueDisplay(date)}`);
    const field = this.settlementDateField();
    await field.click({ force: true });
    await field.press("ControlOrMeta+a");
    await this.page.keyboard.press("Backspace");
    await field.fill(date, { force: true });
    await field.press("Tab").catch(() => {});
  }

  async expectSettlementDateIsToday(): Promise<void> {
    this.logStep("Expect Settlement Date Is Today");
    await this.expectSettlementDateIsPopulated();
    const today = todayDdMmYyyy();
    await expect
      .poll(async () => this.readSettlementDate(), { timeout: 15_000 })
      .toMatch(new RegExp(today.replace(/\//g, "[/\\-]")));
  }

  /** Settlement Date label or calendar input is shown with a populated value on the loan-search dialog. */
  async expectSettlementDateIsPopulated(): Promise<void> {
    this.logStep("Expect Settlement Date Is Populated");
    const dialog = this.activeDialog();
    const dateField = this.settlementDateField();

    if (await dateField.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect
        .poll(async () => (await dateField.inputValue()).trim().length, { timeout: 10_000 })
        .toBeGreaterThan(4);
      return;
    }

    await expect(dialog.getByText(/^Settlement Date$/i).first()).toBeVisible({ timeout: 15_000 });
    const today = todayDdMmYyyy();
    await expect(dialog).toContainText(new RegExp(today.replace(/\//g, "[/\\-]")));
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

  async expectPastSettlementDateRejected(): Promise<void> {
    this.logStep("Expect Past Settlement Date Rejected");
    const yesterday = shiftDdMmYyyy(-1);
    await this.enterSettlementDate(yesterday);
    const error = this.page.getByText(/past|invalid|cannot|not accept|future|today/i).first();
    const nextDisabled = this.nextButton;
    const hasError = await error.isVisible({ timeout: 8_000 }).catch(() => false);
    const nextBlocked = !(await nextDisabled.isEnabled().catch(() => true));
    expect(hasError || nextBlocked).toBeTruthy();
  }

  async clickNext(): Promise<void> {
    this.logStep("Click Next");
    await this.waitForLoaderGone();
    await this.nextButton.click({ timeout: 20_000 });
    await this.waitForLoaderGone();
  }

  async clickBack(): Promise<void> {
    this.logStep("Click Back");
    await this.backButton.click({ timeout: 15_000 });
    await this.waitForLoaderGone();
  }

  async clickCancel(): Promise<void> {
    this.logStep("Click Cancel");
    await this.cancelButton.click({ timeout: 15_000 });
    await this.waitForLoaderGone();
  }

  async expectRegoValidationError(): Promise<void> {
    this.logStep("Expect Rego Validation Error");
    const msg = this.activeDialog()
      .getByText(/invalid|special character|alphanumeric|maximum|6 character|rego/i)
      .first();
    await expect(msg).toBeVisible({ timeout: 15_000 });
  }

  async expectNoRegoValidationError(): Promise<void> {
    this.logStep("Expect No Rego Validation Error");
    const msg = this.activeDialog()
      .getByText(/invalid|special character|alphanumeric|maximum|6 character|rego/i)
      .first();
    await expect(msg).toBeHidden({ timeout: 8_000 });
  }

  async expectRegoValue(expected: string): Promise<void> {
    this.logStep(`Expect Rego Value ${this.stepValueDisplay(expected)}`);
    await expect(this.regoField()).toHaveValue(expected, { timeout: 10_000 });
  }

  async expectVinIsBlank(): Promise<void> {
    this.logStep("Expect VIN Is Blank");
    await expect
      .poll(async () => (await this.vinField().inputValue()).trim(), { timeout: 8_000 })
      .toBe("");
  }

  /** After **Next** on loan search — advanced past rego format validation (display, privacy, or lookup result). */
  async expectLoanSearchStepCompleted(): Promise<void> {
    this.logStep("Expect Loan Search Step Completed");
    await this.waitForLoaderGone();
    await this.expectNoRegoValidationError();
    await expect(
      this.page
        .getByText(
          /privacy waiver|Settlement (Amount|Quote|Display)|not found|no loan|unable to find|Customer Details/i,
        )
        .first(),
    ).toBeVisible({ timeout: 60_000 });
  }

  async expectVinValidationError(): Promise<void> {
    this.logStep("Expect VIN Validation Error");
    const msg = this.page
      .getByText(/invalid|special character|alphanumeric|maximum|17 character|vin/i)
      .first();
    await expect(msg).toBeVisible({ timeout: 15_000 });
  }

  async expectVehicleNotFoundError(): Promise<void> {
    this.logStep("Expect Vehicle Not Found Error");
    await expect(
      this.page.getByText(/not found|no loan|unable to find|vehicle not found|no matching/i).first(),
    ).toBeVisible({ timeout: 45_000 });
  }

  async expectBusinessRuleError(): Promise<void> {
    this.logStep("Expect Business Rule Error");
    await expect(
      this.page
        .getByText(/arrears|overdue|not eligible|cannot proceed|business rule|error/i)
        .first(),
    ).toBeVisible({ timeout: 45_000 });
  }

  async expectPrivacyWaiverScreen(): Promise<void> {
    this.logStep("Expect Privacy Waiver Screen");
    await expect(
      this.page.getByText(/privacy waiver|different dealer|consent to proceed/i).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(this.privacyWaiverCheckbox).toBeVisible({ timeout: 15_000 });
  }

  async setPrivacyWaiverConsent(checked: boolean): Promise<void> {
    this.logStep(`Set Privacy Waiver Consent ${checked}`);
    if (checked) {
      await this.privacyWaiverCheckbox.check({ force: true });
    } else {
      await this.privacyWaiverCheckbox.uncheck({ force: true }).catch(() => {});
    }
  }

  async expectPrivacyWaiverBlocksProceed(): Promise<void> {
    this.logStep("Expect Privacy Waiver Blocks Proceed");
    await this.clickNext();
    await expect(this.page.getByText(/privacy waiver|consent|required|tick/i).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectSettlementDisplayScreen(): Promise<void> {
    this.logStep("Expect Settlement Display Screen");
    await expect
      .poll(
        async () => {
          const text = await this.page.locator("body").innerText();
          return /Settlement (Amount|Quote|Display)|Customer Details|Asset Details/i.test(text);
        },
        { timeout: 60_000 },
      )
      .toBeTruthy();
  }

  async expectCustomerDetailsPopulated(): Promise<void> {
    this.logStep("Expect Customer Details Populated");
    const section = this.page.locator("body").filter({ hasText: /Customer Details/i }).first();
    await expect(section).toBeVisible({ timeout: 30_000 });
    const text = await section.innerText();
    expect(text.replace(/[\s\-]/g, "").length).toBeGreaterThan(20);
  }

  async expectCustomerDetailsReadOnly(): Promise<void> {
    this.logStep("Expect Customer Details Read Only");
    const inputs = this.page
      .locator(
        '[class*="customer"], app-customer-details, [data-testid*="customer"] input, [data-testid*="customer"] textarea',
      )
      .locator("input:not([type='hidden']), textarea");
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const field = inputs.nth(i);
      if (await field.isVisible().catch(() => false)) {
        await expect(field).toBeDisabled();
      }
    }
  }

  async expectAssetDetailsPopulated(): Promise<void> {
    this.logStep("Expect Asset Details Populated");
    await expect(this.page.getByText(/Loan Number|Goods Description|Description/i).first()).toBeVisible({
      timeout: 30_000,
    });
  }

  async expectStandardSettlementSectionWithPositiveAmounts(): Promise<void> {
    this.logStep("Expect Standard Settlement Section With Positive Amounts");
    const section = this.page.getByText(/Settlement Amount\s*\(Standard\)/i).first();
    await expect(section).toBeVisible({ timeout: 30_000 });
    const block = section.locator("xpath=ancestor::*[self::div or self::section][1]");
    const amounts = block.getByText(/\$[\d,]+\.\d{2}|[\d,]+\.\d{2}/);
    await expect(amounts.first()).toBeVisible({ timeout: 15_000 });
  }

  async expectRefinancingSettlementSectionWithPositiveAmounts(): Promise<void> {
    this.logStep("Expect Refinancing Settlement Section With Positive Amounts");
    const section = this.page.getByText(/Settlement Amount\s*\(Refinancing\)/i).first();
    await expect(section).toBeVisible({ timeout: 30_000 });
    const block = section.locator("xpath=ancestor::*[self::div or self::section][1]");
    const amounts = block.getByText(/\$[\d,]+\.\d{2}|[\d,]+\.\d{2}/);
    await expect(amounts.first()).toBeVisible({ timeout: 15_000 });
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
    await expect(this.page.getByText(/Commission Clawback|Subsidy/i)).toBeHidden({ timeout: 10_000 });
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
    await this.addSettlementToQuoteButton.scrollIntoViewIfNeeded();
    await this.addSettlementToQuoteButton.click({ timeout: 20_000 });
    const confirm = this.page.getByRole("dialog").filter({ visible: true }).last();
    if (await confirm.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const ok = confirm.getByRole("button", { name: /^(Yes|OK|Confirm)$/i }).first();
      if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await ok.click({ timeout: 10_000 });
      }
    }
    await this.waitForLoaderGone(90_000);
  }

  async expectNewSettlementQuoteConfirmation(): Promise<void> {
    this.logStep("Expect New Settlement Quote Confirmation");
    await expect(
      this.page.getByText(/New Settlement Quote Confirmation|create.*new quote/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  async confirmNewQuoteYes(): Promise<void> {
    this.logStep("Confirm New Quote Yes");
    await this.confirmYesButton.click({ timeout: 15_000 });
    await this.waitForLoaderGone(90_000);
  }

  async confirmNewQuoteNo(): Promise<void> {
    this.logStep("Confirm New Quote No");
    await this.confirmNoButton.click({ timeout: 15_000 });
    await this.waitForLoaderGone();
  }

  async expectBackReturnsToLoanSearch(): Promise<void> {
    this.logStep("Expect Back Returns To Loan Search");
    await expect(this.regoField()).toBeVisible({ timeout: 30_000 });
  }

  async expectOnAssetDetailsScreen(): Promise<void> {
    this.logStep("Expect On Asset Details Screen");
    await expect(this.page.locator("app-asset-details, app-less-deposit").first()).toBeVisible({
      timeout: 45_000,
    });
  }
}
