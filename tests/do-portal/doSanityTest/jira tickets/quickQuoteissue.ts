/**
 * DO Portal — UDP-2631 Add Comparison 3 enabled without calculating (sanity)
 *
 * Source: JIRA UDP-2631
 * https://aurionprofintechsolutions.atlassian.net/browse/UDP-2631
 *
 * Expected: Add comparison 3 should not be enabled without calculating quick quote 1 and quick quote 2.
 * After QQ1 is calculated and "Add Comparison 2" adds the second quote block, "Add Comparison 3" must
 * remain disabled until Quick Quote 2 is calculated.
 */

import { expect, test } from "@fixtures/doPortalTest";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../../config/env";
import { DODashboardPage, DOQuickQuotePage } from "../../../../pages";

test.describe("DO Portal - UDP-2631 Quick Quote Add Comparison 3 - Sanity @do @sanity", () => {
  let dashboardPage: DODashboardPage;
  let quickQuotePage: DOQuickQuotePage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DODashboardPage(page);
    quickQuotePage = new DOQuickQuotePage(page);
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
  });

  test("UDP-2631 - Add Comparison 3 disabled until Quick Quote 2 is calculated", async () => {
    test.setTimeout(240000);
    await quickQuotePage.openQuickQuote();
    await quickQuotePage.selectProduct("Finance Lease - Business Asg");
    await quickQuotePage.selectProgram("Finance Lease Business - MV Dealer");
    await quickQuotePage.enterCashPrice("100000");
    await quickQuotePage.enterInterestRatePercent("4");
    await quickQuotePage.enterTermsMonths("36");
    await quickQuotePage.clickCalculate();
    await quickQuotePage.clickAddComparison2();

    await expect(quickQuotePage.addComparison3Button).toBeVisible();
    await expect(quickQuotePage.addComparison3Button).toBeDisabled();
  });
});
