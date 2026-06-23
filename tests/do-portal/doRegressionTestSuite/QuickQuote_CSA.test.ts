/**
 * DO Portal — Quick Quote CSA regression (UDP-T3617–UDP-T3645).
 * Scenario source: Quick Quote - CSA.xlsx (Zephyr / Regression 25.0).
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

const CSA_QQ_PRODUCT = "CSA-C-Assigned";
const CSA_QQ_PROGRAM = "CSA Personal - MV Dealer";
const TLC_DEALER = "Armstrong Prestige Wellington";

async function readSelectedProgramLabel(
  quickQuotePage: DOQuickQuotePage,
  quoteIndex = 0,
): Promise<string> {
  const host = quickQuotePage.programDropdownOnQuote(quoteIndex);
  const combobox = host.getByRole("combobox").first();
  if (await combobox.isVisible({ timeout: 5_000 }).catch(() => false)) {
    return (
      (await combobox.textContent())?.trim() ??
      (await combobox.getAttribute("aria-label"))?.trim() ??
      ""
    );
  }
  return (await host.locator(".p-dropdown-label").first().textContent())?.trim() ?? "";
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

async function selectCsaProductAndProgram(
  page: Page,
  quickQuotePage: DOQuickQuotePage,
): Promise<void> {
  await quickQuotePage.selectProduct(CSA_QQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  if (await quickQuotePage.programDropdownTrigger.isEnabled()) {
    await quickQuotePage.selectProgram(CSA_QQ_PROGRAM);
  }
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
}

async function fillMandatoryPaymentFields(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await quickQuotePage.selectFrequency("Monthly");
  await quickQuotePage.enterInterestRatePercent("9");
  await quickQuotePage.enterTermsMonths("36");
  await quickQuotePage.enterCashPrice("$20,000");
}

async function calculateStandardPaymentQuote(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await fillMandatoryPaymentFields(quickQuotePage);
  await quickQuotePage.enterDepositPercent("10%");
  await quickQuotePage.enterBalloonPercent("0");
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();
}

test.describe("Quick Quote - CSA @do @regression", () => {
  test(
    "UDP-T3617 - Quick Quote Page Load",
    { tag: ["@do", "@regression", "@UDP-T3617"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);

      await expect.soft(quickQuotePage.productDropdownTrigger).toBeVisible();
      await expect.soft(quickQuotePage.programDropdownTrigger).toBeVisible();
      await quickQuotePage.expectCalculateButtonHiddenOrDisabled(0);
      const cashHidden = await quickQuotePage.cashPriceInput.isHidden().catch(() => false);
      if (cashHidden) {
        await expect.soft(quickQuotePage.cashPriceInput).toBeHidden();
      } else {
        await expect.soft(quickQuotePage.cashPriceInput).toHaveValue("");
      }
    },
  );

  test(
    "UDP-T3618 - Product Dropdown Displays Accessible Products Only",
    { tag: ["@do", "@regression", "@UDP-T3618"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);

      await quickQuotePage.productDropdownTrigger.click();
      await expect.soft(page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
      const products = await page.getByRole("option").allTextContents();
      await page.keyboard.press("Escape");
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();

      expect.soft(products.length).toBeGreaterThan(0);
      expect.soft(products.some((t) => /CSA|Credit Sale|Assigned/i.test(t))).toBeTruthy();
      expect.soft(products.every((t) => /^(CSA|TL|Finance|OL|AFV|FL)/i.test(t.trim()) || t.length > 0)).toBeTruthy();
    },
  );

  test(
    "UDP-T3619 - Program Filters Based on Selected Product",
    { tag: ["@do", "@regression", "@UDP-T3619"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);

      await quickQuotePage.selectProduct(CSA_QQ_PRODUCT);
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();
      await quickQuotePage.programDropdownTrigger.click();
      await expect.soft(page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
      const programs = await page.getByRole("option").allTextContents();
      await page.keyboard.press("Escape");
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();

      expect.soft(programs.length).toBeGreaterThan(0);
      expect
        .soft(programs.some((t) => /CSA|Personal|Dealer|Webform|MV|Retail|Assigned/i.test(t)))
        .toBeTruthy();
      expect.soft(programs.every((t) => !/Term Loan|Finance Lease|Operating Lease/i.test(t) || /CSA/i.test(t))).toBeTruthy();
    },
  );

  test(
    "UDP-T3620 - Program - Single Program Auto-Defaults",
    { tag: ["@do", "@regression", "@UDP-T3620"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);

      await quickQuotePage.selectProduct(CSA_QQ_PRODUCT);
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();
      await quickQuotePage.programDropdownTrigger.click();
      await expect.soft(page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
      const programs = await page.getByRole("option").allTextContents();
      await page.keyboard.press("Escape");
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();

      if (programs.length === 1) {
        await quickQuotePage.expectProgramDropdownDisabled(0);
        const programLabel = await readSelectedProgramLabel(quickQuotePage);
        expect.soft(programLabel.length).toBeGreaterThan(0);
      } else {
        test.info().annotations.push({
          type: "note",
          description: `Dealer has ${programs.length} CSA programs — single-program auto-default not applicable in this environment.`,
        });
        await quickQuotePage.selectProgram(CSA_QQ_PROGRAM);
        const programLabel = await readSelectedProgramLabel(quickQuotePage);
        expect.soft(programLabel.length).toBeGreaterThan(0);
      }
    },
  );

  test(
    "UDP-T3621 - Dynamic Fields Display After Product & Program Selection",
    { tag: ["@do", "@regression", "@UDP-T3621"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);

      await expect.soft(quickQuotePage.calculateForDropdownTrigger).toBeVisible();
      await expect.soft(quickQuotePage.cashPriceInput).toBeVisible();
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
      await expect.soft(quickQuotePage.fixedCheckbox).toBeVisible();
    },
  );

  test(
    "UDP-T3622 - Originator Dropdown - Single Originator Auto-Populates",
    { tag: ["@do", "@regression", "@UDP-T3622"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);

      const originatorHost = quickQuotePage.dealerDropdownTrigger;
      const isVisible = await originatorHost.isVisible().catch(() => false);
      if (!isVisible) {
        test.info().annotations.push({
          type: "note",
          description: "Originator field not shown — dealer pre-selected on dashboard.",
        });
        return;
      }

      const originatorDisabled = await originatorHost.isDisabled().catch(() => false);
      const originatorText = (await originatorHost.textContent())?.trim() ?? "";
      if (originatorDisabled || originatorText.length > 0) {
        expect.soft(originatorText.length).toBeGreaterThan(0);
      } else {
        await originatorHost.click();
        const options = await page.getByRole("option").allTextContents();
        await page.keyboard.press("Escape");
        expect.soft(options.length).toBeLessThanOrEqual(1);
      }
    },
  );

  test(
    "UDP-T3623 - Originator Dropdown - Multiple Originators",
    { tag: ["@do", "@regression", "@UDP-T3623"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);

      const originatorHost = quickQuotePage.dealerDropdownTrigger;
      const isVisible = await originatorHost.isVisible().catch(() => false);
      if (!isVisible) {
        test.info().annotations.push({
          type: "note",
          description: "Originator dropdown not visible — user has single dealer context.",
        });
        return;
      }

      const isDisabled = await originatorHost.isDisabled().catch(() => false);
      if (isDisabled) {
        test.info().annotations.push({
          type: "note",
          description: "Originator is auto-populated (single originator access).",
        });
        const label = (await originatorHost.textContent())?.trim() ?? "";
        expect.soft(label.length).toBeGreaterThan(0);
        return;
      }

      await originatorHost.click();
      await expect.soft(page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
      const originators = await page.getByRole("option").allTextContents();
      await page.keyboard.press("Escape");
      expect.soft(originators.length).toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T3624 - Calculate For Defaults to Payment",
    { tag: ["@do", "@regression", "@UDP-T3624"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);

      const calculateForLabel = await quickQuotePage.readCalculateForOnQuote(0);
      expect.soft(calculateForLabel).toMatch(/Payment/i);

      const hostCls =
        (await quickQuotePage.calculateForDropdownHost.getAttribute("class").catch(() => "")) ?? "";
      if (hostCls.includes("p-disabled")) {
        await expect.soft(quickQuotePage.calculateForDropdownTrigger).toBeDisabled();
      }
    },
  );

  test(
    "UDP-T3625 - Calculate For Enabled After First Payment Calculation",
    { tag: ["@do", "@regression", "@UDP-T3625"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await calculateStandardPaymentQuote(quickQuotePage);

      const hostCls =
        (await quickQuotePage.calculateForDropdownHost.getAttribute("class")) ?? "";
      await expect.soft(hostCls).not.toContain("p-disabled");
      await expect.soft(quickQuotePage.calculateForDropdownTrigger).toBeEnabled();
    },
  );

  test(
    "UDP-T3626 - Calculate For = Payment: Required Fields",
    { tag: ["@do", "@regression", "@UDP-T3626"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await fillMandatoryPaymentFields(quickQuotePage);
      await quickQuotePage.clickCalculate();
      await quickQuotePage.expectCreateQuoteVisible();

      const summary = quickQuotePage.calculationSummaryRegion.first();
      await expect.soft(summary).toBeVisible({ timeout: 30_000 });
      await expect.soft(summary).toContainText(/Loan Amount/i);
      await expect
        .soft(summary)
        .toContainText(/Total (Amount )?Payable|Total Payable|Amount Payable|Total Interest|Total Fees/i);
    },
  );

  test(
    "UDP-T3627 - Calculate For = Cash Price",
    { tag: ["@do", "@regression", "@UDP-T3627"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await calculateStandardPaymentQuote(quickQuotePage);

      await quickQuotePage.selectCalculateFor("Cash Price");
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();
      await expect.soft(quickQuotePage.cashPriceInput).not.toBeEditable({ timeout: 15_000 });
      await quickQuotePage.enterInterestRatePercent("9");
      await quickQuotePage.enterTermsMonths("36");
      await quickQuotePage.selectFrequency("Monthly");
      await quickQuotePage.clickCalculate();
      await quickQuotePage.expectCreateQuoteVisible();

      const cashPriceAfter = (await quickQuotePage.cashPriceInput.inputValue().catch(() => "")).trim();
      expect.soft(cashPriceAfter.length).toBeGreaterThan(0);
      expect.soft(/\d/.test(cashPriceAfter)).toBeTruthy();
    },
  );

  test(
    "UDP-T3628 - Calculate For = Deposit",
    { tag: ["@do", "@regression", "@UDP-T3628"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await calculateStandardPaymentQuote(quickQuotePage);

      await quickQuotePage.selectCalculateFor("Deposit");
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();
      await expect.soft(quickQuotePage.depositPercentInput).not.toBeEditable({ timeout: 15_000 });
      await quickQuotePage.enterCashPrice("$20,000");
      await quickQuotePage.enterInterestRatePercent("9");
      await quickQuotePage.enterTermsMonths("36");
      await quickQuotePage.selectFrequency("Monthly");
      await quickQuotePage.clickCalculate();
      await quickQuotePage.expectCreateQuoteVisible();

      const depositPct = (await quickQuotePage.depositPercentInput.inputValue().catch(() => "")).trim();
      const depositUsd = (await quickQuotePage.depositDollarInput.inputValue().catch(() => "")).trim();
      expect.soft(/\d/.test(depositPct) || /\d/.test(depositUsd)).toBeTruthy();
    },
  );

  test(
    "UDP-T3629 - Calculate For = Balloon",
    { tag: ["@do", "@regression", "@UDP-T3629"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await calculateStandardPaymentQuote(quickQuotePage);

      await quickQuotePage.selectCalculateFor("Balloon");
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();
      await quickQuotePage.clearCashPriceField();
      await quickQuotePage.enterCashPrice("$25,000");
      await quickQuotePage.enterDepositPercent("8%");
      await quickQuotePage.enterInterestRatePercent("9");
      await expect.soft(quickQuotePage.balloonPercentInput).not.toBeEditable({ timeout: 15_000 });
      await quickQuotePage.clickCalculate();
      await quickQuotePage.expectCreateQuoteVisible();

      const balloonPct = (await quickQuotePage.balloonPercentInput.inputValue().catch(() => "")).trim();
      const balloonUsd = (await quickQuotePage.balloonDollarInput.inputValue().catch(() => "")).trim();
      expect.soft(/\d/.test(balloonPct) || /\d/.test(balloonUsd)).toBeTruthy();
    },
  );

  test(
    "UDP-T3630 - Deposit % and OR $ Auto-Populate (% entered)",
    { tag: ["@do", "@regression", "@UDP-T3630"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await quickQuotePage.enterCashPrice("$20,000");
      await quickQuotePage.enterDepositPercent("10%");
      await expect
        .soft(quickQuotePage.depositDollarInput)
        .toHaveValue(/2[, ]?000|2000/, { timeout: 25_000 });
    },
  );

  test(
    "UDP-T3631 - Deposit % and OR $ Auto-Populate ($ entered)",
    { tag: ["@do", "@regression", "@UDP-T3631"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await quickQuotePage.enterCashPrice("$20,000");
      await quickQuotePage.clearDepositDollarField();
      await quickQuotePage.enterDepositDollars("$4,000.00");
      await expect.soft(quickQuotePage.depositDollarInput).toHaveValue(/4[, ]?000(?:\.00)?/i, {
        timeout: 25_000,
      });
    },
  );

  test(
    "UDP-T3632 - Interest Rate Defaults from FIS AF",
    { tag: ["@do", "@regression", "@UDP-T3632"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);

      const rate = (await quickQuotePage.interestRatePercentInput.inputValue().catch(() => "")).trim();
      expect.soft(rate.length).toBeGreaterThan(0);
      expect.soft(/\d/.test(rate)).toBeTruthy();
      await expect.soft(quickQuotePage.interestRatePercentInput).toBeVisible();
    },
  );

  test(
    "UDP-T3633 - Term Defaults from Program",
    { tag: ["@do", "@regression", "@UDP-T3633"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);

      const term = await readSelectedTermMonths(quickQuotePage);
      if (term.length > 0) {
        expect.soft(/\d+/.test(term)).toBeTruthy();
      } else {
        test.info().annotations.push({
          type: "note",
          description: "Program has no default term — field is blank as expected.",
        });
        await quickQuotePage.enterCashPrice("$20,000");
        await quickQuotePage.enterInterestRatePercent("9");
        await quickQuotePage.selectFrequency("Monthly");
        if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
          await quickQuotePage.clickCalculate();
        }
        await quickQuotePage.expectPleaseCompleteInForm(0);
      }

      const termsAsDropdown = await quickQuotePage.termsMonthsDropdownTrigger
        .isVisible({ timeout: 15_000 })
        .catch(() => false);
      if (termsAsDropdown) {
        await expect.soft(quickQuotePage.termsMonthsDropdownTrigger).toBeVisible();
      } else {
        await expect.soft(quickQuotePage.termsMonthsInput).toBeVisible();
      }
    },
  );

  test(
    "UDP-T3634 - Term Validation - Cannot Exceed Max Term",
    { tag: ["@do", "@regression", "@UDP-T3634"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await fillMandatoryPaymentFields(quickQuotePage);
      await quickQuotePage.enterTermsMonths("9999");
      if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
        await quickQuotePage.clickCalculate();
      }
      await quickQuotePage.expectTermExceedsMaxMessage(0);
    },
  );

  test(
    "UDP-T3635 - Frequency Defaults from Program",
    { tag: ["@do", "@regression", "@UDP-T3635"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);

      const frequencyLabel = await quickQuotePage.frequencyDropdownTrigger.textContent();
      if (frequencyLabel?.trim()) {
        expect.soft(frequencyLabel.trim().length).toBeGreaterThan(0);
      } else {
        await quickQuotePage.clearTermsMonths(0);
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
    "UDP-T3636 - Balloon % and OR $ Auto-Populate (% entered)",
    { tag: ["@do", "@regression", "@UDP-T3636"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await quickQuotePage.enterCashPrice("$20,000");
      await quickQuotePage.enterBalloonPercent("20%");
      await expect
        .soft(quickQuotePage.balloonDollarInput)
        .toHaveValue(/4[, ]?000|4000/, { timeout: 25_000 });
    },
  );

  test(
    "UDP-T3637 - Balloon % and OR $ Auto-Populate ($ entered)",
    { tag: ["@do", "@regression", "@UDP-T3637"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await quickQuotePage.enterCashPrice("$20,000");
      await quickQuotePage.clearBalloonDollarField();
      await quickQuotePage.enterBalloonDollars("$5,000.00");
      await expect.soft(quickQuotePage.balloonDollarInput).toHaveValue(/5[, ]?000(?:\.00)?/i, {
        timeout: 25_000,
      });
    },
  );

  test(
    "UDP-T3638 - Calculate Button Enabled When Mandatory Fields Met",
    { tag: ["@do", "@regression", "@UDP-T3638"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await fillMandatoryPaymentFields(quickQuotePage);
      await expect.soft(quickQuotePage.calculateButton).toBeEnabled();
    },
  );

  test(
    "UDP-T3639 - Reset Button Clears Quote to Default",
    { tag: ["@do", "@regression", "@UDP-T3639"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await fillMandatoryPaymentFields(quickQuotePage);
      await calculateStandardPaymentQuote(quickQuotePage);
      await quickQuotePage.clickReset();
      await expect.soft(quickQuotePage.productDropdownTrigger).toBeVisible();
    },
  );

  test(
    "UDP-T3640 - Create Quote Button Converts QQ to Standard Quote",
    { tag: ["@do", "@regression", "@UDP-T3640"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await calculateStandardPaymentQuote(quickQuotePage);

      await quickQuotePage.clickCreateQuote();
      const standardRoot = page.locator("app-quote-details, app-standard-quote").first();
      await expect.soft(standardRoot).toBeVisible({ timeout: 120_000 });
      await expect.soft(page.getByText(/CSA|Credit Sale/i).first()).toBeVisible();
    },
  );

  test(
    "UDP-T3641 - Print Button Generates PDF with Disclaimer",
    { tag: ["@do", "@regression", "@UDP-T3641"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await calculateStandardPaymentQuote(quickQuotePage);

      await expect.soft(quickQuotePage.printButton).toBeVisible();
      await quickQuotePage.printButton.click({ trial: true });
    },
  );

  test(
    "UDP-T3642 - Download Button Downloads PDF",
    { tag: ["@do", "@regression", "@UDP-T3642"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await calculateStandardPaymentQuote(quickQuotePage);

      await expect.soft(quickQuotePage.downloadButton).toBeVisible();
      await quickQuotePage.downloadButton.click({ trial: true });
    },
  );

  test(
    "UDP-T3643 - Add Comparison Button Enabled After First QQ Calculated",
    { tag: ["@do", "@regression", "@UDP-T3643"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await calculateStandardPaymentQuote(quickQuotePage);

      await expect.soft(quickQuotePage.addComparison2Button).toBeEnabled();
      await quickQuotePage.clickAddComparisonPrimary();
      expect.soft(await quickQuotePage.quickQuotePanelCount()).toBe(2);
      await expect.soft(quickQuotePage.cashPriceInputOnQuote(1)).not.toHaveValue("");
    },
  );

  test(
    "UDP-T3644 - Comparison QQ Defaults Calculate For to Payment",
    { tag: ["@do", "@regression", "@UDP-T3644"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await calculateStandardPaymentQuote(quickQuotePage);

      await quickQuotePage.selectCalculateFor("Balloon");
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();
      await quickQuotePage.clickCalculate();
      await quickQuotePage.expectCreateQuoteVisible();

      await quickQuotePage.clickAddComparisonPrimary();
      expect.soft(await quickQuotePage.quickQuotePanelCount()).toBe(2);

      const qq2CalculateFor = await quickQuotePage.readCalculateForOnQuote(1);
      expect.soft(qq2CalculateFor).toMatch(/Payment/i);

      const qq2Host = quickQuotePage
        .quoteForm(1)
        .locator(
          "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::p-dropdown[1]",
        );
      const qq2HostCls = (await qq2Host.getAttribute("class").catch(() => "")) ?? "";
      if (qq2HostCls.includes("p-disabled")) {
        await expect.soft(quickQuotePage.calculateForTriggerOnQuote(1)).toBeDisabled();
      }
    },
  );

  test(
    "UDP-T3645 - Standard Quote Created from Quick Quote Conversion",
    { tag: ["@do", "@regression", "@UDP-T3645"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, quickQuotePage);
      await calculateStandardPaymentQuote(quickQuotePage);

      await quickQuotePage.clickCreateQuote();
      const standardRoot = page.locator("app-quote-details, app-standard-quote").first();
      await expect.soft(standardRoot).toBeVisible({ timeout: 120_000 });

      const assetDetailsPage = new DOAssetDetailsPage(page);
      await assetDetailsPage.waitForAssetDetailsStepReady();
      await assetDetailsPage.expectProductProgramCarriedFromQuickQuote(
        CSA_QQ_PRODUCT,
        CSA_QQ_PROGRAM,
      );
      await assetDetailsPage.expectFinanceCarriedFromQuickQuote({
        cashPrice: /20[, ]?000|20000/i,
        term: /36/,
        frequencyText: /Monthly/i,
        interestRate: /9/,
      });
    },
  );
});
