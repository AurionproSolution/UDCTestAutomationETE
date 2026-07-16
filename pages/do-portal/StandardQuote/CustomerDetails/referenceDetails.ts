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
   * “Add contact” modal — inner `role=dialog` (not the outer `p-dynamicdialog` host).
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

  private static readonly SIGNATORY_LABEL_RX = /^Signatory\b/i;

  /** PrimeNG `toggle-checkbox` row for **Signatory** in the Add Contact modal. */
  private contactSignatoryBlock(): Locator {
    return this.contactAddModal()
      .locator("toggle-checkbox")
      .filter({ hasText: DOReferenceDetailsPage.SIGNATORY_LABEL_RX })
      .filter({ visible: true })
      .first();
  }

  private contactSignatoryLabel(): Locator {
    return this.contactAddModal()
      .getByText(DOReferenceDetailsPage.SIGNATORY_LABEL_RX)
      .filter({ visible: true })
      .first();
  }

  private contactSignatorySwitchRoot(): Locator {
    const block = this.contactSignatoryBlock();
    return block
      .locator("[data-pc-name='inputswitch'], .p-inputswitch, p-inputswitch")
      .first();
  }

  private async clickContactSignatoryToggleOnce(): Promise<boolean> {
    const dialog = this.contactAddModal();
    await dialog.waitFor({ state: "visible", timeout: 20_000 });

    const block = this.contactSignatoryBlock();
    if (await block.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await block.scrollIntoViewIfNeeded().catch(() => {});
      const slider = block.locator("span.p-inputswitch-slider:visible").first();
      if (await slider.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await slider.click({ timeout: 10_000 });
        return true;
      }
      const switchRoot = this.contactSignatorySwitchRoot();
      if (await switchRoot.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await switchRoot.click({ timeout: 10_000 });
        return true;
      }
    }

    const label = this.contactSignatoryLabel();
    if (!(await label.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return false;
    }
    await label.scrollIntoViewIfNeeded().catch(() => {});

    const toggleRow = label.locator("xpath=ancestor::toggle-checkbox[1]");
    if (await toggleRow.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const slider = toggleRow.locator("span.p-inputswitch-slider:visible").first();
      if (await slider.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await slider.click({ timeout: 10_000 });
        return true;
      }
    }

    const following = label.locator(
      "xpath=following::span[contains(@class,'p-inputswitch-slider')][1]",
    );
    if (await following.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await following.click({ timeout: 10_000 });
      return true;
    }

    const shell = label.locator("xpath=ancestor::*[.//p-inputswitch][1]").first();
    const inShell = shell
      .locator('span.p-inputswitch-slider[data-pc-section="slider"], span.p-inputswitch-slider')
      .filter({ visible: true })
      .first();
    if (await inShell.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await inShell.click({ timeout: 10_000 });
      return true;
    }

    return false;
  }

  private async isContactSignatoryYesInModal(): Promise<boolean> {
    const dialog = this.contactAddModal();
    if (!(await dialog.isVisible({ timeout: 500 }).catch(() => false))) {
      return false;
    }

    const block = this.contactSignatoryBlock();
    if (await block.isVisible({ timeout: 500 }).catch(() => false)) {
      const switchRoot = this.contactSignatorySwitchRoot();
      if (await switchRoot.count()) {
        const inner = switchRoot.locator(".p-inputswitch.p-component").first();
        const clsTarget = (await inner.count()) ? inner : switchRoot;
        const cls = (await clsTarget.getAttribute("class").catch(() => "")) ?? "";
        if (/p-inputswitch-checked/.test(cls)) {
          return true;
        }

        const checkbox = switchRoot.locator('input[type="checkbox"]').first();
        if (await checkbox.isChecked().catch(() => false)) {
          return true;
        }
        if ((await checkbox.getAttribute("aria-checked").catch(() => "")) === "true") {
          return true;
        }
      }

      if (await block.getByText(/^Yes$/i).isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }
    }

    const label = this.contactSignatoryLabel();
    if (!(await label.isVisible({ timeout: 500 }).catch(() => false))) {
      return false;
    }

    const toggleRow = label.locator("xpath=ancestor::toggle-checkbox[1]");
    if (await toggleRow.isVisible({ timeout: 500 }).catch(() => false)) {
      const switchRoot = toggleRow
        .locator("[data-pc-name='inputswitch'], .p-inputswitch, p-inputswitch")
        .first();
      const cls = (await switchRoot.getAttribute("class").catch(() => "")) ?? "";
      if (/p-inputswitch-checked/.test(cls)) {
        return true;
      }
      const checkbox = switchRoot.locator('input[type="checkbox"]').first();
      if (await checkbox.isChecked().catch(() => false)) {
        return true;
      }
      if (await toggleRow.getByText(/^Yes$/i).isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }
    }

    const following = label.locator(
      "xpath=following::span[contains(@class,'p-inputswitch-slider')][1]",
    );
    if (await following.isVisible({ timeout: 500 }).catch(() => false)) {
      const sw = following.locator("xpath=ancestor::p-inputswitch[1]");
      const cls = (await sw.getAttribute("class").catch(() => "")) ?? "";
      if (/p-inputswitch-checked/.test(cls)) {
        return true;
      }
    }

    return false;
  }

  /** Turn **Signatory** on in the Add Contact modal. */
  async setContactSignatoryYes(): Promise<void> {
    await this.contactAddModal().waitFor({ state: "visible", timeout: 20_000 });
    await expect
      .poll(async () => (await this.contactSignatoryLabel().isVisible().catch(() => false)) ||
        (await this.contactSignatoryBlock().isVisible().catch(() => false)), {
        timeout: 20_000,
      })
      .toBe(true);

    if (await this.isContactSignatoryYesInModal()) {
      return;
    }

    const clicked = await this.clickContactSignatoryToggleOnce();
    if (!clicked) {
      throw new Error(
        "Signatory toggle not found in Add Contact modal (expected label 'Signatory' with p-inputswitch).",
      );
    }

    if (!(await this.isContactSignatoryYesInModal())) {
      await this.clickContactSignatoryToggleOnce().catch(() => {});
    }
    if (!(await this.isContactSignatoryYesInModal())) {
      const block = this.contactSignatoryBlock();
      await block.getByText(/^No$/i).click({ force: true }).catch(() => {});
      await this.clickContactSignatoryToggleOnce().catch(() => {});
    }

    await expect.poll(async () => this.isContactSignatoryYesInModal(), { timeout: 15_000 }).toBe(true);
  }

  async enterContactEmail(email: string): Promise<void> {
    const dialog = this.contactAddModal();
    const input = dialog.locator("#email").first();
    await input.waitFor({ state: "visible", timeout: 15_000 });
    await input.click();
    await input.fill(email);
  }

  /** Mobile **Area Code** in Add Contact modal (`phone` with placeholder Area Code). */
  async enterContactMobileAreaCode(areaCode: string): Promise<void> {
    const dialog = this.contactAddModal();
    const input = dialog.locator("phone input[placeholder='Area Code']").first();
    await input.waitFor({ state: "visible", timeout: 15_000 });
    await input.click();
    await input.fill(areaCode);
  }

  /** Mobile number in Add Contact modal (second `phone` field after area code). */
  async enterContactMobileNumber(mobileNumber: string): Promise<void> {
    const dialog = this.contactAddModal();
    const input = dialog.locator("phone").nth(1).locator("input#phone").first();
    await input.waitFor({ state: "visible", timeout: 15_000 });
    await input.click();
    await input.fill(mobileNumber);
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

  /**
   * Contact row after **Add Contact** — table grid (`tr`) on some builds, card layout on SIT/QAT.
   */
  private contactCardByFirstName(firstName: string): Locator {
    const xpathName = firstName.replace(/'/g, "\\'");
    return this.page.locator(
      `xpath=//*[normalize-space()='First Name']/following-sibling::*[normalize-space()='${xpathName}']/ancestor::*[.//*[normalize-space()='Last Name'] and .//button][1]`,
    );
  }

  private async resolveContactEntryByFirstName(firstName: string): Promise<Locator> {
    const escaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const looseRx = new RegExp(escaped, "i");

    const tableRow = this.page
      .locator("tr")
      .filter({ hasText: looseRx })
      .filter({ visible: true })
      .first();
    if (await tableRow.isVisible({ timeout: 1_500 }).catch(() => false)) {
      return tableRow;
    }

    const card = this.contactCardByFirstName(firstName).first();
    if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return card;
    }

    // Partial name match (e.g. truncated display) — still require Last Name + action buttons nearby.
    const xpathPartial = firstName.replace(/'/g, "\\'");
    return this.page
      .locator(
        `xpath=//*[normalize-space()='First Name']/following-sibling::*[contains(normalize-space(), '${xpathPartial}')]/ancestor::*[.//*[normalize-space()='Last Name'] and .//button][1]`,
      )
      .first();
  }

  async clickAddContactInModal(): Promise<void> {
    const dialog = this.contactAddModal();
    await dialog.waitFor({ state: "visible", timeout: 20000 });

    // Blur last filled field so PrimeNG / Angular validation enables the footer button.
    const emailInput = dialog.locator("input#email, input[type='email']").first();
    if (await emailInput.isVisible({ timeout: 500 }).catch(() => false)) {
      await emailInput.press("Tab").catch(() => {});
    } else {
      await this.contactNameInput(dialog, "last").press("Tab");
    }
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

  /** Contact row on Reference Details after **Add Contact** (name + **Signatory** = Yes). */
  async expectContactListedAsSignatory(contactFirstName: string): Promise<void> {
    await this.expectContactListedInAdvisoryTable({
      firstName: contactFirstName,
      signatory: true,
    });
  }

  /** Signatory **field** value (not Last Name value "Signatory") in a contact card / row. */
  private contactSignatoryYesValue(row: Locator): Locator {
    return row
      .locator(
        "xpath=.//*[normalize-space()='Signatory']/following-sibling::*[normalize-space()='Yes']",
      )
      .first();
  }

  /** Advisory Manager grid row / contact card — First Name, Phone, Email, Signatory (UDP-T4710). */
  async expectContactListedInAdvisoryTable(opts: {
    firstName: string;
    lastName?: string;
    email?: string;
    phoneFragment?: string;
    signatory?: boolean;
  }): Promise<void> {
    const row = await this.resolveContactEntryByFirstName(opts.firstName);
    await expect(row).toBeVisible({ timeout: 30_000 });
    if (opts.lastName) {
      await expect(row).toContainText(new RegExp(opts.lastName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    }
    if (opts.email) {
      await expect(row).toContainText(new RegExp(opts.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    }
    if (opts.phoneFragment) {
      await expect(row).toContainText(new RegExp(opts.phoneFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    }
    if (opts.signatory) {
      await expect(this.contactSignatoryYesValue(row)).toBeVisible({ timeout: 15_000 });
    }
  }

  /** **Signing Order** column visible and editable for the named contact (table layout only). */
  async expectSigningOrderEditableForContact(contactFirstName: string): Promise<void> {
    const signingOrderLabel = this.page.getByText(/Signing\s*Order/i).first();
    if (!(await signingOrderLabel.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return;
    }
    const row = await this.resolveContactEntryByFirstName(contactFirstName);
    await expect(row).toBeVisible({ timeout: 15_000 });
    const orderInput = row.locator("input, [role='spinbutton']").filter({ visible: true }).first();
    await expect(orderInput).toBeVisible({ timeout: 15_000 });
    await expect(orderInput).toBeEnabled();
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
    await host.waitFor({ state: "visible", timeout: 400_000 });

    const visibleBox = host.locator("div.p-checkbox-box:visible").first();
    await visibleBox.waitFor({ state: "visible", timeout: 400_000 });
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

    await visibleBox.click({ timeout: 400_000 });
    if (await isChecked()) return;

    await visibleBox.click({ force: true, timeout: 400_000 });
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
    const uploadBrowse = this.page
      .getByRole("button", { name: /^Browse Files$/i })
      .or(this.page.locator(':text-is("Browse Files")'));
    const postSubmissionStep = this.page.getByText(/^Post Submission$/i).first();

    const footerAdvanceButtons: Locator[] = [
      this.page.getByRole("button", { name: /Save\s+and\s+Next|Save\s*&\s*Next/i }).last(),
      /** QAT: label is often a `span` with exact `Next` — resolve the real `<button>`. */
      this.page
        .locator("button.p-button, button.p-element")
        .filter({ has: this.page.locator("span.p-button-label").filter({ hasText: /^Next$/ }) })
        .last(),
      this.page.locator("button").filter({ has: this.page.locator(':text-is("Next")') }).last(),
      this.page.getByRole("button", { name: /^Next$/i }).last(),
    ];

    const reachedPostSubmissionEntry = async (): Promise<boolean> =>
      (await uploadBrowse.isVisible({ timeout: 2_000 }).catch(() => false)) ||
      (await postSubmissionStep.isVisible({ timeout: 2_000 }).catch(() => false));

    for (const btn of footerAdvanceButtons) {
      const ready =
        (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) &&
        (await btn.isEnabled().catch(() => false));
      if (!ready) continue;
      await this.waitUntilNoVisibleAppLoaderOverlays(90_000);
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ timeout: 30_000 });
      await this.page.waitForLoadState("domcontentloaded").catch(() => {});
      await this.waitUntilNoVisibleAppLoaderOverlays(90_000);
      if (await reachedPostSubmissionEntry()) {
        return;
      }
    }

    await this.clickSubmitButton();
  }

  /** **.app-loader-overlay** intercepts footer **Next** / **Submit** on QAT. */
  private async waitUntilNoVisibleAppLoaderOverlays(timeoutMs: number): Promise<void> {
    await expect
      .poll(
        async () => {
          const overlays = this.page.locator(".app-loader-overlay");
          const count = await overlays.count();
          for (let i = 0; i < count; i++) {
            if (await overlays.nth(i).isVisible().catch(() => false)) {
              return false;
            }
          }
          return true;
        },
        { timeout: timeoutMs, intervals: [200, 500, 1_000, 2_000] },
      )
      .toBe(true);
  }
}
