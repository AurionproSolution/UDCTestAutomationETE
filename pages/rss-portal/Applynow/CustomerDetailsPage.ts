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

  private limitedCompanyPanel(): Locator {
    return this.customerDetailsRoot()
      .locator(".p-tabview-panel, [role='tabpanel']")
      .filter({ visible: true })
      .filter({ has: this.page.getByText(/Company Name/i) })
      .first();
  }

  private companyNameDropdownRoot(): Locator {
    const inPanel = this.limitedCompanyPanel()
      .locator("p-dropdown")
      .filter({ has: this.page.locator('[role="combobox"]') })
      .first();
    const byLabel = this.page.locator(
      "xpath=.//label[contains(normalize-space(.),'Company Name')]/following::p-dropdown[1]",
    );
    const byNearbyText = this.page
      .getByText(/^Company Name/i)
      .locator("xpath=following::p-dropdown[1]");
    return inPanel.or(byLabel).or(byNearbyText).first();
  }

  private async companyNameSelectedLabelText(): Promise<string> {
    const root = this.companyNameDropdownRoot();
    if (!(await root.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return "";
    }
    const label = root.locator(".p-dropdown-label, [class*='p-dropdown-label']").first();
    if (await label.isVisible().catch(() => false)) {
      return ((await label.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    }
    const combobox = root.locator('[role="combobox"]').first();
    const aria = (await combobox.getAttribute("aria-label").catch(() => "")) ?? "";
    const text = ((await combobox.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    return `${aria} ${text}`.replace(/\s+/g, " ").trim();
  }

  private async waitForCompanyNameDropdownReady(timeoutMs = 60_000): Promise<void> {
    const root = this.companyNameDropdownRoot();
    await root.waitFor({ state: "visible", timeout: 30_000 });
    const combobox = root.locator('[role="combobox"]').first();
    const inner = root.locator(".p-dropdown").first();
    await expect
      .poll(
        async () => {
          const aria = await combobox.getAttribute("aria-disabled");
          const cls = (await inner.getAttribute("class").catch(() => "")) ?? "";
          return aria === "false" && !cls.includes("p-disabled");
        },
        { timeout: timeoutMs, intervals: [300, 600, 1_200, 2_000] },
      )
      .toBe(true);
    await this.waitForProgressSpinnersHidden(30_000).catch(() => undefined);
  }

  private async openCompanyNameDropdownPanel(root: Locator): Promise<Locator> {
    await this.waitForCompanyNameDropdownReady();
    await root.scrollIntoViewIfNeeded();
    await this.page.keyboard.press("Escape").catch(() => undefined);

    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root.locator(".p-dropdown-trigger, [aria-label='dropdown trigger']").first();
    if (await combobox.isVisible().catch(() => false)) {
      try {
        await combobox.click({ timeout: 15_000 });
      } catch {
        await trigger.click({ timeout: 15_000, force: true });
      }
    } else {
      await trigger.click({ timeout: 15_000 });
    }

    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await panel.waitFor({ state: "visible", timeout: 15_000 });
    return panel;
  }

  private async pickCompanyNameDropdownOption(optionLabel?: RegExp): Promise<string> {
    const root = this.companyNameDropdownRoot();

    for (let attempt = 0; attempt < 3; attempt++) {
      const panel = await this.openCompanyNameDropdownPanel(root);
      const options = panel.locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item");

      await expect
        .poll(
          async () => {
            const count = await options.count();
            for (let i = 0; i < count; i++) {
              const text = ((await options.nth(i).innerText().catch(() => "")) ?? "")
                .replace(/\s+/g, " ")
                .trim();
              if (!text || /^--\s*select/i.test(text)) {
                continue;
              }
              if (!optionLabel || optionLabel.test(text)) {
                return true;
              }
            }
            return false;
          },
          { timeout: 60_000, intervals: [300, 600, 1_200, 2_000] },
        )
        .toBe(true);

      let option = options.filter({ hasNotText: /^--\s*select/i }).first();
      if (optionLabel) {
        const preferred = options.filter({ hasText: optionLabel }).first();
        if (await preferred.isVisible({ timeout: 3_000 }).catch(() => false)) {
          option = preferred;
        }
      }

      const label = ((await option.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
      if (!label || /^--\s*select/i.test(label)) {
        await this.page.keyboard.press("Escape").catch(() => undefined);
        continue;
      }

      try {
        await option.click({ timeout: 10_000 });
      } catch {
        await option.click({ force: true, timeout: 10_000 }).catch(async () => {
          await option.evaluate((el: HTMLElement) => el.click());
        });
      }

      await panel.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
      await this.waitForLoadingComplete();
      await this.waitForProgressSpinnersHidden(20_000).catch(() => undefined);

      if (!(await this.isCompanyNamePlaceholderSelected())) {
        return label;
      }
    }

    throw new Error(
      "Company Name dropdown has no selectable options or selection did not stick.",
    );
  }

  private async pickFirstPrimeNgDropdownOption(root: Locator): Promise<string> {
    await root.waitFor({ state: "visible", timeout: 15_000 });
    await this.waitForProgressSpinnersHidden(30_000).catch(() => undefined);
    await root.scrollIntoViewIfNeeded();
    await this.page.keyboard.press("Escape").catch(() => undefined);

    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root.locator(".p-dropdown-trigger, [aria-label='dropdown trigger']").first();
    if (await combobox.isVisible().catch(() => false)) {
      try {
        await combobox.click({ timeout: 15_000 });
      } catch {
        await trigger.click({ timeout: 15_000, force: true });
      }
    } else {
      await trigger.click({ timeout: 15_000 });
    }

    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await panel.waitFor({ state: "visible", timeout: 15_000 });
    const options = panel.locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item");
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const option = options.nth(i);
      const label = ((await option.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
      if (!label || /^--\s*select/i.test(label)) {
        continue;
      }
      try {
        await option.click({ timeout: 10_000 });
      } catch {
        await option.click({ force: true, timeout: 10_000 }).catch(async () => {
          await option.evaluate((el: HTMLElement) => el.click());
        });
      }
      await panel.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
      await this.waitForLoadingComplete();
      return label;
    }
    await this.page.keyboard.press("Escape").catch(() => undefined);
    throw new Error("No selectable options found in PrimeNG dropdown.");
  }

  async selectCompanyNameFromDropdown(preferredName?: string): Promise<string> {
    this.logStep("Select Company Name From Dropdown");
    if (preferredName) {
      return this.pickCompanyNameDropdownOption(
        new RegExp(this.escapeRx(preferredName), "i"),
      );
    }
    return this.pickCompanyNameDropdownOption();
  }

  private async isCompanyNamePlaceholderSelected(): Promise<boolean> {
    const selected = await this.companyNameSelectedLabelText();
    if (!selected) {
      return false;
    }
    return /^--\s*select/i.test(selected);
  }

  async ensureCompanyNameSelected(preferredName?: string): Promise<void> {
    const root = this.companyNameDropdownRoot();
    if (!(await root.isVisible({ timeout: 15_000 }).catch(() => false))) {
      return;
    }
    if (!(await this.isCompanyNamePlaceholderSelected())) {
      return;
    }
    await this.selectCompanyNameFromDropdown(preferredName);
    if (await this.isCompanyNamePlaceholderSelected()) {
      throw new Error(
        "Company Name is still '-- Select --' after selecting from the dropdown.",
      );
    }
  }

  private async isBusinessTypeSelected(type: BusinessType): Promise<boolean> {
    const label = type === "sole trader" ? /Sole\s*Trader/i : /Limited\s*Company/i;
    const activeLabel = this.page
      .locator(".p-radiobutton-label-active, .p-highlight")
      .filter({ hasText: label })
      .first();
    if (await activeLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return true;
    }
    const radio = this.page.getByRole("radio", { name: label }).first();
    if (await radio.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return radio.isChecked().catch(() => false);
    }
    return false;
  }

  private async clickBusinessTypeOption(type: BusinessType): Promise<void> {
    const label = type === "sole trader" ? /Sole\s*Trader/i : /Limited\s*Company/i;

    if (await this.isBusinessTypeSelected(type)) {
      return;
    }

    // Prefer the radio control — getByText can hit the Limited Company tab and reset the form.
    const radio = this.page.getByRole("radio", { name: label }).first();
    if (await radio.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.clickElement(radio);
      await this.waitForLoadingComplete();
      await this.waitForProgressSpinnersHidden();
      return;
    }

    const radioLabel = this.page
      .locator(".p-radiobutton-label, label")
      .filter({ hasText: label })
      .filter({ visible: true })
      .first();
    if (await radioLabel.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.clickElement(radioLabel);
      await this.waitForLoadingComplete();
      await this.waitForProgressSpinnersHidden();
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
      await this.waitForProgressSpinnersHidden();
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
    await this.waitForProgressSpinnersHidden();

    const companyDropdown = this.companyNameDropdownRoot();
    if (type === "limited company") {
      await companyDropdown.waitFor({ state: "visible", timeout: 60_000 });
      await this.waitForCompanyNameDropdownReady();
      await this.ensureCompanyNameSelected();
      if (await this.isCompanyNamePlaceholderSelected()) {
        throw new Error(
          "Limited Company selected but Company Name is still '-- Select --'. Business Details will not appear.",
        );
      }
      return;
    }

    if (await companyDropdown.isVisible({ timeout: 10_000 }).catch(() => false)) {
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
        await header.scrollIntoViewIfNeeded({ timeout: 15_000 });
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
    const livingSituation = this.livingSituationGroup();
    if (!(await livingSituation.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    const combobox = livingSituation.locator('[role="combobox"]').first();
    const face = ((await combobox.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    if (face && !/^--\s*select$/i.test(face) && !/^select$/i.test(face)) {
      await this.fillHomeOwnershipAmountIfEmpty();
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
      await this.fillHomeOwnershipAmountIfEmpty();
    } catch {
      // Home ownership may be optional for some parties; income question is handled next.
    }
  }

  private livingSituationGroup(): Locator {
    return this.financialPositionRoot()
      .locator("app-financial-asset-details .web")
      .filter({ visible: true })
      .first()
      .locator('[formgroupname="livingSituation"]');
  }

  /** Home Ownership type without amount blocks footer Next on Sole Trader business flows. */
  private async fillHomeOwnershipAmountIfEmpty(defaultAmount = "100000"): Promise<void> {
    const livingSituation = this.livingSituationGroup();
    if (!(await livingSituation.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    const combobox = livingSituation.locator('[role="combobox"]').first();
    const face = ((await combobox.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    if (!face || /^select$/i.test(face) || /^--\s*select/i.test(face)) {
      return;
    }

    const amountField = livingSituation
      .locator(
        '[formcontrolname="amount"] input, [formcontrolname="value"] input, spinbutton, input.p-inputtext',
      )
      .filter({ visible: true })
      .first();
    if (!(await amountField.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }

    const raw =
      (await amountField.inputValue().catch(() => "")) ||
      (await amountField.innerText().catch(() => ""));
    const numeric = Number(raw.replace(/[^0-9.]/g, ""));
    if (numeric > 0) {
      return;
    }

    await this.page.keyboard.press("Escape").catch(() => undefined);
    await amountField.scrollIntoViewIfNeeded();
    await this.typeCurrencyIntoField(amountField, defaultAmount);
    await this.waitForLoadingComplete();
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
    if (options?.includeBusinessDetails) {
      await this.ensureCompanyNameSelected();
    }
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
    await this.selectHomeOwnershipIfRequired();
    await this.fillHomeOwnershipAmountIfEmpty();
    const incomeSection = this.financialIncomeSection();
    const incomeQuestion = incomeSection.getByText(
      /income likely to decrease over the next 12 months/i,
    );
    if (await incomeQuestion.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await incomeQuestion.scrollIntoViewIfNeeded();
      await this.clickIncomeDecreaseNo(incomeSection);
    }
    await this.waitForLoadingComplete();
  }

  private coBorrowerSegmentButton(): Locator {
    return this.page.locator('ion-segment-button[value="coBorrower"]').first();
  }

  private primaryBorrowerSegmentButton(): Locator {
    return this.page.locator('ion-segment-button[value="borrower"]').first();
  }

  /** PrimeNG joint borrower tabs — both labels read “Borrower”. */
  private jointBorrowerTabNav(): Locator {
    return this.customerDetailsRoot().locator(".p-tabview-nav").first();
  }

  private jointBorrowerNavItems(): Locator {
    return this.jointBorrowerTabNav().locator("li");
  }

  private jointBorrowerRoleTabs(): Locator {
    return this.customerDetailsRoot().getByRole("tab", { name: /^Borrower$/i });
  }

  private async activeJointBorrowerTabIndex(): Promise<number> {
    const navItems = this.jointBorrowerNavItems();
    if ((await navItems.count()) >= 2) {
      const count = await navItems.count();
      for (let i = 0; i < count; i++) {
        const cls = (await navItems.nth(i).getAttribute("class").catch(() => "")) ?? "";
        if (/p-highlight|p-tabview-selected/i.test(cls)) {
          return i;
        }
      }
    }

    const roleTabs = this.jointBorrowerRoleTabs();
    const tabCount = await roleTabs.count();
    for (let i = 0; i < tabCount; i++) {
      const selected = await roleTabs.nth(i).getAttribute("aria-selected");
      if (selected === "true") {
        return i;
      }
    }

    if (
      await this.coBorrowerSegmentButton()
        .evaluate((el) => el.classList.contains("segment-button-checked"))
        .catch(() => false)
    ) {
      return 1;
    }
    if (
      await this.primaryBorrowerSegmentButton()
        .evaluate((el) => el.classList.contains("segment-button-checked"))
        .catch(() => false)
    ) {
      return 0;
    }
    return -1;
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
    if ((await this.activeJointBorrowerTabIndex()) === 1) {
      return true;
    }
    if (await this.existingJointBorrowerDropdownRoot().isVisible().catch(() => false)) {
      return true;
    }
    if (await this.addNewBorrowerButton().isVisible().catch(() => false)) {
      return true;
    }
    return this.page
      .locator("app-co-borrower-personal-detail, app-joint-address-details")
      .first()
      .isVisible()
      .catch(() => false);
  }

  private async waitForCoBorrowerScreen(timeoutMs = 30_000): Promise<void> {
    await expect
      .poll(async () => this.isCoBorrowerScreenVisible(), {
        timeout: timeoutMs,
        intervals: [250, 500, 1_000],
      })
      .toBe(true);
  }

  private async clickJointBorrowerTabByIndex(index: 0 | 1): Promise<void> {
    if ((await this.activeJointBorrowerTabIndex()) === index) {
      return;
    }

    const navItems = this.jointBorrowerNavItems();
    if ((await navItems.count()) > index) {
      const item = navItems.nth(index);
      const link = item.locator("a.p-tabview-nav-link, [role='tab'], a").first();
      await item.scrollIntoViewIfNeeded();
      try {
        await link.click({ timeout: 15_000 });
      } catch {
        await link.click({ force: true, timeout: 10_000 });
      }
      await this.waitForLoadingComplete();
      await this.waitForProgressSpinnersHidden(20_000).catch(() => undefined);
    } else if ((await this.jointBorrowerRoleTabs().count()) > index) {
      const tab = this.jointBorrowerRoleTabs().nth(index);
      await tab.scrollIntoViewIfNeeded();
      try {
        await tab.click({ timeout: 15_000 });
      } catch {
        await tab.click({ force: true, timeout: 10_000 });
      }
      await this.waitForLoadingComplete();
      await this.waitForProgressSpinnersHidden(20_000).catch(() => undefined);
    } else {
      const segment =
        index === 0 ? this.primaryBorrowerSegmentButton() : this.coBorrowerSegmentButton();
      await segment.scrollIntoViewIfNeeded();
      try {
        await segment.click({ timeout: 15_000 });
      } catch {
        await segment.evaluate((el: HTMLElement) => el.click());
      }
      await this.waitForLoadingComplete();
      await this.waitForProgressSpinnersHidden(20_000).catch(() => undefined);
    }

    await expect
      .poll(async () => (await this.activeJointBorrowerTabIndex()) === index, {
        timeout: 20_000,
        intervals: [250, 500, 1_000],
      })
      .toBe(true);
  }

  /** Opens the second borrower tab (`value="coBorrower"`); both segment labels read “Borrower”. */
  async openCoBorrowerSegment(): Promise<void> {
    this.logStep("Open Co-Borrower Segment");
    if (await this.isCoBorrowerScreenVisible()) {
      return;
    }
    await this.clickJointBorrowerTabByIndex(1);
    await this.waitForCoBorrowerScreen();
  }

  /** Switches from primary borrower to the second borrower tab (joint flow). */
  async clickBorrowerFooterAction(): Promise<void> {
    this.logStep("Click Borrower Footer Action");
    await this.waitForProgressSpinnersHidden(30_000);
    await this.openCoBorrowerSegment();
  }

  private guarantorSegmentButton(): Locator {
    return this.customerDetailsRoot()
      .locator('ion-segment-button[value="guarantor"], ion-segment-button')
      .filter({ hasText: /^Guarantor$/i })
      .first();
  }

  private guarantorTabNavItems(): Locator {
    return this.customerDetailsRoot()
      .locator(".p-tabview-nav li")
      .filter({ hasText: /^Guarantor$/i });
  }

  private guarantorNavigationActions(): Locator {
    return this.customerDetailsRoot()
      .locator(
        'ion-segment-button[value="guarantor"], .p-tabview-nav li, [role="tab"], button, ion-button, a',
      )
      .filter({ hasText: /^Guarantor$/i })
      .filter({ visible: true });
  }

  private async isGuarantorPickerOrSectionVisible(): Promise<boolean> {
    if (await this.existingGuarantorDropdownRoot().isVisible().catch(() => false)) {
      return true;
    }
    if (await this.addNewGuarantorButton().isVisible().catch(() => false)) {
      return true;
    }
    return this.page
      .getByText(/Guarantor Name|Existing Guarantor|Not in List/i)
      .first()
      .isVisible()
      .catch(() => false);
  }

  private async hasGuarantorNavigationOrPickerVisible(): Promise<boolean> {
    if (await this.isGuarantorPickerOrSectionVisible()) {
      return true;
    }
    if (await this.guarantorTabNavItems().first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      return true;
    }
    if (await this.guarantorSegmentButton().isVisible({ timeout: 2_000 }).catch(() => false)) {
      return true;
    }
    return this.customerDetailsRoot()
      .getByRole("tab", { name: /^Guarantor$/i })
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
  }

  private async isApplicationDocumentsStepVisible(): Promise<boolean> {
    if ((await this.page.locator('#fileInput, input[type="file"]').count()) > 0) {
      return true;
    }
    if (
      await this.page
        .getByRole("tab", { name: /Application documents/i })
        .isVisible({ timeout: 2_000 })
        .catch(() => false)
    ) {
      return true;
    }
    return this.page
      .getByText(/Acknowledgements/i)
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
  }

  private async restoreCustomerDetailsFromDocumentsIfNeeded(): Promise<void> {
    if (!(await this.isApplicationDocumentsStepVisible())) {
      return;
    }
    await this.clickApplyNowFooterPrevious();
    await this.waitForCustomerDetailsStep();
  }

  /** Sole Trader on SIT completes About You without a separate guarantor sub-step. */
  private async isSoleTraderWithoutGuarantorStep(): Promise<boolean> {
    if (!(await this.isBusinessTypeSelected("sole trader"))) {
      return false;
    }
    return !(await this.hasGuarantorNavigationOrPickerVisible());
  }

  private async completeFinancialGatesForGuarantorNavigation(): Promise<void> {
    await this.expandSection(/Financial Position/i);
    await this.selectHomeOwnershipIfRequired();
    await this.fillHomeOwnershipAmountIfEmpty();
    await this.page.keyboard.press("Escape").catch(() => undefined);
    const incomeSection = this.financialIncomeSection();
    const incomeQuestion = incomeSection.getByText(
      /income likely to decrease over the next 12 months/i,
    );
    if (await incomeQuestion.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await incomeQuestion.scrollIntoViewIfNeeded();
      await this.clickIncomeDecreaseNo(incomeSection);
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Limited Company may use a Guarantor tab. Footer **Next** on Sole Trader skips
   * straight to Application documents — do not use Next to reach guarantor.
   */
  private async advanceToGuarantorViaFooterNext(): Promise<boolean> {
    if (await this.isGuarantorPickerOrSectionVisible()) {
      return true;
    }
    if (await this.isSoleTraderWithoutGuarantorStep()) {
      return false;
    }
    await this.completeFinancialGatesForGuarantorNavigation();
    await this.page.keyboard.press("Escape").catch(() => undefined);
    const next = this.page.getByRole("button", { name: /^Next$/i }).filter({ visible: true }).first();
    if (!(await next.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return false;
    }
    await next.scrollIntoViewIfNeeded();
    await this.clickElement(next, 60_000);
    await this.waitForLoadingComplete();
    await this.waitForProgressSpinnersHidden(30_000).catch(() => undefined);

    if (await this.isApplicationDocumentsStepVisible()) {
      await this.restoreCustomerDetailsFromDocumentsIfNeeded();
      return false;
    }

    try {
      await expect
        .poll(async () => this.isGuarantorPickerOrSectionVisible(), {
          timeout: 15_000,
          intervals: [500, 1_000, 2_000],
        })
        .toBe(true);
      return true;
    } catch {
      return false;
    }
  }

  private async clickGuarantorTabNavIfPresent(): Promise<boolean> {
    const item = this.guarantorTabNavItems().first();
    if (!(await item.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return false;
    }
    const link = item.locator("a.p-tabview-nav-link, [role='tab'], a").first();
    await item.scrollIntoViewIfNeeded();
    try {
      await link.click({ timeout: 15_000 });
    } catch {
      await link.click({ force: true, timeout: 10_000 });
    }
    await this.waitForLoadingComplete();
    return true;
  }

  private async clickGuarantorNavigationAction(): Promise<boolean> {
    if (await this.clickGuarantorTabNavIfPresent()) {
      return true;
    }

    const segmentButton = this.guarantorSegmentButton();
    if (await segmentButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await segmentButton.scrollIntoViewIfNeeded();
      await segmentButton.evaluate((el: HTMLElement) => el.click());
      await this.waitForLoadingComplete();
      return true;
    }

    const tab = this.customerDetailsRoot().getByRole("tab", { name: /^Guarantor$/i }).first();
    if (await tab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await tab.evaluate((el: HTMLElement) => el.click());
      await this.waitForLoadingComplete();
      return true;
    }

    const scoped = this.guarantorNavigationActions().first();
    if (await scoped.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.clickElement(scoped, 60_000);
      await this.waitForLoadingComplete();
      return true;
    }

    const subFooter = this.page
      .getByRole("button", { name: /^Previous$/i })
      .filter({ visible: true })
      .first()
      .locator("xpath=ancestor::div[1]/preceding-sibling::*[1]")
      .locator("button, ion-button, a, ion-segment-button, div, span")
      .filter({ hasText: /^Guarantor$/i })
      .first();
    if (await subFooter.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.clickElement(subFooter, 30_000);
      await this.waitForLoadingComplete();
      return true;
    }

    const pageGuarantor = this.page
      .getByText(/^Guarantor$/i, { exact: true })
      .filter({ visible: true })
      .first();
    if (await pageGuarantor.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.clickElement(pageGuarantor, 30_000);
      await this.waitForLoadingComplete();
      return true;
    }

    return false;
  }

  async clickGuarantorFooterAction(): Promise<void> {
    this.logStep("Click Guarantor Footer Action");
    await this.waitForProgressSpinnersHidden(30_000);
    if (await this.isSoleTraderWithoutGuarantorStep()) {
      return;
    }
    if (await this.clickGuarantorNavigationAction()) {
      return;
    }
    if (await this.advanceToGuarantorViaFooterNext()) {
      return;
    }
    await this.waitForGuarantorPickerVisible(30_000);
  }

  /** QAT uses a Guarantor tab; Limited Company on SIT. Sole Trader has no guarantor sub-step. */
  async openGuarantorSection(): Promise<void> {
    this.logStep("Open Guarantor Section");
    await this.waitForProgressSpinnersHidden(30_000);
    await this.restoreCustomerDetailsFromDocumentsIfNeeded();

    if (await this.isGuarantorPickerOrSectionVisible()) {
      return;
    }

    if (await this.isSoleTraderWithoutGuarantorStep()) {
      this.logStep("Sole Trader — no guarantor section on this layout");
      return;
    }

    await this.ensureCompanyNameSelected();
    await this.completeFinancialGatesForGuarantorNavigation();

    if (await this.isGuarantorPickerOrSectionVisible()) {
      return;
    }

    await this.customerDetailsRoot().scrollIntoViewIfNeeded().catch(() => undefined);
    if (await this.clickGuarantorNavigationAction()) {
      await this.waitForGuarantorPickerVisible();
      return;
    }

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
    await this.restoreCustomerDetailsFromDocumentsIfNeeded();

    if (await this.isApplicationDocumentsStepVisible()) {
      this.logStep("Application documents visible — guarantor not required for this flow");
      return "";
    }

    await this.ensureCompanyNameSelected();

    if (await this.isSoleTraderWithoutGuarantorStep()) {
      this.logStep("Sole Trader — skipping existing guarantor flow");
      return "";
    }

    await this.openGuarantorSection();
    await this.expectGuarantorSelectionScreen();
    const selected = await this.selectExistingGuarantorFromDropdown(preferredName);
    await this.fillMandatoryCustomerSections();
    return selected;
  }

  async expectCoBorrowerSelectionScreen(): Promise<void> {
    this.logStep("Expect Co-Borrower Selection Screen");
    await this.waitForCoBorrowerScreen();
    const pickerOrForm = this.existingJointBorrowerDropdownRoot()
      .or(this.addNewBorrowerButton())
      .or(this.page.locator("app-co-borrower-personal-detail").first())
      .or(this.page.getByText(/Existing Borrower|Add New Borrower|Personal Details/i).first())
      .first();
    await expect(pickerOrForm).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => (await this.activeJointBorrowerTabIndex()) === 1, {
        timeout: 15_000,
        intervals: [250, 500],
      })
      .toBe(true);
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
    await this.waitForLoadingComplete();
    await this.waitForProgressSpinnersHidden();
  }

  /**
   * Happy-path helper: click footer Next and wait until Application Documents is shown.
   * Use {@link clickApplyNowFooterNext} alone when asserting mandatory-field validation
   * (Next must stay on About You).
   */
  async clickApplyNowFooterNextAndExpectDocuments(clickTimeoutMs = 60_000): Promise<void> {
    this.logStep("Click Apply Now Footer Next And Expect Documents");
    await this.clickApplyNowFooterNext(clickTimeoutMs);
    await expect
      .poll(
        async () => {
          const fileInput = await this.page.locator('#fileInput, input[type="file"]').count();
          if (fileInput > 0) return true;
          return this.page
            .getByText(/Browse Files|Upload documents|Supporting document|Application Options/i)
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
    await expect
      .poll(
        async () => {
          const textVisible = await this.page
            .getByText(
              /mandatory|required|please complete|fill.*field|before moving|add borrower|add guarantor|this field|cannot proceed|complete all/i,
            )
            .filter({ visible: true })
            .first()
            .isVisible()
            .catch(() => false);
          if (textVisible) return true;

          return this.page
            .locator(
              ".p-error, .drop-down-error-message, .p-toast-message-error, .p-toast-message-warn, .ng-invalid.ng-touched, .p-invalid",
            )
            .filter({ visible: true })
            .first()
            .isVisible()
            .catch(() => false);
        },
        { timeout: 30_000, intervals: [250, 500, 1_000] },
      )
      .toBe(true);

    // Validation tests must remain on About You (not advance to documents).
    await expect(this.page.locator('#fileInput, input[type="file"]').first()).toBeHidden({
      timeout: 5_000,
    }).catch(() => undefined);
  }

  private addressDetailsRegion(): Locator {
    return this.sectionScope().getByRole("region", { name: /Address Details/i }).first();
  }

  private addressDetailsSection(): Locator {
    return this.addressDetailsRegion();
  }

  private currentAddressBlock(): Locator {
    return this.addressDetailsRegion().filter({ hasText: /Current Address/i });
  }

  private currentAddressTimeFields(): Locator {
    return this.addressDetailsRegion().getByRole("spinbutton");
  }

  private currentAddressSearchInput(): Locator {
    return this.addressDetailsSection()
      .locator(
        'input[name="physicalSearchValue"], input[formcontrolname="physicalSearchValue"], .auto-select-field input, p-autocomplete input',
      )
      .filter({ visible: true })
      .first()
      .or(this.page.locator('input[name="physicalSearchValue"]').filter({ visible: true }).first());
  }

  private async enableAddressChangeIfSearchHidden(): Promise<void> {
    const search = this.currentAddressSearchInput();
    if (await search.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return;
    }

    const section = this.addressDetailsSection();
    const changedPrompt = section.getByText(/Has your address changed/i).first();
    if (!(await changedPrompt.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }

    const container = changedPrompt.locator(
      "xpath=ancestor::*[self::div or self::ion-row or self::ion-col][1]",
    );
    const yesLabel = container.getByText(/^Yes$/i).first();
    if (await yesLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await this.clickElement(yesLabel);
      await this.waitForLoadingComplete();
      return;
    }

    const toggle = container.locator('ion-switch, p-inputswitch, [role="switch"]').first();
    if (await toggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
      if ((await toggle.getAttribute("aria-checked").catch(() => null)) !== "true") {
        await toggle.click({ force: true });
        await this.waitForLoadingComplete();
      }
    }
  }

  private async ensureCurrentAddressSearchVisible(): Promise<void> {
    await this.waitForProgressSpinnersHidden();
    await this.expandSection(/Address [Dd]etails/i);
    await this.enableAddressChangeIfSearchHidden();
    await expect
      .poll(
        async () => this.currentAddressSearchInput().isVisible().catch(() => false),
        { timeout: 15_000, intervals: [250, 500, 1_000] },
      )
      .toBe(true);
  }

  async searchCurrentAddress(query: string): Promise<void> {
    this.logStep(`Search Current Address — ${query}`);
    await this.ensureCurrentAddressSearchVisible();
    const searchField = this.currentAddressSearchInput();
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

  async expectAddressDetailsSectionVisible(): Promise<void> {
    this.logStep("Expect Address Details Section Visible");
    await this.waitForCustomerDetailsStep();
    await this.expandSection(/Address [Dd]etails/i);
    const region = this.addressDetailsRegion();
    await expect(region).toBeVisible({ timeout: 15_000 });
    await expect(region.getByText(/Current Address/i).first()).toBeVisible({ timeout: 15_000 });
  }

  async setCurrentAddressTimeAtAddress(years: string, months: string): Promise<void> {
    this.logStep(`Set Current Address Time At Address — ${years}y ${months}m`);
    await this.expandSection(/Address [Dd]etails/i);
    const region = this.addressDetailsRegion();
    await region.scrollIntoViewIfNeeded();
    await expect(region.getByText(/Current Address/i).first()).toBeVisible({ timeout: 15_000 });

    const timeFields = this.currentAddressTimeFields();
    await expect(timeFields.first()).toBeVisible({ timeout: 15_000 });

    const count = await timeFields.count();
    expect(count, "Current Address must expose Years and Months time-at-address fields.").toBeGreaterThanOrEqual(
      2,
    );

    for (const [index, value] of [
      [0, years],
      [1, months],
    ] as const) {
      const field = timeFields.nth(index);
      await field.scrollIntoViewIfNeeded();
      await field.click({ timeout: 15_000 });
      await field.fill("");
      await field.fill(value);
      await field.press("Tab").catch(() => undefined);
    }
    await this.waitForLoadingComplete();
  }

  private previousAddressDetailsRoot(): Locator {
    return this.addressDetailsRegion()
      .locator("app-previous-address, app-previous-address-details")
      .or(this.addressDetailsRegion().filter({ hasText: /Previous Address/i }))
      .first();
  }

  async expectPreviousAddressDetailsVisible(visible = true): Promise<void> {
    this.logStep(`Expect Previous Address Details Visible — ${visible}`);
    await this.expandSection(/Address [Dd]etails/i);
    const root = this.previousAddressDetailsRoot();
    if (visible) {
      await expect
        .poll(
          async () => {
            if (await root.isVisible().catch(() => false)) {
              return true;
            }
            return this.addressDetailsRegion()
              .getByText(/Previous Address/i)
              .first()
              .isVisible()
              .catch(() => false);
          },
          { timeout: 15_000, intervals: [250, 500, 1_000] },
        )
        .toBe(true);
      return;
    }
    await expect(root).toBeHidden({ timeout: 10_000 });
  }

  private employmentDetailsRegion(): Locator {
    return this.sectionScope().getByRole("region", { name: /Employment Details/i }).first();
  }

  private currentEmploymentBlock(): Locator {
    return this.employmentDetailsRegion().filter({ hasText: /Current Employment/i });
  }

  private currentEmploymentTimeFields(): Locator {
    return this.currentEmploymentBlock().getByRole("spinbutton");
  }

  private previousEmploymentDetailsRoot(): Locator {
    return this.employmentDetailsRegion()
      .locator("app-previous-employment, app-previous-employment-details")
      .first();
  }

  private previousEmploymentSectionLabel(): Locator {
    return this.employmentDetailsRegion()
      .getByRole("heading", { name: /Previous\s+Employment/i })
      .or(this.employmentDetailsRegion().getByText(/^Previous Employment$/i))
      .first();
  }

  private async enableEmploymentChangeIfTimeFieldsHidden(): Promise<void> {
    const fields = this.currentEmploymentTimeFields();
    if (await fields.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      return;
    }

    const region = this.employmentDetailsRegion();
    const changedPrompt = region
      .getByText(/Has your employment|employment details changed|employment changed/i)
      .first();
    if (!(await changedPrompt.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }

    const container = changedPrompt.locator(
      "xpath=ancestor::*[self::div or self::ion-row or self::ion-col][1]",
    );
    const yesLabel = container.getByText(/^Yes$/i).first();
    if (await yesLabel.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await this.clickElement(yesLabel);
      await this.waitForLoadingComplete();
      return;
    }

    const toggle = container.locator('ion-switch, p-inputswitch, [role="switch"]').first();
    if (await toggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
      if ((await toggle.getAttribute("aria-checked").catch(() => null)) !== "true") {
        await toggle.click({ force: true });
        await this.waitForLoadingComplete();
      }
    }
  }

  async expectEmploymentDetailsSectionVisible(): Promise<void> {
    this.logStep("Expect Employment Details Section Visible");
    await this.waitForCustomerDetailsStep();
    await this.expandSection(/Employment [Dd]etails/i);
    const region = this.employmentDetailsRegion();
    await expect(region).toBeVisible({ timeout: 15_000 });
    await expect(region.getByText(/Current Employment/i).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  async setCurrentEmploymentTimeWithEmployer(years: string, months: string): Promise<void> {
    this.logStep(`Set Current Employment Time With Employer — ${years}y ${months}m`);
    await this.expandSection(/Employment [Dd]etails/i);
    const region = this.employmentDetailsRegion();
    await region.scrollIntoViewIfNeeded();
    await expect(region.getByText(/Current Employment/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await this.enableEmploymentChangeIfTimeFieldsHidden();

    const timeFields = this.currentEmploymentTimeFields();
    await expect(timeFields.first()).toBeVisible({ timeout: 15_000 });

    const count = await timeFields.count();
    expect(
      count,
      "Current Employment must expose Years and Months time-with-employer fields.",
    ).toBeGreaterThanOrEqual(2);

    for (const [index, value] of [
      [0, years],
      [1, months],
    ] as const) {
      const field = timeFields.nth(index);
      await field.scrollIntoViewIfNeeded();
      await field.click({ timeout: 15_000 });
      await field.fill("");
      await field.fill(value);
      await field.press("Tab").catch(() => undefined);
    }
    await this.waitForLoadingComplete();
  }

  async expectPreviousEmploymentDetailsVisible(visible = true): Promise<void> {
    this.logStep(`Expect Previous Employment Details Visible — ${visible}`);
    await this.expandSection(/Employment [Dd]etails/i);
    const root = this.previousEmploymentDetailsRoot();
    const label = this.previousEmploymentSectionLabel();

    if (visible) {
      await expect
        .poll(
          async () => {
            if (await label.isVisible().catch(() => false)) {
              return true;
            }
            return root.isVisible().catch(() => false);
          },
          { timeout: 15_000, intervals: [250, 500, 1_000] },
        )
        .toBe(true);
      return;
    }

    await expect(label).toBeHidden({ timeout: 15_000 });
    await expect(root).toBeHidden({ timeout: 15_000 });
  }

  async expectCustomerDetailsStepVisible(): Promise<void> {
    this.logStep("Expect Customer Details Step Visible");
    await this.waitForCustomerDetailsStep();
    await this.expectLoanSummaryCardVisible();
  }

  async clickBorrowerTab(): Promise<void> {
    this.logStep("Click Borrower Tab");
    await this.clickJointBorrowerTabByIndex(0);
  }

  async clickGuarantorTab(): Promise<void> {
    this.logStep("Click Guarantor Tab");
    if (await this.isSoleTraderWithoutGuarantorStep()) {
      return;
    }
    if (await this.clickGuarantorNavigationAction()) {
      await this.waitForLoadingComplete();
      return;
    }
    if (await this.advanceToGuarantorViaFooterNext()) {
      await this.waitForLoadingComplete();
      return;
    }
    const tab = this.guarantorNavigationActions().first();
    await this.clickElement(tab);
    await this.waitForLoadingComplete();
  }
}
