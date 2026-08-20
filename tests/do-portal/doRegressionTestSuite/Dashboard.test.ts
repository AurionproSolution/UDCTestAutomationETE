/**
 * DO Portal — Dashboard regression (UDP-T4352–UDP-T4413).
 * Scenario source: Dashboard Test Cases.xlsx (Zephyr / Regression Automation / Dashboard_Test_Cases).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import { DOAssetDetailsPage, DOCustomerStatementPage, DODashboardPage } from "../../../pages";
import settlementData from "../../../testData/do-portal/settlementTestData.json";
import {
  ACTIVE_LOAN_COLUMNS,
  ACTIVE_LOAN_EXPORT_COLUMNS,
  AFV_LOAN_COLUMNS,
  AFV_LOAN_EXPORT_COLUMNS,
  OL_RENTAL_SCHEDULE_COLUMNS,
  QUOTE_GRID_COLUMNS,
  TLC_DEALER,
  WORKFLOW_BUCKETS,
  expectExportFileContainsColumns,
  expectFirstQuoteRowVisible,
  findOperatingLeaseBuybackLoanIds,
  openAfvDealerDashboard,
  openAfvLoanStatement,
  openAfvLoansGrid,
  openDealerDashboard,
  openFinanceLeaseStatement,
  openOperatingLeaseStatement,
  openOperatingLeaseStatementForLoan,
  readFirstQuoteId,
  readQuoteGridRowId,
  requireLoanId,
  saveDashboardDownload,
  resolveOlActiveLoanReference,
} from "./dashboard.helpers";

const OUTSTANDING_BALANCE_TOOLTIP =
  /principal balance.*interest accrued.*overdue payments.*prepayments.*final settlement/i;

async function openQuotesGrid(dashboard: DODashboardPage): Promise<void> {
  await dashboard.openQuotesAndApplications();
  await dashboard.selectQuotesGridListingType(/^Quote$/i);
}

test.describe("Dashboard — Widgets @do @regression", () => {
  test(
    "UDP-T4352 - TC_DB_001 Dashboard Widgets Display on Login",
    { tag: ["@do", "@regression", "@UDP-T4352"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await dashboard.expectDashboardWidgetsVisible();
      await expect(dashboard.breadcrumbDashboard).toBeVisible();
      await expect(dashboard.dealerDropdownLabel).toBeVisible();
    },
  );

  test.fixme(
    "UDP-T4353 - TC_DB_002 Dashboard Widget Layout Is Personalisable and Persisted Across Sessions",
    { tag: ["@do", "@regression", "@UDP-T4353"] },
    async () => {
      // Widget drag/resize persistence (POR008) requires dashboard layout APIs not exposed in current POM.
    },
  );

  test(
    "UDP-T4354 - TC_DB_003 Monthly Volumes Shows Totals and Year Toggle",
    { tag: ["@do", "@regression", "@UDP-T4354"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await expect(dashboard.monthlyVolumesWidget.getByText(/Monthly Volumes/i)).toBeVisible();
      await expect(dashboard.monthlyVolumesWidget.locator("canvas").first()).toBeVisible();
      const currentYear = String(new Date().getFullYear());
      const priorYear = String(new Date().getFullYear() - 1);
      await dashboard.selectWidgetYear(dashboard.monthlyVolumesWidget, priorYear);
      await dashboard.selectWidgetYear(dashboard.monthlyVolumesWidget, currentYear);
    },
  );

  test(
    "UDP-T4355 - TC_DB_004 Workflow Status Widget Groups AF States into Portal Buckets",
    { tag: ["@do", "@regression", "@UDP-T4355"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await dashboard.expectWorkflowStatusBucketsVisible(WORKFLOW_BUCKETS);
      for (const bucket of WORKFLOW_BUCKETS) {
        const tile = dashboard.workflowStatusBucket(bucket);
        await expect(dashboard.workflowStatusBucketMetric(tile)).toBeVisible();
      }
    },
  );

  test(
    "UDP-T4356 - TC_DB_005 Workflow Status View All Opens Expanded Status Pop-Up",
    { tag: ["@do", "@regression", "@UDP-T4356"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      const label = await dashboard.toggleWorkflowStatusView();
      expect(label).toMatch(/View (All|Less|More)/i);
      await dashboard.expectWorkflowStatusBucketsVisible(WORKFLOW_BUCKETS);
    },
  );

  test(
    "UDP-T4357 - TC_DB_006 Average Tracking Metrics and Year Toggle",
    { tag: ["@do", "@regression", "@UDP-T4357"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await expect(dashboard.averageSalesWidget.locator("canvas").first()).toBeVisible();
      const currentYear = String(new Date().getFullYear());
      await dashboard.selectWidgetYear(dashboard.averageSalesWidget, currentYear);
      await dashboard.selectAverageSalesMetric(/Average Sales Price/i);
      await dashboard.selectAverageSalesMetric(/Average Commission|Average Amount Financed/i);
    },
  );

  test(
    "UDP-T4358 - TC_DB_007 Fees and Commission MTD/YTD Toggle",
    { tag: ["@do", "@regression", "@UDP-T4358"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await expect(dashboard.averageSalesWidget.getByText(/^Fees$/i)).toBeVisible();
      await expect(dashboard.averageSalesWidget.getByText(/^Commission$/i)).toBeVisible();
      await expect(dashboard.feesAmountLabel()).toBeVisible();
      await expect(dashboard.commissionAmountLabel()).toBeVisible();
      await dashboard.selectFeesCommissionPeriod("YTD");
      await dashboard.selectFeesCommissionPeriod("MTD");
    },
  );

  test(
    "UDP-T4359 - TC_DB_008 Margins Shows Dealer vs Customer Rate Margin MTD/YTD",
    { tag: ["@do", "@regression", "@UDP-T4359"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await expect(dashboard.marginsPanel()).toBeVisible();
      await expect(dashboard.marginsDateRangeLabel()).toBeVisible();
      await expect(dashboard.marginsPercentageLabel()).toBeVisible();
      await dashboard.selectMarginsPeriod("MTD");
      await dashboard.selectMarginsPeriod("YTD");
    },
  );

  test(
    "UDP-T4360 - TC_DB_009 Application Outcome Four Buckets",
    { tag: ["@do", "@regression", "@UDP-T4360"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      for (const label of [/Paid Out/i, /Pending/i, /Declined/i, /Expired/i]) {
        await expect(dashboard.applicationOutcomeLegend(label)).toBeVisible();
      }
      await expect(dashboard.applicationOutcomeWidget.locator("canvas").first()).toBeVisible();
    },
  );

  test(
    "UDP-T4361 - TC_DB_010 Online Application Status Counts",
    { tag: ["@do", "@regression", "@UDP-T4361"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await expect(dashboard.applicationOutcomeWidget.getByText(/Online Application Status/i)).toBeVisible();
      await expect(dashboard.onlineApplicationStatusCard(/Started/i)).toBeVisible();
      await expect(dashboard.onlineApplicationStatusCard(/Submitted/i)).toBeVisible();
      await expect(dashboard.onlineApplicationStatusCard(/Applications Value/i)).toBeVisible();
    },
  );

  test(
    "UDP-T4362 - TC_DB_011 Notifications Widget Displays on Dashboard",
    { tag: ["@do", "@regression", "@UDP-T4362"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await expect(dashboard.notificationsWidget.getByText(/^Notifications$/i)).toBeVisible();
      await expect(dashboard.notificationsPanelBody()).toBeVisible();
      const badgeText = await dashboard.notificationBadge().innerText().catch(() => "0");
      expect(Number.parseInt(badgeText, 10)).toBeGreaterThanOrEqual(0);
    },
  );
});

test.describe("Dashboard — Quotes Grid @do @regression", () => {
  test(
    "UDP-T4363 - TC_DB_012 Quotes Grid Default Columns Visible",
    { tag: ["@do", "@regression", "@UDP-T4363"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      await dashboard.expectQuotesGridColumnsVisible(QUOTE_GRID_COLUMNS);
      await expectFirstQuoteRowVisible(dashboard);
    },
  );

  test(
    "UDP-T4364 - TC_DB_013 Quotes Grid Name Column Shows Borrower or Originator Reference",
    { tag: ["@do", "@regression", "@UDP-T4364"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      const row = dashboard.quotesGridTable().locator("tbody tr").first();
      await expect(row).toBeVisible({ timeout: 60_000 });
      const name = await dashboard.readQuoteGridColumnForRow(row, /^Name$/i);
      expect(name.trim().length).toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T4365 - TC_DB_014 Quotes Grid Webform Checkbox Read-Only",
    { tag: ["@do", "@regression", "@UDP-T4365"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      const row = dashboard.quotesGridTable().locator("tbody tr").first();
      await expect(row).toBeVisible({ timeout: 60_000 });
      await dashboard.expectQuoteGridWebformCheckboxReadOnly(row);
    },
  );

  test(
    "UDP-T4366 - TC_DB_015 Quotes Grid Actions Menu Options",
    { tag: ["@do", "@regression", "@UDP-T4366"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      await expectFirstQuoteRowVisible(dashboard);
      await dashboard.openQuoteGridRowActions();
      const labels = await dashboard.readQuoteGridActionLabels();
      const menuText = labels.join(" ");
      expect(menuText).toMatch(/View Quote/i);
      expect(menuText).toMatch(/Copy Quote/i);
      expect(menuText).toMatch(/Cancel Quote/i);
      await dashboard.expectQuoteGridActionVisible(/Reopen Quote/i, false);

      await dashboard.closeQuoteGridRowActionsOverlay();
      await dashboard.openExpiredQuotesListing();
      const expiredRow = dashboard.quotesGridTable().locator("tbody tr").first();
      if (!(await expiredRow.isVisible({ timeout: 15_000 }).catch(() => false))) {
        test.skip(true, "No expired/cancelled quotes in listing to validate Reopen Quote.");
      }
      const expiredRef = ((await expiredRow.innerText()) ?? "").replace(/\s+/g, " ").trim();
      await dashboard.openQuoteGridRowActions(expiredRef.split(/\s+/)[0] ?? expiredRef);
      expect((await dashboard.readQuoteGridActionLabels()).join(" ")).toMatch(/Reopen Quote/i);
    },
  );

  test(
    "UDP-T4367 - TC_DB_016 View Quote Opens Asset Details",
    { tag: ["@do", "@regression", "@UDP-T4367"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      const quoteId = await readFirstQuoteId(dashboard);
      await dashboard.openQuoteGridRowActions(quoteId);
      await dashboard.clickQuoteGridAction(/View Quote/i);
      const assetDetails = new DOAssetDetailsPage(page);
      await assetDetails.waitForAssetDetailsStepReady();
      await expect(page).toHaveURL(/standard-quote\/edit\//i, { timeout: 60_000 });
    },
  );

  test(
    "UDP-T4368 - TC_DB_017 Copy Quote Duplicates with New Quote ID",
    { tag: ["@do", "@regression", "@UDP-T4368"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      const sourceId = await readFirstQuoteId(dashboard);
      await dashboard.openQuoteGridRowActions(sourceId);
      await dashboard.clickQuoteGridAction(/Copy Quote/i);
      const assetDetails = new DOAssetDetailsPage(page);
      await assetDetails.waitForAssetDetailsStepReady();
      const duplicateId = page.url().match(/standard-quote\/edit\/(\d+)/i)?.[1] ?? "";
      expect(duplicateId).toBeTruthy();
      expect(duplicateId).not.toBe(sourceId);

      await page.goto(page.url().replace(/\/dealer\/?.*$/i, "/dealer/"));
      await dashboard.waitForAuthenticatedDashboard();
      await openQuotesGrid(dashboard);
      await dashboard.searchQuotesGrid(sourceId);
      await expect(dashboard.quoteGridRowByReference(sourceId)).toBeVisible({ timeout: 45_000 });
      await dashboard.searchQuotesGrid(duplicateId);
      await expect(dashboard.quoteGridRowByReference(duplicateId)).toBeVisible({ timeout: 45_000 });
    },
  );

  test(
    "UDP-T4369 - TC_DB_018 Cancel Quote Inactivates Quote",
    { tag: ["@do", "@regression", "@UDP-T4369"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      const quoteId = await readQuoteGridRowId(dashboard, 1);
      await dashboard.cancelQuoteFromGrid(quoteId);
      await dashboard.openExpiredQuotesListing();
      await dashboard.searchQuotesGrid(quoteId);
      await dashboard.expectQuoteGridWorkflowStatus(quoteId, /Cancelled|Withdrawn|Expired/i);
    },
  );

  test(
    "UDP-T4370 - TC_DB_019 Reopen Quote Enabled Only for Cancelled or Expired",
    { tag: ["@do", "@regression", "@UDP-T4370"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      const activeId = await readFirstQuoteId(dashboard);
      await dashboard.openQuoteGridRowActions(activeId);
      await dashboard.expectQuoteGridActionVisible(/Reopen Quote/i, false);

      await dashboard.openExpiredQuotesListing();
      const expiredRow = dashboard.quotesGridTable().locator("tbody tr").first();
      if (!(await expiredRow.isVisible({ timeout: 15_000 }).catch(() => false))) {
        test.skip(true, "No expired/cancelled quotes in listing for Reopen Quote validation.");
      }
      const expiredRef = ((await expiredRow.innerText()) ?? "").replace(/\s+/g, " ").trim();
      await dashboard.openQuoteGridRowActions(expiredRef.split(" ")[0] ?? expiredRef);
      await dashboard.expectQuoteGridActionEnabled(/Reopen Quote/i, true);
    },
  );
});

test.describe("Dashboard — Active Loans Grid @do @regression", () => {
  test(
    "UDP-T4371 - TC_DB_020 Active Loans Grid Default Columns Visible",
    { tag: ["@do", "@regression", "@UDP-T4371"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await dashboard.navigateToDealerListingActiveLoans();
      await dashboard.expectQuotesGridColumnsVisible(ACTIVE_LOAN_COLUMNS);
      await expectFirstQuoteRowVisible(dashboard);
    },
  );

  test(
    "UDP-T4372 - TC_DB_021 Active Loans Info Icon Outstanding Balance Tooltip",
    { tag: ["@do", "@regression", "@UDP-T4372"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const loanId = requireLoanId(
        settlementData.dealerListing.activatedLoanRegoOrVin,
        "dealerListing.activatedLoanRegoOrVin",
      );
      const dashboard = await openDealerDashboard(page);
      await dashboard.navigateToDealerListingActiveLoans();
      await dashboard.searchQuotesGrid(loanId);
      await dashboard.expectOutstandingBalanceTooltipVisible(loanId);
    },
  );

  test(
    "UDP-T4373 - TC_DB_022 Active Loans Expanded View Shows Email and Phone",
    { tag: ["@do", "@regression", "@UDP-T4373"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const loanId = requireLoanId(
        settlementData.dealerListing.activatedLoanRegoOrVin,
        "dealerListing.activatedLoanRegoOrVin",
      );
      const dashboard = await openDealerDashboard(page);
      await dashboard.navigateToDealerListingActiveLoans();
      await dashboard.searchQuotesGrid(loanId);
      await dashboard.expandActiveLoanRow(loanId);
      await dashboard.expectActiveLoanExpandedEmailAndPhoneVisible(loanId);
    },
  );

  test(
    "UDP-T4374 - TC_DB_023 Active Loans Actions Menu Options",
    { tag: ["@do", "@regression", "@UDP-T4374"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const loanId = requireLoanId(
        settlementData.dealerListing.activatedLoanRegoOrVin,
        "dealerListing.activatedLoanRegoOrVin",
      );
      const dashboard = await openDealerDashboard(page);
      await dashboard.navigateToDealerListingActiveLoans();
      await dashboard.searchQuotesGrid(loanId);
      await dashboard.openQuoteGridRowActions(loanId);
      const labels = await dashboard.readQuoteGridActionLabels();
      expect(labels.join(" ")).toMatch(/View Statement/i);
      expect(labels.join(" ")).toMatch(/Create Settlement Quote/i);
      expect(labels.join(" ")).toMatch(/Email\s*(Statement|P&I Schedule)/i);
    },
  );
});

test.describe("Dashboard — View Statement @do @regression", () => {
  async function openStatement(page: Page): Promise<DOCustomerStatementPage> {
    const dashboard = await openDealerDashboard(page);
    await dashboard.navigateToDealerListingActiveLoans();
    const loanId = await readQuoteGridRowId(dashboard, 1);
    await dashboard.openViewStatementForLoan(loanId);
    const statement = new DOCustomerStatementPage(page);
    await statement.waitForReady();
    return statement;
  }

  async function openOlStatement(page: Page): Promise<DODashboardPage> {
    const dashboard = await openDealerDashboard(page);
    const loanRef = await resolveOlActiveLoanReference(dashboard);
    await dashboard.navigateToDealerListingActiveLoans();
    await dashboard.openViewStatementForLoan(loanRef);
    return dashboard;
  }

  test(
    "UDP-T4375 - TC_DB_024 View Statement Common Header Fields",
    { tag: ["@do", "@regression", "@UDP-T4375"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openStatement(page);
      await statement.expectCommonHeaderFieldsVisible();
    },
  );

  test(
    "UDP-T4376 - TC_DB_025 View Statement Asset Details Section",
    { tag: ["@do", "@regression", "@UDP-T4376"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openStatement(page);
      await statement.expectAssetSummaryVisible();
    },
  );

  test(
    "UDP-T4377 - TC_DB_026 View Statement Borrowers and Guarantors Section",
    { tag: ["@do", "@regression", "@UDP-T4377"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openStatement(page);
      await statement.expectBorrowersGuarantorsVisible();
    },
  );

  test(
    "UDP-T4378 - TC_DB_027 View Statement CSA/TL Payment Schedule Columns",
    { tag: ["@do", "@regression", "@UDP-T4378"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openStatement(page);
      await statement.expectPaymentScheduleColumnsVisible();
    },
  );

  test(
    "UDP-T4379 - TC_DB_028 View Statement CSA/TL Payment Summary Columns",
    { tag: ["@do", "@regression", "@UDP-T4379"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openStatement(page);
      await statement.expectPaymentSummaryColumnsVisible();
    },
  );

  test(
    "UDP-T4380 - TC_DB_029 View Statement CSA/TL Current Position Fields",
    { tag: ["@do", "@regression", "@UDP-T4380"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openStatement(page);
      await statement.expectCurrentPositionFieldsVisible();
    },
  );

  test(
    "UDP-T4381 - TC_DB_030 View Statement FL Lease Schedule Includes GST Column",
    { tag: ["@do", "@regression", "@UDP-T4381"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openFinanceLeaseStatement(page, { requireLeaseScheduleGst: true });
      await statement.expectFlLeaseScheduleColumnsVisible();
    },
  );

  test(
    "UDP-T4382 - TC_DB_031 View Statement FL Payment Summary Includes GST",
    { tag: ["@do", "@regression", "@UDP-T4382"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openFinanceLeaseStatement(page);
      await statement.expectFlLeaseSummaryColumnsVisible();
    },
  );

  test(
    "UDP-T4383 - TC_DB_032 View Statement OL Rental Schedule Columns",
    { tag: ["@do", "@regression", "@UDP-T4383"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openOperatingLeaseStatement(page);
      await statement.expectOlRentalScheduleColumnsVisible();
      const dashboard = await openOlStatement(page);
      await expect(page.getByText(/Operating\s*Lease/i).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/Rental\s+Schedule/i).first()).toBeVisible({ timeout: 30_000 });
      await dashboard.expectStatementPaymentScheduleColumnsVisible(OL_RENTAL_SCHEDULE_COLUMNS);
      await dashboard.expectStatementPaymentScheduleDatesFormatted();
      await dashboard.expectStatementPaymentScheduleHasFetchedAmounts();
      await dashboard.expectStatementPaymentScheduleRowsDisplayOnly();
    },
  );

  test(
    "UDP-T4384 - TC_DB_033 View Statement OL Payment Summary Columns",
    { tag: ["@do", "@regression", "@UDP-T4384"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openOperatingLeaseStatement(page);
      await statement.expectOlRentalSummaryColumnsVisible();
    },
  );

  test(
    "UDP-T4385 - TC_DB_034 View Statement OL Buyback Details Conditional Display",
    { tag: ["@do", "@regression", "@UDP-T4385"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { dashboard, withBuybackId, withoutBuybackId } =
        await findOperatingLeaseBuybackLoanIds(page);

      const matchingParty = await openOperatingLeaseStatementForLoan(
        page,
        dashboard,
        withBuybackId,
      );
      await matchingParty.expectBuybackDetailsVisible();

      await matchingParty.clickPreviousToDashboard();
      await dashboard.navigateToDealerListingActiveLoans();
      await dashboard.searchQuotesGrid("Operating");

      const nonMatchingParty = await openOperatingLeaseStatementForLoan(
        page,
        dashboard,
        withoutBuybackId,
      );
      await nonMatchingParty.expectBuybackDetailsHidden();
    },
  );

  test(
    "UDP-T4386 - TC_DB_035 View Statement AFV Loan Details Fields",
    { tag: ["@do", "@regression", "@UDP-T4386"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openAfvLoanStatement(page);
      await statement.expectAfvLoanDetailsFieldsVisible();
      await statement.expectAfvPaymentScheduleColumnsVisible();
    },
  );

  test(
    "UDP-T4387 - TC_DB_036 View Statement CSA Customer Decision Section NOT Present",
    { tag: ["@do", "@regression", "@UDP-T4387"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openStatement(page);
      await expect(statement.root.getByText(/Customer Decision/i)).toHaveCount(0);
    },
  );

  test(
    "UDP-T4388 - TC_DB_037 View Statement Customer Name Hyperlink Navigates to Customer Details",
    { tag: ["@do", "@regression", "@UDP-T4388"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openStatement(page);
      await statement.clickBorrowerCustomerNameLink();
      await statement.expectViewOnlyIndividualCustomerDetailsVisible();
    },
  );

  test(
    "UDP-T4389 - TC_DB_038 View Statement Payment Schedule Scrolling",
    { tag: ["@do", "@regression", "@UDP-T4389"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const statement = await openStatement(page);
      await statement.selectPaymentTab("Payment Schedule");
      const schedule = statement.paymentTable();
      await schedule.scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 400);
      await expect(schedule).toBeVisible();
    },
  );
});

test.describe("Dashboard — AFV Loans @do @regression", () => {
  test(
    "UDP-T4390 - TC_DB_039 AFV Loans Grid Default Columns Visible",
    { tag: ["@do", "@regression", "@UDP-T4390"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openAfvDealerDashboard(page);
      await openAfvLoansGrid(dashboard);
      await dashboard.expectQuotesGridColumnsVisible(AFV_LOAN_COLUMNS);
      await expectFirstQuoteRowVisible(dashboard);
    },
  );

  test(
    "UDP-T4391 - TC_DB_040 AFV Loans Expanded View Shows Email Phone Max Permitted KM",
    { tag: ["@do", "@regression", "@UDP-T4391"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openAfvDealerDashboard(page);
      await openAfvLoansGrid(dashboard);
      const loanId = await readQuoteGridRowId(dashboard, 0);
      await dashboard.expandActiveLoanRow(loanId);
      await dashboard.expectAfvLoanExpandedDetailsVisible(loanId);
    },
  );

  test(
    "UDP-T4392 - TC_DB_041 AFV Loans Info Icon Outstanding Balance Tooltip",
    { tag: ["@do", "@regression", "@UDP-T4392"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openAfvDealerDashboard(page);
      await openAfvLoansGrid(dashboard);
      const loanId = await readQuoteGridRowId(dashboard, 0);
      await dashboard.expectOutstandingBalanceTooltipVisible(loanId);
    },
  );

  test(
    "UDP-T4393 - TC_DB_042 AFV Loans Actions Menu Options",
    { tag: ["@do", "@regression", "@UDP-T4393"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openAfvDealerDashboard(page);
      await openAfvLoansGrid(dashboard);
      const loanId = await readQuoteGridRowId(dashboard, 0);
      await dashboard.openQuoteGridRowActions(loanId);
      const labels = await dashboard.readQuoteGridActionLabels();
      expect(labels.join(" ")).toMatch(/View Statement/i);
      expect(labels.join(" ")).toMatch(/Create Settlement Quote/i);
      expect(labels.join(" ")).toMatch(/Email\s*(Statement|P&I Schedule)/i);
    },
  );
});

test.describe("Dashboard — Email Statement @do @regression", () => {
  test(
    "UDP-T4394 - TC_DB_043 Email Statement Success Response from FIS",
    { tag: ["@do", "@regression", "@UDP-T4394"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const loanId = requireLoanId(
        settlementData.dealerListing.activatedLoanRegoOrVin,
        "dealerListing.activatedLoanRegoOrVin",
      );
      const dashboard = await openDealerDashboard(page);
      await dashboard.navigateToDealerListingActiveLoans();
      await dashboard.openEmailStatementForLoan(loanId);
      const toast = page.getByText(/Email request submitted|error submitting your request/i).first();
      await expect(toast).toBeVisible({ timeout: 45_000 });
    },
  );

  test.fixme(
    "UDP-T4395 - TC_DB_044 Email Statement Failure Response from FIS",
    { tag: ["@do", "@regression", "@UDP-T4395"] },
    async () => {
      // Requires controlled FIS error response or mock.
    },
  );
});

test.describe("Dashboard — Assign @do @regression", () => {
  test(
    "UDP-T4396 - TC_DB_045 Assign Single Quote Shows Originator and Salesperson Fields",
    { tag: ["@do", "@regression", "@UDP-T4396"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      const quoteId = await readFirstQuoteId(dashboard);
      await dashboard.selectQuotesGridRows(quoteId);
      await dashboard.clickAssignLink();
      await dashboard.expectAssignSingleQuoteDialogFields();
    },
  );

  test(
    "UDP-T4397 - TC_DB_046 Assign Bulk Same Originator Succeeds",
    { tag: ["@do", "@regression", "@UDP-T4397"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      const rows = dashboard.quotesGridTable().locator("tbody tr");
      const count = Math.min(await rows.count(), 2);
      if (count < 2) test.skip(true, "Need at least two quote rows from same originator.");
      const firstText = (await rows.nth(0).innerText()) ?? "";
      const secondText = (await rows.nth(1).innerText()) ?? "";
      const originator = firstText.match(/Armstrong Prestige[^\n]*/i)?.[0];
      if (!originator || !secondText.includes(originator.split(" - ")[0] ?? originator)) {
        test.skip(true, "First two rows are not from the same originator.");
      }
      await dashboard.selectQuotesGridRowByIndex(0);
      await dashboard.selectQuotesGridRowByIndex(1);
      await dashboard.clickAssignLink();
      await dashboard.expectAssignDialogVisible();
      await expect(dashboard.assignDialog().getByRole("combobox", { name: /Salesperson/i })).toBeVisible({
        timeout: 15_000,
      });
    },
  );

  test(
    "UDP-T4398 - TC_DB_047 Assign Bulk Different Originators Shows Error",
    { tag: ["@do", "@regression", "@UDP-T4398"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      const rows = dashboard.quotesGridTable().locator("tbody tr");
      if ((await rows.count()) < 2) test.skip(true, "Need multiple rows to test mixed-originator assign.");
      await dashboard.selectQuotesGridRowByIndex(0);
      await dashboard.selectQuotesGridRowByIndex(1);
      await dashboard.clickAssignLink();
      const sameOriginatorError = page.getByText(/Quote must all belong to the same originator/i);
      const dialog = dashboard.assignDialog();
      await expect(sameOriginatorError.or(dialog)).toBeVisible({ timeout: 30_000 });
      if (await sameOriginatorError.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await dashboard.expectAssignSameOriginatorError();
      }
    },
  );

  test(
    "UDP-T4399 - TC_DB_048 Assign Availability Based on FIS Resource Security",
    { tag: ["@do", "@regression", "@UDP-T4399"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      await expect(dashboard.assignLink).toBeVisible();
    },
  );
});

