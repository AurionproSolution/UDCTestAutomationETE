import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

/**
 * Step — Financial Position:
 * - **Individual:** `app-financial-position` (Liabilities, Income, Expenditure, Essential Outgoings).
 * - **CSA-B business:** `app-business-financial` (Profit declaration, Turnover, Balance information).
 * - **Sole Trader:** `app-sole-trade-financial` + `app-sole-trade-profit-declaration`, `app-sole-trade-turnover-info`,
 *   `app-sole-trade-assets`, `app-sole-trade-liabilities` (same business-style fields, different hosts).
 * - **Trust (Standard Quote):** `app-trust-financial-details` (`app-trust-profit-declaration`, `app-trust-turnover-info`,
 *   `app-trust-balance-info`, Statement of Position: `app-trust-assets`, `app-trust-liabilities`).
 * PrimeNG ids (`#pn_id_*`) are fallbacks — they can change between builds.
 */
export class DOFinancialPositionPage extends BasePage {
  readonly financialRoot: Locator;
  /** CSA-B business entity — Financial Accounts step. */
  readonly businessFinancialRoot: Locator;
  /** Sole Trader — Financial Position step (parallel to `app-business-financial`). */
  readonly soleTradeFinancialRoot: Locator;
  /** Trust — Financial Position step (`app-trust-financial-details`). */
  readonly trustFinancialRoot: Locator;
  readonly turnoverInformationRoot: Locator;
  /** `app-balance-information` or a card titled “Balance Information” under `app-business-financial`. */
  readonly balanceInformationHost: Locator;
  readonly liabilitiesCard: Locator;
  readonly incomeDetailsCard: Locator;
  readonly expenditureCard: Locator;
  /** Individual — `app-individual-asset-details` (Home Ownership, Vehicle, Furniture, Other asset row). */
  readonly individualAssetDetailsCard: Locator;
  /** Individual — `app-regular-recurring-frequency` (Essential Outgoings). */
  readonly essentialOutgoingsCard: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);
    this.financialRoot = page.locator("app-financial-position").first();
    this.businessFinancialRoot = page.locator("app-business-financial").first();
    this.soleTradeFinancialRoot = page.locator("app-sole-trade-financial").first();
    this.trustFinancialRoot = page.locator("app-trust-financial-details").first();
    this.turnoverInformationRoot = page
      .locator("app-sole-trade-financial app-sole-trade-turnover-info")
      .filter({ visible: true })
      .first()
      .or(page.locator("app-business-financial app-turnover-information").first())
      .or(page.locator("app-turnover-information").first());
    this.balanceInformationHost = page
      .locator("app-sole-trade-financial")
      .filter({ visible: true })
      .locator("gen-card, p-card")
      .filter({ hasText: /Balance Information/i })
      .first()
      .or(page.locator("app-balance-information").first())
      .or(
        this.businessFinancialRoot
          .locator("gen-card, p-card")
          .filter({ hasText: /Balance Information/i })
          .first(),
      );
    this.liabilitiesCard = page.locator("app-individual-liabilities").first();
    this.incomeDetailsCard = page.locator("app-income-details").first();
    this.expenditureCard = page.locator("app-individual-expenditure").first();
    this.individualAssetDetailsCard = page.locator("app-individual-asset-details").first();
    this.essentialOutgoingsCard = page
      .locator("app-regular-recurring-frequency")
      .filter({ visible: true })
      .first();
    this.nextButton = page.getByRole("button", { name: "Next" }).last();
  }

  protected stepLogPrefix(): string {
    return "Standard quote — Financial position";
  }

  async waitForFinancialPositionStep(): Promise<void> {
    this.logStep("Wait For Financial Position Step");
    await this.financialRoot
      .or(this.businessFinancialRoot)
      .or(this.soleTradeFinancialRoot)
      .or(this.trustFinancialRoot)
      .first()
      .waitFor({ state: "visible", timeout: 120000 });
  }

  async waitForTrustFinancialPositionStep(): Promise<void> {
    this.logStep("Wait For Trust Financial Position Step");
    await this.trustFinancialRoot.waitFor({ state: "visible", timeout: 120_000 });
    await this.trustFinancialRoot
      .getByText(/Profit Declaration|Turnover Information/i)
      .first()
      .waitFor({ state: "visible", timeout: 60_000 });
  }

  private trustProfitDeclarationHost(): Locator {
    return this.trustFinancialRoot.locator("app-trust-profit-declaration").first();
  }

  private trustTurnoverHost(): Locator {
    return this.trustFinancialRoot.locator("app-trust-turnover-info").first();
  }

  private trustBalanceHost(): Locator {
    return this.trustFinancialRoot.locator("app-trust-balance-info").first();
  }

  private trustAssetsHost(): Locator {
    return this.trustFinancialRoot.locator("app-trust-assets").first();
  }

  private trustLiabilitiesHost(): Locator {
    return this.trustFinancialRoot.locator("app-trust-liabilities").first();
  }

  /**
   * Trust profit radios: **No** then **Yes** so the Net Profit amount control is shown and bound reliably.
   * PrimeNG keeps native `input` off-screen — click visible labels / `.p-radiobutton-box` (same as business flow).
   */
  private async clickTrustProfitRadioOption(host: Locator, label: "No" | "Yes"): Promise<void> {
    const already = host.locator("p-radiobutton.p-radiobutton-checked").filter({
      hasText: label,
    });
    if (await already.isVisible({ timeout: 800 }).catch(() => false)) {
      return;
    }

    const profitLead = host
      .getByText(/Did you make a Net Profit|Net Profit last year|Profit Declaration/i)
      .first();
    if (await profitLead.isVisible({ timeout: 4_000 }).catch(() => false)) {
      const fieldset = profitLead.locator(
        "xpath=ancestor::*[self::fieldset or self::p-card or self::gen-card][1]",
      );
      const scoped = fieldset.getByText(label, { exact: true }).first();
      if (await scoped.isVisible({ timeout: 2_500 }).catch(() => false)) {
        await scoped.scrollIntoViewIfNeeded();
        await scoped.click({ timeout: 15_000, force: true });
        await this.page.waitForTimeout(450);
        if (await already.isVisible({ timeout: 1_500 }).catch(() => false)) {
          return;
        }
      }
    }

    const textLabel = host.getByText(label, { exact: true }).first();
    if (await textLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await textLabel.scrollIntoViewIfNeeded();
      await textLabel.click({ timeout: 15_000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    const byRole = host.getByRole("radio", { name: new RegExp(`^${label}$`, "i") });
    if (await byRole.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await byRole.click({ timeout: 15_000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    const box = host
      .locator("p-radiobutton")
      .filter({ hasText: label })
      .locator(".p-radiobutton-box")
      .first();
    if (await box.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await box.scrollIntoViewIfNeeded();
      await box.click({ timeout: 15_000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    const radios = host.locator("p-radiobutton");
    const count = await radios.count();
    if (count >= 2) {
      const idx = label === "No" ? 0 : 1;
      await radios.nth(idx).locator(".p-radiobutton-box").click({ timeout: 15_000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    throw new Error(`Trust profit declaration: could not select ${label}`);
  }

  async primeTrustNetProfitLastYearNoThenYes(): Promise<void> {
    this.logStep("Prime Trust Net Profit Last Year No Then Yes");
    const host = this.trustProfitDeclarationHost();
    await host.waitFor({ state: "visible", timeout: 60_000 });
    await host.evaluate((el: Element) => {
      (el as HTMLElement).scrollIntoView({ block: "center", behavior: "instant" });
    });
    await this.page.waitForTimeout(200);

    await this.clickTrustProfitRadioOption(host, "No");
    await this.clickTrustProfitRadioOption(host, "Yes");

    const netRow = host.locator("amount").locator("#amount").first();
    await netRow.waitFor({ state: "visible", timeout: 20_000 });
  }

  /** “Net Profit last year” currency field (after Yes). */
  async fillTrustNetProfitLastYear(value: string): Promise<void> {
    this.logStep(`Filled trust net profit last year as ${this.stepValueDisplay(value)}`);
    const host = this.trustProfitDeclarationHost();
    await host.waitFor({ state: "visible", timeout: 30_000 });
    const input = host.locator("amount").locator("#amount").first();
    await this.setCommittedAmount(input, value);
  }

  /** Turnover **(Latest Year)** — amount + Year Ending only (Previous row left to app defaults unless you fill it). */
  async fillTrustTurnoverLatestYear(amount: string, yearEnding: string): Promise<void> {
    this.logStep(
      `Filled trust turnover (latest): amount ${this.stepValueDisplay(amount)}, year ending ${this.stepValueDisplay(yearEnding)}`,
    );
    const host = this.trustTurnoverHost();
    await host.waitFor({ state: "visible", timeout: 30_000 });
    await host.scrollIntoViewIfNeeded().catch(() => {});
    const amountHost = host.locator("amount").first();
    const amountInput = amountHost.locator("#amount").first();
    await this.setCommittedAmount(amountInput, amount);
    const calendarInput = this.yearEndingInputForAmountHost(amountHost);
    await this.fillYearEndingField(calendarInput, yearEnding);
    await this.page.waitForTimeout(400);
  }

  /**
   * After Latest Turnover year ending is set, Balance Information year-ending fields often mirror it.
   * Asserts `cashBalLatestYrEndDt`, `debtorBalLatestYrEndDt`, `creditorBalLatestYrEndDt`, `overdraftBalLastYrEndDt`
   * match the Latest Turnover field (`turnoverLatestYearEndingDt`).
   */
  async expectTrustBalanceYearEndingsMatchLatestTurnoverDate(options?: {
    timeoutMs?: number;
  }): Promise<void> {
    this.logStep("Expect trust balance year endings match latest turnover date");
    const timeout = options?.timeoutMs ?? 25_000;
    const latestInp = this.trustTurnoverHost().locator('input[name="turnoverLatestYearEndingDt"]').first();
    await expect(latestInp).not.toHaveValue("", { timeout });
    const ref = (await latestInp.inputValue()).trim();
    expect(ref.length).toBeGreaterThan(3);
    const names = [
      "cashBalLatestYrEndDt",
      "debtorBalLatestYrEndDt",
      "creditorBalLatestYrEndDt",
      "overdraftBalLastYrEndDt",
    ] as const;
    for (const name of names) {
      const inp = this.trustBalanceHost().locator(`input[name="${name}"]`).first();
      await expect(inp).toHaveValue(ref, { timeout });
    }
  }

  /** Balance Information — amount only (row **0** Cash … **3** Overdraft); leave calendars if app already populated them. */
  async fillTrustBalanceRowAmountOnly(rowIndex: number, amount: string): Promise<void> {
    this.logStep(
      `Filled trust balance row ${rowIndex} amount as ${this.stepValueDisplay(amount)}`,
    );
    const host = this.trustBalanceHost();
    await host.waitFor({ state: "visible", timeout: 30_000 });
    const amountHost = host.locator("amount").nth(rowIndex);
    const amountInput = amountHost.locator("#amount").first();
    await this.setCommittedAmount(amountInput, amount);
  }

  /** If a balance row’s Year Ending is still empty, set it (e.g. when propagation did not run). */
  async fillTrustBalanceRowYearEndingIfEmpty(rowIndex: number, yearEnding: string): Promise<void> {
    this.logStep(
      `Filled trust balance row ${rowIndex} year ending (if empty) as ${this.stepValueDisplay(yearEnding)}`,
    );
    const host = this.trustBalanceHost();
    const amountHost = host.locator("amount").nth(rowIndex);
    const cal = this.yearEndingInputForAmountHost(amountHost);
    const v = (await cal.inputValue().catch(() => "")).trim();
    if (v.length > 0) return;
    await this.fillYearEndingField(cal, yearEnding);
  }

  private async fillTrustAssetAmountByRowLabel(labelRx: RegExp, value: string): Promise<void> {
    const host = this.trustAssetsHost();
    await host.waitFor({ state: "visible", timeout: 30_000 });
    const label = host.getByText(labelRx).first();
    await label.scrollIntoViewIfNeeded();
    const row = label.locator("xpath=ancestor::div[.//amount][1]");
    const input = row.locator("amount").locator("#amount").first();
    await this.setCommittedAmount(input, value);
  }

  async fillTrustPersonalPropertyAmount(value: string): Promise<void> {
    this.logStep(`Filled trust personal property amount as ${this.stepValueDisplay(value)}`);
    await this.fillTrustAssetAmountByRowLabel(/Personal Property/i, value);
  }

  async fillTrustVehicleValueAmount(value: string): Promise<void> {
    this.logStep(`Filled trust vehicle value amount as ${this.stepValueDisplay(value)}`);
    await this.fillTrustAssetAmountByRowLabel(/Vehicle Value/i, value);
  }

  /** “Other” asset row — amount beside `financialAssetType` dropdown. */
  async fillTrustOtherAssetAmount(value: string): Promise<void> {
    this.logStep(`Filled trust other asset amount as ${this.stepValueDisplay(value)}`);
    const host = this.trustAssetsHost();
    await host.waitFor({ state: "visible", timeout: 30_000 });
    const amtHost = host.locator('amount[formcontrolname="financialAssetTypeAmount"]').first();
    const input = amtHost.locator("#amount").first();
    await this.setCommittedAmount(input, value);
  }

  private async fillTrustLiabilityMonthlyByLabel(labelRx: RegExp, value: string): Promise<void> {
    const host = this.trustLiabilitiesHost();
    await host.waitFor({ state: "visible", timeout: 30_000 });
    const label = host.getByText(labelRx).first();
    await label.scrollIntoViewIfNeeded();
    const row = label.locator("xpath=ancestor::*[.//amount][1]");
    const input = row.locator("amount").locator("#amount").first();
    await this.setCommittedAmount(input, value);
  }

  async fillTrustMortgageRentMonthlyAmount(value: string): Promise<void> {
    this.logStep(`Filled trust mortgage/rent monthly as ${this.stepValueDisplay(value)}`);
    await this.fillTrustLiabilityMonthlyByLabel(/Mortgage\s*\/\s*Rent/i, value);
  }

  async fillTrustLoansMonthlyAmount(value: string): Promise<void> {
    this.logStep(`Filled trust loans monthly as ${this.stepValueDisplay(value)}`);
    await this.fillTrustLiabilityMonthlyByLabel(/\bLoans\b/i, value);
  }

  async fillTrustCreditCardsMonthlyAmount(value: string): Promise<void> {
    this.logStep(`Filled trust credit cards monthly as ${this.stepValueDisplay(value)}`);
    await this.fillTrustLiabilityMonthlyByLabel(/Credit Cards/i, value);
  }

  async fillTrustOtherLiabilitiesMonthlyAmount(value: string): Promise<void> {
    this.logStep(`Filled trust other liabilities monthly as ${this.stepValueDisplay(value)}`);
    await this.fillTrustLiabilityMonthlyByLabel(/Other Liabilities/i, value);
  }

  /**
   * One-shot happy path for **Trust** Financial Position (profit → turnover → balance → statement).
   * Call after navigating to step 3 (Trust Financial Position).
   */
  async fillTrustFinancialPositionComplete(opts: {
    netProfit: string;
    turnoverLatestAmount: string;
    turnoverYearEnding: string;
    balanceCash: string;
    balanceDebtor: string;
    balanceCreditor: string;
    balanceOverdraft: string;
    assetPersonalProperty: string;
    assetVehicle: string;
    assetOther: string;
    liabilityMortgage: string;
    liabilityLoans: string;
    liabilityCreditCards: string;
    liabilityOther: string;
  }): Promise<void> {
    this.logStep(
      `Filled trust financial position (complete); turnover year ending ${this.stepValueDisplay(opts.turnoverYearEnding)}`,
    );
    await this.waitForTrustFinancialPositionStep();
    await this.primeTrustNetProfitLastYearNoThenYes();
    await this.fillTrustNetProfitLastYear(opts.netProfit);
    await this.fillTrustTurnoverLatestYear(opts.turnoverLatestAmount, opts.turnoverYearEnding);
    await this.expectTrustBalanceYearEndingsMatchLatestTurnoverDate({ timeoutMs: 30_000 }).catch(
      async () => {
        for (let i = 0; i < 4; i++) {
          await this.fillTrustBalanceRowYearEndingIfEmpty(i, opts.turnoverYearEnding);
        }
      },
    );
    await this.fillTrustBalanceRowAmountOnly(0, opts.balanceCash);
    await this.fillTrustBalanceRowAmountOnly(1, opts.balanceDebtor);
    await this.fillTrustBalanceRowAmountOnly(2, opts.balanceCreditor);
    await this.fillTrustBalanceRowAmountOnly(3, opts.balanceOverdraft);
    await this.fillTrustPersonalPropertyAmount(opts.assetPersonalProperty);
    await this.fillTrustVehicleValueAmount(opts.assetVehicle);
    await this.fillTrustOtherAssetAmount(opts.assetOther);
    await this.fillTrustMortgageRentMonthlyAmount(opts.liabilityMortgage);
    await this.fillTrustLoansMonthlyAmount(opts.liabilityLoans);
    await this.fillTrustCreditCardsMonthlyAmount(opts.liabilityCreditCards);
    await this.fillTrustOtherLiabilitiesMonthlyAmount(opts.liabilityOther);
  }

  private escapeRx(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** Strip `$` / thousands separators so PrimeNG currency accepts keystrokes (see `AssetDetailsPage` `#amount`). */
  private normalizeAmountDigits(raw: string): string {
    return raw.replace(/[$,\s]/g, "").trim() || "0";
  }

  /**
   * UDC `<amount>` uses `#amount` inside the host — `amount input` is unreliable; `clear()`/`fill()` often
   * leaves the model at 0. Match working flows: focus → **Ctrl+A** → type digits → **Tab** (blur).
   */
  private async setCommittedAmount(input: Locator, value: string): Promise<void> {
    await input.waitFor({ state: "visible", timeout: 20000 });
    await input.scrollIntoViewIfNeeded();
    const digits = this.normalizeAmountDigits(value);
    await input.click({ timeout: 15000 });
    await input.press("Control+A");
    await input.pressSequentially(digits, { delay: 35 });
    await input.press("Tab");
    await this.page.waitForTimeout(400);
  }

  /**
   * PrimeNG `p-calendar` text inputs are often **readonly**; `fill()` does not bind the model.
   * Prefer keyboard entry, then fall back to clearing readonly and dispatching input/change/blur.
   */
  private async fillYearEndingField(input: Locator, value: string): Promise<void> {
    await input.waitFor({ state: "visible", timeout: 20000 });
    await input.scrollIntoViewIfNeeded();
    await input.click({ timeout: 15000, force: true });
    await input.press("Control+A");
    await input.pressSequentially(value, { delay: 40 });
    await input.press("Tab");
    await this.page.waitForTimeout(350);

    const v = (await input.inputValue().catch(() => "")).trim();
    if (v.length > 0) {
      return;
    }

    await input.evaluate((el: HTMLInputElement, dateStr: string) => {
      el.removeAttribute("readonly");
      el.removeAttribute("disabled");
      el.focus();
      el.value = dateStr;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    }, value);
    await this.page.waitForTimeout(350);
  }

  /** Year-ending `p-calendar` input on the same logical row as this `<amount>` host (avoids wrong `nth()`). */
  private yearEndingInputForAmountHost(amountHost: Locator): Locator {
    return amountHost
      .locator("xpath=following::p-calendar[1]//input")
      .first()
      .or(
        amountHost
          .locator("xpath=ancestor::*[.//p-calendar][1]//p-calendar//input")
          .first(),
      );
  }

  /**
   * All `<amount>#amount` fields in document order within a card (Balance/Limit before Repayment Amount
   * on the first liability row; avoids `form > div > div:first` when that node is a header wrapper).
   */
  private amountInputsInCard(card: Locator): Locator {
    return card.locator("amount").locator("#amount");
  }

  /** PrimeNG overlay: `role=option`, `li.p-dropdown-item`, or `.p-dropdown-item` text. */
  private async pickDropdownOption(optionLabel: string): Promise<void> {
    await this.pickDropdownOptionFromPage(this.page, optionLabel);
  }

  private async pickDropdownOptionFromPage(
    page: Page,
    optionLabel: string,
  ): Promise<void> {
    const rx = new RegExp(`^${this.escapeRx(optionLabel)}$`, "i");
    const panel = page.locator(".p-dropdown-panel").last();

    const tryRoleOption = async (): Promise<boolean> => {
      const opt = page.getByRole("option", { name: rx }).first();
      if (await opt.isVisible({ timeout: 4000 }).catch(() => false)) {
        await opt.click();
        return true;
      }
      return false;
    };

    const tryPanelItems = async (): Promise<boolean> => {
      await panel.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
      const item = panel
        .locator("li.p-dropdown-item, .p-dropdown-item, li[role='option']")
        .filter({ hasText: rx })
        .first();
      if (await item.isVisible({ timeout: 4000 }).catch(() => false)) {
        await item.click();
        return true;
      }
      const loose = panel.getByText(optionLabel, { exact: true }).first();
      if (await loose.isVisible({ timeout: 2000 }).catch(() => false)) {
        await loose.click();
        return true;
      }
      return false;
    };

    if (!(await tryRoleOption())) {
      if (!(await tryPanelItems())) {
        await tryRoleOption();
        await tryPanelItems();
      }
    }

    await page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
  }

  /** Liabilities — first row: first two `amount` → `#amount` fields (Balance/Limit, then Amount). */
  async fillFirstLiabilityBalanceAndAmount(
    balanceLimit: string,
    amount: string,
  ): Promise<void> {
    this.logStep(
      `Filled first liability: balance/limit ${this.stepValueDisplay(balanceLimit)}, amount ${this.stepValueDisplay(amount)}`,
    );
    const fields = this.amountInputsInCard(this.liabilitiesCard);
    await this.setCommittedAmount(fields.nth(0), balanceLimit);
    await this.setCommittedAmount(fields.nth(1), amount);
  }

  /** Liabilities — first row frequency column → Monthly. */
  async setFirstLiabilityRowFrequencyMonthly(): Promise<void> {
    this.logStep("Set First Liability Row Frequency Monthly");
    const card = this.liabilitiesCard;
    const freqCell = card.locator(
      "form > div > div:nth-child(1) > div:nth-child(1) > div:nth-child(4)",
    );
    const trigger = freqCell.locator(".p-dropdown-trigger").first();
    await trigger.waitFor({ state: "visible", timeout: 15000 });
    await trigger.click();
    await this.pickDropdownOption("Monthly");
  }

  /**
   * Individual **Liabilities** row (e.g. **Credit Cards**, **Loans**, **Other Liabilities**): two `<amount>#amount`
   * fields — balance/limit then repayment amount — scoped from the row label (same pattern as {@link fillFirstLiabilityBalanceAndAmount}).
   */
  async fillIndividualLiabilityRowBalanceAndAmountByLabel(
    rowLabelRx: RegExp,
    balanceLimit: string,
    amount: string,
  ): Promise<void> {
    this.logStep(
      `Filled liability row (${rowLabelRx.source}): balance/limit ${this.stepValueDisplay(balanceLimit)}, amount ${this.stepValueDisplay(amount)}`,
    );
    const card = this.liabilitiesCard;
    await card.waitFor({ state: "visible", timeout: 30_000 });
    const anchor = card.getByText(rowLabelRx).first();
    await anchor.waitFor({ state: "visible", timeout: 20_000 });
    await anchor.scrollIntoViewIfNeeded();
    const row = anchor.locator("xpath=ancestor::div[.//amount][1]");
    const inputs = row.locator("amount").locator("#amount").filter({ visible: true });
    await this.setCommittedAmount(inputs.nth(0), balanceLimit);
    await this.setCommittedAmount(inputs.nth(1), amount);
  }

  /** Liabilities — **Mortgage / Rent** row (first liability): balance/limit + repayment amount. */
  async fillIndividualMortgageRentLiabilityBalanceAndAmount(
    balanceLimit: string,
    amount: string,
  ): Promise<void> {
    this.logStep(
      `Filled mortgage/rent liability: balance/limit ${this.stepValueDisplay(balanceLimit)}, amount ${this.stepValueDisplay(amount)}`,
    );
    await this.fillFirstLiabilityBalanceAndAmount(balanceLimit, amount);
  }

  private residenceTypeToHomeOwnershipRx(residenceType: string): RegExp {
    const t = residenceType.trim();
    if (/mortgage/i.test(t)) return /Mortgage/i;
    if (/rent/i.test(t)) return /Rent(ing)?/i;
    if (/board/i.test(t)) return /Board(ing)?/i;
    if (/own|freehold|owner/i.test(t)) return /Own|Freehold|Owner/i;
    return new RegExp(this.escapeRx(t), "i");
  }

  private individualHomeOwnershipTypeDisplay(): Locator {
    const card = this.individualAssetDetailsCard;
    const byFc = card.locator(`p-dropdown[formcontrolname="assestHomeOwnerType"]`).first();
    return byFc
      .locator(".p-dropdown-label, [role='combobox']")
      .first()
      .or(
        card
          .getByText(/Home Ownership Type/i)
          .first()
          .locator("xpath=ancestor::div[.//p-dropdown][1]")
          .locator(".p-dropdown-label, [role='combobox']")
          .first(),
      );
  }

  private individualMortgageRentLiabilityAmountInputs(): Locator {
    return this.amountInputsInCard(this.liabilitiesCard);
  }

  private async expectAmountInputMatches(input: Locator, expected: string): Promise<void> {
    await input.waitFor({ state: "visible", timeout: 15_000 });
    const actual = this.normalizeAmountDigits(await input.inputValue());
    const want = this.normalizeAmountDigits(expected);
    expect(actual).toBe(want);
  }

  /**
   * Address **Residence Type** maps to **Home Ownership Type** on Assets and the **Mortgage / Rent** liability row
   * (UDP-T3775 / UDP-T3762).
   */
  async expectIndividualMortgageRentLiabilityMappingForResidenceType(
    residenceType: string,
  ): Promise<void> {
    this.logStep(
      `Expect mortgage/rent liability mapping for residence type: ${this.stepValueDisplay(residenceType)}`,
    );
    await this.liabilitiesCard.waitFor({ state: "visible", timeout: 30_000 });
    await this.individualAssetDetailsCard.waitFor({ state: "visible", timeout: 30_000 });

    const homeOwnershipRx = this.residenceTypeToHomeOwnershipRx(residenceType);
    const ownershipDisplay = this.individualHomeOwnershipTypeDisplay();
    await expect(ownershipDisplay).toBeVisible({ timeout: 20_000 });
    const ownershipText =
      ((await ownershipDisplay.textContent()) ??
        (await ownershipDisplay.getAttribute("aria-label")) ??
        "").trim();
    expect(ownershipText).toMatch(homeOwnershipRx);

    await expect(
      this.liabilitiesCard.getByText(/Mortgage\s*\/\s*Rent|Mortgage|Rent/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  }

  /** Re-check **Mortgage / Rent** liability balance/limit and repayment amount after residence-type change. */
  async expectIndividualMortgageRentLiabilityBalanceAndAmount(
    balanceLimit: string,
    amount: string,
  ): Promise<void> {
    this.logStep(
      `Expect mortgage/rent liability: balance/limit ${this.stepValueDisplay(balanceLimit)}, amount ${this.stepValueDisplay(amount)}`,
    );
    const fields = this.individualMortgageRentLiabilityAmountInputs();
    await this.expectAmountInputMatches(fields.nth(0), balanceLimit);
    await this.expectAmountInputMatches(fields.nth(1), amount);
  }

  /** Income details — first row (e.g. Take Home Pay) amount. */
  async fillFirstIncomeAmount(value: string): Promise<void> {
    this.logStep(`Filled first income amount as ${this.stepValueDisplay(value)}`);
    const input = this.amountInputsInCard(this.incomeDetailsCard).first();
    await this.setCommittedAmount(input, value);
  }

  /** Income frequency — QAT trigger id `#pn_id_107_2`, then Monthly. */
  async setIncomeFrequencyMonthly(): Promise<void> {
    this.logStep("Set Income Frequency Monthly");
    const byId = this.page.locator("#pn_id_107_2");
    const inCard = this.incomeDetailsCard.locator("#pn_id_107_2");
    let clickTarget: Locator | null = null;
    if (await inCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      clickTarget = inCard;
    } else if (await byId.isVisible({ timeout: 2000 }).catch(() => false)) {
      clickTarget = byId;
    } else {
      clickTarget = this.incomeDetailsCard
        .locator("form > div > div:nth-child(1) > div:nth-child(1) > div:nth-child(3)")
        .locator(".p-dropdown-trigger")
        .first();
    }
    await clickTarget.scrollIntoViewIfNeeded();
    await clickTarget.click({ timeout: 15000 });
    await this.pickDropdownOption("Monthly");
  }

  /** Expenditure — first row amount (e.g. Council Rates). */
  async fillFirstExpenditureAmount(value: string): Promise<void> {
    this.logStep(`Filled first expenditure amount as ${this.stepValueDisplay(value)}`);
    const input = this.amountInputsInCard(this.expenditureCard).first();
    await this.setCommittedAmount(input, value);
  }

  /** Expenditure frequency — `#pn_id_111_2`, then Monthly. */
  async setExpenditureFrequencyMonthly(): Promise<void> {
    this.logStep("Set Expenditure Frequency Monthly");
    const byId = this.page.locator("#pn_id_111_2");
    const inCard = this.expenditureCard.locator("#pn_id_111_2");
    let clickTarget: Locator;
    if (await inCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      clickTarget = inCard;
    } else if (await byId.isVisible({ timeout: 2000 }).catch(() => false)) {
      clickTarget = byId;
    } else {
      clickTarget = this.expenditureCard
        .locator("form > div > div:nth-child(1) > div:nth-child(1) > div:nth-child(3)")
        .locator(".p-dropdown-trigger")
        .first();
    }
    await clickTarget.scrollIntoViewIfNeeded();
    await clickTarget.click({ timeout: 15000 });
    await this.pickDropdownOption("Monthly");
  }

  /**
   * “Is your income likely to decrease over the next 12 months” → **No**.
   * Often rendered under `app-financial-position` (not `app-income-details`); PrimeNG uses
   * `p-radiobutton` + `.p-radiobutton-box` without a reliable `radio` name.
   */
  async selectIncomeLikelyToDecreaseNo(): Promise<void> {
    this.logStep("Select Income Likely To Decrease No");
    const root = this.financialRoot;
    const question = root.getByText(/Is your income likely to decrease/i).first();
    await question.waitFor({ state: "visible", timeout: 20000 });
    await question.scrollIntoViewIfNeeded();

    const noFollowingLabel = question.locator(
      "xpath=following::label[normalize-space()='No' or normalize-space()='No *'][1]",
    );
    if (await noFollowingLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noFollowingLabel.click();
      return;
    }

    const radioGroup = question.locator(
      "xpath=ancestor::*[.//p-radiobutton or .//div[contains(@class,'p-radiobutton')]][1]",
    );

    const noByLabel = radioGroup
      .locator("label")
      .filter({ hasText: /^No\s*\*?$/i })
      .first();
    if (await noByLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noByLabel.click();
      return;
    }

    const radios = radioGroup.locator('input[type="radio"]');
    if ((await radios.count()) >= 2) {
      await radios.nth(1).click({ force: true });
      return;
    }

    const boxes = radioGroup.locator("div.p-radiobutton-box");
    if ((await boxes.count()) >= 2) {
      await boxes.nth(1).click();
      return;
    }

    const inIncome = this.incomeDetailsCard.getByRole("radio", {
      name: "No",
      exact: true,
    });
    if (await inIncome.isVisible({ timeout: 2000 }).catch(() => false)) {
      await inIncome.click();
      return;
    }

    const rootNo = root.getByRole("radio", { name: /^No$/i }).first();
    if (await rootNo.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rootNo.click();
      return;
    }

    throw new Error(
      "Financial Position: could not select 'No' for income likely to decrease",
    );
  }

  /** Individual Financial Position — expect host cards from your layout (`app-individual-*`, income, expenditure, recurring). */
  async expectIndividualFinancialPositionSectionsVisible(): Promise<void> {
    this.logStep("Expect Individual Financial Position Sections Visible");
    await this.financialRoot.waitFor({ state: "visible", timeout: 60_000 });
    await expect(this.individualAssetDetailsCard).toBeVisible({ timeout: 30_000 });
    await expect(
      this.individualAssetDetailsCard.getByText(/^Assets$/i).or(
        this.individualAssetDetailsCard.getByRole("heading", { name: /^Assets$/i }),
      ),
    ).toBeVisible({ timeout: 15_000 });
    await expect(this.liabilitiesCard).toBeVisible({ timeout: 15_000 });
    await expect(this.liabilitiesCard.getByText(/^Liabilities$/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.incomeDetailsCard).toBeVisible({ timeout: 15_000 });
    await expect(this.incomeDetailsCard.getByText(/Income Details/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.expenditureCard).toBeVisible({ timeout: 15_000 });
    await expect(this.expenditureCard.getByText(/^Expenditure$/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.essentialOutgoingsCard).toBeVisible({ timeout: 15_000 });
    await expect(
      this.essentialOutgoingsCard.getByText(/Regular Recurring Essential Outgoings/i),
    ).toBeVisible({ timeout: 15_000 });
  }

  /** `app-individual-asset-details` — row that contains `labelRx` and an `<amount>` control. */
  private amountInputInIndividualCardRow(card: Locator, labelRx: RegExp): Locator {
    return card
      .getByText(labelRx)
      .first()
      .locator("xpath=ancestor::div[.//amount][1]")
      .locator("amount")
      .locator("#amount")
      .first();
  }

  /** Individual Assets — **Home Ownership Type** (`assestHomeOwnerType` in template). */
  async selectIndividualHomeOwnershipType(optionLabel: string): Promise<void> {
    this.logStep(`Selected individual home ownership type: ${this.stepValueDisplay(optionLabel)}`);
    const card = this.individualAssetDetailsCard;
    await card.waitFor({ state: "visible", timeout: 30_000 });
    await card.scrollIntoViewIfNeeded();
    const byFc = card.locator(`p-dropdown[formcontrolname="assestHomeOwnerType"]`).first();
    const dd = (await byFc.isVisible({ timeout: 4_000 }).catch(() => false))
      ? byFc
      : card.getByText(/Home Ownership Type/i).first().locator("xpath=ancestor::div[.//p-dropdown][1]").locator("p-dropdown").first();
    const trigger = dd.locator(".p-dropdown-trigger, [aria-label='dropdown trigger']").first();
    await trigger.waitFor({ state: "visible", timeout: 20_000 });
    await trigger.click({ timeout: 15_000 });
    await this.pickDropdownOption(optionLabel);
  }

  /**
   * Individual Assets — open **Home Ownership Type** then dismiss the panel without choosing an option
   * (observe open/close behaviour; UDP-T3772).
   */
  async openAndCloseIndividualHomeOwnershipTypeDropdown(): Promise<void> {
    this.logStep("Open and close Home Ownership Type dropdown");
    const card = this.individualAssetDetailsCard;
    await card.waitFor({ state: "visible", timeout: 30_000 });
    await card.scrollIntoViewIfNeeded();
    const byFc = card.locator(`p-dropdown[formcontrolname="assestHomeOwnerType"]`).first();
    const dd = (await byFc.isVisible({ timeout: 4_000 }).catch(() => false))
      ? byFc
      : card.getByText(/Home Ownership Type/i).first().locator("xpath=ancestor::div[.//p-dropdown][1]").locator("p-dropdown").first();
    const trigger = dd.locator(".p-dropdown-trigger, [aria-label='dropdown trigger']").first();
    await trigger.waitFor({ state: "visible", timeout: 20_000 });
    await trigger.click({ timeout: 15_000 });
    const panel = this.page.locator(".p-dropdown-panel").last();
    await panel.waitFor({ state: "visible", timeout: 10_000 });
    await this.page.keyboard.press("Escape").catch(() => {});
    await panel.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  async fillIndividualHomeValueAmount(value: string): Promise<void> {
    this.logStep(`Filled individual home value as ${this.stepValueDisplay(value)}`);
    const card = this.individualAssetDetailsCard;
    await card.waitFor({ state: "visible", timeout: 30_000 });
    await card.scrollIntoViewIfNeeded();

    /** Label copy varies; some builds put the amount on the **Home Ownership** row with no “Home Value” text. */
    const labelRx =
      /Home\s*Value|Estimated\s+Home|Property\s+Value|Market\s+Value|Current\s+Value|Value\s+of\s+Home/i;

    const homeOwnershipDropdown = async (): Promise<Locator> => {
      const byFc = card.locator(`p-dropdown[formcontrolname="assestHomeOwnerType"]`).first();
      if (await byFc.isVisible({ timeout: 4_000 }).catch(() => false)) {
        return byFc;
      }
      return card
        .getByText(/Home Ownership Type/i)
        .first()
        .locator("xpath=ancestor::div[.//p-dropdown][1]")
        .locator("p-dropdown")
        .first();
    };

    const byAmountHost = this.amountInputInIndividualCardRow(card, labelRx);

    /** First `#amount` in document order after the Home Ownership dropdown (same row / next cell on many Webform layouts). */
    const dd = await homeOwnershipDropdown();
    await dd.waitFor({ state: "attached", timeout: 15_000 });
    const byAmountFollowingOwnershipDropdown = dd
      .locator("xpath=following::input[@id='amount'][1]")
      .filter({ visible: true });
    const byAmountPrecedingOwnershipDropdown = dd
      .locator("xpath=preceding::input[@id='amount'][1]")
      .filter({ visible: true });

    const byFormControl = card
      .locator(
        [
          'input#amount[formcontrolname="homeValue"]',
          'input#amount[formcontrolname="estimatedHomeValue"]',
          'input#amount[formcontrolname="assestHomeValue"]',
          'input#amount[formcontrolname="estimatedPropertyValue"]',
          'input#amount[formcontrolname="propertyValue"]',
          'input#amount[formcontrolname="currentHomeValue"]',
          'input[formcontrolname="homeValue"]',
          'input[formcontrolname="estimatedHomeValue"]',
          'input[formcontrolname="assestHomeValue"]',
        ].join(","),
      )
      .filter({ visible: true })
      .first();

    const byLabelAncestor = card
      .getByText(labelRx, { exact: false })
      .first()
      .locator("xpath=ancestor::*[.//input[@id='amount']][1]//input[@id='amount']")
      .filter({ visible: true })
      .first();

    const byFloatLabel = card
      .locator("span.p-float-label, label.p-float-label, label")
      .filter({ hasText: labelRx })
      .first()
      .locator("xpath=ancestor::*[.//input[@id='amount']][1]//input[@id='amount']")
      .filter({ visible: true })
      .first();

    const byA11y = card.getByRole("textbox", { name: labelRx }).filter({ visible: true }).first();

    for (const cand of [
      byAmountHost,
      byAmountFollowingOwnershipDropdown,
      byAmountPrecedingOwnershipDropdown,
      byFormControl,
      byLabelAncestor,
      byFloatLabel,
      byA11y,
    ]) {
      if ((await cand.count()) === 0) continue;
      const el = cand.first();
      if (!(await el.isVisible({ timeout: 4_000 }).catch(() => false))) continue;
      await this.setCommittedAmount(el, value);
      return;
    }

    /** Last resort: first visible `#amount` in the card whose row text is not another known asset line. */
    const amountInputs = card.locator("input#amount").filter({ visible: true });
    const total = await amountInputs.count();
    for (let i = 0; i < total; i++) {
      const el = amountInputs.nth(i);
      const rowText = (
        await el
          .locator(
            "xpath=ancestor::div[contains(@class,'grid') or contains(@class,'row') or contains(@class,'p-formgrid') or contains(@class,'p-fluid')][1]",
          )
          .innerText()
          .catch(() => "")
      ).toLowerCase();
      if (rowText.includes("vehicle value")) continue;
      if (rowText.includes("furniture") && rowText.includes("effects")) continue;
      if (rowText.includes("other financial")) continue;
      if (
        rowText.includes("home") ||
        rowText.includes("ownership") ||
        (i === 0 && !rowText.includes("vehicle") && !rowText.includes("furniture"))
      ) {
        await this.setCommittedAmount(el, value);
        return;
      }
    }

    const currencyOnly = card.locator("input[currencymask]").filter({ visible: true });
    const nCur = await currencyOnly.count();
    for (let i = 0; i < nCur; i++) {
      const el = currencyOnly.nth(i);
      const rowText = (
        await el
          .locator(
            "xpath=ancestor::div[contains(@class,'grid') or contains(@class,'row') or contains(@class,'p-formgrid') or contains(@class,'p-fluid')][1]",
          )
          .innerText()
          .catch(() => "")
      ).toLowerCase();
      if (rowText.includes("vehicle value")) continue;
      if (rowText.includes("furniture") && rowText.includes("effects")) continue;
      if (rowText.includes("other financial")) continue;
      if (
        rowText.includes("home") ||
        rowText.includes("ownership") ||
        (i === 0 && !rowText.includes("vehicle") && !rowText.includes("furniture"))
      ) {
        await this.setCommittedAmount(el, value);
        return;
      }
    }

    throw new Error(
      "Individual assets: could not find a visible Home Value amount input (tried <amount> host, amount after/before Home Ownership dropdown, formControlName, label row, float-label, aria name, row-text scan on #amount and currencymask inputs).",
    );
  }

  async fillIndividualVehicleValueAmount(value: string): Promise<void> {
    this.logStep(`Filled individual vehicle value as ${this.stepValueDisplay(value)}`);
    const input = this.amountInputInIndividualCardRow(
      this.individualAssetDetailsCard,
      /Vehicle Value/i,
    );
    await this.setCommittedAmount(input, value);
  }

  async fillIndividualFurnitureEffectsValueAmount(value: string): Promise<void> {
    this.logStep(`Filled individual furniture & effects value as ${this.stepValueDisplay(value)}`);
    const input = this.amountInputInIndividualCardRow(
      this.individualAssetDetailsCard,
      /Furniture\s*&\s*Effects Value/i,
    );
    await this.setCommittedAmount(input, value);
  }

  /** Other asset row — `financialAssetType` must be a real option (clears “Select a valid value”). */
  async selectIndividualOtherFinancialAssetType(optionLabel: string): Promise<void> {
    this.logStep(`Selected individual other financial asset type: ${this.stepValueDisplay(optionLabel)}`);
    const card = this.individualAssetDetailsCard;
    await card.waitFor({ state: "visible", timeout: 30_000 });
    const dd = card.locator(`p-dropdown[formcontrolname="financialAssetType"]`).first();
    const trigger = dd.locator(".p-dropdown-trigger, [aria-label='dropdown trigger']").first();
    await trigger.waitFor({ state: "visible", timeout: 20_000 });
    await trigger.click({ timeout: 15_000 });
    await this.pickDropdownOption(optionLabel);
  }

  async fillIndividualOtherFinancialAssetAmount(value: string): Promise<void> {
    this.logStep(`Filled individual other financial asset amount as ${this.stepValueDisplay(value)}`);
    const card = this.individualAssetDetailsCard;
    const host = card.locator(`amount[formcontrolname="financialAssetTypeAmount"]`).first();
    const input = host.locator("#amount").first();
    await this.setCommittedAmount(input, value);
  }

  /** Income — second row (e.g. **Spouse / Partner Pay**) amount. */
  async fillSecondIncomeRowAmount(value: string): Promise<void> {
    this.logStep(`Filled second income row amount as ${this.stepValueDisplay(value)}`);
    const input = this.amountInputsInCard(this.incomeDetailsCard).nth(1);
    await this.setCommittedAmount(input, value);
  }

  /** Frequency `p-dropdown` in the same grid row as `labelRx` → **Monthly**. */
  private async setRowFrequencyMonthlyInCard(card: Locator, labelRx: RegExp): Promise<void> {
    const row = card
      .getByText(labelRx)
      .first()
      .locator("xpath=ancestor::div[.//p-dropdown][1]");
    const trigger = row.locator(".p-dropdown-trigger, [aria-label='dropdown trigger']").first();
    await trigger.waitFor({ state: "visible", timeout: 20_000 });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click({ timeout: 15_000 });
    await this.pickDropdownOption("Monthly");
  }

  async setTakeHomePayFrequencyMonthly(): Promise<void> {
    this.logStep("Set Take Home Pay Frequency Monthly");
    await this.incomeDetailsCard.waitFor({ state: "visible", timeout: 30_000 });
    await this.setRowFrequencyMonthlyInCard(this.incomeDetailsCard, /Take Home Pay/i);
  }

  async setSpousePartnerPayFrequencyMonthly(): Promise<void> {
    this.logStep("Set Spouse Partner Pay Frequency Monthly");
    await this.incomeDetailsCard.waitFor({ state: "visible", timeout: 30_000 });
    await this.setRowFrequencyMonthlyInCard(this.incomeDetailsCard, /Spouse\s*\/\s*Partner Pay/i);
  }

  /** “Is your income likely to decrease…” → **Yes** (shows **Details** textarea). */
  async selectIncomeLikelyToDecreaseYes(): Promise<void> {
    this.logStep("Select Income Likely To Decrease Yes");
    const root = this.incomeDetailsCard;
    await root.waitFor({ state: "visible", timeout: 30_000 });
    const question = root.getByText(/Is your income likely to decrease/i).first();
    await question.waitFor({ state: "visible", timeout: 20_000 });
    await question.scrollIntoViewIfNeeded();
    const yesLabel = root.locator("label[for='yesOption']").first();
    if (await yesLabel.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await yesLabel.click();
      return;
    }
    const yesRadio = root.getByRole("radio", { name: /^yes$/i }).first();
    if (await yesRadio.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await yesRadio.click({ force: true });
      return;
    }
    await root.locator("#yesOption").click({ force: true });
  }

  incomeDecreaseDetailsTextarea(): Locator {
    return this.incomeDetailsCard.locator(`textarea[formcontrolname="myTextarea"]`).first();
  }

  async expectIncomeDecreaseDetailsTextareaVisibleAndEnabled(): Promise<void> {
    this.logStep("Expect Income Decrease Details Textarea Visible And Enabled");
    const ta = this.incomeDecreaseDetailsTextarea();
    await expect(ta).toBeVisible({ timeout: 15_000 });
    await expect(ta).toBeEnabled({ timeout: 10_000 });
  }

  async expectIncomeDecreaseDetailsTextareaHiddenOrDisabled(): Promise<void> {
    this.logStep("Expect Income Decrease Details Textarea Hidden Or Disabled");
    const ta = this.incomeDecreaseDetailsTextarea();
    const visible = await ta.isVisible().catch(() => false);
    if (!visible) {
      await expect(ta).toBeHidden({ timeout: 10_000 });
      return;
    }
    await expect(ta).toBeDisabled({ timeout: 10_000 });
  }

  async fillIncomeDecreaseDetails(text: string): Promise<void> {
    this.logStep(`Filled income decrease details as ${this.stepValueDisplay(text)}`);
    const ta = this.incomeDecreaseDetailsTextarea();
    await ta.waitFor({ state: "visible", timeout: 15_000 });
    await ta.fill(text);
    await ta.press("Tab").catch(() => {});
    await this.page.waitForTimeout(200);
  }

  async fillExpenditureAmountByLabel(labelRx: RegExp, value: string): Promise<void> {
    this.logStep(
      `Filled expenditure (${labelRx.source}) as ${this.stepValueDisplay(value)}`,
    );
    const input = this.amountInputInIndividualCardRow(this.expenditureCard, labelRx);
    await this.setCommittedAmount(input, value);
  }

  async setExpenditureRowFrequencyMonthlyByLabel(labelRx: RegExp): Promise<void> {
    this.logStep(`Set expenditure frequency monthly (label ${labelRx.source})`);
    await this.expenditureCard.waitFor({ state: "visible", timeout: 30_000 });
    await this.setRowFrequencyMonthlyInCard(this.expenditureCard, labelRx);
  }

  /** Essential Outgoings — outgoing type combobox should show **Other** by default (`recurringDescription`). */
  async expectEssentialOutgoingTypeDefaultOther(): Promise<void> {
    this.logStep("Expect Essential Outgoing Type Default Other");
    const card = this.essentialOutgoingsCard;
    await card.waitFor({ state: "visible", timeout: 30_000 });
    const combo = card
      .locator(`p-dropdown[formcontrolname="recurringDescription"]`)
      .getByRole("combobox")
      .first();
    await expect(combo).toHaveAttribute("aria-label", /Other/i, { timeout: 10_000 });
  }

  /**
   * **Regular Recurring Essential Outgoings** host (`app-regular-recurring-frequency`).
   * Avoid `.or()` unions for scroll targets — Playwright can fail `scrollIntoViewIfNeeded` on combined locators.
   */
  private essentialOutgoingsSection(): Locator {
    return this.page.locator("app-regular-recurring-frequency").filter({ visible: true }).first();
  }

  /** Scroll the Essential Outgoings card into view (footer-safe). */
  private async scrollEssentialOutgoingsCardIntoView(): Promise<void> {
    await this.page.keyboard.press("Escape").catch(() => {});
    const card = this.page
      .locator("app-regular-recurring-frequency")
      .filter({ visible: true })
      .first();
    await card.waitFor({ state: "visible", timeout: 30_000 });
    const title = card.getByText(/Regular Recurring Essential Outgoings/i).first();
    if (await title.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await title
        .evaluate((el: Element) => {
          (el as HTMLElement).scrollIntoView({ block: "center", behavior: "instant" });
        })
        .catch(() => {});
    }
    await card
      .evaluate((el: Element) => {
        (el as HTMLElement).scrollIntoView({ block: "center", behavior: "instant" });
      })
      .catch(() => {});
  }

  /** Outgoing type → **Lifestyle** (`#pn_id_93_2` or first row’s first PrimeNG dropdown). */
  async selectEssentialOutgoingTypeLifestyle(): Promise<void> {
    this.logStep("Select Essential Outgoing Type Lifestyle");
    await this.scrollEssentialOutgoingsCardIntoView();
    const section = this.essentialOutgoingsSection();

    const byId = this.financialRoot.locator("#pn_id_93_2");
    const scopedId = section.locator("#pn_id_93_2");
    const idEl = (await scopedId.isVisible({ timeout: 1500 }).catch(() => false))
      ? scopedId
      : byId;

    const triggerFromId = idEl.locator(
      "xpath=ancestor-or-self::p-dropdown[1]//div[contains(@class,'p-dropdown-trigger')][1]",
    );
    const firstRowTypeTrigger = section
      .locator(".p-dropdown")
      .first()
      .locator(".p-dropdown-trigger")
      .first();

    let trigger: Locator | null = null;
    if (await triggerFromId.isVisible({ timeout: 2000 }).catch(() => false)) {
      trigger = triggerFromId;
    } else if (await idEl.isVisible({ timeout: 1500 }).catch(() => false)) {
      trigger = idEl;
    } else if (
      await firstRowTypeTrigger.isVisible({ timeout: 3000 }).catch(() => false)
    ) {
      trigger = firstRowTypeTrigger;
    }

    if (!trigger) {
      throw new Error(
        "Essential Outgoings: could not find Outgoing Type dropdown trigger",
      );
    }

    await trigger
      .evaluate((el: Element) => {
        (el as HTMLElement).scrollIntoView({ block: "center", behavior: "instant" });
      })
      .catch(() => {});
    await trigger.click({ timeout: 15_000 });
    await this.page.locator(".p-dropdown-panel").waitFor({
      state: "visible",
      timeout: 10000,
    });
    await this.pickDropdownOption("Lifestyle");
  }

  /** Amount in Regular Recurring Essential Outgoings row. */
  async fillEssentialOutgoingAmount(value: string): Promise<void> {
    this.logStep(`Filled essential outgoing amount as ${this.stepValueDisplay(value)}`);
    await this.scrollEssentialOutgoingsCardIntoView();
    const section = this.essentialOutgoingsSection();
    const byAmountHost = section.locator("amount").first().locator("#amount");
    if (await byAmountHost.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.setCommittedAmount(byAmountHost, value);
      return;
    }
    const scoped = section
      .locator(
        "input.p-inputtext.p-component.p-element.w-full.valueClass",
      )
      .first();
    if (await scoped.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.setCommittedAmount(scoped, value);
      return;
    }
    await this.setCommittedAmount(section.locator("input.p-inputtext").first(), value);
  }

  /** Essential Outgoings row frequency → **Monthly** (`recurringFrequency` or second `p-dropdown` in card). */
  async setEssentialOutgoingFrequencyMonthly(): Promise<void> {
    this.logStep("Set Essential Outgoing Frequency Monthly");
    await this.scrollEssentialOutgoingsCardIntoView();
    const section = this.essentialOutgoingsSection();

    const byFc = section.locator(`p-dropdown[formcontrolname="recurringFrequency"]`).first();
    const triggerFromFc = byFc
      .locator(".p-dropdown-trigger, [aria-label='dropdown trigger']")
      .first();

    const byId = this.financialRoot.locator("#pn_id_95_2");
    const scopedId = section.locator("#pn_id_95_2");
    const idEl = (await scopedId.isVisible({ timeout: 1500 }).catch(() => false))
      ? scopedId
      : byId;

    const triggerFromId = idEl.locator(
      "xpath=ancestor-or-self::p-dropdown[1]//div[contains(@class,'p-dropdown-trigger')][1]",
    );
    const rowTriggers = section.locator(".p-dropdown .p-dropdown-trigger");
    const count = await rowTriggers.count();
    const secondRowFreq =
      count >= 2 ? rowTriggers.nth(1) : rowTriggers.last();

    let trigger: Locator | null = null;
    if (await triggerFromFc.isVisible({ timeout: 5_000 }).catch(() => false)) {
      trigger = triggerFromFc;
    } else if (await triggerFromId.isVisible({ timeout: 2000 }).catch(() => false)) {
      trigger = triggerFromId;
    } else if (await idEl.isVisible({ timeout: 1500 }).catch(() => false)) {
      trigger = idEl;
    } else if (await secondRowFreq.isVisible({ timeout: 3000 }).catch(() => false)) {
      trigger = secondRowFreq;
    }

    if (!trigger) {
      throw new Error(
        "Essential Outgoings: could not find frequency dropdown trigger",
      );
    }

    await trigger
      .evaluate((el: Element) => {
        (el as HTMLElement).scrollIntoView({ block: "center", behavior: "instant" });
      })
      .catch(() => {});
    await trigger.click({ timeout: 15_000 });
    await this.page.locator(".p-dropdown-panel").waitFor({
      state: "visible",
      timeout: 10000,
    });
    await this.pickDropdownOption("Monthly");
  }

  private profitDeclarationCardForBusiness(): Locator {
    return this.businessFinancialRoot
      .locator("gen-card, p-card")
      .filter({ hasText: /Did you make a Net Profit|Profit Declaration/i })
      .first();
  }

  /** Profit declaration card/host — Sole Trader (`app-sole-trade-profit-declaration`) or CSA-B business card. */
  private async resolveProfitDeclarationScope(): Promise<Locator> {
    const solePd = this.page
      .locator("app-sole-trade-financial app-sole-trade-profit-declaration")
      .first();
    if (await solePd.isVisible({ timeout: 20000 }).catch(() => false)) {
      const card = solePd
        .locator("gen-card, p-card")
        .filter({
          hasText: /Did you make a Net Profit|Profit Declaration|Net Profit last year/i,
        })
        .first();
      if ((await card.count()) > 0 && (await card.isVisible({ timeout: 4000 }).catch(() => false)))
        return card;
      return solePd;
    }
    await this.businessFinancialRoot.waitFor({ state: "visible", timeout: 120000 });
    return this.profitDeclarationCardForBusiness();
  }

  /** CSA-B **Financial Accounts** or **Sole Trader** — “Did you make a Net Profit last year?” → **No**. */
  async selectBusinessNetProfitLastYearNo(): Promise<void> {
    this.logStep("Select Business Net Profit Last Year No");
    try {
      await Promise.any([
        this.businessFinancialRoot.waitFor({ state: "visible", timeout: 120000 }),
        this.soleTradeFinancialRoot.waitFor({ state: "visible", timeout: 120000 }),
      ]);
    } catch {
      throw new Error(
        "Financial Position: neither app-business-financial nor app-sole-trade-financial became visible.",
      );
    }
    const card = await this.resolveProfitDeclarationScope();
    await card.waitFor({ state: "visible", timeout: 20000 });
    await card.evaluate((el: Element) => {
      (el as HTMLElement).scrollIntoView({ block: "center", behavior: "instant" });
    });
    await this.page.waitForTimeout(200);

    const noAlready = card.locator("p-radiobutton.p-radiobutton-checked").filter({
      hasText: "No",
    });
    if (await noAlready.isVisible({ timeout: 800 }).catch(() => false)) {
      return;
    }

    const profitLead = card
      .getByText(/Did you make a Net Profit|Net Profit last year|Profit Declaration/i)
      .first();
    if (await profitLead.isVisible({ timeout: 4_000 }).catch(() => false)) {
      const fieldset = profitLead.locator(
        "xpath=ancestor::*[self::fieldset or self::p-card or self::gen-card][1]",
      );
      const scopedNo = fieldset.getByText("No", { exact: true }).first();
      if (await scopedNo.isVisible({ timeout: 2_500 }).catch(() => false)) {
        await scopedNo.scrollIntoViewIfNeeded();
        await scopedNo.click({ timeout: 15_000, force: true });
        await this.page.waitForTimeout(450);
        const nowChecked = card.locator("p-radiobutton.p-radiobutton-checked").filter({
          hasText: "No",
        });
        if (await nowChecked.isVisible({ timeout: 1_500 }).catch(() => false)) {
          return;
        }
      }
    }

    const noLabel = card.getByText("No", { exact: true }).first();
    if (await noLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noLabel.scrollIntoViewIfNeeded();
      await noLabel.click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    const byRole = card.getByRole("radio", { name: /^no$/i });
    if (await byRole.isVisible({ timeout: 2000 }).catch(() => false)) {
      await byRole.click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    const noBox = card.locator("p-radiobutton").filter({ hasText: "No" }).locator(".p-radiobutton-box").first();
    if (await noBox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noBox.scrollIntoViewIfNeeded();
      await noBox.click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    const radios = card.locator("p-radiobutton");
    const count = await radios.count();
    if (count >= 2) {
      await radios.nth(0).locator(".p-radiobutton-box").click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    const noRb = card.locator("p-radiobutton").filter({ hasText: "No" }).first();
    if (await noRb.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noRb.scrollIntoViewIfNeeded();
      await noRb.click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    /** Last resort: only **visible** native radios — PrimeNG keeps `value` radios off-screen (`hiddenInput`). */
    const nativeRadios = card.locator("input[type='radio']").filter({ visible: true });
    if ((await nativeRadios.count()) >= 1) {
      await nativeRadios.nth(0).click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    throw new Error(
      "Profit declaration: could not select No for “Did you make a Net Profit last year?”",
    );
  }

  /** CSA-B **Financial Accounts** or **Sole Trader** — “Did you make a Net Profit last year?” → **Yes**. */
  async selectBusinessNetProfitLastYearYes(): Promise<void> {
    this.logStep("Select Business Net Profit Last Year Yes");
    try {
      await Promise.any([
        this.businessFinancialRoot.waitFor({ state: "visible", timeout: 120000 }),
        this.soleTradeFinancialRoot.waitFor({ state: "visible", timeout: 120000 }),
      ]);
    } catch {
      throw new Error(
        "Financial Position: neither app-business-financial nor app-sole-trade-financial became visible.",
      );
    }
    const card = await this.resolveProfitDeclarationScope();
    await card.waitFor({ state: "visible", timeout: 20000 });
    await card.evaluate((el: Element) => {
      (el as HTMLElement).scrollIntoView({ block: "center", behavior: "instant" });
    });
    await this.page.waitForTimeout(200);

    const yesAlready = card.locator("p-radiobutton.p-radiobutton-checked").filter({
      hasText: "Yes",
    });
    if (await yesAlready.isVisible({ timeout: 800 }).catch(() => false)) {
      return;
    }

    const profitLead = card
      .getByText(/Did you make a Net Profit|Net Profit last year|Profit Declaration/i)
      .first();
    if (await profitLead.isVisible({ timeout: 4_000 }).catch(() => false)) {
      const fieldset = profitLead.locator(
        "xpath=ancestor::*[self::fieldset or self::p-card or self::gen-card][1]",
      );
      const scopedYes = fieldset.getByText("Yes", { exact: true }).first();
      if (await scopedYes.isVisible({ timeout: 2_500 }).catch(() => false)) {
        await scopedYes.scrollIntoViewIfNeeded();
        await scopedYes.click({ timeout: 15_000, force: true });
        await this.page.waitForTimeout(450);
        const nowChecked = card.locator("p-radiobutton.p-radiobutton-checked").filter({
          hasText: "Yes",
        });
        if (await nowChecked.isVisible({ timeout: 1_500 }).catch(() => false)) {
          return;
        }
      }
    }

    const yesLabel = card.getByText("Yes", { exact: true }).first();
    if (await yesLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await yesLabel.scrollIntoViewIfNeeded();
      await yesLabel.click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    const byRole = card.getByRole("radio", { name: /^yes$/i });
    if (await byRole.isVisible({ timeout: 2000 }).catch(() => false)) {
      await byRole.click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    const yesBox = card.locator("p-radiobutton").filter({ hasText: "Yes" }).locator(".p-radiobutton-box").first();
    if (await yesBox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await yesBox.scrollIntoViewIfNeeded();
      await yesBox.click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    const radios = card.locator("p-radiobutton");
    const count = await radios.count();
    if (count >= 2) {
      await radios.nth(1).locator(".p-radiobutton-box").click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    const yesRb = card.locator("p-radiobutton").filter({ hasText: "Yes" }).first();
    if (await yesRb.isVisible({ timeout: 2000 }).catch(() => false)) {
      await yesRb.scrollIntoViewIfNeeded();
      await yesRb.click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    const nativeRadios = card.locator("input[type='radio']");
    if ((await nativeRadios.count()) >= 2) {
      await nativeRadios.nth(1).click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(400);
      return;
    }

    throw new Error(
      "Profit declaration: could not select Yes for “Did you make a Net Profit last year?”",
    );
  }

  /**
   * Zephyr **observe**: after **Yes** on “Did you make a Net Profit last year?”, the **Net Profit last year**
   * amount control should be available (soft; accessible name / DOM vary by build).
   */
  async softObserveProfitDeclarationNetProfitAmountFieldVisible(): Promise<void> {
    this.logStep("Observe Net Profit last year field visible after Yes");
    const card = await this.resolveProfitDeclarationScope();
    const field = card
      .getByRole("textbox", { name: /Net Profit last year/i })
      .or(card.locator("amount").locator("#amount").first())
      .or(card.locator("input#amount").first())
      .first();
    await expect.soft(field).toBeVisible({ timeout: 20_000 });
  }

  /**
   * Zephyr **observe**: after **No**, the net-profit amount entry should be hidden or disabled (soft).
   */
  async softObserveProfitDeclarationNetProfitAmountFieldNotEditable(): Promise<void> {
    this.logStep("Observe Net Profit last year field hidden or disabled after No");
    const card = await this.resolveProfitDeclarationScope();
    const field = card
      .getByRole("textbox", { name: /Net Profit last year/i })
      .or(card.locator("amount").locator("#amount").first())
      .or(card.locator("input#amount").first())
      .first();
    if (await field.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await expect.soft(field).toBeDisabled({ timeout: 12_000 });
    } else {
      await expect.soft(field).toBeHidden({ timeout: 12_000 });
    }
  }

  /**
   * After **Next** with empty / invalid business financials, inline errors may appear.
   * With `optional: true`, failures are swallowed (copy and timing vary by product build).
   */
  async expectFinancialPositionRequiredValidationMessages(opts?: {
    optional?: boolean;
    timeoutMs?: number;
  }): Promise<void> {
    this.logStep("Expect Financial Position required validation messages");
    const optional = opts?.optional ?? false;
    const timeoutMs = opts?.timeoutMs ?? 10_000;
    const scope = this.businessFinancialRoot.or(this.soleTradeFinancialRoot).first();
    const run = async (): Promise<void> => {
      await scope.waitFor({ state: "visible", timeout: timeoutMs });
      const card = await this.resolveProfitDeclarationScope();
      const hint = card
        .getByText(/required|must (be |enter )|cannot be blank|invalid/i)
        .first()
        .or(
          scope
            .getByText(/required|must (be |enter )|cannot be blank|invalid/i)
            .first(),
        );
      await expect(hint).toBeVisible({ timeout: timeoutMs });
    };
    if (optional) {
      await run().catch(() => {});
      return;
    }
    await run();
  }

  /** Assert net-profit-last-year amount validation when $0 is not allowed (after **Next**). */
  async expectFinancialPositionNetProfitLastYearAmountGreaterThanZeroValidation(): Promise<void> {
    this.logStep("Expect Net Profit last year amount greater than zero validation");
    const card = await this.resolveProfitDeclarationScope();
    const msg = card
      .getByText(
        /greater\s+than\s*0|greater\s+than\s+zero|must\s+be\s+greater|>\s*\$?\s*0|positive|non[- ]?zero/i,
      )
      .first();
    await expect(msg).toBeVisible({ timeout: 20_000 });
  }

  /** “Net Profit last year *” (`<amount>` / `input.valueClass`). */
  async fillBusinessNetProfitLastYear(value: string): Promise<void> {
    this.logStep(`Filled business net profit last year as ${this.stepValueDisplay(value)}`);
    await Promise.any([
      this.businessFinancialRoot.waitFor({ state: "visible", timeout: 60000 }),
      this.soleTradeFinancialRoot.waitFor({ state: "visible", timeout: 60000 }),
    ]).catch(() => {
      throw new Error(
        "Financial Position: app-business-financial / app-sole-trade-financial not visible for net profit.",
      );
    });
    const card = await this.resolveProfitDeclarationScope();
  await card.waitFor({ state: "visible", timeout: 20000 });
  await card.evaluate((el: Element) => {
    (el as HTMLElement).scrollIntoView({ block: "center", behavior: "instant" });
  });
  await this.page.waitForTimeout(200);

  const trySet = async (input: Locator): Promise<boolean> => {
    if (await input.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await this.setCommittedAmount(input, value);
      return true;
    }
    return false;
  };

  const byAmountHost = card.locator("amount").locator("#amount").first();
  if (await trySet(byAmountHost)) {
    return;
  }
  const byIdInCard = card.locator("input#amount").first();
  if (await trySet(byIdInCard)) {
    return;
  }
  const valueClassInput = card
    .locator("input.p-inputtext.p-component.p-element.w-full.valueClass")
    .or(card.locator("input.valueClass[currencymask]"))
    .or(card.locator("input.valueClass"))
    .first();
  if (await trySet(valueClassInput)) {
    return;
  }

  /** DOM order: first `<amount>` under `app-business-financial` is usually net profit when the card filter misses. */
  if (await this.businessFinancialRoot.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const rootFirstAmount = this.businessFinancialRoot.locator("amount").first().locator("#amount").first();
    if (await trySet(rootFirstAmount)) {
      return;
    }
  }

  throw new Error(
    "Business Financial: no visible net profit last year amount input (<amount>/#amount, valueClass, or first business `<amount>`).",
  );
}


  /** Turnover (Latest Year) — amount + year ending. */
  async fillBusinessTurnoverLatestYear(
    amount: string,
    yearEnding: string,
  ): Promise<void> {
    this.logStep(
      `Filled business turnover (latest): amount ${this.stepValueDisplay(amount)}, year ending ${this.stepValueDisplay(yearEnding)}`,
    );
    await this.fillBusinessTurnoverRow(0, amount, yearEnding);
  }

  /** Turnover (Previous Year) — amount + year ending. */
  async fillBusinessTurnoverPreviousYear(
    amount: string,
    yearEnding: string,
  ): Promise<void> {
    this.logStep(
      `Filled business turnover (previous): amount ${this.stepValueDisplay(amount)}, year ending ${this.stepValueDisplay(yearEnding)}`,
    );
    await this.fillBusinessTurnoverRow(1, amount, yearEnding);
  }

  private async fillBusinessTurnoverRow(
    rowIndex: number,
    amount: string,
    yearEnding: string,
  ): Promise<void> {
    await Promise.any([
      this.soleTradeFinancialRoot.waitFor({ state: "visible", timeout: 15000 }),
      this.businessFinancialRoot.waitFor({ state: "visible", timeout: 15000 }),
    ]).catch(() => {});
    await this.turnoverInformationRoot.waitFor({
      state: "visible",
      timeout: 20000,
    });
    const amountHost = this.turnoverInformationRoot.locator("amount").nth(rowIndex);
    const amountInput = amountHost
      .locator("#amount")
      .or(amountHost.locator("input.p-inputtext.p-component"))
      .first();
    await this.setCommittedAmount(amountInput, amount);
    const calendarInput = this.yearEndingInputForAmountHost(amountHost);
    await this.fillYearEndingField(calendarInput, yearEnding);
  }

  /**
   * Balance Information — row order in DOM: **0** Cash, **1** Debtor, **2** Creditor, **3** Overdraft.
   */
  async fillBusinessCashBalance(amount: string, yearEnding: string): Promise<void> {
    this.logStep(
      `Filled business cash balance: ${this.stepValueDisplay(amount)}, year ending ${this.stepValueDisplay(yearEnding)}`,
    );
    await this.fillBusinessBalanceRow(0, amount, yearEnding);
  }

  async fillBusinessDebtorBalance(amount: string, yearEnding: string): Promise<void> {
    this.logStep(
      `Filled business debtor balance: ${this.stepValueDisplay(amount)}, year ending ${this.stepValueDisplay(yearEnding)}`,
    );
    await this.fillBusinessBalanceRow(1, amount, yearEnding);
  }

  async fillBusinessCreditorBalance(amount: string, yearEnding: string): Promise<void> {
    this.logStep(
      `Filled business creditor balance: ${this.stepValueDisplay(amount)}, year ending ${this.stepValueDisplay(yearEnding)}`,
    );
    await this.fillBusinessBalanceRow(2, amount, yearEnding);
  }

  async fillBusinessOverdraftBalance(amount: string, yearEnding: string): Promise<void> {
    this.logStep(
      `Filled business overdraft balance: ${this.stepValueDisplay(amount)}, year ending ${this.stepValueDisplay(yearEnding)}`,
    );
    await this.fillBusinessBalanceRow(3, amount, yearEnding);
  }

  private async fillBusinessBalanceRow(
    rowIndex: number,
    amount: string,
    yearEnding: string,
  ): Promise<void> {
    await Promise.any([
      this.soleTradeFinancialRoot.waitFor({ state: "visible", timeout: 15000 }),
      this.businessFinancialRoot.waitFor({ state: "visible", timeout: 15000 }),
    ]).catch(() => {});
    await this.balanceInformationHost.waitFor({
      state: "visible",
      timeout: 20000,
    });
    const amountHost = this.balanceInformationHost.locator("amount").nth(rowIndex);
    const amountInput = amountHost
      .locator("#amount")
      .or(amountHost.locator("input.p-inputtext.p-component"))
      .first();
    await this.setCommittedAmount(amountInput, amount);
    const calendarInput = this.yearEndingInputForAmountHost(amountHost);
    await this.fillYearEndingField(calendarInput, yearEnding);
  }

  /** Sole: **Personal Statement of Position** → **Home Ownership Type** (e.g. **Joint**). No-op if not Sole layout. */
  async selectSoleTradeHomeOwnershipType(optionLabel: string): Promise<void> {
    this.logStep(`Selected sole trader home ownership type: ${this.stepValueDisplay(optionLabel)}`);
    const host = this.page.locator("app-sole-trade-financial app-sole-trade-assets").first();
    if (!(await host.isVisible({ timeout: 5000 }).catch(() => false))) return;
    await host.scrollIntoViewIfNeeded();
    const anchor = host.getByText(/Home Ownership Type/i).first();
    await anchor.waitFor({ state: "visible", timeout: 20000 });
    const trigger = anchor
      .locator(
        "xpath=ancestor::*[.//p-dropdown or .//*[contains(@class,'p-dropdown-trigger')]][1]//*[contains(@class,'p-dropdown-trigger') or @aria-label='dropdown trigger'][1]",
      )
      .first();
    await trigger.waitFor({ state: "visible", timeout: 15000 });
    await trigger.click({ timeout: 15000 });
    await this.pickDropdownOption(optionLabel);
  }

  /**
   * Sole: amount beside **Home Ownership Type** (`<amount>` → `p-floatlabel` / `#amount` / `valueClass` input).
   * SelectorHub path: `... amount > div > p-floatlabel > span > input` (first assets form row).
   * No-op if not Sole layout.
   */
  async fillSoleTradeHomeOwnershipAmount(value: string): Promise<void> {
    this.logStep(`Filled sole trader home ownership amount as ${this.stepValueDisplay(value)}`);
    const host = this.page.locator("app-sole-trade-financial app-sole-trade-assets").first();
    if (!(await host.isVisible({ timeout: 5000 }).catch(() => false))) return;
    await host.scrollIntoViewIfNeeded();

    const tryFill = async (loc: Locator): Promise<boolean> => {
      if ((await loc.count()) === 0) return false;
      const target = loc.first();
      if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) return false;
      await this.setCommittedAmount(target, value);
      return true;
    };

    const form = host.locator("form").first();
    const firstAmountHost = form.locator("amount").first();
    // Row 1 = Home Ownership (per app layout).
    if (await tryFill(firstAmountHost.locator("#amount"))) return;
    if (await tryFill(firstAmountHost.locator("p-floatlabel input.p-inputtext"))) return;
    if (
      await tryFill(
        firstAmountHost.locator("input.p-inputtext.p-component.p-element.w-full.valueClass"),
      )
    )
      return;
    if (await tryFill(firstAmountHost.locator("div input.p-inputtext.p-component"))) return;
    if (await tryFill(firstAmountHost.locator("input.p-inputtext"))) return;

    const label = host.getByText(/Home Ownership Type/i).first();
    await label.scrollIntoViewIfNeeded().catch(() => {});
    const rowWithAmount = label.locator("xpath=ancestor::*[.//amount][1]");
    const amountInRow = rowWithAmount.locator("amount").first();
    if (await tryFill(amountInRow.locator("#amount"))) return;
    if (await tryFill(amountInRow.locator("p-floatlabel input.p-inputtext"))) return;
    if (
      await tryFill(
        amountInRow.locator("input.p-inputtext.p-component.p-element.w-full.valueClass"),
      )
    )
      return;
    if (await tryFill(amountInRow.locator("input.p-inputtext"))) return;

    const card = host
      .locator("gen-card, p-card")
      .filter({ hasText: /Personal Statement of Position|Assets/i })
      .first();
    if ((await card.count()) > 0) {
      const am = card.locator("amount").first();
      if (await tryFill(am.locator("#amount"))) return;
      if (await tryFill(am.locator("p-floatlabel input.p-inputtext"))) return;
      if (
        await tryFill(
          am.locator("input.p-inputtext.p-component.p-element.w-full.valueClass"),
        )
      )
        return;
      if (await tryFill(am.locator("input.p-inputtext"))) return;
    }

    throw new Error(
      "Sole assets: could not find Home Ownership amount input (expected <amount> / p-floatlabel input in first form row).",
    );
  }

  /**
   * Sole: **Liabilities** → **Mortgage / Rent** monthly amount (`app-sole-trade-liabilities` + `<amount>`).
   * Row scoping uses label → ancestor with `amount` (same pattern as home ownership); avoids
   * `filter({ has: host.getByText })` on `div,form`, which often misses the real amount cell.
   * No-op if not Sole layout.
   */
  async fillSoleTradeMortgageRentMonthlyAmount(value: string): Promise<void> {
    this.logStep(`Filled sole trader mortgage/rent monthly as ${this.stepValueDisplay(value)}`);
    const host = this.page.locator("app-sole-trade-financial app-sole-trade-liabilities").first();
    if (!(await host.isVisible({ timeout: 5000 }).catch(() => false))) return;
    await host.scrollIntoViewIfNeeded();

    const tryFill = async (loc: Locator): Promise<boolean> => {
      if ((await loc.count()) === 0) return false;
      const target = loc.first();
      if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) return false;
      await this.setCommittedAmount(target, value);
      return true;
    };

    const mortgageLabel = host.getByText(/Mortgage\s*\/\s*Rent/i).first();
    await mortgageLabel.waitFor({ state: "visible", timeout: 20000 });
    await mortgageLabel.scrollIntoViewIfNeeded();

    const rowWithAmount = mortgageLabel.locator("xpath=ancestor::*[.//amount][1]");
    const amountHost = rowWithAmount.locator("amount").first();

    if (await tryFill(amountHost.locator("#amount"))) return;
    if (await tryFill(amountHost.locator("p-floatlabel input.p-inputtext"))) return;
    if (
      await tryFill(
        amountHost.locator("input.p-inputtext.p-component.p-element.w-full.valueClass"),
      )
    )
      return;
    if (await tryFill(amountHost.locator("div input.p-inputtext.p-component"))) return;
    if (await tryFill(amountHost.locator("input.p-inputtext"))) return;

    if (
      await tryFill(
        rowWithAmount.locator("input.p-inputtext.p-component.p-element.w-full.valueClass").first(),
      )
    )
      return;
    if (await tryFill(rowWithAmount.locator("p-floatlabel input.p-inputtext").first())) return;
    if (await tryFill(rowWithAmount.locator("input.p-inputtext").first())) return;

    const card = host
      .locator("gen-card, p-card")
      .filter({ hasText: /Liabilities/i })
      .first();
    if ((await card.count()) > 0 && (await card.isVisible({ timeout: 2000 }).catch(() => false))) {
      const firstRowAmount = card.locator("amount").first();
      if (await tryFill(firstRowAmount.locator("#amount"))) return;
      if (await tryFill(firstRowAmount.locator("p-floatlabel input.p-inputtext"))) return;
      if (
        await tryFill(
          firstRowAmount.locator("input.p-inputtext.p-component.p-element.w-full.valueClass"),
        )
      )
        return;
      if (await tryFill(firstRowAmount.locator("input.p-inputtext"))) return;
    }

    throw new Error(
      "Sole liabilities: could not find Mortgage / Rent monthly amount input (expected <amount> / p-floatlabel / valueClass in row).",
    );
  }

  async clickNextButton(): Promise<void> {
    this.logStep("Click Next Button");
    await this.nextButton.waitFor({ state: "visible", timeout: 60000 });
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
  }
}
