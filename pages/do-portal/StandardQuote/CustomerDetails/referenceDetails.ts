import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

/**
 * Step 5 — Reference Details: add a reference contact, confirm, submit.
 */
export class DOReferenceDetailsPage extends BasePage {
  readonly addContactDetailsButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addContactDetailsButton = page.getByText("Add Contact Details", {
      exact: true,
    });
    this.submitButton = page.getByRole("button", { name: "Submit" }).last();
  }

  /**
   * “Add contact” modal — scoped by **Contact Type** so we never click inside the wrong
   * `role=dialog` (toast, confirm, etc.). Prefer **last** match when several exist in the DOM.
   */
  private contactAddModal(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ has: this.page.getByText(/Contact Type/i) })
      .last();
  }

  async waitForReferenceDetailsStep(): Promise<void> {
    await this.addContactDetailsButton.waitFor({
      state: "visible",
      timeout: 120000,
    });
  }

  async clickAddContactDetails(): Promise<void> {
    await this.addContactDetailsButton.scrollIntoViewIfNeeded();
    await this.addContactDetailsButton.click({ timeout: 30000 });
    await this.contactAddModal().waitFor({ state: "visible", timeout: 20000 });
  }

  private async selectDropdownInRoot(
    root: Locator,
    labelNeedle: string,
    optionName: string,
  ): Promise<void> {
    const q = labelNeedle.replace(/'/g, "");
    const primary = root.locator(
      `xpath=.//label[contains(normalize-space(.),'${q}')]/following-sibling::*//div[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]`,
    );
    const fallback = root
      .locator("label")
      .filter({ hasText: new RegExp(q, "i") })
      .first()
      .locator(
        "xpath=following::button[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
      );

    const trigger = (await primary.isVisible({ timeout: 4000 }).catch(() => false))
      ? primary
      : fallback;

    await trigger.waitFor({ state: "visible", timeout: 20000 });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const rxOpt = new RegExp(
      `^${optionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i",
    );
    const opt = this.page.getByRole("option", { name: rxOpt }).first();
    await opt.waitFor({ state: "visible", timeout: 15000 });
    await opt.click();
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
    // Never send Escape here: PrimeNG `p-dialog` uses it to **close the whole modal**, not only the dropdown.
  }

  async selectContactType(optionName: string): Promise<void> {
    await this.selectDropdownInRoot(
      this.contactAddModal(),
      "Contact Type",
      optionName,
    );
  }

  /**
   * Resolves the real `<input>` for a float label. `getByLabel` / generic `text` + `#text` can resolve
   * the wrong row so Last Name overwrites First Name.
   */
  private contactNameInput(
    dialog: Locator,
    which: "first" | "last",
  ): Locator {
    const needle = which === "first" ? "Contact First Name" : "Contact Last Name";
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return dialog
      .locator("label")
      .filter({ hasText: new RegExp(escaped, "i") })
      .first()
      .locator(
        "xpath=following::input[contains(@class,'p-inputtext') and contains(@class,'p-component')][1]",
      );
  }

  async enterContactFirstName(value: string): Promise<void> {
    const input = this.contactNameInput(this.contactAddModal(), "first");
    await input.waitFor({ state: "visible", timeout: 15000 });
    await input.click();
    await input.fill(value);
  }

  async enterContactLastName(value: string): Promise<void> {
    const dialog = this.contactAddModal();
    const byLabelRow = this.contactNameInput(dialog, "last");
    if (await byLabelRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await byLabelRow.click();
      await byLabelRow.fill(value);
      return;
    }
    /**
     * QAT: `input.p-inputtext.p-component.p-element.form-control.ng-star-inserted.ng-dirty…`
     * Omit `ng-dirty` / `ng-touched` / `ng-invalid` / `invalid-field` — they change after focus/blur
     * and would make the locator miss or match the wrong moment.
     */
    const byStableClasses = dialog.locator(
      "input.p-inputtext.p-component.p-element.form-control.ng-star-inserted",
    );
    const count = await byStableClasses.count();
    const input =
      count >= 2 ? byStableClasses.nth(1) : byStableClasses.last();
    await input.waitFor({ state: "visible", timeout: 15000 });
    await input.click();
    await input.fill(value);
  }

  async clickAddContactInModal(): Promise<void> {
    const dialog = this.contactAddModal();
    await dialog.waitFor({ state: "visible", timeout: 20000 });

    // Blur name fields so PrimeNG / Angular validation enables the footer button.
    await this.contactNameInput(dialog, "last").press("Tab");
    await this.page.waitForTimeout(300);

    const byRole = dialog
      .getByRole("button", { name: /Add Contact/i })
      .filter({ hasNotText: /Add Contact Details/i })
      .first();
    const footerBtn = dialog
      .locator(".p-dialog-footer button, footer button")
      .filter({ hasText: /^Add Contact$/i })
      .filter({ hasNotText: /Details/i })
      .first();

    const btn = (await byRole.isVisible({ timeout: 4000 }).catch(() => false))
      ? byRole
      : footerBtn;

    await btn.waitFor({ state: "visible", timeout: 20000 });
    await expect(btn).toBeEnabled({ timeout: 30000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ timeout: 20000 });
    await dialog.waitFor({ state: "hidden", timeout: 25000 }).catch(() => {});
  }

  private confirmDetailsCheckboxHost(): Locator {
    const labelRx = /I confirm that all customer details are correct/i;
    return this.page.locator("p-checkbox").filter({ hasText: labelRx }).first();
  }

  /**
   * Reference Details footer **Submit** without ticking **I confirm…** should surface a guard
   * (e.g. “Please Confirm your details are correct”) before Post Submission.
   */
  async expectConfirmCustomerDetailsCheckboxRequiredValidation(): Promise<void> {
    const host = this.confirmDetailsCheckboxHost();
    await host.waitFor({ state: "visible", timeout: 20_000 });

    const input = host.locator('input[type="checkbox"]').first();
    if (await input.isChecked().catch(() => false)) {
      return;
    }

    await this.submitButton.waitFor({ state: "visible", timeout: 60_000 });
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click({ timeout: 30_000 });

    const messageRx =
      /Please\s+Confirm\s+your\s+details\s+are\s+correct|Please\s+[Cc]onfirm.*your\s+details.*correct|confirm\s+your\s+details\s+are\s+correct/i;
    await expect(this.page.getByText(messageRx).first()).toBeVisible({ timeout: 20_000 });
  }

  async confirmCustomerDetailsCorrect(): Promise<void> {
    const host = this.confirmDetailsCheckboxHost();
    await host.waitFor({ state: "visible", timeout: 15000 });

    const visibleBox = host.locator("div.p-checkbox-box:visible").first();
    await visibleBox.waitFor({ state: "visible", timeout: 15000 });
    await visibleBox.scrollIntoViewIfNeeded();
    await visibleBox.evaluate((el) =>
      (el as HTMLElement).scrollIntoView({ block: "center", inline: "nearest" }),
    );

    const isChecked = async (): Promise<boolean> => {
      const visual = await host
        .locator(".p-checkbox-box.p-checkbox-checked, .p-checkbox-box.p-highlight")
        .first()
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      if (visual) return true;
      const input = host.locator('input[type="checkbox"]').first();
      return input.isChecked().catch(() => false);
    };

    if (await isChecked()) return;

    await visibleBox.click({ timeout: 15000 });
    if (await isChecked()) return;

    await visibleBox.click({ force: true, timeout: 15000 });
  }

  async clickSubmitButton(): Promise<void> {
    await this.submitButton.waitFor({ state: "visible", timeout: 60000 });
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
  }

  /**
   * After contact + **I confirm…**: leave Customer Details for Post Submission.
   * QAT often uses a sticky footer **Save and Next** or **Next** (`span.p-button-label`) before Post Submission;
   * other builds use **Submit** only. Try advances in order, then **Submit** if Upload is not yet shown.
   */
  async advanceFromReferenceDetailsToPostSubmission(): Promise<void> {
    const uploadBrowse = this.page.locator(':text-is("Browse Files")');

    const footerAdvanceButtons: Locator[] = [
      this.page.getByRole("button", { name: /Save\s+and\s+Next|Save\s*&\s*Next/i }).last(),
      /** QAT: label is often a `span` with exact `Next` — resolve the real `<button>`. */
      this.page.locator("button").filter({ has: this.page.locator(':text-is("Next")') }).last(),
      this.page.getByRole("button", { name: /^Next$/i }).last(),
      this.page
        .locator("button.p-button, button.p-element")
        .filter({ has: this.page.locator("span.p-button-label").filter({ hasText: /^Next$/ }) })
        .last(),
    ];

    for (const btn of footerAdvanceButtons) {
      const ready =
        (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) &&
        (await btn.isEnabled().catch(() => false));
      if (!ready) continue;
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ timeout: 20_000 });
      await this.page.waitForLoadState("domcontentloaded").catch(() => {});
      if (await uploadBrowse.isVisible({ timeout: 8_000 }).catch(() => false)) {
        return;
      }
    }

    await this.clickSubmitButton();
  }
}
