/**
 * RSS Regression — Apply Now / Update Employment Details (URP-T185)
 * Zephyr: /RSS Regression Suite/Apply Now/Update Employment Details
 * Source: RSS Apply Now Regression Test Cases.xlsx
 *
 * When current employment time is less than 3 years, Previous Employment Details must show.
 * When current employment time is 3 years or more, Previous Employment Details must be hidden.
 */

import { test } from "../../../../fixtures/rssPortalTest";
import {
  RSSApplyNowCustomerDetailsPage,
  RSSApplyNowDealershipAssetRepaymentPage,
  RSSApplyNowHowCanWeHelpIndividualPage,
  RSSDashboardPage,
} from "../../../../pages";
import { APPLY_NOW_ASSET_CAR_OR_VAN } from "../../../../testData/rss-portal/applyNowData";
import {
  completeDealershipPurchaseFlow,
  completeRepaymentAndGoToCustomerDetails,
  openApplyNow,
} from "./apply-now-regression.helpers";

test.describe("RSS Portal — Apply Now Update Employment Details @rss @regression", () => {
  test(
    "URP-T185 - Apply Now - Check if the Previous Employment Details section is visible or not",
    { tag: ["@rss", "@regression", "@URP-T185"] },
    async ({ page }) => {
      test.setTimeout(600_000);

      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
      await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
      await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);

      await customerDetails.expectEmploymentDetailsSectionVisible();

      // Scenario 2: current employment >= 3 years — Previous Employment must be hidden.
      await customerDetails.setCurrentEmploymentTimeWithEmployer("4", "0");
      await customerDetails.expectPreviousEmploymentDetailsVisible(false);

      // Scenario 1: current employment < 3 years — Previous Employment must be visible.
      await customerDetails.setCurrentEmploymentTimeWithEmployer("1", "0");
      await customerDetails.expectPreviousEmploymentDetailsVisible(true);
    },
  );
});
