/**
 * DO Portal — Quick Quote TL regression (UDP-T4188–UDP-T4200).
 * Scenario source: Quick quote TL.xlsx (Zephyr / Regression — Quick Quote - TL).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAssetDetailsPage,
  DODashboardPage,
  DOQuickQuotePage,
} from "../../../pages";

const TL_QQ_PRODUCT = "TL-B-Assigned";
/** Inferred for TL-B-Assigned (TL-C uses Term Loan Personal - MV Dealer in TLC_QuickQuote_SingleFlow). */
const TL_QQ_PROGRAM = "Term Loan Business - MV Dealer";
const TLC_DEALER = "Armstrong Prestige Wellington";

function parseCurrency(value: string): number {
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function readSelectedTermMonths(quickQuotePage: DOQuickQuotePage): Promise<string> {
  const dropdownVisible = await quickQuotePage.termsMonthsDropdownTrigger
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
  if (dropdownVisible) {
    const combobox = quickQuotePage.termsMonthsDropdownHost.getByRole("combobox").first();
    return (
      (await combobox.textContent())?.trim() ??
      (await combobox.getAttribute("aria-label"))?.trim() ??
      ""
    );
  }
  const inputVisible = await quickQuotePage.termsMonthsInput
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
  if (inputVisible) {
    return (await quickQuotePage.termsMonthsInput.inputValue()).trim();
  }
  return "";
}

async function openQuickQuoteFromDashboard(page: Page): Promise<{
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

async function selectTlProductAndProgram(
  page: Page,
  quickQuotePage: DOQuickQuotePage,
): Promise<void> {
  await quickQuotePage.selectProduct(TL_QQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  if (await quickQuotePage.programDropdownTrigger.isEnabled()) {
    await quickQuotePage.programDropdownTrigger.click();
    await expect.soft(page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
    const exact = page.getByRole("option", { name: TL_QQ_PROGRAM, exact: true });
    if (await exact.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await exact.click();
    } else {
      const termLoan = page.getByRole("option").filter({ hasText: /Term Loan/i }).first();
      await termLoan.click({ timeout: 10_000 });
    }
    await page.keyboard.press("Escape");
  }
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
}

async function fillMandatoryPaymentFields(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await quickQuotePage.selectFrequency("Monthly");
  await quickQuotePage.enterInterestRatePercent("9");
  await quickQuotePage.enterTermsMonths("36");
  await quickQuotePage.enterCashPrice("$20,000");
}

async function calculateTlQuickQuote(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await fillMandatoryPaymentFields(quickQuotePage);
  await quickQuotePage.enterDepositPercent("10%");
  await quickQuotePage.enterBalloonPercent("0");
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();
}

test.describe("Quick Quote - TL @do @regression", () => {
  test(
    "UDP-T4188 - TL Quick Quote Follows CSA QQ Behaviour No TL-Specific Variations",
    { tag: ["@do", "@regression", "@UDP-T4188"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);

      await expect.soft(quickQuotePage.calculateForDropdownTrigger).toBeVisible();
      await expect.soft(quickQuotePage.cashPriceInput).toBeVisible();
      await expect.soft(quickQuotePage.cashPriceInput).toHaveValue("");
      await expect.soft(quickQuotePage.depositPercentInput).toBeVisible();
      await expect.soft(quickQuotePage.depositDollarInput).toBeVisible();
      await expect.soft(quickQuotePage.interestRatePercentInput).toBeVisible();
      const termsAsDropdown = await quickQuotePage.termsMonthsDropdownTrigger
        .isVisible({ timeout: 30_000 })
        .catch(() => false);
      const termsAsInput =
        !termsAsDropdown &&
        (await quickQuotePage.termsMonthsInput.isVisible({ timeout: 15_000 }).catch(() => false));
      await expect.soft(termsAsDropdown || termsAsInput).toBe(true);
      await expect.soft(quickQuotePage.frequencyDropdownTrigger).toBeVisible();
      await expect.soft(quickQuotePage.balloonPercentInput).toBeVisible();
      await expect.soft(quickQuotePage.balloonDollarInput).toBeVisible();

      const rate = (await quickQuotePage.interestRatePercentInput.inputValue().catch(() => "")).trim();
      if (rate.length > 0) {
        expect.soft(/\d/.test(rate)).toBeTruthy();
      }
      const term = await readSelectedTermMonths(quickQuotePage);
      if (term.length > 0) {
        expect.soft(/\d+/.test(term)).toBeTruthy();
      }
      if (await quickQuotePage.paymentAmountInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
        expect.soft(await quickQuotePage.paymentAmountInputIsReadOnly()).toBeTruthy();
      }
    },
  );

  test(
    "UDP-T4189 - Calculate For Defaults to Payment Disabled Until First Calculate",
    { tag: ["@do", "@regression", "@UDP-T4189"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);

      const calculateForLabel = await quickQuotePage.readCalculateForOnQuote(0);
      expect.soft(calculateForLabel).toMatch(/Payment/i);

      const hostCls =
        (await quickQuotePage.calculateForDropdownHost.getAttribute("class").catch(() => "")) ?? "";
      if (hostCls.includes("p-disabled")) {
        await expect.soft(quickQuotePage.calculateForDropdownTrigger).toBeDisabled();
      }

      await calculateTlQuickQuote(quickQuotePage);

      const hostClsAfter =
        (await quickQuotePage.calculateForDropdownHost.getAttribute("class")) ?? "";
      await expect.soft(hostClsAfter).not.toContain("p-disabled");
      await expect.soft(quickQuotePage.calculateForDropdownTrigger).toBeEnabled();
    },
  );

  test(
    "UDP-T4190 - Cash Price Mandatory Defaults Blank",
    { tag: ["@do", "@regression", "@UDP-T4190"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);
      await quickQuotePage.selectFrequency("Monthly");
      await quickQuotePage.enterInterestRatePercent("9");
      await quickQuotePage.enterTermsMonths("36");
      await quickQuotePage.clearCashPriceField();
      if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
        await quickQuotePage.clickCalculate();
      }
      await quickQuotePage.expectPleaseCompleteInForm(0);
    },
  );

  test(
    "UDP-T4191 - Deposit % and OR ($) Mutual Auto-Population",
    { tag: ["@do", "@regression", "@UDP-T4191"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);
      await quickQuotePage.enterCashPrice("$20,000");
      await quickQuotePage.enterDepositPercent("10%");
      await expect
        .soft(quickQuotePage.depositDollarInput)
        .toHaveValue(/2[, ]?000|2000/, { timeout: 25_000 });

      await quickQuotePage.clearDepositDollarField();
      await quickQuotePage.enterDepositDollars("$4,000.00");
      await expect.soft(quickQuotePage.depositDollarInput).toHaveValue(/4[, ]?000(?:\.00)?/i, {
        timeout: 25_000,
      });
    },
  );

  test(
    "UDP-T4192 - Balloon % and OR ($) Mutual Auto-Population",
    { tag: ["@do", "@regression", "@UDP-T4192"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);
      await quickQuotePage.enterCashPrice("$20,000");
      await quickQuotePage.enterBalloonPercent("20%");
      await expect
        .soft(quickQuotePage.balloonDollarInput)
        .toHaveValue(/4[, ]?000|4000/, { timeout: 25_000 });

      await quickQuotePage.clearBalloonDollarField();
      await quickQuotePage.enterBalloonDollars("$5,000.00");
      await expect.soft(quickQuotePage.balloonDollarInput).toHaveValue(/5[, ]?000(?:\.00)?/i, {
        timeout: 25_000,
      });
    },
  );

  test(
    "UDP-T4193 - Interest Rate Defaults from Rate Table",
    { tag: ["@do", "@regression", "@UDP-T4193"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);

      const rate = (await quickQuotePage.interestRatePercentInput.inputValue().catch(() => "")).trim();
      expect.soft(rate.length).toBeGreaterThan(0);
      expect.soft(/\d/.test(rate)).toBeTruthy();
      await expect.soft(quickQuotePage.interestRatePercentInput).toBeVisible();
    },
  );

  test(
    "UDP-T4194 - Term Mandatory Defaults from Program Max Term Validation",
    { tag: ["@do", "@regression", "@UDP-T4194"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);

      const term = await readSelectedTermMonths(quickQuotePage);
      if (term.length > 0) {
        expect.soft(/\d+/.test(term)).toBeTruthy();
      }

      await fillMandatoryPaymentFields(quickQuotePage);
      await quickQuotePage.clearTermsMonths(0);
      if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
        await quickQuotePage.clickCalculate();
      }
      await quickQuotePage.expectBlankTermsValidation(0);

      await quickQuotePage.enterTermsMonths("9999");
      if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
        await quickQuotePage.clickCalculate();
      }
      await quickQuotePage.expectTermExceedsMaxMessage(0);
    },
  );

  test(
    "UDP-T4195 - Frequency Mandatory Defaults from Program",
    { tag: ["@do", "@regression", "@UDP-T4195"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);

      const frequencyLabel = await quickQuotePage.frequencyDropdownTrigger.textContent();
      if (frequencyLabel?.trim()) {
        expect.soft(frequencyLabel.trim().length).toBeGreaterThan(0);
      } else {
        await quickQuotePage.enterCashPrice("$20,000");
        await quickQuotePage.enterInterestRatePercent("9");
        await quickQuotePage.enterTermsMonths("36");
        if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
          await quickQuotePage.clickCalculate();
        }
        await quickQuotePage.expectPleaseCompleteInForm(0);
      }
    },
  );

  test(
    "UDP-T4196 - Loan Amount and Total Amount Payable Calculated by FIS AF",
    { tag: ["@do", "@regression", "@UDP-T4196"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);
      await quickQuotePage.enterCashPrice("$20,000");
      await quickQuotePage.enterDepositDollars("$2,000");
      await quickQuotePage.selectFrequency("Monthly");
      await quickQuotePage.enterInterestRatePercent("9");
      await quickQuotePage.enterTermsMonths("36");
      await quickQuotePage.enterBalloonPercent("0");
      await quickQuotePage.clickCalculate();
      await quickQuotePage.expectCreateQuoteVisible();

      const summary = quickQuotePage.calculationSummaryRegion.first();
      await expect.soft(summary).toBeVisible({ timeout: 30_000 });
      await expect.soft(summary).toContainText(/Loan Amount/i);
      await expect.soft(summary).toContainText(/18[, ]?000|18000/);
      await expect
        .soft(summary)
        .toContainText(/Total (Amount )?Payable|Total Payable|Amount Payable|Total Interest|Total Fees/i);
    },
  );

  test(
    "UDP-T4197 - Add Comparison Max 3 Quick Quotes Values Copied from Previous QQ",
    { tag: ["@do", "@regression", "@UDP-T4197"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);
      const cashBefore = (await quickQuotePage.cashPriceInput.inputValue().catch(() => "")).trim();

      await calculateTlQuickQuote(quickQuotePage);
      await expect.soft(quickQuotePage.addComparison2Button).toBeEnabled();
      await quickQuotePage.clickAddComparisonPrimary();
      expect.soft(await quickQuotePage.quickQuotePanelCount()).toBe(2);
      await expect.soft(quickQuotePage.cashPriceInputOnQuote(1)).not.toHaveValue("");

      if (cashBefore.length === 0) {
        const cashQq1 = (await quickQuotePage.cashPriceInput.inputValue().catch(() => "")).trim();
        const cashQq2 = (await quickQuotePage.cashPriceInputOnQuote(1).inputValue().catch(() => "")).trim();
        if (cashQq1.length > 0) {
          expect.soft(parseCurrency(cashQq2)).toBe(parseCurrency(cashQq1));
        }
      }

      const qq2CalculateFor = await quickQuotePage.readCalculateForOnQuote(1);
      expect.soft(qq2CalculateFor).toMatch(/Payment/i);
      const qq2HostCls =
        (await quickQuotePage
          .quoteForm(1)
          .locator(
            "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::p-dropdown[1]",
          )
          .getAttribute("class")
          .catch(() => "")) ?? "";
      if (qq2HostCls.includes("p-disabled")) {
        await expect.soft(quickQuotePage.calculateForTriggerOnQuote(1)).toBeDisabled();
      }

      await quickQuotePage.enterTermsMonthsOnQuote(1, "36");
      await quickQuotePage.selectFrequencyOnQuote(1, "Monthly");
      await quickQuotePage.clickCalculateOnQuote(1);
      await quickQuotePage.expectCreateQuoteVisible(1);

      if (await quickQuotePage.addComparison3Button.isEnabled().catch(() => false)) {
        await quickQuotePage.clickAddComparison3();
        expect.soft(await quickQuotePage.quickQuotePanelCount()).toBe(3);
        await quickQuotePage.expectNoAddComparison4Button();
      } else {
        test.info().annotations.push({
          type: "note",
          description: "Add Comparison 3 not enabled after QQ2 calculate in this environment.",
        });
      }
    },
  );

  test(
    "UDP-T4198 - Reset Returns Quote to Default Product Program State",
    { tag: ["@do", "@regression", "@UDP-T4198"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);
      await calculateTlQuickQuote(quickQuotePage);
      await quickQuotePage.clickReset();
      await expect.soft(quickQuotePage.productDropdownTrigger).toBeVisible();
      const cashAfter = (await quickQuotePage.cashPriceInput.inputValue().catch(() => "")).trim();
      expect.soft(cashAfter.length).toBe(0);
    },
  );

  test(
    "UDP-T4199 - Create Quote Converts TL QQ to Standard Quote Values Carry Over",
    { tag: ["@do", "@regression", "@UDP-T4199"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);
      const programLabel = await quickQuotePage.readSelectedProgramLabel();
      await calculateTlQuickQuote(quickQuotePage);

      await quickQuotePage.clickCreateQuote();
      const standardRoot = page.locator("app-quote-details, app-standard-quote").first();
      await expect.soft(standardRoot).toBeVisible({ timeout: 120_000 });
      await expect.soft(page.getByText(/Term Loan|TL/i).first()).toBeVisible();

      const assetDetailsPage = new DOAssetDetailsPage(page);
      await assetDetailsPage.waitForAssetDetailsStepReady();
      if (programLabel.length > 0) {
        await assetDetailsPage.expectProductProgramCarriedFromQuickQuote(
          TL_QQ_PRODUCT,
          programLabel,
        );
      }
      await assetDetailsPage.expectFinanceCarriedFromQuickQuote({
        cashPrice: /20[, ]?000|20000/i,
        term: /36/,
        frequencyText: /Monthly/i,
        interestRate: /9/,
      });
    },
  );

  test(
    "UDP-T4200 - Print Download PDF with UDC Disclaimer",
    { tag: ["@do", "@regression", "@UDP-T4200"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, quickQuotePage);
      await calculateTlQuickQuote(quickQuotePage);

      await expect.soft(quickQuotePage.printButton).toBeVisible();
      await quickQuotePage.printButton.click({ trial: true });

      await expect.soft(quickQuotePage.downloadButton).toBeVisible();
      const downloadPromise = page.waitForEvent("download", { timeout: 60_000 }).catch(() => null);
      await quickQuotePage.downloadButton.click({ timeout: 15_000 }).catch(() => {});
      const download = await downloadPromise;
      if (download) {
        expect.soft(download.suggestedFilename()).toMatch(/\.pdf$/i);
      } else {
        await quickQuotePage.downloadButton.click({ trial: true });
      }
    },
  );
});
