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
    return this.page.getByRole("dialog").filter({ hasText: /Contact UDC/i });
  }

  private dropdownByFieldLabel(label: RegExp): Locator {
    return this.contactDialog()
      .locator("label")
      .filter({ hasText: label })
      .locator("xpath=ancestor::span[1]")
      .locator("p-dropdown")
      .first();
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
    await root.waitFor({ state: "visible", timeout: 15_000 });
    await this.waitForLoadingComplete();
    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root
      .locator(".p-dropdown-trigger, [aria-label='dropdown trigger']")
      .first();
    const dropdownClickTimeoutMs = 90_000;
    if (await combobox.isVisible().catch(() => false)) {
      await this.clickElement(combobox, dropdownClickTimeoutMs);
    } else {
      await trigger.waitFor({ state: "visible", timeout: 15_000 });
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
  }

  /** Opens a dropdown and returns visible option labels (panel is closed afterward). */
  async getDropdownOptionLabels(root: Locator): Promise<string[]> {
    await root.waitFor({ state: "visible", timeout: 15_000 });
    const combobox = root.locator('[role="combobox"]').first();
    await this.clickElement(combobox, 90_000);
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
