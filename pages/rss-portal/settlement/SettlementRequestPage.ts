/**
 * RSS Portal — Formal settlement quote request (from loan Settlements tab).
 */

import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export type FormalSettlementQuoteData = {
  settlementDate?: string;
  paymentMethod?: RegExp | string;
  reason?: RegExp | string;
  sourceOfFunds?: string;
  note?: string;
  preferredContactMethod?: RegExp | string;
  preferredContactTime?: RegExp | string;
};

export class RSSSettlementRequestPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  protected stepLogPrefix(): string {
    return "RSS Portal — Settlement Request";
  }

  private settlementFormRoot(): Locator {
    return this.page
      .locator("app-settlement-request, app-formal-settlement, app-reqdropdown")
      .filter({ hasText: /Settlement Date|Formal Settlement|Settlement Quote/i })
      .first()
      .or(
        this.page
          .locator("app-settlement")
          .filter({ has: this.page.locator('input[name*="settlement" i], textarea#note') })
          .first(),
      );
  }

  async expectFormalSettlementQuoteFormVisible(): Promise<void> {
    this.logStep("Expect Formal Settlement Quote Form Visible");
    const root = this.settlementFormRoot();
    await expect(root).toBeVisible({ timeout: 30_000 });
    await expect(
      this.page.getByText(/Settlement Date|Formal Settlement|Settlement Quote/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByRole("button", { name: /^Cancel$/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  private async isPrimeNgDropdownDisabled(dropdown: Locator): Promise<boolean> {
    const combobox = dropdown.locator('[role="combobox"]').first();
    if (
      await dropdown
        .evaluate((el) => el.classList.contains("p-disabled"))
        .catch(() => false)
    ) {
      return true;
    }
    if ((await combobox.getAttribute("aria-disabled").catch(() => null)) === "true") {
      return true;
    }
    return !(await combobox.isEnabled().catch(() => true));
  }

  private escapeRx(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private optionPatterns(optionLabel?: RegExp | string): RegExp[] {
    if (!optionLabel) {
      return [];
    }
    if (typeof optionLabel === "string") {
      return [new RegExp(this.escapeRx(optionLabel), "i")];
    }
    return [optionLabel];
  }

  private async openPrimeNgDropdownPanel(root: Locator): Promise<Locator> {
    await root.waitFor({ state: "visible", timeout: 15_000 });
    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root
      .locator(".p-dropdown-trigger, [aria-label='dropdown trigger']")
      .first();
    await combobox.scrollIntoViewIfNeeded();
    if (await combobox.isVisible().catch(() => false)) {
      await this.clickElement(combobox, 60_000);
    } else {
      await trigger.waitFor({ state: "visible", timeout: 15_000 });
      await this.clickElement(trigger, 60_000);
    }
    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await panel.waitFor({ state: "visible", timeout: 12_000 });
    return panel;
  }

  private async clickDropdownOption(panel: Locator, patterns: RegExp[]): Promise<boolean> {
    for (const pattern of patterns) {
      const row = panel
        .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
        .filter({ hasText: pattern })
        .first();
      if (await row.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await row.scrollIntoViewIfNeeded();
        try {
          await row.click({ timeout: 15_000 });
        } catch {
          await row.click({ force: true, timeout: 15_000 });
        }
        return true;
      }

      const byRole = this.page.getByRole("option", { name: pattern }).first();
      if (await byRole.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await byRole.scrollIntoViewIfNeeded();
        try {
          await byRole.click({ timeout: 15_000 });
        } catch {
          await byRole.click({ force: true, timeout: 15_000 });
        }
        return true;
      }
    }
    return false;
  }

  private async clickFirstDropdownOption(panel: Locator): Promise<boolean> {
    const items = panel.locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item");
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const text = (await item.innerText()).replace(/\s+/g, " ").trim();
      if (!text || /^--\s*select/i.test(text)) {
        continue;
      }
      await item.scrollIntoViewIfNeeded();
      try {
        await item.click({ timeout: 15_000 });
      } catch {
        await item.click({ force: true, timeout: 15_000 });
      }
      return true;
    }
    return false;
  }

  private async pickPrimeNgDropdownOption(
    root: Locator,
    optionLabel?: RegExp | string,
  ): Promise<void> {
    await root.waitFor({ state: "visible", timeout: 15_000 });
    if (await this.isPrimeNgDropdownDisabled(root)) {
      return;
    }

    const combobox = root.locator('[role="combobox"]').first();
    const optionPattern =
      typeof optionLabel === "string"
        ? new RegExp(this.escapeRx(optionLabel), "i")
        : optionLabel;
    const patterns = this.optionPatterns(optionLabel);

    if (optionPattern) {
      const currentLabel = ((await combobox.getAttribute("aria-label")) ?? "").trim();
      if (currentLabel && optionPattern.test(currentLabel)) {
        return;
      }
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.page.keyboard.press("Escape").catch(() => undefined);
      const panel = await this.openPrimeNgDropdownPanel(root);
      const clicked = patterns.length
        ? await this.clickDropdownOption(panel, patterns)
        : await this.clickFirstDropdownOption(panel);
      if (!clicked) {
        throw new Error(
          patterns.length
            ? `Dropdown option not found: ${String(optionLabel)}`
            : "No selectable dropdown options found.",
        );
      }

      await panel.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
      await this.waitForLoadingComplete();

      if (!optionPattern) {
        return;
      }

      const label = ((await combobox.getAttribute("aria-label")) ?? "").trim();
      if (optionPattern.test(label)) {
        return;
      }
    }

    if (optionPattern) {
      await expect
        .poll(
          async () => {
            const label = ((await combobox.getAttribute("aria-label")) ?? "").trim();
            return optionPattern.test(label);
          },
          { timeout: 15_000, intervals: [250, 500, 1_000] },
        )
        .toBe(true);
    }
  }

  private labelTextFromRegExp(label: RegExp): string {
    return label.source.replace(/\\/g, "").replace(/^\^|\$$/g, "");
  }

  private dropdownByLabel(root: Locator, label: RegExp): Locator {
    const labelText = this.labelTextFromRegExp(label);
    return root
      .locator("p-dropdown")
      .filter({ has: root.getByText(label) })
      .first()
      .or(
        root.locator(
          `xpath=.//*[self::label or self::span][contains(normalize-space(.),'${labelText}')]/following::p-dropdown[1]`,
        ),
      )
      .first();
  }

  private settlementDateInput(): Locator {
    return this.page.locator('input[name="settlementDate"]').filter({ visible: true }).first();
  }

  private settlementDateCalendarButton(): Locator {
    return this.settlementDateInput()
      .locator(
        "xpath=ancestor::*[contains(@class,'p-calendar') or contains(@class,'p-inputwrapper')][1]//button | following-sibling::*//button | ../button",
      )
      .first();
  }

  private formatSettlementDateNz(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private defaultSettlementDateValue(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.formatSettlementDateNz(tomorrow);
  }

  private async readSettlementDateValue(input: Locator): Promise<string> {
    const value = (await input.inputValue().catch(() => "")).trim();
    if (value.length > 0) {
      return value;
    }
    const attr = ((await input.getAttribute("value")) ?? "").trim();
    if (attr.length > 0) {
      return attr;
    }
    return "";
  }

  private settlementDateIsPopulated(value: string): boolean {
    return /\d{1,2}[/\\-]\d{1,2}[/\\-]\d{2,4}/.test(value);
  }

  private async enterSettlementDateValue(date: string): Promise<void> {
    const input = this.settlementDateInput();
    await input.scrollIntoViewIfNeeded();
    await input.click({ timeout: 15_000, force: true });
    await this.page.keyboard.press("ControlOrMeta+a").catch(() => undefined);
    await this.page.keyboard.press("Backspace").catch(() => undefined);

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
        .catch(() => undefined);
    }

    const entered = (await this.readSettlementDateValue(input)).replace(/\D/g, "");
    const wanted = date.replace(/\D/g, "");
    if (wanted.length > 0 && !entered.includes(wanted)) {
      await input.click({ force: true });
      await this.page.keyboard.type(date, { delay: 50 });
    }

    await input.press("Tab").catch(() => undefined);
    await this.waitForLoadingComplete();
  }

  private async pickEnabledDateFromVisibleCalendar(): Promise<void> {
    const calendar = this.page.locator(".p-datepicker").filter({ visible: true }).last();
    await calendar.waitFor({ state: "visible", timeout: 12_000 });
    const day = calendar
      .locator("td:not(.p-datepicker-other-month)")
      .filter({ has: calendar.locator("span:not(.p-disabled)") })
      .locator("span:not(.p-disabled)")
      .filter({ visible: true })
      .first();
    await day.scrollIntoViewIfNeeded();
    try {
      await day.click({ timeout: 15_000 });
    } catch {
      await day.click({ force: true, timeout: 15_000 });
    }
    await calendar.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
    await this.waitForLoadingComplete();
  }

  private async openSettlementDatePicker(): Promise<void> {
    const input = this.settlementDateInput();
    await input.scrollIntoViewIfNeeded();
    await input.click({ timeout: 15_000, force: true });
    const calendar = this.page.locator(".p-datepicker").filter({ visible: true }).last();
    if (await calendar.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return;
    }

    const trigger = this.settlementDateCalendarButton();
    if (await trigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await trigger.click({ timeout: 15_000, force: true });
    } else {
      await input.click({ timeout: 15_000, force: true });
    }
    await calendar.waitFor({ state: "visible", timeout: 12_000 });
  }

  private async expectSettlementDatePopulated(input: Locator): Promise<void> {
    await expect
      .poll(async () => this.settlementDateIsPopulated(await this.readSettlementDateValue(input)), {
        timeout: 15_000,
        intervals: [250, 500, 1_000],
      })
      .toBe(true);
  }

  private async pickSettlementDateFromPicker(): Promise<void> {
    const input = this.settlementDateInput();
    await expect(input).toBeVisible({ timeout: 15_000 });
    if (this.settlementDateIsPopulated(await this.readSettlementDateValue(input))) {
      return;
    }

    await this.enterSettlementDateValue(this.defaultSettlementDateValue());
    if (this.settlementDateIsPopulated(await this.readSettlementDateValue(input))) {
      return;
    }

    await this.openSettlementDatePicker();
    await this.pickEnabledDateFromVisibleCalendar();
    await this.expectSettlementDatePopulated(input);
  }

  private async fillSettlementDate(_root: Locator, date?: string): Promise<void> {
    const input = this.settlementDateInput();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }

    if (this.settlementDateIsPopulated(await this.readSettlementDateValue(input))) {
      return;
    }

    await this.enterSettlementDateValue(date ?? this.defaultSettlementDateValue());
    if (this.settlementDateIsPopulated(await this.readSettlementDateValue(input))) {
      return;
    }

    await this.pickSettlementDateFromPicker();
  }

  async fillFormalSettlementQuoteForm(data?: FormalSettlementQuoteData): Promise<void> {
    this.logStep("Fill Formal Settlement Quote Form");
    const message = data?.note ?? `Automation settlement quote ${Date.now()}`;
    const root = this.settlementFormRoot();

    await this.fillSettlementDate(root, data?.settlementDate);

    const paymentMethod = this.dropdownByLabel(root, /Payment Method/i);
    if (await paymentMethod.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.pickPrimeNgDropdownOption(
        paymentMethod,
        data?.paymentMethod ?? /Debit my nominated bank/i,
      );
    }

    const reason = this.dropdownByLabel(root, /^Reason$/i);
    if (await reason.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reason.scrollIntoViewIfNeeded();
      await this.pickPrimeNgDropdownOption(reason, data?.reason ?? /Bank Consolidation/i);
    }

    const sourceOfFunds = root
      .getByLabel(/Source of Funds/i)
      .or(
        root.locator(
          "xpath=.//*[contains(normalize-space(.),'Source of Funds')]/following::input[1]",
        ),
      )
      .first();
    if (await sourceOfFunds.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.clickAndFillElement(sourceOfFunds, data?.sourceOfFunds ?? "Automation funds");
    }

    const noteField = root
      .getByLabel(/^Note$/i)
      .or(root.locator("textarea").first())
      .first();
    if (await noteField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const value = (await noteField.inputValue().catch(() => "")).trim();
      if (!value) {
        await this.clickAndFillElement(noteField, message);
      }
    }

    const preferredContactMethod = data?.preferredContactMethod ?? /Email/i;
    const contactMethod = this.dropdownByLabel(root, /Preferred Contact Method/i);
    if (await contactMethod.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.pickPrimeNgDropdownOption(contactMethod, preferredContactMethod);
    }

    const contactMethodIsEmail =
      typeof preferredContactMethod === "string"
        ? /email/i.test(preferredContactMethod)
        : /email/i.test(preferredContactMethod.source);

    const contactTime = this.dropdownByLabel(root, /Preferred Contact Time/i);
    if (
      !contactMethodIsEmail &&
      (await contactTime.isVisible({ timeout: 3_000 }).catch(() => false))
    ) {
      if (!(await this.isPrimeNgDropdownDisabled(contactTime))) {
        const face = contactTime.locator('[role="combobox"]').first();
        const display = ((await face.getAttribute("aria-label")) ?? "").trim();
        if (!display || /^--\s*select/i.test(display)) {
          await this.pickPrimeNgDropdownOption(contactTime, data?.preferredContactTime);
        }
      }
    }

    const emptyDropdowns = root.locator("p-dropdown .p-dropdown-label-empty");
    const dropdownCount = await emptyDropdowns.count();
    for (let i = 0; i < dropdownCount; i++) {
      const dropdown = emptyDropdowns.nth(i).locator("xpath=ancestor::p-dropdown[1]");
      if (!(await dropdown.isVisible().catch(() => false))) {
        continue;
      }
      if (await this.isPrimeNgDropdownDisabled(dropdown)) {
        continue;
      }
      await this.pickPrimeNgDropdownOption(dropdown);
    }

    const emptyInputs = root.locator(
      "input:visible:not([type='hidden']):not([type='checkbox']):not([type='radio'])",
    );
    const inputCount = await emptyInputs.count();
    for (let i = 0; i < inputCount; i++) {
      const input = emptyInputs.nth(i);
      if (!(await input.isEditable().catch(() => false))) continue;
      const value = (await input.inputValue()).trim();
      if (!value) {
        await input.fill(message.slice(0, 50));
      }
    }
  }

  submitSettlementRequestButton(): Locator {
    return this.page.getByRole("button", { name: /^Send$|^Submit$/i }).first();
  }

  async submitSettlementRequest(): Promise<void> {
    this.logStep("Submit Settlement Request");
    await this.clickElement(this.submitSettlementRequestButton());
    await this.waitForLoadingComplete();
  }

  viewMyRequestButton(): Locator {
    return this.page.getByRole("button", { name: /View my request/i });
  }

  async expectSubmissionConfirmation(): Promise<void> {
    this.logStep("Expect Submission Confirmation");
    await expect(this.viewMyRequestButton()).toBeVisible({ timeout: 60_000 });
  }

  async clickViewMyRequest(): Promise<void> {
    this.logStep("Click View My Request");
    await this.clickElement(this.viewMyRequestButton());
    await this.waitForLoadingComplete();
  }

  async expectMyRequestsWithListedRequest(): Promise<void> {
    this.logStep("Expect My Requests With Listed Request");
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
    const firstRow = requestsTable.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const requestNoCell = firstRow.locator("td").first();
    await expect(requestNoCell).not.toBeEmpty();
    const requestNo = (await requestNoCell.innerText()).replace(/\s+/g, " ").trim();
    expect(requestNo.length).toBeGreaterThan(0);
  }

  cancelSettlementRequestButton(): Locator {
    return this.page.getByRole("button", { name: /^Cancel$/i }).first();
  }

  unsavedChangesDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ hasText: /Any unsaved changes will be lost/i })
      .first();
  }

  async submitAndExpectMandatoryFieldError(): Promise<void> {
    this.logStep("Submit And Expect Mandatory Field Error");
    await this.submitSettlementRequest();
    await expect(
      this.page
        .getByText(/Please Complete|fill.*mandatory|required field|complete all required/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectUnsavedChangesCancelDialog(): Promise<void> {
    this.logStep("Expect Unsaved Changes Cancel Dialog");
    const dialog = this.unsavedChangesDialog();
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toContainText(/Any unsaved changes will be lost/i);
    await expect(dialog.getByRole("button", { name: /^No$/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(dialog.getByRole("button", { name: /^Yes$/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  async clickCancelAndExpectUnsavedChangesDialog(): Promise<void> {
    this.logStep("Click Cancel And Expect Unsaved Changes Dialog");
    await this.clickElement(this.cancelSettlementRequestButton());
    await this.expectUnsavedChangesCancelDialog();
  }

  async expectSettlementCalendarPastDatesDisabled(): Promise<void> {
    this.logStep("Expect Settlement Calendar Past Dates Disabled");
    const input = this.settlementDateInput();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.click({ timeout: 15_000 });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const day = yesterday.getDate();
    const pastDay = this.page
      .locator(".p-datepicker-calendar td")
      .filter({ has: this.page.locator("span.p-disabled, span[aria-disabled='true']") })
      .filter({ hasText: new RegExp(`^${day}$`) })
      .first();
    await expect(pastDay).toBeVisible({ timeout: 10_000 });
    await this.page.keyboard.press("Escape").catch(() => undefined);
  }

  async expectSourceOfFundsMandatoryWhenAmountHigh(amountText: string): Promise<void> {
    this.logStep("Expect Source Of Funds Mandatory When Amount High");
    const root = this.settlementFormRoot();
    const sourceOfFunds = root
      .getByLabel(/Source of Funds/i)
      .or(
        root.locator(
          "xpath=.//*[contains(normalize-space(.),'Source of Funds')]/following::input[1]",
        ),
      )
      .first();
    await expect(sourceOfFunds).toBeVisible({ timeout: 15_000 });
    const numeric = Number(amountText.replace(/[^\d.]/g, ""));
    if (numeric >= 9999.99) {
      await this.submitSettlementRequest();
      await expect(
        this.page
          .getByText(/Please Complete|fill.*mandatory|required field|complete all required|Source of Funds/i)
          .first(),
      ).toBeVisible({ timeout: 15_000 });
    }
  }
}
