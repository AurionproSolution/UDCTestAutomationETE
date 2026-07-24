/**
 * Shared helpers for Dashboard.test.ts (UDP-T4352–UDP-T4413).
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { expect, test, type Download, type Locator, type Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DODashboardPage, DOCustomerStatementPage } from "../../../pages";
import settlementData from "../../../testData/do-portal/settlementTestData.json";

export const TLC_DEALER =
  process.env.TLC_DEALER?.trim() ||
  process.env.DO_DEALER?.trim() ||
  settlementData.dealer ||
  "Armstrong Prestige Wellington";

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
  /^Asset\b/i,
  /Rego|ID\s*No/i,
  /Amount\s*Financed/i,
  /Maturity\s*Date/i,
  /^Product$/i,
  /Outstanding\s*Balance/i,
  /^Originator$/i,
];

/** UDP-T4383 — OL View Statement **Rental Schedule** column headers. */
export const OL_RENTAL_SCHEDULE_COLUMNS: RegExp[] = [
  /Payment Date/i,
  /Total\s*Payment/i,
  /^Payment$/i,
  /^GST$/i,
];

export const AFV_LOAN_COLUMNS: RegExp[] = [
  /Loan\s*ID/i,
  /Customer\s*Name/i,
  /Co-?borrower\s*Name/i,
  /^Asset\b/i,
  /^Rego$/i,
  /Future\s*Value\s*Date/i,
  /Future\s*Value\s*Amount/i,
  /Outstanding\s*Balance/i,
  /^Originator$/i,
];

/** UDP-T4402 — Active Loans export includes more fields than the dashboard grid. */
export const ACTIVE_LOAN_EXPORT_COLUMNS: RegExp[] = [
  /Loan\s*ID/i,
  /Customer\s*Name/i,
  /Co-?borrower\s*Name/i,
  /^Asset\b/i,
  /Rego|ID\s*No/i,
  /Amount\s*Financed/i,
  /Term\s*\(?Months?\)?/i,
  /Remaining\s*Term/i,
  /Start\s*Date/i,
  /Maturity\s*Date/i,
  /^Product$/i,
  /Regular\s*Payment\s*Amount/i,
  /Final\s*Payment|Residual\s*Value/i,
  /Total\s*Unit\s*Usage/i,
  /Interest\s*Rate/i,
  /Outstanding\s*Balance/i,
  /^Originator$/i,
  /^Email$/i,
  /^Phone$/i,
];

/** UDP-T4403 — AFV Loans export (KM Allowance Per Annum + Customer Decision). */
export const AFV_LOAN_EXPORT_COLUMNS: RegExp[] = [
  /Loan\s*ID/i,
  /Customer\s*Name/i,
  /Co-?borrower\s*Name/i,
  /^Asset\b/i,
  /^Rego$/i,
  /Term\s*\(?Months?\)?/i,
  /Remaining\s*Term/i,
  /Start\s*Date/i,
  /^Product$/i,
  /Regular\s*Payment\s*Amount/i,
  /KM\s*Allowance\s*Per\s*Annum|Max(?:imum)?\s*Permitted\s*KM/i,
  /Future\s*Value\s*Date/i,
  /Future\s*Value\s*Amount/i,
  /Outstanding\s*Balance/i,
  /Interest\s*Rate/i,
  /^Provider$/i,
  /Customer\s*Decision/i,
  /^Originator$/i,
  /^Email$/i,
  /^Phone$/i,
];

/** UDP-T4405 — Quotes print PDF column headers. */
export const QUOTE_PRINT_COLUMNS: RegExp[] = [
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
];

/** UDP-T4406 — Active Loans print PDF column headers. */
export const ACTIVE_LOAN_PRINT_COLUMNS: RegExp[] = [
  /Loan\s*ID/i,
  /Customer\s*Name/i,
  /Co-?borrower\s*Name/i,
  /^Asset\b/i,
  /Rego|ID\s*No/i,
  /Amount\s*Financed/i,
  /Maturity\s*Date/i,
  /^Product$/i,
  /Outstanding\s*Balance/i,
  /^Originator$/i,
  /^Email$/i,
  /^Phone$/i,
];

function parseCsvHeaderLine(line: string): string[] {
  const headers: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      headers.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  headers.push(current.trim());
  return headers;
}

export function readExportFileHeaderLine(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf-8");
  const line = content.split(/\r?\n/).find((row) => row.trim().length > 0);
  if (!line) {
    throw new Error(`Export file has no header row: ${filePath}`);
  }
  return line;
}

export async function saveDashboardDownload(download: Download): Promise<string> {
  const savePath = path.join(
    os.tmpdir(),
    `dashboard-export-${Date.now()}-${download.suggestedFilename()}`,
  );
  await download.saveAs(savePath);
  return savePath;
}

