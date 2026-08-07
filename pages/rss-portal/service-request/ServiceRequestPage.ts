/**
 * RSS Portal — Create Request / Service Request (`app-reqdropdown`).
 */

import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

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

  private async pickPrimeNgDropdownOption(dropdownRoot: Locator): Promise<void> {
    await dropdownRoot.waitFor({ state: "visible", timeout: 15_000 });
    const combobox = dropdownRoot.locator('[role="combobox"]').first();
    await this.clickElement(combobox, 60_000);
    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await panel.waitFor({ state: "visible", timeout: 12_000 });
    const item = panel
      .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
      .filter({ hasNotText: /^--\s*Select\s*--$/i })
      .first();
    await item.waitFor({ state: "visible", timeout: 10_000 });
    await item.click();
    await this.waitForLoadingComplete();
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
  }

  async fillUpdateAddressDetailsForm(note?: string): Promise<void> {
    this.logStep("Fill Update Address Details Form");
    const noteText = note ?? `Automation URP-T49 address update ${Date.now()}`;

    const updateForm = this.page
      .locator("div, section")
      .filter({ has: this.page.getByText(/Update Address Details/i) })
      .last();

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
    return this.bankDetailsForm()
      .locator("gen-card, p-card, section, div")
      .filter({ hasText: /^Bank Account Details$/i })
      .first();
  }

  private bankAccountLoanRows(): Locator {
    return this.bankAccountDetailsPanel().locator(
      ".data-row, tbody tr, .p-datatable-tbody > tr, [class*='data-row']",
    );
  }

  private bankAccountLoanRadios(): Locator {
    return this.bankAccountDetailsPanel().locator("input[type='radio']");
  }

  private directDebitDetailsPanel(): Locator {
    return this.bankDetailsForm()
      .locator("gen-card, p-card, form, base-form, section, div")
      .filter({ hasText: /^Direct Debit Details$/i })
      .last();
  }

  private directDebitTextInputs(): Locator {
    return this.directDebitDetailsPanel().locator(
      "input.form-control:visible, input.p-inputtext:visible, input:not([type='radio']):not([type='hidden']):not([type='checkbox']):visible",
    );
  }

  private directDebitTextInput(index: 0 | 1): Locator {
    return this.directDebitTextInputs().nth(index);
  }

  private directDebitNoteField(): Locator {
    return this.directDebitDetailsPanel().locator("textarea#note, textarea:visible").first();
  }

  /** Bank-account loans load asynchronously after category selection on QAT. */
  async waitForBankAccountLoanRows(timeoutMs = 90_000): Promise<void> {
    this.logStep("Wait For Bank Account Loan Rows");
    await this.waitForLoadingComplete(timeoutMs);
    try {
      await expect
        .poll(
          async () => {
            const rowCount = await this.bankAccountLoanRows().count();
            if (rowCount > 0) return rowCount;
            return await this.bankAccountLoanRadios().count();
          },
          { timeout: timeoutMs, intervals: [500, 1_000, 2_000, 3_000] },
        )
        .toBeGreaterThan(0);
    } catch {
      throw new Error(
        "No loan rows appeared in Change Bank Account Details — ensure the selected header party has at least one active loan.",
      );
    }
  }

  private async ensureDirectDebitAuthorisedYes(): Promise<void> {
    const directDebit = this.directDebitDetailsPanel();
    await directDebit.scrollIntoViewIfNeeded();
    const yesLabel = directDebit
      .locator("label.p-radiobutton-label", { hasText: /^Yes$/i })
      .first();
    const yesInput = directDebit.locator('input[type="radio"][value="yes"]').first();
    if (await yesInput.isChecked().catch(() => false)) return;
    await this.clickElement(yesLabel, 30_000);
    await this.waitForLoadingComplete();
  }

  private async selectFirstBankAccountLoanIfPresent(): Promise<void> {
    const loanRadios = this.bankAccountLoanRadios();
    const loanCount = await loanRadios.count();
    if (loanCount === 0) return;

    for (let i = 0; i < loanCount; i++) {
      const radio = loanRadios.nth(i);
      if (await radio.isChecked().catch(() => false)) return;
    }
    await loanRadios.first().click({ force: true });
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
    await expect(this.bankAccountLoanRows().first()).toBeVisible({ timeout: 10_000 });

    const directDebit = this.directDebitDetailsPanel();
    await directDebit.scrollIntoViewIfNeeded();
    await expect(directDebit.getByText(/^Direct Debit Details$/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      directDebit
        .getByText(/personally authorised to operate your nominated bank account/i)
        .first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      directDebit.locator("label.p-radiobutton-label", { hasText: /^Yes$/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      directDebit.locator("label.p-radiobutton-label", { hasText: /^No$/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    await this.ensureDirectDebitAuthorisedYes();
    await expect(this.directDebitTextInput(0)).toBeVisible({ timeout: 15_000 });
    await expect(this.directDebitTextInput(1)).toBeVisible({ timeout: 15_000 });
    await expect(this.directDebitNoteField()).toBeVisible({ timeout: 10_000 });
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
