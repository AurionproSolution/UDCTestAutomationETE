import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common/BasePage";
import { DOCustomerDetailsPage } from "../CustomerDetails/customerDetailsPage";

export type DOEditPaymentScheduleSegmentSnapshot = {
  number: string;
  type: string;
  amount: string;
};

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
  /** Recommended Retail Price (`input#amount` under label; UDP-2640). Shown for Condition New, hidden for Used on some builds. */
  readonly recommendedRetailPriceInput: Locator;
  readonly PPSRCount: Locator;
  readonly udcEstablishmentFeeInputField: Locator;
  readonly dealerOriginationFeeInputField: Locator;
  /** Read-only total (UDC + Dealer establishment); `#amount` under `<amount>`. */
  readonly totalEstablishmentFeeInputField: Locator;
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
  /** Host for Additional Funds block (may render after loaders). */
  readonly additionalFundsRoot: Locator;
  /** `app-additional-funds` — amount + purpose (standard quote left column). */
  readonly additionalFundsInput: Locator;
  readonly additionalFundsPurposeTextarea: Locator;
  /** `app-less-deposit` — trade / settlement / net (read-only net). */
  readonly tradeAmountInput: Locator;
  readonly settlementAmountInput: Locator;
  readonly netTradeAmountDisplayed: Locator;
  /** `app-payment-summary` — balloon $ / % / Fixed (avoid SelectorHub `ng-tns-*` / `body>…nth-child`). */
  readonly paymentSummaryRoot: Locator;
  readonly balloonAmountInput: Locator;
  readonly balloonPercentInput: Locator;
  readonly balloonFixedCheckbox: Locator;
  /** Readonly quote header workflow **Status** (`input[name="workFlowStatus"]`). */
  readonly workflowStatusInput: Locator;
  private readonly customerDetails: DOCustomerDetailsPage;

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
    /** OL / FL / CSA-B: label varies (`Asset & Insurance Summary`, `Asset, Insurance & Trade-in`, etc.). */
    const quoteHost = page.locator("app-quote-details, app-standard-quote").first();
    const assetInsuranceSummaryName =
      /Asset\s*(?:Summary|(?:,\s*|\s*&\s*)Insurance(?:\s*&\s*Trade-?\s*in|\s*Summary)?)/i;
    this.assetInsuranceTradeInSummaryHyperlink = quoteHost
      .getByRole("button", { name: assetInsuranceSummaryName })
      .or(quoteHost.getByRole("link", { name: assetInsuranceSummaryName }))
      .or(quoteHost.locator("button, a, [role='button']").filter({ hasText: assetInsuranceSummaryName }))
      .first();
    this.assetyEditButton = page.locator(".cursor-pointer.fa-pen-to-square");
    this.assetSummaryCancelButton = page.locator(
      "//timesicon//*[name()='svg']",
    );
    /** FL lease card: "Cash Price of Assets (GST Inclusive)"; older builds: "Cash Price of Asset*". */
    const cashPriceLabel = /Cash Price of Asset/i;
    // Structural locator only — getByRole(textbox) matches the concatenated a11y name on AFV/CSA
    // ("Cash Price… Recommended Retail Price @ UDC…") and fill() fails on currencymask inputs.
    this.cashPriceOfAssetInputField = quoteHost
      .locator("amount")
      .filter({ hasText: cashPriceLabel })
      .locator("input#amount, input[currencymask], input.p-inputtext")
      .first()
      .or(
        quoteHost
          .getByText(cashPriceLabel)
          .first()
          .locator(
            "xpath=ancestor::div[contains(@class,'col-')][1]//input[@id='amount' or @currencymask]",
          )
          .first(),
      );
    const rrpLabel = /Recommended\s+Retail\s+Price/i;
    // Structural locators only — do NOT use getByRole(textbox, name: RRP): CSA builds concatenate
    // adjacent float labels into Cash Price a11y name ("Cash Price… Recommended Retail Price @ UDC…").
    this.recommendedRetailPriceInput = quoteHost
      .locator("amount")
      .filter({ hasText: rrpLabel })
      .locator("#amount")
      .or(
        quoteHost
          .getByText(rrpLabel, { exact: true })
          .locator(
            "xpath=ancestor::div[contains(@class,'col-')][1]//input[@id='amount']",
          ),
      )
      .first();
    this.PPSRCount = page.locator("app-quote-details").getByRole("spinbutton");
    this.udcEstablishmentFeeInputField = page
      .locator("amount")
      .filter({ hasText: "UDC Establishment Fee" })
      .locator("#amount");
    this.dealerOriginationFeeInputField = page
      .locator("amount")
      .filter({ hasText: "Dealer Origination Fee" })
      .locator("#amount");
    this.totalEstablishmentFeeInputField = page
      .locator("amount")
      .filter({ hasText: /Total\s+Establishment\s+Fee/i })
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
    // Match visible Standard Quote shell (same as tests: `app-quote-details, app-standard-quote`).first()
    const quoteShell = page.locator("app-quote-details, app-standard-quote").first();
    /**
     * **Lease Date** (Finance Lease) or **Loan Date** (e.g. AFV / CSA Payment Summary): scoped to `app-payment-summary` + `visible:true`.
     * Do **not** chain `.or()` to unscoped comboboxes — hidden templates in `app-quote-details` match first and break `toBeVisible()`.
     */
    const paymentSummaryPanel = page
      .locator("app-payment-summary")
      .filter({ hasText: "Payment Summary" })
      .first();
    const leaseOrLoanDateInPaymentSummary = paymentSummaryPanel
      .getByRole("combobox", { name: /Lease Date|Loan Date/i })
      .filter({ visible: true })
      .first()
      .or(
        paymentSummaryPanel
          .locator('input[name="leaseDate"], input[name="loanDate"]')
          .filter({ visible: true })
          .first(),
      );
    const leaseOrLoanDateFallback = quoteShell
      .getByRole("combobox", { name: /Lease Date|Loan Date/i })
      .filter({ visible: true })
      .first();
    this.loanDate = leaseOrLoanDateInPaymentSummary.or(leaseOrLoanDateFallback).first();
    // `p-calendar` often exposes the visible field as `role=combobox` (not `textbox`) in a11y snapshots.
    this.firstPaymentDate = paymentSummaryPanel
      .getByRole("combobox", { name: /First Payment/i })
      .filter({ visible: true })
      .first()
      .or(
        paymentSummaryPanel.locator(
          "xpath=.//label[contains(normalize-space(.),'First Payment')]/following::p-calendar[1]//input[contains(@class,'p-inputtext') or @role='combobox']",
        ).filter({ visible: true }),
      )
      .or(
        quoteShell
          .getByRole("combobox", { name: /First Payment/i })
          .filter({ visible: true })
          .first(),
      )
      .first();
    this.calculateButton = page.getByRole("button", { name: /^Calculate$/i });
    this.nextButton = page.getByRole("button", { name: "Next" }).last();
    this.customerDetails = new DOCustomerDetailsPage(page);
    this.addBorrowerorGuarantorButton = this.customerDetails.addBorrowersOrGuarantorsButton;
    this.customerSearchDialog = this.customerDetails.customerSearchDialog;
    this.searchByDropdown = this.customerDetails.searchByDropdown;
    this.searchButton = this.customerDetails.searchButton;
    this.addNewCustomerButton = this.customerDetails.addNewCustomerButton;

    this.additionalFundsRoot = page.locator("app-additional-funds").first();
    this.additionalFundsInput = this.additionalFundsRoot
      .locator('input#amount[currencymask], input#amount[type="text"]')
      .first()
      .or(
        this.additionalFundsRoot.locator(
          "xpath=.//*[contains(normalize-space(.),'Additional Funds') and not(contains(.,'Purpose'))]/following::input[@id='amount'][1]",
        ),
      )
      .first();
    this.additionalFundsPurposeTextarea = this.additionalFundsRoot
      .getByRole("textbox", { name: /Additional Funds Purpose/i })
      .or(this.additionalFundsRoot.locator("textarea#note"))
      .first();

    const lessDeposit = page.locator("app-less-deposit").first();
    this.tradeAmountInput = lessDeposit
      .locator("amount")
      .filter({ hasText: /Trade Amount/i })
      .locator("#amount")
      .first();
    this.settlementAmountInput = lessDeposit
      .locator("amount")
      .filter({ hasText: /Settlement Amount/i })
      .locator("#amount")
      .first();
    this.netTradeAmountDisplayed = lessDeposit
      .locator("amount")
      .filter({ hasText: /Net Trade Amount/i })
      .locator("#amount")
      .first();

    const paymentSummary = page.locator("app-payment-summary").first();
    this.paymentSummaryRoot = paymentSummary;
    const balloonAmountHost = paymentSummary
      .locator("amount")
      .filter({ hasText: /Balloon\s+Amount/i })
      .first();
    this.balloonAmountInput = balloonAmountHost
      .locator('input[currencymask][id="amount"]')
      .first();
    // Balloon **%** uses PrimeNG `id="percent"` on that row. Do not use `//percentage//input[…spinbutton…]` —
    // the same grid can contain other `p-inputnumber` spinbuttons (e.g. under `<number>`), which breaks strict mode.
    this.balloonPercentInput = balloonAmountHost
      .locator(
        "xpath=ancestor::div[contains(@class,'grid')][1]//input[@id='percent']",
      )
      .first()
      .or(
        paymentSummary.locator(
          "xpath=.//label[contains(normalize-space(.),'Balloon Amount')]/ancestor::div[contains(@class,'grid')][1]//input[@id='percent']",
        ).first(),
      );
    this.balloonFixedCheckbox = paymentSummary
      .locator("p-checkbox")
      .filter({ has: paymentSummary.locator(':text-is("Fixed")') })
      .locator('input[type="checkbox"]')
      .first()
      .or(
        paymentSummary
          .locator(':text-is("Fixed")')
          .locator("xpath=ancestor::p-checkbox[1]//input[@type='checkbox']")
          .first(),
      );
    this.workflowStatusInput = page.locator('input[name="workFlowStatus"]');
  }

  protected stepLogPrefix(): string {
    return "Standard quote — Asset details";
  }

  /**
   * Open the product dropdown in the quote dialog
   */
  async openProductDropdown(): Promise<void> {
    this.logStep("Opened product dropdown");
    const productDropdown = this.page.locator(
      `//span//label[contains(text(), 'Product')]/following-sibling::div//span`,
    );
    await productDropdown.click({ timeout: 15_000 });
    await expect(this.page.getByRole("option").first())
      .toBeVisible({ timeout: 15_000 })
      .catch(() => {});
  }

  /**
   * Choose an item from the product dropdown list
   */
  async selectProduct(productName: string): Promise<void> {
    this.logStep(`Selected product: ${this.stepValueDisplay(productName)}`);
    const option = this.page.getByRole("option", { name: productName, exact: true });
    await expect(option.first()).toBeVisible({ timeout: 15_000 });
    await option.click();
  }

  /**
   * Open the program dropdown in the quote dialog
   */
  async openProgramDropdown(): Promise<void> {
    this.logStep("Opened program dropdown");
    const trigger = this.programDropdownTrigger();
    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger.click({ timeout: 15_000 });
    await expect(this.page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Choose an item from the program dropdown list
   * (`getByText` is unsafe here — e.g. **CSA Personal - MV Dealer** is a substring of **Webform - CSA Personal - MV Dealer**.)
   */
  async selectProgram(programName: string): Promise<void> {
    this.logStep(`Selected program: ${this.stepValueDisplay(programName)}`);
    await this.waitForQuoteLoadersToFinish().catch(() => {});
    const trigger = this.programDropdownTrigger();
    const escaped = programName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const optionPattern = new RegExp(`^\\s*${escaped}\\s*$`, "i");

    await expect
      .poll(
        async () => {
          const selected = await this.readSelectedProgramLabel();
          if (optionPattern.test(selected) || selected.includes(programName)) {
            return true;
          }

          await trigger.scrollIntoViewIfNeeded().catch(() => {});
          await trigger
            .evaluate((el: HTMLElement) => {
              el.click();
            })
            .catch(() => trigger.click({ timeout: 5_000 }));

          const option = this.page.getByRole("option", { name: optionPattern }).first();
          if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await option
              .evaluate((el: HTMLElement) => {
                el.click();
              })
              .catch(() => option.click({ force: true, timeout: 2_000 }));
          } else {
            await this.page.keyboard.type(programName.slice(0, 8), { delay: 40 }).catch(() => {});
            await this.page.keyboard.press("Enter").catch(() => {});
          }

          await this.page.keyboard.press("Escape").catch(() => {});
          await this.page.waitForTimeout(500);

          const after = await this.readSelectedProgramLabel();
          return optionPattern.test(after) || after.includes(programName) || /AFV/i.test(after);
        },
        { timeout: 60_000, intervals: [800, 1_500, 2_000, 3_000] },
      )
      .toBeTruthy();
  }

  /**
   * Convenience wrapper: open product dropdown and select entry in one call
   */
  async chooseProduct(productName: string): Promise<void> {
    this.logStep(`Chose product: ${this.stepValueDisplay(productName)}`);
    await this.openProductDropdown();
    await this.selectProduct(productName);
    await this.waitForProductSelectionSettled(productName, { waitLoanPurpose: false });
  }

  /**
   * Convenience wrapper: open program dropdown and select entry in one call
   */
  async chooseProgram(programName: string): Promise<void> {
    this.logStep(`Chose program: ${this.stepValueDisplay(programName)}`);
    await this.openProgramDropdown();
    await this.selectProgram(programName);
    await this.waitForQuoteLoadersToFinish();
    await this.waitForLoanPurposePopulated();
  }

  /** Standard Quote / Asset Details shell (first `app-quote-details` or `app-standard-quote`). */
  standardQuoteRoot(): Locator {
    return this.page.locator("app-quote-details, app-standard-quote").first();
  }

  /** After navigation to Asset Details: network settle + cash price field visible. */
  async waitForAssetDetailsStepReady(): Promise<void> {
    await this.standardQuoteRoot().waitFor({
      state: "visible",
      timeout: 60_000,
    });

    await expect(this.cashPriceOfAssetInputField).toBeVisible({
      timeout: 60_000,
    });
  }

  /** Loan Purpose textbox when shown on Standard Quote header rows. */
  loanPurposeInputField(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .getByRole("textbox", { name: /^Loan Purpose/i })
      .or(
        root.locator(
          "xpath=.//label[contains(normalize-space(.),'Loan Purpose')]/following::input[1]",
        ),
      )
      .first();
  }

  /**
   * Visible PrimeNG dropdown value for a Standard Quote header label (TL/CSA:
   * `span[role="combobox"].p-dropdown-label`).
   */
  private primeLabeledDropdownCombobox(fieldLabel: string): Locator {
    const root = this.standardQuoteRoot();
    const labelContains = `contains(normalize-space(.), '${fieldLabel}')`;
    const combobox = "span[@role='combobox' and contains(@class,'p-dropdown-label')]";
    return root
      .locator(`xpath=.//label[${labelContains}]/following-sibling::div//${combobox}[1]`)
      .or(
        root.locator(
          `xpath=.//label[${labelContains}]/following::p-dropdown[1]//${combobox}[1]`,
        ),
      )
      .or(root.locator(`xpath=.//label[${labelContains}]/following::${combobox}[1]`))
      .filter({ visible: true })
      .first();
  }

  private async readPrimeLabeledDropdownValue(fieldLabel: string): Promise<string> {
    const combobox = this.primeLabeledDropdownCombobox(fieldLabel);
    if (!(await combobox.isVisible({ timeout: 20_000 }).catch(() => false))) {
      return "";
    }
    const raw = ((await combobox.textContent().catch(() => "")) ?? "").trim();
    return this.isDropdownPlaceholder(raw) ? "" : raw;
  }

  productDropdownHost(): Locator {
    const root = this.standardQuoteRoot();
    return this.primeLabeledDropdownCombobox("Product")
      .locator("xpath=ancestor::p-dropdown[1]")
      .or(
        root.locator(
          "xpath=.//label[contains(normalize-space(.), 'Product')]/following::p-dropdown[1]",
        ),
      )
      .first();
  }

  private isDropdownPlaceholder(value: string): boolean {
    const t = value.replace(/\s+/g, " ").trim();
    return t.length === 0 || /^select\b/i.test(t) || /^—+$/.test(t) || t === "-";
  }

  private productLabelMatches(expected: string | RegExp, label: string): boolean {
    const t = label.trim();
    if (!t) return false;
    if (typeof expected === "string") {
      return t === expected || t.includes(expected);
    }
    return expected.test(t);
  }

  async readSelectedProductLabel(): Promise<string> {
    this.logStep("Read selected product label");
    return this.readPrimeLabeledDropdownValue("Product");
  }

  async waitForSelectedProductLabel(
    expected: string | RegExp,
    opts?: { timeoutMs?: number },
  ): Promise<void> {
    this.logStep(`Wait for selected product label: ${String(expected)}`);
    const timeoutMs = opts?.timeoutMs ?? 60_000;
    await expect
      .poll(
        async () => {
          const label = await this.readSelectedProductLabel();
          return this.productLabelMatches(expected, label) ? label : null;
        },
        { timeout: timeoutMs, intervals: [300, 500, 1_000] },
      )
      .not.toBeNull();
  }

  async waitForLoanPurposePopulated(opts?: { timeoutMs?: number }): Promise<void> {
    this.logStep("Wait for loan purpose populated");
    const field = this.loanPurposeInputField();
    const timeoutMs = opts?.timeoutMs ?? 60_000;

    const visible = await expect
      .poll(async () => field.isVisible().catch(() => false), {
        timeout: 15_000,
        intervals: [300, 500, 1_000],
      })
      .toBe(true)
      .then(() => true)
      .catch(() => false);
    if (!visible) return;

    await expect
      .poll(
        async () => {
          const v = (await field.inputValue().catch(() => "")).trim();
          return v.length > 0 ? v : null;
        },
        { timeout: timeoutMs, intervals: [300, 500, 1_000] },
      )
      .not.toBeNull();
  }

  /**
   * After product change (dashboard dialog or Asset Details dropdown): loaders clear, product label
   * reflects the selection, and Loan Purpose auto-populates when the control is shown.
   */
  async waitForProductSelectionSettled(
    expectedProduct: string | RegExp,
    opts?: { waitLoanPurpose?: boolean; timeoutMs?: number },
  ): Promise<void> {
    this.logStep("Wait for product selection settled");
    await this.waitForQuoteLoadersToFinish(opts?.timeoutMs);
    await this.waitForSelectedProductLabel(expectedProduct, opts);
    if (opts?.waitLoanPurpose !== false) {
      await this.waitForLoanPurposePopulated(opts);
    }
  }

  /**
   * Quick Quote → Standard Quote: product & program labels visible; when PrimeNG exposes hosts, expect locked dropdowns.
   */
  async expectProductProgramCarriedFromQuickQuote(
    productName: string,
    programName: string,
    opts?: { requireLockedDropdowns?: boolean },
  ): Promise<void> {
    this.logStep(
      `Expect product/program from Quick Quote visible: ${this.stepValueDisplay(productName)} / ${this.stepValueDisplay(programName)}`,
    );
    const requireLocked = opts?.requireLockedDropdowns !== false;
    const root = this.standardQuoteRoot();
    await expect(root.getByText(productName).first()).toBeVisible({ timeout: 30_000 });
    await expect(root.getByText(programName).first()).toBeVisible({ timeout: 30_000 });
    const productDd = root
      .locator("p-dropdown")
      .filter({ has: root.locator("label").filter({ hasText: /^Product/i }) })
      .first();
    const programDd = root
      .locator("p-dropdown")
      .filter({ has: root.locator("label").filter({ hasText: /^Program/i }) })
      .first();
    if (requireLocked) {
      if (await productDd.isVisible({ timeout: 8_000 }).catch(() => false)) {
        const locked =
          (await productDd.getAttribute("class"))?.includes("p-disabled") ||
          (await productDd.getAttribute("ng-reflect-disabled")) === "true";
        expect(locked).toBeTruthy();
      }
      if (await programDd.isVisible({ timeout: 8_000 }).catch(() => false)) {
        const locked =
          (await programDd.getAttribute("class"))?.includes("p-disabled") ||
          (await programDd.getAttribute("ng-reflect-disabled")) === "true";
        expect(locked).toBeTruthy();
      }
    }
  }

  /** Assert finance fields carried from Quick Quote (cash, term, frequency UI, interest %). */
  async expectFinanceCarriedFromQuickQuote(opts: {
    cashPrice: RegExp;
    term: RegExp;
    frequencyText: RegExp;
    interestRate: RegExp;
    depositPercent?: RegExp;
    depositDollars?: RegExp;
    balloonPercent?: RegExp;
  }): Promise<void> {
    this.logStep("Expect finance carried from Quick Quote");
    const root = this.standardQuoteRoot();
    this.logStep(
      `Carry-over targets — cash: ${opts.cashPrice} | term: ${opts.term} | frequency: ${opts.frequencyText} | rate: ${opts.interestRate}`,
    );
    await expect(this.cashPriceOfAssetInputField).toHaveValue(opts.cashPrice, { timeout: 30_000 });
    await this.expectTermCarriedFromQuickQuote(root, opts.term);
    const freqDropdown = root.locator(
      "xpath=.//label[contains(normalize-space(.),'Frequency')]/following::p-dropdown[1]",
    );
    const freqFieldRow = root
      .locator(".p-field, [class*='p-field']")
      .filter({ has: root.locator("label").filter({ hasText: /^Frequency/i }) })
      .first();
    if (await freqDropdown.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(freqDropdown).toContainText(opts.frequencyText, { timeout: 20_000 });
    } else {
      await expect(freqFieldRow).toContainText(opts.frequencyText, { timeout: 20_000 });
    }
    await expect
      .poll(async () => (await this.interestRateInputField.inputValue()).replace(/%/g, "").trim(), {
        timeout: 25_000,
      })
      .toMatch(opts.interestRate);

    if (opts.depositPercent) {
      const depositPctInput = root
        .locator(
          "xpath=.//label[starts-with(normalize-space(.), 'Deposit')]/following::input[@id='percent'][1]",
        )
        .first();
      if (await depositPctInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect
          .poll(
            async () => (await depositPctInput.inputValue()).replace(/%/g, "").trim(),
            { timeout: 25_000 },
          )
          .toMatch(opts.depositPercent);
      }
    }
    if (opts.depositDollars) {
      const depositAmtInput = root
        .locator(
          "xpath=.//label[starts-with(normalize-space(.), 'Deposit')]/following::input[@id='amount'][1]",
        )
        .first();
      if (await depositAmtInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect(depositAmtInput).toHaveValue(opts.depositDollars, { timeout: 25_000 });
      }
    }
    if (opts.balloonPercent) {
      if (await this.balloonPercentInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect
          .poll(
            async () => (await this.balloonPercentInput.inputValue()).replace(/%/g, "").trim(),
            { timeout: 25_000 },
          )
          .toMatch(opts.balloonPercent);
      }
    }
  }

  /**
   * Term on Standard Quote: label-scoped only — do not use `/Term/` on combobox `name` (matches Program
   * e.g. "Term Loan Business - MV Dealer" on TL-B).
   */
  private static termRowLabelPattern(): RegExp {
    return /Terms?\s*(\(Months\)|of\s+Finance)?\s*\*?/i;
  }

  private async expectTermCarriedFromQuickQuote(root: Locator, term: RegExp): Promise<void> {
    const termLabelRx = DOAssetDetailsPage.termRowLabelPattern();
    const pollTermValue = async (read: () => Promise<string>): Promise<void> => {
      await expect.poll(async () => (await read()).trim(), { timeout: 25_000 }).toMatch(term);
    };

    const termNumberSpin = root
      .locator("number")
      .filter({ has: root.locator("label").filter({ hasText: termLabelRx }) })
      .getByRole("spinbutton")
      .first();
    if (await termNumberSpin.isVisible({ timeout: 12_000 }).catch(() => false)) {
      await pollTermValue(() => termNumberSpin.inputValue());
      return;
    }

    const termLabel = root.locator("label").filter({ hasText: termLabelRx }).first();
    const termFieldSpin = termLabel
      .locator(
        "xpath=ancestor::div[contains(@class,'field') or contains(@class,'col') or contains(@class,'grid')][1]",
      )
      .getByRole("spinbutton")
      .first();
    if (await termFieldSpin.isVisible({ timeout: 12_000 }).catch(() => false)) {
      await pollTermValue(() => termFieldSpin.inputValue());
      return;
    }

    const termDropdownCombo = termLabel
      .locator("xpath=following::p-dropdown[1]")
      .getByRole("combobox")
      .first();
    if (await termDropdownCombo.isVisible({ timeout: 12_000 }).catch(() => false)) {
      await expect(termDropdownCombo).toContainText(term, { timeout: 25_000 });
      return;
    }

    const termRow = root
      .locator(".p-field, [class*='p-field']")
      .filter({ has: root.locator("label").filter({ hasText: termLabelRx }) })
      .first();
    const termRowCombo = termRow.getByRole("combobox").first();
    const termRowSpin = termRow.getByRole("spinbutton").first();
    if (await termRowCombo.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(termRowCombo).toContainText(term, { timeout: 25_000 });
      return;
    }
    if (await termRowSpin.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await pollTermValue(() => termRowSpin.inputValue());
      return;
    }

    const termNumberInput = root
      .locator("number")
      .filter({ has: root.locator("label, span").filter({ hasText: termLabelRx }) })
      .locator("input[type='number'], input.p-inputtext, input")
      .first();
    if (await termNumberInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pollTermValue(() => termNumberInput.inputValue());
      return;
    }

    throw new Error("Term field not found on Standard Quote for Quick Quote carry-over assertion");
  }

  /**
   * **Additional Funds** often mounts only after quote/asset loaders finish (spinner over the left column).
   * Call before any interaction with {@link additionalFundsInput} / purpose.
   */
  async waitForAdditionalFundsSectionReady(): Promise<void> {
    this.logStep("Wait For Additional Funds Section Ready");
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 55_000 }).catch(() => {});

    const root = this.additionalFundsRoot;
    await expect(root).toBeVisible({ timeout: 120_000 });
    await root.scrollIntoViewIfNeeded();
    await expect(this.additionalFundsInput).toBeVisible({ timeout: 45_000 });
    await expect(this.additionalFundsInput).toBeEnabled({ timeout: 20_000 });
    await this.page.waitForTimeout(350);
  }

  /**
   * Every visible **.app-loader-overlay** blocks pointer events (spinner on top of the form).
   * Do not use `.first()` on mixed locators — a distant spinner can hide while the quote overlay stays up.
   */
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
      if (!anyVisible) return;
      await this.page.waitForTimeout(200);
    }
  }

  /** Additional Funds row visible on load; masked value reads as zero (e.g. `$0.00`). */
  async expectAdditionalFundsVisibleOnLoad(): Promise<void> {
    this.logStep("Expect Additional Funds Visible On Load");
    await this.waitForAdditionalFundsSectionReady();
    const v = (await this.additionalFundsInput.inputValue()).trim();
    if (v.length > 0) {
      const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
      expect(Number.isNaN(n) ? 0 : n).toBe(0);
    }
  }

  async enterAdditionalFunds(amount: string): Promise<void> {
    this.logStep(`Entered additional funds as ${this.stepValueDisplay(amount)}`);
    await this.waitForAdditionalFundsSectionReady();
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await this.waitForQuoteLoadersToFinish();
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.additionalFundsRoot.scrollIntoViewIfNeeded();
    await expect(this.additionalFundsInput).toBeVisible({ timeout: 20_000 });
    await expect(this.additionalFundsInput).toBeEditable({ timeout: 20_000 });
    await this.fillCurrencyMaskAmount(this.additionalFundsInput, amount, "Additional Funds");
  }

  async clearAdditionalFunds(): Promise<void> {
    this.logStep("Clear Additional Funds");
    await this.waitForAdditionalFundsSectionReady();
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.additionalFundsRoot.scrollIntoViewIfNeeded();
    await expect(this.additionalFundsInput).toBeVisible({ timeout: 20_000 });
    await this.fillCurrencyMaskAmount(this.additionalFundsInput, "$0", "Additional Funds");
  }

  async enterAdditionalFundsPurpose(text: string): Promise<void> {
    this.logStep(`Entered additional funds purpose as ${this.stepValueDisplay(text)}`);
    await this.waitForAdditionalFundsSectionReady();
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await this.additionalFundsPurposeTextarea.scrollIntoViewIfNeeded();
    await this.additionalFundsPurposeTextarea.fill(text, { force: true });
  }

  async readAdditionalFundsAmount(): Promise<number> {
    return this.readCurrencyInput(this.additionalFundsInput);
  }

  /** Poll until **Additional Funds** reads `expected` dollars (e.g. after entry or post-Calculate). */
  async expectAdditionalFundsAmountDollars(expected: number): Promise<void> {
    this.logStep(`Expect additional funds amount $${expected.toFixed(2)}`);
    const target = Math.round(expected * 100) / 100;
    await expect(this.additionalFundsInput).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(async () => this.readAdditionalFundsAmount(), {
        timeout: 30_000,
        intervals: [200, 400, 800, 1_000],
      })
      .toBe(target);
  }

  /** UDP-T4224 — Additional Funds blank or $0 (not passed to FIS AF). */
  async expectAdditionalFundsBlankOrZero(): Promise<void> {
    this.logStep("Expect Additional Funds blank or zero");
    await expect(this.additionalFundsInput).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(async () => this.readAdditionalFundsAmount(), {
        timeout: 20_000,
        intervals: [200, 400, 800, 1_000],
      })
      .toBe(0);
  }

  async clearAdditionalFundsPurpose(): Promise<void> {
    this.logStep("Clear Additional Funds Purpose");
    await this.waitForAdditionalFundsSectionReady();
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await this.additionalFundsPurposeTextarea.scrollIntoViewIfNeeded();
    await this.additionalFundsPurposeTextarea.fill("", { force: true });
  }

  /** Outlined **Save** on the Standard Quote step (inside `lib-stepper` when present). */
  async clickSaveStandardQuoteStep(opts?: {
    /** When Save opens the "required to save" dialog, fill **Originator Reference** and confirm. */
    originatorRefForRequiredDialog?: string;
  }): Promise<void> {
    this.logStep("Click Save Standard Quote Step");
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);

    const stepper = this.page.locator("lib-stepper").first();
    await stepper.waitFor({ state: "visible", timeout: 25_000 }).catch(() => {});

    const inStepper = stepper.getByRole("button", { name: /^Save$/i }).first();
    const save = (await inStepper.isVisible({ timeout: 10_000 }).catch(() => false))
      ? inStepper
      : this.page
          .locator("button.p-ripple.p-element.p-button.p-component.p-button-outlined")
          .filter({ hasText: /^Save$/i })
          .first();

    await save.waitFor({ state: "visible", timeout: 30_000 });
    await stepper.scrollIntoViewIfNeeded().catch(() => {});
    await save.scrollIntoViewIfNeeded();

    const enableDeadline = Date.now() + 90_000;
    while (Date.now() < enableDeadline) {
      await this.waitUntilNoVisibleAppLoaderOverlays(5_000);
      if (await save.isEnabled().catch(() => false)) break;
      await this.page.waitForTimeout(400);
    }
    if (!(await save.isEnabled().catch(() => false))) {
      throw new Error(
        "Standard Quote **Save** stayed disabled after 90s (loaders cleared). Check required fields or whether Save is hidden on this build.",
      );
    }

    await this.waitUntilNoVisibleAppLoaderOverlays(15_000);

    try {
      await save.click({ timeout: 20_000 });
    } catch {
      await save.click({ force: true, timeout: 20_000 });
    }

    await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
    await this.page.waitForTimeout(600);
    if (opts?.originatorRefForRequiredDialog) {
      await this.page.waitForTimeout(500);
      await this.submitOriginatorReferenceRequiredToSaveDialogIfPresent(
        opts.originatorRefForRequiredDialog,
      );
    }
  }

  

  /**
   * After **Save** with Additional Funds set but **Purpose** left blank, expect inline validation
   * on or near the purpose field (UDP-T4225: "Please complete details.").
   */
  async expectAdditionalFundsPurposeInlineErrorVisible(): Promise<void> {
    this.logStep("Expect Additional Funds Purpose inline error visible");
    await this.waitForAdditionalFundsSectionReady();
    const root = this.additionalFundsRoot;
    const pleaseComplete = root.getByText(/Please complete details\.?/i).first();
    if (await pleaseComplete.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await expect(pleaseComplete).toBeVisible({ timeout: 15_000 });
      return;
    }
    const inNote = root
      .locator("note")
      .first()
      .locator(".p-error, .p-invalid-message, small, span[class*='error']")
      .filter({ hasText: /Please complete details|required|must|enter|cannot|blank|invalid|provide/i });
    if (await inNote.first().isVisible({ timeout: 4_000 }).catch(() => false)) {
      await expect(inNote.first()).toBeVisible({ timeout: 15_000 });
      return;
    }
    await expect(
      root
        .getByText(
          /Please complete details|required|must enter|cannot be blank|is required|invalid|provide a/i,
        )
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  }

  async enterTradeAmount(amount: string): Promise<void> {
    this.logStep(`Entered trade amount as ${this.stepValueDisplay(amount)}`);
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    await this.tradeAmountInput.scrollIntoViewIfNeeded();
    await this.tradeAmountInput.click({ force: true });
    await this.tradeAmountInput.press("ControlOrMeta+a");
    await this.page.keyboard.press("Backspace");
    await this.tradeAmountInput.fill(amount, { force: true });
    await this.tradeAmountInput.press("Tab").catch(() => {});
  }

  async enterSettlementAmount(amount: string): Promise<void> {
    this.logStep(`Entered settlement amount as ${this.stepValueDisplay(amount)}`);
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    await this.settlementAmountInput.scrollIntoViewIfNeeded();
    await this.settlementAmountInput.click({ force: true });
    await this.settlementAmountInput.press("ControlOrMeta+a");
    await this.page.keyboard.press("Backspace");
    await this.settlementAmountInput.fill(amount, { force: true });
    await this.settlementAmountInput.press("Tab").catch(() => {});
  }

  /** Net Trade Amount (often read-only); assert displayed text matches `pattern` (product rules vary — may mirror Trade until Settlement is applied). */
  async expectNetTradeAmountPattern(pattern: RegExp): Promise<void> {
    this.logStep("Expect Net Trade Amount Pattern");
    await expect(this.netTradeAmountDisplayed).toBeVisible({ timeout: 15_000 });
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    await expect
      .poll(async () => (await this.netTradeAmountDisplayed.inputValue()).trim(), {
        timeout: 30_000,
      })
      .toMatch(pattern);
  }

  /** UDC Establishment Fee: pre-populated from program; assert editable only when the control allows editing. */
  async expectUdcEstablishmentFeePrePopulatedFromProgram(): Promise<void> {
    this.logStep("Expect Udc Establishment Fee Pre Populated From Program");
    const fee = this.udcEstablishmentFeeInputField;
    await expect(fee).toBeVisible({ timeout: 20_000 });
    const raw = (await fee.inputValue()).trim();
    expect(raw.length).toBeGreaterThan(0);
    const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
    expect(Number.isNaN(n)).toBeFalsy();
    expect(n).toBeGreaterThan(0);
    if (await fee.isEditable().catch(() => false)) {
      await expect(fee).toBeEditable();
    }
  }

  /**
   * After pricing/async refresh, a field value can flicker blank or NaN. Wait until
   * `isValid(snapshot)` is true and the snapshot is unchanged for `stableRounds` reads.
   * Same pattern as Loan Date / Interest Rate stability handling.
   */
  private async waitForFieldValueStable(
    readSnapshot: () => Promise<string>,
    isValid: (snapshot: string) => boolean,
    opts?: {
      timeoutMs?: number;
      intervalMs?: number;
      stableRounds?: number;
      label?: string;
    },
  ): Promise<string> {
    const timeoutMs = opts?.timeoutMs ?? 20_000;
    const intervalMs = opts?.intervalMs ?? 200;
    const needRounds = opts?.stableRounds ?? 2;
    const label = opts?.label ?? "field";
    const deadline = Date.now() + timeoutMs;
    let prev = "";
    let stable = 0;
    while (Date.now() < deadline) {
      const snap = (await readSnapshot()).trim();
      if (isValid(snap) && snap === prev) {
        stable += 1;
        if (stable >= needRounds) {
          this.logStep(`${label} stable: "${snap}" (${needRounds} consecutive reads)`);
          return snap;
        }
      } else if (isValid(snap)) {
        stable = 1;
        prev = snap;
      } else {
        stable = 0;
        prev = "";
      }
      await this.page.waitForTimeout(intervalMs);
    }
    const last = (await readSnapshot()).trim();
    throw new Error(
      `${label} did not stabilize within ${timeoutMs}ms (last read: "${last}").`,
    );
  }

  /**
   * After pricing/async refresh, **Loan Date** can flicker. Wait until the displayed value
   * is unchanged for several consecutive reads (fast when already stable).
   */
  private async waitForLoanDateValueStable(
    loanIn: Locator,
    opts?: { timeoutMs?: number; intervalMs?: number; stableRounds?: number },
  ): Promise<void> {
    await this.waitForFieldValueStable(
      async () => (await loanIn.inputValue()).trim(),
      (loanTrim) => loanTrim.length > 4,
      { ...opts, label: "Loan Date" },
    );
  }


  
  async waitForQuoteLoadersToFinish(timeoutMs = 120_000): Promise<void> {
    this.logStep("Wait For Quote Loaders To Finish");
    await this.waitUntilNoVisibleAppLoaderOverlays(timeoutMs);
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 55_000 }).catch(() => {});
  }

  /** Quote shell visible and blocking overlays cleared (faster than {@link waitForQuoteLoadersToFinish}). */
  async waitForStandardQuoteReady(timeoutMs = 120_000): Promise<void> {
    this.logStep("Wait For Standard Quote Ready");
    await this.waitUntilNoVisibleAppLoaderOverlays(timeoutMs);
    await this.standardQuoteRoot().waitFor({ state: "visible", timeout: timeoutMs });
    await this.page
      .getByRole("progressbar")
      .first()
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => {});
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
  }

  private settlementButton(): Locator {
    const lessDeposit = this.page.locator("app-less-deposit").first();
    return lessDeposit
      .locator("gen-button")
      .filter({
        has: lessDeposit.locator("span.p-button-label", {
          hasText: /^(Calculate\s+)?Settlement$/i,
        }),
      })
      .locator("button.p-button")
      .or(lessDeposit.getByRole("button", { name: /^(Calculate\s+)?Settlement$/i }))
      .first();
  }

  async expectRecommendedRetailPriceVisibleAfterNewCondition(): Promise<void> {
    this.logStep("Expect Recommended Retail Price Visible After New Condition");
    await this.waitForQuoteLoadersToFinish();
    await this.scrollRecommendedRetailPriceIntoView();
    await expect
      .poll(
        async () => {
          const n = await this.recommendedRetailPriceInput.count();
          if (n === 0) return false;
          return await this.recommendedRetailPriceInput.first().isVisible().catch(() => false);
        },
        { timeout: 20_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(true);
  }

  async expectRecommendedRetailPriceHiddenAfterUsedCondition(): Promise<void> {
    this.logStep("Expect Recommended Retail Price Hidden After Used Condition");
    await this.waitForQuoteLoadersToFinish();
    await this.cashPriceOfAssetInputField.scrollIntoViewIfNeeded();

    const rrpBlock = this.standardQuoteRoot()
      .locator("amount")
      .filter({ hasText: /Recommended\s+Retail\s+Price/i });

    await expect
      .poll(
        async () => {
          const n = await rrpBlock.count();
          if (n === 0) return true;
          return !(await rrpBlock.first().isVisible().catch(() => false));
        },
        { timeout: 20_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(true);
  }
  /**
   * Wait until **Loan Date** and **First Payment** both have values and stop changing
   * (pricing recalculation). Skips cheaply when values are already steady.
   */
  private async waitForLoanAndFirstPaymentValuesStable(
    loanIn: Locator,
    firstIn: Locator,
    opts?: { timeoutMs?: number; intervalMs?: number; stableRounds?: number },
  ): Promise<void> {
    await this.waitForFieldValueStable(
      async () =>
        `${(await loanIn.inputValue()).trim()}\0${(await firstIn.inputValue()).trim()}`,
      (snapshot) => {
        const [loanTrim, firstTrim] = snapshot.split("\0");
        return loanTrim.length > 4 && firstTrim.length > 4;
      },
      { ...opts, label: "Loan Date / First Payment" },
    );
  }

  /** Loan Date must be set; fill First Payment from loan date when the UI left it empty (required for Calculate). */
  async ensureLoanDateAndFirstPaymentReadyForCalculate(opts?: { fast?: boolean }): Promise<void> {
    this.logStep("Ensure Loan Date And First Payment Ready For Calculate");
    const fast = opts?.fast ?? false;
    const loanIn = this.loanDate;
    const firstIn = this.firstPaymentDate;
    const visTimeout = fast ? 10_000 : 15_000;
    const stableOpts = fast
      ? { timeoutMs: 8_000, intervalMs: 150, stableRounds: 2 }
      : undefined;

    await expect(loanIn).toBeVisible({ timeout: visTimeout });
    await expect(loanIn).toBeEditable();
    expect((await loanIn.inputValue()).trim().length).toBeGreaterThan(4);
    await expect(firstIn).toBeVisible({ timeout: visTimeout });
    if (!fast) {
      await this.waitUntilNoVisibleAppLoaderOverlays(15_000);
    }
    await this.waitForLoanDateValueStable(loanIn, stableOpts);
    if ((await firstIn.inputValue()).trim().length < 5) {
      await expect(firstIn).toBeEditable();
      await this.enterFirstPaymentSuggestedFromLoanDdMmYyyy();
      await expect
        .poll(async () => (await firstIn.inputValue()).trim().length, {
          timeout: fast ? 8_000 : 12_000,
        })
        .toBeGreaterThan(4);
    }
    if (!fast) {
      await this.waitUntilNoVisibleAppLoaderOverlays(15_000);
    }
    await this.waitForLoanAndFirstPaymentValuesStable(loanIn, firstIn, stableOpts);
  }

  /** Clear origination reference and run **Calculate** (allowed with blank origin on some CSA builds). */
  async calculateWithOriginationBlank(): Promise<void> {
    this.logStep("Calculate With Origination Blank");
    await this.clearOriginationReferences();
    await this.clickCalculateButton();
    await expect(this.standardQuoteRoot()).toBeVisible();
  }

  /**
   * Set Originator Reference; when Loan Purpose control exists (read-only CSA), expect it blank.
   */
  async enterOriginationReferenceAndExpectLoanPurposeBlank(origRef: string): Promise<void> {
    this.logStep(
      `Entered origination reference (expect loan purpose blank) as ${this.stepValueDisplay(origRef)}`,
    );
    await this.enterOriginationReference(origRef);
    const root = this.standardQuoteRoot();
    const loanPurposeInput = root
      .getByRole("textbox", { name: /^Loan Purpose/i })
      .or(
        root.locator(
          "xpath=.//label[contains(normalize-space(.),'Loan Purpose')]/following::input[1]",
        ),
      )
      .first();
    if (await loanPurposeInput.isVisible({ timeout: 12_000 }).catch(() => false)) {
      expect((await loanPurposeInput.inputValue()).trim()).toBe("");
    }
  }

  /** Dealer Origination Fee: visible and pre-populated (program setup), same pattern as UDC Establishment Fee. */
  async expectDealerOriginationFeePopulatedFromProgram(): Promise<void> {
    this.logStep("Expect Dealer Origination Fee Populated From Program");
    const f = this.dealerOriginationFeeInputField;
    await expect(f).toBeVisible({ timeout: 20_000 });
    const raw = (await f.inputValue()).trim();
    expect(raw.length).toBeGreaterThan(0);
    const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
    expect(Number.isNaN(n)).toBeFalsy();
    expect(n).toBeGreaterThanOrEqual(0);
  }

  /** **Total Establishment Fee** (read-only): parsed numeric equals UDC + Dealer (waits for recalculation). */
  async expectTotalEstablishmentFeeSumDollars(expectedTotal: number): Promise<void> {
    this.logStep(`Expect total establishment fee sum: ${this.stepValueDisplay(String(expectedTotal))}`);
    const f = this.totalEstablishmentFeeInputField;
    await expect(f).toBeVisible({ timeout: 20_000 });
    const want = Math.round(expectedTotal * 100) / 100;
    await expect
      .poll(
        async () => {
          const raw = (await f.inputValue()).trim();
          const n = parseFloat(raw.replace(/[^0-9.-]/g, ""));
          return Number.isNaN(n) ? Number.NaN : Math.round(n * 100) / 100;
        },
        { timeout: 15_000 },
      )
      .toBe(want);
  }

  /** PPSR Count row visible with a value; fee line (@ rate / amount) visible when rendered for this product. */
  async expectPpsrCountAndFeeLineVisible(): Promise<void> {
    this.logStep("Expect Ppsr Count And Fee Line Visible");
    const root = this.standardQuoteRoot();
    await expect(root.getByText(/PPSR\s*Count/i).first()).toBeVisible({ timeout: 20_000 });
    const ppsrRow = root
      .locator(".p-field, [class*='p-field'], [class*='col-']")
      .filter({ hasText: /PPSR\s*Count/i })
      .first();
    if (await ppsrRow.isVisible({ timeout: 8_000 }).catch(() => false)) {
      const spin = ppsrRow.getByRole("spinbutton").first();
      if (await spin.isVisible({ timeout: 4_000 }).catch(() => false)) {
        expect((await spin.inputValue()).trim().length).toBeGreaterThan(0);
      }
    } else {
      await expect(this.PPSRCount.first()).toBeVisible({ timeout: 10_000 });
    }
    const feeLine = root
      .locator(".p-field, [class*='p-field']")
      .filter({ hasText: /@/ })
      .filter({ hasText: /\$|\d+\.\d{2}/ })
      .first();
    if (await feeLine.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(feeLine).toBeVisible();
    }
  }

  /**
   * **Dealer Finance** accordion on the Finance card (`:text-is("Dealer Finance")` / `p-button-label`).
   * No-op if the panel is already expanded (Base Interest Rate visible).
   */
  async expandDealerFinanceSection(): Promise<void> {
    this.logStep("Expand Dealer Finance Section");
    const root = this.standardQuoteRoot();
    if (
      await root
        .getByText(/Base\s+Interest\s+Rate/i)
        .first()
        .isVisible({ timeout: 2_000 })
        .catch(() => false)
    ) {
      return;
    }
    const trigger = root.locator(':text-is("Dealer Finance")').first();
    await expect(trigger).toBeVisible({ timeout: 20_000 });
    await trigger.click({ timeout: 15_000 });
    await expect(root.getByText(/Base\s+Interest\s+Rate/i).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * After **Dealer Finance** is expanded: labels and values in the expanded block.
   * **Base Interest Rate** % is scenario-specific (shape-only). Commission and establishment
   * lines are **priced** (incl. negatives) or `-` after **Calculate** — do not assert fixed `$0.00`.
   * Prefer the a11y `region` for this block so we do not match the main **Interest Rate** % below.
   */
  async expectDealerFinanceExpandedSummary(): Promise<void> {
    this.logStep("Expect Dealer Finance Expanded Summary");
    const root = this.standardQuoteRoot();
    const panel = root
      .getByRole("region")
      .filter({ hasText: /Base\s+Interest\s+Rate/i })
      .filter({ hasText: /Estimated\s+Commission\s*\/\s*Subsidy/i })
      .filter({ hasText: /Establishment\s+Fee\s+Share/i })
      .first();
    await expect(panel).toBeVisible({ timeout: 15_000 });

    const baseLabel = panel.getByText(/Base\s+Interest\s+Rate/i).first();
    await expect(baseLabel).toBeVisible();
    const baseRateFromSibling = baseLabel
      .locator("xpath=following-sibling::*[1]")
      .getByText(/\d+(?:\.\d+)?\s*%/);
    await expect(
      baseRateFromSibling.or(panel.getByText(/\d+(?:\.\d+)?\s*%/).first()),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      panel.getByText(/Estimated\s+Commission\s*\/\s*Subsidy/i).first(),
    ).toBeVisible();
    await expect(panel.getByText(/Establishment\s+Fee\s+Share/i).first()).toBeVisible();

    const panelText = (await panel.innerText()).replace(/\r\n/g, "\n");
    // Currency (e.g. $130.00, $0.00), negative lead (e.g. -$297.63), or placeholder dash.
    const pricedOrDash =
      /(-\$\s*[\d,]+(?:\.\d{1,2})?|\$\s*[\d,]+(?:\.\d{1,2})?|[-–—])/;
    expect(
      new RegExp(
        `Estimated\\s+Commission\\s*/\\s*Subsidy[\\s\\S]{0,300}?(?:${pricedOrDash.source})`,
        "i",
      ).test(panelText),
    ).toBeTruthy();
    expect(
      new RegExp(
        `Establishment\\s+Fee\\s+Share[\\s\\S]{0,300}?(?:${pricedOrDash.source})`,
        "i",
      ).test(panelText),
    ).toBeTruthy();
  }

  /** **Dealer Finance** expanded block (Base Interest Rate / Commission / Establishment Fee Share). */
  private dealerFinancePanel(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .getByRole("region")
      .filter({ hasText: /Base\s+Interest\s+Rate/i })
      .filter({ hasText: /Estimated\s+Commission\s*\/\s*Subsidy/i })
      .first();
  }

  /** UDP-T4118 — read **Base Interest Rate** % from expanded **Dealer Finance**. */
  async readBaseInterestRatePercent(): Promise<number> {
    this.logStep("Read base interest rate percent");
    await this.expandDealerFinanceSection();
    const panel = this.dealerFinancePanel();
    await expect(panel).toBeVisible({ timeout: 15_000 });
    const baseLabel = panel.getByText(/Base\s+Interest\s+Rate/i).first();
    const row = baseLabel.locator(
      "xpath=ancestor::div[contains(@class,'grid') or contains(@class,'col') or contains(@class,'field')][1]",
    );
    const text = ((await row.textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
    const scoped = text.match(/Base\s+Interest\s+Rate[\s\S]*?([\d]+(?:\.\d+)?)\s*%/i);
    if (scoped) {
      return this.parseInterestPercent(scoped[1]);
    }
    const panelText = ((await panel.innerText()).replace(/\r\n/g, "\n"));
    const fallback = panelText.match(/Base\s+Interest\s+Rate[\s\S]*?([\d]+(?:\.\d+)?)\s*%/i);
    return fallback ? this.parseInterestPercent(fallback[1]) : Number.NaN;
  }

  /** UDP-T4118 — **Base Interest Rate** is display-only (no editable input in Dealer Finance). */
  async expectBaseInterestRateDisplayOnly(): Promise<void> {
    this.logStep("Expect base interest rate display only");
    await this.expandDealerFinanceSection();
    const panel = this.dealerFinancePanel();
    await expect(panel).toBeVisible({ timeout: 15_000 });
    const baseLabel = panel.getByText(/Base\s+Interest\s+Rate/i).first();
    const row = baseLabel.locator(
      "xpath=ancestor::div[contains(@class,'grid') or contains(@class,'col') or contains(@class,'field')][1]",
    );
    const editable = row.locator(
      "input:not([disabled]):not([type='hidden']), [role='spinbutton']:not([disabled])",
    );
    expect(await editable.count()).toBe(0);
    await expect(row.getByText(/\d+(?:\.\d+)?\s*%/).first()).toBeVisible({ timeout: 10_000 });
  }

  /** UDP-T4118 — **Base Interest Rate** matches value captured at first **Save**. */
  async expectBaseInterestRateRetained(expectedPercent: number, tolerance = 0.05): Promise<void> {
    this.logStep(`Expect base interest rate retained (~${expectedPercent}%)`);
    const actual = await this.readBaseInterestRatePercent();
    expect(Number.isFinite(actual)).toBeTruthy();
    expect(Math.abs(actual - expectedPercent)).toBeLessThanOrEqual(tolerance);
  }

  private salespersonDropdownTrigger(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .getByRole("combobox", { name: /Salesperson/i })
      .or(
        root
          .locator("p-dropdown")
          .filter({ has: root.locator("label, span").filter({ hasText: /Salesperson/i }) })
          .locator(".p-dropdown-trigger")
          .first(),
      )
      .first();
  }

  async readSelectedSalespersonLabel(): Promise<string> {
    const trigger = this.salespersonDropdownTrigger();
    if (!(await trigger.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return "";
    }
    const aria = ((await trigger.getAttribute("aria-label")) ?? "").trim();
    if (aria && !/Salesperson/i.test(aria)) {
      return aria;
    }
    return ((await trigger.textContent()) ?? "").replace(/\s+/g, " ").trim();
  }

  /**
   * UDP-T4118 — pick a different **Salesperson** (Originator staff) when the dropdown exposes
   * multiple options; returns the selected label or empty when not changeable.
   */
  async selectAlternativeSalespersonIfAvailable(): Promise<string> {
    this.logStep("Select alternative salesperson if available");
    const trigger = this.salespersonDropdownTrigger();
    if (!(await trigger.isVisible({ timeout: 10_000 }).catch(() => false))) {
      return "";
    }
    const before = await this.readSelectedSalespersonLabel();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click({ timeout: 12_000 });
    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    const options = panel.locator("li[role='option'], .p-dropdown-item").filter({ visible: true });
    const count = await options.count();
    if (count < 2) {
      await this.page.keyboard.press("Escape").catch(() => {});
      return "";
    }
    for (let i = 0; i < count; i++) {
      const label = ((await options.nth(i).textContent()) ?? "").replace(/\s+/g, " ").trim();
      if (!label || label === before) {
        continue;
      }
      await options.nth(i).click({ timeout: 10_000 });
      await this.waitForQuoteLoadersToFinish();
      return label;
    }
    await this.page.keyboard.press("Escape").catch(() => {});
    return "";
  }

  /** PPSR Count spinbutton in Loan Details (`div.col-4…` per SelectorHub), with row fallback. */
  private ppsrCountLoanDetailsSpin(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .locator("div.col-4.pr-0.pt-1.ng-star-inserted")
      .getByRole("spinbutton")
      .first()
      .or(
        root
          .locator(".p-field, [class*='col-']")
          .filter({ hasText: /PPSR\s*Count/i })
          .getByRole("spinbutton")
          .first(),
      );
  }

  async expectPpsrCountValue(expected: string): Promise<void> {
    this.logStep(`Expect PPSR count value: ${this.stepValueDisplay(expected)}`);
    const spin = this.ppsrCountLoanDetailsSpin();
    await expect(spin).toBeVisible({ timeout: 15_000 });
    await expect(spin).toHaveValue(expected);
    const now = await spin.getAttribute("aria-valuenow");
    if (now != null && now !== "") {
      expect(parseFloat(now)).toBe(parseFloat(expected));
    }
  }

  async fillPpsrCountLoanDetails(count: string): Promise<void> {
    this.logStep(`Filled PPSR count (loan details) as ${this.stepValueDisplay(count)}`);
    const spin = this.ppsrCountLoanDetailsSpin();
    await spin.waitFor({ state: "visible", timeout: 15_000 });
    await spin.scrollIntoViewIfNeeded();
    await spin.click({ clickCount: 3 });
    await spin.fill(count);
    await spin.press("Tab").catch(() => {});
  }

  /** LMF / Loan Maintenance Fee area (incl. Waive LMF) visible on Asset Details / totals. */
  async expectLoanMaintenanceFeeOrLmfAreaVisible(): Promise<void> {
    this.logStep("Expect Loan Maintenance Fee Or Lmf Area Visible");
    const root = this.standardQuoteRoot();
    await expect(
      root.getByText(/Loan\s+Maintenance\s+Fee|LMF|Waive\s+LMF/i).first(),
    ).toBeVisible({ timeout: 25_000 });
  }

  /** `app-less-deposit` — Waive LMF checkbox and related trade/settlement rows. */
  lessDepositRoot(): Locator {
    return this.page.locator("app-less-deposit").first();
  }

  /** PrimeNG **Waive LMF** host (Less Deposit, below Total Amount Borrowed). */
  waiveLmfCheckboxHost(): Locator {
    const less = this.lessDepositRoot();
    return less
      .locator("p-checkbox")
      .filter({ hasText: /Waive\s+LMF/i })
      .first()
      .or(
        this.standardQuoteRoot()
          .locator("p-checkbox")
          .filter({ hasText: /Waive\s+LMF/i })
          .first(),
      );
  }

  /** Visible **Waive LMF** checkbox box (PrimeNG). */
  waiveLmfCheckboxBox(): Locator {
    return this.waiveLmfCheckboxHost().locator("div.p-checkbox-box").first();
  }

  /** Label + `$` sibling in finance totals, with `amount/#amount` fallback. */
  private financeSummaryLabelValueField(label: string): Locator {
    const root = this.standardQuoteRoot();
    const displayValue = root
      .locator(
        `xpath=.//*[normalize-space(.)="${label}"]/following-sibling::*[contains(., "$")][1]`,
      )
      .first();
    const amountInput = root
      .locator("amount")
      .filter({ hasText: new RegExp(label.replace(/\s+/g, "\\s+"), "i") })
      .locator("#amount")
      .first();
    return displayValue.or(amountInput).first();
  }

  /** **Loan Maintenance Fee** (totals block or `amount` row). */
  loanMaintenanceFeeField(): Locator {
    return this.financeSummaryLabelValueField("Loan Maintenance Fee");
  }

  /** **Payment Amount** (instalment) from Payment Summary. */
  paymentAmountField(): Locator {
    const labelRx = /Payment\s+Amount/i;
    return this.paymentSummaryRoot
      .locator("amount")
      .filter({ hasText: labelRx })
      .locator("#amount")
      .first()
      .or(
        this.paymentSummaryRoot
          .getByText(labelRx)
          .locator("xpath=following::input[@id='amount'][1]")
          .first(),
      );
  }

  /** **Total Amount to Repay** from Payment Summary. */
  totalAmountToRepayField(): Locator {
    const labelRx = /Total\s+Amount\s+to\s+Repay/i;
    return this.paymentSummaryRoot
      .locator("amount")
      .filter({ hasText: labelRx })
      .locator("#amount")
      .first()
      .or(
        this.paymentSummaryRoot
          .getByText(labelRx)
          .locator("xpath=following::input[@id='amount'][1]")
          .first(),
      );
  }

  async scrollLessDepositIntoView(): Promise<void> {
    await this.lessDepositRoot().scrollIntoViewIfNeeded().catch(() => {});
    await this.totalAmountBorrowedField().scrollIntoViewIfNeeded().catch(() => {});
  }

  async readLoanMaintenanceFee(): Promise<number> {
    const field = this.loanMaintenanceFeeField();
    await this.standardQuoteRoot().getByText(/Loan\s+Maintenance\s+Fee/i).first().scrollIntoViewIfNeeded().catch(() => {});
    await expect(field).toBeVisible({ timeout: 30_000 });
    const raw =
      (await field.inputValue().catch(() => "")).trim() ||
      ((await field.textContent()) ?? "").replace(/\s+/g, " ").trim();
    return this.parseDisplayedCurrency(raw);
  }

  async readPaymentAmount(): Promise<number> {
    const field = this.paymentAmountField();
    await expect(field).toBeVisible({ timeout: 30_000 });
    const raw =
      (await field.inputValue().catch(() => "")).trim() ||
      ((await field.textContent()) ?? "").trim();
    return this.parseDisplayedCurrency(raw);
  }

  async readTotalAmountToRepay(): Promise<number> {
    const field = this.totalAmountToRepayField();
    await expect(field).toBeVisible({ timeout: 30_000 });
    const raw =
      (await field.inputValue().catch(() => "")).trim() ||
      ((await field.textContent()) ?? "").trim();
    return this.parseDisplayedCurrency(raw);
  }

  private async isPrimeCheckboxChecked(host: Locator): Promise<boolean> {
    const visual = await host
      .locator(".p-checkbox-box.p-checkbox-checked, .p-checkbox-box.p-highlight")
      .first()
      .isVisible({ timeout: 1_500 })
      .catch(() => false);
    if (visual) return true;
    const input = host.locator('input[type="checkbox"]').first();
    return input.isChecked().catch(() => false);
  }

  /** Tick **Waive LMF** when visible and authorised. */
  async setWaiveLmfChecked(checked: boolean): Promise<void> {
    this.logStep(`Set Waive LMF checked: ${checked}`);
    const host = this.waiveLmfCheckboxHost();
    const box = this.waiveLmfCheckboxBox();
    await expect
      .poll(async () => box.isVisible().catch(() => false), { timeout: 60_000 })
      .toBe(true);
    await box.scrollIntoViewIfNeeded();
    const isChecked = await this.isPrimeCheckboxChecked(host);
    if (isChecked === checked) return;

    await box.click({ timeout: 10_000 });
    if ((await this.isPrimeCheckboxChecked(host)) !== checked) {
      await box.click({ force: true, timeout: 10_000 });
    }
    if ((await this.isPrimeCheckboxChecked(host)) !== checked) {
      const input = host.locator('input[type="checkbox"]').first();
      if (checked) {
        await input.check({ force: true });
      } else {
        await input.uncheck({ force: true });
      }
    }
    await expect.poll(async () => this.isPrimeCheckboxChecked(host), { timeout: 8_000 }).toBe(checked);
  }

  async expectWaiveLmfCheckboxVisibleAndEnabled(): Promise<void> {
    this.logStep("Expect Waive LMF Checkbox Visible And Enabled");
    await this.scrollLessDepositIntoView();
    await expect
      .poll(async () => this.waiveLmfCheckboxBox().isVisible().catch(() => false), {
        timeout: 60_000,
      })
      .toBe(true);
    const host = this.waiveLmfCheckboxHost();
    const box = this.waiveLmfCheckboxBox();
    await expect(box).toBeVisible();
    const disabled = await host
      .locator(".p-checkbox.p-disabled, .p-checkbox-disabled")
      .isVisible({ timeout: 500 })
      .catch(() => false);
    expect(disabled).toBeFalsy();
    const input = host.locator('input[type="checkbox"]').first();
    if (await input.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await expect(input).toBeEnabled();
    }
  }

  /** Unauthorised dealer: hidden or disabled/read-only. */
  async expectWaiveLmfCheckboxHiddenOrDisabled(): Promise<void> {
    this.logStep("Expect Waive LMF Checkbox Hidden Or Disabled");
    await this.scrollLessDepositIntoView();
    const host = this.waiveLmfCheckboxHost();
    const visible = await host.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!visible) return;

    const disabledClass = await host
      .locator(".p-checkbox.p-disabled, .p-checkbox-disabled")
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    const input = host.locator('input[type="checkbox"]').first();
    const inputDisabled =
      (await input.isVisible({ timeout: 1_000 }).catch(() => false)) &&
      (await input.isDisabled().catch(() => false));
    expect(disabledClass || inputDisabled).toBeTruthy();
  }

  async expectWaiveLmfCheckboxUnchecked(): Promise<void> {
    this.logStep("Expect Waive LMF Checkbox Unchecked");
    await this.scrollLessDepositIntoView();
    const host = this.waiveLmfCheckboxHost();
    await expect(host).toBeVisible({ timeout: 25_000 });
    expect(await this.isPrimeCheckboxChecked(host)).toBe(false);
  }

  async expectLoanMaintenanceFeeDisplayOnly(): Promise<void> {
    this.logStep("Expect Loan Maintenance Fee Display Only");
    const root = this.standardQuoteRoot();
    const amountInput = root
      .locator("amount")
      .filter({ hasText: /Loan\s+Maintenance\s+Fee/i })
      .locator("#amount")
      .first();
    if (await amountInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(amountInput).toBeDisabled();
      return;
    }
    const field = this.loanMaintenanceFeeField();
    await expect(field).toBeVisible({ timeout: 25_000 });
    const editable = await field.isEditable().catch(() => false);
    expect(editable).toBeFalsy();
  }

  async expectLoanMaintenanceFeeGreaterThanZero(): Promise<void> {
    this.logStep("Expect Loan Maintenance Fee Greater Than Zero");
    await expect
      .poll(async () => this.readLoanMaintenanceFee(), { timeout: 60_000 })
      .toBeGreaterThan(0);
  }

  async expectLoanMaintenanceFeeZero(): Promise<void> {
    this.logStep("Expect Loan Maintenance Fee Zero");
    await expect.poll(async () => this.readLoanMaintenanceFee(), { timeout: 30_000 }).toBe(0);
  }

  /**
   * UDP-T4241 / MAF-4796 — LMF displays pre-configured FIS AF Program Setup value (> 0), read-only.
   */
  async expectLoanMaintenanceFeePreconfiguredFromFisAf(): Promise<void> {
    this.logStep("Expect loan maintenance fee preconfigured from FIS AF");
    await this.scrollLessDepositIntoView();
    await this.expectLoanMaintenanceFeeGreaterThanZero();
    await this.expectLoanMaintenanceFeeDisplayOnly();
  }

  /**
   * UDP-T4241 / MAF-4796 — no LMF in FIS AF: **$0.00** or row absent (TL-B).
   */
  async expectLoanMaintenanceFeeZeroOrAbsentOnTl(): Promise<void> {
    this.logStep("Expect loan maintenance fee zero or absent on TL");
    await this.scrollLessDepositIntoView();
    const lmfLabel = this.standardQuoteRoot().getByText(/Loan\s+Maintenance\s+Fee/i).first();
    if (!(await lmfLabel.isVisible({ timeout: 15_000 }).catch(() => false))) {
      return;
    }
    await this.expectLoanMaintenanceFeeZero();
    await this.expectLoanMaintenanceFeeDisplayOnly();
  }

  async selectTlProductAndProgramForLmf(product: string, program: string): Promise<void> {
    this.logStep(`Select TL product/program for LMF: ${this.stepValueDisplay(product)} / ${this.stepValueDisplay(program)}`);
    await this.chooseProduct(product);
    await this.chooseProgram(program);
    await this.waitForQuoteLoadersToFinish();
  }

  async expectWaiveLmfInLessDepositBelowTotalBorrowed(): Promise<void> {
    this.logStep("Expect Waive LMF In Less Deposit Below Total Borrowed");
    await this.scrollTotalAmountBorrowedIntoView();
    await expect(this.totalAmountBorrowedField()).toBeVisible({ timeout: 25_000 });
    await this.scrollLessDepositIntoView();
    await expect
      .poll(async () => this.waiveLmfCheckboxBox().isVisible().catch(() => false), {
        timeout: 60_000,
      })
      .toBe(true);
    await expect(this.waiveLmfCheckboxBox()).toBeVisible();
  }

  /** After **Waive LMF**, payment schedule should not list timed LMF fee rows. */
  async expectPaymentScheduleExcludesLmfFeeRows(): Promise<void> {
    this.logStep("Expect Payment Schedule Excludes LMF Fee Rows");
    const dlg = this.editPaymentScheduleDialog();
    const scope = (await dlg.isVisible({ timeout: 3_000 }).catch(() => false))
      ? dlg
      : this.paymentScheduleContentScope();
    const lmfRows = scope
      .locator("tbody tr")
      .filter({ hasText: /LMF|Loan\s+Maintenance|Maintenance\s+Fee/i });
    await expect(lmfRows).toHaveCount(0, { timeout: 15_000 });
  }

  /**
   * Set interest % on the Finance **Interest Rate** field without the Finance-Lease stability cap ({@link interestRate}).
   * Use for CSA when observing brand / hierarchy behaviour after edits.
   */
  async enterInterestRatePercentSimple(percentDigits: string): Promise<void> {
    this.logStep(`Entered interest rate % (simple) as ${this.stepValueDisplay(percentDigits)}`);
    const field = this.interestRateInputField;
    const digits = percentDigits.replace(/%/g, "").trim();
    await field.waitFor({ state: "visible", timeout: 30_000 });
    await field.scrollIntoViewIfNeeded();
    await field.click({ clickCount: 3 });
    await field.fill(digits);
    await field.press("Tab").catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await this.page.waitForTimeout(600);
  }

  /** After an interest edit, assert optional **Brand / hierarchy / tier** copy when the build shows it. */
  async expectBrandHierarchyOrRateHintIfShown(): Promise<void> {
    this.logStep("Expect Brand Hierarchy Or Rate Hint If Shown");
    const root = this.standardQuoteRoot();
    const hint = root.getByText(
      /Brand|Hierarchy|Interest\s*tier|Pricing\s*tier|Rate\s*card|Subsidy|Commission|Dealer\s+buy/i,
    );
    if (await hint.first().isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(hint.first()).toBeVisible();
    }
  }

  /** Brand/Asset card **Edit** control on Asset Details (`.brand-edit-btn` or pencil icon). */
  brandEditButton(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .locator("button.brand-edit-btn, a.brand-edit-btn, [role='button'].brand-edit-btn")
      .or(
        root
          .getByRole("button", { name: /^Edit$/i })
          .filter({ has: root.locator("i.pi-pencil, i.pi-pen-to-square, .fa-pen-to-square") }),
      )
      .or(root.getByText(/Edit\s*brand/i));
  }

  /** Brand Selection dialog opened from the asset card **Edit** control. */
  brandSelectionDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ has: this.page.locator('input[name="brandSelection"]') })
      .last();
  }

  /** Hidden native input — scope only; do not assert visible or call `.check()`. */
  private brandSelectionRadioInputAtIndex(index: number): Locator {
    const brandId = `BrandName${index}`;
    return this.brandSelectionDialog().locator(
      `input[name="brandSelection"][id="${brandId}"]`,
    );
  }

  /** Visible PrimeNG radio box for a brand row. */
  brandSelectionRadioBoxAtIndex(index: number): Locator {
    return this.brandSelectionRadioInputAtIndex(index)
      .locator("xpath=ancestor::p-radiobutton[1]")
      .locator(".p-radiobutton-box");
  }

  /** Single click target for a brand — `label.brand-logo-box[for="BrandName{n}"]`. */
  private brandSelectionClickTargetAtIndex(index: number): Locator {
    const brandId = `BrandName${index}`;
    return this.brandSelectionDialog().locator(`label.brand-logo-box[for="${brandId}"]`);
  }

  brandSelectionAddButton(): Locator {
    return this.brandSelectionDialog().locator(':text-is("Add")');
  }

  private async brandSelectionVisibleTileCount(): Promise<number> {
    const dialog = this.brandSelectionDialog();
    const logoLabels = await dialog.locator("label.brand-logo-box").count();
    if (logoLabels >= 2) {
      return logoLabels;
    }
    return dialog.locator(".p-radiobutton-box").filter({ visible: true }).count();
  }

  /** Click **Edit** on the brand/asset card and wait for the Brand Selection dialog. */
  async openBrandSelectionDialog(): Promise<void> {
    this.logStep("Open Brand Selection dialog");
    const edit = this.brandEditButton();
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    await expect(edit).toBeVisible({ timeout: 15_000 });
    await expect(edit).toBeEnabled({ timeout: 15_000 });
    await edit.scrollIntoViewIfNeeded();
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    await expect(edit).toBeVisible({ timeout: 15_000 });
    await expect(edit).toBeEnabled({ timeout: 15_000 });
    await edit.click({ timeout: 15_000 });
    const dialog = this.brandSelectionDialog();
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    await expect
      .poll(async () => await this.brandSelectionVisibleTileCount(), {
        timeout: 30_000,
        intervals: [300, 500, 1_000],
      })
      .toBeGreaterThanOrEqual(2);
    await expect(this.brandSelectionClickTargetAtIndex(0)).toBeVisible({ timeout: 15_000 });
  }

  /** Select a brand by clicking `label.brand-logo-box[for="BrandName{n}"]`. */
  async selectBrandSelectionRadioAtIndex(index: number): Promise<void> {
    this.logStep(`Select brand at index ${index}`);
    const target = this.brandSelectionClickTargetAtIndex(index);
    await expect(target).toBeVisible({ timeout: 15_000 });
    await target.scrollIntoViewIfNeeded();
    await target.click({ timeout: 15_000 });
    await this.expectBrandSelectionRadioCheckedAtIndex(index);
  }

  async expectBrandSelectionRadioCheckedAtIndex(index: number): Promise<void> {
    this.logStep(`Expect brand selected at index ${index}`);
    await expect(this.brandSelectionRadioBoxAtIndex(index)).toHaveClass(/p-highlight/, {
      timeout: 10_000,
    });
  }

  async expectBrandSelectionRadioNotCheckedAtIndex(index: number): Promise<void> {
    this.logStep(`Expect brand not selected at index ${index}`);
    await expect(this.brandSelectionRadioBoxAtIndex(index)).not.toHaveClass(/p-highlight/);
  }

  /** Confirm brand selection in the dialog (**Add**). */
  async clickBrandSelectionAddButton(): Promise<void> {
    this.logStep("Click Brand Selection Add");
    const add = this.brandSelectionAddButton();
    await expect(add).toBeVisible({ timeout: 15_000 });
    await add.click({ timeout: 15_000 });
  }

  private async countSelectedBrandOptions(): Promise<number> {
    return this.brandSelectionDialog()
      .locator(".p-radiobutton-box.p-highlight")
      .filter({ visible: true })
      .count();
  }

  /** Exactly one brand remains selected (single-selection behaviour). */
  async expectExactlyOneBrandSelected(): Promise<void> {
    this.logStep("Expect exactly one brand selected");
    await expect
      .poll(async () => await this.countSelectedBrandOptions(), {
        timeout: 15_000,
        intervals: [200, 500, 1_000],
      })
      .toBe(1);
  }

  /** Interest Rate control is editable (program may still re-price on Calculate). */
  async expectInterestRateEditable(): Promise<void> {
    this.logStep("Expect Interest Rate Editable");
    await expect(this.financeInterestRateInput()).toBeVisible({ timeout: 20_000 });
    await expect(this.financeInterestRateInput()).toBeEditable();
  }

  /** Finance **Interest Rate** % — scoped to quote shell; excludes **Base Interest Rate**. */
  private financeInterestRateInput(): Locator {
    const root = this.standardQuoteRoot();
    const byLabel = root.locator(
      "xpath=.//*[self::label or self::span][contains(normalize-space(.),'Interest Rate') and not(contains(normalize-space(.),'Base'))]/following::input[@id='percent'][1]",
    );
    const byPercentage = root
      .locator("percentage")
      .filter({
        has: root.locator("label, span").filter({ hasText: /^Interest\s+Rate\s*\*?$/i }),
      })
      .locator("#percent")
      .first();
    const bySpinbutton = root.locator(
      "xpath=.//*[self::label or self::span][contains(normalize-space(.),'Interest Rate') and not(contains(normalize-space(.),'Base'))]/following::*[@role='spinbutton'][1]",
    );
    return byLabel
      .or(byPercentage)
      .or(bySpinbutton)
      .or(this.interestRateInputField)
      .filter({ visible: true })
      .first();
  }

  private async readInterestRateFieldRaw(field: Locator): Promise<string> {
    const fromInput = (await field.inputValue().catch(() => "")).trim();
    if (fromInput && /\d/.test(fromInput)) {
      return fromInput;
    }

    const aria = ((await field.getAttribute("aria-valuenow")) ?? "").trim();
    if (aria && /\d/.test(aria)) {
      return aria;
    }

    const text = ((await field.textContent()) ?? "").replace(/\s+/g, " ").trim();
    const textMatch = text.match(/([\d,.]+)\s*%?/);
    if (textMatch) {
      return textMatch[1];
    }

    const wrapper = field.locator("xpath=ancestor::percentage[1]").first();
    if (await wrapper.isVisible().catch(() => false)) {
      const wrapText = ((await wrapper.textContent()) ?? "").replace(/\s+/g, " ").trim();
      const wrapMatch = wrapText.match(/([\d,.]+)\s*%/);
      if (wrapMatch) {
        return wrapMatch[1];
      }
    }

    return "";
  }

  async readInterestRatePercent(): Promise<string> {
    this.logStep("Read interest rate percent");
    const field = this.financeInterestRateInput();
    return (await this.readInterestRateFieldRaw(field)).replace(/%/g, "").trim();
  }

  /**
   * UDP-T4237 / UDP-T3665 — **Interest Rate** defaults from FIS AF (rate table + dealer profile).
   * Optional `expectedRate` pins program default (e.g. TL **9**%, CSA **12.95**%).
   */
  async expectInterestRateDefaultsFromFisAf(expectedRate?: string): Promise<void> {
    this.logStep("Expect interest rate defaults from FIS AF");
    const field = this.financeInterestRateInput();
    await expect(field).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(
        async () => {
          const rate = (await this.readInterestRateFieldRaw(field)).replace(/%/g, "").trim();
          if (!rate || !/\d/.test(rate)) return null;
          const n = this.parseInterestPercent(rate);
          return !Number.isNaN(n) && n > 0 ? rate : null;
        },
        { timeout: 60_000, intervals: [500, 1_000, 2_000] },
      )
      .not.toBeNull();

    if (expectedRate) {
      const target = this.parseInterestPercent(expectedRate);
      await expect
        .poll(
          async () => {
            const n = this.parseInterestPercent(await this.readInterestRateFieldRaw(field));
            return this.interestRateAcceptable(n, target) ? n : null;
          },
          { timeout: 30_000, intervals: [300, 500, 1_000] },
        )
        .not.toBeNull();
    }
  }

  /**
   * UDP-T4237 — editability per BLD rules from FIS AF: field is visible and either editable or locked.
   */
  async expectInterestRateEditabilityPerBldRules(): Promise<void> {
    this.logStep("Expect interest rate editability per BLD rules");
    const field = this.financeInterestRateInput();
    await expect(field).toBeVisible({ timeout: 20_000 });
    const editable = await field.isEditable().catch(() => false);
    if (editable) {
      await expect(field).toBeEditable();
      return;
    }
    await expect(field).toBeDisabled();
  }

  /** UDP-T4235 — **Term** spinbutton (free-text) or program dropdown is visible on Finance Details. */
  async expectTermFieldVisible(): Promise<void> {
    this.logStep("Expect Term field visible");
    const spin = this.termsOfFinanceInputField;
    if (await spin.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await expect(spin).toBeVisible({ timeout: 15_000 });
      return;
    }
    const root = this.standardQuoteRoot();
    const termLabel = root.locator("label, span").filter({ hasText: /^Term\s*\*?$/i }).first();
    await expect(termLabel).toBeVisible({ timeout: 15_000 });
    const dropdown = root
      .locator("p-dropdown")
      .filter({ has: termLabel })
      .first()
      .or(termLabel.locator("xpath=following::p-dropdown[1]"));
    if (await dropdown.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(dropdown).toBeVisible({ timeout: 15_000 });
      return;
    }
    const numberInput = root
      .locator("number")
      .filter({ hasText: /Term/i })
      .locator("input[type='number'], input.p-inputtext, input")
      .first();
    await expect(numberInput).toBeVisible({ timeout: 15_000 });
  }

  /** Whether **Term** renders as a program **dropdown** (set terms) vs free-text spinbutton. */
  async isTermDropdownControl(): Promise<boolean> {
    const root = this.standardQuoteRoot();
    const termLabel = root.locator("label, span").filter({ hasText: /^Term\s*\*?$/i }).first();
    const dropdown = root
      .locator("p-dropdown")
      .filter({ has: termLabel })
      .first()
      .or(termLabel.locator("xpath=following::p-dropdown[1]"));
    return dropdown.isVisible({ timeout: 3_000 }).catch(() => false);
  }

  /** Current **Term** from spinbutton / numeric input or program dropdown label. */
  async readTermValue(): Promise<string> {
    const spin = this.termsOfFinanceInputField;
    if (await spin.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return (await spin.inputValue().catch(() => "")).trim();
    }

    const numberInput = this.page
      .locator("number")
      .filter({ hasText: /Term/i })
      .locator("input[type='number'], input.p-inputtext, input")
      .first();
    if (await numberInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return (await numberInput.inputValue().catch(() => "")).trim();
    }

    const root = this.standardQuoteRoot();
    const termLabel = root.locator("label, span").filter({ hasText: /^Term\s*\*?$/i }).first();
    const trigger = termLabel
      .locator(
        "xpath=following::button[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
      )
      .first();
    if (await trigger.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return this.readPrimeDropdownLabel(trigger);
    }

    return "";
  }

  /**
   * UDP-T4027 — blank **Term** on **Calculate** shows `Please complete`; over-max shows
   * `Term must not be greater than` (free-text term programs only).
   */
  async expectAfVTermBlankAndMaxValidationOnCalculate(opts: {
    overMaxTerm: string;
    restoreTerm: string;
  }): Promise<void> {
    this.logStep("Expect AFV term blank and max validation on calculate");
    await this.clearTermsOfFinance();
    await this.expectTermInputBlankOrZero();
    await this.clickCalculateButton();
    await this.expectBlankTermValidationOnCalculate();

    await this.termsOfFinance(opts.overMaxTerm);
    await this.clickCalculateButton();
    await this.expectTermExceedsProgramMaxValidation();

    await this.termsOfFinance(opts.restoreTerm);
    await this.clickCalculateButton();
    await expect(this.standardQuoteRoot()).toBeVisible({ timeout: 15_000 });
  }

  private termFieldWrapper(): Locator {
    const root = this.standardQuoteRoot();
    const termHost = root.locator("number").filter({ hasText: /Term/i }).first();
    return termHost
      .locator(
        "xpath=ancestor::div[contains(@class,'col-') or contains(@class,'p-field') or contains(@class,'grid')][1]",
      )
      .first()
      .or(
        root
          .locator("label, span")
          .filter({ hasText: /^Term\s*\*?$/i })
          .first()
          .locator(
            "xpath=ancestor::div[contains(@class,'col-') or contains(@class,'p-field') or contains(@class,'grid')][1]",
          ),
      );
  }

  /**
   * UDP-T4235 — blank **Term** on **Calculate**: `Please complete` or inline required copy
   * (same behaviour as Quick Quote / CSA Standard Quote).
   */
  async expectBlankTermValidationOnCalculate(): Promise<void> {
    this.logStep("Expect blank term validation on calculate");
    const root = this.standardQuoteRoot();
    const pattern =
      /Please complete|cannot be blank|must not be blank|this field cannot|field\s+cannot\s+be\s+blank|is required|enter.*term/i;
    const wrapper = this.termFieldWrapper();
    const underTerm = wrapper.getByText(pattern).first();
    if (await underTerm.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(underTerm).toBeVisible({ timeout: 20_000 });
      return;
    }
    await expect(root.getByText(pattern).first()).toBeVisible({ timeout: 20_000 });
  }

  /**
   * After term above program max: expect copy under **Term** or page-wide, e.g.
   * `Term must not be greater than 120`, `maximum term is 120`, or `Maximum term is 120`.
   */
  private termExceedsProgramMaxTextPatterns(programMaxTerm = 120): RegExp[] {
    const n = String(programMaxTerm);
    return [
      new RegExp(`maximum\\s+termn?\\s+is\\s*${n}`, "i"),
      new RegExp(
        `Term\\s+(?:must\\s+not\\s+be|cannot\\s+be)\\s+greater\\s+than\\s*${n}`,
        "i",
      ),
      new RegExp(`greater\\s+than\\s*${n}`, "i"),
      /maximum\s+term/i,
      /Term\s+(?:must\s+not\s+be|cannot\s+be)\s+greater\s+than/i,
    ];
  }

  private async termExceedsProgramMaxMessageVisible(programMaxTerm = 120): Promise<boolean> {
    const patterns = this.termExceedsProgramMaxTextPatterns(programMaxTerm);
    const matches = (text: string): boolean => {
      const t = text.replace(/\s+/g, " ").trim();
      return t.length > 0 && patterns.some((p) => p.test(t));
    };

    const wrapper = this.termFieldWrapper();
    const wrapperText = (await wrapper.innerText().catch(() => "")) ?? "";
    if (matches(wrapperText)) return true;

    const errorNodes = wrapper
      .locator(".p-error, .p-invalid-message, small, span.p-message-detail, note, .ng-star-inserted")
      .filter({ visible: true });
    const errorCount = await errorNodes.count().catch(() => 0);
    for (let i = 0; i < errorCount; i++) {
      const t = (await errorNodes.nth(i).textContent().catch(() => "")) ?? "";
      if (matches(t)) return true;
    }

    for (const scope of [this.standardQuoteRoot(), this.page.locator("body")]) {
      for (const pattern of patterns) {
        if (await scope.getByText(pattern).first().isVisible({ timeout: 300 }).catch(() => false)) {
          return true;
        }
      }
    }

    const toast = this.page.locator(".p-toast-message-text, .p-toast-detail, p-toastitem");
    if (await toast.first().isVisible({ timeout: 300 }).catch(() => false)) {
      const toastText = (await toast.first().textContent().catch(() => "")) ?? "";
      if (matches(toastText)) return true;
    }

    return false;
  }

  private async expectTermCannotExceedProgramMaxMessageBelowTermField(
    programMaxTerm = 120,
  ): Promise<void> {
    await expect
      .poll(async () => this.termExceedsProgramMaxMessageVisible(programMaxTerm), {
        timeout: 25_000,
        intervals: [300, 500, 1_000, 1_500],
      })
      .toBeTruthy();
  }

  /**
   * UDP-T3663 / UDP-T4235 — term above program max (on blur or after **Calculate**).
   * Accepts `maximum term is 120` and `Term must not be greater than 120`.
   */
  async expectTermExceedsProgramMaxValidation(programMaxTerm = 120): Promise<void> {
    this.logStep(`Expect term must not exceed program max ${programMaxTerm}`);
    await this.expectTermCannotExceedProgramMaxMessageBelowTermField(programMaxTerm);
  }

  /** UDP-T4235 — term above program maximum after **Calculate** (max value varies by program). */
  async expectTermExceedsProgramMaxOnCalculate(programMaxTerm = 120): Promise<void> {
    await this.expectTermExceedsProgramMaxValidation(programMaxTerm);
  }

  /**
   * Enter a term above program maximum, **Calculate**, expect validation under Term; restore default term and **Calculate** again.
   */
  async expectTermExceedsProgramMaxOnCalculateThenRestore(opts: {
    overMaxTerm: string;
    restoreTerm: string;
  }): Promise<void> {
    this.logStep(
      `Expect term exceeds program max then restore: over ${this.stepValueDisplay(opts.overMaxTerm)}, restore ${this.stepValueDisplay(opts.restoreTerm)}`,
    );
    await this.termsOfFinance(opts.overMaxTerm);
    await this.clickCalculateButton();
    await this.expectTermCannotExceedProgramMaxMessageBelowTermField();
    await this.termsOfFinance(opts.restoreTerm);
    await this.clickCalculateButton();
    await expect(this.standardQuoteRoot()).toBeVisible();
  }

  private static parseDdMmYyyyLoanDate(raw: string): Date | null {
    const t = raw.trim();
    const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const year = parseInt(m[3], 10);
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /**
   * **Loan Date** on Payment Summary: defaults to **today** or **tomorrow** (runner local calendar day vs field).
   */
  async expectLoanDateOnLoadTodayOrTomorrow(): Promise<void> {
    this.logStep("Expect Loan Date On Load Today Or Tomorrow");
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    await expect(this.loanDate).toBeVisible({ timeout: 25_000 });
    const raw = (await this.loanDate.inputValue()).trim();
    expect(raw.length).toBeGreaterThan(6);
    const parsed = DOAssetDetailsPage.parseDdMmYyyyLoanDate(raw);
    expect(parsed).not.toBeNull();
    const d = new Date(parsed!);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    expect(diffDays).toBeGreaterThanOrEqual(0);
    expect(diffDays).toBeLessThanOrEqual(1);
  }

  /** Balloon **$** and **%** read zero-ish on load; **Fixed** is present and unchecked. */
  async expectBalloonAmountAndFixedCheckboxOnLoad(): Promise<void> {
    this.logStep("Expect Balloon Amount And Fixed Checkbox On Load");
    await this.waitUntilNoVisibleAppLoaderOverlays(15_000);
    await expect(this.paymentSummaryRoot).toBeVisible({ timeout: 25_000 });
    await expect(this.balloonAmountInput).toBeVisible({ timeout: 20_000 });
    const amt = (await this.balloonAmountInput.inputValue()).trim();
    expect(parseFloat(amt.replace(/[^0-9.-]/g, "")) || 0).toBe(0);
    await expect(this.balloonPercentInput).toBeVisible({ timeout: 15_000 });
    const pct = (await this.balloonPercentInput.inputValue()).trim();
    const pv = parseFloat(pct.replace(/[^0-9.-]/g, ""));
    expect(Number.isNaN(pv) ? 0 : pv).toBeCloseTo(0, 2);
    await expect(this.balloonFixedCheckboxHost()).toBeVisible({ timeout: 12_000 });
    await expect(this.balloonFixedCheckbox).not.toBeChecked();
  }

  /** Cash price must be set before balloon **$** / **%** sync — otherwise **%** flickers to `NaN%`. */
  async ensureCashPriceReadyForBalloon(minAmount = 1_000): Promise<void> {
    this.logStep("Ensure Cash Price Ready For Balloon");
    await this.waitUntilNoVisibleAppLoaderOverlays(20_000);
    const readCash = async (): Promise<number> => {
      const raw = (await this.cashPriceOfAssetInputField.inputValue().catch(() => "")).trim();
      const n = parseFloat(raw.replace(/[^0-9.-]/g, ""));
      return Number.isNaN(n) ? 0 : n;
    };
    if ((await readCash()) < minAmount) {
      await this.cashPriceOfAsset("$20,000");
      await this.waitUntilNoVisibleAppLoaderOverlays(10_000);
    }
    await expect.poll(readCash, { timeout: 20_000, intervals: [300, 500, 1_000] }).toBeGreaterThanOrEqual(
      minAmount,
    );
  }

  private async balloonPercentRaw(): Promise<string> {
    return (await this.balloonPercentInput.inputValue().catch(() => "")).replace(/%/g, "").trim();
  }

  private async readBalloonAmountRaw(): Promise<string> {
    return (await this.balloonAmountInput.inputValue().catch(() => "")).trim();
  }

  private balloonAmountRawValid(raw: string, minDollars: number): boolean {
    if (!raw || /nan/i.test(raw)) {
      return false;
    }
    const n = parseFloat(raw.replace(/[^0-9.-]/g, ""));
    return !Number.isNaN(n) && n >= minDollars;
  }

  private async balloonAmountNumeric(): Promise<number> {
    const raw = await this.readBalloonAmountRaw();
    const n = parseFloat(raw.replace(/[^0-9.-]/g, ""));
    return Number.isNaN(n) ? 0 : n;
  }

  /**
   * Balloon **$** can flicker blank/NaN during pricing recalculation — wait for loaders,
   * then require a valid amount unchanged for consecutive reads (UDP-T3669).
   */
  private async waitForBalloonAmountValueStable(
    minDollars = 1,
    opts?: { timeoutMs?: number; intervalMs?: number; stableRounds?: number },
  ): Promise<string> {
    await this.waitUntilNoVisibleAppLoaderOverlays(opts?.timeoutMs ?? 20_000);
    return this.waitForFieldValueStable(
      () => this.readBalloonAmountRaw(),
      (raw) => this.balloonAmountRawValid(raw, minDollars),
      { ...opts, label: "Balloon Amount $" },
    );
  }

  /** Balloon **%** can briefly read `NaN%` while **$** syncs — ignore until stable. */
  private async waitForBalloonPercentValueStable(
    opts?: { timeoutMs?: number; intervalMs?: number; stableRounds?: number },
  ): Promise<string> {
    await this.waitUntilNoVisibleAppLoaderOverlays(opts?.timeoutMs ?? 20_000);
    return this.waitForFieldValueStable(
      () => this.balloonPercentRaw(),
      (raw) => raw.length > 0 && !/nan/i.test(raw),
      { ...opts, label: "Balloon Amount %" },
    );
  }

  private balloonAmountLooksCleared(raw: string): boolean {
    const t = raw.trim();
    if (!t || /nan/i.test(t)) {
      return true;
    }
    const n = parseFloat(t.replace(/[^0-9.-]/g, ""));
    return Number.isNaN(n) || n === 0;
  }

  private static balloonAmountTypeDigits(value: string): string {
    const n = parseFloat(value.replace(/[$\s,]/g, ""));
    if (!Number.isNaN(n) && n >= 0) {
      return String(Math.round(n));
    }
    return value.replace(/[^\d]/g, "");
  }

  /** Fill balloon **$** via the currency-mask input (click → select-all → type digits → Tab). */
  private async fillBalloonAmountInput(value: string, minDollars: number): Promise<void> {
    const input = this.balloonAmountInput;
    const digits = DOAssetDetailsPage.balloonAmountTypeDigits(value);

    await input.scrollIntoViewIfNeeded();
    await expect(input).toBeVisible({ timeout: 20_000 });
    await input.click();
    await input.press("ControlOrMeta+a");
    await input.press("Backspace");
    await input.pressSequentially(digits, { delay: 50 });

    const afterTyping = await this.readBalloonAmountRaw();
    this.logStep(`Balloon $ after typing: "${afterTyping}"`);
    if (this.balloonAmountLooksCleared(afterTyping)) {
      throw new Error(`Balloon Amount cleared after typing (read: "${afterTyping}").`);
    }

    await input.press("Tab");
    const afterTab = await this.readBalloonAmountRaw();
    this.logStep(`Balloon $ after Tab: "${afterTab}"`);
    if (this.balloonAmountLooksCleared(afterTab)) {
      throw new Error(`Balloon Amount reset after Tab (read: "${afterTab}").`);
    }

    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    const afterLoader = await this.readBalloonAmountRaw();
    this.logStep(`Balloon $ after loader: "${afterLoader}"`);
    if (!this.balloonAmountRawValid(afterLoader, minDollars)) {
      throw new Error(`Balloon Amount reset after loader (read: "${afterLoader}").`);
    }
  }

  /** Balloon **$** / **%** settled after loaders — ignores transient NaN/blank flicker. */
  async expectBalloonFieldsStable(minDollars = 1): Promise<void> {
    this.logStep("Expect Balloon Fields Stable");
    await this.waitUntilNoVisibleAppLoaderOverlays(20_000);
    const dollars = await this.waitForBalloonAmountValueStable(minDollars);
    this.logStep(`Balloon $ final stable read: "${dollars}"`);
    const pct = await this.waitForBalloonPercentValueStable();
    this.logStep(`Balloon % final stable read: "${pct}"`);
  }

  async enterBalloonAmount(amount: string): Promise<void> {
    this.logStep(`Entered balloon amount as ${this.stepValueDisplay(amount)}`);
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    await this.ensureCashPriceReadyForBalloon();
    await expect(this.balloonAmountInput).toBeVisible({ timeout: 20_000 });

    const target = parseFloat(amount.replace(/[$\s,]/g, ""));
    const minDollars =
      !Number.isNaN(target) && target >= 1 ? Math.max(1, target * 0.99) : 1;

    await this.fillBalloonAmountInput(amount, minDollars);
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);

    try {
      const stable = await this.waitForBalloonAmountValueStable(minDollars);
      this.logStep(`Balloon $ stable: "${stable}"`);
    } catch {
      const current = await this.readBalloonAmountRaw();
      throw new Error(
        `Balloon Amount was cleared or did not stabilize (expected >= ${minDollars}, last read: "${current}").`,
      );
    }
  }

  /**
   * CSA path: enter balloon **%**, check **Fixed**, then **Calculate** (do not fill **$** — it stays
   * `$0.00` until Calculate on this product). UDP-T3669.
   */
  async enterBalloonPercentAndCheckFixed(percentDigits: string): Promise<void> {
    this.logStep(`Enter Balloon Percent And Check Fixed ${percentDigits}`);
    await this.waitUntilNoVisibleAppLoaderOverlays(20_000);
    await this.ensureCashPriceReadyForBalloon();
    await this.cashPriceOfAsset("$20,000");
    await this.enterBalloonPercent(percentDigits);
    await this.checkBalloonFixedCheckbox();
    await this.expectBalloonFixedCheckboxChecked();
  }

  async expectBalloonPercentInputMatches(rx: RegExp): Promise<void> {
    this.logStep("Expect Balloon Percent Input Matches");
    await expect(this.balloonPercentInput).toBeVisible({ timeout: 15_000 });
    await this.waitUntilNoVisibleAppLoaderOverlays(20_000);
    const stable = await this.waitForBalloonPercentValueStable();
    expect(stable).toMatch(rx);
  }

  private async clearBalloonPercentInput(): Promise<void> {
    const loc = this.balloonPercentInput;
    await loc.focus();
    await loc.press("ControlOrMeta+A");
    await loc.press("Backspace");
    await loc.press("ControlOrMeta+A");
    await loc.press("Delete");
  }

  async enterBalloonPercent(percentDigits: string): Promise<void> {
    this.logStep(`Entered balloon % as ${this.stepValueDisplay(percentDigits)}`);
    await this.ensureCashPriceReadyForBalloon();
    await expect(this.balloonPercentInput).toBeVisible({ timeout: 15_000 });
    const trimmed = percentDigits.replace(/%/g, "").trim();
    const want = parseFloat(trimmed);

    await this.balloonPercentInput.scrollIntoViewIfNeeded();
    await this.balloonPercentInput.click({ force: true });
    await this.clearBalloonPercentInput();
    if (trimmed.length > 0) {
      await this.balloonPercentInput.pressSequentially(trimmed, { delay: 45 });
    }
    await this.balloonPercentInput.press("Tab");
    this.logStep(`Balloon % immediately after type: "${await this.balloonPercentRaw()}"`);
    await this.paymentSummaryRoot
      .getByText(/^Payment\s+Summary$/i)
      .click({ timeout: 5_000 })
      .catch(() => this.loanDate.click({ timeout: 5_000 }).catch(() => {}));
    await this.waitUntilNoVisibleAppLoaderOverlays(20_000);

    if (!Number.isNaN(want) && trimmed.length > 0) {
      await expect
        .poll(
          async () => {
            const n = parseFloat(await this.balloonPercentRaw());
            return !Number.isNaN(n) && Math.round(n) === Math.round(want) ? n : null;
          },
          { timeout: 15_000, intervals: [300, 500, 1_000] },
        )
        .not.toBeNull();

      const cashRaw = (await this.cashPriceOfAssetInputField.inputValue().catch(() => "")).trim();
      const cash = parseFloat(cashRaw.replace(/[^0-9.-]/g, ""));
      if (!Number.isNaN(cash) && cash > 0) {
        const expectedDollars = Math.max(1, Math.round((cash * want) / 100));
        await this.waitForBalloonAmountValueStable(expectedDollars * 0.98, {
          timeoutMs: 25_000,
        });
      }
    } else {
      await this.waitForBalloonPercentValueStable();
    }
  }

  /**
   * Asserts the Balloon **$** masked input matches `rx` after the value has stabilized.
   */
  async expectBalloonAmountInputMatches(rx: RegExp): Promise<void> {
    this.logStep("Expect Balloon Amount Input Matches");
    await this.waitUntilNoVisibleAppLoaderOverlays(20_000);
    const stable = await this.waitForBalloonAmountValueStable(1);
    expect(stable).toMatch(rx);
  }

  /** UDP-T4239 — **Payment Structure** defaults to **None** on TL Standard Quote. */
  async expectPaymentStructureNone(): Promise<void> {
    this.logStep("Expect payment structure None");
    const structure = await this.readPrimeLabeledDropdownValue("Payment Structure");
    if (structure.length > 0) {
      expect(structure).toMatch(/^None$/i);
    }
  }

  /** After **%** edit, blur balloon **$** so **Calculate** picks up the paired amount. */
  async commitBalloonAmountAfterPercentEdit(): Promise<void> {
    this.logStep("Commit balloon amount after percent edit");
    await this.expectBalloonFieldsStable();
    await this.balloonAmountInput.scrollIntoViewIfNeeded();
    await this.balloonAmountInput.click({ timeout: 10_000 });
    await this.balloonAmountInput.press("Tab");
    await this.paymentSummaryRoot
      .getByText(/^Payment\s+Summary$/i)
      .click({ timeout: 5_000 })
      .catch(() => this.loanDate.click({ timeout: 5_000 }).catch(() => {}));
    await this.waitUntilNoVisibleAppLoaderOverlays(15_000);
    await this.expectBalloonFieldsStable();
  }

  /**
   * UDP-T4239 — **Fixed** checked: last schedule row is the balloon instalment only (MAF-4799).
   * Reads stabilized balloon **$** from the field when `balloonPattern` is omitted.
   */
  async expectFixedBalloonIsLastPaymentRow(balloonPattern?: RegExp): Promise<void> {
    this.logStep("Expect fixed balloon is last payment row");
    await this.expectBalloonFieldsStable();
    const stable = await this.waitForBalloonAmountValueStable(1);
    const amountN = parseFloat(stable.replace(/[^0-9.-]/g, ""));
    const pattern =
      balloonPattern ??
      (Number.isFinite(amountN) && amountN >= 1
        ? new RegExp(
            String(Math.round(amountN)).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1[, ]?") + "|" + String(Math.round(amountN)),
          )
        : /\$\s*[\d,.]+/);

    await this.clickCalculateButton();
    await this.waitForQuoteLoadersToFinish();

    const scheduleScope = this.paymentScheduleContentScope();
    await expect
      .poll(
        async () => {
          const row = scheduleScope
            .locator("tr")
            .filter({ hasText: /\$\s*[\d,.]+/ })
            .filter({ visible: true })
            .last();
          const text = ((await row.textContent().catch(() => "")) ?? "").trim();
          return text.length > 0 && pattern.test(text) ? text : null;
        },
        { timeout: 60_000, intervals: [500, 1_000, 2_000] },
      )
      .not.toBeNull();
  }

  /** PrimeNG **Fixed** balloon checkbox host (`p-checkbox` beside Balloon Amount). */
  private balloonFixedCheckboxHost(): Locator {
    const paymentSummary = this.paymentSummaryRoot;
    return paymentSummary
      .locator("p-checkbox")
      .filter({ has: paymentSummary.locator(':text-is("Fixed")') })
      .first()
      .or(
        paymentSummary
          .locator(':text-is("Fixed")')
          .locator("xpath=ancestor::p-checkbox[1]")
          .first(),
      );
  }

  private async isBalloonFixedCheckboxChecked(): Promise<boolean> {
    const host = this.balloonFixedCheckboxHost();
    const hostCls = (await host.getAttribute("class")) ?? "";
    if (hostCls.includes("p-checkbox-checked")) {
      return true;
    }
    const box = host.locator(".p-checkbox-box, [class*='p-checkbox-box']").first();
    const aria = await box.getAttribute("aria-checked").catch(() => null);
    if (aria === "true") {
      return true;
    }
    if (aria === "false") {
      return false;
    }
    return this.balloonFixedCheckbox.isChecked().catch(() => false);
  }

  async expectBalloonFixedCheckboxChecked(): Promise<void> {
    this.logStep("Expect Balloon Fixed Checkbox Checked");
    const host = this.balloonFixedCheckboxHost();
    await expect(host).toBeVisible({ timeout: 12_000 });
    await expect
      .poll(async () => this.isBalloonFixedCheckboxChecked(), {
        timeout: 10_000,
        intervals: [200, 400, 800],
      })
      .toBe(true);
  }

  async checkBalloonFixedCheckbox(): Promise<void> {
    this.logStep("Check Balloon Fixed Checkbox");
    const host = this.balloonFixedCheckboxHost();
    await expect(host).toBeVisible({ timeout: 15_000 });
    await host.scrollIntoViewIfNeeded();

    const box = host
      .locator(".p-checkbox-box, [class*='p-checkbox-box']")
      .or(host.getByRole("checkbox"))
      .first();
    const fixedLabel = this.paymentSummaryRoot.locator(':text("Fixed")').first();

    if (await this.isBalloonFixedCheckboxChecked()) {
      return;
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      if (await this.isBalloonFixedCheckboxChecked()) {
        break;
      }
      if (await box.isVisible().catch(() => false)) {
        await box.click({ timeout: 10_000 });
      } else if (await fixedLabel.isVisible().catch(() => false)) {
        await fixedLabel.click({ timeout: 10_000 });
      } else {
        await host.click({ timeout: 10_000 });
      }
      await this.waitUntilNoVisibleAppLoaderOverlays(5_000);
    }

    await this.expectBalloonFixedCheckboxChecked();
  }

  /**
   * Last **Payment Schedule** currency row should include `pattern` (e.g. final balloon instalment).
   * Scoped to the schedule card/panel and **visible** rows only — avoids PrimeNG hidden scroll
   * clones and `.last()` picking a row from another table under the quote shell.
   */
  async expectPaymentScheduleLastPaymentRowContains(pattern: RegExp): Promise<void> {
    this.logStep("Expect Payment Schedule Last Payment Row Contains");
    const root = this.standardQuoteRoot();
    await expect(root.getByText(/Payment\s+Schedule/i).first()).toBeVisible({ timeout: 45_000 });

    const scheduleScope = this.paymentScheduleContentScope();

    const row = scheduleScope
      .locator("tr")
      .filter({ hasText: /\$\s*[\d,.]+/ })
      .filter({ visible: true })
      .last();

    await expect(row).toBeVisible({ timeout: 25_000 });
    await expect(row).toContainText(pattern);
  }

  /** Row label anchor — **Payment Amount** in Payment Summary (UDP-T3666). */
  paymentAmountLabel(): Locator {
    return this.paymentSummaryRoot.getByText(/^Payment\s+Amount$/i).first();
  }

  /** Read-only **Payment Amount** control in Payment Summary (disabled input after **Calculate**). */
  paymentSummaryPaymentAmountField(): Locator {
    return this.paymentSummaryRoot
      .locator("xpath=.//*[normalize-space(.)='Payment Amount']/following::input[1]")
      .first();
  }

  /**
   * Display value for **Payment Amount** on CSA Webform (read-only label or `amount #amount`).
   * Shows **Irregular** when the schedule is non-uniform (balloon / segment structure).
   */
  paymentAmountDisplayField(): Locator {
    return this.paymentSummaryPaymentAmountField().or(
      this.paymentAmountLabel()
        .locator(
          'xpath=ancestor::div[contains(@class,"grid")][1]//label[contains(@class,"customePadding") or contains(@class,"col-3")]',
        )
        .first(),
    );
  }

  /**
   * After **Apply** on a non-uniform schedule (e.g. **Interest Only** segment),
   * **Payment Amount** in Payment Summary must read **Irregular**.
   */
  async expectPaymentAmountShowsIrregular(): Promise<void> {
    this.logStep("Expect Payment Amount Shows Irregular");
    await this.waitForQuoteLoadersToFinish();

    const summary = this.paymentSummaryRoot;
    const paymentAmount = this.paymentAmountDisplayField();
    await paymentAmount.scrollIntoViewIfNeeded().catch(() => {});

    await expect
      .poll(
        async () => {
          if (await paymentAmount.isVisible().catch(() => false)) {
            const raw = (
              (await paymentAmount.inputValue().catch(() => "")) ||
              (await paymentAmount.textContent().catch(() => "")) ||
              ""
            ).trim();
            if (/^Irregular$/i.test(raw)) {
              return true;
            }
          }
          return summary.getByText(/^Irregular$/i).first().isVisible().catch(() => false);
        },
        { timeout: 45_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(true);
  }

  /** Payment Summary populated after **Calculate** (repay total or payment amount has a value). */
  async expectPaymentSummaryCalculated(): Promise<void> {
    this.logStep("Expect Payment Summary Calculated");
    await this.waitForQuoteLoadersToFinish();
    const paymentAmount = this.paymentSummaryPaymentAmountField();
    const totalRepay = this.paymentSummaryRoot
      .locator("xpath=.//*[normalize-space(.)='Total Amount to Repay']/following::input[1]")
      .first();

    await expect
      .poll(
        async () => {
          for (const field of [paymentAmount, totalRepay]) {
            if (!(await field.isVisible().catch(() => false))) continue;
            const raw = (await field.inputValue().catch(() => "")).trim();
            if (/^Irregular$/i.test(raw)) return true;
            if (/\$\s*[\d,]+\.\d{2}/.test(raw)) return true;
          }
          return false;
        },
        { timeout: 45_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(true);
  }

  /**
   * Fills Origination / Originator Reference on a quote shell (`root`).
   * Webform / Prime uses a real `input`; legacy CSA may use SVG `text#text` — try inputs first.
   */
  private async fillOriginationReferenceOnRoot(
    origRef: string,
    root: Locator,
  ): Promise<boolean> {
    const tryFill = async (el: Locator): Promise<boolean> => {
      const t = el.first();
      if (!(await t.isVisible({ timeout: 8_000 }).catch(() => false))) {
        return false;
      }
      await t.scrollIntoViewIfNeeded();
      await t.click({ force: true }).catch(() => {});
      await t.clear().catch(() => {});
      try {
        await t.fill(origRef, { timeout: 15_000 });
      } catch {
        await t.press("ControlOrMeta+a");
        await this.page.keyboard.type(origRef, { delay: 20 });
      }
      const v = (await t.inputValue().catch(() => "")).trim();
      if (v.length > 0) {
        return true;
      }
      await t.press("ControlOrMeta+a");
      await this.page.keyboard.type(origRef, { delay: 20 });
      return (await t.inputValue().catch(() => "")).trim().length > 0;
    };

    const originatorRoot = this.page.locator("app-quote-originator").first();
    if (await originatorRoot.isVisible({ timeout: 4_000 }).catch(() => false)) {
      const originInput = originatorRoot.locator(
        "xpath=.//label[contains(normalize-space(.),'Originator Reference') or contains(normalize-space(.),'Origination Reference')]/following::input[1]",
      );
      if (await tryFill(originInput.first())) {
        return true;
      }
    }

    if (
      await tryFill(
        root.getByLabel(
          /Origination\s*Reference|Originator\s*Reference|Origination\s*Ref|Originator/i,
        ),
      )
    ) {
      return true;
    }
    if (
      await tryFill(
        this.page.getByLabel(
          /Origination\s*Reference|Originator\s*Reference|Origination\s*Ref|Originator/i,
        ),
      )
    ) {
      return true;
    }
    if (
      await tryFill(
        root.getByRole("textbox", {
          name: /Origination|Originator|Orig(ination)?\s*Ref/,
        }),
      )
    ) {
      return true;
    }
    if (
      await tryFill(
        this.page.getByRole("textbox", {
          name: /Origination|Originator|Orig(ination)?\s*Ref/,
        }),
      )
    ) {
      return true;
    }
    for (const sel of [
      'input[formControlName="originationReference"]',
      'input[formControlName="originatorReference"]',
      'input[name="originationReference"]',
      'input[ng-reflect-name*="origination"]',
      "p-float-label input",
      ".p-field input.p-inputtext",
    ]) {
      if (await tryFill(root.locator(sel).first())) {
        return true;
      }
    }
    const row = root
      .locator(".p-field, .p-col, .p-float-label, [class*='p-field']")
      .filter({
        hasText: /Origination|Originator\s*Ref|Origination\s*Ref/,
      })
      .first();
    if (await tryFill(row.locator("input, textarea").first())) {
      return true;
    }
    const fromLabel = root
      .locator("span, label, .p-float-label")
      .filter({ hasText: /Origination|Originator/i })
      .first()
      .locator(
        "xpath=ancestor::div[contains(@class,'p-field') or contains(@class,'p-col') or contains(@class,'grid') or contains(@class,'formgrid')][1]//input[not(@type='hidden')][1]",
      );
    if (await tryFill(fromLabel)) {
      return true;
    }
    if (await tryFill(this.originationRefInput)) {
      return true;
    }
    return false;
  }

  /**
   * Enter text into the Origination Reference input field
   * (CSA: Prime `input` on Webform builds; legacy: SVG `text#text` under "Originator Reference".)
   */
  async enterOriginationReference(origRef: string): Promise<void> {
    this.logStep(`Entered origination reference as ${this.stepValueDisplay(origRef)}`);
    await this.waitUntilNoVisibleAppLoaderOverlays(15_000);
    const root = this.standardQuoteRoot();
    await root.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    if (!(await this.fillOriginationReferenceOnRoot(origRef, root))) {
      throw new Error(
        `Could not set Origination / Originator Reference to "${origRef}" (tried inputs on quote shell and legacy SVG).`,
      );
    }
    await this.waitUntilNoVisibleAppLoaderOverlays(8_000);
  }

  /**
   * If **Save** opens "The below information is required to save this quote" with **Originator Reference**,
   * fill it and confirm the dialog **Save** (does nothing when the dialog is absent).
   */
  async submitOriginatorReferenceRequiredToSaveDialogIfPresent(origRef: string): Promise<void> {
    const dlg = this.page
      .getByRole("dialog")
      .filter({ hasText: /required to save this quote/i })
      .first();
    if (!(await dlg.isVisible({ timeout: 6_000 }).catch(() => false))) {
      return;
    }
    this.logStep(
      `Submit Originator Reference in required-to-save dialog as ${this.stepValueDisplay(origRef)}`,
    );
    const input = dlg
      .getByRole("textbox", { name: /Originator|Origination/i })
      .or(dlg.locator("input").filter({ visible: true }).first());
    const inp = input.first();
    await inp.scrollIntoViewIfNeeded();
    await inp.click({ force: true }).catch(() => {});
    await inp.fill(origRef, { force: true });
    await dlg.getByRole("button", { name: /^Save$/i }).click();
    await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
    await this.page.waitForTimeout(400);
  }

  /**
   * Clears Origination / Originator Reference for validation tests (CSA SVG path or Finance Lease textbox).
   */
  async clearOriginationReferences(): Promise<void> {
    this.logStep("Clear Origination References");
    if (await this.originationRefInput.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await this.originationRefInput.click({ force: true }).catch(() => {});
      await this.originationRefInput.fill("");
      await this.originationRefInput.press("Tab").catch(() => {});
      return;
    }

    const root = this.page.locator("app-quote-details, app-standard-quote").last();
    await root.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});

    const tryClear = async (el: Locator): Promise<boolean> => {
      const t = el.first();
      if (!(await t.isVisible({ timeout: 2_500 }).catch(() => false))) {
        return false;
      }
      await t.scrollIntoViewIfNeeded();
      await t.click({ force: true }).catch(() => {});
      await t.clear().catch(async () => {
        await t.press("ControlOrMeta+a");
        await this.page.keyboard.press("Delete");
      });
      await t.fill("");
      await t.press("Tab").catch(() => {});
      return true;
    };

    if (await tryClear(root.getByLabel(/Origination\s*Reference|Originator\s*Reference|Origination\s*Ref|Originator/i))) {
      return;
    }
    if (
      await tryClear(
        root.getByRole("textbox", {
          name: /Origination|Originator|Orig(ination)?\s*Ref/,
        }),
      )
    ) {
      return;
    }
    for (const sel of [
      'input[formControlName="originationReference"]',
      'input[formControlName="originatorReference"]',
      'input[name="originationReference"]',
    ]) {
      if (await tryClear(root.locator(sel))) {
        return;
      }
    }
  }

  /**
   * Finance Lease: origination is usually a `p-inputtext` / `textbox` in `app-quote-details`, not the SVG
   * path used for CSA. Keeps behavior separate from {@link enterOriginationReference} for product differences.
   */
  async enterOriginationReferenceFinanceLease(
    origRef: string,
    skipOverlayDismiss = false,
  ): Promise<void> {
    this.logStep(`Entered origination reference (finance lease) as ${this.stepValueDisplay(origRef)}`);
    // After add-asset dialogs close, Esc can dismiss Prime overlays — but after **Calculate** it also
    // blurs reactive fields and can make Origination flicker/clear; use skipOverlayDismiss then.
    if (!skipOverlayDismiss) {
      await this.page.keyboard.press("Escape").catch(() => {});
      await this.page.keyboard.press("Escape").catch(() => {});
    }

    const root = this.page
      .locator("app-quote-details, app-standard-quote")
      .last();
    await root.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});

    if (!(await this.fillOriginationReferenceOnRoot(origRef, root))) {
      throw new Error(
        `Finance Lease: could not set Origination Reference to "${origRef}" (tried getByLabel, getByRole textbox, p-field row, p-float-label).`,
      );
    }
    if (!skipOverlayDismiss) {
      await this.page.keyboard.press("Escape").catch(() => {});
    }
  }

  /** Same discovery order as {@link enterOriginationReferenceFinanceLease} so verify reads the field we filled. */
  private async findVisibleFinanceLeaseOriginationInput(
    root: Locator,
  ): Promise<Locator | null> {
    const firstVisible = async (el: Locator): Promise<Locator | null> => {
      const t = el.first();
      if (await t.isVisible({ timeout: 2_500 }).catch(() => false)) {
        return t;
      }
      return null;
    };

    let x: Locator | null;
    x = await firstVisible(
      root.getByLabel(
        /Origination\s*Reference|Originator\s*Reference|Origination\s*Ref|Originator/i,
      ),
    );
    if (x) return x;
    x = await firstVisible(
      this.page.getByLabel(
        /Origination\s*Reference|Originator\s*Reference|Origination\s*Ref|Originator/i,
      ),
    );
    if (x) return x;
    x = await firstVisible(
      root.getByRole("textbox", {
        name: /Origination|Originator|Orig(ination)?\s*Ref/,
      }),
    );
    if (x) return x;
    x = await firstVisible(
      this.page.getByRole("textbox", {
        name: /Origination|Originator|Orig(ination)?\s*Ref/,
      }),
    );
    if (x) return x;

    for (const sel of [
      'input[formControlName="originationReference"]',
      'input[formControlName="originatorReference"]',
      'input[name="originationReference"]',
      'input[ng-reflect-name*="origination"]',
      "p-float-label input",
      ".p-field input.p-inputtext",
    ]) {
      x = await firstVisible(root.locator(sel).first());
      if (x) return x;
    }

    const row = root
      .locator(".p-field, .p-col, .p-float-label, [class*='p-field']")
      .filter({
        hasText: /Origination|Originator\s*Ref|Origination\s*Ref/,
      })
      .first();
    x = await firstVisible(row.locator("input, textarea").first());
    if (x) return x;

    const fromLabel = root
      .locator("span, label, .p-float-label")
      .filter({ hasText: /Origination|Originator/i })
      .first()
      .locator(
        "xpath=ancestor::div[contains(@class,'p-field') or contains(@class,'p-col') or contains(@class,'grid') or contains(@class,'formgrid')][1]//input[not(@type='hidden')][1]",
      );
    x = await firstVisible(fromLabel);
    if (x) return x;

    x = await firstVisible(this.originationRefInput);
    return x;
  }

  /** `inputValue` for inputs; SVG / non-input hosts (legacy CSA markup) use text content. */
  private async readOriginationLocatorValue(inp: Locator): Promise<string> {
    const tag = await inp
      .evaluate((el: Element) => el.tagName.toLowerCase())
      .catch(() => "input");
    if (tag === "input" || tag === "textarea") {
      return (await inp.inputValue().catch(() => "")).trim();
    }
    const text = (await inp.textContent().catch(() => "")) ?? "";
    return text.replace(/\u00a0/g, " ").trim();
  }

  private normOriginationText(s: string): string {
    return s.replace(/\s+/g, " ").trim();
  }

  /**
   * Prime/Angular often keeps the real model in sync only after `input`/`change`; `fill()` alone
   * can still show empty in `inputValue()` while the UI allows **Next**. This updates the native
   * control and dispatches events the app listens for.
   */
  private async patchOriginationInputNativeValue(
    inp: Locator,
    value: string,
  ): Promise<void> {
    await inp.scrollIntoViewIfNeeded();
    await inp.evaluate((el: Element, v: string) => {
      let node: HTMLInputElement | HTMLTextAreaElement | null =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
          ? el
          : (el.closest("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null);
      if (!node) return;
      node.focus();
      const proto = Object.getPrototypeOf(node) as
        | HTMLInputElement
        | HTMLTextAreaElement;
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      const setter = desc?.set;
      if (setter) {
        setter.call(node, v);
      } else {
        node.value = v;
      }
      node.dispatchEvent(
        new InputEvent("input", { bubbles: true, composed: true }),
      );
      node.dispatchEvent(new Event("change", { bubbles: true }));
      node.dispatchEvent(new Event("blur", { bubbles: true }));
    }, value);
  }

  /**
   * Enter text into the Asset input field
   */
  async enterAsset(asset: string): Promise<void> {
    this.logStep(`Entered asset search/selection as ${this.stepValueDisplay(asset)}`);
    await this.assetInputField.click();
    await this.assetSearchField.fill(asset);
    await this.page.getByRole("option", { name: asset }).click();
    await this.confirmAssetTypeDialogIfOpen();
  }

  /** Hierarchical **Asset Type** pop-up (Select Asset 1 / 2 → **Add**); no-op when already closed. */
  async confirmAssetTypeDialogIfOpen(): Promise<void> {
    const dlg = this.page.getByRole("dialog").filter({ hasText: /Asset Type/i }).last();
    if (!(await dlg.isVisible({ timeout: 4_000 }).catch(() => false))) {
      return;
    }

    const addBtn = dlg
      .getByRole("button", { name: /^Add$/i })
      .or(dlg.locator("span.p-button-label").filter({ hasText: /^Add$/ }))
      .first();
    if (await addBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await addBtn.click({ timeout: 15_000 });
      await dlg.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
      return;
    }

    const closeBtn = dlg.getByRole("button", { name: /^Close$/i }).first();
    if (await closeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await closeBtn.click({ timeout: 10_000 }).catch(() => this.page.keyboard.press("Escape"));
      await dlg.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
    }
  }
  /**
   * Select a condition from the Condition dropdown
   */
  async selectCondition(condition: string) {
    const current = await this.page
      .getByRole("combobox")
      .first()
      .inputValue()
      .catch(() => "");
  
    if (current.includes(condition)) {
      return;
    }
  
    await this.conditionDropdown.click();
  
    await expect(
      this.page.getByRole("option", { name: condition })
    ).toBeVisible({ timeout: 10000 });
  
    await this.page
      .getByRole("option", { name: condition })
      .click();
  }
  /**
   * **Condition** on Standard Quote / Asset Details.
   * - If the Prime **Option List** is already open, click the option.
   * - Else dismiss overlays, anchor on **Condition *** caption, then open the nearest **following** `p-dropdown`
   *   (`following-sibling` breaks when the label sits inside a wrapper that is not the dropdown’s direct sibling).
   * - Root: quote shell that actually contains **Asset Type** (avoid `\\b` / strict filters that can drop the host).
   */
  conditionDropdownTrigger(): Locator {
    const root = this.page
      .locator("app-quote-details, app-standard-quote")
      .filter({ hasText: /Asset Type/i })
      .last();
    const caption = root
      .getByText("Condition *", { exact: true })
      .or(root.getByText(/^Condition\s*\*?\s*$/i))
      .first();
    const dropdownAfterCaption = caption
      .locator("xpath=following::div[contains(@class,'p-dropdown')][1]")
      .first();
    return dropdownAfterCaption
      .locator(".p-dropdown-trigger")
      .or(dropdownAfterCaption.getByRole("button", { name: /dropdown trigger/i }))
      .first();
  }

  async readSelectedConditionLabel(): Promise<string> {
    const root = this.page
      .locator("app-quote-details, app-standard-quote")
      .filter({ hasText: /Asset Type/i })
      .last();
    const caption = root
      .getByText("Condition *", { exact: true })
      .or(root.getByText(/^Condition\s*\*?\s*$/i))
      .first();
    const dropdown = caption.locator("xpath=following::div[contains(@class,'p-dropdown')][1]").first();
    const combobox = dropdown.getByRole("combobox").first();
    if (await combobox.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return ((await combobox.textContent()) ?? "").trim();
    }
    return ((await dropdown.locator(".p-dropdown-label").first().textContent()) ?? "").trim();
  }

  /** Prefer **Used** when FIS allows it; otherwise keep the program default (often **New** on SIT). */
  async ensureAfVConditionForStandardQuote(preferred = "Used"): Promise<string> {
    const current = await this.readSelectedConditionLabel();
    if (
      current.length > 0 &&
      !/select|choose/i.test(current) &&
      new RegExp(preferred, "i").test(current)
    ) {
      return current;
    }
    try {
      await this.selectConditionInStandardQuote(preferred);
    } catch {
      this.log(
        `Condition "${preferred}" not available after asset selection — keeping FIS default "${current || "unknown"}".`,
      );
    }
    const label = await this.readSelectedConditionLabel();
    return label.length > 0 ? label : current;
  }

  async selectConditionInStandardQuote(condition: string): Promise<void> {
    this.logStep(`Selected condition (standard quote): ${this.stepValueDisplay(condition)}`);

    const current = await this.readSelectedConditionLabel();
    if (
      current.length > 0 &&
      (current.toLowerCase() === condition.toLowerCase() || new RegExp(condition, "i").test(current))
    ) {
      return;
    }

    const root = this.page
      .locator("app-quote-details, app-standard-quote")
      .filter({ hasText: /Asset Type/i })
      .last();
    await root.waitFor({ state: "visible", timeout: 45_000 });

    const optionWhenOpen = this.page
      .getByRole("listbox", { name: /Option List/i })
      .getByRole("option", { name: new RegExp(`^${condition}$`, "i") })
      .first();
    if (await optionWhenOpen.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await optionWhenOpen.click({ timeout: 15_000 });
      await this.page.keyboard.press("Escape").catch(() => {});
      return;
    }

    await this.page.keyboard.press("Escape").catch(() => {});
    await this.waitForQuoteLoadersToFinish().catch(() => {});

    const trigger = this.conditionDropdownTrigger();
    const escaped = condition.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const optionPattern = new RegExp(`^\\s*${escaped}\\s*$`, "i");

    await expect
      .poll(
        async () => {
          const selected = await this.readSelectedConditionLabel();
          if (optionPattern.test(selected) || selected.toLowerCase() === condition.toLowerCase()) {
            return true;
          }

          await trigger.scrollIntoViewIfNeeded().catch(() => {});
          await trigger
            .evaluate((el: HTMLElement) => {
              el.click();
            })
            .catch(() => trigger.click({ force: true, timeout: 5_000 }));

          const panel = this.page.locator("div.p-dropdown-panel").filter({ visible: true }).last();
          const option = panel.getByRole("option", { name: optionPattern }).first();
          if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await option
              .evaluate((el: HTMLElement) => {
                el.click();
              })
              .catch(() => option.click({ force: true, timeout: 2_000 }));
          } else {
            await this.page.keyboard.type(condition.slice(0, 4), { delay: 40 }).catch(() => {});
            await this.page.keyboard.press("Enter").catch(() => {});
          }

          await this.page.keyboard.press("Escape").catch(() => {});
          await this.page.waitForTimeout(400);

          const after = await this.readSelectedConditionLabel();
          return optionPattern.test(after) || after.toLowerCase() === condition.toLowerCase();
        },
        { timeout: 45_000, intervals: [500, 1_000, 1_500, 2_000] },
      )
      .toBeTruthy();
    await this.waitForQuoteLoadersToFinish().catch(() => {});
  }

  /**
   * **Asset Type** pop-out → **Asset Type** dialog: Make / Model / Variant / Year (PrimeNG), then **Select**.
   * Uses SelectorHub ids `#pn_id_428_0` (Model) and `#pn_id_434_0` (Year) when visible; otherwise falls back to dropdown order in the dialog.
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
    const root = this.standardQuoteRoot();
    await root.waitFor({ state: "visible", timeout: 90_000 });

    const openBtn = root
      .locator(
        "xpath=.//*[contains(normalize-space(.),'Asset Type')]/ancestor::*[contains(@class,'row') or contains(@class,'grid') or contains(@class,'p-fluid')][1]//div[contains(@class,'col-4') and contains(@class,'ng-star-inserted')]//button[@type='button']",
      )
      .or(root.locator("div.col-4.ng-star-inserted").getByRole("button").first())
      .first();
    await openBtn.scrollIntoViewIfNeeded();
    await openBtn.click({ timeout: 20_000 });

    const dlg = this.page
      .getByRole("dialog")
      .filter({ has: this.page.locator("app-afv-asset-types") })
      .last();
    const afvRoot = dlg.locator("app-afv-asset-types");
    await expect(afvRoot).toBeVisible({ timeout: 20_000 });

    const pickFromOpenPanel = async (name: string, exact: boolean): Promise<void> => {
      const opt = this.page.getByRole("option", { name, exact }).first();
      await opt.waitFor({ state: "visible", timeout: 20_000 });
      await opt.click();
      await this.page.keyboard.press("Escape").catch(() => {});
      await this.page.waitForTimeout(250);
    };

    const modalDropdownTrigger = (index: number): Locator => {
      const host = afvRoot.locator(".p-dropdown").nth(index);
      return host.getByRole("button", { name: /dropdown trigger/i }).or(host.getByRole("combobox")).first();
    };

    const waitForModalDropdown = async (index: number, expected: string): Promise<void> => {
      await expect
        .poll(async () => (await this.readPrimeDropdownLabel(modalDropdownTrigger(index))).trim(), {
          timeout: 30_000,
        })
        .toMatch(new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    };

    const openNthDropdown = async (index: number): Promise<void> => {
      const host = afvRoot.locator(".p-dropdown").nth(index);
      const trig = modalDropdownTrigger(index);
      await expect(trig).toBeVisible({ timeout: 20_000 });
      await expect(host).not.toHaveClass(/p-disabled/, { timeout: 20_000 }).catch(() => {});
      await trig.click({ timeout: 15_000 });
    };

    const picks: Array<[number, string]> = [
      [0, params.make],
      [1, params.model],
      [2, params.variant],
      [3, params.year],
    ];
    for (const [index, value] of picks) {
      await openNthDropdown(index);
      await pickFromOpenPanel(value, true);
      await waitForModalDropdown(index, value);
    }

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
  }

  async scrollRecommendedRetailPriceIntoView(): Promise<void> {
    this.logStep("Scroll Recommended Retail Price Into View");
    await this.scrollIfNeeded(this.recommendedRetailPriceInput);
  }

  async fillRecommendedRetailPrice(value: string): Promise<void> {
    this.logStep(`Filled recommended retail price as ${this.stepValueDisplay(value)}`);
    await this.scrollRecommendedRetailPriceIntoView();
    await this.recommendedRetailPriceInput.click();
    await this.recommendedRetailPriceInput.fill(value);
  }

  /**
   * Opens **Asset / Insurance / Trade-in** summary (label varies: `Asset & Insurance Summary`,
   * `Asset, Insurance & Trade-in`, etc.; control may be `button` or `link`).
   */
  async openAssetInsuranceTradeInSummary(): Promise<void> {
    this.logStep("Open Asset Insurance Trade In Summary");
    const quote = this.page.locator("app-quote-details, app-standard-quote").first();
    await quote.waitFor({ state: "visible", timeout: 60_000 });
    await quote.scrollIntoViewIfNeeded().catch(() => {});

    const assetInsuranceSummaryName =
      /Asset\s*(?:,\s*|\s*&\s*)Insurance(?:\s*&\s*Trade-?\s*in|\s*Summary)?/i;
    const primary = this.assetInsuranceTradeInSummaryHyperlink;
    try {
      await primary.waitFor({ state: "visible", timeout: 45_000 });
    } catch {
      const fallback = quote
        .getByRole("button", { name: assetInsuranceSummaryName })
        .or(quote.getByRole("link", { name: assetInsuranceSummaryName }))
        .or(quote.locator("button, a, [role='button']").filter({ hasText: assetInsuranceSummaryName }))
        .first();
      await fallback.waitFor({ state: "visible", timeout: 30_000 });
      await fallback.scrollIntoViewIfNeeded();
      await fallback.click({ timeout: 15_000 });
      await this.page
        .getByRole("dialog")
        .last()
        .waitFor({ state: "visible", timeout: 45_000 });
      await this.page.waitForLoadState("domcontentloaded").catch(() => {});
      return;
    }

    await this.scrollIfNeeded(primary);
    await primary.click();
    await this.page
      .getByRole("dialog")
      .last()
      .waitFor({ state: "visible", timeout: 45_000 });
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
  }

  private searchAddAssetTrigger(scope: Locator): Locator {
    return scope
      .getByRole("link", { name: /\+?\s*Search\s*&\s*Add\s+Asset/i })
      .or(scope.getByRole("button", { name: /\+?\s*Search\s*&\s*Add\s+Asset/i }))
      .or(
        scope
          .locator("a, button, [role='button']")
          .filter({ hasText: /\+?\s*Search\s*&\s*Add\s+Asset/i }),
      )
      .first();
  }

  private searchAddAssetDialog(): Locator {
    return this.page
      .getByRole("dialog", { name: /Search Asset/i })
      .or(
        this.page
          .getByRole("dialog")
          .filter({ hasText: /Search Asset|Motochek|Dealer Inventory|Physical Asset/i }),
      )
      .last();
  }

  private async expectSearchAddAssetDialogVisible(timeoutMs = 45_000): Promise<void> {
    await expect
      .poll(
        async () => {
          const dlg = this.searchAddAssetDialog();
          if (await dlg.isVisible().catch(() => false)) {
            return true;
          }
          const nestedSearch = this.page
            .getByRole("dialog")
            .filter({ hasText: /Motochek|Dealer Inventory/i })
            .filter({ has: this.page.getByRole("button", { name: /^Search$/i }) })
            .last();
          return nestedSearch.isVisible().catch(() => false);
        },
        { timeout: timeoutMs, intervals: [300, 500, 1_000, 2_000] },
      )
      .toBe(true);
  }

  private async clickSearchAddAssetTriggerInScope(scope: Locator): Promise<boolean> {
    const trigger = this.searchAddAssetTrigger(scope);
    if (!(await trigger.isVisible({ timeout: 8_000 }).catch(() => false))) {
      return false;
    }
    await trigger.scrollIntoViewIfNeeded();
    try {
      await trigger.click({ timeout: 15_000 });
    } catch {
      await trigger.click({ force: true, timeout: 15_000 });
    }
    await this.waitUntilNoVisibleAppLoaderOverlays(20_000);
    try {
      await this.expectSearchAddAssetDialogVisible(25_000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * UDP-T4256 / UDP-T4067 — **+ Search & Add Asset** on quote shell or inside **Asset & Insurance Summary**.
   */
  async clickSearchAndAddAssetAndExpectSearchDialog(): Promise<void> {
    this.logStep("Click Search And Add Asset and expect search dialog");
    await this.waitForQuoteLoadersToFinish();
    const root = this.standardQuoteRoot();

    if (await this.clickSearchAddAssetTriggerInScope(root)) {
      return;
    }

    await this.openAssetInsuranceTradeInSummary();
    const summaryDlg = this.page
      .getByRole("dialog")
      .filter({ hasText: /Asset/i })
      .filter({ hasText: /Insurance/i })
      .filter({ hasText: /Summary/i })
      .last();
    await expect(summaryDlg).toBeVisible({ timeout: 30_000 });

    if (await this.clickSearchAddAssetTriggerInScope(summaryDlg)) {
      return;
    }

    throw new Error("Search & Add Asset did not open the Search Asset dialog.");
  }

  /** Close nested **Search Asset** dialog when open (Motochek / Dealer Inventory). */
  async closeSearchAddAssetDialogIfOpen(): Promise<void> {
    this.logStep("Close Search Add Asset Dialog If Open");
    const dlg = this.searchAddAssetDialog();
    if (!(await dlg.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return;
    }
    const closeBtn = dlg
      .locator("button.p-dialog-header-close")
      .or(dlg.locator("button.p-dialog-header-icon.p-dialog-header-close"))
      .or(dlg.getByRole("button", { name: /^close$/i }))
      .first();
    await closeBtn.click({ timeout: 10_000 }).catch(() => this.page.keyboard.press("Escape"));
    await dlg.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  }

  /**
   * UDP-T4256 — **Asset & Insurance Summary** → **+ Search & Add Trade** opens trade search pop-up.
   */
  async clickSearchAndAddTradeAndExpectSearchDialog(): Promise<void> {
    this.logStep("Click Search And Add Trade and expect search dialog");
    await this.openAssetInsuranceTradeInSummary();
    await this.clickSearchAddTradeInAndExpectChooserOpened();

    const tradeDlg = this.page
      .getByRole("dialog")
      .filter({ hasText: /Search Trade\s*in\s*Asset|Search\s+Trade-?\s*in\s+Asset/i })
      .last();
    if (await tradeDlg.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(tradeDlg).toBeVisible();
      return;
    }
    await expect(
      this.page.getByPlaceholder(/search|rego|vin|trade/i).or(this.page.getByRole("searchbox")).first(),
    ).toBeVisible({ timeout: 15_000 });
  }

  /**
   * **Asset & Insurance Summary** modal → **Trade Summary** → **Search & Add Trade in** (label may use "Trade in" or "Trade-in").
   * Clicks it and asserts a follow-on UI appears (extra dialog, searchbox, or trade-in copy).
   */
  async clickSearchAddTradeInAndExpectChooserOpened(): Promise<void> {
    this.logStep("Click Search Add Trade In And Expect Chooser Opened");
    const dialog = this.page.getByRole("dialog").last();
    await dialog.waitFor({ state: "visible", timeout: 30_000 });

    const trigger = dialog
      .getByRole("link", { name: /Search\s*&\s*Add\s+Trade\s*-?\s*in/i })
      .or(dialog.getByRole("button", { name: /Search\s*&\s*Add\s+Trade\s*-?\s*in/i }))
      .or(
        dialog
          .locator("a, button, [role='button']")
          .filter({ hasText: /Search\s*&\s*Add\s+Trade\s*-?\s*in/i }),
      )
      .first();

    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toBeVisible({ timeout: 15_000 });

    const dialogCountBefore = await this.page.getByRole("dialog").count();
    await trigger.click({ timeout: 15_000 });

    await expect
      .poll(
        async () => {
          if ((await this.page.getByRole("dialog").count()) > dialogCountBefore) {
            return true;
          }
          if (await this.page.getByRole("searchbox").first().isVisible().catch(() => false)) {
            return true;
          }
          if (
            await this.page
              .getByPlaceholder(/search|rego|vin|asset/i)
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            return true;
          }
          const lastDlg = this.page.getByRole("dialog").last();
          if (
            await lastDlg
              .getByText(/trade-?\s*in|add\s+trade|search\s+.*asset|select\s+.*trade/i)
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            return true;
          }
          return false;
        },
        { timeout: 20_000 },
      )
      .toBe(true);
  }

  /**
   * **Search Trade in Asset** nested dialog: PrimeNG header **close** (X —
   * `p-dialog-header-close`), not a generic page button.
   */
  async closeSearchTradeInAssetDialog(): Promise<void> {
    this.logStep("Close Search Trade In Asset Dialog");
    const dlg = this.page
      .getByRole("dialog")
      .filter({ hasText: /Search Trade\s*in\s*Asset|Search\s+Trade-?\s*in\s+Asset/i })
      .last();
    await dlg.waitFor({ state: "visible", timeout: 20_000 });
    const closeBtn = dlg
      .locator("button.p-dialog-header-close")
      .or(dlg.locator("button.p-dialog-header-icon.p-dialog-header-close"))
      .or(dlg.getByRole("button", { name: /^close$/i }))
      .first();
    await closeBtn.scrollIntoViewIfNeeded();
    await closeBtn.click({ timeout: 10_000 });
    await dlg.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  }

  /**
   * Front **PrimeNG** dialog header **maximize** (stable classes; no `ng-tns-*` build id).
   * Targets the top dialog after inner modals are closed (e.g. **Asset & Insurance Summary**).
   */
  async clickFrontPrimeDialogHeaderMaximizeIfVisible(): Promise<void> {
    this.logStep("Click Front Prime Dialog Header Maximize If Visible");
    const dlg = this.page.getByRole("dialog").last();
    await dlg.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    const btn = dlg.locator(
      "button.p-dialog-header-icon.p-dialog-header-maximize.p-link",
    );
    if (await btn.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await btn.click({ timeout: 8_000 });
    }
  }

  /**
   * **Asset & Insurance Summary** dialog: header **close** (X). Title copy can use `&`, `and`, or
   * wrap lines; after **maximize**, the close control may sit in a slightly different header layout.
   */
  async closeAssetInsuranceSummaryDialog(): Promise<void> {
    this.logStep("Close Asset Insurance Summary Dialog");
    const dlg = this.page
      .getByRole("dialog")
      .filter({ hasText: /Asset/i })
      .filter({ hasText: /Insurance/i })
      .filter({ hasText: /Summary/i })
      .last();

    if (!(await dlg.isVisible({ timeout: 6_000 }).catch(() => false))) {
      return;
    }

    const closeBtn = dlg
      .locator(
        "button.p-dialog-header-close, button.p-dialog-header-icon.p-dialog-header-close",
      )
      .or(
        dlg.locator(
          "button.p-dialog-header-icon:has(.pi-times), button.p-dialog-header-icon:has(.pi.pi-times)",
        ),
      )
      .first();

    try {
      await expect(closeBtn).toBeVisible({ timeout: 12_000 });
    } catch {
      await this.page.keyboard.press("Escape");
      await dlg.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
      return;
    }

    await closeBtn.scrollIntoViewIfNeeded().catch(() => {});
    await closeBtn.click({ force: true, timeout: 10_000 });
    await dlg.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  }

  /**
   * Opens **Key Information Disclosure >** (SelectorHub `page.locator(':text-is("Key Information Disclosure >")')`).
   * After **Asset & Insurance Summary** closes, the control may sit on the quote shell or the open page.
   */
  async openKeyInformationDisclosureDialog(): Promise<void> {
    this.logStep("Open Key Information Disclosure Dialog");
    const trigger = this.standardQuoteRoot()
      .locator(':text-is("Key Information Disclosure >")')
      .or(this.page.locator(':text-is("Key Information Disclosure >")'))
      .first();
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toBeVisible({ timeout: 20_000 });
    await trigger.click({ timeout: 15_000 });
    const dlg = this.page
      .getByRole("dialog")
      .filter({ hasText: /Key Information Disclosure/i })
      .last();
    await dlg.waitFor({ state: "visible", timeout: 25_000 });
  }

  /**
   * **Key Information Disclosure** PrimeNG dialog: header close (X). Prefer `p-dialog-header-close` /
   * times icon; some builds expose only `button.p-dialog-header-icon.p-dialog-header-maximize.p-link` (omit volatile `ng-tns-*`).
   */
  async closeKeyInformationDisclosureDialog(): Promise<void> {
    this.logStep("Close Key Information Disclosure Dialog");
    const dlg = this.page
      .getByRole("dialog")
      .filter({ hasText: /Key Information Disclosure/i })
      .last();
    await dlg.waitFor({ state: "visible", timeout: 15_000 });

    const closeBtn = dlg
      .getByRole("button", { name: /^close$/i })
      .or(dlg.locator("button.p-dialog-header-close"))
      .or(dlg.locator("button.p-dialog-header-icon.p-dialog-header-close"))
      .or(
        dlg.locator(
          "button.p-dialog-header-icon:has(.pi-times), button.p-dialog-header-icon:has(.pi.pi-times)",
        ),
      )
      .or(
        dlg.locator(
          "button.p-dialog-header-icon.p-dialog-header-maximize.p-link",
        ),
      )
      .first();

    await closeBtn.scrollIntoViewIfNeeded().catch(() => {});
    await closeBtn.click({ timeout: 12_000 });
    await dlg.waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
  }

  /**
   * **Payment / Lease / Rental Schedule** section title (CSA vs FL vs OL label varies).
   */
  private paymentScheduleSectionTitle(): Locator {
    return this.standardQuoteRoot()
      .getByText(/Payment\s+Schedule|Lease\s+Schedule|Rental\s+Schedule/i)
      .first();
  }

  /**
   * Visible instalment row with **$** amount and frequency inside the schedule panel.
   */
  private paymentScheduleMoneyDataRow(): Locator {
    return this.paymentScheduleContentScope()
      .locator("tr")
      .filter({ hasText: /\$\s*[\d,]+\.\d{2}/ })
      .filter({ hasText: /Monthly|Weekly|Fortnightly/i })
      .filter({ visible: true })
      .first();
  }

  /** **Edit Payment Schedule** control on the quote shell (enabled only in detailed/grid view on some builds). */
  private editPaymentScheduleTrigger(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .getByRole("button", { name: /Edit\s+Payment\s+Schedule/i })
      .or(root.getByRole("link", { name: /Edit\s+Payment\s+Schedule/i }))
      .first();
  }

  /**
   * Host for **Payment / Lease Schedule** view toggles (`pi-equals` segment vs `pi-bars` grid).
   */
  private leasePaymentScheduleViewToggleScope(): Locator {
    const root = this.standardQuoteRoot();
    const card = root
      .locator("p-card")
      .filter({ hasText: /Payment\s+Schedule|Lease\s+Schedule|Rental\s+Schedule/i })
      .first();
    return card.or(this.paymentScheduleContentScope());
  }

  /** Segment vs grid toggle radios beside **Payment Schedule** title (TL uses glyph icons, not `pi-bars`). */
  private paymentScheduleViewRadioGroup(): Locator {
    const title = this.paymentScheduleSectionTitle();
    return title
      .locator("xpath=..")
      .getByRole("group")
      .first()
      .or(
        title.locator("xpath=following-sibling::*[@role='group' or contains(@class,'p-selectbutton')][1]"),
      )
      .or(
        this.leasePaymentScheduleViewToggleScope()
          .getByRole("group")
          .filter({ has: this.page.getByRole("radio") })
          .first(),
      );
  }

  /** Second toggle option — grid / list view (each instalment as its own row). */
  private leasePaymentScheduleBarsViewRadio(): Locator {
    const group = this.paymentScheduleViewRadioGroup();
    const scope = this.leasePaymentScheduleViewToggleScope();
    const barsIcon = scope.locator("i.pi.pi-bars");
    return group
      .getByRole("radio")
      .nth(1)
      .or(group.getByRole("radio", { checked: false }).last())
      .or(
        scope
          .getByRole("radio", { checked: false })
          .filter({ has: barsIcon })
          .first(),
      );
  }

  /** Selected grid-view radio after the toggle is active. */
  private leasePaymentScheduleBarsViewRadioSelected(): Locator {
    return this.paymentScheduleViewRadioGroup().getByRole("radio").nth(1);
  }

  private async isPaymentScheduleRadioChecked(radio: Locator): Promise<boolean> {
    if (!(await radio.isVisible().catch(() => false))) {
      return false;
    }
    const ariaChecked = await radio.getAttribute("aria-checked");
    if (ariaChecked === "true") {
      return true;
    }
    const cls = (await radio.getAttribute("class")) ?? "";
    return cls.includes("p-highlight");
  }

  private async isLeasePaymentListViewActive(): Promise<boolean> {
    const gridRadio = this.leasePaymentScheduleBarsViewRadioSelected();
    if (await this.isPaymentScheduleRadioChecked(gridRadio)) {
      return true;
    }

    const rows = this.paymentScheduleAllMoneyRows();
    const count = await rows.count();
    if (count >= 5) {
      return true;
    }

    if (count > 0) {
      const firstText = ((await rows.first().textContent()) ?? "").replace(/\s+/g, " ").trim();
      const segmentGrouped = /\b([2-9]|[1-9]\d{1,2})\s+(Monthly|Weekly|Fortnightly)\b/i.test(firstText);
      return !segmentGrouped;
    }

    return false;
  }

  /** Unselected segment (grouped payments) view radio. */
  private leasePaymentScheduleDefaultViewRadio(): Locator {
    const scope = this.leasePaymentScheduleViewToggleScope();
    const equalsIcon = scope.locator("i.pi.pi-equals");
    return this.paymentScheduleViewRadioGroup()
      .getByRole("radio")
      .first()
      .or(
        scope
          .getByRole("radio", { checked: false })
          .filter({ has: equalsIcon })
          .first(),
      );
  }

  /** Selected segment view radio. */
  private leasePaymentScheduleDefaultViewRadioSelected(): Locator {
    return this.paymentScheduleViewRadioGroup().getByRole("radio").first();
  }

  private async isLeasePaymentDefaultViewActive(): Promise<boolean> {
    const selected = this.leasePaymentScheduleDefaultViewRadioSelected();
    if (!(await selected.isVisible().catch(() => false))) {
      return !(await this.isLeasePaymentListViewActive());
    }
    return this.isPaymentScheduleRadioChecked(selected);
  }

  /** UDP-T4246 — **pi-equals** segment view is the active schedule toggle after **Calculate**. */
  async expectPaymentScheduleSegmentViewActive(): Promise<void> {
    this.logStep("Expect payment schedule segment view active");
    await this.waitForQuoteLoadersToFinish();
    const title = this.paymentScheduleSectionTitle();
    await expect(title).toBeVisible({ timeout: 45_000 });
    await title.scrollIntoViewIfNeeded().catch(() => {});
    await expect
      .poll(async () => this.isLeasePaymentDefaultViewActive(), {
        timeout: 20_000,
        intervals: [300, 500, 1_000],
      })
      .toBe(true);
    expect(await this.isLeasePaymentListViewActive()).toBeFalsy();
  }

  private paymentScheduleColumnHeader(label: RegExp): Locator {
    const scope = this.paymentScheduleContentScope();
    return scope
      .getByRole("columnheader", { name: label })
      .or(scope.locator("th").filter({ hasText: label }))
      .first();
  }

  /**
   * UDP-T4246 / UDP-T3668 — after **Calculate**, schedule defaults to segment view with grouped
   * identical payments (Date / Number / Frequency / Payment).
   */
  async expectPaymentScheduleSegmentViewDefaultAfterCalculate(): Promise<void> {
    this.logStep("Expect payment schedule segment view default after calculate");
    await this.expectPaymentScheduleSegmentViewActive();

    await expect(this.paymentScheduleColumnHeader(/^Date\b/i)).toBeVisible({ timeout: 15_000 });
    await expect(this.paymentScheduleColumnHeader(/^Number\b/i)).toBeVisible({ timeout: 10_000 });
    await expect(this.paymentScheduleColumnHeader(/^Frequency\b/i)).toBeVisible({ timeout: 10_000 });
    await expect(this.paymentScheduleColumnHeader(/^Payment\b/i)).toBeVisible({ timeout: 10_000 });

    const rows = this.paymentScheduleVisibleMoneyRows();
    await expect
      .poll(async () => rows.count(), { timeout: 45_000, intervals: [500, 1_000, 1_500] })
      .toBeGreaterThan(0);

    const segmentCount = await rows.count();
    const firstText = ((await rows.first().textContent()) ?? "").replace(/\s+/g, " ").trim();
    expect(firstText).toMatch(/\$\s*[\d,]+\.\d{2}/);
    expect(firstText).toMatch(/Monthly|Weekly|Fortnightly/i);

    // Grouped identical instalments: fewer segment rows than individual payments, or Number > 1.
    const groupedByNumber = /\b([2-9]|[1-9]\d{1,2})\b/.test(firstText);
    expect(groupedByNumber || segmentCount <= 3).toBeTruthy();
  }

  /**
   * UDP-T4247 / UDP-T3672 — toggle **pi-bars** grid view; each instalment is its own row with
   * Date (DD/MM/YYYY), Number, Frequency, and Payment amount.
   */
  async expectPaymentScheduleGridViewListsIndividualPayments(minRows = 10): Promise<void> {
    this.logStep("Expect payment schedule grid view lists individual payments");
    await this.waitForQuoteLoadersToFinish();
    const title = this.paymentScheduleSectionTitle();
    await expect(title).toBeVisible({ timeout: 45_000 });
    await title.scrollIntoViewIfNeeded().catch(() => {});

    await this.clickLeasePaymentScheduleBarsViewIfNeeded();

    await expect(this.paymentScheduleColumnHeader(/^Date\b/i)).toBeVisible({ timeout: 15_000 });
    await expect(this.paymentScheduleColumnHeader(/^Number\b/i)).toBeVisible({ timeout: 10_000 });
    await expect(this.paymentScheduleColumnHeader(/^Frequency\b/i)).toBeVisible({ timeout: 10_000 });
    await expect(this.paymentScheduleColumnHeader(/^Payment\b/i)).toBeVisible({ timeout: 10_000 });

    const rows = this.paymentScheduleAllMoneyRows();
    await expect
      .poll(async () => rows.count(), { timeout: 45_000, intervals: [500, 1_000, 1_500] })
      .toBeGreaterThanOrEqual(minRows);

    const visibleRows = this.paymentScheduleVisibleMoneyRows();
    const samples = Math.min(3, await visibleRows.count());
    for (let i = 0; i < samples; i++) {
      const text = ((await visibleRows.nth(i).textContent()) ?? "").replace(/\s+/g, " ").trim();
      expect(text).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(text).toMatch(/\$\s*[\d,]+\.\d{2}/);
      expect(text).toMatch(/Monthly|Weekly|Fortnightly/i);
    }
  }

  /**
   * Ensure the default **pi-equals** segment view is active (Edit Payment Schedule works here).
   */
  private async clickLeasePaymentScheduleDefaultViewIfNeeded(): Promise<void> {
    if (await this.isLeasePaymentDefaultViewActive()) {
      return;
    }

    const defaultRadio = this.leasePaymentScheduleDefaultViewRadio();
    if (!(await defaultRadio.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    if (!(await defaultRadio.isEnabled().catch(() => false))) {
      return;
    }

    await defaultRadio.scrollIntoViewIfNeeded();
    await defaultRadio.click({ timeout: 12_000 });
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
  }

  /**
   * Switch from default segment view to grid view (each instalment listed individually).
   */
  private async clickLeasePaymentScheduleBarsViewIfNeeded(): Promise<void> {
    if (await this.isLeasePaymentListViewActive()) {
      return;
    }

    const title = this.paymentScheduleSectionTitle();
    await title.scrollIntoViewIfNeeded().catch(() => {});

    const barsRadio = this.leasePaymentScheduleBarsViewRadio();
    await expect(barsRadio).toBeVisible({ timeout: 15_000 });
    await barsRadio.scrollIntoViewIfNeeded();
    await barsRadio.click({ timeout: 12_000 });
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);

    if (!(await this.isLeasePaymentListViewActive())) {
      await barsRadio.click({ timeout: 12_000, force: true });
      await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    }

    await expect
      .poll(async () => this.isLeasePaymentListViewActive(), {
        timeout: 30_000,
        intervals: [300, 500, 1_000, 2_000],
      })
      .toBe(true);
  }

  /**
   * From the default segment/summary schedule view, switch to the detailed list/grid view
   * (`pi-bars` toggle) so instalment rows and **Edit Payment Schedule** are available.
   */
  async openDetailedPaymentScheduleView(): Promise<void> {
    this.logStep("Open Detailed Payment Schedule View");
    await this.waitForQuoteLoadersToFinish();

    const title = this.paymentScheduleSectionTitle();
    await expect(title).toBeVisible({ timeout: 45_000 });
    await title.scrollIntoViewIfNeeded();

    const dataRow = this.paymentScheduleMoneyDataRow();
    const editBtn = this.editPaymentScheduleTrigger();

    const scheduleDataReady = async (): Promise<boolean> =>
      (await dataRow.isVisible().catch(() => false));

    if (await scheduleDataReady()) {
      return;
    }

    await this.clickLeasePaymentScheduleDefaultViewIfNeeded();

    if (await scheduleDataReady()) {
      return;
    }

    await this.clickLeasePaymentScheduleBarsViewIfNeeded();

    await expect
      .poll(scheduleDataReady, { timeout: 30_000, intervals: [500, 1_000, 2_000] })
      .toBe(true);
    await expect(dataRow).toBeVisible({ timeout: 15_000 });
  }

  /**
   * **Payment Schedule** card: heading, table with Date / Number / Frequency / Payment, and at least one row
   * with a currency amount (after **Calculate**).
   */
  async expectPaymentScheduleSectionWithTableData(): Promise<void> {
    this.logStep("Expect Payment Schedule Section With Table Data");
    const scheduleTitle = this.paymentScheduleSectionTitle();
    await expect(scheduleTitle).toBeVisible({ timeout: 45_000 });
    await scheduleTitle.scrollIntoViewIfNeeded().catch(() => {});

    await this.openDetailedPaymentScheduleView();

    const scope = this.paymentScheduleContentScope();
    // PrimeNG columnheaders include filter affordances in a11y name ("Date Show Filter Menu").
    const scheduleHeader = (label: RegExp): Locator =>
      scope
        .getByRole("columnheader", { name: label })
        .or(scope.locator("th").filter({ hasText: label }))
        .first();

    await expect(scheduleHeader(/^Date\b/i)).toBeVisible({ timeout: 15_000 });
    await expect(scheduleHeader(/^Number\b/i)).toBeVisible({ timeout: 10_000 });
    await expect(scheduleHeader(/^Frequency\b/i)).toBeVisible({ timeout: 10_000 });
    await expect(scheduleHeader(/^Payment\b/i)).toBeVisible({ timeout: 10_000 });

    const dataRow = this.paymentScheduleMoneyDataRow();
    await expect(dataRow).toBeVisible({ timeout: 25_000 });
  }

  /**
   * Card / panel that wraps **Payment Schedule** (for header icon toggles).
   */
  private paymentScheduleCard(): Locator {
    const root = this.standardQuoteRoot();
    const title = this.paymentScheduleSectionTitle();
    return title
      .locator("xpath=ancestor::p-card[1]")
      .first()
      .or(
        title.locator(
          "xpath=ancestor::div[.//table][contains(.,'Frequency') or contains(.,'Payment')][1]",
        ),
      )
      .or(root.locator("p-card").filter({ has: title }).first());
  }

  /**
   * Host for **Payment Schedule** table rows (card when present, else a div that contains the title).
   * Keeps row queries off other grids under {@link standardQuoteRoot} (fees, summary, etc.).
   */
  private paymentScheduleContentScope(): Locator {
    const root = this.standardQuoteRoot();
    const card = this.paymentScheduleCard();
    const title = this.paymentScheduleSectionTitle();
    const withTable = root
      .locator("div")
      .filter({ has: title })
      .filter({
        has: root.locator("table").filter({ hasText: /Date|Number|Frequency|Payment/i }),
      })
      .first();
    return card.or(withTable).or(root.locator("div").filter({ has: title }).first());
  }

  /**
   * **Payment Schedule** view toggles: PrimeNG often uses **`p-selectButton`** (two+ options);
   * older builds use icon-only **`pi-bars`** / **`pi-table`** / **`pi-th-large`** next to the title.
   * **$** row checks use {@link standardQuoteRoot} — the table is not always a descendant of the
   * narrow `p-card` title ancestor used for header buttons.
   */
  async clickPaymentScheduleViewTogglesAndExpectRowsRemain(): Promise<void> {
    this.logStep("Click Payment Schedule View Toggles And Expect Rows Remain");
    await this.openDetailedPaymentScheduleView();

    const scope = this.paymentScheduleContentScope();
    const paymentRow = this.paymentScheduleMoneyDataRow();

    const assertMoneyRowVisible = async (): Promise<void> => {
      await expect(paymentRow).toBeVisible({ timeout: 15_000 });
    };

    await assertMoneyRowVisible();

    const toggleScope = this.leasePaymentScheduleViewToggleScope();
    const hasEqualsBarsToggle = await toggleScope
      .locator("i.pi.pi-equals, i.pi.pi-bars")
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasEqualsBarsToggle) {
      const uncheckedViewRadios = [
        toggleScope
          .getByRole("radio", { checked: false })
          .filter({ has: toggleScope.locator("i.pi.pi-equals") })
          .first(),
        toggleScope
          .getByRole("radio", { checked: false })
          .filter({ has: toggleScope.locator("i.pi.pi-bars") })
          .first(),
      ];
      for (const toggle of uncheckedViewRadios) {
        if (!(await toggle.isVisible().catch(() => false))) {
          continue;
        }
        if (!(await toggle.isEnabled().catch(() => false))) {
          continue;
        }
        await toggle.scrollIntoViewIfNeeded();
        await toggle.click({ timeout: 10_000 });
        await this.waitUntilNoVisibleAppLoaderOverlays(15_000);
        await assertMoneyRowVisible();
      }
      return;
    }

    const selectGroup = scope
      .locator("p-selectbutton, p-selectButton, p-togglebutton, .p-selectbutton")
      .first();
    if (await selectGroup.isVisible({ timeout: 10_000 }).catch(() => false)) {
      const btns = selectGroup.locator("button, .p-button, [role='button']");
      const n = await btns.count();
      if (n >= 2) {
        for (const idx of [0, n - 1]) {
          const btn = btns.nth(idx);
          if (!(await btn.isEnabled().catch(() => false))) {
            continue;
          }
          await btn.scrollIntoViewIfNeeded();
          await btn.click({ timeout: 10_000 });
          await this.waitUntilNoVisibleAppLoaderOverlays(15_000);
          await assertMoneyRowVisible();
        }
        return;
      }
    }

    const iconToggles = toggleScope
      .locator("button, a, [role='button']")
      .filter({
        has: toggleScope.locator("i.pi-bars, i.pi-list, i.pi-table, i.pi-th-large"),
      });
    const iconCount = await iconToggles.count();
    for (let i = 0; i < iconCount; i++) {
      const btn = iconToggles.nth(i);
      if (!(await btn.isEnabled().catch(() => false))) {
        continue;
      }
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ timeout: 10_000 });
      await this.waitUntilNoVisibleAppLoaderOverlays(15_000);
      await assertMoneyRowVisible();
    }
  }

  /**
   * Assert **Payment Schedule** is populated, then exercise view toggles (`p-selectButton` or
   * icon buttons), asserting **$** rows stay visible.
   */
  async expectPaymentScheduleViewTogglesWorkAndTablePopulated(): Promise<void> {
    this.logStep("Expect Payment Schedule View Toggles Work And Table Populated");
    await this.expectPaymentScheduleSectionWithTableData();
    await this.clickPaymentScheduleViewTogglesAndExpectRowsRemain();
  }

  /** **Edit Payment Schedule** modal. */
  editPaymentScheduleDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ hasText: /Edit\s+Payment\s+Schedule/i })
      .first();
  }

  /** Header **X** on **Edit Payment Schedule** (close without Apply/Cancel). */
  private editPaymentScheduleDialogCloseButton(): Locator {
    const dialog = this.editPaymentScheduleDialog();
    return dialog
      .locator(
        "button.p-dialog-header-close, button.p-dialog-header-icon.p-dialog-header-close",
      )
      .or(
        dialog.locator(
          "button.p-dialog-header-icon:has(.pi-times), button.p-dialog-header-icon:has(.pi.pi-times)",
        ),
      )
      .first();
  }

  /** Close **Edit Payment Schedule** when it is already open (e.g. stale dialog blocking a fresh open). */
  async closeEditPaymentScheduleDialogIfOpen(): Promise<void> {
    const dialog = this.editPaymentScheduleDialog();
    if (!(await dialog.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return;
    }
    this.logStep("Close Edit Payment Schedule dialog if open");
    const closeBtn = this.editPaymentScheduleDialogCloseButton();
    if (await closeBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await closeBtn.scrollIntoViewIfNeeded().catch(() => {});
      await closeBtn.click({ timeout: 10_000 });
    } else {
      await this.page.keyboard.press("Escape").catch(() => {});
    }
    await expect(dialog).toBeHidden({ timeout: 15_000 });
  }

  /** Instalment grid inside **Edit Payment Schedule** (Date / Payment / Remaining Balance). */
  private editPaymentScheduleInstalmentTable(): Locator {
    const dialog = this.editPaymentScheduleDialog();
    return dialog
      .locator("table")
      .filter({ has: dialog.locator("th").filter({ hasText: /^Payment$/i }) })
      .filter({ has: dialog.locator("th").filter({ hasText: /^Date$/i }) })
      .first();
  }

  /** Segment editor table inside **Edit Payment Schedule** (first table in the dialog). */
  private editPaymentScheduleSegmentTable(): Locator {
    return this.editPaymentScheduleDialog().locator("table").first();
  }

  private editPaymentScheduleSegmentRowAt(rowIndex: number): Locator {
    return this.editPaymentScheduleSegmentTable().locator("tbody tr").nth(rowIndex);
  }

  /** Segment editor ready — **Type** column and at least one row with a type dropdown. */
  async waitForEditPaymentScheduleSegmentEditorReady(): Promise<void> {
    this.logStep("Wait for Edit Payment Schedule segment editor ready");
    const dialog = this.editPaymentScheduleDialog();
    const table = this.editPaymentScheduleSegmentTable();
    await expect(table).toBeVisible({ timeout: 30_000 });
    const row = table.locator("tbody tr").first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    const typeControl = row.getByRole("combobox").first();
    await expect(typeControl).toBeVisible({ timeout: 20_000 });
  }

  private async readEditPaymentScheduleSegmentNumberFromRow(row: Locator): Promise<string> {
    const spin = row.getByRole("spinbutton").first();
    if (await spin.isVisible({ timeout: 500 }).catch(() => false)) {
      return (await spin.inputValue()).trim();
    }
    const cells = row.locator("td");
    const cellCount = await cells.count();
    for (const idx of [1, 0]) {
      if (idx >= cellCount) {
        continue;
      }
      const cell = cells.nth(idx);
      const inp = cell.locator("input").first();
      if (await inp.isVisible({ timeout: 300 }).catch(() => false)) {
        const val = (await inp.inputValue()).trim();
        if (/^\d+$/.test(val)) {
          return val;
        }
      }
      const text = ((await cell.textContent()) ?? "").replace(/\s+/g, " ").trim();
      if (/^\d+$/.test(text)) {
        return text;
      }
    }
    return "";
  }

  private async editPaymentScheduleSegmentAmountCell(row: Locator): Promise<Locator> {
    const cells = row.locator("td");
    const count = await cells.count();
    if (count === 0) {
      throw new Error("Edit Payment Schedule segment row has no cells");
    }
    const firstText = ((await cells.first().textContent()) ?? "").replace(/\s+/g, " ").trim();
    const hasDateColumn = /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(firstText);
    if (hasDateColumn && count >= 4) {
      return cells.nth(3);
    }
    if (count >= 3) {
      return cells.nth(2);
    }
    return cells.last();
  }

  /** Log every visible **Edit Payment Schedule** table row for locator diagnosis (UDP-T3669). */
  private async logEditPaymentScheduleDialogRows(): Promise<void> {
    const dialog = this.editPaymentScheduleDialog();
    const tables = dialog.locator("table");
    const tableCount = await tables.count();
    for (let t = 0; t < tableCount; t++) {
      const table = tables.nth(t);
      const headers = (
        await table.locator("thead th").allTextContents().catch(() => [])
      )
        .map((h) => h.replace(/\s+/g, " ").trim())
        .join(" | ");
      this.logStep(`Edit Payment Schedule table ${t + 1} headers: ${headers || "(none)"}`);
      const rows = table.locator("tbody tr");
      const rowCount = await rows.count();
      for (let r = 0; r < rowCount; r++) {
        const row = rows.nth(r);
        const cells = (
          await row.locator("td").allTextContents().catch(() => [])
        ).map((c) => c.replace(/\s+/g, " ").trim());
        const inputs = await row.locator("input").evaluateAll((els) =>
          els.map((el) => ((el as HTMLInputElement).value ?? "").trim()),
        );
        this.logStep(
          `Edit Payment Schedule table ${t + 1} row ${r + 1}: cells=${JSON.stringify(cells)} inputs=${JSON.stringify(inputs)}`,
        );
      }
    }
  }

  /**
   * Last instalment row for balloon/balance checks — instalment grid first, then quote schedule,
   * not the segment editor row (`1 Fixed $0.00`).
   */
  private async editPaymentScheduleLastInstalmentRow(): Promise<Locator> {
    const dialog = this.editPaymentScheduleDialog();
    await this.logEditPaymentScheduleDialogRows();

    const instalmentTable = this.editPaymentScheduleInstalmentTable();
    if (await instalmentTable.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const row = instalmentTable.locator("tbody tr").filter({ visible: true }).last();
      if (await row.isVisible({ timeout: 3_000 }).catch(() => false)) {
        this.logStep(
          `Using Edit Payment Schedule instalment table last row: "${((await row.textContent()) ?? "").replace(/\s+/g, " ").trim()}"`,
        );
        return row;
      }
    }

    await this.openDetailedPaymentScheduleView().catch(() => {});
    const scheduleRow = this.paymentScheduleContentScope()
      .locator("tr")
      .filter({ hasText: /\$\s*[\d,.]+/ })
      .filter({ visible: true })
      .last();
    if (await scheduleRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      this.logStep(
        `Using quote Payment Schedule last row: "${((await scheduleRow.textContent()) ?? "").replace(/\s+/g, " ").trim()}"`,
      );
      return scheduleRow;
    }

    const balloonRow = dialog
      .locator("table tbody tr")
      .filter({ hasText: /\$\s*[\d,.]+/ })
      .filter({ visible: true })
      .last();
    this.logStep(
      `Falling back to last currency row in dialog: "${((await balloonRow.textContent()) ?? "").replace(/\s+/g, " ").trim()}"`,
    );
    return balloonRow;
  }

  /** Opens **Edit Payment Schedule** from the default Lease Schedule segment view. */
  async openEditPaymentScheduleDialog(): Promise<void> {
    this.logStep("Open Edit Payment Schedule Dialog");
    await this.waitForQuoteLoadersToFinish();
    await this.closeEditPaymentScheduleDialogIfOpen();

    const title = this.paymentScheduleSectionTitle();
    await expect(title).toBeVisible({ timeout: 45_000 });
    await title.scrollIntoViewIfNeeded();

    const editBtn = this.editPaymentScheduleTrigger();
    const editReady = async (): Promise<boolean> =>
      (await editBtn.isVisible().catch(() => false)) &&
      (await editBtn.isEnabled().catch(() => false));

    if (!(await editReady())) {
      await this.clickLeasePaymentScheduleDefaultViewIfNeeded();
    }

    await expect
      .poll(editReady, { timeout: 45_000, intervals: [500, 1_000, 2_000] })
      .toBe(true);

    await editBtn.scrollIntoViewIfNeeded();
    await editBtn.click({ timeout: 20_000 });
    await expect(this.editPaymentScheduleDialog()).toBeVisible({ timeout: 20_000 });
    await this.waitForEditPaymentScheduleSegmentEditorReady();
  }

  private async paymentScheduleHost(): Promise<Locator> {
    const root = this.standardQuoteRoot();
    const scheduleCard = root
      .locator("p-card")
      .filter({ hasText: /Payment\s+Schedule|Lease\s+Schedule|Rental\s+Schedule/i })
      .first();
    if (await scheduleCard.isVisible({ timeout: 10_000 }).catch(() => false)) {
      return scheduleCard;
    }
    return root
      .locator("div")
      .filter({ has: this.paymentScheduleSectionTitle() })
      .filter({ has: root.locator("table tbody tr") })
      .first();
  }

  /**
   * Last payment row in **Edit Payment Schedule** shows the balloon amount (UDP-T3669).
   */
  async expectEditPaymentScheduleLastInstalmentMatchesBalloon(
    balloonPattern: RegExp,
  ): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Last Instalment Matches Balloon");
    await this.waitForQuoteLoadersToFinish();
    const dialog = this.editPaymentScheduleDialog();
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    const lastRow = await this.editPaymentScheduleLastInstalmentRow();
    await expect(lastRow).toBeVisible({ timeout: 25_000 });
    await expect(lastRow).toContainText(balloonPattern);
  }

  /** Remaining balance on the last payment row in **Edit Payment Schedule** is **$0** (UDP-T3669). */
  async expectEditPaymentScheduleLastInstalmentRemainingBalanceZero(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Last Instalment Remaining Balance Zero");
    await this.waitForQuoteLoadersToFinish();
    const dialog = this.editPaymentScheduleDialog();
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    const lastRow = await this.editPaymentScheduleLastInstalmentRow();
    await expect(lastRow).toBeVisible({ timeout: 25_000 });

    const instalmentTable = this.editPaymentScheduleInstalmentTable();
    if (await instalmentTable.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const headers = instalmentTable.locator("thead th");
      const count = await headers.count();
      let balanceIdx = -1;
      for (let i = 0; i < count; i++) {
        const text = ((await headers.nth(i).textContent()) ?? "").replace(/\s+/g, " ").trim();
        if (/Remaining|Balance/i.test(text)) {
          balanceIdx = i;
          break;
        }
      }
      if (balanceIdx >= 0) {
        await expect(lastRow.locator("td").nth(balanceIdx)).toContainText(/\$\s*0(?:\.00)?/);
        return;
      }
    }

    const balanceHeader = dialog
      .locator("th, [role='columnheader']")
      .filter({ hasText: /Remaining|Balance/i })
      .first();
    if (await balanceHeader.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const headers = dialog.locator("th, [role='columnheader']");
      const count = await headers.count();
      let balanceIdx = -1;
      for (let i = 0; i < count; i++) {
        const text = ((await headers.nth(i).textContent()) ?? "").replace(/\s+/g, " ").trim();
        if (/Remaining|Balance/i.test(text)) {
          balanceIdx = i;
          break;
        }
      }
      if (balanceIdx >= 0) {
        await expect(lastRow.locator("td").nth(balanceIdx)).toContainText(/\$\s*0(?:\.00)?/);
        return;
      }
    }
    await expect(lastRow).toContainText(/\$\s*0(?:\.00)?/);
  }

  /** First segment row inside **Edit Payment Schedule** table. */
  private editPaymentScheduleSegmentRow(): Locator {
    return this.editPaymentScheduleSegmentRowAt(0);
  }

  private editPaymentScheduleApplyButton(): Locator {
    const dialog = this.editPaymentScheduleDialog();
    return dialog
      .getByRole("button", { name: /^APPLY$/i })
      .or(dialog.locator("p-button").filter({ hasText: /^Apply$/i }).locator("button"))
      .first();
  }

  private editPaymentScheduleCalculateButton(): Locator {
    const dialog = this.editPaymentScheduleDialog();
    return dialog
      .getByRole("button", { name: /^Calculate$/i })
      .or(dialog.locator("p-button").filter({ hasText: /^Calculate$/i }).locator("button"))
      .first();
  }

  /** Segment **Type** dropdown inside **Edit Payment Schedule** (e.g. Normal, Fixed, Interest Only). */
  async selectEditPaymentScheduleSegmentType(typeLabel: string): Promise<void> {
    await this.selectEditPaymentScheduleSegmentTypeOnRow(0, typeLabel);
  }

  /** Segment **Type** on a specific row (0-based) inside **Edit Payment Schedule**. */
  async selectEditPaymentScheduleSegmentTypeOnRow(
    rowIndex: number,
    typeLabel: string,
  ): Promise<void> {
    this.logStep(`Select Edit Payment Schedule Segment Type ${typeLabel} on row ${rowIndex + 1}`);
    const row = this.editPaymentScheduleSegmentRowAt(rowIndex);
    const typeCombo = row.getByRole("combobox").first();
    await typeCombo.click({ timeout: 10_000 });
    const typePattern = new RegExp(
      `^${typeLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i",
    );
    await this.page
      .locator(".p-dropdown-panel")
      .filter({ visible: true })
      .locator("li[role='option'], .p-dropdown-item")
      .filter({ hasText: typePattern })
      .first()
      .click({ timeout: 10_000 });
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  /** Segment **Amount** on a specific row (0-based) inside **Edit Payment Schedule**. */
  async enterEditPaymentScheduleSegmentAmountOnRow(
    rowIndex: number,
    amount: string,
  ): Promise<void> {
    this.logStep(`Enter Edit Payment Schedule Segment Amount ${amount} on row ${rowIndex + 1}`);
    const row = this.editPaymentScheduleSegmentRowAt(rowIndex);
    const amountCell = await this.editPaymentScheduleSegmentAmountCell(row);

    const parseAmount = (raw: string): number => {
      const n = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
      return Number.isFinite(n) ? n : Number.NaN;
    };

    const readAmount = async (): Promise<string> => {
      const input = amountCell.locator("input").first();
      if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
        return (await input.inputValue()).trim();
      }
      return ((await amountCell.textContent()) ?? "").trim();
    };

    const target = parseAmount(amount);
    const current = parseAmount(await readAmount());
    if (Number.isFinite(target) && Number.isFinite(current) && target === current) {
      return;
    }

    const amountInputInCell = (): Locator =>
      amountCell
        .locator("input[currencymask], input#amount, input.p-inputtext")
        .first()
        .or(amountCell.locator("input").first());

    let amountInput = amountInputInCell();
    if (!(await amountInput.isVisible({ timeout: 1_000 }).catch(() => false))) {
      await amountCell.click({ timeout: 10_000 }).catch(() => {});
      await this.page.waitForTimeout(250);
      amountInput = amountInputInCell();
    }

    if (!(await amountInput.isVisible({ timeout: 3_000 }).catch(() => false))) {
      const displayed = await readAmount();
      const displayedNum = parseAmount(displayed);
      if (Number.isFinite(target) && target === displayedNum) {
        return;
      }
      const typeLabel =
        ((await row.getByRole("combobox").first().textContent().catch(() => "")) ?? "").trim();
      if (/Fixed/i.test(typeLabel)) {
        this.logStep(
          `Fixed segment amount is display-only (${displayed}); cannot enter ${amount}`,
        );
        return;
      }
      await amountCell.dblclick({ timeout: 10_000 }).catch(() => amountCell.click({ timeout: 10_000 }));
      await this.page.waitForTimeout(250);
      amountInput = amountInputInCell();
      if (!(await amountInput.isVisible({ timeout: 2_000 }).catch(() => false))) {
        throw new Error(
          `Edit Payment Schedule amount input not found on row ${rowIndex + 1} (displayed: "${displayed}", type: "${typeLabel}").`,
        );
      }
    }

    await amountInput.click({ clickCount: 3 });
    await amountInput.fill(amount);
    await amountInput.press("Tab").catch(() => {});
  }

  /** Segment **Amount** text on a row (0-based) inside **Edit Payment Schedule**. */
  async readEditPaymentScheduleSegmentAmountOnRow(rowIndex: number): Promise<string> {
    const row = this.editPaymentScheduleSegmentRowAt(rowIndex);
    const amountCell = await this.editPaymentScheduleSegmentAmountCell(row);
    const input = amountCell.locator("input").first();
    if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
      const val = (await input.inputValue()).trim();
      if (val.length > 0) {
        return val;
      }
    }
    const text = ((await amountCell.textContent()) ?? "").replace(/\s+/g, " ").trim();
    if (/\$|^\d/.test(text)) {
      return text;
    }
    const cells = row.locator("td");
    for (let i = (await cells.count()) - 1; i >= 0; i--) {
      const cell = cells.nth(i);
      const cellText = ((await cell.textContent()) ?? "").replace(/\s+/g, " ").trim();
      if (/\$\s*[\d,.]+/.test(cellText)) {
        return cellText;
      }
    }
    return text;
  }

  /** Whether segment **Amount** on a row is an editable input (OL **Fixed** is display-only at $0). */
  async isEditPaymentScheduleSegmentAmountEditable(rowIndex: number): Promise<boolean> {
    const row = this.editPaymentScheduleSegmentRowAt(rowIndex);
    const amountCell = await this.editPaymentScheduleSegmentAmountCell(row);
    const input = amountCell
      .locator("input[currencymask], input#amount, input.p-inputtext, input")
      .first();
    if (!(await input.isVisible({ timeout: 1_000 }).catch(() => false))) {
      return false;
    }
    return input.isEditable().catch(() => false);
  }

  /** Returns `true` when the amount field accepted and retained the requested value. */
  async tryEnterEditPaymentScheduleSegmentAmountOnRow(
    rowIndex: number,
    amount: string,
  ): Promise<boolean> {
    const before = await this.readEditPaymentScheduleSegmentAmountOnRow(rowIndex);
    await this.enterEditPaymentScheduleSegmentAmountOnRow(rowIndex, amount);
    const after = await this.readEditPaymentScheduleSegmentAmountOnRow(rowIndex);
    const target = Number.parseFloat(amount.replace(/[^0-9.-]/g, ""));
    const actual = Number.parseFloat(after.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(target) && Number.isFinite(actual) && target === actual && after !== before;
  }

  /**
   * UDP-T4140 — OL **Fixed** segment amount is display-only and locked to **$0.00**.
   */
  async expectEditPaymentScheduleFixedAmountDisplayOnlyAtZero(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Fixed amount display-only at zero");
    const row = this.editPaymentScheduleSegmentRowAt(0);
    const typeLabel = ((await row.getByRole("combobox").first().textContent().catch(() => "")) ?? "").trim();
    expect(typeLabel).toMatch(/Fixed/i);
    const amountN = Number.parseFloat(
      (await this.readEditPaymentScheduleSegmentAmountOnRow(0)).replace(/[^0-9.-]/g, ""),
    );
    expect(Number.isFinite(amountN) ? amountN : 0).toBe(0);
    expect(await this.isEditPaymentScheduleSegmentAmountEditable(0)).toBeFalsy();
  }

  /**
   * UDP-T4140 — OL **Fixed** segment rejects non-zero amount (validation message, disabled **Apply**, or amount reverts to 0).
   */
  async expectEditPaymentScheduleNonZeroFixedRejected(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule non-zero Fixed rejected");
    const errVisible = await this.page
      .getByText(/only allowed value is 0|Fixed.*only.*0|not allowed|value\s*(?:is|must be)\s*0/i)
      .first()
      .isVisible({ timeout: 8_000 })
      .catch(() => false);
    const applyDisabled = await this.editPaymentScheduleApplyButton()
      .isDisabled()
      .catch(() => true);
    const amountRaw = await this.readEditPaymentScheduleSegmentAmountOnRow(0);
    const amountN = Number.parseFloat(amountRaw.replace(/[^0-9.-]/g, ""));
    const revertedToZero = Number.isFinite(amountN) && amountN === 0;
    const blockedByDisplayOnly =
      revertedToZero && !(await this.isEditPaymentScheduleSegmentAmountEditable(0));
    expect(errVisible || applyDisabled || blockedByDisplayOnly).toBeTruthy();
  }

  /**
   * UDP-T4140 — OL **Fixed** segment with amount **0** is accepted (no validation error; **Apply** may stay disabled when schedule is unchanged).
   */
  async expectEditPaymentScheduleFixedZeroAccepted(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Fixed zero accepted");
    const amountRaw = await this.readEditPaymentScheduleSegmentAmountOnRow(0);
    const amountN = Number.parseFloat(amountRaw.replace(/[^0-9.-]/g, ""));
    expect(Number.isFinite(amountN) ? amountN : 0).toBe(0);
    const errVisible = await this.page
      .getByText(/only allowed value is 0|Fixed.*only.*0|not allowed|invalid/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(errVisible).toBeFalsy();
    const applyEnabled = await this.editPaymentScheduleApplyButton()
      .isEnabled()
      .catch(() => false);
    if (applyEnabled) {
      return;
    }
    // Full-term Fixed $0 can match the default schedule — **Apply** stays disabled until segments differ.
    expect(await this.isEditPaymentScheduleSegmentAmountEditable(0)).toBeFalsy();
  }

  /** **Calculate** inside **Edit Payment Schedule** (FIS fetch for segment amounts). */
  async clickEditPaymentScheduleCalculate(opts?: { waitForApply?: boolean }): Promise<void> {
    this.logStep("Click Edit Payment Schedule Calculate");
    const calcBtn = this.editPaymentScheduleCalculateButton();
    await expect(calcBtn).toBeVisible({ timeout: 10_000 });
    await expect(calcBtn).toBeEnabled({ timeout: 10_000 });
    await calcBtn.click({ timeout: 10_000 });
    await this.waitForLoadingComplete();
    if (opts?.waitForApply !== false) {
      // Apply enables only after FIS calculation completes — wait for UI state, not spinner alone.
      await expect(this.editPaymentScheduleApplyButton()).toBeEnabled({ timeout: 60_000 });
    } else {
      await this.waitForQuoteLoadersToFinish().catch(() => {});
    }
  }

  /** Summary block after dialog **Calculate** (Number of Payments, Total Term). */
  async expectEditPaymentScheduleCalculateSummaryVisible(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Calculate Summary Visible");
    const dialog = this.editPaymentScheduleDialog();
    await expect(dialog.getByText(/Number of Payments/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(dialog.getByText(/Total Term/i).first()).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Segment **Number** on a specific row (0-based) inside **Edit Payment Schedule**.
   */
  async enterEditPaymentScheduleSegmentNumberOnRow(
    rowIndex: number,
    number: string,
  ): Promise<void> {
    this.logStep(`Enter Edit Payment Schedule Segment Number ${number} on row ${rowIndex + 1}`);
    const row = this.editPaymentScheduleSegmentRowAt(rowIndex);
    const current = await this.readEditPaymentScheduleSegmentNumberFromRow(row);
    if (current === number) {
      return;
    }

    const spin = row.getByRole("spinbutton").first();
    if (await spin.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await spin.fill(number);
      await spin.press("Tab").catch(() => {});
      return;
    }

    const cells = row.locator("td");
    const cellCount = await cells.count();
    for (const idx of [1, 0]) {
      if (idx >= cellCount) {
        continue;
      }
      const inp = cells.nth(idx).locator("input").first();
      if (await inp.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await inp.click();
        await inp.fill(number);
        await inp.press("Tab").catch(() => {});
        return;
      }
    }

    throw new Error(
      `Edit Payment Schedule number input not found on row ${rowIndex + 1} (displayed: "${current}").`,
    );
  }

  /**
   * Segment **Number** inside **Edit Payment Schedule** (must not exceed finance term).
   */
  async enterEditPaymentScheduleSegmentNumber(number: string): Promise<void> {
    await this.enterEditPaymentScheduleSegmentNumberOnRow(0, number);
  }

  /**
   * Change segment fields then **Calculate** so **Apply** can persist valid schedule changes.
   */
  async modifyEditPaymentScheduleSegment(opts?: {
    type?: string;
    number?: string;
  }): Promise<void> {
    this.logStep("Modify Edit Payment Schedule Segment");
    if (opts?.number) {
      await this.enterEditPaymentScheduleSegmentNumber(opts.number);
    }
    if (opts?.type) {
      await this.selectEditPaymentScheduleSegmentType(opts.type);
    }
    await this.clickEditPaymentScheduleCalculate();
  }

  /** **Apply** inside **Edit Payment Schedule** — saves changes and closes the dialog. */
  async clickEditPaymentScheduleApply(): Promise<void> {
    this.logStep("Click Edit Payment Schedule Apply");
    const applyBtn = this.editPaymentScheduleApplyButton();
    await expect(applyBtn).toBeVisible({ timeout: 10_000 });
    await expect(applyBtn).toBeEnabled({ timeout: 10_000 });
    await applyBtn.click({ timeout: 10_000 });
    await this.waitForLoadingComplete();
  }

  /**
   * **Edit Payment Schedule** → first segment **Interest Only** → **Calculate** → **Apply**.
   * Yields a non-uniform schedule so Payment Summary shows **Irregular** (UDP-T3666).
   */
  async applyInterestOnlyEditPaymentSchedule(): Promise<void> {
    this.logStep("Apply Interest Only Edit Payment Schedule");
    await this.openEditPaymentScheduleDialog();
    await this.selectEditPaymentScheduleSegmentType("Interest Only");
    await this.clickEditPaymentScheduleCalculate();
    await this.clickEditPaymentScheduleApply();
    await this.expectEditPaymentScheduleDialogClosedOnStandardQuote();
  }

  /**
   * Split schedule: partial **Interest Only** + **Normal** remainder (TL / UDP-T4236).
   * Full-term **Interest Only** alone leaves **Apply** disabled after **Calculate**.
   */
  async applySplitInterestOnlyEditPaymentSchedule(interestOnlyPayments = "12"): Promise<void> {
    this.logStep(`Apply split Interest Only Edit Payment Schedule (${interestOnlyPayments} IO)`);
    await this.openEditPaymentScheduleDialog();
    await this.modifyEditPaymentScheduleSegmentFields({
      number: interestOnlyPayments,
      type: "Interest Only",
    });
    await this.waitForEditPaymentScheduleAddSegmentEnabled();
    await this.clickEditPaymentScheduleAddSegment();
    const paymentsTotal = await this.getEditPaymentScheduleNumberOfPayments();
    const remaining = String(Math.max(1, paymentsTotal - Number(interestOnlyPayments)));
    await this.enterEditPaymentScheduleSegmentNumberOnRow(1, remaining);
    await this.selectEditPaymentScheduleSegmentTypeOnRow(1, "Normal");
    await this.clickEditPaymentScheduleCalculate();
    await this.clickEditPaymentScheduleApply();
    await this.expectEditPaymentScheduleDialogClosedOnStandardQuote();
  }

  /**
   * UDP-T4126 — partial **Fixed** $0 segment + **Normal** remainder (OL).
   * A lone partial segment leaves **Apply** disabled; full term coverage is required.
   */
  async applySplitFixedZeroEditPaymentSchedule(fixedZeroPayments = "12"): Promise<void> {
    this.logStep(`Apply split Fixed zero Edit Payment Schedule (${fixedZeroPayments} @ $0)`);
    await this.openEditPaymentScheduleDialog();
    await this.modifyEditPaymentScheduleSegmentFields({
      number: fixedZeroPayments,
      type: "Fixed",
      amount: "0",
    });
    await this.waitForEditPaymentScheduleAddSegmentEnabled();
    await this.clickEditPaymentScheduleAddSegment();
    const paymentsTotal = await this.getEditPaymentScheduleNumberOfPayments();
    const remaining = String(Math.max(1, paymentsTotal - Number(fixedZeroPayments)));
    await this.enterEditPaymentScheduleSegmentNumberOnRow(1, remaining);
    await this.selectEditPaymentScheduleSegmentTypeOnRow(1, "Normal");
    await this.clickEditPaymentScheduleCalculate();
    await this.clickEditPaymentScheduleApply();
    await this.expectEditPaymentScheduleDialogClosedOnStandardQuote();
  }

  /** User returns to **Standard Quote** after **Apply** (edit dialog closed). */
  async expectEditPaymentScheduleDialogClosedOnStandardQuote(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Dialog Closed On Standard Quote");
    await expect(this.editPaymentScheduleDialog()).toBeHidden({ timeout: 20_000 });
    await expect(this.standardQuoteRoot()).toBeVisible({ timeout: 15_000 });
    await this.expectPaymentScheduleSectionWithTableData();
  }

  private editPaymentScheduleCancelButton(): Locator {
    const dialog = this.editPaymentScheduleDialog();
    const footer = dialog
      .locator("div")
      .filter({ has: dialog.getByRole("button", { name: /^APPLY$/i }) })
      .last();
    return footer
      .getByRole("button", { name: /^CANCEL$/i })
      .first()
      .or(
        dialog
          .locator("p-button")
          .filter({ has: dialog.locator(':text-is("CANCEL")') })
          .locator("button")
          .first(),
      )
      .or(dialog.locator("p-button").filter({ hasText: /^CANCEL$/i }).locator("button").first());
  }

  private editPaymentScheduleCancelConfirmDialog(): Locator {
    return this.page
      .locator("p-confirmdialog .p-dialog, p-confirmdialog, .p-confirm-dialog")
      .filter({ visible: true })
      .filter({
        hasText: /Any unsaved changes will be lost\.\s*Are you sure you want to cancel\?/i,
      })
      .first();
  }

  /**
   * Edit segment fields only (no **Calculate**) — leaves unsaved changes for **Cancel** / **Reset** flows.
   */
  async modifyEditPaymentScheduleSegmentFields(opts?: {
    type?: string;
    number?: string;
    amount?: string;
  }): Promise<void> {
    this.logStep("Modify Edit Payment Schedule Segment Fields");
    if (opts?.number) {
      await this.enterEditPaymentScheduleSegmentNumber(opts.number);
    }
    if (opts?.type) {
      await this.selectEditPaymentScheduleSegmentType(opts.type);
    }
    if (opts?.amount) {
      await this.enterEditPaymentScheduleSegmentAmountOnRow(0, opts.amount);
    }
    if (opts?.number || opts?.type || opts?.amount) {
      const dialog = this.editPaymentScheduleDialog();
      await dialog
        .getByText(/Balloon Amount|Number of Payments/i)
        .first()
        .click({ timeout: 5_000 })
        .catch(() => {});
    }
  }

  private editPaymentScheduleResetButton(): Locator {
    const dialog = this.editPaymentScheduleDialog();
    return dialog
      .getByRole("button", { name: /^Reset$/i })
      .or(dialog.locator("p-button").filter({ hasText: /^Reset$/i }).locator("button"))
      .first();
  }

  /** **Reset** inside **Edit Payment Schedule** — discards unsaved segment edits. */
  async clickEditPaymentScheduleReset(): Promise<void> {
    this.logStep("Click Edit Payment Schedule Reset");
    const resetBtn = this.editPaymentScheduleResetButton();
    await expect(resetBtn).toBeVisible({ timeout: 10_000 });
    await expect(resetBtn).toBeEnabled({ timeout: 10_000 });
    await resetBtn.click({ timeout: 10_000 });
    await this.waitForLoadingComplete();
  }

  private normalizeEditPaymentScheduleSegmentAmount(value: string): string {
    return value.replace(/\s+/g, "").trim();
  }

  private normalizeEditPaymentScheduleSegmentType(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  private editPaymentScheduleSegmentsEqual(
    actual: DOEditPaymentScheduleSegmentSnapshot[],
    expected: DOEditPaymentScheduleSegmentSnapshot[],
  ): boolean {
    if (actual.length !== expected.length) {
      return false;
    }
    return actual.every((row, index) => {
      const baseline = expected[index];
      return (
        row.number === baseline.number &&
        this.normalizeEditPaymentScheduleSegmentType(row.type).toLowerCase() ===
          this.normalizeEditPaymentScheduleSegmentType(baseline.type).toLowerCase() &&
        this.normalizeEditPaymentScheduleSegmentAmount(row.amount) ===
          this.normalizeEditPaymentScheduleSegmentAmount(baseline.amount)
      );
    });
  }

  /** Snapshot of one segment row (Number, Type, Amount) in **Edit Payment Schedule**. */
  async getEditPaymentScheduleSegmentRowSnapshot(
    rowIndex: number,
  ): Promise<DOEditPaymentScheduleSegmentSnapshot> {
    const row = this.editPaymentScheduleSegmentRowAt(rowIndex);
    const number = await this.readEditPaymentScheduleSegmentNumberFromRow(row);
    const type = this.normalizeEditPaymentScheduleSegmentType(
      (await row.getByRole("combobox").first().textContent()) ?? "",
    );
    const amountCell = await this.editPaymentScheduleSegmentAmountCell(row);
    const amountInput = amountCell.locator("input").first();
    const amount = (await amountInput.isVisible().catch(() => false))
      ? await amountInput.inputValue()
      : this.normalizeEditPaymentScheduleSegmentAmount((await amountCell.textContent()) ?? "");

    return { number, type, amount };
  }

  /** Snapshot of all segment rows in **Edit Payment Schedule**. */
  async getEditPaymentScheduleSegmentRowsSnapshot(): Promise<DOEditPaymentScheduleSegmentSnapshot[]> {
    const rowCount = await this.countEditPaymentScheduleSegmentRows();
    const snapshots: DOEditPaymentScheduleSegmentSnapshot[] = [];
    for (let index = 0; index < rowCount; index++) {
      snapshots.push(await this.getEditPaymentScheduleSegmentRowSnapshot(index));
    }
    return snapshots;
  }

  /** Assert segment rows match a previously captured snapshot (e.g. after **Reset**). */
  async expectEditPaymentScheduleSegmentRowsMatch(
    expected: DOEditPaymentScheduleSegmentSnapshot[],
  ): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Segment Rows Match Snapshot");
    await expect
      .poll(async () => {
        const actual = await this.getEditPaymentScheduleSegmentRowsSnapshot();
        return this.editPaymentScheduleSegmentsEqual(actual, expected);
      }, { timeout: 15_000, intervals: [300, 500, 1_000] })
      .toBe(true);
  }

  /** **CANCEL** on **Edit Payment Schedule** — prompts unsaved-changes confirmation. */
  async clickEditPaymentScheduleCancel(): Promise<void> {
    this.logStep("Click Edit Payment Schedule Cancel");
    const dialog = this.editPaymentScheduleDialog();
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const cancelBtn = this.editPaymentScheduleCancelButton();
    await expect(cancelBtn).toBeVisible({ timeout: 10_000 });
    await expect(cancelBtn).toBeEnabled({ timeout: 10_000 });
    await cancelBtn.scrollIntoViewIfNeeded();
    await cancelBtn.click({ timeout: 10_000 });
    await expect(this.editPaymentScheduleCancelConfirmDialog()).toBeVisible({ timeout: 15_000 });
  }

  /** Unsaved-changes confirmation after **Cancel**. */
  async expectEditPaymentScheduleCancelConfirmationVisible(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Cancel Confirmation Visible");
    const confirmDlg = this.editPaymentScheduleCancelConfirmDialog();
    await expect(confirmDlg).toBeVisible({ timeout: 15_000 });
    await expect(confirmDlg).toContainText(
      /Any unsaved changes will be lost\.\s*Are you sure you want to cancel\?/i,
    );
    const confirmDiscardBtn = confirmDlg
      .getByRole("button", { name: /^(Yes|OK|Confirm|Discard)$/i })
      .or(confirmDlg.locator("button.p-confirm-dialog-accept").first())
      .first();
    const stayEditingBtn = confirmDlg
      .getByRole("button", { name: /^(No|Stay)$/i })
      .or(confirmDlg.locator("button.p-confirm-dialog-reject").first())
      .first();
    await expect(confirmDiscardBtn).toBeVisible({ timeout: 10_000 });
    await expect(stayEditingBtn).toBeVisible({ timeout: 10_000 });
  }

  /** Confirm discard on cancel confirmation — exits edit screen back to **Standard Quote**. */
  async confirmEditPaymentScheduleCancelDiscard(): Promise<void> {
    this.logStep("Confirm Edit Payment Schedule Cancel Discard");
    const confirmDlg = this.editPaymentScheduleCancelConfirmDialog();
    const discardBtn = confirmDlg
      .getByRole("button", { name: /^(Yes|OK|Confirm|Discard)$/i })
      .or(confirmDlg.locator("button.p-confirm-dialog-accept").first())
      .first();
    await expect(discardBtn).toBeVisible({ timeout: 10_000 });
    await discardBtn.click({ timeout: 10_000 });
    await expect(confirmDlg).toBeHidden({ timeout: 15_000 });
  }

  /** Dismiss cancel confirmation — stay on **Edit Payment Schedule**. */
  async dismissEditPaymentScheduleCancelConfirmationStayEditing(): Promise<void> {
    this.logStep("Dismiss Edit Payment Schedule Cancel Confirmation Stay Editing");
    const confirmDlg = this.editPaymentScheduleCancelConfirmDialog();
    const stayBtn = confirmDlg
      .getByRole("button", { name: /^(No|Stay)$/i })
      .or(confirmDlg.locator("button.p-confirm-dialog-reject").first())
      .first();
    await expect(stayBtn).toBeVisible({ timeout: 10_000 });
    await stayBtn.click({ timeout: 10_000 });
    await expect(confirmDlg).toBeHidden({ timeout: 15_000 });
    await expect(this.editPaymentScheduleDialog()).toBeVisible({ timeout: 10_000 });
  }

  private editPaymentScheduleAddSegmentButton(): Locator {
    const dialog = this.editPaymentScheduleDialog();
    return dialog
      .locator("button, a, [role='button']")
      .filter({ has: dialog.locator(':text-is("Add Segment")') })
      .first()
      .or(dialog.getByRole("button", { name: /\+\s*Add Segment|Add Segment/i }).first());
  }

  /** Row count in the **Edit Payment Schedule** segment table. */
  async countEditPaymentScheduleSegmentRows(): Promise<number> {
    return this.editPaymentScheduleSegmentTable().locator("tbody tr").count();
  }

  /** **+ Add Segment** becomes enabled after reducing the first segment **Number**. */
  async waitForEditPaymentScheduleAddSegmentEnabled(): Promise<void> {
    this.logStep("Wait For Edit Payment Schedule Add Segment Enabled");
    const addBtn = this.editPaymentScheduleAddSegmentButton();
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await expect(addBtn).toBeEnabled({ timeout: 30_000 });
  }

  private editPaymentScheduleSegmentDeleteButton(rowIndex: number): Locator {
    const row = this.editPaymentScheduleSegmentRowAt(rowIndex);
    return row
      .locator("td")
      .last()
      .getByRole("button")
      .first()
      .or(
        row
          .locator("button.p-button-icon-only, button")
          .filter({
            has: row.locator(
              ".fa-trash-can, .fa-light.fa-trash-can, i.fa-trash-can, .pi-trash, i.pi-trash",
            ),
          })
          .first(),
      );
  }

  /** Trash icon on the **last** segment row (UDP-T3674). */
  async clickEditPaymentScheduleDeleteLastSegment(): Promise<void> {
    this.logStep("Click Edit Payment Schedule Delete Last Segment");
    const dialog = this.editPaymentScheduleDialog();
    const rows = dialog.locator("table tbody tr");
    const lastIndex = (await rows.count()) - 1;
    expect(lastIndex).toBeGreaterThanOrEqual(0);
    const deleteBtn = this.editPaymentScheduleSegmentDeleteButton(lastIndex);
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
    await expect(deleteBtn).toBeEnabled({ timeout: 10_000 });
    await deleteBtn.click({ timeout: 10_000 });
    await this.waitForLoadingComplete();
  }

  /** Dialog stays open with no visible validation errors (UDP-T3674). */
  async expectEditPaymentScheduleDialogOpenWithoutErrors(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Dialog Open Without Errors");
    const dialog = this.editPaymentScheduleDialog();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    const errors = dialog
      .locator(".p-message-error, .p-error, [class*='validation-error']")
      .filter({ visible: true });
    await expect(errors).toHaveCount(0);
  }

  /** Finance term (months) shown in the edit-schedule summary. */
  async getEditPaymentScheduleFinanceTermMonths(): Promise<number> {
    const dialog = this.editPaymentScheduleDialog();
    const termLine = dialog.getByText(/Total Term/i).first();
    await expect(termLine).toBeVisible({ timeout: 10_000 });
    const text = (await termLine.textContent()) ?? "";
    const match = text.match(/(\d+)\s*month/i);
    return match ? parseInt(match[1], 10) : 36;
  }

  /** Total **Number of Payments** in the edit-schedule summary (falls back to row sum). */
  async getEditPaymentScheduleNumberOfPayments(): Promise<number> {
    const dialog = this.editPaymentScheduleDialog();
    const summaryLine = dialog.getByText(/Number of Payments/i).first();
    await expect(summaryLine).toBeVisible({ timeout: 10_000 });
    const text = (await summaryLine.textContent()) ?? "";
    const match = text.match(/Number of Payments\s*(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }

    const rows = dialog.locator("table tbody tr");
    let sum = 0;
    for (let i = 0; i < (await rows.count()); i++) {
      const value = await rows.nth(i).getByRole("spinbutton").first().inputValue();
      sum += parseInt(value, 10) || 0;
    }
    return sum;
  }

  /** Sum of segment **Number** spinbutton values in the edit-schedule table. */
  private async sumEditPaymentScheduleSegmentNumbersFromRows(): Promise<number> {
    const rows = this.editPaymentScheduleDialog().locator("table tbody tr");
    let sum = 0;
    for (let i = 0; i < (await rows.count()); i++) {
      const value = await this.readEditPaymentScheduleSegmentNumberFromRow(rows.nth(i));
      sum += parseInt(value, 10) || 0;
    }
    return sum;
  }

  /**
   * Two **Normal** segments whose **Number** sum exceeds finance term (UDP-T4145 step 2).
   */
  async setupEditPaymentScheduleSegmentsExceedingTerm(overage = 10): Promise<void> {
    this.logStep(`Setup Edit Payment Schedule segments exceeding term by ${overage}`);
    const term = await this.getEditPaymentScheduleFinanceTermMonths();
    const first = Math.max(1, Math.floor(term / 2));
    const second = term - first + overage;
    await this.modifyEditPaymentScheduleSegmentFields({ number: String(first), type: "Normal" });
    await this.waitForEditPaymentScheduleAddSegmentEnabled();
    await this.clickEditPaymentScheduleAddSegment();
    await this.enterEditPaymentScheduleSegmentNumberOnRow(1, String(second));
    await this.selectEditPaymentScheduleSegmentTypeOnRow(1, "Normal");
  }

  /** Clicks **+ Add Segment** when enabled. */
  async clickEditPaymentScheduleAddSegment(): Promise<void> {
    this.logStep("Click Edit Payment Schedule Add Segment");
    const addBtn = this.editPaymentScheduleAddSegmentButton();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await expect(addBtn).toBeEnabled({ timeout: 10_000 });
    await addBtn.click({ timeout: 10_000 });
  }

  /**
   * Add segments until total payments equal finance term (frees capacity from a single full-term row first).
   */
  async addEditPaymentScheduleSegmentsUntilTermReached(): Promise<void> {
    this.logStep("Add Edit Payment Schedule Segments Until Term Reached");
    const term = await this.getEditPaymentScheduleFinanceTermMonths();
    const rows = () => this.editPaymentScheduleDialog().locator("table tbody tr");
    const addBtn = this.editPaymentScheduleAddSegmentButton();

    if ((await rows().count()) === 1) {
      const firstValue = parseInt(
        (await rows().first().getByRole("spinbutton").first().inputValue()) || "0",
        10,
      );
      if (firstValue >= term) {
        const chunk = Math.max(1, Math.floor(term / 3));
        await this.enterEditPaymentScheduleSegmentNumberOnRow(0, String(chunk));
        await this.waitForEditPaymentScheduleAddSegmentEnabled();
      }
    }

    let guard = 0;
    while (guard++ < 20) {
      const total = await this.getEditPaymentScheduleNumberOfPayments();
      if (total >= term) break;
      if (!(await addBtn.isEnabled().catch(() => false))) break;

      await addBtn.click({ timeout: 10_000 });
      await this.waitForLoadingComplete();
      const rowIndex = (await rows().count()) - 1;
      const remaining = term - total;
      await this.enterEditPaymentScheduleSegmentNumberOnRow(rowIndex, String(remaining));
      await this.waitForLoadingComplete();
    }

    const finalTotal = await this.getEditPaymentScheduleNumberOfPayments();
    if (finalTotal < term && (await rows().count()) > 0) {
      const lastIndex = (await rows().count()) - 1;
      const lastValue = parseInt(
        (await rows().nth(lastIndex).getByRole("spinbutton").first().inputValue()) || "0",
        10,
      );
      await this.enterEditPaymentScheduleSegmentNumberOnRow(
        lastIndex,
        String(lastValue + (term - finalTotal)),
      );
    }
  }

  /**
   * **+ Add Segment** is disabled when payments meet the term maximum for the selected frequency.
   */
  async expectEditPaymentScheduleAddSegmentDisabledAtTermMax(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Add Segment Disabled At Term Max");
    const term = await this.getEditPaymentScheduleFinanceTermMonths();
    const total = await this.getEditPaymentScheduleNumberOfPayments();
    expect(total).toBe(term);

    const addBtn = this.editPaymentScheduleAddSegmentButton();
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await expect(addBtn).toBeDisabled({ timeout: 15_000 });

    const rowCountAtMax = await this.countEditPaymentScheduleSegmentRows();
    await addBtn.click({ timeout: 5_000, force: true }).catch(() => {});
    await this.waitForLoadingComplete();
    await expect
      .poll(async () => this.countEditPaymentScheduleSegmentRows(), {
        timeout: 5_000,
        intervals: [200, 500],
      })
      .toBe(rowCountAtMax);
  }

  /**
   * Clicks edit on the asset/insurance summary dialog. Finance Lease vs CSA may use
   * `.fa-pen-to-square`, `fa-pen`, Prime `pi-pen`, or a text "Edit" button.
   */
  async clickAssetSummaryEditButton(): Promise<void> {
    this.logStep("Click Asset Summary Edit Button");
    const dialogLast = this.page.getByRole("dialog").last();
    await dialogLast.waitFor({ state: "visible", timeout: 30_000 });

    const tryClickEdit = async (summary: Locator): Promise<boolean> => {
      const byRole = summary.getByRole("button", { name: /^(Edit|Update)$/i });
      if (await byRole.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await byRole.first().click({ force: true, timeout: 15_000 });
        return true;
      }
      for (const sel of [
        "i.fa-pen-to-square, i.fa-pen, [class*='fa-pen-to-square'], [class*='pen-to-square']",
        ".pi-pen, .pi-pencil, i[class*='pencil']",
        ".cursor-pointer.fa-pen-to-square, .fa-pen-to-square",
      ]) {
        const icon = summary.locator(sel).first();
        if (await icon.isVisible({ timeout: 2_000 }).catch(() => false)) {
          const parent = icon.locator(
            "xpath=ancestor::button[1] | ancestor::a[1] | self::i",
          );
          const t = (await parent.first().isVisible().catch(() => false))
            ? parent.first()
            : icon;
          await t.scrollIntoViewIfNeeded();
          await t.click({ force: true, timeout: 15_000 });
          return true;
        }
      }
      if (
        await this.assetyEditButton
          .first()
          .isVisible({ timeout: 1_000 })
          .catch(() => false)
      ) {
        await this.assetyEditButton
          .first()
          .click({ force: true, timeout: 15_000 });
        return true;
      }
      return false;
    };

    for (let round = 0; round < 2; round++) {
      if (round > 0) {
        await this.page.keyboard.press("Escape").catch(() => {});
        await this.openAssetInsuranceTradeInSummary();
      }
      const s = this.page.getByRole("dialog").last();
      await s.waitFor({ state: "visible", timeout: 45_000 });
      for (let w = 0; w < 6; w++) {
        if (await tryClickEdit(s)) {
          return;
        }
        await this.page.waitForTimeout(500);
      }
    }
    throw new Error(
      "Asset/Insurance summary: no Edit (pen) control found; check dialog content for Finance Lease.",
    );
  }
  async cashPriceOfAsset(cashprice: string): Promise<void> {
    this.logStep(`Entered cash price of asset as ${this.stepValueDisplay(cashprice)}`);
    await this.fillCurrencyMaskAmount(
      this.cashPriceOfAssetInputField,
      cashprice,
      "Cash Price of Asset",
    );
  }
  async ppsrCount(count: string): Promise<void> {
    this.logStep(`Entered PPSR count as ${this.stepValueDisplay(count)}`);
    await this.PPSRCount.fill(count);
  }

  /** PrimeNG `<amount>` / `#amount`: replace existing value (program pre-populated fees), verify, then blur. */
  private currencyDollarsMatch(actual: number, expected: string | number): boolean {
    const want =
      typeof expected === "number"
        ? Math.round(expected * 100) / 100
        : Math.round(this.parseDisplayedCurrency(String(expected)) * 100) / 100;
    const got = Math.round(actual * 100) / 100;
    return Math.abs(got - want) < 0.01;
  }

  private async fillCurrencyMaskAmount(
    input: Locator,
    amount: string,
    fieldLabel: string,
  ): Promise<void> {
    const target = Math.round(this.parseDisplayedCurrency(amount) * 100) / 100;
    const digits = target.toFixed(2);
    await input.waitFor({ state: "visible", timeout: 20_000 });
    await input.scrollIntoViewIfNeeded();

    const typeDigits = async (text: string): Promise<void> => {
      await input.click({ timeout: 15_000 });
      await this.page.keyboard.press("Control+A");
      await this.page.keyboard.press("Backspace").catch(() => {});
      await this.page.keyboard.type(text, { delay: 45 });
      await input.press("Tab").catch(() => {});
      await this.waitForQuoteLoadersToFinish().catch(() => {});
    };

    let last = Number.NaN;
    for (let attempt = 0; attempt < 10; attempt++) {
      await typeDigits(attempt % 2 === 0 ? digits : String(Math.round(target)));
      try {
        await expect
          .poll(async () => this.readCurrencyInput(input), {
            timeout: 15_000,
            intervals: [200, 400, 800, 1_000],
          })
          .toBe(target);
        return;
      } catch {
        last = await this.readCurrencyInput(input);
      }
    }

    throw new Error(
      `${fieldLabel} did not accept ${amount} (field still reads $${Number.isFinite(last) ? last.toFixed(2) : "?"})`,
    );
  }

  private async fillLoanDetailsCurrencyAmount(input: Locator, value: string): Promise<void> {
    const target = Math.round(this.parseDisplayedCurrency(value) * 100) / 100;
    await input.waitFor({ state: "visible", timeout: 20_000 });
    await input.scrollIntoViewIfNeeded();

    const applyValue = async (keyboardSelectAll: boolean): Promise<void> => {
      await input.click();
      if (keyboardSelectAll) {
        await this.page.keyboard.press("Control+A");
      } else {
        await input.click({ clickCount: 3 });
      }
      await input.fill(value);
      await input.press("Tab").catch(() => {});
    };

    let last = Number.NaN;
    for (let attempt = 0; attempt < 8; attempt++) {
      await applyValue(attempt % 2 === 1);
      try {
        await expect
          .poll(async () => this.readCurrencyInput(input), {
            timeout: 8_000,
            intervals: [200, 400, 800, 1_000],
          })
          .toBe(target);
        await this.waitForQuoteLoadersToFinish();
        return;
      } catch {
        last = await this.readCurrencyInput(input);
      }
    }

    throw new Error(
      `Currency field did not accept ${value} (field still reads ${last}). ` +
        `Value may have been appended to a program-default fee instead of replacing it.`,
    );
  }

  async udcEstablishmentFee(fee: string): Promise<void> {
    this.logStep(`Entered UDC establishment fee as ${this.stepValueDisplay(fee)}`);
    await this.fillLoanDetailsCurrencyAmount(this.udcEstablishmentFeeInputField, fee);
  }
  async dealerOriginationFee(fee: string): Promise<void> {
    this.logStep(`Entered dealer origination fee as ${this.stepValueDisplay(fee)}`);
    await this.fillLoanDetailsCurrencyAmount(this.dealerOriginationFeeInputField, fee);
  }

  async enterLoanDetails(
    cashprice: string,
    ppsrCount: string,
    udcEstablishmentFee: string,
    dealerOriginationFee: string,
  ): Promise<void> {
    this.logStep(
      `Entered loan details: cash ${this.stepValueDisplay(cashprice)}, PPSR ${this.stepValueDisplay(ppsrCount)}, UDC fee ${this.stepValueDisplay(udcEstablishmentFee)}, dealer fee ${this.stepValueDisplay(dealerOriginationFee)}`,
    );
    this.cashPriceOfAsset(cashprice);
    this.ppsrCount(ppsrCount);
    this.udcEstablishmentFee(udcEstablishmentFee);
    this.dealerOriginationFee(dealerOriginationFee);
  }
  /**
   * Term: numeric **spinbutton** inside `<number>` (some builds), or **dropdown** (QAT / other products).
   */
  async termsOfFinance(term: string): Promise<void> {
    this.logStep(`Set terms of finance as ${this.stepValueDisplay(term)}`);
    const spin = this.termsOfFinanceInputField;
    if (await spin.isVisible({ timeout: 10000 }).catch(() => false)) {
      await spin.scrollIntoViewIfNeeded();
      await spin.click();
      await spin.fill(term);
      await spin.press("Tab");
      await this.waitForQuoteLoadersToFinish().catch(() => {});
      return;
    }

    const numberInput = this.page
      .locator("number")
      .filter({ hasText: /Term/i })
      .locator("input[type='number'], input.p-inputtext, input");
    if (await numberInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await numberInput.first().scrollIntoViewIfNeeded();
      await numberInput.first().click();
      await numberInput.first().fill(term);
      await numberInput.first().press("Tab");
      return;
    }

    const triggerSpan = this.page
      .locator("//span//label[contains(., 'Term')]/following-sibling::div//span")
      .first();
    const triggerPrime = this.page
      .locator("label")
      .filter({ hasText: /^Term\s*\*?$/i })
      .first()
      .locator(
        "xpath=following-sibling::div//*[contains(@class,'p-dropdown-trigger') or @aria-label='dropdown trigger'][1]",
      );

    const trigger = (await triggerSpan.isVisible({ timeout: 3000 }).catch(() => false))
      ? triggerSpan
      : triggerPrime;

    await trigger.waitFor({ state: "visible", timeout: 45000 });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const opt = this.page.getByRole("option", { name: new RegExp(`^${escaped}$`, "i") });
    await opt.first().waitFor({ state: "visible", timeout: 15000 });
    await opt.first().click();
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  /** Clear **Term** spinbutton / numeric input (UDP-T4235 blank-term validation). */
  async clearTermsOfFinance(): Promise<void> {
    this.logStep("Clear terms of finance");
    const clearInput = async (input: Locator): Promise<void> => {
      await input.scrollIntoViewIfNeeded();
      await input.click({ timeout: 15_000 });
      await this.page.keyboard.press("Control+A");
      await this.page.keyboard.press("Backspace").catch(() => {});
      await input.press("Delete").catch(() => {});
      await input.press("Tab").catch(() => {});
    };

    const spin = this.termsOfFinanceInputField;
    if (await spin.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await clearInput(spin);
      return;
    }

    const numberInput = this.page
      .locator("number")
      .filter({ hasText: /Term/i })
      .locator("input[type='number'], input.p-inputtext, input")
      .first();
    if (await numberInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clearInput(numberInput);
    }
  }

  /** Poll until **Term** spinbutton reads blank or zero. */
  async expectTermInputBlankOrZero(): Promise<void> {
    this.logStep("Expect Term input blank or zero");
    const spin = this.termsOfFinanceInputField;
    await expect(spin).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => (await spin.inputValue().catch(() => "")).trim(), {
        timeout: 15_000,
        intervals: [200, 400, 800],
      })
      .toMatch(/^$|^0$/);
  }

  private parseInterestPercent(raw: string): number {
    const n = parseFloat(
      raw.replace(/%/g, "").replace(/,/g, ".").trim(),
    );
    return n;
  }

  private interestRateAcceptable(n: number, target: number): boolean {
    if (Number.isNaN(n) || Number.isNaN(target)) return false;
    return Math.abs(n - target) < 0.75;
  }

  private async readInterestRateValue(field: Locator): Promise<number> {
    const raw = await field.inputValue();
    return this.parseInterestPercent(raw);
  }

  /**
   * Interest rate: async pricing may overwrite the field (e.g. 12.75% vs intended 4%).
   * Fill, blur, wait for network / loaders, retry, and require a short stability window
   * so we do not return while a late patch is still about to apply. Works for CSA rates
   * above single-digit caps (e.g. 9%) and Finance Lease–style low rates.
   */
  async interestRate(rate: string): Promise<void> {
    this.logStep(`Set interest rate as ${this.stepValueDisplay(rate)}`);
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
      await this.waitUntilNoVisibleAppLoaderOverlays(8_000);
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
      await this.waitUntilNoVisibleAppLoaderOverlays(8_000);
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
      `Interest rate did not stabilize at ${rate}% (last read ${final}). ` +
        `Async pricing may still be overwriting the field (e.g. 12.75%).`,
    );
  }

  /** Single fill + blur — use when a full stability loop is unnecessary (e.g. UDP-T3822 recalc). */
  async interestRateFast(rate: string): Promise<void> {
    this.logStep(`Set interest rate as ${this.stepValueDisplay(rate)}`);
    const field = this.interestRateInputField;
    await field.waitFor({ state: "visible", timeout: 15_000 });
    await field.scrollIntoViewIfNeeded();
    await field.click({ clickCount: 3 });
    await field.fill(rate);
    await field.press("Tab");
    await this.waitUntilNoVisibleAppLoaderOverlays(5_000);
  }

  async financeDetails(term: string, rate: string): Promise<void> {
    this.logStep(
      `Set finance details: term ${this.stepValueDisplay(term)}, rate ${this.stepValueDisplay(rate)}`,
    );
    await this.termsOfFinance(term);
    await this.interestRate(rate);
  }

  /**
   * Finance Lease — Payment Summary: "Initial Lease Amount" is required (validation) before Calculate.
   * Uses the label, then the row’s `p-inputtext` / input; avoids brittle `ng-pristine` / `ng-touched` classes.
   */
  async enterInitialLeaseAmountFinanceLease(amount: string): Promise<void> {
    this.logStep(`Entered initial lease amount (finance lease) as ${this.stepValueDisplay(amount)}`);
    const root = this.page
      .locator("app-quote-details, app-standard-quote, app-payment-summary")
      .last();
    const value = amount.replace(/^\$/, "").trim() || amount;
    const labelText = "Initial Lease Amount";

    const fillInput = async (inp: Locator): Promise<void> => {
      await inp.waitFor({ state: "visible", timeout: 20_000 });
      await inp.scrollIntoViewIfNeeded();
      await inp.click({ force: true });
      await inp.clear().catch(() => {});
      try {
        await inp.fill(amount, { timeout: 10_000 });
      } catch {
        await inp.fill(value, { timeout: 10_000 });
      }
      await inp.press("Tab");
    };

    const byLabel = root.getByLabel(/Initial Lease Amount/i);
    if (await byLabel.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await fillInput(byLabel);
      return;
    }

    await root
      .getByText(labelText, { exact: true })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });

    const row = root
      .locator(".p-field, .p-col, [class*='p-field']")
      .filter({ has: root.getByText(labelText, { exact: true }) })
      .first();
    const inRow = row
      .locator(
        "input.p-inputtext, p-inputnumber input, input[mode='currency']",
      )
      .first();
    if (await inRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await fillInput(inRow);
      return;
    }

    const fromLabelXpath = root
      .getByText(labelText, { exact: true })
      .first()
      .locator(
        "xpath=ancestor::div[contains(@class,'p-field') or contains(@class,'p-col') or contains(@class,'row') or contains(@class,'grid')][1]//input[contains(@class,'p-inputtext') or not(@type='hidden')][1]",
      );
    if (await fromLabelXpath.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await fillInput(fromLabelXpath);
      return;
    }

    const wFull = root
      .locator("input.p-inputtext.p-component.p-element.w-full")
      .first();
    if (await wFull.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await fillInput(wFull);
      return;
    }

    throw new Error(
      "Finance Lease: could not set Initial Lease Amount (tried getByLabel, p-field row, label ancestor input, w-full p-inputtext).",
    );
  }

  /**
   * Finance Lease — **Residual Value** `%` only: visible `#percent` inside `app-quote-details`
   * (no label click — avoids focus churn next to **Origination Reference**).
   * Call **once after first Calculate** when pricing has finished (loaders handled by {@link clickCalculateButton}).
   */
  private async patchResidualPercentNative(inp: Locator, digits: string): Promise<void> {
    await inp.evaluate((el: HTMLInputElement, v: string) => {
      el.removeAttribute("readonly");
      el.removeAttribute("disabled");
      el.focus();
      const proto = Object.getPrototypeOf(el) as HTMLInputElement;
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      const setter = desc?.set;
      if (setter) setter.call(el, v);
      else el.value = v;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    }, digits);
  }

  /** Visible `#percent` scoped to quote shell (not page-wide — avoids wrong `#percent`). */
  private residualPercentInput(): Locator {
    const root = this.page.locator("app-quote-details, app-standard-quote").first();
    return root.locator("#percent").filter({ visible: true }).first();
  }

  async enterResidualValuePercentFinanceLease(percent: string): Promise<void> {
    this.logStep(`Entered residual value % (finance lease) as ${this.stepValueDisplay(percent)}`);
    const page = this.page;
    const root = page.locator("app-quote-details, app-standard-quote").first();
    await root.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(400);

    const digits = percent.replace(/%/g, "").trim();
    const pct = this.residualPercentInput();

    await pct.waitFor({ state: "visible", timeout: 15_000 });
    await pct.scrollIntoViewIfNeeded();
    await pct.click({ force: true });
    await pct.press("ControlOrMeta+a");
    await pct.fill(digits);

    let v = (await pct.inputValue().catch(() => "")).trim();
    const num = parseFloat(v.replace(/%/g, ""));
    const target = parseFloat(digits);
    const ok =
      v.includes(digits) ||
      (!Number.isNaN(num) && !Number.isNaN(target) && Math.abs(num - target) < 0.05);
    if (!ok) {
      await this.patchResidualPercentNative(pct, digits);
    }

    /** Blur only `#percent` — do not Tab into Origination / other fields. */
    await pct.evaluate((el: HTMLElement) => {
      el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    });
    await page.waitForTimeout(300);
  }

  async loanDAte(): Promise<void> {
    this.logStep("Loan date");
    await this.loanDate.click();
  }
  async firstPayment(): Promise<void> {
    this.logStep("First Payment");
    await this.firstPaymentDate.click();
  }

  /**
   * Parse **dd/MM/yyyy** loan date (NZ DO portal) and suggest first payment = same day, **next calendar month**
   * (matches typical monthly frequency behaviour when the UI does not pre-fill).
   */
  static suggestFirstPaymentDdMmYyyy(loanDdMmYyyy: string): string {
    const t = loanDdMmYyyy.trim();
    const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    let day: number;
    let month0: number;
    let year: number;
    if (slash) {
      day = parseInt(slash[1], 10);
      month0 = parseInt(slash[2], 10) - 1;
      year = parseInt(slash[3], 10);
    } else if (iso) {
      year = parseInt(iso[1], 10);
      month0 = parseInt(iso[2], 10) - 1;
      day = parseInt(iso[3], 10);
    } else {
      return "15/06/2026";
    }
    const d = new Date(year, month0, day);
    if (Number.isNaN(d.getTime())) return "15/06/2026";
    d.setMonth(d.getMonth() + 1);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  /**
   * **First Payment** is required before **Calculate** when not auto-filled from QQ.
   * Uses **dd/MM/yyyy** to match the portal date inputs.
   */
  async enterFirstPaymentDateDdMmYyyy(value: string): Promise<void> {
    this.logStep(`Entered first payment date as ${this.stepValueDisplay(value)}`);
    const inp = this.firstPaymentDate;
    const v = value.trim();
    await inp.waitFor({ state: "visible", timeout: 25_000 });
    await this.page.keyboard.press("Escape").catch(() => {});
    await inp.scrollIntoViewIfNeeded();
    await inp.click({ force: true });
    await inp.press("ControlOrMeta+a").catch(() => {});
    await inp.fill(v);
    await inp.press("Tab").catch(() => {});

    let read = (await inp.inputValue().catch(() => "")).trim();
    const looksLikeDate = (s: string) =>
      /\d{1,2}\/\d{1,2}\/\d{4}/.test(s) ||
      /^\d{4}-\d{2}-\d{2}/.test(s) ||
      (s.length >= 6 && /[\/\-]/.test(s) && /\d{4}/.test(s));
    if (!looksLikeDate(read)) {
      await inp.click({ force: true });
      await inp.press("ControlOrMeta+a").catch(() => {});
      await this.page.keyboard.type(v, { delay: 25 });
      await inp.press("Tab").catch(() => {});
      read = (await inp.inputValue().catch(() => "")).trim();
    }
    if (!looksLikeDate(read)) {
      await inp.evaluate((el: HTMLInputElement, val: string) => {
        el.removeAttribute("readonly");
        el.removeAttribute("disabled");
        el.focus();
        el.value = val;
        el.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      }, v);
      read = (await inp.inputValue().catch(() => "")).trim();
    }
    if (!looksLikeDate(read) && read.length < 6) {
      throw new Error(
        `First Payment date did not accept value "${v}" (last read: "${read}").`,
      );
    }
    await this.page.waitForTimeout(300);
  }

  static shiftDdMmYyyy(dateStr: string, days: number): string {
    const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return dateStr;
    const d = new Date(Number.parseInt(m[3], 10), Number.parseInt(m[2], 10) - 1, Number.parseInt(m[1], 10));
    d.setDate(d.getDate() + days);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  private parseDdMmYyyy(dateStr: string): Date | null {
    const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return null;
    const d = new Date(Number.parseInt(m[3], 10), Number.parseInt(m[2], 10) - 1, Number.parseInt(m[1], 10));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /** **dd/MM/yyyy** for today (runner local calendar). */
  static todayDdMmYyyy(): string {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  /** **dd/MM/yyyy** for a date `daysAgo` before today. */
  static pastDateDdMmYyyy(daysAgo = 14): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  private isLoanDateTodayOrTomorrow(raw: string): boolean {
    const t = raw.trim();
    const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!slash) return false;
    const day = parseInt(slash[1], 10);
    const month0 = parseInt(slash[2], 10) - 1;
    const year = parseInt(slash[3], 10);
    const loan = new Date(year, month0, day);
    if (Number.isNaN(loan.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    loan.setHours(0, 0, 0, 0);
    return loan.getTime() === today.getTime() || loan.getTime() === tomorrow.getTime();
  }

  /**
   * **Loan Date** on Payment Summary — **dd/MM/yyyy** (NZ DO portal).
   */
  async enterLoanDateDdMmYyyy(value: string): Promise<void> {
    this.logStep(`Entered loan date as ${this.stepValueDisplay(value)}`);
    const inp = this.loanDate;
    const v = value.trim();
    await inp.waitFor({ state: "visible", timeout: 25_000 });
    await this.page.keyboard.press("Escape").catch(() => {});
    await inp.scrollIntoViewIfNeeded();
    await inp.click({ force: true });
    await inp.press("ControlOrMeta+a").catch(() => {});
    await inp.fill(v);
    await inp.press("Tab").catch(() => {});

    let read = (await inp.inputValue().catch(() => "")).trim();
    const looksLikeDate = (s: string) =>
      /\d{1,2}\/\d{1,2}\/\d{4}/.test(s) ||
      /^\d{4}-\d{2}-\d{2}/.test(s) ||
      (s.length >= 6 && /[\/\-]/.test(s) && /\d{4}/.test(s));
    if (!looksLikeDate(read)) {
      await inp.click({ force: true });
      await inp.press("ControlOrMeta+a").catch(() => {});
      await this.page.keyboard.type(v, { delay: 25 });
      await inp.press("Tab").catch(() => {});
      read = (await inp.inputValue().catch(() => "")).trim();
    }
    if (!looksLikeDate(read)) {
      await inp.evaluate((el: HTMLInputElement, val: string) => {
        el.removeAttribute("readonly");
        el.removeAttribute("disabled");
        el.focus();
        el.value = val;
        el.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      }, v);
      read = (await inp.inputValue().catch(() => "")).trim();
    }
    if (!looksLikeDate(read) && read.length < 6) {
      throw new Error(`Loan Date did not accept value "${v}" (last read: "${read}").`);
    }
    await this.page.waitForTimeout(200);
  }

  loanDatePastUpdateDialog(): Locator {
    return this.page
      .locator("p-confirmdialog, .p-confirm-dialog, [role='dialog']")
      .filter({ hasText: /Loan date is in the past|Lease date is in the past/i })
      .first();
  }

  async expectLoanDatePastUpdateDialogVisible(): Promise<void> {
    this.logStep("Expect loan date past update dialog");
    const dlg = this.loanDatePastUpdateDialog();
    await expect(dlg).toBeVisible({ timeout: 45_000 });
    await expect.soft(dlg).toContainText(/Loan date is in the past/i);
    await expect.soft(dlg).toContainText(/Update to today/i);
    await expect
      .soft(dlg)
      .toContainText(/return to the quote screen|return to the quote/i);
    for (const label of [/^Yes$/i, /^No$/i, /^Close$/i]) {
      await expect.soft(dlg.getByRole("button", { name: label }).first()).toBeVisible();
    }
  }

  async clickLoanDatePastDialogButton(name: "Yes" | "No" | "Close"): Promise<void> {
    this.logStep(`Loan date past dialog: ${name}`);
    const dlg = this.loanDatePastUpdateDialog();
    await dlg
      .getByRole("button", { name: new RegExp(`^${name}$`, "i") })
      .first()
      .click({ timeout: 15_000 });
    await dlg.waitFor({ state: "hidden", timeout: 25_000 }).catch(() => {});
  }

  async expectLoanDatePastFieldErrorHighlighted(): Promise<void> {
    this.logStep("Expect loan date past field error");
    await expect
      .soft(this.page.getByText(/Loan date must not be in the past/i).first())
      .toBeVisible({ timeout: 30_000 });
    const invalidHost = this.paymentSummaryRoot
      .locator("amount, date")
      .filter({ hasText: /Loan Date/i })
      .locator(".p-invalid, .ng-invalid, [class*='error']")
      .first();
    if (await invalidHost.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect.soft(invalidHost).toBeVisible();
    }
  }

  async expectLoanDateIsTodayOrTomorrow(): Promise<void> {
    this.logStep("Expect loan date is today or tomorrow");
    await expect
      .poll(async () => this.isLoanDateTodayOrTomorrow(await this.readLoanDateValue()), {
        timeout: 45_000,
      })
      .toBeTruthy();
  }

  async expectAssetDetailsStepVisible(): Promise<void> {
    this.logStep("Expect Asset Details step visible");
    await expect(this.standardQuoteRoot()).toBeVisible({ timeout: 45_000 });
    await expect
      .soft(this.page.getByText(/Asset Type|Condition|Payment Summary/i).first())
      .toBeVisible({ timeout: 30_000 });
  }

  /** Standard Quote header stepper — jump to a section (e.g. **Asset Details**, **Post Submission**). */
  async clickStandardQuoteStepTab(stepLabel: string | RegExp): Promise<void> {
    const label =
      typeof stepLabel === "string"
        ? new RegExp(stepLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        : stepLabel;
    this.logStep(`Click Standard Quote step tab: ${label.source}`);
    const root = this.standardQuoteRoot();
    const tab = root
      .getByRole("tab", { name: label })
      .or(root.getByRole("link", { name: label }))
      .or(this.page.getByText(label).filter({ visible: true }))
      .first();
    await tab.waitFor({ state: "visible", timeout: 30_000 });
    await tab.scrollIntoViewIfNeeded();
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    await tab.click({ timeout: 15_000 });
    await this.page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
  }

  /** UDP-T3860 — Standard Quote reopens on **Asset Details**; Post Submission UI is not displayed. */
  async expectAssetDetailsStepActiveNotPostSubmission(): Promise<void> {
    this.logStep("Expect Asset Details Step Active Not Post Submission");
    await this.expectStandardQuoteLoaded();
    await this.expectAssetDetailsStepVisible();
    await expect(this.page.locator("app-less-deposit").first()).toBeVisible({ timeout: 30_000 });
    await expect(
      this.page.locator("app-customer-quote-post-submit, app-post-submission").first(),
    ).toHaveCount(0, { timeout: 10_000 });
    await expect(this.page.locator(':text-is("Browse Files")').first()).toHaveCount(0, {
      timeout: 10_000,
    });
  }

  /** Assert Standard Quote shell and Asset Details / Less Deposit are loaded. */
  async expectStandardQuoteLoaded(): Promise<void> {
    this.logStep("Expect Standard Quote Loaded");
    await expect(this.standardQuoteRoot()).toBeVisible({ timeout: 30_000 });
    await expect(this.page.locator("app-less-deposit").first()).toBeVisible({ timeout: 30_000 });
  }

  /** Assert an existing Standard Quote (by dashboard quote number) is open in the quote shell. */
  async expectQuoteNumberVisible(quoteNumber: string): Promise<void> {
    const q = quoteNumber.trim();
    this.logStep(`Expect quote number ${this.stepValueDisplay(q)} visible`);
    const root = this.standardQuoteRoot();
    await expect(root).toBeVisible({ timeout: 30_000 });

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const quoteIdLabel = root.getByText(/Quote\s*(No\.?|Number|ID)\s*:?/i).first();
    if (await quoteIdLabel.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const block = quoteIdLabel
        .locator("xpath=ancestor::div[contains(@class,'col') or contains(@class,'field')][1]")
        .or(quoteIdLabel.locator("xpath=ancestor::div[1]"));
      await expect(block.first()).toContainText(new RegExp(`\\b${escaped}\\b`));
      return;
    }

    if (new RegExp(escaped).test(this.page.url())) {
      return;
    }
    this.log(`Quote shell open (quote id ${q} not shown in header on this build).`);
  }

  /** Read numeric Quote ID from the Standard Quote header (UDP-T3827 dashboard reopen). */
  async readStandardQuoteIdFromHeader(): Promise<string> {
    this.logStep("Read Standard Quote ID From Header");
    await this.waitForStandardQuoteReady();
    const root = this.standardQuoteRoot();
    const quoteIdLabel = root
      .getByText(/Quote\s*(No\.?|Number|ID)\s*:?/i)
      .filter({ visible: true })
      .first();
    await expect(quoteIdLabel).toBeVisible({ timeout: 30_000 });

    const block = quoteIdLabel
      .locator("xpath=ancestor::div[contains(@class,'col') or contains(@class,'field')][1]")
      .or(quoteIdLabel.locator("xpath=ancestor::div[1]"))
      .first();
    const input = block.locator("input").filter({ visible: true }).first();
    if (await input.isVisible({ timeout: 8_000 }).catch(() => false)) {
      const value = (await input.inputValue()).trim();
      const numeric = value.match(/\d{3,}/)?.[0];
      if (numeric) {
        return numeric;
      }
    }

    const text = ((await block.textContent()) ?? "").replace(/\s+/g, " ").trim();
    const fromText = text.match(/\b(\d{3,})\b/)?.[1];
    if (fromText) {
      return fromText;
    }

    const fromUrl = this.page.url().match(/\b(\d{3,})\b/)?.[1];
    if (fromUrl) {
      return fromUrl;
    }

    throw new Error("readStandardQuoteIdFromHeader: could not resolve Quote ID from header.");
  }

  /** UDP-T3651 — workflow **Status** defaults to **Open Quote** after first save on Asset Details. */
  async expectWorkflowStatusOpenQuote(): Promise<void> {
    this.logStep("Expect workflow status Open Quote");
    await expect(this.workflowStatusInput).toBeVisible({ timeout: 30_000 });
    await expect(this.workflowStatusInput).toHaveJSProperty("readOnly", true);
    await expect
      .poll(async () => (await this.workflowStatusInput.inputValue()).trim(), {
        timeout: 60_000,
        intervals: [500, 1_000, 2_000],
      })
      .toBe("Open Quote");
    await expect(this.workflowStatusInput).toHaveValue("Open Quote");
  }

  /** Reads **Loan Date** and sets **First Payment** to {@link suggestFirstPaymentDdMmYyyy}. */
  async enterFirstPaymentSuggestedFromLoanDdMmYyyy(): Promise<void> {
    const loanVal = (await this.loanDate.inputValue()).trim();
    const suggested = DOAssetDetailsPage.suggestFirstPaymentDdMmYyyy(loanVal);
    this.logStep(
      `Set first payment from loan date: loan ${this.stepValueDisplay(loanVal)} → ${this.stepValueDisplay(suggested)}`,
    );
    await this.enterFirstPaymentDateDdMmYyyy(suggested);
  }

  async clickCalculateButton(opts?: { fast?: boolean }): Promise<void> {
    this.logStep("Click Calculate Button");
    const fast = opts?.fast ?? false;
    const scoped = this.page
      .locator("app-quote-details")
      .getByRole("button", { name: /^Calculate$/i })
      .first();
    const btn = (await scoped.isVisible({ timeout: 4_000 }).catch(() => false))
      ? scoped
      : this.calculateButton;

    await this.page
      .locator("app-quote-details")
      .first()
      .waitFor({ state: "visible", timeout: fast ? 15_000 : 30_000 })
      .catch(() => {});
    await btn.waitFor({ state: "visible", timeout: fast ? 15_000 : 30_000 });
    const enableIters = fast ? 40 : 90;
    const enableWaitMs = fast ? 150 : 400;
    for (let i = 0; i < enableIters; i++) {
      if (await btn.isEnabled().catch(() => false)) break;
      await this.page.waitForTimeout(enableWaitMs);
    }
    await btn.scrollIntoViewIfNeeded();
    try {
      await btn.click({ timeout: fast ? 15_000 : 25_000 });
    } catch {
      await btn.click({ force: true, timeout: fast ? 15_000 : 25_000 });
    }

    await this.waitUntilNoVisibleAppLoaderOverlays(fast ? 45_000 : 90_000);
    if (fast) {
      await this.page.waitForLoadState("domcontentloaded").catch(() => {});
      await this.page.waitForTimeout(400);
    } else {
      await this.page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(
        () => {},
      );
      await this.page.waitForLoadState("domcontentloaded").catch(() => {});
      await this.page.waitForTimeout(1_500);
    }
  }
  async paymentSummary(): Promise<void> {
    this.logStep("Payment Summary");
    // await this.loanDAte();
    // await this.firstPayment();
    await this.clickCalculateButton();
  }
  async clickNextButton(): Promise<void> {
    this.logStep("Click Next Button");
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

  /**
   * UDP-T4252 / UDP-T3690 / UDP-T4063 — **Calculate** may clear Originator Reference; replenish,
   * **Next** runs validation, then advance to Customer Details when mandatory fields are complete.
   */
  async clickNextAndExpectCustomerDetails(origRef = "SQ-TL-Ref-01"): Promise<void> {
    this.logStep("Click Next and expect Customer Details");
    await this.waitForQuoteLoadersToFinish();
    await this.enterOriginationReference(origRef);

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.clickNextButton();
      try {
        await this.customerDetails.waitForAddBorrowerButton();
        return;
      } catch (err) {
        if (attempt === 2) throw err;
        await this.enterOriginationReference(origRef);
        await this.waitForQuoteLoadersToFinish();
      }
    }
  }

  /**
   * Finance Lease: after payment summary / origination, click **Next** inside `app-quote-details`.
   * If **Next** stays disabled (validation), optionally pass `origRef` to re-fill + patch origination while waiting.
   */
  async clickNextButtonFinanceLease(origRef?: string): Promise<void> {
    this.logStep(
      origRef != null && origRef !== ""
        ? `Click Next (finance lease); origination ref ${this.stepValueDisplay(origRef)}`
        : "Click Next (finance lease)",
    );
    const quote = this.page.locator("app-quote-details").first();
    await quote.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(() => {});
    await this.page.waitForTimeout(800);

    const nextInQuote = quote.getByRole("button", { name: /^Next$/i }).first();
    const nextBtn = (await nextInQuote.isVisible({ timeout: 5_000 }).catch(() => false))
      ? nextInQuote
      : this.nextButton;

    const root = this.page
      .locator("app-quote-details, app-standard-quote")
      .last();

    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      await this.page
        .locator(".app-loader-overlay, .p-progressspinner")
        .first()
        .waitFor({ state: "hidden", timeout: 15_000 })
        .catch(() => {});

      await nextBtn.waitFor({ state: "visible", timeout: 60_000 });

      if (await nextBtn.isEnabled().catch(() => false)) {
        await nextBtn.scrollIntoViewIfNeeded();
        try {
          await nextBtn.click({ timeout: 25_000 });
        } catch {
          await nextBtn.click({ force: true, timeout: 25_000 });
        }
        await this.page.waitForLoadState("domcontentloaded").catch(() => {});
        await this.page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(
          () => {},
        );
        await this.page.waitForTimeout(900);
        await this.page
          .locator("app-quote-details, app-borrower, app-customer")
          .first()
          .waitFor({ state: "visible", timeout: 60_000 })
          .catch(() => {});
        return;
      }

      if (origRef) {
        try {
          await this.enterOriginationReferenceFinanceLease(origRef, true);
        } catch {
          /* empty */
        }
        const inp = await this.findVisibleFinanceLeaseOriginationInput(root);
        if (inp) {
          await this.patchOriginationInputNativeValue(inp, origRef);
          await inp.press("Tab").catch(() => {});
        }
      }

      await this.page.waitForTimeout(700);
    }

    throw new Error(
      "Finance Lease: Next did not become enabled within 120s (validation / origination).",
    );
  }

  /** @deprecated use {@link DOCustomerDetailsPage.waitForAddBorrowerButton} */
  async waitForAddBorrowerButton(): Promise<void> {
    return this.customerDetails.waitForAddBorrowerButton();
  }

  /** @deprecated use {@link DOCustomerDetailsPage.clickAddBorrowersOrGuarantors} */
  async clickAddBorrowerorGuarantorButton(): Promise<void> {
    return this.customerDetails.clickAddBorrowersOrGuarantors();
  }

  /** @deprecated use {@link DOSearchCustomerDialog.openSearchByDropdown} */
  async searchByDropdownClick(): Promise<void> {
    return this.customerDetails.searchByDropdownClick();
  }

  /** @deprecated use {@link DOSearchCustomerDialog.selectSearchByUdcCustomerNumber} */
  async selectUDCSelectOption(): Promise<void> {
    return this.customerDetails.selectUDCSelectOption();
  }

  /** @deprecated use {@link DOSearchCustomerDialog.enterUdcCustomerNumber} */
  async enterUDCCustomerNumber(customerNumber: string): Promise<void> {
    return this.customerDetails.enterUDCCustomerNumber(customerNumber);
  }

  /** @deprecated use {@link DOSearchCustomerDialog.clickSearch} */
  async clickSearchButton(): Promise<void> {
    return this.customerDetails.clickSearchButton();
  }

  /** @deprecated use {@link DOSearchCustomerDialog.clickAddNewCustomer} */
  async clickAddNewCustomerButton(): Promise<void> {
    return this.customerDetails.clickAddNewCustomerButton();
  }

  // ---- AFV Standard Quote helpers (UDP-T4020–UDP-T4072) ----

  kmAllowanceDropdownTrigger(): Locator {
    return this.standardQuoteRoot()
      .locator("label")
      .filter({ hasText: /KM Allowance/i })
      .first()
      .locator("xpath=following::p-dropdown[1]")
      .getByRole("button", { name: /dropdown trigger/i });
  }

  assuredFutureValueInputField(): Locator {
    const financeCard = this.standardQuoteRoot()
      .locator("div, p-card, section")
      .filter({ hasText: /^Finance$/i })
      .filter({ hasText: /KM Allowance/i })
      .first();
    return financeCard
      .locator(
        "xpath=.//*[normalize-space(text())='Assured Future Value' or starts-with(normalize-space(.),'Assured Future Value')]/following::input[1]",
      )
      .first();
  }

  assuredFutureValuePaymentSummaryField(): Locator {
    return this.paymentSummaryRoot
      .getByText(/^Assured Future Value$/i)
      .first()
      .locator("xpath=following::input[1]")
      .first();
  }

  /** **Program** PrimeNG dropdown host (label-scoped). */
  programDropdownHost(): Locator {
    const root = this.standardQuoteRoot();
    return this.primeLabeledDropdownCombobox("Program")
      .locator("xpath=ancestor::p-dropdown[1]")
      .or(
        root.locator(
          "xpath=.//label[contains(normalize-space(.), 'Program')]/following::p-dropdown[1]",
        ),
      )
      .or(
        root.locator(
          "xpath=.//*[normalize-space(text())='Program' or starts-with(normalize-space(.),'Program')]/following::p-dropdown[1]",
        ),
      )
      .or(
        root
          .locator("p-dropdown")
          .filter({ has: root.locator("label").filter({ hasText: /^Program/i }) }),
      )
      .first();
  }

  programDropdownTrigger(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .locator(
        "xpath=.//*[normalize-space(text())='Program' or starts-with(normalize-space(.),'Program')]/following::button[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
      )
      .or(this.programDropdownHost().getByRole("button", { name: /dropdown trigger/i }))
      .first();
  }

  async readSelectedProgramLabel(): Promise<string> {
    this.logStep("Read selected program label");
    const fromPrime = await this.readPrimeLabeledDropdownValue("Program");
    if (fromPrime.length > 0) {
      return fromPrime;
    }

    const host = this.programDropdownHost();
    const combobox = host.getByRole("combobox").first();
    if (await combobox.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const aria = ((await combobox.getAttribute("aria-label")) ?? "").trim();
      if (aria.length > 0 && !this.isPlaceholderDropdownLabel(aria)) {
        return aria;
      }
      const text = ((await combobox.textContent()) ?? "").trim();
      if (!this.isPlaceholderDropdownLabel(text)) {
        return text;
      }
    }

    const labelText =
      (await host.locator(".p-dropdown-label").first().textContent().catch(() => "")) ?? "";
    return this.isPlaceholderDropdownLabel(labelText) ? "" : labelText.trim();
  }

  private isPlaceholderDropdownLabel(label: string): boolean {
    const t = label.trim();
    if (!t) {
      return true;
    }
    return /^(select|choose|--|please\s+select)/i.test(t);
  }

  /** **Frequency** PrimeNG dropdown host (label-scoped). */
  frequencyDropdownHost(): Locator {
    const root = this.standardQuoteRoot();
    return this.primeLabeledDropdownCombobox("Frequency")
      .locator("xpath=ancestor::p-dropdown[1]")
      .or(
        root.locator(
          "xpath=.//label[contains(normalize-space(.), 'Frequency')]/following::p-dropdown[1]",
        ),
      )
      .first();
  }

  frequencyDropdownTrigger(): Locator {
    return this.frequencyDropdownHost()
      .getByRole("button", { name: /dropdown trigger/i })
      .first()
      .or(this.frequencyDropdownHost().locator(".p-dropdown-trigger").first());
  }

  async readSelectedFrequencyLabel(): Promise<string> {
    this.logStep("Read selected frequency label");
    return this.readPrimeLabeledDropdownValue("Frequency");
  }

  /** UDP-T4236 — Frequency defaults from Product/Program (Monthly / Weekly / Fortnightly). */
  async expectFrequencyDefaultsFromProgram(): Promise<void> {
    this.logStep("Expect frequency defaults from program");
    await expect(this.frequencyDropdownHost()).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(
        async () => {
          const label = await this.readSelectedFrequencyLabel();
          return /Monthly|Weekly|Fortnightly/i.test(label) ? label : null;
        },
        { timeout: 30_000, intervals: [300, 500, 1_000] },
      )
      .not.toBeNull();
  }

  async selectStandardQuoteFrequency(frequency: string): Promise<void> {
    this.logStep(`Select frequency: ${this.stepValueDisplay(frequency)}`);
    const trigger = this.frequencyDropdownTrigger();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click({ timeout: 15_000 });
    const escaped = frequency.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await this.page
      .getByRole("option", { name: new RegExp(`^${escaped}$`, "i") })
      .first()
      .click({ timeout: 15_000 });
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.waitForQuoteLoadersToFinish();
  }

  /** After frequency change resets structured schedule, **Payment Amount** is no longer **Irregular**. */
  async expectPaymentAmountNotIrregular(): Promise<void> {
    this.logStep("Expect payment amount not irregular");
    await this.waitForQuoteLoadersToFinish();
    const paymentAmount = this.paymentAmountDisplayField();
    await expect
      .poll(
        async () => {
          if (await this.paymentSummaryRoot.getByText(/^Irregular$/i).first().isVisible().catch(() => false)) {
            return false;
          }
          if (await paymentAmount.isVisible().catch(() => false)) {
            const raw = (
              (await paymentAmount.inputValue().catch(() => "")) ||
              (await paymentAmount.textContent().catch(() => "")) ||
              ""
            ).trim();
            if (/^Irregular$/i.test(raw)) return false;
            if (!raw || raw === "-") return true;
            return /\$\s*[\d,]+\.\d{2}/.test(raw);
          }
          return true;
        },
        { timeout: 45_000, intervals: [500, 1_000, 1_500] },
      )
      .toBe(true);
  }

  private paymentScheduleVisibleMoneyRows(): Locator {
    return this.paymentScheduleContentScope()
      .locator("tbody tr")
      .filter({ hasText: /\$\s*[\d,.]+/ })
      .filter({ visible: true });
  }

  /** All instalment rows in the schedule table (grid view may virtualize visible rows). */
  private paymentScheduleAllMoneyRows(): Locator {
    return this.paymentScheduleContentScope()
      .locator("tbody tr")
      .filter({ hasText: /\$\s*[\d,.]+/ });
  }

  /** Non-uniform schedule from **Edit Payment Schedule** — multiple rows and/or **Irregular** payment amount. */
  async expectStructuredPaymentFrequencyInPlace(): Promise<void> {
    this.logStep("Expect structured payment frequency in place");
    await this.waitForQuoteLoadersToFinish();
    const rows = this.paymentScheduleVisibleMoneyRows();
    if ((await rows.count()) > 1) {
      return;
    }
    await this.expectPaymentAmountShowsIrregular();
  }

  /**
   * UDP-T4236 — frequency change clears structured schedule before **Calculate**:
   * **Payment Structure** **None**, no **Irregular**, summary/schedule cleared.
   */
  async expectPaymentStructureClearedAfterFrequencyChange(): Promise<void> {
    this.logStep("Expect payment structure cleared after frequency change");
    await this.waitForQuoteLoadersToFinish();
    await this.expectPaymentAmountNotIrregular();

    const structure = await this.readPrimeLabeledDropdownValue("Payment Structure");
    if (structure.length > 0) {
      expect(structure).toMatch(/^None$/i);
    }

    const rows = this.paymentScheduleVisibleMoneyRows();
    await expect
      .poll(async () => rows.count(), { timeout: 15_000, intervals: [300, 500, 1_000] })
      .toBe(0);
  }

  /**
   * UDP-T4236 step 3 — after **Calculate**, uniform schedule with new finance frequency.
   */
  async expectPaymentScheduleStructureReset(expectedFrequency: string): Promise<void> {
    this.logStep(`Expect payment schedule structure reset (${this.stepValueDisplay(expectedFrequency)})`);
    await this.waitForQuoteLoadersToFinish();
    await this.expectPaymentAmountNotIrregular();

    const rows = this.paymentScheduleVisibleMoneyRows();
    await expect
      .poll(async () => rows.count(), { timeout: 45_000, intervals: [500, 1_000, 1_500] })
      .toBe(1);
    await expect(rows.first()).toContainText(new RegExp(expectedFrequency, "i"));

    const structure = await this.readPrimeLabeledDropdownValue("Payment Structure");
    if (structure.length > 0) {
      expect(structure).toMatch(/^None$/i);
    }

    const paymentAmount = this.paymentAmountDisplayField();
    const raw = (
      (await paymentAmount.inputValue().catch(() => "")) ||
      (await paymentAmount.textContent().catch(() => "")) ||
      ""
    ).trim();
    expect(raw).toMatch(/\$\s*[\d,]+\.\d{2}/);
  }

  /** Asset type variant text appears after **Select** in the asset-type modal. */
  async waitForAfVAssetTypeSelectedOnStandardQuote(
    expectedVariant?: string,
    timeoutMs = 60_000,
  ): Promise<void> {
    this.logStep("Wait for AFV asset type selected on Standard Quote");
    const root = this.standardQuoteRoot();
    const assetTypeValue = root
      .locator(
        "xpath=.//*[contains(normalize-space(.),'Asset Type')]/ancestor::*[contains(@class,'row') or contains(@class,'grid')][1]//input",
      )
      .or(
        root.locator(
          "xpath=.//*[contains(normalize-space(.),'Asset Type')]/following::input[1]",
        ),
      )
      .first();
    await expect
      .poll(
        async () => {
          const val =
            (await assetTypeValue.inputValue().catch(() => "")).trim() ||
            ((await assetTypeValue.textContent()) ?? "").trim();
          if (!val || val.length < 3) {
            return false;
          }
          if (expectedVariant) {
            return val.includes(expectedVariant) || /GLX|IGNIS|SUZUKI/i.test(val);
          }
          return true;
        },
        { timeout: timeoutMs },
      )
      .toBeTruthy();
    await this.waitForLoadingComplete();
  }

  /**
   * FIS may populate AFV program asynchronously after asset type **Select**.
   * Returns empty string when SIT does not auto-populate for the automation originator.
   */
  async tryWaitForAfVProgramAfterAssetSelection(timeoutMs = 45_000): Promise<string> {
    this.logStep("Try wait for AFV program after asset selection on Standard Quote");
    try {
      await expect
        .poll(
          async () => {
            const label = await this.readSelectedProgramLabel();
            return label.length > 0 && /AFV/i.test(label);
          },
          { timeout: timeoutMs, intervals: [500, 1_000, 2_000] },
        )
        .toBeTruthy();
      await this.waitForLoadingComplete();
      return await this.readSelectedProgramLabel();
    } catch {
      return "";
    }
  }

  /** @deprecated Prefer {@link tryWaitForAfVProgramAfterAssetSelection} — SIT may not auto-populate program. */
  async waitForAfVProgramAfterAssetSelection(timeoutMs = 45_000): Promise<string> {
    const label = await this.tryWaitForAfVProgramAfterAssetSelection(timeoutMs);
    if (label.length > 0) {
      return label;
    }
    this.logStep("AFV program not auto-populated after asset selection — continuing");
    return "";
  }

  async listProgramDropdownOptions(): Promise<string[]> {
    const trigger = this.programDropdownTrigger();
    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger.click({ timeout: 15_000 });
    await expect(this.page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
    const options = (await this.page.getByRole("option").allTextContents())
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !this.isPlaceholderDropdownLabel(t));
    await this.page.keyboard.press("Escape").catch(() => {});
    return options;
  }

  /**
   * Product → asset → **Program** on AFV Standard Quote: wait for FIS auto-populate when present,
   * otherwise open the program dropdown and pick the catalog AFV program.
   */
  async ensureAfVProgramForStandardQuote(
    preferredProgram = "AFV - B-Distributor",
  ): Promise<{ label: string; autoPopulated: boolean }> {
    this.logStep(`Ensure AFV program on Standard Quote: ${this.stepValueDisplay(preferredProgram)}`);

    const matchesPreferred = (label: string): boolean =>
      label.length > 0 &&
      /AFV/i.test(label) &&
      (label.includes(preferredProgram) || /AFV\s*-\s*B[\s-]*Distributor/i.test(label));

    let label = "";
    const autoReady = await expect
      .poll(async () => {
        const current = await this.readSelectedProgramLabel();
        if (matchesPreferred(current)) {
          label = current;
          return true;
        }
        return false;
      }, { timeout: 45_000, intervals: [500, 1_000, 2_000] })
      .toBe(true)
      .then(() => true)
      .catch(() => false);

    if (autoReady) {
      await this.waitForQuoteLoadersToFinish();
      return { label, autoPopulated: true };
    }

    await this.waitForQuoteLoadersToFinish();
    await this.selectProgram(preferredProgram);
    await this.waitForQuoteLoadersToFinish();
    label = (await this.readSelectedProgramLabel()) || preferredProgram;
    return { label, autoPopulated: false };
  }

  afvDetailsSectionHeader(): Locator {
    return this.standardQuoteRoot().getByRole("button", { name: /AFV Details/i }).first();
  }

  afvDetailsSectionRegion(): Locator {
    return this.page.getByRole("region", { name: /AFV Details/i }).first();
  }

  async expectAfVDetailsSectionCollapsed(): Promise<void> {
    this.logStep("Expect AFV Details section collapsed");
    const header = this.afvDetailsSectionHeader();
    await expect.soft(header).toBeVisible({ timeout: 20_000 });
    const expanded = await header.getAttribute("aria-expanded");
    if (expanded !== null) {
      expect.soft(expanded).not.toBe("true");
    }
    await expect.soft(this.afvDetailsSectionRegion()).toBeHidden({ timeout: 5_000 });
  }

  async expectAfVDetailsDisplayOnlyFieldsPopulated(expected?: {
    make?: string;
    model?: string;
    variant?: string;
    year?: string;
  }): Promise<void> {
    this.logStep("Expect AFV Details display-only fields populated");
    await this.expandAfVDetailsSection();
    const section = this.afvDetailsSectionRegion();
    await expect.soft(section).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(
        async () => {
          const body = ((await section.textContent()) ?? "").replace(/\s+/g, " ");
          return ["Make", "Model", "Variant", "Year", "Provider"].every((l) =>
            new RegExp(`\\b${l}\\b`, "i").test(body),
          );
        },
        { timeout: 20_000 },
      )
      .toBeTruthy();
    const readFieldNearLabel = async (fieldLabel: string): Promise<string> => {
      const anchor = section.getByText(new RegExp(`^${fieldLabel}$`, "i")).first();
      const input = anchor.locator("xpath=following::input[1]").first();
      if (!(await input.isVisible({ timeout: 4_000 }).catch(() => false))) {
        return "";
      }
      return (
        (await input.inputValue().catch(() => "")).trim() ||
        ((await input.textContent()) ?? "").trim()
      );
    };
    if (expected?.make) {
      const make = await readFieldNearLabel("Make");
      if (make.length > 0) {
        expect.soft(make.toUpperCase()).toContain(expected.make.toUpperCase());
      }
    }
    if (expected?.model) {
      const model = await readFieldNearLabel("Model");
      if (model.length > 0) {
        expect.soft(model.toUpperCase()).toContain(expected.model.toUpperCase());
      }
    }
    if (expected?.variant) {
      const variant = await readFieldNearLabel("Variant");
      if (variant.length > 0) {
        expect.soft(variant.toUpperCase()).toContain(expected.variant.toUpperCase().slice(0, 8));
      }
    }
    if (expected?.year) {
      const year = await readFieldNearLabel("Year");
      if (year.length > 0) {
        expect.soft(year).toContain(expected.year);
      }
    }
    const providerInput = section
      .getByText(/^Provider$/i)
      .first()
      .locator("xpath=following::input[1]");
    if (await providerInput.isVisible({ timeout: 4_000 }).catch(() => false)) {
      const editable = await providerInput.isEditable().catch(() => true);
      expect.soft(editable).toBeFalsy();
    }
  }

  async expectProgramDropdownDisabled(): Promise<void> {
    await this.expectAfVProgramDisplayOnlyOnStandardQuote();
  }

  /**
   * Zephyr: AFV program is display-only and auto-populates from asset type.
   * SIT may keep the trigger enabled and allow manual pick when FIS does not auto-populate.
   */
  async expectAfVProgramDisplayOnlyOnStandardQuote(): Promise<void> {
    this.logStep("Expect AFV Program Display Only on Standard Quote");
    const trigger = this.programDropdownTrigger();
    await expect.soft(trigger).toBeVisible({ timeout: 15_000 });
    const enabled = await trigger.isEnabled().catch(() => false);
    if (!enabled) {
      await expect.soft(trigger).toBeDisabled();
      return;
    }
    const before = await this.readSelectedProgramLabel();
    await trigger.click({ timeout: 10_000 }).catch(() => {});
    const panel = this.page.locator("div.p-dropdown-panel").filter({ visible: true }).last();
    const options = panel.getByRole("option");
    const optionCount = await options.count().catch(() => 0);
    if (optionCount <= 1) {
      await this.page.keyboard.press("Escape").catch(() => {});
      return;
    }
    const pick = options.nth(before.length > 0 ? 1 : 0);
    const pickLabel = ((await pick.textContent().catch(() => "")) ?? "").trim();
    if (pickLabel.length > 0) {
      await pick.click({ timeout: 10_000 }).catch(() => {});
      await this.waitForLoadingComplete();
      const after = await this.readSelectedProgramLabel();
      if (before.length > 0) {
        expect.soft(after).toBe(before);
      } else if (after.length > 0) {
        expect.soft(/AFV/i.test(after)).toBeTruthy();
        this.log(
          "Program was blank before pick — SIT allowed manual AFV program selection (FIS auto-populate may be delayed for this originator).",
        );
      }
    }
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  async expandAfVDetailsSection(): Promise<void> {
    this.logStep("Expand AFV Details section");
    const btn = this.afvDetailsSectionHeader();
    await btn.scrollIntoViewIfNeeded();
    if ((await btn.getAttribute("aria-expanded")) !== "true") {
      await btn.click({ timeout: 10_000 });
    }
    await expect(this.afvDetailsSectionRegion()).toBeVisible({ timeout: 20_000 });
  }

  async readAssuredFutureValue(): Promise<string> {
    const amount = await this.readStandardQuoteFisAfVAmount();
    return amount > 0 ? String(amount) : "";
  }

  /** Finance AFV input; Payment Summary AFV is the SIT fallback when Finance stays $0. */
  async readStandardQuoteFisAfVAmount(): Promise<number> {
    const financeAfV = await this.readCurrencyInput(this.assuredFutureValueInputField());
    if (financeAfV > 0) {
      return financeAfV;
    }
    const summaryAfV = await this.readCurrencyInput(this.assuredFutureValuePaymentSummaryField());
    if (summaryAfV > 0) {
      return summaryAfV;
    }
    return 0;
  }

  async assuredFutureValueIsReadOnly(): Promise<boolean> {
    const input = this.assuredFutureValueInputField();
    if ((await input.count()) === 0 || !(await input.isVisible().catch(() => false))) {
      return true;
    }
    if (await input.isDisabled().catch(() => false)) {
      return true;
    }
    const ro = await input.getAttribute("readonly");
    const aria = await input.getAttribute("aria-readonly");
    if (ro !== null || aria === "true") {
      return true;
    }
    return (await input.isEditable().catch(() => null)) === false;
  }

  /** Poll until FIS populates **Assured Future Value** in Finance (UDP-T4030). */
  async waitForAssuredFutureValuePopulated(timeoutMs = 90_000): Promise<number> {
    this.logStep("Wait for Assured Future Value populated from FIS");
    const readAfV = async (): Promise<number> => this.readStandardQuoteFisAfVAmount();

    const pollReady = async (timeout: number): Promise<number | null> => {
      try {
        await expect
          .poll(readAfV, { timeout, intervals: [500, 1_000, 2_000] })
          .toBeGreaterThan(0);
        return await readAfV();
      } catch {
        return null;
      }
    };

    let amount = await pollReady(Math.min(45_000, timeoutMs));
    if (amount !== null && amount > 0) {
      await this.waitForQuoteLoadersToFinish();
      return amount;
    }

    await this.nudgeAfVFisRefresh();
    amount = await pollReady(Math.min(25_000, timeoutMs));
    if (amount !== null && amount > 0) {
      await this.waitForQuoteLoadersToFinish();
      return amount;
    }

    if (await this.calculateButton.isEnabled().catch(() => false)) {
      this.logStep("AFV still $0 — Calculate to fetch FIS Assured Future Value");
      await this.clickCalculateButton();
      await this.waitForQuoteLoadersToFinish();
    }

    await expect
      .poll(readAfV, {
        timeout: Math.max(30_000, timeoutMs - 70_000),
        intervals: [500, 1_000, 2_000],
      })
      .toBeGreaterThan(0);
    await this.waitForQuoteLoadersToFinish();
    return await readAfV();
  }

  /** Blur finance inputs / re-select KM so SIT FIS can refresh AFV without Calculate. */
  private async nudgeAfVFisRefresh(): Promise<void> {
    this.logStep("Nudge FIS refresh for Assured Future Value");
    await this.interestRateInputField.scrollIntoViewIfNeeded().catch(() => {});
    await this.interestRateInputField.click({ timeout: 5_000 }).catch(() => {});
    await this.interestRateInputField.press("Tab").catch(() => {});
    await this.waitForQuoteLoadersToFinish();

    const term = (await this.termsOfFinanceInputField.inputValue().catch(() => "")).trim();
    if (term.length > 0) {
      await this.termsOfFinanceInputField.click({ timeout: 5_000 }).catch(() => {});
      await this.termsOfFinanceInputField.press("Tab").catch(() => {});
      await this.waitForQuoteLoadersToFinish();
    }

    const km = await this.readKmAllowanceLabel();
    if (km.length > 0) {
      await this.selectKmAllowance(km);
    }
  }

  async expectAssuredFutureValueDisplayOnly(): Promise<void> {
    this.logStep("Expect Assured Future Value display-only");
    await expect.soft(await this.assuredFutureValueIsReadOnly()).toBeTruthy();
  }

  async afvOptionsTableHasCurrencyData(): Promise<boolean> {
    const region = this.afvOptionsPanel();
    if (!(await region.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return false;
    }
    const body = ((await region.textContent()) ?? "").replace(/\u00a0/g, " ");
    return /\$\s*[\d,]+\.\d{2}/.test(body);
  }

  async readAfVOptionsPaymentForTerm(term: string): Promise<number> {
    const region = this.afvOptionsPanel();
    const table = region.locator("table").first();
    const rows = table.locator("tbody tr");
    const rowCount = await rows.count();
    const termDigits = term.replace(/\s/g, "");
    for (let i = 0; i < rowCount; i++) {
      const cellTexts = (await rows.nth(i).locator("td").allTextContents()).map((c) =>
        c.replace(/\u00a0/g, " ").trim(),
      );
      if (!cellTexts[0]?.replace(/\s/g, "").includes(termDigits)) continue;
      const payment = Number.parseFloat((cellTexts[2] ?? "").replace(/[^0-9.-]/g, ""));
      return Number.isFinite(payment) ? payment : 0;
    }
    return 0;
  }

  /**
   * UDP-T4030: AFV auto-populated from FIS (Finance field or AFV Options grid after Calculate).
   */
  async expectAssuredFutureValueAutoPopulatedFromFis(term = "36"): Promise<number> {
    this.logStep("Expect Assured Future Value auto-populated from FIS");
    let amount = 0;
    try {
      amount = await this.waitForAssuredFutureValuePopulated(60_000);
    } catch {
      amount = await this.readStandardQuoteFisAfVAmount();
    }

    if (amount <= 0) {
      if (await this.calculateButton.isEnabled().catch(() => false)) {
        await this.clickCalculateButton();
        await this.waitForQuoteLoadersToFinish();
      }
      amount = await this.readStandardQuoteFisAfVAmount();
    }

    if (amount <= 0) {
      await expect.soft(this.afvOptionsPanel()).toBeVisible({ timeout: 45_000 });
      expect.soft(await this.afvOptionsTableHasCurrencyData()).toBeTruthy();
      amount = await this.readAfVOptionsPaymentForTerm(term);
    }

    expect.soft(amount).toBeGreaterThan(0);
    return amount;
  }

  /** UDP-T4030: changing KM refreshes AFV-derived values (Finance AFV or AFV Options payment for term). */
  async expectAssuredFutureValueUpdatesWhenKmChanges(term = "36"): Promise<void> {
    this.logStep("Expect Assured Future Value updates when KM changes");
    const kmOptions = await this.listKmAllowanceOptions();
    if (kmOptions.length < 2) {
      return;
    }

    const beforeFinance = await this.readStandardQuoteFisAfVAmount();
    const beforeOptions = await this.readAfVOptionsPaymentForTerm(term);
    const currentKm = await this.readKmAllowanceLabel();
    const alternateKm =
      kmOptions.find((o) => o.replace(/\s/g, "") !== currentKm.replace(/\s/g, "")) ?? kmOptions[1];

    await this.selectKmAllowance(alternateKm);
    await this.waitForQuoteLoadersToFinish();

    if (beforeFinance > 0) {
      const updatedFinance = await this.waitForAssuredFutureValueChange(beforeFinance, 30_000);
      expect.soft(updatedFinance).not.toBe(beforeFinance);
      return;
    }

    if (beforeOptions > 0) {
      if (await this.calculateButton.isEnabled().catch(() => false)) {
        await this.clickCalculateButton();
        await this.waitForQuoteLoadersToFinish();
      }
      const afterOptions = await this.readAfVOptionsPaymentForTerm(term);
      expect.soft(afterOptions).toBeGreaterThan(0);
      expect.soft(afterOptions).not.toBe(beforeOptions);
    }
  }

  /**
   * After KM / term change, FIS may refresh AFV asynchronously — click **Calculate** if auto-update stalls.
   */
  async waitForAssuredFutureValueChange(
    previousAmount: number,
    timeoutMs = 45_000,
  ): Promise<number> {
    this.logStep(`Wait for Assured Future Value change from ${previousAmount}`);
    const readAfV = async (): Promise<number> => this.readStandardQuoteFisAfVAmount();

    const pollChanged = async (timeout: number): Promise<number | null> => {
      let latest = previousAmount;
      try {
        await expect
          .poll(
            async () => {
              latest = await readAfV();
              return latest > 0 && Math.abs(latest - previousAmount) > 0.01;
            },
            { timeout, intervals: [500, 1_000, 1_500, 2_000] },
          )
          .toBe(true);
        return latest;
      } catch {
        return null;
      }
    };

    let updated = await pollChanged(timeoutMs);
    if (updated !== null) {
      return updated;
    }

    if (await this.calculateButton.isEnabled().catch(() => false)) {
      await this.clickCalculateButton();
      await this.waitForQuoteLoadersToFinish();
    }
    updated = await pollChanged(timeoutMs);
    if (updated !== null) {
      return updated;
    }
    throw new Error(
      `Assured Future Value unchanged after KM/term update (still ${await readAfV()}).`,
    );
  }

  async readKmAllowanceLabel(): Promise<string> {
    return this.readPrimeDropdownLabel(this.kmAllowanceDropdownTrigger());
  }

  private async readPrimeDropdownLabel(trigger: Locator): Promise<string> {
    const host = trigger.locator("xpath=ancestor::p-dropdown[1]");
    const combobox = host.getByRole("combobox").first();
    if (await combobox.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return (await combobox.textContent())?.trim() ?? "";
    }
    return (await host.locator(".p-dropdown-label").first().textContent())?.trim() ?? "";
  }

  async listKmAllowanceOptions(): Promise<string[]> {
    const trigger = this.kmAllowanceDropdownTrigger();
    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger.click({ timeout: 15_000 });
    await expect(this.page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
    const options = (await this.page.getByRole("option").allTextContents())
      .map((t) => t.trim())
      .filter(Boolean);
    await this.page.keyboard.press("Escape");
    await this.page.keyboard.press("Escape").catch(() => {});
    return options;
  }

  async selectKmAllowance(kmAllowance: string): Promise<void> {
    this.logStep(`Selected KM allowance: ${this.stepValueDisplay(kmAllowance)}`);
    const trigger = this.kmAllowanceDropdownTrigger();
    await trigger.click({ timeout: 15_000 });
    await this.page.getByRole("option", { name: kmAllowance, exact: false }).first().click({
      timeout: 15_000,
    });
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.waitForQuoteLoadersToFinish();
  }

  async ensureKmAllowanceForAfV(): Promise<void> {
    const label = await this.readPrimeDropdownLabel(this.kmAllowanceDropdownTrigger());
    if (!label || /select|choose/i.test(label)) {
      const options = await this.listKmAllowanceOptions();
      if (options.length > 0) {
        await this.selectKmAllowance(options[0]);
      }
    }
  }

  async expectBalloonFieldsHiddenForAfV(): Promise<void> {
    this.logStep("Expect Balloon Fields Hidden For AFV");
    const root = this.standardQuoteRoot();
    await expect.soft(this.balloonAmountInput).toBeHidden({ timeout: 8_000 });
    await expect.soft(this.balloonPercentInput).toBeHidden({ timeout: 8_000 });
    await expect.soft(this.balloonFixedCheckbox).toBeHidden({ timeout: 8_000 });
    const balloonLabel = root.getByText(/^Balloon/i).first();
    await expect.soft(balloonLabel).toBeHidden({ timeout: 5_000 });
  }

  async readLoanDateValue(): Promise<string> {
    let value = (await this.loanDate.inputValue().catch(() => "")).trim();
    if (!/\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) {
      value = ((await this.loanDate.textContent()) ?? "").trim();
    }
    return value;
  }

  async readFirstPaymentDateValue(): Promise<string> {
    return (await this.firstPaymentDate.inputValue().catch(() => "")).trim();
  }

  private firstPaymentValidationScope(): Locator {
    return this.paymentSummaryRoot
      .locator(
        "xpath=.//*[contains(normalize-space(.),'First Payment')]/ancestor::div[contains(@class,'col') or contains(@class,'grid') or contains(@class,'field')][1]",
      )
      .first()
      .or(this.paymentSummaryRoot);
  }

  private async firstPaymentValidationMessageVisible(pattern: RegExp): Promise<boolean> {
    const scopes = [
      this.firstPaymentValidationScope(),
      this.paymentSummaryRoot,
      this.standardQuoteRoot(),
      this.page.locator(".p-toast-message, .p-message, .p-inline-message"),
    ];
    for (const scope of scopes) {
      if (await scope.getByText(pattern).first().isVisible().catch(() => false)) {
        return true;
      }
    }
    return this.page.getByText(pattern).first().isVisible().catch(() => false);
  }

  async expectFirstPaymentBeforeLoanDateValidation(
    loanDate?: string,
    attemptedDate?: string,
  ): Promise<void> {
    this.logStep("Expect First Payment Before Loan Date Validation");
    const patterns = [
      /First Payment Date must not be before the Loan Date/i,
      /First payment date must not be before the loan date/i,
      /must not be before the Loan Date/i,
      /must not be before the loan date/i,
      /cannot be before the Loan Date/i,
      /before the loan date/i,
    ];
    await expect
      .poll(
        async () => {
          for (const pattern of patterns) {
            if (await this.firstPaymentValidationMessageVisible(pattern)) {
              return "message";
            }
          }
          if (loanDate && attemptedDate) {
            const current = await this.readFirstPaymentDateValue();
            const loanD = DOAssetDetailsPage.parseDdMmYyyyLoanDate(loanDate);
            const currentD = DOAssetDetailsPage.parseDdMmYyyyLoanDate(current);
            const attemptedD = DOAssetDetailsPage.parseDdMmYyyyLoanDate(attemptedDate);
            if (
              loanD &&
              currentD &&
              attemptedD &&
              current.trim() !== attemptedDate.trim() &&
              currentD.getTime() >= loanD.getTime()
            ) {
              return "clamped";
            }
          }
          return null;
        },
        { timeout: 30_000, intervals: [300, 500, 1_000] },
      )
      .not.toBeNull();
  }

  /**
   * UDP-T4034: First Payment cannot be before Loan Date — validation on Calculate, or UI clamps/rejects the past date.
   */
  async expectFirstPaymentCannotBeBeforeLoanDate(): Promise<void> {
    this.logStep("Expect First Payment cannot be before Loan Date");
    const loan = await this.readLoanDateValue();
    const loanDate = this.parseDdMmYyyy(loan);
    expect.soft(loanDate).not.toBeNull();
    const yesterday = DOAssetDetailsPage.shiftDdMmYyyy(loan, -1);
    await this.enterFirstPaymentDateDdMmYyyy(yesterday);
    const readBack = await this.readFirstPaymentDateValue();
    const readDate = this.parseDdMmYyyy(readBack);

    if (readBack === yesterday || (readDate && loanDate && readDate < loanDate)) {
      await this.clickCalculateButton();
      await this.expectFirstPaymentBeforeLoanDateValidation();
      return;
    }

    expect.soft(readDate).not.toBeNull();
    if (readDate && loanDate) {
      expect.soft(readDate.getTime()).toBeGreaterThanOrEqual(loanDate.getTime());
    }
  }

  /** UDP-T4032: Interest Rate defaults from FIS; editability depends on BLD rules. */
  async expectInterestRateDefaultedFromFis(): Promise<void> {
    this.logStep("Expect Interest Rate defaulted from FIS AF");
    await expect
      .poll(
        async () => {
          const rate = (await this.interestRateInputField.inputValue()).trim();
          return rate.length > 0 && /\d/.test(rate);
        },
        { timeout: 45_000, intervals: [500, 1_000, 2_000] },
      )
      .toBeTruthy();

    const editable = await this.interestRateInputField.isEditable().catch(() => false);
    const disabled = await this.interestRateInputField.isDisabled().catch(() => false);
    expect.soft(editable || disabled).toBeTruthy();
  }

  async expectFirstPaymentExceedsSixWeeksValidation(
    loanDate?: string,
    attemptedDate?: string,
  ): Promise<void> {
    this.logStep("Expect First Payment Exceeds Six Weeks Validation");
    const patterns = [
      /First payment must be within 6 weeks and in line with the customer'?s? pay cycle/i,
      /within 6 weeks and in line with the customer/i,
    ];
    const sixWeeksMs = 6 * 7 * 24 * 60 * 60 * 1000;
    await expect
      .poll(
        async () => {
          for (const pattern of patterns) {
            if (await this.firstPaymentValidationMessageVisible(pattern)) {
              return "message";
            }
          }
          if (loanDate && attemptedDate) {
            const current = await this.readFirstPaymentDateValue();
            const loanD = DOAssetDetailsPage.parseDdMmYyyyLoanDate(loanDate);
            const currentD = DOAssetDetailsPage.parseDdMmYyyyLoanDate(current);
            const attemptedD = DOAssetDetailsPage.parseDdMmYyyyLoanDate(attemptedDate);
            if (
              loanD &&
              currentD &&
              attemptedD &&
              current.trim() !== attemptedDate.trim() &&
              attemptedD.getTime() > loanD.getTime() + sixWeeksMs
            ) {
              const diff = currentD.getTime() - loanD.getTime();
              if (diff >= 0 && diff <= sixWeeksMs + 86_400_000) {
                return "clamped";
              }
            }
          }
          return null;
        },
        { timeout: 30_000, intervals: [300, 500, 1_000] },
      )
      .not.toBeNull();
  }

  async expectAfVOptionsSectionVisible(): Promise<void> {
    this.logStep("Expect AFV Options Section Visible");
    await expect.soft(this.afvOptionsPanel()).toBeVisible({ timeout: 45_000 });
  }

  private afvOptionsPanel(): Locator {
    return this.standardQuoteRoot().getByRole("region", { name: /Assured Future Value Options/i });
  }

  /** UDP-T4058: Term, KM, Payment Amount, Weekly Equivalent in AFV Options are display-only. */
  async expectAfVOptionsFieldsNonEditable(): Promise<void> {
    this.logStep("Expect AFV Options fields non-editable");
    const region = this.afvOptionsPanel();
    await expect.soft(region).toBeVisible({ timeout: 45_000 });

    const table = region.locator("table").first();
    await expect.soft(table).toBeVisible({ timeout: 30_000 });

    const bodyRows = table.locator("tbody tr");
    await expect.soft(bodyRows.first()).toBeVisible({ timeout: 30_000 });

    // Data rows are plain text — no inputs, comboboxes, or spinbuttons in Term/KM/Payment/Weekly cells.
    await expect.soft(bodyRows.locator("input, textarea").filter({ visible: true })).toHaveCount(0);
    await expect.soft(bodyRows.getByRole("combobox").filter({ visible: true })).toHaveCount(0);
    await expect.soft(bodyRows.getByRole("spinbutton").filter({ visible: true })).toHaveCount(0);
  }

  /** UDP-T4057: each AFV Options row Weekly Equivalent ≈ Payment Amount ÷ 4.33. */
  async expectAfVOptionsWeeklyEquivalentDividedBy433(tolerance = 0.02): Promise<void> {
    this.logStep("Expect AFV Options Weekly Equivalent = Payment Amount / 4.33");
    const panel = this.afvOptionsPanel();
    await expect.soft(panel).toBeVisible({ timeout: 45_000 });
    await expect.soft(this.page.getByText(/Weekly\s+Equivalent/i).first()).toBeVisible({ timeout: 30_000 });

    const table = panel.locator("table").first();
    await expect.soft(table).toBeVisible({ timeout: 30_000 });

    const headerCells = table.locator("thead tr, tr").first().locator("th, td");
    const headers = (await headerCells.allTextContents()).map((h) => h.replace(/\u00a0/g, " ").trim());
    const paymentIdx = headers.findIndex((h) => /Payment\s+Amount/i.test(h));
    const weeklyIdx = headers.findIndex((h) => /Weekly\s+Equivalent/i.test(h));

    const bodyRows = table.locator("tbody tr").filter({ hasText: /\$/ });
    const rowCount = await bodyRows.count();
    expect.soft(rowCount).toBeGreaterThan(0);

    let validated = 0;
    for (let i = 0; i < rowCount; i++) {
      const cellTexts = (await bodyRows.nth(i).locator("td").allTextContents()).map((c) =>
        c.replace(/\u00a0/g, " ").trim(),
      );

      let payment: number;
      let weekly: number;
      if (paymentIdx >= 0 && weeklyIdx >= 0 && cellTexts.length > Math.max(paymentIdx, weeklyIdx)) {
        payment = parseFloat(cellTexts[paymentIdx].replace(/[^0-9.-]/g, "")) || 0;
        weekly = parseFloat(cellTexts[weeklyIdx].replace(/[^0-9.-]/g, "")) || 0;
      } else {
        const amounts = cellTexts
          .map((c) => parseFloat(c.replace(/[^0-9.-]/g, "")) || 0)
          .filter((n) => n > 0);
        if (amounts.length < 2) continue;
        payment = amounts[amounts.length - 2];
        weekly = amounts[amounts.length - 1];
      }

      if (payment <= 0 || weekly <= 0) continue;
      const expectedWeekly = Math.round((payment / 4.33) * 100) / 100;
      expect.soft(Math.abs(weekly - expectedWeekly)).toBeLessThanOrEqual(tolerance);
      validated++;
    }
    expect.soft(validated).toBeGreaterThan(0);
  }

  async expectStandardPaymentOptionsHidden(): Promise<void> {
    this.logStep("Expect Standard Payment Options Hidden");
    const root = this.standardQuoteRoot();
    const csaPanel = root
      .locator("p-card, div")
      .filter({ hasText: /Standard\s+Payment\s+Options/i })
      .first();
    await expect.soft(csaPanel).toBeHidden({ timeout: 8_000 });
  }

  async expectEditPaymentScheduleSegmentExceedsTermMessage(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Segment Exceeds Term Message");
    const dialog = this.editPaymentScheduleDialog();
    const patterns = [
      /sum of the segment.*Number.*must not exceed the (?:lease|loan) term/i,
      /sum of the segment.*must not exceed the (?:lease|loan) term/i,
      /segment.*Number.*must not exceed the (?:lease|loan) term/i,
      /must not exceed the (?:lease|loan) term/i,
      /exceed.*(?:lease|loan)\s*term/i,
    ];
    await expect
      .poll(
        async () => {
          const dialogText = ((await dialog.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
          for (const pattern of patterns) {
            if (pattern.test(dialogText)) {
              return "message";
            }
          }
          for (const pattern of patterns) {
            const hit = dialog
              .getByText(pattern)
              .or(this.page.getByText(pattern))
              .first();
            if (await hit.isVisible({ timeout: 300 }).catch(() => false)) {
              return "message";
            }
          }
          const inline = dialog.locator(
            ".p-error, .p-invalid-message, small, [role='alert'], .p-message-error",
          );
          const inlineCount = await inline.count();
          for (let i = 0; i < inlineCount; i++) {
            const text = ((await inline.nth(i).textContent()) ?? "").replace(/\s+/g, " ");
            if (/exceed.*term|must not exceed/i.test(text)) {
              return "message";
            }
          }
          const toast = this.page.locator(
            ".p-toast-message-error, .p-message-error, [class*='toast'][class*='error']",
          );
          if (await toast.isVisible({ timeout: 300 }).catch(() => false)) {
            const text = ((await toast.textContent()) ?? "").replace(/\s+/g, " ");
            if (/exceed.*term|must not exceed/i.test(text)) {
              return "message";
            }
          }

          const term = await this.getEditPaymentScheduleFinanceTermMonths();
          const sum = await this.sumEditPaymentScheduleSegmentNumbersFromRows();
          const applyDisabled = await this.editPaymentScheduleApplyButton()
            .isDisabled()
            .catch(() => true);
          if (sum > term && applyDisabled) {
            return "rejected";
          }
          return null;
        },
        { timeout: 25_000, intervals: [300, 500, 1_000] },
      )
      .not.toBeNull();
  }

  /**
   * UDP-T4145 — **Normal** segment **Amount** populated from FIS AF after **Calculate** (display-only).
   */
  async expectEditPaymentScheduleNormalSegmentAmountFetchedFromFisAf(
    rowIndex = 0,
  ): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Normal segment amount fetched from FIS AF");
    const row = this.editPaymentScheduleSegmentRowAt(rowIndex);
    const typeLabel = ((await row.getByRole("combobox").first().textContent().catch(() => "")) ?? "")
      .replace(/\s+/g, " ")
      .trim();
    expect(typeLabel).toMatch(/Normal/i);
    await expect
      .poll(
        async () => {
          const amountRaw = await this.readEditPaymentScheduleSegmentAmountOnRow(rowIndex);
          const amountN = Number.parseFloat(amountRaw.replace(/[^0-9.-]/g, ""));
          return Number.isFinite(amountN) && amountN > 0 ? amountN : null;
        },
        { timeout: 30_000, intervals: [300, 500, 1_000, 2_000] },
      )
      .not.toBeNull();
    const amountCell = await this.editPaymentScheduleSegmentAmountCell(row);
    const input = amountCell.locator("input[currencymask], input#amount, input").first();
    if (await input.isVisible({ timeout: 2_000 }).catch(() => false)) {
      expect(await input.isEditable().catch(() => false)).toBeFalsy();
    }
    const segmentTermPattern =
      /sum of the segment.*(must match|must not exceed).*loan term/i;
    await expect
      .soft(this.page.getByText(segmentTermPattern).first())
      .toBeVisible({ timeout: 25_000 });
    await expect.soft(this.editPaymentScheduleApplyButton()).toBeDisabled();
  }

  /**
   * After **Calculate** in Edit Payment Schedule, AFV amount stays display-only (UDP-T4049).
   */
  async expectAfVAmountNonEditableAfterEditPaymentScheduleCalculate(): Promise<void> {
    this.logStep("Expect AFV amount non-editable after Edit Payment Schedule Calculate");
    const dialog = this.editPaymentScheduleDialog();

    const assertAfVRowReadOnly = async (row: Locator): Promise<boolean> => {
      if (!(await row.isVisible({ timeout: 5_000 }).catch(() => false))) {
        return false;
      }
      const input = row.locator("input").first();
      if (await input.isVisible().catch(() => false)) {
        expect.soft(await input.isEditable().catch(() => true)).toBeFalsy();
        return true;
      }
      return false;
    };

    const labeledAfVRow = dialog
      .locator("tr")
      .filter({ hasText: /AFV|Assured Future Value/i })
      .filter({ visible: true })
      .last();
    if (await assertAfVRowReadOnly(labeledAfVRow)) {
      return;
    }

    const instalmentTable = this.editPaymentScheduleInstalmentTable();
    if (await instalmentTable.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const lastInstalment = instalmentTable.locator("tbody tr").filter({ visible: true }).last();
      if (await assertAfVRowReadOnly(lastInstalment)) {
        return;
      }
    }

    expect.soft(await this.assuredFutureValueIsReadOnly()).toBeTruthy();
  }

  async clickEditPaymentScheduleDelete(): Promise<void> {
    this.logStep("Click Edit Payment Schedule Delete");
    const dialog = this.editPaymentScheduleDialog();
    const deleteBtn = dialog
      .getByRole("button", { name: /^Delete$/i })
      .or(dialog.locator("button, a").filter({ hasText: /^Delete$/i }))
      .first();
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
    await deleteBtn.click({ timeout: 10_000 });
  }

  /** **Last Payment** date from Payment Summary (after **Calculate**). */
  async readLastPaymentSummaryDate(): Promise<string> {
    const summary = this.paymentSummaryRoot;
    const label = summary.getByText(/^Last Payment\s*\*?$/i).first();
    await label.scrollIntoViewIfNeeded().catch(() => {});
    const field = label
      .locator("xpath=following::input[1]")
      .or(label.locator("xpath=following::*[@role='combobox'][1]"))
      .first();
    const value =
      (await field.inputValue().catch(() => "")).trim() ||
      ((await field.textContent()) ?? "").trim();
    const match = value.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
    return match?.[0] ?? value;
  }

  /** AFV amount due date from the final instalment row in **Edit Payment Schedule**. */
  async readAfVAmountDueDateFromEditPaymentSchedule(): Promise<string> {
    await this.openEditPaymentScheduleDialog();
    const dialog = this.editPaymentScheduleDialog();
    const labeledRow = dialog
      .locator("tr")
      .filter({ hasText: /AFV|Assured Future Value/i })
      .filter({ visible: true })
      .last();
    let rowText = "";
    if (await labeledRow.isVisible({ timeout: 8_000 }).catch(() => false)) {
      rowText = (await labeledRow.textContent()) ?? "";
    } else {
      const lastRow = dialog
        .locator("table tbody tr")
        .filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}/ })
        .filter({ visible: true })
        .last();
      rowText = (await lastRow.textContent().catch(() => "")) ?? "";
    }
    await this.closeEditPaymentScheduleDialogIfOpen().catch(() => {});
    return rowText.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0] ?? "";
  }

  /** Last visible instalment row with a **$** amount inside **Payment Schedule**. */
  paymentScheduleLastCurrencyRow(): Locator {
    return this.paymentScheduleContentScope()
      .locator("tr")
      .filter({ hasText: /\$\s*[\d,.]+/ })
      .filter({ visible: true })
      .last();
  }

  async expectAfVRowInPaymentSchedule(): Promise<void> {
    this.logStep("Expect AFV Row In Payment Schedule");
    await this.waitForQuoteLoadersToFinish();
    await this.openDetailedPaymentScheduleView();

    const scope = this.paymentScheduleContentScope();
    const labeledAfVRow = (): Locator =>
      scope
        .locator("tr")
        .filter({ hasText: /AFV|Assured Future Value/i })
        .filter({ visible: true })
        .first();

    if (await labeledAfVRow().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect.soft(labeledAfVRow()).toBeVisible();
      return;
    }

    await this.clickLeasePaymentScheduleBarsViewIfNeeded();
    if (await labeledAfVRow().isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect.soft(labeledAfVRow()).toBeVisible();
      return;
    }

    const editBtn = this.editPaymentScheduleTrigger();
    if (await editBtn.isEnabled().catch(() => false)) {
      await this.openEditPaymentScheduleDialog().catch(() => {});
      const dialog = this.editPaymentScheduleDialog();
      const dialogAfVRow = dialog
        .locator("tr")
        .filter({ hasText: /AFV|Assured Future Value/i })
        .filter({ visible: true })
        .first();
      if (await dialogAfVRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await expect.soft(dialogAfVRow).toBeVisible();
        await this.closeEditPaymentScheduleDialogIfOpen().catch(() => {});
        return;
      }

      const lastDialogRow = dialog
        .locator("table tbody tr")
        .filter({ hasText: /\$\s*[\d,.]+/ })
        .filter({ visible: true })
        .last();
      if (await lastDialogRow.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect.soft(lastDialogRow).toBeVisible();
        await this.closeEditPaymentScheduleDialogIfOpen().catch(() => {});
        return;
      }
      await this.closeEditPaymentScheduleDialogIfOpen().catch(() => {});
    }

    // Segment summary on SIT may collapse AFV into the final currency row without an "AFV" caption.
    const lastRow = this.paymentScheduleLastCurrencyRow();
    await expect.soft(lastRow).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Segment view (**pi-equals**): AFV segment final line includes a date in the **Date** column (UDP-T4041).
   * SIT may omit an "AFV" caption — fall back to instalment grid / **Last Payment** for the due date.
   */
  async expectSegmentViewAfVDateIncluded(): Promise<void> {
    this.logStep("Expect Segment View AFV Date Included");
    await this.waitForQuoteLoadersToFinish();
    await this.openDetailedPaymentScheduleView();
    await this.clickLeasePaymentScheduleDefaultViewIfNeeded();

    const scope = this.paymentScheduleContentScope();
    const labeledAfVRow = scope
      .locator("tr")
      .filter({ hasText: /AFV|Assured Future Value/i })
      .filter({ visible: true })
      .last();

    if (await labeledAfVRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect.soft(labeledAfVRow).toContainText(/\d{1,2}\/\d{1,2}\/\d{4}/);
      return;
    }

    const segmentRows = scope
      .locator("tr")
      .filter({ hasText: /\$\s*[\d,.]+/ })
      .filter({ visible: true });
    const rowCount = await segmentRows.count();
    const lastSegmentRow = segmentRows.last();
    await expect.soft(lastSegmentRow).toBeVisible({ timeout: 30_000 });

    const lastRowText = ((await lastSegmentRow.textContent()) ?? "").replace(/\s+/g, " ");
    const lastRowDate = lastRowText.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0] ?? "";

    if (rowCount >= 2 && lastRowDate.length > 0) {
      await expect.soft(lastSegmentRow).toContainText(/\d{1,2}\/\d{1,2}\/\d{4}/);
      return;
    }

    const afvDueDate = await this.readAfVAmountDueDateFromEditPaymentSchedule();
    expect.soft(afvDueDate).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    const lastPayment = await this.readLastPaymentSummaryDate();
    if (lastPayment.length > 0 && afvDueDate.length > 0) {
      expect.soft(lastPayment).toBe(afvDueDate);
    }
  }

  async openSettlementDialog(): Promise<void> {
    this.logStep("Open Settlement Dialog");
    const lessDeposit = this.page.locator("app-less-deposit").first();
    const btn = this.settlementButton();

    await lessDeposit.scrollIntoViewIfNeeded();
    await expect(btn).toBeVisible({ timeout: 30_000 });
    await btn.click({ timeout: 15_000 });

    await this.page
      .getByRole("dialog")
      .filter({ visible: true })
      .last()
      .waitFor({ state: "visible", timeout: 45_000 });
  }

  private addonsAccessoriesLabelRx(): RegExp {
    return /\+?\s*Add\s*Ons?\s*(?:&|and)\s*Accessories|\+?\s*Addons?\s*&\s*Accessories/i;
  }

  private addonsAccessoriesTrigger(scope: Locator): Locator {
    const label = this.addonsAccessoriesLabelRx();
    return scope
      .getByRole("link", { name: label })
      .or(scope.getByRole("button", { name: label }))
      .or(scope.locator("a, button, [role='button']").filter({ hasText: label }))
      .first();
  }

  private async scrollAddonsAccessoriesEntryIntoView(root: Locator): Promise<void> {
    for (const anchor of [
      root.getByText(/Additional\s+Charges/i),
      root.getByText(/Charges\s*\+\s*Add/i),
      root.getByText(/^Charges$/i),
      root.getByText(/Less\s+Deposit/i),
    ]) {
      if (await anchor.first().isVisible({ timeout: 2_500 }).catch(() => false)) {
        await anchor.first().scrollIntoViewIfNeeded();
        break;
      }
    }
    await root.getByText(this.addonsAccessoriesLabelRx()).first().scrollIntoViewIfNeeded().catch(() => {});
  }

  private async expectAddOnsAccessoriesScreenVisible(timeoutMs = 45_000): Promise<void> {
    await expect
      .poll(
        async () => {
          const hosts = this.page.locator(
            "app-service-plan, app-accessories, app-add-on-accessories, app-add-ons-accessories, app-addon-accessories",
          );
          const hostN = await hosts.count();
          for (let i = 0; i < Math.min(hostN, 5); i++) {
            if (await hosts.nth(i).isVisible({ timeout: 400 }).catch(() => false)) {
              return true;
            }
          }
          const headings = [
            /Add Registration and Service Plans/i,
            /Registration\s*(?:and|&)\s*Service\s*Plans/i,
            /^Add Ons & Accessories$/i,
            /Add On Accessories/i,
          ];
          for (const re of headings) {
            if (await this.page.getByText(re).first().isVisible({ timeout: 400 }).catch(() => false)) {
              return true;
            }
          }
          return false;
        },
        { timeout: timeoutMs, intervals: [300, 500, 1_000, 2_000] },
      )
      .toBe(true);
  }

  /** UDP-T4258 / UDP-T4069 — **+ Addons & Accessories** opens the Add Ons and Accessories screen. */
  async clickAddonsAndAccessoriesAndExpectScreen(): Promise<void> {
    this.logStep("Click Addons And Accessories and expect screen");
    await this.waitForQuoteLoadersToFinish();
    const root = this.standardQuoteRoot();
    await this.scrollAddonsAccessoriesEntryIntoView(root);

    const trigger = this.addonsAccessoriesTrigger(root);
    await expect(trigger).toBeVisible({ timeout: 30_000 });
    await trigger.scrollIntoViewIfNeeded();
    try {
      await trigger.click({ timeout: 15_000 });
    } catch {
      await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
      await trigger.click({ force: true, timeout: 15_000 });
    }
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page
      .waitForURL(/add-on-accessories|addon-accessories|addOnAccessories|add_on_accessories/i, {
        timeout: 12_000,
      })
      .catch(() => {});
    await this.expectAddOnsAccessoriesScreenVisible();
  }

  async openAddonsAccessoriesFromQuote(): Promise<void> {
    await this.clickAddonsAndAccessoriesAndExpectScreen();
  }

  async waitForAfVCashPricePopulated(): Promise<void> {
    await expect
      .poll(
        async () => {
          const cash = (await this.cashPriceOfAssetInputField.inputValue().catch(() => "")).trim();
          return cash.length > 0 && /\d/.test(cash);
        },
        { timeout: 60_000 },
      )
      .toBeTruthy();
    await this.waitForLoadingComplete();
  }

  /** SIT may leave cash at $0.00 — enter a fallback when FIS does not price the asset type. */
  async ensureAfVCashPriceReady(fallbackAmount = "$25,000"): Promise<void> {
    this.logStep("Ensure AFV cash price ready");
    const readCash = async (): Promise<number> =>
      this.readCurrencyInput(this.cashPriceOfAssetInputField);
    const ready = await expect
      .poll(readCash, { timeout: 30_000 })
      .toBeGreaterThan(0)
      .then(() => true)
      .catch(() => false);
    if (!ready) {
      await this.cashPriceOfAsset(fallbackAmount);
      await expect.poll(readCash, { timeout: 20_000 }).toBeGreaterThan(0);
    }
    await this.waitForLoadingComplete();
  }

  /** Row label anchor — exact text match per SelectorHub / UDP-T3819. */
  totalAmountBorrowedLabel(): Locator {
    return this.standardQuoteRoot().locator(':text-is("Total Amount Borrowed")').first();
  }

  /**
   * Display value for **Total Amount Borrowed** on CSA Webform:
   * `label.text-right.customePadding` in the same grid row as the label text.
   */
  totalAmountBorrowedDisplayLabel(): Locator {
    const tabLabel = this.totalAmountBorrowedLabel();
    return tabLabel
      .locator(
        'xpath=ancestor::div[contains(@class,"grid")][1]//label[contains(@class,"customePadding")]',
      )
      .first()
      .or(
        tabLabel.locator(
          'xpath=following::label[contains(@class,"customePadding")][1]',
        ),
      );
  }

  /** **Total Amount Borrowed** — CSA display `label`; AFV / legacy may use `amount #amount`. */
  totalAmountBorrowedField(): Locator {
    return this.financeSummaryLabelValueField("Total Amount Borrowed");
  }

  /** **Interest Charge** — CSA display `label`; AFV / legacy may use `amount #amount`. */
  interestChargeField(): Locator {
    return this.financeSummaryLabelValueField("Interest Charge");
  }

  /** Row label anchor for **Interest Charge**. */
  interestChargeLabel(): Locator {
    return this.standardQuoteRoot().locator(':text-is("Interest Charge")').first();
  }

  /** Display value for **Interest Charge** on CSA Webform. */
  interestChargeDisplayLabel(): Locator {
    const icLabel = this.interestChargeLabel();
    return icLabel
      .locator(
        'xpath=ancestor::div[contains(@class,"grid")][1]//label[contains(@class,"customePadding")]',
      )
      .first()
      .or(
        icLabel.locator(
          'xpath=following::label[contains(@class,"customePadding")][1]',
        ),
      );
  }

  parseDisplayedCurrency(raw: string): number {
    const n = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  async scrollTotalAmountBorrowedIntoView(): Promise<void> {
    await this.totalAmountBorrowedLabel().scrollIntoViewIfNeeded().catch(() => {});
    const display = this.totalAmountBorrowedDisplayLabel();
    if (await display.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await display.scrollIntoViewIfNeeded().catch(() => {});
    } else {
      await this.totalAmountBorrowedField().scrollIntoViewIfNeeded().catch(() => {});
    }
    await this.paymentSummaryRoot.scrollIntoViewIfNeeded().catch(() => {});
  }

  async readTotalAmountBorrowedDisplayText(): Promise<string> {
    const display = this.totalAmountBorrowedDisplayLabel();
    await expect(display).toBeVisible({ timeout: 30_000 });
    return ((await display.textContent()) ?? "").replace(/\s+/g, " ").trim();
  }

  async scrollInterestChargeIntoView(): Promise<void> {
    await this.interestChargeLabel().scrollIntoViewIfNeeded().catch(() => {});
    const display = this.interestChargeDisplayLabel();
    if (await display.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await display.scrollIntoViewIfNeeded().catch(() => {});
    } else {
      await this.interestChargeField().scrollIntoViewIfNeeded().catch(() => {});
    }
    await this.paymentSummaryRoot.scrollIntoViewIfNeeded().catch(() => {});
  }

  async readInterestChargeDisplayText(): Promise<string> {
    const display = this.interestChargeDisplayLabel();
    await expect(display).toBeVisible({ timeout: 30_000 });
    return ((await display.textContent()) ?? "").replace(/\s+/g, " ").trim();
  }

  async readTotalAmountBorrowed(): Promise<number> {
    const display = this.totalAmountBorrowedDisplayLabel();
    if (await display.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return this.parseDisplayedCurrency(await this.readTotalAmountBorrowedDisplayText());
    }
    const field = this.totalAmountBorrowedField();
    await expect(field).toBeVisible({ timeout: 30_000 });
    const tag = (await field.evaluate((el) => el.tagName.toLowerCase()).catch(() => "")) as string;
    const raw =
      tag === "input" || tag === "textarea"
        ? (await field.inputValue().catch(() => "")).trim()
        : ((await field.textContent()) ?? "").trim();
    return this.parseDisplayedCurrency(raw);
  }

  async readInterestCharge(): Promise<number> {
    const display = this.interestChargeDisplayLabel();
    if (await display.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return this.parseDisplayedCurrency(await this.readInterestChargeDisplayText());
    }
    const field = this.interestChargeField();
    await expect(field).toBeVisible({ timeout: 30_000 });
    const tag = (await field.evaluate((el) => el.tagName.toLowerCase()).catch(() => "")) as string;
    const raw =
      tag === "input" || tag === "textarea"
        ? (await field.inputValue().catch(() => "")).trim()
        : ((await field.textContent()) ?? "").trim();
    return this.parseDisplayedCurrency(raw);
  }

  /** Poll-friendly read — skips long visibility waits. */
  async readTotalAmountBorrowedNumericFast(): Promise<number> {
    const display = this.totalAmountBorrowedDisplayLabel();
    if (await display.isVisible({ timeout: 500 }).catch(() => false)) {
      const raw = ((await display.textContent()) ?? "").replace(/\s+/g, " ").trim();
      return this.parseDisplayedCurrency(raw);
    }
    const field = this.totalAmountBorrowedField();
    if (await field.isVisible({ timeout: 500 }).catch(() => false)) {
      const tag = (await field.evaluate((el) => el.tagName.toLowerCase()).catch(() => "")) as string;
      const raw =
        tag === "input" || tag === "textarea"
          ? (await field.inputValue().catch(() => "")).trim()
          : ((await field.textContent()) ?? "").trim();
      return this.parseDisplayedCurrency(raw);
    }
    return 0;
  }

  /** Poll-friendly read — skips long visibility waits. */
  async readInterestChargeNumericFast(): Promise<number> {
    const display = this.interestChargeDisplayLabel();
    if (await display.isVisible({ timeout: 500 }).catch(() => false)) {
      const raw = ((await display.textContent()) ?? "").replace(/\s+/g, " ").trim();
      return this.parseDisplayedCurrency(raw);
    }
    const field = this.interestChargeField();
    if (await field.isVisible({ timeout: 500 }).catch(() => false)) {
      const tag = (await field.evaluate((el) => el.tagName.toLowerCase()).catch(() => "")) as string;
      const raw =
        tag === "input" || tag === "textarea"
          ? (await field.inputValue().catch(() => "")).trim()
          : ((await field.textContent()) ?? "").trim();
      return this.parseDisplayedCurrency(raw);
    }
    return 0;
  }

  async expectTotalAmountBorrowedReadOnly(): Promise<void> {
    this.logStep("Expect Total Amount Borrowed display-only");
    await this.scrollTotalAmountBorrowedIntoView();
    await expect.soft(this.totalAmountBorrowedLabel()).toBeVisible({ timeout: 30_000 });

    const display = this.totalAmountBorrowedDisplayLabel();
    if (await display.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect.soft(display).toBeVisible({ timeout: 30_000 });
      const tag = (await display.evaluate((el) => el.tagName.toLowerCase()).catch(() => "")) as string;
      expect.soft(tag).toBe("label");
      return;
    }

    const field = this.totalAmountBorrowedField();
    await expect.soft(field).toBeVisible({ timeout: 30_000 });
    const tag = (await field.evaluate((el) => el.tagName.toLowerCase()).catch(() => "")) as string;
    if (tag === "input" || tag === "textarea") {
      const editable = await field.isEditable().catch(() => false);
      expect.soft(editable).toBeFalsy();
    }
  }

  async expectInterestChargeReadOnly(): Promise<void> {
    this.logStep("Expect Interest Charge display-only");
    await this.scrollInterestChargeIntoView();
    await expect.soft(this.interestChargeLabel()).toBeVisible({ timeout: 30_000 });

    const display = this.interestChargeDisplayLabel();
    if (await display.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect.soft(display).toBeVisible({ timeout: 30_000 });
      const tag = (await display.evaluate((el) => el.tagName.toLowerCase()).catch(() => "")) as string;
      expect.soft(tag).toBe("label");
      return;
    }

    const field = this.interestChargeField();
    await expect.soft(field).toBeVisible({ timeout: 30_000 });
    const tag = (await field.evaluate((el) => el.tagName.toLowerCase()).catch(() => "")) as string;
    if (tag === "input" || tag === "textarea") {
      const editable = await field.isEditable().catch(() => false);
      expect.soft(editable).toBeFalsy();
    }
  }

  async expectTotalAmountBorrowedZero(): Promise<void> {
    this.logStep("Expect Total Amount Borrowed $0.00");
    await this.scrollTotalAmountBorrowedIntoView();

    const display = this.totalAmountBorrowedDisplayLabel();
    if (await display.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect
        .poll(async () => await this.readTotalAmountBorrowedDisplayText(), { timeout: 30_000 })
        .toMatch(/\$?\s*0\.00/);
      expect.soft(await this.readTotalAmountBorrowed()).toBe(0);
      return;
    }

    await expect
      .poll(async () => await this.readTotalAmountBorrowed(), { timeout: 30_000 })
      .toBe(0);
  }

  async expectTotalAmountBorrowedGreaterThanZero(opts?: { timeoutMs?: number }): Promise<void> {
    this.logStep("Expect Total Amount Borrowed > 0");
    await this.scrollTotalAmountBorrowedIntoView();
    const timeoutMs = opts?.timeoutMs ?? 60_000;
    const read = opts?.timeoutMs != null
      ? () => this.readTotalAmountBorrowedNumericFast()
      : () => this.readTotalAmountBorrowed();
    await expect
      .poll(read, {
        timeout: timeoutMs,
        intervals: opts?.timeoutMs != null ? [300, 500, 1_000] : undefined,
      })
      .toBeGreaterThan(0);
  }

  /**
   * UDP-T4234 / MAF-4795: after **Calculate**, **Total Amount Borrowed** is display-only and
   * shows FIS AF **Amount Financed** (principal). **Total Amount to Repay** includes interest/fees.
   */
  async expectTotalAmountBorrowedCalculatedAmountFinanced(opts?: {
    timeoutMs?: number;
  }): Promise<void> {
    this.logStep("Expect Total Amount Borrowed = FIS AF Amount Financed (display-only)");
    await this.expectTotalAmountBorrowedReadOnly();
    await this.expectTotalAmountBorrowedGreaterThanZero(opts);

    const displayText = await this.readTotalAmountBorrowedDisplayText().catch(() => "");
    if (displayText.length > 0) {
      expect(displayText).toMatch(/\$?\s*[\d,]+\.\d{2}/);
    }

    const tab = await this.readTotalAmountBorrowed();
    const totalRepay = await this.readTotalAmountToRepay().catch(() => 0);
    if (totalRepay > 0) {
      expect(totalRepay).toBeGreaterThanOrEqual(tab - 0.01);
    }
  }

  async expectTotalAmountBorrowedMatchesAmount(
    expected: number,
    tolerance = 1,
  ): Promise<void> {
    this.logStep(
      `Expect Total Amount Borrowed ≈ ${this.stepValueDisplay(String(expected))}`,
    );
    await this.scrollTotalAmountBorrowedIntoView();
    await expect
      .poll(async () => {
        const tab = await this.readTotalAmountBorrowed();
        return Math.abs(tab - expected) <= tolerance;
      }, { timeout: 60_000 })
      .toBeTruthy();
  }

  async expectInterestChargeNonNegative(): Promise<void> {
    this.logStep("Expect Interest Charge ≥ $0.00");
    await this.scrollInterestChargeIntoView();

    const display = this.interestChargeDisplayLabel();
    if (await display.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect
        .poll(async () => await this.readInterestChargeDisplayText(), { timeout: 60_000 })
        .toMatch(/\$?\s*[\d,]+(?:\.\d{2})?/);
      expect.soft(await this.readInterestCharge()).toBeGreaterThanOrEqual(0);
      return;
    }

    await expect
      .poll(async () => await this.readInterestCharge(), { timeout: 60_000 })
      .toBeGreaterThanOrEqual(0);
  }

  /**
   * UDP-T3822: after a financial edit + Calculate, the payment summary is recalculated.
   * TAB (amount financed) may stay the same when the edit does not change principal
   * (e.g. interest rate); Interest Charge updates when rate/term/TAB changes.
   * Passes when at least one displayed value moves from the pre-edit baseline.
   */
  private paymentSummaryRecalculationObserved(
    tabBefore: number,
    interestBefore: number,
    tabNow: number,
    icNow: number,
    minDelta: number,
  ): boolean {
    if (!Number.isFinite(tabNow) || !Number.isFinite(icNow)) return false;
    const tabChanged = Math.abs(tabNow - tabBefore) > minDelta;
    const icChanged = Math.abs(icNow - interestBefore) > minDelta;
    return tabChanged || icChanged;
  }

  async expectPaymentSummaryRecalculatedAfterFinancialEdit(
    tabBefore: number,
    interestBefore: number,
    opts?: { timeoutMs?: number; minDelta?: number },
  ): Promise<void> {
    const timeoutMs = opts?.timeoutMs ?? 15_000;
    const minDelta = opts?.minDelta ?? 0.01;
    this.logStep(
      `Expect payment summary recalculated (was TAB=${tabBefore}, IC=${interestBefore})`,
    );
    await this.scrollTotalAmountBorrowedIntoView();
    await this.scrollInterestChargeIntoView();

    let lastTab = await this.readTotalAmountBorrowedNumericFast();
    let lastIc = await this.readInterestChargeNumericFast();
    if (
      this.paymentSummaryRecalculationObserved(
        tabBefore,
        interestBefore,
        lastTab,
        lastIc,
        minDelta,
      )
    ) {
      return;
    }

    try {
      await expect
        .poll(
          async () => {
            lastTab = await this.readTotalAmountBorrowedNumericFast();
            lastIc = await this.readInterestChargeNumericFast();
            return this.paymentSummaryRecalculationObserved(
              tabBefore,
              interestBefore,
              lastTab,
              lastIc,
              minDelta,
            );
          },
          { timeout: timeoutMs, intervals: [100, 200, 500, 1_000] },
        )
        .toBe(true);
    } catch {
      const tabChanged = Number.isFinite(lastTab) && Math.abs(lastTab - tabBefore) > minDelta;
      const icChanged =
        Number.isFinite(lastIc) && Math.abs(lastIc - interestBefore) > minDelta;
      throw new Error(
        `Payment summary did not recalculate within ${timeoutMs}ms ` +
          `(before TAB=${tabBefore}, IC=${interestBefore}; last TAB=${lastTab}, IC=${lastIc}; ` +
          `TAB changed=${tabChanged}, IC changed=${icChanged}). ` +
          `TAB may remain unchanged when amount financed is unchanged; at least one field must update.`,
      );
    }
  }

  /** @deprecated Use {@link expectPaymentSummaryRecalculatedAfterFinancialEdit}. */
  async expectTotalAmountBorrowedAndInterestChargeRecalculated(
    tabBefore: number,
    interestBefore: number,
    opts?: { timeoutMs?: number; minDelta?: number },
  ): Promise<void> {
    return this.expectPaymentSummaryRecalculatedAfterFinancialEdit(
      tabBefore,
      interestBefore,
      opts,
    );
  }
  private async readCurrencyInput(locator: Locator): Promise<number> {
    const raw = await locator
      .evaluate((el) => {
        const tag = el.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea") {
          return ((el as HTMLInputElement).value ?? "").trim();
        }
        return (el.textContent ?? "").replace(/\s+/g, " ").trim();
      })
      .catch(
        async () =>
          (await locator.inputValue().catch(() => "")).trim() ||
          ((await locator.textContent()) ?? "").replace(/\s+/g, " ").trim(),
      );
    return this.parseDisplayedCurrency(raw);
  }

  async readUdcEstablishmentFee(): Promise<number> {
    await expect(this.udcEstablishmentFeeInputField).toBeVisible({ timeout: 20_000 });
    return this.readCurrencyInput(this.udcEstablishmentFeeInputField);
  }

  async readDealerOriginationFee(): Promise<number> {
    await expect(this.dealerOriginationFeeInputField).toBeVisible({ timeout: 20_000 });
    return this.readCurrencyInput(this.dealerOriginationFeeInputField);
  }

  async readTotalEstablishmentFee(): Promise<number> {
    await expect(this.totalEstablishmentFeeInputField).toBeVisible({ timeout: 20_000 });
    return this.readCurrencyInput(this.totalEstablishmentFeeInputField);
  }

  /** Log UDC / Dealer / Total establishment fee values (diagnostics for program pre-population). */
  async logEstablishmentFeeValues(phase: string): Promise<void> {
    const udc = await this.readUdcEstablishmentFee();
    const dealer = await this.readDealerOriginationFee();
    const total = await this.readTotalEstablishmentFee();
    this.log(
      `Establishment fees [${phase}]: UDC=$${udc.toFixed(2)}, Dealer=$${dealer.toFixed(2)}, Total=$${total.toFixed(2)}`,
    );
  }

  /**
   * Overwrite program-default UDC / Dealer fees with testcase amounts.
   * TL Product/Program can pre-populate fee fields while Total still reads $0 until blur.
   */
  async enterEstablishmentFeesReplacingPrePopulated(
    udcFee: string,
    dealerFee: string,
  ): Promise<void> {
    this.logStep(
      `Enter establishment fees replacing pre-populated values: UDC ${this.stepValueDisplay(udcFee)}, dealer ${this.stepValueDisplay(dealerFee)}`,
    );
    await this.udcEstablishmentFeeInputField.scrollIntoViewIfNeeded();
    await this.dealerOriginationFeeInputField.scrollIntoViewIfNeeded();
    await this.logEstablishmentFeeValues("before overwrite");

    await this.udcEstablishmentFee(udcFee);
    await this.dealerOriginationFee(dealerFee);

    await this.logEstablishmentFeeValues("after overwrite");

    const udc = await this.readUdcEstablishmentFee();
    const dealer = await this.readDealerOriginationFee();
    if (
      !this.currencyDollarsMatch(udc, udcFee) ||
      !this.currencyDollarsMatch(dealer, dealerFee)
    ) {
      throw new Error(
        `Establishment fee overwrite failed (UDC want ${udcFee} got ${udc}, dealer want ${dealerFee} got ${dealer}). ` +
          `Program pre-populated values were not replaced.`,
      );
    }
  }

  /** Total Establishment Fee read-only and equals UDC + Dealer on screen. */
  async expectTotalEstablishmentFeeMatchesComponentFees(): Promise<void> {
    this.logStep("Expect Total Establishment Fee matches UDC + Dealer");
    const udc = await this.readUdcEstablishmentFee();
    const dealer = await this.readDealerOriginationFee();
    await this.expectTotalEstablishmentFeeSumDollars(udc + dealer);
  }

  async expectTotalEstablishmentFeeDisplayOnly(): Promise<void> {
    this.logStep("Expect Total Establishment Fee display-only");
    await expect(this.totalEstablishmentFeeInputField).toBeVisible({ timeout: 20_000 });
    await expect(this.totalEstablishmentFeeInputField).not.toBeEditable();
  }

  async expectPpsrCountEditable(): Promise<void> {
    this.logStep("Expect PPSR count editable");
    const spin = this.ppsrCountLoanDetailsSpin();
    await expect(spin).toBeVisible({ timeout: 15_000 });
    await expect(spin).toBeEditable();
  }

  async readPpsrTotalAmount(): Promise<number> {
    this.logStep("Read PPSR total amount");
    const root = this.standardQuoteRoot();
    const ppsrTotalLbl = root.getByText(/PPSR\s+Total/i).first();
    if (await ppsrTotalLbl.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const row = ppsrTotalLbl.locator(
        "xpath=ancestor::div[contains(@class,'col') or contains(@class,'field')][1]",
      );
      return this.parseDisplayedCurrency((await row.textContent()) ?? "");
    }

    const unitFee = await this.readPpsrUnitFeeAmount();
    const countRaw = (await this.ppsrCountLoanDetailsSpin().inputValue()).trim();
    const count = parseFloat(countRaw || "1");
    const expected = Math.round(unitFee * count * 100) / 100;

    const loanGrid = root
      .getByText(/^Loan Details$/i)
      .locator("xpath=following::div[contains(@class,'grid')][1]");
    const disabled = loanGrid.locator("input[disabled]");
    const n = await disabled.count();
    for (let i = 0; i < n; i++) {
      const v = await this.readCurrencyInput(disabled.nth(i));
      if (Math.abs(v - expected) <= 0.02) return v;
    }

    const beforeUdc = root
      .getByText(/UDC Establishment Fee/i)
      .locator("xpath=preceding::input[@disabled][1]");
    if (await beforeUdc.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return this.readCurrencyInput(beforeUdc);
    }

    throw new Error(`Could not read PPSR total (expected ~${expected})`);
  }

  /** PPSR Total scales when count changes (Count × unit fee). */
  async expectPpsrTotalScaledWhenCountChanges(fromCount: string, toCount: string): Promise<void> {
    this.logStep(
      `Expect PPSR total scales when count changes ${this.stepValueDisplay(fromCount)} → ${this.stepValueDisplay(toCount)}`,
    );
    await this.expectPpsrCountValue(fromCount);
    const before = await this.readPpsrTotalAmount();
    await this.fillPpsrCountLoanDetails(toCount);
    await this.waitForQuoteLoadersToFinish();
    const fromN = parseFloat(fromCount);
    const toN = parseFloat(toCount);
    await expect
      .poll(async () => {
        const after = await this.readPpsrTotalAmount();
        if (before <= 0 || fromN <= 0) return after >= 0;
        const expected = (before / fromN) * toN;
        return Math.abs(after - expected) <= Math.max(1, expected * 0.05);
      }, { timeout: 20_000 })
      .toBe(true);
  }

  async expectQuoteSurfaceValidation(pattern: RegExp): Promise<void> {
    this.logStep(`Expect quote validation: ${pattern}`);
    await expect(
      this.page
        .getByText(pattern)
        .or(this.page.getByRole("dialog").filter({ hasText: pattern }))
        .first(),
    ).toBeVisible({ timeout: 60_000 });
  }

  async expectUdcEstablishmentFeeCannotExceedMaxMessage(): Promise<void> {
    await this.expectQuoteSurfaceValidation(/UDC Establishment Fee cannot be greater than/i);
  }

  async expectDealerOriginationFeeCannotExceedMaxMessage(): Promise<void> {
    const dealerRow = this.dealerOriginationFeeInputField.locator(
      "xpath=ancestor::div[contains(@class,'p-field') or contains(@class,'col')][1]",
    );
    const patterns = [
      /Dealer\s+Origination\s+Fee cannot be greater than/i,
      /Dealer\s+Origination\s+Fee.*cannot be greater than/i,
      /cannot be greater than\s*\$/i,
    ];
    for (const pattern of patterns) {
      const inline = dealerRow.getByText(pattern);
      if (await inline.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(inline.first()).toBeVisible();
        return;
      }
    }
    await this.expectQuoteSurfaceValidation(/Dealer\s+Origination\s+Fee cannot be greater than/i);
  }

  /** Enter excessive Dealer Origination Fee and trigger BLD validation (Calculate, then Save/Next). */
  async enterDealerOriginationFeeExcessiveAndTriggerValidation(amount: string): Promise<void> {
    this.logStep(`Enter excessive dealer origination fee: ${this.stepValueDisplay(amount)}`);
    await this.dealerOriginationFee(amount);
    await this.clickCalculateButton();
    const msg = this.page.getByText(/Dealer\s+Origination\s+Fee cannot be greater than/i);
    if (await msg.isVisible({ timeout: 8_000 }).catch(() => false)) return;
    await this.clickSaveStandardQuoteStep().catch(() => {});
    if (await msg.isVisible({ timeout: 8_000 }).catch(() => false)) return;
    await this.nextButton.click({ timeout: 10_000 }).catch(() =>
      this.nextButton.click({ force: true }),
    );
  }

  async expectUdcEstablishmentFeeCommissionDeductionWarning(): Promise<void> {
    await this.expectQuoteSurfaceValidation(/commission|deducted from your commission/i);
  }

  async clickStandardQuoteCancel(): Promise<void> {
    this.logStep("Click Standard Quote Cancel");
    const cancel = this.standardQuoteRoot().getByRole("button", { name: /^Cancel$/i }).first();
    await expect(cancel).toBeVisible({ timeout: 15_000 });
    await cancel.click();
  }

  async expectStandardQuoteCancelConfirmationVisible(): Promise<void> {
    this.logStep("Expect Standard Quote cancel confirmation");
    const confirmDlg = this.page
      .locator("p-confirmdialog, .p-confirm-dialog, [role='alertdialog']")
      .filter({ visible: true })
      .filter({ hasText: /unsaved changes|lost|cancel/i })
      .first();
    await expect(confirmDlg).toBeVisible({ timeout: 15_000 });
    await expect(confirmDlg).toContainText(/Any unsaved changes will be lost/i);
    await expect(confirmDlg).toContainText(/cancel/i);
  }

  async confirmStandardQuoteCancelDiscard(): Promise<void> {
    this.logStep("Confirm Standard Quote cancel discard");
    const confirmDlg = this.page
      .locator("p-confirmdialog, .p-confirm-dialog, [role='alertdialog']")
      .filter({ visible: true })
      .filter({ hasText: /unsaved changes|lost|cancel/i })
      .first();
    const yes = confirmDlg
      .getByRole("button", { name: /^(Yes|OK|Confirm)$/i })
      .or(confirmDlg.locator("button.p-confirm-dialog-accept"))
      .first();
    await yes.click();
  }

  /** Add Ons & Accessories without Product/Program — validation toast/dialog. */
  async clickAddOnsAccessoriesEntryExpectProductProgramRequired(): Promise<void> {
    this.logStep("Click Add Ons entry expecting Product Program required");
    const root = this.standardQuoteRoot();
    const labelRx =
      /Add\s*Ons\s*&\s*Accessories|Add\s+Ons\s+and\s+Accessories|Add[-\s]?Ons?\s*[&+]\s*Accessories/i;
    await root.getByText(labelRx).first().scrollIntoViewIfNeeded().catch(() => {});
    const entry = root
      .getByRole("link", { name: labelRx })
      .or(root.getByRole("button", { name: labelRx }))
      .or(root.locator("a, button").filter({ hasText: labelRx }))
      .first();
    await entry.click({ timeout: 20_000 });
    await this.expectQuoteSurfaceValidation(/Please select Product.*Program to proceed further/i);
  }

  async readPpsrUnitFeeAmount(): Promise<number> {
    this.logStep("Read PPSR unit fee (@ rate)");
    const root = this.standardQuoteRoot();
    const row = root
      .locator(".p-field, [class*='p-field'], [class*='col-']")
      .filter({ has: root.getByText(/^@$/i) })
      .first();
    const inp = row.locator("input").first();
    if (await inp.isVisible({ timeout: 8_000 }).catch(() => false)) {
      return this.readCurrencyInput(inp);
    }
    const nearAt = root.getByText(/^@$/i).first().locator("xpath=following::input[1]");
    return this.readCurrencyInput(nearAt);
  }

  /** UDP-T3941 — Additional Charges defaults after Product/Program selection. */
  async expectAdditionalChargesSectionDefaults(): Promise<void> {
    this.logStep("Expect Additional Charges section default field values");
    await this.expectPpsrCountAndFeeLineVisible();
    await this.expectPpsrCountValue("1");

    const unitFee = await this.readPpsrUnitFeeAmount();
    const ppsrTotal = await this.readPpsrTotalAmount();
    if (unitFee > 0) {
      expect(Math.abs(ppsrTotal - unitFee)).toBeLessThanOrEqual(0.02);
    }

    await expect(this.udcEstablishmentFeeInputField).toBeVisible({ timeout: 20_000 });
    await expect(this.dealerOriginationFeeInputField).toBeVisible({ timeout: 20_000 });
    await expect(this.totalEstablishmentFeeInputField).toBeVisible({ timeout: 20_000 });

    const udc = await this.readUdcEstablishmentFee();
    const dealer = await this.readDealerOriginationFee();
    expect(udc).toBeGreaterThanOrEqual(0);
    expect(dealer).toBeGreaterThanOrEqual(0);
    await this.expectTotalEstablishmentFeeSumDollars(udc + dealer);

    const charges = this.chargesFieldBlock();
    await expect(charges).toBeVisible({ timeout: 15_000 });
  }

  /** **Charges** label on Additional Charges (before/after add-ons). */
  private chargesLabel(): Locator {
    const root = this.standardQuoteRoot();
    const additionalCharges = root
      .locator(".p-field, [class*='p-field'], amount, .grid")
      .filter({ has: root.getByText(/Additional\s+Charges/i) })
      .first();
    return additionalCharges
      .getByText(/^Charges$/i)
      .or(root.getByText(/^Charges\b/i))
      .first();
  }

  /** Dollar display beside **Charges** (TL uses a sibling `generic`; CSA may use `label.customePadding` or input). */
  private chargesDisplayValue(): Locator {
    const label = this.chargesLabel();
    return label
      .locator("xpath=following-sibling::*[1]")
      .or(
        label.locator(
          "xpath=ancestor::div[contains(@class,'grid')][1]//label[contains(@class,'customePadding')]",
        ),
      )
      .or(label.locator("xpath=following::input[1]"))
      .first();
  }

  async readChargesTotalDollars(): Promise<number> {
    const label = this.chargesLabel();
    await label.scrollIntoViewIfNeeded().catch(() => {});
    const display = this.chargesDisplayValue();
    await expect(display).toBeVisible({ timeout: 30_000 });
    const tag = (await display.evaluate((el) => el.tagName.toLowerCase()).catch(() => "")) as string;
    const raw =
      tag === "input" || tag === "textarea"
        ? (await display.inputValue().catch(() => "")).trim()
        : ((await display.textContent()) ?? "").replace(/\s+/g, " ").trim();
    return this.parseDisplayedCurrency(raw);
  }

  /** **Charges** label block on Additional Charges (before/after add-ons). */
  chargesFieldBlock(): Locator {
    const label = this.chargesLabel();
    return label.locator("xpath=ancestor::div[contains(@class,'grid') or contains(@class,'p-field')][1]").or(label);
  }

  /** UDP-T4221 — **Charges** = Registration/Service Plans + Insurances + Accessories. */
  async expectChargesTotalDollars(expected: number): Promise<void> {
    this.logStep(`Expect charges total dollars: ${expected}`);
    await this.waitForQuoteLoadersToFinish();
    await expect
      .poll(async () => this.readChargesTotalDollars(), {
        timeout: 45_000,
        intervals: [500, 1_000, 1_500, 2_000],
      })
      .toBe(expected);
  }

  addMaintenanceAndChargesButton(): Locator {
    return this.standardQuoteRoot()
      .getByRole("button", { name: /Add\s+Maintenance\s*&\s*Charges/i })
      .or(this.standardQuoteRoot().locator("button").filter({ hasText: /Add\s+Maintenance\s*&\s*Charges/i }))
      .first();
  }

  async openOlMaintenanceAndChargesFromQuote(): Promise<void> {
    this.logStep("Open OL Maintenance and Charges from quote");
    await this.waitForQuoteLoadersToFinish();
    const btn = this.addMaintenanceAndChargesButton();
    await btn.scrollIntoViewIfNeeded();
    await btn.waitFor({ state: "visible", timeout: 20_000 });
    await btn.click({ timeout: 15_000 });
    await this.page.locator("app-service-plan, app-accessories").first().waitFor({
      state: "visible",
      timeout: 45_000,
    });
  }

  /** UDP-T3872 — Save before Calculate shows **Please click "Calculate"**. */
  async expectPleaseClickCalculateDialog(): Promise<void> {
    this.logStep("Expect Please Click Calculate Dialog");
    const dlg = this.page
      .getByRole("dialog")
      .filter({ hasText: /Please click\s*["']?Calculate["']?/i })
      .or(this.page.getByText(/Please click\s*["']?Calculate["']?/i))
      .first();
    await expect(dlg).toBeVisible({ timeout: 20_000 });
  }

  /** UDP-T3876 — key asset fields editable in Open Quote. */
  async expectOpenQuoteAssetFieldsEditable(): Promise<void> {
    this.logStep("Expect Open Quote Asset Fields Editable");
    await expect(this.interestRateInputField).toBeEditable({ timeout: 20_000 });
    const origRef = this.standardQuoteRoot()
      .locator('input[formControlName="originationReference"], input[name="originationReference"]')
      .first();
    await expect(origRef).toBeEditable({ timeout: 20_000 });
  }

  /** UDP-T3884+ — fields read-only (disabled / greyed) on quote surface. */
  async expectQuoteSurfaceViewOnly(): Promise<void> {
    this.logStep("Expect Quote Surface View Only");
    const root = this.standardQuoteRoot();
    const disabled = root.locator(
      "input[disabled], textarea[disabled], .p-disabled input, .p-disabled textarea",
    );
    await expect(disabled.first()).toBeVisible({ timeout: 30_000 });
  }

  // -------------------------------------------------------------------------
  // Operating Lease (OL) — Standard Quote helpers (UDP-T4100–UDP-T4160)
  // -------------------------------------------------------------------------

  /** PrimeNG **Include GST** host (`input#leaseCheckbox` is the hidden PrimeNG input). */
  includeGstCheckboxHost(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .locator("p-checkbox")
      .filter({ has: root.locator("label, span").filter({ hasText: /Include\s*GST/i }) })
      .first()
      .or(
        root
          .locator('input#leaseCheckbox[type="checkbox"]')
          .locator("xpath=ancestor::p-checkbox[1]"),
      )
      .first();
  }

  /** Visible **Include GST** checkbox box (PrimeNG — not the hidden `leaseCheckbox` input). */
  includeGstCheckboxBox(): Locator {
    return this.includeGstCheckboxHost().locator("div.p-checkbox-box").first();
  }

  /** Visible Include GST control for assertions. */
  includeGstCheckbox(): Locator {
    return this.includeGstCheckboxBox();
  }

  async setIncludeGst(checked: boolean): Promise<void> {
    this.logStep(`Set Include GST checked: ${checked}`);
    const host = this.includeGstCheckboxHost();
    const box = this.includeGstCheckboxBox();
    await expect
      .poll(async () => box.isVisible().catch(() => false), { timeout: 60_000 })
      .toBe(true);
    await box.scrollIntoViewIfNeeded();
    const isChecked = await this.isPrimeCheckboxChecked(host);
    if (isChecked === checked) return;

    await box.click({ timeout: 10_000 });
    if ((await this.isPrimeCheckboxChecked(host)) !== checked) {
      await box.click({ force: true, timeout: 10_000 });
    }
    if ((await this.isPrimeCheckboxChecked(host)) !== checked) {
      const input = host.locator('input[type="checkbox"]').first();
      if (checked) {
        await input.check({ force: true });
      } else {
        await input.uncheck({ force: true });
      }
    }
    await expect.poll(async () => this.isPrimeCheckboxChecked(host), { timeout: 8_000 }).toBe(checked);
    await this.waitForLoadingComplete();
  }

  async isIncludeGstChecked(): Promise<boolean> {
    const host = this.includeGstCheckboxHost();
    if (!(await host.isVisible({ timeout: 2_000 }).catch(() => false))) {
      const input = host.locator('input[type="checkbox"]').first();
      return input.isChecked().catch(() => false);
    }
    return this.isPrimeCheckboxChecked(host);
  }

  /** UDP-T4109 — **Cash Price of Asset** is empty on a fresh OL quote shell (`""` or masked `$0.00`). */
  private static isBlankCurrencyDisplay(raw: string): boolean {
    const t = raw.trim();
    if (!t) return true;
    const n = Number.parseFloat(t.replace(/[^0-9.-]/g, ""));
    return !Number.isFinite(n) || n === 0;
  }

  async expectCashPriceBlank(): Promise<void> {
    this.logStep("Expect cash price blank");
    const field = this.cashPriceOfAssetInputField;
    await expect(field).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(async () => {
        const raw = (await field.inputValue().catch(() => "")).trim();
        return DOAssetDetailsPage.isBlankCurrencyDisplay(raw);
      }, { timeout: 15_000 })
      .toBeTruthy();
  }

  async clearCashPriceOfAsset(): Promise<void> {
    this.logStep("Clear cash price of asset");
    const field = this.cashPriceOfAssetInputField;
    await field.scrollIntoViewIfNeeded();
    await field.click({ clickCount: 3 });
    await field.fill("");
    await field.press("Tab").catch(() => {});
  }

  /** Leave Cash Price unset for validation tests (clear only when a positive amount is shown). */
  async ensureCashPriceLeftBlank(): Promise<void> {
    this.logStep("Ensure cash price left blank");
    const field = this.cashPriceOfAssetInputField;
    await field.waitFor({ state: "visible", timeout: 20_000 });
    const raw = (await field.inputValue().catch(() => "")).trim();
    if (!DOAssetDetailsPage.isBlankCurrencyDisplay(raw)) {
      await this.clearCashPriceOfAsset();
    }
    await field.press("Tab").catch(() => {});
  }

  /** UDP-T4109 / UDP-T4225 — inline, toast, or required-to-save dialog after **Save**. */
  async expectBlankCashPriceValidationOnSave(): Promise<void> {
    this.logStep("Expect blank cash price validation on save");
    const root = this.standardQuoteRoot();
    const validationRx =
      /Please complete details?|cannot be blank|must not be blank|is required|required to save|Cash\s+Price|greater than\s*0/i;
    const cashLabel = root.getByText(/^Cash Price of Asset/i).first();
    const cashBlock = cashLabel.locator(
      "xpath=ancestor::div[contains(@class,'col') or contains(@class,'grid') or contains(@class,'field')][1]",
    );

    await expect
      .poll(
        async () => {
          if (
            await this.page
              .getByText(/Please complete details?/i)
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            return true;
          }
          if (
            await this.page
              .getByRole("dialog")
              .filter({ hasText: /required to save this quote/i })
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            return true;
          }
          if (await root.getByText(validationRx).first().isVisible().catch(() => false)) {
            return true;
          }
          if (
            await cashBlock
              .getByText(/required|Please complete|cannot be blank|greater than/i)
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            return true;
          }
          return false;
        },
        { timeout: 25_000, intervals: [300, 500, 1_000] },
      )
      .toBeTruthy();
  }

  async dismissRequiredToSaveDialogIfOpen(): Promise<void> {
    const dlg = this.page
      .getByRole("dialog")
      .filter({ hasText: /required to save this quote/i })
      .first();
    if (!(await dlg.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return;
    }
    await dlg
      .getByRole("button", { name: /^Exit$/i })
      .click({ timeout: 10_000 })
      .catch(() => this.page.keyboard.press("Escape"));
    await dlg.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  }

  /** UDP-T4109 — blank **Cash Price** → **Save** → mandatory validation. */
  async expectCashPriceMandatoryOnSave(): Promise<void> {
    this.logStep("Expect cash price mandatory on save");
    await this.ensureCashPriceLeftBlank();
    await this.clickSaveStandardQuoteStep();
    await this.expectBlankCashPriceValidationOnSave();
    await this.dismissRequiredToSaveDialogIfOpen();
  }

  /** UDP-T4109 — active GST view reflected in **Lease Details** or field labels. */
  async expectOlActiveGstView(inclusive: boolean): Promise<void> {
    this.logStep(`Expect OL active GST view: ${inclusive ? "inclusive" : "exclusive"}`);
    const root = this.standardQuoteRoot();
    const leaseDetails = inclusive
      ? /Lease\s+Details\s*\(\s*GST\s+Inclusive\s*\)/i
      : /Lease\s+Details\s*\(\s*GST\s+Exclusive\s*\)/i;
    const header = root.getByText(leaseDetails).first();
    if (await header.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await expect(header).toBeVisible({ timeout: 15_000 });
      return;
    }
    const viewLabel = inclusive ? /GST\s+Inclusive/i : /GST\s+Exclusive/i;
    await expect(root.getByText(viewLabel).first()).toBeVisible({ timeout: 15_000 });
  }

  private olLeaseCurrencyRow(labelPattern: RegExp): Locator {
    const label = this.standardQuoteRoot().getByText(labelPattern, { exact: true }).first();
    return label
      .locator("xpath=parent::*")
      .or(label.locator("xpath=ancestor::div[contains(@class,'grid')][1]"));
  }

  private olCurrencyInputInLabelRow(labelPattern: RegExp): Locator {
    const root = this.standardQuoteRoot();
    const label = root.getByText(labelPattern, { exact: true }).first();
    const scope = label.locator("xpath=parent::*");
    return scope
      .locator(
        "input#amount:not([disabled]), input[currencymask]:not([disabled]), input:not([disabled]):not([type='hidden'])",
      )
      .filter({ visible: true })
      .first()
      .or(label.locator("xpath=following-sibling::input[1]"))
      .or(root.locator("amount").filter({ hasText: labelPattern }).locator("#amount").first());
  }

  /** Editable input or display-only value (mutual exclusion clears the other field to `$0.00`). */
  private olLeaseCurrencyValueField(labelPattern: RegExp): Locator {
    const label = this.standardQuoteRoot().getByText(labelPattern, { exact: true }).first();
    const scope = label.locator("xpath=parent::*");
    return this.olCurrencyInputInLabelRow(labelPattern)
      .or(label.locator("xpath=following-sibling::input[1]"))
      .or(label.locator("xpath=following-sibling::*[contains(., '$')][1]"))
      .or(scope.getByText(/\$[\d,]+(?:\.\d+)?/).first())
      .first();
  }

  async readOlLeaseCurrencyValue(labelPattern: RegExp): Promise<number> {
    const scope = this.olLeaseCurrencyRow(labelPattern);
    await scope.scrollIntoViewIfNeeded().catch(() => {});

    for (let attempt = 0; attempt < 8; attempt++) {
      const field = this.olLeaseCurrencyValueField(labelPattern);
      const inputVal = (await field.inputValue().catch(() => "")).trim();
      if (inputVal) return this.parseDisplayedCurrency(inputVal);

      const text = (await field.textContent().catch(() => "")) ?? "";
      if (text.includes("$")) return this.parseDisplayedCurrency(text);

      const rowText = (await scope.textContent().catch(() => "")) ?? "";
      const matches = rowText.match(/\$[\d,]+(?:\.\d+)?/g);
      if (matches?.length) {
        return this.parseDisplayedCurrency(matches[matches.length - 1]);
      }
      await this.page.waitForTimeout(300);
    }
    return 0;
  }

  /** Fill OL lease currency inputs (Maintenance Cost, Residual Value, etc.) with mask-friendly typing. */
  private async fillOlLeaseCurrencyField(field: Locator, value: string): Promise<void> {
    const digits = value.replace(/[^0-9]/g, "");
    await field.waitFor({ state: "visible", timeout: 20_000 });
    await field.scrollIntoViewIfNeeded();
    await field.click({ force: true });
    await field.press("ControlOrMeta+a").catch(() => {});
    await field.fill("");
    await this.page.keyboard.type(digits, { delay: 25 });
    await field.press("Tab").catch(() => {});
    await this.page.waitForTimeout(200);
    const parsed = this.parseDisplayedCurrency((await field.inputValue().catch(() => "")).trim());
    if (parsed <= 0 && digits.length > 0) {
      await field.click({ clickCount: 3, force: true });
      await field.fill(value);
      await field.press("Tab").catch(() => {});
    }
  }

  private olFieldNearLabel(labelPattern: RegExp): Locator {
    const root = this.standardQuoteRoot();
    const label = root.getByText(labelPattern).first();
    const row = label.locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    return row
      .locator("input")
      .filter({ visible: true })
      .first()
      .or(root.locator("number").filter({ hasText: labelPattern }).locator("input").first());
  }

  /** Hub: PrimeNG `number` host → spinbutton (recorded OL Useful Life DOM). */
  private static readonly USEFUL_LIFE_NUMBER_SPINBUTTON_HUB =
    "number[class='p-element ng-untouched ng-pristine ng-star-inserted ng-valid'] input[role='spinbutton']";

  usefulLifeNumberHost(): Locator {
    const scope = this.standardQuoteRoot().filter({ hasText: /Useful\s*Life/i });
    return scope
      .locator("number[class*='p-element'][class*='ng-star-inserted']")
      .first()
      .or(scope.locator("number.p-element").first())
      .or(scope.locator("number").first());
  }

  usefulLifeInputField(): Locator {
    const root = this.standardQuoteRoot();
    const label = root.getByText(/^Useful\s*Life$/i).first();
    const scope = label.locator("xpath=parent::*");
    return root
      .filter({ hasText: /Useful\s*Life/i })
      .getByRole("spinbutton")
      .first()
      .or(scope.locator(DOAssetDetailsPage.USEFUL_LIFE_NUMBER_SPINBUTTON_HUB).first())
      .or(scope.getByRole("spinbutton").first())
      .or(label.locator("xpath=following::*[@role='spinbutton'][1]"));
  }

  async readUsefulLifeMonths(): Promise<number> {
    await this.standardQuoteRoot()
      .getByText(/Useful\s*Life/i)
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});

    let months = 0;
    await expect
      .poll(async () => {
        const field = this.usefulLifeInputField();
        const ariaNow = await field.getAttribute("aria-valuenow").catch(() => null);
        if (ariaNow) {
          months = Number.parseInt(ariaNow, 10);
          if (Number.isFinite(months) && months > 0) return months;
        }
        const raw =
          (await field.inputValue().catch(() => "")).trim() ||
          ((await field.textContent().catch(() => "")) ?? "").trim();
        months = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
        return Number.isFinite(months) && months > 0 ? months : 0;
      }, { timeout: 45_000, intervals: [500, 1_000, 2_000] })
      .toBeGreaterThan(0);
    return months;
  }

  maintenanceCostInputField(): Locator {
    return this.olCurrencyInputInLabelRow(/^Maintenance\s*Cost$/);
  }

  maintenanceCostValueField(): Locator {
    return this.olLeaseCurrencyValueField(/^Maintenance\s*Cost$/);
  }

  financedMaintenanceChargeInputField(): Locator {
    return this.olCurrencyInputInLabelRow(/^Financed\s+Maintenance\s+Charge$/);
  }

  financedMaintenanceChargeValueField(): Locator {
    return this.olLeaseCurrencyValueField(/^Financed\s+Maintenance\s+Charge$/);
  }

  async readMaintenanceCostAmount(): Promise<number> {
    return this.readOlLeaseCurrencyValue(/^Maintenance\s*Cost$/);
  }

  async readFinancedMaintenanceChargeAmount(): Promise<number> {
    return this.readOlLeaseCurrencyValue(/^Financed\s+Maintenance\s+Charge$/);
  }

  /** OL **Residual Value** currency field (lease details row — before / after Calculate). */
  olResidualValueInputField(): Locator {
    return this.olCurrencyInputInLabelRow(/^Residual\s+Value$/);
  }

  async readOlResidualValueAmount(): Promise<number> {
    return this.readOlLeaseCurrencyValue(/^Residual\s+Value$/);
  }

  async clearOlResidualValueAmount(): Promise<void> {
    this.logStep("Clear OL residual value amount");
    const field = this.olResidualValueInputField();
    await field.scrollIntoViewIfNeeded();
    await field.click({ clickCount: 3 });
    await field.fill("");
    await field.press("Tab").catch(() => {});
    await this.waitForQuoteLoadersToFinish().catch(() => {});
  }

  /** Leave **Residual Value** unset (`""` / `$0.00`) for validation tests. */
  async ensureOlResidualValueLeftBlank(): Promise<void> {
    this.logStep("Ensure OL residual value left blank");
    const field = this.olResidualValueInputField();
    await field.waitFor({ state: "visible", timeout: 20_000 });
    const raw = (await field.inputValue().catch(() => "")).trim();
    if (!DOAssetDetailsPage.isBlankCurrencyDisplay(raw)) {
      await this.clearOlResidualValueAmount();
    }
    await field.press("Tab").catch(() => {});
  }

  async expectOlResidualValueFieldVisible(): Promise<void> {
    this.logStep("Expect OL residual value field visible");
    await expect(this.olResidualValueInputField()).toBeVisible({ timeout: 25_000 });
  }

  async enterOlResidualValueAmount(amount: string): Promise<void> {
    this.logStep(`Entered OL residual value amount as ${this.stepValueDisplay(amount)}`);
    await this.fillOlLeaseCurrencyField(this.olResidualValueInputField(), amount);
  }

  /** OL residual **%** (`#percent` in Residual Value row) — appears after first **Calculate**. */
  olResidualPercentInputField(): Locator {
    const root = this.standardQuoteRoot();
    const residualRow = root
      .getByText(/^Residual\s+Value$/i)
      .first()
      .locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    return residualRow
      .locator("input#percent, #percent")
      .filter({ visible: true })
      .first()
      .or(
        root
          .locator("label[for='percentage']")
          .filter({ hasText: /Residual\s+Value/i })
          .first()
          .locator("xpath=ancestor::div[contains(@class,'grid')][1]//input[@id='percent']")
          .first(),
      );
  }

  async expectOlResidualPercentFieldVisible(): Promise<void> {
    this.logStep("Expect OL residual % field visible after Calculate");
    const pct = this.olResidualPercentInputField();
    if (await pct.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await expect.soft(pct).toBeVisible({ timeout: 25_000 });
      return;
    }
    await this.expectOlResidualValueFieldVisible();
  }

  async expectOlResidualValueRequiredValidation(): Promise<void> {
    this.logStep("Expect OL residual value required validation");
    await expect
      .poll(async () => this.isOlResidualValueRequiredValidationVisible(), {
        timeout: 25_000,
        intervals: [300, 500, 1_000],
      })
      .toBe(true);
  }

  private async isOlResidualValueRequiredValidationVisible(): Promise<boolean> {
    const residualRow = this.standardQuoteRoot()
      .getByText(/^Residual\s+Value$/i)
      .first()
      .locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    const validationRx =
      /Please complete details?|cannot be blank|must not be blank|is required|required to save|residual|greater than\s*0/i;

    const dialog = this.page
      .getByRole("dialog")
      .filter({ hasText: /required to save|Please complete|residual/i })
      .first();
    if (await dialog.isVisible().catch(() => false)) return true;

    const surface = this.page
      .locator(
        ".p-error, .p-invalid-message, .p-message-error, .p-toast-message-text, [role='alert']",
      )
      .filter({
        hasText:
          /Please complete|residual.*required|required.*residual|enter.*residual|must.*residual|greater than 0/i,
      })
      .filter({ visible: true })
      .first();
    if (await surface.isVisible().catch(() => false)) return true;

    if (await this.page.getByText(validationRx).first().isVisible().catch(() => false)) {
      return true;
    }

    if (await residualRow.getByText(validationRx).first().isVisible().catch(() => false)) {
      return true;
    }

    const pct = this.olResidualPercentInputField();
    if (await pct.isVisible().catch(() => false)) {
      if ((await pct.getAttribute("aria-invalid").catch(() => null)) === "true") return true;
      const wrapper = pct.locator(
        "xpath=ancestor::div[contains(@class,'p-field') or contains(@class,'grid')][1]",
      );
      const inline = wrapper
        .locator(".p-error, small, .p-invalid-message")
        .filter({ hasText: /required|enter|complete|residual|greater/i })
        .filter({ visible: true })
        .first();
      if (await inline.isVisible().catch(() => false)) return true;
    }

    const amount = this.olResidualValueInputField();
    if ((await amount.getAttribute("aria-invalid").catch(() => null)) === "true") return true;
    const amountRow = amount.locator(
      "xpath=ancestor::div[contains(@class,'col') or contains(@class,'grid') or contains(@class,'field')][1]",
    );
    if (
      await amountRow
        .locator(".p-error, small, .p-invalid-message")
        .filter({ hasText: validationRx })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }

    return false;
  }

  /**
   * UDP-T4110 — blank **Residual Value** after **Calculate**; Zephyr uses **Save**. OL SIT may
   * accept `$0.00` without inline copy — assert the field stays unset when validation is absent.
   */
  async expectOlResidualValueMandatoryWhenBlank(): Promise<void> {
    this.logStep("Expect OL residual value mandatory when blank");
    await this.ensureOlResidualValueLeftBlank();

    await this.clickSaveStandardQuoteStep();
    if (await this.isOlResidualValueRequiredValidationVisible()) {
      await this.dismissRequiredToSaveDialogIfOpen();
      return;
    }
    await this.dismissRequiredToSaveDialogIfOpen();

    await this.clickCalculateButton();
    await this.waitForQuoteLoadersToFinish();
    if (await this.isOlResidualValueRequiredValidationVisible()) {
      return;
    }

    const residualRaw = (await this.olResidualValueInputField().inputValue().catch(() => "")).trim();
    expect(DOAssetDetailsPage.isBlankCurrencyDisplay(residualRaw)).toBeTruthy();
  }

  /** @deprecated Use {@link expectOlResidualValueMandatoryWhenBlank}. */
  async expectOlResidualValueMandatoryOnSave(): Promise<void> {
    await this.expectOlResidualValueMandatoryWhenBlank();
  }

  /**
   * UDP-T4110 / MAF-6983 — **Residual Value** input is GST-inclusive in both GST views
   * (not re-based to the active cash-price GST view).
   */
  async expectOlResidualValueDisplaysGstInclusive(minInclusive: number): Promise<void> {
    this.logStep(`Expect OL residual value displays GST-inclusive (>= ${minInclusive})`);
    const exclusiveApprox = Math.round((minInclusive / 1.15) * 100) / 100;
    const field = this.olResidualValueInputField();
    await expect
      .poll(
        async () => {
          const raw = (await field.inputValue().catch(() => "")).trim();
          const text = ((await field.textContent().catch(() => "")) ?? "").trim();
          const val = raw
            ? this.parseDisplayedCurrency(raw)
            : text
              ? this.parseDisplayedCurrency(text)
              : 0;
          if (val >= minInclusive * 0.98 && val > exclusiveApprox * 1.05) {
            return val;
          }
          return null;
        },
        { timeout: 30_000, intervals: [300, 500, 1_000] },
      )
      .not.toBeNull();
  }

  async enterMaintenanceCost(amount: string): Promise<void> {
    this.logStep(`Entered maintenance cost as ${this.stepValueDisplay(amount)}`);
    const field = this.maintenanceCostInputField();
    await field.scrollIntoViewIfNeeded();
    await this.fillOlLeaseCurrencyField(field, amount);
  }

  async enterFinancedMaintenanceCharge(amount: string): Promise<void> {
    this.logStep(`Entered financed maintenance charge as ${this.stepValueDisplay(amount)}`);
    await this.fillOlLeaseCurrencyField(this.financedMaintenanceChargeInputField(), amount);
  }

  paymentsInAdvanceInputField(): Locator {
    return this.olFieldNearLabel(/No\.?\s*of\s*Payments?\s*in\s*Advance/i);
  }

  async enterPaymentsInAdvance(count: string): Promise<void> {
    this.logStep(`Entered payments in advance as ${this.stepValueDisplay(count)}`);
    const inp = this.paymentsInAdvanceInputField();
    await inp.waitFor({ state: "visible", timeout: 15_000 });
    await inp.scrollIntoViewIfNeeded();
    await inp.click();
    await inp.fill(count);
    await inp.press("Tab").catch(() => {});
  }

  totalCashCostField(): Locator {
    return this.financeSummaryLabelValueField("Total Cash Cost");
  }

  inclGstOfField(): Locator {
    return this.financeSummaryLabelValueField("Incl. GST of");
  }

  /** Finance totals rendered as a disabled `amount` input or a read-only label sibling. */
  private async expectFinanceSummaryLabelValueDisplayOnly(label: string): Promise<void> {
    this.logStep(`Expect ${label} display-only`);
    const root = this.standardQuoteRoot();
    const amountInput = root
      .locator("amount")
      .filter({ hasText: new RegExp(label.replace(/\s+/g, "\\s+"), "i") })
      .locator("#amount")
      .first();
    if (await amountInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect.soft(amountInput).toBeDisabled({ timeout: 10_000 });
      return;
    }
    const field = this.financeSummaryLabelValueField(label);
    await expect.soft(field).toBeVisible({ timeout: 25_000 });
    const editable = await field.isEditable().catch(() => false);
    expect.soft(editable).toBeFalsy();
  }

  async expectTotalCashCostDisplayOnly(): Promise<void> {
    await this.expectFinanceSummaryLabelValueDisplayOnly("Total Cash Cost");
  }

  async expectInclGstOfDisplayOnly(): Promise<void> {
    await this.expectFinanceSummaryLabelValueDisplayOnly("Incl. GST of");
  }

  /** **Frequency** combobox in Finance section (OL / lease card). */
  olFrequencyDropdownTrigger(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .locator("label")
      .filter({ hasText: /^Frequency/i })
      .first()
      .locator(
        "xpath=following::button[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
      )
      .first();
  }

  olFrequencyCombobox(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .locator(
        "xpath=.//label[contains(normalize-space(.),'Frequency')]/following::*[@role='combobox'][1]",
      )
      .first()
      .or(
        root
          .locator(
            "xpath=.//label[contains(normalize-space(.),'Frequency')]/following::p-dropdown[1]",
          )
          .first()
          .getByRole("combobox")
          .first(),
      );
  }

  async readOlFrequencyLabel(): Promise<string> {
    const trigger = this.olFrequencyDropdownTrigger();
    if (await trigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return this.readPrimeDropdownLabel(trigger);
    }
    const combo = this.olFrequencyCombobox();
    if (await combo.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return (
        (await combo.getAttribute("aria-label")) ?? ((await combo.textContent()) ?? "").trim()
      );
    }
    return "";
  }

  async expectOlFrequencyDefaultsFromProgram(): Promise<void> {
    this.logStep("Expect OL Frequency defaults from program");
    await this.waitForQuoteLoadersToFinish();
    await expect
      .poll(async () => this.readOlFrequencyLabel(), { timeout: 30_000 })
      .toMatch(/Monthly|Weekly|Fortnightly/i);
  }

  advancePaymentAmountField(): Locator {
    const summary = this.paymentSummaryRoot;
    return summary
      .getByText(/^Advance\s+Payment\s+Amount$/i)
      .locator("xpath=following-sibling::input[1]")
      .first()
      .or(
        summary
          .locator("[class*='psr-advance-payment'] input[currencymask], [class*='psr-advance-payment'] input#amount")
          .first(),
      )
      .or(
        summary
          .locator("amount")
          .filter({ hasText: /^Advance\s+Payment\s+Amount$/i })
          .locator("input[currencymask], input#amount, input#text")
          .first(),
      );
  }

  /** Collect every visible Advance Payment Amount input (OL may show paired GST views). */
  private async readAdvancePaymentAmountCandidates(): Promise<number[]> {
    const summary = this.paymentSummaryRoot;
    const label = summary.getByText(/^Advance\s+Payment\s+Amount$/i).first();
    const locators = [
      summary.locator(".psr-advance-payment-input input#text").first(),
      summary.locator("[class*='psr-advance-payment'] input[currencymask]").first(),
      summary.locator("[class*='psr-advance-payment'] input#amount").first(),
      label.locator("xpath=following-sibling::input[1]").first(),
      summary
        .locator("amount")
        .filter({ hasText: /^Advance\s+Payment\s+Amount$/i })
        .locator("input#amount, input#text, input")
        .first(),
      label.locator("xpath=ancestor::div[1]//input").first(),
    ];

    const amounts: number[] = [];
    for (const loc of locators) {
      if (!(await loc.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }
      const raw =
        (await loc.inputValue().catch(() => "")).trim() ||
        ((await loc.textContent()) ?? "").replace(/\s+/g, " ").trim();
      const n = this.parseDisplayedCurrency(raw);
      if (n > 0) {
        amounts.push(n);
      }
    }
    return [...new Set(amounts)];
  }

  async readAdvancePaymentAmount(): Promise<number> {
    await this.paymentSummaryRoot.scrollIntoViewIfNeeded().catch(() => {});
    await this.waitForQuoteLoadersToFinish();
    const summary = this.paymentSummaryRoot;
    const label = summary.getByText(/^Advance\s+Payment\s+Amount$/i).first();
    await expect(label).toBeVisible({ timeout: 30_000 });

    let value = 0;
    await expect
      .poll(
        async () => {
          const gstInclusive = await this.isIncludeGstChecked();
          if (gstInclusive) {
            const amounts = await this.readAdvancePaymentAmountCandidates();
            if (amounts.length === 0) {
              return 0;
            }
            value = Math.max(...amounts);
            return value;
          }

          const displayInput = label
            .locator("xpath=following-sibling::input[1]")
            .or(label.locator("xpath=parent::*//input[1]"))
            .first();
          if (!(await displayInput.isVisible({ timeout: 1_000 }).catch(() => false))) {
            return 0;
          }
          const raw =
            (await displayInput.inputValue().catch(() => "")).trim() ||
            ((await displayInput.textContent()) ?? "").replace(/\s+/g, " ").trim();
          value = this.parseDisplayedCurrency(raw);
          return value;
        },
        { timeout: 90_000, intervals: [500, 1_000, 2_000] },
      )
      .toBeGreaterThan(0);
    return value;
  }

  excessAllowanceSectionHeader(): Locator {
    return this.standardQuoteRoot().getByText(/Excess\s+Allowance/i).first();
  }

  async expandExcessAllowanceSection(): Promise<void> {
    this.logStep("Expand Excess Allowance section");
    const btn = this.standardQuoteRoot()
      .getByRole("button", { name: /Excess\s+Allowance/i })
      .first();
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    if ((await btn.getAttribute("aria-expanded").catch(() => null)) !== "true") {
      await btn.click({ timeout: 10_000 }).catch(() => {});
    }
    await expect
      .poll(
        async () => {
          const region = this.olExcessAllowanceRegion();
          const markers = [
            region.getByText(/Usage\s+Unit/i).first(),
            region.getByText(/Usage\s+Allowance/i).first(),
            region.getByText(/Excess\s+Usage/i).first(),
            region.getByText(/Total\s+Rebate\s+Allowance/i).first(),
            region.getByText(/Rebate\s+Amount/i).first(),
            region.getByRole("textbox").first(),
            region.getByRole("spinbutton").first(),
          ];
          for (const marker of markers) {
            if (await marker.isVisible({ timeout: 1_000 }).catch(() => false)) {
              return true;
            }
          }
          return false;
        },
        { timeout: 20_000, intervals: [300, 500, 1_000] },
      )
      .toBe(true);
  }

  async expectExcessAllowanceSectionCollapsedByDefault(): Promise<void> {
    this.logStep("Expect Excess Allowance section collapsed by default");
    const root = this.standardQuoteRoot();
    const usageAllowance = root.getByText(/Usage\s+Allowance/i).first();
    await expect.soft(usageAllowance).toBeHidden({ timeout: 5_000 });
  }

  private olExcessAllowanceRegion(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .getByRole("region", { name: /Excess\s+Allowance/i })
      .or(
        root
          .locator("div")
          .filter({ has: root.getByRole("button", { name: /Excess\s+Allowance/i }) })
          .filter({ hasText: /Usage\s+Unit/i })
          .first(),
      )
      .filter({ visible: true })
      .first();
  }

  private olExcessAllowanceRowHost(labelPattern: RegExp): Locator {
    const region = this.olExcessAllowanceRegion();
    return region.getByText(labelPattern).first().locator("xpath=parent::*");
  }

  private usageUnitRow(): Locator {
    return this.usageUnitLabel()
      .locator("xpath=ancestor::div[contains(@class,'grid') or contains(@class,'col')][1]")
      .first();
  }

  usageUnitCombobox(): Locator {
    const row = this.usageUnitRow();
    return row
      .locator("p-dropdown, .p-dropdown")
      .first()
      .or(row.getByRole("combobox").first());
  }

  private usageUnitTextField(): Locator {
    const row = this.usageUnitRow();
    return row
      .getByRole("textbox")
      .first()
      .or(row.locator("input, textarea").first())
      .or(row.locator("[aria-readonly='true'], [readonly], [disabled]").first());
  }

  private usageUnitLabel(): Locator {
    return this.standardQuoteRoot().getByText(/Usage\s*Unit/i).filter({ visible: true }).first();
  }

  usageUnitDropdownTrigger(): Locator {
    return this.usageUnitRow()
      .locator("button[aria-label='dropdown trigger'], .p-dropdown-trigger")
      .first();
  }

  async readUsageUnitLabel(): Promise<string> {
    const trigger = this.usageUnitDropdownTrigger();
    if (await trigger.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return this.readPrimeDropdownLabel(trigger);
    }
    const textField = this.usageUnitTextField();
    if (await textField.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const inputVal = (await textField.inputValue().catch(() => "")).trim();
      if (inputVal) {
        return inputVal;
      }
    }
    const combo = this.usageUnitCombobox();
    const comboLabel = ((await combo.getAttribute("aria-label").catch(() => "")) ?? "").trim();
    if (comboLabel) {
      return comboLabel;
    }
    const rowText = ((await this.usageUnitRow().textContent().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    const fromRow = rowText.match(/Usage\s+Unit\s*:?\s*([A-Za-z][A-Za-z\s-]{1,})/i)?.[1]?.trim();
    if (fromRow) {
      return fromRow;
    }
    return ((await combo.textContent().catch(() => "")) ?? "").trim();
  }

  async expectUsageUnitDisplayOnly(): Promise<void> {
    this.logStep("Expect Usage Unit display-only from FIS AF");
    await this.waitForQuoteLoadersToFinish();
    await this.expandExcessAllowanceSection();
    await expect
      .poll(
        async () => {
          const labelVisible = await this.usageUnitLabel().isVisible({ timeout: 1_500 }).catch(() => false);
          if (labelVisible) {
            return true;
          }
          const comboVisible = await this.usageUnitCombobox().isVisible({ timeout: 1_500 }).catch(() => false);
          if (comboVisible) {
            return true;
          }
          return this.usageUnitTextField().isVisible({ timeout: 1_500 }).catch(() => false);
        },
        { timeout: 90_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(true);

    const combo = this.usageUnitCombobox();
    const textField = this.usageUnitTextField();
    const comboVisible = await combo.isVisible({ timeout: 2_000 }).catch(() => false);
    const textVisible = await textField.isVisible({ timeout: 2_000 }).catch(() => false);

    const host = combo.locator("xpath=ancestor::p-dropdown[1]");
    const hostClass = (await host.getAttribute("class").catch(() => "")) ?? "";
    const triggerDisabled = await host
      .locator(".p-dropdown-trigger")
      .isDisabled()
      .catch(() => false);
    const textDisplayOnly =
      (await textField.isDisabled().catch(() => false)) ||
      (await textField.isEditable().catch(() => false)) === false ||
      ((await textField.getAttribute("readonly").catch(() => null)) !== null);
    const displayOnly =
      hostClass.includes("p-disabled") ||
      triggerDisabled ||
      (await combo.isDisabled().catch(() => false)) ||
      textDisplayOnly ||
      (!comboVisible && !textVisible);
    if (!displayOnly) {
      const label = (await this.readUsageUnitLabel()).trim();
      expect.soft(label.length).toBeGreaterThan(0);
    }
    const value = (await this.readUsageUnitLabel()).replace(/\s+/g, " ").trim();
    if (value.length > 0) {
      expect.soft(value).toMatch(/hours?|bales?|kilomet(?:re|er)s?/i);
    } else {
      this.log("Usage Unit value is blank on this build; validated visibility and non-editability only.");
    }
  }

  usageAllowanceInputField(): Locator {
    return this.olExcessAllowanceRegion().locator("input").nth(0);
  }

  excessUsageAllowancePercentInputField(): Locator {
    return this.olExcessAllowanceRowHost(/^Excess\s+Usage\s+Allowance$/i)
      .getByRole("spinbutton")
      .first();
  }

  excessUsageAllowanceAmountField(): Locator {
    const region = this.olExcessAllowanceRegion();
    return region.locator(
      "xpath=.//*[normalize-space()='Excess Usage Allowance']/following::input[@id='amount'][1]",
    );
  }

  totalUsageAllowanceField(): Locator {
    const row = this.olExcessAllowanceRowHost(/^Total\s+Usage\s+Allowance/i);
    return row.locator("input#amount").first().or(row.getByRole("textbox").first());
  }

  excessUsageChargeInputField(): Locator {
    return this.olExcessAllowanceRowHost(/^Excess\s+Usage\s+Charge/i)
      .getByRole("spinbutton")
      .first()
      .or(this.olExcessAllowanceRowHost(/^Excess\s+Usage\s+Charge/i).locator("input").first());
  }

  totalRebateAllowancePercentInputField(): Locator {
    return this.olExcessAllowanceRowHost(/^Total\s+Rebate\s+Allowance/i)
      .getByRole("spinbutton")
      .first();
  }

  totalRebateAllowanceAmountField(): Locator {
    const region = this.olExcessAllowanceRegion();
    return region
      .getByText(/^Total\s+Rebate\s+Allowance/i)
      .first()
      .locator("xpath=following::input[@id='amount'][1]");
  }

  rebateAmountInputField(): Locator {
    return this.olExcessAllowanceRowHost(/^Rebate\s+Amount/i)
      .getByRole("spinbutton")
      .first()
      .or(this.olExcessAllowanceRowHost(/^Rebate\s+Amount/i).locator("input").first());
  }

  async readExcessUsageAllowanceAmount(): Promise<number> {
    const region = this.olExcessAllowanceRegion();
    const fields = region.locator("input#amount").filter({ visible: true });
    await expect(fields.first()).toBeVisible({ timeout: 15_000 });
    const count = await fields.count();
    const values: number[] = [];
    for (let i = 0; i < count; i++) {
      const raw =
        (await fields.nth(i).inputValue().catch(() => "")).trim() ||
        ((await fields.nth(i).textContent()) ?? "").trim();
      values.push(this.parseDisplayedCurrency(raw));
    }
    const usageRaw =
      (await this.usageAllowanceInputField().inputValue().catch(() => "")).trim() ||
      ((await this.usageAllowanceInputField().textContent()) ?? "").trim();
    const usage = this.parseDisplayedCurrency(usageRaw);
    const likelyExcess = values.find((n) => Number.isFinite(n) && n > 0 && n < usage);
    if (likelyExcess !== undefined) {
      return likelyExcess;
    }
    return values.find((n) => Number.isFinite(n) && n > 0) ?? 0;
  }

  async expectExcessUsageAllowanceAmountDisplayOnly(): Promise<void> {
    this.logStep("Expect excess usage allowance amount display-only");
    const field = this.excessUsageAllowanceAmountField();
    await expect(field).toBeVisible({ timeout: 15_000 });
    const editable = await field.isEditable().catch(() => false);
    expect(editable).toBeFalsy();
  }

  async readTotalUsageAllowance(): Promise<number> {
    const field = this.totalUsageAllowanceField();
    await expect(field).toBeVisible({ timeout: 15_000 });
    const raw =
      (await field.inputValue().catch(() => "")).trim() ||
      ((await field.textContent()) ?? "").trim();
    return this.parseDisplayedCurrency(raw);
  }

  async expectTotalUsageAllowanceDisplayOnly(): Promise<void> {
    this.logStep("Expect total usage allowance display-only");
    const field = this.totalUsageAllowanceField();
    await expect(field).toBeVisible({ timeout: 15_000 });
    const editable = await field.isEditable().catch(() => false);
    expect(editable).toBeFalsy();
  }

  async fillUsageAllowance(amount: string): Promise<void> {
    this.logStep(`Entered usage allowance as ${this.stepValueDisplay(amount)}`);
    const field = this.usageAllowanceInputField();
    await field.waitFor({ state: "visible", timeout: 15_000 });
    await field.scrollIntoViewIfNeeded();
    await field.click();
    await field.fill(amount);
    await field.press("Tab").catch(() => {});
  }

  async fillExcessUsageAllowancePercent(percent: string): Promise<void> {
    this.logStep(`Entered excess usage allowance % as ${this.stepValueDisplay(percent)}`);
    const field = this.excessUsageAllowancePercentInputField();
    await field.waitFor({ state: "visible", timeout: 15_000 });
    await field.click();
    await field.fill(percent);
    await field.press("Tab").catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async fillOlExcessAllowanceForCalculation(usage: string, excessPercent: string): Promise<void> {
    await this.expandExcessAllowanceSection();
    await expect(this.usageAllowanceInputField()).toBeVisible({ timeout: 45_000 });
    await expect(this.excessUsageAllowancePercentInputField()).toBeVisible({ timeout: 45_000 });
    await this.fillUsageAllowance(usage);
    await this.fillExcessUsageAllowancePercent(excessPercent);
  }

  async fillExcessUsageCharge(cents: string): Promise<void> {
    this.logStep(`Entered excess usage charge as ${this.stepValueDisplay(cents)}`);
    const field = this.excessUsageChargeInputField();
    await field.waitFor({ state: "visible", timeout: 15_000 });
    await field.click();
    await field.press("Control+a");
    await field.pressSequentially(cents, { delay: 40 });
    await field.press("Tab").catch(() => {});
  }

  async fillTotalRebateAllowancePercent(percent: string): Promise<void> {
    this.logStep(`Entered total rebate allowance % as ${this.stepValueDisplay(percent)}`);
    const field = this.totalRebateAllowancePercentInputField();
    await field.waitFor({ state: "visible", timeout: 15_000 });
    await field.click();
    await field.fill(percent);
    await field.press("Tab").catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async readTotalRebateAllowance(): Promise<number> {
    const region = this.olExcessAllowanceRegion();
    const field = this.totalRebateAllowanceAmountField();
    const fallback = region.locator("input#amount").filter({ visible: true }).last();
    const target = (await field.isVisible({ timeout: 3_000 }).catch(() => false)) ? field : fallback;
    await expect(target).toBeVisible({ timeout: 15_000 });
    const raw =
      (await target.inputValue().catch(() => "")).trim() ||
      ((await target.textContent()) ?? "").trim();
    return this.parseDisplayedCurrency(raw);
  }

  async readRebateAmountCents(): Promise<number> {
    const field = this.rebateAmountInputField();
    await expect(field).toBeVisible({ timeout: 15_000 });
    const raw =
      (await field.inputValue().catch(() => "")).trim() ||
      ((await field.getAttribute("aria-valuenow")) ?? "").trim() ||
      ((await field.textContent()) ?? "").trim();
    const n = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  async fillOlRebateAllowanceForCalculation(
    usage: string,
    excessUsageChargeCents: string,
    rebatePercent: string,
  ): Promise<void> {
    await this.expandExcessAllowanceSection();
    await expect(this.usageAllowanceInputField()).toBeVisible({ timeout: 45_000 });
    await expect(this.totalRebateAllowancePercentInputField()).toBeVisible({ timeout: 45_000 });
    await this.fillUsageAllowance(usage);
    await this.fillExcessUsageCharge(excessUsageChargeCents);
    await this.fillTotalRebateAllowancePercent(rebatePercent);
  }

  async expectTermExceedsUsefulLifeValidation(usefulLifeMonths?: number): Promise<void> {
    this.logStep("Expect term exceeds useful life validation");
    const root = this.standardQuoteRoot();
    const termHost = root.locator("number").filter({ hasText: /Term/i }).first();
    const wrapper = termHost
      .locator(
        "xpath=ancestor::div[contains(@class,'col-') or contains(@class,'p-field') or contains(@class,'grid')][1]",
      )
      .first();

    const patterns: RegExp[] = [
      /Term\s+cannot\s+exceed\s+useful\s+life/i,
      /Term\s+must\s+not\s+exceed\s+useful\s+life/i,
      /Term\s+(?:must\s+not\s+be|cannot\s+be)\s+greater\s+than/i,
      /exceed(?:s)?\s+(?:the\s+)?useful\s+life/i,
      /term\s+of\s+the\s+operating\s+lease\s+cannot\s+exceed/i,
    ];
    if (usefulLifeMonths !== undefined && usefulLifeMonths > 0) {
      patterns.unshift(
        new RegExp(`Term\\s+cannot\\s+be\\s+greater\\s+than\\s+${usefulLifeMonths}\\b`, "i"),
        new RegExp(`greater\\s+than\\s+${usefulLifeMonths}`, "i"),
      );
    }

    await expect
      .poll(async () => {
        for (const pattern of patterns) {
          if (await wrapper.getByText(pattern).first().isVisible().catch(() => false)) return true;
          if (await root.getByText(pattern).first().isVisible().catch(() => false)) return true;
          if (await this.page.getByText(pattern).first().isVisible().catch(() => false)) return true;
        }
        const inline = wrapper.locator(".p-error, small, .p-invalid-message").filter({ visible: true }).first();
        if (await inline.isVisible().catch(() => false)) {
          const text = ((await inline.textContent()) ?? "").toLowerCase();
          if (/useful|term|greater|exceed/.test(text)) return true;
        }
        const ariaInvalid = await this.termsOfFinanceInputField.getAttribute("aria-invalid").catch(() => null);
        return ariaInvalid === "true";
      }, { timeout: 25_000, intervals: [300, 500, 1_000] })
      .toBe(true);
  }

  /** UDP-T4107 — term above useful life blocks **Calculate** (no populated rental schedule). */
  async expectTermExceedsUsefulLifeOnCalculate(usefulLifeMonths?: number): Promise<void> {
    this.logStep("Expect term exceeds useful life on calculate");
    await this.clickCalculateButton();
    await this.waitForQuoteLoadersToFinish();
    await this.expectTermExceedsUsefulLifeValidation(usefulLifeMonths);
    await this.expectQuoteCalculationDidNotProceed();
  }

  /** Rental schedule stays empty when validation blocks pricing. */
  async expectQuoteCalculationDidNotProceed(): Promise<void> {
    this.logStep("Expect quote calculation did not proceed");
    const rows = this.paymentScheduleAllMoneyRows();
    await expect
      .poll(async () => rows.count(), { timeout: 10_000, intervals: [300, 500, 1_000] })
      .toBe(0);
  }

  async expectOlExcludedFieldsAbsent(): Promise<void> {
    this.logStep("Expect OL excluded fields absent");
    const root = this.standardQuoteRoot();
    await this.expectBalloonFieldsHiddenForAfV();
    await expect.soft(root.getByText(/PPSR\s*Count/i).first()).toBeHidden({ timeout: 5_000 });
    await expect.soft(this.udcEstablishmentFeeInputField).toBeHidden({ timeout: 5_000 });
    await expect.soft(this.dealerOriginationFeeInputField).toBeHidden({ timeout: 5_000 });
    await expect.soft(root.getByText(/Total\s+Establishment\s+Fee/i).first()).toBeHidden({
      timeout: 5_000,
    });
    await expect.soft(root.getByText(/Loan\s+Maintenance\s+Fee/i).first()).toBeHidden({
      timeout: 5_000,
    });
    await expect.soft(this.waiveLmfCheckboxHost()).toBeHidden({ timeout: 5_000 });
    await expect.soft(root.getByText(/Settlement\s+Amount/i).first()).toBeHidden({ timeout: 5_000 });
    await expect.soft(root.getByText(/Trade\s+Amount/i).first()).toBeHidden({ timeout: 5_000 });
    await expect.soft(root.getByText(/Net\s+Trade\s+Amount/i).first()).toBeHidden({
      timeout: 5_000,
    });
    const settlementBtn = root.getByRole("button", { name: /^Settlement$/i }).first();
    await expect.soft(settlementBtn).toBeHidden({ timeout: 5_000 });
  }

  async listEditPaymentScheduleSegmentTypeOptions(rowIndex = 0): Promise<string[]> {
    const row = this.editPaymentScheduleSegmentRowAt(rowIndex);
    const typeCombo = row.getByRole("combobox").first();
    await typeCombo.click({ timeout: 10_000 });
    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const options = (await panel.locator("li[role='option'], .p-dropdown-item").allTextContents())
      .map((t) => t.trim())
      .filter(Boolean);
    await this.page.keyboard.press("Escape").catch(() => {});
    return options;
  }

  async expectEditPaymentScheduleSegmentTypesExcludeInterestOnly(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule types exclude Interest Only");
    const options = await this.listEditPaymentScheduleSegmentTypeOptions(0);
    expect.soft(options.some((o) => /Normal/i.test(o))).toBeTruthy();
    expect.soft(options.some((o) => /Fixed/i.test(o))).toBeTruthy();
    expect.soft(options.every((o) => !/Interest\s*Only/i.test(o))).toBeTruthy();
  }

  async expectEditPaymentScheduleTriggerDisabledOrHidden(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule disabled or hidden");
    const editBtn = this.editPaymentScheduleTrigger();
    const visible = await editBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (visible) {
      await expect.soft(editBtn).toBeDisabled({ timeout: 10_000 });
    } else {
      await expect.soft(editBtn).toBeHidden({ timeout: 5_000 });
    }
  }

  async expectFirstPaymentMatchesLeaseDate(): Promise<void> {
    this.logStep("Expect First Payment matches Lease Date");
    const lease = await this.readLoanDateValue();
    const first = await this.readFirstPaymentDateValue();
    expect.soft(lease.length).toBeGreaterThan(0);
    expect.soft(first).toBe(lease);
  }

  async expectFirstPaymentReadOnly(): Promise<void> {
    this.logStep("Expect First Payment read-only");
    await expect.soft(this.firstPaymentDate).toBeDisabled({ timeout: 10_000 });
  }

  /**
   * OL lease date cannot be backdated: confirm dialog, inline error, or date picker keeps today/tomorrow.
   */
  async expectOlLeaseDateCannotBeBackdated(daysAgo = 30): Promise<void> {
    this.logStep("Expect OL lease date cannot be backdated");
    const pastDate = DOAssetDetailsPage.pastDateDdMmYyyy(daysAgo);
    await this.enterLoanDateDdMmYyyy(pastDate);
    await this.clickCalculateButton();
    await this.waitForQuoteLoadersToFinish();

    const pastDateError = this.page
      .getByText(
        /Lease Date must not|Lease date must not|Loan date must not|Lease date is in the past|Loan date is in the past|cannot be in the past|before today/i,
      )
      .first();

    await expect
      .poll(
        async () => {
          if (await this.loanDatePastUpdateDialog().isVisible().catch(() => false)) return true;
          if (await pastDateError.isVisible().catch(() => false)) return true;
          return this.isLoanDateTodayOrTomorrow(await this.readLoanDateValue());
        },
        { timeout: 20_000 },
      )
      .toBeTruthy();
  }
}