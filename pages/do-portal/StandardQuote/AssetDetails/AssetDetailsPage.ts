import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common/BasePage";

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
      /Asset\s*(?:,\s*|\s*&\s*)Insurance(?:\s*&\s*Trade-?\s*in|\s*Summary)?/i;
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
    this.cashPriceOfAssetInputField = page
      .getByRole("textbox", { name: /Cash Price of Asset/i })
      .first();
    const rrpLabel = /Recommended\s+Retail\s+Price/i;
    // Float labels may sit outside the `col-6` wrapper; prefer ARIA name, then label text + `#amount`.
    this.recommendedRetailPriceInput = page
      .getByRole("textbox", { name: rrpLabel })
      .or(
        page
          .getByText(rrpLabel)
          .locator(
            "xpath=ancestor::div[contains(@class,'col-')][1]//input[@id='amount']",
          ),
      )
      .or(page.locator("amount").filter({ hasText: rrpLabel }).locator("#amount"))
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
    /** Customer Details: CTA label varies (`/`, `&`, `and`), may live on `p-button` or `span.p-button-label` (not always in a11y name). */
    const quoteCustomerShell = page.locator("app-standard-quote, app-quote-details").first();
    const addBorrowerLabel = /Add\s+Borrowers?\s*(\/|&|and)\s*Guarantors?/i;
    const addBorrowerClickableFromText = (root: Locator): Locator =>
      root
        .getByText(addBorrowerLabel)
        .first()
        .locator("xpath=ancestor::button[1] | ancestor::a[1] | ancestor::p-button[1]");
    const addBorrowerLooseTextClickable = (root: Locator): Locator =>
      root
        .getByText("Add Borrowers / Guarantors", { exact: false })
        .first()
        .locator("xpath=ancestor::button[1] | ancestor::a[1] | ancestor::p-button[1]");
    this.addBorrowerorGuarantorButton = quoteCustomerShell
      .getByRole("button", { name: addBorrowerLabel })
      .or(quoteCustomerShell.getByRole("link", { name: addBorrowerLabel }))
      .or(page.getByRole("button", { name: addBorrowerLabel }))
      .or(page.getByRole("link", { name: addBorrowerLabel }))
      .or(page.locator(':text-is("Add Borrowers / Guarantors")'))
      .or(addBorrowerClickableFromText(quoteCustomerShell))
      .or(addBorrowerClickableFromText(page.locator("body")))
      .or(addBorrowerLooseTextClickable(quoteCustomerShell))
      .or(addBorrowerLooseTextClickable(page.locator("body")))
      .or(
        quoteCustomerShell
          .locator("button.p-button, button.p-element, p-button")
          .filter({ hasText: addBorrowerLabel })
          .first(),
      )
      .or(
        page
          .locator("button, a")
          .filter({ hasText: addBorrowerLabel })
          .first(),
      )
      .first();
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

    this.additionalFundsRoot = page.locator("app-additional-funds").first();
    this.additionalFundsInput = this.additionalFundsRoot
      .locator("amount")
      .filter({ hasText: /Additional Funds/i })
      .locator("#amount")
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
    this.balloonAmountInput = balloonAmountHost.locator("#amount").first();
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
      .getByRole("checkbox", { name: /^Fixed$/i })
      .or(
        paymentSummary
          .locator("p-checkbox")
          .filter({ hasText: /^Fixed$/i })
          .locator('input[type="checkbox"]'),
      )
      .first();
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
    await productDropdown.click();
  }

  /**
   * Choose an item from the product dropdown list
   */
  async selectProduct(productName: string): Promise<void> {
    this.logStep(`Selected product: ${this.stepValueDisplay(productName)}`);
    await this.page.getByRole("option", { name: productName }).click();
  }

  /**
   * Open the program dropdown in the quote dialog
   */
  async openProgramDropdown(): Promise<void> {
    this.logStep("Opened program dropdown");
    const programDropdown = this.page.locator(
      `//span//label[contains(text(), 'Program')]/following-sibling::div//span`,
    );
    await programDropdown.click();
  }

  /**
   * Choose an item from the program dropdown list
   * (`getByText` is unsafe here — e.g. **CSA Personal - MV Dealer** is a substring of **Webform - CSA Personal - MV Dealer**.)
   */
  async selectProgram(programName: string): Promise<void> {
    this.logStep(`Selected program: ${this.stepValueDisplay(programName)}`);
    await this.page.getByRole("option", { name: programName, exact: true }).click();
  }

  /**
   * Convenience wrapper: open product dropdown and select entry in one call
   */
  async chooseProduct(productName: string): Promise<void> {
    this.logStep(`Chose product: ${this.stepValueDisplay(productName)}`);
    await this.openProductDropdown();
    await this.selectProduct(productName);
  }

  /**
   * Convenience wrapper: open program dropdown and select entry in one call
   */
  async chooseProgram(programName: string): Promise<void> {
    this.logStep(`Chose program: ${this.stepValueDisplay(programName)}`);
    await this.openProgramDropdown();
    await this.selectProgram(programName);
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
  
    await expect(
      this.cashPriceOfAssetInputField
    ).toBeVisible({
      timeout: 60_000,
    });
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
  }): Promise<void> {
    this.logStep("Expect finance carried from Quick Quote");
    const root = this.standardQuoteRoot();
    await expect(this.cashPriceOfAssetInputField).toHaveValue(opts.cashPrice, { timeout: 30_000 });
    // Term: CSA often uses "Terms of Finance" / PrimeNG dropdown; TLC may use spinbutton. Do not use
    // /^Term\s*\*?$/ only — that misses "Terms of Finance" and forces a page-global fallback that can
    // resolve to an empty spinbutton inside Asset/Insurance summary while the real Term is a combobox.
    const termRowLabel = /^\s*Terms?\s*(of\s+Finance)?\s*\*?\s*$/i;
    const termRow = root
      .locator(".p-field, [class*='p-field']")
      .filter({ has: root.locator("label").filter({ hasText: termRowLabel }) })
      .first();
    const termCombo = termRow.getByRole("combobox").first();
    const termSpin = termRow.getByRole("spinbutton").first();
    const termRowVisibleMs = 15_000;
    if (await termCombo.isVisible({ timeout: termRowVisibleMs }).catch(() => false)) {
      await expect(termCombo).toContainText(opts.term, { timeout: 25_000 });
    } else if (await termSpin.isVisible({ timeout: termRowVisibleMs }).catch(() => false)) {
      await expect
        .poll(async () => termSpin.inputValue(), { timeout: 25_000 })
        .toMatch(opts.term);
    } else {
      const termNumberSpin = root
        .locator("number")
        .filter({ hasText: /Term/i })
        .getByRole("spinbutton")
        .first();
      const termNumberInput = root
        .locator("number")
        .filter({ hasText: /Term/i })
        .locator("input[type='number'], input.p-inputtext, input")
        .first();
      const termAriaCombo = root.getByRole("combobox", { name: /Term|Terms\s+of\s+Finance/i }).first();

      if (await termAriaCombo.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect(termAriaCombo).toContainText(opts.term, { timeout: 25_000 });
      } else if (await termNumberSpin.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect
          .poll(async () => termNumberSpin.inputValue(), { timeout: 25_000 })
          .toMatch(opts.term);
      } else if (await termNumberInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect
          .poll(async () => termNumberInput.inputValue(), { timeout: 25_000 })
          .toMatch(opts.term);
      } else {
        await expect
          .poll(async () => this.termsOfFinanceInputField.inputValue(), { timeout: 25_000 })
          .toMatch(opts.term);
      }
    }
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
    await this.additionalFundsInput.scrollIntoViewIfNeeded();
    await this.additionalFundsInput.fill(amount, { force: true });
    await this.additionalFundsInput.press("Tab").catch(() => {});
  }

  async clearAdditionalFunds(): Promise<void> {
    this.logStep("Clear Additional Funds");
    await this.waitForAdditionalFundsSectionReady();
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await this.additionalFundsInput.scrollIntoViewIfNeeded();
    await this.additionalFundsInput.click({ force: true, timeout: 20_000 });
    await this.additionalFundsInput.press("ControlOrMeta+a");
    await this.page.keyboard.press("Backspace");
    await this.additionalFundsInput.press("Tab").catch(() => {});
  }

  async enterAdditionalFundsPurpose(text: string): Promise<void> {
    this.logStep(`Entered additional funds purpose as ${this.stepValueDisplay(text)}`);
    await this.waitForAdditionalFundsSectionReady();
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await this.additionalFundsPurposeTextarea.scrollIntoViewIfNeeded();
    await this.additionalFundsPurposeTextarea.fill(text, { force: true });
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
   * on or near the purpose field (copy varies by build).
   */
  async expectAdditionalFundsPurposeInlineErrorVisible(): Promise<void> {
    this.logStep("Expect Additional Funds Purpose Inline Error Visible");
    await this.waitForAdditionalFundsSectionReady();
    const root = this.additionalFundsRoot;
    const inNote = root
      .locator("note")
      .first()
      .locator(".p-error, .p-invalid-message, small, span[class*='error']")
      .filter({ hasText: /required|must|enter|cannot|blank|invalid|provide/i });
    if (await inNote.first().isVisible({ timeout: 4_000 }).catch(() => false)) {
      await expect(inNote.first()).toBeVisible({ timeout: 15_000 });
      return;
    }
    await expect(
      root.getByText(/required|must enter|cannot be blank|is required|invalid|provide a/i).first(),
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
   * After pricing/async refresh, **Loan Date** can flicker. Wait until the displayed value
   * is unchanged for several consecutive reads (fast when already stable).
   */
  private async waitForLoanDateValueStable(
    loanIn: Locator,
    opts?: { timeoutMs?: number; intervalMs?: number; stableRounds?: number },
  ): Promise<void> {
    const timeoutMs = opts?.timeoutMs ?? 20_000;
    const intervalMs = opts?.intervalMs ?? 200;
    const needRounds = opts?.stableRounds ?? 3;
    const deadline = Date.now() + timeoutMs;
    let prev = "";
    let stable = 0;
    while (Date.now() < deadline) {
      const loanTrim = (await loanIn.inputValue()).trim();
      if (loanTrim.length > 4 && loanTrim === prev) {
        stable += 1;
        if (stable >= needRounds) return;
      } else {
        stable = loanTrim.length > 4 ? 1 : 0;
        prev = loanTrim;
      }
      await this.page.waitForTimeout(intervalMs);
    }
    throw new Error(
      `Loan Date did not stabilize within ${timeoutMs}ms (last read: "${(await loanIn.inputValue()).trim()}").`,
    );
  }


  
  async waitForQuoteLoadersToFinish(timeoutMs = 120_000): Promise<void> {
    this.logStep("Wait For Quote Loaders To Finish");
    await this.waitUntilNoVisibleAppLoaderOverlays(timeoutMs);
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 55_000 }).catch(() => {});
  }
 

  async expectRecommendedRetailPriceHiddenAfterUsedCondition(): Promise<void> {
    this.logStep("Expect Recommended Retail Price Hidden After Used Condition");
    await this.waitForQuoteLoadersToFinish();
    await this.page.waitForTimeout(2_000);
 
    await this.dealerOriginationFeeInputField.scrollIntoViewIfNeeded();
    await this.page.mouse.wheel(0, 700);
    await this.page.waitForTimeout(1_000);
 
    // Match UDP-T3657 / `recommendedRetailPriceInput` only. A broad `getByText(RRP)` stays visible
    // (e.g. label in layout/summary) while the amount field is hidden for Used — that caused visibleCount 1.
    await expect
      .poll(
        async () => {
          const n = await this.recommendedRetailPriceInput.count();
          if (n === 0) return true;
          return !(await this.recommendedRetailPriceInput.first().isVisible().catch(() => false));
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
    const timeoutMs = opts?.timeoutMs ?? 20_000;
    const intervalMs = opts?.intervalMs ?? 200;
    const needRounds = opts?.stableRounds ?? 3;
    const deadline = Date.now() + timeoutMs;
    let prev = "";
    let stable = 0;
    while (Date.now() < deadline) {
      const loanTrim = (await loanIn.inputValue()).trim();
      const firstTrim = (await firstIn.inputValue()).trim();
      const snapshot = `${loanTrim}\0${firstTrim}`;
      const bothOk = loanTrim.length > 4 && firstTrim.length > 4;
      if (bothOk && snapshot === prev) {
        stable += 1;
        if (stable >= needRounds) return;
      } else if (bothOk) {
        stable = 1;
        prev = snapshot;
      } else {
        stable = 0;
        prev = "";
      }
      await this.page.waitForTimeout(intervalMs);
    }
    const loanTrim = (await loanIn.inputValue()).trim();
    const firstTrim = (await firstIn.inputValue()).trim();
    throw new Error(
      `Loan Date / First Payment did not stabilize within ${timeoutMs}ms (loan="${loanTrim}", first="${firstTrim}").`,
    );
  }

  /** Loan Date must be set; fill First Payment from loan date when the UI left it empty (required for Calculate). */
  async ensureLoanDateAndFirstPaymentReadyForCalculate(): Promise<void> {
    this.logStep("Ensure Loan Date And First Payment Ready For Calculate");
    const loanIn = this.loanDate;
    const firstIn = this.firstPaymentDate;
    await expect(loanIn).toBeVisible({ timeout: 15_000 });
    await expect(loanIn).toBeEditable();
    expect((await loanIn.inputValue()).trim().length).toBeGreaterThan(4);
    await expect(firstIn).toBeVisible({ timeout: 15_000 });
    await this.waitUntilNoVisibleAppLoaderOverlays(15_000);
    await this.waitForLoanDateValueStable(loanIn);
    if ((await firstIn.inputValue()).trim().length < 5) {
      await expect(firstIn).toBeEditable();
      await this.enterFirstPaymentSuggestedFromLoanDdMmYyyy();
      await expect
        .poll(async () => (await firstIn.inputValue()).trim().length, { timeout: 12_000 })
        .toBeGreaterThan(4);
    }
    await this.waitUntilNoVisibleAppLoaderOverlays(15_000);
    await this.waitForLoanAndFirstPaymentValuesStable(loanIn, firstIn);
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

  /** Interest Rate control is editable (program may still re-price on Calculate). */
  async expectInterestRateEditable(): Promise<void> {
    this.logStep("Expect Interest Rate Editable");
    await expect(this.interestRateInputField).toBeVisible({ timeout: 20_000 });
    await expect(this.interestRateInputField).toBeEditable();
  }

  /**
   * After **Calculate** with term above program max: expect copy under **Term**, e.g.
   * `Term cannot be greater than 60` (resource string may be `Term cannot be greater than {{0}}`).
   */
  private async expectTermCannotExceedProgramMaxMessageBelowTermField(): Promise<void> {
    const root = this.standardQuoteRoot();
    const cannotGreaterThan = /Term\s+cannot\s+be\s+greater\s+than\s+(\{\{0\}\}|\d[\d,\s]*)/i;
    const altWording = /Term\s+(must\s+not\s+be|cannot\s+be)\s+greater\s+than/i;

    const termHost = root.locator("number").filter({ hasText: /Term/i }).first();
    const wrapper = termHost
      .locator(
        "xpath=ancestor::div[contains(@class,'col-') or contains(@class,'p-field') or contains(@class,'grid')][1]",
      )
      .first();

    const underTerm = wrapper.getByText(cannotGreaterThan).first();
    if (await underTerm.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(underTerm).toBeVisible({ timeout: 25_000 });
      return;
    }
    const underTermAlt = wrapper.getByText(altWording).first();
    if (await underTermAlt.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await expect(underTermAlt).toBeVisible({ timeout: 25_000 });
      return;
    }

    await expect(
      root
        .getByText(cannotGreaterThan)
        .or(root.getByText(altWording))
        .first(),
    ).toBeVisible({ timeout: 25_000 });
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
    await expect(this.balloonFixedCheckbox).toBeVisible({ timeout: 12_000 });
    await expect(this.balloonFixedCheckbox).not.toBeChecked();
  }

  async enterBalloonAmount(amount: string): Promise<void> {
    this.logStep(`Entered balloon amount as ${this.stepValueDisplay(amount)}`);
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    await expect(this.balloonAmountInput).toBeVisible({ timeout: 20_000 });
    await this.balloonAmountInput.scrollIntoViewIfNeeded();
    /** Same PrimeNG `<amount>` / `#amount` pattern as {@link fillLoanDetailsCurrencyAmount} — raw `fill` often leaves $0.00. */
    await this.fillLoanDetailsCurrencyAmount(this.balloonAmountInput, amount);
    await this.waitUntilNoVisibleAppLoaderOverlays(8_000);

    const balloonAmountNumeric = async (): Promise<number> => {
      const raw = (await this.balloonAmountInput.inputValue()).trim();
      const n = parseFloat(raw.replace(/[^0-9.-]/g, ""));
      return Number.isNaN(n) ? 0 : n;
    };

    if ((await balloonAmountNumeric()) < 1) {
      const stripped = amount.replace(/[$\s,]/g, "");
      const parsed = parseFloat(stripped);
      if (!Number.isNaN(parsed) && parsed >= 1) {
        const withCents = `$${parsed.toFixed(2)}`;
        await this.fillLoanDetailsCurrencyAmount(this.balloonAmountInput, withCents);
        await this.waitUntilNoVisibleAppLoaderOverlays(8_000);
      }
    }

    await expect
      .poll(async () => balloonAmountNumeric(), { timeout: 12_000 })
      .toBeGreaterThanOrEqual(1);
  }

  async expectBalloonPercentInputMatches(rx: RegExp): Promise<void> {
    this.logStep("Expect Balloon Percent Input Matches");
    await expect(this.balloonPercentInput).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => (await this.balloonPercentInput.inputValue()).replace(/%/g, "").trim(), {
        timeout: 12_000,
      })
      .toMatch(rx);
  }

  async enterBalloonPercent(percentDigits: string): Promise<void> {
    this.logStep(`Entered balloon % as ${this.stepValueDisplay(percentDigits)}`);
    await expect(this.balloonPercentInput).toBeVisible({ timeout: 15_000 });
    await this.balloonPercentInput.scrollIntoViewIfNeeded();
    await this.balloonPercentInput.click({ force: true });
    await this.balloonPercentInput.press("ControlOrMeta+a");
    await this.balloonPercentInput.fill(percentDigits.replace(/%/g, "").trim(), { force: true });
    await this.balloonPercentInput.press("Tab").catch(() => {});
  }

  /**
   * Asserts the Balloon **$** masked input matches `rx`.
   * When **Fixed** is unchecked and the value was set via **%** only, the $ control may stay empty
   * until **Calculate** — use {@link expectBalloonPercentInputMatches} for that phase instead.
   */
  async expectBalloonAmountInputMatches(rx: RegExp): Promise<void> {
    this.logStep("Expect Balloon Amount Input Matches");
    await expect
      .poll(async () => (await this.balloonAmountInput.inputValue()).trim(), { timeout: 12_000 })
      .toMatch(rx);
  }

  async checkBalloonFixedCheckbox(): Promise<void> {
    this.logStep("Check Balloon Fixed Checkbox");
    await expect(this.balloonFixedCheckbox).toBeVisible({ timeout: 12_000 });
    await this.balloonFixedCheckbox.scrollIntoViewIfNeeded();
    await this.balloonFixedCheckbox.click({ force: true }).catch(() => {});
    await this.balloonFixedCheckbox.check({ force: true });
    await expect(this.balloonFixedCheckbox).toBeChecked({ timeout: 8_000 });
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
  async selectConditionInStandardQuote(condition: string): Promise<void> {
    this.logStep(`Selected condition (standard quote): ${this.stepValueDisplay(condition)}`);

    const root = this.page
      .locator("app-quote-details, app-standard-quote")
      .filter({ hasText: /Asset Type/i })
      .last();
    await root.waitFor({ state: "visible", timeout: 45_000 });

    const optionWhenOpen = this.page
      .getByRole("listbox", { name: /Option List/i })
      .getByRole("option", { name: condition, exact: true })
      .first();
    if (await optionWhenOpen.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await optionWhenOpen.click({ timeout: 15_000 });
      await this.page.keyboard.press("Escape").catch(() => {});
      return;
    }

    await this.page.keyboard.press("Escape").catch(() => {});
    await this.page.waitForTimeout(200);

    const caption = root
      .getByText("Condition *", { exact: true })
      .or(root.getByText(/^Condition\s*\*?\s*$/i))
      .first();
    await caption.waitFor({ state: "visible", timeout: 20_000 });
    await caption.scrollIntoViewIfNeeded();

    const dropdownAfterCaption = caption
      .locator("xpath=following::div[contains(@class,'p-dropdown')][1]")
      .first();
    const trigger = dropdownAfterCaption
      .locator(".p-dropdown-trigger")
      .or(dropdownAfterCaption.getByRole("button", { name: /dropdown trigger/i }))
      .first();

    await expect(trigger).toBeAttached({ timeout: 20_000 });
    try {
      await trigger.click({ timeout: 12_000 });
    } catch {
      await trigger.click({ force: true, timeout: 12_000 });
    }

    await this.page.getByRole("option", { name: condition, exact: true }).first().click({ timeout: 15_000 });
    await this.page.keyboard.press("Escape").catch(() => {});
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

    const dlg = this.page.getByRole("dialog").last();
    await expect(dlg.getByText(/Make/i).first()).toBeVisible({ timeout: 20_000 });

    const pickFromOpenPanel = async (name: string, exact: boolean) => {
      const opt = this.page.getByRole("option", { name, exact }).first();
      await opt.waitFor({ state: "visible", timeout: 20_000 });
      await opt.click();
      await this.page.keyboard.press("Escape").catch(() => {});
      await this.page.waitForTimeout(250);
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
   * **Payment Schedule** card: heading, table with Date / Number / Frequency / Payment, and at least one row
   * with a currency amount (after **Calculate**).
   */
  async expectPaymentScheduleSectionWithTableData(): Promise<void> {
    this.logStep("Expect Payment Schedule Section With Table Data");
    const root = this.standardQuoteRoot();
    await expect(root.getByText(/Payment\s+Schedule/i).first()).toBeVisible({
      timeout: 45_000,
    });

    const dateHdr = root
      .getByRole("columnheader", { name: /^Date$/i })
      .or(root.locator("th").filter({ hasText: /^Date$/i }))
      .first();
    const freqHdr = root
      .getByRole("columnheader", { name: /^Frequency$/i })
      .or(root.locator("th").filter({ hasText: /^Frequency$/i }))
      .first();
    const payHdr = root
      .getByRole("columnheader", { name: /^Payment$/i })
      .or(root.locator("th").filter({ hasText: /^Payment$/i }))
      .first();
    const numHdr = root
      .getByRole("columnheader", { name: /^Number$/i })
      .or(root.locator("th").filter({ hasText: /^Number$/i }))
      .first();

    await expect(dateHdr.or(root.getByText(/^Date$/).first())).toBeVisible({
      timeout: 15_000,
    });
    await expect(numHdr.or(root.getByText(/^Number$/).first())).toBeVisible({
      timeout: 10_000,
    });
    await expect(freqHdr.or(root.getByText(/^Frequency$/).first())).toBeVisible({
      timeout: 10_000,
    });
    await expect(payHdr.or(root.getByText(/^Payment$/).first())).toBeVisible({
      timeout: 10_000,
    });

    const dataRow = root
      .locator("tr")
      .filter({ hasText: /\$\s*[\d,]+\.\d{2}/ })
      .filter({ hasText: /Monthly|Weekly|Fortnightly/i })
      .first();
    await expect(dataRow).toBeVisible({ timeout: 25_000 });
  }

  /**
   * Card / panel that wraps **Payment Schedule** (for header icon toggles).
   */
  private paymentScheduleCard(): Locator {
    const root = this.standardQuoteRoot();
    const title = root.getByText(/Payment\s+Schedule/i).first();
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
    const title = root.getByText(/Payment\s+Schedule/i).first();
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
    const root = this.standardQuoteRoot();
    const scheduleScope = this.paymentScheduleContentScope();

    const paymentRow = root
      .locator("tr")
      .filter({ hasText: /\$\s*[\d,]+\.\d{2}/ })
      .filter({ hasText: /Monthly|Weekly|Fortnightly/i })
      .first();

    const assertMoneyRowVisible = async (): Promise<void> => {
      await expect(paymentRow).toBeVisible({ timeout: 15_000 });
    };

    await assertMoneyRowVisible();

    const selectGroup = scheduleScope
      .locator("p-selectbutton, p-selectButton, p-togglebutton, .p-selectbutton")
      .first();
    if (await selectGroup.isVisible({ timeout: 10_000 }).catch(() => false)) {
      const btns = selectGroup.locator("button, .p-button, [role='button']");
      const n = await btns.count();
      if (n >= 2) {
        await expect(btns.last()).toBeVisible({ timeout: 10_000 });
        await btns.last().scrollIntoViewIfNeeded();
        await btns.last().click({ force: true, timeout: 10_000 });
        await this.page.waitForTimeout(400);
        await assertMoneyRowVisible();
        await btns.first().scrollIntoViewIfNeeded();
        await btns.first().click({ force: true, timeout: 10_000 });
        await this.page.waitForTimeout(400);
        await assertMoneyRowVisible();
        return;
      }
    }

    const card = root.locator("p-card").filter({ hasText: /Payment\s+Schedule/i }).first();
    const toggleScope = (await card.isVisible({ timeout: 5_000 }).catch(() => false))
      ? card
      : scheduleScope;

    const rightViewBtn = toggleScope
      .locator("button:has(i.pi.pi-bars)")
      .first()
      .or(toggleScope.locator("a:has(i.pi.pi-bars)").first())
      .or(toggleScope.locator("button:has(i.pi.pi-table)").first())
      .or(toggleScope.locator("button:has(i.pi.pi-th-large)").first())
      .or(toggleScope.locator("button:has(i.pi.pi-list)").first())
      .or(
        toggleScope
          .locator("i.pi.pi-bars, i.pi.pi-table, i.pi.pi-th-large")
          .first()
          .locator("xpath=ancestor::button[1] | ancestor::a[1]"),
      );

    await expect(rightViewBtn).toBeVisible({ timeout: 15_000 });
    await rightViewBtn.scrollIntoViewIfNeeded();
    await rightViewBtn.click({ force: true, timeout: 10_000 });
    await this.page.waitForTimeout(400);
    await assertMoneyRowVisible();

    const group = rightViewBtn
      .locator(
        "xpath=ancestor::p-selectButton[1] | ancestor::p-selectbutton[1] | ancestor::div[contains(@class,'p-button-group')][1] | ancestor::div[contains(@class,'p-buttonset')][1] | ancestor::div[contains(@class,'p-selectbutton')][1]",
      )
      .first();

    if (await group.isVisible({ timeout: 2_500 }).catch(() => false)) {
      const groupBtns = group.getByRole("button");
      const c = await groupBtns.count();
      for (let i = 0; i < c; i++) {
        const b = groupBtns.nth(i);
        if (!(await b.isVisible({ timeout: 800 }).catch(() => false))) {
          continue;
        }
        const hasBarsOrListIcon =
          (await b.locator("i.pi.pi-bars, i.pi.pi-list").count()) > 0;
        if (hasBarsOrListIcon) {
          continue;
        }
        await b.scrollIntoViewIfNeeded();
        await b.click({ force: true, timeout: 8_000 });
        await this.page.waitForTimeout(400);
        await assertMoneyRowVisible();
        break;
      }
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

  private async paymentScheduleHost(): Promise<Locator> {
    const root = this.standardQuoteRoot();
    const scheduleCard = root.locator("p-card").filter({ hasText: /Payment\s+Schedule/i }).first();
    if (await scheduleCard.isVisible({ timeout: 10_000 }).catch(() => false)) {
      return scheduleCard;
    }
    return root
      .locator("div")
      .filter({ has: root.getByText(/Payment\s+Schedule/i).first() })
      .filter({ has: root.locator("table tbody tr") })
      .first();
  }

  /** Opens **Edit Payment Schedule** from the pencil / edit control on the schedule card. */
  async openEditPaymentScheduleDialog(): Promise<void> {
    this.logStep("Open Edit Payment Schedule Dialog");
    const root = this.standardQuoteRoot();
    const scheduleHost = await this.paymentScheduleHost();
    const editIcon = root
      .getByRole("button", { name: /Edit\s+Payment\s+Schedule/i })
      .or(root.getByRole("link", { name: /Edit\s+Payment\s+Schedule/i }))
      .or(
        scheduleHost
          .locator("button:not(.brand-edit-btn), a:not(.brand-edit-btn), [role='button']:not(.brand-edit-btn)")
          .filter({
            has: scheduleHost.locator("i.pi-pencil, i.pi-pen-to-square, .fa-pen-to-square"),
          }),
      )
      .first();
    await expect(editIcon).toBeEnabled({ timeout: 20_000 });
    await editIcon.click({ timeout: 20_000 });
    await expect(this.editPaymentScheduleDialog()).toBeVisible({ timeout: 20_000 });
  }

  /** First segment row inside **Edit Payment Schedule** table. */
  private editPaymentScheduleSegmentRow(): Locator {
    return this.editPaymentScheduleDialog().locator("table tbody tr").first();
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
    this.logStep(`Select Edit Payment Schedule Segment Type ${typeLabel}`);
    const row = this.editPaymentScheduleSegmentRow();
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

  /** **Calculate** inside **Edit Payment Schedule** (FIS fetch for segment amounts). */
  async clickEditPaymentScheduleCalculate(): Promise<void> {
    this.logStep("Click Edit Payment Schedule Calculate");
    const calcBtn = this.editPaymentScheduleCalculateButton();
    await expect(calcBtn).toBeVisible({ timeout: 10_000 });
    await expect(calcBtn).toBeEnabled({ timeout: 10_000 });
    await calcBtn.click({ timeout: 10_000 });
    await this.waitForLoadingComplete();
    // Apply enables only after FIS calculation completes — wait for UI state, not spinner alone.
    await expect(this.editPaymentScheduleApplyButton()).toBeEnabled({ timeout: 60_000 });
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
    const row = this.editPaymentScheduleDialog().locator("table tbody tr").nth(rowIndex);
    const numberInput = row.getByRole("spinbutton").first();
    await expect(numberInput).toBeVisible({ timeout: 10_000 });
    await numberInput.fill(number);
    await numberInput.press("Tab").catch(() => {});
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

  /** User returns to **Standard Quote** after **Apply** (edit dialog closed). */
  async expectEditPaymentScheduleDialogClosedOnStandardQuote(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Dialog Closed On Standard Quote");
    await expect(this.editPaymentScheduleDialog()).toBeHidden({ timeout: 20_000 });
    await expect(this.standardQuoteRoot()).toBeVisible({ timeout: 15_000 });
    await this.expectPaymentScheduleSectionWithTableData();
  }

  private editPaymentScheduleCancelButton(): Locator {
    const dialog = this.editPaymentScheduleDialog();
    return dialog
      .getByRole("button", { name: /^CANCEL$/i })
      .or(dialog.locator("p-button").filter({ hasText: /^Cancel$/i }).locator("button"))
      .first();
  }

  private editPaymentScheduleCancelConfirmDialog(): Locator {
    return this.page
      .locator("p-confirmdialog, .p-confirm-dialog, [role='alertdialog']")
      .filter({ visible: true })
      .filter({ hasText: /unsaved changes|lost|cancel/i })
      .first();
  }

  /**
   * Edit segment fields only (no **Calculate**) — leaves unsaved changes for **Cancel** flow.
   */
  async modifyEditPaymentScheduleSegmentFields(opts?: {
    type?: string;
    number?: string;
  }): Promise<void> {
    this.logStep("Modify Edit Payment Schedule Segment Fields");
    if (opts?.number) {
      await this.enterEditPaymentScheduleSegmentNumber(opts.number);
    }
    if (opts?.type) {
      await this.selectEditPaymentScheduleSegmentType(opts.type);
    }
  }

  /** **CANCEL** on **Edit Payment Schedule** — prompts unsaved-changes confirmation. */
  async clickEditPaymentScheduleCancel(): Promise<void> {
    this.logStep("Click Edit Payment Schedule Cancel");
    const cancelBtn = this.editPaymentScheduleCancelButton();
    await expect(cancelBtn).toBeVisible({ timeout: 10_000 });
    await cancelBtn.click({ timeout: 10_000 });
  }

  /** Unsaved-changes confirmation after **Cancel**. */
  async expectEditPaymentScheduleCancelConfirmationVisible(): Promise<void> {
    this.logStep("Expect Edit Payment Schedule Cancel Confirmation Visible");
    const confirmDlg = this.editPaymentScheduleCancelConfirmDialog();
    await expect(confirmDlg).toBeVisible({ timeout: 15_000 });
    await expect(confirmDlg).toContainText(/Any unsaved changes will be lost/i);
    await expect(confirmDlg).toContainText(/cancel/i);
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
      .getByRole("button", { name: /\+\s*Add Segment|Add Segment/i })
      .first();
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
      }
    }

    let guard = 0;
    while (guard++ < 20) {
      const total = await this.getEditPaymentScheduleNumberOfPayments();
      if (total >= term) break;
      if (!(await addBtn.isEnabled().catch(() => false))) break;

      await addBtn.click({ timeout: 10_000 });
      const rowIndex = (await rows().count()) - 1;
      const remaining = term - total;
      await this.enterEditPaymentScheduleSegmentNumberOnRow(rowIndex, String(remaining));
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
    await expect(this.editPaymentScheduleAddSegmentButton()).toBeDisabled({ timeout: 15_000 });
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
    await this.fillLoanDetailsCurrencyAmount(this.cashPriceOfAssetInputField, cashprice);
  }
  async ppsrCount(count: string): Promise<void> {
    this.logStep(`Entered PPSR count as ${this.stepValueDisplay(count)}`);
    await this.PPSRCount.fill(count);
  }

  /** PrimeNG `<amount>` / `#amount` currency: select-all behaviour via triple-click, then fill + blur. */
  private async fillLoanDetailsCurrencyAmount(input: Locator, value: string): Promise<void> {
    await input.waitFor({ state: "visible", timeout: 20_000 });
    await input.scrollIntoViewIfNeeded();
    await input.click({ clickCount: 3 });
    await input.fill(value);
    await input.press("Tab").catch(() => {});
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
    await this.page.waitForTimeout(200);
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

  async clickCalculateButton(): Promise<void> {
    this.logStep("Click Calculate Button");
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
      .waitFor({ state: "visible", timeout: 30_000 })
      .catch(() => {});
    await btn.waitFor({ state: "visible", timeout: 30_000 });
    for (let i = 0; i < 90; i++) {
      if (await btn.isEnabled().catch(() => false)) break;
      await this.page.waitForTimeout(400);
    }
    await btn.scrollIntoViewIfNeeded();
    try {
      await btn.click({ timeout: 25_000 });
    } catch {
      await btn.click({ force: true, timeout: 25_000 });
    }

    await this.waitUntilNoVisibleAppLoaderOverlays(90_000);
    await this.page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(
      () => {},
    );
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page.waitForTimeout(1_500);
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

  async waitForAddBorrowerButton(): Promise<void> {
    this.logStep("Wait For Add Borrower Button");
    await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
    await this.standardQuoteRoot()
      .getByText(/Customer\s+Details/i)
      .first()
      .waitFor({ state: "visible", timeout: 90_000 })
      .catch(() => {});
    await expect
      .poll(
        async () => {
          const btn = await this.addBorrowerorGuarantorButton.isVisible().catch(() => false);
          const personal = await this.page.locator("app-personal-details").isVisible().catch(() => false);
          return btn || personal;
        },
        { timeout: 120_000 },
      )
      .toBe(true);
    if (await this.addBorrowerorGuarantorButton.isVisible().catch(() => false)) {
      await this.addBorrowerorGuarantorButton.scrollIntoViewIfNeeded();
    }
  }

  async clickAddBorrowerorGuarantorButton(): Promise<void> {
    this.logStep("Click Add Borroweror Guarantor Button");
    await this.addBorrowerorGuarantorButton.click();
    await this.customerSearchDialog.waitFor({
      state: "visible",
      timeout: 60000,
    });
  }
  async searchByDropdownClick(): Promise<void> {
    this.logStep("Search By Dropdown Click");
    await this.customerSearchDialog.waitFor({
      state: "visible",
      timeout: 60000,
    });
    await this.searchByDropdown.waitFor({ state: "visible", timeout: 30000 });
    await this.searchByDropdown.click();
  }
  async selectUDCSelectOption(): Promise<void> {
    this.logStep("Select UDC option");
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
    this.logStep(`Entered UDC customer number as ${this.stepValueDisplay(customerNumber)}`);
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
    this.logStep("Click Search Button");
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
    this.logStep("Click Add New Customer Button");
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
    const root = this.standardQuoteRoot();
    return root
      .getByRole("textbox", { name: /Assured Future Value/i })
      .or(
        root
          .locator("label")
          .filter({ hasText: /Assured Future Value/i })
          .first()
          .locator("xpath=following::input[@currencymask or @id='amount'][1]"),
      )
      .first();
  }

  programDropdownHost(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .locator("p-dropdown")
      .filter({ has: root.locator("label").filter({ hasText: /^Program/i }) })
      .first();
  }

  async readSelectedProgramLabel(): Promise<string> {
    const host = this.programDropdownHost();
    const combobox = host.getByRole("combobox").first();
    if (await combobox.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return (await combobox.textContent())?.trim() ?? "";
    }
    return (await host.locator(".p-dropdown-label").first().textContent())?.trim() ?? "";
  }

  async expectProgramDropdownDisabled(): Promise<void> {
    this.logStep("Expect Program Dropdown Disabled");
    const host = this.programDropdownHost();
    const cls = (await host.getAttribute("class")) ?? "";
    const disabled =
      cls.includes("p-disabled") || (await host.getAttribute("ng-reflect-disabled")) === "true";
    if (disabled) {
      await expect.soft(host).toHaveClass(/p-disabled/);
      return;
    }
    const trigger = host.getByRole("button", { name: /dropdown trigger/i }).first();
    await expect.soft(trigger).toBeDisabled({ timeout: 15_000 });
  }

  async expandAfVDetailsSection(): Promise<void> {
    this.logStep("Expand AFV Details section");
    const root = this.standardQuoteRoot();
    const accordionHeader = root
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
    const header = root.getByText(/AFV Details/i).first();
    if (await header.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await header.click({ timeout: 10_000 });
    }
  }

  async readAssuredFutureValue(): Promise<string> {
    return (await this.assuredFutureValueInputField().inputValue().catch(() => "")).trim();
  }

  async assuredFutureValueIsReadOnly(): Promise<boolean> {
    const input = this.assuredFutureValueInputField();
    if ((await input.count()) === 0 || !(await input.isVisible().catch(() => false))) {
      return true;
    }
    const ro = await input.getAttribute("readonly");
    const aria = await input.getAttribute("aria-readonly");
    if (ro !== null || aria === "true") {
      return true;
    }
    return (await input.isEditable().catch(() => null)) === false;
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
    await this.waitForLoadingComplete();
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
    return (await this.loanDate.inputValue().catch(() => "")).trim();
  }

  async expectFirstPaymentBeforeLoanDateValidation(): Promise<void> {
    this.logStep("Expect First Payment Before Loan Date Validation");
    await expect
      .soft(
        this.page
          .getByText(/First Payment Date must not be before the Loan Date/i)
          .first(),
      )
      .toBeVisible({ timeout: 25_000 });
  }

  async expectFirstPaymentExceedsSixWeeksValidation(): Promise<void> {
    this.logStep("Expect First Payment Exceeds Six Weeks Validation");
    await expect
      .soft(
        this.page
          .getByText(/First payment must be within 6 weeks and in line with the customer/i)
          .first(),
      )
      .toBeVisible({ timeout: 25_000 });
  }

  async expectAfVOptionsSectionVisible(): Promise<void> {
    this.logStep("Expect AFV Options Section Visible");
    const root = this.standardQuoteRoot();
    const panel = root
      .locator("p-card, div, section")
      .filter({ hasText: /Assured Future Value Options/i })
      .filter({ visible: true })
      .first();
    await expect.soft(panel).toBeVisible({ timeout: 45_000 });
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
    await expect
      .soft(
        dialog
          .getByText(/sum of the segment.*Number.*must not exceed the loan term/i)
          .first(),
      )
      .toBeVisible({ timeout: 25_000 });
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

  async expectAfVRowInPaymentSchedule(): Promise<void> {
    this.logStep("Expect AFV Row In Payment Schedule");
    const root = this.standardQuoteRoot();
    const afvRow = root
      .locator("tr")
      .filter({ hasText: /AFV|Assured Future Value/i })
      .first();
    await expect.soft(afvRow).toBeVisible({ timeout: 30_000 });
  }

  async openSettlementDialog(): Promise<void> {
    this.logStep("Open Settlement Dialog");
    const root = this.standardQuoteRoot();
    const btn = root
      .getByRole("button", { name: /^Settlement$/i })
      .or(root.getByRole("link", { name: /^Settlement$/i }))
      .first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click({ timeout: 15_000 });
    await this.page.getByRole("dialog").last().waitFor({ state: "visible", timeout: 30_000 });
  }

  async openAddonsAccessoriesFromQuote(): Promise<void> {
    this.logStep("Open Addons Accessories From Quote");
    const root = this.standardQuoteRoot();
    const link = root
      .getByRole("link", { name: /Addons?\s*&\s*Accessories/i })
      .or(root.getByRole("button", { name: /Addons?\s*&\s*Accessories/i }))
      .or(root.locator("a, button").filter({ hasText: /Addons?\s*&\s*Accessories/i }))
      .first();
    await link.scrollIntoViewIfNeeded();
    await link.click({ timeout: 15_000 });
    await this.page.locator("app-service-plan, app-accessories").first().waitFor({
      state: "visible",
      timeout: 45_000,
    });
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
}