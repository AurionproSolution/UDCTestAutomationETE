/**
 * DO Portal — Operating Lease Standard Quote regression (single Playwright test, single run).
 * Contract flow mirrors `FinanceLease_SingleFlow.test.ts` from Asset Details onward; entry is Standard Quote only (no Quick Quote).
 * Auth: `do-regression-chromium` depends on `doSanity.auth.setup.ts` (storageState).
 */

import { expect, test } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAssetDetailsPage,
  DOBusinessDetailsPage,
  DODashboardPage,
  DOReferenceDetailsPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOAddressDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/addressDetails";
import { DOCustomerQuotePostSubmitPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/customerQuotePostSubmit";
import { DOFinancialPositionPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/financialPosition";

const OL_PRODUCT = "Operating Lease - Business Asg";
const OL_PROGRAM = "Operating Lease Business - MV Dealer";

test(
  "DO Portal - Operating Lease — regression (single run)",
  { tag: ["@regression"] },
  async ({ page }) => {
    test.setTimeout(1_200_000);

    const dashboardPage = new DODashboardPage(page);
    const assetDetailsPage = new DOAssetDetailsPage(page);
    const addAssetPage = new DOAddAssetPage(page);

    // -------------------------------------------------------------------------
    // Dashboard → Create Standard Quote (no Quick Quote)
    // -------------------------------------------------------------------------
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
    await dashboardPage.clickCreateStandardQuote();

    const productDialog = page.getByRole("dialog");
    if (await productDialog.isVisible({ timeout: 8_000 }).catch(() => false)) {
      const olOption = productDialog.getByText(/Operating\s*Lease/i).first();
      await olOption.waitFor({ state: "attached", timeout: 15_000 });
      await olOption.click();
    }

    const standardRoot = page.locator("app-quote-details, app-standard-quote").first();
    await expect(standardRoot).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/Operating\s*Lease|Lease/i).first()).toBeVisible();

    await assetDetailsPage.waitForAssetDetailsStepReady();
    await assetDetailsPage.chooseProduct(OL_PRODUCT);
    await assetDetailsPage.chooseProgram(OL_PROGRAM);

    // -------------------------------------------------------------------------
    // Asset Details (OL): same path as `FinanceLease_SingleFlow.test.ts` / `Financelease.test.ts`
    // -------------------------------------------------------------------------
    await assetDetailsPage.enterOriginationReferenceFinanceLease("Test Orig Ref 123");
    await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();

    await assetDetailsPage.enterAsset("Car and Light Commercial /");
    await assetDetailsPage.selectCondition("Used");
    await assetDetailsPage.openAssetInsuranceTradeInSummary();
    await assetDetailsPage.clickAssetSummaryEditButton();
    await addAssetPage.enterAssetValue("$10,000");
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
    const assetWizardCostOrTypeError = page.getByText(
      /AssetType|Supply more property|Cost of Asset minimum|greater than 0|cannot be greater than|ServiceBusinessException/i,
    );
    for (let repair = 0; repair < 2; repair++) {
      if (await assetWizardCostOrTypeError.first().isVisible({ timeout: 4_000 }).catch(() => false)) {
        await addAssetPage.enterAssetValue("$10,000");
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
    await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
    await assetDetailsPage.interestRate("4");
    await assetDetailsPage.enterOriginationReferenceFinanceLease("Test Orig Ref 123", true);
    await assetDetailsPage.clickCalculateButton();

    await assetDetailsPage.enterOriginationReferenceFinanceLeaseStable("Test Orig Ref 123");
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

    // ---- Business Details blank validation ----
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

    // ---- Business Details invalid format validation ----
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

    await businessDetailsPage.enterLegalName("Test Legal Entity Ltd");
    await businessDetailsPage.enterRegisteredCompanyNumber("1234567");
    await businessDetailsPage.enterNzBusinessNumber("9429031234567");
    await businessDetailsPage.enterGstNumber("12345678");
    await businessDetailsPage.enterBusinessPhoneNumber("0211234567");
    await businessDetailsPage.enterBusinessEmail("liza.doe@example.com");
    await businessDetailsPage.clickNextButton();
    await addressDetailsPage.waitForPhysicalAddressStep();

    // ---- Address Details — Physical (blank required fields) ----
    await addressDetailsPage.timeAtAddress("", "");
    await addressDetailsPage.enterStreetNumber("");
    await addressDetailsPage.enterStreetName("");
    await addressDetailsPage.enterCity("");
    await addressDetailsPage.touchPhysicalResidenceTypeWithoutSelection();
    await addressDetailsPage.clickSaveAddressDetails();
    await addressDetailsPage.expectPhysicalAddressRequiredValidationMessages();

    await addressDetailsPage.timeAtAddress("1", "1");
    await addressDetailsPage.enterStreetNumber("123");
    await addressDetailsPage.enterStreetName("Main Street");
    await addressDetailsPage.enterCity("Wellington");
    await addressDetailsPage.chooseCountry("New Zealand");
    await addressDetailsPage.selectResidenceTypeIfPresent("Boarding");

    await addressDetailsPage.clickReuseForPostalAddressToggle();

    await page.waitForTimeout(150);
    await addressDetailsPage.ensureReuseForRegisterAddressYes();

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

    await financialPositionPage.selectBusinessNetProfitLastYearNo();
    await page.waitForTimeout(200);
    await financialPositionPage.selectBusinessNetProfitLastYearYes();
    await page.waitForTimeout(300);
    await financialPositionPage.expectFinancialPositionRequiredValidationMessages({
      optional: true,
      timeoutMs: 4_000,
    });

    await financialPositionPage.fillBusinessNetProfitLastYear("50000");
    await financialPositionPage.fillBusinessTurnoverLatestYear("500000", "31/03/2025");
    await financialPositionPage.fillBusinessCashBalance("10000", "31/03/2025");
    await financialPositionPage.clickNextButton();

    await referenceDetailsPage.waitForReferenceDetailsStep();
    await referenceDetailsPage.clickAddContactDetails();
    await referenceDetailsPage.selectContactType("Accountant");
    await referenceDetailsPage.enterContactFirstName("Alex");
    await referenceDetailsPage.enterContactLastName("Referee");
    await referenceDetailsPage.clickAddContactInModal();
    await referenceDetailsPage.expectConfirmCustomerDetailsCheckboxRequiredValidation();
    await referenceDetailsPage.confirmCustomerDetailsCorrect();
    await referenceDetailsPage.advanceFromReferenceDetailsToPostSubmission();

    const customerQuotePostSubmitPage = new DOCustomerQuotePostSubmitPage(page);

    await customerQuotePostSubmitPage.waitForUploadStep();

    await customerQuotePostSubmitPage.expectExistingNoteCardsShowAuthorAndTimestamp();
    await customerQuotePostSubmitPage.expectOversizedNoteRejectedOnSubmit();
    await customerQuotePostSubmitPage.submitNoteOfExactLengthFromDialog(1000);
    await customerQuotePostSubmitPage.expectNoteListShowsMoreForLongSavedNote();

    await customerQuotePostSubmitPage.uploadJpgThenPdfExpectBothVisible();
    await customerQuotePostSubmitPage.expectOversizeBinaryUploadRejected();
    await customerQuotePostSubmitPage.expectUploadTabPreviewOpensNewTab();
    await customerQuotePostSubmitPage.expectUploadTabDownloadStarts();
    await customerQuotePostSubmitPage.deleteUploadedDocumentTileByBasenameAndExpectRemoved(
      "minimal-upload.jpg",
    );

    await customerQuotePostSubmitPage.openDocumentsTab();
    await customerQuotePostSubmitPage.selectCustomerQuoteBasicRow();
    await customerQuotePostSubmitPage.clickDownload();
    await customerQuotePostSubmitPage.confirmDocumentParameters();

    await customerQuotePostSubmitPage.ensureUploadTab();
    await page.keyboard.press("Escape").catch(() => {});

    await customerQuotePostSubmitPage.addNoteAndSubmit(
      "Automated sanity note — Operating Lease Standard Quote.",
    );
    await customerQuotePostSubmitPage.submitQuoteFromStatusMenu();
    await customerQuotePostSubmitPage.confirmSubmitQuoteDialogIfPresent();
    await customerQuotePostSubmitPage.completeOriginatorDeclaration();
  },
);
