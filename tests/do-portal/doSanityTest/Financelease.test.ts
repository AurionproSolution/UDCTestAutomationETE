/**
 * DO Portal — Finance Lease sanity (mirrors CSA flow: origination, terms, two Calculates, Next).
 */

import { test } from "@playwright/test";
import {
  DOAssetDetailsPage,
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
let personalDetailsPage: DOPersonalDetailsPage;
let addressDetailsPage: DOAddressDetailsPage;
let employmentDetailsPage: DOEmploymentDetailsPage;
let financialPositionPage: DOFinancialPositionPage;
let referenceDetailsPage: DOReferenceDetailsPage;
let customerQuotePostSubmitPage: DOCustomerQuotePostSubmitPage;

test.describe("DO Portal - Finance Lease - Sanity @do @smoke", () => {
  test.beforeEach(async ({ page }) => {
    loginPage = new DOLoginPage(page);
    dashboardPage = new DODashboardPage(page);
    addAssetPage = new DOAddAssetPage(page);
    assetDetailsPage = new DOAssetDetailsPage(page);
    personalDetailsPage = new DOPersonalDetailsPage(page);
    addressDetailsPage = new DOAddressDetailsPage(page);
    employmentDetailsPage = new DOEmploymentDetailsPage(page);
    financialPositionPage = new DOFinancialPositionPage(page);
    referenceDetailsPage = new DOReferenceDetailsPage(page);
    customerQuotePostSubmitPage = new DOCustomerQuotePostSubmitPage(page);
  });

  test("Finance Lease - Create Standard Quote", async () => {
    test.setTimeout(360000);
    await loginPage.navigate("https://testportaludc.aurionpro.com/");
    await loginPage.loginWithTestData(doLoginData.validUsers[0]);
    await dashboardPage.clickCreateStandardQuote();
    await dashboardPage.selectFinanceLeaseProduct();
    await assetDetailsPage.chooseProduct("Finance Lease - Business Asg");
    await assetDetailsPage.chooseProgram("Finance Lease Business - MV Dealer");
    await assetDetailsPage.enterOriginationReference("Test Orig Ref 123");
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
    await addAssetPage.clickCrossButton();
    await assetDetailsPage.termsOfFinance("36");
    await assetDetailsPage.interestRate("4");
    await assetDetailsPage.clickCalculateButton();
    await assetDetailsPage.interestRate("4");
    await assetDetailsPage.enterOriginationReference("Test Orig Ref 123");
    await assetDetailsPage.clickCalculateButton();
    await assetDetailsPage.clickNextButton();
    await assetDetailsPage.waitForAddBorrowerButton();
    await assetDetailsPage.clickAddBorrowerorGuarantorButton();
    await assetDetailsPage.searchByDropdownClick();
    await assetDetailsPage.selectUDCSelectOption();
    await assetDetailsPage.enterUDCCustomerNumber("420");
    await assetDetailsPage.clickSearchButton();
    await assetDetailsPage.clickAddNewCustomerButton();
    // await personalDetailsPage.chooseTitle("Dame");
    // await personalDetailsPage.enterFirstName("Liza");
    // await personalDetailsPage.enterMiddleName("Marie");
    // await personalDetailsPage.enterLastName("Doe");
    // await personalDetailsPage.chooseGender("Female");
    // await personalDetailsPage.enterDateOfBirth("01/01/1980");
    // await personalDetailsPage.chooseMarritalStatus("Married");
    // await personalDetailsPage.chooseNoOfDependents("2");
    // await personalDetailsPage.fillDependantsAgesInYears(["8", "12"]);
    // await personalDetailsPage.enterMobileNumber("0211234567");
    // await personalDetailsPage.enterEmail("liza.doe@example.com");
    // await personalDetailsPage.chooseLicenceType("Full Licence");
    // await personalDetailsPage.chooseCountryOfIssue("New Zealand");
    // await personalDetailsPage.enterLicenceNumber("DL000123");
    // await personalDetailsPage.enterVersionNumber("244");
    // await personalDetailsPage.chooseNewZealandResident("Yes");
    // await personalDetailsPage.chooseCountryOfBirth("New Zealand");
    // await personalDetailsPage.chooseCountryOfCitizenship("New Zealand");
    // await personalDetailsPage.clickNextButton();
    // await addressDetailsPage.waitForPhysicalAddressStep();
    // await addressDetailsPage.timeAtAddress("1", "1");
    // await addressDetailsPage.enterStreetNumber("123");
    // await addressDetailsPage.enterStreetName("Main Street");
    // await addressDetailsPage.enterCity("Wellington");
    // await addressDetailsPage.chooseCountry("New Zealand");
    // await addressDetailsPage.selectResidenceType("Boarding");

    // await addressDetailsPage.fillPreviousPhysicalRequiredIfPresent({
    //   years: "1",
    //   months: "1",
    //   streetNumber: "45",
    //   streetName: "Queen Street",
    //   city: "Wellington",
    //   country: "New Zealand",
    // });
    // await addressDetailsPage.fillPostalAddressPostalTypeTextareaAndCountry({
    //   addressLine: "Navimumbai",
    //   country: "Afghanistan",
    // });
    // await addressDetailsPage.clickNextButton();

    // (Business / Financial Accounts step removed for now — use DOBusinessFinancialAccountsPage from businessFinancialAccounts.ts when needed.)

    // await employmentDetailsPage.waitForEmploymentDetailsStep();
    // await employmentDetailsPage.enterCurrentEmployerName("Acme Finance Ltd");
    // await employmentDetailsPage.selectCurrentOccupation("Accountant");
    // await employmentDetailsPage.selectCurrentEmploymentType("Full Time Employed");
    // await employmentDetailsPage.enterCurrentTimeWithEmployer("3", "8");
    // await employmentDetailsPage.clickNextButton();

    // await financialPositionPage.waitForFinancialPositionStep();
    // await financialPositionPage.fillFirstLiabilityBalanceAndAmount("$500000.00", "$2500.00");
    // await financialPositionPage.setFirstLiabilityRowFrequencyMonthly();
    // await financialPositionPage.fillFirstIncomeAmount("$5000.00");
    // await financialPositionPage.setIncomeFrequencyMonthly();
    // await financialPositionPage.selectIncomeLikelyToDecreaseNo();
    // await financialPositionPage.fillFirstExpenditureAmount("$200.00");
    // await financialPositionPage.setExpenditureFrequencyMonthly();
    // await financialPositionPage.selectEssentialOutgoingTypeLifestyle();
    // await financialPositionPage.fillEssentialOutgoingAmount("$150.00");
    // await financialPositionPage.setEssentialOutgoingFrequencyMonthly();
    // await financialPositionPage.clickNextButton();

    // await referenceDetailsPage.waitForReferenceDetailsStep();
    // await referenceDetailsPage.clickAddContactDetails();
    // await referenceDetailsPage.selectContactType("Accountant");
    // await referenceDetailsPage.enterContactFirstName("Alex");
    // await referenceDetailsPage.enterContactLastName("Referee");
    // await referenceDetailsPage.clickAddContactInModal();
    // await referenceDetailsPage.confirmCustomerDetailsCorrect();
    // await referenceDetailsPage.clickSubmitButton();

    // await customerQuotePostSubmitPage.waitForUploadStep();
    // await customerQuotePostSubmitPage.uploadDocument();
    // await customerQuotePostSubmitPage.expectDocumentUploaded();
    // await customerQuotePostSubmitPage.openDocumentsTab();
    // await customerQuotePostSubmitPage.selectCustomerQuoteBasicRow();
    // await customerQuotePostSubmitPage.clickDownload();
    // await customerQuotePostSubmitPage.confirmDocumentParameters();
    // await customerQuotePostSubmitPage.addNoteAndSubmit(
    //   "Automated sanity note — Finance Lease quote.",
    // );
    // await customerQuotePostSubmitPage.submitQuoteFromStatusMenu();
    // await customerQuotePostSubmitPage.completeOriginatorDeclaration();
  });
});
