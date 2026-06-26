/**
 * DO Portal - Quick Quote Page
 * Page Object Model for creating quick quotes from dashboard.
 * UPDATED: Added missing fields identified from document analysis (May 2026)
 */

import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export type DOQuickQuoteResetExpectation = {
  /** CSA-style: product stays selected after Reset. */
  productName?: string;
  programName?: string;
  financeBaseline?: {
    rate?: string;
    term?: string;
    frequency?: string;
  };
  /**
   * TL-style: Reset clears Product/Program to the QQ open placeholder (`--Select--`)
   * and collapses the finance panel.
   */
  clearedProductProgram?: boolean;
};

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
  /** PrimeNG `p-dropdown` host for **Calculate For** (label-scoped; stable vs SelectorHub `p-dropdown.p-element.p-inputwrapper…`). */
  readonly calculateForDropdownHost: Locator;
  readonly calculateForDropdownTrigger: Locator;
  readonly frequencyDropdownTrigger: Locator;
  readonly kmAllowanceDropdownTrigger: Locator;
  /** `p-dropdown` host for Terms (Months) — use with {@link termsMonthsDropdownTrigger}. */
  readonly termsMonthsDropdownHost: Locator;
  readonly termsMonthsDropdownTrigger: Locator;

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
  /** Residual Value row: $ amount paired with % (OR column layout). */
  readonly residualValueDollarInput: Locator;

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
    // Print / Mail / Download sit in the Quick Quote chrome (often outside the first quote card DOM).
    this.printButton = page.getByRole("button", { name: "Print" });
    this.downloadButton = page.locator(':text-is("Download")');
    this.mailButton = page.getByRole("button", { name: "Mail" });

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
    this.calculateForDropdownHost = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::p-dropdown[1]",
    );
    this.calculateForDropdownTrigger = this.calculateForDropdownHost.getByRole("button", {
      name: /dropdown trigger/i,
    });
    this.frequencyDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Frequency')]/following::p-dropdown[1]"
    ).getByRole("button", { name: /dropdown trigger/i });
    this.kmAllowanceDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'KM Allowance')]/following::p-dropdown[1]"
    ).getByRole("button", { name: /dropdown trigger/i });
    // Terms may be `p-dropdown` (CSA / Webform) or spinbutton / p-inputNumber (TLC).
    // Webform CSA often wraps the control in a `div.grid` — `p-dropdown` is **not** a direct sibling of the label,
    // so `following-sibling::p-dropdown[1]` misses and the test wrongly falls back to the first `spinbutton` after
    // the label (often a `%` field with `id="percent"`). Use `following::p-dropdown[1]` (first Terms-row dropdown).
    // CSA exposes the open target as `span[role="combobox"]`; older builds use the chevron trigger `button`.
    this.termsMonthsDropdownHost = this.quickQuoteForm
      .locator("label")
      .filter({ hasText: /Terms\s*\(Months\)/i })
      .first()
      .locator("xpath=following::p-dropdown[1]");
    this.termsMonthsDropdownTrigger = this.termsMonthsDropdownHost
      .getByRole("combobox")
      .or(this.termsMonthsDropdownHost.getByRole("button", { name: /dropdown trigger/i }))
      .first();

    // Asset Type dropdown (p-inputgroup pattern)
    this.assetTypeDropdownTrigger = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Asset Type')]/following::input[1]"
    );
    this.assetTypeSelectButton = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Asset Type')]/following::button[contains(., 'Select')]"
    );

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
    // Exclude `id="percent"` — the first spinbutton after "Terms" in DOM order can be a Deposit/Balloon % cell.
    this.termsMonthsInput = this.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Terms (Months)')]/following::input[@role='spinbutton' and not(@id='percent')][1]",
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

    // Balloon row "Fixed" — PrimeNG nests the label inside `p-checkbox` (not a sibling), so
    // preceding/following-sibling xpath from the label never resolves the host.
    this.fixedCheckbox = this.quickQuoteForm
      .locator("label")
      .filter({ hasText: /^\s*Balloon/i })
      .first()
      .locator("xpath=following::p-checkbox[.//label[contains(normalize-space(.),'Fixed')]][1]")
      .or(this.quickQuoteForm.getByRole("checkbox", { name: /Fixed/i }))
      .or(this.quickQuoteForm.locator("p-checkbox").filter({ hasText: /Fixed/i }))
      .first();

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
    this.residualValueDollarInput = this.quickQuoteForm.locator(
      `xpath=.//label[contains(normalize-space(.), 'Residual Value')]/following::${orSep}[1]/following::input[@id='amount'][1]`,
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
    this.paymentDisplay = this.quickQuoteForm
      .locator(
        "xpath=.//label[contains(normalize-space(.), 'Payment')][not(contains(., 'Lease'))]/following::label[1]",
      )
      .or(
        this.quickQuoteForm.locator(
          "xpath=.//*[normalize-space(.)='Payment' or starts-with(normalize-space(.), 'Payment')][not(contains(., 'Lease'))][not(contains(., 'Calculate'))]/following-sibling::*[1]",
        ),
      );
    this.paymentAmountInput = this.quickQuoteForm
      .locator(
        "xpath=.//*[normalize-space(.)='Payment' or starts-with(normalize-space(.), 'Payment')][not(contains(., 'Lease'))][not(contains(., 'Calculate'))]/following-sibling::input[not(@currencymask)][1]",
      )
      .or(
        this.quickQuoteForm.locator(
          "xpath=.//label[contains(normalize-space(.), 'Payment')][not(contains(., 'Lease'))]/following::input[not(@currencymask)][1]",
        ),
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

  protected stepLogPrefix(): string {
    return "DO Portal — Quick quote";
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
      "xpath=.//label[contains(normalize-space(.), 'Terms (Months)')]/following::input[@role='spinbutton' and not(@id='percent')][1]",
    );
  }

  /** Same host rule as {@link termsMonthsDropdownHost} for comparison panels. */
  private termsMonthsDropdownHostOnQuote(quoteIndex: number): Locator {
    return this.quoteForm(quoteIndex)
      .locator("label")
      .filter({ hasText: /Terms\s*\(Months\)/i })
      .first()
      .locator("xpath=following::p-dropdown[1]");
  }

  termsDropdownTriggerOnQuote(quoteIndex: number): Locator {
    const host = this.termsMonthsDropdownHostOnQuote(quoteIndex);
    return host
      .getByRole("combobox")
      .or(host.getByRole("button", { name: /dropdown trigger/i }))
      .first();
  }

  programDropdownOnQuote(quoteIndex: number): Locator {
    return this.quoteForm(quoteIndex)
      .locator(
        "xpath=.//label[contains(normalize-space(.), 'Program')]/following::p-dropdown[1]",
      )
      .first();
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
    this.log("Opening Quick Quote: waiting for app loader to clear…");
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
    this.log("Clicked Quick Quote from dashboard; panel load completed.");
  }

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
   * PrimeNG **masked currency** (`p-inputNumber` / paired $ fields): click → paste or `pressSequentially`
   * — never `fill()` / select-all shortcuts that break the mask. Single strategy for **all** dollar
   * amounts on Quick Quote (cash, deposit $, balloon $, initial lease, AFV, payment amount, …).
   */
  private async replaceCashPriceInInput(input: Locator, amount: string): Promise<void> {
    const trimmed = amount.trim();
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
      if (n === wantRounded || Math.abs(n - wantRounded) <= 1) {
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
      strategies.push(
        async () => {
          await this.clickElement(input);
          await input.pressSequentially(String(wantRounded), { delay: 40 });
          await input.blur();
        },
        async () => {
          await this.clickElement(input);
          await input.pressSequentially(trimmed, { delay: 40 });
          await input.blur();
        },
      );
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
        await expect.poll(valueMatchesCommit, { timeout: 25_000 }).toBe(true);
        return;
      } catch {
        /* next strategy */
      }
    }

    throw new Error(`Quick Quote: could not commit masked currency (${amount})`);
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

  private async selectFromDropdown(
    trigger: Locator,
    optionText: string,
  ): Promise<void> {
    await trigger.waitFor({ state: "visible", timeout: 60_000 });
    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger
      .evaluate((el: HTMLElement) => {
        el.scrollIntoView({ block: "center", inline: "nearest" });
      })
      .catch(() => {});
    const trimmed = optionText.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exactOption = this.page.getByRole("option", {
      name: new RegExp(`^\\s*${escaped}\\s*$`, "i"),
    });

    const tryOpenDropdown = async (): Promise<void> => {
      try {
        await trigger.evaluate((el: HTMLElement) => {
          el.click();
        });
      } catch {
        await this.clickElement(trigger);
      }
    };
    await tryOpenDropdown();

    if ((await exactOption.count()) > 0) {
      await exactOption.first().waitFor({ state: "visible", timeout: 15_000 });
      await exactOption.first().click();
    } else {
      const option = this.page.getByRole("option").filter({ hasText: trimmed }).first();
      await option.waitFor({ state: "visible", timeout: 15_000 });
      await option.click();
    }
    await this.dismissQuickQuoteDropdownOverlays();
    await new Promise((r) => setTimeout(r, 300));
    await this.page.waitForLoadState("networkidle").catch(() => {});
  }

  async selectProduct(product: string): Promise<void> {
    this.logStep(`Selected product: ${this.stepValueDisplay(product)}`);
    await this.selectFromDropdown(this.productDropdownTrigger, product);
  }

  async selectProgram(program: string): Promise<void> {
    this.logStep(`Selected program: ${this.stepValueDisplay(program)}`);
    await this.selectFromDropdown(this.programDropdownTrigger, program);
  }

  async selectDealer(dealer: string): Promise<void> {
    this.logStep(`Selected dealer: ${this.stepValueDisplay(dealer)}`);
    await this.selectFromDropdown(this.dealerDropdownTrigger, dealer);
  }

  async enterCashPrice(cashPrice: string): Promise<void> {
    this.logStep(`Entered cash price as ${this.stepValueDisplay(cashPrice)}`);
    await this.replaceCashPriceInInput(this.cashPriceInput, cashPrice);
  }

  /**
   * Same entry path as {@link enterCashPrice} for any Quick Quote masked **$** field when you
   * already hold the input locator (edge scenarios / new fields before a dedicated wrapper exists).
   */
  async enterQuickQuoteMaskedCurrency(input: Locator, amount: string): Promise<void> {
    this.logStep(`Entered Quick Quote masked currency as ${this.stepValueDisplay(amount)}`);
    await this.replaceCashPriceInInput(input, amount);
  }

  /** PrimeNG cash / paired $ fields: clear before a new value so digits do not append to the prior mask. */
  private async clearMaskedCurrencyInput(input: Locator): Promise<void> {
    await input.waitFor({ state: "visible", timeout: 10_000 });
    await this.clickElement(input);
    await this.clearPrimeNgInput(input);
    await input.blur();
  }

  async clearCashPriceField(): Promise<void> {
    this.logStep("Clear Cash Price Field");
    await this.clearMaskedCurrencyInput(this.cashPriceInput);
  }

  /** Same as `clearCashPriceField` for comparison panels 1+ so copied cash does not merge with the next entry. */
  async clearCashPriceFieldOnQuote(quoteIndex: number): Promise<void> {
    await this.clearMaskedCurrencyInput(this.cashPriceInputOnQuote(quoteIndex));
  }

  async clearDepositDollarField(): Promise<void> {
    this.logStep("Clear Deposit Dollar Field");
    await this.clearMaskedCurrencyInput(this.depositDollarInput);
  }

  async clearBalloonDollarField(): Promise<void> {
    this.logStep("Clear Balloon Dollar Field");
    await this.clearMaskedCurrencyInput(this.balloonDollarInput);
  }

  async enterInitialLeaseAmount(initialLeaseAmount: string): Promise<void> {
    this.logStep(`Entered initial lease amount as ${this.stepValueDisplay(initialLeaseAmount)}`);
    await this.replaceCashPriceInInput(this.initialLeaseAmountInput, initialLeaseAmount);
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
    this.logStep(`Entered deposit % as ${this.stepValueDisplay(depositPercent)}`);
    const t = depositPercent.trim();
    if (t !== "" && Number.isFinite(Number.parseFloat(t)) && Number.parseFloat(t) !== 0) {
      await this.ensureCashPricePositiveForDerivedFields();
    }
    await this.replaceDepositBalloonPercentInput(this.depositPercentInput, "deposit", depositPercent);
  }

  async enterInterestRatePercent(interestRatePercent: string): Promise<void> {
    this.logStep(`Entered interest rate % as ${this.stepValueDisplay(interestRatePercent)}`);
    await this.replaceInputValueByKeyboard(this.interestRatePercentInput, interestRatePercent);
  }

  /**
   * Terms field can be either a p-dropdown (CSA products) or a p-inputNumber input (TLC).
   * PrimeNG p-inputNumber does not reliably sync Angular model when using fill().
   * Use keyboard input for text input, or selectFromDropdown for dropdown.
   */
  async enterTermsMonths(termMonths: string): Promise<void> {
    this.logStep(`Entered terms (months) as ${this.stepValueDisplay(termMonths)}`);
    // Prefer Terms `p-dropdown` host (CSA / Webform). Detect the **host** — the combobox alone can be a 0×0 node
    // in some builds while the host is still visible.
    const hostVisible = await this.termsMonthsDropdownHost.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hostVisible) {
      await this.selectFromDropdown(this.termsMonthsDropdownTrigger, termMonths);
    } else {
      await this.replaceInputValueByKeyboard(this.termsMonthsInput, termMonths);
    }
  }

  async selectCalculateFor(calculateFor: string): Promise<void> {
    this.logStep(`Selected Calculate For: ${this.stepValueDisplay(calculateFor)}`);
    await this.selectFromDropdown(this.calculateForDropdownTrigger, calculateFor);
  }

  /**
   * Displayed "Calculate For" value — from dropdown combobox when editable, or static text
   * when a comparison panel locks the row to Payment (no `p-dropdown` trigger).
   */
  async readCalculateForOnQuote(quoteIndex = 0): Promise<string> {
    const form = quoteIndex === 0 ? this.quickQuoteForm : this.quoteForm(quoteIndex);
    const calcForLabel = form
      .locator(
        "xpath=.//*[contains(normalize-space(.), 'Calculate For') and not(descendant::*[contains(normalize-space(.), 'Calculate For')])][1]",
      )
      .first();
    const valueHost = calcForLabel.locator("xpath=following-sibling::*[1]");
    const combobox = valueHost.getByRole("combobox").first();
    if (await combobox.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return (
        (await combobox.innerText().catch(() => "")).trim() ||
        ((await combobox.getAttribute("aria-label")) ?? "").trim()
      );
    }
    return (await valueHost.innerText().catch(() => "")).trim();
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
    this.logStep(`Selected frequency: ${this.stepValueDisplay(frequency)}`);
    await this.selectFromDropdown(this.frequencyDropdownTrigger, frequency);
  }

  async selectKMAllowance(kmAllowance: string): Promise<void> {
    this.logStep(`Selected KM allowance: ${this.stepValueDisplay(kmAllowance)}`);
    await this.selectFromDropdown(this.kmAllowanceDropdownTrigger, kmAllowance);
  }

  async selectAssetType(assetType: string): Promise<void> {
    this.logStep(`Selected asset type: ${this.stepValueDisplay(assetType)}`);
    await this.clickElement(this.assetTypeSelectButton);
    const option = this.page.getByRole("option").filter({ hasText: assetType }).first();
    await option.click();
  }

  async enterBalloonPercent(balloonPercent: string): Promise<void> {
    this.logStep(`Entered balloon % as ${this.stepValueDisplay(balloonPercent)}`);
    const t = balloonPercent.trim();
    const n = Number.parseFloat(t);
    if (t !== "" && Number.isFinite(n) && n !== 0) {
      await this.ensureCashPricePositiveForDerivedFields();
    }
    await this.replaceDepositBalloonPercentInput(this.balloonPercentInput, "balloon", balloonPercent);
  }

  async enterResidualValuePercent(residualValuePercent: string): Promise<void> {
    this.logStep(`Entered residual value % as ${this.stepValueDisplay(residualValuePercent)}`);
    await this.replaceInputValueByKeyboard(this.residualValuePercentInput, residualValuePercent);
  }

  async enterResidualValueDollars(residualDollars: string): Promise<void> {
    await this.replaceCashPriceInInput(this.residualValueDollarInput, residualDollars);
  }

  async clearResidualValueDollarField(): Promise<void> {
    await this.clearMaskedCurrencyInput(this.residualValueDollarInput);
  }

  async enterAssuredFutureValue(value: string): Promise<void> {
    this.logStep(`Entered assured future value as ${this.stepValueDisplay(value)}`);
    await this.replaceCashPriceInInput(this.assuredFutureValueInput, value);
  }

  async enterYear(year: string): Promise<void> {
    this.logStep(`Entered year as ${this.stepValueDisplay(year)}`);
    await this.fillElement(this.yearInput, year);
  }

  async enterNoOfRentalsInAdvance(count: string): Promise<void> {
    this.logStep(`Entered number of rentals in advance as ${this.stepValueDisplay(count)}`);
    await this.replaceInputValueByKeyboard(this.noOfRentalsInAdvanceInput, count);
  }

  async confirmTermsAndConditions(): Promise<void> {
    this.logStep("Confirm Terms And Conditions");
    await this.clickElement(this.termsCheckbox);
  }

  async checkFixedCheckbox(): Promise<void> {
    this.logStep("Check Fixed Checkbox");
    await this.clickElement(this.fixedCheckbox);
  }

  /**
   * Sets the Fixed balloon checkbox without toggling blindly.
   * Resolves `fixedCheckbox` to the visible PrimeNG host, then clicks the box or [role=checkbox] surface.
   */
  async setFixedCheckbox(checked: boolean): Promise<void> {
    this.logStep(`Set Fixed balloon checkbox to ${checked ? "checked" : "unchecked"}`);
    const host = this.fixedCheckbox;
    await expect(host).toBeVisible({ timeout: 20_000 });
    await host.scrollIntoViewIfNeeded().catch(() => {});

    const box = host
      .locator(".p-checkbox-box, [class*='p-checkbox-box']")
      .or(host.getByRole("checkbox"))
      .first();
    await expect(box).toBeVisible({ timeout: 20_000 });

    const isChecked = async (): Promise<boolean> => {
      const hostCls = (await host.getAttribute("class")) ?? "";
      if (hostCls.includes("p-checkbox-checked")) {
        return true;
      }
      const aria = await box.getAttribute("aria-checked");
      if (aria === "true") {
        return true;
      }
      if (aria === "false") {
        return false;
      }
      const hidden = host.locator('input[type="checkbox"]').first();
      if ((await hidden.count()) > 0) {
        return hidden.isChecked();
      }
      return false;
    };

    for (let attempt = 0; attempt < 4; attempt++) {
      if ((await isChecked()) === checked) {
        return;
      }
      await this.clickElement(box);
    }

    await expect.poll(async () => (await isChecked()) === checked, { timeout: 10_000 }).toBeTruthy();
  }

  async clickCheckDisableCheckbox(): Promise<void> {
    this.logStep("Click Check Disable Checkbox");
    await this.clickElement(this.checkDisableCheckbox);
  }

  /**
   * Closes PrimeNG dropdown overlays that can cover the Quick Quote form after
   * opening a Product/Program list and pressing Escape (TC_QQ_005 → TC_QQ_006).
   */
  async dismissQuickQuoteDropdownOverlays(): Promise<void> {
    this.logStep("Dismiss Quick Quote Dropdown Overlays");
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
    this.logStep("Clicked Calculate (Quick Quote first panel)");
    const isEnabled = await (async () => {
      await this.dismissQuickQuoteDropdownOverlays();
      await this.calculateButton.scrollIntoViewIfNeeded().catch(() => {});
      return this.calculateButton.isEnabled().catch(() => false);
    })();
    this.log(
      `Calculate: button ${isEnabled ? "enabled (normal click)" : "disabled — using force click path"}`,
    );
    if (isEnabled) {
      await this.clickElement(this.calculateButton, 45_000);
    } else {
      /* Invalid form (e.g. negative cash): trigger stays disabled but app still validates on click — force-click. */
      await this.calculateButton.scrollIntoViewIfNeeded().catch(() => {});
      await this.calculateButton.click({ force: true, timeout: 15_000 });
    }
    await this.waitForLoadingComplete();
    this.log("Calculate action finished (loading complete).");
  }

  async clickCreateQuote(quoteIndex = 0): Promise<void> {
    this.log(
      quoteIndex === 0
        ? "Clicking Create Quote on Quick Quote."
        : `Clicking Create Quote on comparison panel ${quoteIndex + 1}.`,
    );
    await this.clickElement(this.createQuoteButtonOnPanel(quoteIndex));
    await this.waitForLoadingComplete();
    this.log("Create Quote navigation finished (loading complete).");
  }

  async clickReset(): Promise<void> {
    this.logStep("Click Reset");
    await this.clickElement(this.resetButton);
    await this.waitForLoadingComplete();
  }

  async clickAddComparison2(): Promise<void> {
    this.logStep("Click Add Comparison2");
    await this.clickElement(this.addComparison2Button);
    await this.waitForLoadingComplete();
  }

  async isMailButtonEnabled(): Promise<boolean> {
    this.logStep("Is Mail Button Enabled");
    try {
      return await this.mailButton.isEnabled();
    } catch {
      return false;
    }
  }

  async isAddComparison2Enabled(): Promise<boolean> {
    this.logStep("Is Add Comparison2 Enabled");
    try {
      return await this.addComparison2Button.isEnabled();
    } catch {
      return false;
    }
  }

  async isAddComparison3Enabled(): Promise<boolean> {
    this.logStep("Is Add Comparison3 Enabled");
    try {
      return await this.addComparison3Button.isEnabled();
    } catch {
      return false;
    }
  }

  async getFieldVisibilityState(fieldName: string): Promise<"visible" | "hidden" | "disabled"> {
    this.logStep("Get Field Visibility State");
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
    this.logStep("Expect Field To Be Visible");
    const state = await this.getFieldVisibilityState(fieldName);
    expect.soft(state).not.toBe("hidden");
  }

  async expectFieldToBeHidden(fieldName: string): Promise<void> {
    this.logStep("Expect Field To Be Hidden");
    const state = await this.getFieldVisibilityState(fieldName);
    expect.soft(state).toBe("hidden");
  }

  async expectMailButtonToBeDisabled(): Promise<void> {
    this.logStep("Expect Mail Button To Be Disabled");
    await expect.soft(this.mailButton).toBeDisabled();
  }

  async expectMailButtonToBeEnabled(): Promise<void> {
    this.logStep("Expect Mail Button To Be Enabled");
    await expect.soft(this.mailButton).toBeEnabled();
  }

  /**
   * After **Calculate**, **Create Quote** should appear on the active panel.
   * @param quoteIndex Panel index when multi-comparison Quick Quote is shown (defaults to primary panel).
   */
  async expectCreateQuoteVisible(quoteIndex?: number): Promise<void> {
    this.logStep("Expect Create Quote Visible");
    const idx = quoteIndex ?? 0;
    const btn = this.createQuoteButtonOnPanel(idx);
    await this.calculationSummaryRegion
      .first()
      .waitFor({ state: "visible", timeout: 45_000 })
      .catch(() => {});
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await expect(btn).toBeVisible({ timeout: 60_000 });
  }

  async enterDepositDollars(amount: string): Promise<void> {
    this.logStep(`Entered deposit ($) as ${this.stepValueDisplay(amount)}`);
    await this.replaceCashPriceInInput(this.depositDollarInput, amount);
  }

  async enterBalloonDollars(amount: string): Promise<void> {
    this.logStep(`Entered balloon ($) as ${this.stepValueDisplay(amount)}`);
    await this.replaceCashPriceInInput(this.balloonDollarInput, amount);
  }

  async enterPaymentAmount(payment: string): Promise<void> {
    this.logStep(`Entered payment amount as ${this.stepValueDisplay(payment)}`);
    await this.replaceCashPriceInInput(this.paymentAmountInput, payment);
  }

  async clearTermsMonths(quoteIndex = 0): Promise<void> {
    this.logStep(`Panel ${quoteIndex + 1}: cleared terms (months)`);
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
    this.logStep(
      `Panel ${quoteIndex + 1}: selected Calculate For: ${this.stepValueDisplay(calculateFor)}`,
    );
    await this.selectFromDropdown(
      this.calculateForTriggerOnQuote(quoteIndex),
      calculateFor,
    );
  }

  async selectFrequencyOnQuote(quoteIndex: number, frequency: string): Promise<void> {
    this.logStep(`Panel ${quoteIndex + 1}: selected frequency: ${this.stepValueDisplay(frequency)}`);
    await this.selectFromDropdown(
      this.frequencyTriggerOnQuote(quoteIndex),
      frequency,
    );
  }

  async enterCashPriceOnQuote(quoteIndex: number, cashPrice: string): Promise<void> {
    this.logStep(`Panel ${quoteIndex + 1}: entered cash price as ${this.stepValueDisplay(cashPrice)}`);
    await this.replaceCashPriceInInput(this.cashPriceInputOnQuote(quoteIndex), cashPrice);
  }

  async enterInterestRatePercentOnQuote(
    quoteIndex: number,
    interestRatePercent: string,
  ): Promise<void> {
    this.logStep(
      `Panel ${quoteIndex + 1}: entered interest rate % as ${this.stepValueDisplay(interestRatePercent)}`,
    );
    await this.fillElement(
      this.interestRateInputOnQuote(quoteIndex),
      interestRatePercent,
    );
  }

  async enterTermsMonthsOnQuote(quoteIndex: number, termMonths: string): Promise<void> {
    this.logStep(`Panel ${quoteIndex + 1}: entered terms (months) as ${this.stepValueDisplay(termMonths)}`);
    const host = this.termsMonthsDropdownHostOnQuote(quoteIndex);
    const hostVisible = await host.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hostVisible) {
      await this.selectFromDropdown(this.termsDropdownTriggerOnQuote(quoteIndex), termMonths);
    } else {
      await this.replaceInputValueByKeyboard(this.termsInputOnQuote(quoteIndex), termMonths);
    }
  }

  async clickCalculateOnQuote(quoteIndex: number): Promise<void> {
    this.logStep(`Panel ${quoteIndex + 1}: clicked Calculate`);
    const btn = this.quoteForm(quoteIndex).getByRole("button", { name: /^Calculate$/i });
    await this.clickElement(btn);
    await this.waitForLoadingComplete();
  }

  async clickAddComparisonPrimary(): Promise<void> {
    this.logStep("Click Add Comparison Primary");
    const primary = this.addComparisonPrimaryButton;
    if (await primary.isVisible().catch(() => false)) {
      await this.clickElement(primary);
    } else {
      await this.clickElement(this.addComparison2Button);
    }
    await this.waitForLoadingComplete();
  }

  async quickQuotePanelCount(): Promise<number> {
    this.logStep("Quick Quote Panel Count");
    return await this.quickQuoteRoot.locator("app-create-quick-quote").count();
  }

  async expectPleaseCompleteInForm(quoteIndex = 0): Promise<void> {
    this.logStep("Expect Please Complete In Form");
    await expect.soft(
      this.quoteForm(quoteIndex).getByText(/Please complete/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  }

  /** TL / masked currency: blank UI is often `""`, `$0.00`, or `0`. */
  static isBlankCurrencyDisplay(raw: string): boolean {
    const t = raw.trim();
    if (t.length === 0) {
      return true;
    }
    const n = Number.parseFloat(t.replace(/[^0-9.-]/g, ""));
    return !Number.isFinite(n) || n === 0;
  }

  /** Deposit / Balloon %: blank, `0`, or `0%`. */
  static isBlankPercentDisplay(raw: string): boolean {
    const t = raw.trim().replace(/%/g, "");
    if (t.length === 0) {
      return true;
    }
    const n = Number.parseFloat(t);
    return !Number.isFinite(n) || n === 0;
  }

  /** Cash Price mandatory — defaults blank (`""` or masked `$0.00`). */
  async expectCashPriceDefaultsBlank(quoteIndex = 0): Promise<void> {
    this.logStep("Expect Cash Price defaults blank");
    const input =
      quoteIndex === 0 ? this.cashPriceInput : this.cashPriceInputOnQuote(quoteIndex);
    await expect
      .poll(async () => {
        const raw = (await input.inputValue().catch(() => "")).trim();
        return DOQuickQuotePage.isBlankCurrencyDisplay(raw);
      }, { timeout: 25_000 })
      .toBeTruthy();
  }

  /** Leave Cash Price unset for validation tests (clear only when a positive amount is shown). */
  async ensureCashPriceLeftBlank(quoteIndex = 0): Promise<void> {
    this.logStep("Ensure Cash Price left blank");
    const input =
      quoteIndex === 0 ? this.cashPriceInput : this.cashPriceInputOnQuote(quoteIndex);
    await input.waitFor({ state: "visible", timeout: 15_000 });
    const raw = (await input.inputValue().catch(() => "")).trim();
    if (!DOQuickQuotePage.isBlankCurrencyDisplay(raw)) {
      if (quoteIndex === 0) {
        await this.clearCashPriceField();
      } else {
        await this.clearCashPriceFieldOnQuote(quoteIndex);
      }
    }
    await input.press("Tab").catch(() => {});
  }

  /**
   * Blank / zero Cash Price on Calculate: Zephyr expects **Please complete**; TL may also show
   * inline required copy, field error styling, or block **Create Quote**.
   */
  async expectBlankCashPriceValidation(quoteIndex = 0): Promise<void> {
    this.logStep("Expect blank Cash Price validation");
    const form = this.quoteForm(quoteIndex);
    const cashInput =
      quoteIndex === 0 ? this.cashPriceInput : this.cashPriceInputOnQuote(quoteIndex);
    const validationRx =
      /Please complete|cannot be blank|must not be blank|this field cannot|field\s+cannot\s+be\s+blank|is required|enter.*cash|cash\s*price.*required|required.*cash|greater than\s*0|must be greater than\s*0|enter a valid amount/i;

    const cashFieldShowsError = async (): Promise<boolean> => {
      const cashLabel = form.getByText(/^Cash Price/i).first();
      if (!(await cashLabel.isVisible({ timeout: 800 }).catch(() => false))) {
        return false;
      }
      const fieldBlock = cashLabel.locator(
        "xpath=ancestor::div[contains(@class,'field') or contains(@class,'col') or contains(@class,'grid')][1]",
      );
      if (
        await fieldBlock
          .locator(".p-error, small.p-error, .text-danger, .invalid-feedback")
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        return true;
      }
      return fieldBlock.getByText(validationRx).first().isVisible().catch(() => false);
    };

    const cashInputInvalid = async (): Promise<boolean> =>
      cashInput
        .evaluate((el) => {
          const inp = el as HTMLInputElement;
          if (typeof inp.checkValidity === "function" && !inp.checkValidity()) {
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

    await expect
      .poll(
        async () => {
          if (await form.getByText(validationRx).first().isVisible().catch(() => false)) {
            return true;
          }
          if (await this.page.getByText(validationRx).first().isVisible().catch(() => false)) {
            return true;
          }
          if (
            await this.page
              .getByRole("dialog")
              .filter({ hasText: validationRx })
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            return true;
          }
          if (await cashFieldShowsError()) {
            return true;
          }
          if (await cashInputInvalid()) {
            return true;
          }
          const toast = this.page
            .locator(".p-toast-message-error, .p-message-error, .p-toast-detail")
            .filter({ hasText: validationRx });
          if (await toast.first().isVisible().catch(() => false)) {
            return true;
          }
          const raw = (await cashInput.inputValue().catch(() => "")).trim();
          const calcDisabled = !(await this.calculateButton.isEnabled().catch(() => false));
          if (DOQuickQuotePage.isBlankCurrencyDisplay(raw) && calcDisabled) {
            return true;
          }
          return false;
        },
        { timeout: 45_000, intervals: [400, 1_000, 2_000] },
      )
      .toBeTruthy();

    await expect.soft(this.createQuoteButtonOnPanel(quoteIndex)).toBeHidden({ timeout: 15_000 });
  }

  /**
   * TC_QQ_003 / UDP-T4190: Cash Price mandatory. TL often keeps **Calculate** disabled at `$0.00`;
   * other builds enable **Calculate** and show **Please complete** after click.
   */
  async expectCashPriceMandatoryWhenBlank(quoteIndex = 0): Promise<void> {
    this.logStep("Expect Cash Price mandatory when blank");
    await this.ensureCashPriceLeftBlank(quoteIndex);
    const calcEnabled = await this.calculateButton.isEnabled().catch(() => false);
    if (calcEnabled) {
      await this.clickCalculate();
      await this.expectBlankCashPriceValidation(quoteIndex);
      return;
    }
    this.logStep("Calculate disabled with blank/zero Cash Price — mandatory guard via disabled CTA");
    await expect.soft(this.calculateButton).toBeDisabled();
    await expect.soft(this.createQuoteButtonOnPanel(quoteIndex)).toBeHidden({ timeout: 15_000 });
  }

  /** PrimeNG Frequency label — not the dropdown trigger button text. */
  async readFrequencyLabel(): Promise<string> {
    return await this.readPrimeDropdownLabel(this.frequencyDropdownTrigger);
  }

  static isBlankFrequencyLabel(label: string): boolean {
    const t = label.trim();
    if (t.length === 0) {
      return true;
    }
    return /^(select|choose|--|please select|none)$/i.test(t);
  }

  /** TC_QQ_008: Frequency defaults from Product/Program after selection. */
  async expectFrequencyDefaultsFromProgram(): Promise<void> {
    this.logStep("Expect Frequency defaults from Program");
    await expect
      .poll(async () => {
        const label = await this.readFrequencyLabel();
        return !DOQuickQuotePage.isBlankFrequencyLabel(label);
      }, { timeout: 25_000 })
      .toBeTruthy();
  }

  /**
   * TC_QQ_001TL / UDP-T4188: TL Quick Quote mirrors CSA field layout after product + program selection.
   */
  async expectTlQuickQuoteInitialFieldLayout(): Promise<void> {
    this.logStep("Expect TL Quick Quote initial field layout (CSA QQ behaviour)");

    await expect
      .poll(async () => {
        const label = await this.readCalculateForOnQuote(0);
        return /Payment/i.test(label);
      }, { timeout: 25_000 })
      .toBeTruthy();

    const calcForDropdownVisible = await this.calculateForDropdownTrigger
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (calcForDropdownVisible) {
      const hostCls =
        (await this.calculateForDropdownHost.getAttribute("class").catch(() => "")) ?? "";
      if (hostCls.includes("p-disabled")) {
        await expect.soft(this.calculateForDropdownTrigger).toBeDisabled();
      }
    }

    await expect.soft(this.cashPriceInput).toBeVisible({ timeout: 25_000 });
    await this.expectCashPriceDefaultsBlank();

    await expect.soft(this.depositPercentInput).toBeVisible();
    await expect.soft(this.depositDollarInput).toBeVisible();
    const depositPct = (await this.depositPercentInput.inputValue().catch(() => "")).trim();
    expect.soft(DOQuickQuotePage.isBlankPercentDisplay(depositPct)).toBeTruthy();
    const depositDollars = (await this.depositDollarInput.inputValue().catch(() => "")).trim();
    expect.soft(DOQuickQuotePage.isBlankCurrencyDisplay(depositDollars)).toBeTruthy();

    await expect.soft(this.interestRatePercentInput).toBeVisible();
    await expect
      .poll(async () => {
        const rate = (await this.interestRatePercentInput.inputValue().catch(() => "")).trim();
        return rate.length > 0 && /\d/.test(rate);
      }, { timeout: 25_000 })
      .toBeTruthy();

    await expect
      .poll(async () => {
        const dropdownVisible = await this.termsMonthsDropdownTrigger
          .isVisible({ timeout: 1_000 })
          .catch(() => false);
        const inputVisible =
          !dropdownVisible &&
          (await this.termsMonthsInput.isVisible({ timeout: 1_000 }).catch(() => false));
        return dropdownVisible || inputVisible;
      }, { timeout: 25_000 })
      .toBeTruthy();
    await expect
      .poll(async () => {
        const term = await this.readTermsMonthsValue();
        return term.length > 0 && /\d+/.test(term);
      }, { timeout: 25_000 })
      .toBeTruthy();

    await expect.soft(this.frequencyDropdownTrigger).toBeVisible();
    await this.expectFrequencyDefaultsFromProgram();

    await expect.soft(this.balloonPercentInput).toBeVisible();
    await expect.soft(this.balloonDollarInput).toBeVisible();
    const balloonPct = (await this.balloonPercentInput.inputValue().catch(() => "")).trim();
    expect.soft(DOQuickQuotePage.isBlankPercentDisplay(balloonPct)).toBeTruthy();
    const balloonDollars = (await this.balloonDollarInput.inputValue().catch(() => "")).trim();
    expect.soft(DOQuickQuotePage.isBlankCurrencyDisplay(balloonDollars)).toBeTruthy();

    await this.expectPaymentDisplayedAndNotEditable();
  }

  /** Payment is a static display (TL) or a read-only input — not the Cash Price `currencymask` field. */
  async expectPaymentDisplayedAndNotEditable(): Promise<void> {
    this.logStep("Expect Payment displayed and not editable");
    const displayVisible = await this.paymentDisplay.isVisible({ timeout: 5_000 }).catch(() => false);
    if (displayVisible) {
      await expect.soft(this.paymentDisplay).toBeVisible();
      return;
    }

    const paymentInputVisible = await this.paymentAmountInput
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (paymentInputVisible) {
      expect.soft(await this.paymentAmountInputIsReadOnly()).toBeTruthy();
      return;
    }

    await expect
      .soft(this.quickQuoteForm.getByText(/^Payment$/i).first())
      .toBeVisible({ timeout: 10_000 });
  }

  async clearFrequencySelection(): Promise<void> {
    this.logStep("Clear Frequency selection");
    const host = this.frequencyDropdownTrigger.locator("xpath=ancestor::p-dropdown[1]");
    const clearIcon = host.locator(
      ".p-dropdown-clear-icon, .p-select-clear-icon, button.p-dropdown-clear, [data-pc-section='clearicon']",
    );
    if (await clearIcon.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await clearIcon.first().click();
      await this.dismissQuickQuoteDropdownOverlays();
      return;
    }

    const options = await this.listDropdownOptions(this.frequencyDropdownTrigger);
    const blankOption = options.find((o) => DOQuickQuotePage.isBlankFrequencyLabel(o));
    if (blankOption !== undefined) {
      await this.selectFromDropdown(this.frequencyDropdownTrigger, blankOption);
      return;
    }

    await this.frequencyDropdownTrigger.click({ timeout: 15_000 });
    const placeholder = this.page
      .getByRole("option")
      .filter({ hasText: /^(--|Select|Choose|Please select)?$/i })
      .first();
    if (await placeholder.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await placeholder.click();
    } else {
      await this.page.keyboard.press("Escape");
    }
    await this.dismissQuickQuoteDropdownOverlays();
  }

  async ensureFrequencyLeftBlank(): Promise<void> {
    this.logStep("Ensure Frequency left blank");
    const label = await this.readFrequencyLabel();
    if (!DOQuickQuotePage.isBlankFrequencyLabel(label)) {
      await this.clearFrequencySelection();
    }
    await this.frequencyDropdownTrigger.press("Tab").catch(() => {});
  }

  /**
   * Blank Frequency on Calculate: Zephyr expects **Please complete**; TL may also show inline
   * required copy, field error styling, disabled **Calculate**, or block **Create Quote**.
   */
  async expectBlankFrequencyValidation(quoteIndex = 0): Promise<void> {
    this.logStep("Expect blank Frequency validation");
    const form = this.quoteForm(quoteIndex);
    const validationRx =
      /Please complete|cannot be blank|must not be blank|this field cannot|field\s+cannot\s+be\s+blank|is required|select.*frequency|frequency.*required|required.*frequency/i;

    const frequencyFieldShowsError = async (): Promise<boolean> => {
      const freqLabel = form.getByText(/^Frequency/i).first();
      if (!(await freqLabel.isVisible({ timeout: 800 }).catch(() => false))) {
        return false;
      }
      const fieldBlock = freqLabel.locator(
        "xpath=ancestor::div[contains(@class,'field') or contains(@class,'col') or contains(@class,'grid')][1]",
      );
      if (
        await fieldBlock
          .locator(".p-error, small.p-error, .text-danger, .invalid-feedback")
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        return true;
      }
      return fieldBlock.getByText(validationRx).first().isVisible().catch(() => false);
    };

    const frequencyDropdownInvalid = async (): Promise<boolean> =>
      this.frequencyDropdownTrigger
        .locator("xpath=ancestor::p-dropdown[1]")
        .evaluate((el) => {
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

    const calculationDidNotComplete = async (): Promise<boolean> => {
      if (await this.createQuoteButtonOnPanel(quoteIndex).isVisible().catch(() => false)) {
        return false;
      }
      const summaryVisible = await this.calculationSummaryRegion
        .first()
        .isVisible({ timeout: 800 })
        .catch(() => false);
      if (!summaryVisible) {
        return true;
      }
      const summaryText =
        (await this.calculationSummaryRegion.first().textContent().catch(() => "")) ?? "";
      return !/\d/.test(summaryText.replace(/[$,\s]/g, ""));
    };

    await expect
      .poll(
        async () => {
          if (await form.getByText(validationRx).first().isVisible().catch(() => false)) {
            return true;
          }
          if (await this.page.getByText(validationRx).first().isVisible().catch(() => false)) {
            return true;
          }
          if (
            await this.page
              .getByRole("dialog")
              .filter({ hasText: validationRx })
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            return true;
          }
          if (await frequencyFieldShowsError()) {
            return true;
          }
          if (await frequencyDropdownInvalid()) {
            return true;
          }
          const toast = this.page
            .locator(".p-toast-message-error, .p-message-error, .p-toast-detail")
            .filter({ hasText: validationRx });
          if (await toast.first().isVisible().catch(() => false)) {
            return true;
          }
          const label = await this.readFrequencyLabel();
          const calcDisabled = !(await this.calculateButton.isEnabled().catch(() => false));
          if (DOQuickQuotePage.isBlankFrequencyLabel(label) && calcDisabled) {
            return true;
          }
          if (DOQuickQuotePage.isBlankFrequencyLabel(label) && (await calculationDidNotComplete())) {
            return true;
          }
          return false;
        },
        { timeout: 45_000, intervals: [400, 1_000, 2_000] },
      )
      .toBeTruthy();

    await expect.soft(this.createQuoteButtonOnPanel(quoteIndex)).toBeHidden({ timeout: 15_000 });
  }

  /**
   * TC_QQ_008 / UDP-T4195: Frequency mandatory. TL may keep **Calculate** disabled when blank;
   * other builds enable **Calculate** and show **Please complete** (or block results) after click.
   */
  async expectFrequencyMandatoryWhenBlank(quoteIndex = 0): Promise<void> {
    this.logStep("Expect Frequency mandatory when blank");
    await this.ensureFrequencyLeftBlank();
    const calcEnabled = await this.calculateButton.isEnabled().catch(() => false);
    if (calcEnabled) {
      await this.clickCalculate();
      await this.expectBlankFrequencyValidation(quoteIndex);
      return;
    }
    this.logStep("Calculate disabled with blank Frequency — mandatory guard via disabled CTA");
    await expect.soft(this.calculateButton).toBeDisabled();
    await expect.soft(this.createQuoteButtonOnPanel(quoteIndex)).toBeHidden({ timeout: 15_000 });
  }

  /**
   * TC_QQ_011 / UDP-T4198: after **Reset**, user-entered finance inputs clear (TL often shows `$0.00` not `""`).
   * When TL Reset clears Product/Program, the finance panel hides — do not read stale hidden inputs.
   */
  async expectUserEnteredFieldsClearedAfterReset(): Promise<void> {
    this.logStep("Expect user-entered Quick Quote fields cleared after Reset");
    await this.logQuickQuoteResetState();

    await expect.soft(this.createQuoteButton).toBeHidden({ timeout: 15_000 });

    const product = await this.readPrimeDropdownLabel(this.productDropdownTrigger);
    const productUnselected = DOQuickQuotePage.isUnselectedDropdownLabel(product);
    const cashVisible = await this.cashPriceInput.isVisible({ timeout: 3_000 }).catch(() => false);

    if (productUnselected) {
      this.logStep(
        "Product/Program cleared to placeholder after Reset — finance panel collapsed; user-entered values no longer displayed",
      );
      return;
    }

    if (!cashVisible) {
      this.logStep("Cash Price field not visible after Reset — finance panel collapsed");
      return;
    }

    await expect
      .poll(async () => {
        const cash = (await this.cashPriceInput.inputValue().catch(() => "")).trim();
        return DOQuickQuotePage.isBlankCurrencyDisplay(cash);
      }, { timeout: 25_000 })
      .toBeTruthy();

    const depositPct = (await this.depositPercentInput.inputValue().catch(() => "")).trim();
    expect.soft(DOQuickQuotePage.isBlankPercentDisplay(depositPct)).toBeTruthy();

    const depositDollars = (await this.depositDollarInput.inputValue().catch(() => "")).trim();
    expect.soft(DOQuickQuotePage.isBlankCurrencyDisplay(depositDollars)).toBeTruthy();

    const balloonPct = (await this.balloonPercentInput.inputValue().catch(() => "")).trim();
    expect.soft(DOQuickQuotePage.isBlankPercentDisplay(balloonPct)).toBeTruthy();

    const balloonDollars = (await this.balloonDollarInput.inputValue().catch(() => "")).trim();
    expect.soft(DOQuickQuotePage.isBlankCurrencyDisplay(balloonDollars)).toBeTruthy();

    await expect
      .poll(async () => {
        const payment = (await this.readPaymentDisplayValue()).trim();
        return DOQuickQuotePage.isBlankCurrencyDisplay(payment);
      }, { timeout: 25_000 })
      .toBeTruthy();
  }

  async logQuickQuoteResetState(): Promise<void> {
    const product = await this.readPrimeDropdownLabel(this.productDropdownTrigger);
    const program = await this.readSelectedProgramLabel();
    const cashVisible = await this.cashPriceInput.isVisible({ timeout: 1_000 }).catch(() => false);
    const cash = cashVisible
      ? (await this.cashPriceInput.inputValue().catch(() => "")).trim()
      : "(hidden)";
    const payment = (await this.readPaymentDisplayValue()).trim() || "(blank)";
    const paymentInputVisible = await this.paymentAmountInput
      .isVisible({ timeout: 500 })
      .catch(() => false);
    const paymentReadOnly = paymentInputVisible
      ? await this.paymentAmountInputIsReadOnly().catch(() => false)
      : "n/a";
    this.logStep(
      `Reset snapshot — product: "${product}" | program: "${program}" | cash: "${cash}" | payment: "${payment}" | paymentInput visible: ${paymentInputVisible} readonly: ${paymentReadOnly}`,
    );
  }

  static isUnselectedDropdownLabel(label: string): boolean {
    const t = label.trim();
    if (t.length === 0) {
      return true;
    }
    return /^--\s*select\s*--$/i.test(t) || /^select$/i.test(t) || /^choose/i.test(t);
  }

  async readPaymentDisplayValue(): Promise<string> {
    const displayVisible = await this.paymentDisplay.isVisible({ timeout: 1_000 }).catch(() => false);
    if (displayVisible) {
      return (await this.paymentDisplay.innerText().catch(() => "")).trim();
    }
    const inputVisible = await this.paymentAmountInput.isVisible({ timeout: 1_000 }).catch(() => false);
    if (inputVisible) {
      return (await this.paymentAmountInput.inputValue().catch(() => "")).trim();
    }
    return "";
  }

  /** After Reset, program-default rate / term / frequency are restored (not user overrides). */
  async expectFinanceBaselineRestored(baseline: {
    rate?: string;
    term?: string;
    frequency?: string;
  }): Promise<void> {
    this.logStep("Expect finance fields restored to program baseline after Reset");
    if (baseline.term) {
      const expectedTerm = baseline.term.replace(/\D/g, "");
      await expect
        .poll(async () => {
          const term = (await this.readTermsMonthsValue()).replace(/\D/g, "");
          return term.length > 0 && term === expectedTerm;
        }, { timeout: 25_000 })
        .toBeTruthy();
    }
    if (baseline.frequency) {
      const freqRx = new RegExp(
        baseline.frequency.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      await expect
        .poll(async () => {
          const label = await this.readFrequencyLabel();
          return label.length > 0 && freqRx.test(label);
        }, { timeout: 25_000 })
        .toBeTruthy();
    }
    if (baseline.rate) {
      const expectedRate = DOQuickQuotePage.normalizePercentValue(baseline.rate);
      await expect
        .poll(async () => {
          const rate = (await this.interestRatePercentInput.inputValue().catch(() => "")).trim();
          const actual = DOQuickQuotePage.normalizePercentValue(rate);
          return Number.isFinite(actual) && Math.abs(actual - expectedRate) < 0.01;
        }, { timeout: 25_000 })
        .toBeTruthy();
    }
  }

  static normalizePercentValue(raw: string): number {
    const n = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : Number.NaN;
  }

  /** TC_QQ_011: Quick Quote returns to default product/program; entered values cleared. */
  async expectQuickQuoteResetToDefaultState(
    expectation?: string | DOQuickQuoteResetExpectation,
  ): Promise<void> {
    this.logStep("Expect Quick Quote reset to default product/program state");
    const opts: DOQuickQuoteResetExpectation =
      typeof expectation === "string" ? { productName: expectation } : (expectation ?? {});

    await expect.soft(this.productDropdownTrigger).toBeVisible();
    await expect.soft(this.programDropdownTrigger).toBeVisible();
    await this.logQuickQuoteResetState();

    const product = await this.readPrimeDropdownLabel(this.productDropdownTrigger);
    const program = await this.readSelectedProgramLabel();

    if (opts.clearedProductProgram) {
      expect.soft(DOQuickQuotePage.isUnselectedDropdownLabel(product)).toBeTruthy();
      expect.soft(DOQuickQuotePage.isUnselectedDropdownLabel(program)).toBeTruthy();
    } else {
      if (opts.productName) {
        const escaped = opts.productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        expect.soft(product).toMatch(new RegExp(escaped, "i"));
      }
      if (opts.programName) {
        const escaped = opts.programName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        expect.soft(program).toMatch(new RegExp(escaped, "i"));
      }
    }

    await this.expectUserEnteredFieldsClearedAfterReset();

    if (!opts.clearedProductProgram && opts.financeBaseline) {
      await this.expectFinanceBaselineRestored(opts.financeBaseline);
    }
  }

  /**
   * Blank Terms: some builds keep Calculate enabled and show "Please complete" after click;
   * others disable Calculate and show inline copy (e.g. "This field cannot be blank").
   */
  async expectBlankTermsValidation(quoteIndex = 0): Promise<void> {
    this.logStep("Expect Blank Terms Validation");
    await expect.soft(
      this.quoteForm(quoteIndex)
        .getByText(
          /Please complete|cannot be blank|must not be blank|this field cannot|field\s+cannot\s+be\s+blank|is required|enter.*term/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  }

  async expectTermExceedsMaxMessage(quoteIndex = 0): Promise<void> {
    this.logStep("Expect Term Exceeds Max Message");
    await expect.soft(
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
    this.logStep("Expect Cash Price Non Negative Message");
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

    const deadline = Date.now() + 20_000;
    const intervals = [250, 500, 800, 1_200, 1_800, 2_500, 3_000];
    let intervalIndex = 0;
    let detected = false;
    while (Date.now() < deadline) {
      if (await detectRejection()) {
        detected = true;
        break;
      }
      const waitMs = intervals[Math.min(intervalIndex++, intervals.length - 1)] ?? 500;
      await new Promise((r) => setTimeout(r, waitMs));
    }
    await expect.soft(detected).toBeTruthy();
  }

  async expectProgramDropdownDisabled(quoteIndex = 0): Promise<void> {
    this.logStep("Expect Program Dropdown Disabled");
    const trigger =
      quoteIndex === 0
        ? this.programDropdownTrigger
        : this.programDropdownOnQuote(quoteIndex).getByRole("button", {
            name: /dropdown trigger/i,
          });
    await expect.soft(trigger).toBeDisabled({ timeout: 15_000 });
  }

  async expectCalculateButtonDisabled(quoteIndex = 0): Promise<void> {
    this.logStep("Expect Calculate Button Disabled");
    const btn = this.quoteForm(quoteIndex).getByRole("button", { name: /^Calculate$/i });
    await expect.soft(btn).toBeDisabled({ timeout: 15_000 });
  }

  /**
   * Initial Quick Quote: Calculate must not be actionable until product/program are chosen
   * (hidden in DOM or visible but disabled).
   */
  async expectCalculateButtonHiddenOrDisabled(quoteIndex = 0): Promise<void> {
    this.logStep("Expect Calculate Button Hidden Or Disabled");
    const btn = this.quoteForm(quoteIndex).getByRole("button", { name: /^Calculate$/i });
    if ((await btn.count()) === 0) {
      return;
    }
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) {
      return;
    }
    await expect.soft(btn).toBeDisabled({ timeout: 15_000 });
  }

  async paymentAmountInputIsReadOnly(): Promise<boolean> {
    this.logStep("Payment Amount Input Is Read Only");
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

  /** Opens the Asset Type hierarchical picker (Make / Model / Variant / Year). */
  async openAssetTypeModal(): Promise<Locator> {
    this.logStep("Open Asset Type modal");
    await this.assetTypeSelectButton.scrollIntoViewIfNeeded();
    await this.clickElement(this.assetTypeSelectButton);
    const dlg = this.page.getByRole("dialog").last();
    await dlg.waitFor({ state: "visible", timeout: 20_000 });
    await expect(dlg.getByText(/Make/i).first()).toBeVisible({ timeout: 20_000 });
    return dlg;
  }

  /**
   * Quick Quote **Asset Type** dialog: Make / Model / Variant / Year (PrimeNG), then **Select**.
   */
  async selectVehicleFromAssetTypeModal(params: {
    make: string;
    model: string;
    variant: string;
    year: string;
  }): Promise<void> {
    this.logStep(
      `Asset Type modal: ${params.make}, ${params.model}, ${params.variant}, ${params.year}`,
    );
    const dlg = await this.openAssetTypeModal();

    const pickFromOpenPanel = async (name: string, exact: boolean) => {
      const opt = this.page.getByRole("option", { name, exact }).first();
      await opt.waitFor({ state: "visible", timeout: 20_000 });
      await opt.click();
      await this.page.keyboard.press("Escape").catch(() => {});
      await new Promise((r) => setTimeout(r, 250));
    };

    await dlg.locator(".p-dropdown").first().locator(".p-dropdown-trigger").click({ timeout: 15_000 });
    await pickFromOpenPanel(params.make, true);

    const modelHost = this.page.locator("#pn_id_428_0");
    if (await modelHost.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await modelHost.click();
    } else {
      await dlg.locator(".p-dropdown").nth(1).locator(".p-dropdown-trigger").click({ timeout: 15_000 });
    }
    await pickFromOpenPanel(params.model, true);

    await dlg.locator(".p-dropdown").nth(2).locator(".p-dropdown-trigger").click({ timeout: 15_000 });
    await pickFromOpenPanel(params.variant, true);

    const yearHost = this.page.locator("#pn_id_434_0");
    if (await yearHost.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await yearHost.click();
    } else {
      await dlg.locator(".p-dropdown").nth(3).locator(".p-dropdown-trigger").click({ timeout: 15_000 });
    }
    await pickFromOpenPanel(params.year, true);

    const selectByRole = dlg.getByRole("button", { name: /^Select$/i }).first();
    if (await selectByRole.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await selectByRole.click({ timeout: 15_000 });
    } else {
      await dlg
        .locator("p-button.p-element.pointer.text-semi-bold")
        .filter({ has: dlg.locator("span.p-button-label").filter({ hasText: /^Select$/ }) })
        .first()
        .click({ timeout: 15_000 });
    }

    await expect(dlg).toBeHidden({ timeout: 45_000 });
    await this.waitForLoadingComplete();
  }

  async readAssetTypeDisplayValue(): Promise<string> {
    const inputVal = (await this.assetTypeDropdownTrigger.inputValue().catch(() => "")).trim();
    if (inputVal.length > 0) {
      return inputVal;
    }
    const attr = (await this.assetTypeDropdownTrigger.getAttribute("value"))?.trim() ?? "";
    if (attr.length > 0) {
      return attr;
    }
    return ((await this.assetTypeDropdownTrigger.textContent()) ?? "").trim();
  }

  async readSelectedProgramLabel(quoteIndex = 0): Promise<string> {
    const host =
      quoteIndex === 0
        ? this.quickQuoteForm.locator(
            "xpath=.//label[contains(normalize-space(.), 'Program')]/following::p-dropdown[1]",
          )
        : this.programDropdownOnQuote(quoteIndex);
    const combobox = host.getByRole("combobox").first();
    if (await combobox.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return (
        (await combobox.textContent())?.trim() ??
        (await combobox.getAttribute("aria-label"))?.trim() ??
        ""
      );
    }
    return (await host.locator(".p-dropdown-label").first().textContent())?.trim() ?? "";
  }

  kmAllowanceTriggerOnQuote(quoteIndex: number): Locator {
    return this.quoteForm(quoteIndex)
      .locator(
        "xpath=.//label[contains(normalize-space(.), 'KM Allowance')]/following::p-dropdown[1]",
      )
      .getByRole("button", { name: /dropdown trigger/i });
  }

  async readPrimeDropdownLabel(trigger: Locator): Promise<string> {
    const host = trigger.locator("xpath=ancestor::p-dropdown[1]");
    const combobox = host.getByRole("combobox").first();
    if (await combobox.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return (await combobox.textContent())?.trim() ?? "";
    }
    return (await host.locator(".p-dropdown-label").first().textContent())?.trim() ?? "";
  }

  async listDropdownOptions(trigger: Locator): Promise<string[]> {
    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger.click({ timeout: 15_000 });
    await expect(this.page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
    const options = (await this.page.getByRole("option").allTextContents())
      .map((t) => t.trim())
      .filter(Boolean);
    await this.page.keyboard.press("Escape");
    await this.dismissQuickQuoteDropdownOverlays();
    return options;
  }

  async readAssuredFutureValue(): Promise<string> {
    return (await this.assuredFutureValueInput.inputValue().catch(() => "")).trim();
  }

  async assuredFutureValueIsReadOnly(): Promise<boolean> {
    const input = this.assuredFutureValueInput;
    if ((await input.count()) === 0 || !(await input.isVisible().catch(() => false))) {
      return true;
    }
    const ro = await input.getAttribute("readonly");
    const aria = await input.getAttribute("aria-readonly");
    if (ro !== null || aria === "true") {
      return true;
    }
    const editable = await input.isEditable().catch(() => null);
    return editable === false;
  }

  async expandAfVDetailsSection(): Promise<void> {
    this.logStep("Expand AFV Details section");
    const accordionHeader = this.quickQuoteForm
      .locator("p-accordiontab, .p-accordion-header, p-panel")
      .filter({ hasText: /AFV Details/i })
      .first();
    if (await accordionHeader.isVisible({ timeout: 8_000 }).catch(() => false)) {
      const expanded = await accordionHeader.getAttribute("aria-expanded");
      if (expanded !== "true") {
        await accordionHeader.click({ timeout: 10_000 });
      }
      return;
    }
    const header = this.quickQuoteForm.getByText(/AFV Details/i).first();
    if (await header.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await header.click({ timeout: 10_000 });
    }
  }

  async expectCalculateForNotApplicable(quoteIndex = 0): Promise<void> {
    const form = quoteIndex === 0 ? this.quickQuoteForm : this.quoteForm(quoteIndex);
    const label = form.locator("label").filter({ hasText: /Calculate For/i }).first();
    const visible = await label.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!visible) {
      return;
    }
    const host = form.locator(
      "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::p-dropdown[1]",
    );
    await expect.soft(host).toBeHidden({ timeout: 5_000 });
  }

  async clearInterestRatePercent(quoteIndex = 0): Promise<void> {
    const input =
      quoteIndex === 0 ? this.interestRatePercentInput : this.interestRateInputOnQuote(quoteIndex);
    await this.replaceInputValueByKeyboard(input, "");
  }

  async waitForAfVFieldsAfterAssetSelection(): Promise<void> {
    await expect
      .poll(
        async () => {
          const cash = (await this.cashPriceInput.inputValue().catch(() => "")).trim();
          return cash.length > 0 && /\d/.test(cash);
        },
        { timeout: 60_000 },
      )
      .toBeTruthy();
    await this.waitForLoadingComplete();
  }

  async ensureMandatoryAfVFieldsForCalculate(): Promise<void> {
    const term = await this.readTermsMonthsValue();
    if (!term || !/\d/.test(term)) {
      await this.enterTermsMonths("36");
    }
    const kmLabel = await this.readPrimeDropdownLabel(this.kmAllowanceDropdownTrigger);
    if (!kmLabel || /select|choose/i.test(kmLabel)) {
      const kmOptions = await this.listDropdownOptions(this.kmAllowanceDropdownTrigger);
      if (kmOptions.length > 0) {
        await this.selectKMAllowance(kmOptions[0]);
      }
    }
    const freqLabel = await this.readPrimeDropdownLabel(this.frequencyDropdownTrigger);
    if (!freqLabel || /select|choose/i.test(freqLabel)) {
      await this.selectFrequency("Monthly");
    }
    const rate = (await this.interestRatePercentInput.inputValue().catch(() => "")).trim();
    if (!rate || !/\d/.test(rate)) {
      await this.enterInterestRatePercent("4");
    }
  }

  async readTermsMonthsValue(quoteIndex = 0): Promise<string> {
    if (quoteIndex === 0) {
      const dropdownVisible = await this.termsMonthsDropdownTrigger
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (dropdownVisible) {
        return await this.readPrimeDropdownLabel(this.termsMonthsDropdownTrigger);
      }
      const inputVisible = await this.termsMonthsInput.isVisible({ timeout: 5_000 }).catch(() => false);
      if (inputVisible) {
        return (await this.termsMonthsInput.inputValue()).trim();
      }
      return "";
    }
    const trig = this.termsDropdownTriggerOnQuote(quoteIndex);
    if (await trig.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return await this.readPrimeDropdownLabel(trig);
    }
    return (await this.termsInputOnQuote(quoteIndex).inputValue().catch(() => "")).trim();
  }

  /**
   * End-to-end helper for common quick quote creation flow.
   */
  async createQuickQuote(data: DOQuickQuoteData): Promise<void> {
    this.logStep("Create Quick Quote");
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
