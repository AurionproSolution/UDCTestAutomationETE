/**
 * RSS Portal — Create Request / Service Request (`app-reqdropdown`).
 */

import path from "path";
import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export const RSS_DEFAULT_SERVICE_REQUEST_UPLOAD_PDF = path.join(
  process.cwd(),
  "testData",
  "rss-portal",
  "exportedPDFFile (3) (1).pdf",
);

export type ServiceRequestCategory =
  | "Experiencing Financial Difficulty"
  | "Update Contact Details"
  | "Update Address Details"
  | "Change Bank Account Details";

export class RSSServiceRequestPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  protected stepLogPrefix(): string {
    return "RSS Portal — Service Request";
  }

  private serviceRequestRoot(): Locator {
    return this.page.locator("app-reqdropdown");
  }

  private categoryCombobox(): Locator {
    return this.serviceRequestRoot().getByRole("combobox").first();
  }

  async expectServiceRequestScreen(): Promise<void> {
    this.logStep("Expect Service Request Screen");
    await expect(this.page).toHaveURL(/\/rss\/my-requests\/dropdown/i, {
      timeout: 30_000,
    });
    const panel = this.serviceRequestRoot()
      .filter({ hasText: /Select Service Request/i })
      .first();
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel.getByText("Category", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.categoryCombobox()).toBeVisible({ timeout: 10_000 });
    await expect(this.page.getByRole("button", { name: /^Cancel$/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  async selectCategory(category: ServiceRequestCategory | RegExp): Promise<void> {
    this.logStep(`Select Category — ${String(category)}`);
    const combobox = this.categoryCombobox();
    await this.clickElement(combobox, 60_000);
    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await panel.waitFor({ state: "visible", timeout: 12_000 });
    const option = panel
      .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
      .filter({ hasText: category })
      .first();
    await option.waitFor({ state: "visible", timeout: 10_000 });
    await option.click();
    await this.waitForLoadingComplete();
  }

  async expectCategorySelected(category: RegExp): Promise<void> {
    this.logStep(`Expect Category Selected — ${category}`);
    await expect(this.categoryCombobox()).toHaveAttribute("aria-label", category, {
      timeout: 15_000,
    });
  }

  private escapeRx(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private async pickPrimeNgDropdownOption(
    dropdownRoot: Locator,
    optionLabel?: RegExp | string,
  ): Promise<void> {
    await dropdownRoot.waitFor({ state: "visible", timeout: 15_000 });
    const combobox = dropdownRoot.locator('[role="combobox"]').first();
    const disabled =
      (await combobox.getAttribute("aria-disabled").catch(() => null)) === "true" ||
      !(await combobox.isEnabled().catch(() => true));
    if (disabled) {
      return;
    }
    await this.clickElement(combobox, 60_000);
    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await panel.waitFor({ state: "visible", timeout: 12_000 });
    const items = panel.locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item");
    const item = optionLabel
      ? items
          .filter({
            hasText:
              typeof optionLabel === "string"
                ? new RegExp(this.escapeRx(optionLabel), "i")
                : optionLabel,
          })
          .first()
      : items.filter({ hasNotText: /^--\s*Select\s*--$/i }).first();
    await item.waitFor({ state: "visible", timeout: 10_000 });
    await item.click();
    await this.waitForLoadingComplete();
  }

  cancelServiceRequestButton(): Locator {
    return this.serviceRequestRoot().getByRole("button", { name: /^Cancel$/i }).first();
  }

  unsavedChangesDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ hasText: /Any unsaved changes will be lost/i })
      .first();
  }

  financialDifficultyForm(): Locator {
    return this.page.locator("app-experiencing-financial-difficulty");
  }

  async submitAndExpectMandatoryFieldError(): Promise<void> {
    this.logStep("Submit And Expect Mandatory Field Error");
    await this.submitServiceRequest();
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
    await this.clickElement(this.cancelServiceRequestButton());
    await this.expectUnsavedChangesCancelDialog();
  }

  async uploadFinancialDifficultyDocument(filePath: string): Promise<void> {
    this.logStep("Upload Financial Difficulty Document");
    const form = this.financialDifficultyForm();
    const input = form.locator('input[type="file"], #fileInput').first();
    await input.waitFor({ state: "attached", timeout: 30_000 });
    await input.setInputFiles(filePath);
    await this.waitForLoadingComplete();
  }

  async expectUploadedDocumentVisible(fileName: string): Promise<void> {
    this.logStep(`Expect Uploaded Document Visible — ${fileName}`);
    await expect(this.financialDifficultyForm().getByText(new RegExp(fileName, "i")).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectUploadValidationError(message: RegExp): Promise<void> {
    this.logStep(`Expect Upload Validation Error — ${message}`);
    await expect(this.page.getByText(message).first()).toBeVisible({ timeout: 15_000 });
  }

  async selectFinancialDifficultyPreferredContactMethod(method: string): Promise<void> {
    await this.pickPrimeNgDropdownOption(
      this.financialDifficultyForm().locator("p-dropdown#preferredContactMethod"),
      method,
    );
  }

  async selectFinancialDifficultyPreferredContactTime(time: string): Promise<void> {
    await this.pickPrimeNgDropdownOption(
      this.financialDifficultyForm().locator("p-dropdown#preferredContactTime"),
      time,
    );
  }

  private financialDifficultyPreferredContactTimeDropdown(): Locator {
    return this.financialDifficultyForm().locator("p-dropdown#preferredContactTime");
  }

  async expectFinancialDifficultyPreferredContactTimeDisabled(): Promise<void> {
    this.logStep("Expect Financial Difficulty Preferred Contact Time Disabled");
    const dropdown = this.financialDifficultyPreferredContactTimeDropdown();
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

  /**
   * URP-T147 — Email disables contact time. On QAT this form keeps the last selected
   * label while disabled (Contact UDC clears it instead).
   */
  async expectFinancialDifficultyPreferredContactTimeCleared(): Promise<void> {
    this.logStep("Expect Financial Difficulty Preferred Contact Time Inactive For Email");
    await this.expectFinancialDifficultyPreferredContactTimeDisabled();
  }

  private async selectDirectDebitAuthorised(answer: "Yes" | "No"): Promise<void> {
    await this.clickDirectDebitPaymentOption(answer.toLowerCase() as "yes" | "no");
  }

  async selectDirectDebitAuthorisedNo(): Promise<void> {
    this.logStep("Select Direct Debit Authorised No");
    await this.waitForBankAccountLoanRows();
    await this.selectFirstBankAccountLoanIfPresent();
    await this.selectDirectDebitAuthorised("No");
  }

  async expectSubmitServiceRequestButtonHidden(): Promise<void> {
    this.logStep("Expect Submit Service Request Button Hidden");
    await expect(this.submitServiceRequestButton()).toBeHidden({ timeout: 15_000 });
  }

  /** Address form renders beside `app-reqdropdown`, not inside it. */
  private updateAddressDetailsSection(): Locator {
    return this.page
      .locator("div, section, base-form")
      .filter({ has: this.page.getByText(/Update Address Details/i) })
      .filter({
        has: this.page.locator('input[name="physicalSearchValue"], .auto-select-field'),
      })
      .last();
  }

  /** PrimeNG autocomplete — use `physicalSearchValue`; not the category dropdown combobox. */
  private updateAddressSearchInput(): Locator {
    return this.page.locator('input[name="physicalSearchValue"]').filter({ visible: true }).first();
  }

  async searchUpdateAddress(query: string): Promise<void> {
    this.logStep(`Search Update Address — ${query}`);
    const searchField = this.updateAddressSearchInput();
    await expect(searchField).toBeVisible({ timeout: 15_000 });
    await searchField.click();
    await searchField.fill(query);
    await this.waitForLoadingComplete();
  }

  async expectAddressSearchSuggestions(minCount = 1): Promise<void> {
    this.logStep("Expect Address Search Suggestions");
    const suggestions = this.page
      .locator(".p-autocomplete-panel")
      .filter({ visible: true })
      .last()
      .locator(".p-autocomplete-item, li[role='option'], li");
    await expect(suggestions.first()).toBeVisible({ timeout: 15_000 });
    expect(await suggestions.count()).toBeGreaterThanOrEqual(minCount);
  }

  async getPrimeNgDropdownOptionLabels(root: Locator): Promise<string[]> {
    await root.waitFor({ state: "visible", timeout: 15_000 });
    const combobox = root.locator('[role="combobox"]').first();
    const disabled =
      (await combobox.getAttribute("aria-disabled").catch(() => null)) === "true" ||
      !(await combobox.isEnabled().catch(() => true));
    if (disabled) {
      return [];
    }
    await this.clickElement(combobox, 60_000);
    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await panel.waitFor({ state: "visible", timeout: 12_000 });
    const items = panel.locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item");
    await items.first().waitFor({ state: "visible", timeout: 10_000 });
    const count = await items.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await items.nth(i).innerText()).replace(/\s+/g, " ").trim();
      if (text) labels.push(text);
    }
    await this.page.keyboard.press("Escape").catch(() => undefined);
    return labels;
  }

  async expectExperiencingFinancialDifficultyFormVisible(): Promise<void> {
    this.logStep("Expect Experiencing Financial Difficulty Form Visible");
    const form = this.page.locator("app-experiencing-financial-difficulty");
    await expect(form).toBeVisible({ timeout: 15_000 });
    await expect(
      form.getByText(/struggling to make your repayments/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(form.locator("#tellUsWhatLoanSupport")).toBeVisible({
      timeout: 10_000,
    });
    await expect(form.locator("#tellUsHowCircumstances")).toBeVisible({
      timeout: 10_000,
    });
    await expect(form.getByText(/Upload Documents/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(form.getByRole("button", { name: /Browse Files/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(form.locator("#notes")).toBeVisible({ timeout: 10_000 });
    await expect(form.locator("p-dropdown#preferredContactMethod")).toBeVisible({
      timeout: 10_000,
    });
    await expect(form.locator("p-dropdown#preferredContactTime")).toBeVisible({
      timeout: 10_000,
    });
  }

  async fillExperiencingFinancialDifficultyForm(note?: string): Promise<void> {
    this.logStep("Fill Experiencing Financial Difficulty Form");
    const form = this.page.locator("app-experiencing-financial-difficulty");
    const supportText = `Automation loan support ${Date.now()}`;
    const circumstancesText = `Automation circumstances change ${Date.now()}`;
    const noteText = note ?? `Automation URP-T47 financial difficulty ${Date.now()}`;

    await form.locator("#tellUsWhatLoanSupport").fill(supportText);
    await form.locator("#tellUsHowCircumstances").fill(circumstancesText);
    await form.locator("#notes").fill(noteText);
    await this.pickPrimeNgDropdownOption(form.locator("p-dropdown#preferredContactMethod"));
  }

  async expectUpdateContactDetailsFormVisible(): Promise<void> {
    this.logStep("Expect Update Contact Details Form Visible");
    await expect(this.page.getByText(/Current Contact Details/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.page.getByText(/Update Contact Details/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.page.getByRole("combobox", { name: "+64" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.page.getByRole("textbox", { name: "Note" })).toBeVisible({
      timeout: 10_000,
    });
  }

  private updateContactForm(): Locator {
    return this.page
      .locator("div")
      .filter({ has: this.page.getByRole("combobox", { name: "+64" }) })
      .filter({ hasNot: this.page.getByText(/Current Contact Details/i) })
      .filter({ has: this.page.getByRole("textbox", { name: "Note" }) })
      .first();
  }

  async fillUpdateContactDetailsForm(note?: string): Promise<void> {
    this.logStep("Fill Update Contact Details Form");
    const noteText = note ?? `Automation URP-T48 contact update ${Date.now()}`;
    const email = `automation.test+${Date.now()}@udc.co.nz`;
    const phoneDigits = "21782556";

    const updateForm = this.updateContactForm();
    await expect(updateForm.getByRole("combobox", { name: "+64" })).toBeVisible({
      timeout: 10_000,
    });

    const fields = updateForm.getByRole("textbox");
    await expect(fields).toHaveCount(5, { timeout: 10_000 });
    await fields.nth(0).fill("21");
    await fields.nth(1).fill("782556");
    await fields.nth(2).fill(phoneDigits);
    await fields.nth(3).fill(email);
    await fields.nth(4).fill(noteText);

    await expect(this.page.getByText(/Incorrect combination/i)).toBeHidden({
      timeout: 10_000,
    });
  }

  async expectUpdateAddressDetailsFormVisible(): Promise<void> {
    this.logStep("Expect Update Address Details Form Visible");
    await expect(this.page.getByText(/Current Address/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.page.getByText(/Update Address Details/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.page.getByText(/^Physical$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.page.getByText(/Postal address is same as Physical address/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.updateAddressSearchInput()).toBeVisible({ timeout: 10_000 });
  }

  async fillUpdateAddressDetailsForm(note?: string): Promise<void> {
    this.logStep("Fill Update Address Details Form");
    const noteText = note ?? `Automation URP-T49 address update ${Date.now()}`;

    const updateForm = this.updateAddressDetailsSection();

    const emptyDropdowns = updateForm.locator("p-dropdown .p-dropdown-label-empty");
    const dropdownCount = await emptyDropdowns.count();
    for (let i = 0; i < dropdownCount; i++) {
      const dropdown = emptyDropdowns.nth(i).locator("xpath=ancestor::p-dropdown[1]");
      if (await dropdown.isVisible().catch(() => false)) {
        await this.pickPrimeNgDropdownOption(dropdown);
      }
    }

    const emptyInputs = updateForm.locator(
      "input:visible:not([type='hidden']):not([type='checkbox']):not([type='radio'])",
    );
    const inputCount = await emptyInputs.count();
    for (let i = 0; i < inputCount; i++) {
      const input = emptyInputs.nth(i);
      if (!(await input.isEditable().catch(() => false))) continue;
      const value = (await input.inputValue()).trim();
      if (!value) {
        await input.fill(`48 Hooker Road ${i + 1}`);
      }
    }

    const noteField = updateForm
      .locator("div, generic")
      .filter({ has: updateForm.getByText(/^Note$/i) })
      .locator("textarea:visible, input:visible")
      .first();
    if (await noteField.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await noteField.fill(noteText);
    }
  }

  private bankDetailsForm(): Locator {
    return this.page.locator("app-bank-details");
  }

  private bankAccountDetailsPanel(): Locator {
    return this.bankDetailsForm();
  }

  private bankAccountLoanDataRows(): Locator {
    return this.bankDetailsForm().locator("ion-row.data-row");
  }

  private bankAccountLoanRows(): Locator {
    return this.bankAccountLoanDataRows();
  }

  private bankAccountLoanRadioInputs(): Locator {
    return this.bankDetailsForm().locator("input[type='radio'][id^='bank']");
  }

  private bankAccountLoanRadios(): Locator {
    return this.bankAccountLoanRadioInputs();
  }

  private bankAccountLoanNumbers(): Locator {
    return this.bankAccountLoanDataRows()
      .locator("label")
      .filter({ hasText: /^\d{2,}$/ });
  }

  private async countBankAccountLoanOptions(): Promise<number> {
    const form = this.bankDetailsForm();
    if ((await form.count()) === 0) {
      return 0;
    }

    const bankRadioCount = await this.bankAccountLoanRadioInputs().count();
    if (bankRadioCount > 0) {
      return bankRadioCount;
    }

    const dataRowCount = await this.bankAccountLoanDataRows().count();
    if (dataRowCount > 0) {
      return dataRowCount;
    }

    return form.locator("label").filter({ hasText: /^\d{2,}$/ }).count();
  }

  private directDebitDetailsPanel(): Locator {
    const bankDetails = this.bankDetailsForm();
    return bankDetails
      .locator("form.p-fluid")
      .filter({ has: this.directDebitAuthorisationHeading() })
      .first();
  }

  private directDebitAuthorisationHeading(): Locator {
    return this.bankDetailsForm().getByRole("heading", {
      name: /personally authorised to operate your nominated bank account/i,
    });
  }

  private directDebitPaymentRadio(value: "yes" | "no"): Locator {
    return this.bankDetailsForm().locator(
      `input[type='radio'][name='paymentOption'][value='${value}']`,
    );
  }

  private directDebitPaymentRadioBox(value: "yes" | "no"): Locator {
    return this.directDebitPaymentRadio(value).locator(
      "xpath=ancestor::p-radiobutton[1]//*[contains(@class,'p-radiobutton-box')]",
    );
  }

  private async clickDirectDebitPaymentOption(value: "yes" | "no"): Promise<void> {
    await this.directDebitAuthorisationHeading().scrollIntoViewIfNeeded();
    const input = this.directDebitPaymentRadio(value);
    if (await input.isChecked().catch(() => false)) {
      return;
    }

    const box = this.directDebitPaymentRadioBox(value);
    if ((await box.count()) > 0) {
      await box.first().click({ force: true });
    } else {
      await input.click({ force: true });
    }
    await this.waitForLoadingComplete();
  }

  private directDebitTextInputs(): Locator {
    return this.bankDetailsForm().locator("input[type='text'].form-control");
  }

  private directDebitTextInput(index: 0 | 1): Locator {
    return this.directDebitTextInputs().nth(index);
  }

  private directDebitNoteField(): Locator {
    return this.bankDetailsForm().locator("textarea#note").first();
  }

  /** Bank-account loans load asynchronously after category selection on QAT. */
  async waitForBankAccountLoanRows(timeoutMs = 90_000): Promise<void> {
    this.logStep("Wait For Bank Account Loan Rows");
    await expect(this.bankDetailsForm()).toBeVisible({ timeout: 15_000 });
    try {
      await expect
        .poll(async () => {
          await this.waitForLoadingComplete(5_000);
          return this.countBankAccountLoanOptions();
        }, {
          timeout: timeoutMs,
          intervals: [500, 1_000, 2_000, 3_000],
        })
        .toBeGreaterThan(0);
    } catch {
      throw new Error(
        "No loan rows appeared in Change Bank Account Details — ensure the selected header party has at least one active loan.",
      );
    }
  }

  private async ensureDirectDebitAuthorisedYes(): Promise<void> {
    await this.clickDirectDebitPaymentOption("yes");
  }

  private async selectFirstBankAccountLoanIfPresent(): Promise<void> {
    const loanCount = await this.countBankAccountLoanOptions();
    if (loanCount === 0) return;

    const input = this.bankAccountLoanRadioInputs().first();
    if (await input.isChecked().catch(() => false)) {
      return;
    }

    const box = input.locator(
      "xpath=ancestor::p-radiobutton[1]//*[contains(@class,'p-radiobutton-box')]",
    );
    if ((await box.count()) > 0) {
      await box.first().click({ force: true });
    } else {
      await input.click({ force: true });
    }
    await this.waitForLoadingComplete();
  }

  async expectChangeBankAccountDetailsFormVisible(): Promise<void> {
    this.logStep("Expect Change Bank Account Details Form Visible");
    const form = this.bankDetailsForm();
    await expect(form).toBeVisible({ timeout: 15_000 });
    await expect(form.getByText(/^Bank Account Details$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(form.getByText(/^Loan No\.$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(form.getByText(/^Bank Account Name$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(form.getByText(/^Bank Account Number$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await this.waitForBankAccountLoanRows();
    await expect(this.bankAccountLoanRadioInputs().first()).toBeAttached({ timeout: 10_000 });

    await this.directDebitAuthorisationHeading().scrollIntoViewIfNeeded();
    await expect(this.bankDetailsForm().getByText(/Direct Debit Details/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.directDebitAuthorisationHeading()).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.directDebitPaymentRadio("yes")).toBeAttached({ timeout: 10_000 });
    await expect(this.directDebitPaymentRadio("no")).toBeAttached({ timeout: 10_000 });
    await expect(this.directDebitPaymentRadioBox("yes")).toBeVisible({ timeout: 10_000 });
    await expect(this.directDebitPaymentRadioBox("no")).toBeVisible({ timeout: 10_000 });

    await this.ensureDirectDebitAuthorisedYes();
    await this.directDebitNoteField().scrollIntoViewIfNeeded();
    await expect(this.directDebitTextInput(0)).toBeAttached({ timeout: 15_000 });
    await expect(this.directDebitTextInput(1)).toBeAttached({ timeout: 15_000 });
    await expect(this.directDebitNoteField()).toBeAttached({ timeout: 10_000 });
  }

  async fillChangeBankAccountDetailsForm(note?: string): Promise<void> {
    this.logStep("Fill Change Bank Account Details Form");
    const noteText = note ?? `Automation URP-T50 bank account update ${Date.now()}`;

    await this.waitForBankAccountLoanRows();
    await this.selectFirstBankAccountLoanIfPresent();

    await this.ensureDirectDebitAuthorisedYes();

    await this.directDebitTextInput(0).fill("Automation Test Account");
    await this.directDebitTextInput(1).fill("1234567890");
    await this.directDebitNoteField().fill(noteText);
  }

  submitServiceRequestButton(): Locator {
    return this.page.getByRole("button", { name: /^Send$|^Submit$/i }).first();
  }

  async submitServiceRequest(): Promise<void> {
    this.logStep("Submit Service Request");
    await this.clickElement(this.submitServiceRequestButton());
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
}
