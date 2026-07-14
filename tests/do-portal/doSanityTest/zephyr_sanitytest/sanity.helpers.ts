/**
 * Shared helpers for Zephyr Sanity tests (UDP-T4677–UDP-T4730).
 * Scenario source: Sanity Test Cases.xlsx (/Sanity Automation).
 */

import { expect, type Locator, type Page } from "@playwright/test";
import {
  DOAddOnsAccessoriesPage,
  DOAddressDetailsPage,
  DOAssetDetailsPage,
  DOCustomerDetailsPage,
  DOCustomerQuotePostSubmitPage,
  DODashboardPage,
  DOEmploymentDetailsPage,
  DOFinancialPositionPage,
  DOQuickQuotePage,
} from "../../../../pages";
import { DOAddAssetPage } from "../../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import {
  CSA_SQ_PRODUCT,
  CSA_SQ_PROGRAM,
  TLC_DEALER,
  addMinimalUsedAsset,
  advanceAssetDetailsToCustomerDetails,
  fillMinimalAddressContinue,
  fillMinimalEmploymentContinue,
  fillMinimalFinancialContinue,
  fillValidIndividualPersonalBorrower,
  openDashboard,
  openPostSubmissionFromFreshQuote,
  openStandardQuoteFromDashboard,
  prepareCalculableCsaQuote,
  standardQuoteRoot,
} from "../../doRegressionTestSuite/workflow.helpers";
import {
  FL_SQ_PRODUCT,
  FL_SQ_PROGRAM,
} from "../../doRegressionTestSuite/fl.helpers";
import { DOPersonalDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import { DOReferenceDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/referenceDetails";

export const CSA_QQ_PRODUCT = CSA_SQ_PRODUCT;
/** CSAC Quick Quote program (matches `CSAcAssigned.test.ts` / Quick Quote CSA regression). */
export const CSA_QQ_PROGRAM = "CSA Personal - MV Dealer";

export {
  CSA_SQ_PRODUCT,
  CSA_SQ_PROGRAM,
  TLC_DEALER,
  FL_SQ_PRODUCT,
  FL_SQ_PROGRAM,
  standardQuoteRoot,
  openDashboard,
  openStandardQuoteFromDashboard,
  openPostSubmissionFromFreshQuote,
  prepareCalculableCsaQuote,
  addMinimalUsedAsset,
  fillValidIndividualPersonalBorrower,
  fillMinimalAddressContinue,
  fillMinimalEmploymentContinue,
  fillMinimalFinancialContinue,
};

let origRefCounter = 0;

/** Unique origination reference per test run (avoids grid collisions). */
export function uniqueOrigRef(prefix = "SAN"): string {
  origRefCounter += 1;
  return `${prefix}-${Date.now()}-${origRefCounter}`;
}

export async function selectCsaProductAndProgram(asset: DOAssetDetailsPage): Promise<void> {
  await asset.chooseProduct(CSA_SQ_PRODUCT);
  await asset.chooseProgram(CSA_SQ_PROGRAM);
}

export function promotionQuoteCheckbox(page: Page): Locator {
  const root = standardQuoteRoot(page);
  return root
    .locator("p-checkbox")
    .filter({
      has: root
        .locator("label.p-checkbox-label")
        .filter({ hasText: /Promotion\s+Quote/i }),
    })
    .first()
    .or(root.getByRole("checkbox", { name: /Promotion\s+Quote/i }).first());
}

export async function openSanityQuickQuote(page: Page): Promise<{
  dashboard: DODashboardPage;
  quickQuote: DOQuickQuotePage;
}> {
  const dashboard = await openDashboard(page);
  const quickQuote = new DOQuickQuotePage(page);
  await quickQuote.openQuickQuote();
  await expect(quickQuote.quickQuoteRoot).toBeVisible({ timeout: 90_000 });
  return { dashboard, quickQuote };
}

export async function selectCsaQuickQuoteProductAndProgram(quickQuote: DOQuickQuotePage): Promise<void> {
  await quickQuote.selectProduct(CSA_QQ_PRODUCT);
  await quickQuote.dismissQuickQuoteDropdownOverlays();
  if (await quickQuote.programDropdownTrigger.isEnabled().catch(() => false)) {
    await quickQuote.selectProgram(CSA_QQ_PROGRAM);
  }
  await quickQuote.dismissQuickQuoteDropdownOverlays();
}

/** CSAC Quick Quote — mandatory payment fields (aligned with `QuickQuote_CSA.test.ts`). */
export async function fillSanityCsaQuickQuote(quickQuote: DOQuickQuotePage): Promise<void> {
  await selectCsaQuickQuoteProductAndProgram(quickQuote);
  await quickQuote.selectFrequency("Monthly").catch(() => {});
  await quickQuote.enterInterestRatePercent("9");
  await quickQuote.enterTermsMonths("36");
  await quickQuote.enterCashPrice("$20,000");
  await quickQuote.enterDepositPercent("10%").catch(() => {});
  await quickQuote.enterBalloonPercent("0").catch(() => {});
  await expect
    .poll(
      async () => {
        const box = quickQuote.quickQuoteForm.locator(".p-checkbox-box").first();
        return box.evaluate((el) => !el.classList.contains("p-disabled"));
      },
      { timeout: 30_000 },
    )
    .toBe(true)
    .catch(() => {});
  await quickQuote.confirmTermsAndConditions().catch(() => {});
}

export async function openSanityCsaAssetDetails(
  page: Page,
  origRef?: string,
): Promise<{
  asset: DOAssetDetailsPage;
  addAsset: DOAddAssetPage;
  origRef: string;
}> {
  const ref = origRef ?? uniqueOrigRef("SQ");
  const asset = await openStandardQuoteFromDashboard(page);
  const addAsset = new DOAddAssetPage(page);
  await selectCsaProductAndProgram(asset);
  return { asset, addAsset, origRef: ref };
}

export async function openSanityCustomerDetailsStep(
  page: Page,
  origRef?: string,
): Promise<{
  asset: DOAssetDetailsPage;
  customer: DOCustomerDetailsPage;
  origRef: string;
}> {
  const ref = origRef ?? uniqueOrigRef("CD");
  const asset = await openStandardQuoteFromDashboard(page);
  const addAsset = new DOAddAssetPage(page);
  await selectCsaProductAndProgram(asset);
  await prepareCalculableCsaQuote(asset, addAsset, ref);
  await advanceAssetDetailsToCustomerDetails(asset, ref);
  return { asset, customer: new DOCustomerDetailsPage(page), origRef: ref };
}

export function assetInsuranceSummaryDialog(page: Page): Locator {
  return page
    .getByRole("dialog")
    .filter({ hasText: /Asset/i })
    .filter({ hasText: /Insurance|Summary/i })
    .last();
}

export async function addManualAssetViaSummary(
  asset: DOAssetDetailsPage,
  addAsset: DOAddAssetPage,
  value = "$20,000",
): Promise<void> {
  await asset.enterAsset("Car and Light Commercial /");
  await asset.selectCondition("Used");
  await asset.openAssetInsuranceTradeInSummary();
  await asset.clickAssetSummaryEditButton();
  await addAsset.enterAssetValue(value);
  await addAsset.selectCondition("Used");
  await addAsset.selectYear("2025");
  await addAsset.enterMake("Toyota");
  await addAsset.enterModel("Hilux");
  await addAsset.enterVariant("Top");
  await addAsset.enterRegoNO("TG08BP5123");
  await addAsset.enterVIN("1HGCM82633A004352");
  await addAsset.enterOdometer("50000");
  await addAsset.enterColour("Black");
  await addAsset.enterSerialNO("0999944477");
  await addAsset.enterEngineNO("1133445588");
  await addAsset.enterCCRating("5");
  await addAsset.chooseMotivePower("Petrol");
  await addAsset.chooseCountryRegistered("New Zealand");
  await addAsset.chooseAssetLocation("North Island");
  await addAsset.clickSummitButton();
  await addAsset.clickCrossButton();
}

export async function copyAssetFromSummary(page: Page, asset: DOAssetDetailsPage): Promise<void> {
  await asset.openAssetInsuranceTradeInSummary();
  const summaryDlg = assetInsuranceSummaryDialog(page);
  await expect(summaryDlg).toBeVisible({ timeout: 30_000 });
  const copyIcon = summaryDlg.locator("i.fa-clone.cursor-pointer, i.fa-clone, i.fa-regular.fa-clone").first();
  await expect(copyIcon).toBeVisible({ timeout: 20_000 });
  await copyIcon.click({ timeout: 15_000 });
  const addAsset = new DOAddAssetPage(page);
  await addAsset.makeInputField.first().waitFor({ state: "visible", timeout: 45_000 });
  await addAsset.clickSummitButton();
  await addAsset.clickCrossButton();
  await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
}

export async function removeLastAssetFromSummary(page: Page, asset: DOAssetDetailsPage): Promise<void> {
  await asset.openAssetInsuranceTradeInSummary();
  const summaryDlg = assetInsuranceSummaryDialog(page);
  await expect(summaryDlg).toBeVisible({ timeout: 30_000 });
  const rowsBefore = await summaryDlg.locator("tbody tr, .asset-row, tr").count();
  const trash = summaryDlg
    .locator("i.fa-trash, i.fa-trash-can, i.fa-light.fa-trash-can, .pi-trash")
    .last();
  await expect(trash).toBeVisible({ timeout: 15_000 });
  await trash.click({ timeout: 15_000 });
  await expect
    .poll(async () => summaryDlg.locator("tbody tr, .asset-row, tr").count(), { timeout: 20_000 })
    .toBeLessThan(rowsBefore);
  await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
}

export async function openAddOnsFromAssetDetails(asset: DOAssetDetailsPage): Promise<DOAddOnsAccessoriesPage> {
  await asset.clickAddonsAndAccessoriesAndExpectScreen();
  const addOns = new DOAddOnsAccessoriesPage(asset.page);
  return addOns;
}

export async function fillMinimalIndividualBorrowerThroughReference(
  page: Page,
  customer: DOCustomerDetailsPage,
): Promise<DOReferenceDetailsPage> {
  await customer.clickAddBorrowersOrGuarantors();
  await customer.searchCustomer.searchByUdcNumber("420");
  await customer.clickAddNewCustomerButton();
  const personal = new DOPersonalDetailsPage(page);
  await fillValidIndividualPersonalBorrower(personal);
  await personal.clickNextButton();
  const address = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, address);
  const emp = new DOEmploymentDetailsPage(page);
  await fillMinimalEmploymentContinue(emp);
  const fin = new DOFinancialPositionPage(page);
  await fillMinimalFinancialContinue(fin);
  const ref = new DOReferenceDetailsPage(page);
  await ref.waitForReferenceDetailsStep();
  return ref;
}

export async function advanceIndividualBorrowerToPostSubmission(
  page: Page,
  origRef?: string,
): Promise<DOCustomerQuotePostSubmitPage> {
  const { customer } = await openSanityCustomerDetailsStep(page, origRef);
  const ref = await fillMinimalIndividualBorrowerThroughReference(page, customer);
  await ref.clickAddContactDetails();
  await ref.selectContactType("Accountant");
  await ref.enterContactFirstName("Alex");
  await ref.enterContactLastName("Referee");
  await ref.clickAddContactInModal();
  await ref.confirmCustomerDetailsCorrect();
  await ref.advanceFromReferenceDetailsToPostSubmission();
  const post = new DOCustomerQuotePostSubmitPage(page);
  await post.waitForUploadStep();
  return post;
}

export async function waitForSearchCustomerDialog(page: Page): Promise<Locator> {
  const dlg = page.getByRole("dialog").filter({ hasText: /Search|Customer/i }).last();
  await expect(dlg).toBeVisible({ timeout: 30_000 });
  return dlg;
}

export function searchTypeRadioInput(dlg: Locator, value: "individual" | "business" | "trust"): Locator {
  return dlg.locator(`input[type="radio"][value="${value}"]`).first();
}
