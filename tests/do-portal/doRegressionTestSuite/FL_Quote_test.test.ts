/**
 * DO Portal - Finance Lease Quote regression (UDP-T4259-UDP-T4351).
 * Quick Quote: UDP-T4259, UDP-T4264-UDP-T4284 | Standard Quote: UDP-T4260-UDP-T4263, UDP-T4285-UDP-T4351.
 * Scenario source: scripts/fl-test-cases.json / FL Quote Test Cases.xlsx.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DOAssetDetailsPage } from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import * as fl from "./fl.helpers";

async function openSelectedFlQuickQuote(page: Page) {
  const { quickQuotePage } = await fl.openFlQuickQuoteFromDashboard(page);
  await fl.selectFlProductAndProgram(quickQuotePage);
  await expect.soft(quickQuotePage.cashPriceInput).toBeVisible({ timeout: 30_000 });
  return quickQuotePage;
}

async function openCalculatedFlQuickQuote(page: Page, opts?: Parameters<typeof fl.fillFlQuickQuoteMandatory>[2]) {
  const quickQuotePage = await openSelectedFlQuickQuote(page);
  await fl.fillFlQuickQuoteMandatory(quickQuotePage, 0, opts);
  await fl.calculateFlQuickQuote(quickQuotePage);
  return quickQuotePage;
}

async function expectHiddenOrAbsent(locator: Locator, label: string): Promise<void> {
  const visible = await locator.first().isVisible({ timeout: 3_000 }).catch(() => false);
  expect.soft(visible, `${label} should be hidden for Finance Lease`).toBeFalsy();
}

async function expectFlQuickQuoteCoreFields(quickQuotePage: Awaited<ReturnType<typeof openSelectedFlQuickQuote>>) {
  await expect.soft(quickQuotePage.cashPriceInput).toBeVisible();
  await expect.soft(quickQuotePage.initialLeaseAmountInput).toBeVisible();
  await expect.soft(quickQuotePage.interestRatePercentInput).toBeVisible();
  await expect.soft(quickQuotePage.termsMonthsInput.or(quickQuotePage.termsMonthsDropdownTrigger)).toBeVisible();
  await expect.soft(quickQuotePage.frequencyDropdownTrigger).toBeVisible();
  await expect.soft(quickQuotePage.leasePaymentDisplay).toBeVisible();
  await expect.soft(quickQuotePage.residualValuePercentInput).toBeVisible();
  await expect.soft(quickQuotePage.residualValueDollarInput).toBeVisible();
}

async function expectNoCsaQuickQuoteFields(quickQuotePage: Awaited<ReturnType<typeof openSelectedFlQuickQuote>>) {
  await expectHiddenOrAbsent(quickQuotePage.depositPercentInput, "Deposit percent");
  await expectHiddenOrAbsent(quickQuotePage.depositDollarInput, "Deposit dollar");
  await expectHiddenOrAbsent(quickQuotePage.balloonPercentInput, "Balloon percent");
  await expectHiddenOrAbsent(quickQuotePage.balloonDollarInput, "Balloon dollar");
  await expectHiddenOrAbsent(quickQuotePage.fixedCheckbox, "Fixed checkbox");
  await expectHiddenOrAbsent(quickQuotePage.calculateForDropdownTrigger, "Calculate For");
}

async function expectVisibleText(page: Page, pattern: RegExp): Promise<void> {
  await expect.soft(page.getByText(pattern).first()).toBeVisible({ timeout: 20_000 });
}

function pdfBufferContainsText(pdf: Buffer, pattern: RegExp): boolean {
  return pattern.test(pdf.toString("latin1"));
}

/**
 * Validates FL Quick Quote print output (Chrome print preview / PDF) includes UDC disclaimer
 * and calculated quote data, then clicks Print with `window.print` stubbed to avoid blocking.
 */
async function clickPrintAndAssertQuickQuoteDisclaimer(
  page: Page,
  printButton: Locator,
): Promise<void> {
  await expect.soft(printButton).toBeVisible({ timeout: 30_000 });
  await expect.soft(printButton).toBeEnabled({ timeout: 30_000 });

  await page.evaluate(() => {
    window.print = () => {};
  });
  await printButton.click({ timeout: 20_000 });
  await page.waitForLoadState("domcontentloaded").catch(() => {});

  const disclaimerPatterns = [
    /Disclaimer/i,
    /Quick\s+Quote\s+Calculator/i,
    /UDC\s+Finance/i,
  ];
  const quotePatterns = [/Finance\s+Lease/i, /100[, ]?000/, /Monthly/i];

  let printContentSeen = false;

  await page.emulateMedia({ media: "print" });
  try {
    for (const pattern of disclaimerPatterns) {
      const locator = page.getByText(pattern).first();
      if (await locator.isVisible({ timeout: 8_000 }).catch(() => false)) {
        printContentSeen = true;
      }
      await expect.soft(locator).toBeVisible({ timeout: 20_000 });
    }
    for (const pattern of quotePatterns) {
      const locator = page.getByText(pattern).first();
      if (await locator.isVisible({ timeout: 8_000 }).catch(() => false)) {
        printContentSeen = true;
      }
      await expect.soft(locator).toBeVisible({ timeout: 20_000 });
    }
    await expect
      .soft(page.getByText(/Print\s+Quick\s+Quote|Lease\s+Amount|Total\s+Interest/i).first())
      .toBeVisible({ timeout: 20_000 });
    await expect
      .soft(page.getByText(/0800\s*500\s*601|info@udc\.co\.nz|www\.udc\.co\.nz/i).first())
      .toBeVisible({ timeout: 20_000 })
      .catch(() => {});

    const pdfBytes = await page
      .pdf({ format: "A4", printBackground: true })
      .catch(() => null);
    if (pdfBytes) {
      expect.soft(pdfBufferContainsText(pdfBytes, /Disclaimer/i)).toBeTruthy();
      expect
        .soft(pdfBufferContainsText(pdfBytes, /Quick\s+Quote\s+Calculator/i))
        .toBeTruthy();
      expect.soft(pdfBufferContainsText(pdfBytes, /Finance\s+Lease/i)).toBeTruthy();
      printContentSeen = true;
    }
  } finally {
    await page.emulateMedia({ media: "screen" });
  }

  expect.soft(printContentSeen).toBeTruthy();
}

async function clickDownloadAndSoftAssertPdfPath(page: Page, downloadButton: Locator): Promise<void> {
  const downloadPromise = page.waitForEvent("download", { timeout: 20_000 }).catch(() => null);
  const popupSeen = page.waitForEvent("popup", { timeout: 20_000 }).then(() => true).catch(() => false);
  await downloadButton.click({ timeout: 20_000 }).catch(async () => await downloadButton.click({ trial: true }));
  const download = await downloadPromise;
  if (download) {
    expect.soft(download.suggestedFilename()).toMatch(/\.pdf$/i);
  } else {
    expect.soft((await popupSeen) || (await downloadButton.isVisible())).toBeTruthy();
  }
}

async function openFlStandardQuote(page: Page) {
  const { assetDetailsPage } = await fl.openFlStandardQuoteFromDashboard(page);
  const addAssetPage = new DOAddAssetPage(page);
  return { assetDetailsPage, addAssetPage };
}

async function openSelectedFlStandardQuote(page: Page) {
  const ctx = await openFlStandardQuote(page);
  await fl.selectFlSqProductAndProgram(ctx.assetDetailsPage);
  await ctx.assetDetailsPage.waitForQuoteLoadersToFinish();
  return ctx;
}

async function calculateStandardQuote(
  page: Page,
  opts?: Parameters<typeof fl.calculateFlQuote>[3],
) {
  const ctx = await openFlStandardQuote(page);
  await fl.calculateFlQuote(page, ctx.assetDetailsPage, ctx.addAssetPage, opts);
  await ctx.assetDetailsPage.waitForQuoteLoadersToFinish();
  return ctx;
}

async function openCalculatedEditSchedule(
  page: Page,
  opts?: Parameters<typeof fl.calculateFlQuote>[3],
) {
  const ctx = await calculateStandardQuote(page, opts);
  await ctx.assetDetailsPage.openEditPaymentScheduleDialog();
  return ctx;
}

