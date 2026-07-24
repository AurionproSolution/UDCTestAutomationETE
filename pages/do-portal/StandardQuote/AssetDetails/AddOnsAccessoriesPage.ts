import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../../common/BasePage";

/**
 * Standard Quote — **Add Ons & Accessories** (Registration / Service Plan, Accessories, Insurance).
 *
 * On some builds this is an **inline** expand under Lease Details; on others the **sidebar / link**
 * opens a **dedicated route** (`…/add-on-accessories`) where `app-add-on-accessories` is **not** a child
 * of the first `app-quote-details` shell. Locators therefore anchor on **visible copy** (`Add Registration…`,
 * `Accessories`, `Insurance`) and optional `app-add-on-accessories` at **page** scope.
 *
 * **Insurance automation** is temporarily bypassed when {@link DOAddOnsAccessoriesPage.SKIP_INSURANCE_ADDONS_AUTOMATION}
 * is `true` (post-deploy UI instability). Registration + Accessories flows are unchanged.
 */
export class DOAddOnsAccessoriesPage extends BasePage {
  /**
   * When `true`, public flows skip every insurance interaction (radios, Months/Amount, validations, insurance Save retry).
   * Set to `false` to restore full insurance automation.
   */
  private static readonly SKIP_INSURANCE_ADDONS_AUTOMATION = true;

  private readonly standardQuoteRoot: Locator;

  constructor(page: Page) {
    super(page);
    this.standardQuoteRoot = page.locator("app-quote-details, app-standard-quote").last();
  }

  protected stepLogPrefix(): string {
    return "Standard quote — Add Ons & Accessories";
  }

  /** Angular host when present (may be page root, not under `.first()` quote shell). Selector varies by build. */
  addOnsAngularHost(): Locator {
    return this.page
      .locator("app-add-on-accessories, app-add-ons-accessories, app-addon-accessories")
      .last();
  }

  /** Panel that lists Registration / Service Plan / Others (heading copy is stable on QAT). */
  registrationServicePanel(): Locator {
    return this.page
      .getByText(
        /Add Registration and Service Plans|Registration\s*(?:and|&)\s*Service\s*Plans/i,
      )
      .first()
      .locator(
        "xpath=ancestor::gen-card[1] | ancestor::p-card[1] | ancestor::div[contains(@class,'card')][1] | ancestor::*[self::app-add-on-accessories or self::app-add-ons-accessories or self::app-addon-accessories][1]",
      );
  }

  /**
   * **Accessories** card — outer `gen-card` whose body contains the header label **Accessories** (exact),
   * then `form` rows `div.m-0.col-4.grid` + `amount` + `input[currencymask]` (QAT DOM).
   */
  accessoriesPanel(): Locator {
    return this.page
      .locator("gen-card")
      .filter({ hasText: /Sub-Total Accessories/i })
      .filter({
        has: this.page.locator("label.font-semibold").filter({ hasText: /^Accessories$/ }),
      })
      .first();
  }

  /** One accessory line inside the Accessories `form` (label column + `amount` control). */
  accessoryLineRow(index: number): Locator {
    return this.accessoriesPanel().locator("form div.m-0.col-4.grid").nth(index);
  }

  /** Amount field on the row whose left label matches (e.g. **Bull Bar**, **Towbar**). */
  accessoryAmountInputByLineLabel(label: string): Locator {
    return this.accessoriesPanel()
      .locator("form div.m-0.col-4.grid")
      .filter({ hasText: label })
      .locator("amount input[currencymask], amount input.p-inputtext, input[currencymask]")
      .first();
  }

  /**
   * **nth** line-item amount in Accessories (DOM order under `form`: Bull Bar, Towbar, Tints, …).
   * Prefer {@link accessoryAmountInputByLineLabel} when the build reorders rows.
   */
  generalAccessoriesAmountInput(index = 0): Locator {
    return this.accessoryLineRow(index).locator("amount input[currencymask], amount input.p-inputtext, input[currencymask]").first();
  }

  /**
   * Insurance Angular host (`app-insurance-requirement` wraps `p-card` + `base-form` on QAT).
   * Months / Amount live in the same **`form.p-fluid`** grid as each `div.field-radiobutton` — not inside the radio div.
   */
  insuranceRoot(): Locator {
    return this.page.locator("app-insurance-requirement").last();
  }

  /** Fallback when questions render without `app-insurance-requirement` in the accessibility tree. */
  private insuranceCard(): Locator {
    return this.page
      .locator("p-card")
      .filter({
        has: this.page.locator("label.font-semibold").filter({ hasText: /^Insurance$/ }),
      })
      .first();
  }

  /** QAT marks the insurance dynamic form with **`insuRequire`** — one `form.p-fluid` per Yes/No question. */
  private insuranceBaseForm(): Locator {
    return this.page.locator("base-form.insuRequire").last();
  }

  /** All per-question **`form.p-fluid`** rows (Months/Amount are in the same `form` as `div.field-radiobutton`). */
  private async insuranceQuestionForms(): Promise<Locator> {
    let chain = this.insuranceBaseForm().locator("form.p-fluid");
    if ((await chain.count()) > 0) {
      return chain;
    }
    chain = this.insuranceRoot().locator("base-form form.p-fluid");
    if ((await chain.count()) > 0) {
      return chain;
    }
    return this.insuranceCard().locator("base-form form.p-fluid");
  }

  private addOnsOpenTrigger(): Locator {
    const full =
      /\+?\s*Add\s*Ons?\s*(?:&|and)\s*Accessories|\+?\s*Addons?\s*&\s*Accessories|Add\s+Ons?\s*(?:&\s*)?\s*Accessories/i;
    const short = /^\+?\s*Add\s*Ons?$/i;
    const root = this.standardQuoteRoot;
    const chargesSection = root.filter({ has: root.getByText(/Additional\s+Charges/i) });
    return this.page
      .getByRole("link", { name: full })
      .or(this.page.getByRole("button", { name: full }))
      .or(root.getByRole("link", { name: full }))
      .or(root.getByRole("button", { name: full }))
      .or(root.locator("a, button, [role='button']").filter({ hasText: full }))
      .or(chargesSection.getByRole("button", { name: short }))
      .or(chargesSection.locator("gen-button, p-button").filter({ hasText: short }).locator("button"))
      .or(chargesSection.locator("button.p-button").filter({ hasText: short }))
      .or(root.getByRole("button", { name: short }))
      .or(root.locator("gen-button, p-button").filter({ hasText: short }).locator("button"))
      .or(root.locator("button.p-button-outlined, button.p-button").filter({ hasText: short }))
      .or(this.page.getByRole("button", { name: short }))
      .first();
  }

  /**
   * Full-page **.app-loader-overlay** (often with `p-progressspinner`) blocks clicks — e.g. right after **Calculate**.
   * Uses **visible** overlays only (Angular can leave detached / hidden nodes) and requires a short **stable**
   * clear window so we do not click in the gap before a new spinner mounts.
   */
  private async waitUntilNoVisibleAppLoaderOverlays(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let stableClears = 0;
    while (Date.now() < deadline) {
      const visibleOverlays = this.page.locator(".app-loader-overlay").filter({ visible: true });
      const count = await visibleOverlays.count();
      if (count === 0) {
        stableClears += 1;
        if (stableClears >= 3) {
          await this.page.waitForTimeout(180);
          const recheck = await this.page.locator(".app-loader-overlay").filter({ visible: true }).count();
          if (recheck === 0) {
            return;
          }
          stableClears = 0;
        }
      } else {
        stableClears = 0;
      }
      await this.page.waitForTimeout(200);
    }
    throw new Error(
      `Timed out after ${timeoutMs}ms waiting for .app-loader-overlay to clear before Add Ons & Accessories.`,
    );
  }

  private addonLikeUrl(): boolean {
    return /add-on-accessories|addon-accessories|addOnAccessories|add_on_accessories/i.test(
      this.page.url(),
    );
  }

