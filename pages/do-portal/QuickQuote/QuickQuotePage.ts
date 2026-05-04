/**
 * DO Portal - Quick Quote Page
 * Page Object Model for creating quick quotes from dashboard.
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
  confirmTerms?: boolean;
};

export class DOQuickQuotePage extends BasePage {
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

  // Quick quote fields
  readonly cashPriceInput: Locator;
  readonly initialLeaseAmountInput: Locator;
  readonly depositPercentInput: Locator;
  readonly interestRatePercentInput: Locator;
  readonly termsMonthsInput: Locator;
  readonly balloonPercentInput: Locator;
  readonly residualValuePercentInput: Locator;

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
      "xpath=.//label[contains(normalize-space(.), 'Product')]/following::div[@aria-label='dropdown trigger'][1]",
    );
    this.programDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Program')]/following::div[@aria-label='dropdown trigger'][1]",
    );
    this.dealerDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Dealer')]/following::div[@aria-label='dropdown trigger'][1]",
    );
    this.calculateForDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::div[@aria-label='dropdown trigger'][1]",
    );
    this.frequencyDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Frequency')]/following::div[@aria-label='dropdown trigger'][1]",
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
    await this.clickElement(this.createQuickQuoteButton);
    await this.waitForLoadingComplete();
  }

  private async selectFromDropdown(
    trigger: Locator,
    optionText: string,
  ): Promise<void> {
    await trigger.waitFor({ state: "visible", timeout: 60_000 });
    await this.clickElement(trigger);
    await this.page.getByRole("option", { name: optionText }).click();
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

  async enterTermsMonths(termMonths: string): Promise<void> {
    await this.fillElement(this.termsMonthsInput, termMonths);
  }

  async selectCalculateFor(calculateFor: string): Promise<void> {
    await this.selectFromDropdown(this.calculateForDropdownTrigger, calculateFor);
  }

  async selectFrequency(frequency: string): Promise<void> {
    await this.selectFromDropdown(this.frequencyDropdownTrigger, frequency);
  }

  async enterBalloonPercent(balloonPercent: string): Promise<void> {
    await this.fillElement(this.balloonPercentInput, balloonPercent);
  }

  async enterResidualValuePercent(residualValuePercent: string): Promise<void> {
    await this.fillElement(this.residualValuePercentInput, residualValuePercent);
  }

  async confirmTermsAndConditions(): Promise<void> {
    await this.clickElement(this.termsCheckbox);
  }

  async clickCalculate(): Promise<void> {
    await this.clickElement(this.calculateButton);
    await this.waitForLoadingComplete();
  }

  async clickCreateQuote(): Promise<void> {
    await this.clickElement(this.createQuoteButton);
    await this.waitForLoadingComplete();
  }

  async clickReset(): Promise<void> {
    await this.clickElement(this.resetButton);
    await this.waitForLoadingComplete();
  }

  async clickAddComparison2(): Promise<void> {
    await this.clickElement(this.addComparison2Button);
    await this.waitForLoadingComplete();
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

    if (data.dealer) {
      await this.selectDealer(data.dealer);
    }
    if (data.cashPrice) {
      await this.enterCashPrice(data.cashPrice);
    }
    if (data.depositPercent) {
      await this.enterDepositPercent(data.depositPercent);
    }
    if (data.interestRatePercent) {
      await this.enterInterestRatePercent(data.interestRatePercent);
    }
    if (data.termMonths) {
      await this.enterTermsMonths(data.termMonths);
    }

    const frequencyValue = (data.frequency ?? "").trim();
    if (frequencyValue.length > 0) {
      await this.selectFrequency(frequencyValue);
    }

    const balloonPercentValue = (data.balloonPercent ?? "").trim();
    if (balloonPercentValue.length > 0) {
      await this.enterBalloonPercent(balloonPercentValue);
    }

    const residualValuePercentValue = (data.residualValuePercent ?? "").trim();
    if (residualValuePercentValue.length > 0) {
      await this.enterResidualValuePercent(residualValuePercentValue);
    }

    if (data.confirmTerms === true) {
      await this.confirmTermsAndConditions();
    }
    await this.clickCalculate();
  }
}
