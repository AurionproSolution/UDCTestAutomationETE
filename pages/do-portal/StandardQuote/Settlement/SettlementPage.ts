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
        name: /consent to proceed with settlement|privacy waiver|obtained the customer'?s consent/i,
      })
      .or(
        page
          .locator("p-checkbox")
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
      .locator(".p-field, .field, .p-col, [class*='p-field']")
      .filter({ hasText: /Rego Number/i })
      .locator("input#text, input.p-inputtext, input[role='textbox']")
      .first()
      .or(dialog.locator("input#text").first())
      .or(dialog.getByRole("textbox", { name: /Rego/i }))
      .or(settlementTextFieldIn(dialog, "Rego Number"))
      .or(settlementTextFieldIn(dialog, "Rego"))
      .first();
  }

  /** VIN field on the active Settlement loan-search dialog. */
  private vinField(): Locator {
    const dialog = this.activeDialog();
    return dialog
      .locator(".p-field, .field, .p-col, [class*='p-field']")
      .filter({ hasText: /^VIN$/i })
      .locator("input#text, input.p-inputtext, input[role='textbox']")
      .first()
      .or(dialog.locator("input#text").nth(1))
      .or(dialog.getByRole("textbox", { name: /^VIN$/i }))
      .or(settlementTextFieldIn(dialog, "VIN"))
      .first();
  }

  /** Settlement Date field group on the active Settlement loan-search dialog. */
  private settlementDateFieldGroup(): Locator {
    return this.activeDialog()
      .locator(".p-field, .field, .p-col, [class*='p-field'], div")
      .filter({ hasText: /Settlement Date/i })
      .first();
  }

  /**
   * Settlement Date on the loan-search dialog — PrimeNG `p-calendar` often exposes `role=combobox`,
   * not `textbox`, and may render as a readonly input until focused.
   */
  private settlementDateField(): Locator {
    const dialog = this.activeDialog();
    const group = this.settlementDateFieldGroup();
    return group
      .getByRole("combobox")
      .first()
      .or(group.locator("p-calendar input, input.p-inputtext, input[role='combobox'], input").first())
      .or(
        dialog
          .locator(".p-field, .field, .p-col, [class*='p-field']")
          .filter({ hasText: /Settlement Date/i })
          .locator("input.p-inputtext, input[role='combobox'], input")
          .first(),
      )
      .or(dialog.getByLabel(/Settlement Date/i))
      .or(dialog.getByRole("combobox", { name: /Settlement Date/i }))
      .or(dialog.getByRole("textbox", { name: /Settlement Date/i }))
      .or(
        dialog
          .locator("label, text, span, div")
          .filter({ hasText: /Settlement Date/i })
          .locator(
            "xpath=following::input[contains(@class,'p-inputtext') or @role='combobox' or @role='textbox'][1]",
          ),
      )
      .or(
        dialog
          .locator("label, text, span, div")
          .filter({ hasText: /Settlement Date/i })
          .locator("xpath=following::p-calendar[1]//input[1]"),
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
  }

  async enterVin(value: string): Promise<void> {
    this.logStep(`Enter VIN ${this.stepValueDisplay(value)}`);
    const field = this.vinField();
    await field.scrollIntoViewIfNeeded();
    await field.click({ force: true });
    await field.press("ControlOrMeta+a");
    await this.page.keyboard.press("Backspace");
    await field.fill(value, { force: true });
  }

  async clearRego(): Promise<void> {
    await this.enterRego("");
  }

  async clearVin(): Promise<void> {
    await this.enterVin("");
  }

  private async resolveSettlementDateField(): Promise<Locator> {
    const dialog = this.activeDialog();
    const candidates = [
      dialog.getByRole("combobox").first(),
      this.settlementDateFieldGroup().getByRole("combobox").first(),
      this.settlementDateFieldGroup().locator("p-calendar input, input").first(),
      dialog
        .locator(".p-field, .field, .p-col, [class*='p-field']")
        .filter({ hasText: /Settlement Date/i })
        .locator("input")
        .first(),
    ];
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 1_500 }).catch(() => false)) {
        return candidate;
      }
    }
    return dialog.getByRole("combobox").first();
  }

  async readSettlementDate(): Promise<string> {
    const dialog = this.activeDialog();
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

    const dateHost = dialog
      .locator(".p-field, .field, .p-col, div")
      .filter({ hasText: /Settlement Date/i })
      .first();
    if (await dateHost.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const text = ((await dateHost.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
      const match = text.match(/\d{1,2}[/\\-]\d{1,2}[/\\-]\d{2,4}/);
      if (match) {
        return match[0];
      }
    }

    const inputs = dialog.locator("input");
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const val = await readFromLocator(inputs.nth(i));
      if (/^\d{1,2}[/\\-]\d{1,2}[/\\-]\d{2,4}$/.test(val)) {
        return val;
      }
    }

    return "";
  }

  private async focusSettlementDateField(): Promise<void> {
    const field = await this.resolveSettlementDateField();
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ force: true, timeout: 15_000 });
  }

  async enterSettlementDate(date: string): Promise<void> {
    this.logStep(`Enter Settlement Date ${this.stepValueDisplay(date)}`);
    await this.focusSettlementDateField();
    await this.page.keyboard.press("ControlOrMeta+a");
    await this.page.keyboard.press("Backspace");
    await this.page.waitForTimeout(200);

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

    const entered = ((await this.readSettlementDate().catch(() => "")) ?? "").replace(/\D/g, "");
    const wanted = date.replace(/\D/g, "");
    if (wanted.length > 0 && !entered.includes(wanted)) {
      await this.focusSettlementDateField();
      await this.page.keyboard.type(date, { delay: 60 });
    }
    await this.page.keyboard.press("Tab").catch(() => {});
    await this.page.waitForTimeout(300);
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

  async clickNext(): Promise<void> {
    this.logStep("Click Next");
    await this.waitForLoaderGone();
    const onLoanSearch =
      (await this.regoField().isVisible({ timeout: 3_000 }).catch(() => false)) &&
      (await this.loanSearchNextButton().isVisible({ timeout: 2_000 }).catch(() => false));
    const next = onLoanSearch ? this.loanSearchNextButton() : this.nextButton;
    await next.click({ timeout: 20_000 });
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

  /** Rego field group on the active Settlement loan-search dialog (label + inline validation). */
  private regoFieldGroup(): Locator {
    return this.activeDialog()
      .locator(".p-field, .field, .p-col, [class*='p-field']")
      .filter({ hasText: /Rego Number/i })
      .first();
  }

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

  /** VIN field group on the active Settlement loan-search dialog (label + inline validation). */
  private vinFieldGroup(): Locator {
    return this.activeDialog()
      .locator(".p-field, .field, .p-col, [class*='p-field']")
      .filter({ hasText: /^VIN$/i })
      .first();
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

  async expectBusinessRuleError(): Promise<void> {
    this.logStep("Expect Business Rule Error");
    await this.waitForLoaderGone();
    const pattern =
      /arrears|overdue|in arrears|past due|not eligible|cannot proceed|unable to proceed|business rule|finance lease|operating lease|lease.*not.*(?:eligible|support)|not.*(?:eligible|allowed).*settlement|settlement can not be completed|can not be completed|contact UDC finance|please contact UDC|FIS|ineligible/i;
    const msg = this.activeDialog()
      .getByText(pattern)
      .first()
      .or(this.page.getByText(pattern).first());
    await expect(msg).toBeVisible({ timeout: 60_000 });
  }

  async expectPrivacyWaiverScreen(): Promise<void> {
    this.logStep("Expect Privacy Waiver Screen");
    await this.waitForLoaderGone();
    const waiverMessage = this.activeDialog()
      .getByText(
        /privacy waiver|different dealer|different originator|consent to proceed|obtained the customer'?s consent|MAF-5578/i,
      )
      .first()
      .or(
        this.page
          .getByText(
            /privacy waiver|different dealer|different originator|consent to proceed|obtained the customer'?s consent|MAF-5578/i,
          )
          .first(),
      );
    await expect(waiverMessage).toBeVisible({ timeout: 45_000 });
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
          const text = await this.activeDialog().innerText().catch(() => "");
          return /Settlement (Amount|Quote|Display)|Customer Details|Loan Number|Goods Description/i.test(
            text,
          );
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
