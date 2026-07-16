import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../../common/BasePage";

/** Resolves the **Search Customer** modal (borrower / guarantor search). */
export function resolveSearchCustomerDialog(page: Page): Locator {
  return page
    .getByRole("dialog")
    .filter({ has: page.getByRole("button", { name: /^Search$/i }) })
    .last();
}

/**
 * **Search Customer** modal — Individual / Business / Trust search, UDC lookup,
 * results grid, and **Add New Customer**.
 */
export class DOSearchCustomerDialog extends BasePage {
  readonly dialog: Locator;
  readonly searchByDropdown: Locator;
  readonly searchButton: Locator;
  readonly addNewCustomerButton: Locator;

  constructor(page: Page) {
    super(page);
    this.dialog = resolveSearchCustomerDialog(page);
    this.searchByDropdown = this.dialog
      .getByRole("button", { name: "dropdown trigger" })
      .first();
    this.searchButton = this.dialog.getByRole("button", { name: /^Search$/i });
    this.addNewCustomerButton = this.dialog.getByRole("button", {
      name: /Add New Customer/i,
    });
  }

  searchTypeRadio(label: RegExp): Locator {
    return this.dialog.getByRole("radio", { name: label });
  }

  async waitForVisible(timeoutMs = 60_000): Promise<void> {
    await this.dialog.waitFor({ state: "visible", timeout: timeoutMs });
  }

  /** Opens the **Search By** dropdown (Customer Name, UDC Customer Number, etc.). */
  async openSearchByDropdown(): Promise<void> {
    this.logStep("Search By dropdown click");
    await this.waitForVisible();
    await this.searchByDropdown.waitFor({ state: "visible", timeout: 30_000 });
    await this.searchByDropdown.click();
  }

  /** @deprecated use {@link openSearchByDropdown} */
  async searchByDropdownClick(): Promise<void> {
    await this.openSearchByDropdown();
  }