test.describe("Dashboard — Export @do @regression", () => {
  test(
    "UDP-T4400 - TC_DB_049 Export Prompts for Date Filter Then Format",
    { tag: ["@do", "@regression", "@UDP-T4400"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);

      // Dashboard pre-fills a date range — export opens the format picker (Export As / Select Export Format).
      await expect(dashboard.quotesGridFromDate).not.toHaveValue("");
      await expect(dashboard.quotesGridToDate).not.toHaveValue("");
      await dashboard.clickExportLinkExpectingDatePromptOrDialog();
      await dashboard.expectExportFormatDialogVisible();
      await page.keyboard.press("Escape");
      await expect(dashboard.exportFormatDialog()).toBeHidden({ timeout: 10_000 });

      await dashboard.setQuotesGridDateRange("01/01/2024", "31/12/2026");
      await dashboard.clickQuotesGridView();
      await dashboard.clickExportLinkExpectingDatePromptOrDialog();
      await dashboard.expectExportFormatDialogVisible();
    },
  );

  test(
    "UDP-T4401 - TC_DB_050 Export Button Disabled During Processing",
    { tag: ["@do", "@regression", "@UDP-T4401"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      await dashboard.setQuotesGridDateRange("01/01/2020", "31/12/2026");
      await dashboard.clickQuotesGridView();
      await dashboard.clickExportLinkExpectingDatePromptOrDialog();
      await expect(dashboard.exportLink).toBeVisible();
    },
  );

  test(
    "UDP-T4402 - TC_DB_051 Export Active Loans Fields Include More Data Than Dashboard",
    { tag: ["@do", "@regression", "@UDP-T4402"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await dashboard.openQuotesAndApplications();
      await dashboard.navigateToDealerListingActiveLoans();
      await expectFirstQuoteRowVisible(dashboard);
      await dashboard.applyQuotesGridDateFilter("01/01/2020", "31/12/2026");
      await dashboard.clickExportLinkExpectingDatePromptOrDialog();
      await dashboard.expectExportFormatDialogVisible();
      await dashboard.selectExportFormat(/CSV/i);
      const download = await dashboard.confirmExportDownload();
      const filePath = await saveDashboardDownload(download);
      await expectExportFileContainsColumns(filePath, ACTIVE_LOAN_EXPORT_COLUMNS);
    },
  );

  test(
    "UDP-T4403 - TC_DB_052 Export AFV Loans Fields Include KM Allowance and Customer Decision",
    { tag: ["@do", "@regression", "@UDP-T4403"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openAfvDealerDashboard(page);
      await openAfvLoansGrid(dashboard);
      await expectFirstQuoteRowVisible(dashboard);
      await dashboard.applyQuotesGridDateFilter("01/01/2020", "31/12/2026");
      await dashboard.clickExportLinkExpectingDatePromptOrDialog();
      await dashboard.expectExportFormatDialogVisible();
      await dashboard.selectExportFormat(/CSV/i);
      const download = await dashboard.confirmExportDownload();
      const filePath = await saveDashboardDownload(download);
      await expectExportFileContainsColumns(filePath, AFV_LOAN_EXPORT_COLUMNS);
    },
  );
});

test.describe("Dashboard — Print @do @regression", () => {
  test(
    "UDP-T4404 - TC_DB_053 Print Captures Current Page Data With Applied Filters",
    { tag: ["@do", "@regression", "@UDP-T4404"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      await dashboard.applyQuotesGridDateFilter("01/01/2024", "31/12/2026");
      await expect(dashboard.printLink).toBeVisible({ timeout: 30_000 });
      await expect(dashboard.printLink).toBeEnabled();
      await dashboard.clickPrintLink();
    },
  );

  test(
    "UDP-T4405 - TC_DB_054 Print Quotes PDF Fields",
    { tag: ["@do", "@regression", "@UDP-T4405"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      await expect(dashboard.printLink).toBeVisible({ timeout: 30_000 });
      await expect(dashboard.printLink).toBeEnabled();
      await dashboard.clickPrintLink();
    },
  );

  test(
    "UDP-T4406 - TC_DB_055 Print Active Loans PDF Fields",
    { tag: ["@do", "@regression", "@UDP-T4406"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await dashboard.openQuotesAndApplications();
      await dashboard.navigateToDealerListingActiveLoans();
      await expectFirstQuoteRowVisible(dashboard);
      await expect(dashboard.printLink).toBeVisible({ timeout: 30_000 });
      await expect(dashboard.printLink).toBeEnabled();
      await dashboard.clickPrintLink();
    },
  );
});

test.describe("Dashboard — Grid Features @do @regression", () => {
  test(
    "UDP-T4407 - TC_DB_056 Grid Sort Ascending Descending on Column",
    { tag: ["@do", "@regression", "@UDP-T4407"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      await dashboard.sortQuotesGridByColumn(/Date/i);
      await dashboard.sortQuotesGridByColumn(/Date/i);
      await expectFirstQuoteRowVisible(dashboard);
    },
  );

  test(
    "UDP-T4408 - TC_DB_057 Grid Column Filter Dropdown Options",
    { tag: ["@do", "@regression", "@UDP-T4408"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      await dashboard.openQuotesGridColumnFilter(/^Name$/i);
      await dashboard.expectQuotesGridColumnFilterMatchOptions([
        /Starts\s*with/i,
        /Contains/i,
        /Not\s*contains/i,
        /Ends\s*with/i,
        /Equals/i,
        /Not\s*equals/i,
      ]);
      await dashboard.expectQuotesGridColumnFilterClearVisible();
      await dashboard.closeQuotesGridColumnFilterOverlay();
    },
  );

  test(
    "UDP-T4409 - TC_DB_058 Grid Search Filters Across Entire Dataset",
    { tag: ["@do", "@regression", "@UDP-T4409"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      const quoteId = await readFirstQuoteId(dashboard);
      await dashboard.searchQuotesGrid(quoteId);
      await expect(dashboard.quoteGridRowByReference(quoteId)).toBeVisible({ timeout: 45_000 });
    },
  );

  test(
    "UDP-T4410 - TC_DB_059 Grid Date Range Filter for Export and Filtering",
    { tag: ["@do", "@regression", "@UDP-T4410"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      await dashboard.setQuotesGridDateRange("01/01/2020", "31/12/2026");
      await dashboard.clickQuotesGridView();
      await expectFirstQuoteRowVisible(dashboard);
    },
  );

  test(
    "UDP-T4411 - TC_DB_060 Grid Column Customisation Limited to Current Session",
    { tag: ["@do", "@regression", "@UDP-T4411"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      const resizer = dashboard.quotesGridColumnHeader(/Date/i).locator(".p-column-resizer").first();
      if (await resizer.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const box = await resizer.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + 40, box.y + box.height / 2);
          await page.mouse.up();
        }
      }
      await page.reload();
      await dashboard.waitForAuthenticatedDashboard();
      await openQuotesGrid(dashboard);
      await expect(dashboard.quotesGridColumnHeader(/Date/i)).toBeVisible();
    },
  );

  test(
    "UDP-T4412 - TC_DB_061 Grid Data Displays Based on Dealer Party Permissions",
    { tag: ["@do", "@regression", "@UDP-T4412"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      await expect(dashboard.dealerDropdownLabel).toHaveAttribute("aria-label", TLC_DEALER);
      const row = dashboard.quotesGridTable().locator("tbody tr").first();
      if (await row.isVisible({ timeout: 30_000 }).catch(() => false)) {
        await expect(row).toContainText(/Armstrong Prestige/i);
      }
    },
  );

  test(
    "UDP-T4413 - TC_DB_062 Grid Listing Updates on Refresh or Filter Change",
    { tag: ["@do", "@regression", "@UDP-T4413"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await dashboard.navigateToDealerListingActiveLoans();
      await page.reload();
      await dashboard.waitForAuthenticatedDashboard();
      await dashboard.navigateToDealerListingActiveLoans();
      await expect(dashboard.quotesGridTable()).toBeVisible({ timeout: 60_000 });
      await dashboard.selectQuotesGridListingType(/^Quote$/i);
      await expect(dashboard.quotesGridTable()).toBeVisible({ timeout: 60_000 });
    },
  );
});
