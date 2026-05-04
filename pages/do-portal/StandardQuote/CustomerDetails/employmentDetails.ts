import { Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

/**
 * Step: Employment Details (`app-employment-details`).
 * Toggle "Have the Employment Details Changed?" reveals `app-previous-employment`.
 */
export class DOEmploymentDetailsPage extends BasePage {
  readonly employmentRoot: Locator;
  readonly currentEmploymentRoot: Locator;
  readonly previousEmploymentRoot: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    super(page);
    // Visible `app-sole-trade` only — avoids hidden shells / duplicate hosts so `waitFor` does not hang.
    const sole = page.locator("app-sole-trade").filter({ visible: true }).first();

    this.employmentRoot = sole
      .locator("app-employment-details")
      .first()
      .or(page.locator("app-employment-details").filter({ visible: true }).first())
      .or(sole);

    // Prefer PrimeNG / gen **card** that contains "Current Employment" — labels stay scoped; avoids
    // whole-`app-sole-trade` matching an "Occupation" label from another step fragment still in DOM.
    const currentEmploymentCard = sole
      .locator("gen-card, p-card")
      .filter({ hasText: /Current Employment/i })
      .first();
    const currentInSole = sole.locator("app-current-employment").first();
    const currentGlobalVisible = page.locator("app-current-employment").filter({ visible: true }).first();
    this.currentEmploymentRoot = currentEmploymentCard
      .or(currentInSole)
      .or(currentGlobalVisible)
      .or(sole);

    this.previousEmploymentRoot = sole
      .locator("app-previous-employment")
      .filter({ visible: true })
      .first()
      .or(page.locator("app-previous-employment").filter({ visible: true }).first());

    this.nextButton = page.getByRole("button", { name: "Next" }).last();
  }

  /** Row for "Have the Employment Details Changed?" — avoid `.first()` slider in the whole card (wrong control). */
  private employmentDetailsChangedRow(): Locator {
    return this.employmentRoot
      .getByText(/Have the Employment Details Changed\??/i)
      .first()
      .locator(
        "xpath=ancestor::div[.//p-inputswitch or .//span[contains(@class,'p-inputswitch')]][1]",
      );
  }

  async waitForEmploymentDetailsStep(): Promise<void> {
    await this.page
      .locator(".app-loader-overlay, .p-blockui, .p-progress-spinner, p-progressspinner")
      .first()
      .waitFor({ state: "hidden", timeout: 120000 })
      .catch(() => {});

    // Step chrome (optional) — helps when the route changed but overlays hid the form briefly.
    await this.page
      .getByText(/Employment Details/i)
      .first()
      .waitFor({ state: "visible", timeout: 60000 })
      .catch(() => {});

    const sole = this.page.locator("app-sole-trade").filter({ visible: true }).first();
    const employmentChanged = sole.getByText(/Have the Employment Details Changed\??/i).first();
    const empCard = sole.locator("gen-card, p-card").filter({ hasText: /Current Employment/i }).first();
    const byEmployerSole = sole.getByRole("textbox", { name: /Employer Name/i }).first();
    const byEmployerLoose = sole.getByRole("textbox", { name: /Employer/i }).first();
    const byEmployerLabel = sole.getByLabel(/Employer Name/i).first();
    const byEmployerPage = this.page.getByRole("textbox", { name: /Employer Name/i }).first();
    const byCardTitle = sole.getByText(/^Current Employment$/i).first();
    const nestedCurrent = sole.locator("app-current-employment").first();
    const globalCurrent = this.page.locator("app-current-employment").filter({ visible: true }).first();

    const timeout = 120000;
    // `Promise.any`: first success wins. UI may expose Employer as non-textbox or omit `app-current-employment`.
    try {
      await Promise.any([
        employmentChanged.waitFor({ state: "visible", timeout }),
        empCard.waitFor({ state: "visible", timeout }),
        byEmployerSole.waitFor({ state: "visible", timeout }),
        byEmployerLoose.waitFor({ state: "visible", timeout }),
        byEmployerLabel.waitFor({ state: "visible", timeout }),
        byEmployerPage.waitFor({ state: "visible", timeout }),
        byCardTitle.waitFor({ state: "visible", timeout }),
        nestedCurrent.waitFor({ state: "visible", timeout }),
        globalCurrent.waitFor({ state: "visible", timeout }),
      ]);
    } catch {
      throw new Error(
        "Employment Details step: form not ready (no visible Employment question, Current Employment card, Employer field, or app-current-employment).",
      );
    }
  }

  /** Turns on "Have the Employment Details Changed?" so Previous Employment is shown. */
  async turnOnEmploymentDetailsChanged(): Promise<void> {
    await this.employmentRoot.waitFor({ state: "visible", timeout: 60000 });
    if (await this.previousEmploymentRoot.isVisible().catch(() => false)) {
      return;
    }

    const row = this.employmentDetailsChangedRow();
    await row.waitFor({ state: "visible", timeout: 15000 });

    const switchByRole = this.employmentRoot.getByRole("switch", {
      name: /Employment Details Changed/i,
    });
    const hiddenInput = row.locator("p-inputswitch input[type='checkbox']").first();
    const slider = row.locator("span.p-inputswitch-slider").first();

    const clickToggle = async (): Promise<void> => {
      await row.scrollIntoViewIfNeeded();
      if (await switchByRole.isVisible({ timeout: 1500 }).catch(() => false)) {
        await switchByRole.click();
        return;
      }
      if (await hiddenInput.isVisible({ timeout: 500 }).catch(() => false)) {
        await hiddenInput.click({ force: true });
        return;
      }
      await slider.click();
    };

    await clickToggle();
    try {
      await this.previousEmploymentRoot.waitFor({
        state: "visible",
        timeout: 8000,
      });
      return;
    } catch {
      /* still hidden — try one more toggle (missed control or was already on wrong side) */
    }

    await clickToggle();
    await this.previousEmploymentRoot.waitFor({
      state: "visible",
      timeout: 25000,
    });
  }

  /**
   * Turns the "Employment Details Changed?" switch off so Previous Employment hides
   * (use when you need to assert both states; avoid before Next if the step validates previous data).
   */
  async turnOffEmploymentDetailsChanged(): Promise<void> {
    await this.employmentRoot.waitFor({ state: "visible", timeout: 60000 });
    if (!(await this.previousEmploymentRoot.isVisible().catch(() => false))) {
      return;
    }
    const row = this.employmentDetailsChangedRow();
    await row.waitFor({ state: "visible", timeout: 15000 });
    const switchByRole = this.employmentRoot.getByRole("switch", {
      name: /Employment Details Changed/i,
    });
    const hiddenInput = row.locator("p-inputswitch input[type='checkbox']").first();
    const slider = row.locator("span.p-inputswitch-slider").first();
    await row.scrollIntoViewIfNeeded();
    if (await switchByRole.isVisible({ timeout: 1500 }).catch(() => false)) {
      await switchByRole.click();
    } else if (await hiddenInput.isVisible({ timeout: 500 }).catch(() => false)) {
      await hiddenInput.click({ force: true });
    } else {
      await slider.click();
    }
    await this.previousEmploymentRoot
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => {});
    await this.page.waitForTimeout(400);
  }

  /**
   * Prefer **Current Employment** `gen-card` / `p-card` so dropdown triggers are not resolved from
   * an unrelated `app-sole-trade` subtree (trace: Occupation trigger not visible on whole shell).
   */
  private async resolveEmploymentFormRoot(): Promise<Locator> {
    const sole = this.page.locator("app-sole-trade").filter({ visible: true }).first();
    const card = sole.locator("gen-card, p-card").filter({ hasText: /Current Employment/i }).first();
    if (await card.isVisible({ timeout: 10000 }).catch(() => false)) return card;
    const nested = sole.locator("app-current-employment").first();
    if ((await nested.count()) > 0 && (await nested.isVisible({ timeout: 5000 }).catch(() => false)))
      return nested;
    return this.currentEmploymentRoot;
  }

  /**
   * PrimeNG dropdown in Current/Previous Employment — QAT uses `label` + following-sibling
   * (same pattern as Personal Details), not always `text` custom elements.
   */
  private async selectDropdownInEmploymentCard(
    root: Locator,
    labelNeedle: string,
    optionName: string,
  ): Promise<void> {
    const q = labelNeedle.replace(/'/g, "");
    const primary = root.locator(
      `xpath=.//label[contains(normalize-space(.),'${q}')]/following-sibling::*//div[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]`,
    );
    const fallback = root
      .locator("label")
      .filter({ hasText: new RegExp(q, "i") })
      .first()
      .locator(
        "xpath=following::button[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
      );

    let trigger: Locator = (await primary.isVisible({ timeout: 4000 }).catch(() => false))
      ? primary
      : fallback;

    const byRoleCombo = root.getByRole("combobox", { name: new RegExp(q, "i") }).first();
    if (
      !(await trigger.isVisible({ timeout: 1500 }).catch(() => false)) &&
      (await byRoleCombo.isVisible({ timeout: 4000 }).catch(() => false))
    ) {
      trigger = byRoleCombo;
    }

    await trigger.waitFor({ state: "visible", timeout: 20000 });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const rxOpt = new RegExp(
      `^${optionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i",
    );
    const opt = this.page.getByRole("option", { name: rxOpt }).first();
    await opt.waitFor({ state: "visible", timeout: 15000 });
    await opt.click();
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  /** Current — Employer Name (`getByLabel`, roles, gen-text, SelectorHub row). */
  private employerNameInputFor(r: Locator): Locator {
    return r
      .getByLabel(/Employer Name/i)
      .first()
      .or(r.getByRole("textbox", { name: /Employer Name/i }).first())
      .or(r.getByRole("textbox", { name: /^Employer\b/i }).first())
      .or(r.locator("text").filter({ hasText: /^Employer Name/i }).locator("#text").first())
      .or(r.locator("text").filter({ hasText: /^Employer Name/i }).locator("input").first())
      .or(
        r.locator(
          "form > div > div:nth-child(1) > text > div > div:nth-child(2) > input",
        ).first(),
      );
  }

  private currentEmployerNameInput(): Locator {
    return this.employerNameInputFor(this.currentEmploymentRoot);
  }

  private previousEmployerNameInput(): Locator {
    const r = this.previousEmploymentRoot;
    return r
      .getByRole("textbox", { name: /Employer Name/i })
      .first()
      .or(
        r.locator(
          "form > div > div:nth-child(1) > text > div > div:nth-child(2) > input",
        ).first(),
      );
  }

  async enterCurrentEmployerName(name: string): Promise<void> {
    const root = await this.resolveEmploymentFormRoot();
    const input = this.employerNameInputFor(root);
    await input.waitFor({ state: "visible", timeout: 30000 });
    await input.fill(name);
  }

  async selectCurrentOccupation(optionName: string): Promise<void> {
    const root = await this.resolveEmploymentFormRoot();
    await this.selectDropdownInEmploymentCard(root, "Occupation", optionName);
  }

  async selectCurrentEmploymentType(optionName: string): Promise<void> {
    const root = await this.resolveEmploymentFormRoot();
    await this.selectDropdownInEmploymentCard(root, "Employment Type", optionName);
  }

  private async fillTimeYearsMonthsInCard(
    root: Locator,
    years: string,
    months: string,
  ): Promise<void> {
    const cols = root.locator("div.col.yearmonthClass, div.yearmonthClass");
    if ((await cols.count()) >= 2) {
      const yCol = cols.nth(0).locator("input").first();
      const mCol = cols.nth(1).locator("input").first();
      if (
        (await yCol.isVisible().catch(() => false)) &&
        (await mCol.isVisible().catch(() => false))
      ) {
        await yCol.fill(years);
        await mCol.fill(months);
        return;
      }
    }

    // Sole Trader / PrimeFlex: "Years" / "Months" near "Time with … Employer" (same idea as `DOSoleTraderDetailsPage.enterTimeInBusiness`).
    const yearsAnchor = root.getByText(/^Years$/i).first();
    if (await yearsAnchor.isVisible({ timeout: 2500 }).catch(() => false)) {
      const gridInputs = yearsAnchor
        .locator(
          "xpath=ancestor::*[contains(@class,'grid') or contains(@class,'row') or contains(@class,'flex')][1]",
        )
        .locator("input.p-inputtext, p-inputnumber input.p-inputtext, p-inputnumber input");
      if ((await gridInputs.count()) >= 2) {
        await gridInputs.nth(0).fill(years);
        await gridInputs.nth(1).fill(months);
        return;
      }
    }
    const monthsAnchor = root.getByText(/^Months$/i).first();
    if (await monthsAnchor.isVisible({ timeout: 2500 }).catch(() => false)) {
      const row = monthsAnchor.locator(
        "xpath=ancestor::*[contains(@class,'grid') or contains(@class,'row') or contains(@class,'flex')][1]",
      );
      const pair = row.locator(
        "input.p-inputtext, p-inputnumber input.p-inputtext, p-inputnumber input",
      );
      if ((await pair.count()) >= 2) {
        await pair.nth(0).fill(years);
        await pair.nth(1).fill(months);
        return;
      }
    }

    const timeStrip = root
      .locator("div, section")
      .filter({
        has: root.getByText(/Time with (Current )?Employer/i),
      })
      .first();
    if ((await timeStrip.count()) > 0 && (await timeStrip.isVisible().catch(() => false))) {
      const nums = timeStrip.locator(
        "p-inputnumber input.p-inputtext, p-inputnumber input",
      );
      if ((await nums.count()) >= 2) {
        await nums.nth(0).fill(years);
        await nums.nth(1).fill(months);
        return;
      }
    }

    const yIn = root
      .locator(
        "form > div > div:nth-child(5) > text > div > div:nth-child(2) > input",
      )
      .first();
    const mIn = root
      .locator(
        "form > div > div:nth-child(6) > text > div > div:nth-child(2) > input",
      )
      .first();
    if (await yIn.isVisible().catch(() => false)) {
      await yIn.fill(years);
    }
    if (await mIn.isVisible().catch(() => false)) {
      await mIn.fill(months);
    }
  }

  async enterCurrentTimeWithEmployer(
    years: string,
    months: string,
  ): Promise<void> {
    const root = await this.resolveEmploymentFormRoot();
    await this.fillTimeYearsMonthsInCard(root, years, months);
  }

  async enterPreviousEmployerName(name: string): Promise<void> {
    const input = this.previousEmployerNameInput();
    await input.waitFor({ state: "visible", timeout: 15000 });
    await input.fill(name);
  }

  async selectPreviousOccupation(optionName: string): Promise<void> {
    await this.selectDropdownInEmploymentCard(
      this.previousEmploymentRoot,
      "Occupation",
      optionName,
    );
  }

  async selectPreviousEmploymentType(optionName: string): Promise<void> {
    await this.selectDropdownInEmploymentCard(
      this.previousEmploymentRoot,
      "Employment Type",
      optionName,
    );
  }

  async enterPreviousTimeWithEmployer(
    years: string,
    months: string,
  ): Promise<void> {
    await this.fillTimeYearsMonthsInCard(
      this.previousEmploymentRoot,
      years,
      months,
    );
  }

  async clickNextButton(): Promise<void> {
    await this.nextButton.waitFor({ state: "visible", timeout: 60000 });
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
  }
}
