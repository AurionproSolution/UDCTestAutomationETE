/**
 * Shared helpers for RSS Apply Now cross-system regression (URP-T134).
 */

import {
  RSSApplyNowApplicationDocumentsPage,
  RSSApplyNowCustomerDetailsPage,
  RSSApplyNowDealershipAssetRepaymentPage,
  RSSApplyNowHowCanWeHelpIndividualPage,
  RSSDashboardPage,
  RSSLoansPage,
} from "../../../../pages";
import { APPLY_NOW_ASSET_CAR_OR_VAN } from "../../../../testData/rss-portal/applyNowData";
import {
  completeDealershipPurchaseFlow,
  completeRepaymentAndGoToCustomerDetails,
  openApplyNow,
} from "./apply-now-regression.helpers";

export async function createIndividualApplyNowDraftWithUploadedDocument(
  dashboard: RSSDashboardPage,
  howCanWeHelp: RSSApplyNowHowCanWeHelpIndividualPage,
  assetPage: RSSApplyNowDealershipAssetRepaymentPage,
  customerDetails: RSSApplyNowCustomerDetailsPage,
  documents: RSSApplyNowApplicationDocumentsPage,
): Promise<{ quoteId: string; uploadedDocumentName: string }> {
  await dashboard.clickOverviewIfNeeded();
  await dashboard.expectOverviewTabSelected();
  const draftQuoteIdsBefore = await dashboard.readVisibleDraftQuoteIds();

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
  const uploadedDocumentName = documents.uploadedDocumentNameHint();
  await documents.uploadSupportingDocument();
  await documents.confirmLegalAcknowledgements();
  await documents.clickSubmit();

  let quoteId = "";
  try {
    quoteId = await documents.readCreatedQuoteIdFromConfirmation();
  } catch (error) {
    await documents.dismissApplyNowSubmissionSuccessDialog();
    quoteId = await dashboard.resolveNewDraftQuoteId(draftQuoteIdsBefore);
    if (!quoteId) {
      throw error;
    }
  }

  return { quoteId, uploadedDocumentName };
}

export async function openDraftQuoteDocumentsAndExpectUploadedFile(
  dashboard: RSSDashboardPage,
  loans: RSSLoansPage,
  quoteId: string,
  uploadedDocumentName: string,
): Promise<void> {
  await dashboard.clickDraftQuoteById(quoteId);
  await loans.waitForContractDetailScreen();
  await loans.expectUploadedDocumentVisible(uploadedDocumentName);
}
