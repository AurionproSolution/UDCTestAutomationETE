/**
 * Shared Documentation regression helpers (UDP-T3823+).
 * UDP-T3824 — `openPostSubmissionUploadStep` creates the CSA quote and individual borrower used by sanity UDP-T4718.
 */

import { expect, type Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAddressDetailsPage,
  DOAssetDetailsPage,
  DOCustomerDetailsPage,
  DOCustomerQuotePostSubmitPage,
  DODashboardPage,
  DOEmploymentDetailsPage,
  DOFinancialPositionPage,
  DOReferenceDetailsPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import type { SavedPhysicalAddressSnapshot } from "../../../pages/do-portal/StandardQuote/CustomerDetails/addressDetails";
import type { SavedEmploymentSnapshot } from "../../../pages/do-portal/StandardQuote/CustomerDetails/employmentDetails";
import type { IndividualPersonalDetailsSnapshot } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import { standardQuoteRoot } from "./workflow.helpers";

export const DOC_CSA_SQ_PRODUCT = "CSA-C-Assigned";
export const DOC_CSA_SQ_PROGRAM = "CSA Personal - MV Dealer";
export const DOC_TLC_DEALER = "Armstrong Prestige Wellington";
export const DOC_T3824_BORROWER_NAME = /Liza Marie Doe/i;

/** Saved borrower data for UDP-T3824 / UDP-T4718 (matches fills below). */
export const DOC_T3824_BORROWER = {
  displayName: DOC_T3824_BORROWER_NAME,
  role: /Borrower/i,
  personal: {
    title: "Dame",
    firstName: "Liza",
    middleName: "Marie",
    lastName: "Doe",
    gender: "Female",
    dateOfBirth: "01/01/1980",
    maritalStatus: "Married",
    dependants: "2",
    dependantAges: ["8", "12"],
    mobile: "0211234567",
    email: "liza.doe@example.com",
    licenceType: "Full Licence",
    countryOfIssue: "New Zealand",
    licenceNumber: "AB123456",
    versionNumber: "244",
    nzResident: "Yes",
    countryOfBirth: "New Zealand",
    countryOfCitizenship: "New Zealand",
  } satisfies IndividualPersonalDetailsSnapshot,
  address: {
    streetNumber: "123",
    streetName: "Main Street",
    city: "Wellington",
    country: "New Zealand",
    residenceType: "Boarding",
  } satisfies SavedPhysicalAddressSnapshot,
  employment: {
    employer: "Acme Finance Ltd",
    occupation: "Accountant",
    employmentType: "Full Time Employed",
    years: "4",
    months: "0",
  } satisfies SavedEmploymentSnapshot,
  financial: {
    income: "$5,000.00",
    liabilityAmount: "$2,500.00",
  },
} as const;

function complianceAssetManufactureYear(): string {
  return String(new Date().getFullYear() - 1);
}

export async function openDocumentationDealerDashboard(page: Page): Promise<DODashboardPage> {
  const dashboardPage = new DODashboardPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(DOC_TLC_DEALER);
  return dashboardPage;
}

export async function openDocumentationStandardQuoteFromDashboard(
  page: Page,
): Promise<DOAssetDetailsPage> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(DOC_TLC_DEALER);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectCSAproduct();
  await expect(page.locator("app-quote-details, app-standard-quote").first()).toBeVisible({
    timeout: 120_000,
  });
  return assetDetailsPage;
}

async function addDocumentationMinimalUsedAsset(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
): Promise<void> {
  const year = complianceAssetManufactureYear();
  await assetDetailsPage.enterAsset("Car and Light Commercial /");
  await assetDetailsPage.selectCondition("Used");
  await assetDetailsPage.openAssetInsuranceTradeInSummary();
  await assetDetailsPage.clickAssetSummaryEditButton();
  await addAssetPage.enterAssetValue("$20,000");
  await addAssetPage.selectCondition("Used");
  await addAssetPage.selectYear(year);
  await addAssetPage.enterMake("Toyota");
  await addAssetPage.enterModel("Hilux");
  await addAssetPage.enterVariant("Top");
  await addAssetPage.enterRegoNO("TG08BP5123");
  await addAssetPage.enterVIN("1HGCM82633A004352");
  await addAssetPage.enterOdometer("50000");
  await addAssetPage.enterColour("Black");
  await addAssetPage.enterSerialNO("0999944477");
  await addAssetPage.enterEngineNO("1133445588");
  await addAssetPage.enterCCRating("5");
  await addAssetPage.chooseMotivePower("Petrol");
  await addAssetPage.chooseCountryRegistered("New Zealand");
  await addAssetPage.chooseAssetLocation("North Island");
  await addAssetPage.clickSummitButton();
  await addAssetPage.clickCrossButton();
}

