/**
 * Shared helpers for WorkFlow.test.ts (UDP-T3863–UDP-T3922).
 */

import { expect, type Page } from "@playwright/test";
import { readFileSync } from "fs";
import path from "path";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAddressDetailsPage,
  DOAssetDetailsPage,
  DOCustomerQuotePostSubmitPage,
  DODashboardPage,
  DOEmploymentDetailsPage,
  DOFinancialPositionPage,
  DOQuickQuotePage,
  DOReferenceDetailsPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";

export const CSA_SQ_PRODUCT = "CSA-C-Assigned";
export const CSA_SQ_PROGRAM = "Webform - CSA Personal - MV Dealer";
export const TLC_DEALER = "Armstrong Prestige Wellington";

export interface WorkflowApprovedValues {
  cashPrice?: number;
  interestRate?: number;
  cashDeposit?: number;
  totalCharges?: number;
  waiveLmfChecked?: boolean;
  termMonths?: number;
  termMin?: number;
  termMax?: number;
}

export interface WorkflowSeed {
  seedId: string;
  quoteId: string;
  originationReference: string;
  product?: string;
  program?: string;
  portalMaskedStatus: string;
  afUnderlyingState: string;
  dashboardWorkflowStatus: string;
  assignedToUdcUser: string | null;
  approvedValues?: WorkflowApprovedValues | null;
  listing?: "active" | "expired";
  tests?: string[];
}

interface WorkflowSeedsFile {
  dealer: string;
  seeds: WorkflowSeed[];
}

const SEEDS_PATH = path.join(
  process.cwd(),
  "testData",
  "do-portal",
  "workflow-seeds.json",
);

export function loadWorkflowSeeds(): WorkflowSeedsFile {
  return JSON.parse(readFileSync(SEEDS_PATH, "utf-8")) as WorkflowSeedsFile;
}

export function getWorkflowSeed(seedId: string): WorkflowSeed {
  const catalog = loadWorkflowSeeds();
  const seed = catalog.seeds.find((s) => s.seedId === seedId);
  if (!seed) {
    throw new Error(`workflow-seeds.json: unknown seedId "${seedId}"`);
  }
  return seed;
}

/** Resolve quoteId from seed JSON or env `WF_SEED_<SEEDID>_QUOTE_ID` (hyphens → underscores). */
export function resolveSeedQuoteId(seed: WorkflowSeed): string {
  const envKey = `WF_SEED_${seed.seedId.replace(/-/g, "_")}_QUOTE_ID`;
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  const fromJson = seed.quoteId?.trim();
  if (fromJson && !/^REPLACE/i.test(fromJson)) return fromJson;
  throw new Error(
    `Workflow seed "${seed.seedId}" has no quoteId. Set quoteId in testData/do-portal/workflow-seeds.json or env ${envKey}.`,
  );
}

export function standardQuoteRoot(page: Page) {
  return page.locator("app-quote-details, app-standard-quote").first();
}

export async function openDashboard(page: Page): Promise<DODashboardPage> {
  const dashboard = new DODashboardPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboard.waitForAuthenticatedDashboard();
  await dashboard.selectDealer(TLC_DEALER);
  return dashboard;
}

