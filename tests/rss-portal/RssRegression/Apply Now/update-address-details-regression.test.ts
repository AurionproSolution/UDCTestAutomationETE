/**
 * RSS Regression — Apply Now / Update Address Details (URP-T184)
 * Zephyr: /RSS Regression Suite/Apply Now/Update Address Details
 * Source: RSS Apply Now Regression Test Cases.xlsx
 *
 * When current address time is less than 3 years, Previous Address Details must show.
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

test.describe("RSS Portal — Apply Now Update Address Details @rss @regression", () => {
  test(
    "URP-T184 - Apply Now - Check if the Previous Address Details section is visible or not",
    { tag: ["@rss", "@regression", "@URP-T184"] },
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

      await customerDetails.expectAddressDetailsSectionVisible();
      await customerDetails.setCurrentAddressTimeAtAddress("1", "0");
      await customerDetails.expectPreviousAddressDetailsVisible(true);
    },
  );
});