async function prepareDocumentationCalculableCsaQuote(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  origRef: string,
): Promise<void> {
  await addDocumentationMinimalUsedAsset(assetDetailsPage, addAssetPage);
  await assetDetailsPage.termsOfFinance("36");
  await assetDetailsPage.interestRate("9");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await assetDetailsPage.enterOriginationReference(origRef);
}

export async function fillDocumentationValidIndividualPersonalBorrower(
  p: DOPersonalDetailsPage,
): Promise<void> {
  await p.chooseTitle(DOC_T3824_BORROWER.personal.title);
  await p.enterFirstName(DOC_T3824_BORROWER.personal.firstName);
  await p.enterMiddleName(DOC_T3824_BORROWER.personal.middleName);
  await p.enterLastName(DOC_T3824_BORROWER.personal.lastName);
  await p.chooseGender(DOC_T3824_BORROWER.personal.gender);
  await p.enterDateOfBirth(DOC_T3824_BORROWER.personal.dateOfBirth);
  await p.chooseMarritalStatus(DOC_T3824_BORROWER.personal.maritalStatus);
  await p.chooseNoOfDependents(DOC_T3824_BORROWER.personal.dependants);
  await p.fillDependantsAgesInYears([...DOC_T3824_BORROWER.personal.dependantAges]);
  await p.enterMobileNumber(DOC_T3824_BORROWER.personal.mobile);
  await p.enterEmail(DOC_T3824_BORROWER.personal.email);
  await p.chooseLicenceType(DOC_T3824_BORROWER.personal.licenceType);
  await p.chooseCountryOfIssue(DOC_T3824_BORROWER.personal.countryOfIssue);
  await p.enterLicenceNumber(DOC_T3824_BORROWER.personal.licenceNumber);
  await p.enterVersionNumber(DOC_T3824_BORROWER.personal.versionNumber);
  await p.chooseNewZealandResident(DOC_T3824_BORROWER.personal.nzResident);
  await p.chooseCountryOfBirth(DOC_T3824_BORROWER.personal.countryOfBirth);
  await p.chooseCountryOfCitizenship(DOC_T3824_BORROWER.personal.countryOfCitizenship);
}

async function navigatePersonalToAddressDetailsStep(
  page: Page,
  personal: DOPersonalDetailsPage,
  address: DOAddressDetailsPage,
): Promise<void> {
  await personal.clickNextButton();
  await address.waitForAddressStepReadyForInput();
}

export async function fillDocumentationMinimalAddressContinue(
  page: Page,
  address: DOAddressDetailsPage,
  personal?: DOPersonalDetailsPage,
): Promise<void> {
  if (personal) {
    await navigatePersonalToAddressDetailsStep(page, personal, address);
  } else {
    await address.waitForPhysicalAddressStep();
    await address.waitForAddressStepReadyForInput();
  }
  await address.timeAtAddress("5", "0");
  await address.enterStreetNumber(DOC_T3824_BORROWER.address.streetNumber);
  await address.enterStreetName(DOC_T3824_BORROWER.address.streetName);
  await address.enterCity(DOC_T3824_BORROWER.address.city);
  await address.chooseCountry(DOC_T3824_BORROWER.address.country);
  await address.selectResidenceType(DOC_T3824_BORROWER.address.residenceType);
  await address.clickReuseForPostalAddressToggle();
  await address.fillPreviousPhysicalRequiredIfPresent({
    years: "1",
    months: "1",
    streetNumber: "45",
    streetName: "Queen Street",
    city: "Wellington",
    country: "New Zealand",
  });
  await address.clickSaveAddressDetails();
  await address.clickNextButton();
}

export async function fillDocumentationMinimalEmploymentContinue(
  emp: DOEmploymentDetailsPage,
): Promise<void> {
  await emp.waitForEmploymentDetailsStep();
  await emp.turnOffEmploymentDetailsChanged();
  await emp.enterCurrentEmployerName(DOC_T3824_BORROWER.employment.employer);
  await emp.selectCurrentOccupation(DOC_T3824_BORROWER.employment.occupation);
  await emp.selectCurrentEmploymentType(DOC_T3824_BORROWER.employment.employmentType);
  await emp.enterCurrentTimeWithEmployer(
    DOC_T3824_BORROWER.employment.years,
    DOC_T3824_BORROWER.employment.months,
  );
  await emp.clickSaveEmploymentDetails();
  await emp.turnOffEmploymentDetailsChanged();
  await emp.clickNextButton();
}

