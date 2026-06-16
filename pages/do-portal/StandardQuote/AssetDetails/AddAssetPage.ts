import { Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

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
    this.conditionDropdown = page.locator(
      `(//*[name()='svg'][@class='p-dropdown-trigger-icon p-icon'])[2]`,
    );
    this.yearInputField = page
      .locator("text")
      .filter({ hasText: "Year" })
      .locator("#text");
    this.makeInputField = page
      .locator("text")
      .filter({ hasText: "Make" })
      .locator("#text");
    this.modelInputField = page
      .locator("text")
      .filter({ hasText: "Model" })
      .locator("#text");
    this.variantInputField = page
      .locator("text")
      .filter({ hasText: "Variant" })
      .locator("#text");
    this.regoNOInputField = page
      .locator("text")
      .filter({ hasText: "Rego No." })
      .locator("#text");
    this.vinInputField = page
      .locator("text")
      .filter({ hasText: "VIN" })
      .locator("#text");
    this.odometerInputField = page
      .locator("text")
      .filter({ hasText: "Odometer" })
      .locator("#text");
    this.colourInputField = page
      .locator("text")
      .filter({ hasText: "Colour" })
      .locator("#text");
    this.serialNOInputField = page
      .locator("text")
      .filter({ hasText: "Serial / Chassis No." })
      .locator("#text");
    this.engineNOInputField = page
      .locator("text")
      .filter({ hasText: "Engine No" })
      .locator("#text");
    this.ccRatingInputField = page
      .locator("text")
      .filter({ hasText: "CC Rating" })
      .locator("#text");
    this.motivePowerDropdown = page.locator(
      `//label[text()=' Motive Power ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );

    this.countryFirstRegisteredDropdown = page.locator(
      `//label[text()=' Country First Registered ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.assetLocationDropdown = page.locator(
      `//label[text()=' Asset Location of Use ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.supplierInputField = page
      .locator("text")
      .filter({ hasText: "Supplier Name" })
      .locator("#text");
    this.descriptionInputField = page
      .locator("text")
      .filter({ hasText: "Description" })
      .locator("#text");
    this.insurerDetailsInputField = page.locator(
      `//label[text()=' Insurer ']/following-sibling::div//div[@aria-label='dropdown trigger']`,
    );
    this.brokerDetailsInputField = page
      .locator("text")
      .filter({ hasText: "Broker" })
      .locator("#text");
    this.sumInsuredInputField = page
      .locator("text")
      .filter({ hasText: "Sum Insured" })
      .locator("#text");
    this.policyNumberInputField = page
      .locator("text")
      .filter({ hasText: "Policy Number" })
      .locator("#text");
    this.policyExpiryDateInputField = page.getByPlaceholder("policyExpiryDate");
    this.selectDateButton = page.locator("//span[@data-date='2026-3-31']");
    this.cancelButton = page.locator("//span[text()='Cancel']");
    this.searchForAssetButton = page.locator(
      "//button[@class='p-ripple p-element p-button p-component p-button-outlined']",
    );
    this.summitButton = page.locator("//span[text()='Submit']");
    this.crossButton = page.locator("//button[@role='button']");
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
    await input.click({ timeout: 30_000 });
    await input.press("Control+A");
    await input.press("Backspace");
    await input.pressSequentially(digits, { delay: 35 });
    await input.press("Tab");
    await this.page.waitForTimeout(400);
  }
  async selectCondition(condition: string): Promise<void> {
    this.logStep(`Selected condition: ${this.stepValueDisplay(condition)}`);
    await this.conditionDropdown.click();
    await this.page.getByRole("option", { name: condition }).click();
  }
  async selectYear(year: string): Promise<void> {
    this.logStep(`Selected year: ${this.stepValueDisplay(year)}`);
    await this.yearInputField.fill(year);
  }
  async enterMake(make: string): Promise<void> {
    this.logStep(`Entered make as ${this.stepValueDisplay(make)}`);
    await this.makeInputField.fill(make);
  }
  async enterModel(model: string): Promise<void> {
    this.logStep(`Entered model as ${this.stepValueDisplay(model)}`);
    await this.modelInputField.fill(model);
  }
  async enterVariant(variant: string): Promise<void> {
    this.logStep(`Entered variant as ${this.stepValueDisplay(variant)}`);
    await this.variantInputField.fill(variant);
  }
  async enterRegoNO(regoNO: string): Promise<void> {
    this.logStep(`Entered rego number as ${this.stepValueDisplay(regoNO)}`);
    await this.regoNOInputField.fill(regoNO);
  }
  async enterVIN(vin: string): Promise<void> {
    this.logStep(`Entered VIN as ${this.stepValueDisplay(vin)}`);
    await this.vinInputField.fill(vin);
  }
  async enterOdometer(odometer: string): Promise<void> {
    this.logStep(`Entered odometer as ${this.stepValueDisplay(odometer)}`);
    await this.odometerInputField.fill(odometer);
  }
  async enterColour(colour: string): Promise<void> {
    this.logStep(`Entered colour as ${this.stepValueDisplay(colour)}`);
    await this.colourInputField.fill(colour);
  }
  async enterSerialNO(serialNO: string): Promise<void> {
    this.logStep(`Entered serial / chassis number as ${this.stepValueDisplay(serialNO)}`);
    await this.serialNOInputField.fill(serialNO);
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
    await this.supplierInputField.fill(supplier);
  }
  async enterDescription(description: string): Promise<void> {
    this.logStep(`Entered description as ${this.stepValueDisplay(description)}`);
    await this.descriptionInputField.fill(description);
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
    await this.searchForAssetButton.click();
  }
  async clickSummitButton(): Promise<void> {
    this.logStep("Clicked Submit on Add Asset");
    await this.summitButton.click();
  }

  /** Same control as {@link clickSummitButton} — Submit on Add Asset. */
  async clickSubmitButton(): Promise<void> {
    await this.clickSummitButton();
  }
  async clickCrossButton(): Promise<void> {
    this.logStep("Clicked close (cross) on Add Asset");
    await this.crossButton.click();
  }
}