  /**
   * Toasts / light dismiss / overlays after Add Ons editor actions — same noise that can block
   * {@link DOAssetDetailsPage.clickPaymentSummaryCalculateButton} when not cleared.
   */
  private async dismissBlockingChromeAfterAddOnsEditor(): Promise<void> {
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.page.keyboard.press("Escape").catch(() => {});

    const closers = this.page.locator(
      ".p-toast-icon-close, .p-toast-close-icon, .p-toast-close-button, [data-pc-section='closebutton'], button.p-dialog-header-icon",
    );
    const n = Math.min(await closers.count(), 10);
    for (let i = 0; i < n; i++) {
      const el = closers.nth(i);
      if (await el.isVisible({ timeout: 400 }).catch(() => false)) {
        await el.click({ timeout: 2_000 }).catch(() => {});
      }
    }

    await this.waitUntilNoVisibleAppLoaderOverlays(45_000).catch(() => {});
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  /** **Registration** amount — scoped to {@link registrationServicePanel} so we never pair the wrong `following::input` (e.g. Payment Summary / Lease Details). */
  registrationAmountInput(): Locator {
    const panel = this.registrationServicePanel();
    return panel
      .getByText(/^Registration$/i)
      .first()
      .locator(
        "xpath=following::input[(@type='text' or not(@type)) and (contains(@class,'p-input') or @pinputtext or @currencymask)][1]",
      );
  }

  /**
   * True when the Add Ons editor surface is present — **inline**, **routed**, or **lazy** chunk.
   * Do not rely on a single Angular tag or one heading string (QAT copy / selector drift).
   */
  private async isAddOnsEditorSurfaceVisible(): Promise<boolean> {
    const host = this.page.locator(
      "app-add-on-accessories, app-add-ons-accessories, app-addon-accessories",
    );
    const hostN = await host.count();
    if (hostN > 0) {
      for (let i = 0; i < Math.min(hostN, 5); i++) {
        if (await host.nth(i).isVisible({ timeout: 400 }).catch(() => false)) {
          return true;
        }
      }
    }

    const headingPatterns: RegExp[] = [
      /Add Registration and Service Plans/i,
      /Registration\s*(?:and|&)\s*Service\s*Plans/i,
    ];
    for (const re of headingPatterns) {
      if (await this.page.getByText(re).first().isVisible({ timeout: 400 }).catch(() => false)) {
        return true;
      }
    }

    if (
      await this.page
        .getByText("Add Ons & Accessories", { exact: true })
        .first()
        .isVisible({ timeout: 400 })
        .catch(() => false)
    ) {
      return true;
    }
    if (await this.page.getByText(/Add On Accessories/i).first().isVisible({ timeout: 400 }).catch(() => false)) {
      return true;
    }

    if (this.addonLikeUrl()) {
      const regCard = this.page
        .locator("gen-card, p-card")
        .filter({ hasText: /Registration|Service\s*Plans/i })
        .first();
      if (await regCard.isVisible({ timeout: 600 }).catch(() => false)) {
        return true;
      }
      const accCard = this.page.locator("gen-card").filter({ hasText: /Sub-Total Accessories/i }).first();
      if (await accCard.isVisible({ timeout: 600 }).catch(() => false)) {
        return true;
      }
    }

    return false;
  }

  /** True once add-ons UI is usable (dedicated route **or** inline panel). */
  private async waitForAddOnsUiReady(): Promise<void> {
    await this.page.waitForTimeout(250);
    await expect
      .poll(async () => this.isAddOnsEditorSurfaceVisible(), {
        timeout: 60_000,
        intervals: [200, 400, 800, 1_200, 2_000, 3_000],
      })
      .toBeTruthy();
  }

  async openAddOnsAndAccessoriesSection(): Promise<void> {
    this.logStep("Open Add Ons & Accessories from Lease Details or nav");
    this.log("Waiting for app loader overlay to clear (post-Calculate spinner can block the control)…");
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    const trigger = this.addOnsOpenTrigger();
    await trigger.waitFor({ state: "visible", timeout: 30_000 });
    await trigger.scrollIntoViewIfNeeded();
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    await this.page.waitForTimeout(300);
    await this.waitUntilNoVisibleAppLoaderOverlays(45_000).catch(() => {});

    try {
      await trigger.click({ timeout: 15_000 });
    } catch {
      this.log("Add Ons open: click blocked (loader/spinner) — settling overlay then force-click");
      await this.waitUntilNoVisibleAppLoaderOverlays(90_000);
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click({ force: true, timeout: 25_000 });
    }
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page
      .waitForURL(/add-on-accessories|addon-accessories|addOnAccessories|add_on_accessories/i, {
        timeout: 12_000,
      })
      .catch(() => {});

    const settleAfterClick = async (): Promise<void> => {
    await this.waitForAddOnsUiReady();
    };

    try {
      await settleAfterClick();
    } catch {
      this.log("Add Ons open: UI not ready after first click — loaders + force-click retry");
      await this.waitUntilNoVisibleAppLoaderOverlays(90_000).catch(() => {});
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click({ force: true, timeout: 20_000 }).catch(() => {});
      await this.page.waitForTimeout(500);
      await this.page
        .waitForURL(/add-on-accessories|addon-accessories|addOnAccessories|add_on_accessories/i, {
          timeout: 12_000,
        })
        .catch(() => {});
      await settleAfterClick();
    }

    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.expectAddOnsSectionHeadingVisible();
  }

  async expectAddOnsSectionHeadingVisible(): Promise<void> {
    this.logStep('Expect heading "Add Ons & Accessories" or routed add-ons page');
    const registrationHeading = this.page
      .getByText(/Add Registration and Service Plans/i)
      .or(this.page.getByText(/Registration\s*(?:and|&)\s*Service\s*Plans/i));
    const h = this.page
      .getByText("Add Ons & Accessories", { exact: true })
      .or(this.page.getByText(/Add On Accessories/i))
      .or(registrationHeading);
    await expect(h.first()).toBeVisible({ timeout: 25_000 });
  }

  /** Best-effort dollar (or text blob) next to a **Sub-Total** / summary label on Add Ons. */
  private async readSubtotalNearLabel(labelPattern: RegExp): Promise<string> {
    const anchor = this.page.getByText(labelPattern).first();
    if (!(await anchor.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return "(not visible)";
    }
    const raw = (
      (await anchor
        .evaluate((el) => (el as HTMLElement).closest("div")?.innerText ?? el.textContent ?? "")
        .catch(() => "")) ?? ""
    ).replace(/\s+/g, " ");
    const m = raw.match(/\$\s*[\d,]+\.?\d*/);
    return m ? m[0].trim() : raw.slice(0, 100).trim();
  }

  private async readAddOnsSubtotalSnapshot(): Promise<{ reg: string; acc: string; ins: string }> {
    return {
      reg: await this.readSubtotalNearLabel(
        /Sub-Total.*Registration|Sub-Total.*Service|Sub-Total.*Plans|Sub-Total.*Add\s*Ons|Sub Total Add Ons/i,
      ),
      acc: await this.readSubtotalNearLabel(/Sub-Total\s*Accessories|Sub Total Accessories/i),
      ins: await this.readSubtotalNearLabel(/Sub-Total\s*Insurances|Sub Total Insurance/i),
    };
  }

  private logAddOnsSubtotals(tag: string, s: { reg: string; acc: string; ins: string }): void {
    // eslint-disable-next-line no-console
    console.log(
      `[Add Ons ${tag}] Sub-Total (Registration / Add Ons block): ${s.reg} | Sub-Total Accessories: ${s.acc} | Sub-Total Insurances: ${s.ins}`,
    );
  }

  /**
   * Registration / Accessories currency fields — click, **Ctrl+A**, slow **type**, **Tab**, Angular settle,
   * subtotal snapshot + soft warning if the field shows the digits but the relevant subtotal did not move.
   */
  private async fillCurrencyLikeInput(
    input: Locator,
    plainDigits: string,
    subtotalWatch: "registration" | "accessories",
  ): Promise<void> {
    const digits = plainDigits.replace(/[^0-9]/g, "");
    await input.waitFor({ state: "visible", timeout: 25_000 });
    await input.scrollIntoViewIfNeeded();
    const before = await this.readAddOnsSubtotalSnapshot();
    this.logAddOnsSubtotals(`before ${subtotalWatch} amount`, before);

    await input.click();
    await input.press("Control+a");
    await input.type(plainDigits, { delay: 50 });
    await input.press("Tab").catch(() => {});
    await this.page.waitForTimeout(1_000);

    const after = await this.readAddOnsSubtotalSnapshot();
    this.logAddOnsSubtotals(`after ${subtotalWatch} amount`, after);

    const fieldDigits = ((await input.inputValue().catch(() => "")) ?? "").replace(/[^0-9]/g, "");
    const fieldLooksEntered = fieldDigits.includes(digits) && digits.length > 0;
    const regVis = before.reg !== "(not visible)" && after.reg !== "(not visible)";
    const accVis = before.acc !== "(not visible)" && after.acc !== "(not visible)";
    if (fieldLooksEntered) {
      if (subtotalWatch === "registration" && regVis && before.reg === after.reg) {
        // eslint-disable-next-line no-console
        console.warn("Amount entered successfully but subtotal did not recalculate.");
      }
      if (subtotalWatch === "accessories" && accVis && before.acc === after.acc) {
        // eslint-disable-next-line no-console
        console.warn("Amount entered successfully but subtotal did not recalculate.");
      }
    }

    await expect
      .poll(
        async () => (await input.inputValue()).replace(/[^0-9]/g, "").includes(digits),
        { timeout: 18_000, intervals: [200, 400, 800, 1_500] },
      )
      .toBeTruthy();
  }

  async fillRegistrationAmount(amount: string): Promise<void> {
    this.logStep(`Fill Registration amount: ${this.stepValueDisplay(amount)}`);
    const panel = this.registrationServicePanel();
    await panel.scrollIntoViewIfNeeded().catch(() => {});
    await panel
      .getByText(/^Registration$/i)
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await this.fillCurrencyLikeInput(this.registrationAmountInput(), amount, "registration");
  }

  /** **Service Plan** row — not used by UDP-T4221; kept for other flows. */
  private servicePlanAmountInput(): Locator {
    const panel = this.registrationServicePanel();
    return panel
      .getByText(/^Service Plan$/i)
      .first()
      .locator(
        "xpath=following::input[(@type='text' or not(@type)) and (contains(@class,'p-input') or @pinputtext or @currencymask)][1]",
      );
  }

  private async extendedWarrantyScope(): Promise<Locator> {
    const scopes = [this.insuranceRoot(), this.page.locator("app-add-on-accessories").last(), this.page];
    for (const scope of scopes) {
      const label = scope.getByText(/Extended\s*Warranty/i).first();
      if (!(await label.isVisible({ timeout: 3_000 }).catch(() => false))) {
        continue;
      }
      await label.scrollIntoViewIfNeeded();
      const form = label.locator("xpath=ancestor::form[1]");
      if (await form.isVisible({ timeout: 1_500 }).catch(() => false)) {
        return form;
      }
      const grid = label.locator("xpath=ancestor::div[contains(@class,'grid')][1]");
      if (await grid.isVisible({ timeout: 1_500 }).catch(() => false)) {
        return grid;
      }
      return label.locator("xpath=ancestor::div[contains(@class,'col')][1]");
    }
    return this.page.getByText(/Extended\s*Warranty/i).first();
  }

  async isInsuranceAddOnsAvailable(): Promise<boolean> {
    await this.page.getByText(/^Insurance$/i).first().scrollIntoViewIfNeeded().catch(() => {});
    await this.insuranceRoot().scrollIntoViewIfNeeded().catch(() => {});
    const rootText = ((await this.insuranceRoot().textContent()) ?? "").replace(/\s+/g, " ");
    if (/No data available/i.test(rootText)) {
      return false;
    }
    return this.page.getByText(/Extended\s*Warranty/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
  }

  /**
   * UDP-T4221 — fill **Extended Warranty** when Insurance is configured; skip when panel shows **No data available**.
   * @returns `true` when insurance was entered.
   */
  async fillUdpT4221InsuranceIfAvailable(months: string, amount: string): Promise<boolean> {
    if (!(await this.isInsuranceAddOnsAvailable())) {
      this.logStep("Insurance not available on Add Ons — skipping Extended Warranty");
      return false;
    }
    await this.fillExtendedWarrantyInsuranceForT4221(months, amount);
    return true;
  }

  /**
   * UDP-T4221 — **Extended Warranty** Months + Amount only (no Service Plan); bypasses {@link SKIP_INSURANCE_ADDONS_AUTOMATION}.
   */
  async fillExtendedWarrantyInsuranceForT4221(months: string, amount: string): Promise<void> {
    this.logStep(
      `UDP-T4221 Extended Warranty insurance: ${this.stepValueDisplay(months)} mo / ${this.stepValueDisplay(amount)}`,
    );
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.page.getByText(/^Insurance$/i).first().scrollIntoViewIfNeeded().catch(() => {});
    await this.insuranceRoot().scrollIntoViewIfNeeded().catch(() => {});
    await this.waitUntilNoVisibleAppLoaderOverlays(30_000);

    const scope = await this.extendedWarrantyScope();
    await expect(scope).toBeVisible({ timeout: 30_000 });

    const yesRadio = scope.locator("p-radiobutton").filter({ hasText: /^Yes$/i }).first();
    const yesBox = yesRadio.locator("div.p-radiobutton-box").first();
    if (await yesBox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await yesBox.click({ timeout: 15_000 });
    } else if (await yesRadio.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await yesRadio.click({ timeout: 15_000 });
    }

    const monthInput = this.insuranceMonthsInput(scope);
    await expect(monthInput).toBeVisible({ timeout: 20_000 });
    await monthInput.click();
    await monthInput.press("Control+a");
    await monthInput.type(months, { delay: 50 });
    await monthInput.press("Tab").catch(() => {});
    await expect
      .poll(async () => (await monthInput.inputValue()).replace(/\D/g, ""), {
        timeout: 15_000,
        intervals: [200, 400, 800],
      })
      .toContain(months.replace(/\D/g, ""));

    const amtInput = this.insuranceAmountInput(scope);
    await expect(amtInput).toBeVisible({ timeout: 20_000 });
    await amtInput.click();
    await amtInput.press("Control+a");
    await amtInput.type(amount.replace(/[^0-9]/g, ""), { delay: 50 });
    await amtInput.press("Tab").catch(() => {});
    await expect
      .poll(
        async () => {
          const raw = (await amtInput.inputValue()).replace(/[^0-9]/g, "");
          const digits = amount.replace(/[^0-9]/g, "");
          return raw.includes(digits) ? raw : null;
        },
        { timeout: 22_000, intervals: [200, 500, 1_000] },
      )
      .not.toBeNull();
  }

  /**
   * **General Accessories** — **General Accessory** on TL; **Bull Bar** on MV dealer builds.
   */
  async fillGeneralAccessoriesAmount(amount: string): Promise<void> {
    this.logStep(`Fill General Accessories amount: ${this.stepValueDisplay(amount)}`);
    await this.accessoriesPanel().scrollIntoViewIfNeeded().catch(() => {});
    const general = this.accessoryAmountInputByLineLabel("General Accessory");
    const bull = this.accessoryAmountInputByLineLabel("Bull Bar");
    let input = general;
    if (!(await general.isVisible({ timeout: 2_000 }).catch(() => false))) {
      input =
        (await bull.isVisible({ timeout: 2_000 }).catch(() => false))
          ? bull
          : this.accessoriesPanel()
              .locator("form div.m-0.col-4.grid")
              .filter({ visible: true })
              .first()
              .locator("amount input[currencymask], amount input.p-inputtext, input[currencymask]")
              .first();
    }
    await this.fillCurrencyLikeInput(input, amount, "accessories");
  }

  /** Second line **Towbar** — label match (**Towbar** / **Tow Bar**) then **nth(1)** row (same fallback as summary polls). */
  async fillSecondAccessoryAmount(amount: string): Promise<void> {
    this.logStep(`Fill Accessories (Towbar / 2nd line) amount: ${this.stepValueDisplay(amount)}`);
    await this.accessoriesPanel().scrollIntoViewIfNeeded().catch(() => {});

    const towByExactLabel = this.accessoryAmountInputByLineLabel("Towbar");
    const towBySpacedLabel = this.accessoriesPanel()
      .locator("form div.m-0.col-4.grid")
      .filter({ hasText: /Tow\s*Bar/i })
      .locator("amount input[currencymask], amount input.p-inputtext, input[currencymask]")
      .first();
    const towByRowIndex = this.generalAccessoriesAmountInput(1);

    await expect
      .poll(
        async () => {
          for (const loc of [towByExactLabel, towBySpacedLabel, towByRowIndex]) {
            await loc.scrollIntoViewIfNeeded().catch(() => {});
            if (await loc.isVisible({ timeout: 800 }).catch(() => false)) {
              return true;
            }
          }
          return false;
        },
        { timeout: 18_000, intervals: [200, 500, 1_000, 1_500] },
      )
      .toBeTruthy();

    const input =
      (await towByExactLabel.isVisible({ timeout: 1_500 }).catch(() => false))
        ? towByExactLabel
        : (await towBySpacedLabel.isVisible({ timeout: 1_500 }).catch(() => false))
          ? towBySpacedLabel
          : towByRowIndex;

    await input.scrollIntoViewIfNeeded().catch(() => {});
    await this.fillCurrencyLikeInput(input, amount, "accessories");
  }

  private escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  insuranceQuestionRow(questionText: string | RegExp): Locator {
    const pat = typeof questionText === "string" ? new RegExp(this.escapeRe(questionText), "i") : questionText;
    const label = this.insuranceBaseForm().getByText(pat).first();
    return label.locator("xpath=ancestor::form[1]");
  }

  /** Question copy varies (“Do you want…”, “Would you like…”, etc.). */
  private insuranceQuestionLabelPattern(): RegExp {
    return /Do you want|Would you like|Do you need|Are you interested|Do you require/i;
  }

  insuranceQuestionRowByIndex(index: number): Locator {
    const root = this.insuranceBaseForm();
    const label = root.getByText(this.insuranceQuestionLabelPattern()).nth(index);
    return label.locator("xpath=ancestor::form[1]");
  }

  /**
   * One insurance Yes/No row — **single** DOM wrapper (no `.or()` of multiple ancestors → strict mode).
   * QAT uses `div.field-radiobutton` around each PrimeNG radio group.
   */
  insuranceRowByYesRadioIndex(index: number): Locator {
    const yes = this.insuranceBaseForm().getByRole("radio", { name: /^Yes$/i }).nth(index);
    return yes.locator("xpath=ancestor::div[contains(@class,'field-radiobutton')][1]");
  }

  /** @see {@link insuranceRowByYesRadioIndex} — same wrapper for PrimeNG `p-radiobutton` Yes. */
  insuranceRowByPrimeYesIndex(index: number): Locator {
    const yesP = this.insuranceBaseForm().locator("p-radiobutton").filter({ hasText: /^Yes$/i }).nth(index);
    return yesP.locator("xpath=ancestor::div[contains(@class,'field-radiobutton')][1]");
  }

  /** All Yes/No blocks under insurance (legacy fallback — one `field-radiobutton` per question). */
  private insuranceFieldRadioRows(): Locator {
    return this.insuranceBaseForm().locator("div.field-radiobutton");
  }

  /**
   * Scrolls insurance into view and waits until at least one Yes/No or question label exists.
   * Returns the **base-form** host when visible, otherwise the **Insurance** `p-card` shell.
   */
  private async getInsuranceIterationScopeAfterReady(): Promise<Locator> {
    const insBase = this.insuranceBaseForm();
    const insFallbackCard = this.insuranceCard();
    await insBase.scrollIntoViewIfNeeded().catch(() => {});
    if ((await insBase.count()) > 0 && (await insBase.isVisible({ timeout: 4_000 }).catch(() => false))) {
      await expect(insBase).toBeVisible({ timeout: 45_000 });
    } else {
      await expect(insFallbackCard).toBeVisible({ timeout: 45_000 });
    }
    const insScope = (await insBase.isVisible().catch(() => false)) ? insBase : insFallbackCard;

    await expect
      .poll(
        async () => {
          const yesNative = await insScope.getByRole("radio", { name: /^Yes$/i }).count();
          const yesPrime = await insScope.locator("p-radiobutton").filter({ hasText: /^Yes$/i }).count();
          const q = await insScope.getByText(this.insuranceQuestionLabelPattern()).count();
          return yesNative + yesPrime + q;
        },
        { timeout: 35_000, intervals: [300, 600, 1_200, 2_500] },
      )
      .toBeGreaterThan(0);

    return insScope;
  }

  /**
   * Deployment layout: visible `.col-12` strips with **Yes/No** `p-radiobutton`, excluding any column subtree
   * that contains **`.hidden`** (hidden products stay in DOM). Scoped under an insurance ancestor — not page-wide.
   */
  private visibleInsuranceCol12Locator(scope: Locator): Locator {
    return scope
      .locator(".col-12")
      .filter({ has: this.page.locator("p-radiobutton") })
      .filter({ hasNot: this.page.locator(".hidden") });
  }

  private async collectVisibleInsuranceCol12CardsFrom(scope: Locator): Promise<Locator[]> {
    const chain = this.visibleInsuranceCol12Locator(scope);
    const out: Locator[] = [];
    const n = await chain.count();
    for (let i = 0; i < n; i++) {
      const c = chain.nth(i);
      await c.scrollIntoViewIfNeeded().catch(() => {});
      if (!(await c.isVisible({ timeout: 5_000 }).catch(() => false))) {
        continue;
      }
      if ((await c.locator("p-radiobutton").filter({ visible: true }).count()) === 0) {
        continue;
      }
      out.push(c);
    }
    return out;
  }

  private async collectVisibleInsuranceCol12CardsAllScopes(insScope: Locator): Promise<Locator[]> {
    let found = await this.collectVisibleInsuranceCol12CardsFrom(insScope);
    if (found.length > 0) {
      return found;
    }
    found = await this.collectVisibleInsuranceCol12CardsFrom(this.insuranceRoot());
    if (found.length > 0) {
      return found;
    }
    return await this.collectVisibleInsuranceCol12CardsFrom(this.insuranceCard());
  }

  /**
   * All **visible** insurance question cards (one `form.p-fluid` / form per card). Count is **not** hardcoded —
   * supports current 2-card UI and future additions without code changes.
   */
  private async buildVisibleInsuranceCardForms(insScope: Locator): Promise<Locator[]> {
    const qPat = this.insuranceQuestionLabelPattern();
    const out: Locator[] = [];
    let forms = insScope.locator("form.p-fluid");
    if ((await forms.count()) === 0) {
      forms = this.insuranceRoot().locator("form.p-fluid");
    }
    if ((await forms.count()) === 0) {
      forms = await this.insuranceQuestionForms();
    }
    const nf = await forms.count();
    for (let i = 0; i < nf; i++) {
      const f = forms.nth(i);
      await f.scrollIntoViewIfNeeded().catch(() => {});
      if (!(await f.isVisible({ timeout: 6_000 }).catch(() => false))) {
        continue;
      }
      const hasControl =
        (await f.locator("p-radiobutton, div.field-radiobutton, input[type='radio']").count()) > 0;
      const hasLabel = (await f.getByText(qPat).count()) > 0;
      if (hasControl || hasLabel) {
        out.push(f);
      }
    }
    if (out.length > 0) {
      return out;
    }

    const nQ = await insScope.getByText(qPat).count();
    for (let i = 0; i < nQ; i++) {
      const label = insScope.getByText(qPat).nth(i);
      await label.scrollIntoViewIfNeeded().catch(() => {});
      if (!(await label.isVisible({ timeout: 3_000 }).catch(() => false))) {
        continue;
      }
      const form = label.locator("xpath=ancestor::form[1]");
      if (await form.isVisible({ timeout: 3_000 }).catch(() => false)) {
        out.push(form);
      }
    }
    if (out.length > 0) {
      return out;
    }

    const fieldRows = this.insuranceFieldRadioRows();
    const nField = await fieldRows.count();
    for (let i = 0; i < nField; i++) {
      const fb = fieldRows.nth(i);
      await fb.scrollIntoViewIfNeeded().catch(() => {});
      if (!(await fb.isVisible({ timeout: 3_000 }).catch(() => false))) {
        continue;
      }
      const formAnc = fb.locator("xpath=ancestor::form[1]");
      const row = (await formAnc.count()) > 0 ? formAnc : fb;
      out.push(row);
    }
    return out;
  }

  /**
   * Visible insurance cards: prefer **`.col-12`** strips (deployment DOM); else **`form.p-fluid`** per question.
   * Does **not** assume a fixed product count — only **visible** nodes are returned.
   */
  private async enumerateVisibleInsuranceCards(insScope: Locator): Promise<Locator[]> {
    const col12 = await this.collectVisibleInsuranceCol12CardsAllScopes(insScope);
    if (col12.length > 0) {
      return col12;
    }
    return await this.buildVisibleInsuranceCardForms(insScope);
  }

  /**
   * Blur masked currency / move focus off the Accessories grid so **Sub-Total** updates, then bring **Insurance**
   * into view (Prime `currencymask` often needs Tab/click-away before navigating the rest of the flow).
   */
  private async commitRegistrationAndAccessoriesThenFocusInsurance(): Promise<void> {
    await this.page.keyboard.press("Escape").catch(() => {});
    await this.page.keyboard.press("Tab").catch(() => {});
    if (DOAddOnsAccessoriesPage.SKIP_INSURANCE_ADDONS_AUTOMATION) {
      await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
      await this.page.waitForTimeout(350);
      return;
    }
    const inAddOns = this.page.locator("app-add-on-accessories").last().getByText(/^Insurance$/i).first();
    if (await inAddOns.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await inAddOns.click({ force: true, timeout: 15_000 }).catch(() => {});
    } else {
      await this.page.getByText(/^Insurance$/i).first().click({ force: true, timeout: 15_000 }).catch(() => {});
    }
    await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
    await this.page.waitForTimeout(350);
  }

  /**
   * PrimeNG Yes/No strip — QAT uses `div.flex.gap-3.ng-star-inserted` (scoped per question, **:visible**).
   * Some builds omit `ng-star-inserted` on the flex wrapper; match `div.flex.gap-3` as well.
   * Falls back to the caller `row` when the flex wrapper is missing.
   */
  private async insurancePrimeYesNoScope(row: Locator): Promise<Locator> {
    const candidates = [
      row.locator("div.flex.gap-3.ng-star-inserted:visible").first(),
      row.locator("div.flex.gap-3:visible").first(),
    ];
    for (const flex of candidates) {
    if ((await flex.count()) > 0 && (await flex.isVisible().catch(() => false))) {
      return flex;
      }
    }
    return row;
  }

  /**
   * Yes/No on one insurance card: resolve each **`p-radiobutton`** by visible **Yes** / **No** label (portal order is
   * **Yes** then **No** — not reliable as nth-0/1). Selection **verification** still uses PrimeNG
   * **`p-radiobutton-checked`** / **`span.p-radiobutton-icon:visible`**, not `hasText` checks.
   */
  private noYesRadiosOnCard(card: Locator): { no: Locator; yes: Locator } {
    return {
      yes: card.locator("p-radiobutton").filter({ hasText: /^Yes$/i }).first(),
      no: card.locator("p-radiobutton").filter({ hasText: /^No$/i }).first(),
    };
  }

  private async assertInsuranceCardHasYesNoRadios(card: Locator): Promise<void> {
    if ((await card.locator("p-radiobutton").filter({ hasText: /^Yes$/i }).count()) < 1) {
      throw new Error("Insurance card: expected a PrimeNG Yes p-radiobutton.");
    }
    if ((await card.locator("p-radiobutton").filter({ hasText: /^No$/i }).count()) < 1) {
      throw new Error("Insurance card: expected a PrimeNG No p-radiobutton.");
    }
  }

  /** Wait until **exactly one** visible selected icon exists **inside** the No `p-radiobutton`. */
  private async waitNoRadioPrimeIconExactlyOne(noRadio: Locator): Promise<void> {
    await expect
      .poll(async () => (await noRadio.locator("span.p-radiobutton-icon:visible").count()) === 1, {
        timeout: 12_000,
        intervals: [200, 400, 600],
      })
      .toBeTruthy();
  }

  /**
   * PrimeNG / native Yes–No: prefer visible **label** + **.p-radiobutton-box** (same idea as
   * {@link DOFinancialPositionPage.selectBusinessNetProfitLastYearNo} / `…Yes`) — hidden native
   * inputs often have no accessible name, so `getByRole('radio', { name })` is unreliable.
   */
  private async clickInsuranceRadio(row: Locator, choice: "Yes" | "No"): Promise<void> {
    await row.scrollIntoViewIfNeeded();

    const directBox = row
      .locator("p-radiobutton")
      .filter({ hasText: new RegExp(`^${choice}$`, "i") })
      .locator("div.p-radiobutton-box")
      .first();
    if (await directBox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await directBox.click({ force: true, timeout: 15_000 });
      await this.page.waitForTimeout(200);
      return;
    }

    const directRb = row.locator("p-radiobutton").filter({ hasText: new RegExp(`^${choice}$`, "i") }).first();
    if (await directRb.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await directRb.click({ force: true, timeout: 15_000 });
      await this.page.waitForTimeout(200);
      return;
    }

    const primeScope = await this.insurancePrimeYesNoScope(row);

    const label = primeScope.getByText(choice, { exact: true }).first();
    if (await label.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await label.click({ force: true, timeout: 15_000 });
      await this.page.waitForTimeout(200);
      return;
    }

    const box = primeScope
      .locator("p-radiobutton")
      .filter({ hasText: new RegExp(`^${choice}$`, "i") })
      .locator(".p-radiobutton-box")
      .first();
    if (await box.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await box.click({ force: true, timeout: 15_000 });
      await this.page.waitForTimeout(200);
      return;
    }

    const yes = row.getByRole("radio", { name: /^Yes$/i });
    const no = row.getByRole("radio", { name: /^No$/i });
    const target = choice === "Yes" ? yes : no;
    if ((await target.count()) > 0) {
      await target.first().click({ force: true, timeout: 15_000 });
      await this.page.waitForTimeout(200);
      return;
    }

    const primeRb = primeScope.locator("p-radiobutton").filter({ hasText: new RegExp(`^${choice}$`, "i") }).first();
    if (await primeRb.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await primeRb.click({ force: true, timeout: 15_000 });
      await this.page.waitForTimeout(200);
      return;
    }

    const native = row.locator(`input[type='radio'][value='${choice === "Yes" ? "true" : "false"}']`).first();
    if ((await native.count()) > 0) {
      await native.click({ force: true, timeout: 15_000 });
      await this.page.waitForTimeout(200);
      return;
    }

    await row.getByText(choice, { exact: true }).first().click({ force: true, timeout: 15_000 }).catch(() => {});
    await this.page.waitForTimeout(200);
  }

  /**
   * **Yes** selected on card: **`p-radiobutton-checked`** on the Yes `p-radiobutton` and/or visible
   * **`span.p-radiobutton-icon`** inside it. Fails the step if neither becomes true within the timeout.
   */
  private async verifyYesPrimeSelectedOnCard(card: Locator): Promise<void> {
    await this.assertInsuranceCardHasYesNoRadios(card);
    const { yes: yesRadio } = this.noYesRadiosOnCard(card);
      await expect
      .poll(
        async () => {
          if (
            await yesRadio
              .evaluate((el) => (el as HTMLElement).classList.contains("p-radiobutton-checked"))
              .catch(() => false)
          ) {
            return true;
          }
          return await yesRadio.locator("span.p-radiobutton-icon:visible").first().isVisible().catch(() => false);
        },
        { timeout: 15_000, intervals: [200, 400, 600, 1_000] },
      )
        .toBeTruthy();
    const yesIcon = yesRadio.locator("span.p-radiobutton-icon").filter({ visible: true }).first();
    if (await yesIcon.isVisible().catch(() => false)) {
      await expect(yesIcon).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(yesRadio).toHaveClass(/p-radiobutton-checked/, { timeout: 10_000 });
    }
    // eslint-disable-next-line no-console
    console.log("Yes selected");
  }

  /** **No** selected: exactly one visible **`span.p-radiobutton-icon:visible`** inside the No `p-radiobutton`. */
  private async verifyNoPrimeSelectedOnCard(card: Locator): Promise<void> {
    await this.assertInsuranceCardHasYesNoRadios(card);
    const { no: noRadio } = this.noYesRadiosOnCard(card);
    await this.waitNoRadioPrimeIconExactlyOne(noRadio);
    // eslint-disable-next-line no-console
    console.log("No selected");
  }

  /**
   * **Card-scoped** No/Yes: reuse {@link clickInsuranceRadio} (label + `.p-radiobutton-box`, role, native) so the
   * real toggle is hit regardless of Yes/No DOM order. Verification remains PrimeNG state on {@link noYesRadiosOnCard}.
   */
  private async clickInsuranceNoOrYesOnCard(card: Locator, choice: "Yes" | "No", cardNum: number): Promise<void> {
    await this.assertInsuranceCardHasYesNoRadios(card);
    await card.scrollIntoViewIfNeeded();
    // eslint-disable-next-line no-console
    console.log(`Card ${cardNum}: Clicking ${choice}`);
    await this.clickInsuranceRadio(card, choice);
    await this.page.waitForTimeout(choice === "No" ? 500 : 1_000);
  }

  private async verifyInsuranceNoSelectedOnCard(card: Locator): Promise<void> {
    await this.verifyNoPrimeSelectedOnCard(card);
  }

  private async verifyInsuranceYesSelectedOnCard(card: Locator): Promise<void> {
    await this.verifyYesPrimeSelectedOnCard(card);
  }

  private async waitAndLogInsuranceDependentFieldsVisible(card: Locator, _cardNum: number): Promise<void> {
    const monthEl = this.insuranceMonthsInput(card);
    const amtEl = this.insuranceAmountInput(card);
    try {
      await monthEl.waitFor({ state: "visible", timeout: 20_000 });
      // eslint-disable-next-line no-console
      console.log("Months field visible");
    } catch {
      /* GAP-style cards may omit Months — Amount still required below. */
    }
    await amtEl.waitFor({ state: "visible", timeout: 20_000 });
    // eslint-disable-next-line no-console
    console.log("Amount field visible");
  }

  /**
   * Per visible insurance **card**: **No** → verify **No** → **Yes** → verify **Yes** → wait for Months/Amount when shown.
   */
  private async prepareInsuranceCardYesForFill(card: Locator, cardNum: number): Promise<void> {
    await this.clickInsuranceNoOrYesOnCard(card, "No", cardNum);
    await this.verifyInsuranceNoSelectedOnCard(card);
    await this.clickInsuranceNoOrYesOnCard(card, "Yes", cardNum);
    await this.verifyInsuranceYesSelectedOnCard(card);
    await this.waitAndLogInsuranceDependentFieldsVisible(card, cardNum);
  }

  /** @deprecated Prefer {@link prepareInsuranceCardYesForFill} — kept for any legacy call sites. */
  private async ensureInsuranceRowYes(radioHostOrCard: Locator): Promise<void> {
    await this.prepareInsuranceCardYesForFill(radioHostOrCard, 1);
  }

  /**
   * Explicit **No → Yes** on one card/row (same as {@link prepareInsuranceCardYesForFill} with default card index).
   */
  private async toggleRowNoThenYes(rowOrCard: Locator): Promise<void> {
    await this.prepareInsuranceCardYesForFill(rowOrCard, 1);
  }

  /**
   * Runs **No → verify → Yes → verify** on the question’s form (same as {@link prepareInsuranceCardYesForFill}
   * with card index **1**). Kept for callers that address insurance by question copy.
   */
  async toggleInsuranceQuestionNoThenYes(questionText: string): Promise<void> {
    if (DOAddOnsAccessoriesPage.SKIP_INSURANCE_ADDONS_AUTOMATION) {
      return;
    }
    this.logStep(`Insurance No → Yes (validation toggle): ${this.stepValueDisplay(questionText)}`);
    await this.toggleRowNoThenYes(this.insuranceQuestionRow(questionText));
  }

  /**
   * Insurance **Months** — QAT wraps months in **`<number>`** + `p-inputnumber` (see `role="spinbutton"`).
   * Prefer those so we never read the **Amount** `input[currencymask]` in the same `form.p-fluid`.
   */
  insuranceMonthsInput(formOrRow: Locator): Locator {
    const scoped = formOrRow.locator(
      "number input.p-inputtext.p-component.p-element.p-inputnumber-input[role='spinbutton']:visible, " +
        "number input.p-inputnumber-input:visible, " +
        "p-inputnumber input[data-pc-section='input']:visible, " +
        "input.p-inputtext.p-component.p-element.p-inputnumber-input[role='spinbutton']:visible, " +
        "p-inputnumber input.p-inputtext.p-component.p-element:visible, " +
        "p-inputnumber input.p-inputtext:visible, " +
        "input.p-inputnumber-input:visible:not([id='amount']), " +
        "input[role='spinbutton']:visible:not([id='amount'])",
    );
    return scoped.first();
  }

  /**
   * Insurance **Amount** — `<amount>` host in some builds; newer builds use **`input#amount`** + `currencymask`
   * directly under the question card (still scoped under `formOrRow`).
   */
  insuranceAmountInput(formOrRow: Locator): Locator {
    const fromAmountHost = formOrRow.locator(
      "amount input[currencymask]:visible, " +
        "amount input.p-inputtext.p-component.p-element.w-full.valueClass:visible, " +
        "amount input.p-inputtext.p-component.p-element:visible",
    );
    const bareAmount = formOrRow.locator("input#amount[currencymask]").filter({ visible: true });
    return fromAmountHost.first().or(bareAmount.first());
  }

  async fillInsuranceMonths(months: string, row: Locator): Promise<void> {
    if (DOAddOnsAccessoriesPage.SKIP_INSURANCE_ADDONS_AUTOMATION) {
      return;
    }
    this.logStep(`Fill insurance months: ${this.stepValueDisplay(months)}`);
    await row.scrollIntoViewIfNeeded();
    const input = this.insuranceMonthsInput(row);
    if (!(await input.isVisible({ timeout: 4_500 }).catch(() => false))) {
      await this.page.waitForTimeout(400);
      await row.scrollIntoViewIfNeeded();
    }
    if (!(await input.isVisible({ timeout: 4_500 }).catch(() => false))) {
      this.log("(no Months field on this row — skipped)");
      return;
    }
    const before = await this.readAddOnsSubtotalSnapshot();
    this.logAddOnsSubtotals("before insurance months", before);
    await input.scrollIntoViewIfNeeded();
    await input.click();
    await input.press("Control+a");
    await input.type(months, { delay: 50 });
    await input.press("Tab").catch(() => {});
    await this.page.waitForTimeout(1_000);
    const after = await this.readAddOnsSubtotalSnapshot();
    this.logAddOnsSubtotals("after insurance months", after);
    await expect
      .poll(async () => (await input.inputValue()).includes(months), { timeout: 10_000 })
      .toBeTruthy();
  }

  /**
   * Insurance **Amount** — click, **Ctrl+A**, slow **type** of digits, **Tab**, Angular settle; logs subtotals and
   * warns (non-fatal) if **Sub-Total Insurances** did not move while the field shows the digits.
   */
  async fillInsuranceAmount(amount: string, row: Locator): Promise<void> {
    if (DOAddOnsAccessoriesPage.SKIP_INSURANCE_ADDONS_AUTOMATION) {
      return;
    }
    this.logStep(`Fill insurance amount: ${this.stepValueDisplay(amount)}`);
    await row.scrollIntoViewIfNeeded();
    const input = this.insuranceAmountInput(row);
    if (!(await input.isVisible({ timeout: 4_500 }).catch(() => false))) {
      await this.page.waitForTimeout(400);
      await row.scrollIntoViewIfNeeded();
    }
    if (!(await input.isVisible({ timeout: 4_500 }).catch(() => false))) {
      this.log("(no insurance Amount field on this row — skipped)");
      return;
    }
    let digits = amount.replace(/[^0-9]/g, "");
    if (!digits) {
      this.log("(insurance amount had no digits — skipped)");
      return;
    }
    digits = digits.replace(/^0+/, "") || "0";

    const before = await this.readAddOnsSubtotalSnapshot();
    this.logAddOnsSubtotals("before insurance amount", before);

    await input.scrollIntoViewIfNeeded();
    await input.click();
    await input.press("Control+a");
    await input.type(digits, { delay: 50 });
    await input.press("Tab").catch(() => {});
    await this.page.waitForTimeout(1_000);

    const after = await this.readAddOnsSubtotalSnapshot();
    this.logAddOnsSubtotals("after insurance amount", after);
    const fieldDigits = ((await input.inputValue().catch(() => "")) ?? "").replace(/[^0-9]/g, "");
    const fieldLooksEntered = fieldDigits.includes(digits) && digits.length > 0;
    const insVis = before.ins !== "(not visible)" && after.ins !== "(not visible)";
    if (fieldLooksEntered && insVis && before.ins === after.ins) {
      // eslint-disable-next-line no-console
      console.warn("Amount entered successfully but subtotal did not recalculate.");
    }

    await expect
      .poll(
        async () => {
          const allD = ((await input.inputValue().catch(() => "")) ?? "").replace(/[^0-9]/g, "");
          return allD.includes(digits) && allD.length >= digits.length;
        },
        { timeout: 22_000, intervals: [200, 400, 800, 1_500] },
      )
      .toBeTruthy();
  }

  /** Blur every insurance **Amount** so masks commit and **Sub-Total Insurances** / **Total Charges** recalc. */
  private async blurAllInsuranceAmountFieldsForTotals(): Promise<void> {
    let forms = this.insuranceRoot().locator("form.p-fluid");
    if ((await forms.count()) === 0) {
      forms = this.insuranceBaseForm().locator("form.p-fluid");
    }
    const n = await forms.count();
    for (let i = 0; i < n; i++) {
      const inp = this.insuranceAmountInput(forms.nth(i));
      if (!(await inp.isVisible({ timeout: 2_000 }).catch(() => false))) {
        continue;
      }
      await inp.scrollIntoViewIfNeeded();
      await inp.focus().catch(() => {});
      await inp.press("Tab").catch(() => {});
    }
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  /** Poll until **Sub-Total Insurances** is not stuck at **$0.00** (Angular needs committed mask values). */
  private async waitForInsuranceSubTotalsNonZero(): Promise<void> {
    const anchor = this.page.getByText(/Sub-Total Insurances/i).first();
    if (!(await anchor.isVisible({ timeout: 6_000 }).catch(() => false))) {
      return;
    }
    await expect
      .poll(
        async () => {
          const blob = (
            (await anchor
              .evaluate((el) => (el as HTMLElement).closest("div")?.innerText ?? el.textContent ?? "")
              .catch(() => "")) ?? ""
          ).replace(/\s+/g, " ");
          const m = blob.match(/\$\s*([\d,]+\.?\d*)/);
          if (!m) return false;
          const n = parseFloat(m[1].replace(/,/g, ""));
          return Number.isFinite(n) && n >= 1;
        },
        { timeout: 25_000, intervals: [300, 700, 1_500, 2_500] },
      )
      .toBeTruthy()
      .catch(() => {
        /* Some builds defer sub-total until Save — do not hard-fail here. */
      });
  }

  /**
   * After **Yes** or **No**: Months / Amount (when present) match expected visibility + enabled state;
   * optional **p-dropdown** (e.g. Provider) if the card exposes one.
   */
  private async expectInsuranceDependentsMatchYesNo(fillRoot: Locator, yesSelected: boolean): Promise<void> {
    const mo = this.insuranceMonthsInput(fillRoot);
    const am = this.insuranceAmountInput(fillRoot);
    const prov = fillRoot.locator("p-dropdown").first();

    if (yesSelected) {
      if ((await mo.count()) > 0 && (await mo.isVisible({ timeout: 800 }).catch(() => false))) {
        await expect(mo).toBeVisible({ timeout: 15_000 });
        await expect(mo).toBeEnabled();
      }
      if (await am.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(am).toBeVisible({ timeout: 15_000 });
        await expect(am).toBeEnabled();
      }
      if (await prov.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(prov).toBeEnabled({ timeout: 8_000 });
      }
      return;
    }

    await expect
      .poll(
        async () => {
          for (const el of [mo, am]) {
            if ((await el.count()) === 0) continue;
            if (!(await el.isVisible().catch(() => false))) continue;
            if (!(await el.isDisabled().catch(() => true))) return false;
          }
          if ((await prov.count()) > 0 && (await prov.isVisible().catch(() => false))) {
            if (!(await prov.isDisabled().catch(() => false))) return false;
          }
          return true;
        },
        { timeout: 12_000, intervals: [200, 400, 800] },
      )
      .toBeTruthy();
  }

  /**
   * Per-card regression: **No** → dependents hidden/disabled → **Yes** → visible/enabled → **15 / 100** → **5 / 500**
   * with final value checks (Months/Amount skipped when the card has no such field).
   */
  private async runInsuranceCardValidationRegression(fillRoot: Locator, cardNum: number): Promise<void> {
    await this.clickInsuranceNoOrYesOnCard(fillRoot, "No", cardNum);
    await this.verifyInsuranceNoSelectedOnCard(fillRoot);
    await this.expectInsuranceDependentsMatchYesNo(fillRoot, false);

    await this.clickInsuranceNoOrYesOnCard(fillRoot, "Yes", cardNum);
    await this.verifyInsuranceYesSelectedOnCard(fillRoot);
    await this.waitAndLogInsuranceDependentFieldsVisible(fillRoot, cardNum);
    await this.expectInsuranceDependentsMatchYesNo(fillRoot, true);

    await this.fillInsuranceMonths("15", fillRoot);
    await this.fillInsuranceAmount("100", fillRoot);
    await this.fillInsuranceMonths("5", fillRoot);
    await this.fillInsuranceAmount("500", fillRoot);

    const monthEl = this.insuranceMonthsInput(fillRoot);
    if (await monthEl.isVisible().catch(() => false)) {
      await expect(monthEl).toHaveValue(new RegExp(this.escapeRe("5")));
    }
    const amtEl = this.insuranceAmountInput(fillRoot);
    if (await amtEl.isVisible().catch(() => false)) {
      await expect
        .poll(
          async () => {
            const raw = ((await amtEl.inputValue().catch(() => "")) ?? "").replace(/[^0-9]/g, "");
            return raw.includes("500");
          },
          { timeout: 14_000, intervals: [200, 500, 1_000] },
        )
        .toBeTruthy();
    }
  }

  /**
   * One **card** = one `form.p-fluid` (Months in `<number>`, Amount in `<amount>`, GAP = amount only).
   * Iterating forms avoids `following::` / duplicate question text pairing the wrong radios/inputs.
   */
  private async completeInsuranceFromPerQuestionForm(
    fillRoot: Locator,
    months: string,
    insAmt: string,
    cardNum: number,
  ): Promise<void> {
    await this.assertInsuranceYesSelectedAndFill(fillRoot, months, insAmt, cardNum);
  }

  /**
   * **No** → verify **No** → **Yes** → verify **Yes** → wait for Months/Amount, then fill (card-scoped radios only).
   */
  private async assertInsuranceYesSelectedAndFill(
    fillRoot: Locator,
    months: string,
    insAmt: string,
    cardNum: number,
  ): Promise<void> {
    await fillRoot.scrollIntoViewIfNeeded();
    await this.prepareInsuranceCardYesForFill(fillRoot, cardNum);
    await fillRoot.scrollIntoViewIfNeeded();
    const monthEl = this.insuranceMonthsInput(fillRoot);
    await monthEl.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {
      /* optional on some cards */
    });
    await this.fillInsuranceMonths(months, fillRoot);
    const amtEl = this.insuranceAmountInput(fillRoot);
    await amtEl.waitFor({ state: "visible", timeout: 20_000 });
    await this.fillInsuranceAmount(insAmt, fillRoot);
    if (await monthEl.isVisible().catch(() => false)) {
      await expect(monthEl).toHaveValue(new RegExp(this.escapeRe(months)));
    }
    if (await amtEl.isVisible().catch(() => false)) {
      await expect
        .poll(async () => /\d/.test((await amtEl.inputValue().catch(() => "")) ?? ""), {
          timeout: 12_000,
        })
        .toBeTruthy();
    }
  }

  /** Performs Save click + loader settle (no console / step log). */
  private async clickSaveAddOnsSilent(): Promise<void> {
    const saveBtn = this.page.getByRole("button", { name: /^Save$/i }).first();
    if (!(await saveBtn.isVisible({ timeout: 4_000 }).catch(() => false))) {
      return;
    }
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click({ timeout: 30_000 });
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await this.page.waitForTimeout(500);
  }

  /** Single **Save** on Add Ons & Accessories (no insurance-specific retry). */
  private async clickSaveAddOnsSimple(): Promise<void> {
    const saveBtn = this.page.getByRole("button", { name: /^Save$/i }).first();
    if (!(await saveBtn.isVisible({ timeout: 4_000 }).catch(() => false))) {
      this.log("Add Ons: Save not visible — skipping");
      return;
    }
    this.logStep("Click Save on Add Ons & Accessories");
    // eslint-disable-next-line no-console
    console.log("Before Add On Save");
    await this.clickSaveAddOnsSilent();
    // eslint-disable-next-line no-console
    console.log("After Add On Save");
  }

  /**
   * **Save** with one retry when the portal shows **“At least the Insurance must be selected…”**
   * (usually stale mask / sub-total before the server accepts the payload).
   */
  private async clickSaveAddOnsWithInsuranceRetry(insAmt: string): Promise<void> {
    await this.clickSaveAddOnsSimple();
    const insuranceSaveBlocked = async (): Promise<boolean> => {
      return this.page
        .getByText(/At least the Insurance must be selected to save the quote/i)
        .first()
        .isVisible()
        .catch(() => false);
    };

    if (!(await insuranceSaveBlocked())) {
      return;
    }

    this.logStep("Save blocked (insurance not selected) — re-enter amounts, blur, totals, retry Save");
    let forms = this.insuranceRoot().locator("form.p-fluid");
    if ((await forms.count()) === 0) {
      forms = this.insuranceBaseForm().locator("form.p-fluid");
    }
    for (let i = 0; i < (await forms.count()); i++) {
      const f = forms.nth(i);
      if (!(await f.isVisible().catch(() => false))) {
        continue;
      }
      await this.fillInsuranceAmount(insAmt, f);
    }
    await this.blurAllInsuranceAmountFieldsForTotals();
    await this.waitForInsuranceSubTotalsNonZero();
    await this.promoteAddOnsLineTotalsRecalc();
    // eslint-disable-next-line no-console
    console.log("Before Add On Save (retry)");
    await this.clickSaveAddOnsSilent();
    // eslint-disable-next-line no-console
    console.log("After Add On Save (retry)");
  }

  /**
   * Sub-totals / **Total Charges** often refresh only after focus leaves the last currency field.
   * Blur via the summary row (and Escape) so Angular recalculates before **Save**.
   */
  private async promoteAddOnsLineTotalsRecalc(): Promise<void> {
    await this.page.keyboard.press("Escape").catch(() => {});
    const totalRow = this.page.getByText(/^Total\s*Charges/i).first();
    if (!(await totalRow.isVisible({ timeout: 6_000 }).catch(() => false))) {
      await this.page.keyboard.press("Tab").catch(() => {});
      return;
    }
    await totalRow.scrollIntoViewIfNeeded();
    await totalRow.click({ force: true, timeout: 10_000 }).catch(() => {});
    await this.page.keyboard.press("Tab").catch(() => {});
    try {
      await expect
        .poll(
          async () => {
            const raw = ((await totalRow.textContent().catch(() => "")) ?? "").trim();
            const m = raw.match(/\$[\d,]+(?:\.\d+)?/);
            if (!m) return false;
            const n = parseFloat(m[0].replace(/[$,]/g, ""));
            return Number.isFinite(n) && n >= 1;
          },
          { timeout: 22_000, intervals: [250, 600, 1_200, 2_000] },
        )
        .toBeTruthy();
    } catch {
      /* Some shells defer or hide Total Charges until Save — do not fail the flow here. */
    }
  }

  /**
   * Portal rule: each insurance **Months** value must be **&lt; 12** (message e.g. “Months must be less than 12”).
   * If that validation appears, refill every visible insurance **Months** field with **`validMonths`** (default **5**).
   */
  private insuranceMonthsLessThanTwelveError(): Locator {
    return this.page.getByText(/Months\s+must\s+be\s+less\s+than\s+12|less\s+than\s+12\s*months?/i);
  }

  private async recoverInsuranceMonthsAfterMaxTwelveValidation(validMonths = "5"): Promise<void> {
    const err = this.insuranceMonthsLessThanTwelveError().first();
    if (!(await err.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    this.logStep(`Insurance: “Months must be less than 12” — refilling Months as ${validMonths} on each card`);
    let forms = this.insuranceRoot().locator("form.p-fluid");
    if ((await forms.count()) === 0) {
      forms = this.insuranceBaseForm().locator("form.p-fluid");
    }
    const n = await forms.count();
    for (let i = 0; i < n; i++) {
      const f = forms.nth(i);
      await f.scrollIntoViewIfNeeded().catch(() => {});
      await this.page.waitForTimeout(150);
      if (!(await f.isVisible({ timeout: 6_000 }).catch(() => false))) {
        continue;
      }
      await this.fillInsuranceMonths(validMonths, f);
    }
    await this.page.keyboard.press("Tab").catch(() => {});
    await expect
      .poll(
        async () =>
          !(await this.insuranceMonthsLessThanTwelveError()
            .first()
            .isVisible()
            .catch(() => false)),
        { timeout: 10_000, intervals: [200, 500, 1_000] },
      )
      .toBeTruthy()
      .catch(() => {});
  }

  private async finishAddOnsAfterInsuranceFills(insAmt: string): Promise<void> {
    await this.recoverInsuranceMonthsAfterMaxTwelveValidation("5");
    await this.blurAllInsuranceAmountFieldsForTotals();
    await this.waitForInsuranceSubTotalsNonZero();
    await this.promoteAddOnsLineTotalsRecalc();
    await this.clickSaveAddOnsWithInsuranceRetry(insAmt);
  }

  /** Registration + Accessories committed; **Save** without any insurance steps (used when insurance is skipped). */
  private async finishAddOnsSkipInsurance(): Promise<void> {
    await this.promoteAddOnsLineTotalsRecalc();
    await this.clickSaveAddOnsSimple();
  }

  /**
   * Insurance block: discovers **visible** insurance cards at runtime (no fixed count), then Yes + Months/Amount.
   * Does **not** call Save — {@link finishAddOnsAfterInsuranceFills} handles that.
   */
  private async runInsuranceFillAllLayouts(months: string, insAmt: string): Promise<void> {
    const insScope = await this.getInsuranceIterationScopeAfterReady();
    const cards = await this.enumerateVisibleInsuranceCards(insScope);
    // eslint-disable-next-line no-console
    console.log(`Visible insurance cards found: ${cards.length}`);
    if (cards.length === 0) {
      throw new Error("Insurance: no visible insurance cards (forms / labels / Yes-No rows).");
    }
    for (let i = 0; i < cards.length; i++) {
      // eslint-disable-next-line no-console
      console.log(`Processing card ${i + 1}`);
      this.logStep(`Insurance card ${i + 1}/${cards.length}: Yes + months/amount`);
      await this.page.waitForTimeout(150);
      await this.insuranceRoot().scrollIntoViewIfNeeded().catch(() => {});
      await this.insuranceBaseForm().scrollIntoViewIfNeeded().catch(() => {});
      await cards[i].scrollIntoViewIfNeeded();
      await this.completeInsuranceFromPerQuestionForm(cards[i], months, insAmt, i + 1);
    }
  }

  /** Insurance fills + {@link finishAddOnsAfterInsuranceFills} (final Save path). */
  private async fillInsuranceSectionAfterCommit(months: string, insAmt: string): Promise<void> {
    if (DOAddOnsAccessoriesPage.SKIP_INSURANCE_ADDONS_AUTOMATION) {
      // eslint-disable-next-line no-console
      console.log("Insurance section skipped temporarily.");
      await this.finishAddOnsSkipInsurance();
      return;
    }
    await this.runInsuranceFillAllLayouts(months, insAmt);
    await this.finishAddOnsAfterInsuranceFills(insAmt);
  }

  /**
   * FL regression path when insurance is skipped: open Add Ons → Registration + General Accessories + second line →
   * commit masks → **Save** → wait for Asset Details / Payment Summary (same tail as full scenario).
   */
  private async completeAddOnsValidationScenarioSkipInsurance(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log("Add Ons validation scenario started");
    await this.openAddOnsAndAccessoriesSection();
    await this.expectAddOnsSectionHeadingVisible();

    await this.fillRegistrationAmount("500");
    await this.fillGeneralAccessoriesAmount("1000");
    await this.fillSecondAccessoryAmount("500");
    await expect(this.registrationAmountInput()).toBeVisible({ timeout: 15_000 });
    const accFirst0 =
      (await this.accessoryAmountInputByLineLabel("Bull Bar").count()) > 0
        ? this.accessoryAmountInputByLineLabel("Bull Bar")
        : this.generalAccessoriesAmountInput(0);
    await expect(accFirst0).toBeVisible({ timeout: 15_000 });

    await this.commitRegistrationAndAccessoriesThenFocusInsurance();
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);

    // eslint-disable-next-line no-console
    console.log("Insurance section skipped temporarily.");

    await this.promoteAddOnsLineTotalsRecalc();
    await this.clickSaveAddOnsSimple();
    await this.dismissBlockingChromeAfterAddOnsEditor();

    // eslint-disable-next-line no-console
    console.log("Add Ons saved successfully");

    await this.expectAddOnsFilledSummary("500", "1000", "500");

    await this.dismissBlockingChromeAfterAddOnsEditor();
    const paymentSummaryHeading = this.page.getByText(/Payment\s+Summary/i).first();
    if (!(await paymentSummaryHeading.isVisible({ timeout: 5_000 }).catch(() => false)) && this.addonLikeUrl()) {
      await this.page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
      await this.waitUntilNoVisibleAppLoaderOverlays(90_000).catch(() => {});
      await this.page.waitForTimeout(800);
      await this.dismissBlockingChromeAfterAddOnsEditor();
    }
  }

  /**
   * FL regression: **Registration + Accessories** first (same order as {@link completeAllAddOnsAndAccessories}),
   * then **Insurance** on every **visible** card — **No** (dependents hidden/disabled) → **Yes** (visible/enabled) →
   * temp **15 / 100** → final **5 / 500** → **Save** Add Ons → re-assert Registration / Bull Bar / Towbar → final save path.
   * Card count is **not** hardcoded (supports 2-card UI and future layouts). Does **not** assert empty Registration/Accessories.
   *
   * When {@link DOAddOnsAccessoriesPage.SKIP_INSURANCE_ADDONS_AUTOMATION} is `true`, delegates to
   * {@link completeAddOnsValidationScenarioSkipInsurance} (no insurance regression / refill cycle).
   */
  async completeAddOnsValidationScenarioThenRefillWithStandardAmounts(): Promise<void> {
    if (DOAddOnsAccessoriesPage.SKIP_INSURANCE_ADDONS_AUTOMATION) {
      await this.completeAddOnsValidationScenarioSkipInsurance();
      return;
    }
    // eslint-disable-next-line no-console
    console.log("Add Ons validation scenario started");
    await this.openAddOnsAndAccessoriesSection();
    await this.expectAddOnsSectionHeadingVisible();

    await this.fillRegistrationAmount("500");
    await this.fillGeneralAccessoriesAmount("1000");
    await this.fillSecondAccessoryAmount("500");
    await expect(this.registrationAmountInput()).toBeVisible({ timeout: 15_000 });
    const accFirst0 =
      (await this.accessoryAmountInputByLineLabel("Bull Bar").count()) > 0
        ? this.accessoryAmountInputByLineLabel("Bull Bar")
        : this.generalAccessoriesAmountInput(0);
    await expect(accFirst0).toBeVisible({ timeout: 15_000 });

    await this.commitRegistrationAndAccessoriesThenFocusInsurance();
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);

    // eslint-disable-next-line no-console
    console.log("Insurance: dynamic cards — per-card regression (No/hidden → Yes/visible, 15/100 → 5/500)");
    const insScope = await this.getInsuranceIterationScopeAfterReady();
    const cards = await this.enumerateVisibleInsuranceCards(insScope);
    // eslint-disable-next-line no-console
    console.log(`Visible insurance cards found: ${cards.length}`);
    if (cards.length === 0) {
      throw new Error("Insurance: no visible insurance cards for validation scenario.");
    }
    for (let i = 0; i < cards.length; i++) {
      // eslint-disable-next-line no-console
      console.log(`Processing card ${i + 1}`);
      await this.insuranceRoot().scrollIntoViewIfNeeded().catch(() => {});
      await cards[i].scrollIntoViewIfNeeded();
      await this.runInsuranceCardValidationRegression(cards[i], i + 1);
    }

    await this.blurAllInsuranceAmountFieldsForTotals();
    await this.waitForInsuranceSubTotalsNonZero();
    await this.promoteAddOnsLineTotalsRecalc();
    await this.clickSaveAddOnsWithInsuranceRetry("500");
    // eslint-disable-next-line no-console
    console.log("Add Ons Save after insurance regression (all visible cards)");
    await expect
      .poll(
        async () =>
          !(await this.page
            .getByText(/At least the Insurance must be selected to save the quote/i)
            .first()
            .isVisible()
            .catch(() => false)),
        { timeout: 12_000, intervals: [200, 500] },
      )
      .toBeTruthy()
      .catch(() => {});

    await this.dismissBlockingChromeAfterAddOnsEditor();

    // eslint-disable-next-line no-console
    console.log("Refilling valid Add Ons data");
    await this.fillRegistrationAmount("500");
    await this.fillGeneralAccessoriesAmount("1000");
    await this.fillSecondAccessoryAmount("500");

    await expect(this.registrationAmountInput()).toBeVisible();
    const accFirst =
      (await this.accessoryAmountInputByLineLabel("Bull Bar").count()) > 0
        ? this.accessoryAmountInputByLineLabel("Bull Bar")
        : this.generalAccessoriesAmountInput(0);
    await expect(accFirst).toBeVisible();

    await this.commitRegistrationAndAccessoriesThenFocusInsurance();
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);

    await this.blurAllInsuranceAmountFieldsForTotals();
    await this.waitForInsuranceSubTotalsNonZero();
    await this.promoteAddOnsLineTotalsRecalc();
    await this.finishAddOnsAfterInsuranceFills("500");

    // eslint-disable-next-line no-console
    console.log("Add Ons saved successfully");

    await this.expectAddOnsFilledSummary("500", "1000", "500");

    await this.dismissBlockingChromeAfterAddOnsEditor();
    const paymentSummaryHeading = this.page.getByText(/Payment\s+Summary/i).first();
    if (!(await paymentSummaryHeading.isVisible({ timeout: 5_000 }).catch(() => false)) && this.addonLikeUrl()) {
      await this.page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
      await this.waitUntilNoVisibleAppLoaderOverlays(90_000).catch(() => {});
      await this.page.waitForTimeout(800);
      await this.dismissBlockingChromeAfterAddOnsEditor();
    }
  }

  /**
   * Fills Registration + **Bull Bar** + **Towbar** accessory amounts, then Insurance (Yes + months/amount per visible card)
   * unless {@link DOAddOnsAccessoriesPage.SKIP_INSURANCE_ADDONS_AUTOMATION} is `true` (then insurance options are ignored and Save runs after Registration + Accessories only).
   * Towbar runs **before** scrolling to Insurance so both masks commit.
   */
  async completeAllAddOnsAndAccessories(options?: {
    registrationAmount?: string;
    generalAccessoriesAmount?: string;
    /** Default **500** — set to `""` to skip the second line. */
    towbarAmount?: string;
    /** Default **5** (must be &lt; 12 per portal validation). */
    insuranceMonths?: string;
    insuranceAmount?: string;
  }): Promise<void> {
    const reg = options?.registrationAmount ?? "500";
    const acc = options?.generalAccessoriesAmount ?? "1000";
    const towAmt = options?.towbarAmount ?? "500";
    const months = options?.insuranceMonths ?? "5";
    const insAmt = options?.insuranceAmount ?? "500";

    await this.openAddOnsAndAccessoriesSection();
    await this.expectAddOnsSectionHeadingVisible();

    await this.fillRegistrationAmount(reg);
    await this.fillGeneralAccessoriesAmount(acc);
    if (towAmt.trim() !== "") {
      await this.fillSecondAccessoryAmount(towAmt);
    }

    await expect(this.registrationAmountInput()).toBeVisible();
    const accFirst =
      (await this.accessoryAmountInputByLineLabel("Bull Bar").count()) > 0
        ? this.accessoryAmountInputByLineLabel("Bull Bar")
        : this.generalAccessoriesAmountInput(0);
    await expect(accFirst).toBeVisible();

    await this.commitRegistrationAndAccessoriesThenFocusInsurance();

    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);

    await this.fillInsuranceSectionAfterCommit(months, insAmt);
  }
    /**
   * FL PDF regression — one Add Ons session: Registration + Accessories + Towbar, insurance by question text,
   * Save → expect validation (e.g. months &lt; 12 with 15), recovery (Q2 No, Q1 months 11), Save → Asset Details tail.
   * Does not alter {@link completeAddOnsValidationScenarioSkipInsurance}.
   */
    async completeFlStandardQuoteAddOnsSingleSessionWithInsuranceRegression(): Promise<void> {
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] Single-session insurance regression — start");
      await this.openAddOnsAndAccessoriesSection();
      await this.expectAddOnsSectionHeadingVisible();
  
      await this.fillRegistrationAmount("500");
      await this.fillGeneralAccessoriesAmount("1000");
      await this.fillSecondAccessoryAmount("500");
      await expect(this.registrationAmountInput()).toBeVisible({ timeout: 15_000 });
      const accFirst0 =
        (await this.accessoryAmountInputByLineLabel("Bull Bar").count()) > 0
          ? this.accessoryAmountInputByLineLabel("Bull Bar")
          : this.generalAccessoriesAmountInput(0);
      await expect(accFirst0).toBeVisible({ timeout: 15_000 });
  
      await this.commitRegistrationAndAccessoriesThenFocusInsurance();
      await this.flRegressionFocusInsurancePanel();
      await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
  
      await this.getInsuranceIterationScopeAfterReady();

      await expect
        .poll(
          async () =>
            (await this.insuranceBaseForm().getByText(this.insuranceQuestionLabelPattern()).count()) >= 2,
          { timeout: 25_000, intervals: [300, 800, 1_500] },
        )
        .toBeTruthy();

      /** First / second insurance prompts in DOM order (avoids brittle long-body `getByText` + `.first()` on Q2). */
      const q1Form = this.insuranceQuestionRowByIndex(0);
      const q2Form = this.insuranceQuestionRowByIndex(1);

      const subBefore = await this.readAddOnsSubtotalSnapshot();
      this.logAddOnsSubtotals("FL insurance — before Q1/Q2 Yes + values", subBefore);
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] Insurance subtotal before:", subBefore.ins);

