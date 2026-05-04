/**
 * DO Portal - CSAC Assigned Sanity Tests
 * E2E tests for verifying CSAC assigned functionality
 */

import { test } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAssetDetailsPage,
  DOBusinessDetailsPage,
  DOCustomerQuotePostSubmitPage,
  DODashboardPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOAddressDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/addressDetails";
import { DOEmploymentDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/employmentDetails";
import { DOFinancialPositionPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/financialPosition";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import { DOReferenceDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/referenceDetails";
let dashboardPage: DODashboardPage;
let addAssetPage: DOAddAssetPage;
let assetDetailsPage: DOAssetDetailsPage;
let businessDetailsPage: DOBusinessDetailsPage;
let addressDetailsPage: DOAddressDetailsPage;
let employmentDetailsPage: DOEmploymentDetailsPage;
let financialPositionPage: DOFinancialPositionPage;
let referenceDetailsPage: DOReferenceDetailsPage;
let customerQuotePostSubmitPage: DOCustomerQuotePostSubmitPage;
let personalDetailsPage: DOPersonalDetailsPage;

test.describe("DO Portal - CSAC Assigned - Sanity @do @smoke", () => {
  test.beforeEach(async ({ page }) => {
    dashboardPage = new DODashboardPage(page);
    addAssetPage = new DOAddAssetPage(page);
    assetDetailsPage = new DOAssetDetailsPage(page);
    businessDetailsPage = new DOBusinessDetailsPage(page);
    addressDetailsPage = new DOAddressDetailsPage(page);
    employmentDetailsPage = new DOEmploymentDetailsPage(page);
    financialPositionPage = new DOFinancialPositionPage(page);
    referenceDetailsPage = new DOReferenceDetailsPage(page);
    customerQuotePostSubmitPage = new DOCustomerQuotePostSubmitPage(page);
    personalDetailsPage = new DOPersonalDetailsPage(page);
  });
  test("CSAB Assigned - Create Standard Quote", async ({ page }) => {
    test.setTimeout(360000);
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
    await dashboardPage.clickCreateStandardQuote();
    await dashboardPage.selectCSAproduct();
    await assetDetailsPage.chooseProduct("CSA-B-Assigned");
    await assetDetailsPage.chooseProgram("Webform - CSA Business - MV Dealer");
    await assetDetailsPage.enterOriginationReference("Test Orig Ref 123");
    await assetDetailsPage.enterAsset("Car and Light Commercial /");
    await assetDetailsPage.selectCondition("Used");
    await assetDetailsPage.openAssetInsuranceTradeInSummary();
    await assetDetailsPage.clickAssetSummaryEditButton();
    await addAssetPage.enterAssetValue("$10,0000");
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
    await assetDetailsPage.enterOriginationReference("Test Orig Ref 123");
    await assetDetailsPage.termsOfFinance("36");
    await assetDetailsPage.interestRate("4");
    await assetDetailsPage.clickCalculateButton();
    await assetDetailsPage.interestRate("4");
    await assetDetailsPage.clickCalculateButton();
    await assetDetailsPage.clickNextButton();
    await assetDetailsPage.waitForAddBorrowerButton();
    await assetDetailsPage.clickAddBorrowerorGuarantorButton();
    await assetDetailsPage.searchByDropdownClick();
    await assetDetailsPage.selectUDCSelectOption();
    await assetDetailsPage.enterUDCCustomerNumber("420");
    await assetDetailsPage.clickSearchButton();
    await assetDetailsPage.clickAddNewCustomerButton();
    await businessDetailsPage.waitForBusinessDetailsStep();
    await businessDetailsPage.selectOrganisationType("Incorporated Body");
    await businessDetailsPage.enterLegalName("Test Legal Entity Ltd");
    await businessDetailsPage.enterTradingName("Test Trading");
    await businessDetailsPage.enterRegisteredCompanyNumber("1234567");
    await businessDetailsPage.enterNzBusinessNumber("9429031234567");
    await businessDetailsPage.enterGstNumber("12-345-678");
    await businessDetailsPage.fillBusinessDescription(
      "Automation test — wholesale trade sample description.",
    );
    await businessDetailsPage.selectPrimaryNatureOfBusiness(
      "0113 Vegetable Growing",
    );
    await businessDetailsPage.selectSourceOfWealth("Business Activity");
    await businessDetailsPage.enterTimeInBusiness("5", "3");
    await businessDetailsPage.enterBusinessAreaCode("9");
    await businessDetailsPage.enterBusinessPhoneNumber("0211234567");
    // Optional 2nd arg: page.locator("…") from Selector Hub if the built-in Email label chain fails.
    await businessDetailsPage.enterBusinessEmail("liza.doe@example.com");
    await businessDetailsPage.clickNextButton();
    await addressDetailsPage.waitForPhysicalAddressStep();
    // Physical Address — then reuse toggles (CSA-B: register reuse = Yes skips Registered + Previous Physical blocks).
    await addressDetailsPage.timeAtAddress("1", "1");
    await addressDetailsPage.enterStreetNumber("123");
    await addressDetailsPage.enterStreetName("Main Street");
    await addressDetailsPage.enterCity("Wellington");
    await addressDetailsPage.chooseCountry("New Zealand");
    // Reuse for Postal Address → Yes (scoped to business physical card when present).
    await addressDetailsPage.clickReuseForPostalAddressToggle();
    await page.waitForTimeout(400);
    // Reuse for Register Address → Yes: reuses physical for registered address; Previous Physical / Registered Address are usually hidden.
    await addressDetailsPage.ensureReuseForRegisterAddressYes();

    // Previous Physical Address — `app-previous-address` or CSA-B `p-card`/`gen-card` under `app-business-address-details`.
    await addressDetailsPage.ensureOverseasAddressNoIfPreviousPhysicalVisible();
    await addressDetailsPage.fillPreviousPhysicalRequiredIfPresent({
      years: "1",
      months: "1",
      streetNumber: "45",
      streetName: "Queen Street",
      city: "Wellington",
      country: "New Zealand",
    });
    // Postal Address — only when a separate postal block is required (e.g. postal reuse No).
    // await addressDetailsPage.fillPostalAddressPostalTypeTextareaAndCountry({
    //   addressLine: "Navimumbai",
    //   country: "Afghanistan",
    // });

    await addressDetailsPage.clickNextButton();

    // Financial Position — Liabilities, Income, Expenditure, income-decrease radios, Essential Outgoings
    await financialPositionPage.waitForFinancialPositionStep();
    await financialPositionPage.selectBusinessNetProfitLastYearYes();
    await financialPositionPage.fillBusinessNetProfitLastYear("$50000.00");
    await financialPositionPage.fillBusinessTurnoverLatestYear(
      "$500000.00",
      "31/03/2025",
    );
    // await financialPositionPage.fillBusinessTurnoverPreviousYear(
    //   "$450000.00",
    //   "31/03/2024",
    // );
    await financialPositionPage.fillBusinessCashBalance(
      "$10000.00",
      "31/03/2025",
    );
    // await financialPositionPage.fillBusinessDebtorBalance("$5000.00", "31/03/2025");
    // await financialPositionPage.fillBusinessCreditorBalance("$3000.00", "31/03/2025");
    // await financialPositionPage.fillBusinessOverdraftBalance("$0.00", "31/03/2025");
    await financialPositionPage.clickNextButton();

    // Reference Details — add contact, confirm, submit
    await referenceDetailsPage.waitForReferenceDetailsStep();
    await referenceDetailsPage.clickAddContactDetails();
    await referenceDetailsPage.selectContactType("Accountant");
    await referenceDetailsPage.enterContactFirstName("Alex");
    await referenceDetailsPage.enterContactLastName("Referee");
    await referenceDetailsPage.clickAddContactInModal();
    await referenceDetailsPage.confirmCustomerDetailsCorrect();
    await referenceDetailsPage.clickSubmitButton();

    await customerQuotePostSubmitPage.waitForUploadStep();
    await customerQuotePostSubmitPage.uploadDocument();
    await customerQuotePostSubmitPage.expectDocumentUploaded();
    await customerQuotePostSubmitPage.openDocumentsTab();
    await customerQuotePostSubmitPage.selectCustomerQuoteBasicRow();
    await customerQuotePostSubmitPage.clickDownload();
    await customerQuotePostSubmitPage.confirmDocumentParameters();
    await customerQuotePostSubmitPage.addNoteAndSubmit(
      "Automated sanity note — CSAC Assigned quote.",
    );
    await customerQuotePostSubmitPage.submitQuoteFromStatusMenu();
    await customerQuotePostSubmitPage.completeOriginatorDeclaration();
  });
});