  async selectSearchByOption(name: RegExp | string): Promise<void> {
    this.logStep(`Select Search By option: ${String(name)}`);
    const panel = this.dialog
      .locator(".p-dropdown-panel")
      .last()
      .or(this.page.locator(".p-dropdown-panel").filter({ visible: true }).last());
    const opt = panel
      .locator("li[role='option'], .p-dropdown-item")
      .filter({ hasText: name })
      .first()
      .or(panel.getByRole("option", { name }).first());

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await this.openSearchByDropdown();
      }
      if (!(await opt.isVisible({ timeout: 8_000 }).catch(() => false))) {
        continue;
      }
      await opt.click({ force: true, timeout: 15_000 });
      await this.page
        .locator(".p-dropdown-panel")
        .waitFor({ state: "hidden", timeout: 10_000 })
        .catch(() => {});
      return;
    }

    await opt.waitFor({ state: "visible", timeout: 30_000 });
    await opt.click({ force: true, timeout: 15_000 });
    await this.page
      .locator(".p-dropdown-panel")
      .waitFor({ state: "hidden", timeout: 15_000 })
      .catch(() => {});
  }

  async selectSearchByUdcCustomerNumber(): Promise<void> {
    await this.selectSearchByOption(/UDC Customer Number/i);
  }

  /** @deprecated use {@link selectSearchByUdcCustomerNumber} */
  async selectUDCSelectOption(): Promise<void> {
    await this.selectSearchByUdcCustomerNumber();
  }

  async enterUdcCustomerNumber(customerNumber: string): Promise<void> {
    this.logStep(`Entered UDC customer number as ${this.stepValueDisplay(customerNumber)}`);
    await this.waitForVisible();

    const namedTextboxes = this.dialog.getByRole("textbox", {
      name: /UDC|Customer number|Customer Number|search value|Enter customer/i,
    });
    const angularTextHost = this.dialog
      .locator("text")
      .filter({ hasText: /UDC Customer Number/ })
      .locator("#text");
    const labelFollowingInput = this.dialog.locator(
      "xpath=.//label[contains(normalize-space(.), 'UDC Customer Number') or contains(., 'Customer number')][1]/following::input[contains(@class,'p-inputtext') or contains(@class,'form-control')][1]",
    );

    const deadline = Date.now() + 35_000;
    while (Date.now() < deadline) {
      const n = await namedTextboxes.count();
      for (let i = 0; i < n; i++) {
        const el = namedTextboxes.nth(i);
        if (
          (await el.isVisible().catch(() => false)) &&
          (await el.isEnabled().catch(() => false))
        ) {
          await el.fill(customerNumber);
          return;
        }
      }

      const udcFromText = angularTextHost.last();
      if (
        (await udcFromText.count()) > 0 &&
        (await udcFromText.isVisible().catch(() => false)) &&
        (await udcFromText.isEnabled().catch(() => false))
      ) {
        await udcFromText.fill(customerNumber);
        return;
      }

      const fromLabel = labelFollowingInput.first();
      if (
        (await fromLabel.count()) > 0 &&
        (await fromLabel.isVisible().catch(() => false)) &&
        (await fromLabel.isEnabled().catch(() => false))
      ) {
        await fromLabel.fill(customerNumber);
        return;
      }

      const inputs = this.dialog.locator(
        "input.p-inputtext, input.form-control, input[type='search'], textarea.p-inputtextarea",
      );
      const total = await inputs.count();
      for (let i = 0; i < total; i++) {
        const inp = inputs.nth(i);
        if (
          (await inp.isVisible().catch(() => false)) &&
          (await inp.isEnabled().catch(() => false))
        ) {
          await inp.fill(customerNumber);
          return;
        }
      }

      await this.page.waitForTimeout(200);
    }

    throw new Error(
      "No visible, enabled UDC customer number field found in borrower search dialog after 35s.",
    );
  }

  /** @deprecated use {@link enterUdcCustomerNumber} */
  async enterUDCCustomerNumber(customerNumber: string): Promise<void> {
    await this.enterUdcCustomerNumber(customerNumber);
  }

  async clickSearch(): Promise<void> {
    this.logStep("Click Search button");
    await this.searchButton.waitFor({ state: "visible", timeout: 30_000 });
    await this.searchButton.click();
    await this.page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(() => {});
    await this.page
      .locator(".p-progress-spinner, .p-blockui, [class*='p-progress']")
      .first()
      .waitFor({ state: "hidden", timeout: 45_000 })
      .catch(() => {});
    await this.page.waitForTimeout(1200);
  }

  /** @deprecated use {@link clickSearch} */
  async clickSearchButton(): Promise<void> {
    await this.clickSearch();
  }

  /**
   * Search by **UDC Customer Number** (opens dialog search-by, fills number, clicks Search).
   * Caller must open the dialog first via {@link DOCustomerDetailsPage.clickAddBorrowersOrGuarantors}.
   */
  async searchByUdcNumber(customerNumber: string): Promise<void> {
    await this.openSearchByDropdown();
    await this.selectSearchByUdcCustomerNumber();
    await this.enterUdcCustomerNumber(customerNumber);
    await this.clickSearch();
  }

  /**
   * **Trust** search type — search by **Trust Name** with no expected match so **Add New Customer** enables.
   */
  async searchTrustByName(trustName: string): Promise<void> {
    this.logStep(`Search Trust By Name (${trustName})`);
    await this.waitForVisible();
    const trustNameField = this.dialog
      .locator("label")
      .filter({ hasText: /^Trust Name/i })
      .locator("xpath=following::input[contains(@class,'p-inputtext') or @type='text'][1]")
      .first()
      .or(this.dialog.getByRole("textbox").filter({ visible: true }).first());
    await trustNameField.waitFor({ state: "visible", timeout: 30_000 });
    await trustNameField.fill(trustName);
    await this.clickSearch();
  }

  /**
   * Set search type to **Individual** (first radio: Individual | Business | Trust).
   */
  async selectIndividualType(): Promise<void> {
    this.logStep("Select Individual search type");
    await this.waitForVisible();

    const byRole = this.dialog.getByRole("radio", { name: /^Individual$/i });
    if (await byRole.isVisible({ timeout: 4000 }).catch(() => false)) {
      await byRole.click({ timeout: 15_000, force: true });
      await this.page.waitForTimeout(300);
      return;
    }

    const box = this.dialog
      .locator("p-radiobutton")
      .filter({ hasText: /^Individual$/i })
      .locator(".p-radiobutton-box")
      .first();
    if (await box.isVisible({ timeout: 3000 }).catch(() => false)) {
      await box.click({ timeout: 15_000, force: true });
      await this.page.waitForTimeout(300);
      return;
    }

    await this.dialog
      .locator("xpath=.//p-radiobutton[1]//div[1]//div[1]")
      .click({ timeout: 15_000, force: true });
    await this.page.waitForTimeout(300);
  }

  /** @deprecated use {@link selectIndividualType} */
  async selectSearchCustomerIndividualType(): Promise<void> {
    await this.selectIndividualType();
  }

  /** Set search type to **Trust** (Individual | Business | Trust). */
  async selectTrustSearchType(): Promise<void> {
    this.logStep("Select Trust search type");
    await this.waitForVisible();

    const byRole = this.dialog.getByRole("radio", { name: /^Trust$/i });
    if (await byRole.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await byRole.click({ timeout: 15_000, force: true });
      await this.page.waitForTimeout(300);
      return;
    }

    const box = this.dialog
      .locator('p-radiobutton:has(input[value="trust"]) .p-radiobutton-box')
      .first();
    if (await box.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await box.click({ timeout: 15_000, force: true });
      await this.page.waitForTimeout(300);
      return;
    }

    throw new Error("Trust search type radio not found in Search Customer dialog.");
  }

  async enterTrustName(trustName: string): Promise<void> {
    this.logStep(`Entered trust search name as ${this.stepValueDisplay(trustName)}`);
    await this.waitForVisible();
    const trustTab = this.dialog.locator("app-trust-tab").first();
    await trustTab.waitFor({ state: "visible", timeout: 20_000 });

    const candidates: Locator[] = [
      trustTab.getByRole("textbox", { name: /Trust Name/i }),
      trustTab.locator("text").filter({ hasText: /^Trust Name/ }).locator("#text"),
      trustTab.locator(
        "xpath=.//label[contains(normalize-space(.),'Trust Name')]/following::input[contains(@class,'p-inputtext') or contains(@class,'form-control')][1]",
      ),
      this.dialog.getByRole("textbox", { name: /Trust Name/i }),
    ];

    const deadline = Date.now() + 35_000;
    while (Date.now() < deadline) {
      for (const loc of candidates) {
        const el = loc.first();
        if (
          (await el.isVisible().catch(() => false)) &&
          (await el.isEnabled().catch(() => false))
        ) {
          await el.fill(trustName);
          return;
        }
      }
      await this.page.waitForTimeout(200);
    }

    throw new Error(
      "No visible, enabled Trust Name field found in borrower search dialog after 35s.",
    );
  }

  /**
   * Search by **Trust Name** (select Trust type, fill name, click Search).
   * Caller must open the dialog first via {@link DOCustomerDetailsPage.clickAddBorrowersOrGuarantors}.
   */
  async searchByTrustName(trustName: string): Promise<void> {
    await this.selectTrustSearchType();
    await this.enterTrustName(trustName);
    await this.clickSearch();
  }

  private addNewCustomerButtonCandidates(): Locator[] {
    return [
      this.dialog.getByRole("button", { name: /Add New Customer/i }),
      this.page.getByRole("dialog").last().getByRole("button", { name: /Add New Customer/i }),
      this.page.getByRole("button", { name: /Add New Customer/i }),
    ];
  }

  async clickAddNewCustomer(): Promise<void> {
    this.logStep("Click Add New Customer button");
    const deadlineEnable = Date.now() + 90_000;
    let addBtn: Locator | null = null;

    while (Date.now() < deadlineEnable && !addBtn) {
      for (const candidate of this.addNewCustomerButtonCandidates()) {
        const first = candidate.first();
        if (!(await first.isVisible().catch(() => false))) continue;
        if (await first.isEnabled().catch(() => false)) {
          addBtn = first;
          break;
        }
      }
      if (!addBtn) await this.page.waitForTimeout(400);
    }

    if (!addBtn) {
      throw new Error(
        "Add New Customer was not visible and enabled within 90s. " +
          "Use a UDC number with no matches so this button enables after Search.",
      );
    }

    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click({ timeout: 30_000 });

    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
    await this.page.waitForTimeout(600);

    const markers: Locator[] = [
      this.page.locator('input[name="dateOfBirth"]'),
      this.page.getByRole("button", { name: /Choose Date/i }),
      this.page.getByRole("textbox", { name: /First Name/i }),
      this.page
        .locator("text")
        .filter({ hasText: /^First Name/ })
        .locator("#text"),
      this.page.locator(
        "//label[contains(normalize-space(.),'Title')]/following-sibling::div//div[@aria-label='dropdown trigger']",
      ),
      this.page.locator("app-personal-detail-email-contact"),
      this.page.getByRole("textbox", { name: /Phone number/i }),
      this.page.locator("app-business-details").first(),
      this.page.locator("app-trust-detail").first(),
      this.page.getByText(/^Trust Details$/i).first(),
      this.page.locator(
        "//span//label[contains(text(),'Title')]/following-sibling::div//span",
      ),
    ];

    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      for (const m of markers) {
        if (await m.first().isVisible().catch(() => false)) return;
      }
      await this.page.waitForTimeout(250);
    }

    throw new Error(
      "Customer details form did not open after Add New Customer (expected Personal, Business, or Trust details).",
    );
  }

  /** @deprecated use {@link clickAddNewCustomer} */
  async clickAddNewCustomerButton(): Promise<void> {
    await this.clickAddNewCustomer();
  }

  async expectIndividualSearchTypeChecked(): Promise<void> {
    const ind = this.searchTypeRadio(/Individual/i).first();
    await expect.soft(ind).toBeVisible({ timeout: 20_000 });
    await expect.soft(ind).toBeChecked();
  }

  /** UDC search navigates to **Borrower Result** cards (not the search dialog datatable). */
  async waitForBorrowerSearchResult(udcCustomerNumber: string): Promise<void> {
    this.logStep(`Wait for borrower search result (${udcCustomerNumber})`);
    await this.page
      .waitForURL(/borrower-search-result/i, { timeout: 90_000 })
      .catch(() => {});
    await expect(this.page.getByText(udcCustomerNumber, { exact: false }).first()).toBeVisible({
      timeout: 90_000,
    });
    await expect(this.page.getByText(/UDC Customer Number/i).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  private borrowerSearchResultCard(udcCustomerNumber: string): Locator {
    return this.page
      .locator("div, section, article")
      .filter({ hasText: udcCustomerNumber })
      .filter({ hasText: /UDC Customer Number/i })
      .last();
  }

  private borrowerSearchResultAddButton(udcCustomerNumber: string): Locator {
    const resultCard = this.borrowerSearchResultCard(udcCustomerNumber);
    return resultCard
      .getByRole("button", { name: /^Add$/i })
      .or(this.page.getByRole("button", { name: /^Add$/i }).first());
  }

  /** **Add** on the borrower search result card for `udcCustomerNumber`. */
  async clickAddOnBorrowerSearchResult(udcCustomerNumber: string): Promise<void> {
    this.logStep(`Click Add on borrower search result (${udcCustomerNumber})`);
    await this.waitForBorrowerSearchResult(udcCustomerNumber);
    await this.borrowerSearchResultAddButton(udcCustomerNumber).first().click({ timeout: 30_000 });
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
  }

  /** Search by UDC and **Add** the FIS party from borrower search results. */
  async addExistingCustomerFromUdcSearch(udcCustomerNumber: string): Promise<void> {
    await this.searchByUdcNumber(udcCustomerNumber);
    await this.clickAddOnBorrowerSearchResult(udcCustomerNumber);
  }

  private duplicateCustomerValidationPatterns(): RegExp[] {
    return [
      /customer already exists/i,
      /already exists on (the )?quote/i,
      /customer.{0,60}already added/i,
      /duplicate customer/i,
      /already added to (the )?quote/i,
      /already exists|duplicate|already added/i,
    ];
  }

  private duplicateCustomerValidationRoots(): Locator[] {
    return [
      this.page.locator(".p-toast, .p-toast-message, [role='alert'], .p-message, .p-inline-message"),
      this.dialog,
      this.page.locator("app-standard-quote, app-quote-details").first(),
      this.page.locator("body"),
    ];
  }

  /** Whether FP/ID duplicate-customer copy is visible (toast, dialog, or inline). */
  async isCustomerAlreadyExistsValidationVisible(timeoutMs = 3_000): Promise<boolean> {
    for (const root of this.duplicateCustomerValidationRoots()) {
      for (const pattern of this.duplicateCustomerValidationPatterns()) {
        const msg = root.getByText(pattern).first();
        if (await msg.isVisible({ timeout: timeoutMs }).catch(() => false)) {
          return true;
        }
      }
    }
    return false;
  }

  /** UDP-T4722 — duplicate party add is blocked with **customer already exists** (or equivalent). */
  async expectCustomerAlreadyExistsValidation(timeoutMs = 30_000): Promise<void> {
    this.logStep("Expect customer already exists validation");
    await expect
      .poll(async () => this.isCustomerAlreadyExistsValidationVisible(800), {
        timeout: timeoutMs,
        intervals: [300, 500, 1_000],
      })
      .toBe(true);
  }
}
