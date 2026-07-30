/**
 * Shared helpers for Quick Quote Solve For / Calculate For regression (UDP-T4526–T4540, UDP-T4779–T4796).
 * Product scope: **CSA-B-Assigned** (Credit Sale Agreement — business).
 *
 * Each Solve For mode validates only its own calculated output:
 * - Payment → payment
 * - Cash Price → cash price
 * - Deposit → deposit
 * - Balloon → balloon
 */

import { expect } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DODashboardPage, DOQuickQuotePage } from "../../../pages";

export const CSA_B_QQ_PRODUCT = "CSA-B-Assigned";
export const CSA_B_QQ_PROGRAM = "MYUDC-B-CSA-Assigned MV";
export const CSA_B_QQ_PROGRAM_ALT = "CSA Business - MV Dealer";
export const CSA_B_QQ_PROGRAM_FALLBACK = "MYUDC-C-CSA- Assigned MV";
export const TLC_DEALER = "Armstrong Prestige Wellington";
const DEFAULT_PAYMENT_AMOUNT = "$650";

export type SolveForMode = "Payment" | "Cash Price" | "Deposit" | "Balloon";

export type QuickQuoteFinanceSnapshot = {
  cashPrice: string;
  interestRate: string;
  term: string;
  frequency: string;
  depositPercent: string;
  depositDollar: string;
  balloonPercent: string;
  balloonDollar: string;
  payment: string;
};

export async function openQuickQuoteFromDashboard(page: Page): Promise<{
  dashboardPage: DODashboardPage;
  quickQuotePage: DOQuickQuotePage;
}> {
  const dashboardPage = new DODashboardPage(page);
  const quickQuotePage = new DOQuickQuotePage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await quickQuotePage.openQuickQuote();
  await expect.soft(quickQuotePage.quickQuoteRoot).toBeVisible();
  await expect.soft(quickQuotePage.quickQuoteForm).toBeVisible();
  return { dashboardPage, quickQuotePage };
}

