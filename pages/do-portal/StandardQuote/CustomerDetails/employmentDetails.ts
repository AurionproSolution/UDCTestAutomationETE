import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common";

/**
 * Step: Employment Details (`app-employment-details`).
 * - Sole trade: `app-sole-trade` → `app-previous-employment` / `app-sole-trade-previous-employee`.
 * - Individual: `app-previous-employee` (SelectorHub: `gen-card` / `p-card` + form rows **4** / **6** for Years/Months).
 * Toggle "Have the Employment Details Changed?" can also reveal previous-employment hosts.
 */
export class DOEmploymentDetailsPage extends BasePage {
  readonly employmentRoot: Locator;
  readonly currentEmploymentRoot: Locator;
  readonly previousEmploymentRoot: Locator;
  readonly nextButton: Locator;
  /** Outlined **Save** on Employment Details (Prime pattern aligned with Personal / Address). */
  readonly saveEmploymentDetailsButton: Locator;

  constructor(page: Page) {
    super(page);
    const individual = page.locator("app-individual").filter({ visible: true }).first();
    // Visible `app-sole-trade` only — avoids hidden shells / duplicate hosts so `waitFor` does not hang.
    const sole = page.locator("app-sole-trade").filter({ visible: true }).first();

    this.employmentRoot = individual
      .locator("app-employment-details")
      .first()
      .or(sole.locator("app-employment-details").first())
      .or(page.locator("app-employment-details").filter({ visible: true }).first())
      .or(individual)
      .or(sole);

    const individualEmploymentCard = individual
      .locator("gen-card, p-card")
      .filter({ hasText: /Current Employment/i })
      .first();
    const individualCurrent = individual.locator("app-current-employment").filter({ visible: true }).first();
    const currentEmploymentCard = sole
      .locator("gen-card, p-card")
      .filter({ hasText: /Current Employment/i })
      .first();
    const currentInSole = sole.locator("app-current-employment").first();
    const currentGlobalVisible = page.locator("app-current-employment").filter({ visible: true }).first();
    this.currentEmploymentRoot = individualEmploymentCard
      .or(individualCurrent)
      .or(currentEmploymentCard)
      .or(currentInSole)
      .or(currentGlobalVisible)
      .or(individual)
      .or(sole);

    // Individual flow exposes `app-previous-employee` (not under `app-sole-trade`). Prefer it when visible.
    const previousEmployeeIndividual = page
      .locator("app-previous-employee")
      .filter({ visible: true })
      .first();

    this.previousEmploymentRoot = previousEmployeeIndividual
      .or(
        sole
          .locator("app-sole-trade-previous-employee")
          .filter({ visible: true })
          .first(),
      )
      .or(sole.locator("app-previous-employment").filter({ visible: true }).first())
      .or(
        page
          .locator("app-sole-trade-previous-employee")
          .filter({ visible: true })
          .first(),
      )
      .or(page.locator("app-previous-employment").filter({ visible: true }).first());

    this.nextButton = page.getByRole("button", { name: "Next" }).last();
    this.saveEmploymentDetailsButton = page
      .locator(
        "button.p-ripple.p-element.p-button.p-component.p-button-outlined",
      )
      .filter({ hasText: /^Save$/i });
  }

  protected stepLogPrefix(): string {
    return "Standard quote — Employment details";
  }

  /** Row for "Have the Employment Details Changed?" — avoid `.first()` slider in the whole card (wrong control). */
  employmentDetailsChangedLabel(): Locator {
    return this.page.getByText(/Have the Employment Details Changed\??/i).first();
  }

  private employmentDetailsChangedRow(): Locator {
    return this.employmentDetailsChangedLabel().locator(
      "xpath=ancestor::div[.//p-inputswitch or .//span[contains(@class,'p-inputswitch')]][1]",
    );
  }

  /** **Existing customers only** — FIS pre-populated employment shows this toggle (UDP-T3764). */
  async isEmploymentDetailsChangedSliderVisible(timeoutMs = 10_000): Promise<boolean> {
    const labelVisible = await this.employmentDetailsChangedLabel()
      .isVisible({ timeout: timeoutMs })
      .catch(() => false);
    if (!labelVisible) return false;
    const switchHost = this.employmentDetailsChangedRow()
      .locator("p-inputswitch, span.p-inputswitch")
      .first();
    return switchHost.isVisible({ timeout: 4_000 }).catch(() => false);
  }

  /** PrimeNG hides `input[role="switch"]` off-screen — assert the visible switch host (UDP-T3764). */
  async expectEmploymentDetailsChangedSwitchVisible(): Promise<void> {
    this.logStep("Expect Employment Details Changed Switch Visible");
    await expect(this.employmentDetailsChangedLabel()).toBeVisible({ timeout: 20_000 });
    const row = this.employmentDetailsChangedRow();
    const switchHost = row.locator("p-inputswitch, span.p-inputswitch").first();
    await expect(switchHost).toBeVisible({ timeout: 15_000 });
    await expect(row.locator('input[role="switch"]').first()).toBeAttached({ timeout: 10_000 });
  }

