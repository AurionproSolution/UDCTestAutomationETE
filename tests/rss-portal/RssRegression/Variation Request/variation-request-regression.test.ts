/**
 * RSS Regression — Variation Request (URP-T97–T100, URP-T150–T158, URP-T206–T209, URP-T214–T215)
 * Zephyr: /RSS Regression Suite/Variation Request
 * Source: RSS Variation Request Regression Test cases.xlsx
 */

import fs from "fs";
import os from "os";
import path from "path";
import { test } from "../../../../fixtures/rssPortalTest";
import type { VariationRequestCategory } from "../../../../pages";
import {
  RSS_DEFAULT_APPLY_NOW_UPLOAD_PDF, RSSDashboardPage,
  RSSLoansPage,
  RSSVariationRequestPage
} from "../../../../pages";
import { openActiveLoanForServiceRequest } from "../../rssSanityTest/active-loan.helpers";
import { openVariationRequestFromActiveLoan } from "./variation-request-regression.helpers";

async function runVariationMyRequestsFlow(
  dashboard: RSSDashboardPage,
  loans: RSSLoansPage,
  variation: RSSVariationRequestPage,
  category: VariationRequestCategory,
  note: string,
  options?: Parameters<RSSVariationRequestPage["completeCategoryFlow"]>[2],
): Promise<void> {
  await openVariationRequestFromActiveLoan(dashboard, loans, variation);
  await variation.completeCategoryFlow(category, { note, preferredContactMethod: /Email/i }, options);
  await variation.submitVariationRequest();
  await variation.expectSubmissionConfirmation();
  await variation.clickViewMyRequest();
  await variation.expectMyRequestsWithListedRequest();
}

