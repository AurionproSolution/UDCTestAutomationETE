/**
 * Finance Lease — **Business Asg** / **Finance Lease Business — MV Dealer** entry path for regression.
 *
 * Intentionally **separate** from CSA helpers in `CustomerDetails.test.ts` (no shared orig ref,
 * product/program, or dashboard product picker with CSA).
 */

import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../../config/env";
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { DODashboardPage } from "../../dashboard/DashboardPage";
import { DOAddAssetPage } from "../AssetDetails/AddAssetPage";
import { DOAssetDetailsPage } from "../AssetDetails/AssetDetailsPage";
import { DOAddressDetailsPage } from "./addressDetails";
import { DOBusinessDetailsPage } from "./businessDetails";
import { DOCustomerDetailsPage } from "./customerDetailsPage";
import { DOFinancialPositionPage } from "./financialPosition";

const FL_SQ_PRODUCT = "Finance Lease - Business Asg";
const FL_SQ_PROGRAM = "Finance Lease Business - MV Dealer";
const FL_CUSTOMER_DETAILS_ORIG_REF = "SQ-FL-CD-3783-Ref";
const TLC_DEALER = "Armstrong Prestige Wellington";

function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

/** FL-only minimal asset (mirrors CSA shape; not imported from CSA test helpers). */
async function addMinimalFlUsedAsset(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
): Promise<void> {
  await assetDetailsPage.enterAsset("Car and Light Commercial /");
  await assetDetailsPage.selectCondition("Used");
  await assetDetailsPage.openAssetInsuranceTradeInSummary();
  await assetDetailsPage.clickAssetSummaryEditButton();
  await addAssetPage.enterAssetValue("$20,000");
  await addAssetPage.selectCondition("Used");
  await addAssetPage.selectYear("2025");
  await addAssetPage.enterMake("Toyota");
  await addAssetPage.enterModel("Hilux");
  await addAssetPage.enterVariant("Top");
  await addAssetPage.clickSummitButton();
  await addAssetPage.clickCrossButton();
}

/** FL quote on **Add Borrower** (Finance Lease dialog → Business Asg → MV Dealer → asset → Calculate ×2 → Next). */
export async function openFinanceLeaseBusinessAsgToAddBorrowerStep(
  page: Page,
  opts?: { origRef?: string },
): Promise<DOCustomerDetailsPage> {
  const origRef = opts?.origRef ?? FL_CUSTOMER_DETAILS_ORIG_REF;
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  const customerDetailsPage = new DOCustomerDetailsPage(page);
  const addAssetPage = new DOAddAssetPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectFinanceLeaseProduct();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.chooseProduct(FL_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(FL_SQ_PROGRAM);
  await assetDetailsPage.enterOriginationReference(origRef);
  await addMinimalFlUsedAsset(assetDetailsPage, addAssetPage);
  await assetDetailsPage.termsOfFinance("36");
  await assetDetailsPage.interestRate("4");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.enterResidualValuePercentFinanceLease("20");
  await assetDetailsPage.interestRate("4");
  await assetDetailsPage.enterOriginationReference(origRef);
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.enterOriginationReference(origRef);
  await assetDetailsPage.clickNextButton();
  await customerDetailsPage.waitForAddBorrowerButton();
  return customerDetailsPage;
}

async function openAddNewBusinessBorrower(
  customerDetailsPage: DOCustomerDetailsPage,
): Promise<DOBusinessDetailsPage> {
  await customerDetailsPage.clickAddBorrowersOrGuarantors();
  await customerDetailsPage.searchCustomer.searchByUdcNumber("420");
  await customerDetailsPage.clickAddNewCustomerButton();
  return new DOBusinessDetailsPage(customerDetailsPage.page);
}

async function navigateFlBusinessBorrowerToFinancialPosition(
  page: Page,
  businessDetailsPage: DOBusinessDetailsPage,
): Promise<DOFinancialPositionPage> {
  await businessDetailsPage.waitForBusinessDetailsStep();
  await businessDetailsPage.selectOrganisationType("Incorporated Body");
  await businessDetailsPage.enterLegalName("Test Legal Entity Ltd");
  await businessDetailsPage.enterTradingName("Test Trading");
  await businessDetailsPage.enterRegisteredCompanyNumber("1234567");
  await businessDetailsPage.enterNzBusinessNumber("9429031234567");
  await businessDetailsPage.enterGstNumber("12345678");
  await businessDetailsPage.fillBusinessDescription("Automation — UDP-T3783 profit declaration.");
  await businessDetailsPage.selectPrimaryNatureOfBusiness("0113 Vegetable Growing");
  await businessDetailsPage.selectSourceOfWealth("Business Activity");
  await businessDetailsPage.enterTimeInBusiness("5", "3");
  await businessDetailsPage.enterBusinessAreaCode("9");
  await businessDetailsPage.enterBusinessPhoneNumber("0211234567");
  await businessDetailsPage.enterBusinessEmail("liza.doe@example.com");
  await businessDetailsPage.clickNextButton();

  const addressDetailsPage = new DOAddressDetailsPage(page);
  await addressDetailsPage.waitForPhysicalAddressStep();
  await addressDetailsPage.timeAtAddress("1", "1");
  await addressDetailsPage.enterStreetNumber("123");
  await addressDetailsPage.enterStreetName("Main Street");
  await addressDetailsPage.enterCity("Wellington");
  await addressDetailsPage.chooseCountry("New Zealand");
  await addressDetailsPage.clickReuseForPostalAddressToggle();
  await page.waitForTimeout(400);
  await addressDetailsPage.ensureReuseForRegisterAddressYes();
  await addressDetailsPage.ensureOverseasAddressNoIfPreviousPhysicalVisible();
  await addressDetailsPage.fillPreviousPhysicalRequiredIfPresent({
    years: "1",
    months: "1",
    streetNumber: "45",
    streetName: "Queen Street",
    city: "Wellington",
    country: "New Zealand",
  });
  await addressDetailsPage.clickNextButton();

  const fin = new DOFinancialPositionPage(page);
  await fin.waitForFinancialPositionStep();
  return fin;
}

/** FL Business Asg → new business borrower → Financial Position (UDP-T3783, UDP-T3784, …). */
export async function openFlBusinessStandardQuoteAndReachFinancialPosition(
  page: Page,
): Promise<DOFinancialPositionPage> {
  const customerDetails = await openFinanceLeaseBusinessAsgToAddBorrowerStep(page);
  const biz = await openAddNewBusinessBorrower(customerDetails);
  return navigateFlBusinessBorrowerToFinancialPosition(page, biz);
}
