/**
 * DO Portal — Documentation regression (UDP-T3823–UDP-T3862).
 * Scenario source: Documentation Test cases (1).xlsx + DocumentationTestCasesRemaining13.xlsx
 * (Zephyr / Regression 25.0 / Documentation).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import path from "path";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAddressDetailsPage,
  DOAssetDetailsPage,
  DOCustomerQuotePostSubmitPage,
  DODashboardPage,
  DOEmploymentDetailsPage,
  DOFinancialPositionPage,
  DOReferenceDetailsPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF } from "../../../pages/do-portal/StandardQuote/CustomerDetails/customerQuotePostSubmit";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import settlementData from "../../../testData/do-portal/settlementTestData.json";

const CSA_SQ_PRODUCT = "CSA-C-Assigned";
const CSA_SQ_PROGRAM = "Webform - CSA Personal - MV Dealer";
const TLC_DEALER = "Armstrong Prestige Wellington";
/** Existing open Standard Quote on QAT (Settlement regression seed — UDP-T3860 Scenario 2). */
const DOC_OPEN_QUOTE_ID = settlementData.existingQuotes.settlementFromAssetDetails;
/** Seeded application in **Ready for Documentation** (UDP-T3859) — opened from dashboard QID search. */
const DOC_READY_FOR_DOCUMENTATION_QID =
  settlementData.existingQuotes.readyForDocumentationApplication?.trim() || "2442";

/** Navigate to **Post Submission** document strip when QID opens on an earlier step. */
async function navigateExistingApplicationToPostSubmission(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  post: DOCustomerQuotePostSubmitPage,
): Promise<void> {
  const creditTab = page.getByRole("tab", {
    name: /Credit Conditions|Additional Approval Conditions/i,
  });
  const documentsTab = page.getByRole("tab", { name: /^Documents$/i });
  const uploadTab = page.getByRole("tab", { name: /^Upload$/i });
  const onPostSubmission =
    (await creditTab.isVisible({ timeout: 3_000 }).catch(() => false)) ||
    (await documentsTab.isVisible({ timeout: 2_000 }).catch(() => false)) ||
    (await uploadTab.isVisible({ timeout: 2_000 }).catch(() => false)) ||
    (await page
      .locator("app-customer-quote-post-submit, app-post-submission")
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false));

  if (!onPostSubmission) {
    await assetDetailsPage.clickStandardQuoteStepTab(/Post Submission/i);
  }
  await post.expectReopenedPostSubmissionDocumentStripVisible();
}

async function openExistingPostSubmissionFromDashboardQid(
  page: Page,
): Promise<DOCustomerQuotePostSubmitPage> {
  const dashboardPage = await openDealerDashboard(page);
  const post = new DOCustomerQuotePostSubmitPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);

  await dashboardPage.openReadyForDocumentationApplicationFromListing(DOC_READY_FOR_DOCUMENTATION_QID);
  await expect(page.locator("app-quote-details, app-standard-quote").first()).toBeVisible({
    timeout: 120_000,
  });
  await navigateExistingApplicationToPostSubmission(page, assetDetailsPage, post);
  return post;
}
/** Generated Documents row exercised by UDP-T3859 timestamp re-generation. */
const DOC_REGEN_DOCUMENT_NAME = /Customer Quote\s*-\s*Basic/i;

/**
 * Existing application → **Post Submission** → **Generated Documents** tab (UDP-T3837 / UDP-T3859).
 * Reopens seeded QID from dashboard — no new quote or submit workflow.
 */
async function openExistingGeneratedDocumentsFromDashboard(
  page: Page,
): Promise<DOCustomerQuotePostSubmitPage> {
  const post = await openExistingPostSubmissionFromDashboardQid(page);
  await post.openDocumentsTab();
  return post;
}

async function openDealerDashboard(page: Page): Promise<DODashboardPage> {
  const dashboardPage = new DODashboardPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  return dashboardPage;
}

async function openStandardQuoteFromDashboard(page: Page): Promise<DOAssetDetailsPage> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectCSAproduct();
  await expect(page.locator("app-quote-details, app-standard-quote").first()).toBeVisible({
    timeout: 120_000,
  });
  return assetDetailsPage;
}

/** Last calendar year — paired with **Used** to satisfy year/condition submit rules. */
function complianceAssetManufactureYear(): string {
  return String(new Date().getFullYear() - 1);
}