export async function fillDocumentationMinimalFinancialContinue(
  fin: DOFinancialPositionPage,
): Promise<void> {
  await fin.waitForFinancialPositionStep();
  await fin.fillFirstLiabilityBalanceAndAmount("$500000.00", "$2500.00");
  await fin.setFirstLiabilityRowFrequencyMonthly();
  await fin.fillFirstIncomeAmount("$5000.00");
  await fin.setIncomeFrequencyMonthly();
  await fin.selectIncomeLikelyToDecreaseNo();
  await fin.fillFirstExpenditureAmount("$200.00");
  await fin.setExpenditureFrequencyMonthly();
  await fin.selectEssentialOutgoingTypeLifestyle();
  await fin.fillEssentialOutgoingAmount("$150.00");
  await fin.setEssentialOutgoingFrequencyMonthly();
  await fin.clickNextButton();
}

async function navigateToBorrowerSummaryIfAvailable(page: Page): Promise<void> {
  const root = standardQuoteRoot(page);
  const byRole = root
    .getByRole("button", { name: /^Borrower\s+Summary$/i })
    .or(root.getByRole("link", { name: /^Borrower\s+Summary$/i }))
    .or(root.getByRole("tab", { name: /^Borrower\s+Summary$/i }))
    .first();
  if (await byRole.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await byRole.click({ timeout: 15_000 });
    await page.waitForTimeout(400);
  }
}

/** CSA quote through Personal Details (borrower added, not yet submitted). */
export async function openDocumentationCsaQuoteThroughPersonalDetails(
  page: Page,
  origRef = "SQ-DOC-Ref",
): Promise<{
  personal: DOPersonalDetailsPage;
  post: DOCustomerQuotePostSubmitPage;
  asset: DOAssetDetailsPage;
}> {
  const assetDetailsPage = await openDocumentationStandardQuoteFromDashboard(page);
  const addAssetPage = new DOAddAssetPage(page);
  await assetDetailsPage.chooseProduct(DOC_CSA_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(DOC_CSA_SQ_PROGRAM);
  await prepareDocumentationCalculableCsaQuote(assetDetailsPage, addAssetPage, origRef);
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.waitForLoadingComplete(120_000);
  await assetDetailsPage.enterOriginationReference(origRef);
  const customerDetailsPage = new DOCustomerDetailsPage(page);
  for (let attempt = 0; attempt < 3; attempt++) {
    await assetDetailsPage.clickNextButton();
    try {
      await customerDetailsPage.waitForAddBorrowerButton();
      break;
    } catch (err) {
      if (attempt === 2) {
        throw err;
      }
      await assetDetailsPage.enterOriginationReference(origRef);
      await assetDetailsPage.waitForLoadingComplete(120_000);
    }
  }
  await customerDetailsPage.clickAddBorrowersOrGuarantors();
  await customerDetailsPage.searchCustomer.searchByUdcNumber("420");
  await customerDetailsPage.clickAddNewCustomerButton();
  const personal = new DOPersonalDetailsPage(page);
  await fillDocumentationValidIndividualPersonalBorrower(personal);
  return { personal, post: new DOCustomerQuotePostSubmitPage(page), asset: assetDetailsPage };
}

/** Complete Address → Reference and submit to Post Submission Upload. */
export async function completeDocumentationCustomerDetailsAndSubmitToPostSubmission(
  page: Page,
  personal: DOPersonalDetailsPage,
): Promise<DOCustomerQuotePostSubmitPage> {
  const address = new DOAddressDetailsPage(page);
  await fillDocumentationMinimalAddressContinue(page, address, personal);
  const emp = new DOEmploymentDetailsPage(page);
  await fillDocumentationMinimalEmploymentContinue(emp);
  const fin = new DOFinancialPositionPage(page);
  await fillDocumentationMinimalFinancialContinue(fin);
  await navigateToBorrowerSummaryIfAvailable(page);
  const ref = new DOReferenceDetailsPage(page);
  await ref.waitForReferenceDetailsStep();
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

/**
 * UDP-T3824 — CSA-C-Assigned individual borrower through Reference submit → Post Submission Upload.
 */
export async function openPostSubmissionUploadStep(
  page: Page,
  origRef = "SQ-DOC-Ref",
): Promise<DOCustomerQuotePostSubmitPage> {
  const { personal } = await openDocumentationCsaQuoteThroughPersonalDetails(page, origRef);
  return completeDocumentationCustomerDetailsAndSubmitToPostSubmission(page, personal);
}

/** Same as {@link openPostSubmissionUploadStep} but returns quote **Asset Details** for save/reopen flows (UDP-T4718). */
export async function openPostSubmissionUploadStepWithAsset(
  page: Page,
  origRef = "SQ-DOC-Ref",
): Promise<{
  post: DOCustomerQuotePostSubmitPage;
  asset: DOAssetDetailsPage;
  origRef: string;
}> {
  const { personal, asset } = await openDocumentationCsaQuoteThroughPersonalDetails(page, origRef);
  const post = await completeDocumentationCustomerDetailsAndSubmitToPostSubmission(page, personal);
  return { post, asset, origRef };
}
