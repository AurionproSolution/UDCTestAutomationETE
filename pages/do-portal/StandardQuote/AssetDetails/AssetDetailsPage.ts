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
  readonly cashPriceOfAssetInputField: Locator;
  readonly PPSRCount: Locator;
  readonly udcEstablishmentFeeInputField: Locator;
  readonly dealerOriginationFeeInputField: Locator;
  readonly termsOfFinanceInputField: Locator;
  readonly frequencyOfPayment: Locator;
  readonly interestRateInputField: Locator;
  readonly loanDate: Locator;
  readonly firstPaymentDate: Locator;
  readonly calculateButton: Locator;
  readonly nextButton: Locator;
  readonly addBorrowerorGuarantorButton: Locator;
  readonly searchByDropdown: Locator;
  readonly UDCSelectOption: Locator;
  readonly UDCCustomerNumberInput: Locator;
  readonly searchButton: Locator;
  readonly addNewCustomerButton: Locator;

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
    this.cashPriceOfAssetInputField = page.getByRole("textbox", {
      name: "Cash Price of Asset*",
    });
    this.PPSRCount = page.locator("app-quote-details").getByRole("spinbutton");
    this.udcEstablishmentFeeInputField = page
      .locator("amount")
      .filter({ hasText: "UDC Establishment Fee" })
      .locator("#amount");
    this.dealerOriginationFeeInputField = page
      .locator("amount")
      .filter({ hasText: "Dealer Origination Fee" })
      .locator("#amount");
    this.termsOfFinanceInputField = page
      .locator("number")
      .filter({ hasText: "Term" })
      .getByRole("spinbutton");
    this.frequencyOfPayment = page
      .getByLabel("Option List")
      .getByText("Monthly");
    this.interestRateInputField = page
      .locator("percentage")
      .filter({ hasText: "Interest Rate" })
      .locator("#percent");
    this.loanDate = page
      .locator('input[name="loanDate"]')
      .getByText("8", { exact: true });
    this.firstPaymentDate = page
      .locator('input[name="firstPaymentDate"]')
      .getByText("16");
    this.calculateButton = page.getByRole("button", { name: "Calculate" });
    this.nextButton = page.getByRole("button", { name: "Next" });
    this.addBorrowerorGuarantorButton = page.getByRole("button", {
      name: " Add Borrowers / Guarantors",
    });
    this.searchByDropdown = page
      .getByRole("dialog", { name: "Search Customer" })
      .getByLabel("dropdown trigger");
    this.UDCSelectOption = page
      .getByLabel("Option List")
      .getByText("UDC Customer Number");
    this.UDCCustomerNumberInput = page.locator(
      ".p-inputtext.p-component.p-element.form-control.ng-untouched.ng-pristine.ng-star-inserted.ng-invalid",
    );
    this.searchButton = page.getByRole("button", { name: "Search" });
    this.addNewCustomerButton = page.getByRole("button", {
      name: " Add New Customer",
    });
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
  // async clickAssetSummaryEditButton(): Promise<void> {
  //   await this.waitForVisible(this.assetyEditButton);
  //   await this.assetyEditButton.click();
  //   if ((await this.assetyEditButton.count()) > 0) {
  //     await this.assetyEditButton.first().click();
  //   } else {
  //     await this.assetSummaryCancelButton.click();
  //     await this.assetInsuranceTradeInSummaryHyperlink.click();
  //     await this.assetyEditButton.waitFor({ state: "visible" });
  //     await this.assetyEditButton.first().click();
  //   }
  // }

  async clickAssetSummaryEditButton(): Promise<void> {
    const editBtn = this.assetyEditButton.first();

    // Try primary path
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click();
      return;
    }

    // Fallback flow
    await this.assetSummaryCancelButton.click();
    await this.assetInsuranceTradeInSummaryHyperlink.click();

    await editBtn.waitFor({ state: "visible", timeout: 10000 });
    await editBtn.click();
  }
  async cashPriceOfAsset(cashprice: string): Promise<void> {
    await this.cashPriceOfAssetInputField.fill(cashprice);
  }
  async ppsrCount(count: string): Promise<void> {
    await this.PPSRCount.fill(count);
  }
  async udcEstablishmentFee(fee: string): Promise<void> {
    await this.udcEstablishmentFeeInputField.fill(fee);
  }
  async dealerOriginationFee(fee: string): Promise<void> {
    await this.dealerOriginationFeeInputField.fill(fee);
  }

  async enterLoanDetails(
    cashprice: string,
    ppsrCount: string,
    udcEstablishmentFee: string,
    dealerOriginationFee: string,
  ): Promise<void> {
    this.cashPriceOfAsset(cashprice);
    this.ppsrCount(ppsrCount);
    this.udcEstablishmentFee(udcEstablishmentFee);
    this.dealerOriginationFee(dealerOriginationFee);
  }
  async termsOfFinance(term: string): Promise<void> {
    await this.termsOfFinanceInputField.fill(term);
  }
  async interestRate(rate: string): Promise<void> {
    await this.interestRateInputField.fill(rate);
  }
  async financeDetails(term: string, rate: string): Promise<void> {
    this.termsOfFinance(term);
    this.interestRate(rate);
  }
  async loanDAte(): Promise<void> {
    await this.loanDate.click();
  }
  async firstPayment(): Promise<void> {
    await this.firstPaymentDate.click();
  }
  async clickCalculateButton(): Promise<void> {
    await this.calculateButton.click();
  }
  async paymentSummary(): Promise<void> {
    // await this.loanDAte();
    // await this.firstPayment();
    this.clickCalculateButton();
  }
  async clickNextButton(): Promise<void> {
    await this.nextButton.click();
  }
  async clickAddBorrowerorGuarantorButton(): Promise<void> {
    await this.addBorrowerorGuarantorButton.click();
  }
  async searchByDropdownClick(): Promise<void> {
    await this.searchByDropdown.click();
  }
  async selectUDCSelectOption(): Promise<void> {
    await this.UDCSelectOption.click();
  }
  async enterUDCCustomerNumber(customerNumber: string): Promise<void> {
    await this.UDCCustomerNumberInput.fill(customerNumber);
  }
  async clickSearchButton(): Promise<void> {
    await this.searchButton.click();
  }
  async clickAddNewCustomerButton(): Promise<void> {
    await this.addNewCustomerButton.click();
  }
}
