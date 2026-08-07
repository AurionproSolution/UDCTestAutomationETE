/**
 * RSS Sanity — Apply Now Individual (URP-T79 – URP-T81)
 * Zephyr: /RSS Sanity Suite/Apply Now/Individual
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
  APPLY_NOW_ASSET_CAR_OR_VAN,
  APPLY_NOW_ASSET_CAR_OR_VAN_SECOND,
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

test.describe("RSS Portal — Apply Now Individual @rss @sanity", () => {
  test("URP-T79 - Apply Now - Single application with multi-assets and Purchase through a Dealership flow @smoke", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const dashboard = new RSSDashboardPage(page);
    const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
    const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
    const customerDetails = new RSSApplyNowCustomerDetailsPage(page);
    const documents = new RSSApplyNowApplicationDocumentsPage(page);

    await openApplyNow(dashboard, howCanWeHelp);
    await howCanWeHelp.clickIndividual();
    await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);

    await assetPage.fillMultipleCarOrVanAssets([
      APPLY_NOW_ASSET_CAR_OR_VAN,
      APPLY_NOW_ASSET_CAR_OR_VAN_SECOND,
    ]);
    await assetPage.expectTotalPurchasePriceInRepayment(/100[, ]?000/i);

    await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
    await customerDetails.selectApplicantType("single");
    await customerDetails.fillMandatoryCustomerSections();
    await customerDetails.completeIndividualFinancialPosition();
    await customerDetails.clickApplyNowFooterNext();

    await completeDocumentsAndSubmit(documents, APPLY_NOW_NOTES);
  });

  test("URP-T80 - Apply Now - Joint application with Existing Co-borrower and Conditional approval flow @smoke", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const dashboard = new RSSDashboardPage(page);
    const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
    const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
    const customerDetails = new RSSApplyNowCustomerDetailsPage(page);
    const documents = new RSSApplyNowApplicationDocumentsPage(page);

    await openApplyNow(dashboard, howCanWeHelp);
    await howCanWeHelp.clickIndividual();
    await howCanWeHelp.selectConditionalApproval();
    await howCanWeHelp.expectConditionalApprovalSelected();

    await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
    await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);

    await customerDetails.selectApplicantType("joint");
    await customerDetails.fillMandatoryCustomerSections();
    await customerDetails.completeIndividualFinancialPosition();
    await customerDetails.clickBorrowerFooterAction();
    await customerDetails.expectCoBorrowerSelectionScreen();
    await customerDetails.selectFirstExistingPartyFromDropdown();
    await customerDetails.completeCoBorrowerJointDetails();
    await customerDetails.clickApplyNowFooterNext();

    await completeDocumentsAndSubmit(documents, APPLY_NOW_NOTES);
  });

  test("URP-T81 - Apply Now - Joint application with New Co-borrower and Others flow @smoke", async ({
    page,
  }) => {
    test.setTimeout(900_000);

    const dashboard = new RSSDashboardPage(page);
    const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
    const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
    const customerDetails = new RSSApplyNowCustomerDetailsPage(page);
    const documents = new RSSApplyNowApplicationDocumentsPage(page);

    await openApplyNow(dashboard, howCanWeHelp);
    await howCanWeHelp.clickIndividual();
    await howCanWeHelp.selectOthers();
    await howCanWeHelp.expectOthersSelected();
    await howCanWeHelp.fillPleaseTellUs(APPLY_NOW_OTHERS_REASON);

    await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
    await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);

    await customerDetails.selectApplicantType("joint");
    await customerDetails.fillMandatoryCustomerSections();
    await customerDetails.completeIndividualFinancialPosition();
    await customerDetails.clickBorrowerFooterAction();
    await customerDetails.expectCoBorrowerSelectionScreen();
    await customerDetails.clickAddNewBorrowerOrCoBorrower();
    await customerDetails.fillNewPartyPersonalDetails(APPLY_NOW_NEW_PARTY);
    await customerDetails.clickApplyNowFooterNext();

    await completeDocumentsAndSubmit(documents, APPLY_NOW_NOTES);
  });
});
