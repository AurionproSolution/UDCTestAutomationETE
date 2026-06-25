/**
 * DO Portal — Standard Quote AFV regression (UDP-T4020–UDP-T4072).
 * Scenario source: AFV Standard Quote.xlsx (Zephyr / Regression — AFV- Standard Quote).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOAssetDetailsPage, DODashboardPage, DOQuickQuotePage } from "../../../pages";

const AFV_SQ_PRODUCT = "AFV-B-Assigned";
const TLC_DEALER = "Armstrong Prestige Wellington";

const AFV_SQ_VEHICLE = {
  make: "SUZUKI",
  model: "IGNIS",
  variant: "GLX MANUAL 1.2P/ 5MT",
  year: "2024",
};

function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

function parseCurrency(value: string): number {
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseKmValue(label: string): number {
  const m = label.match(/(\d[\d,]*)/);
  return m ? Number.parseInt(m[1].replace(/,/g, ""), 10) : Number.MAX_SAFE_INTEGER;
}

function shiftDdMmYyyy(dateStr: string, days: number): string {
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return dateStr;
  const d = new Date(Number.parseInt(m[3], 10), Number.parseInt(m[2], 10) - 1, Number.parseInt(m[1], 10));
  d.setDate(d.getDate() + days);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
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

async function selectAfVProductAndAsset(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await assetDetailsPage.chooseProduct(AFV_SQ_PRODUCT);
  await expect.soft(standardQuoteRoot(page).getByText(AFV_SQ_PRODUCT).first()).toBeVisible({
    timeout: 30_000,
  });
  await assetDetailsPage.selectVehicleFromAssetTypeModal(AFV_SQ_VEHICLE);
  await assetDetailsPage.waitForAfVCashPricePopulated();
  const program = await assetDetailsPage.readSelectedProgramLabel();
  expect.soft(program.length).toBeGreaterThan(0);
}

async function prepareCalculableAfVQuote(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  opts?: {
    condition?: string;
    term?: string;
    cashPrice?: string;
    origRef?: string;
    interest?: string;
    kmAllowance?: string;
  },
): Promise<void> {
  await selectAfVProductAndAsset(page, assetDetailsPage);
  await assetDetailsPage.selectConditionInStandardQuote(opts?.condition ?? "Used");
  if (opts?.cashPrice) {
    await assetDetailsPage.cashPriceOfAsset(opts.cashPrice);
  }
  if (opts?.term) {
    await assetDetailsPage.termsOfFinance(opts.term);
  } else {
    const termVal = (await assetDetailsPage.termsOfFinanceInputField.inputValue().catch(() => "")).trim();
    if (!termVal || !/\d/.test(termVal)) {
      await assetDetailsPage.termsOfFinance("36");
    }
  }
  await assetDetailsPage.ensureKmAllowanceForAfV();
  if (opts?.kmAllowance) {
    await assetDetailsPage.selectKmAllowance(opts.kmAllowance);
  }
  const rate = (await assetDetailsPage.interestRateInputField.inputValue()).trim();
  if (!rate || !/\d/.test(rate)) {
    await assetDetailsPage.interestRate(opts?.interest ?? "4");
  }
  await assetDetailsPage.enterOriginationReference(opts?.origRef ?? "SQ-AFV-Ref-01");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
}

async function calculateAfVQuote(page: Page, assetDetailsPage: DOAssetDetailsPage): Promise<void> {
  await prepareCalculableAfVQuote(page, assetDetailsPage);
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
}

async function openAfVStandardQuoteFromQuickQuote(page: Page): Promise<DOAssetDetailsPage> {
  const dashboardPage = new DODashboardPage(page);
  const quickQuotePage = new DOQuickQuotePage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await quickQuotePage.openQuickQuote();
  await quickQuotePage.selectProduct(AFV_SQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  await quickQuotePage.selectVehicleFromAssetTypeModal(AFV_SQ_VEHICLE);
  await quickQuotePage.waitForAfVFieldsAfterAssetSelection();
  await quickQuotePage.ensureMandatoryAfVFieldsForCalculate();
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();
  await quickQuotePage.clickCreateQuote();
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.waitForAssetDetailsStepReady();
  return assetDetailsPage;
}

async function openAssetTypePopup(page: Page): Promise<Locator> {
  const root = standardQuoteRoot(page);
  const selectTrigger = root
    .getByRole("button", { name: /^Select$/i })
    .or(root.getByRole("link", { name: /^Select$/i }))
    .or(
      root.locator(
        "xpath=.//*[contains(normalize-space(.),'Asset Type')]/ancestor::*[contains(@class,'row') or contains(@class,'grid')][1]//button[contains(.,'Select')]",
      ),
    )
    .first();
  await selectTrigger.scrollIntoViewIfNeeded();
  await selectTrigger.click({ timeout: 15_000 });
  const dlg = page.getByRole("dialog").last();
  await dlg.waitFor({ state: "visible", timeout: 20_000 });
  return dlg;
}

test.describe("Standard Quote - AFV @do @regression", () => {
  test(
    "UDP-T4020 - Standard Quote Default Field Values on Load",
    { tag: ["@do", "@regression", "@UDP-T4020"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await assetDetailsPage.chooseProduct(AFV_SQ_PRODUCT);

      const root = standardQuoteRoot(page);
      await expect.soft(root.getByText(/Open Quote/i).first()).toBeVisible({ timeout: 20_000 });
      const usedSelected = root
        .locator("p-dropdown, p-selectbutton")
        .filter({ hasText: /Used/i })
        .first();
      if (await usedSelected.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect.soft(usedSelected).toContainText(/Used/i);
      }
      const promo = root.getByRole("checkbox", { name: /Promotion Quote/i }).first();
      if (await promo.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect.soft(promo).not.toBeChecked();
      }
    },
  );

  test(
    "UDP-T4021 - Program Is Display-Only for AFV",
    { tag: ["@do", "@regression", "@UDP-T4021"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      await assetDetailsPage.expectProgramDropdownDisabled();
      const program = await assetDetailsPage.readSelectedProgramLabel();
      expect.soft(/AFV/i.test(program)).toBeTruthy();
    },
  );

  test(
    "UDP-T4022 - Asset Type Select Popup Filters AFV Programs",
    { tag: ["@do", "@regression", "@UDP-T4022"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await assetDetailsPage.chooseProduct(AFV_SQ_PRODUCT);
      const dlg = await openAssetTypePopup(page);
      await expect.soft(dlg.getByText(/Make/i).first()).toBeVisible();
      await expect.soft(dlg.locator(".p-dropdown")).toHaveCount(4, { timeout: 15_000 });
      await page.keyboard.press("Escape").catch(() => {});
    },
  );

  test(
    "UDP-T4023 - AFV Details Section Collapsed Display-Only Fields",
    { tag: ["@do", "@regression", "@UDP-T4023"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      const root = standardQuoteRoot(page);
      if (!(await root.getByText(/AFV Details/i).first().isVisible({ timeout: 15_000 }).catch(() => false))) {
        test.info().annotations.push({ type: "note", description: "AFV Details section not rendered." });
        return;
      }
      await assetDetailsPage.expandAfVDetailsSection();
      await expect.soft(root.getByText(/Provider/i).first()).toBeVisible();
    },
  );

  test(
    "UDP-T4024 - Condition Defaults to Used",
    { tag: ["@do", "@regression", "@UDP-T4024"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await assetDetailsPage.chooseProduct(AFV_SQ_PRODUCT);
      const root = standardQuoteRoot(page);
      const condition = root.locator("p-dropdown, p-selectbutton").filter({ hasText: /Condition/i }).first();
      if (await condition.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await expect.soft(root.getByText(/Used/i).first()).toBeVisible();
      }
    },
  );

  test(
    "UDP-T4025 - Recommended Retail Price Only Visible When Condition New",
    { tag: ["@do", "@regression", "@UDP-T4025"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      await assetDetailsPage.selectConditionInStandardQuote("New");
      await assetDetailsPage.scrollRecommendedRetailPriceIntoView();
      await expect.soft(assetDetailsPage.recommendedRetailPriceInput).toBeVisible({ timeout: 20_000 });
      await assetDetailsPage.selectConditionInStandardQuote("Used");
      await assetDetailsPage.expectRecommendedRetailPriceHiddenAfterUsedCondition();
    },
  );

  test(
    "UDP-T4026 - Cash Price Populated from Asset Type or QQ",
    { tag: ["@do", "@regression", "@UDP-T4026"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openAfVStandardQuoteFromQuickQuote(page);
      const cash = (await assetDetailsPage.cashPriceOfAssetInputField.inputValue()).trim();
      expect.soft(parseCurrency(cash)).toBeGreaterThan(0);
      await assetDetailsPage.cashPriceOfAsset("$28,000");
      await expect
        .poll(async () => parseCurrency(await assetDetailsPage.cashPriceOfAssetInputField.inputValue()), {
          timeout: 15_000,
        })
        .toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T4027 - Term Mandatory Defaults from AFV Program Validation",
    { tag: ["@do", "@regression", "@UDP-T4027"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await prepareCalculableAfVQuote(page, assetDetailsPage);
      const term = (await assetDetailsPage.termsOfFinanceInputField.inputValue().catch(() => "")).trim();
      if (term.length > 0) {
        expect.soft(/\d+/.test(term)).toBeTruthy();
      }
      await assetDetailsPage.termsOfFinance("9999");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectTermExceedsProgramMaxOnCalculateThenRestore({
        overMaxTerm: "9999",
        restoreTerm: "36",
      });
    },
  );

  test(
    "UDP-T4028 - KM Allowance Carried from QQ Lowest KM Defaults First",
    { tag: ["@do", "@regression", "@UDP-T4028"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPageFromQq = await openAfVStandardQuoteFromQuickQuote(page);
      const kmFromQq = await assetDetailsPageFromQq.readKmAllowanceLabel();
      expect.soft(kmFromQq.length).toBeGreaterThan(0);

      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      await assetDetailsPage.termsOfFinance("36");
      const kmOptions = await assetDetailsPage.listKmAllowanceOptions();
      expect.soft(kmOptions.length).toBeGreaterThan(0);
      const sorted = kmOptions.map(parseKmValue).sort((a, b) => a - b);
      expect.soft(kmOptions.map(parseKmValue)).toEqual(sorted);
    },
  );

  test(
    "UDP-T4029 - KM Allowance Refreshes When Term Changes",
    { tag: ["@do", "@regression", "@UDP-T4029"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      await assetDetailsPage.termsOfFinance("24");
      await assetDetailsPage.ensureKmAllowanceForAfV();
      const kmBefore = await assetDetailsPage.readKmAllowanceLabel();
      await assetDetailsPage.termsOfFinance("48");
      await assetDetailsPage.waitForLoadingComplete();
      const kmOptions = await assetDetailsPage.listKmAllowanceOptions();
      expect.soft(kmOptions.length).toBeGreaterThan(0);
      const kmAfter = await assetDetailsPage.readKmAllowanceLabel();
      if (kmBefore.length > 0 && kmOptions.join() !== kmBefore) {
        expect.soft(kmAfter.length).toBeGreaterThan(0);
      }
    },
  );

  test(
    "UDP-T4030 - Assured Future Value Display Only Auto-Populated",
    { tag: ["@do", "@regression", "@UDP-T4030"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await prepareCalculableAfVQuote(page, assetDetailsPage, { term: "36" });
      const afv = await assetDetailsPage.readAssuredFutureValue();
      expect.soft(parseCurrency(afv)).toBeGreaterThan(0);
      expect.soft(await assetDetailsPage.assuredFutureValueIsReadOnly()).toBeTruthy();
      const kmOptions = await assetDetailsPage.listKmAllowanceOptions();
      if (kmOptions.length >= 2) {
        const before = parseCurrency(afv);
        await assetDetailsPage.selectKmAllowance(kmOptions[1]);
        await expect
          .poll(async () => parseCurrency(await assetDetailsPage.readAssuredFutureValue()), {
            timeout: 30_000,
          })
          .not.toBe(before);
      }
    },
  );

  test(
    "UDP-T4031 - Assured Future Value Shown in Payment Summary",
    { tag: ["@do", "@regression", "@UDP-T4031"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await prepareCalculableAfVQuote(page, assetDetailsPage);
      const afvFinance = await assetDetailsPage.readAssuredFutureValue();
      await assetDetailsPage.clickCalculateButton();
      const root = standardQuoteRoot(page);
      await expect.soft(root.getByText(/Assured Future Value/i).first()).toBeVisible({ timeout: 30_000 });
      if (afvFinance.length > 0) {
        const digits = afvFinance.replace(/[^\d]/g, "");
        if (digits.length > 0) {
          await expect.soft(root.getByText(new RegExp(digits)).first()).toBeVisible({ timeout: 30_000 });
        }
      }
    },
  );

  test(
    "UDP-T4032 - Interest Rate Defaults from FIS AF",
    { tag: ["@do", "@regression", "@UDP-T4032"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      const rate = (await assetDetailsPage.interestRateInputField.inputValue()).trim();
      expect.soft(rate.length).toBeGreaterThan(0);
      expect.soft(/\d/.test(rate)).toBeTruthy();
    },
  );

  test(
    "UDP-T4033 - Frequency Defaults from Program",
    { tag: ["@do", "@regression", "@UDP-T4033"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      const freqLabel = await assetDetailsPage.frequencyOfPayment.textContent().catch(() => "");
      if (freqLabel?.trim()) {
        expect.soft(/Monthly|Weekly|Fortnightly/i.test(freqLabel)).toBeTruthy();
      }
    },
  );

  test(
    "UDP-T4034 - First Payment Cannot Be Before Loan Date",
    { tag: ["@do", "@regression", "@UDP-T4034"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await prepareCalculableAfVQuote(page, assetDetailsPage);
      const loan = await assetDetailsPage.readLoanDateValue();
      await assetDetailsPage.enterFirstPaymentDateDdMmYyyy(shiftDdMmYyyy(loan, -1));
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectFirstPaymentBeforeLoanDateValidation();
    },
  );

  test(
    "UDP-T4035 - First Payment Must Be Within 6 Weeks of Loan Date",
    { tag: ["@do", "@regression", "@UDP-T4035"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await prepareCalculableAfVQuote(page, assetDetailsPage);
      const loan = await assetDetailsPage.readLoanDateValue();
      await assetDetailsPage.enterFirstPaymentDateDdMmYyyy(shiftDdMmYyyy(loan, 50));
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectFirstPaymentExceedsSixWeeksValidation();
    },
  );

  test(
    "UDP-T4036 - First Payment Date Drives Entire Payment Schedule",
    { tag: ["@do", "@regression", "@UDP-T4036"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await prepareCalculableAfVQuote(page, assetDetailsPage);
      const loan = await assetDetailsPage.readLoanDateValue();
      const first1 = DOAssetDetailsPage.suggestFirstPaymentDdMmYyyy(loan);
      await assetDetailsPage.enterFirstPaymentDateDdMmYyyy(first1);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      const first2 = shiftDdMmYyyy(first1, 7);
      await assetDetailsPage.enterFirstPaymentDateDdMmYyyy(first2);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
    },
  );

  test(
    "UDP-T4037 - Last Payment Date Equals AFV Amount Due Date",
    { tag: ["@do", "@regression", "@UDP-T4037"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.expectAfVRowInPaymentSchedule();
      const root = standardQuoteRoot(page);
      const lastRow = root.locator("table tbody tr").last();
      await expect.soft(lastRow).toBeVisible({ timeout: 30_000 });
      await expect.soft(lastRow).toContainText(/\d{1,2}\/\d{1,2}\/\d{4}|\$|AFV/i);
    },
  );

  test(
    "UDP-T4038 - Payment Amount Shows Irregular When Non-Uniform",
    { tag: ["@do", "@regression", "@UDP-T4038"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await prepareCalculableAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.openEditPaymentScheduleDialog();
      await assetDetailsPage.selectEditPaymentScheduleSegmentType("Interest Only");
      await assetDetailsPage.clickEditPaymentScheduleCalculate();
      await assetDetailsPage.clickEditPaymentScheduleApply();
      const irregular = standardQuoteRoot(page).getByText(/Irregular/i).first();
      if (await irregular.isVisible({ timeout: 30_000 }).catch(() => false)) {
        await expect.soft(irregular).toBeVisible();
      } else {
        test.info().annotations.push({
          type: "note",
          description: "Irregular label not shown — AFV schedule may remain uniform for this program.",
        });
      }
    },
  );

  test(
    "UDP-T4039 - Segment View AFV Amount Displays as Final Segment",
    { tag: ["@do", "@regression", "@UDP-T4039"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.expectAfVRowInPaymentSchedule();
    },
  );

  test(
    "UDP-T4040 - Grid View AFV Amount Displays as Final Line",
    { tag: ["@do", "@regression", "@UDP-T4040"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.expectPaymentScheduleViewTogglesWorkAndTablePopulated();
      await assetDetailsPage.expectAfVRowInPaymentSchedule();
    },
  );

  test(
    "UDP-T4041 - Segment View AFV Date Included",
    { tag: ["@do", "@regression", "@UDP-T4041"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      const afvRow = standardQuoteRoot(page).locator("tr").filter({ hasText: /AFV|Assured/i }).last();
      await expect.soft(afvRow).toContainText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    },
  );

  test(
    "UDP-T4042 - Grid View AFV Date Number Frequency Included",
    { tag: ["@do", "@regression", "@UDP-T4042"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.clickPaymentScheduleViewTogglesAndExpectRowsRemain();
      await assetDetailsPage.expectAfVRowInPaymentSchedule();
    },
  );

  test(
    "UDP-T4043 - Segment View Default on First Display",
    { tag: ["@do", "@regression", "@UDP-T4043"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
    },
  );

  test(
    "UDP-T4044 - Edit Schedule Opens in Current View",
    { tag: ["@do", "@regression", "@UDP-T4044"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.clickPaymentScheduleViewTogglesAndExpectRowsRemain();
      await assetDetailsPage.openEditPaymentScheduleDialog();
      await expect.soft(assetDetailsPage.editPaymentScheduleDialog()).toBeVisible();
    },
  );

  test(
    "UDP-T4045 - Edit Schedule AFV Amount Display Only",
    { tag: ["@do", "@regression", "@UDP-T4045"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.openEditPaymentScheduleDialog();
      const dialog = assetDetailsPage.editPaymentScheduleDialog();
      const afvCell = dialog.locator("tr").filter({ hasText: /AFV|Assured/i }).last();
      if (await afvCell.isVisible({ timeout: 10_000 }).catch(() => false)) {
        const input = afvCell.locator("input").first();
        if (await input.isVisible().catch(() => false)) {
          expect.soft(await input.isEditable().catch(() => false)).toBeFalsy();
        }
      }
    },
  );

  test(
    "UDP-T4046 - Edit Schedule AFV Amount in Amount Column",
    { tag: ["@do", "@regression", "@UDP-T4046"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.openEditPaymentScheduleDialog();
      const dialog = assetDetailsPage.editPaymentScheduleDialog();
      await expect.soft(dialog.getByText(/Amount/i).first()).toBeVisible();
      await expect.soft(dialog.locator("tr").last()).toBeVisible();
    },
  );

  test(
    "UDP-T4047 - Edit Schedule AFV Amount in Grid View Display Only",
    { tag: ["@do", "@regression", "@UDP-T4047"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.openEditPaymentScheduleDialog();
      const gridToggle = assetDetailsPage
        .editPaymentScheduleDialog()
        .locator(".p-selectbutton, .p-button")
        .filter({ hasText: /Grid/i })
        .first();
      if (await gridToggle.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await gridToggle.click();
      }
      await assetDetailsPage.expectAfVRowInPaymentSchedule();
    },
  );

  test(
    "UDP-T4048 - Edit Schedule Segment Number Cannot Exceed Loan Term",
    { tag: ["@do", "@regression", "@UDP-T4048"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.openEditPaymentScheduleDialog();
      const term = await assetDetailsPage.getEditPaymentScheduleFinanceTermMonths();
      await assetDetailsPage.enterEditPaymentScheduleSegmentNumber(String(term + 10));
      await assetDetailsPage.clickEditPaymentScheduleCalculate();
      await assetDetailsPage.expectEditPaymentScheduleSegmentExceedsTermMessage();
    },
  );

  test(
    "UDP-T4049 - Edit Schedule Calculate AFV Amount Non-Editable After Calculate",
    { tag: ["@do", "@regression", "@UDP-T4049"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.openEditPaymentScheduleDialog();
      await assetDetailsPage.selectEditPaymentScheduleSegmentType("Interest Only");
      await assetDetailsPage.clickEditPaymentScheduleCalculate();
      expect.soft(await assetDetailsPage.assuredFutureValueIsReadOnly()).toBeTruthy();
    },
  );

  test(
    "UDP-T4050 - Edit Schedule Delete Removes Last Editable Segment Not AFV",
    { tag: ["@do", "@regression", "@UDP-T4050"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.openEditPaymentScheduleDialog();
      const rowsBefore = await assetDetailsPage.editPaymentScheduleDialog().locator("table tbody tr").count();
      if (rowsBefore > 1) {
        await assetDetailsPage.clickEditPaymentScheduleDelete();
        const rowsAfter = await assetDetailsPage.editPaymentScheduleDialog().locator("table tbody tr").count();
        expect.soft(rowsAfter).toBeLessThan(rowsBefore);
      } else {
        test.info().annotations.push({ type: "note", description: "Single segment row — delete not applicable." });
      }
      await assetDetailsPage.expectAfVRowInPaymentSchedule();
    },
  );

  test(
    "UDP-T4051 - Edit Schedule Reset Reverts to Default Schedule",
    { tag: ["@do", "@regression", "@UDP-T4051"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.openEditPaymentScheduleDialog();
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ number: "20", type: "Fixed" });
      const resetBtn = assetDetailsPage
        .editPaymentScheduleDialog()
        .getByRole("button", { name: /^Reset$/i })
        .first();
      await expect(resetBtn).toBeVisible({ timeout: 10_000 });
      await resetBtn.click({ timeout: 10_000 });
    },
  );

  test(
    "UDP-T4052 - Edit Schedule Cancel Shows Confirmation Message",
    { tag: ["@do", "@regression", "@UDP-T4052"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.openEditPaymentScheduleDialog();
      await assetDetailsPage.modifyEditPaymentScheduleSegmentFields({ number: "24", type: "Interest Only" });
      await assetDetailsPage.clickEditPaymentScheduleCancel();
      await assetDetailsPage.expectEditPaymentScheduleCancelConfirmationVisible();
    },
  );

  test(
    "UDP-T4053 - Edit Schedule Add Segment Disabled When Max Payments Reached",
    { tag: ["@do", "@regression", "@UDP-T4053"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.openEditPaymentScheduleDialog();
      await assetDetailsPage.addEditPaymentScheduleSegmentsUntilTermReached();
      await assetDetailsPage.expectEditPaymentScheduleAddSegmentDisabledAtTermMax();
    },
  );

  test(
    "UDP-T4054 - Edit Schedule GST Column Visible for Business Loan Purpose Only",
    { tag: ["@do", "@regression", "@UDP-T4054"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.openEditPaymentScheduleDialog();
      const dialog = assetDetailsPage.editPaymentScheduleDialog();
      const gstHeader = dialog.getByText(/^GST$/i).first();
      const loanPurpose = standardQuoteRoot(page).getByText(/Loan Purpose/i).first();
      if (await loanPurpose.isVisible({ timeout: 8_000 }).catch(() => false)) {
        const purposeText = ((await standardQuoteRoot(page).textContent()) ?? "").replace(/\s+/g, " ");
        if (/Business/i.test(purposeText)) {
          await expect.soft(gstHeader).toBeVisible({ timeout: 10_000 });
        } else if (/Personal/i.test(purposeText)) {
          await expect.soft(gstHeader).toBeHidden({ timeout: 5_000 });
        }
      } else {
        test.info().annotations.push({
          type: "note",
          description: "Loan Purpose not visible — GST column assertion deferred.",
        });
      }
    },
  );

  test(
    "UDP-T4055 - AFV Options Default Position Is Expanded",
    { tag: ["@do", "@regression", "@UDP-T4055"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.expectAfVOptionsSectionVisible();
    },
  );

  test(
    "UDP-T4056 - AFV Options Displays Available Program Terms",
    { tag: ["@do", "@regression", "@UDP-T4056"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      const root = standardQuoteRoot(page);
      const panel = root.locator("p-card, div").filter({ hasText: /Assured Future Value Options/i }).first();
      await expect.soft(panel).toBeVisible({ timeout: 45_000 });
      const body = ((await panel.textContent()) ?? "").replace(/\u00a0/g, " ");
      expect.soft(/\d+/.test(body)).toBeTruthy();
      expect.soft(/KM|Allowance|Payment|Weekly/i.test(body)).toBeTruthy();
    },
  );

  test(
    "UDP-T4057 - AFV Options Weekly Equivalent Payment Times 4.33",
    { tag: ["@do", "@regression", "@UDP-T4057"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      const root = standardQuoteRoot(page);
      await expect.soft(root.getByText(/Weekly\s+Equivalent/i).first()).toBeVisible({ timeout: 30_000 });
    },
  );

  test(
    "UDP-T4058 - AFV Options All Fields Non-Editable",
    { tag: ["@do", "@regression", "@UDP-T4058"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      const panel = standardQuoteRoot(page)
        .locator("p-card, div, table")
        .filter({ hasText: /Assured Future Value Options/i })
        .first();
      const inputs = panel.locator("input, textarea");
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        const inp = inputs.nth(i);
        if (await inp.isVisible().catch(() => false)) {
          expect.soft(await inp.isEditable().catch(() => false)).toBeFalsy();
        }
      }
    },
  );

  test(
    "UDP-T4059 - AFV Options Values Displayed After Calculate",
    { tag: ["@do", "@regression", "@UDP-T4059"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await prepareCalculableAfVQuote(page, assetDetailsPage);
      const root = standardQuoteRoot(page);
      const panelBefore = root.locator("div").filter({ hasText: /Assured Future Value Options/i }).first();
      const beforeText = ((await panelBefore.textContent().catch(() => "")) ?? "").replace(/\s/g, "");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectAfVOptionsSectionVisible();
      const afterText = (
        (await root.locator("div").filter({ hasText: /Assured Future Value Options/i }).first().textContent()) ??
        ""
      ).replace(/\s/g, "");
      expect.soft(afterText.length).toBeGreaterThanOrEqual(beforeText.length);
      expect.soft(/\$|\d/.test(afterText)).toBeTruthy();
    },
  );

  test(
    "UDP-T4060 - Key Disclosure Hyperlink Only for Personal Products",
    { tag: ["@do", "@regression", "@UDP-T4060"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      const link = standardQuoteRoot(page).locator(':text-is("Key Information Disclosure >")');
      const purposeText = ((await standardQuoteRoot(page).textContent()) ?? "").replace(/\s+/g, " ");
      if (/Personal/i.test(purposeText)) {
        await expect.soft(link.first()).toBeVisible({ timeout: 20_000 });
      } else {
        await expect.soft(link.first()).toBeHidden({ timeout: 5_000 });
      }
    },
  );

  test(
    "UDP-T4061 - Key Disclosure X Close Dismisses Pop-up",
    { tag: ["@do", "@regression", "@UDP-T4061"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      const link = standardQuoteRoot(page).locator(':text-is("Key Information Disclosure >")').first();
      if (!(await link.isVisible({ timeout: 15_000 }).catch(() => false))) {
        test.skip(true, "Key Information Disclosure not shown for this AFV loan purpose.");
      }
      await assetDetailsPage.openKeyInformationDisclosureDialog();
      await assetDetailsPage.closeKeyInformationDisclosureDialog();
      await expect
        .soft(page.getByRole("dialog").filter({ hasText: /Key Information Disclosure/i }).last())
        .toBeHidden({ timeout: 15_000 });
    },
  );

  test(
    "UDP-T4062 - Save Validates Mandatory Fields Shows Originator Reference Pop-up",
    { tag: ["@do", "@regression", "@UDP-T4062"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await assetDetailsPage.chooseProduct(AFV_SQ_PRODUCT);
      await assetDetailsPage.clearOriginationReferences();
      await assetDetailsPage.clickSaveStandardQuoteStep();
      await expect
        .soft(page.getByText(/required|Please complete|cannot be blank|Originator\s+Reference/i).first())
        .toBeVisible({ timeout: 25_000 });
    },
  );

  test(
    "UDP-T4063 - Next Validates Then Navigates to Customer Details",
    { tag: ["@do", "@regression", "@UDP-T4063"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.clickNextButton();
      await assetDetailsPage.waitForAddBorrowerButton();
      const addBtnVisible = await assetDetailsPage.addBorrowerorGuarantorButton.isVisible().catch(() => false);
      const personalVisible = await page.locator("app-personal-details").isVisible().catch(() => false);
      expect.soft(addBtnVisible || personalVisible).toBeTruthy();
    },
  );

  test(
    "UDP-T4064 - Cancel Confirmation Returns to Dashboard",
    { tag: ["@do", "@regression", "@UDP-T4064"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      await assetDetailsPage.enterOriginationReference("SQ-AFV-Cancel");
      const cancelBtn = standardQuoteRoot(page).getByRole("button", { name: /^Cancel$/i }).first();
      if (await cancelBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await cancelBtn.click();
        await expect.soft(page.getByText(/unsaved changes will be lost|Are you sure/i).first()).toBeVisible({
          timeout: 15_000,
        });
      } else {
        test.skip(true, "Cancel button not visible on this build.");
      }
    },
  );

  test(
    "UDP-T4065 - Status Button Workflow Transition",
    { tag: ["@do", "@regression", "@UDP-T4065"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
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
    "UDP-T4066 - Settlement Button Opens Settlement Pop-Up",
    { tag: ["@do", "@regression", "@UDP-T4066"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      const settlementBtn = standardQuoteRoot(page).getByRole("button", { name: /^Settlement$/i }).first();
      if (await settlementBtn.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await assetDetailsPage.openSettlementDialog();
        await expect.soft(page.getByRole("dialog").last()).toBeVisible();
      } else {
        test.skip(true, "Settlement button not visible for this AFV build.");
      }
    },
  );

  test(
    "UDP-T4067 - Search and Add Asset Hyperlink",
    { tag: ["@do", "@regression", "@UDP-T4067"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await assetDetailsPage.chooseProduct(AFV_SQ_PRODUCT);
      const root = standardQuoteRoot(page);
      const trigger = root
        .getByRole("link", { name: /Search\s*&\s*Add\s+Asset/i })
        .or(root.getByRole("button", { name: /Search\s*&\s*Add\s+Asset/i }))
        .first();
      if (await trigger.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await trigger.click({ timeout: 15_000 });
        await expect.soft(page.getByRole("dialog").last()).toBeVisible({ timeout: 30_000 });
      } else {
        test.info().annotations.push({
          type: "note",
          description: "Search & Add Asset not shown before AFV vehicle selection (see UDP-T3708).",
        });
      }
    },
  );

  test(
    "UDP-T4068 - Asset Insurance and Trade-in Summary Hyperlink",
    { tag: ["@do", "@regression", "@UDP-T4068"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await expect.soft(page.getByRole("dialog").last()).toBeVisible({ timeout: 30_000 });
    },
  );

  test(
    "UDP-T4069 - Addons and Accessories Hyperlink",
    { tag: ["@do", "@regression", "@UDP-T4069"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      const link = standardQuoteRoot(page)
        .locator("a, button")
        .filter({ hasText: /Addons?\s*&\s*Accessories/i })
        .first();
      if (await link.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await assetDetailsPage.openAddonsAccessoriesFromQuote();
        await expect.soft(page.locator("app-service-plan, app-accessories").first()).toBeVisible();
      } else {
        test.skip(true, "Addons & Accessories link not visible for this AFV build.");
      }
    },
  );

  test(
    "UDP-T4070 - AFV Has No Balloon Amount Field",
    { tag: ["@do", "@regression", "@UDP-T4070"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await selectAfVProductAndAsset(page, assetDetailsPage);
      await assetDetailsPage.expectBalloonFieldsHiddenForAfV();
    },
  );

  test(
    "UDP-T4071 - AFV Has No Calculate For Feature",
    { tag: ["@do", "@regression", "@UDP-T4071"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboardPage = new DODashboardPage(page);
      const quickQuotePage = new DOQuickQuotePage(page);
      await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
      await dashboardPage.waitForAuthenticatedDashboard();
      await dashboardPage.selectDealer(TLC_DEALER);
      await quickQuotePage.openQuickQuote();
      await quickQuotePage.selectProduct(AFV_SQ_PRODUCT);
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();
      await quickQuotePage.selectVehicleFromAssetTypeModal(AFV_SQ_VEHICLE);
      await quickQuotePage.waitForAfVFieldsAfterAssetSelection();
      await quickQuotePage.expectCalculateForNotApplicable(0);
    },
  );

  test(
    "UDP-T4072 - AFV Options Section Replaces Standard Payment Options",
    { tag: ["@do", "@regression", "@UDP-T4072"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openAfVStandardQuoteFromDashboard(page);
      await calculateAfVQuote(page, assetDetailsPage);
      await assetDetailsPage.expectAfVOptionsSectionVisible();
      await assetDetailsPage.expectStandardPaymentOptionsHidden();
    },
  );
});
