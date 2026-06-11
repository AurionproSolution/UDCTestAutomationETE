/**
 * DO Portal — UDP-2640 Recommended Retail Price when cycling Condition (sanity)
 *
 * Source: JIRA UDP-2640
 * https://aurionprofintechsolutions.atlassian.net/browse/UDP-2640
 *
 * On the Asset Details step: set Condition New, fill Recommended Retail Price, change to Used (RRP hides),
 * change back to New — RRP must show **$0.00** (no stale value).
 */

import { expect, test } from "@fixtures/doPortalTest";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOAssetDetailsPage, DODashboardPage } from "../../../pages";

test.describe("DO Portal - UDP-2640 RRP / Condition - Sanity @do @sanity", () => {
  let dashboardPage: DODashboardPage;
  let assetDetailsPage: DOAssetDetailsPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DODashboardPage(page);
    assetDetailsPage = new DOAssetDetailsPage(page);
  });

  test("UDP-2640 - RRP resets to $0.00 after Condition Used → New on Asset Details", async ({
    page,
  }) => {
    test.setTimeout(300000);

    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
    await dashboardPage.clickCreateStandardQuote();
    await dashboardPage.selectFinanceLeaseProduct();
    await assetDetailsPage.chooseProduct("Finance Lease - Business Asg");
    await assetDetailsPage.chooseProgram("Finance Lease Business - MV Dealer");
    await assetDetailsPage.enterOriginationReference("Test UDP-2640");
    await assetDetailsPage.enterAsset("Car and Light Commercial /");
    await assetDetailsPage.selectCondition("New");

    const rrp = assetDetailsPage.recommendedRetailPriceInput;
    await assetDetailsPage.scrollRecommendedRetailPriceIntoView();
    await expect(rrp).toBeVisible({ timeout: 30_000 });
    await assetDetailsPage.fillRecommendedRetailPrice("1000001");

    await assetDetailsPage.selectCondition("Used");
    await expect(rrp).toBeHidden({ timeout: 15_000 });

    await assetDetailsPage.selectCondition("New");
    await assetDetailsPage.scrollRecommendedRetailPriceIntoView();
    await expect(rrp).toBeVisible({ timeout: 30_000 });

    const raw = (await rrp.inputValue()).trim().replace(/\s/g, "");
    expect(raw).toMatch(/^\$?0\.00$/);
  });
});
