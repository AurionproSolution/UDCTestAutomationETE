import { Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

/**
 * Step — Financial Position:
 * - **Individual:** `app-financial-position` (Liabilities, Income, Expenditure, Essential Outgoings).
 * - **CSA-B business:** `app-business-financial` (Profit declaration, Turnover, Balance information).
 * - **Sole Trader:** `app-sole-trade-financial` + `app-sole-trade-profit-declaration`, `app-sole-trade-turnover-info`,
 *   `app-sole-trade-assets`, `app-sole-trade-liabilities` (same business-style fields, different hosts).
 * PrimeNG ids (`#pn_id_*`) are fallbacks — they can change between builds.
 */
export class DOFinancialPositionPage extends BasePage {
  readonly financialRoot: Locator;
  /** CSA-B business entity — Financial Accounts step. */
  readonly businessFinancialRoot: Locator;
  /** Sole Trader — Financial Position step (parallel to `app-business-financial`). */
  readonly soleTradeFinancialRoot: Locator;
  readonly turnoverInformationRoot: Locator;
  /** `app-balance-information` or a card titled “Balance Information” under `app-business-financial`. */
  readonly balanceInformationHost: Locator;
  readonly liabilitiesCard: Locator;
  readonly incomeDetailsCard: Locator;
  readonly expenditureCard: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);
    this.financialRoot = page.locator("app-financial-position").first();
    this.businessFinancialRoot = page.locator("app-business-financial").first();
    this.soleTradeFinancialRoot = page.locator("app-sole-trade-financial").first();
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
    this.nextButton = page.getByRole("button", { name: "Next" }).last();
  }

  async waitForFinancialPositionStep(): Promise<void> {
    await this.financialRoot
      .or(this.businessFinancialRoot)
      .or(this.soleTradeFinancialRoot)
      .first()
      .waitFor({ state: "visible", timeout: 120000 });
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

  /** Region containing “Regular Recurring Essential Outgoings” and its `p-dropdown` rows. */
  private essentialOutgoingsSection(): Locator {
    const heading = this.financialRoot
      .getByText(/Regular Recurring Essential Outgoings/i)
      .first();
    return heading
      .locator(
        "xpath=ancestor::div[.//div[contains(@class,'p-dropdown-trigger')] or .//p-dropdown][1]",
      )
      .first();
  }

  /** Outgoing type → **Lifestyle** (`#pn_id_93_2` or first row’s first PrimeNG dropdown). */
  async selectEssentialOutgoingTypeLifestyle(): Promise<void> {
    const section = this.essentialOutgoingsSection();
    await section.scrollIntoViewIfNeeded();

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

    await trigger.scrollIntoViewIfNeeded();
    await trigger.click({ timeout: 15000 });
    await this.page.locator(".p-dropdown-panel").waitFor({
      state: "visible",
      timeout: 10000,
    });
    await this.pickDropdownOption("Lifestyle");
  }

  /** Amount in Regular Recurring Essential Outgoings row. */
  async fillEssentialOutgoingAmount(value: string): Promise<void> {
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

  /** Essential Outgoings row frequency → **Monthly** (`#pn_id_95_2` or second row dropdown). */
  async setEssentialOutgoingFrequencyMonthly(): Promise<void> {
    const section = this.essentialOutgoingsSection();
    await section.scrollIntoViewIfNeeded();

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
    if (await triggerFromId.isVisible({ timeout: 2000 }).catch(() => false)) {
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

    await trigger.scrollIntoViewIfNeeded();
    await trigger.click({ timeout: 15000 });
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
