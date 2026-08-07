/**
 * RSS Sanity — Loans (URP-T65 – URP-T75)
 * Zephyr: /RSS Sanity Suite/Loans
 * Source: RSS Loans Test Cases.xlsx
 *
 * Precondition: header party **Rss Test User** must have at least one loan/quote.
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import type { Download } from "@playwright/test";
import { RSSDashboardPage, RSSLoansPage } from "../../../../pages";
import { getRssPortalTestPartyName } from "../../../../testData/rss-portal/rssLoginData";

function normalizePartyLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

async function openLoansForRssTestUser(
  dashboard: RSSDashboardPage,
  loans: RSSLoansPage,
): Promise<void> {
  expect(await dashboard.isDashboardLoaded()).toBe(true);

  const rssTestUserParty = getRssPortalTestPartyName();
  const selectedParty = await dashboard.getSelectedHeaderPartyName();
  if (
    !normalizePartyLabel(selectedParty)
      .toLowerCase()
      .includes(rssTestUserParty.toLowerCase())
  ) {
    await dashboard.selectHeaderBorrowerProfile(rssTestUserParty);
    const afterSelect = await dashboard.getSelectedHeaderPartyName();
    expect(
      normalizePartyLabel(afterSelect).toLowerCase(),
      `Header party must be ${rssTestUserParty}.`,
    ).toContain(rssTestUserParty.toLowerCase());
    await dashboard.waitForRssShellIdle();
  }

  await dashboard.clickLoans();
  expect(await dashboard.isLoansSelected()).toBe(true);
  await loans.waitForLoansScreen();
}

function expectCsvDownload(download: Download): void {
  const filename = download.suggestedFilename().toLowerCase();
  expect(filename.endsWith(".csv") || filename.endsWith(".xlsx")).toBe(true);
}

test.describe("RSS Portal — Loans @rss @sanity", () => {
  test("URP-T65 - Loans - Loans dropdown @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);

    await openLoansForRssTestUser(dashboard, loans);
    await loans.expectLoansDropdownVisible();
    await loans.expectLoansDropdownShowsPartyLoanSections();
  });

  test("URP-T66 - Loans - Loan Summary @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);

    await openLoansForRssTestUser(dashboard, loans);
    await loans.expectAssetDetailsTabSelected();
    await loans.expectLoanSummaryPanelVisible();
  });

  test("URP-T67 - Loans - Asset Details @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);

    await openLoansForRssTestUser(dashboard, loans);
    await loans.expectAssetDetailsFieldsVisible();
  });

  test("URP-T68 - Loans - Get Valuation @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);

    await openLoansForRssTestUser(dashboard, loans);
    await loans.expectAssetDetailsFieldsVisible();
    await loans.clickGetValuation();
    await loans.expectValuationBandsVisible();
  });

  test("URP-T69 - Loans - Transactions List @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);

    await openLoansForRssTestUser(dashboard, loans);
    await loans.selectLoanDetailTab("transactions");
    await loans.expectTransactionsSectionsVisible();
    await loans.expectTransactionsTableColumnsVisible();
  });

  test("URP-T70 - Loans - Payment Schedule @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);

    await openLoansForRssTestUser(dashboard, loans);
    await loans.selectLoanDetailTab("transactions");
    await loans.expandPaymentScheduleAccordion();
    await loans.expectPaymentSummaryTableVisible();
    await loans.clickPaymentScheduleToggle();
    await loans.expectPaymentScheduleTableVisible();
  });

  test("URP-T71 - Loans - Documents List @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);

    await openLoansForRssTestUser(dashboard, loans);
    await loans.selectLoanDetailTab("documents");
    await loans.expectDocumentsTabActionsVisible();
    await loans.expectDocumentsListOrEmptyState();
  });

  test("URP-T72 - Loans - Document Preview @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);

    await openLoansForRssTestUser(dashboard, loans);
    await loans.selectLoanDetailTab("documents");

    if (!(await loans.hasDocumentRows())) {
      test.skip(true, "Precondition: loan must have uploaded documents for preview.");
    }

    await loans.expectDocumentPreviewOpensNewTab();
  });

  test("URP-T73 - Loans - Document download @smoke", async ({ page }) => {
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
  });

  test("URP-T74 - Loans - Download Transactions Payment Schedule Payment Summary @smoke", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);

    await openLoansForRssTestUser(dashboard, loans);
    await loans.selectLoanDetailTab("transactions");
    await loans.expectTransactionsSectionsVisible();

    const transactionsDownload = await loans.clickDownloadInTransactionsSection();
    expectCsvDownload(transactionsDownload);

    const summaryDownload = await loans.clickDownloadInPaymentSummarySection();
    expectCsvDownload(summaryDownload);

    const scheduleDownload = await loans.clickDownloadInPaymentScheduleSection();
    expectCsvDownload(scheduleDownload);
  });

  test("URP-T75 - Loans - Generate Statement @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);

    await openLoansForRssTestUser(dashboard, loans);
    await loans.selectLoanDetailTab("documents");
    await loans.expectDocumentsTabActionsVisible();
    await loans.clickGenerateStatement();
    await loans.expectGenerateStatementDateRangeVisible();
  });
});
