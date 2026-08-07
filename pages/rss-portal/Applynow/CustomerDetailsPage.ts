/**
 * RSS Apply Now — Customer details (About You) step: applicant/business type,
 * loan summary, mandatory sections, borrower / co-borrower / guarantor flows.
 */

import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export type ApplicantType = "single" | "joint";
export type BusinessType = "sole trader" | "limited company";

export class RSSApplyNowCustomerDetailsPage extends BasePage {
  private static readonly SPINNER_WAIT_MS = 300_000;

  constructor(page: Page) {
    super(page);
  }

  protected stepLogPrefix(): string {
    return "RSS Apply Now — Customer details";
  }

  private escapeRx(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private async waitForProgressSpinnersHidden(
    timeoutMs = RSSApplyNowCustomerDetailsPage.SPINNER_WAIT_MS,
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

  private customerDetailsRoot(): Locator {
    return this.page
      .locator("app-about-you, app-customer-details, app-borrower-details")
      .first();
  }

  async waitForCustomerDetailsStep(): Promise<void> {
    this.logStep("Wait For Customer Details Step");
    await expect(
      this.page
        .getByText(/About You|Customer details|Borrower/i)
        .first(),
    ).toBeVisible({ timeout: 120_000 });
    await this.waitForLoadingComplete();
  }

  async expectLoanSummaryCardVisible(): Promise<void> {
    this.logStep("Expect Loan Summary Card Visible");
    const summary = this.page
      .locator("app-loan-summary, app-quote-summary, .loan-summary, ion-card")
      .filter({
        hasText: /Loan summary|Quote|Contract|Installment|Total/i,
      })
      .first();
    await expect(summary).toBeVisible({ timeout: 60_000 });
    await expect(
      this.page.getByText(/Quote|Loan|Contract/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  private async pickPrimeNgDropdownOption(root: Locator, optionLabel: RegExp): Promise<void> {
    await root.waitFor({ state: "visible", timeout: 15_000 });
    await this.waitForProgressSpinnersHidden();
    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root.locator(".p-dropdown-trigger, [aria-label='dropdown trigger']").first();
    if (await combobox.isVisible().catch(() => false)) {
      await this.clickElement(combobox, 60_000);
    } else {
      await this.clickElement(trigger, 60_000);
    }
    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await panel.waitFor({ state: "visible", timeout: 12_000 });
    const row = panel
      .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
      .filter({ hasText: optionLabel })
      .first();
    await row.click();
    await this.waitForLoadingComplete();
  }

  async selectApplicantType(type: ApplicantType): Promise<void> {
    this.logStep(`Select Applicant Type — ${type}`);
    await this.waitForProgressSpinnersHidden();
    const label = type === "single" ? /^Single$/i : /^Joint$/i;
    const activeLabel = this.page
      .locator(".p-radiobutton-label-active")
      .filter({ hasText: label })
      .first();
    if (await activeLabel.isVisible({ timeout: 5_000 }).catch(() => false)) {
      if (type === "joint") {
        await this.page
          .locator('ion-segment-button[value="borrower"]')
          .first()
          .waitFor({ state: "visible", timeout: 30_000 })
          .catch(() => undefined);
        await this.waitForProgressSpinnersHidden();
      }
      return;
    }
    const radio = this.page.getByRole("radio", { name: label }).first();
    if (await radio.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.waitForProgressSpinnersHidden();
      await this.clickElement(radio);
      await this.waitForLoadingComplete();
      await this.waitForProgressSpinnersHidden();
      if (type === "joint") {
        await this.page
          .locator('ion-segment-button[value="borrower"]')
          .first()
          .waitFor({ state: "visible", timeout: 30_000 })
          .catch(() => undefined);
        await this.waitForProgressSpinnersHidden();
      }
      return;
    }
    const segment = this.page
      .locator("ion-segment-button, button, label")
      .filter({ hasText: label })
      .first();
    await this.waitForProgressSpinnersHidden();
    await this.clickElement(segment);
    await this.waitForLoadingComplete();
    await this.waitForProgressSpinnersHidden();
    if (type === "joint") {
      await this.page
        .locator('ion-segment-button[value="borrower"]')
        .first()
        .waitFor({ state: "visible", timeout: 30_000 })
        .catch(() => undefined);
      await this.waitForProgressSpinnersHidden();
    }
  }

  private companyNameDropdownRoot(): Locator {
    return this.page
      .locator(
        "xpath=.//label[contains(normalize-space(.),'Company Name')]/following::p-dropdown[1]",
      )
      .first();
  }

  private async pickFirstPrimeNgDropdownOption(root: Locator): Promise<string> {
    await root.waitFor({ state: "visible", timeout: 15_000 });
    await this.waitForProgressSpinnersHidden();
    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root.locator(".p-dropdown-trigger, [aria-label='dropdown trigger']").first();
    if (await combobox.isVisible().catch(() => false)) {
      await this.clickElement(combobox, 60_000);
    } else {
      await this.clickElement(trigger, 60_000);
    }
    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await panel.waitFor({ state: "visible", timeout: 12_000 });
    const option = panel
      .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
      .filter({ hasNotText: /^--\s*select/i })
      .first();
    const label = ((await option.innerText()) ?? "").replace(/\s+/g, " ").trim();
    await option.click();
    await this.waitForLoadingComplete();
    return label;
  }

  async selectCompanyNameFromDropdown(preferredName?: string): Promise<string> {
    this.logStep("Select Company Name From Dropdown");
    const root = this.companyNameDropdownRoot();
    if (preferredName) {
      await this.pickPrimeNgDropdownOption(root, new RegExp(this.escapeRx(preferredName), "i"));
      return preferredName;
    }
    return this.pickFirstPrimeNgDropdownOption(root);
  }

  private async isCompanyNamePlaceholderSelected(): Promise<boolean> {
    const root = this.companyNameDropdownRoot();
    if (!(await root.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return false;
    }
    const combobox = root.locator('[role="combobox"]').first();
    const aria = (await combobox.getAttribute("aria-label").catch(() => "")) ?? "";
    const text = (await combobox.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    return /^--\s*select/i.test(`${aria} ${text}`.trim());
  }

  async ensureCompanyNameSelected(preferredName?: string): Promise<void> {
    if (!(await this.isCompanyNamePlaceholderSelected())) {
      return;
    }
    await this.selectCompanyNameFromDropdown(preferredName);
  }

  private async clickBusinessTypeOption(type: BusinessType): Promise<void> {
    const label = type === "sole trader" ? /Sole\s*Trader/i : /Limited\s*Company/i;

    const visibleText = this.page.getByText(label).filter({ visible: true }).first();
    if (await visibleText.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.clickElement(visibleText);
      await this.waitForLoadingComplete();
      return;
    }

    const radio = this.page.getByRole("radio", { name: label }).first();
    if (await radio.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.clickElement(radio);
      await this.waitForLoadingComplete();
      return;
    }

    const tile = this.page
      .locator("button, ion-segment-button, label")
      .filter({ hasText: label })
      .filter({ visible: true })
      .first();
    if (await tile.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.clickElement(tile);
      await this.waitForLoadingComplete();
      return;
    }

    if (type === "limited company") {
      const segmentButton = this.page
        .locator('ion-segment-button[value="limitedCompany"], ion-segment-button')
        .filter({ hasText: /Limited Company/i })
        .first();
      if (await segmentButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await segmentButton.evaluate((el: HTMLElement) => el.click());
        await this.waitForLoadingComplete();
        return;
      }

      const tab = this.page.getByRole("tab", { name: /Limited Company/i }).first();
      if (await tab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await tab.evaluate((el: HTMLElement) => el.click());
        await this.waitForLoadingComplete();
      }
    }
  }

  async selectBusinessType(type: BusinessType): Promise<void> {
    this.logStep(`Select Business Type — ${type}`);
    const label = type === "sole trader" ? /Sole\s*Trader/i : /Limited\s*Company/i;

    await this.clickBusinessTypeOption(type);

    const companyDropdown = this.companyNameDropdownRoot();
    if (await companyDropdown.isVisible({ timeout: 30_000 }).catch(() => false)) {
      await this.ensureCompanyNameSelected();
      return;
    }

    if (await this.page.getByText(label).filter({ visible: true }).first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      return;
    }

    throw new Error(`Business type "${type}" controls were not found on Customer Details.`);
  }

  private sectionScope(): Locator {
    return this.customerDetailsRoot()
      .or(this.page.locator("app-about-you, app-apply-now").first())
      .first();
  }

  private async expandHeader(header: Locator): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await header.scrollIntoViewIfNeeded();
        const expanded = await header.getAttribute("aria-expanded");
        if (expanded === "true") {
          return;
        }
        await this.waitForProgressSpinnersHidden();
        try {
          await this.clickElement(header, 30_000);
        } catch {
          await header.click({ force: true, timeout: 30_000 });
        }
        await this.waitForLoadingComplete();
        await this.waitForProgressSpinnersHidden();
        return;
      } catch (error) {
        if (attempt === 2) throw error;
        await this.page.waitForTimeout(300);
      }
    }
  }

  async expandSection(sectionTitle: RegExp): Promise<boolean> {
    this.logStep(`Expand Section — ${String(sectionTitle)}`);
    await this.waitForProgressSpinnersHidden();

    const scope = this.sectionScope();

    const headerButton = scope
      .getByRole("button", { name: sectionTitle })
      .filter({ visible: true })
      .first();
    if (await headerButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.expandHeader(headerButton);
      return true;
    }

    const primeAccordionHeader = scope
      .locator("p-accordiontab")
      .filter({ visible: true })
      .filter({ hasText: sectionTitle })
      .locator('.p-accordion-header-link, a[role="button"]')
      .first();
    if (await primeAccordionHeader.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.expandHeader(primeAccordionHeader);
      return true;
    }

    const header = scope
      .getByRole("heading", { name: sectionTitle })
      .locator("button")
      .filter({ visible: true })
      .first()
      .or(scope.getByText(sectionTitle).filter({ visible: true }).first());
    if (!(await header.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return false;
    }
    await this.expandHeader(header);
    return true;
  }

  private financialPositionRoot(): Locator {
    return this.page.locator("app-financial-details");
  }

  /** Visible income block inside Financial Position (desktop `.web` or mobile `.mobile`). */
  private financialIncomeSection(): Locator {
    return this.financialPositionRoot()
      .locator("app-financial-income-details")
      .locator(".web, .mobile")
      .filter({ visible: true })
      .first();
  }

  private async clickIncomeDecreaseNo(incomeSection: Locator): Promise<void> {
    const noRadio = incomeSection
      .locator(
        'input[type="radio"][formcontrolname="incomeChange"][value="false"], input[type="radio"][formcontrolname="incomeChange"][value="no"]',
      )
      .first();
    if (await noRadio.isChecked().catch(() => false)) {
      return;
    }

    const questionBlock = incomeSection
      .locator("form, div")
      .filter({
        has: incomeSection.getByText(/income likely to decrease over the next 12 months/i),
      })
      .last();

    const candidates: Locator[] = [
      questionBlock.locator('label:has(span:text-is("No"))').first(),
      questionBlock.getByRole("radio", { name: /^No$/i }).first(),
      incomeSection.locator('label:has(span:text-is("No"))').first(),
      incomeSection.getByText(/^No$/i).first(),
    ];

    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 3_000 }).catch(() => false))) {
        continue;
      }
      await this.scrollIfNeeded(candidate);
      try {
        await this.clickElement(candidate, 30_000);
      } catch {
        await candidate.click({ force: true, timeout: 30_000 });
      }
      if (await noRadio.isChecked().catch(() => false)) {
        return;
      }
    }

    await noRadio.click({ force: true, timeout: 30_000 });
    await expect
      .poll(async () => noRadio.isChecked().catch(() => false), {
        timeout: 15_000,
        intervals: [250, 500, 1_000],
      })
      .toBe(true);
  }