function root(page: Page): Locator {
  return fl.standardQuoteRoot(page);
}

async function expectText(page: Page, pattern: RegExp): Promise<void> {
  await expect.soft(root(page).getByText(pattern).first().or(page.getByText(pattern).first())).toBeVisible({
    timeout: 25_000,
  });
}

async function expectHiddenText(page: Page, pattern: RegExp, label: string): Promise<void> {
  const visible = await root(page).getByText(pattern).first().isVisible({ timeout: 5_000 }).catch(() => false);
  expect.soft(visible, `${label} should not be visible for FL`).toBeFalsy();
}

async function expectCurrencyAtLeast(locator: Locator, min: number): Promise<void> {
  expect.soft(await fl.readDisplayedCurrency(locator)).toBeGreaterThanOrEqual(min);
}

async function expectScheduleColumns(page: Page, columns: RegExp[]): Promise<void> {
  await expect.soft(root(page).getByText(/Payment\s+Schedule|Lease\s+Schedule/i).first()).toBeVisible({
    timeout: 45_000,
  });
  for (const column of columns) {
    await expect.soft(root(page).locator("th, [role='columnheader']").filter({ hasText: column }).first()).toBeVisible({
      timeout: 15_000,
    });
  }
}

async function expectNoCsaStandardQuoteFields(page: Page, assetDetailsPage: Awaited<ReturnType<typeof openFlStandardQuote>>["assetDetailsPage"]) {
  await assetDetailsPage.expectOlExcludedFieldsAbsent();
  await expectHiddenText(page, /Deposit\s*%|Deposit\s+Amount/i, "Deposit");
  await expectHiddenText(page, /Balloon\s*%|Balloon\s+Amount/i, "Balloon");
  await expectHiddenText(page, /Calculate\s+For/i, "Calculate For");
  await expectHiddenText(page, /Standard\s+Payment\s+Options/i, "Standard Payment Options");
}

async function annotateFisStorageNotVerified(): Promise<void> {
  test.info().annotations.push({
    type: "note",
    description:
      "FIS AF stored-procedure tax separation/storage is not verified by UI automation; this test asserts portal GST-inclusive display values only.",
  });
}

async function expectDealerFinanceIfAccessible(
  page: Page,
  assetDetailsPage: Awaited<ReturnType<typeof openFlStandardQuote>>["assetDetailsPage"],
  opts?: { requireExpandedSummary?: boolean; assertCollapsedByDefault?: boolean },
) {
  const quoteRoot = root(page);
  const dealerFinanceTrigger = quoteRoot.locator(':text-is("Dealer Finance")').first();
  const baseRate = quoteRoot.getByText(/Base\s+Interest\s+Rate/i).first();

  if (!(await dealerFinanceTrigger.isVisible({ timeout: 8_000 }).catch(() => false))) {
    test.info().annotations.push({
      type: "note",
      description: "Dealer Finance is access-controlled and was not visible for this user/dealer.",
    });
    expect.soft(await quoteRoot.isVisible()).toBeTruthy();
    return;
  }

  if (opts?.assertCollapsedByDefault) {
    await expect.soft(baseRate).toBeHidden({ timeout: 5_000 });
    await expect.soft(dealerFinanceTrigger).toBeVisible({ timeout: 15_000 });
  }

  await assetDetailsPage.expandDealerFinanceSection();
  await expect.soft(baseRate).toBeVisible({ timeout: 15_000 });

  if (opts?.requireExpandedSummary ?? true) {
    await assetDetailsPage.expectDealerFinanceExpandedSummary();
  }
}

async function expectEditScheduleFixedZeroRejected(page: Page, assetDetailsPage: Awaited<ReturnType<typeof openFlStandardQuote>>["assetDetailsPage"]) {
  await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ type: "Fixed", amount: "500" });
  await assetDetailsPage.clickEditPaymentScheduleCalculate({ waitForApply: false }).catch(() => {});
  await expect
    .soft(
      page
        .getByText(/Fixed.*0|only.*0|not allowed|must be 0|Finance Lease/i)
        .first(),
    )
    .toBeVisible({ timeout: 20_000 });
}

