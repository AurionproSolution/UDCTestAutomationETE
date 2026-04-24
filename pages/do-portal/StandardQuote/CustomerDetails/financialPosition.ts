import { Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

/**
 * Step 4 — Financial Position (`app-financial-position`): Liabilities, Income, Expenditure,
 * income-decrease radios, and Regular Recurring Essential Outgoings.
 * PrimeNG ids (`#pn_id_*`) are fallbacks — they can change between builds.
 */
export class DOFinancialPositionPage extends BasePage {
  readonly financialRoot: Locator;
  readonly liabilitiesCard: Locator;
  readonly incomeDetailsCard: Locator;
  readonly expenditureCard: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);
    this.financialRoot = page.locator("app-financial-position").first();
    this.liabilitiesCard = page.locator("app-individual-liabilities").first();
    this.incomeDetailsCard = page.locator("app-income-details").first();
    this.expenditureCard = page.locator("app-individual-expenditure").first();
    this.nextButton = page.getByRole("button", { name: "Next" }).last();
  }

  async waitForFinancialPositionStep(): Promise<void> {
    await this.financialRoot.waitFor({ state: "visible", timeout: 120000 });
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

  async clickNextButton(): Promise<void> {
    await this.nextButton.waitFor({ state: "visible", timeout: 60000 });
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
  }
}