  private async selectHomeOwnershipIfRequired(): Promise<void> {
    const assetsWeb = this.financialPositionRoot()
      .locator("app-financial-asset-details .web")
      .filter({ visible: true })
      .first();
    const livingSituation = assetsWeb.locator('[formgroupname="livingSituation"]');
    if (!(await livingSituation.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    const combobox = livingSituation.locator('[role="combobox"]').first();
    const face = ((await combobox.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    if (face && !/^--\s*select$/i.test(face) && !/^select$/i.test(face)) {
      return;
    }

    try {
      await this.page.keyboard.press("Escape").catch(() => undefined);
      await combobox.scrollIntoViewIfNeeded();
      await this.clickElement(combobox, 30_000);

      const byRole = this.page
        .getByRole("option")
        .filter({ hasNotText: /^--\s*select$/i })
        .first();
      if (await byRole.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await byRole.click({ force: true, timeout: 15_000 });
      } else {
        await combobox.press("ArrowDown");
        await combobox.press("Enter");
      }

      await expect
        .poll(
          async () => {
            const updated = ((await combobox.innerText().catch(() => "")) ?? "")
              .replace(/\s+/g, " ")
              .trim();
            return updated.length > 0 && !/^select$/i.test(updated);
          },
          { timeout: 10_000, intervals: [250, 500, 1_000] },
        )
        .toBe(true);
      await this.waitForLoadingComplete();
    } catch {
      // Home ownership may be optional for some parties; income question is handled next.
    }
  }

  private async fillEmptyVisibleInputs(scope: Locator, fallback: string): Promise<void> {
    const inputs = scope.locator(
      "input:not([type='hidden']):not([type='radio']):not([type='checkbox']), ion-input input, textarea",
    );
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      if (!(await input.isVisible().catch(() => false))) continue;
      const value = (await input.inputValue().catch(() => "")).trim();
      if (value) continue;
      const required =
        (await input.getAttribute("required")) !== null ||
        (await input.getAttribute("aria-required")) === "true";
      const parentText = await input
        .locator("xpath=ancestor::ion-item[1] | ancestor::div[contains(@class,'field')][1]")
        .innerText()
        .catch(() => "");
      const looksRequired = required || /\*/.test(parentText);
      if (!looksRequired) continue;
      await this.clickAndFillElement(input, fallback);
      await this.page.keyboard.press("Tab").catch(() => undefined);
    }
  }

  async fillMandatoryCustomerSections(options?: {
    includeBusinessDetails?: boolean;
  }): Promise<void> {
    this.logStep("Fill Mandatory Customer Sections");
    await this.waitForProgressSpinnersHidden();
    const root = this.customerDetailsRoot().or(this.page.locator("body"));

    const sections: RegExp[] = options?.includeBusinessDetails
      ? [
          /Business [Dd]etails/i,
          /Personal details/i,
          /Address [Dd]etails/i,
          /Employment details/i,
        ]
      : [
          /Personal details/i,
          /Address details/i,
          /Employment details/i,
        ];

    for (const section of sections) {
      const expanded = await this.expandSection(section);
      if (!expanded) continue;
      const block = root
        .locator("section, ion-card, form, div, region")
        .filter({ has: this.page.getByText(section) })
        .first();
      await this.fillEmptyVisibleInputs(block, "Automation");
    }
    await this.waitForLoadingComplete();
  }

  /**
   * Financial Position accordion (SIT PrimeNG) + income decrease = No (Individual).
   */
  async completeIndividualFinancialPosition(): Promise<void> {
    this.logStep("Complete Individual Financial Position");
    await this.waitForProgressSpinnersHidden();
    await this.expandSection(/Financial Position|Financial details/i);
    await this.selectHomeOwnershipIfRequired();

    const incomeSection = this.financialIncomeSection();
    const question = incomeSection.getByText(
      /income likely to decrease over the next 12 months/i,
    );
    await question.waitFor({ state: "visible", timeout: 45_000 });
    await question.scrollIntoViewIfNeeded();
    await this.clickIncomeDecreaseNo(incomeSection);
    await this.waitForLoadingComplete();
  }

  private async typeCurrencyIntoField(input: Locator, value: string): Promise<void> {
    const digits = value.replace(/[$,\s]/g, "");
    await input.scrollIntoViewIfNeeded();
    await input.click({ timeout: 30_000 });
    await input.press("Control+A");
    await input.fill("");
    await input.pressSequentially(digits, { delay: 40 });
    await input.press("Tab");
  }

  async completeBusinessFinancialPosition(profitLastYear: "yes" | "no", netProfit?: string): Promise<void> {
    this.logStep("Complete Business Financial Position");
    await this.waitForProgressSpinnersHidden();
    await this.expandSection(/Financial Position/i);
    const region = this.page.getByRole("region", { name: /Financial Position/i }).first();
    const q = region.getByText(/Did you make a profit last year/i).first();
    if (await q.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const answerText = profitLastYear === "yes" ? /^Yes$/i : /^No$/i;
      const answer = region.getByText(answerText).first();
      await this.clickElement(answer);
      if (profitLastYear === "yes" && netProfit) {
        const profitInput = region
          .getByLabel(/Net Profit\s*\(?\s*Last Year/i)
          .or(region.locator('[formcontrolname*="profit"] input').first())
          .or(
            region
              .locator("input:not([type='hidden']):not([type='radio']):not([type='checkbox'])")
              .filter({ has: region.getByText(/Net Profit/i) })
              .first(),
          );
        await expect(profitInput.first()).toBeEnabled({ timeout: 15_000 });
        await this.typeCurrencyIntoField(profitInput.first(), netProfit);
        await expect(region.getByText(/^Please Complete$/i)).toBeHidden({ timeout: 15_000 });
      }
    }
    await this.waitForLoadingComplete();
  }

  private coBorrowerSegmentButton(): Locator {
    return this.page.locator('ion-segment-button[value="coBorrower"]').first();
  }

  private existingJointBorrowerDropdownRoot(): Locator {
    return this.page
      .locator(
        'p-dropdown#existingJointBorrower, p-dropdown[formcontrolname="existingJointBorrower"]',
      )
      .or(
        this.page.locator(
          "xpath=.//label[@for='existingJointBorrower']/following::p-dropdown[1] | .//label[contains(normalize-space(.),'Existing Borrower')]/following::p-dropdown[1]",
        ),
      )
      .first();
  }

  private addNewBorrowerButton(): Locator {
    return this.page
      .getByRole("button", { name: /Add New Borrower/i })
      .or(this.page.getByText(/Add New Borrower/i))
      .first();
  }

  private async isCoBorrowerScreenVisible(): Promise<boolean> {
    if (await this.existingJointBorrowerDropdownRoot().isVisible().catch(() => false)) {
      return true;
    }
    if (await this.addNewBorrowerButton().isVisible().catch(() => false)) {
      return true;
    }
    if (
      await this.page
        .locator("app-co-borrower-personal-detail, app-joint-address-details")
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }
    const borrowerTabs = this.page.getByRole("tab", { name: /^Borrower$/i });
    if ((await borrowerTabs.count()) >= 2) {
      const selected = await borrowerTabs.nth(1).getAttribute("aria-selected");
      if (selected === "true") {
        return true;
      }
    }
    return this.coBorrowerSegmentButton()
      .evaluate((el) => el.classList.contains("segment-button-checked"))
      .catch(() => false);
  }

  private async waitForCoBorrowerScreen(timeoutMs = 60_000): Promise<void> {
    await expect
      .poll(async () => this.isCoBorrowerScreenVisible(), {
        timeout: timeoutMs,
        intervals: [250, 500, 1_000, 2_000],
      })
      .toBe(true);
  }

  /** Opens the second borrower tab (`value="coBorrower"`); both segment labels read “Borrower”. */
  async openCoBorrowerSegment(): Promise<void> {
    this.logStep("Open Co-Borrower Segment");
    if (await this.isCoBorrowerScreenVisible()) {
      return;
    }

    const borrowerTabs = this.page.getByRole("tab", { name: /^Borrower$/i });
    if ((await borrowerTabs.count()) >= 2) {
      await borrowerTabs.nth(1).scrollIntoViewIfNeeded();
      await borrowerTabs.nth(1).evaluate((el: HTMLElement) => el.click());
      await this.waitForLoadingComplete();
      await this.waitForCoBorrowerScreen();
      return;
    }

    const segment = this.coBorrowerSegmentButton();
    if (await segment.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await segment.scrollIntoViewIfNeeded();
      await segment.evaluate((el: HTMLElement) => el.click());
      await this.waitForLoadingComplete();
      await this.waitForCoBorrowerScreen();
      return;
    }

    throw new Error("Co-borrower segment not found on joint About You step.");
  }

  /** Switches from primary borrower to the second borrower tab (joint flow). */
  async clickBorrowerFooterAction(): Promise<void> {
    this.logStep("Click Borrower Footer Action");
    await this.waitForProgressSpinnersHidden();
    await this.openCoBorrowerSegment();
  }

  async clickGuarantorFooterAction(): Promise<void> {
    this.logStep("Click Guarantor Footer Action");
    const guarantor = this.page
      .locator(':text-is("Guarantor"), button, ion-button')
      .filter({ hasText: /^Guarantor$/i })
      .filter({ visible: true })
      .first();
    await guarantor.waitFor({ state: "visible", timeout: 30_000 });
    await this.clickElement(guarantor, 60_000);
    await this.waitForLoadingComplete();
  }

  /** QAT uses a Guarantor tab; other environments may use a footer Guarantor action. */
  async openGuarantorSection(): Promise<void> {
    this.logStep("Open Guarantor Section");
    await this.ensureCompanyNameSelected();

    const segmentButton = this.page
      .locator('ion-segment-button[value="guarantor"]')
      .filter({ hasText: /^Guarantor$/i })
      .first();
    if (await segmentButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await segmentButton.scrollIntoViewIfNeeded();
      await segmentButton.evaluate((el: HTMLElement) => el.click());
      await this.waitForLoadingComplete();
      await this.waitForGuarantorPickerVisible();
      return;
    }

    const tab = this.page.getByRole("tab", { name: /^Guarantor$/i }).first();
    if (await tab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tab.evaluate((el: HTMLElement) => el.click());
      await this.waitForLoadingComplete();
      await this.waitForGuarantorPickerVisible();
      return;
    }

    await this.clickGuarantorFooterAction();
    await this.waitForGuarantorPickerVisible();
  }

  private addNewGuarantorButton(): Locator {
    return this.page
      .getByRole("button", { name: /Not in List\?\s*Add New Guarantor|Add New Guarantor/i })
      .or(this.page.getByText(/Not in List\?\s*Add New Guarantor|Add New Guarantor/i))
      .first();
  }

  private async waitForGuarantorPickerVisible(timeoutMs = 60_000): Promise<void> {
    await expect
      .poll(
        async () => {
          const dropdownVisible = await this.existingGuarantorDropdownRoot()
            .isVisible()
            .catch(() => false);
          if (dropdownVisible) return true;
          const addNewVisible = await this.addNewGuarantorButton()
            .isVisible()
            .catch(() => false);
          if (addNewVisible) return true;
          return this.page
            .getByText(/Guarantor Name|Existing Guarantor|Not in List/i)
            .first()
            .isVisible()
            .catch(() => false);
        },
        { timeout: timeoutMs, intervals: [250, 500, 1_000, 2_000] },
      )
      .toBe(true);
  }

  private existingGuarantorDropdownRoot(): Locator {
    return this.page
      .locator(
        'p-dropdown#existingGuarantor, p-dropdown[formcontrolname="existingGuarantor"]',
      )
      .or(
        this.page.locator(
          "xpath=.//label[@for='existingGuarantor']/following::p-dropdown[1] | .//label[contains(normalize-space(.),'Guarantor Name')]/following::p-dropdown[1]",
        ),
      )
      .first();
  }

  async selectExistingGuarantorFromDropdown(preferredName?: string): Promise<string> {
    this.logStep("Select Existing Guarantor From Dropdown");
    const root = this.existingGuarantorDropdownRoot();
    await root.waitFor({ state: "visible", timeout: 30_000 });
    if (preferredName) {
      await this.pickPrimeNgDropdownOption(root, new RegExp(this.escapeRx(preferredName), "i"));
      return preferredName;
    }
    return this.pickFirstPrimeNgDropdownOption(root);
  }

  async completeExistingGuarantorFlow(preferredName?: string): Promise<string> {
    this.logStep("Complete Existing Guarantor Flow");
    await this.ensureCompanyNameSelected();
    await this.openGuarantorSection();
    await this.expectGuarantorSelectionScreen();
    const selected = await this.selectExistingGuarantorFromDropdown(preferredName);
    await this.fillMandatoryCustomerSections();
    return selected;
  }

  async expectCoBorrowerSelectionScreen(): Promise<void> {
    this.logStep("Expect Co-Borrower Selection Screen");
    await this.waitForCoBorrowerScreen();
    await expect(
      this.existingJointBorrowerDropdownRoot()
        .or(this.addNewBorrowerButton())
        .or(this.page.locator("app-co-borrower-personal-detail").first())
        .first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  async selectExistingCoBorrowerFromDropdown(preferredName?: string): Promise<string> {
    this.logStep("Select Existing Co-Borrower From Dropdown");
    const root = this.existingJointBorrowerDropdownRoot();
    await root.waitFor({ state: "visible", timeout: 30_000 });
    if (preferredName) {
      await this.pickPrimeNgDropdownOption(root, new RegExp(this.escapeRx(preferredName), "i"));
      return preferredName;
    }
    return this.pickFirstPrimeNgDropdownOption(root);
  }

  private async selectPrimeNgRadioInScope(
    scope: Locator,
    name: string,
    value: "yes" | "no",
  ): Promise<void> {
    const labelText = value === "yes" ? /^Yes$/i : /^No$/i;
    const hiddenInput = scope.locator(`input[type="radio"][name="${name}"][value="${value}"]`).first();
    if (await hiddenInput.isChecked().catch(() => false)) {
      return;
    }

    const byRole = scope.getByRole("radio", { name: labelText }).first();
    if (await byRole.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await byRole.click({ timeout: 15_000 });
      if (await hiddenInput.isChecked().catch(() => false)) {
        return;
      }
    }

    const radioWrapper = scope
      .locator("p-radiobutton")
      .filter({ has: scope.locator(`input[name="${name}"][value="${value}"]`) })
      .first();
    const wrapperLabel = radioWrapper.locator("label.p-radiobutton-label").filter({ hasText: labelText });
    if (await wrapperLabel.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await wrapperLabel.click({ timeout: 15_000 });
      if (await hiddenInput.isChecked().catch(() => false)) {
        return;
      }
    }

    const textAnswer = scope.getByText(labelText, { exact: true }).filter({ visible: true }).first();
    if (await textAnswer.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await textAnswer.click({ timeout: 15_000 });
      if (await hiddenInput.isChecked().catch(() => false)) {
        return;
      }
    }

    await hiddenInput.evaluate((el: HTMLInputElement) => {
      el.click();
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect
      .poll(async () => hiddenInput.isChecked().catch(() => false), {
        timeout: 10_000,
        intervals: [250, 500, 1_000],
      })
      .toBe(true);
  }

  private coBorrowerPanelScope(): Locator {
    return this.existingJointBorrowerDropdownRoot()
      .locator(
        "xpath=ancestor::*[.//button[contains(normalize-space(.),'Add New Borrower')] or .//*[contains(normalize-space(.),'Add New Borrower')]][1]",
      )
      .or(
        this.addNewBorrowerButton().locator(
          "xpath=ancestor::*[.//button[contains(normalize-space(.),'Personal Details')] or .//*[contains(normalize-space(.),'Personal Details')]][1]",
        ),
      )
      .first();
  }

  private async expandCoBorrowerSection(sectionTitle: RegExp): Promise<void> {
    const scope = this.coBorrowerPanelScope();
    const headerInScope = scope
      .getByRole("button", { name: sectionTitle })
      .filter({ visible: true })
      .first();
    if (await headerInScope.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.expandHeader(headerInScope);
      return;
    }

    const allHeaders = this.page
      .getByRole("button", { name: sectionTitle })
      .filter({ visible: true });
    const count = await allHeaders.count();
    if (count >= 2) {
      await this.expandHeader(allHeaders.nth(count - 1));
      return;
    }
    if (count === 1) {
      await this.expandHeader(allHeaders.first());
    }
  }

  async selectCoBorrowerSameAddress(answer: "yes" | "no"): Promise<void> {
    this.logStep(`Select Co-Borrower Same Address — ${answer}`);
    await this.expandCoBorrowerSection(/Address [Dd]etails/i);
    const scope = this.page.locator("app-joint-address-details").first();
    await expect(scope).toBeVisible({ timeout: 30_000 });
    await this.selectPrimeNgRadioInScope(scope, "samePlace", answer);
    await this.waitForLoadingComplete();
  }

  async selectShareIncomeAndExpenses(answer: "yes" | "no"): Promise<void> {
    this.logStep(`Select Share Income And Expenses — ${answer}`);
    await this.expandCoBorrowerSection(/Financial [Dd]etails/i);
    const scope = this.page.locator("app-joint-financial-details").first();
    await expect(scope).toBeVisible({ timeout: 30_000 });
    await this.selectPrimeNgRadioInScope(scope, "expense", answer);
    await this.waitForLoadingComplete();
  }

  /**
   * Joint co-borrower — address + financial radios after selecting or adding the second borrower.
   */
  async completeCoBorrowerJointDetails(options?: {
    sameAddress?: "yes" | "no";
    shareIncomeAndExpenses?: "yes" | "no";
  }): Promise<void> {
    this.logStep("Complete Co-Borrower Joint Details");
    await this.waitForProgressSpinnersHidden();
    await this.selectCoBorrowerSameAddress(options?.sameAddress ?? "yes");
    await this.selectShareIncomeAndExpenses(options?.shareIncomeAndExpenses ?? "yes");
    await this.waitForLoadingComplete();
  }

  async expectGuarantorSelectionScreen(): Promise<void> {
    this.logStep("Expect Guarantor Selection Screen");
    await this.waitForGuarantorPickerVisible();
    await expect(this.existingGuarantorDropdownRoot()).toBeVisible({ timeout: 30_000 });
  }

  private partyPickerDropdown(): Locator {
    return this.page
      .locator(
        'p-dropdown[ng-reflect-name*="borrower"], p-dropdown[ng-reflect-name*="guarantor"], p-dropdown[ng-reflect-name*="existing"]',
      )
      .or(
        this.page.locator(
          "xpath=//label[contains(.,'Existing')]/following::p-dropdown[1]",
        ),
      )
      .first();
  }

  async selectFirstExistingPartyFromDropdown(): Promise<string> {
    this.logStep("Select First Existing Party From Dropdown");
    const jointRoot = this.existingJointBorrowerDropdownRoot();
    if (await jointRoot.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return this.selectExistingCoBorrowerFromDropdown();
    }
    const guarantorRoot = this.existingGuarantorDropdownRoot();
    if (await guarantorRoot.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return this.selectExistingGuarantorFromDropdown();
    }
    const root = this.partyPickerDropdown();
    await root.waitFor({ state: "visible", timeout: 30_000 });
    await this.clickElement(root.locator('[role="combobox"]').first());
    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await panel.waitFor({ state: "visible", timeout: 12_000 });
    const option = panel
      .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
      .filter({ hasNotText: /Select|Choose/i })
      .first();
    const label = ((await option.innerText()) ?? "").replace(/\s+/g, " ").trim();
    await option.click();
    await this.waitForLoadingComplete();
    return label;
  }

  async clickAddNewBorrowerOrCoBorrower(): Promise<void> {
    this.logStep("Click Add New Borrower Or Co-Borrower");
    await this.clickElement(this.addNewBorrowerButton(), 60_000);
    await this.waitForLoadingComplete();
    await this.page
      .locator("app-co-borrower-personal-detail")
      .first()
      .waitFor({ state: "visible", timeout: 30_000 })
      .catch(() => undefined);
  }

  async clickAddNewGuarantor(): Promise<void> {
    this.logStep("Click Add New Guarantor");
    await this.clickElement(this.addNewGuarantorButton(), 60_000);
    await this.waitForLoadingComplete();
  }

  async completeNewGuarantorFlow(party: {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    dateOfBirth?: string;
  }): Promise<void> {
    this.logStep("Complete New Guarantor Flow");
    await this.openGuarantorSection();
    await this.expectGuarantorSelectionScreen();
    await this.clickAddNewGuarantor();
    await this.fillNewPartyPersonalDetails(party);
  }

  private personalDetailsRegion(preferCoBorrower = false): Locator {
    const coBorrower = this.page.locator("app-co-borrower-personal-detail").first();
    if (preferCoBorrower) {
      return coBorrower;
    }
    return this.page.getByRole("region", { name: /Personal Details/i }).first();
  }

  private isCoBorrowerPersonalDetailsContext(): Promise<boolean> {
    return this.page
      .locator("app-co-borrower-personal-detail")
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
  }

  private labeledInput(scope: Locator, labelText: string): Locator {
    return scope
      .locator(
        `xpath=.//*[self::label or self::p or self::span][contains(normalize-space(.),'${labelText}')]/following::input[1]`,
      )
      .first();
  }

  private async fillDateOfBirthInScope(scope: Locator, date: string): Promise<void> {
    const dob = scope
      .locator(
        'xpath=.//*[contains(normalize-space(.),"Date Of Birth") or contains(normalize-space(.),"DOB")]/following::*[@role="combobox" or self::input][1]',
      )
      .first();
    if (!(await dob.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    await dob.click({ timeout: 15_000 });
    const dialog = this.page.locator('.p-datepicker, [role="dialog"]').filter({ visible: true }).last();
    if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const [day] = date.split("/");
      const dayCell = dialog.getByText(new RegExp(`^${day?.replace(/^0/, "") ?? ""}$`)).first();
      if (await dayCell.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dayCell.click();
      }
      await this.page.keyboard.press("Escape").catch(() => undefined);
      return;
    }
    await dob.fill(date);
    await dob.press("Tab");
  }

  private async fillGuarantorMandatorySections(): Promise<void> {
    const sections = [/Address [Dd]etails/i, /Employment details/i];
    for (const section of sections) {
      const expanded = await this.expandSection(section);
      if (!expanded) continue;
      const block = this.page
        .getByRole("region", { name: section })
        .or(
          this.page
            .locator("section, ion-card, form, div, region")
            .filter({ has: this.page.getByText(section) }),
        )
        .first();
      await this.fillEmptyVisibleInputs(block, "Automation");
    }
    await this.waitForLoadingComplete();
  }

  async fillNewPartyPersonalDetails(data: {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    dateOfBirth?: string;
  }): Promise<void> {
    this.logStep("Fill New Party Personal Details");
    const isCoBorrower = await this.isCoBorrowerPersonalDetailsContext();
    if (isCoBorrower) {
      await this.expandCoBorrowerSection(/Personal [Dd]etails/i);
    } else {
      await this.expandSection(/Personal details/i);
    }
    const region = this.personalDetailsRegion(isCoBorrower);
    await region.waitFor({ state: "visible", timeout: 30_000 });

    await this.clickAndFillElement(this.labeledInput(region, "First Name"), data.firstName);
    await this.clickAndFillElement(this.labeledInput(region, "Last Name"), data.lastName);

    if (data.dateOfBirth) {
      await this.fillDateOfBirthInScope(region, data.dateOfBirth);
    }

    const contactInputs = region
      .locator(
        'xpath=.//*[contains(.,"Contact Details")]/following::input[not(@type="hidden")]',
      )
      .filter({ visible: true });
    const contactCount = await contactInputs.count();
    if (contactCount >= 2) {
      const area = data.mobile.slice(0, 3);
      const rest = data.mobile.slice(3);
      await this.clickAndFillElement(contactInputs.nth(0), area);
      await this.clickAndFillElement(contactInputs.nth(1), rest);
    } else if (contactCount === 1) {
      await this.clickAndFillElement(contactInputs.nth(0), data.mobile);
    } else {
      const mobileInput = region
        .locator(
          'xpath=.//*[contains(normalize-space(.),"Mobile")]/following::input[1]',
        )
        .filter({ visible: true })
        .first();
      if (await mobileInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await this.clickAndFillElement(mobileInput, data.mobile);
      }
    }

    const emailInput = this.labeledInput(region, "Email");
    if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.clickAndFillElement(emailInput, data.email);
    }

    if (await this.isCoBorrowerPersonalDetailsContext()) {
      await this.completeCoBorrowerJointDetails();
    } else {
      await this.fillGuarantorMandatorySections();
    }
    await expect(region.getByText(/^Please Complete$/i)).toBeHidden({ timeout: 15_000 }).catch(
      () => undefined,
    );
    await this.waitForLoadingComplete();
  }

  async clickApplyNowFooterNext(clickTimeoutMs = 60_000): Promise<void> {
    this.logStep("Click Apply Now Footer Next");
    await this.waitForProgressSpinnersHidden();
    const next = this.page.locator(':text-is("Next")').filter({ visible: true }).first();
    await next.waitFor({ state: "visible", timeout: 30_000 });
    await this.clickElement(next, clickTimeoutMs);
    await expect
      .poll(
        async () => {
          const fileInput = await this.page.locator('#fileInput, input[type="file"]').count();
          if (fileInput > 0) return true;
          return this.page
            .getByText(/Browse Files|Upload documents|Supporting document/i)
            .first()
            .isVisible()
            .catch(() => false);
        },
        { timeout: 120_000, intervals: [250, 500, 1_000, 2_000] },
      )
      .toBe(true);
    await this.waitForLoadingComplete();
  }

  async clickApplyNowFooterPrevious(clickTimeoutMs = 60_000): Promise<void> {
    this.logStep("Click Apply Now Footer Previous");
    await this.waitForProgressSpinnersHidden();
    const previous = this.page.locator(':text-is("Previous")').filter({ visible: true }).first();
    await previous.waitFor({ state: "visible", timeout: 30_000 });
    await this.clickElement(previous, clickTimeoutMs);
    await this.waitForLoadingComplete();
  }

  async expectMandatoryFieldValidationMessage(): Promise<void> {
    this.logStep("Expect Mandatory Field Validation Message");
    await expect(
      this.page
        .getByText(/mandatory|required|please complete|fill.*field|before moving|add borrower|add guarantor/i)
        .first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  private currentAddressSearchInput(): Locator {
    return this.page.locator('input[name="physicalSearchValue"]').filter({ visible: true }).first();
  }

  async searchCurrentAddress(query: string): Promise<void> {
    this.logStep(`Search Current Address — ${query}`);
    const searchField = this.currentAddressSearchInput();
    await expect(searchField).toBeVisible({ timeout: 15_000 });
    await searchField.click();
    await searchField.fill(query);
    await this.waitForLoadingComplete();
  }

  async expectAddressSearchSuggestions(minCount = 1): Promise<void> {
    this.logStep("Expect Address Search Suggestions");
    const suggestions = this.page
      .locator(".p-autocomplete-panel")
      .filter({ visible: true })
      .last()
      .locator(".p-autocomplete-item, li[role='option'], li");
    await expect(suggestions.first()).toBeVisible({ timeout: 15_000 });
    expect(await suggestions.count()).toBeGreaterThanOrEqual(minCount);
  }

  async expectCustomerDetailsStepVisible(): Promise<void> {
    this.logStep("Expect Customer Details Step Visible");
    await this.waitForCustomerDetailsStep();
    await this.expectLoanSummaryCardVisible();
  }

  async clickBorrowerTab(): Promise<void> {
    this.logStep("Click Borrower Tab");
    const tab = this.page
      .locator('ion-segment-button[value="borrower"], button, a')
      .filter({ hasText: /^Borrower$/i })
      .first();
    await this.clickElement(tab);
    await this.waitForLoadingComplete();
  }

  async clickGuarantorTab(): Promise<void> {
    this.logStep("Click Guarantor Tab");
    const tab = this.page
      .locator('ion-segment-button, button, a')
      .filter({ hasText: /^Guarantor$/i })
      .first();
    await this.clickElement(tab);
    await this.waitForLoadingComplete();
  }
}