export async function openStandardQuoteFromDashboard(page: Page): Promise<DOAssetDetailsPage> {
  const dashboard = await openDashboard(page);
  await dashboard.clickCreateStandardQuote();
  await dashboard.selectCSAproduct();
  await expect(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  return new DOAssetDetailsPage(page);
}

export async function addMinimalUsedAsset(
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

export async function prepareCalculableCsaQuote(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  origRef = "SQ-WF-OPEN-REF",
): Promise<void> {
  await addMinimalUsedAsset(assetDetailsPage, addAssetPage);
  await assetDetailsPage.termsOfFinance("36");
  await assetDetailsPage.interestRate("4");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await assetDetailsPage.enterOriginationReference(origRef);
}

export async function fillValidIndividualPersonalBorrower(p: DOPersonalDetailsPage): Promise<void> {
  await p.chooseTitle("Dame");
  await p.enterFirstName("Liza");
  await p.enterMiddleName("Marie");
  await p.enterLastName("Doe");
  await p.chooseGender("Female");
  await p.enterDateOfBirth("01/01/1980");
  await p.chooseMarritalStatus("Married");
  await p.chooseNoOfDependents("2");
  await p.fillDependantsAgesInYears(["8", "12"]);
  await p.enterMobileNumber("0211234567");
  await p.enterEmail("liza.doe@example.com");
  await p.chooseLicenceType("Full Licence");
  await p.chooseCountryOfIssue("New Zealand");
  await p.enterLicenceNumber("AB123456");
  await p.enterVersionNumber("244");
  await p.chooseNewZealandResident("Yes");
  await p.chooseCountryOfBirth("New Zealand");
  await p.chooseCountryOfCitizenship("New Zealand");
}

export async function fillMinimalAddressContinue(page: Page, address: DOAddressDetailsPage): Promise<void> {
  await address.waitForPhysicalAddressStep();
  await address.timeAtAddress("5", "0");
  await address.enterStreetNumber("123");
  await address.enterStreetName("Main Street");
  await address.enterCity("Wellington");
  await address.chooseCountry("New Zealand");
  await address.selectResidenceType("Boarding");
  await address.clickReuseForPostalAddressToggle();
  await address.clickSaveAddressDetails();
  await address.clickNextButton();
}

export async function fillMinimalEmploymentContinue(emp: DOEmploymentDetailsPage): Promise<void> {
  await emp.waitForEmploymentDetailsStep();
  await emp.enterCurrentEmployerName("Acme Finance Ltd");
  await emp.selectCurrentOccupation("Accountant");
  await emp.selectCurrentEmploymentType("Full Time Employed");
  await emp.enterCurrentTimeWithEmployer("3", "0");
  await emp.clickNextButton();
}

export async function fillMinimalFinancialContinue(fin: DOFinancialPositionPage): Promise<void> {
  await fin.waitForFinancialPositionStep();
  await fin.selectIndividualHomeOwnershipType("Mortgage");
  await fin.fillIndividualVehicleValueAmount("$18,000.00");
  await fin.fillFirstLiabilityBalanceAndAmount("$500,000.00", "$2,500.00");
  await fin.setFirstLiabilityRowFrequencyMonthly();
  await fin.fillFirstIncomeAmount("$5,000.00");
  await fin.setTakeHomePayFrequencyMonthly();
  await fin.selectIncomeLikelyToDecreaseNo().catch(() => {});
  await fin.fillExpenditureAmountByLabel(/Council Rates/i, "$220.00");
  await fin.setExpenditureRowFrequencyMonthlyByLabel(/Council Rates/i);
  await fin.fillEssentialOutgoingAmount("$150.00");
  await fin.setEssentialOutgoingFrequencyMonthly();
  await fin.clickNextButton();
}

/** CSA Calculate can clear Originator Reference — re-fill and retry **Next** until Customer Details loads. */
export async function advanceAssetDetailsToCustomerDetails(
  assetDetailsPage: DOAssetDetailsPage,
  origRef: string,
): Promise<void> {
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.waitForLoadingComplete(120_000);
  await assetDetailsPage.interestRate("4");
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.waitForLoadingComplete(120_000);
  await assetDetailsPage.enterOriginationReference(origRef);
  await assetDetailsPage.clickSaveStandardQuoteStep({
    originatorRefForRequiredDialog: origRef,
  });
  await assetDetailsPage.waitForQuoteLoadersToFinish();

  for (let attempt = 0; attempt < 3; attempt++) {
    await assetDetailsPage.clickNextButton();
    try {
      await assetDetailsPage.waitForAddBorrowerButton();
      return;
    } catch (err) {
      if (attempt === 2) throw err;
      await assetDetailsPage.enterOriginationReference(origRef);
      await assetDetailsPage.waitForLoadingComplete();
    }
  }
}

/** CSA quote with past loan date through Reference submit → Post Submission. */
export async function openPostSubmissionWithPastLoanDate(
  page: Page,
  origRef = "SQ-WF-PAST-LOAN",
  daysAgo = 14,
): Promise<DOCustomerQuotePostSubmitPage> {
  const assetDetailsPage = await openStandardQuoteFromDashboard(page);
  const addAssetPage = new DOAddAssetPage(page);
  await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(CSA_SQ_PROGRAM);
  await addMinimalUsedAsset(assetDetailsPage, addAssetPage);
  await assetDetailsPage.termsOfFinance("36");
  await assetDetailsPage.interestRate("4");
  const pastLoan = DOAssetDetailsPage.pastDateDdMmYyyy(daysAgo);
  await assetDetailsPage.enterLoanDateDdMmYyyy(pastLoan);
  await assetDetailsPage.enterFirstPaymentDateDdMmYyyy(
    DOAssetDetailsPage.suggestFirstPaymentDdMmYyyy(pastLoan),
  );
  await assetDetailsPage.enterOriginationReference(origRef);
  await advanceAssetDetailsToCustomerDetails(assetDetailsPage, origRef);
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  await assetDetailsPage.searchByDropdownClick();
  await assetDetailsPage.selectUDCSelectOption();
  await assetDetailsPage.enterUDCCustomerNumber("420");
  await assetDetailsPage.clickSearchButton();
  await assetDetailsPage.clickAddNewCustomerButton();
  const personal = new DOPersonalDetailsPage(page);
  await fillValidIndividualPersonalBorrower(personal);
  await personal.clickNextButton();
  const address = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, address);
  const emp = new DOEmploymentDetailsPage(page);
  await fillMinimalEmploymentContinue(emp);
  const fin = new DOFinancialPositionPage(page);
  await fillMinimalFinancialContinue(fin);
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

/** Webform CSA — Reference may sit behind Borrower Summary after Financial **Next**. */
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

/** Full CSA individual through Reference submit → Post Submission Upload. */
export async function openPostSubmissionFromFreshQuote(
  page: Page,
  origRef = "SQ-WF-POST-SUBMIT",
): Promise<DOCustomerQuotePostSubmitPage> {
  const assetDetailsPage = await openStandardQuoteFromDashboard(page);
  const addAssetPage = new DOAddAssetPage(page);
  await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(CSA_SQ_PROGRAM);
  await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage, origRef);
  await advanceAssetDetailsToCustomerDetails(assetDetailsPage, origRef);
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  await assetDetailsPage.searchByDropdownClick();
  await assetDetailsPage.selectUDCSelectOption();
  await assetDetailsPage.enterUDCCustomerNumber("420");
  await assetDetailsPage.clickSearchButton();
  await assetDetailsPage.clickAddNewCustomerButton();
  const personal = new DOPersonalDetailsPage(page);
  await fillValidIndividualPersonalBorrower(personal);
  await personal.clickNextButton();
  const address = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, address);
  const emp = new DOEmploymentDetailsPage(page);
  await fillMinimalEmploymentContinue(emp);
  const fin = new DOFinancialPositionPage(page);
  await fillMinimalFinancialContinue(fin);
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

/** Open pre-seeded quote from catalog by seedId. */
export async function openWorkflowSeed(
  page: Page,
  seedId: string,
): Promise<{
  seed: WorkflowSeed;
  quoteId: string;
  dashboard: DODashboardPage;
  post: DOCustomerQuotePostSubmitPage;
  asset: DOAssetDetailsPage;
}> {
  const seed = getWorkflowSeed(seedId);
  const quoteId = resolveSeedQuoteId(seed);
  const dashboard = await openDashboard(page);
  if (seed.listing === "expired") {
    await dashboard.openQuotesAndApplications();
    await dashboard.openExpiredQuotesListing();
    await dashboard.openQuoteFromGridByReference(seed.originationReference);
  } else {
    await dashboard.openQuoteById(quoteId);
  }
  const post = new DOCustomerQuotePostSubmitPage(page);
  const asset = new DOAssetDetailsPage(page);
  await expect(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  return { seed, quoteId, dashboard, post, asset };
}

export async function openQuickQuoteCsa(page: Page): Promise<DOQuickQuotePage> {
  await openDashboard(page);
  const qq = new DOQuickQuotePage(page);
  await qq.openQuickQuote();
  await expect(qq.quickQuoteRoot).toBeVisible({ timeout: 90_000 });
  return qq;
}
