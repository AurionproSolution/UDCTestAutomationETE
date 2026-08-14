/**
 * RSS Portal — Contact UDC dialog (`app-contact-us`), opened from the top-bar mail icon.
 */

import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export interface ContactUdcFormData {
  messageCategory: string;
  message: string;
  preferredContactMethod: string;
  preferredContactTime?: string;
}

export class RSSContactUdcPage extends BasePage {
  readonly contactTopbarButton: Locator;

  constructor(page: Page) {
    super(page);
    this.contactTopbarButton = page
      .locator(".layout-topbar-menu button.layout-topbar-button")
      .filter({
        has: page.locator('img[src*="contact-topbar-primary"]'),
      })
      .first();
  }

  protected stepLogPrefix(): string {
    return "RSS Portal — Contact UDC";
  }

  contactDialog(): Locator {
    return this.page.getByRole("dialog").filter({ hasText: /Contact UDC/i }).first();
  }

  private dropdownByFieldLabel(label: RegExp): Locator {
    const dialog = this.contactDialog();
    const fieldText = dialog.getByText(label, { exact: false }).first();
    return fieldText.locator("xpath=..").locator("p-dropdown").first();
  }

  messageTextarea(): Locator {
    return this.contactDialog().locator("textarea#note");
  }

  messageCategoryDropdown(): Locator {
    return this.dropdownByFieldLabel(/Message Category/i);
  }

  preferredContactMethodDropdown(): Locator {
    return this.dropdownByFieldLabel(/Preferred Contact Method/i);
  }

  preferredContactTimeDropdown(): Locator {
    return this.dropdownByFieldLabel(/Preferred Contact Time/i);
  }

  sendButton(): Locator {
    return this.contactDialog().getByRole("button", { name: /^Send$/i });
  }

  cancelButton(): Locator {
    return this.contactDialog().getByRole("button", { name: /^Cancel$/i });
  }

  async openFromTopbar(): Promise<void> {
    this.logStep("Open Contact UDC From Topbar");
    await this.contactTopbarButton.waitFor({ state: "visible", timeout: 30_000 });
    await this.clickElement(this.contactTopbarButton);
    await this.expectContactDialogVisible();
  }

