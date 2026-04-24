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
    this.employmentRoot = page.locator("app-employment-details").first();
    this.currentEmploymentRoot = page.locator("app-current-employment").first();
    // May be under stepper sibling to app-employment-details — resolve from page.
    this.previousEmploymentRoot = page.locator("app-previous-employment").first();
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
    await this.currentEmploymentRoot.waitFor({
      state: "visible",
      timeout: 120000,
    });
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

    const trigger = (await primary.isVisible({ timeout: 4000 }).catch(() => false))
      ? primary
      : fallback;

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

  /** SelectorHub: Current — Employer Name row `form > … > div:nth-child(1) > text > … > input`. */
  private currentEmployerNameInput(): Locator {
    return this.currentEmploymentRoot
      .locator(
        "form > div > div:nth-child(1) > text > div > div:nth-child(2) > input",
      )
      .first();
  }

  private previousEmployerNameInput(): Locator {
    return this.previousEmploymentRoot
      .locator(
        "form > div > div:nth-child(1) > text > div > div:nth-child(2) > input",
      )
      .first();
  }

  async enterCurrentEmployerName(name: string): Promise<void> {
    const input = this.currentEmployerNameInput();
    await input.waitFor({ state: "visible", timeout: 15000 });
    await input.fill(name);
  }

  async selectCurrentOccupation(optionName: string): Promise<void> {
    await this.selectDropdownInEmploymentCard(
      this.currentEmploymentRoot,
      "Occupation",
      optionName,
    );
  }

  async selectCurrentEmploymentType(optionName: string): Promise<void> {
    await this.selectDropdownInEmploymentCard(
      this.currentEmploymentRoot,
      "Employment Type",
      optionName,
    );
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
    await this.fillTimeYearsMonthsInCard(
      this.currentEmploymentRoot,
      years,
      months,
    );
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
