import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

/** Visible Add Asset text field — legacy SVG `text#text` or PrimeNG / full-page `input`. */
function addAssetTextField(page: Page, label: string): Locator {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const labelPattern = new RegExp(`^\\s*${escaped}\\s*\\*?\\s*$`, "i");

  return page
    .getByRole("textbox", { name: new RegExp(`^${escaped}\\s*\\*`, "i") })
    .first()
    .or(
      page
        .locator(".p-float-label, [class*='float-label']")
        .filter({ hasText: labelPattern })
        .locator("input, textarea")
        .first(),
    )
    .or(
      page
        .locator("label, span, generic, .p-float-label")
        .filter({ hasText: labelPattern })
        .first()
        .locator("xpath=following::input[not(@type='hidden')][1] | following::textarea[1]"),
    )
    .or(
      page
        .locator("label, span, generic")
        .filter({ hasText: labelPattern })
        .locator(
          "xpath=ancestor::*[contains(@class,'col') or contains(@class,'field') or contains(@class,'grid') or contains(@class,'p-col')][1]//input[not(@type='hidden')][1]",
        ),
    )
    .or(
      page
        .locator("text")
        .filter({ hasText: labelPattern })
        .locator("#text")
        .filter({ visible: true })
        .first(),
    )
    .first();
}

export class DOAddAssetPage extends BasePage {
  // Locators
  readonly addAssetButton: Locator;
  readonly assetValueInputField: Locator;
  readonly conditionDropdown: Locator;
  readonly yearInputField: Locator;
  readonly makeInputField: Locator;
  readonly modelInputField: Locator;
  readonly variantInputField: Locator;
  readonly regoNOInputField: Locator;
  readonly vinInputField: Locator;
  readonly odometerInputField: Locator;
  readonly colourInputField: Locator;
  readonly hinInputField: Locator;
  readonly serialNOInputField: Locator;
  readonly engineNOInputField: Locator;
  readonly ccRatingInputField: Locator;
  readonly motivePowerDropdown: Locator;
  readonly countryFirstRegisteredDropdown: Locator;
  readonly assetLocationDropdown: Locator;
  readonly supplierInputField: Locator;
  readonly descriptionInputField: Locator;
  readonly insurerDetailsInputField: Locator;
  readonly brokerDetailsInputField: Locator;
  readonly sumInsuredInputField: Locator;
  readonly policyNumberInputField: Locator;
  readonly policyExpiryDateInputField: Locator;
  readonly selectDateButton: Locator;
  readonly cancelButton: Locator;
  readonly searchForAssetButton: Locator;
  readonly summitButton: Locator;
  readonly crossButton: Locator;

