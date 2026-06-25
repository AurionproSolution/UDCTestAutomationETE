/**
 * DO Portal — Total Amount Borrowed regression (UDP-T3818–UDP-T3822).
 * Scenario source: Total amt Borrowed.xlsx (Zephyr / Regression 25.0).
 * Product inferred: CSA-C-Assigned (Excel Product column blank; aligned with CSA SQ/QQ regression).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAssetDetailsPage,
  DODashboardPage,
  DOQuickQuotePage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";

const TAB_SQ_PRODUCT = "CSA-C-Assigned";
const TAB_SQ_PROGRAM = "Webform - CSA Personal - MV Dealer";
const TAB_QQ_PROGRAM = "CSA Personal - MV Dealer";
const TLC_DEALER = "Armstrong Prestige Wellington";

function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

function parseMaskedCurrency(raw: string): number {
  const n = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function readQuickQuoteLoanAmount(quickQuotePage: DOQuickQuotePage): Promise<number> {
  const summary = quickQuotePage.calculationSummaryRegion.first();
  await expect(summary).toBeVisible({ timeout: 30_000 });
  const text = (await summary.innerText()).replace(/\s+/g, " ");
  const patterns = [
    /Loan\s+Amount[^$0-9]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /Amount\s+Financed[^$0-9]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseMaskedCurrency(match[1]);
  }
  return 0;
}

async function openStandardQuoteFromDashboard(page: Page): Promise<{
  dashboardPage: DODashboardPage;
  assetDetailsPage: DOAssetDetailsPage;
}> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectCSAproduct();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  return { dashboardPage, assetDetailsPage };
}

async function selectCsaProductAndProgram(assetDetailsPage: DOAssetDetailsPage): Promise<void> {
  await assetDetailsPage.chooseProduct(TAB_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(TAB_SQ_PROGRAM);
}

async function addMinimalUsedAsset(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
): Promise<void> {
  await assetDetailsPage.enterAsset("Car and Light Commercial /");
  await assetDetailsPage.selectCondition("Used");
  await assetDetailsPage.openAssetInsuranceTradeInSummary();
  await assetDetailsPage.clickAssetSummaryEditButton();
  await addAssetPage.enterAssetValue("$20,000");
  await addAssetPage.selectCondition("Used");
  await addAssetPage.selectYear("2025");
  await addAssetPage.enterMake("Toyota");
  await addAssetPage.enterModel("Hilux");
  await addAssetPage.enterVariant("Top");
  await addAssetPage.clickSummitButton();
  await addAssetPage.clickCrossButton();
}

async function prepareCalculableCsaQuote(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
): Promise<void> {
  await addMinimalUsedAsset(assetDetailsPage, addAssetPage);
  await assetDetailsPage.termsOfFinance("36");
  await assetDetailsPage.interestRate("9");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await assetDetailsPage.enterOriginationReference("TAB-SQ-Ref-01");
}

async function completeQuickQuoteForCarryOver(
  page: Page,
  quickQuotePage: DOQuickQuotePage,
): Promise<number> {
  await quickQuotePage.openQuickQuote();
  await expect.soft(quickQuotePage.quickQuoteRoot).toBeVisible();
  await quickQuotePage.selectProduct(TAB_SQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  if (await quickQuotePage.programDropdownTrigger.isEnabled()) {
    await quickQuotePage.selectProgram(TAB_QQ_PROGRAM);
  }
  await quickQuotePage.selectFrequency("Monthly");
  await quickQuotePage.enterInterestRatePercent("9");
  await quickQuotePage.enterTermsMonths("36");
  await quickQuotePage.enterCashPrice("$20,000");
  await quickQuotePage.enterDepositPercent("10%");
  await quickQuotePage.enterBalloonPercent("0");
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();

  await expect
    .poll(async () => await readQuickQuoteLoanAmount(quickQuotePage), { timeout: 45_000 })
    .toBeGreaterThan(0);
  const qqLoanAmount = await readQuickQuoteLoanAmount(quickQuotePage);

  await quickQuotePage.clickCreateQuote();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  return qqLoanAmount;
}

test.describe("Total Amount Borrowed", () => {
  test(
    "UDP-T3818 - Total Amount Borrowed defaults from Quick Quote",
    { tag: ["@do", "@regression", "@UDP-T3818"] },
    async ({ page }) => {
      test.setTimeout(1_200_000);

      const dashboardPage = new DODashboardPage(page);
      const quickQuotePage = new DOQuickQuotePage(page);
      const assetDetailsPage = new DOAssetDetailsPage(page);

      await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
      await dashboardPage.waitForAuthenticatedDashboard();
      await dashboardPage.selectDealer(TLC_DEALER);

      const qqLoanAmount = await completeQuickQuoteForCarryOver(page, quickQuotePage);
      await assetDetailsPage.waitForAssetDetailsStepReady();
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await assetDetailsPage.expectTotalAmountBorrowedReadOnly();
      await assetDetailsPage.expectTotalAmountBorrowedMatchesAmount(qqLoanAmount);
    },
  );

  test(
    "UDP-T3819 - Total Amount Borrowed shows $0.00 when accessed directly from dashboard",
    { tag: ["@do", "@regression", "@UDP-T3819"] },
    async ({ page }) => {
      test.setTimeout(900_000);

      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await assetDetailsPage.waitForAssetDetailsStepReady();
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await assetDetailsPage.expectTotalAmountBorrowedReadOnly();
      await assetDetailsPage.expectTotalAmountBorrowedZero();
    },
  );

  test(
    "UDP-T3820 - Total Amount Borrowed recalculates on clicking Calculate after adding asset",
    { tag: ["@do", "@regression", "@UDP-T3820"] },
    async ({ page }) => {
      test.setTimeout(1_200_000);

      const addAssetPage = new DOAddAssetPage(page);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await assetDetailsPage.waitForAssetDetailsStepReady();
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await assetDetailsPage.expectTotalAmountBorrowedZero();
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.cashPriceOfAsset("$20,000");

      const tabBeforeCalculate = await assetDetailsPage.readTotalAmountBorrowed();
      expect.soft(tabBeforeCalculate).toBe(0);

      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await assetDetailsPage.expectTotalAmountBorrowedReadOnly();
      await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero();
    },
  );

  test(
    "UDP-T3821 - Interest Charge field displays system-calculated value",
    { tag: ["@do", "@regression", "@UDP-T3821"] },
    async ({ page }) => {
      test.setTimeout(1_200_000);

      const addAssetPage = new DOAddAssetPage(page);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await assetDetailsPage.waitForAssetDetailsStepReady();
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.cashPriceOfAsset("$20,000");

      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await assetDetailsPage.expectInterestChargeReadOnly();
      await assetDetailsPage.expectInterestChargeNonNegative();
    },
  );

  test(
    "UDP-T3822 - Recalculation on modifying financial values",
    { tag: ["@do", "@regression", "@UDP-T3822"] },
    async ({ page }) => {
      test.setTimeout(1_200_000);

      const addAssetPage = new DOAddAssetPage(page);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await assetDetailsPage.waitForAssetDetailsStepReady();
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.cashPriceOfAsset("$20,000");

      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.waitForQuoteLoadersToFinish();
      await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero();
      await assetDetailsPage.expectInterestChargeNonNegative();

      const tabBefore = await assetDetailsPage.readTotalAmountBorrowed();
      const interestBefore = await assetDetailsPage.readInterestCharge();

      await assetDetailsPage.enterAdditionalFunds("$3,000");
      await assetDetailsPage.enterAdditionalFundsPurpose("Accessory / equipment upgrade");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await expect
        .poll(async () => await assetDetailsPage.readTotalAmountBorrowed(), { timeout: 60_000 })
        .not.toBe(tabBefore);
      await expect
        .poll(async () => await assetDetailsPage.readInterestCharge(), { timeout: 60_000 })
        .not.toBe(interestBefore);

      await assetDetailsPage.expectTotalAmountBorrowedReadOnly();
      await assetDetailsPage.expectInterestChargeReadOnly();
    },
  );
});
