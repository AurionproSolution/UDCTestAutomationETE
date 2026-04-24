import { Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

/**
 * Step 5 — Reference Details: add a reference contact, confirm, submit.
 */
export class DOReferenceDetailsPage extends BasePage {
  readonly addContactDetailsButton: Locator;
  readonly addContactDialog: Locator;
  readonly addContactButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addContactDetailsButton = page.locator(':text-is("Add Contact Details")');
    this.addContactDialog = page.getByRole("dialog");
    this.addContactButton = page.locator(':text-is("Add Contact")');
    this.submitButton = page.getByRole("button", { name: "Submit" }).last();
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
    await this.addContactDialog.waitFor({ state: "visible", timeout: 20000 });
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
    await this.selectDropdownInRoot(this.addContactDialog, "Contact Type", optionName);
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
    const input = this.contactNameInput(this.addContactDialog, "first");
    await input.waitFor({ state: "visible", timeout: 15000 });
    await input.click();
    await input.fill(value);
  }

  async enterContactLastName(value: string): Promise<void> {
    const dialog = this.addContactDialog;
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
    const inDialog = this.addContactDialog.locator(':text-is("Add Contact")');
    const target = (await inDialog.isVisible({ timeout: 2000 }).catch(() => false))
      ? inDialog
      : this.addContactButton;
    await target.scrollIntoViewIfNeeded();
    await target.click({ timeout: 20000 });
    await this.addContactDialog.waitFor({ state: "hidden", timeout: 25000 }).catch(() => {});
  }

  async confirmCustomerDetailsCorrect(): Promise<void> {
    const byRole = this.page.getByRole("checkbox", {
      name: /I confirm that all customer details are correct/i,
    });
    if (await byRole.isVisible({ timeout: 5000 }).catch(() => false)) {
      await byRole.check();
      return;
    }
    const confirmRow = this.page
      .locator("div")
      .filter({ hasText: /I confirm that all customer details are correct/i })
      .first();
    await confirmRow.waitFor({ state: "visible", timeout: 15000 });
    const box = confirmRow.locator("div.p-checkbox-box").first();
    await box.scrollIntoViewIfNeeded();
    await box.click();
  }

  async clickSubmitButton(): Promise<void> {
    await this.submitButton.waitFor({ state: "visible", timeout: 60000 });
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
  }
}