test.describe("RSS Portal — Variation Request @rss @regression", () => {
  test(
    "URP-T97 - Variation request - Update Payment details",
    { tag: ["@rss", "@regression", "@URP-T97"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Update Payment Details", {
        subRequestType: "Change Payment Frequency",
      });
      await variation.expectCategoryDetailFormVisible("Update Payment Details");
    },
  );

  test(
    "URP-T98 - Variation request - Make a Lump Sum Payment",
    { tag: ["@rss", "@regression", "@URP-T98"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Make a Lump Sum Payment");
      await variation.expectCategoryDetailFormVisible("Make a Lump Sum Payment");
    },
  );

  test(
    "URP-T99 - Variation request - Variation Request",
    { tag: ["@rss", "@regression", "@URP-T99"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Variation Request");
      await variation.expectCategoryDetailFormVisible("Variation Request");
    },
  );

  test(
    "URP-T100 - Variation request - Request a Payment Arrangement",
    { tag: ["@rss", "@regression", "@URP-T100"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Request a Payment Arrangement");
      await variation.expectCategoryDetailFormVisible("Request a Payment Arrangement");
    },
  );

  test(
    "URP-T150 - Variation request - Update Payment details - Mandatory field validation",
    { tag: ["@rss", "@regression", "@URP-T150"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Update Payment Details", {
        subRequestType: "Change Payment Frequency",
      });
      await variation.submitAndExpectMandatoryFieldError();
    },
  );

  test(
    "URP-T151 - Variation request - Make a lumpsum Payment - Mandatory field validation",
    { tag: ["@rss", "@regression", "@URP-T151"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Make a Lump Sum Payment");
      await variation.submitAndExpectMandatoryFieldError();
    },
  );

  test(
    "URP-T152 - Variation request - Variation request - Mandatory field validation",
    { tag: ["@rss", "@regression", "@URP-T152"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Variation Request");
      await variation.submitAndExpectMandatoryFieldError();
    },
  );

  test(
    "URP-T153 - Variation request - Variation request - Document upload",
    { tag: ["@rss", "@regression", "@URP-T153"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Variation Request");
      await variation.uploadVariationDocument(RSS_DEFAULT_APPLY_NOW_UPLOAD_PDF);
      await variation.expectUploadedDocumentVisible("exportedPDFFile");
    },
  );

  test(
    "URP-T154 - Variation request - Request a Payment Arrangement - Arrears matches Overdue",
    { tag: ["@rss", "@regression", "@URP-T154"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openActiveLoanForServiceRequest(dashboard, loans);
      const overdue = await loans.getLoanOverdueAmountText();
      await loans.openVariationRequestFromLoan();
      await variation.expectVariationRequestScreen();
      await variation.prepareCategoryDetailForm("Request a Payment Arrangement");
      await variation.expectArrearsAmountMatchesLoanOverdue(overdue);
    },
  );

  test(
    "URP-T155 - Variation request - Request a Payment Arrangement - Mandatory field validation",
    { tag: ["@rss", "@regression", "@URP-T155"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Request a Payment Arrangement");
      await variation.submitAndExpectMandatoryFieldError();
    },
  );

  test(
    "URP-T156 - Variation request - Calendar blocks past dates",
    { tag: ["@rss", "@regression", "@URP-T156"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Update Payment Details", {
        subRequestType: "Change Payment Date",
      });
      await variation.expectCalendarPastDatesDisabled(/New Payment Date/i);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Make a Lump Sum Payment");
      await variation.expectCalendarPastDatesDisabled(/Payment Date/i);

      // await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      // await variation.prepareCategoryDetailForm("Request a Payment Arrangement");
      // await variation.expectCalendarPastDatesDisabled(/Date Of Payment/i);
    },
  );

  test(
    "URP-T157 - Variation request - Preferred contact time disabled for Email",
    { tag: ["@rss", "@regression", "@URP-T157"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Variation Request");
      await variation.fillGenericVariationRequestForm({
        note: `Automation URP-T157 ${Date.now()}`,
      });

      await variation.selectPreferredContactMethod("Phone");
      await variation.selectPreferredContactTime("Morning");
      await variation.selectPreferredContactMethod("Email");
      await variation.expectPreferredContactTimeDisabled();

      await variation.selectPreferredContactMethod("Phone");
      await variation.selectPreferredContactTime("Morning");
      await variation.selectPreferredContactMethod("Email");
      await variation.expectPreferredContactTimeClearedForEmail();
    },
  );

  test(
    "URP-T158 - Variation request - Cancel confirmation pop-up",
    { tag: ["@rss", "@regression", "@URP-T158"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await openVariationRequestFromActiveLoan(dashboard, loans, variation);
      await variation.prepareCategoryDetailForm("Variation Request");
      await variation.fillGenericVariationRequestForm({
        note: `Automation URP-T158 cancel ${Date.now()}`,
      });
      await variation.clickCancelAndExpectUnsavedChangesDialog();

      await variation.unsavedChangesDialog().getByRole("button", { name: /^No$/i }).click();
      await variation.expectCategoryDetailFormVisible("Variation Request");
      await variation.clickCancelAndExpectUnsavedChangesDialog();
    },
  );

  test(
    "URP-T206 - Variation request - Update Payment details - Request visible in My requests",
    { tag: ["@rss", "@regression", "@URP-T206"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await runVariationMyRequestsFlow(
        dashboard,
        loans,
        variation,
        "Update Payment Details",
        `Automation URP-T206 update payment ${Date.now()}`,
        { subRequestType: "Change Payment Frequency" },
      );
    },
  );

  test(
    "URP-T207 - Variation request - Make a Lump Sum Payment - Request visible in My requests",
    { tag: ["@rss", "@regression", "@URP-T207"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await runVariationMyRequestsFlow(
        dashboard,
        loans,
        variation,
        "Make a Lump Sum Payment",
        `Automation URP-T207 lump sum ${Date.now()}`,
      );
    },
  );

  test(
    "URP-T208 - Variation request - Variation Request - Request visible in My requests",
    { tag: ["@rss", "@regression", "@URP-T208"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await runVariationMyRequestsFlow(
        dashboard,
        loans,
        variation,
        "Variation Request",
        `Automation URP-T208 variation ${Date.now()}`,
      );
    },
  );

  test(
    "URP-T209 - Variation request - Request a Payment Arrangement - Request visible in My requests",
    { tag: ["@rss", "@regression", "@URP-T209"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      await runVariationMyRequestsFlow(
        dashboard,
        loans,
        variation,
        "Request a Payment Arrangement",
        `Automation URP-T209 payment arrangement ${Date.now()}`,
      );
    },
  );

  test(
    "URP-T214 - Variation request - Variation Request - 20mb upload size limit",
    { tag: ["@rss", "@regression", "@URP-T214"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      const oversizedFile = path.join(os.tmpdir(), `urp-t214-${Date.now()}.pdf`);
      fs.writeFileSync(oversizedFile, Buffer.alloc(21 * 1024 * 1024, 1));

      try {
        await openVariationRequestFromActiveLoan(dashboard, loans, variation);
        await variation.prepareCategoryDetailForm("Variation Request");
        await variation.uploadVariationDocument(oversizedFile);
        await variation.expectUploadValidationError(/20\s*mb|size|too large|maximum/i);
      } finally {
        fs.unlinkSync(oversizedFile);
      }
    },
  );

  test(
    "URP-T215 - Variation request - Variation Request - Invalid file type rejected",
    { tag: ["@rss", "@regression", "@URP-T215"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const variation = new RSSVariationRequestPage(page);

      const invalidFile = path.join(os.tmpdir(), `urp-t215-invalid-${Date.now()}.exe`);
      fs.writeFileSync(invalidFile, "invalid upload");

      try {
        await openVariationRequestFromActiveLoan(dashboard, loans, variation);
        await variation.prepareCategoryDetailForm("Variation Request");
        await variation.uploadVariationDocument(invalidFile);
        await variation.expectUploadValidationError(
          /file type|not acceptable|not allowed|invalid|supported/i,
        );
      } finally {
        fs.unlinkSync(invalidFile);
      }
    },
  );
});
