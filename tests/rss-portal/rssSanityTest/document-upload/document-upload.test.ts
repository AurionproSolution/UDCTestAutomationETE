/**
 * RSS Sanity — Document Upload (URP-T180, URP-T199, URP-T216)
 * Zephyr: /RSS Sanity Suite
 *
 * Portal-wide upload validation (size, file type) and document upload on
 * service / variation requests.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { expect, test } from "../../../../fixtures/rssPortalTest";
import {
  RSSApplyNowApplicationDocumentsPage,
  RSSApplyNowCustomerDetailsPage,
  RSSApplyNowDealershipAssetRepaymentPage,
  RSSApplyNowHowCanWeHelpIndividualPage,
  RSSDashboardPage,
  RSSLoansPage,
  RSS_DEFAULT_SERVICE_REQUEST_UPLOAD_PDF,
  RSSServiceRequestPage,
  RSSSideMenuPage,
  RSSVariationRequestPage,
} from "../../../../pages";
import { openActiveLoanForServiceRequest } from "../active-loan.helpers";
import { openApplyNowIndividualDocumentsStep } from "./document-upload.helpers";

async function openCreateRequestScreen(
  dashboard: RSSDashboardPage,
  sideMenu: RSSSideMenuPage,
  serviceRequest: RSSServiceRequestPage,
): Promise<void> {
  expect(await dashboard.isDashboardLoaded()).toBe(true);
  await sideMenu.clickDrawerMenuItem("Create Request");
  await serviceRequest.expectServiceRequestScreen();
}

test.describe("RSS Portal — Document Upload @rss @sanity", () => {
  test("URP-T180 - Check 20mb size limit for Individual documents @smoke", async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const dashboard = new RSSDashboardPage(page);
    const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
    const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
    const customerDetails = new RSSApplyNowCustomerDetailsPage(page);
    const documents = new RSSApplyNowApplicationDocumentsPage(page);

    const oversizedPath = path.join(os.tmpdir(), `rss-sanity-urp-t180-21mb-${Date.now()}.pdf`);
    fs.writeFileSync(oversizedPath, Buffer.alloc(21 * 1024 * 1024, 0));

    try {
      await openApplyNowIndividualDocumentsStep(
        dashboard,
        howCanWeHelp,
        assetPage,
        customerDetails,
        documents,
      );
      await documents.expectOversizedFileRejected(oversizedPath);
    } finally {
      fs.unlinkSync(oversizedPath);
    }
  });

  test("URP-T199 - Upload document on service and variation requests @smoke", async ({
    page,
  }) => {
    test.setTimeout(600_000);

    const dashboard = new RSSDashboardPage(page);
    const sideMenu = new RSSSideMenuPage(page);
    const serviceRequest = new RSSServiceRequestPage(page);
    const loans = new RSSLoansPage(page);
    const variation = new RSSVariationRequestPage(page);

    await openCreateRequestScreen(dashboard, sideMenu, serviceRequest);
    await serviceRequest.selectCategory(/Experiencing Financial Difficulty/i);
    await serviceRequest.expectExperiencingFinancialDifficultyFormVisible();
    await serviceRequest.fillExperiencingFinancialDifficultyForm(
      `Automation URP-T199 financial difficulty ${Date.now()}`,
    );
    await serviceRequest.uploadFinancialDifficultyDocument(RSS_DEFAULT_SERVICE_REQUEST_UPLOAD_PDF);
    await serviceRequest.expectUploadedDocumentVisible("exportedPDFFile");
    await serviceRequest.submitServiceRequest();
    await serviceRequest.expectSubmissionConfirmation();
    await serviceRequest.clickViewMyRequest();
    await serviceRequest.expectMyRequestsWithListedRequest();

    await openActiveLoanForServiceRequest(dashboard, loans);
    await loans.openVariationRequestFromLoan();
    await variation.expectVariationRequestScreen();
    await variation.completeCategoryFlow("Variation Request", {
      note: `Automation URP-T199 variation ${Date.now()}`,
      preferredContactMethod: /Email/i,
      uploadDocumentPath: RSS_DEFAULT_SERVICE_REQUEST_UPLOAD_PDF,
    });
    await variation.expectUploadedDocumentVisible("exportedPDFFile");
    await variation.submitVariationRequest();
    await variation.expectSubmissionConfirmation();
    await variation.clickViewMyRequest();
    await variation.expectMyRequestsWithListedRequest();
  });

  test("URP-T216 - Check file type to be uploaded from the portal @smoke", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const sideMenu = new RSSSideMenuPage(page);
    const serviceRequest = new RSSServiceRequestPage(page);

    const invalidPath = path.join(os.tmpdir(), `rss-sanity-urp-t216-invalid-${Date.now()}.exe`);
    fs.writeFileSync(invalidPath, "invalid upload");

    try {
      await openCreateRequestScreen(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Experiencing Financial Difficulty/i);
      await serviceRequest.expectExperiencingFinancialDifficultyFormVisible();
      await serviceRequest.uploadFinancialDifficultyDocument(invalidPath);
      await serviceRequest.expectUploadValidationError(
        /file type|not acceptable|not allowed|invalid|supported/i,
      );
    } finally {
      fs.unlinkSync(invalidPath);
    }
  });
});
