/**
 * DO Portal — Documentation regression (UDP-T3823–UDP-T3862).
 * Scenario source: Documentation Test cases (1).xlsx + DocumentationTestCasesRemaining13.xlsx
 * (Zephyr / Regression 25.0 / Documentation).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import path from "path";
import type { Page } from "@playwright/test";
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
import { DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF } from "../../../pages/do-portal/StandardQuote/CustomerDetails/customerQuotePostSubmit";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";

const CSA_SQ_PRODUCT = "CSA-C-Assigned";
const CSA_SQ_PROGRAM = "Webform - CSA Personal - MV Dealer";
const TLC_DEALER = "Armstrong Prestige Wellington";

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

async function addMinimalUsedAsset(
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
  await p.enterVersionNumber("244");
  await p.chooseNewZealandResident("Yes");
  await p.chooseCountryOfBirth("New Zealand");
  await p.chooseCountryOfCitizenship("New Zealand");
}

async function fillMinimalAddressContinue(page: Page, address: DOAddressDetailsPage): Promise<void> {
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

async function fillMinimalEmploymentContinue(emp: DOEmploymentDetailsPage): Promise<void> {
  await emp.waitForEmploymentDetailsStep();
  await emp.enterCurrentEmployerName("Acme Finance Ltd");
  await emp.selectCurrentOccupation("Accountant");
  await emp.selectCurrentEmploymentType("Full Time Employed");
  await emp.enterCurrentTimeWithEmployer("3", "0");
  await emp.clickNextButton();
}

async function fillMinimalFinancialContinue(fin: DOFinancialPositionPage): Promise<void> {
  await fin.waitForFinancialPositionStep();
  await fin.selectIndividualHomeOwnershipType("Mortgage");
  await fin.fillIndividualVehicleValueAmount("$18,000.00");
  await fin.fillFirstLiabilityBalanceAndAmount("$500,000.00", "$2,500.00");
  await fin.setFirstLiabilityRowFrequencyMonthly();
  await fin.fillFirstIncomeAmount("$5,000.00");
  await fin.setTakeHomePayFrequencyMonthly();
  await fin.fillExpenditureAmountByLabel(/Council Rates/i, "$220.00");
  await fin.setExpenditureRowFrequencyMonthlyByLabel(/Council Rates/i);
  await fin.fillEssentialOutgoingAmount("$150.00");
  await fin.setEssentialOutgoingFrequencyMonthly();
  await fin.clickNextButton();
}

/** Land on Customer Details (personal step) — for UDP-T3844 tab visibility. */
async function openCustomerDetailsBeforeSubmit(page: Page): Promise<DOCustomerQuotePostSubmitPage> {
  const assetDetailsPage = await openStandardQuoteFromDashboard(page);
  const addAssetPage = new DOAddAssetPage(page);
  await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(CSA_SQ_PROGRAM);
  await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.enterOriginationReference("SQ-DOC-Ref");
  await assetDetailsPage.clickNextButton();
  const customerDetailsPage = new DOCustomerDetailsPage(page);
  await customerDetailsPage.waitForAddBorrowerButton();
  await customerDetailsPage.clickAddBorrowersOrGuarantors();
  await customerDetailsPage.searchCustomer.searchByUdcNumber("420");
  await customerDetailsPage.clickAddNewCustomerButton();
  const personal = new DOPersonalDetailsPage(page);
  await fillValidIndividualPersonalBorrower(personal);
  return new DOCustomerQuotePostSubmitPage(page);
}

/** CSA-C-Assigned individual borrower through Reference submit → Post Submission Upload. */
async function openPostSubmissionUploadStep(page: Page): Promise<DOCustomerQuotePostSubmitPage> {
  const assetDetailsPage = await openStandardQuoteFromDashboard(page);
  const addAssetPage = new DOAddAssetPage(page);
  await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(CSA_SQ_PROGRAM);
  await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.enterOriginationReference("SQ-DOC-Ref");
  await assetDetailsPage.clickNextButton();
  const customerDetailsPage = new DOCustomerDetailsPage(page);
  await customerDetailsPage.waitForAddBorrowerButton();
  await customerDetailsPage.clickAddBorrowersOrGuarantors();
  await customerDetailsPage.searchCustomer.searchByUdcNumber("420");
  await customerDetailsPage.clickAddNewCustomerButton();
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
  await ref.clickAddContactDetails();
  await ref.selectContactType("Accountant");
  await ref.enterContactFirstName("Alex");
  await ref.enterContactLastName("Referee");
  await ref.clickAddContactInModal();
  await ref.confirmCustomerDetailsCorrect();
  await ref.clickSubmitButton();
  const post = new DOCustomerQuotePostSubmitPage(page);
  await post.waitForUploadStep();
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
  const customerDetailsPage = new DOCustomerDetailsPage(page);
  await customerDetailsPage.waitForAddBorrowerButton();
  await customerDetailsPage.clickAddBorrowersOrGuarantors();
  await customerDetailsPage.searchCustomer.searchByUdcNumber("420");
  await customerDetailsPage.clickAddNewCustomerButton();
  const personal = new DOPersonalDetailsPage(page);
  await fillValidIndividualPersonalBorrower(personal);
  await personal.clickNextButton();
  const address = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, address);
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
      test.fixme(true, "Zephyr: Manually generated document exists. User generates a new version. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3837 - TC_DOC_028 Preview — Opens Document in New Tab; Multiple Selections Open Multiple Tabs",
    { tag: ['@do', '@regression', '@UDP-T3837'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Generated documents tab. One or more documents selected. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
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
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: E-sign process has been cancelled. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3844 - TC_DOC_035 Credit Conditions Tab Only Available in Post Submission (Not Customer Details)",
    { tag: ['@do', '@regression', '@UDP-T3844'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const post = await openCustomerDetailsBeforeSubmit(page);
      await post.expectCreditConditionsTabHidden();
    },
  );

  test(
    "UDP-T3845 - TC_DOC_036 Credit Conditions — Two Columns Only: Condition and Customer; To-Do Name NOT Displayed",
    { tag: ['@do', '@regression', '@UDP-T3845'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Application submitted. In Post Submission. Open credit advice workflow. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
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
      test.fixme(true, "Zephyr: Credit Conditions tab with a mix of mandatory and optional conditions. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
    },
  );

  test(
    "UDP-T3849 - TC_DOC_040 Dealer Cannot Edit, Add, or Delete Credit Conditions",
    { tag: ['@do', '@regression', '@UDP-T3849'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Zephyr: Credit Conditions tab visible with conditions displayed. — needs AF matrix / e-sign / workflow state or dashboard reopen data.");
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
      test.fixme(
        true,
        "Zephyr: Compare document Date & Time before/after re-generation — requires Ready for Documentation workflow and AF-generated documents.",
      );
    },
  );

  test(
    "UDP-T3860 - TC_DOC_051 Post Submission Opens When Submitted Application Opened from Dashboard",
    { tag: ['@do', '@regression', '@UDP-T3860'] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(
        true,
        "Zephyr: Re-open submitted application from dashboard Quotes grid — requires dashboard grid POM + submitted quote seed (origination ref SQ-DOC-Ref).",
      );
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
