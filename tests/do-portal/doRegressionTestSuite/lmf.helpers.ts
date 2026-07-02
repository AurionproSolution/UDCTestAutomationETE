/**
 * Shared helpers for LMF.test.ts (UDP-T3932–UDP-T3940).
 */

import { expect, type Page } from "@playwright/test";
import { readFileSync } from "fs";
import path from "path";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAssetDetailsPage,
  DODashboardPage,
  DOQuickQuotePage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";

interface LmfConfig {
  authorisedDealer: string;
  unauthorisedDealer: string;
  lmfConfigured: { product: string; program: string };
  lmfZeroConfigured: { product: string; program: string };
  quickQuote: { product: string; program: string; standardQuoteProgram?: string };
}

const CONFIG_PATH = path.join(process.cwd(), "testData", "do-portal", "lmf-config.json");

export function loadLmfConfig(): LmfConfig {
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as LmfConfig;
}

export function authorisedDealer(): string {
  return process.env.LMF_AUTHORISED_DEALER?.trim() || loadLmfConfig().authorisedDealer;
}

export function unauthorisedDealer(): string {
  return process.env.LMF_UNAUTHORISED_DEALER?.trim() || loadLmfConfig().unauthorisedDealer;
}

export function standardQuoteRoot(page: Page) {
  return page.locator("app-quote-details, app-standard-quote").first();
}

export async function openStandardQuoteForDealer(
  page: Page,
  dealerName: string,
): Promise<{ dashboard: DODashboardPage; asset: DOAssetDetailsPage }> {
  const dashboard = new DODashboardPage(page);
  const asset = new DOAssetDetailsPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboard.waitForAuthenticatedDashboard();
  await dashboard.selectDealer(dealerName);
  await dashboard.clickCreateStandardQuote();
  await dashboard.selectCSAproduct();
  await expect(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  return { dashboard, asset };
}

export async function selectProductProgram(
  asset: DOAssetDetailsPage,
  product: string,
  program: string,
): Promise<void> {
  await asset.chooseProduct(product);
  await asset.chooseProgram(program);
  await asset.waitForQuoteLoadersToFinish();
}

export async function addMinimalUsedAssetForLmf(
  asset: DOAssetDetailsPage,
  addAsset: DOAddAssetPage,
): Promise<void> {
  await asset.enterAsset("Car and Light Commercial /");
  await asset.selectCondition("Used");
  await asset.openAssetInsuranceTradeInSummary();
  await asset.clickAssetSummaryEditButton();
  await addAsset.enterAssetValue("$20,000");
  await addAsset.selectCondition("Used");
  await addAsset.selectYear("2025");
  await addAsset.enterMake("Toyota");
  await addAsset.enterModel("Hilux");
  await addAsset.enterVariant("Top");
  await addAsset.enterRegoNO("TG08BP5123");
  await addAsset.enterVIN("1HGCM82633A004352");
  await addAsset.enterOdometer("50000");
  await addAsset.enterColour("Black");
  await addAsset.enterSerialNO("0999944477");
  await addAsset.enterEngineNO("1133445588");
  await addAsset.enterCCRating("5");
  await addAsset.chooseMotivePower("Petrol");
  await addAsset.chooseCountryRegistered("New Zealand");
  await addAsset.chooseAssetLocation("North Island");
  await addAsset.clickSummitButton();
  await addAsset.clickCrossButton();
}

/** Calculable CSA quote with LMF-populated pricing after **Calculate**. */
export async function prepareCalculableLmfQuote(
  page: Page,
  asset: DOAssetDetailsPage,
  opts?: { product?: string; program?: string; origRef?: string },
): Promise<void> {
  const cfg = loadLmfConfig();
  const addAsset = new DOAddAssetPage(page);
  await selectProductProgram(
    asset,
    opts?.product ?? cfg.lmfConfigured.product,
    opts?.program ?? cfg.lmfConfigured.program,
  );
  await addMinimalUsedAssetForLmf(asset, addAsset);
  await asset.termsOfFinance("36");
  await asset.interestRate("4");
  await asset.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await asset.enterOriginationReference(opts?.origRef ?? "SQ-LMF-CALC");
  await asset.clickCalculateButton();
  await asset.waitForLoadingComplete(120_000);
  await asset.enterOriginationReference(opts?.origRef ?? "SQ-LMF-CALC");
  await asset.interestRate("4");
  await asset.clickCalculateButton();
  await asset.waitForLoadingComplete(120_000);
}

export async function openQuickQuoteStandardQuoteForDealer(
  page: Page,
  dealerName: string,
): Promise<{ asset: DOAssetDetailsPage; quickQuote: DOQuickQuotePage }> {
  const cfg = loadLmfConfig();
  const dashboard = new DODashboardPage(page);
  const quickQuote = new DOQuickQuotePage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboard.waitForAuthenticatedDashboard();
  await dashboard.selectDealer(dealerName);
  await quickQuote.openQuickQuote();
  await expect(quickQuote.quickQuoteRoot).toBeVisible({ timeout: 90_000 });

  await quickQuote.selectProduct(cfg.quickQuote.product);
  await quickQuote.dismissQuickQuoteDropdownOverlays();
  if (await quickQuote.programDropdownTrigger.isEnabled()) {
    await quickQuote.selectProgram(cfg.quickQuote.program);
  }
  await quickQuote.dismissQuickQuoteDropdownOverlays();
  await quickQuote.selectFrequency("Monthly");
  await quickQuote.enterInterestRatePercent("4");
  await quickQuote.enterTermsMonths("36");
  await quickQuote.enterCashPrice("$20,000");
  await quickQuote.enterDepositPercent("10%");
  await quickQuote.enterBalloonPercent("0");
  await quickQuote.clickCalculate();
  await quickQuote.expectCreateQuoteVisible();
  await quickQuote.clickCreateQuote();

  await expect(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  const asset = new DOAssetDetailsPage(page);
  await asset.waitForQuoteLoadersToFinish();
  const sqProgram =
    process.env.LMF_QUICK_QUOTE_SQ_PROGRAM?.trim() || cfg.quickQuote.standardQuoteProgram;
  if (sqProgram) {
    await asset.chooseProgram(sqProgram);
    await asset.waitForQuoteLoadersToFinish();
  }
  return { asset, quickQuote };
}

/** After QQ → SQ, run **Calculate** so LMF / Waive LMF rows populate on Asset Details. */
export async function calculateQuickQuoteStandardQuote(
  asset: DOAssetDetailsPage,
  origRef = "SQ-LMF-QQ-CALC",
): Promise<void> {
  await asset.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await asset.enterOriginationReference(origRef);
  await asset.clickCalculateButton();
  await asset.waitForLoadingComplete(120_000);
  await asset.enterOriginationReference(origRef);
  await asset.clickCalculateButton();
  await asset.waitForLoadingComplete(120_000);
}
