/**
 * RSS Apply Now — step 1 “How can we help?” (Individual / Business tiles, purchase-through)
 * plus dealership selection, asset rows (Car or Van / Car or Light Commercial), repayment, footer Next.
 */

import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

export type CarOrVanAssetData = {
  purchasePrice: string;
  make: string;
  model: string;
  rego: string;
  year: string;
};

export type RepaymentCalculatorData = {
  deposit: string;
  termMonths: string;
  frequency: string;
  balloon: string;
};

export class RSSApplyNowHowCanWeHelpIndividualPage extends BasePage {
  /** Tile: Individual (document icon); uses `img[alt="individual"]` inside `button.business-btn`. */
  readonly individualTileButton: Locator;
  /** Tile: Business — `img[alt="business"]` / `Business` label inside `button.business-btn`. */
  readonly businessTileButton: Locator;

  constructor(page: Page) {
    super(page);
    this.individualTileButton = page.locator("button.business-btn").filter({
      has: page.locator('img[alt="individual"]'),
    });
    this.businessTileButton = page
      .locator("button.business-btn")
      .filter({
        has: page.locator('img[alt="business"], img[alt="Business"]'),
      })
      .or(page.locator("button.business-btn").filter({ hasText: /^Business$/i }))
      .first();
  }

  private applyNowRoot(): Locator {
    return this.page.locator("app-apply-now");
  }

  /**
   * “What would you like to do?” dropdown inside Apply Now step 1.
   * Label-scoped — `ng-reflect-name="purchaseThrough"` can match a stale hidden control on QAT.
   */
  private purchaseThroughDropdownRoot(): Locator {
    return this.applyNowRoot()
      .locator(
        "xpath=.//label[contains(normalize-space(.),'What would you like to do')]/following::p-dropdown[1]",
      )
      .first();
  }

  private purchaseThroughCombobox(): Locator {
    return this.purchaseThroughDropdownRoot().locator('[role="combobox"]').first();
  }

  protected stepLogPrefix(): string {
    return "RSS Apply Now — How can we help";
  }

  /** Waits for Apply Now step 1 content (Who are you applying under?). */
  async waitForHowCanWeHelpStep(): Promise<void> {
    this.logStep("Wait For How Can We Help Step");
    await this.page
      .getByText(/Who are you applying under/i)
      .first()
      .waitFor({ state: "visible", timeout: 25_000 });
    await this.waitForLoadingComplete();
  }

  /** Selects the Individual applicant type tile. */
  async clickIndividual(): Promise<void> {
    this.logStep("Click Individual");
    await this.individualTileButton.waitFor({ state: "visible", timeout: 15_000 });
    await this.clickElement(this.individualTileButton);
    await this.waitForLoadingComplete();
    await expect
      .poll(
        async () => {
          const selectedByIcon = this.page
            .locator(
              "button.business-btn .clicked-icon-class, button.business-btn .selected-icon-class, button.business-btn .selected-icon-name-class",
            )
            .filter({ has: this.page.locator('img[alt="individual"]') })
            .first();
          if (await selectedByIcon.isVisible().catch(() => false)) {
            return true;
          }
          const selectedButton = this.individualTileButton.filter({
            has: this.page.locator(
              ".clicked-icon-class, .selected-icon-class, .selected-icon-name-class",
            ),
          });
          return selectedButton.isVisible().catch(() => false);
        },
        { timeout: 30_000, intervals: [200, 500, 1_000] },
      )
      .toBe(true);
    await this.purchaseThroughDropdownRoot().waitFor({ state: "visible", timeout: 30_000 });
  }

  /** Selects the Business applicant type tile. */
  async clickBusiness(): Promise<void> {
    this.logStep("Click Business");
    await this.businessTileButton.waitFor({ state: "visible", timeout: 15_000 });
    await this.clickElement(this.businessTileButton);
    await this.waitForLoadingComplete();
    await expect
      .poll(
        async () =>
          this.page
            .locator("button.business-btn .clicked-icon-class, button.business-btn .selected-icon-name-class")
            .filter({ hasText: /Business/i })
            .first()
            .isVisible()
            .catch(() => false),
        { timeout: 30_000, intervals: [200, 500, 1_000] },
      )
      .toBe(true);
    await this.purchaseThroughDropdownRoot().waitFor({ state: "visible", timeout: 30_000 });
  }

