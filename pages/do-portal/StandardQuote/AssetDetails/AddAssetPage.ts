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
    this.assetValueInputField = page.getByRole("textbox", {
      name: "Asset Value* Sum Insured Net",
    });
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
  async enterAssetValue(value: string): Promise<void> {
    await this.assetValueInputField.type(value);
  }
  async selectCondition(condition: string): Promise<void> {
    await this.conditionDropdown.click();
    await this.page.getByRole("option", { name: condition }).click();
  }
  async selectYear(year: string): Promise<void> {
    await this.yearInputField.fill(year);
  }
  async enterMake(make: string): Promise<void> {
    await this.makeInputField.fill(make);
  }
  async enterModel(model: string): Promise<void> {
    await this.modelInputField.fill(model);
  }
  async enterVariant(variant: string): Promise<void> {
    await this.variantInputField.fill(variant);
  }
  async enterRegoNO(regoNO: string): Promise<void> {
    await this.regoNOInputField.fill(regoNO);
  }
  async enterVIN(vin: string): Promise<void> {
    await this.vinInputField.fill(vin);
  }
  async enterOdometer(odometer: string): Promise<void> {
    await this.odometerInputField.fill(odometer);
  }
  async enterColour(colour: string): Promise<void> {
    await this.colourInputField.fill(colour);
  }
  async enterSerialNO(serialNO: string): Promise<void> {
    await this.serialNOInputField.fill(serialNO);
  }
  async enterEngineNO(engineNO: string): Promise<void> {
    await this.engineNOInputField.fill(engineNO);
  }
  async enterCCRating(ccRating: string): Promise<void> {
    await this.ccRatingInputField.fill(ccRating);
  }
  async motiveePowerDropdown(): Promise<void> {
    await this.motivePowerDropdown.click();
  }
  async SelectMotivePower(motiveName: string): Promise<void> {
    await this.page
      .getByRole("option", { name: motiveName, exact: true })
      .click();
  }
  async chooseMotivePower(motiveName: string): Promise<void> {
    await this.motiveePowerDropdown();
    await this.SelectMotivePower(motiveName);
  }
  async CountryFirstRegisteredDropdown(): Promise<void> {
    await this.countryFirstRegisteredDropdown.click();
  }
  async selectCountryFirstRegistered(countryName: string) {
    await this.page
      .getByRole("option", { name: countryName, exact: true })
      .click();
  }
  async chooseCountryRegistered(countryName: string): Promise<void> {
    await this.CountryFirstRegisteredDropdown();
    await this.selectCountryFirstRegistered(countryName);
  }
  async AssetLocationDropdown(): Promise<void> {
    await this.assetLocationDropdown.click();
  }
  async selectAssetLocation(assetLocation: string): Promise<void> {
    await this.page
      .getByRole("option", { name: assetLocation, exact: true })
      .click();
  }
  async chooseAssetLocation(assetLocation: string): Promise<void> {
    await this.AssetLocationDropdown();
    await this.selectAssetLocation(assetLocation);
  }
  async enterSupplier(supplier: string): Promise<void> {
    await this.supplierInputField.fill(supplier);
  }
  async enterDescription(description: string): Promise<void> {
    await this.descriptionInputField.fill(description);
  }
  async insurerDetailsdropdown(): Promise<void> {
    await this.insurerDetailsInputField.click();
  }
  async selectInsurerDetails(insurerDetails: string): Promise<void> {
    await this.page
      .getByRole("option", { name: insurerDetails, exact: true })
      .click();
  }
  async chooseInsurerDetails(insurerDetails: string): Promise<void> {
    await this.insurerDetailsdropdown();
    await this.selectInsurerDetails(insurerDetails);
  }

  async enterBrokerDetails(brokerDetails: string): Promise<void> {
    await this.brokerDetailsInputField.fill(brokerDetails);
  }
  async enterSumInsured(sumInsured: string): Promise<void> {
    await this.sumInsuredInputField.fill(sumInsured);
  }
  async enterPolicyNumber(policyNumber: string): Promise<void> {
    await this.policyNumberInputField.fill(policyNumber);
  }
  async enterPolicyExpiryDateButton(policyExpiryDate: string): Promise<void> {
    await this.policyExpiryDateInputField.click();
  }
  async selectPolicyExpiryDate(policyExpiryDate: string): Promise<void> {
    await this.enterPolicyExpiryDateButton(policyExpiryDate);
    await this.selectDateButton.click();
  }

  async clickCancelButton(): Promise<void> {
    await this.cancelButton.click();
  }
  async clickSearchForAssetButton(): Promise<void> {
    await this.searchForAssetButton.click();
  }
  async clickSummitButton(): Promise<void> {
    await this.summitButton.click();
  }
  async clickCrossButton(): Promise<void> {
    await this.crossButton.click();
  }
}
