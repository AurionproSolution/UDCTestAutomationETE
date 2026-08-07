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

  private async pickPrimeNgDropdownOption(
    root: Locator,
    optionLabel?: RegExp | string,
  ): Promise<void> {
    await root.waitFor({ state: "visible", timeout: 15_000 });
    const combobox = root.locator('[role="combobox"]').first();
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
      ? items.filter({ hasText: optionLabel }).first()
      : items.filter({ hasNotText: /^--\s*Select\s*--$/i }).first();
    await item.waitFor({ state: "visible", timeout: 10_000 });
    await item.click();
    await this.waitForLoadingComplete();
  }

  private dropdownByLabel(root: Locator, label: RegExp): Locator {
    return root
      .locator("p-dropdown")
      .filter({ has: root.getByText(label) })
      .first()
      .or(
        root.locator(
          `xpath=.//*[self::label or self::span][contains(normalize-space(.),'${label.source.replace(/\\/g, "")}')]/following::p-dropdown[1]`,
        ),
      )
      .first();
  }

  async fillFormalSettlementQuoteForm(data?: FormalSettlementQuoteData): Promise<void> {
    this.logStep("Fill Formal Settlement Quote Form");
    const message = data?.note ?? `Automation settlement quote ${Date.now()}`;
    const root = this.settlementFormRoot();

    if (data?.settlementDate) {
      const dateInput = root
        .locator('input[name*="settlement" i], [formcontrolname*="settlement" i] input, p-calendar input')
        .first();
      if (await dateInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await dateInput.click({ timeout: 15_000 });
        await dateInput.fill(data.settlementDate);
        await dateInput.press("Tab").catch(() => undefined);
      }
    }

    const paymentMethod = this.dropdownByLabel(root, /Payment Method/i);
    if (await paymentMethod.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.pickPrimeNgDropdownOption(
        paymentMethod,
        data?.paymentMethod ?? /Debit my nominated bank/i,
      );
    }

    const reason = this.dropdownByLabel(root, /^Reason$/i);
    if (await reason.isVisible({ timeout: 3_000 }).catch(() => false)) {
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

    const contactMethod = this.dropdownByLabel(root, /Preferred Contact Method/i);
    if (await contactMethod.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.pickPrimeNgDropdownOption(contactMethod, data?.preferredContactMethod ?? /Email/i);
    }

    const contactTime = this.dropdownByLabel(root, /Preferred Contact Time/i);
    if (await contactTime.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const face = contactTime.locator('[role="combobox"]').first();
      const disabled =
        (await face.getAttribute("aria-disabled").catch(() => null)) === "true" ||
        !(await face.isEnabled().catch(() => true));
      if (!disabled) {
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
      const combobox = dropdown.locator('[role="combobox"]').first();
      const disabled =
        (await combobox.getAttribute("aria-disabled").catch(() => null)) === "true" ||
        !(await combobox.isEnabled().catch(() => true));
      if (disabled) {
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
}