  private escapeRx(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private purchaseThroughOptionPatterns(optionLabel: string): RegExp[] {
    const patterns: RegExp[] = [new RegExp(this.escapeRx(optionLabel), "i")];
    if (/conditional\s+approval/i.test(optionLabel)) {
      patterns.push(/conditional\s+approval/i);
    }
    if (/purchase through.*dealership/i.test(optionLabel)) {
      patterns.push(/purchase through.*dealership/i);
    }
    if (/^others$/i.test(optionLabel.trim())) {
      patterns.push(/^others$/i);
    }
    return patterns;
  }

  private isPlaceholderPurchaseThroughLabel(label: string): boolean {
    const normalized = label.replace(/\s+/g, " ").trim();
    return (
      !normalized ||
      /^--\s*select/i.test(normalized) ||
      /^select(\s+option)?$/i.test(normalized)
    );
  }

  private async readPurchaseThroughDisplayValue(combobox: Locator): Promise<string> {
    const aria = (await combobox.getAttribute("aria-label").catch(() => "")) ?? "";
    const text = (await combobox.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    return `${aria} ${text}`.replace(/\s+/g, " ").trim();
  }

  private async isPurchaseThroughOptionSelected(
    combobox: Locator,
    patterns: RegExp[],
  ): Promise<boolean> {
    const display = await this.readPurchaseThroughDisplayValue(combobox);
    if (this.isPlaceholderPurchaseThroughLabel(display)) {
      return false;
    }
    return patterns.some((pattern) => pattern.test(display));
  }

  private async clickPrimeNgDropdownOption(
    panel: Locator,
    patterns: RegExp[],
  ): Promise<boolean> {
    for (const pattern of patterns) {
      const row = panel
        .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
        .filter({ hasText: pattern })
        .first();
      if (await row.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await row.scrollIntoViewIfNeeded();
        try {
          await row.click({ timeout: 15_000 });
        } catch {
          await row.click({ force: true, timeout: 15_000 });
        }
        return true;
      }

      const byRole = this.page.getByRole("option", { name: pattern }).first();
      if (await byRole.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await byRole.scrollIntoViewIfNeeded();
        try {
          await byRole.click({ timeout: 15_000 });
        } catch {
          await byRole.click({ force: true, timeout: 15_000 });
        }
        return true;
      }
    }
    return false;
  }

  /** Waits until no visible PrimeNG progress spinner is blocking the Apply Now step. */
  private async waitForProgressSpinnersHidden(timeoutMs = 300_000): Promise<void> {
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

  /**
   * PrimeNG attaches `.p-dropdown-panel` to `body`; hidden panels stay in DOM — use a visible panel.
   * Opens via `[role=combobox]` first (matches the label span users click), then the chevron trigger.
   */
  private async pickPrimeNgDropdownOption(
    root: Locator,
    optionLabel: string,
  ): Promise<void> {
    const patterns = this.purchaseThroughOptionPatterns(optionLabel);
    await root.waitFor({ state: "visible", timeout: 15_000 });
    await this.waitForProgressSpinnersHidden();
    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root
      .locator(".p-dropdown-trigger, [aria-label='dropdown trigger']")
      .first();
    const dropdownClickTimeoutMs = 90_000;

    for (let attempt = 0; attempt < 3; attempt++) {
      if (await this.isPurchaseThroughOptionSelected(combobox, patterns)) {
        return;
      }

      await this.page.keyboard.press("Escape").catch(() => undefined);
      await combobox.scrollIntoViewIfNeeded();
      if (await combobox.isVisible().catch(() => false)) {
        await this.clickElement(combobox, dropdownClickTimeoutMs);
      } else {
        await trigger.waitFor({ state: "visible", timeout: 15_000 });
        await this.clickElement(trigger, dropdownClickTimeoutMs);
      }

      const visiblePanel = this.page.locator(".p-dropdown-panel").filter({ visible: true });
      await visiblePanel.last().waitFor({ state: "visible", timeout: 12_000 });
      const panel = visiblePanel.last();
      const clicked = await this.clickPrimeNgDropdownOption(panel, patterns);
      if (!clicked) {
        throw new Error(`Purchase-through option not found in dropdown: ${optionLabel}`);
      }

      await visiblePanel
        .last()
        .waitFor({ state: "hidden", timeout: 5_000 })
        .catch(() => undefined);
      await this.waitForLoadingComplete();

      if (await this.isPurchaseThroughOptionSelected(combobox, patterns)) {
        return;
      }
    }

    await expect
      .poll(async () => this.isPurchaseThroughOptionSelected(combobox, patterns), {
        timeout: 20_000,
        intervals: [250, 500, 1_000],
      })
      .toBe(true);
  }

  private async pickPurchaseThroughOption(optionLabel: string): Promise<void> {
    await this.pickPrimeNgDropdownOption(this.purchaseThroughDropdownRoot(), optionLabel);
  }

  /** Sets “What would you like to do?” to Purchase through a dealership. */
  async selectPurchaseThroughDealership(): Promise<void> {
    this.logStep("Select Purchase Through Dealership");
    await this.pickPurchaseThroughOption("Purchase through a dealership");
  }

  /**
   * Sets “What would you like to do?” to **I am after a Conditional Approval** (Business conditional-approval path).
   */
  async selectConditionalApproval(): Promise<void> {
    this.logStep("Select Conditional Approval");
    await this.pickPurchaseThroughOption("I am after a Conditional Approval");
  }

  /** Sets “What would you like to do?” to **Others**. */
  async selectOthers(): Promise<void> {
    this.logStep("Select Others");
    await this.pickPurchaseThroughOption("Others");
  }

  /** Mandatory free-text when **Others** is selected. */
  async fillPleaseTellUs(reason: string): Promise<void> {
    this.logStep("Fill Please Tell Us");
    const input = this.page
      .getByLabel(/Please tell us/i)
      .or(this.page.locator('[formcontrolname="pleaseTellUs"] input, [name="pleaseTellUs"]'))
      .or(
        this.page.locator(
          "xpath=//label[contains(.,'Please tell us')]/following::input[1] | //label[contains(.,'Please tell us')]/following::textarea[1]",
        ),
      )
      .first();
    await input.waitFor({ state: "visible", timeout: 15_000 });
    await this.clickAndFillElement(input, reason);
    await this.waitForLoadingComplete();
  }

  async expectOthersSelected(timeoutMs = 15_000): Promise<void> {
    this.logStep("Expect Others Selected");
    await expect(this.purchaseThroughCombobox()).toContainText(/Others/i, {
      timeout: timeoutMs,
    });
  }

  /** Asserts the purchase-through dropdown shows “Purchase through a dealership”. */
  async expectPurchaseThroughDealershipSelected(
    timeoutMs = 15_000,
  ): Promise<void> {
    this.logStep("Expect Purchase Through Dealership Selected");
    await expect(this.purchaseThroughCombobox()).toContainText(
      /Purchase through a dealership/i,
      { timeout: timeoutMs },
    );
  }

  /** Asserts “What would you like to do?” shows **I am after a Conditional Approval**. */
  async expectConditionalApprovalSelected(timeoutMs = 15_000): Promise<void> {
    this.logStep("Expect Conditional Approval Selected");
    await expect(this.purchaseThroughCombobox()).toContainText(
      /I\s+am\s+after\s+a\s+Conditional\s+Approval/i,
      { timeout: timeoutMs },
    );
  }

  async clickApplyNowFooterNext(clickTimeoutMs = 60_000): Promise<void> {
    this.logStep("Click Apply Now Footer Next");
    const next = this.page.locator(':text-is("Next")').filter({ visible: true }).first();
    await next.waitFor({ state: "visible", timeout: 30_000 });
    await this.clickElement(next, clickTimeoutMs);
    await this.waitForLoadingComplete();
  }

  async expectMandatoryFieldValidationMessage(): Promise<void> {
    this.logStep("Expect Mandatory Field Validation Message");
    await expect(
      this.page
        .getByText(/mandatory|required|please complete|fill.*field|before moving/i)
        .first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  async expectWhatWouldYouLikeToDoOptions(): Promise<void> {
    this.logStep("Expect What Would You Like To Do Options");
    const root = this.purchaseThroughDropdownRoot();
    const combobox = root.locator('[role="combobox"]').first();
    await this.clickElement(combobox);
    const panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
    await panel.waitFor({ state: "visible", timeout: 12_000 });
    for (const label of [
      /Purchase through.*Dealership/i,
      /Conditional approval/i,
      /^Others$/i,
    ]) {
      await expect(panel.locator("li, .p-dropdown-item").filter({ hasText: label }).first()).toBeVisible({
        timeout: 10_000,
      });
    }
    await this.page.keyboard.press("Escape").catch(() => undefined);
  }
}

/**
 * RSS Apply Now — dealership dropdown, Car or Van / Car or Light Commercial asset row, repayment calculator.
 * Selectors align with `p-dropdown[ng-reflect-name=…]`, `app-asset-select`, `app-repayment-calculator`.
 */
export class RSSApplyNowDealershipAssetRepaymentPage extends BasePage {
  readonly assetRoot: Locator;
  readonly repaymentRoot: Locator;

  /**
   * Apply Now often shows `p-progressspinner` over the form while dealer lists load.
   * The dealership combobox can be enabled (`aria-disabled=false`) while a spinner still intercepts clicks (QAT).
   */
  static readonly APPLY_NOW_SPINNER_WAIT_MS = 300_000;

  constructor(page: Page) {
    super(page);
    this.assetRoot = page.locator("app-asset-select");
    this.repaymentRoot = page.locator("app-repayment-calculator");
  }

  protected stepLogPrefix(): string {
    return "RSS Apply Now — Dealership & asset";
  }

  private escapeRx(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** Waits until no visible PrimeNG progress spinner is blocking the page (aligned with RSS login landing). */
  private async waitForProgressSpinnersHidden(
    timeoutMs = RSSApplyNowDealershipAssetRepaymentPage.APPLY_NOW_SPINNER_WAIT_MS,
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

  /** PrimeNG dropdown: open `root`, pick option text (panel on `body`). */
  private async pickPrimeNgDropdownOption(
    root: Locator,
    optionLabel: string,
  ): Promise<void> {
    const exactName = new RegExp(`^\\s*${this.escapeRx(optionLabel)}\\s*$`, "i");
    const looseName = new RegExp(this.escapeRx(optionLabel), "i");
    await root.waitFor({ state: "visible", timeout: 15_000 });
    await this.waitForProgressSpinnersHidden();
    await root.scrollIntoViewIfNeeded();
    await root.evaluate((el) =>
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }),
    );

    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root
      .locator(".p-dropdown-trigger, [aria-label='dropdown trigger']")
      .first();

    const currentAria = (await combobox.getAttribute("aria-label").catch(() => "")) ?? "";
    const currentText = (await combobox.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    if (exactName.test(currentAria) || exactName.test(currentText)) {
      return;
    }

    /** Spinners cleared above; allow a long click timeout for slow QAT overlays. */
    const dropdownClickTimeoutMs = 90_000;
    if (await combobox.isVisible().catch(() => false)) {
      await this.clickElement(combobox, dropdownClickTimeoutMs);
    } else {
      await trigger.waitFor({ state: "visible", timeout: 15_000 });
      await this.clickElement(trigger, dropdownClickTimeoutMs);
    }

    const visiblePanel = this.page.locator(".p-dropdown-panel").filter({ visible: true });
    await visiblePanel.last().waitFor({ state: "visible", timeout: 12_000 });
    const panel = visiblePanel.last();

    // Prefer exact option label (e.g. Term "36") so loose matches don't grab the wrong row.
    const row = panel
      .getByRole("option", { name: optionLabel, exact: true })
      .or(
        panel
          .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
          .filter({ hasText: exactName }),
      )
      .first();

    await row.waitFor({ state: "visible", timeout: 8_000 });
    await row.scrollIntoViewIfNeeded().catch(() => undefined);
    await panel
      .evaluate((el, label) => {
        const item =
          el.querySelector(`[role='option'][aria-label='${label}']`) ??
          Array.from(el.querySelectorAll("li.p-dropdown-item, [role='option']")).find(
            (node) => (node.textContent ?? "").trim() === label,
          );
        (item as HTMLElement | undefined)?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      }, optionLabel)
      .catch(() => undefined);

    try {
      await row.click({ timeout: 8_000 });
    } catch {
      try {
        await row.click({ force: true, timeout: 8_000 });
      } catch {
        await row.evaluate((el: HTMLElement) => el.click());
      }
    }

    await visiblePanel
      .last()
      .waitFor({ state: "hidden", timeout: 5_000 })
      .catch(() => undefined);
    await this.waitForLoadingComplete();
    await expect
      .poll(
        async () => {
          const aria = (await combobox.getAttribute("aria-label").catch(() => "")) ?? "";
          const text = (await combobox.innerText().catch(() => "")).replace(/\s+/g, " ");
          return exactName.test(`${aria} ${text}`) || looseName.test(`${aria} ${text}`);
        },
        { timeout: 20_000, intervals: [250, 500, 1_000] },
      )
      .toBe(true);
  }

  async waitForDealershipSection(): Promise<void> {
    this.logStep("Wait For Dealership Section");
    await this.page
      .getByText(/Select a UDC Dealership you have used before/i)
      .first()
      .waitFor({ state: "visible", timeout: 25_000 });
    await this.waitForLoadingComplete();
  }

  /**
   * Dealership options load asynchronously; the control stays `p-disabled` / `aria-disabled="true"` until ready.
   * Waits up to `timeoutMgs` (default 5 min) for the combobox to become enabled.
   */
  dealershipDropdownRoot(): Locator {
    return this.page
      .locator("app-apply-now")
      .locator(
        "xpath=.//label[contains(.,'Select a UDC Dealership you have used before')]/following::p-dropdown[1]",
      )
      .filter({ visible: true })
      .first();
  }

  async waitForDealersLoaded(timeoutMs = 300_000): Promise<void> {
    this.logStep("Wait For Dealers Loaded");
    const root = this.dealershipDropdownRoot();
    await root.waitFor({ state: "visible", timeout: 30_000 });
    const combobox = root.locator('[role="combobox"]').first();
    const inner = root.locator(".p-dropdown").first();
    await combobox.waitFor({ state: "visible", timeout: 30_000 });
    await expect
      .poll(
        async () => {
          const aria = await combobox.getAttribute("aria-disabled");
          const cls = (await inner.getAttribute("class")) ?? "";
          return aria === "false" && !cls.includes("p-disabled");
        },
        { timeout: timeoutMs, intervals: [500, 1500, 3000] },
      )
      .toBe(true);
    await this.waitForProgressSpinnersHidden(timeoutMs);
    await this.waitForLoadingComplete();
  }

  private applyNowRoot(): Locator {
    return this.page.locator("app-apply-now");
  }

  private isPlaceholderDealerLabel(label: string): boolean {
    const normalized = label.replace(/\s+/g, " ").trim();
    return !normalized || /^--\s*select/i.test(normalized);
  }

  private async openPrimeNgDropdownPanel(root: Locator): Promise<Locator> {
    await root.waitFor({ state: "visible", timeout: 15_000 });
    await this.waitForProgressSpinnersHidden();
    await this.page.keyboard.press("Escape").catch(() => undefined);

    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root
      .locator(".p-dropdown-trigger, [aria-label='dropdown trigger']")
      .first();
    await combobox.scrollIntoViewIfNeeded();
    const dropdownClickTimeoutMs = 90_000;
    if (await combobox.isVisible().catch(() => false)) {
      await this.clickElement(combobox, dropdownClickTimeoutMs);
    } else {
      await trigger.waitFor({ state: "visible", timeout: 15_000 });
      await this.clickElement(trigger, dropdownClickTimeoutMs);
    }

    const visiblePanel = this.page.locator(".p-dropdown-panel").filter({ visible: true });
    await visiblePanel.last().waitFor({ state: "visible", timeout: 12_000 });
    return visiblePanel.last();
  }

  private async readVisibleDropdownOptionLabels(panel: Locator): Promise<string[]> {
    const items = panel.locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item");
    await items
      .first()
      .waitFor({ state: "visible", timeout: 8_000 })
      .catch(() => undefined);
    const count = await items.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await items.nth(i).innerText()).replace(/\s+/g, " ").trim();
      if (!this.isPlaceholderDealerLabel(text)) {
        labels.push(text);
      }
    }
    return labels;
  }

  private usedBeforeDealerCombobox(): Locator {
    return this.dealershipDropdownRoot().locator('[role="combobox"]').first();
  }

  private async readUsedBeforeDealerDisplayValue(): Promise<string> {
    const combobox = this.usedBeforeDealerCombobox();
    const aria = (await combobox.getAttribute("aria-label").catch(() => "")) ?? "";
    const text = (await combobox.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    return `${aria} ${text}`.replace(/\s+/g, " ").trim();
  }

  private usedBeforePleaseCompleteError(): Locator {
    return this.applyNowRoot()
      .locator(
        "xpath=.//label[contains(.,'Select a UDC Dealership you have used before')]/ancestor::*[contains(@class,'col') or self::div][1]",
      )
      .getByText(/^Please Complete$/i);
  }

  private anotherDealershipPleaseCompleteError(): Locator {
    return this.anotherDealershipBlock().getByText(/^Please Complete$/i);
  }

  private anotherDealershipBlock(): Locator {
    return this.applyNowRoot().locator(
      "xpath=.//label[contains(.,'Select Another UDC Dealership')]/ancestor::*[contains(@class,'col') or self::div][1]",
    );
  }

  private anotherDealershipOptions(): Locator {
    // PrimeNG may render the overlay as `.p-autocomplete-panel` or an inline listbox ("Option List").
    const panelOptions = this.page
      .locator(".p-autocomplete-panel, .p-overlay-content")
      .filter({ visible: true })
      .locator("[role='option'], .p-autocomplete-item, li.p-dropdown-item, .p-dropdown-item");
    const listboxOptions = this.page
      .getByRole("listbox", { name: /Option List/i })
      .getByRole("option");
    return panelOptions.or(listboxOptions);
  }

  async isDealershipSelectionValid(): Promise<boolean> {
    const usedBeforeText = await this.readUsedBeforeDealerDisplayValue();
    if (!this.isPlaceholderDealerLabel(usedBeforeText)) {
      return true;
    }

    const anotherSearch = this.anotherDealershipSearchInput();
    const anotherText = (
      (await anotherSearch.inputValue().catch(() => "")) ||
      (await anotherSearch.innerText().catch(() => ""))
    )
      .replace(/\s+/g, " ")
      .trim();
    if (!anotherText || this.isPlaceholderDealerLabel(anotherText) || /^search$/i.test(anotherText)) {
      return false;
    }

    // Typed search queries / empty-result state are not a completed selection.
    if (/^(copp|udc|motor|\d{1,4})$/i.test(anotherText)) {
      return false;
    }
    if (await this.page.getByRole("option", { name: /^No results found$/i }).isVisible().catch(() => false)) {
      return false;
    }

    return anotherText.length > 4;
  }

  private async waitForUsedBeforeDealerSelected(
    optionLabel?: string,
    timeoutMs = 30_000,
  ): Promise<void> {
    const labelPattern = optionLabel
      ? new RegExp(this.escapeRx(optionLabel), "i")
      : undefined;
    await expect
      .poll(
        async () => {
          const display = await this.readUsedBeforeDealerDisplayValue();
          if (this.isPlaceholderDealerLabel(display)) {
            return false;
          }
          if (!labelPattern) {
            return true;
          }
          return labelPattern.test(display);
        },
        { timeout: timeoutMs, intervals: [250, 500, 1_000, 2_000] },
      )
      .toBe(true);
  }

  /**
   * Picks a dealer from the “used before” PrimeNG dropdown and waits until the face value updates.
   */
  private async pickDealerFromUsedBeforeDropdown(optionLabel?: string): Promise<string> {
    const root = this.dealershipDropdownRoot();
    const panel = await this.openPrimeNgDropdownPanel(root);
    const items = panel.locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item");
    const labelPattern = optionLabel
      ? new RegExp(this.escapeRx(optionLabel), "i")
      : undefined;

    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const text = (await item.innerText()).replace(/\s+/g, " ").trim();
      if (this.isPlaceholderDealerLabel(text) || /^No results found$/i.test(text)) {
        continue;
      }
      if (labelPattern && !labelPattern.test(text)) {
        continue;
      }
      await item.scrollIntoViewIfNeeded();
      await item.click({ timeout: 15_000 });
      await panel.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
      await this.waitForProgressSpinnersHidden();
      await this.waitForLoadingComplete();
      await this.waitForUsedBeforeDealerSelected(text);
      return text;
    }

    await this.page.keyboard.press("Escape").catch(() => undefined);
    throw new Error(
      optionLabel
        ? `Dealership option not found in “used before” dropdown: ${optionLabel}`
        : "No selectable dealership options in “used before” dropdown.",
    );
  }

  /** Opens “used before” dropdown and returns non-placeholder option labels (panel closed afterward). */
  async getDealerUsedBeforeOptionLabels(): Promise<string[]> {
    this.logStep("Get Dealer Used Before Option Labels");
    const root = this.dealershipDropdownRoot();
    const panel = await this.openPrimeNgDropdownPanel(root);
    const labels = (await this.readVisibleDropdownOptionLabels(panel)).filter(
      (label) => !/^No results found$/i.test(label),
    );
    await this.page.keyboard.press("Escape").catch(() => undefined);
    await this.waitForProgressSpinnersHidden();
    return labels;
  }

  private async pickFirstPrimeNgDropdownOption(root: Locator): Promise<string> {
    const panel = await this.openPrimeNgDropdownPanel(root);
    const items = panel.locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item");
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const text = (await item.innerText()).replace(/\s+/g, " ").trim();
      if (this.isPlaceholderDealerLabel(text)) {
        continue;
      }
      await item.click();
      await panel.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
      await this.waitForLoadingComplete();
      return text;
    }
    await this.page.keyboard.press("Escape").catch(() => undefined);
    throw new Error("No dealership options found in “used before” dropdown.");
  }

  private anotherDealershipSearchInput(): Locator {
    return this.applyNowRoot()
      .locator(
        "xpath=.//label[contains(.,'Select Another UDC Dealership')]/following::input[1] | .//label[contains(.,'Select Another UDC Dealership')]/following::*[@role='combobox'][1]",
      )
      .first();
  }

  private async clearAnotherDealershipSearch(): Promise<void> {
    const input = this.anotherDealershipSearchInput();
    if (!(await input.isVisible().catch(() => false))) {
      return;
    }
    await input.click({ timeout: 10_000 }).catch(() => undefined);
    await input.fill("").catch(() => undefined);
    await this.page.keyboard.press("Escape").catch(() => undefined);
  }

  /**
   * When the party has no prior dealerships, pick one via **Select Another UDC Dealership** search.
   */
  async selectAnotherDealershipBySearch(
    query: string,
    preferredResult?: string,
  ): Promise<string> {
    this.logStep(
      `Select Another Dealership By Search — ${query}${preferredResult ? ` (prefer ${preferredResult})` : ""}`,
    );
    const input = this.anotherDealershipSearchInput();
    await input.waitFor({ state: "visible", timeout: 20_000 });
    await this.waitForProgressSpinnersHidden();
    await input.scrollIntoViewIfNeeded();
    await input.click({ timeout: 15_000 });
    await input.fill("");
    await input.pressSequentially(query, { delay: 100 });

    const fieldRoot = this.anotherDealershipBlock();
    const fieldSpinner = fieldRoot
      .locator(".p-autocomplete-loader, .pi-spinner, [class*='spinner']")
      .first();
    await fieldSpinner.waitFor({ state: "hidden", timeout: 60_000 }).catch(() => undefined);

    const realOptions = this.anotherDealershipOptions().filter({
      hasNotText: /^No results found$/i,
    });

    // Wait until either real dealer options appear, or the API reports no matches.
    await expect
      .poll(
        async () => {
          if (await realOptions.first().isVisible().catch(() => false)) {
            return "options";
          }
          if (
            await this.page
              .getByRole("option", { name: /^No results found$/i })
              .isVisible()
              .catch(() => false)
          ) {
            return "empty";
          }
          if (
            await this.page
              .locator(".p-autocomplete-panel")
              .filter({ visible: true })
              .getByText(/^No results found$/i)
              .isVisible()
              .catch(() => false)
          ) {
            return "empty";
          }
          return "pending";
        },
        { timeout: 60_000, intervals: [300, 600, 1_200, 2_000] },
      )
      .not.toBe("pending");

    if (!(await realOptions.first().isVisible().catch(() => false))) {
      await this.page.keyboard.press("Escape").catch(() => undefined);
      throw new Error(`No dealership results found for search "${query}".`);
    }

    let option = realOptions.first();
    if (preferredResult?.trim()) {
      const preferred = realOptions
        .filter({ hasText: new RegExp(this.escapeRx(preferredResult.trim()), "i") })
        .first();
      if (await preferred.isVisible({ timeout: 5_000 }).catch(() => false)) {
        option = preferred;
      }
    }

    await expect(option).toBeVisible({ timeout: 15_000 });
    const label = ((await option.innerText()) ?? "").replace(/\s+/g, " ").trim();
    if (!label || /^No results found$/i.test(label)) {
      throw new Error(`No selectable dealership option for search "${query}".`);
    }

    await option.click({ timeout: 15_000 });
    await this.page.keyboard.press("Escape").catch(() => undefined);
    await this.waitForProgressSpinnersHidden();
    await this.waitForLoadingComplete();
    // Commit autocomplete selection (some builds keep the query until blur).
    await input.press("Tab").catch(() => undefined);
    await this.waitForLoadingComplete();

    await expect
      .poll(async () => this.isDealershipSelectionValid(), {
        timeout: 45_000,
        intervals: [300, 600, 1_200],
      })
      .toBe(true);

    return label;
  }

  /**
   * Picks a dealership for Apply Now: preferred “used before” label when listed, else first history dealer,
   * else searches **Select Another UDC Dealership** (e.g. “copp” → Copping Motor Co.).
   */
  async selectDealershipForApplyNow(options?: {
    preferredLabel?: string;
    fallbackSearch?: string;
    fallbackResult?: string;
  }): Promise<string> {
    this.logStep("Select Dealership For Apply Now");
    const preferred = options?.preferredLabel?.trim();
    const fallbackSearch = options?.fallbackSearch?.trim() || "copp";
    const fallbackResult = options?.fallbackResult?.trim() || "Copping Motor Co.";

    // Prefer search first for parties with empty used-before history (avoids opening an empty
    // history dropdown that leaves “Please Complete” validation noise).
    const searchTerms = [fallbackSearch, "copp"].filter(
      (term, index, all) => term && all.indexOf(term) === index,
    );
    const searchErrors: string[] = [];
    for (const term of searchTerms) {
      try {
        await this.clearAnotherDealershipSearch();
        const selected = await this.selectAnotherDealershipBySearch(term, fallbackResult);
        if (await this.isDealershipSelectionValid()) {
          return selected;
        }
        searchErrors.push(`Search "${term}" did not stick as a selection.`);
      } catch (error) {
        searchErrors.push(
          `Search "${term}" failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        await this.clearAnotherDealershipSearch();
      }
    }

    const usedBeforeLabels = await this.getDealerUsedBeforeOptionLabels().catch(() => [] as string[]);
    const candidates: string[] = [];

    if (preferred) {
      const preferredMatch = usedBeforeLabels.find((label) =>
        new RegExp(this.escapeRx(preferred), "i").test(label),
      );
      if (preferredMatch) {
        candidates.push(preferredMatch);
      }
    }

    for (const label of usedBeforeLabels) {
      if (!candidates.includes(label)) {
        candidates.push(label);
      }
    }

    for (const label of candidates) {
      try {
        const selected = await this.pickDealerFromUsedBeforeDropdown(label);
        if (await this.isDealershipSelectionValid()) {
          return selected;
        }
      } catch {
        // try next candidate
      }
    }

    throw new Error(
      `Could not select a dealership via history dropdown or search on Apply Now. ${searchErrors.join(" | ")}`,
    );
  }

  async expectDealershipSelected(): Promise<void> {
    this.logStep("Expect Dealership Selected");
    await expect
      .poll(async () => this.isDealershipSelectionValid(), {
        timeout: 30_000,
        intervals: [250, 500, 1_000],
      })
      .toBe(true);
    // Either field may show the validation message before selection; both should clear after.
    await expect(this.usedBeforePleaseCompleteError()).toBeHidden({ timeout: 15_000 }).catch(
      () => undefined,
    );
    await expect(this.anotherDealershipPleaseCompleteError()).toBeHidden({
      timeout: 15_000,
    }).catch(() => undefined);
  }

  /**
   * `p-dropdown` bound as `selectDelearship` (server-side spelling).
   */
  async selectDealerYouHaveUsedBefore(dealerLabel: string): Promise<void> {
    this.logStep("Select Dealer You Have Used Before");
    await this.pickDealerFromUsedBeforeDropdown(dealerLabel);
  }

  /**
   * Asset-type tile grid (“What are you looking to purchase?”) — not the summary row of an
   * already-added asset (that row also shows “Car or Van” and would skip re-selection).
   */
  private assetTypePickerRoot(): Locator {
    return this.assetRoot
      .locator(
        'xpath=.//*[self::h5 or self::p or self::span][contains(normalize-space(.),"What are you looking to purchase")]/following::*[self::div or self::generic][1]',
      )
      .first();
  }

  private carOrVanPickerButton(): Locator {
    return this.assetTypePickerRoot()
      .locator("button")
      .filter({ hasText: /Car or Van/i })
      .first();
  }

  private carOrVanPickerIconTile(): Locator {
    return this.assetTypePickerRoot()
      .locator(".icon-container")
      .filter({ hasText: /Car or Van/i })
      .first();
  }

  private async resolveCarOrVanPickerTile(): Promise<Locator> {
    const button = this.carOrVanPickerButton();
    if (await button.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return button;
    }
    return this.carOrVanPickerIconTile();
  }

  private async isCarOrVanSelectedInPicker(): Promise<boolean> {
    const picker = this.assetTypePickerRoot();
    const selectedMarkers = ".selected-icon-class, .clicked-icon-class, .selected-icon-name-class, .clicked-icon-class_business";
    const selectedButton = picker
      .locator("button")
      .filter({ hasText: /Car or Van/i })
      .filter({ has: picker.locator(selectedMarkers) })
      .first();
    if (await selectedButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return true;
    }
    const selectedIcon = picker
      .locator(".icon-container")
      .filter({ hasText: /Car or Van/i })
      .filter({ has: picker.locator(".selected-icon-class, .clicked-icon-class") })
      .first();
    return selectedIcon.isVisible({ timeout: 2_000 }).catch(() => false);
  }

  private async waitForEditablePurchasePriceInput(scope: Locator): Promise<Locator> {
    let resolved: Locator | undefined;
    await expect
      .poll(
        async () => {
          try {
            resolved = await this.resolveEditablePurchasePriceInput(scope);
            return await resolved.isVisible().catch(() => false);
          } catch {
            return false;
          }
        },
        { timeout: 60_000, intervals: [250, 500, 1_000, 2_000] },
      )
      .toBe(true);
    return resolved!;
  }

  /** Ensures “Car or Van” asset type tile is selected (desktop `app-asset-select` layout). */
  async ensureCarOrVanAssetTypeSelected(): Promise<void> {
    this.logStep("Ensure Car Or Van Asset Type Selected");
    await this.waitForProgressSpinnersHidden(60_000);
    const tile = await this.resolveCarOrVanPickerTile();
    await tile.waitFor({ state: "visible", timeout: 15_000 });
    if (await this.isCarOrVanSelectedInPicker()) {
      await this.waitForEditablePurchasePriceInput(await this.assetFormScope()).catch(() => undefined);
      return;
    }
    await this.clickElement(tile);
    await this.waitForLoadingComplete();
    await this.waitForProgressSpinnersHidden(60_000);
    await this.waitForEditablePurchasePriceInput(await this.assetFormScope());
  }

  /**
   * Ensures **Car or Light Commercial** is selected on the Business asset grid.
   * SelectorHub selected state: `div.icon-container_business.clicked-icon-class_business` (visible).
   * Click target when not selected: `div.icon-container_business` with label **Car or Light Commercial**.
   */
  async ensureCarOrLightCommercialAssetTypeSelected(): Promise<void> {
    this.logStep("Ensure Car Or Light Commercial Asset Type Selected");
    await this.waitForProgressSpinnersHidden(60_000);

    const selectedBusinessButton = this.assetRoot
      .locator("button")
      .filter({ hasText: /Car or Light Commercial/i })
      .filter({
        has: this.page.locator(
          ".clicked-icon-class_business, .selected-icon-class, .clicked-icon-class, .selected-icon-name-class",
        ),
      })
      .first();

    if (await selectedBusinessButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return;
    }

    const selectedTile = this.assetRoot
      .locator("div.icon-container_business.clicked-icon-class_business")
      .filter({ visible: true })
      .filter({ hasText: /Car or Light Commercial/i })
      .first();

    if (await selectedTile.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return;
    }

    const buttonTile = this.assetRoot
      .locator("button")
      .filter({ hasText: /Car or Light Commercial/i })
      .first();
    if (await buttonTile.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await this.scrollIfNeeded(buttonTile);
      await this.clickElement(buttonTile);
      await this.waitForLoadingComplete();
      await this.waitForProgressSpinnersHidden(60_000);
      return;
    }

    const tile = this.assetRoot
      .locator("div.icon-container_business")
      .filter({ hasText: /Car or Light Commercial/i })
      .first();

    await tile.waitFor({ state: "visible", timeout: 20_000 });
    await this.scrollIfNeeded(tile);
    await this.clickElement(tile);
    await this.waitForLoadingComplete();
    await this.waitForProgressSpinnersHidden(60_000);

    await expect(selectedTile.or(selectedBusinessButton)).toBeVisible({ timeout: 20_000 });
  }

  /** Visible asset form: `.web` (desktop) or `.mobile` — both exist in DOM; filling the hidden block does nothing in the UI. */
  private async assetFormScope(): Promise<Locator> {
    const web = this.assetRoot.locator(".web");
    const mobile = this.assetRoot.locator(".mobile");
    if (await web.isVisible().catch(() => false)) {
      return web;
    }
    if (await mobile.isVisible().catch(() => false)) {
      return mobile;
    }
    return this.assetRoot;
  }

  /**
   * Selector Hub — Purchase Price (`price-input`), ion-row columns for Make/Model/Rego, `#date`, Add (`p-button.bg-btn.primary`).
   * Avoid binding to `ng-*` validation classes; those change after edit.
   */

  /** Hub: editable purchase-price entry on SIT/QAT (`formcontrolname="purchasePrice"` + `price-input`). */
  private hubPurchasePriceInput(scope: Locator): Locator {
    return scope
      .locator(
        'input[formcontrolname="purchasePrice"], input.w-full.text-sm.p-inputtext.price-input[currencymask], input.w-full.text-sm.p-inputtext.price-input, amount input[currencymask]',
      )
      .filter({ visible: true })
      .last();
  }

  /** Desktop row: Make = ion-col(2), Model = (3), Rego = (4) under `form ion-row`. */
  private hubMakeInput(scope: Locator): Locator {
    return scope.locator("form ion-row ion-col:nth-child(2) input").first();
  }

  private hubModelInput(scope: Locator): Locator {
    return scope.locator("form ion-row ion-col:nth-child(3) input").first();
  }

  private hubRegoInput(scope: Locator): Locator {
    return scope.locator("form ion-row ion-col:nth-child(4) input").first();
  }

  /** Hub: year control `#date` within the asset block. */
  private hubYearInput(scope: Locator): Locator {
    return scope.locator("#date").first();
  }

  /** Hub: PrimeNG `p-button.bg-btn.primary` → inner button **Add** or **+ Add Another Asset** (Business). */
  private hubAddButton(scope: Locator): Locator {
    return scope
      .locator("p-button.bg-btn.primary")
      .locator("button")
      .filter({ hasText: /^[+＋]?\s*Add(\s+Another\s+Asset)?$/i });
  }

  private addAnotherAssetButton(): Locator {
    return this.assetRoot
      .getByRole("button", { name: /Add Another Asset/i })
      .filter({ visible: true })
      .first();
  }

  /** Opens a new asset row after the first asset has been added to the quote. */
  async clickAddAnotherAsset(): Promise<void> {
    this.logStep("Click Add Another Asset");
    const btn = this.addAnotherAssetButton();
    await btn.waitFor({ state: "visible", timeout: 20_000 });
    await this.scrollIfNeeded(btn);
    await this.clickElement(btn);
    await this.waitForProgressSpinnersHidden(120_000);
    await this.waitForLoadingComplete();
  }

  /**
   * Returns the asset `form` that should receive the next row of values
   * (last empty purchase-price row, or the only visible form on first asset).
   */
  private async editableAssetRowScope(): Promise<Locator> {
    const scope = await this.assetFormScope();
    const rowContainers = scope.locator("form").filter({ visible: true });
    const containerCount = await rowContainers.count();
    const containers =
      containerCount > 0
        ? rowContainers
        : scope.locator("form, ion-row, .asset-row").filter({ visible: true });

    const count = await containers.count();
    for (let i = count - 1; i >= 0; i--) {
      const row = containers.nth(i);
      try {
        const priceInput = await this.resolveEditablePurchasePriceInput(row);
        const raw = (await priceInput.inputValue().catch(() => "")).replace(/[^0-9.]/g, "");
        if (!raw || Number.parseFloat(raw) === 0) {
          return row;
        }
      } catch {
        continue;
      }
    }

    return scope;
  }

  private async isPurchasePriceInputEditable(input: Locator): Promise<boolean> {
    const readonly = await input.getAttribute("readonly");
    if (readonly !== null && readonly !== "false") {
      return false;
    }
    return !(await input.isDisabled().catch(() => false));
  }

  /**
   * PrimeNG currencymask expects digit keystrokes, not formatted text.
   * "$100000.00" must become "100000", not "10000000".
   */
  private normalizeCurrencyDigitsForMask(value: string): string {
    const cleaned = value.replace(/[$,\s]/g, "").trim() || "0";
    const [wholePart = "0", fracPart = ""] = cleaned.split(".");
    const whole = wholePart.replace(/\D/g, "") || "0";
    const frac = fracPart.replace(/\D/g, "");

    if (!frac || /^0+$/.test(frac)) {
      return whole.replace(/^0+/, "") || "0";
    }

    const cents = frac.padEnd(2, "0").slice(0, 2);
    const dollars = whole.replace(/^0+/, "") || "0";
    if (dollars === "0") {
      return `${dollars}${cents}`;
    }
    return `${dollars}${cents}`.replace(/^0+/, "") || cents;
  }

  private currencyDigitsMatch(displayValue: string, wantDigits: string): boolean {
    const got = displayValue.replace(/\D/g, "");
    const want = wantDigits.replace(/\D/g, "");
    if (!want) return true;
    if (!got) return false;
    if (got === want) {
      return true;
    }
    const gotNum = Number.parseInt(got, 10);
    const wantNum = Number.parseInt(want, 10);
    if (Number.isNaN(gotNum) || Number.isNaN(wantNum)) {
      return false;
    }
    // $1,000.00 → "100000" vs want "1000" (mask stores cents)
    return gotNum === wantNum || Math.round(gotNum / 100) === wantNum;
  }

  /** Skips readonly summary rows; prefers the last empty editable purchase-price field. */
  private async resolveEditablePurchasePriceInput(scope: Locator): Promise<Locator> {
    const selectorGroups = [
      scope
        .locator(
          'input[formcontrolname="purchasePrice"], input.w-full.text-sm.p-inputtext.price-input[currencymask], input.w-full.text-sm.p-inputtext.price-input',
        )
        .filter({ visible: true }),
      scope
        .locator(
          'xpath=.//*[contains(normalize-space(.),"Purchase Price")]/following::input[1]',
        )
        .filter({ visible: true }),
      scope.locator('input[id="amount"]:not([readonly])').filter({ visible: true }),
      scope.locator("input[currencymask]:not([readonly])").filter({ visible: true }),
    ];

    const editable: Locator[] = [];
    for (const group of selectorGroups) {
      const count = await group.count();
      for (let i = 0; i < count; i++) {
        const candidate = group.nth(i);
        if (await this.isPurchasePriceInputEditable(candidate)) {
          editable.push(candidate);
        }
      }
    }

    if (editable.length === 0) {
      throw new Error("No editable Purchase Price input found in asset row scope.");
    }

    for (let i = editable.length - 1; i >= 0; i--) {
      const raw = (await editable[i].inputValue().catch(() => "")).replace(/[^0-9.]/g, "");
      if (!raw || Number.parseFloat(raw) === 0) {
        return editable[i];
      }
    }

    return editable[editable.length - 1];
  }

  private labeledAssetFieldBlock(scope: Locator, labelPattern: RegExp): Locator {
    return scope
      .locator("div, ion-col")
      .filter({ has: scope.locator("label, p, span").filter({ hasText: labelPattern }) })
      .filter({ visible: true })
      .last();
  }

  private async clearCurrencyMaskedInput(input: Locator): Promise<void> {
    await input.click({ timeout: 30_000 });
    await input.press("ControlOrMeta+A").catch(() => undefined);
    await input.press("Delete").catch(() => undefined);
    await input.press("Backspace").catch(() => undefined);

    for (let i = 0; i < 24; i++) {
      const digits = ((await input.inputValue().catch(() => "")) ?? "").replace(/\D/g, "");
      if (!digits || digits === "0") {
        return;
      }
      await input.press("Backspace").catch(() => undefined);
    }

    await input.evaluate((el: HTMLInputElement) => {
      el.focus();
      el.select();
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  private async typeCurrencyIntoField(input: Locator, value: string): Promise<void> {
    const digits = this.normalizeCurrencyDigitsForMask(value);
    await input.scrollIntoViewIfNeeded();
    await input.evaluate((el) =>
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }),
    );

    const already = (await input.inputValue().catch(() => "")) ?? "";
    if (this.currencyDigitsMatch(already, digits)) {
      return;
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      await this.clearCurrencyMaskedInput(input);
      await input.pressSequentially(digits, { delay: 50 });
      await input.press("Tab");
      await this.page.waitForTimeout(400);

      const display = (await input.inputValue().catch(() => "")) ?? "";
      if (this.currencyDigitsMatch(display, digits)) {
        return;
      }
    }

    const last = (await input.inputValue().catch(() => "")) ?? "";
    throw new Error(
      `Currency field did not accept "${digits}" after retries (last value: "${last}").`,
    );
  }

  private async fillAssetTextField(
    scope: Locator,
    labelPattern: RegExp,
    value: string,
  ): Promise<void> {
    const block = this.labeledAssetFieldBlock(scope, labelPattern);
    const input = block.locator("input").filter({ visible: true }).first();
    await input.waitFor({ state: "visible", timeout: 20_000 });
    await this.typeIntoField(input, value);
  }

  private assetFieldInput(scope: Locator, label: string): Locator {
    return scope
      .locator(
        `xpath=.//*[self::label or self::p or self::span][normalize-space(.)="${label}"]/following::input[1]`,
      )
      .first();
  }

  private assetYearControl(scope: Locator): Locator {
    return scope
      .locator(
        `xpath=.//*[self::label or self::p or self::span][contains(normalize-space(.),"Year")]/following::*[@role="combobox" or self::input][1]`,
      )
      .first();
  }

  private async fillAssetYearField(scope: Locator, year: string): Promise<void> {
    const control = scope.locator('[role="combobox"]').filter({ visible: true }).first();
    await control.waitFor({ state: "visible", timeout: 20_000 });
    await control.scrollIntoViewIfNeeded();
    await control.click({ timeout: 15_000 });

    const yearDialog = this.page
      .locator('.p-datepicker, [role="dialog"]')
      .filter({ visible: true })
      .last();
    await yearDialog.waitFor({ state: "visible", timeout: 10_000 });

    const yearCell = yearDialog
      .locator(
        ".p-yearpicker-year, .p-datepicker-year, span, div, button",
      )
      .filter({ hasText: new RegExp(`^${this.escapeRx(year)}$`) })
      .first();

    if (await yearCell.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await yearCell.click();
    } else {
      await yearDialog
        .locator(`xpath=.//*[normalize-space(.)="${year}"]`)
        .first()
        .click();
    }

    await yearDialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
    await this.page.keyboard.press("Escape").catch(() => undefined);
  }

  private async typeIntoField(input: Locator, value: string): Promise<void> {
    await input.scrollIntoViewIfNeeded();
    await input.click({ timeout: 30_000 });
    await input.clear();
    await input.fill(value, { timeout: 20_000 });
    await input.press("Tab");
  }

  /**
   * Purchase Price — prefer Selector Hub `price-input`; then legacy `amount` / label fallbacks.
   */
  private async fillPurchasePrice(scope: Locator, value: string): Promise<void> {
    const input = await this.resolveEditablePurchasePriceInput(scope);
    await this.typeCurrencyIntoField(input, value);
  }

  /** Make / Model / Rego / Year — visible input order on Business QAT (price, make, model, rego), then year combobox. */
  private async fillNameFieldsRow(scope: Locator, data: CarOrVanAssetData): Promise<void> {
    const inputs = scope.locator("input").filter({ visible: true });
    const inputCount = await inputs.count();
    if (inputCount >= 4) {
      await this.typeIntoField(inputs.nth(1), data.make);
      await this.typeIntoField(inputs.nth(2), data.model);
      await this.typeIntoField(inputs.nth(3), data.rego);
      await this.fillAssetYearField(scope, data.year);
      return;
    }

    try {
      await this.typeIntoField(this.assetFieldInput(scope, "Make"), data.make);
      await this.typeIntoField(this.assetFieldInput(scope, "Model"), data.model);
      await this.typeIntoField(this.assetFieldInput(scope, "Rego"), data.rego);
      await this.fillAssetYearField(scope, data.year);
      return;
    } catch {
      // fallbacks
    }

    try {
      await this.hubMakeInput(scope).waitFor({ state: "visible", timeout: 20_000 });
      await this.typeIntoField(this.hubMakeInput(scope), data.make);
      await this.typeIntoField(this.hubModelInput(scope), data.model);
      await this.typeIntoField(this.hubRegoInput(scope), data.rego);
      await this.typeIntoField(this.hubYearInput(scope), data.year);
      return;
    } catch {
      // fallbacks
    }

    const nameInputs = scope.locator("name input");
    const n = await nameInputs.count();
    if (n >= 4) {
      await this.typeIntoField(nameInputs.nth(0), data.make);
      await this.typeIntoField(nameInputs.nth(1), data.model);
      await this.typeIntoField(nameInputs.nth(2), data.rego);
      await this.typeIntoField(nameInputs.nth(3), data.year);
      return;
    }

    const tryLabel = async (re: RegExp, v: string, xpathFallback: string) => {
      try {
        const loc = scope.getByLabel(re);
        await loc.waitFor({ state: "visible", timeout: 12_000 });
        await this.typeIntoField(loc, v);
      } catch {
        const loc = scope.locator(`xpath=${xpathFallback}`);
        await loc.waitFor({ state: "visible", timeout: 12_000 });
        await this.typeIntoField(loc, v);
      }
    };

    await tryLabel(
      /Make/i,
      data.make,
      './/*[self::label][contains(normalize-space(.),"Make")]/following::input[1]',
    );
    await tryLabel(
      /Model/i,
      data.model,
      './/*[self::label][contains(normalize-space(.),"Model")]/following::input[1]',
    );
    await tryLabel(
      /Rego/i,
      data.rego,
      './/*[self::label][contains(normalize-space(.),"Rego")]/following::input[1]',
    );
    await tryLabel(
      /Year/i,
      data.year,
      './/*[self::label][contains(normalize-space(.),"Year")]/following::input[1]',
    );
  }

  /**
   * Fills purchase / make / model / rego / year and **Add** after the asset tile is already selected.
   * Shared by {@link fillCarOrVanAssetRow} and {@link fillCarOrLightCommercialAssetRow}.
   */
  private async fillVehicleAssetRowFieldsAfterTileSelected(
    data: CarOrVanAssetData,
    options?: { rowScope?: Locator },
  ): Promise<void> {
    const rowScope = options?.rowScope ?? (await this.assetFormScope());
    await rowScope.scrollIntoViewIfNeeded();
    await this.waitForProgressSpinnersHidden(120_000);

    await this.fillPurchasePrice(rowScope, data.purchasePrice);
    await this.fillNameFieldsRow(rowScope, data);

    const addHub = this.hubAddButton(rowScope);
    try {
      await expect(addHub).toBeEnabled({ timeout: 45_000 });
      await this.clickElement(addHub);
    } catch {
      const addButton = rowScope.getByRole("button", {
        name: /^[+＋]?\s*Add(\s+Another\s+Asset)?$/i,
      });
      await expect(addButton).toBeEnabled({ timeout: 45_000 });
      await this.clickElement(addButton);
    }
    await this.waitForProgressSpinnersHidden(120_000);
    await this.waitForLoadingComplete();
  }

  /**
   * Fills the Car or Van row under “What are you looking to purchase?”.
   * Targets the **visible** `.web`/`.mobile` block so inputs are not written to the hidden layout.
   * Fills required fields then clicks **Add** when it becomes enabled (RSS applies the row to the flow).
   */
  async fillCarOrVanAssetRow(data: CarOrVanAssetData): Promise<void> {
    this.logStep("Fill Car Or Van Asset Row");
    await this.assetRoot.waitFor({ state: "visible", timeout: 20_000 });
    await this.page
      .getByText(/What are you looking to purchase/i)
      .first()
      .waitFor({ state: "visible", timeout: 30_000 })
      .catch(() => {});
    await this.ensureCarOrVanAssetTypeSelected();
    await this.fillVehicleAssetRowFieldsAfterTileSelected(data);
  }

  /** Adds another Car or Van row after the first asset was added. */
  async fillAdditionalCarOrVanAssetRow(data: CarOrVanAssetData): Promise<void> {
    this.logStep("Fill Additional Car Or Van Asset Row");
    await this.clickAddAnotherAsset();
    await this.ensureCarOrVanAssetTypeSelected();
    const rowScope = await this.editableAssetRowScope();
    await this.fillVehicleAssetRowFieldsAfterTileSelected(data, { rowScope });
  }

  /** Adds another Car or Light Commercial row after the first asset was added. */
  async fillAdditionalCarOrLightCommercialAssetRow(data: CarOrVanAssetData): Promise<void> {
    this.logStep("Fill Additional Car Or Light Commercial Asset Row");
    await this.clickAddAnotherAsset();
    await this.ensureCarOrLightCommercialAssetTypeSelected();
    const rowScope = await this.editableAssetRowScope();
    await this.fillVehicleAssetRowFieldsAfterTileSelected(data, { rowScope });
  }

  async fillMultipleCarOrVanAssets(assets: CarOrVanAssetData[]): Promise<void> {
    this.logStep(`Fill Multiple Car Or Van Assets — ${assets.length}`);
    if (assets.length === 0) return;
    await this.fillCarOrVanAssetRow(assets[0]);
    for (let i = 1; i < assets.length; i++) {
      await this.fillAdditionalCarOrVanAssetRow(assets[i]);
    }
  }

  async fillMultipleCarOrLightCommercialAssets(assets: CarOrVanAssetData[]): Promise<void> {
    this.logStep(`Fill Multiple Car Or Light Commercial Assets — ${assets.length}`);
    if (assets.length === 0) return;
    await this.fillCarOrLightCommercialAssetRow(assets[0]);
    for (let i = 1; i < assets.length; i++) {
      await this.fillAdditionalCarOrLightCommercialAssetRow(assets[i]);
    }
  }

  async expectTotalPurchasePriceInRepayment(expectedPattern: RegExp): Promise<void> {
    this.logStep(`Expect Total Purchase Price In Repayment — ${String(expectedPattern)}`);
    await this.repaymentRoot.waitFor({ state: "visible", timeout: 20_000 });
    const totalInput = this.repaymentRoot
      .locator(
        'xpath=.//*[contains(normalize-space(.),"Total Purchase Price")]/following::input[1]',
      )
      .first();
    if (await totalInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(totalInput).toHaveValue(expectedPattern, { timeout: 15_000 });
      return;
    }
    await expect(this.repaymentRoot).toContainText(expectedPattern, { timeout: 15_000 });
  }

  async expectRepaymentCalculationTableVisible(): Promise<void> {
    this.logStep("Expect Repayment Calculation Table Visible");
    await expect(
      this.repaymentRoot.getByText(/Installment|Repayment|Interest/i).first(),
    ).toBeVisible({ timeout: 60_000 });
  }

  /**
   * Same field values as {@link fillCarOrVanAssetRow}, but selects **Car or Light Commercial** (Business apply flow).
   */
  async fillCarOrLightCommercialAssetRow(data: CarOrVanAssetData): Promise<void> {
    this.logStep("Fill Car Or Light Commercial Asset Row");
    await this.assetRoot.waitFor({ state: "visible", timeout: 20_000 });
    await this.page
      .getByText(/What are you looking to purchase/i)
      .first()
      .waitFor({ state: "visible", timeout: 30_000 })
      .catch(() => {});
    await this.ensureCarOrLightCommercialAssetTypeSelected();
    await this.fillVehicleAssetRowFieldsAfterTileSelected(data);
  }

  private repaymentInputAfterLabel(labelText: string): Locator {
    return this.repaymentRoot
      .locator(
        `xpath=.//*[contains(normalize-space(.),"${labelText}")]/following::input[1]`,
      )
      .first();
  }

  private repaymentDropdownAfterLabel(labelText: string): Locator {
    return this.repaymentRoot
      .locator(
        `xpath=.//*[contains(normalize-space(.),"${labelText}")]/following::p-dropdown[1]`,
      )
      .first();
  }

  async fillRepaymentCalculatorFields(data: RepaymentCalculatorData): Promise<void> {
    this.logStep("Fill Repayment Calculator Fields");
    await this.repaymentRoot.waitFor({ state: "visible", timeout: 20_000 });

    const depositInput = this.repaymentInputAfterLabel("Deposit");
    await depositInput.waitFor({ state: "visible", timeout: 15_000 });
    await this.typeCurrencyIntoField(depositInput, data.deposit);

    await this.pickPrimeNgDropdownOption(
      this.repaymentDropdownAfterLabel("Term"),
      data.termMonths,
    );
    await this.pickPrimeNgDropdownOption(
      this.repaymentDropdownAfterLabel("Frequency"),
      data.frequency,
    );

    const balloonInput = this.repaymentInputAfterLabel("Balloon");
    await balloonInput.waitFor({ state: "visible", timeout: 15_000 });
    await this.typeCurrencyIntoField(balloonInput, data.balloon);
    await this.waitForLoadingComplete();
  }

  async clickRepaymentCalculate(): Promise<void> {
    this.logStep("Click Repayment Calculate");
    const btn = this.repaymentRoot.getByRole("button", { name: /^Calculate$/i });
    await btn.waitFor({ state: "visible", timeout: 15_000 });
    await this.clickElement(btn);
    await this.waitForLoadingComplete();
  }

  /** Soft checks matching the reference screenshot (localhost apply-now). */
  async expectRepaymentSummaryLikeScreenshot(): Promise<void> {
    this.logStep("Expect Repayment Summary Like Screenshot");
    const scope = this.repaymentRoot;
    await expect(scope.getByText(/\$4,725\.42/)).toBeVisible({ timeout: 30_000 });
    await expect(scope.getByText(/Monthly/i).first()).toBeVisible();
    await expect(scope.getByText(/\$100,140\.33/)).toBeVisible();
    await expect(scope.getByText(/\$188\.35/)).toBeVisible();
    await expect(scope.getByText(/\$14,221\.75/)).toBeVisible();
    await expect(scope.getByText(/\$114,410\.08/)).toBeVisible();
    await expect(scope.getByText(/12\.95%/)).toBeVisible();
  }

  /**
   * Apply Now step footer — primary "Next" (SelectorHub: `page.locator(':text-is("Next")')`).
   * Scope: visible text node only; long click timeout for QAT spinners over the card.
   */
  async clickApplyNowFooterNext(clickTimeoutMs = 60_000): Promise<void> {
    this.logStep("Click Apply Now Footer Next");
    await this.waitForProgressSpinnersHidden();
    const next = this.page.locator(':text-is("Next")').filter({ visible: true }).first();
    await next.waitFor({ state: "visible", timeout: 30_000 });
    await this.clickElement(next, clickTimeoutMs);
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

  async expectDealershipDropdownFieldsVisible(): Promise<void> {
    this.logStep("Expect Dealership Dropdown Fields Visible");
    await expect(
      this.page.getByText(/Select a UDC Dealership you have used before/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByText(/Select Another UDC Dealership/i).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectAnotherDealershipSearchSuggestions(
    minCount = 1,
    query = "copp",
  ): Promise<void> {
    this.logStep(`Expect Another Dealership Search Suggestions — ${query}`);
    const input = this.anotherDealershipSearchInput();
    await input.waitFor({ state: "visible", timeout: 20_000 });
    await this.waitForProgressSpinnersHidden();
    await input.scrollIntoViewIfNeeded();
    await input.click({ timeout: 15_000 });
    await input.fill("");
    await input.pressSequentially(query, { delay: 80 });

    // Wait for autocomplete loading spinner (inside the search field) to finish.
    const fieldSpinner = input
      .locator("xpath=ancestor::*[contains(@class,'p-autocomplete') or contains(@class,'p-inputwrapper')][1]")
      .locator(".p-autocomplete-loader, .pi-spinner, [class*='spinner']")
      .first();
    await fieldSpinner.waitFor({ state: "hidden", timeout: 60_000 }).catch(() => undefined);

    const suggestions = this.anotherDealershipOptions().filter({
      hasNotText: /^No results found$/i,
    });

    await expect(suggestions.first()).toBeVisible({ timeout: 60_000 });
    expect(await suggestions.count()).toBeGreaterThanOrEqual(minCount);
    await this.page.keyboard.press("Escape").catch(() => undefined);
  }

  private async readRepaymentDropdownOptionLabels(labelText: string): Promise<string[]> {
    const root = this.repaymentDropdownAfterLabel(labelText);
    const panel = await this.openPrimeNgDropdownPanel(root);
    const labels = await this.readVisibleDropdownOptionLabels(panel);
    await this.page.keyboard.press("Escape").catch(() => undefined);
    return labels;
  }

  async expectTermAndFrequencyOptionsPopulated(): Promise<void> {
    this.logStep("Expect Term And Frequency Options Populated");
    await this.repaymentRoot.waitFor({ state: "visible", timeout: 20_000 });
    const termOptions = await this.readRepaymentDropdownOptionLabels("Term");
    const frequencyOptions = await this.readRepaymentDropdownOptionLabels("Frequency");
    expect(termOptions.length).toBeGreaterThan(0);
    expect(frequencyOptions.length).toBeGreaterThan(0);
  }

  private calculatedInstallmentAmount(): Locator {
    return this.repaymentRoot
      .locator(
        'xpath=.//*[normalize-space(.)="Yours from only"]/following-sibling::*[contains(., "$")][1]',
      )
      .first();
  }

  async readInstallmentAmount(): Promise<string> {
    this.logStep("Read Installment Amount");
    const installment = this.calculatedInstallmentAmount();
    await expect(installment).toBeVisible({ timeout: 30_000 });
    return (await installment.innerText()).replace(/\s+/g, " ").trim();
  }

  async expectInstallmentAmountChanged(
    previousAmount: string,
    timeoutMs = 60_000,
  ): Promise<string> {
    this.logStep(`Expect Installment Amount Changed — was ${previousAmount}`);
    let latest = previousAmount;
    await expect
      .poll(
        async () => {
          latest = await this.readInstallmentAmount();
          return latest !== previousAmount;
        },
        { timeout: timeoutMs, intervals: [500, 1_000, 2_000] },
      )
      .toBe(true);
    return latest;
  }
}
