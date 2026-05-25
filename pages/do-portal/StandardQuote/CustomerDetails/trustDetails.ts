import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../..";

/**
 * **Trust Details** + **Contact Details** on Standard Quote (`app-trust-detail`, new Trust customer).
 */
export class DOTrustDetailsPage extends BasePage {
  readonly root: Locator;
  readonly trustDetailsForm: Locator;
  readonly contactRoot: Locator;
  readonly saveButton: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.locator("app-trust-detail").first();
    this.trustDetailsForm = this.root.locator(".trust_details");
    this.contactRoot = this.root.locator("app-trust-contact-details");
    this.saveButton = page
      .locator("button.p-ripple.p-element.p-button.p-component.p-button-outlined")
      .filter({ hasText: /^Save$/i });
    this.nextButton = page.getByRole("button", { name: /^Next$/i }).last();
  }

  async waitForTrustDetailsStep(): Promise<void> {
    await this.root.waitFor({ state: "visible", timeout: 120_000 });
    await expect(this.root.getByText(/^Trust Details$/i).first()).toBeVisible({
      timeout: 60_000,
    });
  }

  private inputAfterLabel(labelRx: string): Locator {
    return this.trustDetailsForm.locator(
      `xpath=.//label[contains(normalize-space(.),'${labelRx}')]/following::input[contains(@class,'p-inputtext')][1]`,
    );
  }

  private dropdownTriggerNearLabel(labelRx: RegExp): Locator {
    return this.trustDetailsForm
      .locator("span")
      .filter({ hasText: labelRx })
      .locator("div[aria-label='dropdown trigger']")
      .first();
  }

  private async selectPrimeNgFirstRealOption(): Promise<void> {
    const panel = this.page.locator(".p-dropdown-panel").last();
    await panel.waitFor({ state: "visible", timeout: 15_000 });
    const item = panel
      .locator("li[role='option'], .p-dropdown-item")
      .filter({ hasNotText: /^\s*$/ })
      .first();
    await item.click({ timeout: 15_000 });
    await this.page
      .locator(".p-dropdown-panel")
      .last()
      .waitFor({ state: "hidden", timeout: 12_000 })
      .catch(() => {});
  }

  /**
   * Open **Trust Type** or **Primary Nature of Trust** then dismiss — marks control touched so **Save**
   * surfaces `… is required` (same idea as {@link DOPersonalDetailsPage} `touchRequiredDropdownWithoutSelection`).
   */
  private async touchDropdownWithoutSelection(trigger: Locator): Promise<void> {
    await trigger.waitFor({ state: "visible", timeout: 20_000 });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click({ timeout: 15_000 });
    const listbox = this.page.getByRole("listbox");
    await listbox.waitFor({ state: "visible", timeout: 8_000 }).catch(() => {});
    await this.page.keyboard.press("Escape");
    await listbox.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  }

  async touchTrustTypeDropdownWithoutSelection(): Promise<void> {
    await this.touchDropdownWithoutSelection(this.dropdownTriggerNearLabel(/Trust Type/i));
  }

  async touchPrimaryNatureOfTrustDropdownWithoutSelection(): Promise<void> {
    await this.touchDropdownWithoutSelection(this.dropdownTriggerNearLabel(/Primary Nature of Trust/i));
  }

  async enterTrustName(name: string): Promise<void> {
    const el = this.inputAfterLabel("Trust Name");
    await el.fill(name);
  }

  async enterRegisteredNumber(value: string): Promise<void> {
    const el = this.inputAfterLabel("Registered Number");
    await el.fill(value);
  }

  async enterGstNumber(value: string): Promise<void> {
    const el = this.inputAfterLabel("GST Number");
    await el.fill(value);
  }

  async enterTrustPurpose(text: string): Promise<void> {
    await this.trustDetailsForm.locator("textarea#note").fill(text);
  }

  async enterTimeInTrustYearsMonths(years: string, months: string): Promise<void> {
    const yearsIn = this.root.locator(".time-in-business-start input").first();
    const monthsIn = this.root.locator(".timeInBusinessMonthsClass input").first();
    await yearsIn.fill(years);
    await monthsIn.fill(months);
  }

  async enterBusinessPhone(areaCode: string, phone: string): Promise<void> {
    const root = this.contactRoot;
    await root.locator('input[placeholder="Area code"]').fill(areaCode);
    await root.locator('input[placeholder="Phone number"]').fill(phone);
  }

  async enterContactEmail(email: string): Promise<void> {
    await this.page.locator("app-trust-email-contact-details input[type='text']").first().fill(email);
  }

  /** Leave required text fields empty (validation scenario — do not enter Trust Name / Registered Number / phone / email). */
  async clearTrustName(): Promise<void> {
    await this.inputAfterLabel("Trust Name").clear();
  }

  async clearRegisteredNumber(): Promise<void> {
    await this.inputAfterLabel("Registered Number").clear();
  }

  async clearTimeInTrust(): Promise<void> {
    await this.root.locator(".time-in-business-start input").first().clear();
    await this.root.locator(".timeInBusinessMonthsClass input").first().clear();
  }

  async clearBusinessPhone(): Promise<void> {
    const root = this.contactRoot;
    await root.locator('input[placeholder="Area code"]').clear();
    await root.locator('input[placeholder="Phone number"]').clear();
  }

  async clearContactEmail(): Promise<void> {
    await this.page.locator("app-trust-email-contact-details input[type='text']").first().clear();
  }

  /** Same pattern as {@link DOReferenceDetailsPage.selectContactType}. */
  async selectTrustType(optionText: string): Promise<void> {
    await this.selectTrustTypeOption(optionText);
  }

  private async clickDropdownOption(optionText: string): Promise<void> {
    const escaped = optionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "i");
    const panel = this.page.locator(".p-dropdown-panel").last();
    const opt = this.page.getByRole("option", { name: rx }).first().or(
      panel.locator("li[role='option'], .p-dropdown-item").filter({ hasText: rx }).first(),
    );
    await opt.waitFor({ state: "visible", timeout: 15_000 });
    await opt.click({ timeout: 15_000 });
    await panel.waitFor({ state: "hidden", timeout: 12_000 }).catch(() => {});
  }

  async selectTrustTypeOption(optionText: string): Promise<void> {
    const t = this.dropdownTriggerNearLabel(/Trust Type/i);
    await t.click({ timeout: 15_000 });
    await this.clickDropdownOption(optionText);
  }

  async selectPrimaryNatureOfTrust(optionText: string): Promise<void> {
    await this.selectPrimaryNatureOfTrustOption(optionText);
  }

  async selectPrimaryNatureOfTrustOption(optionText: string): Promise<void> {
    const t = this.dropdownTriggerNearLabel(/Primary Nature of Trust/i);
    await t.click({ timeout: 15_000 });
    await this.clickDropdownOption(optionText);
  }

  /** When list copy is environment-specific, pick the first non-empty panel row. */
  async selectTrustTypeFirstAvailableOption(): Promise<void> {
    await this.dropdownTriggerNearLabel(/Trust Type/i).click({ timeout: 15_000 });
    await this.selectPrimeNgFirstRealOption();
  }

  async selectPrimaryNatureOfTrustFirstAvailableOption(): Promise<void> {
    await this.dropdownTriggerNearLabel(/Primary Nature of Trust/i).click({ timeout: 15_000 });
    await this.selectPrimeNgFirstRealOption();
  }

  async clickSaveTrustDetails(): Promise<void> {
    await this.saveButton.waitFor({ state: "visible", timeout: 30_000 });
    await this.saveButton.scrollIntoViewIfNeeded();
    await this.saveButton.click({ timeout: 20_000 });
  }

  async clickNextTrustDetails(): Promise<void> {
    await this.nextButton.waitFor({ state: "visible", timeout: 30_000 });
    await this.nextButton.click({ timeout: 20_000 });
  }

  /**
   * After **Save** with **Trust Type** + **Primary Nature** selected, other required text/contact
   * fields left empty, and invalid GST — matches validation screenshot (no dropdown required errors).
   */
  async expectTrustDetailsValidationWithDropdownsSelected(): Promise<void> {
    await expect(this.page.getByText(/Trust Name is required/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(this.page.getByText(/Registered Number is required/i).first()).toBeVisible();
    await expect(this.page.getByText(/GST Number is in an incorrect format/i).first()).toBeVisible();
    await expect(this.page.getByText(/Time in Trust is required/i).first()).toBeVisible();
    await expect(this.page.getByText(/Mobile Number is required/i).first()).toBeVisible();
    await expect(this.page.getByText(/Email is required/i).first()).toBeVisible();
  }

}