function exportColumnMatchesHeader(header: string, column: RegExp): boolean {
  const normalized = header.replace(/\s+/g, " ").trim();
  if (column.test(normalized)) {
    return true;
  }
  const source = column.source.replace(/^\^/, "").replace(/\$$/, "");
  const flags = column.flags.includes("i") ? "i" : "";
  const prefix = new RegExp(`^\\s*${source}(\\b|\\s|\\(|/)`, flags);
  return prefix.test(normalized);
}

export async function expectExportFileContainsColumns(
  filePath: string,
  columns: RegExp[],
): Promise<void> {
  const headerLine = readExportFileHeaderLine(filePath);
  const headers = parseCsvHeaderLine(headerLine);
  for (const column of columns) {
    const matched = headers.some((h) => exportColumnMatchesHeader(h, column));
    expect(matched, `Export missing column matching ${column} in: ${headerLine}`).toBe(true);
  }
}

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

/** Loan ID from an active-loan grid row. */
async function readActiveLoanIdFromRow(row: Locator): Promise<string> {
  await expect(row).toBeVisible({ timeout: 15_000 });
  const idCell = row
    .locator("td.text-primary, td.cursor-pointer.text-primary, div.cursor-pointer.text-primary")
    .first();
  const loanId = ((await idCell.innerText()) ?? "").trim();
  if (!loanId) {
    throw new Error("Active loan row has no loan id cell.");
  }
  return loanId;
}

/** Loan ID from a Finance Lease active-loan grid row. */
async function readFinanceLeaseLoanIdFromRow(row: Locator): Promise<string> {
  return readActiveLoanIdFromRow(row);
}

async function collectOperatingLeaseLoanIds(dashboard: DODashboardPage): Promise<string[]> {
  await dashboard.navigateToDealerListingActiveLoans();
  await dashboard.searchQuotesGrid("Operating");
  const rows = dashboard
    .quotesGridTable()
    .locator("tbody tr")
    .filter({ hasText: /Operating\s*Lease/i });
  const count = await rows.count();
  if (count === 0) {
    test.skip(true, "No Operating Lease active loan row found after grid search.");
  }
  const loanIds: string[] = [];
  for (let i = 0; i < count; i++) {
    loanIds.push(await readActiveLoanIdFromRow(rows.nth(i)));
  }
  return loanIds;
}

export async function openOperatingLeaseStatementForLoan(
  page: Page,
  dashboard: DODashboardPage,
  loanId: string,
): Promise<DOCustomerStatementPage> {
  await dashboard.openViewStatementForLoan(loanId);
  const statement = new DOCustomerStatementPage(page);
  await statement.waitForReady();
  await expect(
    statement
      .paymentDetailsRoot()
      .getByRole("radio", { name: /Rental\s*Summary|Payment\s*Summary/i }),
  ).toBeVisible({ timeout: 30_000 });
  return statement;
}

/** First **Finance Lease** active-loan row after filtering the grid (e.g. search `Finance`). */
export async function readFinanceLeaseLoanId(dashboard: DODashboardPage): Promise<string> {
  const row = dashboard
    .quotesGridTable()
    .locator("tbody tr")
    .filter({ hasText: /Finance\s*Lease/i })
    .first();
  if (!(await row.isVisible({ timeout: 15_000 }).catch(() => false))) {
    test.skip(true, "No Finance Lease active loan row found after grid search.");
  }
  return readFinanceLeaseLoanIdFromRow(row);
}

