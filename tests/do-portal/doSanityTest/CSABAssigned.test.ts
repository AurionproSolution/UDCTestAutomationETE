/**
 * DO Portal - CSAC Assigned Sanity Tests
 * E2E tests for verifying CSAC assigned functionality
 */

import { test } from "@playwright/test";
import {
  DOAssetDetailsPage,
  DOBusinessDetailsPage,
  DOCustomerQuotePostSubmitPage,
  DODashboardPage,
  DOLoginPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOAddressDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/addressDetails";
import { DOEmploymentDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/employmentDetails";
import { DOFinancialPositionPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/financialPosition";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import { DOReferenceDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/referenceDetails";
import doLoginData from "../../../testData/do-portal/loginData.json";

let loginPage: DOLoginPage;
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
    loginPage = new DOLoginPage(page);
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
  test("CSAC Assigned - Create Standard Quote", async ({ page }) => {
    test.setTimeout(360000);
    await loginPage.navigate("https://testportaludc.aurionpro.com/");
    await loginPage.loginWithTestData(doLoginData.validUsers[0]);
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
    // Physical Address
    await addressDetailsPage.timeAtAddress("1", "1");
    await addressDetailsPage.enterStreetNumber("123");
    await addressDetailsPage.enterStreetName("Main Street");
    await addressDetailsPage.enterCity("Wellington");
    await addressDetailsPage.chooseCountry("New Zealand");
    // Reuse for Postal Address → Yes (click once if toggle starts on No)
    await addressDetailsPage.clickReuseForPostalAddressToggle();
    // CSA-B: “Reuse for Register Address” — call when the flow should share the same address (optional).
    // await addressDetailsPage.clickReuseForRegisterAddressToggle();

    // Previous Physical Address — skipped automatically when `app-previous-address` is not shown for this product.
    await addressDetailsPage.fillPreviousPhysicalRequiredIfPresent({
      years: "1",
      months: "1",
      streetNumber: "45",
      streetName: "Queen Street",
      city: "Wellington",
      country: "New Zealand",
    });
    // Postal Address — Postal type, freeform textarea, Country (reuse is toggled off inside the helper if needed)
    await addressDetailsPage.fillPostalAddressPostalTypeTextareaAndCountry({
      addressLine: "Navimumbai",
      country: "Afghanistan",
    });


    // Postal Address — only when Reuse is No: clickPostalStreetType, fillPostalSearch, enterPostal*, choosePostalCountry

    await addressDetailsPage.clickNextButton();

    // Financial Position — Liabilities, Income, Expenditure, income-decrease radios, Essential Outgoings
    await financialPositionPage.waitForFinancialPositionStep();
    await financialPositionPage.fillFirstLiabilityBalanceAndAmount("$500000.00", "$2500.00");
    await financialPositionPage.setFirstLiabilityRowFrequencyMonthly();
    await financialPositionPage.fillFirstIncomeAmount("$5000.00");
    await financialPositionPage.setIncomeFrequencyMonthly();
    await financialPositionPage.selectIncomeLikelyToDecreaseNo();
    await financialPositionPage.fillFirstExpenditureAmount("$200.00");
    await financialPositionPage.setExpenditureFrequencyMonthly();
    await financialPositionPage.selectEssentialOutgoingTypeLifestyle();
    await financialPositionPage.fillEssentialOutgoingAmount("$150.00");
    await financialPositionPage.setEssentialOutgoingFrequencyMonthly();
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