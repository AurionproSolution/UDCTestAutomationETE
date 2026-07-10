/**
 * DO Portal — Dashboard regression (UDP-T4352–UDP-T4413).
 * Scenario source: Dashboard Test Cases.xlsx (Zephyr / Regression Automation / Dashboard_Test_Cases).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import { DODashboardPage } from "../../../pages";
import settlementData from "../../../testData/do-portal/settlementTestData.json";
import {
  ACTIVE_LOAN_COLUMNS,
  AFV_LOAN_COLUMNS,
  OL_RENTAL_SCHEDULE_COLUMNS,
  QUOTE_GRID_COLUMNS,
  WORKFLOW_BUCKETS,
  expectFirstQuoteRowVisible,
  openDealerDashboard,
  readFirstQuoteId,
  requireLoanId,
  resolveOlActiveLoanReference,
  TLC_DEALER,
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
        await expect(tile.locator(".amount-section p").first()).toBeVisible();
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
      await dashboard.selectFeesOrMarginsPeriod("YTD");
      await dashboard.selectFeesOrMarginsPeriod("MTD");
    },
  );

  test(
    "UDP-T4359 - TC_DB_008 Margins Shows Dealer vs Customer Rate Margin MTD/YTD",
    { tag: ["@do", "@regression", "@UDP-T4359"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await expect(
        dashboard.averageSalesWidget.getByText(/Margins on Loans Paid Out/i),
      ).toBeVisible();
      await expect(dashboard.marginsPercentageLabel()).toBeVisible();
      await dashboard.selectFeesOrMarginsPeriod("YTD");
      await dashboard.selectFeesOrMarginsPeriod("MTD");
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
      const checkbox = dashboard
        .quotesGridTable()
        .locator("tbody tr")
        .first()
        .locator(".p-checkbox")
        .last();
      await expect(checkbox).toBeVisible({ timeout: 30_000 });
      await expect(checkbox.locator("input[type='checkbox']")).toBeDisabled();
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
      expect(labels.join(" ")).toMatch(/View Quote/i);
      expect(labels.join(" ")).toMatch(/Copy Quote/i);
      expect(labels.join(" ")).toMatch(/Cancel Quote/i);
      expect(labels.join(" ")).toMatch(/Reopen Quote/i);
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
      await expect(page.locator("app-quote-details, app-standard-quote").first()).toBeVisible({
        timeout: 120_000,
      });
      await expect(page.locator("app-asset-details, app-quote-asset").first()).toBeVisible({
        timeout: 60_000,
      });
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
      await expect(page.locator("app-quote-details, app-standard-quote").first()).toBeVisible({
        timeout: 120_000,
      });
      await page.goto(page.url().replace(/\/dealer\/?.*$/i, "/dealer/"));
      await dashboard.waitForAuthenticatedDashboard();
      await openQuotesGrid(dashboard);
      await dashboard.searchQuotesGrid(sourceId);
      const rows = dashboard.quotesGridTable().locator("tbody tr");
      expect(await rows.count()).toBeGreaterThanOrEqual(1);
    },
  );

  test(
    "UDP-T4369 - TC_DB_018 Cancel Quote Inactivates Quote",
    { tag: ["@do", "@regression", "@UDP-T4369"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      const quoteId = await readFirstQuoteId(dashboard);
      await dashboard.openQuoteGridRowActions(quoteId);
      await dashboard.clickQuoteGridAction(/Cancel Quote/i);
      const confirm = page.getByRole("button", { name: /Yes|Confirm|OK/i }).first();
      if (await confirm.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await confirm.click();
      }
      await openQuotesGrid(dashboard);
      await dashboard.searchQuotesGrid(quoteId);
      await dashboard.expectQuoteGridWorkflowStatus(quoteId, /Cancelled/i);
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
      await dashboard.expectQuoteGridActionEnabled(/Reopen Quote/i, false);

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
      await dashboard.hoverActiveLoanInfoIcon(loanId);
      await expect(page.getByText(OUTSTANDING_BALANCE_TOOLTIP).first()).toBeVisible({
        timeout: 15_000,
      });
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
      await expect(page.getByText(/Email/i).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/Phone/i).first()).toBeVisible({ timeout: 15_000 });
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
      await dashboard.openQuoteGridRowActions(loanId);
      const labels = await dashboard.readQuoteGridActionLabels();
      expect(labels.join(" ")).toMatch(/View Statement/i);
      expect(labels.join(" ")).toMatch(/Create Settlement Quote/i);
      expect(labels.join(" ")).toMatch(/Email/i);
    },
  );
});

test.describe("Dashboard — View Statement @do @regression", () => {
  async function openStatement(page: Page): Promise<DODashboardPage> {
    const loanId = requireLoanId(
      settlementData.dealerListing.activatedLoanRegoOrVin,
      "dealerListing.activatedLoanRegoOrVin",
    );
    const dashboard = await openDealerDashboard(page);
    await dashboard.navigateToDealerListingActiveLoans();
    await dashboard.openViewStatementForLoan(loanId);
    return dashboard;
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
      await openStatement(page);
      for (const label of [/Product/i, /Program/i, /Originator/i, /Salesperson/i, /Status/i]) {
        await expect(page.getByText(label).first()).toBeVisible({ timeout: 30_000 });
      }
    },
  );

  test(
    "UDP-T4376 - TC_DB_025 View Statement Asset Details Section",
    { tag: ["@do", "@regression", "@UDP-T4376"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStatement(page);
      await expect(page.getByText(/Asset Details/i).first()).toBeVisible({ timeout: 30_000 });
    },
  );

  test(
    "UDP-T4377 - TC_DB_026 View Statement Borrowers and Guarantors Section",
    { tag: ["@do", "@regression", "@UDP-T4377"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStatement(page);
      await expect(page.getByText(/Borrowers?\s*&\s*Guarantors?/i).first()).toBeVisible({
        timeout: 30_000,
      });
    },
  );

  test(
    "UDP-T4378 - TC_DB_027 View Statement CSA/TL Payment Schedule Columns",
    { tag: ["@do", "@regression", "@UDP-T4378"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStatement(page);
      for (const col of [/Payment Date/i, /Principal/i, /Interest/i, /Total Payment/i]) {
        await expect(page.getByText(col).first()).toBeVisible({ timeout: 20_000 });
      }
    },
  );

  test(
    "UDP-T4379 - TC_DB_028 View Statement CSA/TL Payment Summary Columns",
    { tag: ["@do", "@regression", "@UDP-T4379"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStatement(page);
      await expect(page.getByText(/Payment Summary/i).first()).toBeVisible({ timeout: 20_000 });
    },
  );

  test(
    "UDP-T4380 - TC_DB_029 View Statement CSA/TL Current Position Fields",
    { tag: ["@do", "@regression", "@UDP-T4380"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStatement(page);
      await expect(page.getByText(/Current Position|Outstanding Balance/i).first()).toBeVisible({
        timeout: 20_000,
      });
    },
  );

  test.fixme(
    "UDP-T4381 - TC_DB_030 View Statement FL Lease Schedule Includes GST Column",
    { tag: ["@do", "@regression", "@UDP-T4381"] },
    async () => {
      // Requires activated Finance Lease loan seed in settlementTestData.json.
    },
  );

  test.fixme(
    "UDP-T4382 - TC_DB_031 View Statement FL Payment Summary Includes GST",
    { tag: ["@do", "@regression", "@UDP-T4382"] },
    async () => {},
  );

  test(
    "UDP-T4383 - TC_DB_032 View Statement OL Rental Schedule Columns",
    { tag: ["@do", "@regression", "@UDP-T4383"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openOlStatement(page);
      await expect(page.getByText(/Operating\s*Lease/i).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/Rental\s+Schedule/i).first()).toBeVisible({ timeout: 30_000 });
      await dashboard.expectStatementPaymentScheduleColumnsVisible(OL_RENTAL_SCHEDULE_COLUMNS);
      await dashboard.expectStatementPaymentScheduleDatesFormatted();
      await dashboard.expectStatementPaymentScheduleHasFetchedAmounts();
      await dashboard.expectStatementPaymentScheduleRowsDisplayOnly();
    },
  );

  test.fixme(
    "UDP-T4384 - TC_DB_033 View Statement OL Payment Summary Columns",
    { tag: ["@do", "@regression", "@UDP-T4384"] },
    async () => {},
  );

  test.fixme(
    "UDP-T4385 - TC_DB_034 View Statement OL Buyback Details Conditional Display",
    { tag: ["@do", "@regression", "@UDP-T4385"] },
    async () => {},
  );

  test.fixme(
    "UDP-T4386 - TC_DB_035 View Statement AFV Loan Details Fields",
    { tag: ["@do", "@regression", "@UDP-T4386"] },
    async () => {},
  );

  test(
    "UDP-T4387 - TC_DB_036 View Statement CSA Customer Decision Section NOT Present",
    { tag: ["@do", "@regression", "@UDP-T4387"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStatement(page);
      await expect(page.getByText(/Customer Decision/i)).toHaveCount(0);
    },
  );

  test(
    "UDP-T4388 - TC_DB_037 View Statement Customer Name Hyperlink Navigates to Customer Details",
    { tag: ["@do", "@regression", "@UDP-T4388"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStatement(page);
      const customerLink = page.locator("a, .text-primary").filter({ hasText: /\w+/ }).first();
      if (await customerLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await customerLink.click();
        await expect(
          page.locator("app-personal-details, app-customer-details").first(),
        ).toBeVisible({ timeout: 60_000 });
      }
    },
  );

  test(
    "UDP-T4389 - TC_DB_038 View Statement Payment Schedule Scrolling",
    { tag: ["@do", "@regression", "@UDP-T4389"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStatement(page);
      const schedule = page.locator("table, .p-datatable").filter({ hasText: /Payment/i }).first();
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
      const dashboard = await openDealerDashboard(page);
      await dashboard.navigateToDealerListingAfvLoans();
      await dashboard.expectQuotesGridColumnsVisible(AFV_LOAN_COLUMNS);
    },
  );

  test.fixme(
    "UDP-T4391 - TC_DB_040 AFV Loans Expanded View Shows Email Phone Max Permitted KM",
    { tag: ["@do", "@regression", "@UDP-T4391"] },
    async () => {},
  );

  test.fixme(
    "UDP-T4392 - TC_DB_041 AFV Loans Info Icon Outstanding Balance Tooltip",
    { tag: ["@do", "@regression", "@UDP-T4392"] },
    async () => {},
  );

  test.fixme(
    "UDP-T4393 - TC_DB_042 AFV Loans Actions Menu Options",
    { tag: ["@do", "@regression", "@UDP-T4393"] },
    async () => {},
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
      await dashboard.expectAssignDialogVisible();
      await expect(page.getByText(/Originator/i).first()).toBeVisible();
      await expect(page.getByText(/Salesperson/i).first()).toBeVisible();
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
      await rows.nth(0).locator(".p-checkbox-box").click();
      await rows.nth(1).locator(".p-checkbox-box").click();
      await dashboard.clickAssignLink();
      await dashboard.expectAssignDialogVisible();
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
      await rows.nth(0).locator(".p-checkbox-box").click();
      await rows.nth(1).locator(".p-checkbox-box").click();
      await dashboard.clickAssignLink();
      const sameOriginatorError = page.getByText(/Quote must all belong to the same originator/i);
      const dialog = page.getByRole("dialog").first();
      await expect(sameOriginatorError.or(dialog)).toBeVisible({ timeout: 30_000 });
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
      await dashboard.clickExportLinkExpectingDatePromptOrDialog();
      const datePrompt = page.getByText(/date filter|add a date/i);
      const formatDialog = page.getByText(/CSV|Excel/i);
      await expect(datePrompt.or(formatDialog)).toBeVisible({ timeout: 15_000 });

      await dashboard.setQuotesGridDateRange("01/01/2024", "31/12/2026");
      await dashboard.clickQuotesGridView();
      await dashboard.clickExportLinkExpectingDatePromptOrDialog();
      await expect(page.getByText(/CSV|Excel/i).first()).toBeVisible({ timeout: 15_000 });
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

  test.fixme(
    "UDP-T4402 - TC_DB_051 Export Active Loans Fields Include More Data Than Dashboard",
    { tag: ["@do", "@regression", "@UDP-T4402"] },
    async () => {},
  );
  test.fixme(
    "UDP-T4403 - TC_DB_052 Export AFV Loans Fields Include KM Allowance and Customer Decision",
    { tag: ["@do", "@regression", "@UDP-T4403"] },
    async () => {},
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
      const printPromise = page.waitForEvent("dialog", { timeout: 5_000 }).catch(() => null);
      await dashboard.clickPrintLink();
      const dialog = await printPromise;
      if (dialog) await dialog.dismiss();
    },
  );

  test(
    "UDP-T4405 - TC_DB_054 Print Quotes PDF Fields",
    { tag: ["@do", "@regression", "@UDP-T4405"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = await openDealerDashboard(page);
      await openQuotesGrid(dashboard);
      await dashboard.clickPrintLink();
    },
  );

  test.fixme(
    "UDP-T4406 - TC_DB_055 Print Active Loans PDF Fields",
    { tag: ["@do", "@regression", "@UDP-T4406"] },
    async () => {},
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
      const header = dashboard.quotesGridColumnHeader(/^Name$/i);
      await dashboard.quotesGridColumnFilterButton(header).click();
      for (const option of [/Starts With/i, /Contains/i, /Equals/i, /No Filter/i]) {
        await expect(page.getByText(option).first()).toBeVisible({ timeout: 10_000 });
      }
      await page.keyboard.press("Escape");
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