/** Active Loans → search Finance → **View Statement** for a Finance Lease loan. */
export async function openFinanceLeaseStatement(
  page: Page,
  opts?: { requireLeaseScheduleGst?: boolean },
): Promise<DOCustomerStatementPage> {
  const dashboard = await openDealerDashboard(page);
  await dashboard.navigateToDealerListingActiveLoans();
  await dashboard.searchQuotesGrid("Finance");

  const rows = dashboard
    .quotesGridTable()
    .locator("tbody tr")
    .filter({ hasText: /Finance\s*Lease/i });
  const count = await rows.count();
  if (count === 0) {
    test.skip(true, "No Finance Lease active loan row found after grid search.");
  }

  const loanIds: string[] = [];
  for (let i = 0; i < count; i++) {
    loanIds.push(await readFinanceLeaseLoanIdFromRow(rows.nth(i)));
  }

  for (let i = 0; i < loanIds.length; i++) {
    const loanId = loanIds[i];
    await dashboard.openViewStatementForLoan(loanId);
    const statement = new DOCustomerStatementPage(page);
    await statement.waitForReady();
    await expect(
      statement.paymentDetailsRoot().getByRole("radio", { name: /Lease Summary/i }),
    ).toBeVisible({ timeout: 30_000 });

    if (!opts?.requireLeaseScheduleGst || (await statement.leaseScheduleHasGstColumn())) {
      return statement;
    }

    if (i < loanIds.length - 1) {
      await statement.clickPreviousToDashboard();
      await dashboard.navigateToDealerListingActiveLoans();
      await dashboard.searchQuotesGrid("Finance");
/** Seeded OL loan Rego/VIN/Loan ID, or first **Operating Lease** row in Active Loans. */
export async function resolveOlActiveLoanReference(dashboard: DODashboardPage): Promise<string> {
  const seeded = settlementData.dealerListing.olActivatedLoanRegoOrVin?.trim();
  if (seeded) {
    return seeded;
  }

  await dashboard.navigateToDealerListingActiveLoans();
  const rows = dashboard.quotesGridTable().locator("tbody tr");
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    if (!(await row.isVisible({ timeout: 2_000 }).catch(() => false))) {
      continue;
    }
    const product = await dashboard.readQuoteGridColumnForRow(row, /^Product$/i);
    if (!/Operating\s*Lease/i.test(product)) {
      continue;
    }
    const rego = await dashboard.readQuoteGridColumnForRow(row, /Rego|ID\s*No/i);
    if (rego.trim().length > 0) {
      return rego.trim();
    }
    const loanId = await dashboard.readQuoteGridColumnForRow(row, /Loan\s*ID/i);
    if (loanId.trim().length > 0) {
      return loanId.trim();
    }
  }

  test.skip(
    true,
    "No Finance Lease statement exposes a GST column on Lease Schedule (UDP-T4381 seed data).",
  );
}

/** Active Loans → search Operating → **View Statement** for an Operating Lease loan. */
export async function openOperatingLeaseStatement(
  page: Page,
  opts?: { requireBuybackDetails?: boolean },
): Promise<DOCustomerStatementPage> {
  const dashboard = await openDealerDashboard(page);
  const loanIds = await collectOperatingLeaseLoanIds(dashboard);

  for (let i = 0; i < loanIds.length; i++) {
    const statement = await openOperatingLeaseStatementForLoan(page, dashboard, loanIds[i]);
    const hasBuyback = await statement.hasBuybackDetailsSection();

    if (opts?.requireBuybackDetails === undefined || opts.requireBuybackDetails === hasBuyback) {
      return statement;
    }

    if (i < loanIds.length - 1) {
      await statement.clickPreviousToDashboard();
      await dashboard.navigateToDealerListingActiveLoans();
      await dashboard.searchQuotesGrid("Operating");
    }
  }

  const reason = opts?.requireBuybackDetails
    ? "No Operating Lease statement with visible Buyback Details (UDP-T4385 — matching buyback/dealer party)."
    : "No Operating Lease statement without Buyback Details (UDP-T4385 — non-matching buyback/dealer party).";
  test.skip(true, reason);
}

/** Finds OL loan IDs with and without **Buyback Details** (UDP-T4385). */
export async function findOperatingLeaseBuybackLoanIds(page: Page): Promise<{
  dashboard: DODashboardPage;
  withBuybackId: string;
  withoutBuybackId: string;
}> {
  const dashboard = await openDealerDashboard(page);
  const loanIds = await collectOperatingLeaseLoanIds(dashboard);

  let withBuybackId: string | undefined;
  let withoutBuybackId: string | undefined;

  for (let i = 0; i < loanIds.length; i++) {
    const statement = await openOperatingLeaseStatementForLoan(page, dashboard, loanIds[i]);
    const hasBuyback = await statement.hasBuybackDetailsSection();
    if (hasBuyback && !withBuybackId) {
      withBuybackId = loanIds[i];
    } else if (!hasBuyback && !withoutBuybackId) {
      withoutBuybackId = loanIds[i];
    }
    if (withBuybackId && withoutBuybackId) {
      break;
    }
    if (i < loanIds.length - 1) {
      await statement.clickPreviousToDashboard();
      await dashboard.navigateToDealerListingActiveLoans();
      await dashboard.searchQuotesGrid("Operating");
    }
  }

  if (!withBuybackId || !withoutBuybackId) {
    test.skip(
      true,
      "Need both OL statements: one with Buyback Details (matching party) and one without (UDP-T4385 seed data).",
    );
  }

  return { dashboard, withBuybackId: withBuybackId!, withoutBuybackId: withoutBuybackId! };
}

/** AFV Loans listing → **View Statement** for first AFV loan row. */
export async function openAfvLoanStatement(page: Page): Promise<DOCustomerStatementPage> {
  const dashboard = await openAfvDealerDashboard(page);
  await openAfvLoansGrid(dashboard);
  const loanId = await readQuoteGridRowId(dashboard, 0);
  await dashboard.openViewStatementForLoan(loanId);
  const statement = new DOCustomerStatementPage(page);
  await statement.waitForReady();
  await expect(
    statement.paymentDetailsRoot().getByRole("radio", { name: /Payment Summary/i }),
  ).toBeVisible({ timeout: 30_000 });
  return statement;
    "No Operating Lease active loan in dealer listing; set dealerListing.olActivatedLoanRegoOrVin in settlementTestData.json.",
  );
  return "";
}