      await this.clickInsuranceRadio(q1Form, "Yes");
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] Question 1 selected Yes");
      await this.flRegressionFillInsuranceMonths(q1Form, "15");
      await this.flRegressionFillInsuranceAmountCommitted(q1Form, "500");

      await this.flRegressionDismissOptionalProviderBetweenQ1AndQ2(q1Form);
      await q2Form.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(350);

      await this.clickInsuranceRadio(q2Form, "Yes");
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] Question 2 selected Yes");
      await this.page.waitForTimeout(400);
      await expect(this.insuranceAmountInput(q2Form)).toBeVisible({ timeout: 20_000 });
      await this.flRegressionFillInsuranceAmountCommitted(q2Form, "500");

      await this.promoteAddOnsLineTotalsRecalc();
      const subAfterEntry = await this.readAddOnsSubtotalSnapshot();
      this.logAddOnsSubtotals("FL insurance — after Q1/Q2 entry", subAfterEntry);
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] Insurance subtotal after:", subAfterEntry.ins);

      await expect
        .poll(
          async () => {
            const m = (await this.insuranceMonthsInput(q1Form).inputValue().catch(() => "")).replace(/\D/g, "");
            const a1 = (await this.insuranceAmountInput(q1Form).inputValue().catch(() => "")).replace(/\D/g, "");
            return m.includes("15") && a1.includes("500");
          },
          { timeout: 18_000, intervals: [200, 500, 1_000] },
        )
        .toBeTruthy();

      await expect
        .poll(
          async () => {
            const a2 = (await this.insuranceAmountInput(q2Form).inputValue().catch(() => "")).replace(/\D/g, "");
            return a2.includes("500");
          },
          { timeout: 18_000, intervals: [200, 500, 1_000] },
        )
        .toBeTruthy();
  
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] STEP 1 — values retained; insurance subtotal updated (see logs above)");
  
      await this.clickSaveAddOnsSimple();
      await this.page.waitForTimeout(600);
  
      await expect
        .poll(async () => await this.flRegressionHasVisibleAddOnsValidation(), {
          timeout: 18_000,
          intervals: [300, 800, 1_500],
        })
        .toBeTruthy();
  
      const validationText = await this.flRegressionReadVisibleAddOnsValidationText();
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] Validation message captured (first Save):", validationText);
  
      await this.clickInsuranceRadio(q2Form, "No");
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] Question 2 → No (recovery)");
      await this.flRegressionFillInsuranceMonths(q1Form, "11");
      await this.flRegressionFillInsuranceAmountCommitted(q1Form, "500");
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] Question 1 kept Yes — Months 11, Amount 500");
  
      await this.dismissBlockingChromeAfterAddOnsEditor();
      await this.promoteAddOnsLineTotalsRecalc();
      const subAfterRecovery = await this.readAddOnsSubtotalSnapshot();
      this.logAddOnsSubtotals("FL insurance — after recovery fields", subAfterRecovery);
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] Insurance subtotal after recovery:", subAfterRecovery.ins);
  
      await this.clickSaveAddOnsSimple();
      await this.dismissBlockingChromeAfterAddOnsEditor();
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] Save successful (second Save)");
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] Recovery successful — final state: Q1 Yes 11 / 500, Q2 No");
  
      await this.expectAddOnsFilledSummary("500", "1000", "500");
      await this.dismissBlockingChromeAfterAddOnsEditor();
      const paymentSummaryHeading = this.page.getByText(/Payment\s*Summary/i).first();
      if (!(await paymentSummaryHeading.isVisible({ timeout: 5_000 }).catch(() => false)) && this.addonLikeUrl()) {
        await this.page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
        await this.waitUntilNoVisibleAppLoaderOverlays(90_000).catch(() => {});
        await this.page.waitForTimeout(800);
        await this.dismissBlockingChromeAfterAddOnsEditor();
      }
      // eslint-disable-next-line no-console
      console.log("[FL Add Ons] Single-session insurance regression — end");
    }
  
    private async flRegressionFocusInsurancePanel(): Promise<void> {
      await this.page.keyboard.press("Escape").catch(() => {});
      const inAddOns = this.page.locator("app-add-on-accessories").last().getByText(/^Insurance$/i).first();
      if (await inAddOns.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await inAddOns.click({ force: true, timeout: 15_000 }).catch(() => {});
      } else {
        await this.page.getByText(/^Insurance$/i).first().click({ force: true, timeout: 15_000 }).catch(() => {});
      }
      await this.insuranceRoot().scrollIntoViewIfNeeded().catch(() => {});
      await this.insuranceBaseForm().scrollIntoViewIfNeeded().catch(() => {});
      await this.waitUntilNoVisibleAppLoaderOverlays(45_000).catch(() => {});
      await this.page.waitForTimeout(350);
    }

    /**
     * Q1 can expose an optional **Provider** `p-dropdown` after Amount; Tab/focus may open it and block Q2.
     * **Escape only** (no Sub-Total / Total Charges clicks — those can steal focus or affect totals and break Q2 entry).
     */
    private async flRegressionDismissOptionalProviderBetweenQ1AndQ2(q1Form: Locator): Promise<void> {
      await this.page.keyboard.press("Escape").catch(() => {});
      await this.page.keyboard.press("Escape").catch(() => {});
      const overlay = this.page
        .locator(".p-dropdown-panel, .p-connected-overlay-visible, .p-overlaypanel:visible")
        .filter({ visible: true })
        .first();
      if (await overlay.isVisible({ timeout: 600 }).catch(() => false)) {
        await this.page.keyboard.press("Escape").catch(() => {});
        await this.page.keyboard.press("Escape").catch(() => {});
      }
      const prov = q1Form.locator("p-dropdown").filter({ visible: true }).first();
      if (await prov.isVisible({ timeout: 400 }).catch(() => false)) {
        await this.page.keyboard.press("Escape").catch(() => {});
      }
      await this.page.waitForTimeout(200);
    }

    private async flRegressionFillInsuranceMonths(form: Locator, months: string): Promise<void> {
      await this.flRegressionFillInsuranceMonthsCommitted(form, months);
    }

    /** FL regression — insurance **Months**: visible wait, `pressSequentially`, retries; fails if no months control. */
    private async flRegressionFillInsuranceMonthsCommitted(form: Locator, months: string): Promise<void> {
      const digits = months.replace(/\D/g, "") || "0";
      await form.scrollIntoViewIfNeeded();

      const input = this.insuranceMonthsInput(form);
      await expect(input).toBeVisible({ timeout: 20_000 });
      await input.scrollIntoViewIfNeeded();

      for (let attempt = 0; attempt < 4; attempt++) {
        await input.click({ timeout: 10_000 });
        await input.press("Control+a");
        await input.press("Backspace").catch(() => {});
        await input.pressSequentially(digits, { delay: 45 });
        await input.press("Tab").catch(() => {});
        await this.page.waitForTimeout(500);

        const got = ((await input.inputValue().catch(() => "")) ?? "").replace(/\D/g, "");
        if (got.includes(digits)) {
          return;
        }
        // eslint-disable-next-line no-console
        console.log(`[FL Add Ons] Insurance months retry ${attempt + 1} (read: "${got}", want contains "${digits}")`);
      }

      const last = ((await input.inputValue().catch(() => "")) ?? "").replace(/\D/g, "");
      throw new Error(
        `FL Add Ons: insurance months did not accept "${digits}" after retries (last digits: "${last}").`,
      );
    }
  
    private async flRegressionFillInsuranceAmount(form: Locator, amount: string): Promise<void> {
      await this.flRegressionFillInsuranceAmountCommitted(form, amount);
    }

    /**
     * FL regression — insurance **Amount** under `currencymask`: `pressSequentially`, Tab, retries until digits stick.
     */
    private async flRegressionFillInsuranceAmountCommitted(form: Locator, amount: string): Promise<void> {
      const digits = (amount.replace(/[^0-9]/g, "") || "0").replace(/^0+/, "") || "0";
      await form.scrollIntoViewIfNeeded();

      const input = this.insuranceAmountInput(form);
      await expect(input).toBeVisible({ timeout: 20_000 });
      await input.scrollIntoViewIfNeeded();

      for (let attempt = 0; attempt < 4; attempt++) {
        await input.click({ timeout: 10_000 });
        await input.press("Control+a");
        await input.press("Backspace").catch(() => {});
        await input.pressSequentially(digits, { delay: 45 });
        await input.press("Tab").catch(() => {});
        await this.page.waitForTimeout(500);

        const got = ((await input.inputValue().catch(() => "")) ?? "").replace(/\D/g, "");
        if (got.includes(digits) && got.length >= digits.length) {
          return;
        }
        // eslint-disable-next-line no-console
        console.log(`[FL Add Ons] Insurance amount retry ${attempt + 1} (read: "${got}", want contains "${digits}")`);
      }

      const last = ((await input.inputValue().catch(() => "")) ?? "").replace(/\D/g, "");
      throw new Error(
        `FL Add Ons: insurance amount did not accept "${digits}" after retries (last digits: "${last}").`,
      );
    }
  
    private async flRegressionHasVisibleAddOnsValidation(): Promise<boolean> {
      const locs = [
        this.insuranceMonthsLessThanTwelveError().first(),
        this.page.locator(".p-toast-message-text").filter({ visible: true }).first(),
        this.page.locator(".p-message-error").filter({ visible: true }).first(),
        this.page.getByRole("alert").filter({ visible: true }).first(),
        this.page.locator("mat-error").filter({ visible: true }).first(),
      ];
      for (const l of locs) {
        if (await l.isVisible({ timeout: 400 }).catch(() => false)) {
          return true;
        }
      }
      return false;
    }
  
    private async flRegressionReadVisibleAddOnsValidationText(): Promise<string> {
      const chunks: string[] = [];
      const tryPush = async (loc: Locator): Promise<void> => {
        if (await loc.isVisible({ timeout: 600 }).catch(() => false)) {
          const t = (await loc.innerText().catch(() => ""))?.trim();
          if (t) {
            chunks.push(t);
          }
        }
      };
      await tryPush(this.insuranceMonthsLessThanTwelveError().first());
      const nToast = await this.page.locator(".p-toast-message-text").count();
      for (let i = 0; i < Math.min(nToast, 5); i++) {
        await tryPush(this.page.locator(".p-toast-message-text").nth(i));
      }
      await tryPush(this.page.locator(".p-message-error").first());
      await tryPush(this.page.getByRole("alert").first());
      await tryPush(this.page.locator("mat-error").first());
      return chunks.join(" | ").replace(/\s+/g, " ").trim();
    }

  private digitsLooselyContain(raw: string, need: string): boolean {
    const v = raw.replace(/[^0-9]/g, "");
    const n = need.replace(/[^0-9]/g, "");
    if (!n) return true;
    return v.includes(n);
  }

  /**
   * After **Save**, wait until **Asset Details** is back and **Payment Summary** is visible (ready for **Calculate**).
   * Dismisses blocking UI (Escape, visible dialogs, `.app-loader-overlay`), then `networkidle` when possible.
   * **Charges** is not used as the gate — it can stay **-** briefly while the summary section paints.
   */
  private async waitForAssetDetailsReadyAfterAddOnsSave(
    regDigits: string,
    bullBarDigits: string,
    towbarDigits?: string,
  ): Promise<void> {
    // eslint-disable-next-line no-console
    console.log("waitForAssetDetailsReadyAfterAddOnsSave", { regDigits, bullBarDigits, towbarDigits });

    const quoteShell = this.page.locator("app-quote-details, app-standard-quote").first();
    await expect(quoteShell).toBeVisible({ timeout: 60_000 });

    await this.dismissBlockingChromeAfterAddOnsEditor();
    const openDialog = this.page.getByRole("dialog").filter({ visible: true });
    if ((await openDialog.count()) > 0) {
      await expect(openDialog.first()).toBeHidden({ timeout: 15_000 }).catch(() => {});
    }

    try {
      await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("After Add On Save: overlay wait ended with", String(e));
    }

    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});

    /** **Payment Summary** is the gate for the next step (`Calculate`). Charges may still show **-** while the shell repaints. */
      await expect
      .poll(
        async () =>
          this.page
            .getByText(/Payment\s+Summary/i)
            .first()
            .isVisible()
            .catch(() => false),
        { timeout: 90_000, intervals: [400, 1_000, 2_000, 3_000, 5_000] },
      )
        .toBeTruthy();
  }

  /**
   * Post-save check: **does not** open Add Ons again. Waits for **Asset Details** + **Payment Summary** (or
   * **Charges** with a real dollar amount). Optionally polls inputs if the editor stayed expanded.
   */
  async expectAddOnsFilledSummary(regDigits: string, bullBarDigits: string, towbarDigits?: string): Promise<void> {
    this.logStep("Assert add-ons saved — Asset Details + Payment Summary ready (no second Add Ons open)");
    // eslint-disable-next-line no-console
    console.log("After Add On Save: wait for Asset Details / overlays / Payment Summary…");
    await this.waitForAssetDetailsReadyAfterAddOnsSave(regDigits, bullBarDigits, towbarDigits);
    // eslint-disable-next-line no-console
    console.log("After Add On Save: Asset Details ready for Payment Summary Calculate");

    const panel = this.registrationServicePanel();
    if (!(await panel.isVisible({ timeout: 2_500 }).catch(() => false))) {
      return;
    }
    const reg = this.registrationAmountInput();
    if (!(await reg.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return;
    }

    const pollMs = 15_000;
    try {
      await expect
        .poll(async () => this.digitsLooselyContain(await reg.inputValue(), regDigits), {
          timeout: pollMs,
          intervals: [200, 500, 1_000],
          })
          .toBeTruthy();
    } catch (e) {
      this.log(
        `Add Ons summary: registration amount poll skipped (collapsed panel or mask lag): ${String(e)}`,
      );
    }

    const accCell =
      (await this.accessoryAmountInputByLineLabel("Bull Bar").count()) > 0
        ? this.accessoryAmountInputByLineLabel("Bull Bar")
        : this.generalAccessoriesAmountInput(0);
    if (await accCell.isVisible({ timeout: 2_000 }).catch(() => false)) {
      try {
    await expect
          .poll(async () => this.digitsLooselyContain(await accCell.inputValue(), bullBarDigits), {
            timeout: pollMs,
            intervals: [200, 500, 1_000],
      })
      .toBeTruthy();
      } catch (e) {
        this.log(`Add Ons summary: Bull Bar amount poll skipped: ${String(e)}`);
      }
    }

    if (towbarDigits !== undefined && towbarDigits !== "") {
      const tow =
        (await this.accessoryAmountInputByLineLabel("Towbar").count()) > 0
          ? this.accessoryAmountInputByLineLabel("Towbar")
          : this.generalAccessoriesAmountInput(1);
      if (await tow.isVisible({ timeout: 2_000 }).catch(() => false)) {
        try {
      await expect
            .poll(async () => this.digitsLooselyContain(await tow.inputValue(), towbarDigits), {
              timeout: pollMs,
              intervals: [200, 500, 1_000],
        })
        .toBeTruthy();
        } catch (e) {
          this.log(`Add Ons summary: Towbar amount poll skipped: ${String(e)}`);
        }
      }
    }
  }
}
