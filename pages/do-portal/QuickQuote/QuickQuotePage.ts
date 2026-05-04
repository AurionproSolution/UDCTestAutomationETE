/**
 * DO Portal - Quick Quote Page
 * Page Object Model for creating quick quotes from dashboard.
 * UPDATED: Added missing fields identified from document analysis (May 2026)
 */

import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export type DOQuickQuoteData = {
  product: string;
  program: string;
  dealer?: string;
  cashPrice?: string;
  depositPercent?: string;
  interestRatePercent?: string;
  termMonths?: string;
  frequency?: string;
  balloonPercent?: string;
  residualValuePercent?: string;
  assuredFutureValue?: string;
  assetType?: string;
  kmAllowance?: string;
  calculateFor?: string;
  year?: string;
  noOfRentalsInAdvance?: string;
  fixedCheckbox?: boolean;
  confirmTerms?: boolean;
};

export class DOQuickQuotePage extends BasePage {
  private readonly debugRunId = "qq-module-debug";
  // Root containers
  readonly quickQuoteRoot: Locator;
  readonly quickQuoteCard: Locator;
  readonly quickQuoteForm: Locator;

  // Dashboard / entry actions
  readonly createQuickQuoteButton: Locator;
  readonly downloadButton: Locator;
  readonly mailButton: Locator;
  readonly printButton: Locator;

  // Quick quote dropdowns
  readonly productDropdownTrigger: Locator;
  readonly programDropdownTrigger: Locator;
  readonly dealerDropdownTrigger: Locator;
  readonly calculateForDropdownTrigger: Locator;
  readonly frequencyDropdownTrigger: Locator;
  readonly kmAllowanceDropdownTrigger: Locator;

  // Quick quote fields - STANDARD
  readonly cashPriceInput: Locator;
  readonly initialLeaseAmountInput: Locator;
  readonly depositPercentInput: Locator;
  readonly interestRatePercentInput: Locator;
  readonly termsMonthsInput: Locator;
  readonly balloonPercentInput: Locator;
  readonly residualValuePercentInput: Locator;

  // Quick quote fields - AFV SPECIFIC
  readonly assuredFutureValueInput: Locator;
  readonly assetTypeDropdownTrigger: Locator;
  readonly assetTypeSelectButton: Locator;

  // Quick quote fields - HIDDEN/CONDITIONAL
  readonly calculateForInput: Locator;
  readonly yearInput: Locator;
  readonly noOfRentalsInAdvanceInput: Locator;
  readonly leasePaymentDisplay: Locator;
  readonly paymentDisplay: Locator;
  readonly fixedCheckbox: Locator;
  readonly checkDisableCheckbox: Locator;

  // Quick quote action buttons
  readonly termsCheckbox: Locator;
  readonly calculateButton: Locator;
  readonly resetButton: Locator;
  readonly createQuoteButton: Locator;
  readonly addComparison2Button: Locator;
  readonly addComparison3Button: Locator;

