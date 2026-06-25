/**
 * DO Portal — Total Amount Borrowed regression (UDP-T3818–UDP-T3822).
 * Scenario source: Total amt Borrowed.xlsx (Zephyr / Regression 25.0).
 * Product: AFV-B-Assigned / Program: AFV - B-Distributor (Total Amount Borrowed + Interest Charge are AFV fields).
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

const AFV_SQ_PRODUCT = "AFV-B-Assigned";
const AFV_SQ_PROGRAM = "AFV - B-Distributor";
const TLC_DEALER = "Armstrong Prestige Wellington";

const AFV_VEHICLE = {
  make: "SUZUKI",
  model: "IGNIS",
  variant: "GLX MANUAL 1.2P/ 5MT",
  year: "2024",
};

function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

function parseMaskedCurrency(raw: string): number {
  const n = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function readQuickQuoteBorrowedAmount(quickQuotePage: DOQuickQuotePage): Promise<number> {
  const summary = quickQuotePage.calculationSummaryRegion.first();
  await expect(summary).toBeVisible({ timeout: 30_000 });
  const text = (await summary.innerText()).replace(/\s+/g, " ");
  const patterns = [
    /Total\s+Amount\s+Borrowed[^$0-9]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /Loan\s+Amount[^$0-9]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /Amount\s+Financed[^$0-9]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseMaskedCurrency(match[1]);
  }
  return 0;
}

async function openAfVStandardQuoteFromDashboard(page: Page): Promise<{
  dashboardPage: DODashboardPage;
  assetDetailsPage: DOAssetDetailsPage;
}> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectAssuredFutureValueProduct();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.waitForAssetDetailsStepReady();
  return { dashboardPage, assetDetailsPage };
}

async function selectAfVProductOnQuote(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await assetDetailsPage.chooseProduct(AFV_SQ_PRODUCT);
  await expect.soft(standardQuoteRoot(page).getByText(AFV_SQ_PRODUCT).first()).toBeVisible({
    timeout: 30_000,
  });
}

async function selectAfVProductProgramAndAsset(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await selectAfVProductOnQuote(page, assetDetailsPage);
  await assetDetailsPage.selectVehicleFromAssetTypeModal(AFV_VEHICLE);
  await assetDetailsPage.waitForAfVCashPricePopulated();
  const program = await assetDetailsPage.readSelectedProgramLabel();
  if (!program || !/Distributor/i.test(program)) {
    await assetDetailsPage.chooseProgram(AFV_SQ_PROGRAM);
  }
}

async function prepareCalculableAfVQuote(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  opts?: { cashPrice?: string; interest?: string; term?: string },
): Promise<void> {
  await selectAfVProductProgramAndAsset(page, assetDetailsPage);
  await assetDetailsPage.selectConditionInStandardQuote("Used");
  if (opts?.cashPrice) {
    await assetDetailsPage.cashPriceOfAsset(opts.cashPrice);
  }
  const termVal = (await assetDetailsPage.termsOfFinanceInputField.inputValue().catch(() => "")).trim();
  if (!termVal || !/\d/.test(termVal)) {
    await assetDetailsPage.termsOfFinance(opts?.term ?? "36");
  }
  await assetDetailsPage.ensureKmAllowanceForAfV();
  const rate = (await assetDetailsPage.interestRateInputField.inputValue()).trim();
  if (!rate || !/\d/.test(rate)) {
    await assetDetailsPage.interestRate(opts?.interest ?? "4");
  }
  await assetDetailsPage.enterOriginationReference("TAB-AFV-Ref-01");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
}

async function completeAfVQuickQuoteForCarryOver(
  page: Page,
  quickQuotePage: DOQuickQuotePage,
): Promise<number> {
  await quickQuotePage.openQuickQuote();
  await expect.soft(quickQuotePage.quickQuoteRoot).toBeVisible();
  await quickQuotePage.selectProduct(AFV_SQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  await quickQuotePage.selectVehicleFromAssetTypeModal(AFV_VEHICLE);
  await quickQuotePage.waitForAfVFieldsAfterAssetSelection();
  await quickQuotePage.ensureMandatoryAfVFieldsForCalculate();
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();

  await expect
    .poll(async () => await readQuickQuoteBorrowedAmount(quickQuotePage), { timeout: 45_000 })
    .toBeGreaterThan(0);
  const qqBorrowedAmount = await readQuickQuoteBorrowedAmount(quickQuotePage);

  await quickQuotePage.clickCreateQuote();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  return qqBorrowedAmount;
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

      const qqBorrowedAmount = await completeAfVQuickQuoteForCarryOver(page, quickQuotePage);
      await assetDetailsPage.waitForAssetDetailsStepReady();
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await assetDetailsPage.expectTotalAmountBorrowedReadOnly();
      await assetDetailsPage.expectTotalAmountBorrowedMatchesAmount(qqBorrowedAmount);
    },
  );

  test(
    "UDP-T3819 - Total Amount Borrowed shows $0.00 when accessed directly from dashboard",
    { tag: ["@do", "@regression", "@UDP-T3819"] },
    async ({ page }) => {
      test.setTimeout(900_000);

      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductOnQuote(page, assetDetailsPage);
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

      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductOnQuote(page, assetDetailsPage);
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await assetDetailsPage.expectTotalAmountBorrowedZero();
      await selectAfVProductProgramAndAsset(page, assetDetailsPage);
      await assetDetailsPage.selectConditionInStandardQuote("Used");
      await assetDetailsPage.ensureKmAllowanceForAfV();
      const termVal = (await assetDetailsPage.termsOfFinanceInputField.inputValue().catch(() => "")).trim();
      if (!termVal || !/\d/.test(termVal)) {
        await assetDetailsPage.termsOfFinance("36");
      }
      await assetDetailsPage.interestRate("4");
      await assetDetailsPage.enterOriginationReference("TAB-AFV-Ref-01");
      await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
      await assetDetailsPage.cashPriceOfAsset("$25,000");

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

      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await prepareCalculableAfVQuote(page, assetDetailsPage, {
        cashPrice: "$25,000",
        interest: "4",
      });

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

      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await prepareCalculableAfVQuote(page, assetDetailsPage, {
        cashPrice: "$25,000",
        interest: "4",
      });

      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.waitForQuoteLoadersToFinish();
      await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero();
      await assetDetailsPage.expectInterestChargeNonNegative();

      const tabBefore = await assetDetailsPage.readTotalAmountBorrowed();
      const interestBefore = await assetDetailsPage.readInterestCharge();

      await assetDetailsPage.cashPriceOfAsset("$30,000");
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
