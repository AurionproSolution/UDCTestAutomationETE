/**
 * RSS Portal — Variation Request from an active loan (`app-reqdropdown` / variation flow).
 */

import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";
import { RSS_DEFAULT_APPLY_NOW_UPLOAD_PDF } from "../Applynow/ApplicationDocumentsPage";

export type VariationRequestCategory =
  | "Update Payment Details"
  | "Make a Lump Sum Payment"
  | "Variation Request"
  | "Request a Payment Arrangement";

export type UpdatePaymentSubRequestType =
  | "Change Payment Frequency"
  | "Change Payment Date";

export type PaymentArrangementOption =
  | "I would like to pay in full"
  | "I would like to set up a payment arrangement";

export type VariationRequestFormData = {
  note?: string;
  newPaymentFrequency?: RegExp | string;
  newPaymentDate?: string;
  amount?: string;
  sourceOfFunds?: string;
  paymentDate?: string;
  paymentOption?: RegExp | string;
  whatWouldYouLikeToOccur?: RegExp | string;
  preferredContactMethod?: RegExp | string;
  preferredContactTime?: RegExp | string;
  paymentArrangementOption?: PaymentArrangementOption;
  reasonForArrears?: string;
  repaymentAmount?: string;
  repaymentFrequency?: RegExp | string;
  startDate?: string;
  dateOfPayment?: string;
  paymentMethod?: RegExp | string;
  uploadDocumentPath?: string;
};

