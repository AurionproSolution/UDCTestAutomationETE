/**
 * Shared Quick Quote regression helpers (entry, product setup, payment calculate).
 * Product-specific Solve For flows live in quickQuoteSolveFor.helpers.ts.
 */

import { expect } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DODashboardPage, DOQuickQuotePage } from "../../../pages";
import { TLC_DEALER } from "./dashboard.helpers";

export { TLC_DEALER };

export const CSA_C_QQ_PRODUCT = "CSA-C-Assigned";
export const CSA_C_QQ_PROGRAM = "CSA Personal - MV Dealer";

export const TL_QQ_PRODUCT = "TL-B-Assigned";
export const TL_QQ_PROGRAM = "Term Loan Business - MV Dealer";

export const AFV_QQ_PRODUCT = "AFV-B-Assigned";
export const AFV_QQ_PROGRAM = "AFV - B-Distributor";
export const AFV_QQ_DEALER = process.env.AFV_QQ_DEALER ?? "Armstrong Prestige - Audi";

export const AFV_QQ_VEHICLE = {
  make: "SUZUKI",
  model: "IGNIS",
  variant: "GLX MANUAL 1.2P/ 5MT",
  year: "2024",
};

export type OpenQuickQuoteOptions = {
  dealer?: string;
};

export function parseCurrency(value: string): number {
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function openQuickQuoteFromDashboard(
  page: Page,
  options: OpenQuickQuoteOptions = {},
): Promise<{
  dashboardPage: DODashboardPage;
  quickQuotePage: DOQuickQuotePage;
}> {
  const dealer = options.dealer?.trim() || TLC_DEALER;
  const dashboardPage = new DODashboardPage(page);
  const quickQuotePage = new DOQuickQuotePage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(dealer);
  await quickQuotePage.openQuickQuote();
  await expect.soft(quickQuotePage.quickQuoteRoot).toBeVisible();
  await expect.soft(quickQuotePage.quickQuoteForm).toBeVisible();
  return { dashboardPage, quickQuotePage };
}

export async function selectCsaCProductAndProgram(
  _page: Page,
  quickQuotePage: DOQuickQuotePage,
): Promise<void> {
  await quickQuotePage.selectProduct(CSA_C_QQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  await quickQuotePage.selectProgramIfNeeded(CSA_C_QQ_PROGRAM);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
}

export async function selectTlProductAndProgram(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await quickQuotePage.selectProduct(TL_QQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  await quickQuotePage.selectProgramIfNeeded(TL_QQ_PROGRAM);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  await quickQuotePage.waitForLoadingComplete();
}

export async function selectAfVProduct(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await quickQuotePage.selectProduct(AFV_QQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
}

export async function selectAfVAssetTypeAndWait(
  quickQuotePage: DOQuickQuotePage,
  vehicle = AFV_QQ_VEHICLE,
): Promise<void> {
  await quickQuotePage.selectAfvVehicleFromAssetTypeModal(vehicle, 0);
  await quickQuotePage.ensureAfVProgramForQuote(0, AFV_QQ_PROGRAM);
}

export async function setupAfVQuoteWithAsset(
  page: Page,
  vehicle = AFV_QQ_VEHICLE,
): Promise<DOQuickQuotePage> {
  const { quickQuotePage } = await openQuickQuoteFromDashboard(page, { dealer: AFV_QQ_DEALER });
  await selectAfVProduct(quickQuotePage);
  await selectAfVAssetTypeAndWait(quickQuotePage, vehicle);
  return quickQuotePage;
}

export async function calculateAfVQuickQuote(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await quickQuotePage.ensureMandatoryAfVFieldsForCalculate();
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();
}

/** AFV comparison panel: product → asset modal → mandatory fields → Calculate. */
export async function fillAfVQuickQuotePanelAndCalculate(
  page: Page,
  quickQuotePage: DOQuickQuotePage,
  quoteIndex: number,
  vehicle = AFV_QQ_VEHICLE,
): Promise<void> {
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  if (quoteIndex === 0) {
    await quickQuotePage.selectProduct(AFV_QQ_PRODUCT);
  } else {
    await quickQuotePage.selectProductOnQuote(quoteIndex, AFV_QQ_PRODUCT);
  }
  await quickQuotePage.selectAfvVehicleFromAssetTypeModal(vehicle, quoteIndex);
  await page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(() => {});
  await quickQuotePage.waitForAfVFieldsAfterAssetSelection();
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  await quickQuotePage.ensureMandatoryAfVFieldsForCalculate();
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  await expect(
    quickQuotePage.quoteForm(quoteIndex).getByRole("button", { name: /^Calculate$/i }),
  ).toBeEnabled({ timeout: 45_000 });
  await quickQuotePage.clickCalculateOnQuote(quoteIndex);
  await quickQuotePage.expectCreateQuoteVisible(quoteIndex);
  await quickQuotePage.expectCalculationSummaryWithTotals(quoteIndex);
}

/** Core payment-mode mandatory fields (frequency, rate, term, cash price). */
export async function fillMandatoryPaymentFieldsCore(
  quickQuotePage: DOQuickQuotePage,
): Promise<void> {
  await quickQuotePage.selectFrequency("Monthly");
  await quickQuotePage.enterInterestRatePercent("9");
  await quickQuotePage.enterTermsMonths("36");
  await quickQuotePage.enterCashPrice("$20,000");
}

/** Payment Solve For — includes deposit and balloon inputs before calculate. */
export async function fillMandatoryPaymentModeFields(
  quickQuotePage: DOQuickQuotePage,
): Promise<void> {
  await fillMandatoryPaymentFieldsCore(quickQuotePage);
  await quickQuotePage.enterDepositPercent("10%");
  await quickQuotePage.enterBalloonPercent("0");
}

/** @deprecated Use {@link fillMandatoryPaymentModeFields}. */
export async function fillMandatoryPaymentFields(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await fillMandatoryPaymentModeFields(quickQuotePage);
}

/** TL regression — full field bundle for reset / edit tests. */
export async function fillAllTlQuickQuoteFields(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await quickQuotePage.enterCashPrice("$25,000");
  await quickQuotePage.enterDepositPercent("15%");
  await quickQuotePage.enterBalloonPercent("10%");
  await quickQuotePage.selectFrequency("Monthly");
  await quickQuotePage.enterInterestRatePercent("11.5");
  await quickQuotePage.enterTermsMonths("48");
}

/** Standard payment-mode calculate used across CSA-C, TL, and CSA-B. */
export async function calculatePaymentModeQuote(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await fillMandatoryPaymentModeFields(quickQuotePage);
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();
}

/** @deprecated Use {@link calculatePaymentModeQuote}. */
export async function calculateStandardPaymentQuote(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await calculatePaymentModeQuote(quickQuotePage);
}

/** @deprecated Use {@link calculatePaymentModeQuote}. */
export async function calculateTlQuickQuote(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await calculatePaymentModeQuote(quickQuotePage);
}