  // DO Portal specific locators for Add Asset page can be added here
  constructor(page: Page) {
    super(page);
    this.addAssetButton = page.getByRole("button", { name: "Add Asset" });
    /** Cost of Asset / Sum Insured Net — accessible name varies slightly by build. */
    this.assetValueInputField = page
      .getByRole("textbox", { name: "Asset Value* Sum Insured Net" })
      .or(page.getByRole("textbox", { name: /Asset Value.*Sum Insured Net/i }))
      .or(page.getByRole("textbox", { name: /Cost of Asset/i }))
      .or(page.getByLabel(/Asset Value|Cost of Asset|Sum Insured Net/i))
      .first();
    this.conditionDropdown = page
      .locator("app-add-asset, app-asset-details-add-asset, app-standard-quote-add-asset")
      .filter({ visible: true })
      .first()
      .getByText(/^Condition\s*\*?\s*$/i)
      .locator("xpath=following::div[contains(@class,'p-dropdown')][1]")
      .or(
        page.locator(
          "//label[contains(normalize-space(),'Condition')]/following-sibling::div//div[contains(@class,'p-dropdown')]",
        ),
      )
      .first();
    this.yearInputField = addAssetTextField(page, "Year");
    this.makeInputField = addAssetTextField(page, "Make");
    this.modelInputField = addAssetTextField(page, "Model");
    this.variantInputField = addAssetTextField(page, "Variant");
    this.regoNOInputField = addAssetTextField(page, "Rego No.");
    this.vinInputField = addAssetTextField(page, "VIN");
    this.odometerInputField = addAssetTextField(page, "Odometer");
    this.colourInputField = addAssetTextField(page, "Colour");
    this.hinInputField = addAssetTextField(page, "HIN");
    this.serialNOInputField = addAssetTextField(page, "Serial / Chassis No.");
    this.engineNOInputField = addAssetTextField(page, "Engine No");
    this.ccRatingInputField = addAssetTextField(page, "CC Rating");
    this.motivePowerDropdown = page.locator(
      `//label[text()=' Motive Power ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );

    this.countryFirstRegisteredDropdown = page.locator(
      `//label[text()=' Country First Registered ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.assetLocationDropdown = page.locator(
      `//label[text()=' Asset Location of Use ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.supplierInputField = addAssetTextField(page, "Supplier Name");
    this.descriptionInputField = addAssetTextField(page, "Description");
    this.insurerDetailsInputField = page.locator(
      `//label[text()=' Insurer ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.brokerDetailsInputField = addAssetTextField(page, "Broker");
    this.sumInsuredInputField = addAssetTextField(page, "Sum Insured");
    this.policyNumberInputField = addAssetTextField(page, "Policy Number");
    this.policyExpiryDateInputField = page.getByPlaceholder("policyExpiryDate");
    this.selectDateButton = page.locator("//span[@data-date='2026-3-31']");
    this.cancelButton = page.locator("//span[text()='Cancel']");
    this.searchForAssetButton = page
      .getByRole("button", { name: /Search for Asset/i })
      .or(
        page
          .locator("app-add-asset, app-asset-details-add-asset, app-standard-quote-add-asset")
          .getByRole("button", { name: /Search/i }),
      )
      .or(page.locator("button.p-button-outlined").filter({ hasText: /Search for Asset/i }))
      .filter({ visible: true })
      .first();
    this.summitButton = page
      .locator("app-add-asset, app-asset-details-add-asset, app-standard-quote-add-asset")
      .getByRole("button", { name: /^Submit$/i })
      .or(page.getByRole("button", { name: /^Submit$/i }))
      .first();
    this.crossButton = page
      .locator("button.p-dialog-header-close, timesicon button")
      .filter({ visible: true })
      .last()
      .or(page.getByRole("button", { name: /^Close$/i }).filter({ visible: true }).last());
  }

  protected stepLogPrefix(): string {
    return "Standard quote — Add asset";
  }

  /** Strip `$` / `,` — PrimeNG `currencymask` binds on keystrokes; typing `$5,000.00` can merge with other digits (e.g. QQ `30000`). */
  private normalizeAssetValueDigits(raw: string): string {
    return raw.replace(/[$,\s]/g, "").trim() || "0";
  }

  /** Same as other DO quote steps: **.app-loader-overlay** blocks the Cost-of-Asset field after opening the wizard. */
  private async waitUntilNoVisibleAppLoaderOverlays(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const overlays = this.page.locator(".app-loader-overlay");
      const count = await overlays.count();
      let anyVisible = false;
      for (let i = 0; i < count; i++) {
        if (await overlays.nth(i).isVisible().catch(() => false)) {
          anyVisible = true;
          break;
        }
      }
      if (!anyVisible) {
        return;
      }
      await this.page.waitForTimeout(200);
    }
    throw new Error(
      `Timed out after ${timeoutMs}ms waiting for .app-loader-overlay to clear (add-asset Cost of Asset).`,
    );
  }

  /**
   * **Cost of Asset** / Sum Insured Net — clear field then type **digits only** + **Tab** so the model matches
   * the display (avoids overlap with carried numbers like `30000` from Quick Quote).
   */
  async enterAssetValue(value: string): Promise<void> {
    this.logStep(`Entered asset value as ${this.stepValueDisplay(value)}`);
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    const input = this.assetValueInputField;
    await input.waitFor({ state: "visible", timeout: 60_000 });
    await input.scrollIntoViewIfNeeded();
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    const digits = this.normalizeAssetValueDigits(value);
    await input.click({ clickCount: 3, timeout: 30_000 });
    await input.press("Backspace");
    await input.pressSequentially(digits, { delay: 35 });
    await input.press("Tab");
    await this.page.waitForTimeout(300);
  }
  private conditionDropdownTrigger(): Locator {
    return this.conditionDropdown
      .locator(".p-dropdown-trigger")
      .or(this.conditionDropdown.getByRole("button", { name: /dropdown trigger/i }))
      .first();
  }

  private async readSelectedConditionLabel(): Promise<string> {
    const combobox = this.conditionDropdown.getByRole("combobox").first();
    if (await combobox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return (
        (await combobox.getAttribute("aria-label")) ??
        (await combobox.textContent()) ??
        ""
      ).trim();
    }
    return ((await this.conditionDropdown.locator(".p-dropdown-label").first().textContent()) ?? "").trim();
  }

