/**
 * RSS Regression — Loans (URP-T111–T121, URP-T163–T166, URP-T218–T220)
 * Zephyr: /RSS Regression Suite/Loans
 * Source: RSS Loan Regression Test Cases.xlsx
 *
 * Precondition: header party **Rss Test User** must have at least one loan/quote.
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import type { Download } from "@playwright/test";
import { RSSDashboardPage, RSSLoansPage } from "../../../../pages";
import { openLoansForRssTestUser } from "./loans-regression.helpers";

function expectCsvDownload(download: Download): void {
  const filename = download.suggestedFilename().toLowerCase();
  expect(filename.endsWith(".csv") || filename.endsWith(".xlsx")).toBe(true);
}

test.describe("RSS Portal — Loans @rss @regression", () => {
  test(
    "URP-T111 - Loans - Loans dropdown",
    { tag: ["@rss", "@regression", "@URP-T111"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.expectLoansDropdownVisible();
      await loans.expectLoansDropdownShowsPartyLoanSections();
    },
  );

  test(
    "URP-T112 - Loans - Loan Summary",
    { tag: ["@rss", "@regression", "@URP-T112"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.expectAssetDetailsTabSelected();
      await loans.expectLoanSummaryPanelVisible();
    },
  );

  test(
    "URP-T113 - Loans - Asset Details",
    { tag: ["@rss", "@regression", "@URP-T113"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.expectAssetDetailsFieldsVisible();
    },
  );

  test(
    "URP-T114 - Loans - Get Valuation",
    { tag: ["@rss", "@regression", "@URP-T114"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.expectAssetDetailsFieldsVisible();
      await loans.clickGetValuation();
      await loans.expectValuationBandsVisible();
    },
  );

  test(
    "URP-T115 - Loans - Transactions List",
    { tag: ["@rss", "@regression", "@URP-T115"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("transactions");
      await loans.expectTransactionsSectionsVisible();
      await loans.expectTransactionsTableColumnsVisible();
    },
  );

  test(
    "URP-T116 - Loans - Payment Schedule",
    { tag: ["@rss", "@regression", "@URP-T116"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("transactions");
      await loans.expandPaymentScheduleAccordion();
      await loans.expectPaymentSummaryTableVisible();
      await loans.clickPaymentScheduleToggle();
      await loans.expectPaymentScheduleTableVisible();
    },
  );

  test(
    "URP-T117 - Loans - Documents List",
    { tag: ["@rss", "@regression", "@URP-T117"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("documents");
      await loans.expectDocumentsTabActionsVisible();
      await loans.expectDocumentsListOrEmptyState();
    },
  );

  test(
    "URP-T118 - Loans - Document Preview",
    { tag: ["@rss", "@regression", "@URP-T118"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("documents");
      if (!(await loans.hasDocumentRows())) {
        test.skip(true, "Precondition: loan must have uploaded documents for preview.");
      }
      await loans.expectDocumentPreviewOpensNewTab();
    },
  );

  test(
    "URP-T119 - Loans - Document download",
    { tag: ["@rss", "@regression", "@URP-T119"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("documents");
      if (!(await loans.hasDocumentRows())) {
        test.skip(true, "Precondition: loan must have uploaded documents for download.");
      }
      const checkbox = page.locator("app-documents input[type='checkbox']").first();
      await expect(checkbox).toBeVisible({ timeout: 15_000 });
      await checkbox.check();
      const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
      await page
        .locator("gen-button.documents-btn button, .documents-btn button")
        .filter({ hasText: /^Download$/i })
        .first()
        .click();
      const download = await downloadPromise;
      expect(download.suggestedFilename().length).toBeGreaterThan(0);
    },
  );

  test(
    "URP-T120 - Loans - Download Transactions",
    { tag: ["@rss", "@regression", "@URP-T120"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("transactions");
      await loans.expectTransactionsSectionsVisible();
      const download = await loans.clickDownloadInTransactionsSection();
      expectCsvDownload(download);
    },
  );

  test(
    "URP-T121 - Loans - Generate Statement",
    { tag: ["@rss", "@regression", "@URP-T121"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("documents");
      await loans.expectDocumentsTabActionsVisible();
      await loans.clickGenerateStatement();
      await loans.expectGenerateStatementDateRangeVisible();
    },
  );

  test(
    "URP-T163 - Loans - Transactions - Filters/Sorting of the field columns",
    { tag: ["@rss", "@regression", "@URP-T163"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("transactions");
      await loans.expectTransactionsTableColumnsVisible();
      const table = loans.transactionsTable();
      await loans.sortTableColumn(table, /^Date\b/i);
      await loans.expectTableDateColumnSorted(table, 0, "asc");
      await loans.sortTableColumn(table, /^Date\b/i);
      await loans.expectTableDateColumnSorted(table, 0, "desc");
      await loans.openTableColumnFilter(table, /^Description\b/i);
      await loans.expectTableColumnFilterMatchOptions([
        /Starts\s*with/i,
        /Contains/i,
        /Not\s*contains/i,
        /Ends\s*with/i,
        /Equals/i,
        /Not\s*equals/i,
      ]);
      await page.keyboard.press("Escape").catch(() => undefined);
    },
  );

  test(
    "URP-T164 - Loans - Payment summary and Payment schedule - Filters/Sorting of the field columns",
    { tag: ["@rss", "@regression", "@URP-T164"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("transactions");
      await loans.expandPaymentScheduleAccordion();
      await loans.expectPaymentSummaryTableVisible();
      const summaryTable = loans.paymentSummaryTable();
      await loans.sortTableColumn(summaryTable, /^Date\b/i);
      await loans.expectTableDateColumnSorted(summaryTable, 0, "asc");
      await loans.clickPaymentScheduleToggle();
      await loans.expectPaymentScheduleTableVisible();
      const scheduleTable = loans.paymentScheduleTable();
      await loans.sortTableColumn(scheduleTable, /^Date\b/i);
      await loans.expectTableDateColumnSorted(scheduleTable, 0, "asc");
    },
  );

  test(
    "URP-T165 - Loans - Documents - Filters/Sorting of the field columns",
    { tag: ["@rss", "@regression", "@URP-T165"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("documents");
      if (!(await loans.hasDocumentRows())) {
        test.skip(true, "Precondition: loan must have multiple documents for sort/filter.");
      }
      const table = loans.documentsTable();
      await loans.sortTableColumn(table, /^Date\b/i);
      await loans.expectTableDateColumnSorted(table, 1, "asc");
      await loans.openTableColumnFilter(table, /Document Name/i);
      await loans.expectTableColumnFilterMatchOptions([/Contains/i, /Starts\s*with/i, /Equals/i]);
      await page.keyboard.press("Escape").catch(() => undefined);
    },
  );

  test(
    "URP-T166 - Loans - Generate Statement - From Date and To Date",
    { tag: ["@rss", "@regression", "@URP-T166"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("documents");
      await loans.clickGenerateStatement();
      await loans.expectGenerateStatementDateRangeVisible();
      await loans.expectGenerateStatementDefaultDateRange();
    },
  );

  test(
    "URP-T218 - Loans - Download Payment Summary",
    { tag: ["@rss", "@regression", "@URP-T218"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("transactions");
      const download = await loans.clickDownloadInPaymentSummarySection();
      expectCsvDownload(download);
    },
  );

  test(
    "URP-T219 - Loans - Download Payment Schedule",
    { tag: ["@rss", "@regression", "@URP-T219"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("transactions");
      const download = await loans.clickDownloadInPaymentScheduleSection();
      expectCsvDownload(download);
    },
  );

  test(
    "URP-T220 - Loans - Payment Summary",
    { tag: ["@rss", "@regression", "@URP-T220"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      await openLoansForRssTestUser(dashboard, loans);
      await loans.selectLoanDetailTab("transactions");
      await loans.expandPaymentScheduleAccordion();
      await loans.expectPaymentSummaryTableVisible();
    },
  );
});
