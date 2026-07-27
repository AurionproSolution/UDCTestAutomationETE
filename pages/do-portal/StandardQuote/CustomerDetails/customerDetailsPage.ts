import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../../common/BasePage";
import { DOSearchCustomerDialog } from "./searchCustomerDialog";

const ADD_BORROWER_LABEL = /Add\s+Borrowers?\s*(\/|&|and)\s*Guarantors?/i;
/** FIS IA internal portal may show a shorter outlined **Add Borrowers** button. */
const ADD_BORROWER_SHORT_LABEL = /^\+?\s*Add\s+Borrowers?$/i;

function buildAddBorrowersOrGuarantorsButton(page: Page): Locator {
  const quoteCustomerShell = page.locator("app-standard-quote, app-quote-details").first();
  const borrowersSection = quoteCustomerShell.filter({
    has: quoteCustomerShell.getByText(/Borrowers?\s*(\/|&|and)\s*Guarantors?/i),
  });
  const addBorrowerClickableFromText = (root: Locator): Locator =>
    root
      .getByText(ADD_BORROWER_LABEL)
      .first()
      .locator("xpath=ancestor::button[1] | ancestor::a[1] | ancestor::p-button[1]");
  const addBorrowerLooseTextClickable = (root: Locator): Locator =>
    root
      .getByText("Add Borrowers / Guarantors", { exact: false })
      .first()
      .locator("xpath=ancestor::button[1] | ancestor::a[1] | ancestor::p-button[1]");

  return quoteCustomerShell
    .getByRole("button", { name: ADD_BORROWER_LABEL })
    .or(quoteCustomerShell.getByRole("link", { name: ADD_BORROWER_LABEL }))
    .or(page.getByRole("button", { name: ADD_BORROWER_LABEL }))
    .or(page.getByRole("link", { name: ADD_BORROWER_LABEL }))
    .or(page.locator(':text-is("Add Borrowers / Guarantors")'))
    .or(addBorrowerClickableFromText(quoteCustomerShell))
    .or(addBorrowerClickableFromText(page.locator("body")))
    .or(addBorrowerLooseTextClickable(quoteCustomerShell))
    .or(addBorrowerLooseTextClickable(page.locator("body")))
    .or(
      quoteCustomerShell
        .locator("button.p-button, button.p-element, p-button, gen-button")
        .filter({ hasText: ADD_BORROWER_LABEL })
        .first(),
    )
    .or(page.locator("button, a").filter({ hasText: ADD_BORROWER_LABEL }).first())
    .or(borrowersSection.getByRole("button", { name: ADD_BORROWER_LABEL }))
    .or(borrowersSection.getByRole("link", { name: ADD_BORROWER_LABEL }))
    .or(borrowersSection.locator("gen-button, p-button").filter({ hasText: ADD_BORROWER_LABEL }).locator("button"))
    .or(borrowersSection.locator("button.p-button-outlined, button.p-button").filter({ hasText: ADD_BORROWER_LABEL }))
    .or(borrowersSection.getByRole("button", { name: ADD_BORROWER_SHORT_LABEL }))
    .or(borrowersSection.locator("gen-button, p-button").filter({ hasText: ADD_BORROWER_SHORT_LABEL }).locator("button"))
    .or(quoteCustomerShell.getByRole("button", { name: ADD_BORROWER_SHORT_LABEL }))
    .or(quoteCustomerShell.locator("gen-button, p-button").filter({ hasText: ADD_BORROWER_SHORT_LABEL }).locator("button"))
    .or(page.getByRole("button", { name: ADD_BORROWER_SHORT_LABEL }))
    .first();
}

/**
 * Standard Quote wizard **Customer Details** step (step 2): borrowers & guarantors grid,
 * **Add Borrowers / Guarantors**, and composition with {@link DOSearchCustomerDialog}.
 */
export class DOCustomerDetailsPage extends BasePage {
  readonly addBorrowersOrGuarantorsButton: Locator;
  /** @deprecated use {@link addBorrowersOrGuarantorsButton} */
  readonly addBorrowerorGuarantorButton: Locator;
  readonly searchCustomer: DOSearchCustomerDialog;

  /** @deprecated use {@link searchCustomer.dialog} */
  get customerSearchDialog(): Locator {
    return this.searchCustomer.dialog;
  }

