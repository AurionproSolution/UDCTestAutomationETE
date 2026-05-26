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

  async waitForFinancialPositionStep(): Promise<void> {
    await this.financialRoot
      .or(this.businessFinancialRoot)
      .or(this.soleTradeFinancialRoot)
      .or(this.trustFinancialRoot)
      .first()
      .waitFor({ state: "visible", timeout: 120000 });
  }

  async waitForTrustFinancialPositionStep(): Promise<void> {
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
   * Trust profit radios: **No** then **Yes** so the Net Profit amount control is shown and bound reliably
   * (`isNetProfitLastYear` — hidden native `input` on `p-radiobutton`).
   */
  async primeTrustNetProfitLastYearNoThenYes(): Promise<void> {
    const host = this.trustProfitDeclarationHost();
    await host.waitFor({ state: "visible", timeout: 60_000 });
    await host.scrollIntoViewIfNeeded().catch(() => {});

    const noInput = host.locator('input[type="radio"][name="isNetProfitLastYear"][value="false"]');
    const yesInput = host.locator('input[type="radio"][name="isNetProfitLastYear"][value="true"]');
    await noInput.waitFor({ state: "attached", timeout: 15_000 });
    await noInput.click({ force: true });
    await this.page.waitForTimeout(350);
    await yesInput.click({ force: true });
    await this.page.waitForTimeout(450);

    const netRow = host.locator("amount").locator("#amount").first();
    await netRow.waitFor({ state: "visible", timeout: 20_000 });
  }

  /** “Net Profit last year” currency field (after Yes). */
  async fillTrustNetProfitLastYear(value: string): Promise<void> {
    const host = this.trustProfitDeclarationHost();
    await host.waitFor({ state: "visible", timeout: 30_000 });
    const input = host.locator("amount").locator("#amount").first();
    await this.setCommittedAmount(input, value);
  }

  /** Turnover **(Latest Year)** — amount + Year Ending only (Previous row left to app defaults unless you fill it). */
  async fillTrustTurnoverLatestYear(amount: string, yearEnding: string): Promise<void> {
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
    const host = this.trustBalanceHost();
    await host.waitFor({ state: "visible", timeout: 30_000 });
    const amountHost = host.locator("amount").nth(rowIndex);
    const amountInput = amountHost.locator("#amount").first();
    await this.setCommittedAmount(amountInput, amount);
  }

  /** If a balance row’s Year Ending is still empty, set it (e.g. when propagation did not run). */
  async fillTrustBalanceRowYearEndingIfEmpty(rowIndex: number, yearEnding: string): Promise<void> {
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
    await this.fillTrustAssetAmountByRowLabel(/Personal Property/i, value);
  }

  async fillTrustVehicleValueAmount(value: string): Promise<void> {
    await this.fillTrustAssetAmountByRowLabel(/Vehicle Value/i, value);
  }

  /** “Other” asset row — amount beside `financialAssetType` dropdown. */
  async fillTrustOtherAssetAmount(value: string): Promise<void> {
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
    await this.fillTrustLiabilityMonthlyByLabel(/Mortgage\s*\/\s*Rent/i, value);
  }

  async fillTrustLoansMonthlyAmount(value: string): Promise<void> {
    await this.fillTrustLiabilityMonthlyByLabel(/\bLoans\b/i, value);
  }

  async fillTrustCreditCardsMonthlyAmount(value: string): Promise<void> {
    await this.fillTrustLiabilityMonthlyByLabel(/Credit Cards/i, value);
  }

  async fillTrustOtherLiabilitiesMonthlyAmount(value: string): Promise<void> {
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
    const fields = this.amountInputsInCard(this.liabilitiesCard);
    await this.setCommittedAmount(fields.nth(0), balanceLimit);
    await this.setCommittedAmount(fields.nth(1), amount);
  }

  /** Liabilities — first row frequency column → Monthly. */
  async setFirstLiabilityRowFrequencyMonthly(): Promise<void> {
    const card = this.liabilitiesCard;
    const freqCell = card.locator(
      "form > div > div:nth-child(1) > div:nth-child(1) > div:nth-child(4)",
    );
    const trigger = freqCell.locator(".p-dropdown-trigger").first();
    await trigger.waitFor({ state: "visible", timeout: 15000 });
    await trigger.click();
    await this.pickDropdownOption("Monthly");
  }

  /** Income details — first row (e.g. Take Home Pay) amount. */
  async fillFirstIncomeAmount(value: string): Promise<void> {
    const input = this.amountInputsInCard(this.incomeDetailsCard).first();
    await this.setCommittedAmount(input, value);
  }

  /** Income frequency — QAT trigger id `#pn_id_107_2`, then Monthly. */
  async setIncomeFrequencyMonthly(): Promise<void> {
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
    const input = this.amountInputsInCard(this.expenditureCard).first();
    await this.setCommittedAmount(input, value);
  }

  /** Expenditure frequency — `#pn_id_111_2`, then Monthly. */
  async setExpenditureFrequencyMonthly(): Promise<void> {
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

  async fillIndividualVehicleValueAmount(value: string): Promise<void> {
    const input = this.amountInputInIndividualCardRow(
      this.individualAssetDetailsCard,
      /Vehicle Value/i,
    );
    await this.setCommittedAmount(input, value);
  }

  async fillIndividualFurnitureEffectsValueAmount(value: string): Promise<void> {
    const input = this.amountInputInIndividualCardRow(
      this.individualAssetDetailsCard,
      /Furniture\s*&\s*Effects Value/i,
    );
    await this.setCommittedAmount(input, value);
  }

  /** Other asset row — `financialAssetType` must be a real option (clears “Select a valid value”). */
  async selectIndividualOtherFinancialAssetType(optionLabel: string): Promise<void> {
    const card = this.individualAssetDetailsCard;
    await card.waitFor({ state: "visible", timeout: 30_000 });
    const dd = card.locator(`p-dropdown[formcontrolname="financialAssetType"]`).first();
    const trigger = dd.locator(".p-dropdown-trigger, [aria-label='dropdown trigger']").first();
    await trigger.waitFor({ state: "visible", timeout: 20_000 });
    await trigger.click({ timeout: 15_000 });
    await this.pickDropdownOption(optionLabel);
  }

  async fillIndividualOtherFinancialAssetAmount(value: string): Promise<void> {
    const card = this.individualAssetDetailsCard;
    const host = card.locator(`amount[formcontrolname="financialAssetTypeAmount"]`).first();
    const input = host.locator("#amount").first();
    await this.setCommittedAmount(input, value);
  }

  /** Income — second row (e.g. **Spouse / Partner Pay**) amount. */
  async fillSecondIncomeRowAmount(value: string): Promise<void> {
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
    await this.incomeDetailsCard.waitFor({ state: "visible", timeout: 30_000 });
    await this.setRowFrequencyMonthlyInCard(this.incomeDetailsCard, /Take Home Pay/i);
  }

  async setSpousePartnerPayFrequencyMonthly(): Promise<void> {
    await this.incomeDetailsCard.waitFor({ state: "visible", timeout: 30_000 });
    await this.setRowFrequencyMonthlyInCard(this.incomeDetailsCard, /Spouse\s*\/\s*Partner Pay/i);
  }

  /** “Is your income likely to decrease…” → **Yes** (shows **Details** textarea). */
  async selectIncomeLikelyToDecreaseYes(): Promise<void> {
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
    const ta = this.incomeDecreaseDetailsTextarea();
    await expect(ta).toBeVisible({ timeout: 15_000 });
    await expect(ta).toBeEnabled({ timeout: 10_000 });
  }

  async expectIncomeDecreaseDetailsTextareaHiddenOrDisabled(): Promise<void> {
    const ta = this.incomeDecreaseDetailsTextarea();
    const visible = await ta.isVisible().catch(() => false);
    if (!visible) {
      await expect(ta).toBeHidden({ timeout: 10_000 });
      return;
    }
    await expect(ta).toBeDisabled({ timeout: 10_000 });
  }

  async fillIncomeDecreaseDetails(text: string): Promise<void> {
    const ta = this.incomeDecreaseDetailsTextarea();
    await ta.waitFor({ state: "visible", timeout: 15_000 });
    await ta.fill(text);
    await ta.press("Tab").catch(() => {});
    await this.page.waitForTimeout(200);
  }

  async fillExpenditureAmountByLabel(labelRx: RegExp, value: string): Promise<void> {
    const input = this.amountInputInIndividualCardRow(this.expenditureCard, labelRx);
    await this.setCommittedAmount(input, value);
  }

  async setExpenditureRowFrequencyMonthlyByLabel(labelRx: RegExp): Promise<void> {
    await this.expenditureCard.waitFor({ state: "visible", timeout: 30_000 });
    await this.setRowFrequencyMonthlyInCard(this.expenditureCard, labelRx);
  }

  /** Essential Outgoings — outgoing type combobox should show **Other** by default (`recurringDescription`). */
  async expectEssentialOutgoingTypeDefaultOther(): Promise<void> {
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

  /** CSA-B **Financial Accounts** or **Sole Trader** — “Did you make a Net Profit last year?” → **Yes**. */
  async selectBusinessNetProfitLastYearYes(): Promise<void> {
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

    const yesAlready = card.locator("p-radiobutton.p-radiobutton-checked").filter({
      hasText: "Yes",
    });
    if (await yesAlready.isVisible({ timeout: 800 }).catch(() => false)) {
      return;
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

    const yesBoxes = card.locator("p-radiobutton").filter({ hasText: "Yes" });
    const yesBox = yesBoxes.locator(".p-radiobutton-box").first();
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

  /** “Net Profit last year *” (`<amount>` / `input.valueClass`). */
  async fillBusinessNetProfitLastYear(value: string): Promise<void> {
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
    const byAmountHost = card.locator("amount").locator("#amount").first();
    if (await byAmountHost.isVisible({ timeout: 4000 }).catch(() => false)) {
      await this.setCommittedAmount(byAmountHost, value);
      return;
    }
    const valueClassInput = card
      .locator("input.p-inputtext.p-component.p-element.w-full.valueClass")
      .first();
    await this.setCommittedAmount(valueClassInput, value);
  }

  /** Turnover (Latest Year) — amount + year ending. */
  async fillBusinessTurnoverLatestYear(
    amount: string,
    yearEnding: string,
  ): Promise<void> {
    await this.fillBusinessTurnoverRow(0, amount, yearEnding);
  }

  /** Turnover (Previous Year) — amount + year ending. */
  async fillBusinessTurnoverPreviousYear(
    amount: string,
    yearEnding: string,
  ): Promise<void> {
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
    await this.fillBusinessBalanceRow(0, amount, yearEnding);
  }

  async fillBusinessDebtorBalance(amount: string, yearEnding: string): Promise<void> {
    await this.fillBusinessBalanceRow(1, amount, yearEnding);
  }

  async fillBusinessCreditorBalance(amount: string, yearEnding: string): Promise<void> {
    await this.fillBusinessBalanceRow(2, amount, yearEnding);
  }

  async fillBusinessOverdraftBalance(amount: string, yearEnding: string): Promise<void> {
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
    await this.nextButton.waitFor({ state: "visible", timeout: 60000 });
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
  }
}
