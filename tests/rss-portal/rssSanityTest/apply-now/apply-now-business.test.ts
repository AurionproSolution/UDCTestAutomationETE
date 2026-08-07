/**
 * RSS Sanity — Apply Now Business (URP-T82 – URP-T84)
 * Zephyr: /RSS Sanity Suite/Apply Now/Business
 * Source: Rss Apply Now Test cases.xlsx
 */

import { test } from "../../../../fixtures/rssPortalTest";
import {
  RSSApplyNowApplicationDocumentsPage,
  RSSApplyNowCustomerDetailsPage,
  RSSApplyNowDealershipAssetRepaymentPage,
  RSSApplyNowHowCanWeHelpIndividualPage,
  RSSDashboardPage,
} from "../../../../pages";
import {
  APPLY_NOW_ASSET_CAR_OR_LIGHT_COMMERCIAL,
  APPLY_NOW_ASSET_CAR_OR_LIGHT_COMMERCIAL_SECOND,
  APPLY_NOW_BUSINESS_NET_PROFIT_LAST_YEAR_USD,
  APPLY_NOW_BUSINESS_PROFIT_LAST_YEAR,
  APPLY_NOW_NEW_PARTY,
  APPLY_NOW_NOTES,
  APPLY_NOW_OTHERS_REASON,
} from "../../../../testData/rss-portal/applyNowData";
import {
  completeDealershipPurchaseFlow,
  completeDocumentsAndSubmit,
  completeRepaymentAndGoToCustomerDetails,
  openApplyNow,
} from "./apply-now.helpers";

test.describe("RSS Portal — Apply Now Business @rss @sanity", () => {
  test("URP-T82 - Apply Now - Sole Trader application with multi-assets and Purchase through a Dealership flow @smoke", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const dashboard = new RSSDashboardPage(page);
    const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
    const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
    const customerDetails = new RSSApplyNowCustomerDetailsPage(page);
    const documents = new RSSApplyNowApplicationDocumentsPage(page);

    await openApplyNow(dashboard, howCanWeHelp);
    await howCanWeHelp.clickBusiness();
    await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);

    await assetPage.fillMultipleCarOrLightCommercialAssets([
      APPLY_NOW_ASSET_CAR_OR_LIGHT_COMMERCIAL,
      APPLY_NOW_ASSET_CAR_OR_LIGHT_COMMERCIAL_SECOND,
    ]);
    await assetPage.expectTotalPurchasePriceInRepayment(/150[, ]?000/i);

    await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
    await customerDetails.selectBusinessType("sole trader");
    await customerDetails.fillMandatoryCustomerSections({ includeBusinessDetails: true });
    await customerDetails.completeBusinessFinancialPosition(
      APPLY_NOW_BUSINESS_PROFIT_LAST_YEAR,
      APPLY_NOW_BUSINESS_NET_PROFIT_LAST_YEAR_USD,
    );
    await customerDetails.completeExistingGuarantorFlow();
    await customerDetails.clickApplyNowFooterNext();

    await completeDocumentsAndSubmit(documents, APPLY_NOW_NOTES);
  });

  test("URP-T83 - Apply Now - Limited Company with Existing Guarantor and Conditional approval flow @smoke", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const dashboard = new RSSDashboardPage(page);
    const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
    const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
    const customerDetails = new RSSApplyNowCustomerDetailsPage(page);
    const documents = new RSSApplyNowApplicationDocumentsPage(page);

    await openApplyNow(dashboard, howCanWeHelp);
    await howCanWeHelp.clickBusiness();
    await howCanWeHelp.selectConditionalApproval();
    await howCanWeHelp.expectConditionalApprovalSelected();

    await assetPage.fillCarOrLightCommercialAssetRow(APPLY_NOW_ASSET_CAR_OR_LIGHT_COMMERCIAL);
    await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);

    await customerDetails.selectBusinessType("limited company");
    await customerDetails.fillMandatoryCustomerSections({ includeBusinessDetails: true });
    await customerDetails.completeBusinessFinancialPosition(
      APPLY_NOW_BUSINESS_PROFIT_LAST_YEAR,
      APPLY_NOW_BUSINESS_NET_PROFIT_LAST_YEAR_USD,
    );
    await customerDetails.completeExistingGuarantorFlow();
    await customerDetails.clickApplyNowFooterNext();

    await completeDocumentsAndSubmit(documents, APPLY_NOW_NOTES);
  });

  test("URP-T84 - Apply Now - Limited Company with New Guarantor and Others flow @smoke", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const dashboard = new RSSDashboardPage(page);
    const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
    const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
    const customerDetails = new RSSApplyNowCustomerDetailsPage(page);
    const documents = new RSSApplyNowApplicationDocumentsPage(page);

    await openApplyNow(dashboard, howCanWeHelp);
    await howCanWeHelp.clickBusiness();
    await howCanWeHelp.selectOthers();
    await howCanWeHelp.expectOthersSelected();
    await howCanWeHelp.fillPleaseTellUs(APPLY_NOW_OTHERS_REASON);

    await assetPage.fillCarOrLightCommercialAssetRow(APPLY_NOW_ASSET_CAR_OR_LIGHT_COMMERCIAL);
    await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);

    await customerDetails.selectBusinessType("limited company");
    await customerDetails.fillMandatoryCustomerSections({ includeBusinessDetails: true });
    await customerDetails.completeBusinessFinancialPosition(
      APPLY_NOW_BUSINESS_PROFIT_LAST_YEAR,
      APPLY_NOW_BUSINESS_NET_PROFIT_LAST_YEAR_USD,
    );
    await customerDetails.completeNewGuarantorFlow(APPLY_NOW_NEW_PARTY);
    await customerDetails.clickApplyNowFooterNext();

    await completeDocumentsAndSubmit(documents, APPLY_NOW_NOTES);
  });
});
