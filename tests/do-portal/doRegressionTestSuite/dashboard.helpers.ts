/**
 * Shared helpers for Dashboard.test.ts (UDP-T4352–UDP-T4413).
 */

import { expect, test, type Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DODashboardPage } from "../../../pages";
import settlementData from "../../../testData/do-portal/settlementTestData.json";

export const TLC_DEALER = settlementData.dealer || "Armstrong Prestige Wellington";

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

export const WORKFLOW_BUCKETS: Array<string | RegExp> = [
  /^Quote$/i,
  /^Assessment$/i,
  /^Approved$/i,
  /With Customer for Signing/i,
  /^Verification$/i,
  /^Settlement$/i,
  /Not Tracked/i,
];

export async function openDealerDashboard(page: Page): Promise<DODashboardPage> {
  const dashboard = new DODashboardPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboard.waitForAuthenticatedDashboard();
  await dashboard.selectDealer(TLC_DEALER);
  return dashboard;
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

export async function readFirstQuoteId(dashboard: DODashboardPage): Promise<string> {
  const row = dashboard.quotesGridTable().locator("tbody tr").first();
  await expect(row).toBeVisible({ timeout: 60_000 });
  const quoteIdCell = row.locator("td.text-primary, div.cursor-pointer.text-primary").first();
  return ((await quoteIdCell.innerText()) ?? "").trim();
}
