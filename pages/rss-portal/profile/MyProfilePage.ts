/**
 * RSS Portal — My Profile (`app-profile-page`) and related service-request flows.
 */

import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export class RSSMyProfilePage extends BasePage {
  readonly profileRoot: Locator;

  constructor(page: Page) {
    super(page);
    this.profileRoot = page.locator("app-profile-page");
  }

  protected stepLogPrefix(): string {
    return "RSS Portal — My Profile";
  }

  private sectionBlock(label: RegExp): Locator {
    return this.profileRoot
      .locator(".profile-details", {
        has: this.page.locator(".accordion-header-content .header-text").filter({ hasText: label }),
      })
      .first();
  }

  async expectProfilePageLoaded(): Promise<void> {
    this.logStep("Expect Profile Page Loaded");
    await expect(this.page).toHaveURL(/\/rss\/profile/i, { timeout: 30_000 });
    await expect(this.profileRoot).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByRole("heading", { name: /Name/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.page.getByRole("heading", { name: /Contact/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.page.getByRole("heading", { name: /Address/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectNameSectionDetailsVisible(): Promise<void> {
    this.logStep("Expect Name Section Details Visible");
    const nameSection = this.sectionBlock(/Name/i);
    await expect(nameSection).toBeVisible({ timeout: 10_000 });

    const businessName = nameSection.getByText(/Business Name/i).first();
    const firstName = nameSection.getByText(/First Name/i).first();
    if (await businessName.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(businessName).toBeVisible();
      await expect(nameSection.locator(".field-value").first()).not.toBeEmpty();
      return;
    }

    await expect(firstName).toBeVisible({ timeout: 10_000 });
    await expect(nameSection.getByText(/Last Name/i).first()).toBeVisible({
      timeout: 10_000,
    });
    const populatedValues = nameSection.locator(".field-value").filter({ hasText: /\S/ });
    await expect(populatedValues.first()).toBeVisible({ timeout: 10_000 });
  }

  async expectContactSectionDetailsVisible(): Promise<void> {
    this.logStep("Expect Contact Section Details Visible");
    const contactSection = this.sectionBlock(/Contact/i);
    await expect(contactSection).toBeVisible({ timeout: 10_000 });
    await expect(contactSection.getByText(/Mobile/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(contactSection.getByText(/Phone/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(contactSection.getByText(/Email/i).first()).toBeVisible({
      timeout: 10_000,
    });
    const populatedValues = contactSection.locator(".field-value").filter({ hasText: /\S/ });
    expect(await populatedValues.count()).toBeGreaterThan(0);
  }

  async expectAddressSectionDetailsVisible(): Promise<void> {
    this.logStep("Expect Address Section Details Visible");
    const addressSection = this.sectionBlock(/Address/i);
    await expect(addressSection).toBeVisible({ timeout: 10_000 });
    await expect(addressSection.getByText(/Physical Address/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(addressSection.getByText(/Postal Address/i).first()).toBeVisible({
      timeout: 10_000,
    });
    const populatedValues = addressSection.locator(".field-value").filter({ hasText: /\S/ });
    expect(await populatedValues.count()).toBeGreaterThan(0);
  }

  async expectProfileDetailsForSelectedParty(selectedPartyName: string): Promise<void> {
    this.logStep("Expect Profile Details For Selected Party");
    await this.expectProfilePageLoaded();
    await this.expectNameSectionDetailsVisible();
    await this.expectContactSectionDetailsVisible();
    await this.expectAddressSectionDetailsVisible();

    const nameSection = this.sectionBlock(/Name/i);
    const sectionText = (await nameSection.innerText()).replace(/\s+/g, " ");
    const partyTokens = selectedPartyName
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 1);
    for (const token of partyTokens) {
      expect(sectionText).toMatch(new RegExp(this.escapeRx(token), "i"));
    }
  }

  private escapeRx(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async clickContactUpdate(): Promise<void> {
    this.logStep("Click Contact Update");
    const contactHeader = this.sectionBlock(/Contact/i).locator(".update-action");
    await this.clickElement(contactHeader);
    await this.waitForLoadingComplete();
  }

  async clickAddressUpdate(): Promise<void> {
    this.logStep("Click Address Update");
    const addressHeader = this.sectionBlock(/Address/i).locator(".update-action");
    await this.clickElement(addressHeader);
    await this.waitForLoadingComplete();
  }

  async expectServiceRequestWithCategory(categoryLabel: RegExp): Promise<void> {
    this.logStep(`Expect Service Request With Category — ${categoryLabel}`);
    await expect(this.page).toHaveURL(/\/rss\/my-requests/i, { timeout: 30_000 });
    await expect(this.page.getByText(categoryLabel).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.page.getByRole("button", { name: /^Cancel$/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  private async pickFirstPrimeNgDropdownOption(root: Locator): Promise<void> {
    await root.waitFor({ state: "visible", timeout: 15_000 });
    const combobox = root.locator('[role="combobox"]').first();
    await this.clickElement(combobox, 90_000);
    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await panel.waitFor({ state: "visible", timeout: 12_000 });
    const item = panel
      .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
      .first();
    await item.waitFor({ state: "visible", timeout: 10_000 });
    await item.click();
    await this.waitForLoadingComplete();
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
    const noteText = note ?? `Automation URP-T59 contact update ${Date.now()}`;
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

  async fillUpdateAddressDetailsForm(note?: string): Promise<void> {
    this.logStep("Fill Update Address Details Form");
    const noteText = note ?? `Automation URP-T60 address update ${Date.now()}`;

    const updateForm = this.page
      .locator("div, section")
      .filter({ has: this.page.getByText(/Update Address Details/i) })
      .last();

    const emptyDropdowns = updateForm.locator("p-dropdown .p-dropdown-label-empty");
    const dropdownCount = await emptyDropdowns.count();
    for (let i = 0; i < dropdownCount; i++) {
      const dropdown = emptyDropdowns.nth(i).locator("xpath=ancestor::p-dropdown[1]");
      if (await dropdown.isVisible().catch(() => false)) {
        await this.pickFirstPrimeNgDropdownOption(dropdown);
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

  async fillVisibleRequiredServiceRequestFields(note?: string): Promise<void> {
    this.logStep("Fill Visible Required Service Request Fields");
    const message = note ?? `Automation service request ${Date.now()}`;

    const emptyDropdowns = this.page.locator("p-dropdown .p-dropdown-label-empty");
    const dropdownCount = await emptyDropdowns.count();
    for (let i = 0; i < dropdownCount; i++) {
      const dropdown = emptyDropdowns.nth(i).locator("xpath=ancestor::p-dropdown[1]");
      if (await dropdown.isVisible().catch(() => false)) {
        await this.pickFirstPrimeNgDropdownOption(dropdown);
      }
    }

    const textareas = this.page.locator("textarea:visible");
    const textareaCount = await textareas.count();
    for (let i = 0; i < textareaCount; i++) {
      const textarea = textareas.nth(i);
      const value = (await textarea.inputValue()).trim();
      if (!value) {
        await textarea.fill(message);
      }
    }

    const emptyInputs = this.page.locator(
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
