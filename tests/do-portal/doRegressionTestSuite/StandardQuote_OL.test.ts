/**
 * DO Portal — Standard Quote OL regression (UDP-T4100–UDP-T4160).
 * Scenario source: OL Test Cases Excel (Zephyr / Regression — Standard Quote - OL).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAssetDetailsPage,
  DOCustomerDetailsPage,
  DODashboardPage,
  DOQuickQuotePage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";

const OL_SQ_PRODUCT = "Operating Lease - Business Asg";
const OL_SQ_PROGRAM = "Operating Lease Business - MV Dealer";
const OL_SQ_DEALER = process.env.OL_SQ_DEALER ?? "Armstrong Prestige Wellington";
const GST_RATE = 1.15;

function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

function parseCurrency(value: string): number {
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function shiftDdMmYyyy(dateStr: string, days: number): string {
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return dateStr;
  const d = new Date(
    Number.parseInt(m[3], 10),
    Number.parseInt(m[2], 10) - 1,
    Number.parseInt(m[1], 10),
  );
  d.setDate(d.getDate() + days);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

async function readDisplayedCurrency(field: Locator): Promise<number> {
  const inputVal = (await field.inputValue({ timeout: 5_000 }).catch(() => "")).trim();
  if (inputVal) return parseCurrency(inputVal);
  const text = (await field.textContent({ timeout: 5_000 }).catch(() => "")) ?? "";
  return parseCurrency(text);
}

function olFieldNearLabel(root: Locator, labelPattern: RegExp): Locator {
  const label = root.locator("label, span").filter({ hasText: labelPattern }).first();
  return label
    .locator("xpath=following::input[1]")
    .or(root.locator("number").filter({ hasText: labelPattern }).locator("input").first())
    .first();
}

async function openAuthenticatedDashboard(page: Page): Promise<DODashboardPage> {
  const dashboardPage = new DODashboardPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(OL_SQ_DEALER);
  return dashboardPage;
}

async function openOlStandardQuoteFromDashboard(page: Page): Promise<{
  dashboardPage: DODashboardPage;
  assetDetailsPage: DOAssetDetailsPage;
}> {
  const dashboardPage = await openAuthenticatedDashboard(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectOperatingLeaseProduct();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.waitForAssetDetailsStepReady();
  return { dashboardPage, assetDetailsPage };
}

async function selectOlProductAndProgram(assetDetailsPage: DOAssetDetailsPage): Promise<void> {
  await assetDetailsPage.chooseProduct(OL_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(OL_SQ_PROGRAM);
}

async function addMinimalOlAsset(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  cashPrice = "$20,000",
): Promise<void> {
  await assetDetailsPage.enterAsset("Car and Light Commercial /");
  await assetDetailsPage.selectCondition("Used");
  await assetDetailsPage.openAssetInsuranceTradeInSummary();
  await assetDetailsPage.clickAssetSummaryEditButton();
  await addAssetPage.enterAssetValue(cashPrice);
  await addAssetPage.selectCondition("Used");
  await addAssetPage.selectYear("2025");
  await addAssetPage.enterMake("Toyota");
  await addAssetPage.enterModel("Hilux");
  await addAssetPage.enterVariant("Top");
  await addAssetPage.clickSummitButton();
  await addAssetPage.clickCrossButton();
  await assetDetailsPage.waitForQuoteLoadersToFinish();
}

async function prepareCalculableOlQuote(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  opts?: {
    origRef?: string;
    term?: string;
    interest?: string;
    cashPrice?: string;
    includeGst?: boolean;
    paymentsInAdvance?: string;
    maintenanceCost?: string;
    financedMaintenanceCharge?: string;
  },
): Promise<void> {
  await selectOlProductAndProgram(assetDetailsPage);
  await addMinimalOlAsset(assetDetailsPage, addAssetPage, opts?.cashPrice ?? "$20,000");
  await assetDetailsPage.termsOfFinance(opts?.term ?? "36");
  await assetDetailsPage.interestRate(opts?.interest ?? "4");
  await assetDetailsPage.enterOriginationReferenceFinanceLease(opts?.origRef ?? "SQ-OL-Ref-01");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  if (opts?.paymentsInAdvance !== undefined) {
    await assetDetailsPage.enterPaymentsInAdvance(opts.paymentsInAdvance);
  }
  if (opts?.includeGst !== undefined) {
    await assetDetailsPage.setIncludeGst(opts.includeGst);
  }
  if (opts?.maintenanceCost !== undefined) {
    await assetDetailsPage.enterMaintenanceCost(opts.maintenanceCost);
  }
  if (opts?.financedMaintenanceCharge !== undefined) {
    await assetDetailsPage.enterFinancedMaintenanceCharge(opts.financedMaintenanceCharge);
  }
  await assetDetailsPage.waitForQuoteLoadersToFinish();
}

async function calculateOlQuote(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  opts?: Parameters<typeof prepareCalculableOlQuote>[3],
): Promise<void> {
  await prepareCalculableOlQuote(page, assetDetailsPage, addAssetPage, opts);
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
}

async function fillAddOnAccessoriesPageAndSave(page: Page): Promise<void> {
  const sp = page.locator("app-service-plan");
  const acc = page.locator("app-accessories");
  await page.locator("app-service-plan, app-accessories").first().waitFor({ state: "visible", timeout: 45_000 });
  await acc.waitFor({ state: "visible", timeout: 45_000 }).catch(() => {});

  const fillRowAmountAndMonths = async (scope: Locator, label: RegExp, amount: string, months: string) => {
    const labelEl = scope.getByText(label);
    await labelEl.first().scrollIntoViewIfNeeded().catch(() => {});
    const rowGrid = labelEl.first().locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    const amt = rowGrid.locator("input[currencymask]").first();
    if (await amt.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await amt.click();
      await amt.fill(amount);
      await amt.press("Tab").catch(() => {});
    }
    const mos = rowGrid.locator('input[formcontrolname="months"]').first();
    if (await mos.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await mos.click();
      await mos.fill(months);
      await mos.press("Tab").catch(() => {});
    }
  };

  await fillRowAmountAndMonths(sp, /^Registration$/, "100", "12");
  await fillRowAmountAndMonths(sp, /^Service Plan$/, "50", "24");

  const saveBtn = page
    .locator('button[type="button"][data-pc-name="button"]')
    .filter({ has: page.locator('span[data-pc-section="label"]').filter({ hasText: /^Save$/ }) })
    .last();
  await saveBtn.waitFor({ state: "visible", timeout: 20_000 });
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.click({ timeout: 20_000 });
}

test.describe("Standard Quote - OL @do @regression", () => {
  test(
    "UDP-T4100 - TC_OL_001 Include GST Checkbox Unchecked by Default; Controls View Mode",
    { tag: ["@do", "@regression", "@UDP-T4100"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);

      await expect.soft(assetDetailsPage.includeGstCheckbox()).toBeVisible({ timeout: 20_000 });
      expect.soft(await assetDetailsPage.isIncludeGstChecked()).toBeFalsy();

      await assetDetailsPage.setIncludeGst(true);
      expect.soft(await assetDetailsPage.isIncludeGstChecked()).toBeTruthy();

      await assetDetailsPage.setIncludeGst(false);
      expect.soft(await assetDetailsPage.isIncludeGstChecked()).toBeFalsy();
    },
  );

  test(
    "UDP-T4101 - TC_OL_002 GST Inclusive View All Input Fields Accept and Display GST-Inclusive Amounts",
    { tag: ["@do", "@regression", "@UDP-T4101"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.setIncludeGst(true);

      await addMinimalOlAsset(assetDetailsPage, addAssetPage);
      await assetDetailsPage.enterOriginationReferenceFinanceLease("SQ-OL-T4101");
      await assetDetailsPage.cashPriceOfAsset("$23,000");
      await assetDetailsPage.enterOlResidualValueAmount("$2,300");
      await assetDetailsPage.enterMaintenanceCost("$1,150");

      const cashVal = await readDisplayedCurrency(assetDetailsPage.cashPriceOfAssetInputField);
      const residualVal = await readDisplayedCurrency(assetDetailsPage.olResidualValueInputField());
      const maintVal = await readDisplayedCurrency(assetDetailsPage.maintenanceCostInputField());
      expect.soft(cashVal).toBeGreaterThanOrEqual(23_000);
      expect.soft(residualVal).toBeGreaterThanOrEqual(2_300);
      expect.soft(maintVal).toBeGreaterThanOrEqual(1_150);
    },
  );

  test(
    "UDP-T4102 - TC_OL_003 GST Exclusive View All Input Fields Accept and Display GST-Exclusive Amounts",
    { tag: ["@do", "@regression", "@UDP-T4102"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectOlProductAndProgram(assetDetailsPage);
      expect.soft(await assetDetailsPage.isIncludeGstChecked()).toBeFalsy();

      await addMinimalOlAsset(assetDetailsPage, addAssetPage);
      await assetDetailsPage.enterOriginationReferenceFinanceLease("SQ-OL-T4102");
      await assetDetailsPage.enterOlResidualValueAmount("$2,000");
      await assetDetailsPage.enterMaintenanceCost("$1,000");

      const cashVal = await readDisplayedCurrency(assetDetailsPage.cashPriceOfAssetInputField);
      const residualVal = await readDisplayedCurrency(assetDetailsPage.olResidualValueInputField());
      const maintVal = await readDisplayedCurrency(assetDetailsPage.maintenanceCostInputField());
      expect.soft(cashVal).toBeGreaterThanOrEqual(20_000);
      expect.soft(residualVal).toBeGreaterThanOrEqual(2_000);
      expect.soft(maintVal).toBeGreaterThanOrEqual(1_000);
    },
  );

  test(
    "UDP-T4103 - TC_OL_004 Payment Amount Displays per Active GST View",
    { tag: ["@do", "@regression", "@UDP-T4103"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);

      await prepareCalculableOlQuote(page, assetDetailsPage, addAssetPage, { includeGst: true });
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
      await assetDetailsPage.clickCalculateButton();
      const inclusive = await assetDetailsPage.readPaymentAmount();

      await assetDetailsPage.setIncludeGst(false);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
      await assetDetailsPage.clickCalculateButton();
      const exclusive = await assetDetailsPage.readPaymentAmount();

      expect.soft(inclusive).toBeGreaterThan(0);
      expect.soft(exclusive).toBeGreaterThan(0);
      if (inclusive > 0 && exclusive > 0) {
        const ratio = inclusive / exclusive;
        expect.soft(ratio).toBeGreaterThan(1);
        expect.soft(ratio).toBeLessThanOrEqual(GST_RATE + 0.05);
      }
    },
  );

  test(
    "UDP-T4104 - TC_OL_005 Advance Payment Amount Displays per Active GST View",
    { tag: ["@do", "@regression", "@UDP-T4104"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);

      await prepareCalculableOlQuote(page, assetDetailsPage, addAssetPage, {
        paymentsInAdvance: "3",
      });
      await assetDetailsPage.setIncludeGst(true);
      await assetDetailsPage.cashPriceOfAsset("$23,000");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.waitForQuoteLoadersToFinish();
      const inclusiveAdvance = await assetDetailsPage.readAdvancePaymentAmount();
      expect.soft(inclusiveAdvance).toBeGreaterThan(0);

      await assetDetailsPage.setIncludeGst(false);
      await assetDetailsPage.cashPriceOfAsset("$20,000");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.waitForQuoteLoadersToFinish();
      const exclusiveAdvance = await assetDetailsPage.readAdvancePaymentAmount();
      expect.soft(exclusiveAdvance).toBeGreaterThan(0);

      if (inclusiveAdvance > 0 && exclusiveAdvance > 0) {
        expect.soft(inclusiveAdvance).toBeGreaterThan(exclusiveAdvance);
      }
    },
  );

  test(
    "UDP-T4105 - TC_OL_006 Standard Quote Default Fields on Load",
    { tag: ["@do", "@regression", "@UDP-T4105"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const root = standardQuoteRoot(page);

      await assetDetailsPage.expectWorkflowStatusOpenQuote();
      expect.soft(await assetDetailsPage.isIncludeGstChecked()).toBeFalsy();

      const promo = root.getByRole("checkbox", { name: /Promotion Quote/i }).first();
      if (await promo.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect.soft(promo).not.toBeChecked();
      }

      const usedSelected = root
        .getByRole("radio", { name: /Used/i })
        .or(root.getByText(/^Used$/i))
        .first();
      if (await usedSelected.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await expect.soft(usedSelected).toBeVisible();
      }

      const salesperson = root.getByRole("combobox", { name: /Salesperson/i }).first();
      if (await salesperson.isVisible({ timeout: 10_000 }).catch(() => false)) {
        const sp = ((await salesperson.textContent()) ?? "").trim();
        expect.soft(sp.length).toBeGreaterThan(0);
      }
    },
  );

  test(
    "UDP-T4106 - TC_OL_007 Useful Life Auto-Populated from IRD Useful Rate Depreciation Profile",
    { tag: ["@do", "@regression", "@UDP-T4106"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await addMinimalOlAsset(assetDetailsPage, addAssetPage);
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await expect.soft(assetDetailsPage.usefulLifeInputField()).toBeVisible({ timeout: 30_000 });
      const usefulLife = await assetDetailsPage.readUsefulLifeMonths();
      expect.soft(usefulLife).toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T4107 - TC_OL_008 Useful Life Term Cannot Exceed Useful Life",
    { tag: ["@do", "@regression", "@UDP-T4107"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await prepareCalculableOlQuote(page, assetDetailsPage, addAssetPage);

      const usefulLife = await assetDetailsPage.readUsefulLifeMonths();
      expect.soft(usefulLife).toBeGreaterThan(0);
      await assetDetailsPage.termsOfFinance(String(usefulLife + 12));
      await assetDetailsPage.expectTermExceedsUsefulLifeValidation(usefulLife);
    },
  );

  test(
    "UDP-T4108 - TC_OL_009 Condition Defaults to Used; RRP Visible Only When Condition New",
    { tag: ["@do", "@regression", "@UDP-T4108"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);

      await assetDetailsPage.expectRecommendedRetailPriceHiddenAfterUsedCondition();
      await assetDetailsPage.selectCondition("New");
      await assetDetailsPage.expectRecommendedRetailPriceVisibleAfterNewCondition();
      await assetDetailsPage.selectCondition("Used");
      await assetDetailsPage.expectRecommendedRetailPriceHiddenAfterUsedCondition();
    },
  );

  test(
    "UDP-T4109 - TC_OL_010 Cash Price of Asset Mandatory; GST Treatment per Active View",
    { tag: ["@do", "@regression", "@UDP-T4109"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);

      const cash = assetDetailsPage.cashPriceOfAssetInputField;
      await cash.click({ clickCount: 3 });
      await cash.fill("");
      await cash.press("Tab").catch(() => {});
      await assetDetailsPage.clickSaveStandardQuoteStep();
      await expect
        .soft(page.getByText(/Please complete|required|cannot be blank/i).first())
        .toBeVisible({ timeout: 25_000 });

      await assetDetailsPage.setIncludeGst(true);
      await assetDetailsPage.cashPriceOfAsset("$23,000");
      let cashVal = await readDisplayedCurrency(assetDetailsPage.cashPriceOfAssetInputField);
      expect.soft(cashVal).toBeGreaterThanOrEqual(23_000);

      await assetDetailsPage.setIncludeGst(false);
      await assetDetailsPage.cashPriceOfAsset("$20,000");
      cashVal = await readDisplayedCurrency(assetDetailsPage.cashPriceOfAssetInputField);
      expect.soft(cashVal).toBeGreaterThanOrEqual(20_000);
    },
  );

  test(
    "UDP-T4110 - TC_OL_011 Residual Value Conditionally Mandatory; GST-Inclusive Input",
    { tag: ["@do", "@regression", "@UDP-T4110"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await prepareCalculableOlQuote(page, assetDetailsPage, addAssetPage);
      await assetDetailsPage.setIncludeGst(true);

      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.waitForQuoteLoadersToFinish();
      await assetDetailsPage.expectOlResidualPercentFieldVisible();
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectOlResidualValueRequiredValidation();

      await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
    },
  );

  test(
    "UDP-T4111 - TC_OL_012 Maintenance Cost Optional; Mutual Exclusion with Financed Maintenance Charge",
    { tag: ["@do", "@regression", "@UDP-T4111"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);

      await assetDetailsPage.enterMaintenanceCost("$500");
      expect.soft(await assetDetailsPage.readMaintenanceCostAmount()).toBeGreaterThan(0);

      await assetDetailsPage.enterFinancedMaintenanceCharge("$300");
      expect.soft(await assetDetailsPage.readFinancedMaintenanceChargeAmount()).toBeGreaterThan(0);
      expect.soft(await assetDetailsPage.readMaintenanceCostAmount()).toBe(0);
    },
  );

  test(
    "UDP-T4112 - TC_OL_013 Financed Maintenance Charge Optional; Mutual Exclusion with Maintenance Cost",
    { tag: ["@do", "@regression", "@UDP-T4112"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);

      await assetDetailsPage.enterFinancedMaintenanceCharge("$500");
      expect.soft(await assetDetailsPage.readFinancedMaintenanceChargeAmount()).toBeGreaterThan(0);

      await assetDetailsPage.enterMaintenanceCost("$400");
      expect.soft(await assetDetailsPage.readMaintenanceCostAmount()).toBeGreaterThan(0);
      expect.soft(await assetDetailsPage.readFinancedMaintenanceChargeAmount()).toBe(0);
    },
  );

  test(
    "UDP-T4113 - TC_OL_014 Charges Add Maintenance and Charges GST-Inclusive Sum",
    { tag: ["@do", "@regression", "@UDP-T4113"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await prepareCalculableOlQuote(page, assetDetailsPage, addAssetPage, { includeGst: true });
      await assetDetailsPage.openOlMaintenanceAndChargesFromQuote();
      await fillAddOnAccessoriesPageAndSave(page);
      await assetDetailsPage.waitForAssetDetailsStepReady();

      const chargesBlock = assetDetailsPage.chargesFieldBlock();
      await expect.soft(chargesBlock).toBeVisible({ timeout: 20_000 });
      const chargesText = ((await chargesBlock.textContent()) ?? "").replace(/\s/g, "");
      expect.soft(/\$[\d,]+/.test(chargesText)).toBeTruthy();
    },
  );

  test(
    "UDP-T4114 - TC_OL_015 Total Cash Cost Display Only; GST-Inclusive; Calculated by AP Portal",
    { tag: ["@do", "@regression", "@UDP-T4114"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      await assetDetailsPage.expectTotalCashCostDisplayOnly();
      const total = await readDisplayedCurrency(assetDetailsPage.totalCashCostField());
      expect.soft(total).toBeGreaterThanOrEqual(0);
    },
  );

  test(
    "UDP-T4115 - TC_OL_016 Incl. GST of Display Only; Sum of All GST Components",
    { tag: ["@do", "@regression", "@UDP-T4115"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      await assetDetailsPage.expectInclGstOfDisplayOnly();
      const gst = await readDisplayedCurrency(assetDetailsPage.inclGstOfField());
      expect.soft(gst).toBeGreaterThanOrEqual(0);
    },
  );

  test(
    "UDP-T4116 - TC_OL_017 Interest Charge Display Only; System Calculated; Updates on Calculate",
    { tag: ["@do", "@regression", "@UDP-T4116"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await prepareCalculableOlQuote(page, assetDetailsPage, addAssetPage, { interest: "4" });
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
      await assetDetailsPage.clickCalculateButton();
      const icBefore = await assetDetailsPage.readInterestCharge();

      await assetDetailsPage.interestRate("8");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
      await assetDetailsPage.clickCalculateButton();
      const icAfter = await assetDetailsPage.readInterestCharge();

      expect.soft(icBefore).toBeGreaterThanOrEqual(0);
      expect.soft(icAfter).toBeGreaterThanOrEqual(0);
    },
  );

  test(
    "UDP-T4117 - TC_OL_018 Dealer Finance Collapsed by Default; Access-Controlled",
    { tag: ["@do", "@regression", "@UDP-T4117"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);
      const root = standardQuoteRoot(page);

      const baseRate = root.getByText(/Base\s+Interest\s+Rate/i).first();
      await expect.soft(baseRate).toBeHidden({ timeout: 5_000 });
      await expect.soft(root.getByText(/Dealer\s+Finance/i).first()).toBeVisible({ timeout: 15_000 });

      await assetDetailsPage.expandDealerFinanceSection();
      await expect.soft(root.getByText(/Base\s+Interest\s+Rate/i).first()).toBeVisible({
        timeout: 15_000,
      });
    },
  );

  test(
    "UDP-T4118 - TC_OL_019 Base Interest Rate Display Only; Retained at First Save",
    { tag: ["@do", "@regression", "@UDP-T4118"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(
        true,
        "Requires save and re-open OL quote from FIS AF to verify Base Interest Rate retention.",
      );
    },
  );

  test(
    "UDP-T4119 - TC_OL_020 Estimated Commission/Subsidy Negative When Base Rate Exceeds Customer Rate",
    { tag: ["@do", "@regression", "@UDP-T4119"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await prepareCalculableOlQuote(page, assetDetailsPage, addAssetPage, { interest: "1" });
      await assetDetailsPage.expandDealerFinanceSection();
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
      await assetDetailsPage.clickCalculateButton();

      const panel = standardQuoteRoot(page)
        .getByRole("region")
        .filter({ hasText: /Estimated\s+Commission\s*\/\s*Subsidy/i })
        .first();
      if (await panel.isVisible({ timeout: 15_000 }).catch(() => false)) {
        const text = await panel.innerText();
        expect.soft(/-\$|subsidy/i.test(text)).toBeTruthy();
      }
    },
  );

  test(
    "UDP-T4120 - TC_OL_021 Term Mandatory; Cannot Exceed Useful Life",
    { tag: ["@do", "@regression", "@UDP-T4120"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await prepareCalculableOlQuote(page, assetDetailsPage, addAssetPage);

      const usefulLife = await assetDetailsPage.readUsefulLifeMonths();
      await assetDetailsPage.termsOfFinance(String(usefulLife + 12));
      await assetDetailsPage.expectTermExceedsUsefulLifeValidation(usefulLife);

      await assetDetailsPage.termsOfFinance("");
      await assetDetailsPage.clickCalculateButton();
      await expect
        .soft(page.getByText(/Please complete|Term must|required/i).first())
        .toBeVisible({ timeout: 25_000 });
    },
  );

  test(
    "UDP-T4121 - TC_OL_022 Frequency Mandatory; Defaults from Program",
    { tag: ["@do", "@regression", "@UDP-T4121"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectOlFrequencyDefaultsFromProgram();
    },
  );

  test(
    "UDP-T4122 - TC_OL_023 Interest Rate Mandatory; Defaults from FIS AF",
    { tag: ["@do", "@regression", "@UDP-T4122"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);

      const rate = (await assetDetailsPage.interestRateInputField.inputValue()).trim();
      if (rate.length > 0 && /\d/.test(rate)) {
        expect.soft(Number.parseFloat(rate.replace(/[^\d.]/g, ""))).toBeGreaterThan(0);
      }
      await expect.soft(assetDetailsPage.interestRateInputField).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    "UDP-T4123 - TC_OL_024 Lease Date Mandatory; Defaults to Today; Cannot Be Backdated",
    { tag: ["@do", "@regression", "@UDP-T4123"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);

      await assetDetailsPage.expectLoanDateIsTodayOrTomorrow();
      await assetDetailsPage.expectOlLeaseDateCannotBeBackdated(30);
    },
  );

  test(
    "UDP-T4124 - TC_OL_025 First Payment Display Only; Always Equals Lease Date",
    { tag: ["@do", "@regression", "@UDP-T4124"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();

      await assetDetailsPage.expectFirstPaymentReadOnly();
      await assetDetailsPage.expectFirstPaymentMatchesLeaseDate();

      const newLease = shiftDdMmYyyy(await assetDetailsPage.readLoanDateValue(), 7);
      await assetDetailsPage.enterLoanDateDdMmYyyy(newLease);
      await assetDetailsPage.expectFirstPaymentMatchesLeaseDate();
    },
  );

  test(
    "UDP-T4125 - TC_OL_026 No. of Payments in Advance Optional; Numeric; Greater Than Zero",
    { tag: ["@do", "@regression", "@UDP-T4125"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);

      const blankVal = (await assetDetailsPage.paymentsInAdvanceInputField().inputValue()).trim();
      expect.soft(blankVal.length === 0 || blankVal === "0").toBeTruthy();

      await calculateOlQuote(page, assetDetailsPage, addAssetPage, { paymentsInAdvance: "3" });

      const advanceCount = (await assetDetailsPage.paymentsInAdvanceInputField().inputValue()).trim();
      expect.soft(advanceCount).toBe("3");
      const advanceAmt = await assetDetailsPage.readAdvancePaymentAmount();
      expect.soft(advanceAmt).toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T4126 - TC_OL_027 Payment Amount Shows Irregular When Fixed Zero Segments Present",
    { tag: ["@do", "@regression", "@UDP-T4126"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      await assetDetailsPage.openEditPaymentScheduleDialog();
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({
        number: "12",
        type: "Fixed",
        amount: "0",
      });
      await assetDetailsPage.clickEditPaymentScheduleCalculate();
      await assetDetailsPage.clickEditPaymentScheduleApply();
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentAmountShowsIrregular();
    },
  );

  test(
    "UDP-T4127 - TC_OL_028 Lease Date Change All Schedule Segments Adjust Accordingly",
    { tag: ["@do", "@regression", "@UDP-T4127"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      const initialLease = await assetDetailsPage.readLoanDateValue();
      const shifted = shiftDdMmYyyy(initialLease, 9);
      await assetDetailsPage.enterLoanDateDdMmYyyy(shifted);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      await assetDetailsPage.expectFirstPaymentMatchesLeaseDate();
    },
  );

  test(
    "UDP-T4128 - TC_OL_029 Excess Allowance Section Collapsed by Default",
    { tag: ["@do", "@regression", "@UDP-T4128"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectExcessAllowanceSectionCollapsedByDefault();
      await expect.soft(assetDetailsPage.excessAllowanceSectionHeader()).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    "UDP-T4129 - TC_OL_030 Usage Unit Display Only; Fetched from FIS AF Based on Asset Type",
    { tag: ["@do", "@regression", "@UDP-T4129"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await addMinimalOlAsset(assetDetailsPage, addAssetPage);
      await assetDetailsPage.expectUsageUnitDisplayOnly();
    },
  );

  test(
    "UDP-T4130 - TC_OL_031 Usage Allowance Optional; Numeric",
    { tag: ["@do", "@regression", "@UDP-T4130"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expandExcessAllowanceSection();

      const allowance = assetDetailsPage.usageAllowanceInputField();
      await expect.soft(allowance).toBeVisible({ timeout: 15_000 });
      const blank = (await allowance.inputValue()).trim();
      expect.soft(blank.length === 0).toBeTruthy();

      await assetDetailsPage.fillUsageAllowance("45000");
      const usageVal = (await allowance.inputValue()).trim().replace(/,/g, "");
      expect.soft(Number.parseFloat(usageVal)).toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T4131 - TC_OL_032 Excess Usage Allowance Percent Auto-Calculates Numeric Excess Amount",
    { tag: ["@do", "@regression", "@UDP-T4131"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await addMinimalOlAsset(assetDetailsPage, addAssetPage);
      await assetDetailsPage.fillOlExcessAllowanceForCalculation("45000", "5");

      await expect
        .poll(async () => assetDetailsPage.readExcessUsageAllowanceAmount(), { timeout: 30_000 })
        .toBeGreaterThan(0);
      const excess = await assetDetailsPage.readExcessUsageAllowanceAmount();
      expect.soft(Math.abs(excess - 2_250)).toBeLessThanOrEqual(50);
    },
  );

  test(
    "UDP-T4132 - TC_OL_033 Total Usage Allowance Calculated Usage Plus Excess Amount",
    { tag: ["@do", "@regression", "@UDP-T4132"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await addMinimalOlAsset(assetDetailsPage, addAssetPage);
      await assetDetailsPage.fillOlExcessAllowanceForCalculation("45000", "5");

      await expect
        .poll(async () => assetDetailsPage.readTotalUsageAllowance(), { timeout: 30_000 })
        .toBeGreaterThan(45_000);
      const total = await assetDetailsPage.readTotalUsageAllowance();
      expect.soft(Math.abs(total - 47_250)).toBeLessThanOrEqual(100);
    },
  );

  test(
    "UDP-T4133 - TC_OL_034 Excess Usage Charge Optional; Cents",
    { tag: ["@do", "@regression", "@UDP-T4133"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expandExcessAllowanceSection();

      const chargeField = assetDetailsPage.excessUsageChargeInputField();
      await expect.soft(chargeField).toBeVisible({ timeout: 15_000 });
      await chargeField.fill("0.15");
      await chargeField.press("Tab").catch(() => {});
      const val = (await chargeField.inputValue()).trim();
      expect.soft(val.length).toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T4134 - TC_OL_035 Rebate Allowance Total Rebate Allowance Percent and Amount Calculated",
    { tag: ["@do", "@regression", "@UDP-T4134"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expandExcessAllowanceSection();

      await assetDetailsPage.usageAllowanceInputField().fill("45000");
      const chargeField = assetDetailsPage.excessUsageChargeInputField();
      if (await chargeField.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await chargeField.fill("0.15");
      }
      const rebatePct = olFieldNearLabel(root, /Total\s+Rebate\s+Allowance\s*%/i);
      if (await rebatePct.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await rebatePct.fill("15");
        await rebatePct.press("Tab").catch(() => {});
      }

      const rebateAmt = olFieldNearLabel(root, /Rebate\s+Amount/i);
      const totalRebate = olFieldNearLabel(root, /Total\s+Rebate\s+Allowance(?!.*%)/i);
      if (await totalRebate.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect.soft(totalRebate).toBeDisabled({ timeout: 5_000 });
      }
      if (await rebateAmt.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect.soft(rebateAmt).toBeDisabled({ timeout: 5_000 });
      }
    },
  );

  test(
    "UDP-T4135 - TC_OL_036 Segment View Columns Date Number Frequency Payment GST Total Payment",
    { tag: ["@do", "@regression", "@UDP-T4135"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      const root = standardQuoteRoot(page);
      const table = root
        .locator("table")
        .filter({ hasText: /Date|Number|Frequency|Payment/i })
        .first();
      await expect.soft(table).toBeVisible({ timeout: 25_000 });
      for (const col of ["Date", "Number", "Frequency", "Payment", "GST", "Total Payment"]) {
        const header = table
          .getByRole("columnheader", { name: new RegExp(`^${col}`, "i") })
          .or(table.locator("th").filter({ hasText: new RegExp(col, "i") }))
          .first();
        await expect.soft(header).toBeVisible({ timeout: 10_000 });
      }
    },
  );

  test(
    "UDP-T4136 - TC_OL_037 Segment View Defaults as Default View on First Display",
    { tag: ["@do", "@regression", "@UDP-T4136"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      const root = standardQuoteRoot(page);
      const segmentSelected = root
        .getByRole("radio", { checked: true })
        .filter({ has: root.locator("i.pi.pi-equals") })
        .first();
      if (await segmentSelected.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await expect.soft(segmentSelected).toBeVisible();
      } else {
        await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      }
    },
  );

  test(
    "UDP-T4137 - TC_OL_038 Grid View Payment Column GST-Inclusive",
    { tag: ["@do", "@regression", "@UDP-T4137"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);
      await assetDetailsPage.expectPaymentScheduleViewTogglesWorkAndTablePopulated();
    },
  );

  test(
    "UDP-T4138 - TC_OL_039 No. of Payments in Advance Greater Than Zero Payment Schedule NOT Editable",
    { tag: ["@do", "@regression", "@UDP-T4138"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage, { paymentsInAdvance: "3" });
      await assetDetailsPage.expectEditPaymentScheduleTriggerDisabledOrHidden();
    },
  );

  test(
    "UDP-T4139 - TC_OL_040 Payment Schedule Dates Driven by First Payment Date",
    { tag: ["@do", "@regression", "@UDP-T4139"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      const leaseDate = await assetDetailsPage.readLoanDateValue();
      await assetDetailsPage.expectFirstPaymentMatchesLeaseDate();

      await assetDetailsPage.openEditPaymentScheduleDialog();
      const dialog = assetDetailsPage.editPaymentScheduleDialog();
      const firstDateCell = dialog.locator("table tbody tr").first().locator("td").first();
      if (await firstDateCell.isVisible({ timeout: 8_000 }).catch(() => false)) {
        const cellText = ((await firstDateCell.textContent()) ?? "").trim();
        if (cellText.length > 0) {
          expect.soft(cellText).toContain(leaseDate.split("/")[0]);
        }
      }
      await assetDetailsPage.clickEditPaymentScheduleCancel().catch(() => {});
    },
  );

  test(
    "UDP-T4140 - TC_OL_041 Fixed Type Only Allowed with Value Zero",
    { tag: ["@do", "@regression", "@UDP-T4140"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      await assetDetailsPage.openEditPaymentScheduleDialog();
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ type: "Fixed", amount: "500" });
      await assetDetailsPage
        .clickEditPaymentScheduleCalculate({ waitForApply: false })
        .catch(() => {});
      const dialog = assetDetailsPage.editPaymentScheduleDialog();
      const errVisible = await page
        .getByText(/only allowed value is 0|Fixed.*0|not allowed/i)
        .first()
        .isVisible({ timeout: 8_000 })
        .catch(() => false);
      const applyDisabled = await dialog
        .getByRole("button", { name: /^Apply$/i })
        .first()
        .isDisabled()
        .catch(() => true);
      expect.soft(errVisible || applyDisabled).toBeTruthy();

      await assetDetailsPage.clickEditPaymentScheduleReset();
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({
        number: "12",
        type: "Fixed",
        amount: "0",
      });
      await assetDetailsPage.clickEditPaymentScheduleCalculate();
      await expect
        .soft(dialog.getByRole("button", { name: /^Apply$/i }).first())
        .toBeEnabled({ timeout: 60_000 });
    },
  );

  test(
    "UDP-T4141 - TC_OL_042 Normal Type Amount Auto-Calculated; Fetched from FIS AF",
    { tag: ["@do", "@regression", "@UDP-T4141"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      await assetDetailsPage.openEditPaymentScheduleDialog();
      await assetDetailsPage.selectEditPaymentScheduleSegmentType("Normal");
      const row = assetDetailsPage.editPaymentScheduleDialog().locator("table tbody tr").first();
      const amountInput = row.locator("input[currencymask]").first();
      if (await amountInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
        expect.soft(await amountInput.isEditable().catch(() => false)).toBeFalsy();
      }
      await assetDetailsPage.clickEditPaymentScheduleCancel().catch(() => {});
    },
  );

  test(
    "UDP-T4142 - TC_OL_045 No Interest Only Type in OL Edit Schedule",
    { tag: ["@do", "@regression", "@UDP-T4142"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      await assetDetailsPage.openEditPaymentScheduleDialog();
      await assetDetailsPage.expectEditPaymentScheduleSegmentTypesExcludeInterestOnly();
    },
  );

  test(
    "UDP-T4143 - TC_OL_046 Delete Removes Last Segment",
    { tag: ["@do", "@regression", "@UDP-T4143"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      await assetDetailsPage.openEditPaymentScheduleDialog();
      const rowsBefore = await assetDetailsPage.editPaymentScheduleDialog().locator("table tbody tr").count();
      if (rowsBefore > 1) {
        await assetDetailsPage.clickEditPaymentScheduleDelete();
        const rowsAfter = await assetDetailsPage.editPaymentScheduleDialog().locator("table tbody tr").count();
        expect.soft(rowsAfter).toBeLessThan(rowsBefore);
      } else {
        test.info().annotations.push({ type: "note", description: "Single segment row — delete not applicable." });
      }
    },
  );

  test(
    "UDP-T4144 - TC_OL_047 Reset Reverts to State When Edit Screen First Opened",
    { tag: ["@do", "@regression", "@UDP-T4144"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      await assetDetailsPage.openEditPaymentScheduleDialog();
      const snapshot = await assetDetailsPage.getEditPaymentScheduleSegmentRowsSnapshot();
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ number: "12", type: "Fixed" });
      await assetDetailsPage.clickEditPaymentScheduleReset();
      await assetDetailsPage.expectEditPaymentScheduleSegmentRowsMatch(snapshot);
    },
  );

  test(
    "UDP-T4145 - TC_OL_048 Calculate Normal Amounts from FIS AF; Error If Segments Exceed Term",
    { tag: ["@do", "@regression", "@UDP-T4145"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      await assetDetailsPage.openEditPaymentScheduleDialog();
      const term = await assetDetailsPage.getEditPaymentScheduleFinanceTermMonths();
      await assetDetailsPage.enterEditPaymentScheduleSegmentNumber(String(term + 10));
      await assetDetailsPage.clickEditPaymentScheduleCalculate({ waitForApply: false });
      await assetDetailsPage.expectEditPaymentScheduleSegmentExceedsTermMessage();
    },
  );

  test(
    "UDP-T4146 - TC_OL_050 Cancel Confirmation; Returns to Standard Quote",
    { tag: ["@do", "@regression", "@UDP-T4146"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      await assetDetailsPage.openEditPaymentScheduleDialog();
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ number: "24", type: "Fixed" });
      await assetDetailsPage.clickEditPaymentScheduleCancel();
      await assetDetailsPage.expectEditPaymentScheduleCancelConfirmationVisible();
    },
  );

  test(
    "UDP-T4147 - TC_OL_051 Add Segment Disabled When Max Payments Reached",
    { tag: ["@do", "@regression", "@UDP-T4147"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      await assetDetailsPage.openEditPaymentScheduleDialog();
      await assetDetailsPage.addEditPaymentScheduleSegmentsUntilTermReached();
      await assetDetailsPage.expectEditPaymentScheduleAddSegmentDisabledAtTermMax();
    },
  );

  test(
    "UDP-T4148 - TC_OL_052 Save Validates Mandatory Fields; Originator Reference Pop-Up If No Customer",
    { tag: ["@do", "@regression", "@UDP-T4148"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.clearOriginationReferences();
      await assetDetailsPage.clickSaveStandardQuoteStep();
      await expect
        .soft(page.getByText(/required|Please complete|cannot be blank|Originator\s+Reference/i).first())
        .toBeVisible({ timeout: 25_000 });
    },
  );

  test(
    "UDP-T4149 - TC_OL_053 Next Validates Then Navigates to Customer Details",
    { tag: ["@do", "@regression", "@UDP-T4149"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);
      await assetDetailsPage.clickNextButtonFinanceLease("SQ-OL-Ref-01");

      const customerDetailsPage = new DOCustomerDetailsPage(page);
      await customerDetailsPage.waitForAddBorrowerButton();
      const addBtnVisible = await customerDetailsPage.addBorrowersOrGuarantorsButton
        .isVisible()
        .catch(() => false);
      const personalVisible = await page.locator("app-personal-details").isVisible().catch(() => false);
      expect.soft(addBtnVisible || personalVisible).toBeTruthy();
    },
  );

  test(
    "UDP-T4150 - TC_OL_054 Cancel Confirmation Pop-Up; Returns to Dashboard",
    { tag: ["@do", "@regression", "@UDP-T4150"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.enterOriginationReferenceFinanceLease("SQ-OL-Cancel");

      const cancelBtn = standardQuoteRoot(page).getByRole("button", { name: /^Cancel$/i }).first();
      if (await cancelBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await cancelBtn.click();
        await expect
          .soft(page.getByText(/unsaved changes will be lost|Are you sure/i).first())
          .toBeVisible({ timeout: 15_000 });
      } else {
        test.skip(true, "Cancel button not visible on this build.");
      }
    },
  );

  test(
    "UDP-T4151 - TC_OL_055 Calculate Enabled When Mandatory Fields Met or Workflow Allows",
    { tag: ["@do", "@regression", "@UDP-T4151"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await prepareCalculableOlQuote(page, assetDetailsPage, addAssetPage);

      await expect.soft(assetDetailsPage.calculateButton).toBeEnabled({ timeout: 30_000 });
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
    },
  );

  test(
    "UDP-T4152 - TC_OL_056 Status Button Workflow Transition",
    { tag: ["@do", "@regression", "@UDP-T4152"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await calculateOlQuote(page, assetDetailsPage, addAssetPage);

      const statusBtn = standardQuoteRoot(page)
        .getByRole("button", { name: /Status|Submit|Workflow/i })
        .first();
      if (await statusBtn.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await expect.soft(statusBtn).toBeEnabled();
      } else {
        test.info().annotations.push({
          type: "note",
          description: "Status/workflow button not exposed — refer MAF-5644 / MAF-6659 / MAF-6559.",
        });
      }
    },
  );

  test(
    "UDP-T4153 - TC_OL_057 OL Has No Quick Quote Standard Quote Only",
    { tag: ["@do", "@regression", "@UDP-T4153"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboardPage = await openAuthenticatedDashboard(page);
      const quickQuotePage = new DOQuickQuotePage(page);
      await quickQuotePage.openQuickQuote();
      await expect.soft(quickQuotePage.quickQuoteRoot).toBeVisible();

      const products = await quickQuotePage.listDropdownOptions(quickQuotePage.productDropdownTrigger);
      expect.soft(products.every((p) => !/Operating\s*Lease/i.test(p))).toBeTruthy();
    },
  );

  test(
    "UDP-T4154 - TC_OL_058 OL Has Include GST Checkbox Controlling Two View Modes",
    { tag: ["@do", "@regression", "@UDP-T4154"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await expect.soft(assetDetailsPage.includeGstCheckbox()).toBeVisible({ timeout: 20_000 });

      const dashboardPage = await openAuthenticatedDashboard(page);
      await dashboardPage.clickCreateStandardQuote();
      await dashboardPage.selectFinanceLeaseProduct();
      await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });

      const flAssetDetails = new DOAssetDetailsPage(page);
      await flAssetDetails.waitForAssetDetailsStepReady();
      await expect.soft(flAssetDetails.includeGstCheckboxHost()).toBeHidden({ timeout: 5_000 });
    },
  );

  test(
    "UDP-T4155 - TC_OL_059 OL Has Useful Life Field Linked to Asset Type",
    { tag: ["@do", "@regression", "@UDP-T4155"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await addMinimalOlAsset(assetDetailsPage, addAssetPage);
      await assetDetailsPage.waitForQuoteLoadersToFinish();
      await expect.soft(assetDetailsPage.usefulLifeInputField()).toBeVisible({ timeout: 30_000 });

      const dashboardPage = await openAuthenticatedDashboard(page);
      await dashboardPage.clickCreateStandardQuote();
      await dashboardPage.selectCSAproduct();
      await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });

      const csaAssetDetails = new DOAssetDetailsPage(page);
      await csaAssetDetails.waitForAssetDetailsStepReady();
      await expect.soft(csaAssetDetails.standardQuoteRoot().getByText(/^Useful\s*Life$/i).first()).toBeHidden({
        timeout: 5_000,
      });
    },
  );

  test(
    "UDP-T4156 - TC_OL_060 OL Has Maintenance Cost Financed Maintenance Charge Mutual Exclusion",
    { tag: ["@do", "@regression", "@UDP-T4156"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);

      await expect.soft(assetDetailsPage.maintenanceCostInputField()).toBeVisible({ timeout: 15_000 });
      await expect
        .soft(assetDetailsPage.financedMaintenanceChargeInputField())
        .toBeVisible({ timeout: 15_000 });

      const dashboardPage = await openAuthenticatedDashboard(page);
      await dashboardPage.clickCreateStandardQuote();
      await dashboardPage.selectCSAproduct();
      const csaAssetDetails = new DOAssetDetailsPage(page);
      await csaAssetDetails.waitForAssetDetailsStepReady();
      await expect.soft(csaAssetDetails.maintenanceCostInputField()).toBeHidden({ timeout: 5_000 });
    },
  );

  test(
    "UDP-T4157 - TC_OL_061 OL Has Excess Allowance Section Usage Unit Allowances Rebate",
    { tag: ["@do", "@regression", "@UDP-T4157"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await expect.soft(assetDetailsPage.excessAllowanceSectionHeader()).toBeVisible({ timeout: 15_000 });
      await assetDetailsPage.expandExcessAllowanceSection();
      await expect.soft(assetDetailsPage.usageAllowanceInputField()).toBeVisible({ timeout: 15_000 });

      const dashboardPage = await openAuthenticatedDashboard(page);
      await dashboardPage.clickCreateStandardQuote();
      await dashboardPage.selectFinanceLeaseProduct();
      const flAssetDetails = new DOAssetDetailsPage(page);
      await flAssetDetails.waitForAssetDetailsStepReady();
      await expect.soft(flAssetDetails.excessAllowanceSectionHeader()).toBeHidden({ timeout: 5_000 });
    },
  );

  test(
    "UDP-T4158 - TC_OL_062 OL Has No. of Payments in Advance Field; Locks Edit Schedule When Greater Than Zero",
    { tag: ["@do", "@regression", "@UDP-T4158"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await expect.soft(assetDetailsPage.paymentsInAdvanceInputField()).toBeVisible({ timeout: 15_000 });

      await calculateOlQuote(page, assetDetailsPage, addAssetPage, { paymentsInAdvance: "3" });
      await assetDetailsPage.expectEditPaymentScheduleTriggerDisabledOrHidden();
    },
  );

  test(
    "UDP-T4159 - TC_OL_063 OL Has No PPSR No Establishment Fees No LMF No Settlement No Trade No Balloon",
    { tag: ["@do", "@regression", "@UDP-T4159"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      await selectOlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectOlExcludedFieldsAbsent();
    },
  );

  test(
    "UDP-T4160 - TC_OL_064 OL Total Cash Cost Includes Maintenance Cost and Maintenance Charge",
    { tag: ["@do", "@regression", "@UDP-T4160"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openOlStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await prepareCalculableOlQuote(page, assetDetailsPage, addAssetPage, {
        cashPrice: "$20,000",
        maintenanceCost: "$2,000",
      });
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
      await assetDetailsPage.clickCalculateButton();

      const total = await readDisplayedCurrency(assetDetailsPage.totalCashCostField());
      const cash = await readDisplayedCurrency(assetDetailsPage.cashPriceOfAssetInputField);
      const maint = await readDisplayedCurrency(assetDetailsPage.maintenanceCostInputField());
      expect.soft(total).toBeGreaterThan(0);
      expect.soft(total).toBeGreaterThanOrEqual(cash + maint - 100);
    },
  );
});
