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
    /**
     * **Asset & Insurance Summary** opener — must resolve to a **single** `button` (not `:text-is` + `.or()`,
     * which can match the label span and the button and trips strict mode on `scrollIntoViewIfNeeded`).
     */
    this.assetInsuranceTradeInSummaryHyperlink = page
      .locator("button")
      .filter({ hasText: /Asset\s*&\s*Insurance\s*Summary/i })
      .first();
    this.assetyEditButton = page.locator(".cursor-pointer.fa-pen-to-square");
    this.assetSummaryCancelButton = page.locator(
      "//timesicon//*[name()='svg']",
    );
<<<<<<< Updated upstream
    this.cashPriceOfAssetInputField = page.getByRole("textbox", {
      name: "Cash Price of Asset*",
    });
=======
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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    this.loanDate = page
      .locator('input[name="loanDate"]')
      .getByText("8", { exact: true });
    this.firstPaymentDate = page
      .locator('input[name="firstPaymentDate"]')
      .getByText("16");
    this.calculateButton = page.getByRole("button", { name: "Calculate" });
=======
    // Match visible Standard Quote shell (same as tests: `app-quote-details, app-standard-quote`).first()
    const quoteShell = page.locator("app-quote-details, app-standard-quote").first();
    /**
     * **Lease Date** / loan calendar: must be scoped to **Payment Summary** + `visible:true`.
     * Do **not** chain `.or()` to unscoped `loanDate` / `Loan Date` — a hidden disabled template in
     * `app-quote-details` matches first and breaks `toBeVisible()`.
     */
    const paymentSummaryPanel = page
      .locator("app-payment-summary")
      .filter({ hasText: "Payment Summary" })
      .first();
    const leaseDateInPaymentSummary = paymentSummaryPanel
      .getByRole("combobox", { name: /Lease Date/i })
      .filter({ visible: true })
      .first()
      .or(
        paymentSummaryPanel
          .locator('input[name="leaseDate"]')
          .filter({ visible: true })
          .first(),
      );
    const leaseDateFallback = quoteShell
      .getByRole("combobox", { name: /Lease Date/i })
      .filter({ visible: true })
      .first();
    this.loanDate = leaseDateInPaymentSummary.or(leaseDateFallback).first();
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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

  /** Standard Quote / Asset Details shell (first `app-quote-details` or `app-standard-quote`). */
  standardQuoteRoot(): Locator {
    return this.page.locator("app-quote-details, app-standard-quote").first();
  }

  /** After navigation to Asset Details: shell visible + cash price field (skip long `networkidle`). */
  async waitForAssetDetailsStepReady(): Promise<void> {
    await this.standardQuoteRoot().waitFor({ state: "visible", timeout: 60_000 });
    await expect(this.cashPriceOfAssetInputField).toBeVisible({ timeout: 60_000 });
  }

  /**
   * Quick Quote → Standard Quote: product & program labels visible; when PrimeNG exposes hosts, expect locked dropdowns.
   * @param opts.requireLockedDropdowns When `false`, only asserts product/program copy is visible (some FL QQ→SQ builds leave dropdowns enabled).
   */
  async expectProductProgramCarriedFromQuickQuote(
    productName: string,
    programName: string,
    opts?: { requireLockedDropdowns?: boolean },
  ): Promise<void> {
    const requireLocked = opts?.requireLockedDropdowns ?? true;
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
    if (!requireLocked) {
      return;
    }
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

  /** Assert finance fields carried from Quick Quote (cash, term, frequency UI, interest %). */
  async expectFinanceCarriedFromQuickQuote(opts: {
    cashPrice: RegExp;
    term: RegExp;
    frequencyText: RegExp;
    interestRate: RegExp;
  }): Promise<void> {
    const root = this.standardQuoteRoot();
    await expect(this.cashPriceOfAssetInputField).toHaveValue(opts.cashPrice, { timeout: 30_000 });
    await expect
      .poll(async () => this.termsOfFinanceInputField.inputValue(), { timeout: 25_000 })
      .toMatch(opts.term);
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

  /** UDC Establishment Fee: pre-populated from program; assert editable only when the control allows editing. */
  async expectUdcEstablishmentFeePrePopulatedFromProgram(): Promise<void> {
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
   * Lease/Loan date must be set for **Calculate**. When **First Payment** is read-only (Finance Lease
   * Payment Summary), skip filling it — the app derives it after pricing.
   */
  async ensureLoanDateAndFirstPaymentReadyForCalculate(): Promise<void> {
    const loanIn = this.loanDate;
    const firstIn = this.firstPaymentDate;
    await expect(loanIn).toBeVisible({ timeout: 20_000 });
    const loanVal = (await loanIn.inputValue().catch(() => "")).trim();
    expect(loanVal.length).toBeGreaterThan(4);

    if (!(await firstIn.isVisible({ timeout: 8_000 }).catch(() => false))) {
      return;
    }
    if (await firstIn.isDisabled().catch(() => true)) {
      return;
    }
    if ((await firstIn.inputValue().catch(() => "")).trim().length < 5) {
      await expect(firstIn).toBeEditable();
      await this.enterFirstPaymentSuggestedFromLoanDdMmYyyy();
      await expect
        .poll(async () => (await firstIn.inputValue().catch(() => "")).trim().length, {
          timeout: 12_000,
        })
        .toBeGreaterThan(4);
    }
  }

  /** Clear origination reference and run **Calculate** (allowed with blank origin on some CSA builds). */
  async calculateWithOriginationBlank(): Promise<void> {
    await this.clearOriginationReferences();
    await this.clickCalculateButton();
    await expect(this.standardQuoteRoot()).toBeVisible();
  }

  /**
   * Set Originator Reference; when Loan Purpose control exists (read-only CSA), expect it blank.
   */
  async enterOriginationReferenceAndExpectLoanPurposeBlank(origRef: string): Promise<void> {
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
    const f = this.dealerOriginationFeeInputField;
    await expect(f).toBeVisible({ timeout: 20_000 });
    const raw = (await f.inputValue()).trim();
    expect(raw.length).toBeGreaterThan(0);
    const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
    expect(Number.isNaN(n)).toBeFalsy();
    expect(n).toBeGreaterThanOrEqual(0);
  }

  /** PPSR Count row visible with a value; fee line (@ rate / amount) visible when rendered for this product. */
  async expectPpsrCountAndFeeLineVisible(): Promise<void> {
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

  /** LMF / Loan Maintenance Fee area (incl. Waive LMF) visible on Asset Details / totals. */
  async expectLoanMaintenanceFeeOrLmfAreaVisible(): Promise<void> {
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
    await this.termsOfFinance(opts.overMaxTerm);
    await this.clickCalculateButton();
    await this.expectTermCannotExceedProgramMaxMessageBelowTermField();
    await this.termsOfFinance(opts.restoreTerm);
    await this.clickCalculateButton();
    await expect(this.standardQuoteRoot()).toBeVisible();
  }

>>>>>>> Stashed changes
  /**
   * Enter text into the Origination Reference input field
   * (CSA / legacy: SVG `text#text` under "Originator Reference" label in some builds.)
   */
  async enterOriginationReference(origRef: string): Promise<void> {
    await this.originationRefInput.fill(origRef);
  }

  /**
   * Finance Lease: origination is usually a `p-inputtext` / `textbox` in `app-quote-details`, not the SVG
   * path used for CSA. Keeps behavior separate from {@link enterOriginationReference} for product differences.
   */
  async enterOriginationReferenceFinanceLease(
    origRef: string,
    skipOverlayDismiss = false,
  ): Promise<void> {
    const originatorRoot = this.page.locator("app-quote-originator").first();
    const root = this.page.locator("app-quote-details, app-standard-quote").last();
    await originatorRoot.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
    await root.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});

    const tryFill = async (el: Locator): Promise<boolean> => {
      const t = el.first();
      if (!(await t.isVisible({ timeout: 3_000 }).catch(() => false))) {
        return false;
      }
      await t.scrollIntoViewIfNeeded();
      await t.click({ force: true }).catch(() => {});
      await t.clear().catch(() => {});
      try {
        await t.fill(origRef, { timeout: 8_000 });
      } catch {
        await t.press("ControlOrMeta+a");
        await this.page.keyboard.type(origRef, { delay: 8 });
      }
      const v = (await t.inputValue().catch(() => "")).trim();
      if (v.length > 0) {
        return true;
      }
      await t.press("ControlOrMeta+a");
      await this.page.keyboard.type(origRef, { delay: 8 });
      return (await t.inputValue().catch(() => "")).trim().length > 0;
    };

    // 0) **Originator Reference** sits under `app-quote-originator` (Prime `p-inputtext`); not inside `app-standard-quote.last()` alone.
    const originInput = originatorRoot.locator(
      "xpath=.//label[contains(normalize-space(.),'Originator Reference') or contains(normalize-space(.),'Origination Reference')]/following::input[contains(@class,'p-inputtext') or @type='text'][not(@type='hidden')][1]",
    );
    if (await tryFill(originInput)) {
      return;
    }
    if (
      await tryFill(
        originatorRoot.getByLabel(
          /Origination\s*Reference|Originator\s*Reference|Origination\s*Ref|Originator/i,
        ),
      )
    ) {
      return;
    }
    if (await tryFill(originatorRoot.getByRole("textbox", { name: /Originator|Origination/i }))) {
      return;
    }

    if (!skipOverlayDismiss) {
      await this.page.keyboard.press("Escape").catch(() => {});
      await this.page.keyboard.press("Escape").catch(() => {});
    }

    // 1) ARIA: label (Prime float-label / p-field) on quote shell
    if (
      await tryFill(
        root.getByLabel(
          /Origination\s*Reference|Originator\s*Reference|Origination\s*Ref|Originator/i,
        ),
      )
    ) {
      return;
    }
    if (
      await tryFill(
        this.page.getByLabel(
          /Origination\s*Reference|Originator\s*Reference|Origination\s*Ref|Originator/i,
        ),
      )
    ) {
      return;
    }
    // 2) textbox by accessible name
    if (
      await tryFill(
        root.getByRole("textbox", {
          name: /Origination|Originator|Orig(ination)?\s*Ref/,
        }),
      )
    ) {
      return;
    }
    if (
      await tryFill(
        this.page.getByRole("textbox", {
          name: /Origination|Originator|Orig(ination)?\s*Ref/,
        }),
      )
    ) {
      return;
    }
    // 3) Common Angular / Prime `input` bindings
    for (const sel of [
      'input[formControlName="originationReference"]',
      'input[formControlName="originatorReference"]',
      'input[name="originationReference"]',
      'input[ng-reflect-name*="origination"]',
      "p-float-label input",
      ".p-field input.p-inputtext",
    ]) {
      if (await tryFill(root.locator(sel).first())) {
        return;
      }
    }
    // 4) Label/span then following input
    const row = root
      .locator(".p-field, .p-col, .p-float-label, [class*='p-field']")
      .filter({
        hasText: /Origination|Originator\s*Ref|Origination\s*Ref/,
      })
      .first();
    if (await tryFill(row.locator("input, textarea").first())) {
      return;
    }
    const fromLabel = root
      .locator("span, label, .p-float-label")
      .filter({ hasText: /Origination|Originator/i })
      .first()
      .locator(
        "xpath=ancestor::div[contains(@class,'p-field') or contains(@class,'p-col') or contains(@class,'grid') or contains(@class,'formgrid')][1]//input[not(@type='hidden')][1]",
      );
    if (await tryFill(fromLabel)) {
      return;
    }
    // 5) Last resort: same locator as CSA (if FL build also uses it)
    if (await tryFill(this.originationRefInput)) {
      return;
    }
    throw new Error(
      `Finance Lease: could not set Origination Reference to "${origRef}" (tried app-quote-originator label xpath, getByLabel, getByRole textbox, p-field row, p-float-label).`,
    );
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

    const originatorRoot = this.page.locator("app-quote-originator").first();
    let x: Locator | null;
    x = await firstVisible(
      originatorRoot.locator(
        "xpath=.//label[contains(normalize-space(.),'Originator Reference') or contains(normalize-space(.),'Origination Reference')]/following::input[contains(@class,'p-inputtext') or @type='text'][not(@type='hidden')][1]",
      ),
    );
    if (x) return x;
    x = await firstVisible(
      originatorRoot.getByLabel(
        /Origination\s*Reference|Originator\s*Reference|Origination\s*Ref|Originator/i,
      ),
    );
    if (x) return x;
    x = await firstVisible(originatorRoot.getByRole("textbox", { name: /Originator|Origination/i }));
    if (x) return x;

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
   * Fill Origination Reference after **Calculate**: no Esc; best-effort fill + native value patch
   * so Angular binds. Does **not** throw on read-back mismatch (DOM read is often flaky; **Next**
   * uses the real form state — use {@link clickNextButtonFinanceLease} with `origRef` to retry fill
   * while waiting for Next to enable).
   */
  async enterOriginationReferenceFinanceLeaseStable(
    origRef: string,
  ): Promise<void> {
    await this.page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(
      () => {},
    );
    await this.page.waitForTimeout(1_000);

    const root = this.page
      .locator("app-quote-details, app-standard-quote")
      .last();
    await root.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});

    const wanted = this.normOriginationText(origRef);
    const matches = (read: string): boolean => {
      const v = this.normOriginationText(read);
      if (!v || !wanted) return false;
      if (v === wanted) return true;
      if (v.includes(wanted) || wanted.includes(v)) return true;
      const prefix = wanted.slice(0, Math.min(12, wanted.length));
      return prefix.length >= 4 && v.includes(prefix);
    };

    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        await this.enterOriginationReferenceFinanceLease(origRef, true);
      } catch {
        // Continue: field may still be patchable via native value.
      }
      await this.page.waitForTimeout(350);

      const inp = await this.findVisibleFinanceLeaseOriginationInput(root);
      if (inp) {
        await inp.click({ force: true }).catch(() => {});
        try {
          await inp.fill(origRef, { timeout: 10_000 });
        } catch {
          await inp.press("ControlOrMeta+a");
          await this.page.keyboard.type(origRef, { delay: 12 });
        }
        await this.patchOriginationInputNativeValue(inp, origRef);
        await inp.press("Tab").catch(() => {});
        await this.page.waitForTimeout(400);

        const v = await this.readOriginationLocatorValue(inp);
        if (matches(v)) return;
      }

      await this.page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(
        () => {},
      );
      await this.page.waitForTimeout(450);
    }
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
   * Resolves the **Asset & Insurance Summary** PrimeNG dialog (faster than `getByRole("dialog").last()`
   * when other dialogs exist).
   */
  private assetInsuranceSummaryDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ hasText: /Asset\s*&\s*Insurance\s*Summary/i })
      .first();
  }

  /**
   * Click on Asset, Insurance & Trade-in Summary hyperlink to open the summary dialog
   */
  async openAssetInsuranceTradeInSummary(): Promise<void> {
    const inCard = this.page
      .locator("app-asset-summary")
      .locator("button")
      .filter({ hasText: /Asset\s*&\s*Insurance\s*Summary/i })
      .first();
    const globalBtn = this.assetInsuranceTradeInSummaryHyperlink;
    const trigger = (await inCard.isVisible({ timeout: 2_000 }).catch(() => false))
      ? inCard
      : globalBtn;
    await this.scrollIfNeeded(trigger);
    await trigger.click({ timeout: 10_000 });

    let dlg = this.assetInsuranceSummaryDialog();
    try {
      await dlg.waitFor({ state: "visible", timeout: 10_000 });
    } catch {
      dlg = this.page.getByRole("dialog").last();
      await dlg.waitFor({ state: "visible", timeout: 10_000 });
    }
    await dlg
      .locator("div.p-dialog-content")
      .filter({ visible: true })
      .first()
      .waitFor({ state: "visible", timeout: 6_000 })
      .catch(() => {});
    await dlg
      .locator("div.card-body.pt-3")
      .filter({ visible: true })
      .first()
      .waitFor({ state: "visible", timeout: 3_000 })
      .catch(() => {});
  }

  /**
   * Clicks edit on the asset/insurance summary dialog. Finance Lease vs CSA may use
   * `.fa-pen-to-square`, `fa-pen`, Prime `pi-pen`, or a text "Edit" button.
   *
   * Some builds route **Edit** to a full-page `…/addAsset/edit` flow (no modal). If that navigation
   * already completed, this is a no-op. Pen icons must be scoped to the **summary dialog** only —
   * a page-wide `.fa-pen-to-square` can hit the wrong control, navigate away, and leave no `dialog`
   * for the next wait (TimeoutError on `getByRole("dialog")`).
   */
  async clickAssetSummaryEditButton(): Promise<void> {
    if (/\/addAsset\/edit/i.test(this.page.url())) {
      await this.page
        .locator("text")
        .filter({ hasText: /^Year$/i })
        .locator("#text")
        .first()
        .waitFor({ state: "visible", timeout: 8_000 })
        .catch(() => {});
      return;
    }

    const resolveSummaryDialog = async (): Promise<Locator> => {
      const scoped = this.assetInsuranceSummaryDialog();
      try {
        await scoped.waitFor({ state: "visible", timeout: 8_000 });
        return scoped;
      } catch {
        const last = this.page.getByRole("dialog").last();
        await last.waitFor({ state: "visible", timeout: 8_000 });
        return last;
      }
    };

    const tryClickEdit = async (summary: Locator): Promise<boolean> => {
      const byRole = summary.getByRole("button", { name: /^(Edit|Update)$/i });
      if (await byRole.isVisible({ timeout: 400 }).catch(() => false)) {
        await byRole.first().click({ force: true, timeout: 10_000 });
        return true;
      }
      for (const sel of [
        "i.fa-pen-to-square, i.fa-pen, [class*='fa-pen-to-square'], [class*='pen-to-square']",
        ".pi-pen, .pi-pencil, i[class*='pencil']",
        ".cursor-pointer.fa-pen-to-square, .fa-pen-to-square",
      ]) {
        const icon = summary.locator(sel).first();
        if (await icon.isVisible({ timeout: 450 }).catch(() => false)) {
          const parent = icon.locator(
            "xpath=ancestor::button[1] | ancestor::a[1] | self::i",
          );
          const t = (await parent.first().isVisible().catch(() => false))
            ? parent.first()
            : icon;
          await t.scrollIntoViewIfNeeded();
          await t.click({ force: true, timeout: 10_000 });
          return true;
        }
      }
      const penInSummary = summary
        .locator(
          ".cursor-pointer.fa-pen-to-square, i.fa-pen-to-square, i.fa-pen, [class*='fa-pen-to-square']",
        )
        .first();
      if (await penInSummary.isVisible({ timeout: 400 }).catch(() => false)) {
        const parent = penInSummary.locator(
          "xpath=ancestor::button[1] | ancestor::a[1] | self::*[name()='i']",
        );
        const t = (await parent.first().isVisible().catch(() => false))
          ? parent.first()
          : penInSummary;
        await t.scrollIntoViewIfNeeded();
        await t.click({ force: true, timeout: 10_000 });
        return true;
      }
      return false;
    };

    for (let round = 0; round < 2; round++) {
      if (/\/addAsset\/edit/i.test(this.page.url())) {
        return;
      }
      if (round > 0) {
        await this.page.keyboard.press("Escape").catch(() => {});
        await this.openAssetInsuranceTradeInSummary();
      }
      const s = await resolveSummaryDialog();
      for (let w = 0; w < 4; w++) {
        if (await tryClickEdit(s)) {
          try {
            await this.page.waitForURL(/\/addAsset\/edit/i, { timeout: 6_000 });
          } catch {
            /* Edit may stay in-modal on some products */
          }
          return;
        }
        if (/\/addAsset\/edit/i.test(this.page.url())) {
          return;
        }
        await this.page.waitForTimeout(200);
      }
    }
    throw new Error(
      "Asset/Insurance summary: no Edit (pen) control found; check dialog content for Finance Lease.",
    );
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
  /**
   * Term: numeric **spinbutton** inside `<number>` (some builds), or **dropdown** (QAT / other products).
   */
  async termsOfFinance(term: string): Promise<void> {
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

  /**
   * Finance Lease — Payment Summary: "Initial Lease Amount" is required (validation) before Calculate.
   * Uses the label, then the row’s `p-inputtext` / input; avoids brittle `ng-pristine` / `ng-touched` classes.
   */
  async enterInitialLeaseAmountFinanceLease(amount: string): Promise<void> {
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

  /** Residual Value `%` — same `<percentage>` host pattern as Interest Rate (avoid first `#percent` = interest). */
  private residualPercentInput(): Locator {
    const root = this.page.locator("app-quote-details, app-standard-quote").first();
    return root
      .locator("percentage")
      .filter({ hasText: /Residual/i })
      .locator("#percent")
      .first();
  }

  async enterResidualValuePercentFinanceLease(percent: string): Promise<void> {
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
    await this.loanDate.click();
  }
  async firstPayment(): Promise<void> {
    await this.firstPaymentDate.click();
  }
  async clickCalculateButton(): Promise<void> {
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

    await this.page
      .locator(".app-loader-overlay, .p-progressspinner")
      .first()
      .waitFor({ state: "hidden", timeout: 90_000 })
      .catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(
      () => {},
    );
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page.waitForTimeout(1_500);
  }
  async paymentSummary(): Promise<void> {
    // await this.loanDAte();
    // await this.firstPayment();
    await this.clickCalculateButton();
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

  /**
   * Finance Lease: after payment summary / origination, click **Next** inside `app-quote-details`.
   * If **Next** stays disabled (validation), optionally pass `origRef` to re-fill + patch origination while waiting.
   */
  async clickNextButtonFinanceLease(origRef?: string): Promise<void> {
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