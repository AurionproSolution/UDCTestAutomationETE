/**
 * RSS Apply Now — About You step: Financial Position, income / profit radios, footer Next.
 * Covers Individual borrower flows and Business-only questions where shared.
 */

import { expect, type Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export class RSSApplyNowAboutYouIndividualPage extends BasePage {
  private static readonly SPINNER_WAIT_MS = 300_000;

  constructor(page: Page) {
    super(page);
  }

  protected stepLogPrefix(): string {
    return "RSS Apply Now — About you";
  }

  private async waitForProgressSpinnersHidden(
    timeoutMs = RSSApplyNowAboutYouIndividualPage.SPINNER_WAIT_MS,
  ): Promise<void> {
    await expect
      .poll(
        async () => {
          const items = this.page.locator("p-progressspinner");
          const count = await items.count();
          for (let i = 0; i < count; i++) {
            if (await items.nth(i).isVisible().catch(() => false)) {
              return false;
            }
          }
          return true;
        },
        { timeout: timeoutMs, intervals: [200, 400, 800, 1500] },
      )
      .toBe(true);
  }

  /** After asset/repayment "Next", stepper shows About You / Borrower. */
  async waitForAboutYouStep(): Promise<void> {
    this.logStep("Wait For About You Step");
    await expect(this.page.getByText(/About You/i).first()).toBeVisible({
      timeout: 120_000,
    });
    await this.waitForLoadingComplete();
  }

  /**
   * SelectorHub: `(//*[name()='svg'][@class='p-icon'])[5]` — reveals Financial Position / Income block on QAT.
   */
  async clickFinancialPositionPerSelectorHub(): Promise<void> {
    this.logStep("Click Financial Position Per Selector Hub");
    await this.waitForProgressSpinnersHidden();
    const icon = this.page.locator('xpath=(//*[name()="svg"][@class="p-icon"])[5]');
    await icon.waitFor({ state: "visible", timeout: 30_000 });
    await this.scrollIfNeeded(icon);
    await this.clickElement(icon, 60_000);
    await this.waitForLoadingComplete();
  }

  /**
   * Business: "Did you make a profit last year?" — **Yes** / **No** (`getByRole('radio')`, `input[value]`, or label in the same block as the question).
   */
  async selectMadeProfitLastYear(answer: "yes" | "no"): Promise<void> {
    this.logStep("Select Made Profit Last Year");
    await this.waitForProgressSpinnersHidden();
    const q = this.page.getByText(/Did you make a profit last year\??\s*\*?/i).first();
    await q.waitFor({ state: "visible", timeout: 45_000 });
    await q.scrollIntoViewIfNeeded();

    const namePat = answer === "yes" ? /^Yes$/i : /^No$/i;
    const val = answer === "yes" ? "true" : "false";
    const block = this.page
      .locator("ion-row, form, ion-item, ion-card, ion-card-content, section")
      .filter({ has: this.page.getByText(/Did you make a profit last year/i) })
      .first();

    const tryClick = async (loc: Locator): Promise<boolean> => {
      if (!(await loc.isVisible({ timeout: 5_000 }).catch(() => false))) return false;
      await this.scrollIfNeeded(loc);
      try {
        await this.clickElement(loc, 30_000);
      } catch {
        await loc.click({ force: true, timeout: 30_000 });
      }
      return true;
    };

    if (await tryClick(block.getByRole("radio", { name: namePat }).first())) {
      await this.waitForLoadingComplete();
      return;
    }
    if (await tryClick(this.page.getByRole("radio", { name: namePat }).first())) {
      await this.waitForLoadingComplete();
      return;
    }

    const inputInBlock = block
      .locator(
        answer === "yes"
          ? 'input[type="radio"][value="true"], input[type="radio"][value="yes"]'
          : 'input[type="radio"][value="false"], input[type="radio"][value="no"]',
      )
      .first();
    if (await tryClick(inputInBlock)) {
      await this.waitForLoadingComplete();
      return;
    }

    const label = block.getByText(answer === "yes" ? /^Yes$/i : /^No$/i, { exact: true }).first();
    if (await tryClick(label)) {
      await this.waitForLoadingComplete();
      return;
    }

    throw new Error(
      `Could not select "${answer}" for "Did you make a profit last year?" (radios / labels).`,
    );
  }

  /**
   * Business — **Net Profit (Last Year)** (dollars). Use after {@link selectMadeProfitLastYear}("yes") when the field is visible.
   */
  async fillNetProfitLastYearDollars(amount: string): Promise<void> {
    this.logStep("Fill Net Profit Last Year Dollars");
    await this.waitForProgressSpinnersHidden();
    await this.page
      .getByText(/Net Profit\s*\(?\s*Last Year\s*\)?\s*\*?/i)
      .first()
      .waitFor({ state: "visible", timeout: 30_000 });

    const byLabel = this.page.getByLabel(/Net Profit\s*\(?\s*Last Year\s*\)?/i);
    if (await byLabel.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await this.scrollIfNeeded(byLabel);
      await this.clickAndFillElement(byLabel, amount);
      await this.page.keyboard.press("Tab");
      await this.waitForLoadingComplete();
      return;
    }

    const profitBlock = this.page
      .locator("ion-item, ion-row, ion-card-content")
      .filter({ has: this.page.getByText(/Net Profit\s*\(?\s*Last Year/i) })
      .first();
    const input = profitBlock.locator("ion-input input, input").filter({ visible: true }).first();
    await input.waitFor({ state: "visible", timeout: 15_000 });
    await this.scrollIfNeeded(input);
    await this.clickAndFillElement(input, amount);
    await this.page.keyboard.press("Tab");
    await this.waitForLoadingComplete();
  }

  /**
   * "Is your income likely to decrease over the next 12 months?" — **No** (`incomeChange` / `value="false"`).
   * Prefer this over `input.custom-radio.ng-*` — Angular strips `ng-invalid` after selection.
   */
  async selectIncomeNotLikelyToDecreaseNo(): Promise<void> {
    this.logStep("Select Income Not Likely To Decrease No");
    const no = this.page.locator(
      'input[type="radio"][formcontrolname="incomeChange"][value="false"]',
    );
    await no.first().waitFor({ state: "attached", timeout: 30_000 });
    await this.scrollIfNeeded(no.first());
    try {
      await this.clickElement(no.first(), 30_000);
    } catch {
      await no.first().click({ force: true, timeout: 30_000 });
    }
    await this.waitForLoadingComplete();
  }

  /** Apply Now footer — SelectorHub `page.locator(':text-is("Next")')`. */
  async clickApplyNowFooterNext(clickTimeoutMs = 60_000): Promise<void> {
    this.logStep("Click Apply Now Footer Next");
    await this.waitForProgressSpinnersHidden();
    const next = this.page
      .locator(':text-is("Next")')
      .filter({ visible: true })
      .first();
    await next.waitFor({ state: "visible", timeout: 30_000 });
    await this.scrollIfNeeded(next);
    await this.clickElement(next, clickTimeoutMs);
    await this.waitForLoadingComplete();
  }
}
