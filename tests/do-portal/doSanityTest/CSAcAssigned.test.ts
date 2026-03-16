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
import doLoginData from "../../../testData/do-portal/loginData.json";

let loginPage: DOLoginPage;
let dashboardPage: DODashboardPage;
let assetDetailsPage: DOAssetDetailsPage;

test.describe("DO Portal - CSAC Assigned - Sanity @do @smoke", () => {
  test.beforeEach(async ({ page }) => {
    loginPage = new DOLoginPage(page);
    dashboardPage = new DODashboardPage(page);
    assetDetailsPage = new DOAssetDetailsPage(page);
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
  });
});