  async expectContactDialogVisible(): Promise<void> {
    this.logStep("Expect Contact Dialog Visible");
    const dialog = this.contactDialog();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(/How can we help\?/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(dialog.getByText(/Message Category/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(dialog.getByLabel(/Message/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText(/Preferred Contact Method/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(dialog.getByText(/0800 500 832/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.sendButton()).toBeVisible({ timeout: 10_000 });
    await expect(this.cancelButton()).toBeVisible({ timeout: 10_000 });
  }

  private escapeRx(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private async pickPrimeNgDropdownOption(
    root: Locator,
    optionLabel: string,
  ): Promise<void> {
    const looseName = new RegExp(this.escapeRx(optionLabel), "i");
    await root.waitFor({ state: "attached", timeout: 15_000 });
    await this.waitForLoadingComplete();
    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root
      .locator(".p-dropdown-trigger, [aria-label='dropdown trigger']")
      .first();
    const dropdownClickTimeoutMs = 90_000;
    if (await combobox.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.clickElement(combobox, dropdownClickTimeoutMs);
    } else {
      await this.clickElement(trigger, dropdownClickTimeoutMs);
    }
    const visiblePanel = this.page.locator(".p-dropdown-panel").filter({ visible: true });
    await visiblePanel.last().waitFor({ state: "visible", timeout: 12_000 });
    const panel = visiblePanel.last();
    const row = panel
      .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
      .filter({ hasText: looseName })
      .first();
    if (await row.isVisible({ timeout: 4000 }).catch(() => false)) {
      await row.click();
    } else {
      const byRole = this.page.getByRole("option", { name: looseName }).first();
      await byRole.waitFor({ state: "visible", timeout: 8000 });
      await byRole.click();
    }
    await this.waitForLoadingComplete();
    await this.page
      .locator(".p-dropdown-panel")
      .filter({ visible: true })
      .waitFor({ state: "hidden", timeout: 5_000 })
      .catch(() => undefined);
  }

  /** Opens a dropdown and returns visible option labels (panel is closed afterward). */
  async getDropdownOptionLabels(root: Locator): Promise<string[]> {
    await root.waitFor({ state: "attached", timeout: 15_000 });
    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root
      .locator(".p-dropdown-trigger, [aria-label='dropdown trigger']")
      .first();
    if (await combobox.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.clickElement(combobox, 90_000);
    } else {
      await this.clickElement(trigger, 90_000);
    }
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

  async fillRequiredFields(data: ContactUdcFormData): Promise<void> {
    this.logStep("Fill Required Contact UDC Fields");
    await this.pickPrimeNgDropdownOption(
      this.dropdownByFieldLabel(/Message Category/i),
      data.messageCategory,
    );
    await this.messageTextarea().fill(data.message);
    await this.pickPrimeNgDropdownOption(
      this.dropdownByFieldLabel(/Preferred Contact Method/i),
      data.preferredContactMethod,
    );
    if (data.preferredContactTime) {
      await this.pickPrimeNgDropdownOption(
        this.dropdownByFieldLabel(/Preferred Contact Time/i),
        data.preferredContactTime,
      );
    }
  }

  dialogCloseButton(): Locator {
    return this.contactDialog()
      .getByText(/^X\s*Close$/i)
      .first()
      .or(
        this.contactDialog()
          .locator("button.p-dialog-header-close:not(.p-dialog-header-maximize)")
          .first(),
      );
  }

  unsavedChangesDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ hasText: /Any unsaved changes will be lost/i })
      .first();
  }

  async selectPreferredContactMethod(method: string): Promise<void> {
    await this.page.keyboard.press("Escape").catch(() => undefined);
    await this.pickPrimeNgDropdownOption(
      this.preferredContactMethodDropdown(),
      method,
    );
    await this.waitForLoadingComplete();
    const combobox = this.preferredContactMethodDropdown()
      .locator('[role="combobox"]')
      .first();
    await expect(combobox).toContainText(method, { timeout: 15_000 });
  }

  async selectPreferredContactTime(time: string): Promise<void> {
    await this.pickPrimeNgDropdownOption(this.preferredContactTimeDropdown(), time);
  }

  private preferredContactTimeCombobox(): Locator {
    return this.preferredContactTimeDropdown().locator('[role="combobox"]').first();
  }

  private async isPreferredContactTimeDisabled(): Promise<boolean> {
    const dialog = this.contactDialog();
    const labelCount = await dialog.getByText(/Preferred Contact Time/i).count();
    const dropdown = this.preferredContactTimeDropdown();
    const dropdownCount = await dropdown.count();

    if (labelCount === 0 && dropdownCount === 0) {
      return true;
    }

    if (dropdownCount === 0) {
      return labelCount > 0;
    }

    const cls = (await dropdown.getAttribute("class")) ?? "";
    if (/p-disabled/i.test(cls)) {
      return true;
    }

    const combobox = this.preferredContactTimeCombobox();
    if ((await combobox.count()) === 0) {
      return true;
    }

    return combobox.isDisabled();
  }

  async expectPreferredContactTimeDisabled(): Promise<void> {
    this.logStep("Expect Preferred Contact Time Disabled");
    await this.waitForLoadingComplete();
    await expect
      .poll(async () => this.isPreferredContactTimeDisabled(), {
        timeout: 15_000,
        message:
          "Preferred Contact Time should be disabled or hidden when contact method is Email",
      })
      .toBe(true);
  }

  async expectPreferredContactTimeCleared(): Promise<void> {
    this.logStep("Expect Preferred Contact Time Cleared");
    await this.waitForLoadingComplete();

    const dropdown = this.preferredContactTimeDropdown();
    if ((await dropdown.count()) === 0) {
      await expect(this.contactDialog().getByText(/Preferred Contact Time/i)).toHaveCount(0);
      return;
    }

    const label = dropdown.locator(".p-dropdown-label").first();
    if (await label.isVisible().catch(() => false)) {
      const text = (await label.innerText()).replace(/\s+/g, " ").trim();
      expect(text).toMatch(/^(--\s*Select|Please Complete)?$/i);
      return;
    }

    const combobox = this.preferredContactTimeCombobox();
    await expect(combobox).toBeDisabled({ timeout: 10_000 });
    const comboboxText = (
      (await combobox.getAttribute("aria-label")) ??
      (await combobox.textContent()) ??
      ""
    )
      .replace(/\s+/g, " ")
      .trim();
    expect(comboboxText).toMatch(/^(--\s*Select|Please Complete)?$/i);
  }

  /** URP-T143 — Message textarea accepts at most 1000 characters. */
  async expectMessageCharacterLimit1000(): Promise<void> {
    this.logStep("Expect Message Character Limit 1000");
    const textarea = this.messageTextarea();
    await textarea.fill("x".repeat(1001));
    const value = await textarea.inputValue();
    expect(value.length).toBeLessThanOrEqual(1000);
  }

  async submitAndExpectMandatoryFieldError(): Promise<void> {
    this.logStep("Submit And Expect Mandatory Field Error");
    await this.submit();
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
    await this.clickElement(this.cancelButton());
    await this.expectUnsavedChangesCancelDialog();
  }

  async clickCloseAndExpectUnsavedChangesDialog(): Promise<void> {
    this.logStep("Click Close And Expect Unsaved Changes Dialog");
    await this.clickElement(this.dialogCloseButton());
    await this.expectUnsavedChangesCancelDialog();
  }

  async submit(): Promise<void> {
    this.logStep("Submit Contact UDC Form");
    await this.clickElement(this.sendButton());
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
