/**
 * Shared helpers for Dashboard.test.ts (UDP-T4352–UDP-T4413).
 */

import { expect, test, type Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DODashboardPage } from "../../../pages";
import settlementData from "../../../testData/do-portal/settlementTestData.json";

export const TLC_DEALER = settlementData.dealer || "Armstrong Prestige Wellington";

/** Dealer with AFV product authorisation — required for AFV Loans dashboard grid (UDP-T4390+). */
export const AFV_DASHBOARD_DEALER =
  process.env.AFV_DASHBOARD_DEALER ??
  process.env.AFV_SQ_DEALER ??
  "Armstrong Prestige - Audi";

export const QUOTE_GRID_COLUMNS: RegExp[] = [
  /^Date$/i,
  /Quote\s*ID/i,
  /^Name$/i,
  /Co-?borrower\s*Name/i,
  /^Product$/i,
  /^Amount$/i,
  /Term\s*\(?Months?\)?/i,
  /^Originator$/i,
  /^Salesperson$/i,
  /Webform\s*Checkbox/i,
  /Workflow\s*Status/i,
  /Assigned\s*To/i,
  /^Actions$/i,
];

export const ACTIVE_LOAN_COLUMNS: RegExp[] = [
  /Loan\s*ID/i,
  /Customer\s*Name/i,
  /Co-?borrower\s*Name/i,
  /^Asset$/i,
  /Rego|ID\s*No/i,
  /Amount\s*Financed/i,
  /Maturity\s*Date/i,
  /^Product$/i,
  /Outstanding\s*Balance/i,
  /^Originator$/i,
];

export const AFV_LOAN_COLUMNS: RegExp[] = [
  /Loan\s*ID/i,
  /Customer\s*Name/i,
  /Co-?borrower\s*Name/i,
  /^Asset$/i,
  /^Rego$/i,
  /Future\s*Value\s*Date/i,
  /Future\s*Value\s*Amount/i,
  /Outstanding\s*Balance/i,
  /^Originator$/i,
];

/** Portal buckets shown on the Workflow Status widget (Zephyr UDP-T4355). */
export const WORKFLOW_BUCKETS: Array<string | RegExp> = [
  "Quote",
  "Assessment",
  "Approved",
  "With Customer for Signing",
  "Verification",
  "Settlement",
];

export async function openDealerDashboard(page: Page): Promise<DODashboardPage> {
  const dashboard = new DODashboardPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboard.waitForAuthenticatedDashboard();
  await dashboard.selectDealer(TLC_DEALER);
  return dashboard;
}

export async function openAfvDealerDashboard(page: Page): Promise<DODashboardPage> {
  const dashboard = new DODashboardPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboard.waitForAuthenticatedDashboard();
  await dashboard.selectDealer(AFV_DASHBOARD_DEALER);
  return dashboard;
}

/** Open AFV Loans grid or skip when the listing type is absent for the dealer. */
export async function openAfvLoansGrid(dashboard: DODashboardPage): Promise<void> {
  const available = await dashboard.tryNavigateToDealerListingAfvLoans();
  if (!available) {
    test.skip(true, `AFV Loans listing not available for dealer (${AFV_DASHBOARD_DEALER}).`);
  }
}

export function requireLoanId(value: string, label: string): string {
  if (!value?.trim()) {
    test.skip(true, `Populate settlementTestData.json → ${label} for this scenario.`);
  }
  return value.trim();
}

export async function expectFirstQuoteRowVisible(dashboard: DODashboardPage): Promise<void> {
  await expect(dashboard.quotesGridTable().locator("tbody tr").first()).toBeVisible({
    timeout: 60_000,
  });
}

/** Quote ID or loan ID from a listing grid row (0-based index). */
export async function readQuoteGridRowId(
  dashboard: DODashboardPage,
  rowIndex = 0,
): Promise<string> {
  const rows = dashboard.quotesGridTable().locator("tbody tr");
  await expect(rows.first()).toBeVisible({ timeout: 60_000 });
  if (rowIndex > 0) {
    const count = await rows.count();
    if (count <= rowIndex) {
      test.skip(true, `Need at least ${rowIndex + 1} grid rows; found ${count}.`);
    }
  }
  const row = rows.nth(rowIndex);
  await expect(row).toBeVisible({ timeout: 60_000 });
  const idCell = row.locator("td.text-primary, div.cursor-pointer.text-primary").first();
  const ref = ((await idCell.innerText()) ?? "").trim();
  if (!ref) {
    throw new Error(`Grid row ${rowIndex + 1} has no quote/loan id cell text.`);
  }
  return ref;
}

export async function readFirstQuoteId(dashboard: DODashboardPage): Promise<string> {
  return readQuoteGridRowId(dashboard, 0);
}
