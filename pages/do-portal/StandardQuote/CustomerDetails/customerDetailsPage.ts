import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../../common/BasePage";
import { DOSearchCustomerDialog } from "./searchCustomerDialog";

const ADD_BORROWER_LABEL = /Add\s+Borrowers?\s*(\/|&|and)\s*Guarantors?/i;

function buildAddBorrowersOrGuarantorsButton(page: Page): Locator {
  const quoteCustomerShell = page.locator("app-standard-quote, app-quote-details").first();
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
        .locator("button.p-button, button.p-element, p-button")
        .filter({ hasText: ADD_BORROWER_LABEL })
        .first(),
    )
    .or(page.locator("button, a").filter({ hasText: ADD_BORROWER_LABEL }).first())
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

  async waitForAddBorrowerButton(): Promise<void> {
    this.logStep("Wait for Add Borrowers / Guarantors on Customer Details");
    await this.waitUntilNoVisibleAppLoaderOverlays(45_000);
    await this.waitForCustomerDetailsStep();
    await expect
      .poll(
        async () => {
          const btn = await this.addBorrowersOrGuarantorsButton.isVisible().catch(() => false);
          const personal = await this.page
            .locator("app-personal-details")
            .isVisible()
            .catch(() => false);
          return btn || personal;
        },
        { timeout: 120_000 },
      )
      .toBe(true);
    if (await this.addBorrowersOrGuarantorsButton.isVisible().catch(() => false)) {
      await this.addBorrowersOrGuarantorsButton.scrollIntoViewIfNeeded();
    }
  }

  async clickAddBorrowersOrGuarantors(): Promise<void> {
    this.logStep("Click Add Borrowers / Guarantors");
    await this.addBorrowersOrGuarantorsButton.click();
    await this.searchCustomer.waitForVisible();
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
}
