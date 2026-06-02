/**
 * DO Portal — Assured Future Value Standard Quote (single run).
 * Dashboard → Create Standard Quote → Assured Future Value → AFV-B-Assigned → Asset Type vehicle picker →
 * Program AFV - B-Distributor → Condition New → Cash Price of Asset → Originator Reference → Interest 4% → First Payment → Calculate.
 * Auth: shared DO `storageState` from `playwright/do-portal-auth.setup.ts` when running under `do-portal-chromium`.
 */

import { expect, test } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAssetDetailsPage,
  DOBusinessDetailsPage,
  DOCustomerQuotePostSubmitPage,
  DODashboardPage,
  DOReferenceDetailsPage,
} from "../../../pages";
import { DOAddressDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/addressDetails";
import { DOFinancialPositionPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/financialPosition";

const AFV_PRODUCT = "AFV-B-Assigned";
const AFV_PROGRAM = "AFV - B-Distributor";
/** Loan Details — Cash Price of Asset (Prime `<amount>`); use {@link DOAssetDetailsPage.cashPriceOfAsset}, not long nth-child chains. */
const AFV_CASH_PRICE = "$25,000";

test(
  "DO Portal - AFV — Assured Future Value → AFV-B-Assigned",
  { tag: ["@do", "@regression"] },
  async ({ page }) => {
    test.setTimeout(600_000);

    const dashboardPage = new DODashboardPage(page);
    const assetDetailsPage = new DOAssetDetailsPage(page);

    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
    await dashboardPage.clickCreateStandardQuote();
    await dashboardPage.selectAssuredFutureValueProduct();

    const standardRoot = page.locator("app-quote-details, app-standard-quote").first();
    await expect(standardRoot).toBeVisible({ timeout: 120_000 });

    await assetDetailsPage.waitForAssetDetailsStepReady();
    await assetDetailsPage.chooseProduct(AFV_PRODUCT);
    await expect(standardRoot.getByText(AFV_PRODUCT).first()).toBeVisible({ timeout: 30_000 });

    await assetDetailsPage.selectVehicleFromAssetTypeModal({
      make: "SUZUKI",
      model: "IGNIS",
      variant: "GLX MANUAL 1.2P/ 5MT",
      year: "2024",
    });

    await page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(() => {});
    await page.waitForTimeout(800);

    await assetDetailsPage.chooseProgram(AFV_PROGRAM);
    await expect(standardRoot.getByText(AFV_PROGRAM).first()).toBeVisible({ timeout: 30_000 });

    await page.waitForTimeout(500);
    await assetDetailsPage.selectConditionInStandardQuote("New");
    await assetDetailsPage.cashPriceOfAsset(AFV_CASH_PRICE);

    await assetDetailsPage.enterOriginationReference("Test Orig Ref AFV 001");
    await assetDetailsPage.interestRate("4");
    await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
    await assetDetailsPage.clickCalculateButton();
    await assetDetailsPage.clickNextButton();
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
        await addressDetailsPage.selectResidenceType("Boarding");
    
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