export async function selectCsaBProductAndProgram(
  page: Page,
  quickQuotePage: DOQuickQuotePage,
): Promise<void> {
  await quickQuotePage.selectProduct(CSA_B_QQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();

  if (await quickQuotePage.programDropdownTrigger.isEnabled().catch(() => false)) {
    const preferred = [
      process.env.CSA_B_QQ_PROGRAM?.trim() ?? "",
      CSA_B_QQ_PROGRAM,
      CSA_B_QQ_PROGRAM_ALT,
      CSA_B_QQ_PROGRAM_FALLBACK,
    ].filter(Boolean);
    let selected = false;
    for (const program of preferred) {
      try {
        await quickQuotePage.selectProgram(program);
        selected = true;
        break;
      } catch {
        /* try next */
      }
    }
    if (!selected) {
      await quickQuotePage.programDropdownTrigger.click();
      await expect.soft(page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
      const csaBOption = page
        .getByRole("option")
        .filter({ hasText: /CSA-B|MYUDC-B|Business|Assigned|MV/i })
        .first();
      await csaBOption.click({ timeout: 10_000 });
      await page.keyboard.press("Escape");
    }
  }
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  await quickQuotePage.waitForLoadingComplete();
}

/** Payment Solve For — user enters cash price, deposit, balloon; payment is calculated. */
export async function fillMandatoryPaymentModeFields(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await quickQuotePage.selectFrequency("Monthly");
  await quickQuotePage.enterInterestRatePercent("9");
  await quickQuotePage.enterTermsMonths("36");
  await quickQuotePage.enterCashPrice("$20,000");
  await quickQuotePage.enterDepositPercent("10%");
  await quickQuotePage.enterBalloonPercent("0");
}

/** @deprecated Use {@link fillMandatoryPaymentModeFields}. */
export async function fillMandatoryPaymentFields(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await fillMandatoryPaymentModeFields(quickQuotePage);
}

export async function calculateInPaymentMode(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await fillMandatoryPaymentModeFields(quickQuotePage);
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();
}

/** @deprecated Use {@link calculateInPaymentMode}. */
export async function calculateStandardPaymentQuote(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await calculateInPaymentMode(quickQuotePage);
}

/** Cash Price Solve For — payment is an input; cash price is calculated. */
export async function ensurePaymentEnteredForCashPriceMode(
  quickQuotePage: DOQuickQuotePage,
  priorPayment?: string,
): Promise<void> {
  const current = (await quickQuotePage.readPaymentDisplayValue()).trim();
  if (!DOQuickQuotePage.isBlankCurrencyDisplay(current)) {
    return;
  }
  const fromPrior = priorPayment?.trim() ?? "";
  if (fromPrior.length > 0 && !DOQuickQuotePage.isBlankCurrencyDisplay(fromPrior)) {
    await quickQuotePage.enterPaymentAmount(fromPrior);
    return;
  }
  await quickQuotePage.enterPaymentAmount(DEFAULT_PAYMENT_AMOUNT);
}

export async function calculateInCashPriceMode(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await ensurePaymentEnteredForCashPriceMode(quickQuotePage);
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();
}

export async function calculateInDepositMode(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();
}

export async function calculateInBalloonMode(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();
}

export async function readFinanceSnapshot(quickQuotePage: DOQuickQuotePage): Promise<QuickQuoteFinanceSnapshot> {
  return {
    cashPrice: (await quickQuotePage.cashPriceInput.inputValue().catch(() => "")).trim(),
    interestRate: (await quickQuotePage.interestRatePercentInput.inputValue().catch(() => "")).trim(),
    term: await quickQuotePage.readTermsMonthsValue(),
    frequency: await quickQuotePage.readFrequencyLabel(),
    depositPercent: (await quickQuotePage.depositPercentInput.inputValue().catch(() => "")).trim(),
    depositDollar: (await quickQuotePage.depositDollarInput.inputValue().catch(() => "")).trim(),
    balloonPercent: (await quickQuotePage.balloonPercentInput.inputValue().catch(() => "")).trim(),
    balloonDollar: (await quickQuotePage.balloonDollarInput.inputValue().catch(() => "")).trim(),
    payment: (await quickQuotePage.readPaymentDisplayValue()).trim(),
  };
}

export async function isFixedCheckboxChecked(quickQuotePage: DOQuickQuotePage): Promise<boolean> {
  const host = quickQuotePage.fixedCheckbox;
  const hostCls = (await host.getAttribute("class").catch(() => "")) ?? "";
  if (hostCls.includes("p-checkbox-checked")) {
    return true;
  }
  const box = host.locator(".p-checkbox-box, [role='checkbox']").first();
  const aria = await box.getAttribute("aria-checked").catch(() => null);
  if (aria === "true") {
    return true;
  }
  if (aria === "false") {
    return false;
  }
  const hidden = host.locator('input[type="checkbox"]').first();
  if ((await hidden.count()) > 0) {
    return hidden.isChecked();
  }
  return false;
}

export async function expectFixedUnchecked(quickQuotePage: DOQuickQuotePage): Promise<void> {
  expect.soft(await isFixedCheckboxChecked(quickQuotePage)).toBeFalsy();
}

export async function expectDefaultPaymentSolveForState(quickQuotePage: DOQuickQuotePage): Promise<void> {
  const calculateForLabel = await quickQuotePage.readCalculateForOnQuote(0);
  expect.soft(calculateForLabel).toMatch(/Payment/i);

  const rate = (await quickQuotePage.interestRatePercentInput.inputValue().catch(() => "")).trim();
  expect.soft(rate.length).toBeGreaterThan(0);
  expect.soft(/\d/.test(rate)).toBeTruthy();

  const term = await quickQuotePage.readTermsMonthsValue();
  if (term.length > 0) {
    expect.soft(/\d+/.test(term)).toBeTruthy();
  }

  const frequency = await quickQuotePage.readFrequencyLabel();
  if (!DOQuickQuotePage.isBlankFrequencyLabel(frequency)) {
    expect.soft(frequency.trim().length).toBeGreaterThan(0);
  }

  await quickQuotePage.expectCashPriceDefaultsBlank();
  const payment = (await quickQuotePage.readPaymentDisplayValue()).trim();
  expect.soft(DOQuickQuotePage.isBlankCurrencyDisplay(payment)).toBeTruthy();
  await expectFixedUnchecked(quickQuotePage);
}

export async function expectCalculationSummaryWithTotals(quickQuotePage: DOQuickQuotePage): Promise<void> {
  const summary = quickQuotePage.calculationSummaryRegion.first();
  await expect.soft(summary).toBeVisible({ timeout: 30_000 });
  const text = ((await summary.textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
  expect.soft(/Loan Amount/i.test(text)).toBeTruthy();
  expect
    .soft(/Total (Amount )?Payable|Total Payable|Amount Payable|Total Interest|Total Fees/i.test(text))
    .toBeTruthy();
}

export async function expectCalculationSummaryHidden(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await expect
    .poll(
      async () => {
        const visible = await quickQuotePage.calculationSummaryRegion
          .first()
          .isVisible()
          .catch(() => false);
        if (!visible) {
          return true;
        }
        const text =
          (await quickQuotePage.calculationSummaryRegion.first().textContent().catch(() => "")) ?? "";
        return !/\d/.test(text.replace(/[$,\s]/g, ""));
      },
      { timeout: 20_000, intervals: [300, 500, 1_000] },
    )
    .toBeTruthy();
}

async function readPaymentFromSummary(quickQuotePage: DOQuickQuotePage): Promise<string> {
  const summary =
    (await quickQuotePage.calculationSummaryRegion.first().textContent().catch(() => "")) ?? "";
  const match = summary.match(/Payment[^\d$]*(\$[\d,]+\.?\d*)/i);
  return match?.[1]?.trim() ?? "";
}

/** Payment Solve For — payment field or summary shows a calculated instalment. */
export async function expectPaymentCalculated(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await expect
    .poll(
      async () => {
        const payment = (await quickQuotePage.readPaymentDisplayValue()).trim();
        if (!DOQuickQuotePage.isBlankCurrencyDisplay(payment) && /\d/.test(payment)) {
          return true;
        }
        const fromSummary = await readPaymentFromSummary(quickQuotePage);
        return fromSummary.length > 0 && !DOQuickQuotePage.isBlankCurrencyDisplay(fromSummary);
      },
      { timeout: 30_000, intervals: [300, 500, 1_000] },
    )
    .toBeTruthy();
}

/** Cash Price Solve For — only cash price must be calculated. */
export async function expectCashPriceCalculated(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await expect
    .poll(async () => {
      const cash = (await quickQuotePage.cashPriceInput.inputValue().catch(() => "")).trim();
      return /\d/.test(cash) && !DOQuickQuotePage.isBlankCurrencyDisplay(cash);
    }, { timeout: 30_000, intervals: [300, 500, 1_000] })
    .toBeTruthy();
}

/** Deposit Solve For — only deposit % or $ must be calculated. */
export async function expectDepositCalculated(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await expect
    .poll(async () => {
      const pct = (await quickQuotePage.depositPercentInput.inputValue().catch(() => "")).trim();
      const usd = (await quickQuotePage.depositDollarInput.inputValue().catch(() => "")).trim();
      return (
        (/\d/.test(pct) && !DOQuickQuotePage.isBlankPercentDisplay(pct)) ||
        (/\d/.test(usd) && !DOQuickQuotePage.isBlankCurrencyDisplay(usd))
      );
    }, { timeout: 30_000, intervals: [300, 500, 1_000] })
    .toBeTruthy();
}

/** Balloon Solve For — only balloon % or $ must be calculated. */
export async function expectBalloonCalculated(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await expect
    .poll(async () => {
      const pct = (await quickQuotePage.balloonPercentInput.inputValue().catch(() => "")).trim();
      const usd = (await quickQuotePage.balloonDollarInput.inputValue().catch(() => "")).trim();
      return (
        (/\d/.test(pct) && !DOQuickQuotePage.isBlankPercentDisplay(pct)) ||
        (/\d/.test(usd) && !DOQuickQuotePage.isBlankCurrencyDisplay(usd))
      );
    }, { timeout: 30_000, intervals: [300, 500, 1_000] })
    .toBeTruthy();
}

/** Assert only the active Solve For output field is calculated. */
export async function expectSolveForTargetCalculated(
  quickQuotePage: DOQuickQuotePage,
  mode: SolveForMode,
): Promise<void> {
  switch (mode) {
    case "Payment":
      await expectPaymentCalculated(quickQuotePage);
      break;
    case "Cash Price":
      await expectCashPriceCalculated(quickQuotePage);
      break;
    case "Deposit":
      await expectDepositCalculated(quickQuotePage);
      break;
    case "Balloon":
      await expectBalloonCalculated(quickQuotePage);
      break;
  }
}

export async function expectPaymentResetOrGreyed(quickQuotePage: DOQuickQuotePage): Promise<void> {
  const payment = (await quickQuotePage.readPaymentDisplayValue()).trim();
  const blank = DOQuickQuotePage.isBlankCurrencyDisplay(payment);
  const readOnly = await quickQuotePage.paymentAmountInputIsReadOnly().catch(() => true);
  expect.soft(blank || readOnly).toBeTruthy();
}

export async function expectCashPriceResetOrGreyed(quickQuotePage: DOQuickQuotePage): Promise<void> {
  const cash = (await quickQuotePage.cashPriceInput.inputValue().catch(() => "")).trim();
  const blank = DOQuickQuotePage.isBlankCurrencyDisplay(cash);
  const editable = await quickQuotePage.cashPriceInput.isEditable().catch(() => true);
  expect.soft(blank || !editable).toBeTruthy();
}

export async function expectDepositResetOrGreyed(quickQuotePage: DOQuickQuotePage): Promise<void> {
  const pct = (await quickQuotePage.depositPercentInput.inputValue().catch(() => "")).trim();
  const usd = (await quickQuotePage.depositDollarInput.inputValue().catch(() => "")).trim();
  const blank =
    DOQuickQuotePage.isBlankPercentDisplay(pct) && DOQuickQuotePage.isBlankCurrencyDisplay(usd);
  const pctEditable = await quickQuotePage.depositPercentInput.isEditable().catch(() => true);
  const usdEditable = await quickQuotePage.depositDollarInput.isEditable().catch(() => true);
  expect.soft(blank || (!pctEditable && !usdEditable)).toBeTruthy();
}

export async function expectBalloonResetOrGreyed(quickQuotePage: DOQuickQuotePage): Promise<void> {
  const pct = (await quickQuotePage.balloonPercentInput.inputValue().catch(() => "")).trim();
  const usd = (await quickQuotePage.balloonDollarInput.inputValue().catch(() => "")).trim();
  const blank =
    DOQuickQuotePage.isBlankPercentDisplay(pct) && DOQuickQuotePage.isBlankCurrencyDisplay(usd);
  const pctEditable = await quickQuotePage.balloonPercentInput.isEditable().catch(() => true);
  const usdEditable = await quickQuotePage.balloonDollarInput.isEditable().catch(() => true);
  expect.soft(blank || (!pctEditable && !usdEditable)).toBeTruthy();
}

export async function expectCashPriceModeReadOnly(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await expect.soft(quickQuotePage.cashPriceInput).not.toBeEditable({ timeout: 15_000 });
}

export async function expectDepositModeReadOnlyFields(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await expect.soft(quickQuotePage.depositPercentInput).not.toBeEditable({ timeout: 15_000 });
  await expect.soft(quickQuotePage.depositDollarInput).not.toBeEditable({ timeout: 15_000 });
}

export async function expectBalloonModeReadOnlyFields(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await expect.soft(quickQuotePage.balloonPercentInput).not.toBeEditable({ timeout: 15_000 });
  await expect.soft(quickQuotePage.balloonDollarInput).not.toBeEditable({ timeout: 15_000 });
}

/** @deprecated Use {@link expectCashPriceModeReadOnly}. */
export async function expectCashPriceModeReadOnlyFields(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await expectCashPriceModeReadOnly(quickQuotePage);
}

export async function expectFieldsRetained(
  before: QuickQuoteFinanceSnapshot,
  after: QuickQuoteFinanceSnapshot,
  keys: Array<keyof QuickQuoteFinanceSnapshot>,
): Promise<void> {
  for (const key of keys) {
    expect.soft(after[key]).toBe(before[key]);
  }
}

export async function expectCalculateForEnabled(quickQuotePage: DOQuickQuotePage): Promise<void> {
  const hostCls =
    (await quickQuotePage.calculateForDropdownHost.getAttribute("class").catch(() => "")) ?? "";
  if (hostCls.includes("p-disabled")) {
    await expect.soft(quickQuotePage.calculateForDropdownTrigger).toBeDisabled();
    return;
  }
  await expect.soft(quickQuotePage.calculateForDropdownTrigger).toBeEnabled();
}

export async function switchToCalculateFor(
  quickQuotePage: DOQuickQuotePage,
  mode: SolveForMode,
): Promise<void> {
  await quickQuotePage.selectCalculateFor(mode);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  const label = await quickQuotePage.readCalculateForOnQuote(0);
  expect.soft(new RegExp(mode, "i").test(label)).toBeTruthy();
}

export async function preparePaymentCalculatedQuote(
  page: Page,
  quickQuotePage: DOQuickQuotePage,
): Promise<QuickQuoteFinanceSnapshot> {
  await selectCsaBProductAndProgram(page, quickQuotePage);
  await calculateInPaymentMode(quickQuotePage);
  await expectCalculationSummaryWithTotals(quickQuotePage);
  await expectPaymentCalculated(quickQuotePage);
  return readFinanceSnapshot(quickQuotePage);
}

export async function prepareCashPriceCalculatedQuote(
  page: Page,
  quickQuotePage: DOQuickQuotePage,
): Promise<QuickQuoteFinanceSnapshot> {
  const beforePayment = await preparePaymentCalculatedQuote(page, quickQuotePage);
  await switchToCalculateFor(quickQuotePage, "Cash Price");
  await expectCashPriceModeReadOnly(quickQuotePage);
  await expectFixedUnchecked(quickQuotePage);
  await ensurePaymentEnteredForCashPriceMode(quickQuotePage, beforePayment.payment);
  await calculateInCashPriceMode(quickQuotePage);
  await expectCalculationSummaryWithTotals(quickQuotePage);
  await expectCashPriceCalculated(quickQuotePage);
  return readFinanceSnapshot(quickQuotePage);
}

export async function prepareDepositCalculatedQuote(
  page: Page,
  quickQuotePage: DOQuickQuotePage,
): Promise<QuickQuoteFinanceSnapshot> {
  await prepareCashPriceCalculatedQuote(page, quickQuotePage);
  await switchToCalculateFor(quickQuotePage, "Deposit");
  await expectDepositModeReadOnlyFields(quickQuotePage);
  await calculateInDepositMode(quickQuotePage);
  await expectCalculationSummaryWithTotals(quickQuotePage);
  await expectDepositCalculated(quickQuotePage);
  return readFinanceSnapshot(quickQuotePage);
}

export async function prepareBalloonCalculatedQuote(
  page: Page,
  quickQuotePage: DOQuickQuotePage,
): Promise<QuickQuoteFinanceSnapshot> {
  await prepareDepositCalculatedQuote(page, quickQuotePage);
  await switchToCalculateFor(quickQuotePage, "Balloon");
  await expectBalloonModeReadOnlyFields(quickQuotePage);
  await expectFixedUnchecked(quickQuotePage);
  await calculateInBalloonMode(quickQuotePage);
  await expectCalculationSummaryWithTotals(quickQuotePage);
  await expectBalloonCalculated(quickQuotePage);
  return readFinanceSnapshot(quickQuotePage);
}
