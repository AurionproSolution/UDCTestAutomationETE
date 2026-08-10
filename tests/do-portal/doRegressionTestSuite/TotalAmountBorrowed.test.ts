/**
 * DO Portal — Total Amount Borrowed regression (UDP-T3818–UDP-T3822).
 * Scenario source: Total amt Borrowed.xlsx (Zephyr / Regression 25.0).
 * Product: CSA-C-Assigned / Program: CSA Personal - MV Dealer.
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

const CSA_SQ_PRODUCT = "CSA-C-Assigned";
const CSA_SQ_PROGRAM = "CSA Personal - MV Dealer";
const CSA_QQ_PROGRAM = "CSA Personal - MV Dealer";
const TLC_DEALER = "Armstrong Prestige Wellington";

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

async function openCsaStandardQuoteFromDashboard(page: Page): Promise<{
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
  await assetDetailsPage.waitForAssetDetailsStepReady();
  return { dashboardPage, assetDetailsPage };
}

async function selectCsaProductAndProgram(assetDetailsPage: DOAssetDetailsPage): Promise<void> {
  await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(CSA_SQ_PROGRAM);
}

async function selectCsaProductOnQuote(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
  await expect.soft(standardQuoteRoot(page).getByText(CSA_SQ_PRODUCT).first()).toBeVisible({
    timeout: 30_000,
  });
}

async function addMinimalUsedAsset(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  assetValue = "$20,000",
): Promise<void> {
  await assetDetailsPage.enterAsset("Car and Light Commercial /");
  await assetDetailsPage.selectCondition("Used");
  await assetDetailsPage.openAssetInsuranceTradeInSummary();
  await assetDetailsPage.clickAssetSummaryEditButton();
  await addAssetPage.enterAssetValue(assetValue);
  await addAssetPage.selectCondition("Used");
  await addAssetPage.selectYear("2025");
  await addAssetPage.enterMake("Toyota");
  await addAssetPage.enterModel("Hilux");
  await addAssetPage.enterVariant("Top");
  await addAssetPage.clickSummitButton();
  await addAssetPage.clickCrossButton();
}

/** Modify a rate-sensitive financial value — IC recalculates; TAB may stay unchanged (amount financed). */
async function modifyFinancialValuesForRecalc(
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await assetDetailsPage.interestRateFast("11");
}

async function selectCsaProductProgramAndAsset(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
): Promise<void> {
  await selectCsaProductAndProgram(assetDetailsPage);
  await expect.soft(standardQuoteRoot(page).getByText(CSA_SQ_PROGRAM).first()).toBeVisible({
    timeout: 30_000,
  });
  await addMinimalUsedAsset(assetDetailsPage, addAssetPage);
}

async function prepareCalculableCsaQuote(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  opts?: { cashPrice?: string; interest?: string; term?: string; fast?: boolean },
): Promise<void> {
  await selectCsaProductProgramAndAsset(page, assetDetailsPage, addAssetPage);
  await assetDetailsPage.selectConditionInStandardQuote("Used");
  if (opts?.cashPrice) {
    await assetDetailsPage.cashPriceOfAsset(opts.cashPrice);
  }
  const termVal = (await assetDetailsPage.termsOfFinanceInputField.inputValue().catch(() => "")).trim();
  if (!termVal || !/\d/.test(termVal)) {
    await assetDetailsPage.termsOfFinance(opts?.term ?? "36");
  }
  const rate = (await assetDetailsPage.interestRateInputField.inputValue()).trim();
  if (!rate || !/\d/.test(rate)) {
    if (opts?.fast) {
      await assetDetailsPage.interestRateFast(opts?.interest ?? "9");
    } else {
      await assetDetailsPage.interestRate(opts?.interest ?? "9");
    }
  }
  await assetDetailsPage.enterOriginationReference("TAB-CSA-Ref-01");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate({ fast: opts?.fast });
}