  /** Open **Occupation** dropdown on Current Employment (panel stays open — UDP-T3767). */
  async openCurrentOccupationDropdown(): Promise<void> {
    this.logStep("Open Current Occupation Dropdown");
    const root = await this.resolveEmploymentFormRoot();
    await this.openEmploymentDropdown(root, "Occupation");
  }

  async expectOccupationRequiredVisible(): Promise<void> {
    this.logStep("Expect Occupation Required Visible");
    const root = await this.employmentValidationScope();
    await expect(root.getByText("Occupation is required", { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    });
  }

  async expectOccupationRequiredHidden(): Promise<void> {
    this.logStep("Expect Occupation Required Hidden");
    const root = await this.employmentValidationScope();
    await expect(root.getByText("Occupation is required", { exact: true })).toHaveCount(0, {
      timeout: 12_000,
    });
  }

  async expectTimeWithEmployerRequiredVisible(): Promise<void> {
    this.logStep("Expect Time With Employer Required Visible");
    await this.scrollCurrentEmploymentSectionIntoViewForValidation();
    const root = await this.employmentValidationScope();
    const exact = root.getByText("Time with Employer is required", { exact: true });
    const loose = root.getByText(/Time with Employer is required/i);
    try {
      await expect(exact).toHaveCount(2, { timeout: 12_000 });
      await expect(exact.nth(0)).toBeVisible({ timeout: 15_000 });
      await expect(exact.nth(1)).toBeVisible({ timeout: 15_000 });
    } catch {
      await expect(loose.first()).toBeVisible({ timeout: 20_000 });
    }
  }

  async expectTimeWithEmployerMustBeGreaterThanZeroVisible(): Promise<void> {
    this.logStep("Expect Time With Employer Must Be Greater Than Zero Visible");
    await this.scrollCurrentEmploymentSectionIntoViewForValidation();
    const host = this.page.locator("app-individual").filter({ visible: true }).first();
    const pattern = /Time with Employer must be greater than 0/i;

    await expect
      .poll(
        async () => {
          if (await host.isVisible().catch(() => false)) {
            const text = await host.innerText().catch(() => "");
            if (pattern.test(text)) return true;
          }
          const body = await this.page.locator("body").innerText().catch(() => "");
          return pattern.test(body);
        },
        {
          timeout: 30_000,
          message: "Expected Time with Employer must be greater than 0 validation",
        },
      )
      .toBe(true);
  }

  async expectTimeWithEmployerRequiredHidden(): Promise<void> {
    this.logStep("Expect Time With Employer Required Hidden");
    const root = await this.employmentValidationScope();
    await expect(
      root.getByText(/Time with Employer is required|Time with Employer must be greater than 0/i),
    ).toHaveCount(0, {
      timeout: 12_000,
    });
  }

  private async openEmploymentDropdown(root: Locator, labelNeedle: string): Promise<void> {
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
    let trigger: Locator = (await primary.isVisible({ timeout: 4_000 }).catch(() => false))
      ? primary
      : fallback;
    const byRoleCombo = root.getByRole("combobox", { name: new RegExp(q, "i") }).first();
    if (
      !(await trigger.isVisible({ timeout: 1_500 }).catch(() => false)) &&
      (await byRoleCombo.isVisible({ timeout: 4_000 }).catch(() => false))
    ) {
      trigger = byRoleCombo;
    }
    const triggerInHostDropdown = root.locator(
      `xpath=.//label[contains(normalize-space(.),'${q}')]/ancestor::p-dropdown[1]//*[contains(@class,'p-dropdown-trigger') or @aria-label='dropdown trigger'][1]`,
    );
    if (
      !(await trigger.isVisible({ timeout: 1_200 }).catch(() => false)) &&
      (await triggerInHostDropdown.isVisible({ timeout: 4_000 }).catch(() => false))
    ) {
      trigger = triggerInHostDropdown;
    }
    await trigger.waitFor({ state: "visible", timeout: 20_000 });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await this.page.getByRole("listbox").waitFor({ state: "visible", timeout: 15_000 });
  }

  async waitForEmploymentDetailsStep(): Promise<void> {
    this.logStep("Wait For Employment Details Step");
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
    const individual = this.page.locator("app-individual").filter({ visible: true }).first();
    const indEmploymentHost = individual
      .locator("app-employment-details")
      .filter({ visible: true })
      .first();
    const indCurrentEmp = individual
      .locator("app-current-employment")
      .filter({ visible: true })
      .first();
    const indEmpCard = individual
      .locator("gen-card, p-card")
      .filter({ hasText: /Current Employment/i })
      .first();
    const indEmployerName = individual
      .getByRole("textbox", { name: /Employer Name/i })
      .first();

    const employmentChangedPage = this.page
      .getByText(/Have the Employment Details Changed\??/i)
      .first();
    const employmentChanged = sole.getByText(/Have the Employment Details Changed\??/i).first();
    const employmentChangedIndividual = individual
      .getByText(/Have the Employment Details Changed\??/i)
      .first();
    const empCard = sole.locator("gen-card, p-card").filter({ hasText: /Current Employment/i }).first();
    const byEmployerSole = sole.getByRole("textbox", { name: /Employer Name/i }).first();
    const byEmployerLoose = sole.getByRole("textbox", { name: /Employer/i }).first();
    const byEmployerLabel = sole.getByLabel(/Employer Name/i).first();
    const byEmployerPage = this.page.getByRole("textbox", { name: /Employer Name/i }).first();
    const indCardTitle = individual.getByText(/^Current Employment$/i).first();
    const byCardTitle = sole.getByText(/^Current Employment$/i).first();
    const nestedCurrent = sole.locator("app-current-employment").first();
    const globalCurrent = this.page.locator("app-current-employment").filter({ visible: true }).first();

    const timeout = 120000;
    // `Promise.any`: first success wins. UI may expose Employer as non-textbox or omit `app-current-employment`.
    try {
      await Promise.any([
        indEmploymentHost.waitFor({ state: "visible", timeout }),
        indCurrentEmp.waitFor({ state: "visible", timeout }),
        indEmpCard.waitFor({ state: "visible", timeout }),
        indEmployerName.waitFor({ state: "visible", timeout }),
        employmentChangedPage.waitFor({ state: "visible", timeout }),
        employmentChangedIndividual.waitFor({ state: "visible", timeout }),
        employmentChanged.waitFor({ state: "visible", timeout }),
        empCard.waitFor({ state: "visible", timeout }),
        indCardTitle.waitFor({ state: "visible", timeout }),
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
    this.logStep("Turn On Employment Details Changed");
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
    this.logStep("Turn Off Employment Details Changed");
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
    const individual = this.page.locator("app-individual").filter({ visible: true }).first();
    const indCard = individual
      .locator("gen-card, p-card")
      .filter({ hasText: /Current Employment/i })
      .first();
    if (await indCard.isVisible({ timeout: 10_000 }).catch(() => false)) return indCard;
    const indCurrent = individual.locator("app-current-employment").filter({ visible: true }).first();
    if (await indCurrent.isVisible({ timeout: 5_000 }).catch(() => false)) return indCurrent;
    const indEmployer = individual.getByRole("textbox", { name: /Employer Name/i }).first();
    if (await indEmployer.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const wrap = indEmployer.locator(
        "xpath=ancestor::*[self::p-card or self::gen-card or self::app-current-employment][1]",
      );
      if (await wrap.isVisible({ timeout: 3_000 }).catch(() => false)) return wrap;
      return individual;
    }

    const sole = this.page.locator("app-sole-trade").filter({ visible: true }).first();
    const card = sole.locator("gen-card, p-card").filter({ hasText: /Current Employment/i }).first();
    if (await card.isVisible({ timeout: 10_000 }).catch(() => false)) return card;
    const nested = sole.locator("app-current-employment").first();
    if ((await nested.count()) > 0 && (await nested.isVisible({ timeout: 5_000 }).catch(() => false)))
      return nested;
    return this.currentEmploymentRoot;
  }

  private async employmentValidationScope(): Promise<Locator> {
    const individual = this.page.locator("app-individual").filter({ visible: true }).first();
    if (await individual.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return individual;
    }
    const root = await this.resolveEmploymentFormRoot();
    if (await root.isVisible({ timeout: 2_000 }).catch(() => false)) return root;
    return this.page.locator("app-individual, app-employment-details, app-current-employment").filter({
      visible: true,
    }).first().or(this.page.locator("body"));
  }

  /**
   * Prefer **Previous Employment** `gen-card` / `p-card` (same idea as {@link resolveEmploymentFormRoot}).
   * Shown when **Time with Current Employer** is under the product threshold (e.g. &lt; 3 years).
   */
  private async resolvePreviousEmploymentFormRoot(): Promise<Locator> {
    const prevIndividual = this.page
      .locator("app-previous-employee")
      .filter({ visible: true })
      .first();

    if (await prevIndividual.isVisible({ timeout: 12_000 }).catch(() => false)) {
      const card = prevIndividual
        .locator("xpath=ancestor::*[self::p-card or self::gen-card][1]")
        .first();
      if (await card.isVisible({ timeout: 4_000 }).catch(() => false)) {
        return card;
      }
      return prevIndividual;
    }

    const sole = this.page.locator("app-sole-trade").filter({ visible: true }).first();
    const card = sole
      .locator("gen-card, p-card")
      .filter({ hasText: /Previous Employment/i })
      .first();
    if (await card.isVisible({ timeout: 12_000 }).catch(() => false)) {
      return card;
    }
    if (await this.previousEmploymentRoot.isVisible({ timeout: 8_000 }).catch(() => false)) {
      return this.previousEmploymentRoot;
    }

    const anyPrevious = prevIndividual.or(card).or(this.previousEmploymentRoot).first();
    await anyPrevious.waitFor({ state: "visible", timeout: 45_000 });
    if (await prevIndividual.isVisible().catch(() => false)) {
      const wrap = prevIndividual
        .locator("xpath=ancestor::*[self::p-card or self::gen-card][1]")
        .first();
      return (await wrap.isVisible().catch(() => false)) ? wrap : prevIndividual;
    }
    if (await card.isVisible().catch(() => false)) return card;
    return this.previousEmploymentRoot;
  }

  /** Visible `app-previous-employee` — nested under a card, or `root` when the resolved root is that host. */
  private async resolvePreviousEmployeeAngularHost(root: Locator): Promise<Locator> {
    const nested = root.locator("app-previous-employee").first();
    if (await nested.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return nested;
    }
    const isHost = await root
      .evaluate((el: Element) => (el as HTMLElement).tagName.toLowerCase() === "app-previous-employee")
      .catch(() => false);
    if (isHost && (await root.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return root;
    }
    return nested;
  }

  /**
   * PrimeNG `p-dropdown` by index inside **Previous Employment** (Individual).
   * SelectorHub `#pn_id_*` targets volatile ids — use **nth** `p-dropdown`: Occupation **0**, Employment Type **1**.
   */
  private async selectPrimeDropdownByIndexInPreviousHost(
    root: Locator,
    zeroBasedIndex: number,
    optionName: string,
  ): Promise<void> {
    const scope = await this.resolvePreviousEmployeeAngularHost(root);
    if (!(await scope.isVisible({ timeout: 4_000 }).catch(() => false))) {
      throw new Error(
        "Previous Employment: expected visible `app-previous-employee` for PrimeNG dropdown selection.",
      );
    }

    const dd = scope.locator("p-dropdown").nth(zeroBasedIndex);
    const trigger = dd
      .locator(".p-dropdown-trigger, [aria-label='dropdown trigger']")
      .first();

    await trigger.waitFor({ state: "visible", timeout: 20_000 });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const rxOpt = new RegExp(
      `^${optionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i",
    );
    const opt = this.page.getByRole("option", { name: rxOpt }).first();
    await opt.waitFor({ state: "visible", timeout: 15_000 });
    await opt.click();
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => {});
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  private async touchPrimeDropdownByIndexInPreviousHost(
    root: Locator,
    zeroBasedIndex: number,
  ): Promise<void> {
    const scope = await this.resolvePreviousEmployeeAngularHost(root);
    if (!(await scope.isVisible({ timeout: 2_500 }).catch(() => false))) {
      return;
    }
    const trigger = scope
      .locator("p-dropdown")
      .nth(zeroBasedIndex)
      .locator(".p-dropdown-trigger, [aria-label='dropdown trigger']")
      .first();
    if (!(await trigger.isVisible({ timeout: 4_000 }).catch(() => false))) {
      return;
    }
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "visible", timeout: 5_000 })
      .catch(() => {});
    await this.page.keyboard.press("Escape");
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 8_000 })
      .catch(() => {});
  }

  /**
   * **Previous Employment** only: Individual uses `app-previous-employee` + Prime `p-dropdown` order
   * (avoids volatile `#pn_id_*` from SelectorHub); Sole uses label-based {@link selectDropdownInEmploymentCard}.
   */
  private async selectPreviousEmploymentDropdown(
    root: Locator,
    labelNeedle: string,
    primeDropdownIndex: number,
    optionName: string,
  ): Promise<void> {
    const scope = await this.resolvePreviousEmployeeAngularHost(root);
    if (await scope.isVisible({ timeout: 3_500 }).catch(() => false)) {
      try {
        await this.selectPrimeDropdownByIndexInPreviousHost(
          root,
          primeDropdownIndex,
          optionName,
        );
        return;
      } catch {
        /* layout / order changed — fall back to label-based */
      }
    }
    await this.selectDropdownInEmploymentCard(root, labelNeedle, optionName);
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

    // Previous / Current — label inside or above `p-dropdown` (SelectorHub-style); sibling xpath may miss.
    const triggerInHostDropdown = root.locator(
      `xpath=.//label[contains(normalize-space(.),'${q}')]/ancestor::p-dropdown[1]//*[contains(@class,'p-dropdown-trigger') or @aria-label='dropdown trigger'][1]`,
    );
    if (
      !(await trigger.isVisible({ timeout: 1200 }).catch(() => false)) &&
      (await triggerInHostDropdown.isVisible({ timeout: 4000 }).catch(() => false))
    ) {
      trigger = triggerInHostDropdown;
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

  /** Open PrimeNG dropdown for `labelNeedle` in **Current Employment** card, then **Escape** without choosing. */
  private async touchEmploymentDropdownWithoutSelection(
    root: Locator,
    labelNeedle: string,
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

    const triggerInHostDropdown = root.locator(
      `xpath=.//label[contains(normalize-space(.),'${q}')]/ancestor::p-dropdown[1]//*[contains(@class,'p-dropdown-trigger') or @aria-label='dropdown trigger'][1]`,
    );
    if (
      !(await trigger.isVisible({ timeout: 1200 }).catch(() => false)) &&
      (await triggerInHostDropdown.isVisible({ timeout: 4000 }).catch(() => false))
    ) {
      trigger = triggerInHostDropdown;
    }

    if (!(await trigger.isVisible({ timeout: 3000 }).catch(() => false))) {
      return;
    }
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "visible", timeout: 5_000 })
      .catch(() => {});
    await this.page.keyboard.press("Escape");
    await this.page
      .getByRole("listbox")
      .waitFor({ state: "hidden", timeout: 8_000 })
      .catch(() => {});
  }

  async touchCurrentOccupationDropdownWithoutSelection(): Promise<void> {
    this.logStep("Touch Current Occupation Dropdown Without Selection");
    const root = await this.resolveEmploymentFormRoot();
    await this.touchEmploymentDropdownWithoutSelection(root, "Occupation");
  }

  async touchCurrentEmploymentTypeDropdownWithoutSelection(): Promise<void> {
    this.logStep("Touch Current Employment Type Dropdown Without Selection");
    const root = await this.resolveEmploymentFormRoot();
    await this.touchEmploymentDropdownWithoutSelection(root, "Employment Type");
  }

  async touchPreviousOccupationDropdownWithoutSelection(): Promise<void> {
    this.logStep("Touch Previous Occupation Dropdown Without Selection");
    const root = await this.resolvePreviousEmploymentFormRoot();
    const scope = await this.resolvePreviousEmployeeAngularHost(root);
    if (await scope.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await this.touchPrimeDropdownByIndexInPreviousHost(root, 0);
      return;
    }
    await this.touchEmploymentDropdownWithoutSelection(root, "Occupation");
  }

  async touchPreviousEmploymentTypeDropdownWithoutSelection(): Promise<void> {
    this.logStep("Touch Previous Employment Type Dropdown Without Selection");
    const root = await this.resolvePreviousEmploymentFormRoot();
    const scope = await this.resolvePreviousEmployeeAngularHost(root);
    if (await scope.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await this.touchPrimeDropdownByIndexInPreviousHost(root, 1);
      return;
    }
    await this.touchEmploymentDropdownWithoutSelection(root, "Employment Type");
  }

  /** Outlined **Save** on Employment Details. */
  async clickSaveEmploymentDetails(): Promise<void> {
    this.logStep("Click Save Employment Details");
    await this.saveEmploymentDetailsButton.waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await this.saveEmploymentDetailsButton.scrollIntoViewIfNeeded();
    await this.saveEmploymentDetailsButton.click({ timeout: 15_000 });
    await this.page
      .locator(".app-loader-overlay, .p-blockui, .p-progress-spinner, p-progressspinner")
      .first()
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => {});
  }

  private async scrollCurrentEmploymentSectionIntoViewForValidation(): Promise<void> {
    await this.page.keyboard.press("Escape").catch(() => {});
    const heading = this.page
      .getByRole("heading", { name: /Current\s+Employment/i })
      .first();
    if (await heading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await heading.evaluate((el: Element) => {
        (el as HTMLElement).scrollIntoView({
          block: "start",
          behavior: "instant",
        });
      });
    }
    const root = await this.resolveEmploymentFormRoot();
    await root.evaluate((el: Element) => {
      (el as HTMLElement).scrollIntoView({ block: "start", behavior: "instant" });
    }).catch(() => {});
  }

  private async scrollPreviousEmploymentSectionIntoViewForValidation(): Promise<void> {
    await this.page.keyboard.press("Escape").catch(() => {});
    const title = this.page
      .getByText(/^Previous Employment$/i)
      .first()
      .or(this.page.getByRole("heading", { name: /Previous\s+Employment/i }).first());
    if (await title.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await title.evaluate((el: Element) => {
        (el as HTMLElement).scrollIntoView({
          block: "start",
          behavior: "instant",
        });
      });
    }
    const root = await this.resolvePreviousEmploymentFormRoot();
    await root.evaluate((el: Element) => {
      (el as HTMLElement).scrollIntoView({ block: "start", behavior: "instant" });
    }).catch(() => {});
  }

  /**
   * After **Save** with **Current Employment** time under the threshold (e.g. &lt; 3 years), expect
   * **Previous Employment** to be shown.
   */
  async expectPreviousEmploymentSectionVisible(timeout = 45_000): Promise<void> {
    this.logStep("Expect Previous Employment Section Visible");
    await this.scrollPreviousEmploymentSectionIntoViewForValidation();
    const root = await this.resolvePreviousEmploymentFormRoot();
    const title = root
      .getByText(/^Previous Employment$/i)
      .or(root.getByRole("heading", { name: /Previous\s+Employment/i }));
    await expect(title.first()).toBeVisible({ timeout });
    await expect(root).toBeVisible({ timeout });
  }

  /**
   * After **Save** with **Previous Employment** required fields empty / touched, expect inline validation.
   * Time copy may be misspelled **Employeer** on some builds — {@link expectPreviousEmploymentRequiredValidationMessages} accepts both.
   */
  async expectPreviousEmploymentRequiredValidationMessages(): Promise<void> {
    this.logStep("Expect Previous Employment Required Validation Messages");
    await this.scrollPreviousEmploymentSectionIntoViewForValidation();
    const root = await this.resolvePreviousEmploymentFormRoot();

    const assertMsgExact = async (exact: string): Promise<void> => {
      const el = root.getByText(exact, { exact: true }).first();
      await el.scrollIntoViewIfNeeded({ timeout: 15_000 }).catch(() => {});
      await expect(el).toBeVisible({ timeout: 20_000 });
    };

    /** QAT / Angular templates vary title case (e.g. **Employer name** vs **Employer Name**). */
    const assertMsgRx = async (pattern: RegExp): Promise<void> => {
      const el = root.getByText(pattern).first();
      await el.scrollIntoViewIfNeeded({ timeout: 15_000 }).catch(() => {});
      await expect(el).toBeVisible({ timeout: 20_000 });
    };

    await assertMsgRx(/Employer name is required/i);
    await assertMsgExact("Occupation is required");
    await assertMsgRx(/Employment Type\s+is\s+required|Employment Type Required/i);

    const typo = root.getByText("Time with Employeer is required", { exact: true });
    const correct = root.getByText("Time with Employer is required", { exact: true });
    const rx = root.getByText(/Time with Employer.*is required/i);
    try {
      await expect(typo).toHaveCount(2, { timeout: 10_000 });
      await typo.nth(0).scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
      await typo.nth(1).scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
      await expect(typo.nth(0)).toBeVisible({ timeout: 15_000 });
      await expect(typo.nth(1)).toBeVisible({ timeout: 15_000 });
    } catch {
      try {
        await expect(correct).toHaveCount(2, { timeout: 8_000 });
        await expect(correct.nth(0)).toBeVisible({ timeout: 15_000 });
        await expect(correct.nth(1)).toBeVisible({ timeout: 15_000 });
      } catch {
        await expect(rx.first()).toBeVisible({ timeout: 20_000 });
        if ((await rx.count()) >= 2) {
          await expect(rx.nth(1)).toBeVisible({ timeout: 15_000 });
        }
      }
    }
  }

  /**
   * After **Save** with **Current Employment** required fields empty / touched, expect inline validation
   * (screenshot copy: Employer Name, Occupation, Employment Type, Time with Employer ×2).
   */
  async expectCurrentEmploymentRequiredValidationMessages(): Promise<void> {
    this.logStep("Expect Current Employment Required Validation Messages");
    await this.scrollCurrentEmploymentSectionIntoViewForValidation();
    const root = await this.resolveEmploymentFormRoot();

    const assertMsgExact = async (exact: string): Promise<void> => {
      const el = root.getByText(exact, { exact: true }).first();
      await el.scrollIntoViewIfNeeded({ timeout: 15_000 }).catch(() => {});
      await expect(el).toBeVisible({ timeout: 20_000 });
    };

    /** QAT / Angular templates vary title case (e.g. **Employer name** vs **Employer Name**). */
    const assertMsgRx = async (pattern: RegExp): Promise<void> => {
      const el = root.getByText(pattern).first();
      await el.scrollIntoViewIfNeeded({ timeout: 15_000 }).catch(() => {});
      await expect(el).toBeVisible({ timeout: 20_000 });
    };

    await assertMsgRx(/Employer name is required/i);
    await assertMsgExact("Occupation is required");
    await assertMsgRx(/Employment Type\s+is\s+required|Employment Type Required/i);

    const timeMsg = root.getByText("Time with Employer is required", {
      exact: true,
    });
    try {
      await expect(timeMsg).toHaveCount(2, { timeout: 10_000 });
      await timeMsg.nth(0).scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
      await timeMsg.nth(1).scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
      await expect(timeMsg.nth(0)).toBeVisible({ timeout: 15_000 });
      await expect(timeMsg.nth(1)).toBeVisible({ timeout: 15_000 });
    } catch {
      await assertMsgRx(/Time with Employer is required/i);
    }
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

  /**
   * **Previous Employment** — Employer Name textbox.
   * SelectorHub (full): `input.p-inputtext.p-component.p-element.form-control` plus dynamic
   * `ng-pristine` / `ng-star-inserted` / `ng-invalid` / `invalid-field` / `ng-touched` — those are omitted here so the
   * locator stays valid after fill, save, and re-run. Prefer the input after the **Employer Name** label so Years/Months
   * fields are not matched.
   */
  private previousEmploymentEmployerNameInput(root: Locator): Locator {
    const prev = root.locator("app-previous-employee").first();
    const individualEmployer = prev
      .getByLabel(/Employer Name/i)
      .first()
      .or(
        prev
          .locator("label")
          .filter({ hasText: /^Employer Name/i })
          .first()
          .locator(
            "xpath=following::input[contains(@class,'p-inputtext') and contains(@class,'form-control')][1]",
          ),
      )
      .or(prev.locator("input.p-inputtext.p-component.p-element.form-control").first());

    const stablePrime = root.locator(
      "input.p-inputtext.p-component.p-element.form-control",
    );
    const afterEmployerLabel = root
      .locator("label")
      .filter({ hasText: /^Employer Name/i })
      .first()
      .locator(
        "xpath=following::input[contains(@class,'p-inputtext') and contains(@class,'form-control')][1]",
      );
    return individualEmployer
      .or(afterEmployerLabel)
      .or(stablePrime.first())
      .or(this.employerNameInputFor(root));
  }

  private currentEmployerNameInput(): Locator {
    return this.employerNameInputFor(this.currentEmploymentRoot);
  }

  async enterCurrentEmployerName(name: string): Promise<void> {
    this.logStep(`Entered current employer name as ${this.stepValueDisplay(name)}`);
    const root = await this.resolveEmploymentFormRoot();
    const input = this.employerNameInputFor(root);
    await input.waitFor({ state: "visible", timeout: 30000 });
    if (!name.trim()) {
      await input.click({ force: true }).catch(() => {});
      await input.fill("");
      await input.press("Tab").catch(() => {});
      return;
    }
    await input.fill(name);
  }

  async getCurrentEmployerName(): Promise<string> {
    const root = await this.resolveEmploymentFormRoot();
    const input = this.employerNameInputFor(root);
    await input.waitFor({ state: "visible", timeout: 30_000 });
    return (await input.inputValue()).trim();
  }

  private async employmentDropdownDisplayValue(
    root: Locator,
    labelNeedle: string,
  ): Promise<string> {
    const combo = root.getByRole("combobox", { name: new RegExp(labelNeedle, "i") }).first();
    if (await combo.isVisible({ timeout: 6_000 }).catch(() => false)) {
      const aria = (await combo.getAttribute("aria-label"))?.trim() ?? "";
      if (aria && !/dropdown trigger/i.test(aria)) return aria;
      const text = (await combo.textContent())?.trim() ?? "";
      if (text) return text;
    }
    const label = root.locator("label").filter({ hasText: new RegExp(labelNeedle, "i") }).first();
    const ddLabel = label.locator(
      "xpath=following::*[contains(@class,'p-dropdown-label')][1]",
    );
    if (await ddLabel.isVisible({ timeout: 4_000 }).catch(() => false)) {
      return (await ddLabel.textContent())?.trim() ?? "";
    }
    return "";
  }

  async getCurrentOccupationLabel(): Promise<string> {
    const root = await this.resolveEmploymentFormRoot();
    return this.employmentDropdownDisplayValue(root, "Occupation");
  }

  async getCurrentEmploymentTypeLabel(): Promise<string> {
    const root = await this.resolveEmploymentFormRoot();
    return this.employmentDropdownDisplayValue(root, "Employment Type");
  }

  async getCurrentTimeWithEmployer(): Promise<{ years: string; months: string }> {
    const root = await this.resolveEmploymentFormRoot();
    const textInputs = root.locator("input.p-inputtext:visible, input.form-control:visible");
    const inputCount = await textInputs.count();
    if (inputCount >= 3) {
      const years = ((await textInputs.nth(1).inputValue()) ?? "").trim();
      const months = ((await textInputs.nth(2).inputValue()) ?? "").trim();
      if (years || months) {
        return { years, months };
      }
    }

    const timeLabel = root.getByText(/Time with Current Employer/i).first();
    if (await timeLabel.isVisible({ timeout: 4_000 }).catch(() => false)) {
      const yearsInput = timeLabel.locator("xpath=following::input[1]");
      const monthsInput = root.getByText(/^Years$/i).first().locator("xpath=following::input[1]");
      if (await yearsInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        return {
          years: ((await yearsInput.inputValue()) ?? "").trim(),
          months: ((await monthsInput.inputValue().catch(() => "")) ?? "").trim(),
        };
      }
    }

    const cols = root.locator("div.col.yearmonthClass, div.yearmonthClass");
    if ((await cols.count()) >= 2) {
      const years = ((await cols.nth(0).locator("input").first().inputValue()) ?? "").trim();
      const months = ((await cols.nth(1).locator("input").first().inputValue()) ?? "").trim();
      if (years || months) return { years, months };
    }
    const yearsAnchor = root.getByText(/^Years$/i).first();
    if (await yearsAnchor.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const inputs = yearsAnchor
        .locator(
          "xpath=ancestor::*[contains(@class,'grid') or contains(@class,'row') or contains(@class,'flex')][1]",
        )
        .locator("input.p-inputtext, p-inputnumber input");
      if ((await inputs.count()) >= 2) {
        return {
          years: ((await inputs.nth(0).inputValue()) ?? "").trim(),
          months: ((await inputs.nth(1).inputValue()) ?? "").trim(),
        };
      }
    }
    const timeStrip = root
      .locator("div, section")
      .filter({
        has: root.getByText(/Time with (Current Employer|Previous Employer|Employer)/i),
      })
      .first();
    const nums = timeStrip.locator("p-inputnumber input, input.p-inputtext");
    if ((await nums.count()) >= 2) {
      return {
        years: ((await nums.nth(0).inputValue()) ?? "").trim(),
        months: ((await nums.nth(1).inputValue()) ?? "").trim(),
      };
    }
    return { years: "", months: "" };
  }

  async selectCurrentOccupation(optionName: string): Promise<void> {
    this.logStep(`Selected current occupation: ${this.stepValueDisplay(optionName)}`);
    const root = await this.resolveEmploymentFormRoot();
    await this.selectDropdownInEmploymentCard(root, "Occupation", optionName);
  }

  async selectCurrentEmploymentType(optionName: string): Promise<void> {
    this.logStep(`Selected current employment type: ${this.stepValueDisplay(optionName)}`);
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

    // Individual **Previous Employment** (`app-previous-employee`): SelectorHub Years = `form … div(4) … input`, Months = `div(6) … input`.
    const prevEmp = await this.resolvePreviousEmployeeAngularHost(root);
    if (await prevEmp.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const yIn = prevEmp
        .locator(
          "form > div:nth-child(1) > div:nth-child(4) text div div:nth-child(2) input",
        )
        .first();
      const mIn = prevEmp
        .locator(
          "form > div:nth-child(1) > div:nth-child(6) text div div:nth-child(2) input",
        )
        .first();
      if (
        (await yIn.isVisible({ timeout: 2_500 }).catch(() => false)) &&
        (await mIn.isVisible({ timeout: 2_500 }).catch(() => false))
      ) {
        await yIn.fill(years);
        await mIn.fill(months);
        return;
      }
    }

    // Sole Trade Employment (`app-sole-trade-current-employment` / `app-sole-trade-previous-employee`):
    // gen-card rows often expose Years / Months as form rows 4 & 6 (Selector Hub), sometimes 5 & 7 or 6 & 8 (see `DOSoleTraderDetailsPage.enterTimeInBusiness`).
    const soleTradeRowPairs: Array<[number, number]> = [
      [4, 6],
      [5, 7],
      [6, 8],
      [3, 5],
    ];
    for (const [yIdx, mIdx] of soleTradeRowPairs) {
      const yIn = root
        .locator(
          `form > div:nth-child(1) > div:nth-child(${yIdx}) text div div:nth-child(2) input`,
        )
        .first();
      const mIn = root
        .locator(
          `form > div:nth-child(1) > div:nth-child(${mIdx}) text div div:nth-child(2) input`,
        )
        .first();
      const yOk = await yIn.isVisible({ timeout: 2000 }).catch(() => false);
      const mOk = await mIn.isVisible({ timeout: 2000 }).catch(() => false);
      if (yOk && mOk) {
        await yIn.fill(years);
        await mIn.fill(months);
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
        has: root.getByText(/Time with (Current Employer|Previous Employer|Employer)/i),
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

    const legacyY = root
      .locator(
        "form > div > div:nth-child(5) > text > div > div:nth-child(2) > input",
      )
      .first();
    const legacyM = root
      .locator(
        "form > div > div:nth-child(6) > text > div > div:nth-child(2) > input",
      )
      .first();
    const legacyYOk = await legacyY.isVisible().catch(() => false);
    const legacyMOk = await legacyM.isVisible().catch(() => false);
    if (legacyYOk && legacyMOk) {
      await legacyY.fill(years);
      await legacyM.fill(months);
      return;
    }
    if (legacyYOk || legacyMOk) {
      throw new Error(
        "Time with Employer: only one of Years/Months inputs resolved — refusing partial fill (fix locators).",
      );
    }

    throw new Error(
      "Time with Employer: could not resolve visible Years and Months inputs for this layout.",
    );
  }

  async enterCurrentTimeWithEmployer(
    years: string,
    months: string,
  ): Promise<void> {
    this.logStep(
      `Entered current time with employer: years ${this.stepValueDisplay(years)}, months ${this.stepValueDisplay(months)}`,
    );
    const root = await this.resolveEmploymentFormRoot();
    await this.fillTimeYearsMonthsInCard(root, years, months);
  }

  async enterPreviousEmployerName(name: string): Promise<void> {
    this.logStep(`Entered previous employer name as ${this.stepValueDisplay(name)}`);
    const root = await this.resolvePreviousEmploymentFormRoot();
    const input = this.previousEmploymentEmployerNameInput(root);
    await input.waitFor({ state: "visible", timeout: 30_000 });
    if (!name.trim()) {
      await input.click({ force: true }).catch(() => {});
      await input.fill("");
      await input.press("Tab").catch(() => {});
      return;
    }
    await input.fill(name);
  }

  async selectPreviousOccupation(optionName: string): Promise<void> {
    this.logStep(`Selected previous occupation: ${this.stepValueDisplay(optionName)}`);
    const root = await this.resolvePreviousEmploymentFormRoot();
    await this.selectPreviousEmploymentDropdown(root, "Occupation", 0, optionName);
  }

  async selectPreviousEmploymentType(optionName: string): Promise<void> {
    this.logStep(`Selected previous employment type: ${this.stepValueDisplay(optionName)}`);
    const root = await this.resolvePreviousEmploymentFormRoot();
    await this.selectPreviousEmploymentDropdown(root, "Employment Type", 1, optionName);
  }

  async enterPreviousTimeWithEmployer(
    years: string,
    months: string,
  ): Promise<void> {
    this.logStep(
      `Entered previous time with employer: years ${this.stepValueDisplay(years)}, months ${this.stepValueDisplay(months)}`,
    );
    const root = await this.resolvePreviousEmploymentFormRoot();
    await this.fillTimeYearsMonthsInCard(root, years, months);
  }

  async clickNextButton(): Promise<void> {
    this.logStep("Click Next Button");
    await this.nextButton.waitFor({ state: "visible", timeout: 60000 });
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
  }
}