export class RSSVariationRequestPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  protected stepLogPrefix(): string {
    return "RSS Portal — Variation Request";
  }

  private variationRequestRoot(): Locator {
    return this.page.locator("app-reqdropdown, app-variation-request").first();
  }

  private pageDropdownByLabel(label: RegExp): Locator {
    const labelText = label.source.replace(/\\/g, "").replace(/^\^|\$$/g, "");
    return this.page
      .locator(
        `xpath=//*[self::label or self::span or self::generic][contains(normalize-space(.),'${labelText}')]/following::p-dropdown[1]`,
      )
      .first();
  }

  private calendarInputByLabel(label: RegExp): Locator {
    const labelText = label.source.replace(/\\/g, "").replace(/^\^|\$$/g, "");
    return this.page
      .locator(
        `xpath=//*[contains(normalize-space(.),'${labelText}')]/following::p-calendar//input[1] | //*[contains(normalize-space(.),'${labelText}')]/following::input[1]`,
      )
      .first();
  }

  private paymentArrangementFormSection(): Locator {
    return this.page.locator("app-reqdropdown").filter({ hasText: /Payment Options/i }).first();
  }

  private variationFormRoot(): Locator {
    return this.page
      .locator("div, section, form, base-form, .card-body, .p-card-content")
      .filter({ has: this.page.getByRole("heading", { name: /^Variation Request$/i }) })
      .filter({
        hasText:
          /Current Payment Frequency|New Payment Frequency|New Payment Date|Amount|Reason for Arrears|Payment Options|Source Of Funds|What Would You Like To Occur/i,
      })
      .last();
  }

  private async waitForVariationDetailForm(timeoutMs = 30_000): Promise<Locator> {
    await expect(this.page.getByText(/New Payment Frequency|New Payment Date/i).first()).toBeVisible({
      timeout: timeoutMs,
    });
    return this.variationFormRoot();
  }

  private labeledDropdown(label: RegExp): Locator {
    if (/sub request type/i.test(label.source)) {
      return this.page.locator(
        "xpath=//*[contains(normalize-space(.),'Sub Request Type')]/following::p-dropdown[1]",
      );
    }
    return this.page.locator(
      "xpath=//*[normalize-space(.)='Request Type *' or normalize-space(.)='Request Type']/following::p-dropdown[1]",
    );
  }

  private requestTypeDropdown(): Locator {
    return this.labeledDropdown(/Request Type/i);
  }

  private subRequestTypeDropdown(): Locator {
    return this.labeledDropdown(/Sub Request Type/i);
  }

  private requestTypeCombobox(): Locator {
    return this.requestTypeDropdown().locator('[role="combobox"]').first();
  }

  private subRequestTypeCombobox(): Locator {
    return this.subRequestTypeDropdown().locator('[role="combobox"]').first();
  }

  async expectVariationRequestScreen(): Promise<void> {
    this.logStep("Expect Variation Request Screen");
    await expect(this.page).toHaveURL(/\/rss\/(quotes-contracts|loans|my-requests)/i, {
      timeout: 30_000,
    });

    await expect(this.page.getByText(/Select Variation Request/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.page.getByText(/Request Type/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(this.requestTypeCombobox()).toBeVisible({ timeout: 10_000 });
  }

  async selectCategory(category: VariationRequestCategory | RegExp): Promise<void> {
    this.logStep(`Select Category — ${String(category)}`);
    await this.pickPrimeNgDropdownOptionByLabel(this.requestTypeDropdown(), category);
    const categoryPattern =
      typeof category === "string"
        ? new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        : category;
    if (/update\s+payment\s+details/i.test(categoryPattern.source)) {
      await expect(this.page.getByText(/Sub Request Type/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  }

  async expectCategorySelected(category: RegExp): Promise<void> {
    this.logStep(`Expect Category Selected — ${category}`);
    await expect(this.requestTypeCombobox()).toHaveAttribute("aria-label", category, {
      timeout: 15_000,
    });
  }

  async selectSubRequestType(subType: UpdatePaymentSubRequestType | RegExp): Promise<void> {
    this.logStep(`Select Sub Request Type — ${String(subType)}`);
    await expect(this.page.getByText(/Sub Request Type/i).first()).toBeVisible({
      timeout: 15_000,
    });
    const dropdown = this.subRequestTypeDropdown();
    await dropdown.waitFor({ state: "visible", timeout: 15_000 });
    await this.pickPrimeNgDropdownOptionByLabel(dropdown, subType);
    const pattern =
      typeof subType === "string"
        ? new RegExp(subType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        : subType;
    await expect(this.subRequestTypeCombobox()).toHaveAttribute("aria-label", pattern, {
      timeout: 15_000,
    });
  }

  private visibleActionButton(label: RegExp): Locator {
    return this.page
      .locator("button.p-button, gen-button button, button")
      .filter({ hasText: label })
      .filter({ visible: true })
      .last();
  }

  selectionSubmitButton(): Locator {
    return this.visibleActionButton(/^Submit$/i);
  }

  /** Submit on the “Select Variation Request” screen — opens disclaimer / detail form. */
  async submitRequestTypeSelection(): Promise<void> {
    this.logStep("Submit Request Type Selection");
    await this.acceptDisclaimerIfVisible(3_000);
    const submit = this.selectionSubmitButton();
    await submit.scrollIntoViewIfNeeded();
    try {
      await this.clickElement(submit, 60_000);
    } catch {
      await submit.click({ force: true, timeout: 15_000 });
    }
    await this.waitForLoadingComplete();
  }

  private disclaimerDialog(): Locator {
    return this.page
      .locator("ion-modal, p-dynamicdialog, [role='dialog'], .p-dialog")
      .filter({ hasText: /Disclaimer/i })
      .last();
  }

  private async isDisclaimerContinueEnabled(dialog: Locator): Promise<boolean> {
    const continueButton = dialog.getByRole("button", { name: /^Continue$/i });
    return continueButton.isEnabled().catch(() => false);
  }

  private async acknowledgeDisclaimerDialog(dialog: Locator): Promise<void> {
    if (await this.isDisclaimerContinueEnabled(dialog)) {
      return;
    }

    const disclaimerBody = dialog
      .locator(".p-dialog-content, .p-dialog-content-scrollable, [class*='scroll']")
      .first();
    if (await disclaimerBody.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await disclaimerBody.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
    }

    const ackTargets = [
      dialog.getByRole("checkbox", { name: /Please acknowledge the above/i }).first(),
      dialog.locator("p-checkbox .p-checkbox-box").first(),
      dialog.locator("p-checkbox").first(),
      dialog
        .getByText(/Please acknowledge the above/i)
        .locator("xpath=ancestor::*[contains(@class,'p-checkbox') or @role='checkbox' or contains(@class,'checkbox')][1]")
        .first(),
      dialog.getByText(/Please acknowledge the above/i).first(),
      dialog.locator("ion-checkbox").first(),
      dialog.locator('input[type="checkbox"]').first(),
    ];

    for (let attempt = 0; attempt < 3; attempt++) {
      if (await this.isDisclaimerContinueEnabled(dialog)) {
        return;
      }

      for (const target of ackTargets) {
        if (!(await target.isVisible({ timeout: 1_000 }).catch(() => false))) {
          continue;
        }
        await target.scrollIntoViewIfNeeded();
        try {
          await target.click({ timeout: 10_000 });
        } catch {
          await target.click({ force: true, timeout: 10_000 });
        }
        if (await this.isDisclaimerContinueEnabled(dialog)) {
          return;
        }
      }
    }

    const hiddenInput = dialog.locator("p-checkbox input[type='checkbox']").first();
    if (await hiddenInput.count()) {
      await hiddenInput.evaluate((el) => {
        const input = el as HTMLInputElement;
        input.checked = true;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }

    await expect
      .poll(() => this.isDisclaimerContinueEnabled(dialog), {
        timeout: 15_000,
        intervals: [250, 500, 1_000],
      })
      .toBe(true);
  }

  async acceptDisclaimerIfVisible(timeoutMs = 30_000): Promise<void> {
    this.logStep("Accept Disclaimer If Visible");
    const dialog = this.disclaimerDialog();
    const visible = await dialog.isVisible({ timeout: timeoutMs }).catch(() => false);
    if (!visible) {
      return;
    }

    await this.acknowledgeDisclaimerDialog(dialog);

    const continueButton = dialog.getByRole("button", { name: /^Continue$/i });
    await expect(continueButton).toBeEnabled({ timeout: 15_000 });
    await this.clickElement(continueButton, 60_000);
    await dialog.waitFor({ state: "hidden", timeout: 20_000 }).catch(() => undefined);
    await this.waitForLoadingComplete();
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

  private async pickPrimeNgDropdownOptionByLabel(
    comboboxOrRoot: Locator,
    optionLabel?: RegExp | string,
  ): Promise<void> {
    const combobox = comboboxOrRoot.locator('[role="combobox"]').first();
    await combobox.waitFor({ state: "visible", timeout: 15_000 });
    const disabled =
      (await combobox.getAttribute("aria-disabled").catch(() => null)) === "true" ||
      !(await combobox.isEnabled().catch(() => true));
    if (disabled) {
      return;
    }

    const optionPattern =
      typeof optionLabel === "string"
        ? new RegExp(optionLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
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
      const panel = await this.openPrimeNgDropdownPanel(comboboxOrRoot);
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

  private dropdownByLabel(root: Locator, label: RegExp): Locator {
    const labelText = label.source.replace(/\\/g, "").replace(/^\^|\$$/g, "");
    return root
      .locator("p-dropdown")
      .filter({ has: root.getByText(label) })
      .first()
      .or(
        root.locator(
          `xpath=.//*[self::label or self::span or self::generic][contains(normalize-space(.),'${labelText}')]/following::p-dropdown[1]`,
        ),
      )
      .first();
  }

  private calendarInputByName(name: string): Locator {
    return this.page.locator(`p-calendar input[name="${name}"], input[name="${name}"]`).first();
  }

  private async fillCalendarInput(input: Locator, value: string): Promise<void> {
    await input.waitFor({ state: "visible", timeout: 10_000 });
    await input.click({ timeout: 15_000 });
    await input.fill(value);
    await input.press("Tab").catch(() => undefined);
    await this.waitForLoadingComplete();
  }

  private async fillPreferredContactFields(
    root: Locator,
    data?: VariationRequestFormData,
  ): Promise<void> {
    const contactMethod = root
      .locator("p-dropdown#preferredContactMethod")
      .or(this.dropdownByLabel(root, /Preferred Contact Method/i))
      .or(this.pageDropdownByLabel(/Preferred Contact Method/i))
      .first();
    if (await contactMethod.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await contactMethod.scrollIntoViewIfNeeded();
      await this.pickPrimeNgDropdownOptionByLabel(
        contactMethod,
        data?.preferredContactMethod ?? /Email/i,
      );
    }

    const contactTime = root
      .locator("p-dropdown#preferredContactTime")
      .or(this.dropdownByLabel(root, /Preferred Contact Time/i))
      .or(this.pageDropdownByLabel(/Preferred Contact Time/i))
      .first();
    if (await contactTime.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const face = contactTime.locator('[role="combobox"]').first();
      const display = ((await face.getAttribute("aria-label")) ?? "").trim();
      if (!display || /^--\s*select/i.test(display)) {
        await contactTime.scrollIntoViewIfNeeded();
        await this.pickPrimeNgDropdownOptionByLabel(
          contactTime,
          data?.preferredContactTime ?? /Morning|Afternoon|Any time|AM|PM/i,
        );
      }
    }
  }

  private reasonForArrearsField(): Locator {
    return this.page
      .locator(
        "xpath=//*[normalize-space(.)='Reason for Arrears*' or normalize-space(.)='Reason for Arrears']/following::textarea[1] | //*[normalize-space(.)='Reason for Arrears*' or normalize-space(.)='Reason for Arrears']/following::input[1]",
      )
      .first();
  }

  private variationNoteField(): Locator {
    return this.page
      .locator(
        "xpath=//*[self::label or self::span or self::generic][normalize-space(.)='Note' or normalize-space(.)='Note ']/following::textarea[1] | //*[self::label or self::span or self::generic][normalize-space(.)='Note' or normalize-space(.)='Note ']/following::input[1]",
      )
      .first();
  }

  private async fillDateFieldByLabel(label: RegExp, value: string): Promise<void> {
    const input = this.calendarInputByLabel(label);
    if (await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.fillCalendarInput(input, value);
      return;
    }

    const labelText = label.source.replace(/\\/g, "").replace(/^\^|\$$/g, "");
    const combobox = this.page
      .locator(
        `xpath=//*[contains(normalize-space(.),'${labelText}')]/following::*[@role='combobox'][1]`,
      )
      .first();
    if (await combobox.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await combobox.scrollIntoViewIfNeeded();
      await combobox.click({ timeout: 15_000 });
      await combobox.fill(value);
      await combobox.press("Enter").catch(() => undefined);
      await combobox.press("Tab").catch(() => undefined);
      await this.waitForLoadingComplete();
      return;
    }

    const calendarTrigger = this.page
      .locator(
        `xpath=//*[contains(normalize-space(.),'${labelText}')]/following::p-calendar[1]//button | //*[contains(normalize-space(.),'${labelText}')]/following::*[contains(@class,'p-datepicker')][1]`,
      )
      .first();
    if (await calendarTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await calendarTrigger.click({ timeout: 15_000 });
      const day = this.page
        .locator(".p-datepicker-calendar td span:not(.p-disabled):not(.p-datepicker-other-month)")
        .filter({ visible: true })
        .last();
      await day.click({ timeout: 15_000 });
      await this.waitForLoadingComplete();
    }
  }

  private async fillNoteField(root: Locator, note: string, required = false): Promise<void> {
    const noteField = root
      .locator("#notes, #note, textarea[name='note'], textarea[formcontrolname='notes']")
      .or(root.getByLabel(/^Note$/i))
      .or(root.locator("textarea:visible"))
      .first();
    if (await noteField.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const value = (await noteField.inputValue().catch(() => "")).trim();
      if (!value || required) {
        await this.clickAndFillElement(noteField, note);
      }
    }
  }

  async fillChangePaymentFrequencyForm(data?: VariationRequestFormData): Promise<void> {
    this.logStep("Fill Change Payment Frequency Form");
    const note = data?.note ?? `Automation change payment frequency ${Date.now()}`;
    const root = await this.waitForVariationDetailForm();

    const frequencyDropdown = this.dropdownByLabel(root, /New Payment Frequency/i);
    await this.pickPrimeNgDropdownOptionByLabel(
      frequencyDropdown,
      data?.newPaymentFrequency ?? /Fortnightly|Weekly/i,
    );
    await this.fillNoteField(root, note);
    await this.fillPreferredContactFields(root, data);
  }

  async fillChangePaymentDateForm(data?: VariationRequestFormData): Promise<void> {
    this.logStep("Fill Change Payment Date Form");
    const note = data?.note ?? `Automation change payment date ${Date.now()}`;
    const root = await this.waitForVariationDetailForm();

    const dateInput = root
      .locator('input[name="newPaymentDate"], p-calendar input')
      .or(this.calendarInputByName("newPaymentDate"))
      .first();
    const dateValue =
      data?.newPaymentDate ??
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-NZ");
    await this.fillCalendarInput(dateInput, dateValue);
    await this.fillNoteField(root, note);
    await this.fillPreferredContactFields(root, data);
  }

  async fillLumpSumPaymentForm(data?: VariationRequestFormData): Promise<void> {
    this.logStep("Fill Lump Sum Payment Form");
    const note = data?.note ?? `Automation lump sum payment ${Date.now()}`;
    await expect(this.page.getByRole("heading", { name: /^Variation Request$/i })).toBeVisible({
      timeout: 30_000,
    });
    const root = this.variationFormRoot();

    const amountInput = root.locator("#amount, input[currencymask]").first();
    await amountInput.waitFor({ state: "visible", timeout: 15_000 });
    await amountInput.scrollIntoViewIfNeeded();
    await amountInput.click({ timeout: 15_000 });
    await amountInput.fill("");
    await amountInput.pressSequentially(data?.amount ?? "1000", { delay: 50 });
    await amountInput.press("Tab").catch(() => undefined);
    await this.waitForLoadingComplete();

    const sourceOfFunds = root
      .getByLabel(/Source Of Funds/i)
      .or(root.locator("xpath=.//*[contains(.,'Source Of Funds')]/following::input[1]"))
      .first();
    if (await sourceOfFunds.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sourceOfFunds.scrollIntoViewIfNeeded();
      await this.clickAndFillElement(
        sourceOfFunds,
        data?.sourceOfFunds ?? "Automation savings",
      );
      await sourceOfFunds.press("Tab").catch(() => undefined);
      await this.waitForLoadingComplete();
    }

    const paymentDate = this.calendarInputByName("proposedPaymentDate");
    if (await paymentDate.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await paymentDate.scrollIntoViewIfNeeded();
      await this.fillCalendarInput(
        paymentDate,
        data?.paymentDate ??
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-NZ"),
      );
    }

    const paymentOption = this.dropdownByLabel(root, /Payment Option/i);
    if (await paymentOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await paymentOption.scrollIntoViewIfNeeded();
      await this.pickPrimeNgDropdownOptionByLabel(
        paymentOption,
        data?.paymentOption ?? /I would like to pay UDC Directly|UDC Directly/i,
      );
    }

    const occurDropdown = this.dropdownByLabel(root, /What Would You Like To Occur/i);
    await occurDropdown.scrollIntoViewIfNeeded();
    await this.pickPrimeNgDropdownOptionByLabel(
      occurDropdown,
      data?.whatWouldYouLikeToOccur ?? /Reduce term|Reduce payment/i,
    );

    await this.fillNoteField(root, note);
    await this.fillPreferredContactFields(root, data);
  }

  async fillGenericVariationRequestForm(data?: VariationRequestFormData): Promise<void> {
    this.logStep("Fill Generic Variation Request Form");
    const note = data?.note ?? `Automation variation request ${Date.now()}`;
    const root = this.page.locator(".form-content, app-reqdropdown").first();

    await this.fillNoteField(root, note, true);

    const fileInput = root.locator('input[type="file"]').first();
    if (await fileInput.count()) {
      await fileInput.setInputFiles(data?.uploadDocumentPath ?? RSS_DEFAULT_APPLY_NOW_UPLOAD_PDF);
      await this.waitForLoadingComplete();
    }

    await this.fillPreferredContactFields(root, data);
  }

  private async selectPaymentArrangementOption(option: string): Promise<void> {
    const optionPattern = new RegExp(
      option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    const nativeRadio = this.page.getByRole("radio", { name: optionPattern }).first();
    if (await nativeRadio.isVisible({ timeout: 5_000 }).catch(() => false)) {
      if (!(await nativeRadio.isChecked().catch(() => false))) {
        const label = this.page.getByText(optionPattern).first();
        await label.scrollIntoViewIfNeeded();
        await this.clickElement(label, 60_000);
        await this.waitForLoadingComplete();
      }
      return;
    }

    const radioBox = this.page
      .locator("p-radiobutton")
      .filter({ hasText: optionPattern })
      .locator(".p-radiobutton-box")
      .first();
    const alreadySelected = await this.page
      .locator("p-radiobutton")
      .filter({ hasText: optionPattern })
      .locator(".p-radiobutton-checked, [aria-checked='true']")
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (alreadySelected) {
      return;
    }

    await radioBox.scrollIntoViewIfNeeded();
    await this.clickElement(radioBox, 60_000);
    await this.waitForLoadingComplete();
  }

  async fillPaymentArrangementForm(data?: VariationRequestFormData): Promise<void> {
    this.logStep("Fill Payment Arrangement Form");
    const note = data?.note ?? `Automation payment arrangement ${Date.now()}`;
    await expect(this.page.getByRole("heading", { name: /^Variation Request$/i })).toBeVisible({
      timeout: 30_000,
    });
    const option =
      data?.paymentArrangementOption ?? "I would like to pay in full";

    await this.selectPaymentArrangementOption(option);

    const reasonField = this.reasonForArrearsField();
    await reasonField.waitFor({ state: "visible", timeout: 15_000 });
    await reasonField.scrollIntoViewIfNeeded();
    await this.clickAndFillElement(
      reasonField,
      data?.reasonForArrears ?? "Automation hardship reason",
    );
    await reasonField.press("Tab").catch(() => undefined);
    await this.waitForLoadingComplete();

    if (/arrangement/i.test(option)) {
      const repaymentAmount = this.page.locator("#amount, input[currencymask]").last();
      if (await repaymentAmount.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await repaymentAmount.scrollIntoViewIfNeeded();
        await repaymentAmount.click({ timeout: 15_000 });
        await repaymentAmount.fill("");
        await repaymentAmount.pressSequentially(data?.repaymentAmount ?? "500", { delay: 50 });
        await repaymentAmount.press("Tab").catch(() => undefined);
        await this.waitForLoadingComplete();
      }

      const frequency = this.pageDropdownByLabel(/Repayment Frequency/i);
      if (await frequency.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await frequency.scrollIntoViewIfNeeded();
        await this.pickPrimeNgDropdownOptionByLabel(
          frequency,
          data?.repaymentFrequency ?? /Monthly|Fortnightly|Weekly/i,
        );
      }

      const startDate = this.calendarInputByName("startDate").or(
        this.calendarInputByLabel(/Start Date/i),
      );
      if (await startDate.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await startDate.scrollIntoViewIfNeeded();
        await this.fillCalendarInput(
          startDate,
          data?.startDate ??
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-NZ"),
        );
      }
    }

    await this.fillDateFieldByLabel(
      /Date Of Payment/i,
      data?.dateOfPayment ??
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-NZ"),
    );

    const paymentMethod = this.pageDropdownByLabel(/Payment Method/i);
    await paymentMethod.waitFor({ state: "visible", timeout: 15_000 });
    await paymentMethod.scrollIntoViewIfNeeded();
    await this.pickPrimeNgDropdownOptionByLabel(
      paymentMethod,
      data?.paymentMethod ?? /Debit|Direct|Bank|UDC Directly/i,
    );

    const noteField = this.variationNoteField();
    await noteField.waitFor({ state: "visible", timeout: 15_000 });
    await noteField.scrollIntoViewIfNeeded();
    await this.clickAndFillElement(noteField, note);
    await noteField.press("Tab").catch(() => undefined);
    await this.waitForLoadingComplete();

    await this.fillPreferredContactFields(this.page.locator("app-reqdropdown").first(), data);
  }

  /** @deprecated Use category-specific fill methods after disclaimer. */
  async fillVariationCategoryForm(note?: string): Promise<void> {
    this.logStep("Fill Variation Category Form");
    await this.fillGenericVariationRequestForm({ note });
  }

  private async isCategoryDetailFormVisible(category: VariationRequestCategory): Promise<boolean> {
    switch (category) {
      case "Make a Lump Sum Payment":
        return this.page
          .locator("#amount, input[currencymask]")
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
      case "Request a Payment Arrangement":
        return this.page
          .getByText(/Payment Options/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
      case "Variation Request":
        return this.page
          .locator("#notes, textarea[name='note'], textarea[formcontrolname='notes'], input[type='file']")
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
      default:
        return false;
    }
  }

  async completeUpdatePaymentDetailsFlow(
    subType: UpdatePaymentSubRequestType,
    data?: VariationRequestFormData,
  ): Promise<void> {
    this.logStep(`Complete Update Payment Details Flow — ${subType}`);
    await this.selectSubRequestType(subType);
    await this.acceptDisclaimerIfVisible();

    const detailFormVisible = await this.variationFormRoot()
      .getByText(/New Payment Frequency|New Payment Date|Current Payment Frequency/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!detailFormVisible) {
      await this.submitRequestTypeSelection();
      await this.acceptDisclaimerIfVisible();
    }

    if (/frequency/i.test(subType)) {
      await this.fillChangePaymentFrequencyForm(data);
    } else {
      await this.fillChangePaymentDateForm(data);
    }
  }

  async completeCategoryFlow(
    category: VariationRequestCategory,
    data?: VariationRequestFormData,
    options?: { subRequestType?: UpdatePaymentSubRequestType },
  ): Promise<void> {
    this.logStep(`Complete Category Flow — ${category}`);
    await this.selectCategory(category);
    await this.expectCategorySelected(
      new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    );

    if (category === "Update Payment Details") {
      await this.completeUpdatePaymentDetailsFlow(
        options?.subRequestType ?? "Change Payment Frequency",
        data,
      );
      return;
    }

    await this.acceptDisclaimerIfVisible();
    if (!(await this.isCategoryDetailFormVisible(category))) {
      await this.submitRequestTypeSelection();
      await this.acceptDisclaimerIfVisible();
    }

    switch (category) {
      case "Make a Lump Sum Payment":
        await this.fillLumpSumPaymentForm(data);
        break;
      case "Variation Request":
        await this.fillGenericVariationRequestForm(data);
        break;
      case "Request a Payment Arrangement":
        await this.fillPaymentArrangementForm(data);
        break;
      default:
        await this.fillGenericVariationRequestForm(data);
    }
  }

  submitVariationRequestButton(): Locator {
    return this.visibleActionButton(/^Send$|^Submit$/i);
  }

  async submitVariationRequest(): Promise<void> {
    this.logStep("Submit Variation Request");
    await this.clickElement(this.submitVariationRequestButton());
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

  cancelVariationRequestButton(): Locator {
    return this.page.getByRole("button", { name: /^Cancel$/i }).first();
  }

  unsavedChangesDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ hasText: /Any unsaved changes will be lost/i })
      .first();
  }

  private preferredContactTimeDropdown(): Locator {
    return this.page
      .locator("p-dropdown#preferredContactTime")
      .or(this.pageDropdownByLabel(/Preferred Contact Time/i))
      .first();
  }

  async selectPreferredContactMethod(method: string): Promise<void> {
    const dropdown = this.page
      .locator("p-dropdown#preferredContactMethod")
      .or(this.pageDropdownByLabel(/Preferred Contact Method/i))
      .first();
    await this.pickPrimeNgDropdownOptionByLabel(dropdown, method);
  }

  async selectPreferredContactTime(time: string): Promise<void> {
    await this.pickPrimeNgDropdownOptionByLabel(this.preferredContactTimeDropdown(), time);
  }

  async expectPreferredContactTimeDisabled(): Promise<void> {
    this.logStep("Expect Preferred Contact Time Disabled");
    const dropdown = this.preferredContactTimeDropdown();
    const combobox = dropdown.locator('[role="combobox"]').first();
    await expect
      .poll(
        async () => {
          if (
            await dropdown
              .evaluate((el) => el.classList.contains("p-disabled"))
              .catch(() => false)
          ) {
            return true;
          }
          return (
            (await combobox.getAttribute("aria-disabled").catch(() => null)) === "true" ||
            (await combobox.isDisabled().catch(() => false))
          );
        },
        { timeout: 15_000 },
      )
      .toBe(true);
  }

  async expectPreferredContactTimeClearedForEmail(): Promise<void> {
    this.logStep("Expect Preferred Contact Time Inactive For Email");
    await this.expectPreferredContactTimeDisabled();
  }

  async submitAndExpectMandatoryFieldError(): Promise<void> {
    this.logStep("Submit And Expect Mandatory Field Error");
    await this.submitVariationRequest();
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
    await this.clickElement(this.cancelVariationRequestButton());
    await this.expectUnsavedChangesCancelDialog();
  }

  async uploadVariationDocument(filePath: string): Promise<void> {
    this.logStep("Upload Variation Document");
    const input = this.page.locator('input[type="file"]').first();
    await input.waitFor({ state: "attached", timeout: 30_000 });
    await input.setInputFiles(filePath);
    await this.waitForLoadingComplete();
  }

  async expectUploadedDocumentVisible(fileName: string): Promise<void> {
    this.logStep(`Expect Uploaded Document Visible — ${fileName}`);
    await expect(this.page.getByText(new RegExp(fileName, "i")).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectUploadValidationError(message: RegExp): Promise<void> {
    this.logStep(`Expect Upload Validation Error — ${message}`);
    await expect(this.page.getByText(message).first()).toBeVisible({ timeout: 15_000 });
  }

  private normalizeCurrency(value: string): string {
    const match = value.replace(/\s+/g, " ").match(/[\d,]+(?:\.\d{2})?/);
    return match ? match[0].replace(/,/g, "") : value.trim();
  }

  async getArrearsAmountText(): Promise<string | null> {
    const arrearsLabel = this.page.getByText(/^Arrears$/i).first();
    if (!(await arrearsLabel.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return null;
    }
    const row = arrearsLabel.locator("xpath=ancestor::*[self::div or self::tr or self::p][1]");
    return (await row.innerText()).replace(/\s+/g, " ").trim();
  }

  async expectArrearsAmountMatchesLoanOverdue(overdueText: string | null): Promise<void> {
    this.logStep("Expect Arrears Amount Matches Loan Overdue");
    const arrearsText = await this.getArrearsAmountText();
    expect(arrearsText, "Arrears amount must be visible on payment arrangement form.").toBeTruthy();
    expect(overdueText, "Loan overdue amount must be visible on loan summary.").toBeTruthy();
    expect(this.normalizeCurrency(arrearsText!)).toBe(this.normalizeCurrency(overdueText!));
  }

  async prepareCategoryDetailForm(
    category: VariationRequestCategory,
    options?: { subRequestType?: UpdatePaymentSubRequestType },
  ): Promise<void> {
    this.logStep(`Prepare Category Detail Form — ${category}`);
    await this.selectCategory(category);
    await this.expectCategorySelected(
      new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    );

    if (category === "Update Payment Details") {
      await this.selectSubRequestType(options?.subRequestType ?? "Change Payment Frequency");
    }

    await this.acceptDisclaimerIfVisible();
    const detailVisible =
      category === "Update Payment Details"
        ? await this.variationFormRoot()
            .getByText(/New Payment Frequency|New Payment Date|Current Payment Frequency/i)
            .first()
            .isVisible({ timeout: 5_000 })
            .catch(() => false)
        : await this.isCategoryDetailFormVisible(category);

    if (!detailVisible) {
      await this.submitRequestTypeSelection();
      await this.acceptDisclaimerIfVisible();
    }
  }

  async expectCategoryDetailFormVisible(category: VariationRequestCategory): Promise<void> {
    this.logStep(`Expect Category Detail Form Visible — ${category}`);
    switch (category) {
      case "Update Payment Details":
        await expect(
          this.page.getByText(/New Payment Frequency|New Payment Date|Current Payment Frequency/i).first(),
        ).toBeVisible({ timeout: 30_000 });
        return;
      case "Make a Lump Sum Payment":
        await expect(this.page.locator("#amount, input[currencymask]").first()).toBeVisible({
          timeout: 30_000,
        });
        return;
      case "Variation Request":
        await expect(
          this.page.locator("#notes, textarea[name='note'], input[type='file']").first(),
        ).toBeVisible({ timeout: 30_000 });
        return;
      case "Request a Payment Arrangement":
        await expect(this.page.getByText(/Payment Options/i).first()).toBeVisible({
          timeout: 30_000,
        });
        return;
      default:
        throw new Error(`Unsupported variation category: ${category}`);
    }
  }

  async openCalendarByLabel(label: RegExp): Promise<void> {
    const labelText = label.source.replace(/\\/g, "").replace(/^\^|\$$/g, "");
    const input = this.calendarInputByLabel(label);
    if (await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await input.click({ timeout: 15_000 });
      return;
    }
    const trigger = this.page
      .locator(
        `xpath=//*[contains(normalize-space(.),'${labelText}')]/following::p-calendar[1]//button | //*[contains(normalize-space(.),'${labelText}')]/following::*[contains(@class,'p-datepicker')][1]`,
      )
      .first();
    await trigger.click({ timeout: 15_000 });
  }

  /** URP-T156 — past dates in PrimeNG calendar should be disabled. */
  async expectCalendarPastDatesDisabled(calendarLabel: RegExp): Promise<void> {
    this.logStep(`Expect Calendar Past Dates Disabled — ${calendarLabel}`);
    await this.openCalendarByLabel(calendarLabel);
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
}
