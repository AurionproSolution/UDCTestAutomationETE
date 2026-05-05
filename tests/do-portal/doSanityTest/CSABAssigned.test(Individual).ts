/**
 * DO Portal - CSAB(Individual-SOLE trade customer) Assigned Sanity Tests
 * E2E tests for verifying CSAB(Individual-SOLE trade customer) assigned functionality
 */

import { test } from "@playwright/test";
import {
  DOAssetDetailsPage,
  DOCustomerQuotePostSubmitPage,
  DODashboardPage,
  DOLoginPage,
  DOSoleTraderDetailsPage,
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
let soleTraderDetailsPage: DOSoleTraderDetailsPage;
let addressDetailsPage: DOAddressDetailsPage;
let employmentDetailsPage: DOEmploymentDetailsPage;
let financialPositionPage: DOFinancialPositionPage;
let referenceDetailsPage: DOReferenceDetailsPage;
let customerQuotePostSubmitPage: DOCustomerQuotePostSubmitPage;
let personalDetailsPage: DOPersonalDetailsPage;


test.describe("DO Portal - CSAB Assigned(Individual-SOLE trade customer) - Sanity @do @smoke", () => {
  test.beforeEach(async ({ page }) => {
    loginPage = new DOLoginPage(page);
    dashboardPage = new DODashboardPage(page);
    addAssetPage = new DOAddAssetPage(page);
    assetDetailsPage = new DOAssetDetailsPage(page);
    soleTraderDetailsPage = new DOSoleTraderDetailsPage(page);
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
    await customerQuotePostSubmitPage.selectSearchCustomerIndividualType();
    await assetDetailsPage.searchByDropdownClick();
    await assetDetailsPage.selectUDCSelectOption();
    await assetDetailsPage.enterUDCCustomerNumber("420");
    await assetDetailsPage.clickSearchButton();
    await assetDetailsPage.clickAddNewCustomerButton();
    await soleTraderDetailsPage.waitForSoleTraderBusinessDetailsStep();
    await soleTraderDetailsPage.enterTradingName("Test Trading");
    await soleTraderDetailsPage.enterGstNumber("12345678");
    await soleTraderDetailsPage.fillBusinessDescription(
      "Automation test — wholesale trade sample description.",
    );
    await soleTraderDetailsPage.selectPrimaryNatureOfBusiness(
      "0113 Vegetable Growing",
    );
    await soleTraderDetailsPage.enterTimeInBusiness("5", "3");
    await personalDetailsPage.chooseTitle("Dame");
    await personalDetailsPage.enterFirstName("Liza");
    await personalDetailsPage.enterMiddleName("Marie");
    await personalDetailsPage.enterLastName("Doe");
    await personalDetailsPage.chooseGender("Female");
    await soleTraderDetailsPage.enterDateOfBirth("01/01/1980");
    await personalDetailsPage.chooseMarritalStatus("Married");
    await personalDetailsPage.chooseNoOfDependents("2");
    await personalDetailsPage.fillDependantsAgesInYears(["8", "12"]);
    await soleTraderDetailsPage.enterBusinessAreaCode("9");
    await soleTraderDetailsPage.enterBusinessPhoneNumber("0211234567");
    // Optional 2nd arg: page.locator("…") from Selector Hub if the built-in Email label chain fails.
    await soleTraderDetailsPage.enterBusinessEmail("liza.doe@example.com");
    await personalDetailsPage.chooseLicenceType("Full Licence");
    await personalDetailsPage.chooseCountryOfIssue("New Zealand");
    await personalDetailsPage.enterLicenceNumber("DL000123");
    await personalDetailsPage.enterVersionNumber("244");
    await personalDetailsPage.chooseNewZealandResident("Yes");
    await personalDetailsPage.chooseCountryOfBirth("New Zealand");
    await personalDetailsPage.chooseCountryOfCitizenship("New Zealand");
    await soleTraderDetailsPage.clickNextButton();
    await addressDetailsPage.waitForPhysicalAddressStep();
    // Physical Address — Sole Trader uses `app-sole-trade app-physical-address` (see activePhysicalHost).
    await addressDetailsPage.enterStreetNumber("123");
    await addressDetailsPage.enterStreetName("Main Street");
    await addressDetailsPage.enterCity("Wellington");
    await addressDetailsPage.chooseCountry("New Zealand");
    await addressDetailsPage.timeAtAddress("1", "1");
    await addressDetailsPage.selectResidenceType("Boarding");

    // "Create new and copy to previous Address" (top) vs "Reuse for Postal Address" (Current Physical card).
    await addressDetailsPage.clickCreateNewAndCopyToPreviousAddressToggle();
    await addressDetailsPage.clickReuseForPostalAddressToggle();
    await page.waitForTimeout(400);
    // Reuse for Register Address → Yes: reuses physical for registered address; Previous Physical / Registered Address are usually hidden.
    // await addressDetailsPage.ensureReuseForRegisterAddressYes();

    // Previous Physical Address — `app-previous-address` or CSA-B `p-card`/`gen-card` under `app-business-address-details`.
    // await addressDetailsPage.ensureOverseasAddressNoIfPreviousPhysicalVisible();
    // await addressDetailsPage.fillPreviousPhysicalRequiredIfPresent({
    //   years: "1",
    //   months: "1",
    //   streetNumber: "45",
    //   streetName: "Queen Street",
    //   city: "Wellington",
    //   country: "New Zealand",
    // });
    // Postal Address — only when a separate postal block is required (e.g. postal reuse No).
    // await addressDetailsPage.fillPostalAddressPostalTypeTextareaAndCountry({
    //   addressLine: "Navimumbai",
    //   country: "Afghanistan",
    // });

    await addressDetailsPage.clickNextButton();
    await employmentDetailsPage.waitForEmploymentDetailsStep();
    // Toggle on first so Previous Employment is in the DOM before filling dropdowns that depend on layout.
    // await employmentDetailsPage.turnOnEmploymentDetailsChanged();
    await employmentDetailsPage.enterCurrentEmployerName("Acme Finance Ltd");
    await employmentDetailsPage.selectCurrentOccupation("Accountant");
    await employmentDetailsPage.selectCurrentEmploymentType("Full Time Employed");
    await employmentDetailsPage.enterCurrentTimeWithEmployer("3", "8");
    // await employmentDetailsPage.enterPreviousEmployerName("Prior Employer Ltd");
    // await employmentDetailsPage.selectPreviousOccupation("Accountant");
    // await employmentDetailsPage.selectPreviousEmploymentType("Full Time Employed");
    // await employmentDetailsPage.enterPreviousTimeWithEmployer("1", "0");
    await employmentDetailsPage.clickNextButton();

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
    await financialPositionPage.fillBusinessCashBalance("$10000.00", "31/03/2025");
    // await financialPositionPage.fillBusinessDebtorBalance("$5000.00", "31/03/2025");
    // await financialPositionPage.fillBusinessCreditorBalance("$3000.00", "31/03/2025");
    // await financialPositionPage.fillBusinessOverdraftBalance("$0.00", "31/03/2025");
    // Sole Trader — Personal Statement of Position (assets / liabilities); no-op on non-Sole layouts.
    await financialPositionPage.selectSoleTradeHomeOwnershipType("Joint");
    await financialPositionPage.fillSoleTradeHomeOwnershipAmount("$1000.00");
    await financialPositionPage.fillSoleTradeMortgageRentMonthlyAmount("$500.00");
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