  async selectCondition(condition: string): Promise<void> {
    this.logStep(`Selected condition: ${this.stepValueDisplay(condition)}`);
    const escaped = condition.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const optionPattern = new RegExp(`^\\s*${escaped}\\s*$`, "i");

    const current = await this.readSelectedConditionLabel();
    if (optionPattern.test(current) || current.toLowerCase() === condition.toLowerCase()) {
      return;
    }

    const trigger = this.conditionDropdownTrigger();
    await expect(trigger).toBeVisible({ timeout: 30_000 });

    const optionWhenOpen = this.page
      .getByRole("listbox", { name: /Option List/i })
      .getByRole("option", { name: optionPattern })
      .first();
    if (await optionWhenOpen.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await optionWhenOpen.click({ timeout: 15_000 });
      await this.page.keyboard.press("Escape").catch(() => {});
      return;
    }

    await this.page.keyboard.press("Escape").catch(() => {});
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000).catch(() => {});

    await expect
      .poll(
        async () => {
          const selected = await this.readSelectedConditionLabel();
          if (optionPattern.test(selected) || selected.toLowerCase() === condition.toLowerCase()) {
            return true;
          }

          await trigger.scrollIntoViewIfNeeded().catch(() => {});
          await trigger
            .evaluate((el: HTMLElement) => {
              el.click();
            })
            .catch(() => trigger.click({ force: true, timeout: 5_000 }));

          const panel = this.page.locator("div.p-dropdown-panel").filter({ visible: true }).last();
          const option = panel.getByRole("option", { name: optionPattern }).first();
          if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await option
              .evaluate((el: HTMLElement) => {
                el.click();
              })
              .catch(() => option.click({ force: true, timeout: 2_000 }));
          } else {
            await this.page.keyboard.type(condition.slice(0, 4), { delay: 40 }).catch(() => {});
            await this.page.keyboard.press("Enter").catch(() => {});
          }

          await this.page.keyboard.press("Escape").catch(() => {});
          await this.page.waitForTimeout(400);

          const after = await this.readSelectedConditionLabel();
          return optionPattern.test(after) || after.toLowerCase() === condition.toLowerCase();
        },
        { timeout: 45_000, intervals: [500, 1_000, 1_500, 2_000] },
      )
      .toBeTruthy();
  }
  async selectYear(year: string): Promise<void> {
    this.logStep(`Selected year: ${this.stepValueDisplay(year)}`);
    const input = this.yearInputField;
    await input.waitFor({ state: "visible", timeout: 30_000 });
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click();
    await input.press("Control+A").catch(() => {});
    await input.fill(year);
    await input.press("Tab").catch(() => {});
  }
  async enterMake(make: string): Promise<void> {
    this.logStep(`Entered make as ${this.stepValueDisplay(make)}`);
    const input = this.makeInputField;
    await input.waitFor({ state: "visible", timeout: 30_000 });
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click();
    await input.press("Control+A").catch(() => {});
    await input.fill(make);
    await input.press("Tab").catch(() => {});
  }
  async enterModel(model: string): Promise<void> {
    this.logStep(`Entered model as ${this.stepValueDisplay(model)}`);
    const input = this.modelInputField;
    await input.waitFor({ state: "visible", timeout: 15_000 });
    await input.click();
    await input.fill(model);
    const option = this.page.getByRole("option", { name: new RegExp(model, "i") }).first();
    if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await option.click({ timeout: 8_000 });
    } else {
      await input.press("Tab");
    }
    await expect(input).toHaveValue(new RegExp(model, "i"), { timeout: 8_000 });
  }
  async enterVariant(variant: string): Promise<void> {
    this.logStep(`Entered variant as ${this.stepValueDisplay(variant)}`);
    const input = this.variantInputField;
    await input.waitFor({ state: "visible", timeout: 15_000 });
    await input.click();
    await input.fill(variant);
    await input.press("Tab");
  }
  async enterRegoNO(regoNO: string): Promise<void> {
    const input = this.regoNOInputField;
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      this.logStep("Rego field not shown — skip rego entry");
      return;
    }
    if (!(await input.isEnabled().catch(() => false))) {
      this.logStep("Rego field is read-only — skip rego entry");
      return;
    }
    this.logStep(`Entered rego number as ${this.stepValueDisplay(regoNO)}`);
    await input.click();
    await input.fill(regoNO);
    await input.press("Tab").catch(() => {});
  }
  async enterVIN(vin: string): Promise<void> {
    this.logStep(`Entered VIN as ${this.stepValueDisplay(vin)}`);
    const input = this.vinInputField;
    await input.waitFor({ state: "visible", timeout: 15_000 });
    await input.click();
    await input.fill(vin);
    await input.press("Tab");
  }
  async enterOdometer(odometer: string): Promise<void> {
    this.logStep(`Entered odometer as ${this.stepValueDisplay(odometer)}`);
    await this.odometerInputField.fill(odometer);
  }
  async enterColour(colour: string): Promise<void> {
    this.logStep(`Entered colour as ${this.stepValueDisplay(colour)}`);
    await this.colourInputField.fill(colour);
  }
  async enterHIN(hin: string): Promise<void> {
    this.logStep(`Entered HIN as ${this.stepValueDisplay(hin)}`);
    const input = this.hinInputField;
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click();
    await input.press("Control+A").catch(() => {});
    await input.fill(hin);
    await input.press("Tab").catch(() => {});
  }
  async enterSerialNO(serialNO: string): Promise<void> {
    this.logStep(`Entered serial / chassis number as ${this.stepValueDisplay(serialNO)}`);
    const input = this.serialNOInputField;
    await input.waitFor({ state: "visible", timeout: 30_000 });
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click();
    await input.press("Control+A").catch(() => {});
    await input.fill(serialNO);
    await input.press("Tab").catch(() => {});
  }
  async enterEngineNO(engineNO: string): Promise<void> {
    this.logStep(`Entered engine number as ${this.stepValueDisplay(engineNO)}`);
    await this.engineNOInputField.fill(engineNO);
  }
  async enterCCRating(ccRating: string): Promise<void> {
    this.logStep(`Entered CC rating as ${this.stepValueDisplay(ccRating)}`);
    await this.ccRatingInputField.fill(ccRating);
  }
  async motiveePowerDropdown(): Promise<void> {
    this.logStep("Opened Motive Power dropdown");
    await this.motivePowerDropdown.click();
  }
  async SelectMotivePower(motiveName: string): Promise<void> {
    this.logStep(`Selected motive power: ${this.stepValueDisplay(motiveName)}`);
    await this.page
      .getByRole("option", { name: motiveName, exact: true })
      .click();
  }
  async chooseMotivePower(motiveName: string): Promise<void> {
    this.logStep(`Chose motive power: ${this.stepValueDisplay(motiveName)}`);
    await this.motiveePowerDropdown();
    await this.SelectMotivePower(motiveName);
  }
  async CountryFirstRegisteredDropdown(): Promise<void> {
    this.logStep("Opened Country First Registered dropdown");
    await this.countryFirstRegisteredDropdown.click();
  }
  async selectCountryFirstRegistered(countryName: string) {
    this.logStep(`Selected country first registered: ${this.stepValueDisplay(countryName)}`);
    await this.page
      .getByRole("option", { name: countryName, exact: true })
      .click();
  }
  async chooseCountryRegistered(countryName: string): Promise<void> {
    this.logStep(`Chose country registered: ${this.stepValueDisplay(countryName)}`);
    await this.CountryFirstRegisteredDropdown();
    await this.selectCountryFirstRegistered(countryName);
  }
  async AssetLocationDropdown(): Promise<void> {
    this.logStep("Opened Asset Location dropdown");
    await this.assetLocationDropdown.click();
  }
  async selectAssetLocation(assetLocation: string): Promise<void> {
    this.logStep(`Selected asset location: ${this.stepValueDisplay(assetLocation)}`);
    await this.page
      .getByRole("option", { name: assetLocation, exact: true })
      .click();
  }
  async chooseAssetLocation(assetLocation: string): Promise<void> {
    this.logStep(`Chose asset location: ${this.stepValueDisplay(assetLocation)}`);
    await this.AssetLocationDropdown();
    await this.selectAssetLocation(assetLocation);
  }
  async enterSupplier(supplier: string): Promise<void> {
    this.logStep(`Entered supplier as ${this.stepValueDisplay(supplier)}`);
    const input = this.supplierInputField;
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    if (!(await input.isEnabled().catch(() => false))) {
      this.logStep("Supplier Name is read-only — skip supplier entry");
      return;
    }
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click();
    await input.press("Control+A").catch(() => {});
    await input.fill(supplier);
    await input.press("Tab").catch(() => {});
  }

  async isSupplierFieldEditable(): Promise<boolean> {
    const input = this.supplierInputField;
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return false;
    }
    return input.isEnabled().catch(() => false);
  }
  async enterDescription(description: string): Promise<void> {
    this.logStep(`Entered description as ${this.stepValueDisplay(description)}`);
    const input = this.descriptionInputField;
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click();
    await input.press("Control+A").catch(() => {});
    await input.fill(description);
    await input.press("Tab").catch(() => {});
  }
  async insurerDetailsdropdown(): Promise<void> {
    this.logStep("Opened Insurer dropdown");
    await this.insurerDetailsInputField.click();
  }
  async selectInsurerDetails(insurerDetails: string): Promise<void> {
    this.logStep(`Selected insurer: ${this.stepValueDisplay(insurerDetails)}`);
    await this.page
      .getByRole("option", { name: insurerDetails, exact: true })
      .click();
  }
  async chooseInsurerDetails(insurerDetails: string): Promise<void> {
    this.logStep(`Chose insurer: ${this.stepValueDisplay(insurerDetails)}`);
    await this.insurerDetailsdropdown();
    await this.selectInsurerDetails(insurerDetails);
  }

  async enterBrokerDetails(brokerDetails: string): Promise<void> {
    this.logStep(`Entered broker as ${this.stepValueDisplay(brokerDetails)}`);
    await this.brokerDetailsInputField.fill(brokerDetails);
  }
  async enterSumInsured(sumInsured: string): Promise<void> {
    this.logStep(`Entered sum insured as ${this.stepValueDisplay(sumInsured)}`);
    await this.sumInsuredInputField.fill(sumInsured);
  }
  async enterPolicyNumber(policyNumber: string): Promise<void> {
    this.logStep(`Entered policy number as ${this.stepValueDisplay(policyNumber)}`);
    await this.policyNumberInputField.fill(policyNumber);
  }
  async enterPolicyExpiryDateButton(policyExpiryDate: string): Promise<void> {
    this.logStep(`Opened policy expiry date (target: ${this.stepValueDisplay(policyExpiryDate)})`);
    await this.policyExpiryDateInputField.click();
  }
  async selectPolicyExpiryDate(policyExpiryDate: string): Promise<void> {
    this.logStep(`Selected policy expiry date: ${this.stepValueDisplay(policyExpiryDate)}`);
    await this.enterPolicyExpiryDateButton(policyExpiryDate);
    await this.selectDateButton.click();
  }

  async clickCancelButton(): Promise<void> {
    this.logStep("Clicked Cancel on Add Asset");
    await this.cancelButton.click();
  }
  async clickSearchForAssetButton(): Promise<void> {
    this.logStep("Clicked Search for Asset");
    const btn = this.searchForAssetButton;
    await btn.waitFor({ state: "visible", timeout: 45_000 });
    await btn.click({ timeout: 15_000 });
  }
  async clickSummitButton(opts?: { waitForNavigation?: boolean }): Promise<void> {
    this.logStep("Clicked Submit on Add Asset");
    const waitForNavigation = opts?.waitForNavigation !== false;
    await this.summitButton.waitFor({ state: "attached", timeout: 30_000 });
    await this.summitButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.summitButton.click({ timeout: 15_000, force: true }).catch(async () => {
      await this.summitButton.click({ timeout: 15_000, force: true });
    });
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    if (waitForNavigation) {
      await this.waitForAddAssetPostSubmitState();
    }
  }

  /** Dismiss **Cancel Asset** / unsaved-changes confirm when leaving the full-page editor. */
  private async dismissAddAssetLeaveConfirmIfOpen(confirmLeave = true): Promise<void> {
    const dlg = this.page
      .getByRole("alertdialog")
      .filter({ hasText: /unsaved changes|Cancel Asset|lost/i })
      .filter({ visible: true })
      .first();
    if (!(await dlg.isVisible({ timeout: 1_500 }).catch(() => false))) {
      return;
    }
    const btn = confirmLeave
      ? dlg.getByRole("button", { name: /^Yes$/i }).first()
      : dlg.getByRole("button", { name: /^No$/i }).first();
    await btn.click({ timeout: 10_000 });
    await dlg.waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
  }

  /**
   * Dialog submit closes the wizard (**×** appears). Full-page `/asset/addAsset/edit` usually saves in-place.
   */
  private async waitForAddAssetPostSubmitState(): Promise<void> {
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await this.dismissAddAssetLeaveConfirmIfOpen(true).catch(() => {});

    if (!/\/asset\/addAsset/i.test(this.page.url())) {
      return;
    }
    if (await this.crossButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return;
    }

    const leftAddAssetRoute = await expect
      .poll(
        async () => {
          await this.dismissAddAssetLeaveConfirmIfOpen(true).catch(() => {});
          return !/\/asset\/addAsset/i.test(this.page.url());
        },
        { timeout: 20_000, intervals: [500, 1_000, 1_500] },
      )
      .toBe(true)
      .then(() => true)
      .catch(() => false);
    if (leftAddAssetRoute) {
      await this.waitUntilNoVisibleAppLoaderOverlays(30_000).catch(() => {});
      return;
    }

    await expect
      .poll(
        async () => {
          const errs = this.page.locator(
            ".p-toast-message-error, .p-inline-message-error, .p-message-error",
          );
          return (await errs.filter({ visible: true }).count()) === 0;
        },
        { timeout: 30_000, intervals: [500, 1_000] },
      )
      .toBe(true)
      .catch(() => {});
    await this.page.waitForTimeout(1_500);
  }

  /** Same control as {@link clickSummitButton} — Submit on Add Asset. */
  async clickSubmitButton(): Promise<void> {
    await this.clickSummitButton();
  }

  /**
   * FIS IA internal portal opens **Add Asset** as `/asset/addAsset/edit` (full page), not a dialog.
   * After Submit there is no header **×** — return via history / breadcrumb (not **Create Standard Quote**, which starts a new quote).
   */
  private async isStandardQuoteShellVisible(): Promise<boolean> {
    const shell = this.page.locator("app-quote-details, app-standard-quote").filter({ visible: true }).first();
    if (await shell.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return true;
    }
    if (!/\/standard-quote/i.test(this.page.url())) {
      return false;
    }
    return await this.page
      .getByText(/Cash Price of Asset|Term|Asset Type/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
  }

  private async waitForStandardQuoteShellVisible(): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000).catch(() => {});
    await expect
      .poll(async () => this.isStandardQuoteShellVisible(), {
        timeout: 120_000,
        intervals: [500, 1_000, 2_000],
      })
      .toBe(true);
  }

  async returnToStandardQuoteFromAddAssetRouteIfNeeded(): Promise<void> {
    if (!/\/asset\/addAsset/i.test(this.page.url())) {
      return;
    }
    if (await this.isStandardQuoteShellVisible()) {
      return;
    }

    this.logStep("Return to Standard Quote from Add Asset full-page route");
    await this.dismissAddAssetLeaveConfirmIfOpen(true);

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
      await this.dismissAddAssetLeaveConfirmIfOpen(true);
      await this.waitUntilNoVisibleAppLoaderOverlays(30_000).catch(() => {});
      if (await this.isStandardQuoteShellVisible()) {
        return;
      }
    }

    const quoteRefCrumb = this.page.getByRole("link", { name: /Standard Quote\s*-/i }).first();
    if (await quoteRefCrumb.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await quoteRefCrumb.click({ timeout: 15_000 });
      await this.dismissAddAssetLeaveConfirmIfOpen(true);
      await this.waitForStandardQuoteShellVisible();
      return;
    }

    const cancel = this.page.getByRole("button", { name: /^Cancel$/i }).filter({ visible: true }).first();
    if (await cancel.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await cancel.click({ timeout: 15_000 });
      await this.dismissAddAssetLeaveConfirmIfOpen(true);
      if (await this.isStandardQuoteShellVisible()) {
        return;
      }
    }

    const createCrumb = this.page.getByRole("link", { name: /Create Standard Quote/i }).first();
    if (await createCrumb.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await createCrumb.click({ timeout: 15_000 });
      await this.dismissAddAssetLeaveConfirmIfOpen(true);
    } else {
      await this.page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
      await this.dismissAddAssetLeaveConfirmIfOpen(true);
    }
    await this.waitForStandardQuoteShellVisible();
  }

  async clickCrossButton(): Promise<void> {
    const visible = await this.crossButton.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!visible) {
      this.logStep("Add Asset dialog close (cross) not shown — checking full-page route");
      await this.returnToStandardQuoteFromAddAssetRouteIfNeeded();
      return;
    }
    this.logStep("Clicked close (cross) on Add Asset");
    await this.crossButton.click({ timeout: 15_000 });
    await this.returnToStandardQuoteFromAddAssetRouteIfNeeded();
  }
}
