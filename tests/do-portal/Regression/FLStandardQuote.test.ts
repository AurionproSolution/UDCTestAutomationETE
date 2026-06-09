/**
 * DO Portal — Finance Lease Standard Quote regression (single Playwright test, single run).
 * Dashboard → Create Standard Quote → Finance Lease dialog, then asset step (FL_QQ_PRODUCT / FL_QQ_PROGRAM).
 * Auth: `do-regression-chromium` depends on `doSanity.auth.setup.ts` (storageState). Login
 * flakiness from slow SPA/SSO paint is handled in `DOLoginPage.navigate` / `login`, not here.
 */

import { expect, test } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
    DOAddOnsAccessoriesPage,
    DOAssetDetailsPage,
    DOBusinessDetailsPage,
    DODashboardPage,
    DOReferenceDetailsPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOAddressDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/addressDetails";
import { DOCustomerQuotePostSubmitPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/customerQuotePostSubmit";
import { DOFinancialPositionPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/financialPosition";

const FL_QQ_PRODUCT = "Finance Lease - Business Asg";
const FL_QQ_PROGRAM = "Finance Lease Business - MV Dealer";

/**
 * Cost of Asset (add-asset wizard) — plain digits for `currencymask` (same pattern as
 * `CSA_STANDARD_QUOTE_ASSET_VALUE` in `CSA_QuickQuote_SingleFlow.test.ts`); must be positive; on QQ→SQ flows keep ≤ carried cash.
 */
const FL_STANDARD_QUOTE_ASSET_VALUE = "100000";

test(
  "DO Portal - Finance Lease — PDF regression (single run)",
  { tag: ["@regression"] },
  async ({ page }) => {
    test.setTimeout(1_200_000);

    const dashboardPage = new DODashboardPage(page);
    // -------------------------------------------------------------------------
    // Dashboard → Standard Quote (no Quick Quote); FL product/program, then primary assetDetailsPage block.
    // -------------------------------------------------------------------------
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
    await dashboardPage.clickStandardQuote();
    await dashboardPage.selectFinanceLeaseProduct();

    const standardQuoteShell = page.locator("app-quote-details, app-standard-quote").first();
    await expect(standardQuoteShell).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/Lease\s*Details/i).first()).toBeVisible({ timeout: 120_000 });

    const flStandardQuoteEnterAssetStep = new DOAssetDetailsPage(page);
    await flStandardQuoteEnterAssetStep.waitForAssetDetailsStepReady();
    await flStandardQuoteEnterAssetStep.chooseProduct(FL_QQ_PRODUCT);
    await flStandardQuoteEnterAssetStep.chooseProgram(FL_QQ_PROGRAM);

    const assetDetailsPage = new DOAssetDetailsPage(page);
    const addAssetPage = new DOAddAssetPage(page);
    // -------------------------------------------------------------------------
    // Asset Details (FL): Originator ref + lease date; then same asset path as `Financelease.test.ts`
    // (enterAsset → condition → **openAssetInsuranceTradeInSummary** → **clickAssetSummaryEditButton** → add-asset → Calculate ×2 → Add Ons on Asset Details → Payment Summary / schedule → **Next**).
    // -------------------------------------------------------------------------
    await assetDetailsPage.waitForAssetDetailsStepReady();
    await assetDetailsPage.expectProductProgramCarriedFromQuickQuote(FL_QQ_PRODUCT, FL_QQ_PROGRAM, {
      requireLockedDropdowns: false,
    });
    // Direct Standard Quote (no Quick Quote): cash is not carried in — stays zero until asset / lease pricing.
    await expect(assetDetailsPage.cashPriceOfAssetInputField).toHaveValue(/\$0[.,]00/, { timeout: 15_000 });
    await assetDetailsPage.enterOriginationReferenceFinanceLease("Test Orig Ref 123");
    await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();

    // Same order as `Financelease.test.ts`: asset + condition → **Asset & Insurance Summary** → **Edit** → add-asset wizard.
    await assetDetailsPage.enterAsset("Car and Light Commercial /");
    await assetDetailsPage.selectCondition("Used");
    await assetDetailsPage.openAssetInsuranceTradeInSummary();
    await assetDetailsPage.clickAssetSummaryEditButton();
    // Cost of Asset: enter a positive value (no QQ carry-over for cash price on direct Standard Quote).
    await addAssetPage.enterAssetValue(FL_STANDARD_QUOTE_ASSET_VALUE);
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
    // ServiceBusinessException / AssetType / cost rules: re-apply valid cost and resubmit if the portal shows these errors.
    const assetWizardCostOrTypeError = page.getByText(
      /AssetType|Supply more property|Cost of Asset minimum|greater than 0|cannot be greater than|ServiceBusinessException/i,
    );
    for (let repair = 0; repair < 2; repair++) {
      if (await assetWizardCostOrTypeError.first().isVisible({ timeout: 4_000 }).catch(() => false)) {
        await addAssetPage.enterAssetValue(FL_STANDARD_QUOTE_ASSET_VALUE);
        await addAssetPage.clickSummitButton();
      } else {
        break;
      }
    }

    await addAssetPage.clickCrossButton();
    await assetDetailsPage.enterOriginationReferenceFinanceLease("Test Orig Ref 123");
    await assetDetailsPage.termsOfFinance("36");
    await assetDetailsPage.interestRate("4");
    await assetDetailsPage.enterOriginationReferenceFinanceLease("Test Orig Ref 123");
    await assetDetailsPage.clickCalculateButton();
    // Residual % must yield residual $ ≤ cash price on this build (20% can trip validation vs GST/cash display).
    await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
    await assetDetailsPage.interestRate("4");
    await assetDetailsPage.enterOriginationReferenceFinanceLease("Test Orig Ref 123", true);
    await assetDetailsPage.clickCalculateButton();

    // Add Ons & Accessories — from Asset Details (do **not** click stepper **Next** here; that opens Customer Details).
    // Dynamic insurance cards: per-card No/Yes + 15/100 → 5/500, Save, then refill + final save (skipped when insurance automation off).
    const addOnsAccessoriesPage = new DOAddOnsAccessoriesPage(page);
    await addOnsAccessoriesPage.completeAddOnsValidationScenarioThenRefillWithStandardAmounts();
    // After Add Ons save: Payment Summary Calculate → Edit Payment Schedule (no Initial Lease manipulation).
    await assetDetailsPage.clickPaymentSummaryCalculateButton();
    await assetDetailsPage.editPaymentScheduleListViewFixedResetCalculateApply();

    await assetDetailsPage.enterOriginationReferenceFinanceLease("Test Orig Ref 123");
    await assetDetailsPage.clickNextButtonFinanceLease("Test Orig Ref 123");
    await assetDetailsPage.waitForAddBorrowerButton();
    await assetDetailsPage.clickAddBorrowerorGuarantorButton();
    await assetDetailsPage.searchByDropdownClick();
    await assetDetailsPage.selectUDCSelectOption();
    await assetDetailsPage.enterUDCCustomerNumber("420");
    await assetDetailsPage.clickSearchButton();
    await assetDetailsPage.clickAddNewCustomerButton();
    const businessDetailsPage = new DOBusinessDetailsPage(page);
    const addressDetailsPage = new DOAddressDetailsPage(page);
    const financialPositionPage = new DOFinancialPositionPage(page);
    const referenceDetailsPage = new DOReferenceDetailsPage(page);
    await businessDetailsPage.waitForBusinessDetailsStep();

    // ---- FL: Business Details blank validation ----
    await businessDetailsPage.selectOrganisationType("");
    await businessDetailsPage.enterLegalName("");
    await businessDetailsPage.enterTradingName("");
    await businessDetailsPage.enterRegisteredCompanyNumber("");
    await businessDetailsPage.enterNzBusinessNumber("");
    await businessDetailsPage.enterGstNumber("");
    await businessDetailsPage.fillBusinessDescription("");
    await businessDetailsPage.selectPrimaryNatureOfBusiness("");
    await businessDetailsPage.selectSourceOfWealth("");
    await businessDetailsPage.enterTimeInBusiness("", "");
    await businessDetailsPage.enterBusinessAreaCode("");
    await businessDetailsPage.enterBusinessPhoneNumber("");
    await businessDetailsPage.enterBusinessEmail("");

    await businessDetailsPage.clickNextButton();
    await businessDetailsPage.expectBusinessDetailsRequiredValidationMessages();

    // ---- FL: Business Details invalid format validation ----
    await businessDetailsPage.selectOrganisationType("Incorporated Body");
    await businessDetailsPage.enterLegalName("Test Legal Entity Ltd");
    await businessDetailsPage.enterTradingName("Test Trading");
    await businessDetailsPage.enterRegisteredCompanyNumber("jk!");
    await businessDetailsPage.enterNzBusinessNumber("12");
    await businessDetailsPage.enterGstNumber("xx");
    await businessDetailsPage.fillBusinessDescription(
      "Automation test — wholesale trade sample description.",
    );
    await businessDetailsPage.selectPrimaryNatureOfBusiness(
      "0113 Vegetable Growing",
    );
    await businessDetailsPage.selectSourceOfWealth("Business Activity");
    await businessDetailsPage.enterTimeInBusiness("5", "3");
    await businessDetailsPage.enterBusinessAreaCode("9");
    await businessDetailsPage.enterBusinessPhoneNumber("ioi900");
    await businessDetailsPage.enterBusinessEmail("jkbhbu");

    await businessDetailsPage.clickNextButton();
    await businessDetailsPage.expectBusinessDetailsInvalidFormatValidationMessages();

    // Replace invalid values + legal (company) name if build shows "This field cannot be blank" on Legal Company Name.
    await businessDetailsPage.enterLegalName("Test Legal Entity Ltd");
    await businessDetailsPage.enterRegisteredCompanyNumber("1234567");
    await businessDetailsPage.enterNzBusinessNumber("9429031234567");
    await businessDetailsPage.enterGstNumber("12345678");
    await businessDetailsPage.enterBusinessPhoneNumber("0211234567");
    await businessDetailsPage.enterBusinessEmail("liza.doe@example.com");
    await businessDetailsPage.clickNextButton();
    await addressDetailsPage.waitForPhysicalAddressStep();

    // ---- FL: Address Details — Physical (blank required fields) ----
    await addressDetailsPage.timeAtAddress("", "");
    await addressDetailsPage.enterStreetNumber("");
    await addressDetailsPage.enterStreetName("");
    await addressDetailsPage.enterCity("");
    await addressDetailsPage.touchPhysicalResidenceTypeWithoutSelection();
    await addressDetailsPage.clickSaveAddressDetails();
    await addressDetailsPage.expectPhysicalAddressRequiredValidationMessages();

    // Physical Address — valid data (same sequence as CSA_QuickQuote_SingleFlow.test.ts § Physical Address).
    await addressDetailsPage.timeAtAddress("1", "1");
    await addressDetailsPage.enterStreetNumber("123");
    await addressDetailsPage.enterStreetName("Main Street");
    await addressDetailsPage.enterCity("Wellington");
    await addressDetailsPage.chooseCountry("New Zealand");
    await addressDetailsPage.selectResidenceTypeIfPresent("Boarding");

    // Reuse for Postal Address → Yes (click once if toggle starts on No) — CSA line 485.
    await addressDetailsPage.clickReuseForPostalAddressToggle();

    // FL business (Financelease.test.ts): register reuse Yes + overseas No when shown.
    await page.waitForTimeout(150);
    await addressDetailsPage.ensureReuseForRegisterAddressYes();

    // Previous Physical Address — explicit empty / Save / assert when section exists (CSA lines 488–496).
    if (await addressDetailsPage.isPreviousPhysicalAddressVisible(5_000)) {
      await addressDetailsPage.previousTimeAtAddress("", "");
      await addressDetailsPage.enterPreviousStreetNumber("");
      await addressDetailsPage.enterPreviousStreetName("");
      await addressDetailsPage.enterPreviousCity("");
      await addressDetailsPage.touchPreviousPhysicalResidenceTypeWithoutSelection();
      await addressDetailsPage.clickSaveAddressDetails();
      await addressDetailsPage.expectPreviousPhysicalAddressRequiredValidationMessages();
    }

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
    await financialPositionPage.waitForFinancialPositionStep();

    // ---- FL: Profit declaration **No** → **Yes** (radio smoke), then **Next**; optional validation (fast) ----
    // Profit declaration: **No** then **Yes** — confirms radios respond before continuing.
    await financialPositionPage.selectBusinessNetProfitLastYearNo();
    await page.waitForTimeout(200);
    await financialPositionPage.selectBusinessNetProfitLastYearYes();
    await page.waitForTimeout(300);
    await financialPositionPage.expectFinancialPositionRequiredValidationMessages({
      optional: true,
      timeoutMs: 4_000,
    });

    // ---- FL: Net Profit = Yes, but all amounts = $0.00 ----
    // await financialPositionPage.fillBusinessNetProfitLastYear("$0.00");
    // await financialPositionPage.fillBusinessTurnoverLatestYear("$0.00", "31/03/2025");
    // await financialPositionPage.fillBusinessCashBalance("$0.00", "31/03/2025");
    // await financialPositionPage.clickNextButton();
    // await financialPositionPage.expectFinancialPositionNetProfitLastYearAmountGreaterThanZeroValidation();
    
    // ---- IMPORTANT: Clear / overwrite fields with valid data now ----
    // No waitForFinancialPositionStep() here — we're already on it!
    // No selectBusinessNetProfitLastYearYes() again — it's already Yes!
    await financialPositionPage.fillBusinessNetProfitLastYear("50000");
    await financialPositionPage.fillBusinessTurnoverLatestYear("500000", "31/03/2025");
    await financialPositionPage.fillBusinessCashBalance("10000", "31/03/2025");
    await financialPositionPage.clickNextButton();

    // Reference Details — add contact, confirm, submit
    await referenceDetailsPage.waitForReferenceDetailsStep();
    await referenceDetailsPage.clickAddContactDetails();
    await referenceDetailsPage.selectContactType("Accountant");
    await referenceDetailsPage.enterContactFirstName("Alex");
    await referenceDetailsPage.enterContactLastName("Referee");
    await referenceDetailsPage.clickAddContactInModal();
    // Reference: assert “Please confirm…” when **Submit** is used without the checkbox, then tick and advance.
    await referenceDetailsPage.expectConfirmCustomerDetailsCheckboxRequiredValidation();
    await referenceDetailsPage.confirmCustomerDetailsCorrect();
    await referenceDetailsPage.advanceFromReferenceDetailsToPostSubmission();

    const customerQuotePostSubmitPage = new DOCustomerQuotePostSubmitPage(page);

    await customerQuotePostSubmitPage.waitForUploadStep();

    // Notes: existing cards show author + date | time; >1000 chars rejected; exactly 1000 saves; list truncates with **More**.
    await customerQuotePostSubmitPage.expectExistingNoteCardsShowAuthorAndTimestamp();
    await customerQuotePostSubmitPage.expectOversizedNoteRejectedOnSubmit();
    await customerQuotePostSubmitPage.submitNoteOfExactLengthFromDialog(1000);
    await customerQuotePostSubmitPage.expectNoteListShowsMoreForLongSavedNote();

    // Upload tab: .jpg + .pdf succeed; >20 MB rejected; Preview (new tab); Download starts on upload tab.
    // Document tile deletion is skipped for this FL regression (not part of the workflow under test).
    await customerQuotePostSubmitPage.uploadJpgThenPdfExpectBothVisible();
    await customerQuotePostSubmitPage.expectOversizeBinaryUploadRejected();
    await customerQuotePostSubmitPage.expectUploadTabPreviewOpensNewTab();
    await customerQuotePostSubmitPage.expectUploadTabDownloadStarts();

    /* eslint-disable no-console -- Post Submission: pinpoint failing step (FL regression) */
    const debugStep = async (name: string, action: () => Promise<void>): Promise<void> => {
      console.log(`START: ${name}`);
      try {
        await action();
        console.log(`END: ${name}`);
      } catch (err) {
        console.error("FAILED AT:", name, err);
        throw err;
      }
    };

    await debugStep("openDocumentsTab", () =>
      customerQuotePostSubmitPage.openDocumentsTab(),
    );
    await debugStep("selectCustomerQuoteBasicRow", () =>
      customerQuotePostSubmitPage.selectCustomerQuoteBasicRow(),
    );
    await debugStep("clickDownload", () => customerQuotePostSubmitPage.clickDownload());
    await debugStep("confirmDocumentParameters", () =>
      customerQuotePostSubmitPage.confirmDocumentParameters(),
    );
    await debugStep("workflowWithdrawThenCancelExpectOpenQuoteStatus", () =>
      customerQuotePostSubmitPage.workflowWithdrawThenCancelExpectOpenQuoteStatus(),
    );

    await debugStep("ensureUploadTab", () =>
      customerQuotePostSubmitPage.ensureUploadTab(),
    );
    await page.keyboard.press("Escape").catch(() => {});
    await debugStep("addNoteAndSubmit", () =>
      customerQuotePostSubmitPage.addNoteAndSubmit(
        "Automated sanity note — Finance Lease Standard Quote.",
      ),
    );
    await debugStep("submitQuoteThroughWorkflowDeclaration", () =>
      customerQuotePostSubmitPage.submitQuoteThroughWorkflowDeclaration(),
    );
    /* eslint-enable no-console */
  },
);