async function addMinimalUsedAsset(
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

async function prepareCalculableCsaQuote(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
): Promise<void> {
  await addMinimalUsedAsset(assetDetailsPage, addAssetPage);
  await assetDetailsPage.termsOfFinance("36");
  await assetDetailsPage.interestRate("9");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await assetDetailsPage.enterOriginationReference("SQ-DOC-Ref");
}

async function fillValidIndividualPersonalBorrower(p: DOPersonalDetailsPage): Promise<void> {
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
  await p.enterVersionNumber("001");
  await p.chooseNewZealandResident("Yes");
  await p.chooseCountryOfBirth("New Zealand");
  await p.chooseCountryOfCitizenship("New Zealand");
}

async function navigatePersonalToAddressDetailsStep(
  page: Page,
  personal: DOPersonalDetailsPage,
  address: DOAddressDetailsPage,
): Promise<void> {
  await personal.clickNextButton();
  for (let attempt = 0; attempt < 3; attempt++) {
    const onAddress = await page
      .locator('input[name="physicalSearchValue"], app-physical-address')
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 25_000 })
      .catch(() => false);
    if (onAddress) {
      await address.waitForPhysicalAddressStep();
      await address.waitForAddressStepReadyForInput();
      return;
    }
    const stillOnPersonal = await page
      .locator("app-personal-details")
      .filter({ visible: true })
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (stillOnPersonal && attempt < 2) {
      await personal.clickNextButton();
      continue;
    }
    await page
      .locator(".app-loader-overlay")
      .filter({ visible: true })
      .first()
      .waitFor({ state: "hidden", timeout: 90_000 })
      .catch(() => {});
  }
  await address.waitForAddressStepReadyForInput();
}

