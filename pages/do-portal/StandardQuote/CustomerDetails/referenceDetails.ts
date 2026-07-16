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

  /** UDP-T4710 — **Signatory** on Add Contact modal (`Yes` / `No` dropdown, toggle, or checkbox). */
  async selectContactSignatory(option: "Yes" | "No"): Promise<void> {
    this.logStep(`Select contact signatory: ${option}`);
    const dialog = this.contactAddModal();
    await dialog.waitFor({ state: "visible", timeout: 20_000 });
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);

    try {
      await this.selectDropdownInRoot(dialog, "Signatory", option);
      return;
    } catch {
      /* fall through to toggle / checkbox */
    }

    const host = dialog
      .locator("p-checkbox, .p-checkbox, p-inputswitch, .p-inputswitch")
      .filter({ hasText: /Signatory/i })
      .first();
    if (await host.isVisible({ timeout: 4_000 }).catch(() => false)) {
      const box = host.locator(".p-checkbox-box, .p-inputswitch-slider").first();
      const input = host.locator('input[type="checkbox"]').first();
      const isOn = async (): Promise<boolean> => {
        if (await host.locator(".p-checkbox-checked, .p-highlight, .p-inputswitch-checked").first().isVisible({ timeout: 500 }).catch(() => false)) {
          return true;
        }
        return input.isChecked().catch(() => false);
      };
      const wantOn = option === "Yes";
      if ((await isOn()) !== wantOn) {
        await box.click({ timeout: 15_000 }).catch(() => host.click({ timeout: 15_000 }));
      }
      return;
    }

    const yesNo = dialog
      .getByRole("button", { name: new RegExp(`^${option}$`, "i") })
      .or(dialog.getByText(new RegExp(`^${option}$`, "i")))
      .first();
    if (await yesNo.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await yesNo.click({ timeout: 15_000 });
    }
  }

  private referenceContactCard(namePattern: RegExp): Locator {
    return this.page
      .locator("gen-card, p-card, .p-card, section, div")
      .filter({ hasText: namePattern })
      .filter({ hasText: /Signatory/i })
      .first();
  }

  /** UDP-T4710 — added reference contact card shows **Signatory** value. */
  async expectReferenceContactSignatoryShows(
    namePattern: RegExp,
    expected: "Yes" | "No",
  ): Promise<void> {
    this.logStep(
      `Expect reference contact signatory ${expected} (${namePattern.source})`,
    );
  
    const card = this.referenceContactCard(namePattern);
  
    await expect(card).toBeVisible({ timeout: 30_000 });
  
    await expect
      .poll(
        async () => (await card.textContent())?.replace(/\s+/g, " ") ?? "",
        { timeout: 15_000 },
      )
      .toMatch(new RegExp(`\\b${expected}\\b`, "i"));
  }
  /** UDP-T4710 — open an existing reference contact card for edit (pencil / **Edit**). */
  async openReferenceContactForEdit(namePattern: RegExp): Promise<void> {
    this.logStep(`Open reference contact for edit (${namePattern.source})`);
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    const card = this.page
      .locator("gen-card, p-card, .p-card, section, div")
      .filter({ hasText: namePattern })
      .first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    const editBtn = card
      .getByRole("button", { name: /^Edit$/i })
      .or(card.locator("i.pi-pencil, .pi-pencil, .fa-pencil, .fa-edit").locator("xpath=ancestor::button[1]"))
      .first();
    await editBtn.scrollIntoViewIfNeeded();
    await editBtn.click({ timeout: 15_000 });
    await this.contactAddModal().waitFor({ state: "visible", timeout: 20_000 });
  }

  /** UDP-T4710 — save an existing contact from the add/edit modal (**Save** / **Update**). */
  async clickSaveContactInModal(): Promise<void> {
    this.logStep("Save contact in modal");
    const dialog = this.contactAddModal();
    await dialog.waitFor({ state: "visible", timeout: 20_000 });
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);

    const saveBtn = dialog
      .getByRole("button", { name: /^(Save|Update)(\s+Contact)?$/i })
      .or(dialog.locator(".p-dialog-footer button, footer button").filter({ hasText: /^Save$/i }))
      .first();
    if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(saveBtn).toBeEnabled({ timeout: 30_000 });
      await saveBtn.scrollIntoViewIfNeeded();
      await saveBtn.click({ timeout: 20_000 });
      await dialog.waitFor({ state: "hidden", timeout: 25_000 }).catch(() => {});
      await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
      return;
    }
    await this.clickAddContactInModal();
  }

  /** UDP-T4710 — jump to **Reference Details** from the individual customer stepper. */
  async navigateToReferenceDetailsStep(): Promise<void> {
    this.logStep("Navigate to Reference Details step");
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    const step = this.page
      .locator("button, a, span, li")
      .filter({ hasText: /Reference\s+Details|Contact\s+Details/i })
      .first();
    if (await step.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await step.click({ timeout: 15_000 });
      await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    }
    await this.waitForReferenceDetailsStep();
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

    await expect
      .poll(
        async () => {
          if (await reachedPostSubmissionEntry()) {
            return true;
          }
          await this.waitUntilNoVisibleAppLoaderOverlays(90_000);
          if (await this.submitButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await this.submitButton.scrollIntoViewIfNeeded();
            await this.submitButton.click({ timeout: 30_000 }).catch(() => {});
            await this.page.waitForLoadState("domcontentloaded").catch(() => {});
            await this.waitUntilNoVisibleAppLoaderOverlays(90_000);
          }
          return reachedPostSubmissionEntry();
        },
        { timeout: 120_000, intervals: [500, 1_500, 3_000] },
      )
      .toBeTruthy();
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
