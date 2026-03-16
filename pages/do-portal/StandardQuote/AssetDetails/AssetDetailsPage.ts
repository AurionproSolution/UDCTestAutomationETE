import { Locator, Page } from "@playwright/test";
import { BasePage } from "../../..";

export class DOAssetDetailsPage extends BasePage {
  readonly dialogBox: Locator;
  readonly originationRefInput: Locator;
  readonly assetInputField: Locator;
  readonly assetSearchField: Locator;
  readonly conditionDropdown: Locator;
  readonly assetInsuranceTradeInSummaryHyperlink: Locator;
  readonly assetyEditButton: Locator;
  readonly assetSummaryCancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.dialogBox = page.getByRole("dialog");
    this.originationRefInput = page
      .locator("text")
      .filter({ hasText: "Originator Reference" })
      .locator("#text");
    this.assetInputField = page.locator('input[name="assetTypeDD"]');
    this.assetSearchField = page.getByRole("searchbox");
    this.conditionDropdown = page.locator(
      `(//*[name()='svg'][@class='p-dropdown-trigger-icon p-icon'])[6]`,
    );
    this.assetInsuranceTradeInSummaryHyperlink = page.getByRole("button", {
      name: "Asset, Insurance & Trade-in",
    });
    this.assetyEditButton = page.locator(".cursor-pointer.fa-pen-to-square");
    this.assetSummaryCancelButton = page.locator(
      "//timesicon//*[name()='svg']",
    );
  }
  /**
   * Open the product dropdown in the quote dialog
   */
  async openProductDropdown(): Promise<void> {
    const productDropdown = this.page.locator(
      `//span//label[contains(text(), 'Product')]/following-sibling::div//span`,
    );
    await productDropdown.click();
  }

  /**
   * Choose an item from the product dropdown list
   */
  async selectProduct(productName: string): Promise<void> {
    await this.page.getByRole("option", { name: productName }).click();
  }

  /**
   * Open the program dropdown in the quote dialog
   */
  async openProgramDropdown(): Promise<void> {
    const programDropdown = this.page.locator(
      `//span//label[contains(text(), 'Program')]/following-sibling::div//span`,
    );
    await programDropdown.click();
  }

  /**
   * Choose an item from the program dropdown list
   */
  async selectProgram(programName: string): Promise<void> {
    await this.page.getByText(programName).click();
  }

  /**
   * Convenience wrapper: open product dropdown and select entry in one call
   */
  async chooseProduct(productName: string): Promise<void> {
    await this.openProductDropdown();
    await this.selectProduct(productName);
  }

  /**
   * Convenience wrapper: open program dropdown and select entry in one call
   */
  async chooseProgram(programName: string): Promise<void> {
    await this.openProgramDropdown();
    await this.selectProgram(programName);
  }
  /**
   * Enter text into the Origination Reference input field
   */
  async enterOriginationReference(origRef: string): Promise<void> {
    await this.originationRefInput.fill(origRef);
  }

  /**
   * Enter text into the Asset input field
   */
  async enterAsset(asset: string): Promise<void> {
    await this.assetInputField.click();
    await this.assetSearchField.fill(asset);
    await this.page.getByRole("option", { name: asset }).click();
  }
  /**
   * Select a condition from the Condition dropdown
   */
  async selectCondition(condition: string): Promise<void> {
    await this.conditionDropdown.click();
    await this.page.getByRole("option", { name: condition }).click();
  }

  /**
   * Click on Asset, Insurance & Trade-in Summary hyperlink to open the summary dialog
   */
  async openAssetInsuranceTradeInSummary(): Promise<void> {
    await this.scrollIfNeeded(this.assetInsuranceTradeInSummaryHyperlink);
    await this.assetInsuranceTradeInSummaryHyperlink.click();
  }

  /**
   * Click on Edit button in Asset pop-up to open the edit dialog
   */
  async clickAssetSummaryEditButton(): Promise<void> {
    await this.assetyEditButton.click();
    if ((await this.assetyEditButton.count()) > 0) {
      await this.assetyEditButton.first().click();
    } else {
      await this.assetSummaryCancelButton.click();
      await this.assetInsuranceTradeInSummaryHyperlink.click();
      await this.assetyEditButton.waitFor({ state: "visible" });
      await this.assetyEditButton.first().click();
    }
  }
}
