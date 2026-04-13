/**
 * DO Portal - CSAC Assigned Sanity Tests
 * E2E tests for verifying CSAC assigned functionality
 */

import { test } from "@playwright/test";
import {
  DOAssetDetailsPage,
  DODashboardPage,
  DOLoginPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOAddressDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/addressDetails";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import doLoginData from "../../../testData/do-portal/loginData.json";

let loginPage: DOLoginPage;
let dashboardPage: DODashboardPage;
let addAssetPage: DOAddAssetPage;
let assetDetailsPage: DOAssetDetailsPage;
let personalDetailsPage: DOPersonalDetailsPage;
let addressDetailsPage: DOAddressDetailsPage;
test.describe("DO Portal - CSAC Assigned - Sanity @do @smoke", () => {
  test.beforeEach(async ({ page }) => {
    loginPage = new DOLoginPage(page);
    dashboardPage = new DODashboardPage(page);
    addAssetPage = new DOAddAssetPage(page);
    assetDetailsPage = new DOAssetDetailsPage(page);
    personalDetailsPage = new DOPersonalDetailsPage(page);
    addressDetailsPage = new DOAddressDetailsPage(page);
  });
  test("CSAC Assigned - Create Standard Quote", async () => {
    await loginPage.navigate("https://testportaludc.aurionpro.com/");
    await loginPage.loginWithTestData(doLoginData.validUsers[0]);
    await dashboardPage.clickCreateStandardQuote();
    await dashboardPage.selectCSAproduct();
    await assetDetailsPage.chooseProduct("CSA-C-Assigned");
    await assetDetailsPage.chooseProgram("CSA Personal - MV Dealer");
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
    await assetDetailsPage.termsOfFinance("36");
    await assetDetailsPage.interestRate("5");
    await assetDetailsPage.clickCalculateButton();
    await assetDetailsPage.interestRate("5");
    await assetDetailsPage.clickCalculateButton();
    await assetDetailsPage.clickNextButton();
    await assetDetailsPage.clickAddBorrowerorGuarantorButton();
    await assetDetailsPage.searchByDropdownClick();
    await assetDetailsPage.selectUDCSelectOption();
    await assetDetailsPage.enterUDCCustomerNumber("420");
    await assetDetailsPage.clickSearchButton();
    await assetDetailsPage.clickAddNewCustomerButton();
    await personalDetailsPage.chooseTitle("Dame");
    await personalDetailsPage.enterFirstName("Liza");
    await personalDetailsPage.enterLastName("Doe");
    await personalDetailsPage.chooseGender("Female");
    // await personalDetailsPage.enterDateOfBirth("01/01/1980");
    await personalDetailsPage.chooseMarritalStatus("Married");
    await personalDetailsPage.chooseNoOfDependents("2");
    await personalDetailsPage.enterMobileNumber("0211234567");
    await personalDetailsPage.enterEmail("liza.doe@example.com");
    await personalDetailsPage.chooseLicenceType("Full Licence");
    await personalDetailsPage.chooseCountryOfIssue("New Zealand");
    await personalDetailsPage.enterLicenceNumber("DD234567");
    await personalDetailsPage.enterVersionNumber("24");
    await personalDetailsPage.chooseNewZealandResident("Yes");
    await personalDetailsPage.chooseCountryOfBirth("New Zealand");
    await personalDetailsPage.chooseCountryOfCitizenship("New Zealand");
    await personalDetailsPage.clickNextButton();
    await addressDetailsPage.timeAtAddress("1", "1");
    await addressDetailsPage.enterStreetNumber("123");
    await addressDetailsPage.enterStreetName("Main Street");
    await addressDetailsPage.enterCity("Wellington");
    await addressDetailsPage.chooseCountry("New Zealand");
  });
});
