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
  readonly searchButton: Locator;
  readonly addNewCustomerButton: Locator;
  /** Modal for borrower / customer search (wording varies by build) */
  readonly customerSearchDialog: Locator;

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
    this.nextButton = page.getByRole("button", { name: "Next" }).last();
    this.addBorrowerorGuarantorButton = page.getByRole("button", {
      name: /Add Borrowers(\s*\/\s*Guarantors)?/i,
    });
    this.customerSearchDialog = page
      .getByRole("dialog")
      .filter({ has: page.getByRole("button", { name: /Search/i }) })
      .last();
    this.searchByDropdown = this.customerSearchDialog
      .getByRole("button", { name: "dropdown trigger" })
      .first();
    this.searchButton = this.customerSearchDialog.getByRole("button", {
      name: "Search",
    });
    this.addNewCustomerButton = this.customerSearchDialog.getByRole("button", {
      name: /Add New Customer/i,
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

  private parseInterestPercent(raw: string): number {
    const n = parseFloat(
      raw.replace(/%/g, "").replace(/,/g, ".").trim(),
    );
    return n;
  }

  private interestRateAcceptable(n: number, target: number): boolean {
    return (
      !Number.isNaN(n) &&
      n <= 5 &&
      Math.abs(n - target) < 0.75
    );
  }

  private async readInterestRateValue(field: Locator): Promise<number> {
    const raw = await field.inputValue();
    return this.parseInterestPercent(raw);
  }

  /**
   * Interest rate: Calculate / async pricing often overwrites the field (e.g. 12.75%).
   * Fill, blur, wait for network settle, retry many times, and require a short stability
   * window so we do not return while a late patch is still about to apply.
   */
  async interestRate(rate: string): Promise<void> {
    const field = this.interestRateInputField;
    const target = parseFloat(rate);
    if (Number.isNaN(target)) {
      throw new Error(`Invalid interest rate: ${rate}`);
    }
    await field.waitFor({ state: "visible", timeout: 30000 });

    const trySetValue = async (): Promise<void> => {
      await field.scrollIntoViewIfNeeded();
      await field.click({ clickCount: 3 });
      await field.fill(rate);
      await field.press("Tab");
      await this.page
        .waitForLoadState("networkidle", { timeout: 8000 })
        .catch(() => {});
      await this.page.waitForTimeout(400);
    };

    const trySetValueKeyboard = async (): Promise<void> => {
      await field.scrollIntoViewIfNeeded();
      await field.click({ clickCount: 3 });
      await this.page.keyboard.press("Control+A");
      await this.page.keyboard.type(rate, { delay: 40 });
      await field.press("Tab");
      await this.page
        .waitForLoadState("networkidle", { timeout: 8000 })
        .catch(() => {});
      await this.page.waitForTimeout(400);
    };

    for (let attempt = 0; attempt < 28; attempt++) {
      if (attempt % 2 === 0) {
        await trySetValue();
      } else {
        await trySetValueKeyboard();
      }

      let stableOk = 0;
      for (let s = 0; s < 4; s++) {
        const n = await this.readInterestRateValue(field);
        if (!this.interestRateAcceptable(n, target)) {
          stableOk = 0;
          break;
        }
        stableOk += 1;
        if (stableOk >= 3) return;
        await this.page.waitForTimeout(450);
      }

      await this.page.waitForTimeout(280);
    }

    const final = await this.readInterestRateValue(field);
    throw new Error(
      `Interest rate did not stay at or below 5% (wanted ${rate}%, last read ${final}). ` +
        `Calculate/async pricing may still be overwriting the field (e.g. 12.75%).`,
    );
  }

  async financeDetails(term: string, rate: string): Promise<void> {
    await this.termsOfFinance(term);
    await this.interestRate(rate);
  }
  async loanDAte(): Promise<void> {
    await this.loanDate.click();
  }
  async firstPayment(): Promise<void> {
    await this.firstPaymentDate.click();
  }
  async clickCalculateButton(): Promise<void> {
    await this.calculateButton.click();
    await this.page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page.waitForTimeout(1800);
  }
  async paymentSummary(): Promise<void> {
    // await this.loanDAte();
    // await this.firstPayment();
    this.clickCalculateButton();
  }
  async clickNextButton(): Promise<void> {
    await this.nextButton.waitFor({ state: "visible", timeout: 60000 });
    for (let i = 0; i < 120; i++) {
      if (await this.nextButton.isEnabled().catch(() => false)) break;
      await this.page.waitForTimeout(500);
    }
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  }

  async waitForAddBorrowerButton(): Promise<void> {
    await this.addBorrowerorGuarantorButton.waitFor({
      state: "visible",
      timeout: 120000,
    });
    await this.addBorrowerorGuarantorButton.scrollIntoViewIfNeeded();
  }

  async clickAddBorrowerorGuarantorButton(): Promise<void> {
    await this.addBorrowerorGuarantorButton.click();
    await this.customerSearchDialog.waitFor({
      state: "visible",
      timeout: 60000,
    });
  }
  async searchByDropdownClick(): Promise<void> {
    await this.customerSearchDialog.waitFor({
      state: "visible",
      timeout: 60000,
    });
    await this.searchByDropdown.waitFor({ state: "visible", timeout: 30000 });
    await this.searchByDropdown.click();
  }
  async selectUDCSelectOption(): Promise<void> {
    const panel = this.page.locator(".p-dropdown-panel").last();
    const opt = panel.getByRole("option", { name: /UDC Customer Number/i });
    await opt.waitFor({ state: "visible", timeout: 30000 });
    await opt.click();
    await this.page
      .locator(".p-dropdown-panel")
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => {});
  }

  async enterUDCCustomerNumber(customerNumber: string): Promise<void> {
    await this.customerSearchDialog.waitFor({
      state: "visible",
      timeout: 60000,
    });

    const namedTextboxes = this.customerSearchDialog.getByRole("textbox", {
      name: /UDC|Customer number|Customer Number|search value|Enter customer/i,
    });
    const angularTextHost = this.customerSearchDialog
      .locator("text")
      .filter({ hasText: /UDC Customer Number/ })
      .locator("#text");
    const labelFollowingInput = this.customerSearchDialog.locator(
      "xpath=.//label[contains(normalize-space(.), 'UDC Customer Number') or contains(., 'Customer number')][1]/following::input[contains(@class,'p-inputtext') or contains(@class,'form-control')][1]",
    );

    const deadline = Date.now() + 35000;
    while (Date.now() < deadline) {
      const n = await namedTextboxes.count();
      for (let i = 0; i < n; i++) {
        const el = namedTextboxes.nth(i);
        if (
          (await el.isVisible().catch(() => false)) &&
          (await el.isEnabled().catch(() => false))
        ) {
          await el.fill(customerNumber);
          return;
        }
      }

      const udcFromText = angularTextHost.last();
      if (
        (await udcFromText.count()) > 0 &&
        (await udcFromText.isVisible().catch(() => false)) &&
        (await udcFromText.isEnabled().catch(() => false))
      ) {
        await udcFromText.fill(customerNumber);
        return;
      }

      const fromLabel = labelFollowingInput.first();
      if (
        (await fromLabel.count()) > 0 &&
        (await fromLabel.isVisible().catch(() => false)) &&
        (await fromLabel.isEnabled().catch(() => false))
      ) {
        await fromLabel.fill(customerNumber);
        return;
      }

      const inputs = this.customerSearchDialog.locator(
        "input.p-inputtext, input.form-control, input[type='search'], textarea.p-inputtextarea",
      );
      const total = await inputs.count();
      for (let i = 0; i < total; i++) {
        const inp = inputs.nth(i);
        if (
          (await inp.isVisible().catch(() => false)) &&
          (await inp.isEnabled().catch(() => false))
        ) {
          await inp.fill(customerNumber);
          return;
        }
      }

      await this.page.waitForTimeout(200);
    }

    throw new Error(
      "No visible, enabled UDC customer number field found in borrower search dialog after 35s.",
    );
  }
  async clickSearchButton(): Promise<void> {
    await this.searchButton.waitFor({ state: "visible", timeout: 30000 });
    await this.searchButton.click();
    await this.page
      .waitForLoadState("networkidle", { timeout: 35000 })
      .catch(() => {});
    await this.page
      .locator(".p-progress-spinner, .p-blockui, [class*='p-progress']")
      .first()
      .waitFor({ state: "hidden", timeout: 45000 })
      .catch(() => {});
    await this.page.waitForTimeout(1200);
  }

  /**
   * Resolves "Add New Customer" — scoped dialog filter can miss if the app
   * changes dialog structure; fall back to last dialog or page-wide button.
   */
  private addNewCustomerButtonCandidates(): Locator[] {
    return [
      this.customerSearchDialog.getByRole("button", {
        name: /Add New Customer/i,
      }),
      this.page
        .getByRole("dialog")
        .last()
        .getByRole("button", { name: /Add New Customer/i }),
      this.page.getByRole("button", { name: /Add New Customer/i }),
    ];
  }

  async clickAddNewCustomerButton(): Promise<void> {
    const deadlineEnable = Date.now() + 90000;
    let addBtn: Locator | null = null;

    while (Date.now() < deadlineEnable && !addBtn) {
      for (const candidate of this.addNewCustomerButtonCandidates()) {
        const first = candidate.first();
        if (!(await first.isVisible().catch(() => false))) continue;
        if (await first.isEnabled().catch(() => false)) {
          addBtn = first;
          break;
        }
      }
      if (!addBtn) await this.page.waitForTimeout(400);
    }

    if (!addBtn) {
      throw new Error(
        "Add New Customer was not visible and enabled within 90s. " +
          "Use a UDC number with no matches so this button enables after Search.",
      );
    }

    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click({ timeout: 30000 });

    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page
      .waitForLoadState("networkidle", { timeout: 25000 })
      .catch(() => {});
    await this.page.waitForTimeout(600);

    const markers: Locator[] = [
      this.page.locator('input[name="dateOfBirth"]'),
      this.page.getByRole("button", { name: /Choose Date/i }),
      this.page.getByRole("textbox", { name: /First Name/i }),
      this.page
        .locator("text")
        .filter({ hasText: /^First Name/ })
        .locator("#text"),
      this.page.locator(
        "//label[contains(normalize-space(.),'Title')]/following-sibling::div//div[@aria-label='dropdown trigger']",
      ),
      this.page.locator("app-personal-detail-email-contact"),
      this.page.getByRole("textbox", { name: /Phone number/i }),
      this.page.locator(
        "//span//label[contains(text(),'Title')]/following-sibling::div//span",
      ),
    ];

    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      for (const m of markers) {
        if (await m.first().isVisible().catch(() => false)) return;
      }
      await this.page.waitForTimeout(250);
    }

    throw new Error(
      "Personal details did not open after Add New Customer (expected DOB, Choose Date, First Name, Title, or email block).",
    );
  }
}