async function fillMinimalAddressContinue(
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
  await address.enterStreetNumber("123");
  await address.enterStreetName("Main Street");
  await address.enterCity("Wellington");
  await address.chooseCountry("New Zealand");
  await address.selectResidenceType("Boarding");
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

async function fillMinimalEmploymentContinue(emp: DOEmploymentDetailsPage): Promise<void> {
  await emp.waitForEmploymentDetailsStep();
  await emp.turnOffEmploymentDetailsChanged();
  await emp.enterCurrentEmployerName("Acme Finance Ltd");
  await emp.selectCurrentOccupation("Accountant");
  await emp.selectCurrentEmploymentType("Full Time Employed");
  // ≥ 3 years — avoids Previous Employment; single **Current** record after Save.
  await emp.enterCurrentTimeWithEmployer("4", "0");
  await emp.clickSaveEmploymentDetails();
  await emp.turnOffEmploymentDetailsChanged();
  await emp.clickNextButton();
}

/** Consumer CSA individual Financial Position (aligned with `CSAcAssigned.test.ts`). */
async function fillMinimalFinancialContinue(fin: DOFinancialPositionPage): Promise<void> {
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

/** CSA quote through Personal Details (borrower added, not yet submitted). */
async function openCsaQuoteThroughPersonalDetails(page: Page): Promise<{
  personal: DOPersonalDetailsPage;
  post: DOCustomerQuotePostSubmitPage;
}> {
  const assetDetailsPage = await openStandardQuoteFromDashboard(page);
  const addAssetPage = new DOAddAssetPage(page);
  await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(CSA_SQ_PROGRAM);
  await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.enterOriginationReference("SQ-DOC-Ref");
  await assetDetailsPage.clickNextButton();
  await assetDetailsPage.waitForAddBorrowerButton();
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  await assetDetailsPage.searchByDropdownClick();
  await assetDetailsPage.selectUDCSelectOption();
  await assetDetailsPage.enterUDCCustomerNumber("420");
  await assetDetailsPage.clickSearchButton();
  await assetDetailsPage.clickAddNewCustomerButton();
  const personal = new DOPersonalDetailsPage(page);
  await fillValidIndividualPersonalBorrower(personal);
  return { personal, post: new DOCustomerQuotePostSubmitPage(page) };
}

/** Complete Address → Reference and submit to Post Submission. */
async function completeCustomerDetailsAndSubmitToPostSubmission(
  page: Page,
  personal: DOPersonalDetailsPage,
): Promise<DOCustomerQuotePostSubmitPage> {
  const address = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, address, personal);
  const emp = new DOEmploymentDetailsPage(page);
  await fillMinimalEmploymentContinue(emp);
  const fin = new DOFinancialPositionPage(page);
  await fillMinimalFinancialContinue(fin);
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

/** CSA Post Submission: upload → Next → submit application → Credit Conditions tab (UDP-T3845+). */
async function openPostSubmissionWithCreditConditionsTab(
  page: Page,
): Promise<DOCustomerQuotePostSubmitPage> {
  const post = await openPostSubmissionUploadStep(page);
  await post.uploadAdvanceAndSubmitApplication();
  await post.expectCreditConditionsTabVisible();
  return post;
}

/**
 * Existing Post Submission application with **Credit Conditions** tab (UDP-T3846–T3849).
 * Reopens seeded QID from dashboard → **Post Submission** — no new quote or submit workflow.
 */
async function openExistingPostSubmissionWithCreditConditionsTab(
  page: Page,
): Promise<DOCustomerQuotePostSubmitPage> {
  const post = await openExistingPostSubmissionFromDashboardQid(page);
  await post.expectCreditConditionsTabVisible();
  return post;
}

/** CSA-C-Assigned individual borrower through Reference submit → Post Submission Upload. */
async function openPostSubmissionUploadStep(page: Page): Promise<DOCustomerQuotePostSubmitPage> {
  const { personal } = await openCsaQuoteThroughPersonalDetails(page);
  return completeCustomerDetailsAndSubmitToPostSubmission(page, personal);
}

/**
 * Post Submission with **cancelled e-sign** precondition (reuses {@link DOCustomerQuotePostSubmitPage.initiateAndCancelElectronicSigningFlow}).
 */
async function openPostSubmissionWithCancelledEsign(page: Page): Promise<DOCustomerQuotePostSubmitPage> {
  const post = await openPostSubmissionUploadStep(page);
  await post.initiateAndCancelElectronicSigningFlow({ borrowerName: "Liza Marie Doe" });
  return post;
}

/** Land on Reference Details with a **past** Loan Date (UDP-T3852–UDP-T3857). */
async function openReferenceDetailsStepWithPastLoanDate(page: Page): Promise<{
  assetDetailsPage: DOAssetDetailsPage;
  referenceDetailsPage: DOReferenceDetailsPage;
}> {
  const assetDetailsPage = await openStandardQuoteFromDashboard(page);
  const addAssetPage = new DOAddAssetPage(page);
  await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(CSA_SQ_PROGRAM);
  await addMinimalUsedAsset(assetDetailsPage, addAssetPage);
  await assetDetailsPage.termsOfFinance("36");
  await assetDetailsPage.interestRate("9");
  const pastLoan = DOAssetDetailsPage.pastDateDdMmYyyy(14);
  await assetDetailsPage.enterLoanDateDdMmYyyy(pastLoan);
  await assetDetailsPage.enterFirstPaymentDateDdMmYyyy(
    DOAssetDetailsPage.suggestFirstPaymentDdMmYyyy(pastLoan),
  );
  await assetDetailsPage.enterOriginationReference("SQ-DOC-PastLoan");
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.clickNextButton();
  await assetDetailsPage.waitForAddBorrowerButton();
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  await assetDetailsPage.searchByDropdownClick();
  await assetDetailsPage.selectUDCSelectOption();
  await assetDetailsPage.enterUDCCustomerNumber("420");
  await assetDetailsPage.clickSearchButton();
  await assetDetailsPage.clickAddNewCustomerButton();
  const personal = new DOPersonalDetailsPage(page);
  await fillValidIndividualPersonalBorrower(personal);
  const address = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, address, personal);
  const emp = new DOEmploymentDetailsPage(page);
  await fillMinimalEmploymentContinue(emp);
  const fin = new DOFinancialPositionPage(page);
  await fillMinimalFinancialContinue(fin);
  const referenceDetailsPage = new DOReferenceDetailsPage(page);
  await referenceDetailsPage.waitForReferenceDetailsStep();
  await referenceDetailsPage.clickAddContactDetails();
  await referenceDetailsPage.selectContactType("Accountant");
  await referenceDetailsPage.enterContactFirstName("Alex");
  await referenceDetailsPage.enterContactLastName("Referee");
  await referenceDetailsPage.clickAddContactInModal();
  await referenceDetailsPage.confirmCustomerDetailsCorrect();
  return { assetDetailsPage, referenceDetailsPage };
}

test.describe("DO Portal — Documentation (Zephyr UDP-T3823–UDP-T3862)", () => {

  test(
    "UDP-T3823 - TC_DOC_014 Uploaded Documents Grid — Fields: Name, Category, Type, Loaded On, Loaded By, Source",
    { tag: ['@do', '@regression', '@UDP-T3823'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const post = await openPostSubmissionUploadStep(page);
      await post.uploadDocument();
      await post.expectDocumentUploaded();
      await post.expectUploadTabUploadedDocumentsGridColumns();
    },
  );

  test(
    "UDP-T3824 - TC_DOC_015 Uploaded Documents — Actions: Preview, Download, Delete",
    { tag: ['@do', '@regression', '@UDP-T3824'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const post = await openPostSubmissionUploadStep(page);
      const pdfName = path.basename(DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF);
      await post.uploadJpgThenPdfExpectBothVisible();
      await post.expectUploadTabPreviewOpensNewTab(pdfName);
      await post.expectUploadTabDownloadStarts(pdfName);
      await post.deleteUploadedDocumentTileByBasenameAndExpectRemoved("minimal-upload.jpg");
    },
  );

  test(
    "UDP-T3825 - TC_DOC_016 Scrolling Triggered When Many Uploaded Documents",
    { tag: ['@do', '@regression', '@UDP-T3825'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const post = await openPostSubmissionUploadStep(page);
      await post.uploadManyDocumentsToUploadTab(9);
      await post.expectUploadTabDocumentsGridScrollable(9);
    },
  );

  test(
    "UDP-T3826 - TC_DOC_017 Electronically Signed Documents Visible in Uploads Tab (Source = Electronically Signed)",
    { tag: ['@do', '@regression', '@UDP-T3826'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const post = await openPostSubmissionUploadStep(page);
      await post.completeElectronicSigningFlow({ borrowerName: "Liza Marie Doe" });
      await post.expectUploadTabElectronicallySignedDocumentVisible();
    },
  );

  test(
    "UDP-T3827 - TC_DOC_018 Post Submission — Previously Uploaded Documents Remain Visible; New Documents Can Be Added",
    { tag: ['@do', '@regression', '@UDP-T3827'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Application has been submitted. Documents were uploaded in Customer Details. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3828 - TC_DOC_019 Generated Documents Controlled by Portal Document View Matrix in AF",
    { tag: ['@do', '@regression', '@UDP-T3828'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Application in a specific workflow state. Matrix configured in AF. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3829 - TC_DOC_020 Generated Documents Grid — Fields: Select All, Date & Time, Document Name, History Icon, E-Sign Status, Preview, Download, Print",
    { tag: ['@do', '@regression', '@UDP-T3829'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const post = await openPostSubmissionUploadStep(page);
      await post.expectGeneratedDocumentsTabColumnHeaders();
    },
  );

  test(
    "UDP-T3830 - TC_DOC_021 Select All — Excludes Credit Advice Documents",
    { tag: ['@do', '@regression', '@UDP-T3830'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, 'Extend assertions when Credit Advice / matrix test data is confirmed in QAT.');
      const post = await openPostSubmissionUploadStep(page);
      await post.clickGeneratedDocumentsSelectAll();
    },
  );

  test(
    "UDP-T3831 - TC_DOC_022 Always Refresh = Ticked — Document Regenerated on Every Preview/Download; Ignores Auto Generated and View Latest",
    { tag: ['@do', '@regression', '@UDP-T3831'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Document matrix has Always Refresh = Ticked for a document. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3832 - TC_DOC_023 Auto Generated = Ticked — Documents Fetched from AF Workflow; Not Manual",
    { tag: ['@do', '@regression', '@UDP-T3832'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Document matrix has Auto Generated = Ticked for a document. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3833 - TC_DOC_024 Auto Generated = Unticked — User Must Click Preview/Download to Generate Document",
    { tag: ['@do', '@regression', '@UDP-T3833'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Document matrix has Auto Generated = Unticked (manually generated document). — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3834 - TC_DOC_025 View Latest = Ticked — Only Latest Version Displayed; No History Icon",
    { tag: ['@do', '@regression', '@UDP-T3834'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Document matrix has View Latest = Ticked. Multiple versions exist in AF. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3835 - TC_DOC_026 View Latest = Unticked — All Versions Displayed; History Icon Present",
    { tag: ['@do', '@regression', '@UDP-T3835'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Document matrix has View Latest = Unticked (e.g., Credit Advice). Multiple versions exist. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3836 - TC_DOC_027 Manually Generated Historical Documents Deleted from AF When New Version Generated",
    { tag: ['@do', '@regression', '@UDP-T3836'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const post = await openExistingGeneratedDocumentsFromDashboard(page);
      const doc = DOC_REGEN_DOCUMENT_NAME;

      await post.generateCustomerQuoteBasicDocument();
      await post.expectGeneratedDocumentsRowCountByDocumentName(doc, 1);
      const beforeTimestamp = await post.readGeneratedDocumentDateTimeWhenReady(doc);
      const beforeAudit = await post.auditGeneratedDocumentRegenerationState(doc);
      post.log(
        `[UDP-T3836] before regeneration — timestamp="${beforeTimestamp}", rows=${beforeAudit.rowCount}, historyIcon=${beforeAudit.historyIconVisible}`,
      );

      await post.generateCustomerQuoteBasicDocument();

      const afterTimestamp = await post.expectManuallyGeneratedHistoricalVersionReplacedInPortal(
        doc,
        beforeTimestamp,
      );
      expect(afterTimestamp).not.toBe(beforeTimestamp);
      await post.expectGeneratedDocumentsRowCountByDocumentName(doc, 1);
    },
  );

  test(
    "UDP-T3837 - TC_DOC_028 Preview — Opens Document in New Tab; Multiple Selections Open Multiple Tabs",
    { tag: ['@do', '@regression', '@UDP-T3837'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const post = await openExistingGeneratedDocumentsFromDashboard(page);

      const rowCount = await post.countGeneratedDocumentsRows();
      if (rowCount < 1) {
        test.skip(
          true,
          "UDP-T3837: No generated documents in the grid — cannot validate Preview tab behaviour.",
        );
      }

      await post.setGeneratedDocumentsRowSelection([0]);
      await post.expectGeneratedDocumentsPreviewOpensTabs(1);

      if (rowCount < 2) {
        test.skip(
          true,
          "UDP-T3837: Fewer than two generated documents — cannot validate multi-selection Preview tabs.",
        );
      }

      await post.setGeneratedDocumentsRowSelection([0, 1]);
      await post.expectGeneratedDocumentsPreviewOpensTabs(2);
    },
  );

  test(
    "UDP-T3838 - TC_DOC_029 Download — Document Downloaded to User's Local Machine",
    { tag: ['@do', '@regression', '@UDP-T3838'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const post = await openPostSubmissionUploadStep(page);
      await post.openDocumentsTab();
      await post.selectCustomerQuoteBasicRow();
      await post.clickDownload();
    },
  );

  test(
    "UDP-T3839 - TC_DOC_030 E-Sign Status Displayed Only When e-Sign Column Ticked AND Contract Signing Method = E-Sign",
    { tag: ['@do', '@regression', '@UDP-T3839'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Various combinations of e-sign column and contract signing method. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3840 - TC_DOC_031 E-Sign Status: Pending, Cancelled, Completed — Hyperlink Opens Signatory Pop-Up",
    { tag: ['@do', '@regression', '@UDP-T3840'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Contract Signing Method = E-Sign. e-Sign column ticked. Document in Generated Documents tab. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3841 - TC_DOC_032 E-Sign Pending — Unsigned Documents in Documents Tab Only",
    { tag: ['@do', '@regression', '@UDP-T3841'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: E-sign process initiated but not completed. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3842 - TC_DOC_033 E-Sign Completed — Unsigned in Documents Tab AND Signed in Uploads Tab",
    { tag: ['@do', '@regression', '@UDP-T3842'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: E-sign process completed by all signatories. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3843 - TC_DOC_034 E-Sign Cancelled — Unsigned Documents in Documents Tab Only",
    { tag: ['@do', '@regression', '@UDP-T3843'] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionWithCancelledEsign(page);

      // Step 1–2: Generated Documents — unsigned docs remain; e-sign status Cancelled.
      await post.expectGeneratedDocumentsTabEsignStatusCancelled();
      await post.expectGeneratedDocumentsTabColumnHeaders();

      // Step 3–4: Uploads — no electronically signed copies after cancellation.
      await post.ensureUploadTab();
      await post.expectUploadTabNoElectronicallySignedDocuments();
    },
  );

  test(
    "UDP-T3844 - TC_DOC_035 Credit Conditions Tab Only Available in Post Submission (Not Customer Details)",
    { tag: ['@do', '@regression', '@UDP-T3844'] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { personal, post } = await openCsaQuoteThroughPersonalDetails(page);

      // Step 1–2: Customer Details — Credit Conditions tab must not appear.
      await post.expectCreditConditionsTabHidden();

      // Step 3–5: Complete mandatory sections and submit to Post Submission.
      const postSubmission = await completeCustomerDetailsAndSubmitToPostSubmission(page, personal);

      // CSA: Reference **Next** → Customer Details upload entry; upload → footer **Next** → Post Submission.
      await postSubmission.uploadAndAdvanceToFullPostSubmission();

      // Step 6: Post Submission — Credit Conditions tab is now available.
      await postSubmission.expectCreditConditionsTabVisible();
    },
  );

  test(
    "UDP-T3845 - TC_DOC_036 Credit Conditions — Two Columns Only: Condition and Customer; To-Do Name NOT Displayed",
    { tag: ['@do', '@regression', '@UDP-T3845'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const post = await openExistingPostSubmissionWithCreditConditionsTab(page);

      const conditions = await post.readCreditConditionsMandatoryIndicatorAudit();
      if (conditions.length === 0) {
        test.skip(
          true,
          "UDP-T3845: No Credit Conditions returned from AF — cannot validate grid column layout.",
        );
      }

      await post.expectCreditConditionsTabTwoColumnsOnly();
    },
  );

  test(
    "UDP-T3846 - TC_DOC_037 Credit Conditions — Most Recent To-Do Displayed First (Descending Order)",
    { tag: ['@do', '@regression', '@UDP-T3846'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Multiple to-do conditions exist with different timestamps. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3847 - TC_DOC_038 Credit Conditions — Party Name (Customer) Blank If AF User Did Not Fill Additional Text Field",
    { tag: ['@do', '@regression', '@UDP-T3847'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Contract-level to-do items exist where AF user left the Party Name additional text field blank. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3848 - TC_DOC_039 Credit Conditions — Asterisk Indicates Mandatory Condition",
    { tag: ['@do', '@regression', '@UDP-T3848'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const post = await openExistingPostSubmissionWithCreditConditionsTab(page);
      await post.openCreditConditionsTab();

      const rows = await post.readCreditConditionsMandatoryIndicatorAudit();
      if (rows.length === 0) {
        test.skip(
          true,
          "UDP-T3848: No Credit Conditions returned from AF — cannot validate mandatory asterisk indicators.",
        );
      }

      const mandatoryRows = rows.filter((row) => row.mandatoryIndicatorPresent);
      const optionalRows = rows.filter((row) => !row.mandatoryIndicatorPresent);

      if (mandatoryRows.length === 0) {
        test.skip(
          true,
          "UDP-T3848: AF returned no mandatory Credit Conditions — cannot validate asterisk on mandatory items.",
        );
      }
      if (optionalRows.length === 0) {
        test.skip(
          true,
          "UDP-T3848: AF returned no optional Credit Conditions — cannot confirm optional items omit the asterisk.",
        );
      }

      for (const row of mandatoryRows) {
        expect(row.conditionText.length, "Mandatory condition text should be populated").toBeGreaterThan(0);
        expect(row.mandatoryIndicatorPresent, `Mandatory condition must show *: "${row.conditionText}"`).toBe(
          true,
        );
      }

      for (const row of optionalRows) {
        expect(
          row.mandatoryIndicatorPresent,
          `Optional condition must not show mandatory *: "${row.conditionText}"`,
        ).toBe(false);
      }
    },
  );

  test(
    "UDP-T3849 - TC_DOC_040 Dealer Cannot Edit, Add, or Delete Credit Conditions",
    { tag: ['@do', '@regression', '@UDP-T3849'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const post = await openExistingPostSubmissionWithCreditConditionsTab(page);

      const conditions = await post.readCreditConditionsMandatoryIndicatorAudit();
      if (conditions.length === 0) {
        test.skip(
          true,
          "UDP-T3849: No Credit Conditions returned from AF — cannot validate view-only dealer access.",
        );
      }

      await post.expectCreditConditionsTabViewOnlyForDealer();
    },
  );

  test(
    "UDP-T3850 - TC_DOC_041 Purchase Invoice Displayed in Generated Documents Section",
    { tag: ['@do', '@regression', '@UDP-T3850'] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionUploadStep(page);
      await post.expectPurchaseInvoiceVisibleInGeneratedDocuments();
      await post.expectGeneratedDocumentsTabColumnHeaders();
    },
  );

  test(
    "UDP-T3851 - TC_DOC_042 Purchase Invoice — User Can Preview and Download",
    { tag: ['@do', '@regression', '@UDP-T3851'] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionUploadStep(page);
      await post.expectPurchaseInvoicePreviewOpensNewTab();
      await post.expectPurchaseInvoiceDownloadStarts();
    },
  );

  
  test(
    "UDP-T3852 - TC_DOC_043 Loan Date Pop-Up Triggered on Submit When Loan Date Is in the Past",
    { tag: ['@do', '@regression', '@UDP-T3852'] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { assetDetailsPage, referenceDetailsPage } =
        await openReferenceDetailsStepWithPastLoanDate(page);
      await referenceDetailsPage.clickSubmitButton();
      await assetDetailsPage.expectLoanDatePastUpdateDialogVisible();
    },
  );

  test(
    "UDP-T3853 - TC_DOC_044 Loan Date Pop-Up Triggered on Ready for Documentation ? Generate Documentation",
    { tag: ['@do', '@regression', '@UDP-T3853'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(
        true,
        "Zephyr: Application in Ready for Documentation state with past Loan Date — requires AF workflow transition to Generate Documentation (not automatable from fresh CSA quote in QAT).",
      );
    },
  );

  test(
    "UDP-T3854 - TC_DOC_045 Loan Date Pop-Up Triggered on Ready for Documentation ? Submit",
    { tag: ['@do', '@regression', '@UDP-T3854'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(
        true,
        "Zephyr: Application in Ready for Documentation state with past Loan Date — requires AF workflow Submit path (not automatable from fresh CSA quote in QAT).",
      );
    },
  );

  test(
    "UDP-T3855 - TC_DOC_046 Loan Date Pop-Up — 'Yes' Updates Loan Date to Today and Recalculates Financials",
    { tag: ['@do', '@regression', '@UDP-T3855'] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { assetDetailsPage, referenceDetailsPage } =
        await openReferenceDetailsStepWithPastLoanDate(page);
      await referenceDetailsPage.clickSubmitButton();
      await assetDetailsPage.expectLoanDatePastUpdateDialogVisible();
      await assetDetailsPage.clickLoanDatePastDialogButton("Yes");
      await assetDetailsPage.expectLoanDateIsTodayOrTomorrow();
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.waitForQuoteLoadersToFinish();
    },
  );

  test(
    "UDP-T3856 - TC_DOC_047 Loan Date Pop-Up — 'No' Navigates to Asset Details; Loan Date Field Highlighted Red",
    { tag: ['@do', '@regression', '@UDP-T3856'] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { assetDetailsPage, referenceDetailsPage } =
        await openReferenceDetailsStepWithPastLoanDate(page);
      await referenceDetailsPage.clickSubmitButton();
      await assetDetailsPage.expectLoanDatePastUpdateDialogVisible();
      await assetDetailsPage.clickLoanDatePastDialogButton("No");
      await assetDetailsPage.expectAssetDetailsStepVisible();
      await assetDetailsPage.expectLoanDatePastFieldErrorHighlighted();
    },
  );

  test(
    "UDP-T3857 - TC_DOC_048 Loan Date Pop-Up — 'Close' Returns to Same Screen; Pop-Up Reappears on Next Submit Attempt",
    { tag: ['@do', '@regression', '@UDP-T3857'] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { assetDetailsPage, referenceDetailsPage } =
        await openReferenceDetailsStepWithPastLoanDate(page);
      await referenceDetailsPage.clickSubmitButton();
      await assetDetailsPage.expectLoanDatePastUpdateDialogVisible();
      await assetDetailsPage.clickLoanDatePastDialogButton("Close");
      await expect(assetDetailsPage.loanDatePastUpdateDialog()).toBeHidden({ timeout: 10_000 });
      await referenceDetailsPage.waitForReferenceDetailsStep();
      await referenceDetailsPage.clickSubmitButton();
      await assetDetailsPage.expectLoanDatePastUpdateDialogVisible();
    },
  );

  test(
    "UDP-T3858 - TC_DOC_049 Changes to Quote in Ready for Documentation State — Documents Must Be Re-Generated",
    { tag: ['@do', '@regression', '@UDP-T3858'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(
        true,
        "Zephyr: Ready for Documentation + editable field change + AF document re-generation — requires seeded workflow state and AF matrix.",
      );
    },
  );

  test(
    "UDP-T3859 - TC_DOC_050 Re-Generated Document Timestamp Updated on Each Re-Generation",
    { tag: ['@do', '@regression', '@UDP-T3859'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboardPage = await openDealerDashboard(page);
      const postSubmission = new DOCustomerQuotePostSubmitPage(page);
      const assetDetailsPage = new DOAssetDetailsPage(page);

      await dashboardPage.openReadyForDocumentationApplicationFromListing(
        DOC_READY_FOR_DOCUMENTATION_QID,
      );

      await postSubmission.expectReopenedPostSubmissionDocumentStripVisible();
      await postSubmission.expectWorkflowStatusReadyForDocumentation();
      await postSubmission.expectGeneratedDocumentsTabColumnHeaders();

      const originalTimestamp =
        await postSubmission.readGeneratedDocumentDateTime(DOC_REGEN_DOCUMENT_NAME);
      expect(originalTimestamp.length).toBeGreaterThan(0);
      const originalMs =
        DOCustomerQuotePostSubmitPage.parseGeneratedDocumentDateTimeMs(originalTimestamp);

      await assetDetailsPage.clickStandardQuoteStepTab(/Asset\s*Details/i);
      await assetDetailsPage.expectAssetDetailsStepVisible();
      const regenRef = `SQ-DOC-3859-${Date.now().toString().slice(-8)}`;
      await assetDetailsPage.enterOriginationReference(regenRef);
      await assetDetailsPage.clickSaveStandardQuoteStep();
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await postSubmission.clickPostSubmissionStepTab();
      await postSubmission.advanceToReadyForDocumentationViaGenerateDocumentationIfRequired();
      await postSubmission.expectWorkflowStatusReadyForDocumentation();

      await postSubmission.generateCustomerQuoteBasicDocument();

      const updatedTimestamp =
        await postSubmission.expectGeneratedDocumentTimestampUpdatedAfterRegeneration(
          DOC_REGEN_DOCUMENT_NAME,
          originalTimestamp,
        );

      expect(updatedTimestamp).not.toBe(originalTimestamp);
      const updatedMs =
        DOCustomerQuotePostSubmitPage.parseGeneratedDocumentDateTimeMs(updatedTimestamp);
      expect(updatedMs).toBeGreaterThan(originalMs);
    },
  );

  test(
    "UDP-T3860 - TC_DOC_051 Post Submission Opens When Submitted Application Opened from Dashboard",
    { tag: ['@do', '@regression', '@UDP-T3860'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboardPage = await openDealerDashboard(page);
      const postSubmission = new DOCustomerQuotePostSubmitPage(page);
      const assetDetailsPage = new DOAssetDetailsPage(page);

      // Scenario 1 — Submitted Application → Post Submission (reuse existing listing row).
      await dashboardPage.openSubmittedApplicationFromListing();
      await postSubmission.expectOpenedDirectlyInPostSubmissionFromDashboard();

      // Scenario 2 — Open Quote (not submitted) → Asset Details (quote 2361).
      await openDealerDashboard(page);
      await dashboardPage.openOpenQuoteFromListing(DOC_OPEN_QUOTE_ID);
      await assetDetailsPage.expectQuoteNumberVisible(DOC_OPEN_QUOTE_ID);
      await assetDetailsPage.expectAssetDetailsStepActiveNotPostSubmission();
    },
  );

  test(
    "UDP-T3861 - TC_DOC_052 Post Submission — All Fields View Only Except Notes and Document Upload",
    { tag: ['@do', '@regression', '@UDP-T3861'] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionUploadStep(page);
      await post.expectPostSubmissionScreenVisible();
      await post.expectPostSubmissionNotesAndUploadActionable();
      await post.addNoteAndSubmit("UDP-T3861 automation note — post submission upload check.");
      await post.uploadDocument();
      await post.expectDocumentUploaded();
    },
  );

  test(
    "UDP-T3862 - TC_DOC_053 'Next' Button NOT Available in Post Submission Screen",
    { tag: ['@do', '@regression', '@UDP-T3862'] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionUploadStep(page);
      await post.expectPostSubmissionScreenVisible();
      await post.expectPostSubmissionNextButtonHidden();
      await post.expectPostSubmissionSavePreviousCancelVisible();
    },
  );
});
