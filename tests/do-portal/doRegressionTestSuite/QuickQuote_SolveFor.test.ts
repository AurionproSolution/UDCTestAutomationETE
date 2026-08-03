/**
 * DO Portal — Quick Quote CSA-B Solve For regression (UDP-T4526–T4540, UDP-T4779–T4796).
 * Scenario source: Quick Quote Test cases.xlsx (Zephyr / Regression — Quick Quote).
 * Product: **CSA-B-Assigned** / **MYUDC-B-CSA-Assigned MV**.
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import { DOQuickQuotePage } from "../../../pages";
import {
  calculateInBalloonMode,
  calculateInCashPriceMode,
  calculateInDepositMode,
  calculateInPaymentMode,
  expectBalloonCalculated,
  expectBalloonModeReadOnlyFields,
  expectBalloonResetOrGreyed,
  expectCalculateForEnabled,
  expectCalculationSummaryHidden,
  expectCalculationSummaryWithTotals,
  expectCashPriceCalculated,
  expectCashPriceModeReadOnly,
  expectCashPriceModeReadOnlyFields,
  expectCashPriceResetOrGreyed,
  expectDefaultPaymentSolveForState,
  expectDepositCalculated,
  expectDepositModeReadOnlyFields,
  expectDepositResetOrGreyed,
  expectFieldsRetained,
  expectFixedUnchecked,
  expectPaymentCalculated,
  expectPaymentResetOrGreyed,
  expectSolveForTargetCalculated,
  fillMandatoryPaymentModeFields,
  openQuickQuoteFromDashboard,
  prepareBalloonCalculatedQuote,
  prepareCashPriceCalculatedQuote,
  prepareDepositCalculatedQuote,
  preparePaymentCalculatedQuote,
  readFinanceSnapshot,
  selectCsaBProductAndProgram,
  switchToCalculateFor,
} from "./quickQuoteSolveFor.helpers";

const QQ_TIMEOUT = 300_000;

test.describe("Quick Quote CSA-B - Solve For TC_QQ @do @regression", () => {
  test(
    "UDP-T4526 - TC_QQ_001 Default Behaviour",
    { tag: ["@do", "@regression", "@UDP-T4526"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaBProductAndProgram(page, quickQuotePage);
      await expectDefaultPaymentSolveForState(quickQuotePage);
    },
  );

  test(
    "UDP-T4527 - TC_QQ_002 Initial Payment Calculation",
    { tag: ["@do", "@regression", "@UDP-T4527"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaBProductAndProgram(page, quickQuotePage);
      await calculateInPaymentMode(quickQuotePage);
      await expectPaymentCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );

  test(
    "UDP-T4528 - TC_QQ_003 Edit Fields - Payment Mode",
    { tag: ["@do", "@regression", "@UDP-T4528"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await preparePaymentCalculatedQuote(page, quickQuotePage);

      await quickQuotePage.enterInterestRatePercent("10");
      await quickQuotePage.interestRatePercentInput.press("Tab").catch(() => {});

      await expectCalculationSummaryHidden(quickQuotePage);
      await expectPaymentResetOrGreyed(quickQuotePage);
      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, ["cashPrice", "term", "frequency", "depositPercent"]);
    },
  );

  test(
    "UDP-T4529 - TC_QQ_004 Re-calculate Payment",
    { tag: ["@do", "@regression", "@UDP-T4529"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await preparePaymentCalculatedQuote(page, quickQuotePage);
      await quickQuotePage.enterInterestRatePercent("10");
      await calculateInPaymentMode(quickQuotePage);
      await expectPaymentCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );

  test(
    "UDP-T4530 - TC_QQ_005 Solve For = Cash Price - Initial State",
    { tag: ["@do", "@regression", "@UDP-T4530"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await preparePaymentCalculatedQuote(page, quickQuotePage);

      await switchToCalculateFor(quickQuotePage, "Cash Price");

      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, ["interestRate", "term", "frequency", "payment"]);
      expect.soft(DOQuickQuotePage.isBlankCurrencyDisplay(after.cashPrice)).toBeTruthy();
      await expectFixedUnchecked(quickQuotePage);
      await expectCashPriceModeReadOnly(quickQuotePage);
    },
  );

  test(
    "UDP-T4531 - TC_QQ_006 Calculate Cash Price",
    { tag: ["@do", "@regression", "@UDP-T4531"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await preparePaymentCalculatedQuote(page, quickQuotePage);
      await switchToCalculateFor(quickQuotePage, "Cash Price");
      await calculateInCashPriceMode(quickQuotePage);
      await expectCashPriceCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );

  test(
    "UDP-T4532 - TC_QQ_007 Edit Fields - Cash Price Mode",
    { tag: ["@do", "@regression", "@UDP-T4532"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await prepareCashPriceCalculatedQuote(page, quickQuotePage);

      await quickQuotePage.enterInterestRatePercent("11");
      await quickQuotePage.interestRatePercentInput.press("Tab").catch(() => {});

      await expectCalculationSummaryHidden(quickQuotePage);
      await expectCashPriceResetOrGreyed(quickQuotePage);
      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, ["interestRate", "term", "frequency", "payment", "depositPercent"]);
    },
  );

  test(
    "UDP-T4533 - TC_QQ_008 Solve For = Deposit - Initial State",
    { tag: ["@do", "@regression", "@UDP-T4533"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await prepareCashPriceCalculatedQuote(page, quickQuotePage);

      await switchToCalculateFor(quickQuotePage, "Deposit");

      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, [
        "cashPrice",
        "interestRate",
        "term",
        "frequency",
        "payment",
        "balloonPercent",
      ]);
      expect.soft(DOQuickQuotePage.isBlankPercentDisplay(after.depositPercent)).toBeTruthy();
      expect.soft(DOQuickQuotePage.isBlankCurrencyDisplay(after.depositDollar)).toBeTruthy();
      await expectDepositModeReadOnlyFields(quickQuotePage);
    },
  );

  test(
    "UDP-T4534 - TC_QQ_009 Calculate Deposit",
    { tag: ["@do", "@regression", "@UDP-T4534"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await prepareCashPriceCalculatedQuote(page, quickQuotePage);
      await switchToCalculateFor(quickQuotePage, "Deposit");
      await calculateInDepositMode(quickQuotePage);

      await expectDepositCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );

  test(
    "UDP-T4535 - TC_QQ_010 Edit Fields - Deposit Mode",
    { tag: ["@do", "@regression", "@UDP-T4535"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await prepareDepositCalculatedQuote(page, quickQuotePage);

      await quickQuotePage.enterTermsMonths("48");
      await quickQuotePage.termsMonthsInput.press("Tab").catch(() => {});

      await expectCalculationSummaryHidden(quickQuotePage);
      await expectDepositResetOrGreyed(quickQuotePage);
      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, ["cashPrice", "interestRate", "frequency", "payment"]);
    },
  );

  test(
    "UDP-T4536 - TC_QQ_011 Solve For = Balloon - Initial State",
    { tag: ["@do", "@regression", "@UDP-T4536"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await prepareDepositCalculatedQuote(page, quickQuotePage);

      await switchToCalculateFor(quickQuotePage, "Balloon");

      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, [
        "cashPrice",
        "interestRate",
        "term",
        "frequency",
        "payment",
        "depositPercent",
      ]);
      expect.soft(DOQuickQuotePage.isBlankPercentDisplay(after.balloonPercent)).toBeTruthy();
      expect.soft(DOQuickQuotePage.isBlankCurrencyDisplay(after.balloonDollar)).toBeTruthy();
      await expectFixedUnchecked(quickQuotePage);
      await expectBalloonModeReadOnlyFields(quickQuotePage);
    },
  );

  test(
    "UDP-T4537 - TC_QQ_012 Calculate Balloon",
    { tag: ["@do", "@regression", "@UDP-T4537"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await prepareDepositCalculatedQuote(page, quickQuotePage);
      await switchToCalculateFor(quickQuotePage, "Balloon");
      await calculateInBalloonMode(quickQuotePage);

      await expectBalloonCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );

  test(
    "UDP-T4538 - TC_QQ_013 Edit Fields - Balloon Mode",
    { tag: ["@do", "@regression", "@UDP-T4538"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await prepareBalloonCalculatedQuote(page, quickQuotePage);

      await quickQuotePage.enterInterestRatePercent("8.5");
      await quickQuotePage.interestRatePercentInput.press("Tab").catch(() => {});

      await expectCalculationSummaryHidden(quickQuotePage);
      await expectBalloonResetOrGreyed(quickQuotePage);
      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, ["cashPrice", "term", "frequency", "depositPercent"]);
    },
  );

  test(
    "UDP-T4539 - TC_QQ_014 Switching Solve For Options",
    { tag: ["@do", "@regression", "@UDP-T4539"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await prepareBalloonCalculatedQuote(page, quickQuotePage);

      await switchToCalculateFor(quickQuotePage, "Payment");
      await fillMandatoryPaymentModeFields(quickQuotePage);
      await calculateInPaymentMode(quickQuotePage);
      await expectPaymentCalculated(quickQuotePage);

      await switchToCalculateFor(quickQuotePage, "Cash Price");
      await expectCashPriceModeReadOnly(quickQuotePage);
      await calculateInCashPriceMode(quickQuotePage);
      await expectCashPriceCalculated(quickQuotePage);

      await switchToCalculateFor(quickQuotePage, "Deposit");
      await expectDepositModeReadOnlyFields(quickQuotePage);
      await calculateInDepositMode(quickQuotePage);
      await expectDepositCalculated(quickQuotePage);

      await switchToCalculateFor(quickQuotePage, "Balloon");
      await expectBalloonModeReadOnlyFields(quickQuotePage);
      await calculateInBalloonMode(quickQuotePage);
      await expectBalloonCalculated(quickQuotePage);
    },
  );

  test(
    "UDP-T4540 - TC_QQ_015 Overall Reset Behaviour on Edit",
    { tag: ["@do", "@regression", "@UDP-T4540"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await prepareCashPriceCalculatedQuote(page, quickQuotePage);

      await quickQuotePage.enterInterestRatePercent("10.5");
      await expectCalculationSummaryHidden(quickQuotePage);
      await expectCashPriceResetOrGreyed(quickQuotePage);

      await calculateInCashPriceMode(quickQuotePage);
      await expectCashPriceCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );
});

test.describe("Quick Quote CSA-B - Solve For Flow @do @regression", () => {
  test(
    "UDP-T4779 - Payment - Default Load",
    { tag: ["@do", "@regression", "@UDP-T4779"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaBProductAndProgram(page, quickQuotePage);
      await expectDefaultPaymentSolveForState(quickQuotePage);
    },
  );

  test(
    "UDP-T4780 - Payment - Calculate",
    { tag: ["@do", "@regression", "@UDP-T4780"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaBProductAndProgram(page, quickQuotePage);
      await calculateInPaymentMode(quickQuotePage);
      await expectPaymentCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
      await expectCalculateForEnabled(quickQuotePage);
    },
  );

  test(
    "UDP-T4781 - Payment - Edit After Calculate",
    { tag: ["@do", "@regression", "@UDP-T4781"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await preparePaymentCalculatedQuote(page, quickQuotePage);

      await quickQuotePage.enterCashPrice("$22,000");
      await quickQuotePage.cashPriceInput.press("Tab").catch(() => {});

      await expectCalculationSummaryHidden(quickQuotePage);
      await expectPaymentResetOrGreyed(quickQuotePage);
      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, ["interestRate", "term", "frequency"]);
      expect.soft(after.cashPrice).not.toBe(before.cashPrice);
    },
  );

  test(
    "UDP-T4782 - Payment - Recalculate",
    { tag: ["@do", "@regression", "@UDP-T4782"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await preparePaymentCalculatedQuote(page, quickQuotePage);
      await quickQuotePage.enterCashPrice("$22,000");
      await calculateInPaymentMode(quickQuotePage);
      await expectPaymentCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );

  test(
    "UDP-T4783 - Cash Price - First Selection",
    { tag: ["@do", "@regression", "@UDP-T4783"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await preparePaymentCalculatedQuote(page, quickQuotePage);

      await switchToCalculateFor(quickQuotePage, "Cash Price");

      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, ["interestRate", "term", "frequency", "payment"]);
      expect.soft(DOQuickQuotePage.isBlankCurrencyDisplay(after.cashPrice)).toBeTruthy();
      await expectFixedUnchecked(quickQuotePage);
      await expectCashPriceModeReadOnly(quickQuotePage);
    },
  );

  test(
    "UDP-T4784 - Cash Price - Calculate",
    { tag: ["@do", "@regression", "@UDP-T4784"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await preparePaymentCalculatedQuote(page, quickQuotePage);
      await switchToCalculateFor(quickQuotePage, "Cash Price");
      await calculateInCashPriceMode(quickQuotePage);
      await expectCashPriceCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );

  test(
    "UDP-T4785 - Cash Price - Edit After Calculate",
    { tag: ["@do", "@regression", "@UDP-T4785"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await prepareCashPriceCalculatedQuote(page, quickQuotePage);

      await quickQuotePage.selectFrequency("Fortnightly");
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();

      await expectCalculationSummaryHidden(quickQuotePage);
      await expectCashPriceResetOrGreyed(quickQuotePage);
      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, ["interestRate", "term", "payment"]);
      expect.soft(after.frequency).not.toBe(before.frequency);
    },
  );

  test(
    "UDP-T4786 - Cash Price - Recalculate",
    { tag: ["@do", "@regression", "@UDP-T4786"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await prepareCashPriceCalculatedQuote(page, quickQuotePage);
      await quickQuotePage.selectFrequency("Fortnightly");
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();
      await calculateInCashPriceMode(quickQuotePage);

      await expectCashPriceCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );

  test(
    "UDP-T4787 - Deposit - First Selection",
    { tag: ["@do", "@regression", "@UDP-T4787"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await prepareCashPriceCalculatedQuote(page, quickQuotePage);

      await switchToCalculateFor(quickQuotePage, "Deposit");

      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, [
        "cashPrice",
        "interestRate",
        "term",
        "frequency",
        "payment",
        "balloonPercent",
      ]);
      expect.soft(DOQuickQuotePage.isBlankPercentDisplay(after.depositPercent)).toBeTruthy();
      expect.soft(DOQuickQuotePage.isBlankCurrencyDisplay(after.depositDollar)).toBeTruthy();
      await expectDepositModeReadOnlyFields(quickQuotePage);
    },
  );

  test(
    "UDP-T4788 - Deposit - Calculate",
    { tag: ["@do", "@regression", "@UDP-T4788"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await prepareCashPriceCalculatedQuote(page, quickQuotePage);
      await switchToCalculateFor(quickQuotePage, "Deposit");
      await calculateInDepositMode(quickQuotePage);

      await expectDepositCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );

  test(
    "UDP-T4789 - Deposit - Edit After Calculate",
    { tag: ["@do", "@regression", "@UDP-T4789"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await prepareDepositCalculatedQuote(page, quickQuotePage);

      await quickQuotePage.enterInterestRatePercent("9.5");
      await quickQuotePage.interestRatePercentInput.press("Tab").catch(() => {});

      await expectCalculationSummaryHidden(quickQuotePage);
      await expectDepositResetOrGreyed(quickQuotePage);
      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, ["cashPrice", "term", "frequency", "payment"]);
      expect.soft(after.interestRate).not.toBe(before.interestRate);
    },
  );

  test(
    "UDP-T4790 - Deposit - Recalculate",
    { tag: ["@do", "@regression", "@UDP-T4790"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await prepareDepositCalculatedQuote(page, quickQuotePage);
      await quickQuotePage.enterInterestRatePercent("9.5");
      await calculateInDepositMode(quickQuotePage);

      await expectDepositCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );

  test(
    "UDP-T4791 - Balloon - First Selection",
    { tag: ["@do", "@regression", "@UDP-T4791"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await prepareDepositCalculatedQuote(page, quickQuotePage);

      await switchToCalculateFor(quickQuotePage, "Balloon");

      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, [
        "cashPrice",
        "interestRate",
        "term",
        "frequency",
        "payment",
        "depositPercent",
      ]);
      expect.soft(DOQuickQuotePage.isBlankPercentDisplay(after.balloonPercent)).toBeTruthy();
      expect.soft(DOQuickQuotePage.isBlankCurrencyDisplay(after.balloonDollar)).toBeTruthy();
      await expectFixedUnchecked(quickQuotePage);
      await expectBalloonModeReadOnlyFields(quickQuotePage);
    },
  );

  test(
    "UDP-T4792 - Balloon - Calculate",
    { tag: ["@do", "@regression", "@UDP-T4792"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await prepareDepositCalculatedQuote(page, quickQuotePage);
      await switchToCalculateFor(quickQuotePage, "Balloon");
      await calculateInBalloonMode(quickQuotePage);

      await expectBalloonCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );

  test(
    "UDP-T4793 - Balloon - Edit After Calculate",
    { tag: ["@do", "@regression", "@UDP-T4793"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      const before = await prepareBalloonCalculatedQuote(page, quickQuotePage);

      await quickQuotePage.enterTermsMonths("42");
      await quickQuotePage.termsMonthsInput.press("Tab").catch(() => {});

      await expectCalculationSummaryHidden(quickQuotePage);
      await expectBalloonResetOrGreyed(quickQuotePage);
      const after = await readFinanceSnapshot(quickQuotePage);
      expectFieldsRetained(before, after, ["cashPrice", "interestRate", "frequency", "depositPercent"]);
      expect.soft(after.term).not.toBe(before.term);
    },
  );

  test(
    "UDP-T4794 - Balloon - Recalculate",
    { tag: ["@do", "@regression", "@UDP-T4794"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await prepareBalloonCalculatedQuote(page, quickQuotePage);
      await quickQuotePage.enterTermsMonths("42");
      await calculateInBalloonMode(quickQuotePage);

      await expectBalloonCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
    },
  );

  test(
    "UDP-T4795 - Summary Refresh",
    { tag: ["@do", "@regression", "@UDP-T4795"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await preparePaymentCalculatedQuote(page, quickQuotePage);
      const summaryBefore =
        (await quickQuotePage.calculationSummaryRegion.first().textContent().catch(() => "")) ?? "";

      await quickQuotePage.enterDepositPercent("12%");
      await expectCalculationSummaryHidden(quickQuotePage);
      await expectPaymentResetOrGreyed(quickQuotePage);

      await calculateInPaymentMode(quickQuotePage);
      await expectPaymentCalculated(quickQuotePage);
      await expectCalculationSummaryWithTotals(quickQuotePage);
      const summaryAfter =
        (await quickQuotePage.calculationSummaryRegion.first().textContent().catch(() => "")) ?? "";
      expect.soft(summaryAfter.length).toBeGreaterThan(0);
      if (summaryBefore.trim().length > 0) {
        expect.soft(summaryAfter.replace(/\s+/g, " ")).not.toBe(summaryBefore.replace(/\s+/g, " "));
      }
    },
  );

  test(
    "UDP-T4796 - Solve For Switching",
    { tag: ["@do", "@regression", "@UDP-T4796"] },
    async ({ page }) => {
      test.setTimeout(QQ_TIMEOUT);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await preparePaymentCalculatedQuote(page, quickQuotePage);

      for (const mode of ["Cash Price", "Deposit", "Balloon", "Payment"] as const) {
        await switchToCalculateFor(quickQuotePage, mode);
        if (mode === "Payment") {
          await fillMandatoryPaymentModeFields(quickQuotePage);
          await calculateInPaymentMode(quickQuotePage);
        } else if (mode === "Cash Price") {
          await calculateInCashPriceMode(quickQuotePage);
        } else if (mode === "Deposit") {
          await calculateInDepositMode(quickQuotePage);
        } else {
          await calculateInBalloonMode(quickQuotePage);
        }
        await expectCalculationSummaryWithTotals(quickQuotePage);
        await expectSolveForTargetCalculated(quickQuotePage, mode);
      }
    },
  );
});