  /** @deprecated use {@link searchCustomer.searchByDropdown} */
  get searchByDropdown(): Locator {
    return this.searchCustomer.searchByDropdown;
  }

  /** @deprecated use {@link searchCustomer.searchButton} */
  get searchButton(): Locator {
    return this.searchCustomer.searchButton;
  }

  /** @deprecated use {@link searchCustomer.addNewCustomerButton} */
  get addNewCustomerButton(): Locator {
    return this.searchCustomer.addNewCustomerButton;
  }

  constructor(page: Page) {
    super(page);
    this.addBorrowersOrGuarantorsButton = buildAddBorrowersOrGuarantorsButton(page);
    this.addBorrowerorGuarantorButton = this.addBorrowersOrGuarantorsButton;
    this.searchCustomer = new DOSearchCustomerDialog(page);
  }

  private standardQuoteRoot(): Locator {
    return this.page.locator("app-quote-details, app-standard-quote").first();
  }

  private async waitUntilNoVisibleAppLoaderOverlays(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const overlays = this.page.locator(".app-loader-overlay");
      const count = await overlays.count();
      let anyVisible = false;
      for (let i = 0; i < count; i++) {
        if (await overlays.nth(i).isVisible().catch(() => false)) {
          anyVisible = true;
          break;
        }
      }
      if (!anyVisible) {
        return;
      }
      await this.page.waitForTimeout(200);
    }
  }

  async waitForCustomerDetailsStep(): Promise<void> {
    await this.standardQuoteRoot()
      .getByText(/Customer\s+Details/i)
      .first()
      .waitFor({ state: "visible", timeout: 90_000 })
      .catch(() => {});
  }

  private async openCustomerDetailsStepTabIfNeeded(): Promise<void> {
    if (await this.addBorrowersOrGuarantorsButton.isVisible({ timeout: 1_500 }).catch(() => false)) {
      return;
    }
    const root = this.standardQuoteRoot();
    const tab = root
      .getByRole("tab", { name: /Customer\s+Details/i })
      .or(root.getByRole("link", { name: /Customer\s+Details/i }))
      .or(root.locator("button, a, span, li").filter({ hasText: /^\d*\.?\s*Customer\s+Details$/i }))
      .first();
    if (await tab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await tab.scrollIntoViewIfNeeded().catch(() => {});
      await tab.click({ timeout: 15_000 }).catch(() => {});
      await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
    }
  }

  async waitForAddBorrowerButton(): Promise<void> {
    this.logStep("Wait for Add Borrowers / Guarantors on Customer Details");
    await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
    await this.waitForCustomerDetailsStep();
    await expect
      .poll(
        async () => {
          await this.openCustomerDetailsStepTabIfNeeded();
          const btn = await this.addBorrowersOrGuarantorsButton.isVisible().catch(() => false);
          const personal = await this.page
            .locator("app-personal-details")
            .isVisible()
            .catch(() => false);
          const borrowersGrid = await this.standardQuoteRoot()
            .getByText(/Borrowers?\s*(\/|&|and)\s*Guarantors?/i)
            .first()
            .isVisible()
            .catch(() => false);
          return btn || personal || borrowersGrid;
        },
        { timeout: 120_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(true);
    if (await this.addBorrowersOrGuarantorsButton.isVisible().catch(() => false)) {
      await this.addBorrowersOrGuarantorsButton.scrollIntoViewIfNeeded();
    }
  }

  async clickAddBorrowersOrGuarantors(): Promise<void> {
    this.logStep("Click Add Borrowers / Guarantors");
    await this.waitForAddBorrowerButton();
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);

    const trigger = this.addBorrowersOrGuarantorsButton;
    const innerButton = trigger.locator("button").first();

    for (let attempt = 0; attempt < 5; attempt++) {
      await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
      try {
        if (await innerButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await innerButton.scrollIntoViewIfNeeded();
          await innerButton.click({ timeout: 15_000 });
        } else {
          await trigger.scrollIntoViewIfNeeded();
          await trigger.click({ timeout: 15_000 });
        }
        await this.searchCustomer.waitForVisible(30_000);
        return;
      } catch (err) {
        if (attempt === 4) {
          throw err;
        }
        await this.page.waitForTimeout(500);
      }
    }
  }

  /** @deprecated use {@link clickAddBorrowersOrGuarantors} */
  async clickAddBorrowerorGuarantorButton(): Promise<void> {
    await this.clickAddBorrowersOrGuarantors();
  }

  /** Opens search dialog and runs UDC number lookup. */
  async searchExistingCustomerByUdc(customerNumber: string): Promise<void> {
    await this.clickAddBorrowersOrGuarantors();
    await this.searchCustomer.searchByUdcNumber(customerNumber);
  }

  // ---- Back-compat delegates to DOSearchCustomerDialog ----

  async searchByDropdownClick(): Promise<void> {
    await this.searchCustomer.openSearchByDropdown();
  }

  async selectUDCSelectOption(): Promise<void> {
    await this.searchCustomer.selectSearchByUdcCustomerNumber();
  }

  async enterUDCCustomerNumber(customerNumber: string): Promise<void> {
    await this.searchCustomer.enterUdcCustomerNumber(customerNumber);
  }

  async clickSearchButton(): Promise<void> {
    await this.searchCustomer.clickSearch();
  }

  async clickAddNewCustomerButton(): Promise<void> {
    await this.searchCustomer.clickAddNewCustomer();
  }

  /**
   * UDP-T4722 — after a customer is saved on the quote, re-search the same UDC and expect
   * FP/ID duplicate validation (**customer already exists**).
   */
  async expectDuplicateExistingCustomerBlockedByUdc(udcCustomerNumber: string): Promise<void> {
    this.logStep(`Expect duplicate existing customer blocked (${udcCustomerNumber})`);
    await this.clickAddBorrowersOrGuarantors();
    await this.searchCustomer.searchByUdcNumber(udcCustomerNumber);
    await this.searchCustomer.waitForBorrowerSearchResult(udcCustomerNumber);
    if (!(await this.searchCustomer.isCustomerAlreadyExistsValidationVisible(2_000))) {
      await this.searchCustomer.clickAddOnBorrowerSearchResult(udcCustomerNumber);
    }
    await this.searchCustomer.expectCustomerAlreadyExistsValidation();
  }

  /** UDP-T4718 — saved party is listed on Customer Details / Post Submission parties grid. */
  async expectSavedCustomerListed(
    namePattern: RegExp,
    rolePattern: RegExp = /Borrower/i,
  ): Promise<void> {
    this.logStep(`Expect saved customer listed (${namePattern.source})`);
    const row = this.customerPartyRow(namePattern);
    await expect(row).toBeVisible({ timeout: 90_000 });
    await expect(row).toContainText(rolePattern);
  }

  private customerPartyRow(namePattern: RegExp): Locator {
    const root = this.standardQuoteRoot();
    return root
      .locator("tr, [role='row'], .p-datatable-row, .p-datatable-tbody > tr, div, li, section")
      .filter({ hasText: namePattern })
      .first();
  }

  private customerPartiesScope(): Locator {
    const root = this.standardQuoteRoot();
    return root
      .locator('[role="grid"], .p-datatable-wrapper, .p-datatable, table')
      .filter({ visible: true })
      .first();
  }

  private signatoryPartyRow(namePattern: RegExp): Locator {
    const grid = this.customerPartiesScope();
    return grid
      .locator("tr, [role='row'], .p-datatable-row, .p-datatable-tbody > tr")
      .filter({ hasText: namePattern })
      .first()
      .or(this.customerPartyRow(namePattern));
  }

  /** Borrower Summary / parties grid on Standard Quote **Customer Details**. */
  async navigateToBorrowerSummary(): Promise<void> {
    this.logStep("Navigate to Borrower Summary");
    await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
    const root = this.standardQuoteRoot();
    const byRole = root
      .getByRole("button", { name: /^Borrower\s+Summary$/i })
      .or(root.getByRole("link", { name: /^Borrower\s+Summary$/i }))
      .or(root.getByRole("tab", { name: /^Borrower\s+Summary$/i }))
      .first();
    if (await byRole.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await byRole.click({ timeout: 15_000 });
      await this.page.waitForLoadState("domcontentloaded").catch(() => {});
      await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
      return;
    }
    const numbered = root
      .locator("button, a, span, li")
      .filter({ hasText: /\d+\.\s*Borrower\s+Summary/i })
      .first();
    if (await numbered.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await numbered.click({ timeout: 15_000 });
      await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
      return;
    }
    const customerStep = root
      .locator("button, a, span, li")
      .filter({ hasText: /Customer\s+Details/i })
      .first();
    if (await customerStep.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await customerStep.click({ timeout: 15_000 });
    }
    await this.waitForAddBorrowerButton();
  }

  /** UDP-T4710 — party row on Customer Details shows **Signatory** = Yes. */
  async expectPartySignatoryYes(namePattern: RegExp): Promise<void> {
    this.logStep(`Expect party signatory Yes (${namePattern.source})`);
    await this.navigateToBorrowerSummary();
    const row = this.signatoryPartyRow(namePattern);
    await expect(row).toBeVisible({ timeout: 60_000 });
    await expect(row).toContainText(/Signatory/i, { timeout: 15_000 });
    await expect(row).toContainText(/\bYes\b/i, { timeout: 15_000 });
  }

  /**
   * UDP-T4710 — **Signing Order** is visible on the party row and can be edited (spinbutton / input).
   * Persists the change when a **Save** control is shown on Customer Details.
   */
  async expectPartySigningOrderEditable(namePattern: RegExp, newOrder = "2"): Promise<string> {
    this.logStep(`Expect party signing order editable (${namePattern.source})`);
    await this.navigateToBorrowerSummary();
    const row = this.signatoryPartyRow(namePattern);
    await expect(row).toBeVisible({ timeout: 60_000 });
    await expect(row).toContainText(/Signing\s*Order/i, { timeout: 15_000 });

    const orderInput = row
      .getByRole("spinbutton")
      .first()
      .or(row.locator("input[type='number'], input.p-inputnumber-input").first());
    await expect(orderInput).toBeVisible({ timeout: 15_000 });
    await expect(orderInput).toBeEnabled({ timeout: 10_000 });
    await orderInput.scrollIntoViewIfNeeded();
    await orderInput.click({ timeout: 10_000 });
    await orderInput.fill(newOrder);
    await orderInput.press("Tab").catch(() => {});

    const saveBtn = this.standardQuoteRoot().getByRole("button", { name: /^Save$/i }).last();
    if (await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await saveBtn.click({ timeout: 15_000 });
      await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
    }

    await expect(orderInput).toHaveValue(newOrder, { timeout: 15_000 });
    return newOrder;
  }

  /**
   * UDP-T4718 — open a saved customer from the parties list (row **Edit**, pencil, or primary-name link).
   */
  async openSavedCustomerByName(namePattern: RegExp): Promise<void> {
    this.logStep(`Open saved customer (${namePattern.source})`);
    const root = this.standardQuoteRoot();
    const scopedRow = root
      .locator("tr, [role='row'], .p-datatable-row, .p-datatable-tbody > tr")
      .filter({ hasText: namePattern })
      .first();
    const editInRow = scopedRow
      .getByRole("button", { name: /^Edit$/i })
      .or(scopedRow.getByRole("link", { name: /^Edit$/i }))
      .or(scopedRow.locator("button, a").filter({ hasText: /^Edit$/i }))
      .first();
    if (await editInRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await editInRow.click({ timeout: 20_000 });
    } else {
      const pencil = scopedRow.locator("i.pi-pencil, .pi-pencil, [class*='pi-pencil']").first();
      if (await pencil.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await pencil.click({ timeout: 15_000 });
      } else {
        const nameLink = root
          .locator(
            "div.align-items-center.capitalize.cursor-pointer.ng-star-inserted a.cursor-pointer.text-primary, a.cursor-pointer.text-primary",
          )
          .filter({ hasText: namePattern })
          .first()
          .or(root.getByRole("link", { name: namePattern }).first());
        await expect(nameLink).toBeVisible({ timeout: 60_000 });
        await nameLink.click({ timeout: 60_000 });
      }
    }
    await expect(
      this.page
        .locator("app-personal-details, app-business-details, app-trust-detail")
        .or(this.page.getByText(/^1\.\s*Personal Details$/i))
        .first(),
    ).toBeVisible({ timeout: 90_000 });
  }
}