async function completeCsaQuickQuoteForCarryOver(
  page: Page,
  quickQuotePage: DOQuickQuotePage,
): Promise<number> {
  await quickQuotePage.openQuickQuote();
  await expect.soft(quickQuotePage.quickQuoteRoot).toBeVisible();
  await quickQuotePage.selectProduct(CSA_SQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  if (await quickQuotePage.programDropdownTrigger.isEnabled()) {
    await quickQuotePage.selectProgram(CSA_QQ_PROGRAM);
  }
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  await quickQuotePage.selectFrequency("Monthly");
  await quickQuotePage.enterInterestRatePercent("9");
  await quickQuotePage.enterTermsMonths("36");
  await quickQuotePage.enterCashPrice("$20,000");
  await quickQuotePage.enterDepositPercent("10%");
  await quickQuotePage.enterBalloonPercent("0");
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
      test.setTimeout(600_000);

      const dashboardPage = new DODashboardPage(page);
      const quickQuotePage = new DOQuickQuotePage(page);
      const assetDetailsPage = new DOAssetDetailsPage(page);

      await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
      await dashboardPage.waitForAuthenticatedDashboard();
      await dashboardPage.selectDealer(TLC_DEALER);

      const qqBorrowedAmount = await completeCsaQuickQuoteForCarryOver(page, quickQuotePage);
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

      const dashboardPage = new DODashboardPage(page);
      const assetDetailsPage = new DOAssetDetailsPage(page);

      // Precondition: no Quick Quote — open Standard Quote straight from dashboard (spec steps 1–2).
      await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
      await dashboardPage.waitForAuthenticatedDashboard();
      await dashboardPage.selectDealer(TLC_DEALER);
      await dashboardPage.clickCreateStandardQuote();
      await dashboardPage.selectCSAproduct();
      await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
      await assetDetailsPage.waitForAssetDetailsStepReady();
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      // Step 3: Total Amount Borrowed is $0.00 and display-only on load.
      await assetDetailsPage.expectTotalAmountBorrowedReadOnly();
      await assetDetailsPage.expectTotalAmountBorrowedZero();
      expect.soft(await assetDetailsPage.readTotalAmountBorrowedDisplayText()).toMatch(/\$0\.00/);
    },
  );

  test(
    "UDP-T3820 - Total Amount Borrowed recalculates on clicking Calculate after adding asset",
    { tag: ["@do", "@regression", "@UDP-T3820"] },
    async ({ page }) => {
      test.setTimeout(600_000);

      const addAssetPage = new DOAddAssetPage(page);
      const { assetDetailsPage } = await openCsaStandardQuoteFromDashboard(page);
      await selectCsaProductOnQuote(page, assetDetailsPage);
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await assetDetailsPage.expectTotalAmountBorrowedZero();
      await selectCsaProductProgramAndAsset(page, assetDetailsPage, addAssetPage);
      await assetDetailsPage.selectConditionInStandardQuote("Used");
      const termVal = (await assetDetailsPage.termsOfFinanceInputField.inputValue().catch(() => "")).trim();
      if (!termVal || !/\d/.test(termVal)) {
        await assetDetailsPage.termsOfFinance("36");
      }
      await assetDetailsPage.interestRate("9");
      await assetDetailsPage.enterOriginationReference("TAB-CSA-Ref-01");
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
      test.setTimeout(600_000);

      const addAssetPage = new DOAddAssetPage(page);
      const { assetDetailsPage } = await openCsaStandardQuoteFromDashboard(page);
      await prepareCalculableCsaQuote(page, assetDetailsPage, addAssetPage, {
        cashPrice: "$25,000",
        interest: "9",
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
      test.setTimeout(600_000);

      const addAssetPage = new DOAddAssetPage(page);
      const { assetDetailsPage } = await openCsaStandardQuoteFromDashboard(page);
      await prepareCalculableCsaQuote(page, assetDetailsPage, addAssetPage, {
        cashPrice: "$20,000",
        interest: "9",
        term: "36",
        fast: true,
      });

      await assetDetailsPage.clickCalculateButton({ fast: true });
      await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero({ timeoutMs: 30_000 });
      await assetDetailsPage.expectInterestChargeNonNegative();

      const tabBefore = await assetDetailsPage.readTotalAmountBorrowed();
      const interestBefore = await assetDetailsPage.readInterestCharge();

      // Spec: modify financial values on loan details, then Calculate again (no asset re-edit).
      await modifyFinancialValuesForRecalc(assetDetailsPage);
      await assetDetailsPage.clickCalculateButton({ fast: true });

      await assetDetailsPage.expectPaymentSummaryRecalculatedAfterFinancialEdit(
        tabBefore,
        interestBefore,
      );
      await assetDetailsPage.expectTotalAmountBorrowedReadOnly();
      await assetDetailsPage.expectInterestChargeReadOnly();
    },
  );
});
