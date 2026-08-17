/**
 * Shared helpers for RSS Sanity document-upload tests (URP-T180, URP-T199, URP-T216).
 */

import {
  RSSApplyNowApplicationDocumentsPage,
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
} from "../apply-now/apply-now.helpers";

/** Apply Now Individual — navigate through customer details to the Application documents step. */
export async function openApplyNowIndividualDocumentsStep(
  dashboard: RSSDashboardPage,
  howCanWeHelp: RSSApplyNowHowCanWeHelpIndividualPage,
  assetPage: RSSApplyNowDealershipAssetRepaymentPage,
  customerDetails: RSSApplyNowCustomerDetailsPage,
  documents: RSSApplyNowApplicationDocumentsPage,
): Promise<void> {
  await openApplyNow(dashboard, howCanWeHelp);
  await howCanWeHelp.clickIndividual();
  await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
  await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
  await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
  await customerDetails.selectApplicantType("single");
  await customerDetails.fillMandatoryCustomerSections();
  await customerDetails.completeIndividualFinancialPosition();
  await customerDetails.clickApplyNowFooterNext();
  await documents.waitForApplicationDocumentsStep();
}