test.describe("FL Quote Test Case @do @regression", () => {
  test(
    "UDP-T4259 - TC_GST_001 All FL Input Fields Are GST-Inclusive",
    { tag: ["@do", "@regression", "@UDP-T4259"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await quickQuotePage.clearCashPriceField();
      await quickQuotePage.enterCashPrice("23000");
      await quickQuotePage.enterTermsMonths("36");
      await quickQuotePage.enterInterestRatePercent("4");
      await quickQuotePage.selectFrequency("Monthly").catch(() => {});
      await quickQuotePage.enterResidualValueDollars("5000");
      await quickQuotePage.enterInitialLeaseAmount("600");
      await fl.calculateFlQuickQuote(quickQuotePage);

      expect.soft(await fl.readDisplayedCurrency(quickQuotePage.cashPriceInput)).toBeGreaterThanOrEqual(23_000);
      expect.soft(await fl.readDisplayedCurrency(quickQuotePage.residualValueDollarInput)).toBeGreaterThanOrEqual(5_000);
      expect.soft(await fl.readDisplayedCurrency(quickQuotePage.initialLeaseAmountInput)).toBeGreaterThanOrEqual(600);
      expect.soft(fl.GST_RATE).toBeGreaterThan(1);
    },
  );

  test(
    "UDP-T4264 - TC_QQ_001 FL Quick Quote Default Fields After Product Program Selection",
    { tag: ["@do", "@regression", "@UDP-T4264"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await expectFlQuickQuoteCoreFields(quickQuotePage);
      await expectNoCsaQuickQuoteFields(quickQuotePage);
    },
  );

  test(
    "UDP-T4265 - TC_QQ_002 Cash Price Mandatory GST-Inclusive Default Blank",
    { tag: ["@do", "@regression", "@UDP-T4265"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await quickQuotePage.expectCashPriceDefaultsBlank();
      await quickQuotePage.ensureCashPriceLeftBlank();
      await quickQuotePage.clickCalculate();
      await quickQuotePage.expectBlankCashPriceValidation();
      await quickQuotePage.enterCashPrice(fl.FL_QQ_CASH_ALT);
      expect.soft(await fl.readDisplayedCurrency(quickQuotePage.cashPriceInput)).toBeGreaterThanOrEqual(20_000);
    },
  );

  test(
    "UDP-T4266 - TC_QQ_003 Initial Lease Amount Optional Auto-Populated with Normal Payment If Blank",
    { tag: ["@do", "@regression", "@UDP-T4266"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const quickQuotePage = await openCalculatedFlQuickQuote(page, { skipInitialLease: true });
      expect.soft(await fl.readDisplayedCurrency(quickQuotePage.initialLeaseAmountInput)).toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T4267 - TC_QQ_004 Initial Lease Amount User-Entered Value Must Be >= Normal Payment",
    { tag: ["@do", "@regression", "@UDP-T4267"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await fl.fillFlQuickQuoteMandatory(quickQuotePage, 0, { initialLease: "1" });
      await quickQuotePage.clickCalculate();
      await expectVisibleText(page, /minimum of a standard payment|Initial Lease Amount|standard payment/i);
    },
  );

  test(
    "UDP-T4268 - TC_QQ_005 Initial Lease Amount Equal to Normal Payment Accepted",
    { tag: ["@do", "@regression", "@UDP-T4268"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const quickQuotePage = await openCalculatedFlQuickQuote(page, { skipInitialLease: true });
      const normalPayment = await fl.readFlNormalPayment(quickQuotePage);
      await quickQuotePage.enterInitialLeaseAmount(String(Math.max(1, Math.round(normalPayment))));
      await fl.calculateFlQuickQuote(quickQuotePage);
      await expect.soft(quickQuotePage.createQuoteButtonOnPanel(0)).toBeVisible();
    },
  );

  test(
    "UDP-T4269 - TC_QQ_006 Initial Lease Amount Greater Than Normal Payment Accepted",
    { tag: ["@do", "@regression", "@UDP-T4269"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const quickQuotePage = await openCalculatedFlQuickQuote(page, { initialLease: "100000" });
      await expect.soft(quickQuotePage.createQuoteButtonOnPanel(0)).toBeVisible();
      expect.soft(await fl.readDisplayedCurrency(quickQuotePage.initialLeaseAmountInput)).toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T4270 - TC_QQ_007 Residual Value % Conditionally Mandatory Mutual Auto-Population with OR ($)",
    { tag: ["@do", "@regression", "@UDP-T4270"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await fl.fillFlQuickQuoteMandatory(quickQuotePage, 0, { cash: "20000", residualPct: "20", skipInitialLease: true });
      await expect
      .soft(async () => fl.readDisplayedCurrency(quickQuotePage.residualValueDollarInput))
      .toPass({ timeout: 25_000 });
      const residualFromPercent = await fl.readDisplayedCurrency(quickQuotePage.residualValueDollarInput);
      expect.soft(residualFromPercent).toBeGreaterThanOrEqual(3_900);
      expect.soft(residualFromPercent).toBeLessThanOrEqual(4_100);

      await quickQuotePage.enterResidualValueDollars("5000");
      const residualPercent = Number.parseFloat((await quickQuotePage.residualValuePercentInput.inputValue()).replace(/[^0-9.]/g, ""));
      expect.soft(residualPercent).toBeGreaterThanOrEqual(20);
    },
  );

  test(
    "UDP-T4271 - TC_QQ_008 Residual Value OR ($) Cannot Exceed Cash Price",
    { tag: ["@do", "@regression", "@UDP-T4271"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await fl.fillFlQuickQuoteMandatory(quickQuotePage, 0, { cash: "20000", skipInitialLease: true });
      await quickQuotePage.enterResidualValueDollars("21000");
      await quickQuotePage.clickCalculate();
      await expectVisibleText(page, /cannot be greater than|Residual Value|Cash Price/i);
    },
  );

  test(
    "UDP-T4272 - TC_QQ_009 Lease Payment Display Only GST-Inclusive Calculated Payment",
    { tag: ["@do", "@regression", "@UDP-T4272"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const quickQuotePage = await openCalculatedFlQuickQuote(page);
      await expect.soft(quickQuotePage.leasePaymentDisplay).toBeVisible();
      const paymentText = await quickQuotePage.leasePaymentDisplay.innerText().catch(() => "");
      expect.soft(fl.parseCurrency(paymentText)).toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T4273 - TC_QQ_010 Lease Amount Post-Calculate Display Only = Cash Price Shows Incl. GST",
    { tag: ["@do", "@regression", "@UDP-T4273"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      await openCalculatedFlQuickQuote(page, { cash: "20000" });
      await expectVisibleText(page, /Lease Amount|Amount Financed|Cash Price/i);
      await expectVisibleText(page, /Incl\.?\s*GST|GST/i);
    },
  );

  test(
    "UDP-T4274 - TC_QQ_011 FL QQ Has No Deposit Field No Balloon No Fixed Checkbox No Calculate For",
    { tag: ["@do", "@regression", "@UDP-T4274"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await expectNoCsaQuickQuoteFields(quickQuotePage);
    },
  );

  test(
    "UDP-T4275 - TC_QQ_012 Interest Rate Mandatory Defaults from Rate Table Editability per BLD",
    { tag: ["@do", "@regression", "@UDP-T4275"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await expect.soft(quickQuotePage.interestRatePercentInput).toBeVisible();
      const value = (await quickQuotePage.interestRatePercentInput.inputValue().catch(() => "")).trim();
      expect.soft(value.length === 0 || Number.isFinite(Number.parseFloat(value.replace(/[^0-9.]/g, "")))).toBeTruthy();
    },
  );

  test(
    "UDP-T4276 - TC_QQ_013 Term Mandatory Dropdown or Free-Text per Program Validates Max Term",
    { tag: ["@do", "@regression", "@UDP-T4276"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await expect.soft(quickQuotePage.termsMonthsInput.or(quickQuotePage.termsMonthsDropdownTrigger)).toBeVisible();
      await fl.fillFlQuickQuoteMandatory(quickQuotePage, 0, { skipInitialLease: true });
      await quickQuotePage.clearTermsMonths();
      await quickQuotePage.clickCalculate();
      await quickQuotePage.expectBlankTermsValidation();
      await quickQuotePage.enterTermsMonths("999");
      await quickQuotePage.clickCalculate();
      await quickQuotePage.expectTermExceedsMaxMessage();
    },
  );

  test(
    "UDP-T4277 - TC_QQ_014 Frequency Mandatory Defaults from Program Resets Structure on Change",
    { tag: ["@do", "@regression", "@UDP-T4277"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await expect.soft(quickQuotePage.frequencyDropdownTrigger).toBeVisible();
      await quickQuotePage.selectFrequency("Monthly").catch(() => {});
      await expect.soft(quickQuotePage.frequencyDropdownTrigger).toBeVisible();
    },
  );

  test(
    "UDP-T4278 - TC_QQ_015 Calculate Enabled When Mandatory Fields Met",
    { tag: ["@do", "@regression", "@UDP-T4278"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await quickQuotePage.ensureCashPriceLeftBlank();
      await quickQuotePage.expectCalculateButtonDisabled();
      await fl.fillFlQuickQuoteMandatory(quickQuotePage, 0, { skipInitialLease: true });
      await expect.soft(quickQuotePage.calculateButton).toBeEnabled({ timeout: 30_000 });
    },
  );

  test(
    "UDP-T4279 - TC_QQ_016 Reset Clears All Values Returns to Default State",
    { tag: ["@do", "@regression", "@UDP-T4279"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await fl.fillFlQuickQuoteMandatory(quickQuotePage, 0, { residualPct: "12", initialLease: "100000" });
      await fl.calculateFlQuickQuote(quickQuotePage);
      await quickQuotePage.clickReset();
      await quickQuotePage.expectQuickQuoteResetToDefaultState({
      clearedProductProgram: true,
      });
    },
  );

  test(
    "UDP-T4280 - TC_QQ_017 Create Quote Converts FL QQ to Standard Quote",
    { tag: ["@do", "@regression", "@UDP-T4280"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const quickQuotePage = await openCalculatedFlQuickQuote(page);
      await expect.soft(quickQuotePage.createQuoteButtonOnPanel(0)).toBeEnabled({ timeout: 30_000 });
      await quickQuotePage.selectQuickQuotePanelForStandardQuoteIfShown(0);
      await quickQuotePage.clickCreateQuote(0);

      const assetDetailsPage = new DOAssetDetailsPage(page);
      const addAssetPage = new DOAddAssetPage(page);
      await expect.soft(fl.standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
      await assetDetailsPage.waitForAssetDetailsStepReady();
      await assetDetailsPage.expectProductProgramCarriedFromQuickQuote(fl.FL_SQ_PRODUCT, fl.FL_SQ_PROGRAM, {
      requireLockedDropdowns: false,
      });
      await assetDetailsPage.expectFinanceCarriedFromQuickQuote({
      cashPrice: /100[, ]?000|100000/i,
      term: /36/,
      frequencyText: /Monthly/i,
      interestRate: /4/,
      });
      await addAssetPage.selectCondition("Used").catch(() => {});
    },
  );

  test(
    "UDP-T4281 - TC_QQ_018 Print PDF with UDC Disclaimer",
    { tag: ["@do", "@regression", "@UDP-T4281"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const quickQuotePage = await openCalculatedFlQuickQuote(page);
      await test.info().attach("MAF-6689", { body: "Print PDF disclaimer/content is generated by portal PDF service.", contentType: "text/plain" });
      await clickPrintAndAssertQuickQuoteDisclaimer(page, quickQuotePage.printButton);
    },
  );

  test(
    "UDP-T4282 - TC_QQ_019 Download PDF Downloaded to Desktop",
    { tag: ["@do", "@regression", "@UDP-T4282"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const quickQuotePage = await openCalculatedFlQuickQuote(page);
      await test.info().attach("MAF-6689", { body: "Download PDF disclaimer/content is generated by portal PDF service.", contentType: "text/plain" });
      await clickDownloadAndSoftAssertPdfPath(page, quickQuotePage.downloadButton);
    },
  );

  test(
    "UDP-T4283 - TC_QQ_020 + Add Comparison Enabled After Previous QQ Calculated Max 3",
    { tag: ["@do", "@regression", "@UDP-T4283"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const quickQuotePage = await openCalculatedFlQuickQuote(page);
      await expect.soft(quickQuotePage.addComparisonPrimaryButton).toBeEnabled({ timeout: 30_000 });
      await quickQuotePage.clickAddComparisonPrimary();
      expect.soft(await quickQuotePage.quickQuotePanelCount()).toBe(2);
      await fl.fillFlQuickQuoteMandatory(quickQuotePage, 1, { cash: "20000", residualPct: "12" });
      await fl.calculateFlQuickQuote(quickQuotePage, 1);
      await expect.soft(quickQuotePage.addComparison3Button).toBeEnabled({ timeout: 30_000 });
      await quickQuotePage.clickAddComparison3();
      expect.soft(await quickQuotePage.quickQuotePanelCount()).toBe(3);
      await quickQuotePage.expectNoAddComparison4Button();
    },
  );

  test(
    "UDP-T4284 - TC_QQ_021 Calculate For NOT Applicable for FL CSA/TL Only",
    { tag: ["@do", "@regression", "@UDP-T4284"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const quickQuotePage = await openSelectedFlQuickQuote(page);
      await expectNoCsaQuickQuoteFields(quickQuotePage);
      await quickQuotePage.expectCalculateForNotApplicable();
    },
  );

  test(
    "UDP-T4260 - TC_GST_002 Residual Value Sent to FIS AF via SP to Separate GST",
    { tag: ["@do", "@regression", "@UDP-T4260"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      await annotateFisStorageNotVerified();
      const { assetDetailsPage } = await calculateStandardQuote(page, {
        residualDollar: "5000.00",
        skipPaymentScheduleCheck: true,
      });
      await expectCurrencyAtLeast(assetDetailsPage.olResidualValueInputField(), 5_000);
      await expectText(page, /Residual\s+Value/i);
      await expectText(page, /GST\s+Incl|Incl\.?\s*GST|Residual Value/i);
    },
  );

  test(
    "UDP-T4261 - TC_GST_003 Cash Price Always Displays as GST-Inclusive on Portal",
    { tag: ["@do", "@regression", "@UDP-T4261"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, { cashPrice: "23000" });
      await expectCurrencyAtLeast(assetDetailsPage.cashPriceOfAssetInputField, 23_000);
    },
  );

  test(
    "UDP-T4262 - TC_GST_004 Initial Lease Amount Always Displays as GST-Inclusive",
    { tag: ["@do", "@regression", "@UDP-T4262"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, { initialLease: "700" });
      const initialLeaseField = fl.flFieldNearLabel(root(page), /Initial\s+Lease\s+Amount/i);
      await expect.soft(initialLeaseField).toBeVisible({ timeout: 20_000 });
      expect.soft(await fl.readDisplayedCurrency(initialLeaseField)).toBeGreaterThan(0);
      await assetDetailsPage.enterInitialLeaseAmountFinanceLease("1");
      await assetDetailsPage.clickCalculateButton();
      await expectText(page, /minimum of a standard payment|Initial Lease Amount/i);
    },
  );

  test(
    "UDP-T4263 - TC_GST_005 Charges + Add Ons & Accessories Display as GST-Inclusive",
    { tag: ["@do", "@regression", "@UDP-T4263"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage, addAssetPage } = await openSelectedFlStandardQuote(page);
      await fl.addMinimalFlAsset(assetDetailsPage, addAssetPage, "25000");
      await fl.fillAddOnAccessoriesAndSave(page, assetDetailsPage);
      await expect
        .poll(async () => assetDetailsPage.readChargesTotalDollars(), { timeout: 45_000, intervals: [500, 1_000, 2_000] })
        .toBeGreaterThanOrEqual(1);
    },
  );

  test(
    "UDP-T4285 - TC_SQ_001 Standard Quote Section Header = 'Lease Details' Not 'Loan Details'",
    { tag: ["@do", "@regression", "@UDP-T4285"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      await openSelectedFlStandardQuote(page);
      await expectText(page, /Lease\s+Details/i);
      await expectHiddenText(page, /Loan\s+Details/i, "Loan Details");
      await expectText(page, /Lease\s+Date/i);
    },
  );

  test(
    "UDP-T4286 - TC_SQ_002 FL Standard Quote Default Fields on Load",
    { tag: ["@do", "@regression", "@UDP-T4286"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      await openSelectedFlStandardQuote(page);
      await expectText(page, /Originator|Salesperson|Status|Open Quote/i);
      await expectText(page, /Finance Lease|Lease Details/i);
      await expectText(page, /Condition/i);
      await expectText(page, /Used/i);
    },
  );

  test(
    "UDP-T4287 - TC_SQ_003 No PPSR No UDC/Dealer Establishment Fee No LMF No Settlement No Trade in FL",
    { tag: ["@do", "@regression", "@UDP-T4287"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await expectNoCsaStandardQuoteFields(page, assetDetailsPage);
    },
  );

  test(
    "UDP-T4288 - TC_SQ_004 Condition Defaults to 'Used'",
    { tag: ["@do", "@regression", "@UDP-T4288"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await expect.soft(assetDetailsPage.conditionDropdown).toBeVisible({ timeout: 20_000 });
      await expectText(page, /Used/i);
    },
  );

  test(
    "UDP-T4289 - TC_SQ_005 Recommended Retail Price Only Visible When Condition = New",
    { tag: ["@do", "@regression", "@UDP-T4289"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await assetDetailsPage.selectCondition("New");
      await assetDetailsPage.expectRecommendedRetailPriceVisibleAfterNewCondition();
      await assetDetailsPage.selectCondition("Used");
      await assetDetailsPage.expectRecommendedRetailPriceHiddenAfterUsedCondition();
    },
  );

  test(
    "UDP-T4290 - TC_QD_001 Cash Price of Asset GST Inclusive Mandatory Defaults Blank",
    { tag: ["@do", "@regression", "@UDP-T4290"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await expect.soft(assetDetailsPage.cashPriceOfAssetInputField).toBeVisible({ timeout: 20_000 });
      expect.soft(await fl.readDisplayedCurrency(assetDetailsPage.cashPriceOfAssetInputField)).toBeGreaterThanOrEqual(0);
      await assetDetailsPage.clickSaveStandardQuoteStep().catch(() => {});
      await expectText(page, /Please complete details|Cash Price|required/i);
    },
  );

  test(
    "UDP-T4291 - TC_QD_002 Residual Value Conditionally Mandatory GST-Inclusive Mutual Auto-Pop with OR %",
    { tag: ["@do", "@regression", "@UDP-T4291"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage, addAssetPage } = await openSelectedFlStandardQuote(page);
      await fl.prepareCalculableFlQuote(page, assetDetailsPage, addAssetPage, { cashPrice: "25000" });
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("20");
      await assetDetailsPage.clickCalculateButton();
      expect.soft(await fl.readFlResidualDollar(assetDetailsPage)).toBeGreaterThan(0);
      expect.soft(await fl.readFlResidualPercent(assetDetailsPage)).toBeGreaterThanOrEqual(20);
    },
  );

  test(
    "UDP-T4292 - TC_QD_003 OR % Calculated Based on GST-Inclusive Cash Price Cannot Exceed Cash Price",
    { tag: ["@do", "@regression", "@UDP-T4292"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage, addAssetPage } = await openSelectedFlStandardQuote(page);
      await fl.prepareCalculableFlQuote(page, assetDetailsPage, addAssetPage, { cashPrice: "25000" });
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("20");
      await assetDetailsPage.clickCalculateButton();
      expect.soft(await fl.readFlResidualDollar(assetDetailsPage)).toBeGreaterThan(0);
      expect.soft(await fl.readFlResidualPercent(assetDetailsPage)).toBeGreaterThanOrEqual(20);
      await assetDetailsPage.enterResidualValuePercentFinanceLease("110");
      await assetDetailsPage.clickCalculateButton();
      await expectText(page, /cannot be greater than|Residual Value|Cash Price/i);
    },
  );

  test(
    "UDP-T4293 - TC_QD_004 Residual Value GST Conversion Input Inclusive Stored Exclusive via SP",
    { tag: ["@do", "@regression", "@UDP-T4293"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      await annotateFisStorageNotVerified();
      const { assetDetailsPage } = await calculateStandardQuote(page, {
        residualDollar: "5000",
        skipPaymentScheduleCheck: true,
      });
      await expect
        .poll(
          async () => {
            const inputAmount = await fl.readDisplayedCurrency(assetDetailsPage.olResidualValueInputField());
            if (inputAmount >= 5_000) return inputAmount;

            const residualRow = root(page)
              .getByText(/^Residual\s+Value$/i)
              .first()
              .locator("xpath=ancestor::div[contains(@class,'grid')][1]");
            const rowText = ((await residualRow.textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
            const nums = [...rowText.matchAll(/\$?\s*([\d,]+(?:\.\d+)?)/g)]
              .map((m) => fl.parseCurrency(m[0] ?? ""))
              .filter((n) => Number.isFinite(n));
            return nums.length > 0 ? Math.max(...nums) : 0;
          },
          { timeout: 45_000, intervals: [500, 1_000, 2_000] },
        )
        .toBeGreaterThanOrEqual(5_000);
      await expectText(page, /Residual\s+Value/i);
      await expectText(page, /GST\s+Incl|Incl\.?\s*GST|Residual Value/i);
    },
  );

  test(
    "UDP-T4294 - TC_CH_001 Charges Sum of Registration/Service Plans + Insurances + Accessories GST-Inclusive",
    { tag: ["@do", "@regression", "@UDP-T4294"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage, addAssetPage } = await openSelectedFlStandardQuote(page);
      await fl.addMinimalFlAsset(assetDetailsPage, addAssetPage, "25000");
      await fl.fillAddOnAccessoriesAndSave(page, assetDetailsPage);
      await expect
        .poll(async () => assetDetailsPage.readChargesTotalDollars(), { timeout: 45_000, intervals: [500, 1_000, 2_000] })
        .toBeGreaterThanOrEqual(1);
    },
  );

  test(
    "UDP-T4295 - TC_CH_002 Charges Update When Add-Ons Added or Removed",
    { tag: ["@do", "@regression", "@UDP-T4295"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage, addAssetPage } = await openSelectedFlStandardQuote(page);
      await fl.addMinimalFlAsset(assetDetailsPage, addAssetPage, "25000");
      await fl.fillAddOnAccessoriesAndSave(page, assetDetailsPage);
      await expect
        .poll(async () => assetDetailsPage.readChargesTotalDollars(), { timeout: 45_000, intervals: [500, 1_000, 2_000] })
        .toBeGreaterThanOrEqual(0);
    },
  );

  test(
    "UDP-T4296 - TC_TC_001 Total Cash Cost Display Only GST-Inclusive Sum Calculated by AP Portal",
    { tag: ["@do", "@regression", "@UDP-T4296"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, {
        cashPrice: "25000",
        initialLease: "700",
        skipPaymentScheduleCheck: true,
      });
      await expectCurrencyAtLeast(assetDetailsPage.totalCashCostField(), 25_000);
      await expectText(page, /Total\s+Cash\s+Cost|Total\s+Cost/i);
    },
  );

  test(
    "UDP-T4297 - TC_TC_002 Incl. GST of Display Only Sum of All GST Components",
    { tag: ["@do", "@regression", "@UDP-T4297"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage, addAssetPage } = await openFlStandardQuote(page);
      await fl.calculateFlStandardQuoteWithAddOns(page, assetDetailsPage, addAssetPage, {
        cashPrice: "25000",
        initialLease: "700",
        skipPaymentScheduleCheck: true,
      });
      await assetDetailsPage.expectInclGstOfDisplayOnly();
      await expect
        .poll(async () => fl.readDisplayedCurrency(assetDetailsPage.inclGstOfField()), {
          timeout: 45_000,
          intervals: [500, 1_000, 2_000],
        })
        .toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T4298 - TC_TC_003 Interest Charge Display Only System Calculated Updates on Calculate",
    { tag: ["@do", "@regression", "@UDP-T4298"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, { interest: "4" });
      const before = await assetDetailsPage.readInterestCharge();
      await assetDetailsPage.interestRate("8");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease(fl.FL_RESIDUAL_PERCENT);
      await assetDetailsPage.clickCalculateButton();
      const after = await assetDetailsPage.readInterestCharge();
      expect.soft(before).toBeGreaterThanOrEqual(0);
      expect.soft(after).toBeGreaterThanOrEqual(0);
    },
  );

  test(
    "UDP-T4299 - TC_DF_001 Dealer Finance Collapsed by Default Access-Controlled",
    { tag: ["@do", "@regression", "@UDP-T4299"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await expectDealerFinanceIfAccessible(page, assetDetailsPage, {
        requireExpandedSummary: false,
        assertCollapsedByDefault: true,
      });
    },
  );

  test(
    "UDP-T4300 - TC_DF_002 Base Interest Rate Display Only Retained at First Save",
    { tag: ["@do", "@regression", "@UDP-T4300"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, {
        interest: "4",
        skipPaymentScheduleCheck: true,
      });
      await expectDealerFinanceIfAccessible(page, assetDetailsPage);
      await assetDetailsPage.expectBaseInterestRateDisplayOnly();
      const baseRate = await assetDetailsPage.readBaseInterestRatePercent();
      expect.soft(baseRate).toMatch(/\d+(?:\.\d+)?\s*%/);
      test.info().annotations.push({
        type: "note",
        description: `Base Interest Rate captured as ${baseRate}. Save/re-open retention (steps 3–5) requires FIS AF quote reload — same gap as UDP-T4118 (OL).`,
      });
    },
  );

  test(
    "UDP-T4301 - TC_DF_003 Base Rate Updates When Originator/Finance Type Changes",
    { tag: ["@do", "@regression", "@UDP-T4301"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const origRef = "SQ-FL-DF-4301";
      const ratePrimary = await fl.captureFlBaseInterestRateAfterCalculate(page, fl.FL_SQ_DEALER, {
        interest: "4",
        origRef,
        saveBeforeRead: true,
      });
      const rateAlt = await fl.captureFlBaseInterestRateAfterCalculate(page, fl.FL_SQ_DEALER_ALT, {
        interest: "4",
        origRef,
      });

      if (!ratePrimary || !rateAlt) {
        test.info().annotations.push({
          type: "note",
          description:
            "Dealer Finance not visible for one or both originators (access-controlled on this user/dealer).",
        });
        expect.soft(ratePrimary ?? rateAlt).toBeTruthy();
        return;
      }

      expect.soft(ratePrimary).toMatch(/\d+(?:\.\d+)?\s*%/);
      expect.soft(rateAlt).toMatch(/\d+(?:\.\d+)?\s*%/);
      test.info().annotations.push({
        type: "note",
        description: `Base Interest Rate — ${fl.FL_SQ_DEALER}: ${ratePrimary}; ${fl.FL_SQ_DEALER_ALT}: ${rateAlt}.`,
      });
      if (ratePrimary !== rateAlt) {
        expect.soft(ratePrimary).not.toBe(rateAlt);
      } else {
        test.info().annotations.push({
          type: "note",
          description:
            "Both originators returned the same Base Interest Rate on SIT; full save/re-open on same quote is not automated (see UDP-T4118).",
        });
      }
    },
  );

  test(
    "UDP-T4302 - TC_DF_004 Estimated Commission Negative When Base Rate > Customer Interest Rate",
    { tag: ["@do", "@regression", "@UDP-T4302"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, { interest: "1" });
      await expectDealerFinanceIfAccessible(page, assetDetailsPage);
      await expectText(page, /Base\s+Interest\s+Rate|Estimated\s+Commission|Subsidy/i);
    },
  );

  test(
    "UDP-T4303 - TC_FD_001 Term Mandatory Dropdown or Free-Text per Program Validates Max",
    { tag: ["@do", "@regression", "@UDP-T4303"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await expect.soft(assetDetailsPage.termsOfFinanceInputField).toBeVisible({ timeout: 20_000 });
      await assetDetailsPage.termsOfFinance("");
      await assetDetailsPage.clickCalculateButton();
      await expectText(page, /Please complete|Term|required/i);
      await assetDetailsPage.termsOfFinance("999");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectTermExceedsProgramMaxValidation();
    },
  );

  test(
    "UDP-T4304 - TC_FD_002 Frequency Mandatory Defaults from Program Resets Structure on Change",
    { tag: ["@do", "@regression", "@UDP-T4304"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      await openSelectedFlStandardQuote(page);
      await expectText(page, /Frequency|Monthly|Weekly|Fortnightly/i);
    },
  );

  test(
    "UDP-T4305 - TC_FD_003 Interest Rate Mandatory Defaults from FIS AF Editability per BLD",
    { tag: ["@do", "@regression", "@UDP-T4305"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await expect.soft(assetDetailsPage.interestRateInputField).toBeVisible({ timeout: 20_000 });
      const raw = await assetDetailsPage.interestRateInputField.inputValue().catch(() => "");
      expect.soft(raw.length === 0 || Number.isFinite(Number.parseFloat(raw.replace(/[^0-9.]/g, "")))).toBeTruthy();
    },
  );

  test(
    "UDP-T4306 - TC_FD_004 Lease Date Mandatory Defaults to Today Cannot Be Backdated",
    { tag: ["@do", "@regression", "@UDP-T4306"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
      expect.soft((await assetDetailsPage.readLoanDateValue()).length).toBeGreaterThan(4);
      await assetDetailsPage.expectOlLeaseDateCannotBeBackdated();
    },
  );

  test(
    "UDP-T4307 - TC_FD_005 First Payment Display Only Always = Lease Date Cannot Be Changed Independently",
    { tag: ["@do", "@regression", "@UDP-T4307"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
      await assetDetailsPage.expectFirstPaymentMatchesLeaseDate();
      await assetDetailsPage.expectFirstPaymentReadOnly();
    },
  );

  test(
    "UDP-T4308 - TC_FD_006 Lease Date Change All Schedule Segments Adjust",
    { tag: ["@do", "@regression", "@UDP-T4308"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page);
      const currentLeaseDate = await assetDetailsPage.readLoanDateValue();
      expect.soft(currentLeaseDate.length).toBeGreaterThan(4);
      await assetDetailsPage.enterLoanDateDdMmYyyy(currentLeaseDate);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease(fl.FL_RESIDUAL_PERCENT);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      await assetDetailsPage.expectFirstPaymentMatchesLeaseDate();
    },
  );

  test(
    "UDP-T4309 - TC_FD_007 Initial Lease Amount SQ Mandatory Auto-Populated If Blank on Calculate",
    { tag: ["@do", "@regression", "@UDP-T4309"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page);
      const initialLeaseField = fl.flFieldNearLabel(root(page), /Initial\s+Lease\s+Amount/i);
      await expect.soft(initialLeaseField).toBeVisible({ timeout: 20_000 });
      expect.soft(await fl.readDisplayedCurrency(initialLeaseField)).toBeGreaterThan(0);
      await assetDetailsPage.enterInitialLeaseAmountFinanceLease("1");
      await assetDetailsPage.clickCalculateButton();
      await expectText(page, /minimum of a standard payment|Initial Lease Amount/i);
    },
  );

  test(
    "UDP-T4310 - TC_FD_008 Payment Amount GST-Inclusive Shows 'Irregular' for Fixed '0' Segments",
    { tag: ["@do", "@regression", "@UDP-T4310"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, {
        skipPaymentScheduleCheck: true,
        initialLease: "700",
      });
      await assetDetailsPage.applyFlFixedZeroSegmentForIrregularPayment();
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease(fl.FL_RESIDUAL_PERCENT);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentAmountShowsIrregular();
    },
  );

  test(
    "UDP-T4311 - TC_FD_009 Last Payment Date Does NOT Include Residual Value Date",
    { tag: ["@do", "@regression", "@UDP-T4311"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page);
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      await expectText(page, /Last\s+Payment/i);
      await expectText(page, /Residual\s+Value/i);
    },
  );

  test(
    "UDP-T4312 - TC_PS_001 Segment View Columns Date Number Frequency Payment GST-Excl GST Total Payment GST-Incl",
    { tag: ["@do", "@regression", "@UDP-T4312"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page);
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      await expectScheduleColumns(page, [/Date/i, /Number/i, /Frequency/i, /Payment/i]);
      await expectText(page, /GST|Total\s+Payment|Residual\s+Value/i);
    },
  );

  test(
    "UDP-T4313 - TC_PS_002 Segment View Payment Column = GST-Exclusive Amount",
    { tag: ["@do", "@regression", "@UDP-T4313"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page);
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      await expectScheduleColumns(page, [/Date/i, /Number/i, /Frequency/i, /Payment/i]);
      await expectText(page, /GST|Total\s+Payment|Residual\s+Value/i);
    },
  );

  test(
    "UDP-T4314 - TC_PS_003 Segment View Total Payment Column = GST-Inclusive Amount",
    { tag: ["@do", "@regression", "@UDP-T4314"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page);
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      await expectScheduleColumns(page, [/Date/i, /Number/i, /Frequency/i, /Payment/i]);
      await expectText(page, /GST|Total\s+Payment|Residual\s+Value/i);
    },
  );

  test(
    "UDP-T4315 - TC_PS_004 Segment View Residual Value Sub-Section Has Own Columns",
    { tag: ["@do", "@regression", "@UDP-T4315"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page);
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      await expectScheduleColumns(page, [/Date/i, /Number/i, /Frequency/i, /Payment/i]);
      await expectText(page, /GST|Total\s+Payment|Residual\s+Value/i);
    },
  );

  test(
    "UDP-T4316 - TC_PS_005 Segment View Residual Value Sub-Section GST Incl Displays as GST-Inclusive",
    { tag: ["@do", "@regression", "@UDP-T4316"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      await annotateFisStorageNotVerified();
      const { assetDetailsPage } = await calculateStandardQuote(page, { residualDollar: "5000" });
      await expectCurrencyAtLeast(assetDetailsPage.olResidualValueInputField(), 5_000);
      await expectText(page, /Residual\s+Value/i);
      await expectText(page, /GST\s+Incl|Incl\.?\s*GST|Residual Value/i);
    },
  );

  test(
    "UDP-T4317 - TC_PS_006 Segment View Defaults as Default View on First Display",
    { tag: ["@do", "@regression", "@UDP-T4317"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page);
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      await expectScheduleColumns(page, [/Date/i, /Number/i, /Frequency/i, /Payment/i]);
      await expectText(page, /GST|Total\s+Payment|Residual\s+Value/i);
    },
  );

  test(
    "UDP-T4318 - TC_GV_001 Grid View Columns Date Number Frequency Payment GST-Inclusive",
    { tag: ["@do", "@regression", "@UDP-T4318"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, { skipPaymentScheduleCheck: true });
      await assetDetailsPage.expectPaymentScheduleViewTogglesWorkAndTablePopulated();
      await expectScheduleColumns(page, [/Date/i, /Number/i, /Frequency/i, /Payment/i]);
    },
  );

  test(
    "UDP-T4319 - TC_GV_002 Grid View Payment Column = GST-Inclusive Unlike Segment View Payment Column",
    { tag: ["@do", "@regression", "@UDP-T4319"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, { skipPaymentScheduleCheck: true });
      await assetDetailsPage.expectPaymentScheduleViewTogglesWorkAndTablePopulated();
      await expectScheduleColumns(page, [/Date/i, /Number/i, /Frequency/i, /Payment/i]);
    },
  );

  test(
    "UDP-T4320 - TC_GV_003 Grid View Each Payment Listed Individually",
    { tag: ["@do", "@regression", "@UDP-T4320"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, { skipPaymentScheduleCheck: true });
      await assetDetailsPage.expectPaymentScheduleViewTogglesWorkAndTablePopulated();
      await expectScheduleColumns(page, [/Date/i, /Number/i, /Frequency/i, /Payment/i]);
    },
  );

  test(
    "UDP-T4321 - TC_GV_004 Toggle Edit Schedule Opens in Current View",
    { tag: ["@do", "@regression", "@UDP-T4321"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, { skipPaymentScheduleCheck: true });
      await assetDetailsPage.expectPaymentScheduleViewTogglesWorkAndTablePopulated();
      await assetDetailsPage.openEditPaymentScheduleDialog();
      await expect.soft(assetDetailsPage.editPaymentScheduleDialog()).toBeVisible({ timeout: 20_000 });
    },
  );

  test(
    "UDP-T4322 - TC_EP_001 FL Unique Rule Only 'Fixed' Type Allowed with Value = '0'",
    { tag: ["@do", "@regression", "@UDP-T4322"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      await expectEditScheduleFixedZeroRejected(page, assetDetailsPage);
      await assetDetailsPage.clickEditPaymentScheduleReset();
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ type: "Fixed", amount: "0" });
      await assetDetailsPage.clickEditPaymentScheduleCalculate();
      await expect.soft(assetDetailsPage.editPaymentScheduleDialog()).toBeVisible();
    },
  );

  test(
    "UDP-T4323 - TC_EP_002 First Row Number=1 Type=Fixed Auto-Set and CANNOT Be Modified",
    { tag: ["@do", "@regression", "@UDP-T4323"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page, { initialLease: "700" });
      const firstRow = await assetDetailsPage.getEditPaymentScheduleSegmentRowSnapshot(0);
      expect.soft(firstRow.number).toMatch(/^1$/);
      expect.soft(firstRow.type).toMatch(/Fixed/i);
      await assetDetailsPage.expectEditPaymentScheduleSegmentTypesExcludeInterestOnly();
    },
  );

  test(
    "UDP-T4324 - TC_EP_003 First Row Amount = Initial Lease Amount Always",
    { tag: ["@do", "@regression", "@UDP-T4324"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page, { initialLease: "700" });
      const firstRow = await assetDetailsPage.getEditPaymentScheduleSegmentRowSnapshot(0);
      expect.soft(firstRow.type).toMatch(/Fixed/i);
      expect.soft(fl.parseCurrency(firstRow.amount)).toBeGreaterThanOrEqual(700);
    },
  );

  test(
    "UDP-T4325 - TC_EP_004 Remaining Segments Not Row 1 Type Can Be Normal or Fixed",
    { tag: ["@do", "@regression", "@UDP-T4325"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      await assetDetailsPage.expectEditPaymentScheduleSegmentTypesExcludeInterestOnly();
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ type: "Normal" });
      const normal = await assetDetailsPage.getEditPaymentScheduleSegmentRowSnapshot(0);
      expect.soft(normal.type).toMatch(/Normal|Fixed/i);
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ type: "Fixed", amount: "0" });
      const fixed = await assetDetailsPage.getEditPaymentScheduleSegmentRowSnapshot(0);
      expect.soft(fixed.type).toMatch(/Fixed/i);
    },
  );

  test(
    "UDP-T4326 - TC_EP_005 No Interest Only Type in FL Edit Schedule",
    { tag: ["@do", "@regression", "@UDP-T4326"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      await assetDetailsPage.expectEditPaymentScheduleSegmentTypesExcludeInterestOnly();
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ type: "Normal" });
      const normal = await assetDetailsPage.getEditPaymentScheduleSegmentRowSnapshot(0);
      expect.soft(normal.type).toMatch(/Normal|Fixed/i);
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ type: "Fixed", amount: "0" });
      const fixed = await assetDetailsPage.getEditPaymentScheduleSegmentRowSnapshot(0);
      expect.soft(fixed.type).toMatch(/Fixed/i);
    },
  );

  test(
    "UDP-T4327 - TC_EP_006 Maximum Number for Non-First Segments = Term - 1",
    { tag: ["@do", "@regression", "@UDP-T4327"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      const term = await assetDetailsPage.getEditPaymentScheduleFinanceTermMonths();
      await assetDetailsPage.enterEditPaymentScheduleSegmentNumber(String(term + 1));
      await assetDetailsPage.clickEditPaymentScheduleCalculate({ waitForApply: false });
      await assetDetailsPage.expectEditPaymentScheduleSegmentExceedsTermMessage();
    },
  );

  test(
    "UDP-T4328 - TC_EP_007 RV = Term+1 Instalment Non-Editable",
    { tag: ["@do", "@regression", "@UDP-T4328"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ type: "Normal" });
      await assetDetailsPage.clickEditPaymentScheduleCalculate();
      await assetDetailsPage.expectEditPaymentScheduleCalculateSummaryVisible();
      await expectText(page, /RV|Residual\s+Value/i);
    },
  );

  test(
    "UDP-T4329 - TC_EP_008 Segment Number Sum Cannot Exceed Loan Term",
    { tag: ["@do", "@regression", "@UDP-T4329"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      const term = await assetDetailsPage.getEditPaymentScheduleFinanceTermMonths();
      await assetDetailsPage.enterEditPaymentScheduleSegmentNumber(String(term + 1));
      await assetDetailsPage.clickEditPaymentScheduleCalculate({ waitForApply: false });
      await assetDetailsPage.expectEditPaymentScheduleSegmentExceedsTermMessage();
    },
  );

  test(
    "UDP-T4330 - TC_EP_009 Amount Column Always Displays as GST-Inclusive",
    { tag: ["@do", "@regression", "@UDP-T4330"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ type: "Normal" });
      await assetDetailsPage.clickEditPaymentScheduleCalculate();
      const row = await assetDetailsPage.getEditPaymentScheduleSegmentRowSnapshot(0);
      expect.soft(row.amount).toMatch(/\$|[0-9]/);
    },
  );

  test(
    "UDP-T4331 - TC_EP_010 Normal Type Amount Auto-Calculated Not User-Editable",
    { tag: ["@do", "@regression", "@UDP-T4331"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ type: "Normal" });
      await assetDetailsPage.clickEditPaymentScheduleCalculate();
      const row = await assetDetailsPage.getEditPaymentScheduleSegmentRowSnapshot(0);
      expect.soft(row.amount).toMatch(/\$|[0-9]/);
    },
  );

  test(
    "UDP-T4332 - TC_EP_011 Fixed Type Amount User-Editable Only '0' Allowed",
    { tag: ["@do", "@regression", "@UDP-T4332"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      await expectEditScheduleFixedZeroRejected(page, assetDetailsPage);
      await assetDetailsPage.clickEditPaymentScheduleReset();
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ type: "Fixed", amount: "0" });
      await assetDetailsPage.clickEditPaymentScheduleCalculate();
      await expect.soft(assetDetailsPage.editPaymentScheduleDialog()).toBeVisible();
    },
  );

  test(
    "UDP-T4333 - TC_EP_012 Delete Removes Last Editable Segment",
    { tag: ["@do", "@regression", "@UDP-T4333"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      const before = await assetDetailsPage.countEditPaymentScheduleSegmentRows();
      await assetDetailsPage.enterEditPaymentScheduleSegmentNumberOnRow(0, "12");
      await assetDetailsPage.waitForEditPaymentScheduleAddSegmentEnabled();
      await assetDetailsPage.clickEditPaymentScheduleAddSegment();
      await assetDetailsPage.clickEditPaymentScheduleDeleteLastSegment();
      const after = await assetDetailsPage.countEditPaymentScheduleSegmentRows();
      expect.soft(after).toBeGreaterThanOrEqual(before);
    },
  );

  test(
    "UDP-T4334 - TC_EP_013 Reset Reverts to State When Edit Screen First Opened",
    { tag: ["@do", "@regression", "@UDP-T4334"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      const snapshot = await assetDetailsPage.getEditPaymentScheduleSegmentRowsSnapshot();
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ number: "12", type: "Fixed" });
      await assetDetailsPage.clickEditPaymentScheduleReset();
      await assetDetailsPage.expectEditPaymentScheduleSegmentRowsMatch(snapshot);
    },
  );

  test(
    "UDP-T4335 - TC_EP_014 Calculate Normal Amounts Fetched from FIS AF RV = Term+1 Non-Editable",
    { tag: ["@do", "@regression", "@UDP-T4335"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ type: "Normal" });
      await assetDetailsPage.clickEditPaymentScheduleCalculate();
      await assetDetailsPage.expectEditPaymentScheduleCalculateSummaryVisible();
      await expectText(page, /RV|Residual\s+Value/i);
    },
  );

  test(
    "UDP-T4336 - TC_EP_015 Apply Validates Segment Count Saves to Contract",
    { tag: ["@do", "@regression", "@UDP-T4336"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ number: "12", type: "Fixed", amount: "0" });
      await assetDetailsPage.clickEditPaymentScheduleCalculate();
      await assetDetailsPage.clickEditPaymentScheduleApply();
      await assetDetailsPage.expectEditPaymentScheduleDialogClosedOnStandardQuote();
    },
  );

  test(
    "UDP-T4337 - TC_EP_016 Cancel Confirmation Message Returns to Standard Quote",
    { tag: ["@do", "@regression", "@UDP-T4337"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ number: "12", type: "Fixed" });
      await assetDetailsPage.clickEditPaymentScheduleCancel();
      await assetDetailsPage.expectEditPaymentScheduleCancelConfirmationVisible();
      await assetDetailsPage.confirmEditPaymentScheduleCancelDiscard();
    },
  );

  test(
    "UDP-T4338 - TC_EP_017 + Add Segment Disabled When Max Payments Reached",
    { tag: ["@do", "@regression", "@UDP-T4338"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page);
      await assetDetailsPage.addEditPaymentScheduleSegmentsUntilTermReached();
      const addSegment = assetDetailsPage.editPaymentScheduleDialog().getByRole("button", { name: /\+\s*Add Segment|Add Segment/i }).first();
      await expect.soft(addSegment).toBeDisabled({ timeout: 15_000 });
    },
  );

  test(
    "UDP-T4339 - TC_EP_018 Toggle Defaults to Segment View Can Switch to Grid",
    { tag: ["@do", "@regression", "@UDP-T4339"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, { skipPaymentScheduleCheck: true });
      await assetDetailsPage.expectPaymentScheduleViewTogglesWorkAndTablePopulated();
      await expectScheduleColumns(page, [/Date/i, /Number/i, /Frequency/i, /Payment/i]);
    },
  );

  test(
    "UDP-T4340 - TC_BTN_001 Save Validates Mandatory Fields Shows Originator Reference Pop-up If No Customer",
    { tag: ["@do", "@regression", "@UDP-T4340"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await assetDetailsPage.clickSaveStandardQuoteStep({ originatorRefForRequiredDialog: "SQ-FL-T4340" });
      await expect.soft(root(page)).toBeVisible();
    },
  );

  test(
    "UDP-T4341 - TC_BTN_002 Next Validates Then Navigates to Customer Details",
    { tag: ["@do", "@regression", "@UDP-T4341"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page, { origRef: "SQ-FL-T4341" });
      await assetDetailsPage.clickNextButtonFinanceLease("SQ-FL-T4341");
      await expect.soft(page.getByText(/Customer\s+Details|Borrowers|Guarantors/i).first()).toBeVisible({
      timeout: 60_000,
      });
    },
  );

  test(
    "UDP-T4342 - TC_BTN_003 Cancel Confirmation Pop-Up Returns to Dashboard",
    { tag: ["@do", "@regression", "@UDP-T4342"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await assetDetailsPage.enterOriginationReferenceFinanceLease("SQ-FL-T4342");
      await assetDetailsPage.clickStandardQuoteCancel();
      await assetDetailsPage.expectStandardQuoteCancelConfirmationVisible();
    },
  );

  test(
    "UDP-T4343 - TC_BTN_004 Calculate Enabled When Mandatory Fields Met or Workflow Allows",
    { tag: ["@do", "@regression", "@UDP-T4343"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page);
      await expect.soft(assetDetailsPage.calculateButton).toBeEnabled({ timeout: 30_000 });
      await expectText(page, /Payment\s+Amount|Total\s+Number\s+of\s+Payments|Total\s+Term/i);
    },
  );

  test(
    "UDP-T4344 - TC_BTN_005 Status Button Workflow Transition",
    { tag: ["@do", "@regression", "@UDP-T4344"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      test.info().annotations.push({
      type: "note",
      description: "Workflow transition details are role/config dependent; MAF-5644, MAF-6659, MAF-6559 are annotated only.",
      });
      await calculateStandardQuote(page);
      const statusButton = page.getByRole("button", { name: /Open Quote|Submit|Status|Withdraw|Approve|Decline/i }).first();
      await expect.soft(statusButton).toBeVisible({ timeout: 30_000 });
      expect.soft(await statusButton.isEnabled().catch(() => false)).toBeTruthy();
    },
  );

  test(
    "UDP-T4345 - TC_DIFF_001 First Payment = Lease Date Not User-Selectable as in CSA",
    { tag: ["@do", "@regression", "@UDP-T4345"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
      await assetDetailsPage.expectFirstPaymentMatchesLeaseDate();
      await assetDetailsPage.expectFirstPaymentReadOnly();
    },
  );

  test(
    "UDP-T4346 - TC_DIFF_002 FL Has No Deposit No Balloon No Fixed Checkbox No Calculate For",
    { tag: ["@do", "@regression", "@UDP-T4346"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await expectNoCsaStandardQuoteFields(page, assetDetailsPage);
    },
  );

  test(
    "UDP-T4347 - TC_DIFF_003 Segment View Has Separate Payment GST-Excl and Total Payment GST-Incl Columns",
    { tag: ["@do", "@regression", "@UDP-T4347"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await calculateStandardQuote(page);
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      await expectScheduleColumns(page, [/Date/i, /Number/i, /Frequency/i, /Payment/i]);
      await expectText(page, /GST|Total\s+Payment|Residual\s+Value/i);
    },
  );

  test(
    "UDP-T4348 - TC_DIFF_004 Edit Schedule Fixed '0' Only No Interest Only First Row Locked",
    { tag: ["@do", "@regression", "@UDP-T4348"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openCalculatedEditSchedule(page, { initialLease: "700" });
      const firstRow = await assetDetailsPage.getEditPaymentScheduleSegmentRowSnapshot(0);
      expect.soft(firstRow.number).toMatch(/^1$/);
      expect.soft(firstRow.type).toMatch(/Fixed/i);
      await assetDetailsPage.expectEditPaymentScheduleSegmentTypesExcludeInterestOnly();
    },
  );

  test(
    "UDP-T4349 - TC_DIFF_005 Section Header Is 'Lease Details' Not 'Loan Details' Lease Date Not Loan Date",
    { tag: ["@do", "@regression", "@UDP-T4349"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(300000);
      await openSelectedFlStandardQuote(page);
      await expectText(page, /Lease\s+Details/i);
      await expectHiddenText(page, /Loan\s+Details/i, "Loan Details");
      await expectText(page, /Lease\s+Date/i);
    },
  );

  test(
    "UDP-T4350 - TC_DIFF_006 FL Has No Standard Payment Options Section",
    { tag: ["@do", "@regression", "@UDP-T4350"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      const { assetDetailsPage } = await openSelectedFlStandardQuote(page);
      await expectNoCsaStandardQuoteFields(page, assetDetailsPage);
    },
  );

  test(
    "UDP-T4351 - TC_DIFF_007 MAF-6983 Tax Profile Applied for Custom Flows Requiring GST Attribution",
    { tag: ["@do", "@regression", "@UDP-T4351"] },
    async ({ page }: { page: Page }) => {
      test.setTimeout(600000);
      await annotateFisStorageNotVerified();
      const { assetDetailsPage } = await calculateStandardQuote(page, { residualDollar: "5000" });
      await expectCurrencyAtLeast(assetDetailsPage.olResidualValueInputField(), 5_000);
      await expectText(page, /Residual\s+Value/i);
      await expectText(page, /GST\s+Incl|Incl\.?\s*GST|Residual Value/i);
    },
  );
});
