/**
 * Shared helpers for Finance Lease Quick Quote + Standard Quote regression (UDP-T4259–UDP-T4351).
 * Scenario source: FL Quote Test Cases.xlsx (Zephyr / Regression — FL_Quote_Test_Cases).
 */

import { expect } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOAddOnsAccessoriesPage, DOAssetDetailsPage, DODashboardPage, DOQuickQuotePage } from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";

export const FL_SQ_PRODUCT = "Finance Lease - Business Asg";
export const FL_SQ_PROGRAM = "Finance Lease Business - MV Dealer";
export const FL_SQ_DEALER =
  process.env.FL_SQ_DEALER ?? process.env.FL_QQ_DEALER ?? "Armstrong Prestige - Audi";
export const FL_SQ_DEALER_ALT =
  process.env.FL_SQ_DEALER_ALT ?? "Armstrong Prestige Wellington";
export const FL_STANDARD_QUOTE_ASSET_VALUE = "100000";
export const FL_RESIDUAL_PERCENT = "10";
export const FL_QQ_CASH = "100000";
export const FL_QQ_CASH_ALT = "20000";
export const FL_SQ_CASH = "25000";
export const GST_RATE = 1.15;

export function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").filter({ visible: true }).first();
}

export function parseCurrency(value: string): number {
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function readDisplayedCurrency(field: Locator): Promise<number> {
  const inputVal = (await field.inputValue({ timeout: 5_000 }).catch(() => "")).trim();
  if (inputVal) return parseCurrency(inputVal);
  const text = (await field.textContent({ timeout: 5_000 }).catch(() => "")) ?? "";
  return parseCurrency(text);
}

export function flFieldNearLabel(root: Locator, labelPattern: RegExp): Locator {
  const label = root.locator("label, span").filter({ hasText: labelPattern }).first();
  return label
    .locator("xpath=following::input[1]")
    .or(root.locator("number").filter({ hasText: labelPattern }).locator("input").first())
    .first();
}

export async function openAuthenticatedDashboard(page: Page): Promise<DODashboardPage> {
  const dashboardPage = new DODashboardPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(FL_SQ_DEALER);
  return dashboardPage;
}

export async function openFlQuickQuoteFromDashboard(page: Page): Promise<{
  dashboardPage: DODashboardPage;
  quickQuotePage: DOQuickQuotePage;
}> {
  const dashboardPage = await openAuthenticatedDashboard(page);
  const quickQuotePage = new DOQuickQuotePage(page);
  await quickQuotePage.openQuickQuote();
  await expect.soft(quickQuotePage.quickQuoteRoot).toBeVisible();
  await expect.soft(quickQuotePage.quickQuoteForm).toBeVisible();
  return { dashboardPage, quickQuotePage };
}

export async function selectFlProductAndProgram(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await quickQuotePage.selectProduct(FL_SQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  if (await quickQuotePage.programDropdownTrigger.isEnabled().catch(() => false)) {
    await quickQuotePage.selectProgram(FL_SQ_PROGRAM);
  }
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
}

export async function fillFlQuickQuoteMandatory(
  quickQuotePage: DOQuickQuotePage,
  quoteIndex = 0,
  opts?: {
    cash?: string;
    term?: string;
    rate?: string;
    residualPct?: string;
    initialLease?: string;
    skipInitialLease?: boolean;
  },
): Promise<void> {
  const cash = opts?.cash ?? FL_QQ_CASH;
  const term = opts?.term ?? "36";
  const rate = opts?.rate ?? "4";
  const residualPct = opts?.residualPct ?? FL_RESIDUAL_PERCENT;

  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  await quickQuotePage.ensureCalculateForCashPriceMode(quoteIndex);

  if (quoteIndex === 0) {
    await quickQuotePage.clearCashPriceField();
    await quickQuotePage.enterCashPrice(cash);
    await quickQuotePage.enterInterestRatePercent(rate);
    await quickQuotePage.enterTermsMonths(term);
  } else {
    await quickQuotePage.clearCashPriceFieldOnQuote(quoteIndex);
    await quickQuotePage.clearInitialLeaseAmountOnQuote(quoteIndex);
    await quickQuotePage.enterCashPriceOnQuote(quoteIndex, cash);
    await quickQuotePage.enterInterestRatePercentOnQuote(quoteIndex, rate);
    await quickQuotePage.enterTermsMonthsOnQuote(quoteIndex, term);
  }

  try {
    if (quoteIndex === 0) {
      await quickQuotePage.selectFrequency("Monthly");
    } else {
      await quickQuotePage.selectFrequencyOnQuote(quoteIndex, "Monthly");
    }
  } catch {
    /* program may default Monthly */
  }

  if (quoteIndex === 0) {
    await quickQuotePage.enterResidualValuePercent(residualPct);
  } else {
    await quickQuotePage.enterResidualValuePercentOnQuote(quoteIndex, residualPct);
  }

  if (!opts?.skipInitialLease && opts?.initialLease) {
    if (quoteIndex === 0) {
      await quickQuotePage.enterInitialLeaseAmount(opts.initialLease);
    } else {
      await quickQuotePage.enterInitialLeaseAmountOnQuote(quoteIndex, opts.initialLease);
    }
  }
}

export async function calculateFlQuickQuote(
  quickQuotePage: DOQuickQuotePage,
  quoteIndex = 0,
): Promise<void> {
  if (quoteIndex === 0) {
    await quickQuotePage.clickCalculate();
  } else {
    await quickQuotePage.clickCalculateOnQuote(quoteIndex);
  }
  await quickQuotePage.expectCreateQuoteVisible(quoteIndex);
}

export async function openFlStandardQuoteFromDashboard(page: Page): Promise<{
  dashboardPage: DODashboardPage;
  assetDetailsPage: DOAssetDetailsPage;
}> {
  return openFlStandardQuoteForDealer(page, FL_SQ_DEALER);
}

export async function openFlStandardQuoteForDealer(
  page: Page,
  dealer: string,
): Promise<{
  dashboardPage: DODashboardPage;
  assetDetailsPage: DOAssetDetailsPage;
}> {
  const dashboardPage = new DODashboardPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(dealer);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectFinanceLeaseProduct();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await expect.soft(page.getByText(/Lease\s*Details/i).first()).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.waitForAssetDetailsStepReady();
  return { dashboardPage, assetDetailsPage };
}

export async function selectFlSqProductAndProgram(assetDetailsPage: DOAssetDetailsPage): Promise<void> {
  await assetDetailsPage.chooseProduct(FL_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(FL_SQ_PROGRAM);
}

export async function addMinimalFlAsset(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  assetValue = FL_STANDARD_QUOTE_ASSET_VALUE,
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
  await assetDetailsPage.enterAsset("Car and Light Commercial /");
  await assetDetailsPage.selectCondition("Used");
  await assetDetailsPage.waitForQuoteLoadersToFinish();
}

export async function prepareCalculableFlQuote(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  opts?: {
    origRef?: string;
    term?: string;
    interest?: string;
    cashPrice?: string;
    residualDollar?: string;
    residualPercent?: string;
    initialLease?: string;
    skipAsset?: boolean;
  },
): Promise<void> {
  await selectFlSqProductAndProgram(assetDetailsPage);
  if (!opts?.skipAsset) {
    await addMinimalFlAsset(assetDetailsPage, addAssetPage, opts?.cashPrice ?? FL_STANDARD_QUOTE_ASSET_VALUE);
  }
  await assetDetailsPage.termsOfFinance(opts?.term ?? "36");
  await assetDetailsPage.interestRate(opts?.interest ?? "4");
  await assetDetailsPage.enterOriginationReferenceFinanceLease(opts?.origRef ?? "SQ-FL-Ref-01");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  if (opts?.residualDollar) {
    await assetDetailsPage.enterOlResidualValueAmount(opts.residualDollar);
  }
  await assetDetailsPage.waitForQuoteLoadersToFinish();
  if (!opts?.skipAsset) {
    const cashField = assetDetailsPage.cashPriceOfAssetInputField;
    const readCash = async (): Promise<number> => readDisplayedCurrency(cashField);
    try {
      await expect
        .poll(readCash, { timeout: 45_000, intervals: [500, 1_000, 2_000] })
        .toBeGreaterThan(0);
    } catch {
      const fallbackCash = opts?.cashPrice ?? FL_STANDARD_QUOTE_ASSET_VALUE;
      const formatted = fallbackCash.startsWith("$") ? fallbackCash : `$${fallbackCash}`;
      await assetDetailsPage.cashPriceOfAsset(formatted);
      await expect
        .poll(readCash, { timeout: 30_000, intervals: [500, 1_000, 2_000] })
        .toBeGreaterThan(0);
    }
  }
  if (opts?.initialLease) {
    await assetDetailsPage.enterInitialLeaseAmountFinanceLease(opts.initialLease);
  }
  await assetDetailsPage.waitForQuoteLoadersToFinish();
}

export async function calculateFlStandardQuoteWithAddOns(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  opts?: Parameters<typeof prepareCalculableFlQuote>[3] & { skipPaymentScheduleCheck?: boolean },
): Promise<void> {
  await selectFlSqProductAndProgram(assetDetailsPage);
  await addMinimalFlAsset(assetDetailsPage, addAssetPage, opts?.cashPrice ?? FL_STANDARD_QUOTE_ASSET_VALUE);
  await fillAddOnAccessoriesAndSave(page, assetDetailsPage);
  await calculateFlQuote(page, assetDetailsPage, addAssetPage, {
    ...opts,
    skipAsset: true,
    skipPaymentScheduleCheck: opts?.skipPaymentScheduleCheck ?? true,
  });
}

export async function calculateFlQuote(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  opts?: Parameters<typeof prepareCalculableFlQuote>[3] & { skipPaymentScheduleCheck?: boolean },
): Promise<void> {
  await prepareCalculableFlQuote(page, assetDetailsPage, addAssetPage, opts);
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.enterResidualValuePercentFinanceLease(opts?.residualPercent ?? FL_RESIDUAL_PERCENT);
  if (opts?.residualDollar) {
    await assetDetailsPage.enterOlResidualValueAmount(opts.residualDollar);
  }
  await assetDetailsPage.clickCalculateButton();
  if (!opts?.skipPaymentScheduleCheck) {
    await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
  }
}

/** Calculated FL quote: expand Dealer Finance and return Base Interest Rate % (or null if access-controlled). */
export async function captureFlBaseInterestRateAfterCalculate(
  page: Page,
  dealer: string,
  opts?: {
    interest?: string;
    saveBeforeRead?: boolean;
    origRef?: string;
  },
): Promise<string | null> {
  const { assetDetailsPage } = await openFlStandardQuoteForDealer(page, dealer);
  const addAssetPage = new DOAddAssetPage(page);
  await calculateFlQuote(page, assetDetailsPage, addAssetPage, {
    interest: opts?.interest ?? "4",
    origRef: opts?.origRef ?? "SQ-FL-Ref-01",
    skipPaymentScheduleCheck: true,
  });

  const dealerFinanceTrigger = standardQuoteRoot(page)
    .locator(':text-is("Dealer Finance")')
    .first();
  if (!(await dealerFinanceTrigger.isVisible({ timeout: 8_000 }).catch(() => false))) {
    return null;
  }

  if (opts?.saveBeforeRead) {
    await assetDetailsPage
      .clickSaveStandardQuoteStep({ originatorRefForRequiredDialog: opts?.origRef ?? "SQ-FL-Ref-01" })
      .catch(() => {});
    await assetDetailsPage.waitForQuoteLoadersToFinish();
  }

  await assetDetailsPage.expandDealerFinanceSection();
  const rate = await assetDetailsPage.readBaseInterestRatePercent();
  return Number.isFinite(rate) ? `${rate}%` : null;
}

export async function fillAddOnAccessoriesAndSave(
  page: Page,
  assetDetailsPage?: DOAssetDetailsPage,
): Promise<void> {
  const sp = page.locator("app-service-plan");
  const acc = page.locator("app-accessories");
  const addOnPanels = page.locator(
    "app-service-plan, app-accessories, app-add-on-accessories, app-add-ons-accessories, app-addon-accessories",
  );
  const addOnVisible = await addOnPanels.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!addOnVisible) {
    if (assetDetailsPage) {
      await assetDetailsPage.clickAddonsAndAccessoriesAndExpectScreen().catch(() => {});
    } else {
      const openAddOnsBtn = page
        .getByRole("button", { name: /Add\s+Maintenance\s*&\s*Charges/i })
        .or(page.locator("button").filter({ hasText: /Add\s+Maintenance\s*&\s*Charges/i }))
        .first();
      if (await openAddOnsBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await openAddOnsBtn.click({ timeout: 15_000 });
      }
    }
  }
  await addOnPanels.first().waitFor({ state: "visible", timeout: 45_000 });

  // Use POM row helpers when available; selectors are more resilient across dealer variants.
  if (assetDetailsPage) {
    const addOnsPage = new DOAddOnsAccessoriesPage(page);
    await addOnsPage.fillRegistrationAmount("500");
    await addOnsPage.fillGeneralAccessoriesAmount("200");
    await addOnsPage.fillUdpT4221InsuranceIfAvailable("2", "200").catch(() => false);
  }

  const fillRow = async (scope: Locator, label: RegExp, amount: string, months: string) => {
    const rowGrid = scope.getByText(label).first().locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    const amt = rowGrid.locator("input[currencymask]").first();
    if (await amt.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await amt.click();
      await amt.fill(amount);
      await amt.press("Tab").catch(() => {});
    }
    const mos = rowGrid.locator('input[formcontrolname="months"]').first();
    if (await mos.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await mos.fill(months);
      await mos.press("Tab").catch(() => {});
    }
  };

  if (!assetDetailsPage) {
    await fillRow(sp, /^Registration$/, "500", "12");
    await fillRow(sp, /^Service Plan$/, "300", "24");
    await fillRow(acc, /^General Accessory$/, "200", "12");
  }

  const saveBtn = page
    .locator('button[type="button"][data-pc-name="button"]')
    .filter({ has: page.locator('span[data-pc-section="label"]').filter({ hasText: /^Save$/ }) })
    .last();
  await saveBtn.click({ timeout: 20_000 });
  if (assetDetailsPage) {
    await assetDetailsPage.waitForQuoteLoadersToFinish();
  }
}

export async function readFlResidualPercent(assetDetailsPage: DOAssetDetailsPage): Promise<number> {
  const pct = assetDetailsPage.olResidualPercentInputField();
  if (await pct.isVisible({ timeout: 3_000 }).catch(() => false)) {
    return parseCurrency(await pct.inputValue());
  }
  return 0;
}

export async function readFlResidualDollar(assetDetailsPage: DOAssetDetailsPage): Promise<number> {
  return readDisplayedCurrency(assetDetailsPage.olResidualValueInputField());
}

export async function readFlNormalPayment(quickQuotePage: DOQuickQuotePage): Promise<number> {
  const text = await quickQuotePage.readPaymentDisplayValue().catch(() => "");
  return parseCurrency(text);
}