  constructor(page: Page) {
    super(page);
    this.quickQuoteRoot = page.locator("app-quick-quote").first();
    this.quickQuoteCard = this.quickQuoteRoot.locator("app-create-quick-quote").first();
    this.quickQuoteForm = this.quickQuoteCard.locator("form").first();

    this.createQuickQuoteButton = page.getByRole("button", {
      name: /\+\s*Create Quick Quote/i,
    });
    this.downloadButton = this.quickQuoteRoot.getByRole("button", {
      name: /^Download$/i,
    });
    this.mailButton = this.quickQuoteRoot.getByRole("button", { name: /^Mail$/i });
    this.printButton = this.quickQuoteRoot.getByRole("button", { name: /^Print$/i });

    this.productDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Product')]/following::p-dropdown[1]"
    ).getByRole("button", { name: /dropdown trigger/i });
    this.programDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Program')]/following::p-dropdown[1]"
    ).getByRole("button", { name: /dropdown trigger/i });
    this.dealerDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Dealer')]/following::p-dropdown[1]"
    ).getByRole("button", { name: /dropdown trigger/i });
    this.calculateForDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::p-dropdown[1]"
    ).getByRole("button", { name: /dropdown trigger/i });
    this.frequencyDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Frequency')]/following::p-dropdown[1]"
    ).getByRole("button", { name: /dropdown trigger/i });
    this.kmAllowanceDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'KM Allowance')]/following::p-dropdown[1]"
    ).getByRole("button", { name: /dropdown trigger/i });

    // Asset Type dropdown (p-inputgroup pattern)
    this.assetTypeDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Asset Type')]/following::input[1]"
    );
    this.assetTypeSelectButton = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Asset Type')]/following::button[contains(., 'Select')]"
    );

    this.cashPriceInput = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Cash Price')]/following::input[1]",
    );
    this.initialLeaseAmountInput = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Initial Lease Amount')]/following::input[1]",
    );
    this.depositPercentInput = this.quickQuoteForm.locator(
      "xpath=.//label[starts-with(normalize-space(.), 'Deposit')]/following::input[@id='percent'][1]",
    );
    this.interestRatePercentInput = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Interest Rate')]/following::input[@id='percent'][1]",
    );
    this.termsMonthsInput = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Terms (Months)')]/following::input[@role='spinbutton'][1]",
    );
    this.balloonPercentInput = this.quickQuoteForm.locator(
      "xpath=.//label[starts-with(normalize-space(.), 'Balloon')]/following::input[@id='percent'][1]",
    );
    this.residualValuePercentInput = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Residual Value')]/following::input[@id='percent'][1]",
    );

    // AFV SPECIFIC - Assured Future Value
    this.assuredFutureValueInput = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Assured Future Value')]/following::input[1]",
    );

    // Hidden/conditional fields
    this.calculateForInput = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::input[1]",
    );
    this.yearInput = this.quickQuoteForm.locator(
      "xpath=.//label[normalize-space(.)='Year']/following::input[1]",
    );
    this.noOfRentalsInAdvanceInput = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'No. of Rentals in Advance')]/following::input[@role='spinbutton'][1]",
    );
    this.leasePaymentDisplay = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Lease Payment')]/following::label[1]",
    );
    this.paymentDisplay = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Payment')][not(contains(., 'Lease'))]/following::label[1]",
    );
    this.fixedCheckbox = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Fixed')]/preceding::p-checkbox[1]"
    );
    this.checkDisableCheckbox = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'checkDisable')]/preceding::p-checkbox[1]"
    );

    this.termsCheckbox = this.quickQuoteForm.locator(".p-checkbox-box").first();
    this.calculateButton = this.quickQuoteForm.getByRole("button", {
      name: /^Calculate$/i,
    });
    this.resetButton = this.quickQuoteCard.getByRole("button", {
      name: /^Reset$/i,
    });
    this.createQuoteButton = this.quickQuoteCard.getByRole("button", {
      name: /^Create Quote$/i,
    });
    this.addComparison2Button = this.quickQuoteRoot.getByRole("button", {
      name: /Add Comparison 2/i,
    });
    this.addComparison3Button = this.quickQuoteRoot.getByRole("button", {
      name: /Add Comparison 3/i,
    });
  }

  /**
   * Opens the quick quote panel from dashboard.
   */
  async openQuickQuote(): Promise<void> {
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H1",location:"QuickQuotePage.ts:openQuickQuote:entry",message:"Open quick quote start",data:{buttonVisible:await this.createQuickQuoteButton.isVisible().catch(()=>false)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await this.clickElement(this.createQuickQuoteButton);
    await this.waitForLoadingComplete();
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H1",location:"QuickQuotePage.ts:openQuickQuote:exit",message:"Open quick quote done",data:{rootVisible:await this.quickQuoteRoot.isVisible().catch(()=>false),formVisible:await this.quickQuoteForm.isVisible().catch(()=>false)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  private async selectFromDropdown(
    trigger: Locator,
    optionText: string,
  ): Promise<void> {
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H2",location:"QuickQuotePage.ts:selectFromDropdown:before",message:"Select dropdown option start",data:{optionText,triggerVisible:await trigger.isVisible().catch(()=>false)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await trigger.waitFor({ state: "visible", timeout: 60_000 });
    await this.clickElement(trigger);
    const option = this.page.getByRole("option").filter({ hasText: optionText }).first();
    const optionsCount = await this.page.getByRole("option").count().catch(() => -1);
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H2",location:"QuickQuotePage.ts:selectFromDropdown:afterOpen",message:"Dropdown opened",data:{optionText,optionsCount,targetOptionVisible:await option.isVisible().catch(()=>false)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await option.click();
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H2",location:"QuickQuotePage.ts:selectFromDropdown:afterSelect",message:"Dropdown option selected",data:{optionText},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  async selectProduct(product: string): Promise<void> {
    await this.selectFromDropdown(this.productDropdownTrigger, product);
  }

  async selectProgram(program: string): Promise<void> {
    await this.selectFromDropdown(this.programDropdownTrigger, program);
  }

  async selectDealer(dealer: string): Promise<void> {
    await this.selectFromDropdown(this.dealerDropdownTrigger, dealer);
  }

  async enterCashPrice(cashPrice: string): Promise<void> {
    await this.fillElement(this.cashPriceInput, cashPrice);
  }

  async enterInitialLeaseAmount(initialLeaseAmount: string): Promise<void> {
    await this.fillElement(this.initialLeaseAmountInput, initialLeaseAmount);
  }

  async enterDepositPercent(depositPercent: string): Promise<void> {
    await this.fillElement(this.depositPercentInput, depositPercent);
  }

  async enterInterestRatePercent(interestRatePercent: string): Promise<void> {
    await this.fillElement(this.interestRatePercentInput, interestRatePercent);
  }

  /**
   * PrimeNG p-inputNumber (Terms) does not reliably sync Angular model when using fill().
   * Use real keyboard input + blur so validation sees the value.
   */
  async enterTermsMonths(termMonths: string): Promise<void> {
    const input = this.termsMonthsInput;
    await input.waitFor({ state: "visible", timeout: 10_000 });
    await this.clickElement(input);
    await input.evaluate((el: HTMLInputElement) => {
      el.focus();
      el.select();
    });
    await input.press("Backspace");
    await input.pressSequentially(termMonths, { delay: 30 });
    await input.blur();
  }

  async selectCalculateFor(calculateFor: string): Promise<void> {
    await this.selectFromDropdown(this.calculateForDropdownTrigger, calculateFor);
  }

  async selectFrequency(frequency: string): Promise<void> {
    await this.selectFromDropdown(this.frequencyDropdownTrigger, frequency);
  }

  async selectKMAllowance(kmAllowance: string): Promise<void> {
    await this.selectFromDropdown(this.kmAllowanceDropdownTrigger, kmAllowance);
  }

  async selectAssetType(assetType: string): Promise<void> {
    await this.clickElement(this.assetTypeSelectButton);
    const option = this.page.getByRole("option").filter({ hasText: assetType }).first();
    await option.click();
  }

  async enterBalloonPercent(balloonPercent: string): Promise<void> {
    await this.fillElement(this.balloonPercentInput, balloonPercent);
  }

  async enterResidualValuePercent(residualValuePercent: string): Promise<void> {
    await this.fillElement(this.residualValuePercentInput, residualValuePercent);
  }

  async enterAssuredFutureValue(value: string): Promise<void> {
    await this.fillElement(this.assuredFutureValueInput, value);
  }

  async enterYear(year: string): Promise<void> {
    await this.fillElement(this.yearInput, year);
  }

  async enterNoOfRentalsInAdvance(count: string): Promise<void> {
    const input = this.noOfRentalsInAdvanceInput;
    await input.waitFor({ state: "visible", timeout: 10_000 });
    await this.clickElement(input);
    await input.evaluate((el: HTMLInputElement) => {
      el.focus();
      el.select();
    });
    await input.press("Backspace");
    await input.pressSequentially(count, { delay: 30 });
    await input.blur();
  }

  async confirmTermsAndConditions(): Promise<void> {
    await this.clickElement(this.termsCheckbox);
  }

  async checkFixedCheckbox(): Promise<void> {
    await this.clickElement(this.fixedCheckbox);
  }

  async checkDisableCheckbox(): Promise<void> {
    await this.clickElement(this.checkDisableCheckbox);
  }

  async clickCalculate(): Promise<void> {
    const isEnabled = await this.calculateButton.isEnabled().catch(() => false);
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H3",location:"QuickQuotePage.ts:clickCalculate:before",message:"Calculate click start",data:{calculateEnabled:isEnabled},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await this.clickElement(this.calculateButton);
    await this.waitForLoadingComplete();
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H5",location:"QuickQuotePage.ts:clickCalculate:after",message:"Calculate click done",data:{createQuoteVisible:await this.createQuoteButton.isVisible().catch(()=>false),downloadVisible:await this.downloadButton.isVisible().catch(()=>false),printVisible:await this.printButton.isVisible().catch(()=>false)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  async clickCreateQuote(): Promise<void> {
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H4",location:"QuickQuotePage.ts:clickCreateQuote:before",message:"Create quote click start",data:{currentUrl:this.page.url()},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await this.clickElement(this.createQuoteButton);
    await this.waitForLoadingComplete();
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H4",location:"QuickQuotePage.ts:clickCreateQuote:after",message:"Create quote click done",data:{currentUrl:this.page.url(),standardQuoteVisible:await this.page.locator("app-quote-details, app-standard-quote").first().isVisible().catch(()=>false)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  async clickReset(): Promise<void> {
    await this.clickElement(this.resetButton);
    await this.waitForLoadingComplete();
  }

  async clickAddComparison2(): Promise<void> {
    await this.clickElement(this.addComparison2Button);
    await this.waitForLoadingComplete();
  }

  async isMailButtonEnabled(): Promise<boolean> {
    try {
      return await this.mailButton.isEnabled();
    } catch {
      return false;
    }
  }

  async isAddComparison2Enabled(): Promise<boolean> {
    try {
      return await this.addComparison2Button.isEnabled();
    } catch {
      return false;
    }
  }

  async isAddComparison3Enabled(): Promise<boolean> {
    try {
      return await this.addComparison3Button.isEnabled();
    } catch {
      return false;
    }
  }

  async getFieldVisibilityState(fieldName: string): Promise<"visible" | "hidden" | "disabled"> {
    const containerMap: Record<string, Locator> = {
      cashPrice: this.cashPriceInput.locator("xpath=../.."),
      depositPercent: this.depositPercentInput.locator("xpath=../.."),
      interestRatePercent: this.interestRatePercentInput.locator("xpath=../.."),
      termMonths: this.termsMonthsInput.locator("xpath=../.."),
      balloonPercent: this.balloonPercentInput.locator("xpath=../.."),
      residualValuePercent: this.residualValuePercentInput.locator("xpath=../.."),
      assuredFutureValue: this.assuredFutureValueInput.locator("xpath=../.."),
      assetType: this.assetTypeDropdownTrigger.locator("xpath=../.."),
      frequency: this.frequencyDropdownTrigger.locator("xpath=../.."),
    };

    const inputMap: Record<string, Locator> = {
      cashPrice: this.cashPriceInput,
      depositPercent: this.depositPercentInput,
      interestRatePercent: this.interestRatePercentInput,
      termMonths: this.termsMonthsInput,
      balloonPercent: this.balloonPercentInput,
      residualValuePercent: this.residualValuePercentInput,
      assuredFutureValue: this.assuredFutureValueInput,
      assetType: this.assetTypeDropdownTrigger,
      frequency: this.frequencyDropdownTrigger,
    };

    const container = containerMap[fieldName];
    const input = inputMap[fieldName];

    if (!container || !input) return "hidden";

    try {
      const classAttr = await container.getAttribute("class", { timeout: 2000 });
      if (classAttr?.includes("hidden")) return "hidden";
    } catch {
      return "hidden";
    }

    try {
      const isEnabled = await input.isEnabled();
      return isEnabled ? "visible" : "disabled";
    } catch {
      return "hidden";
    }
  }

  async expectFieldToBeVisible(fieldName: string): Promise<void> {
    const state = await this.getFieldVisibilityState(fieldName);
    expect(state).not.toBe("hidden");
  }

  async expectFieldToBeHidden(fieldName: string): Promise<void> {
    const state = await this.getFieldVisibilityState(fieldName);
    expect(state).toBe("hidden");
  }

  async expectMailButtonToBeDisabled(): Promise<void> {
    await expect(this.mailButton).toBeDisabled();
  }

  async expectMailButtonToBeEnabled(): Promise<void> {
    await expect(this.mailButton).toBeEnabled();
  }

  async expectCreateQuoteVisible(): Promise<void> {
    await expect(this.createQuoteButton).toBeVisible({ timeout: 30_000 });
  }

  /**
   * End-to-end helper for common quick quote creation flow.
   */
  async createQuickQuote(data: DOQuickQuoteData): Promise<void> {
    await this.openQuickQuote();
    await this.selectProduct(data.product);
    await this.selectProgram(data.program);

    if (data.dealer) await this.selectDealer(data.dealer);
    if (data.assetType) await this.selectAssetType(data.assetType);
    if (data.assuredFutureValue) await this.enterAssuredFutureValue(data.assuredFutureValue);
    if (data.cashPrice) await this.enterCashPrice(data.cashPrice);
    if (data.depositPercent) await this.enterDepositPercent(data.depositPercent);
    if (data.interestRatePercent) await this.enterInterestRatePercent(data.interestRatePercent);
    if (data.termMonths) await this.enterTermsMonths(data.termMonths);
    if (data.frequency) await this.selectFrequency(data.frequency);
    if (data.kmAllowance) await this.selectKMAllowance(data.kmAllowance);
    if (data.balloonPercent) await this.enterBalloonPercent(data.balloonPercent);
    if (data.residualValuePercent) await this.enterResidualValuePercent(data.residualValuePercent);
    if (data.year) await this.enterYear(data.year);
    if (data.noOfRentalsInAdvance) await this.enterNoOfRentalsInAdvance(data.noOfRentalsInAdvance);
    if (data.confirmTerms) await this.confirmTermsAndConditions();

    await this.clickCalculate();
  }
}
