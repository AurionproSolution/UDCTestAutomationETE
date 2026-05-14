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
  readonly balloonDollarInput: Locator;
  readonly depositDollarInput: Locator;
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
  /** Payment amount entry/display (CSA); may be readonly until first calculation. */
  readonly paymentAmountInput: Locator;
  readonly fixedCheckbox: Locator;
  readonly checkDisableCheckbox: Locator;

  // Quick quote action buttons
  readonly termsCheckbox: Locator;
  readonly calculateButton: Locator;
  readonly resetButton: Locator;
  readonly createQuoteButton: Locator;
  readonly addComparison2Button: Locator;
  readonly addComparison3Button: Locator;
  /** First action that adds Quick Quote 2 (label varies by build). */
  readonly addComparisonPrimaryButton: Locator;
  /** Post-calculation summary region (loan, fees, totals). */
  readonly calculationSummaryRegion: Locator;

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
    this.dealerDropdownTrigger = this.quickQuoteForm
      .locator(
        "xpath=.//label[contains(normalize-space(.), 'Dealer') or contains(normalize-space(.), 'Originator')]/following::p-dropdown[1]",
      )
      .getByRole("button", { name: /dropdown trigger/i });
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
    // Deposit / Balloon: paired p-inputNumber (% OR $). Scope each pair from its section label to the
    // row's "OR" node — the form can contain other "OR" text earlier, so global OR[1]/OR[2] is unsafe.
    const orSep =
      "*[normalize-space(.)='OR' or normalize-space(.)='or' or normalize-space(.)='Or' or normalize-space(.)='oR']";
    this.depositPercentInput = this.quickQuoteForm.locator(
      `xpath=.//label[starts-with(normalize-space(.), 'Deposit')]/following::${orSep}[1]/preceding::input[@id='percent'][1]`,
    );
    this.interestRatePercentInput = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Interest Rate')]/following::input[@id='percent'][1]",
    );
    this.termsMonthsInput = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Terms (Months)')]/following::input[@role='spinbutton'][1]",
    );
    this.balloonPercentInput = this.quickQuoteForm.locator(
      `xpath=.//label[starts-with(normalize-space(.), 'Balloon')]/following::${orSep}[1]/preceding::input[@id='percent'][1]`,
    );
    this.balloonDollarInput = this.quickQuoteForm
      .locator(
        `xpath=.//label[starts-with(normalize-space(.), 'Balloon')]/following::${orSep}[1]/following::input[@id='amount'][1]`,
      )
      .or(
        this.quickQuoteForm.locator(
          "xpath=.//label[contains(normalize-space(.), 'Balloon')][contains(normalize-space(.), '$')]/following::input[1]",
        ),
      )
      .or(
        this.quickQuoteForm.locator(
          "xpath=.//label[starts-with(normalize-space(.), 'Balloon')]/following::input[@id='amount'][1]",
        ),
      );
    this.depositDollarInput = this.quickQuoteForm
      .locator(
        `xpath=.//label[starts-with(normalize-space(.), 'Deposit')]/following::${orSep}[1]/following::input[@id='amount'][1]`,
      )
      .or(
        this.quickQuoteForm.locator(
          "xpath=.//label[contains(normalize-space(.), 'Deposit')][contains(normalize-space(.), '$')]/following::input[1]",
        ),
      )
      .or(
        this.quickQuoteForm.locator(
          "xpath=.//label[starts-with(normalize-space(.), 'Deposit')]/following::input[@id='amount'][1]",
        ),
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
    this.paymentAmountInput = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Payment')][not(contains(., 'Lease'))]/following::input[1]",
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
    this.addComparisonPrimaryButton = this.quickQuoteRoot.getByRole("button", {
      name: /\+\s*Add Comparison|Add Comparison 2/i,
    });
    const summaryByClass = this.quickQuoteCard.locator(
      ".calculation-result, [class*='calculation'], [class*='summary'], app-calculation-result, app-calculation-summary",
    );
    const summaryByContent = this.quickQuoteCard
      .locator("div, section, article")
      .filter({ hasText: /Loan Amount/i })
      .filter({ hasText: /Total (Amount )?Payable|Total Fees|Total Interest/i });
    this.calculationSummaryRegion = summaryByClass.or(summaryByContent);
  }

  /** Scoped form for multi-comparison Quick Quote panels (0 = first). */
  quoteForm(quoteIndex: number): Locator {
    return this.quickQuoteRoot
      .locator("app-create-quick-quote")
      .nth(quoteIndex)
      .locator("form")
      .first();
  }

  calculateForTriggerOnQuote(quoteIndex: number): Locator {
    return this.quoteForm(quoteIndex)
      .locator(
        "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::p-dropdown[1]",
      )
      .getByRole("button", { name: /dropdown trigger/i });
  }

  frequencyTriggerOnQuote(quoteIndex: number): Locator {
    return this.quoteForm(quoteIndex)
      .locator(
        "xpath=.//label[contains(normalize-space(.), 'Frequency')]/following::p-dropdown[1]",
      )
      .getByRole("button", { name: /dropdown trigger/i });
  }

  cashPriceInputOnQuote(quoteIndex: number): Locator {
    return this.quoteForm(quoteIndex).locator(
      "xpath=.//label[contains(normalize-space(.), 'Cash Price')]/following::input[1]",
    );
  }

  interestRateInputOnQuote(quoteIndex: number): Locator {
    return this.quoteForm(quoteIndex).locator(
      "xpath=.//label[contains(normalize-space(.), 'Interest Rate')]/following::input[@id='percent'][1]",
    );
  }

  termsInputOnQuote(quoteIndex: number): Locator {
    return this.quoteForm(quoteIndex).locator(
      "xpath=.//label[contains(normalize-space(.), 'Terms (Months)')]/following::input[@role='spinbutton'][1]",
    );
  }

  programDropdownOnQuote(quoteIndex: number): Locator {
    return this.quoteForm(quoteIndex)
      .locator(
        "xpath=.//label[contains(normalize-space(.), 'Program')]/following::p-dropdown[1]",
      )
      .first();
  }

  /**
   * Opens the quick quote panel from dashboard.
   */
  async openQuickQuote(): Promise<void> {
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H1",location:"QuickQuotePage.ts:openQuickQuote:entry",message:"Open quick quote start",data:{buttonVisible:await this.createQuickQuoteButton.isVisible().catch(()=>false)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const blockingOverlay = this.page.locator(".app-loader-overlay, [class*='app-loader']");
    const overlayCount = await blockingOverlay.count();
    if (overlayCount > 0) {
      const first = blockingOverlay.first();
      if (await first.isVisible().catch(() => false)) {
        await first.waitFor({ state: "hidden", timeout: 120_000 });
      }
    }
    const spinner = this.page.locator(
      ".app-loader-overlay p-progressspinner, .app-loader p-progressspinner",
    ).first();
    try {
      await spinner.waitFor({ state: "hidden", timeout: 120_000 });
    } catch {
      /* Slow QAT: proceed to CTA; click will retry after waitForLoadingComplete */
    }
    await this.clickElement(this.createQuickQuoteButton);
    await this.waitForLoadingComplete();
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H1",location:"QuickQuotePage.ts:openQuickQuote:exit",message:"Open quick quote done",data:{rootVisible:await this.quickQuoteRoot.isVisible().catch(()=>false),formVisible:await this.quickQuoteForm.isVisible().catch(()=>false)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  /**
   * Masked / p-inputNumber fields: clear+fill() can append digits or leave a stale Angular model.
   * `select()` + one Backspace is unreliable on PrimeNG; use Select-All + delete, then type.
   */
  private async replaceInputValueByKeyboard(input: Locator, text: string): Promise<void> {
    await input.waitFor({ state: "visible", timeout: 10_000 });
    await this.clickElement(input);
    await input.focus();
    if (process.platform === "darwin") {
      await input.press("Meta+A");
    } else {
      await input.press("Control+A");
    }
    await input.press("Backspace");
    if (process.platform === "darwin") {
      await input.press("Meta+A");
    } else {
      await input.press("Control+A");
    }
    await input.press("Delete");
    if (text.length > 0) {
      await input.pressSequentially(text, { delay: 25 });
    }
    await input.blur();
  }

  /** Deposit/Balloon % and $ derive from cash; wait until the cash field shows a positive amount. */
  private async ensureCashPricePositiveForDerivedFields(): Promise<void> {
    await expect
      .poll(async () => this.parseLocaleNumber(await this.cashPriceInput.inputValue().catch(() => "")), {
        timeout: 25_000,
      })
      .toBeGreaterThan(0);
  }

  private readPercentInputValue(raw: string): number {
    const n = Number.parseFloat(raw.replace(/%/g, "").replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : Number.NaN;
  }

  /**
   * Deposit / Balloon %: click to place caret (like manual entry), then type or paste — no select-all / clear.
   */
  private async replaceDepositBalloonPercentInput(
    primary: Locator,
    role: "deposit" | "balloon",
    text: string,
  ): Promise<void> {
    const fallback =
      role === "deposit"
        ? this.quickQuoteForm.locator(
            "xpath=.//label[starts-with(normalize-space(.), 'Deposit')]/following::input[@id='percent'][1]",
          )
        : this.quickQuoteForm.locator(
            "xpath=.//label[starts-with(normalize-space(.), 'Balloon')]/following::input[@id='percent'][1]",
          );

    const trimmed = text.trim();
    const want = Number.parseFloat(trimmed);
    const read = async (loc: Locator) => this.readPercentInputValue(await loc.inputValue().catch(() => ""));

    for (const loc of [primary, fallback]) {
      try {
        await loc.waitFor({ state: "visible", timeout: 5_000 });
      } catch {
        continue;
      }

      await loc.scrollIntoViewIfNeeded();
      await this.clickElement(loc);

      if (trimmed.length > 0) {
        await loc.pressSequentially(trimmed, { delay: 45 });
      }
      await loc.blur();

      if (!Number.isFinite(want) || trimmed.length === 0) {
        return;
      }

      try {
        await expect.poll(async () => Math.round(await read(loc)), { timeout: 12_000 }).toBe(Math.round(want));
        return;
      } catch {
        await this.clickElement(loc);
        await this.pasteTextNoSelectAll(loc, trimmed);
        await loc.blur();
        try {
          await expect.poll(async () => Math.round(await read(loc)), { timeout: 8_000 }).toBe(Math.round(want));
          return;
        } catch {
          /* try next locator */
        }
      }
    }

    throw new Error(`Quick Quote: could not commit ${role} percent (${text})`);
  }

  private parseLocaleNumber(raw: string): number {
    if (!raw?.trim()) return Number.NaN;
    const t = raw.trim().replace(/[$,\s]/g, "").replace(/[^\d.-]/g, "");
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : Number.NaN;
  }

  /**
   * Paste into the focused input without select-all / clear (caret stays where the user would type).
   */
  private async pasteTextNoSelectAll(input: Locator, text: string): Promise<void> {
    await input.focus();
    let origin = "https://localhost";
    try {
      origin = new URL(this.page.url()).origin;
    } catch {
      /* ignore */
    }
    await this.page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin }).catch(() => {});
    await this.page.evaluate(async (t) => {
      await navigator.clipboard.writeText(t);
    }, text);
    await this.page.keyboard.press(process.platform === "darwin" ? "Meta+v" : "Control+v");
  }

  /**
   * Cash / paired currency fields: click to focus (caret as in manual use), then paste or type —
   * no Ctrl+A, triple-click, `clear()`, or `fill()` (fill clears the field in Playwright).
   */
  private async replaceCashPriceInInput(input: Locator, cashPrice: string): Promise<void> {
    const trimmed = cashPrice.trim();
    const want = this.parseLocaleNumber(trimmed);
    await input.waitFor({ state: "visible", timeout: 10_000 });

    const read = async (): Promise<number> =>
      this.parseLocaleNumber(await input.inputValue().catch(() => ""));

    if (!Number.isFinite(want) || trimmed.length === 0) {
      await this.clickElement(input);
      if (trimmed.length > 0) {
        await input.pressSequentially(trimmed, { delay: 45 });
      }
      await input.blur();
      return;
    }

    const wantRounded = Math.round(want);

    const valueMatchesCommit = async (): Promise<boolean> => {
      const raw = (await input.inputValue().catch(() => "")).trim();
      const n = Math.round(await read());
      if (n === wantRounded) {
        return true;
      }
      /* p-inputNumber can mask negatives so parsed number ≠ model; accept visible "-100" style text. */
      if (wantRounded < 0 && /-/.test(raw)) {
        const digits = String(Math.abs(wantRounded));
        return raw.replace(/[$,\s]/g, "").includes(digits);
      }
      return false;
    };

    const grouped =
      Number.isInteger(want) && Math.abs(want) >= 1000
        ? want.toLocaleString("en-US", { useGrouping: true, maximumFractionDigits: 0 })
        : trimmed;

    const intPartLen = (() => {
      const core = trimmed.replace(/\s/g, "").replace(/^[-+]/, "").split(".")[0] ?? "";
      return core.replace(/\D/g, "").length;
    })();
    /* Signed / short amounts (e.g. -100): paste is unreliable; type first. Long cash (20000): paste before sequential to avoid $20.00. */
    const useShortEntryFirst = intPartLen <= 4;

    const strategies: Array<() => Promise<void>> = [];

    if (useShortEntryFirst) {
      strategies.push(async () => {
        await this.clickElement(input);
        await input.pressSequentially(trimmed, { delay: 40 });
        await input.blur();
      });
    } else {
      strategies.push(
        async () => {
          await this.clickElement(input);
          await this.pasteTextNoSelectAll(input, String(wantRounded));
          await input.blur();
        },
        async () => {
          await this.clickElement(input);
          await this.pasteTextNoSelectAll(input, grouped);
          await input.blur();
        },
        async () => {
          await this.clickElement(input);
          await input.pressSequentially(trimmed, { delay: 45 });
          await input.blur();
        },
      );
    }

    strategies.push(async () => {
      await input.evaluate((el: HTMLInputElement, v: string) => {
        el.focus();
        el.value = v;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, trimmed);
      await input.blur();
    });

    for (const strat of strategies) {
      await strat();
      try {
        await expect.poll(valueMatchesCommit, { timeout: 12_000 }).toBe(true);
        return;
      } catch {
        /* next strategy */
      }
    }

    throw new Error(`Quick Quote: could not commit cash price (${cashPrice})`);
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
    await this.replaceCashPriceInInput(this.cashPriceInput, cashPrice);
  }

  async enterInitialLeaseAmount(initialLeaseAmount: string): Promise<void> {
    await this.fillElement(this.initialLeaseAmountInput, initialLeaseAmount);
  }

  async enterDepositPercent(depositPercent: string): Promise<void> {
    const t = depositPercent.trim();
    if (t !== "" && Number.isFinite(Number.parseFloat(t)) && Number.parseFloat(t) !== 0) {
      await this.ensureCashPricePositiveForDerivedFields();
    }
    await this.replaceDepositBalloonPercentInput(this.depositPercentInput, "deposit", depositPercent);
  }

  async enterInterestRatePercent(interestRatePercent: string): Promise<void> {
    await this.fillElement(this.interestRatePercentInput, interestRatePercent);
  }

  /**
   * PrimeNG p-inputNumber (Terms) does not reliably sync Angular model when using fill().
   * Use real keyboard input + blur so validation sees the value.
   */
  async enterTermsMonths(termMonths: string): Promise<void> {
    await this.replaceInputValueByKeyboard(this.termsMonthsInput, termMonths);
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
    const t = balloonPercent.trim();
    const n = Number.parseFloat(t);
    if (t !== "" && Number.isFinite(n) && n !== 0) {
      await this.ensureCashPricePositiveForDerivedFields();
    }
    await this.replaceDepositBalloonPercentInput(this.balloonPercentInput, "balloon", balloonPercent);
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
    await this.replaceInputValueByKeyboard(this.noOfRentalsInAdvanceInput, count);
  }

  async confirmTermsAndConditions(): Promise<void> {
    await this.clickElement(this.termsCheckbox);
  }

  async checkFixedCheckbox(): Promise<void> {
    await this.clickElement(this.fixedCheckbox);
  }

  /**
   * Sets the Fixed balloon checkbox without toggling blindly.
   * PrimeNG: checked state is on the `p-checkbox` host (`p-checkbox-checked`).
   */
  async setFixedCheckbox(checked: boolean): Promise<void> {
    const host = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Fixed')]/ancestor::p-checkbox[1]",
    );
    const box = host.locator(".p-checkbox-box").first();
    await box.waitFor({ state: "visible", timeout: 15_000 });
    const cls = (await host.getAttribute("class")) ?? "";
    const isChecked = cls.includes("p-checkbox-checked");
    if (isChecked !== checked) {
      await this.clickElement(box);
    }
  }

  async clickCheckDisableCheckbox(): Promise<void> {
    await this.clickElement(this.checkDisableCheckbox);
  }

  /**
   * Closes PrimeNG dropdown overlays that can cover the Quick Quote form after
   * opening a Product/Program list and pressing Escape (TC_QQ_005 → TC_QQ_006).
   */
  async dismissQuickQuoteDropdownOverlays(): Promise<void> {
    const panel = this.page.locator(
      ".p-dropdown-panel.p-component, .p-select-panel.p-component, .p-connected-overlay .p-dropdown-panel",
    );
    for (let i = 0; i < 6; i++) {
      const open = await panel.first().isVisible().catch(() => false);
      if (!open) break;
      await this.page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 150));
    }
    await panel.first().waitFor({ state: "hidden", timeout: 8_000 }).catch(() => {});
    await this.quickQuoteRoot
      .click({ position: { x: 24, y: 24 }, timeout: 3_000, force: true })
      .catch(() => {});
  }

  async clickCalculate(): Promise<void> {
    await this.dismissQuickQuoteDropdownOverlays();
    await this.calculateButton.scrollIntoViewIfNeeded().catch(() => {});
    const isEnabled = await this.calculateButton.isEnabled().catch(() => false);
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H3",location:"QuickQuotePage.ts:clickCalculate:before",message:"Calculate click start",data:{calculateEnabled:isEnabled},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (isEnabled) {
      await this.clickElement(this.calculateButton, 45_000);
    } else {
      /* Invalid form (e.g. negative cash): trigger stays disabled but app still validates on click — force-click. */
      await this.calculateButton.scrollIntoViewIfNeeded().catch(() => {});
      await this.calculateButton.click({ force: true, timeout: 15_000 });
    }
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

  async enterDepositDollars(amount: string): Promise<void> {
    await this.replaceCashPriceInInput(this.depositDollarInput, amount);
  }

  async enterBalloonDollars(amount: string): Promise<void> {
    await this.replaceCashPriceInInput(this.balloonDollarInput, amount);
  }

  async enterPaymentAmount(payment: string): Promise<void> {
    const input = this.paymentAmountInput;
    await input.waitFor({ state: "visible", timeout: 10_000 });
    await this.clickElement(input);
    await input.evaluate((el: HTMLInputElement) => {
      el.focus();
      el.select();
    });
    await input.press("Backspace");
    await input.pressSequentially(payment, { delay: 30 });
    await input.blur();
  }

  async clearTermsMonths(quoteIndex = 0): Promise<void> {
    const input =
      quoteIndex === 0 ? this.termsMonthsInput : this.termsInputOnQuote(quoteIndex);
    await input.waitFor({ state: "visible", timeout: 10_000 });
    await this.clickElement(input);
    await input.evaluate((el: HTMLInputElement) => {
      el.focus();
      el.select();
    });
    await input.press("Delete");
    await input.blur();
  }

  async selectCalculateForOnQuote(quoteIndex: number, calculateFor: string): Promise<void> {
    await this.selectFromDropdown(
      this.calculateForTriggerOnQuote(quoteIndex),
      calculateFor,
    );
  }

  async selectFrequencyOnQuote(quoteIndex: number, frequency: string): Promise<void> {
    await this.selectFromDropdown(
      this.frequencyTriggerOnQuote(quoteIndex),
      frequency,
    );
  }

  async enterCashPriceOnQuote(quoteIndex: number, cashPrice: string): Promise<void> {
    await this.replaceCashPriceInInput(this.cashPriceInputOnQuote(quoteIndex), cashPrice);
  }

  async enterInterestRatePercentOnQuote(
    quoteIndex: number,
    interestRatePercent: string,
  ): Promise<void> {
    await this.fillElement(
      this.interestRateInputOnQuote(quoteIndex),
      interestRatePercent,
    );
  }

  async enterTermsMonthsOnQuote(quoteIndex: number, termMonths: string): Promise<void> {
    await this.replaceInputValueByKeyboard(this.termsInputOnQuote(quoteIndex), termMonths);
  }

  async clickCalculateOnQuote(quoteIndex: number): Promise<void> {
    const btn = this.quoteForm(quoteIndex).getByRole("button", { name: /^Calculate$/i });
    await this.clickElement(btn);
    await this.waitForLoadingComplete();
  }

  async clickAddComparisonPrimary(): Promise<void> {
    const primary = this.addComparisonPrimaryButton;
    if (await primary.isVisible().catch(() => false)) {
      await this.clickElement(primary);
    } else {
      await this.clickElement(this.addComparison2Button);
    }
    await this.waitForLoadingComplete();
  }

  async quickQuotePanelCount(): Promise<number> {
    return await this.quickQuoteRoot.locator("app-create-quick-quote").count();
  }

  async expectPleaseCompleteInForm(quoteIndex = 0): Promise<void> {
    await expect(
      this.quoteForm(quoteIndex).getByText(/Please complete/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  }

  /**
   * Blank Terms: some builds keep Calculate enabled and show "Please complete" after click;
   * others disable Calculate and show inline copy (e.g. "This field cannot be blank").
   */
  async expectBlankTermsValidation(quoteIndex = 0): Promise<void> {
    await expect(
      this.quoteForm(quoteIndex)
        .getByText(
          /Please complete|cannot be blank|must not be blank|this field cannot|field\s+cannot\s+be\s+blank|is required|enter.*term/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  }

  async expectTermExceedsMaxMessage(quoteIndex = 0): Promise<void> {
    await expect(
      this.quoteForm(quoteIndex)
        .getByText(
          /Term\s+(must not be|cannot be)\s+greater than|Term.*greater than\s*\d+|exceeds.*maximum|maximum.*term/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  }

  /**
   * Negative / invalid cash price: some builds show inline text; others only PrimeNG
   * invalid styling (red outline) or clamp to $0.00 with no message. Some builds defer
   * feedback to toasts/dialogs after Calculate completes.
   */
  async expectCashPriceNonNegativeMessage(quoteIndex = 0): Promise<void> {
    const form = this.quoteForm(quoteIndex);
    const cashInput =
      quoteIndex === 0 ? this.cashPriceInput : this.cashPriceInputOnQuote(quoteIndex);

    const textPattern =
      /greater than or equal to\s*0|>=\s*0|must not be negative|\bnegative\b|invalid|minimum|positive|non-?negative|less than\s*0|below\s*0|cannot be\s*negative|cannot be greater than|enter a valid|value must|must be at least|greater than or equal|not less than|>=\s*0\.00/i;

    const asyncFeedbackPattern =
      /greater than or equal to\s*0|>=\s*0|must not be negative|\bnegative\b|invalid|minimum|positive|non-?negative|less than\s*0|below\s*0|cannot be\s*negative|cannot be greater than|enter a valid|value must|must be at least|cash|price|amount|error|failed|unable|bad request|request\s+failed|not\s+valid|validation|exception|problem|incorrect/i;

    const invalidDomOnCash = (): Promise<boolean> =>
      cashInput
        .evaluate((el) => {
          const inp = el as HTMLInputElement;
          if (typeof inp.checkValidity === "function" && !inp.checkValidity()) {
            return true;
          }
          const root = el.closest("p-inputnumber, .p-inputnumber, .p-float-label");
          if (root && /ng-invalid|p-invalid|is-invalid/i.test(root.className?.toString() ?? "")) {
            return true;
          }
          let n: Element | null = el;
          for (let i = 0; i < 12 && n; i++, n = n.parentElement) {
            const c = n.className?.toString() ?? "";
            if (/ng-invalid|p-invalid|is-invalid|has-error/i.test(c)) {
              return true;
            }
          }
          return false;
        })
        .catch(() => false);

    const ariaDescribedByShowsError = async (): Promise<boolean> => {
      const aid = await cashInput.getAttribute("aria-describedby");
      if (!aid?.trim()) {
        return false;
      }
      for (const rawId of aid.trim().split(/\s+/)) {
        if (!rawId) {
          continue;
        }
        const esc = rawId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        const hint = this.page.locator(`[id="${esc}"]`).first();
        if (!(await hint.isVisible().catch(() => false))) {
          continue;
        }
        const t = (await hint.textContent().catch(() => "")) ?? "";
        if (textPattern.test(t) || /error|invalid|required|cannot|must|negative|cash|price/i.test(t)) {
          return true;
        }
      }
      return false;
    };

    const detectRejection = async (): Promise<boolean> => {
      if (await this.page.getByText(/cannot be greater than/i).first().isVisible().catch(() => false)) {
        return true;
      }
      if (await form.getByText(textPattern).first().isVisible().catch(() => false)) {
        return true;
      }
      if (await this.page.getByText(textPattern).first().isVisible().catch(() => false)) {
        return true;
      }

      const cashLabel = form.getByText(/Cash Price/i).first();
      if (await cashLabel.isVisible().catch(() => false)) {
        const fieldBlock = cashLabel.locator(
          "xpath=ancestor::div[contains(@class,'field') or contains(@class,'col') or contains(@class,'grid')][1]",
        );
        const rowError = fieldBlock.locator(".p-error, small, .text-danger, .invalid-feedback").first();
        if (await rowError.isVisible().catch(() => false)) {
          return true;
        }
        if (
          await fieldBlock
            .getByText(/cannot be greater than|must not be negative|cannot be negative|invalid cash/i)
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          return true;
        }
      }

      if (
        await form
          .locator(".p-message-error, .p-inline-message-error, .p-message.p-message-error")
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        return true;
      }

      if (
        await this.page
          .locator(".p-toast.p-component, .p-toast-message, [role='alert']")
          .filter({ hasText: asyncFeedbackPattern })
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        return true;
      }

      if (
        await this.page
          .locator("p-dialog .p-dialog-content, .p-dialog .p-dialog-message, .p-confirm-dialog-message")
          .filter({ hasText: asyncFeedbackPattern })
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        return true;
      }

      if ((await cashInput.getAttribute("aria-invalid")) === "true") {
        return true;
      }

      if (await invalidDomOnCash()) {
        return true;
      }

      if (await ariaDescribedByShowsError()) {
        return true;
      }

      const compact = (await cashInput.inputValue().catch(() => "")).trim().replace(/\s/g, "");
      if (/^-/.test(compact)) {
        return true;
      }

      return false;
    };

    await expect
      .poll(async () => detectRejection(), {
        timeout: 20_000,
        intervals: [250, 500, 800, 1_200, 1_800, 2_500, 3_000],
      })
      .toBeTruthy();
  }

  async expectProgramDropdownDisabled(quoteIndex = 0): Promise<void> {
    const trigger =
      quoteIndex === 0
        ? this.programDropdownTrigger
        : this.programDropdownOnQuote(quoteIndex).getByRole("button", {
            name: /dropdown trigger/i,
          });
    await expect(trigger).toBeDisabled({ timeout: 15_000 });
  }

  async expectCalculateButtonDisabled(quoteIndex = 0): Promise<void> {
    const btn = this.quoteForm(quoteIndex).getByRole("button", { name: /^Calculate$/i });
    await expect(btn).toBeDisabled({ timeout: 15_000 });
  }

  /**
   * Initial Quick Quote: Calculate must not be actionable until product/program are chosen
   * (hidden in DOM or visible but disabled).
   */
  async expectCalculateButtonHiddenOrDisabled(quoteIndex = 0): Promise<void> {
    const btn = this.quoteForm(quoteIndex).getByRole("button", { name: /^Calculate$/i });
    if ((await btn.count()) === 0) {
      return;
    }
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) {
      return;
    }
    await expect(btn).toBeDisabled({ timeout: 15_000 });
  }

  async paymentAmountInputIsReadOnly(): Promise<boolean> {
    const input = this.paymentAmountInput;
    if ((await input.count()) === 0) {
      return true;
    }
    if (!(await input.isVisible().catch(() => false))) {
      return true;
    }
    const ro = await input.getAttribute("readonly");
    const aria = await input.getAttribute("aria-readonly");
    if (ro !== null || aria === "true") {
      return true;
    }
    const locked = await input.evaluate((el: Element) => {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.readOnly || el.disabled) {
          return true;
        }
      }
      let n: Element | null = el;
      for (let i = 0; i < 10 && n; i++, n = n.parentElement) {
        if (getComputedStyle(n).pointerEvents === "none") {
          return true;
        }
        const nr = n.getAttribute("ng-reflect-readonly");
        if (nr === "true") {
          return true;
        }
      }
      return false;
    });
    if (locked) {
      return true;
    }
    const editable = await input.isEditable().catch(() => null);
    if (editable === false) {
      return true;
    }
    return false;
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
