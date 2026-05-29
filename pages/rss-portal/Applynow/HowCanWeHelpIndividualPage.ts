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
  /**
   * “What would you like to do?” — `p-dropdown` bound as `purchaseThrough`
   * (label-based XPath avoids reliance on minified `ng-reflect-*` only).
   */
  readonly purchaseThroughDropdownRoot: Locator;

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
    const byFormName = page.locator('p-dropdown[ng-reflect-name="purchaseThrough"]');
    const byLabel = page.locator(
      "xpath=//label[contains(normalize-space(.),'What would you like to do')]/following::p-dropdown[1]",
    );
    this.purchaseThroughDropdownRoot = byFormName.or(byLabel).first();
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
  }

  /** Selects the Business applicant type tile. */
  async clickBusiness(): Promise<void> {
    this.logStep("Click Business");
    await this.businessTileButton.waitFor({ state: "visible", timeout: 15_000 });
    await this.clickElement(this.businessTileButton);
    await this.waitForLoadingComplete();
  }

  private escapeRx(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * PrimeNG attaches `.p-dropdown-panel` to `body`; hidden panels stay in DOM — use a visible panel.
   * Opens via `[role=combobox]` first (matches the label span users click), then the chevron trigger.
   */
  private async pickPrimeNgDropdownOption(optionLabel: string): Promise<void> {
    const root = this.purchaseThroughDropdownRoot;
    await root.waitFor({ state: "visible", timeout: 15_000 });

    const looseName = new RegExp(this.escapeRx(optionLabel), "i");
    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root
      .locator(".p-dropdown-trigger, [aria-label='dropdown trigger']")
      .first();

    await combobox.scrollIntoViewIfNeeded();
    if (await combobox.isVisible().catch(() => false)) {
      await this.clickElement(combobox);
    } else {
      await trigger.waitFor({ state: "visible", timeout: 15_000 });
      await this.clickElement(trigger);
    }

    const visiblePanel = this.page.locator(".p-dropdown-panel").filter({ visible: true });
    await visiblePanel.last().waitFor({ state: "visible", timeout: 12_000 });

    const panel = visiblePanel.last();
    const row = panel
      .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
      .filter({ hasText: looseName })
      .first();

    if (await row.isVisible({ timeout: 4000 }).catch(() => false)) {
      await row.click();
    } else {
      const byRole = this.page.getByRole("option", { name: looseName }).first();
      await byRole.waitFor({ state: "visible", timeout: 8000 });
      await byRole.click();
    }

    await this.waitForLoadingComplete();
  }

  /** Sets “What would you like to do?” to Purchase through a dealership. */
  async selectPurchaseThroughDealership(): Promise<void> {
    this.logStep("Select Purchase Through Dealership");
    await this.pickPrimeNgDropdownOption("Purchase through a dealership");
  }

  /**
   * Sets “What would you like to do?” to **I am after a Conditional Approval** (Business conditional-approval path).
   */
  async selectConditionalApproval(): Promise<void> {
    this.logStep("Select Conditional Approval");
    await this.pickPrimeNgDropdownOption("I am after a Conditional Approval");
  }

  /** Asserts the purchase-through dropdown shows “Purchase through a dealership”. */
  async expectPurchaseThroughDealershipSelected(
    timeoutMs = 15_000,
  ): Promise<void> {
    this.logStep("Expect Purchase Through Dealership Selected");
    const face = this.purchaseThroughDropdownRoot
      .locator('[role="combobox"]')
      .first();
    await expect(face).toContainText(/Purchase through a dealership/i, {
      timeout: timeoutMs,
    });
  }

  /** Asserts “What would you like to do?” shows **I am after a Conditional Approval**. */
  async expectConditionalApprovalSelected(timeoutMs = 15_000): Promise<void> {
    this.logStep("Expect Conditional Approval Selected");
    const face = this.purchaseThroughDropdownRoot
      .locator('[role="combobox"]')
      .first();
    await expect(face).toContainText(
      /I\s+am\s+after\s+a\s+Conditional\s+Approval/i,
      { timeout: timeoutMs },
    );
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
    const looseName = new RegExp(this.escapeRx(optionLabel), "i");
    await root.waitFor({ state: "visible", timeout: 15_000 });
    await this.waitForProgressSpinnersHidden();
    const combobox = root.locator('[role="combobox"]').first();
    const trigger = root
      .locator(".p-dropdown-trigger, [aria-label='dropdown trigger']")
      .first();
    await combobox.scrollIntoViewIfNeeded();
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
    const row = panel
      .locator("li.p-dropdown-item, li[role='option'], .p-dropdown-item")
      .filter({ hasText: looseName })
      .first();
    if (await row.isVisible({ timeout: 4000 }).catch(() => false)) {
      await row.click();
    } else {
      const byRole = this.page.getByRole("option", { name: looseName }).first();
      await byRole.waitFor({ state: "visible", timeout: 8000 });
      await byRole.click();
    }
    await this.waitForLoadingComplete();
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
    return this.page.locator('p-dropdown[ng-reflect-name="selectDelearship"]');
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

  /**
   * `p-dropdown` bound as `selectDelearship` (server-side spelling).
   */
  async selectDealerYouHaveUsedBefore(dealerLabel: string): Promise<void> {
    this.logStep("Select Dealer You Have Used Before");
    const root = this.dealershipDropdownRoot();
    await this.pickPrimeNgDropdownOption(root, dealerLabel);
  }

  /** Ensures “Car or Van” asset type tile is selected (desktop `app-asset-select` layout). */
  async ensureCarOrVanAssetTypeSelected(): Promise<void> {
    this.logStep("Ensure Car Or Van Asset Type Selected");
    await this.waitForProgressSpinnersHidden(60_000);
    const tile = this.assetRoot
      .locator(".icon-container")
      .filter({ hasText: /Car or Van/i })
      .first();
    await tile.waitFor({ state: "visible", timeout: 15_000 });
    const selected = this.assetRoot.locator(".selected-icon-class").filter({
      hasText: /Car or Van/i,
    });
    if (await selected.isVisible().catch(() => false)) {
      return;
    }
    await this.clickElement(tile);
    await this.waitForLoadingComplete();
    await this.waitForProgressSpinnersHidden(60_000);
  }

  /**
   * Ensures **Car or Light Commercial** is selected on the Business asset grid.
   * SelectorHub selected state: `div.icon-container_business.clicked-icon-class_business` (visible).
   * Click target when not selected: `div.icon-container_business` with label **Car or Light Commercial**.
   */
  async ensureCarOrLightCommercialAssetTypeSelected(): Promise<void> {
    this.logStep("Ensure Car Or Light Commercial Asset Type Selected");
    await this.waitForProgressSpinnersHidden(60_000);

    const selectedTile = this.assetRoot
      .locator("div.icon-container_business.clicked-icon-class_business")
      .filter({ visible: true })
      .filter({ hasText: /Car or Light Commercial/i })
      .first();

    if (await selectedTile.isVisible({ timeout: 5_000 }).catch(() => false)) {
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

    await expect(selectedTile).toBeVisible({ timeout: 20_000 });
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

  /** Hub: `input.w-full.text-sm.p-inputtext.price-input` (visible). */
  private hubPurchasePriceInput(): Locator {
    return this.page
      .locator("input.w-full.text-sm.p-inputtext.price-input")
      .filter({ visible: true })
      .first();
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
    try {
      const hub = this.hubPurchasePriceInput();
      await hub.waitFor({ state: "visible", timeout: 35_000 });
      await this.typeIntoField(hub, value);
      return;
    } catch {
      // fallbacks
    }
    const amountInput = scope.locator("amount").first().locator("input");
    try {
      await amountInput.waitFor({ state: "visible", timeout: 15_000 });
      await this.typeIntoField(amountInput, value);
      return;
    } catch {
      // continue
    }
    try {
      const byLabel = scope.getByLabel(/Purchase Price/i);
      await byLabel.waitFor({ state: "visible", timeout: 15_000 });
      await this.typeIntoField(byLabel, value);
      return;
    } catch {
      // continue
    }
    const loose = scope.locator(
      'xpath=.//*[contains(normalize-space(.),"Purchase Price")]/following::input[1]',
    );
    await loose.waitFor({ state: "visible", timeout: 15_000 });
    await this.typeIntoField(loose, value);
  }

  /** Make / Model / Rego / Year — prefer Hub ion-col chain; then `name input` / labels. */
  private async fillNameFieldsRow(scope: Locator, data: CarOrVanAssetData): Promise<void> {
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

    const inputs = scope.locator("name input");
    const n = await inputs.count();
    if (n >= 4) {
      await this.typeIntoField(inputs.nth(0), data.make);
      await this.typeIntoField(inputs.nth(1), data.model);
      await this.typeIntoField(inputs.nth(2), data.rego);
      await this.typeIntoField(inputs.nth(3), data.year);
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
  ): Promise<void> {
    const scope = await this.assetFormScope();
    await scope.scrollIntoViewIfNeeded();
    await this.waitForProgressSpinnersHidden(120_000);

    await this.fillPurchasePrice(scope, data.purchasePrice);
    await this.fillNameFieldsRow(scope, data);

    const addHub = this.hubAddButton(scope);
    try {
      await expect(addHub).toBeEnabled({ timeout: 45_000 });
      await this.clickElement(addHub);
    } catch {
      const addButton = scope.getByRole("button", {
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

  async fillRepaymentCalculatorFields(data: RepaymentCalculatorData): Promise<void> {
    this.logStep("Fill Repayment Calculator Fields");
    await this.repaymentRoot.waitFor({ state: "visible", timeout: 20_000 });

    const depositInput = this.repaymentRoot.locator(
      '[ng-reflect-name="depositAmount"] input',
    );
    await depositInput.waitFor({ state: "visible", timeout: 10_000 });
    await this.fillElement(depositInput, data.deposit);

    await this.pickPrimeNgDropdownOption(
      this.repaymentRoot.locator('p-dropdown[ng-reflect-name="term"]'),
      data.termMonths,
    );
    await this.pickPrimeNgDropdownOption(
      this.repaymentRoot.locator('p-dropdown[ng-reflect-name="paymentFrequency"]'),
      data.frequency,
    );

    const balloonInput = this.repaymentRoot.locator(
      '[ng-reflect-name="balloonAmount"] input',
    );
    await this.fillElement(balloonInput, data.balloon);
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
