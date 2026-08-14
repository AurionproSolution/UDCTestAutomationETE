/**
 * RSS Regression — Apply Now cross-system / AF checks (URP-T131–T136, URP-T170–T178)
 * Zephyr: /RSS Regression Suite/Apply Now
 * Source: RSS Apply Now Regression Test Cases.xlsx
 *
 * URP-T134 verifies uploaded Apply Now documents on the created draft quote Documents tab.
 * Remaining cases require FIS Enterprise or Application Form (AF) verification outside RSS portal UI.
 */

import { test } from "../../../../fixtures/rssPortalTest";
import {
  RSSApplyNowApplicationDocumentsPage,
  RSSApplyNowCustomerDetailsPage,
  RSSApplyNowDealershipAssetRepaymentPage,
  RSSApplyNowHowCanWeHelpIndividualPage,
  RSSDashboardPage,
  RSSLoansPage,
} from "../../../../pages";
import {
  createIndividualApplyNowDraftWithUploadedDocument,
  openDraftQuoteDocumentsAndExpectUploadedFile,
} from "./apply-now-cross-system-regression.helpers";

test.describe("RSS Portal — Apply Now cross-system @rss @regression", () => {
  test.fixme(
    "URP-T131 - Apply Now - Notes for New Co-Borrower added",
    { tag: ["@rss", "@regression", "@URP-T131"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T132 - Apply Now - Notes for New Guarantor added",
    { tag: ["@rss", "@regression", "@URP-T132"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T133 - Apply Now - Contract Submission Task",
    { tag: ["@rss", "@regression", "@URP-T133"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test(
    "URP-T134 - Apply Now - Documents Upload visible on Loans tab after submit",
    { tag: ["@rss", "@regression", "@URP-T134"] },
    async ({ page }) => {
      test.setTimeout(900_000);

      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);
      const documents = new RSSApplyNowApplicationDocumentsPage(page);
      const loans = new RSSLoansPage(page);

      const { quoteId, uploadedDocumentName } =
        await createIndividualApplyNowDraftWithUploadedDocument(
          dashboard,
          howCanWeHelp,
          assetPage,
          customerDetails,
          documents,
        );

      await openDraftQuoteDocumentsAndExpectUploadedFile(
        dashboard,
        loans,
        quoteId,
        uploadedDocumentName,
      );
    },
  );

  test.fixme(
    "URP-T135 - Apply Now - Update AplyId Verification mode on FIS Enterprise party",
    { tag: ["@rss", "@regression", "@URP-T135"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T136 - Apply Now - Email notification DPR for Purchase through a Dealership",
    { tag: ["@rss", "@regression", "@URP-T136"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T170 - Apply Now - Update Personal Details reflected in AF",
    { tag: ["@rss", "@regression", "@URP-T170"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T171 - Apply Now - Update Current Address Details reflected in AF",
    { tag: ["@rss", "@regression", "@URP-T171"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T172 - Apply Now - Update Current Employment Details reflected in AF",
    { tag: ["@rss", "@regression", "@URP-T172"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T173 - Apply Now - Update Financial Position reflected in AF",
    { tag: ["@rss", "@regression", "@URP-T173"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T174 - Apply Now - Update Business Details reflected in AF",
    { tag: ["@rss", "@regression", "@URP-T174"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T175 - Apply Now - Update Previous Address Details reflected in AF",
    { tag: ["@rss", "@regression", "@URP-T175"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T176 - Apply Now - Update Postal/Street Address Details reflected in AF",
    { tag: ["@rss", "@regression", "@URP-T176"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T177 - Apply Now - Update Registered Address Details reflected in AF",
    { tag: ["@rss", "@regression", "@URP-T177"] },
    async () => {
      test.setTimeout(900_000);
    },
  );

  test.fixme(
    "URP-T178 - Apply Now - Update Previous Employment Details reflected in AF",
    { tag: ["@rss", "@regression", "@URP-T178"] },
    async () => {
      test.setTimeout(900_000);
    },
  );
});
