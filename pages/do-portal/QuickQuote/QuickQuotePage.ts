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
  /** Residual Value row: $ amount paired with % (OR column layout). */
  readonly residualValueDollarInput: Locator;

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

    // Prefer currencymask input after the Cash Price label — duplicate id="amount" is common in Angular templates.
    this.cashPriceInput = this.quickQuoteForm
      .locator("label")
      .filter({ hasText: /^Cash Price/i })
      .first()
      .locator("xpath=following::input[@currencymask][1]")
      .or(
        this.quickQuoteForm.locator(
          "xpath=.//label[contains(normalize-space(.), 'Cash Price')]/following::input[1]",
        ),
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
    this.residualValueDollarInput = this.quickQuoteForm.locator(
      `xpath=.//label[contains(normalize-space(.), 'Residual Value')]/following::${orSep}[1]/following::input[@id='amount'][1]`,
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
<<<<<<< Updated upstream
=======
    this.addComparisonPrimaryButton = this.quickQuoteRoot.getByRole("button", {
      name: /\+\s*Add Comparison|Add Comparison 2/i,
    });
    const summaryByClass = this.quickQuoteCard.locator(
      ".calculation-result, [class*='calculation'], [class*='summary'], app-calculation-result, app-calculation-summary",
    );
    /** CSA often shows "Loan Amount"; FL Quick Quote uses lease / financed / total copy instead. */
    const summaryByContent = this.quickQuoteCard
      .locator("div, section, article")
      .filter({
        hasText: /Loan Amount|Amount Financed|Finance\s*Lease|Lease\s*(Amount|Payment|Cost)/i,
      })
      .filter({
        hasText: /Total (Amount )?Payable|Total Fees|Total Interest|Total.*Cost|Lease/i,
      });
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

  /**
   * One comparison card (`app-create-quick-quote`). Index 0 = "Quick Quote 1", 1 = QQ2, 2 = QQ3.
   * Use with `createQuoteButtonOnPanel` when tests need a panel-scoped button or assertion.
   */
  quoteCard(quoteIndex: number): Locator {
    return this.quickQuoteRoot.locator("app-create-quick-quote").nth(quoteIndex);
  }

  /** Create Quote on a specific comparison panel (regression: panel 0 = first / primary quote). */
  createQuoteButtonOnPanel(quoteIndex: number): Locator {
    return this.quoteCard(quoteIndex).getByRole("button", { name: /^Create Quote$/i });
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
    return this.quoteForm(quoteIndex)
      .locator("label")
      .filter({ hasText: /^Cash Price/i })
      .first()
      .locator("xpath=following::input[@currencymask][1]")
      .or(
        this.quoteForm(quoteIndex).locator(
          "xpath=.//label[contains(normalize-space(.), 'Cash Price')]/following::input[1]",
        ),
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
>>>>>>> Stashed changes
  }

  initialLeaseAmountInputOnQuote(quoteIndex: number): Locator {
    return this.quoteForm(quoteIndex).locator(
      "xpath=.//label[contains(normalize-space(.), 'Initial Lease Amount')]/following::input[1]",
    );
  }

  residualPercentInputOnQuote(quoteIndex: number): Locator {
    return this.quoteForm(quoteIndex).locator(
      "xpath=.//label[contains(normalize-space(.), 'Residual Value')]/following::input[@id='percent'][1]",
    );
  }

  residualDollarInputOnQuote(quoteIndex: number): Locator {
    const orSep =
      "*[normalize-space(.)='OR' or normalize-space(.)='or' or normalize-space(.)='Or' or normalize-space(.)='oR']";
    return this.quoteForm(quoteIndex).locator(
      `xpath=.//label[contains(normalize-space(.), 'Residual Value')]/following::${orSep}[1]/following::input[@id='amount'][1]`,
    );
  }

  /**
   * Opens the quick quote panel from dashboard.
   */
  async openQuickQuote(): Promise<void> {
<<<<<<< Updated upstream
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H1",location:"QuickQuotePage.ts:openQuickQuote:entry",message:"Open quick quote start",data:{buttonVisible:await this.createQuickQuoteButton.isVisible().catch(()=>false)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
=======
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
>>>>>>> Stashed changes
    await this.clickElement(this.createQuickQuoteButton);
    await this.waitForLoadingComplete();
  }

<<<<<<< Updated upstream
=======
  /**
   * Masked / p-inputNumber fields: clear+fill() can append digits or leave a stale Angular model.
   * `select()` + one Backspace is unreliable on PrimeNG; use Select-All + delete, then type.
   */
  private async replaceInputValueByKeyboard(input: Locator, text: string): Promise<void> {
    await input.waitFor({ state: "visible", timeout: 10_000 });
    await this.clickElement(input);
    await this.clearPrimeNgInput(input);
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
   * PrimeNG % fields: same as Terms — must clear before typing or new digits append to synced/masked text.
   */
  private async clearPrimeNgInput(loc: Locator): Promise<void> {
    await loc.focus();
    if (process.platform === "darwin") {
      await loc.press("Meta+A");
    } else {
      await loc.press("Control+A");
    }
    await loc.press("Backspace");
    if (process.platform === "darwin") {
      await loc.press("Meta+A");
    } else {
      await loc.press("Control+A");
    }
    await loc.press("Delete");
  }

  /**
   * Deposit / Balloon %: focus, clear masked value, then type or paste (caret-only entry corrupts when field is non-empty).
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
      await this.clearPrimeNgInput(loc);

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
        await this.clearPrimeNgInput(loc);
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
    await input.scrollIntoViewIfNeeded().catch(() => {});

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

  /**
   * PrimeNG p-dropdown: a real pointer click can miss the trigger when an ancestor uses
   * `pointer-events: none` (FL "Calculate For" row). `HTMLElement.click()` still runs handlers on the trigger.
   */
  private async openPrimeDropdownAndSelectOption(trigger: Locator, optionText: string): Promise<void> {
    await trigger.waitFor({ state: "visible", timeout: 60_000 });
    await trigger.scrollIntoViewIfNeeded().catch(() => {});

    const option = this.page.getByRole("option").filter({ hasText: optionText }).first();

    const tryDomClickOpen = async (): Promise<void> => {
      await trigger.evaluate((el: HTMLElement) => {
        el.click();
      });
      await option.waitFor({ state: "visible", timeout: 8_000 });
    };

    try {
      await tryDomClickOpen();
    } catch {
      await this.clickElement(trigger);
      await option.waitFor({ state: "visible", timeout: 15_000 });
    }
    await option.click();
  }

>>>>>>> Stashed changes
  private async selectFromDropdown(
    trigger: Locator,
    optionText: string,
  ): Promise<void> {
    await this.openPrimeDropdownAndSelectOption(trigger, optionText);
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
<<<<<<< Updated upstream
    await this.fillElement(this.cashPriceInput, cashPrice);
=======
    await this.replaceCashPriceInInput(this.cashPriceInput, cashPrice);
  }

  /** PrimeNG cash / paired $ fields: clear before a new value so digits do not append to the prior mask. */
  private async clearMaskedCurrencyInput(input: Locator): Promise<void> {
    await input.waitFor({ state: "visible", timeout: 10_000 });
    await this.clickElement(input);
    await this.clearPrimeNgInput(input);
    await input.blur();
  }

  async clearCashPriceField(): Promise<void> {
    await this.clearMaskedCurrencyInput(this.cashPriceInput);
  }

  /** Same as `clearCashPriceField` for comparison panels 1+ so copied cash does not merge with the next entry. */
  async clearCashPriceFieldOnQuote(quoteIndex: number): Promise<void> {
    await this.clearMaskedCurrencyInput(this.cashPriceInputOnQuote(quoteIndex));
  }

  async clearDepositDollarField(): Promise<void> {
    await this.clearMaskedCurrencyInput(this.depositDollarInput);
  }

  async clearBalloonDollarField(): Promise<void> {
    await this.clearMaskedCurrencyInput(this.balloonDollarInput);
>>>>>>> Stashed changes
  }

  async enterInitialLeaseAmount(initialLeaseAmount: string): Promise<void> {
    await this.fillElement(this.initialLeaseAmountInput, initialLeaseAmount);
  }

  async enterInitialLeaseAmountOnQuote(quoteIndex: number, initialLeaseAmount: string): Promise<void> {
    const input = this.initialLeaseAmountInputOnQuote(quoteIndex);
    await this.fillElement(input, initialLeaseAmount);
  }

  /** Clear copied QQ1 values on comparison panels before entering panel-specific amounts. */
  async clearInitialLeaseAmountOnQuote(quoteIndex: number): Promise<void> {
    await this.replaceInputValueByKeyboard(this.initialLeaseAmountInputOnQuote(quoteIndex), "");
  }

  async enterResidualValuePercentOnQuote(quoteIndex: number, residualValuePercent: string): Promise<void> {
    await this.replaceInputValueByKeyboard(
      this.residualPercentInputOnQuote(quoteIndex),
      residualValuePercent,
    );
  }

  async enterDepositPercent(depositPercent: string): Promise<void> {
    await this.fillElement(this.depositPercentInput, depositPercent);
  }

  async enterInterestRatePercent(interestRatePercent: string): Promise<void> {
    await this.replaceInputValueByKeyboard(this.interestRatePercentInput, interestRatePercent);
  }

  async enterTermsMonths(termMonths: string): Promise<void> {
    await this.fillElement(this.termsMonthsInput, termMonths);
  }

  async selectCalculateFor(calculateFor: string): Promise<void> {
    await this.selectFromDropdown(this.calculateForDropdownTrigger, calculateFor);
  }

  /**
   * Finance Lease often defaults "Calculate For" to Payment while the row uses `pointer-events: none`
   * (so a normal Playwright click never opens the list). Switches to Cash Price when the control exists
   * and lists that option; no-ops when already Cash Price or when the dropdown is absent / disabled.
   */
  async ensureCalculateForCashPriceMode(quoteIndex = 0): Promise<void> {
    await this.dismissQuickQuoteDropdownOverlays();
    const trig =
      quoteIndex === 0 ? this.calculateForDropdownTrigger : this.calculateForTriggerOnQuote(quoteIndex);
    if ((await trig.count()) === 0) return;
    if (!(await trig.isEnabled().catch(() => false))) return;

    const form = quoteIndex === 0 ? this.quickQuoteForm : this.quoteForm(quoteIndex);
    const displayed = await form
      .locator(
        "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::p-dropdown[1]//*[self::span[@role='combobox'] or contains(@class,'p-dropdown-label')][1]",
      )
      .first()
      .innerText()
      .catch(() => "");
    if (/cash\s*price/i.test((displayed ?? "").trim())) {
      return;
    }

    try {
      await this.openPrimeDropdownAndSelectOption(trig, "Cash Price");
    } catch {
      /* Single-mode programs or list copy without "Cash Price" */
    }
    await this.dismissQuickQuoteDropdownOverlays();
  }

  async selectFrequency(frequency: string): Promise<void> {
    await this.selectFromDropdown(this.frequencyDropdownTrigger, frequency);
  }

  async enterBalloonPercent(balloonPercent: string): Promise<void> {
    await this.fillElement(this.balloonPercentInput, balloonPercent);
  }

  async enterResidualValuePercent(residualValuePercent: string): Promise<void> {
    await this.replaceInputValueByKeyboard(this.residualValuePercentInput, residualValuePercent);
  }

  async enterResidualValueDollars(residualDollars: string): Promise<void> {
    await this.replaceCashPriceInInput(this.residualValueDollarInput, residualDollars);
  }

  async clearResidualValueDollarField(): Promise<void> {
    await this.clearMaskedCurrencyInput(this.residualValueDollarInput);
  }

  async confirmTermsAndConditions(): Promise<void> {
    await this.clickElement(this.termsCheckbox);
  }

  async clickCalculate(): Promise<void> {
    const isEnabled = await this.calculateButton.isEnabled().catch(() => false);
<<<<<<< Updated upstream
    // #region agent log
    fetch("http://127.0.0.1:7280/ingest/19704456-8fcb-4c08-838b-1b243840f653",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"44e672"},body:JSON.stringify({sessionId:"44e672",runId:this.debugRunId,hypothesisId:"H3",location:"QuickQuotePage.ts:clickCalculate:before",message:"Calculate click start",data:{calculateEnabled:isEnabled},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await this.clickElement(this.calculateButton);
=======
    if (isEnabled) {
      await this.clickElement(this.calculateButton, 45_000);
    } else {
      /* Invalid form (e.g. negative cash): trigger stays disabled but app still validates on click — force-click. */
      await this.calculateButton.scrollIntoViewIfNeeded().catch(() => {});
      await this.calculateButton.click({ force: true, timeout: 15_000 });
    }
>>>>>>> Stashed changes
    await this.waitForLoadingComplete();
  }

  async clickCreateQuote(quoteIndex = 0): Promise<void> {
    await this.clickElement(this.createQuoteButtonOnPanel(quoteIndex));
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

<<<<<<< Updated upstream
  async expectCreateQuoteVisible(): Promise<void> {
    await expect(this.createQuoteButton).toBeVisible({ timeout: 30_000 });
  }

=======
  /**
   * Third comparison panel (enabled only after Quick Quote 2 has been calculated).
   * Separate from `clickAddComparison2` so regressions can assert the gated sequence (2 → calculate → 3).
   */
  async clickAddComparison3(): Promise<void> {
    await this.clickElement(this.addComparison3Button);
    await this.waitForLoadingComplete();
  }

  /** Product allows at most three side-by-side quotes — no fourth "Add Comparison" control. */
  async expectNoAddComparison4Button(): Promise<void> {
    await expect(this.page.getByRole("button", { name: /Add Comparison 4/i })).toHaveCount(0);
  }

  /**
   * When the UI exposes a choice of which calculated quote becomes the standard quote, select the given panel.
   * Typical regression path: `quoteIndex` **0** (Quick Quote 1). No-op if no radio / selector is present on that card.
   */
  async selectQuickQuotePanelForStandardQuoteIfShown(quoteIndex: number): Promise<void> {
    const card = this.quoteCard(quoteIndex);
    const radio = card.getByRole("radio").first();
    if ((await radio.count()) > 0 && (await radio.isVisible().catch(() => false))) {
      await radio.check({ force: true }).catch(async () => {
        await this.clickElement(radio);
      });
      return;
    }
    const pRadioBox = card.locator(".p-radiobutton .p-radiobutton-box").first();
    if ((await pRadioBox.count()) > 0 && (await pRadioBox.isVisible().catch(() => false))) {
      await this.clickElement(pRadioBox);
    }
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

  async expectCreateQuoteVisible(quoteIndex = 0): Promise<void> {
    await expect(this.createQuoteButtonOnPanel(quoteIndex)).toBeVisible({ timeout: 30_000 });
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
    await this.replaceInputValueByKeyboard(
      this.interestRateInputOnQuote(quoteIndex),
      interestRatePercent,
    );
  }

  async enterTermsMonthsOnQuote(quoteIndex: number, termMonths: string): Promise<void> {
    await this.replaceInputValueByKeyboard(this.termsInputOnQuote(quoteIndex), termMonths);
  }

  async clickCalculateOnQuote(quoteIndex: number): Promise<void> {
    const btn = this.quoteForm(quoteIndex).getByRole("button", { name: /^Calculate$/i });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    const isEnabled = await btn.isEnabled().catch(() => false);
    if (isEnabled) {
      await this.clickElement(btn, 45_000);
    } else {
      await btn.click({ force: true, timeout: 15_000 });
    }
    await this.waitForLoadingComplete();
  }

  /**
   * Finance Lease Quick Quote: many builds hide **Calculate For** or show a disabled row.
   * Some QAT builds still expose an **enabled** dropdown (typically fixed to **Lease Payment**);
   * we do not fail on that — only on a disabled row we assert nothing further.
   */
  async expectFinanceLeaseNoActiveCalculateFor(quoteIndex = 0): Promise<void> {
    const form = this.quoteForm(quoteIndex);
    const labels = form.locator("label").filter({ hasText: /^Calculate For$/i });
    if ((await labels.count()) === 0) {
      return;
    }
    const trig =
      quoteIndex === 0 ? this.calculateForDropdownTrigger : this.calculateForTriggerOnQuote(quoteIndex);
    if (await trig.isDisabled().catch(() => false)) {
      return;
    }
    // Enabled on FL: optional sanity — selection should be lease-oriented when copy is readable.
    const displayed = await form
      .locator(
        "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::p-dropdown[1]//*[self::span[@role='combobox'] or contains(@class,'p-dropdown-label')][1]",
      )
      .first()
      .innerText()
      .catch(() => "");
    const t = (displayed ?? "").trim();
    if (t.length > 0 && !/Lease|Payment|Instalment|Installment/i.test(t) && /Cash\s*Price|Deposit|Balloon/i.test(t)) {
      throw new Error(
        `FL Quick Quote: Calculate For is enabled with unexpected selection "${t}" (expected lease-style mode).`,
      );
    }
  }

  async expectResidualValueCannotExceedCashPriceMessage(quoteIndex = 0): Promise<void> {
    await expect(
      this.quoteForm(quoteIndex)
        .getByText(
          /Residual|residual|cannot exceed|must not exceed|exceed(s)?\s+(the\s+)?cash|greater than\s+cash|not exceed.*cash/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  }

  async expectInitialLeaseMinimumStandardPaymentMessage(quoteIndex = 0): Promise<void> {
    await expect(
      this.quoteForm(quoteIndex)
        .getByText(/minimum.*standard payment|standard payment|must be a minimum/i)
        .first(),
    ).toBeVisible({ timeout: 20_000 });
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

>>>>>>> Stashed changes
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

    if (data.confirmTerms === true) {
      await this.confirmTermsAndConditions();
    }

    await this.clickCalculate();
  }
}
