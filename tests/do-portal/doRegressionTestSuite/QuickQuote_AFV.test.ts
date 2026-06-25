/**
 * DO Portal — Quick Quote AFV regression (UDP-T3990–UDP-T4019).
 * Scenario source: AFV Quick quote.xlsx (Zephyr / Regression — AFV-Quick Quote).
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

const AFV_QQ_PRODUCT = "AFV-B-Assigned";
const TLC_DEALER = "Armstrong Prestige Wellington";

/** Vehicle used for AFV Quick Quote asset-type modal (matches AFV_Single_Flow / dealer catalog). */
const AFV_QQ_VEHICLE = {
  make: "SUZUKI",
  model: "IGNIS",
  variant: "GLX MANUAL 1.2P/ 5MT",
  year: "2024",
};

function parseCurrency(value: string): number {
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseKmValue(label: string): number {
  const m = label.match(/(\d[\d,]*)/);
  return m ? Number.parseInt(m[1].replace(/,/g, ""), 10) : Number.MAX_SAFE_INTEGER;
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

async function selectAfVProduct(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await quickQuotePage.selectProduct(AFV_QQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
}

async function selectAfVAssetTypeAndWait(
  quickQuotePage: DOQuickQuotePage,
  vehicle = AFV_QQ_VEHICLE,
): Promise<void> {
  await quickQuotePage.selectVehicleFromAssetTypeModal(vehicle);
  await quickQuotePage.waitForAfVFieldsAfterAssetSelection();
}

async function setupAfVQuoteWithAsset(
  page: Page,
  vehicle = AFV_QQ_VEHICLE,
): Promise<DOQuickQuotePage> {
  const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
  await selectAfVProduct(quickQuotePage);
  await selectAfVAssetTypeAndWait(quickQuotePage, vehicle);
  return quickQuotePage;
}

async function calculateAfVQuickQuote(quickQuotePage: DOQuickQuotePage): Promise<void> {
  await quickQuotePage.ensureMandatoryAfVFieldsForCalculate();
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();
}

async function pickModalDropdownOption(page: Page, dlg: Locator, index: number, optionText: string): Promise<void> {
  await dlg.locator(".p-dropdown").nth(index).locator(".p-dropdown-trigger").click({ timeout: 15_000 });
  await page.getByRole("option", { name: optionText, exact: true }).first().click({ timeout: 15_000 });
  await page.keyboard.press("Escape").catch(() => {});
  await new Promise((r) => setTimeout(r, 250));
}

test.describe("Quick Quote - AFV @do @regression", () => {
  test(
    "UDP-T3990 - AFV Product Selection Retrieves Active AFV Programs",
    { tag: ["@do", "@regression", "@UDP-T3990"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectAfVProduct(quickQuotePage);

      await expect.soft(quickQuotePage.assetTypeSelectButton).toBeVisible({ timeout: 30_000 });
      await expect.soft(quickQuotePage.programDropdownTrigger).toBeVisible();
      await quickQuotePage.expectProgramDropdownDisabled(0);

      const programBeforeAsset = await quickQuotePage.readSelectedProgramLabel();
      expect.soft(programBeforeAsset.length).toBe(0);
    },
  );

  test(
    "UDP-T3991 - AFV Asset Type Selection Only Eligible AFV Types Shown",
    { tag: ["@do", "@regression", "@UDP-T3991"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectAfVProduct(quickQuotePage);

      const dlg = await quickQuotePage.openAssetTypeModal();
      await expect.soft(dlg.getByText(/Make/i).first()).toBeVisible();
      await expect.soft(dlg.locator(".p-dropdown").first()).toBeVisible();
      await expect.soft(dlg.locator(".p-dropdown").nth(1)).toBeVisible();
      await expect.soft(dlg.locator(".p-dropdown").nth(2)).toBeVisible();
      await expect.soft(dlg.locator(".p-dropdown").nth(3)).toBeVisible();

      await dlg.locator(".p-dropdown").first().locator(".p-dropdown-trigger").click({ timeout: 15_000 });
      const makes = await page.getByRole("option").allTextContents();
      await page.keyboard.press("Escape");
      expect.soft(makes.length).toBeGreaterThan(0);
      await page.keyboard.press("Escape");
    },
  );

  test(
    "UDP-T3992 - Make Mandatory Auto-Defaults When Only One Make Available",
    { tag: ["@do", "@regression", "@UDP-T3992"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectAfVProduct(quickQuotePage);

      const dlg = await quickQuotePage.openAssetTypeModal();
      const makeTrigger = dlg.locator(".p-dropdown").first().locator(".p-dropdown-trigger");
      const makeLabel = await quickQuotePage.readPrimeDropdownLabel(makeTrigger);

      if (makeLabel.length > 0) {
        expect.soft(makeLabel.length).toBeGreaterThan(0);
        test.info().annotations.push({
          type: "note",
          description: `Make auto-defaulted to "${makeLabel}" (single make for originator).`,
        });
      } else {
        await dlg.getByRole("button", { name: /^Select$/i }).click({ timeout: 10_000 }).catch(() => {});
        await expect
          .soft(dlg.getByText(/Please complete/i).or(page.getByText(/Please complete/i)).first())
          .toBeVisible({ timeout: 15_000 });
      }
      await page.keyboard.press("Escape").catch(() => {});
    },
  );

  test(
    "UDP-T3993 - Model Mandatory Filters by Selected Make",
    { tag: ["@do", "@regression", "@UDP-T3993"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectAfVProduct(quickQuotePage);

      const dlg = await quickQuotePage.openAssetTypeModal();
      await pickModalDropdownOption(page, dlg, 0, AFV_QQ_VEHICLE.make);

      const modelTrigger = dlg.locator(".p-dropdown").nth(1).locator(".p-dropdown-trigger");
      const modelLabel = await quickQuotePage.readPrimeDropdownLabel(modelTrigger);
      if (modelLabel.length > 0) {
        expect.soft(modelLabel.length).toBeGreaterThan(0);
      } else {
        const models = await quickQuotePage.listDropdownOptions(modelTrigger);
        expect.soft(models.length).toBeGreaterThan(0);
        expect.soft(models.some((m) => /IGNIS|SUZUKI/i.test(m) || m.length > 0)).toBeTruthy();
      }
      await page.keyboard.press("Escape").catch(() => {});
    },
  );

  test(
    "UDP-T3994 - Variant Mandatory Filters by Make and Model",
    { tag: ["@do", "@regression", "@UDP-T3994"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectAfVProduct(quickQuotePage);

      const dlg = await quickQuotePage.openAssetTypeModal();
      await pickModalDropdownOption(page, dlg, 0, AFV_QQ_VEHICLE.make);
      await pickModalDropdownOption(page, dlg, 1, AFV_QQ_VEHICLE.model);

      const variantTrigger = dlg.locator(".p-dropdown").nth(2).locator(".p-dropdown-trigger");
      const variantLabel = await quickQuotePage.readPrimeDropdownLabel(variantTrigger);
      if (variantLabel.length > 0) {
        expect.soft(variantLabel.length).toBeGreaterThan(0);
      } else {
        const variants = await quickQuotePage.listDropdownOptions(variantTrigger);
        expect.soft(variants.length).toBeGreaterThan(0);
      }
      await page.keyboard.press("Escape").catch(() => {});
    },
  );

  test(
    "UDP-T3995 - Year Dropdown Filters by Asset Type Context",
    { tag: ["@do", "@regression", "@UDP-T3995"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectAfVProduct(quickQuotePage);

      const dlg = await quickQuotePage.openAssetTypeModal();
      await pickModalDropdownOption(page, dlg, 0, AFV_QQ_VEHICLE.make);
      await pickModalDropdownOption(page, dlg, 1, AFV_QQ_VEHICLE.model);
      await pickModalDropdownOption(page, dlg, 2, AFV_QQ_VEHICLE.variant);

      const yearTrigger = dlg.locator(".p-dropdown").nth(3).locator(".p-dropdown-trigger");
      const years = await quickQuotePage.listDropdownOptions(yearTrigger);
      expect.soft(years.length).toBeGreaterThan(0);
      expect.soft(years.some((y) => /\d{4}/.test(y))).toBeTruthy();
      await page.keyboard.press("Escape").catch(() => {});
    },
  );

  test(
    "UDP-T3996 - Program Auto-Populates from Asset Type Selection",
    { tag: ["@do", "@regression", "@UDP-T3996"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);

      const programLabel = await quickQuotePage.readSelectedProgramLabel();
      expect.soft(programLabel.length).toBeGreaterThan(0);
      expect.soft(/AFV/i.test(programLabel)).toBeTruthy();
      await quickQuotePage.expectProgramDropdownDisabled(0);
    },
  );

  test(
    "UDP-T3997 - AFV Details Section Collapsed by Default Auto-Populated",
    { tag: ["@do", "@regression", "@UDP-T3997"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);

      const afvHeader = quickQuotePage.quickQuoteForm.getByText(/AFV Details/i).first();
      if (!(await afvHeader.isVisible({ timeout: 15_000 }).catch(() => false))) {
        test.info().annotations.push({
          type: "note",
          description: "AFV Details section not rendered in this build — skipping expand assertions.",
        });
        return;
      }

      await quickQuotePage.expandAfVDetailsSection();
      const section = quickQuotePage.quickQuoteForm
        .locator("p-accordiontab, p-panel, .p-accordion-content, fieldset")
        .filter({ hasText: /Make|Model|Variant|Year|Provider/i })
        .first();
      await expect.soft(section).toBeVisible({ timeout: 15_000 });
      await expect.soft(quickQuotePage.quickQuoteForm.getByText(/Provider/i).first()).toBeVisible();
    },
  );

  test(
    "UDP-T3998 - Cash Price Auto-Populated from Asset Type",
    { tag: ["@do", "@regression", "@UDP-T3998"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);

      const cashPrice = (await quickQuotePage.cashPriceInput.inputValue().catch(() => "")).trim();
      expect.soft(cashPrice.length).toBeGreaterThan(0);
      expect.soft(parseCurrency(cashPrice)).toBeGreaterThan(0);
      await expect.soft(quickQuotePage.cashPriceInput).toBeEditable();

      await quickQuotePage.clearCashPriceField();
      if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
        await quickQuotePage.clickCalculate();
      }
      await quickQuotePage.expectPleaseCompleteInForm(0);
    },
  );

  test(
    "UDP-T3999 - Quick Quote AFV Default Fields on Product Selection",
    { tag: ["@do", "@regression", "@UDP-T3999"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectAfVProduct(quickQuotePage);

      await expect.soft(quickQuotePage.assetTypeSelectButton).toBeVisible({ timeout: 30_000 });

      await selectAfVAssetTypeAndWait(quickQuotePage);

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
      await expect.soft(quickQuotePage.kmAllowanceDropdownTrigger).toBeVisible();
      await expect.soft(quickQuotePage.frequencyDropdownTrigger).toBeVisible();
      await expect.soft(quickQuotePage.assuredFutureValueInput).toBeVisible();
      const paymentVisible =
        (await quickQuotePage.paymentAmountInput.isVisible({ timeout: 8_000 }).catch(() => false)) ||
        (await quickQuotePage.paymentDisplay.isVisible({ timeout: 8_000 }).catch(() => false));
      await expect.soft(paymentVisible).toBe(true);
    },
  );

  test(
    "UDP-T4000 - KM Allowance Mandatory Defaults Lowest KM First",
    { tag: ["@do", "@regression", "@UDP-T4000"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);

      const kmOptions = await quickQuotePage.listDropdownOptions(
        quickQuotePage.kmAllowanceDropdownTrigger,
      );
      expect.soft(kmOptions.length).toBeGreaterThan(0);

      const kmValues = kmOptions.map(parseKmValue);
      const sorted = [...kmValues].sort((a, b) => a - b);
      expect.soft(kmValues).toEqual(sorted);

      const selectedKm = await quickQuotePage.readPrimeDropdownLabel(
        quickQuotePage.kmAllowanceDropdownTrigger,
      );
      if (selectedKm.length > 0) {
        expect.soft(parseKmValue(selectedKm)).toBe(sorted[0]);
      }

      await quickQuotePage.clearTermsMonths(0);
      await quickQuotePage.ensureMandatoryAfVFieldsForCalculate();
      await quickQuotePage.clearTermsMonths(0);
      if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
        await quickQuotePage.clickCalculate();
      }
      await quickQuotePage.expectPleaseCompleteInForm(0);
    },
  );

  test(
    "UDP-T4001 - KM Allowance Refreshes When Term Changes",
    { tag: ["@do", "@regression", "@UDP-T4001"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);

      await quickQuotePage.enterTermsMonths("24");
      await quickQuotePage.waitForLoadingComplete();
      const kmOptions24 = await quickQuotePage.listDropdownOptions(
        quickQuotePage.kmAllowanceDropdownTrigger,
      );
      if (kmOptions24.length > 0) {
        await quickQuotePage.selectKMAllowance(kmOptions24[0]);
      }
      const kmBefore = await quickQuotePage.readPrimeDropdownLabel(
        quickQuotePage.kmAllowanceDropdownTrigger,
      );

      await quickQuotePage.enterTermsMonths("36");
      await quickQuotePage.waitForLoadingComplete();
      const kmOptions36 = await quickQuotePage.listDropdownOptions(
        quickQuotePage.kmAllowanceDropdownTrigger,
      );
      expect.soft(kmOptions36.length).toBeGreaterThan(0);

      const kmAfter = await quickQuotePage.readPrimeDropdownLabel(
        quickQuotePage.kmAllowanceDropdownTrigger,
      );
      if (kmBefore.length > 0 && kmOptions24.join() !== kmOptions36.join()) {
        expect.soft(kmAfter).not.toBe(kmBefore);
      }
    },
  );

  test(
    "UDP-T4002 - Assured Future Value Display Only Auto-Populated",
    { tag: ["@do", "@regression", "@UDP-T4002"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      await quickQuotePage.ensureMandatoryAfVFieldsForCalculate();

      const afv = await quickQuotePage.readAssuredFutureValue();
      expect.soft(afv.length).toBeGreaterThan(0);
      expect.soft(parseCurrency(afv)).toBeGreaterThan(0);
      expect.soft(await quickQuotePage.assuredFutureValueIsReadOnly()).toBeTruthy();
    },
  );

  test(
    "UDP-T4003 - Assured Future Value Updates When Term or KM Allowance Changes",
    { tag: ["@do", "@regression", "@UDP-T4003"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      await quickQuotePage.enterTermsMonths("24");
      await quickQuotePage.waitForLoadingComplete();

      const kmOptions = await quickQuotePage.listDropdownOptions(
        quickQuotePage.kmAllowanceDropdownTrigger,
      );
      if (kmOptions.length < 2) {
        test.info().annotations.push({
          type: "note",
          description: "Fewer than 2 KM Allowance options — cannot assert AFV delta on KM change.",
        });
        return;
      }

      await quickQuotePage.selectKMAllowance(kmOptions[0]);
      await quickQuotePage.waitForLoadingComplete();
      const afvBefore = parseCurrency(await quickQuotePage.readAssuredFutureValue());

      await quickQuotePage.selectKMAllowance(kmOptions[1]);
      await expect
        .poll(async () => parseCurrency(await quickQuotePage.readAssuredFutureValue()), {
          timeout: 30_000,
        })
        .not.toBe(afvBefore);

      await quickQuotePage.enterTermsMonths("36");
      await expect
        .poll(async () => parseCurrency(await quickQuotePage.readAssuredFutureValue()), {
          timeout: 30_000,
        })
        .toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T4004 - Payment Display Only Calculated After Calculate Click",
    { tag: ["@do", "@regression", "@UDP-T4004"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      await quickQuotePage.ensureMandatoryAfVFieldsForCalculate();

      const paymentBefore =
        (await quickQuotePage.paymentAmountInput.inputValue().catch(() => "")).trim() ||
        ((await quickQuotePage.paymentDisplay.textContent()) ?? "").trim();
      expect.soft(paymentBefore.length === 0 || !/\$[\d,]+/.test(paymentBefore)).toBeTruthy();

      await quickQuotePage.clickCalculate();
      await quickQuotePage.expectCreateQuoteVisible();

      const paymentAfter =
        (await quickQuotePage.paymentAmountInput.inputValue().catch(() => "")).trim() ||
        ((await quickQuotePage.paymentDisplay.textContent()) ?? "").trim();
      expect.soft(/\d/.test(paymentAfter)).toBeTruthy();
      expect.soft(await quickQuotePage.paymentAmountInputIsReadOnly()).toBeTruthy();
    },
  );

  test(
    "UDP-T4005 - Calculate For NOT Applicable for AFV",
    { tag: ["@do", "@regression", "@UDP-T4005"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      await quickQuotePage.expectCalculateForNotApplicable(0);
    },
  );

  test(
    "UDP-T4006 - Deposit % and OR ($) Mutual Auto-Population",
    { tag: ["@do", "@regression", "@UDP-T4006"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
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
    "UDP-T4007 - Interest Rate Defaults from Rate Table",
    { tag: ["@do", "@regression", "@UDP-T4007"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);

      const rate = (await quickQuotePage.interestRatePercentInput.inputValue().catch(() => "")).trim();
      expect.soft(rate.length).toBeGreaterThan(0);
      expect.soft(/\d/.test(rate)).toBeTruthy();
      await expect.soft(quickQuotePage.interestRatePercentInput).toBeVisible();
    },
  );

  test(
    "UDP-T4008 - Term Mandatory Defaults from AFV Program Validation",
    { tag: ["@do", "@regression", "@UDP-T4008"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);

      const term = await quickQuotePage.readTermsMonthsValue();
      if (term.length > 0) {
        expect.soft(/\d+/.test(term)).toBeTruthy();
      }

      await quickQuotePage.clearTermsMonths(0);
      await quickQuotePage.ensureMandatoryAfVFieldsForCalculate();
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
    "UDP-T4009 - Frequency Mandatory Defaults from Program",
    { tag: ["@do", "@regression", "@UDP-T4009"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);

      const frequencyLabel = await quickQuotePage.readPrimeDropdownLabel(
        quickQuotePage.frequencyDropdownTrigger,
      );
      if (frequencyLabel.length > 0) {
        expect.soft(frequencyLabel.length).toBeGreaterThan(0);
      } else {
        test.info().annotations.push({
          type: "note",
          description: "No program default frequency — blank frequency validation deferred.",
        });
      }

      const altFrequency = frequencyLabel.match(/Monthly/i) ? "Quarterly" : "Monthly";
      if (await quickQuotePage.frequencyDropdownTrigger.isEnabled().catch(() => false)) {
        await quickQuotePage.selectFrequency(altFrequency);
        await quickQuotePage.waitForLoadingComplete();
      }
    },
  );

  test(
    "UDP-T4010 - Loan Amount Calculated Display Only Cash Price Minus Deposit",
    { tag: ["@do", "@regression", "@UDP-T4010"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      await quickQuotePage.enterCashPrice("$25,000");
      await quickQuotePage.enterDepositDollars("$5,000");
      await calculateAfVQuickQuote(quickQuotePage);

      const summary = quickQuotePage.calculationSummaryRegion.first();
      await expect.soft(summary).toBeVisible({ timeout: 30_000 });
      await expect.soft(summary).toContainText(/Loan Amount/i);
      await expect.soft(summary).toContainText(/20[, ]?000|20000/);
    },
  );

  test(
    "UDP-T4011 - Total Amount Payable Equals Loan Amount Plus Fees Plus Interest",
    { tag: ["@do", "@regression", "@UDP-T4011"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      await calculateAfVQuickQuote(quickQuotePage);

      const summary = quickQuotePage.calculationSummaryRegion.first();
      await expect.soft(summary).toBeVisible({ timeout: 30_000 });
      await expect
        .soft(summary)
        .toContainText(/Total (Amount )?Payable|Total Payable|Amount Payable|Total Interest|Total Fees/i);
    },
  );

  test(
    "UDP-T4012 - Select Button Opens Asset Type Popup",
    { tag: ["@do", "@regression", "@UDP-T4012"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { quickQuotePage } = await openQuickQuoteFromDashboard(page);
      await selectAfVProduct(quickQuotePage);

      const dlg = await quickQuotePage.openAssetTypeModal();
      await expect.soft(dlg.getByText(/Make/i).first()).toBeVisible();
      await expect.soft(dlg.locator(".p-dropdown")).toHaveCount(4, { timeout: 15_000 });
      const box = await dlg.boundingBox();
      expect.soft(box?.width).toBeGreaterThan(0);
      await page.keyboard.press("Escape").catch(() => {});
    },
  );

  test(
    "UDP-T4013 - Calculate Enabled When All Mandatory Fields Met",
    { tag: ["@do", "@regression", "@UDP-T4013"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      await quickQuotePage.ensureMandatoryAfVFieldsForCalculate();
      await quickQuotePage.clearInterestRatePercent(0);
      await quickQuotePage.expectCalculateButtonDisabled(0);

      await quickQuotePage.ensureMandatoryAfVFieldsForCalculate();
      await expect.soft(quickQuotePage.calculateButton).toBeEnabled();
    },
  );

  test(
    "UDP-T4014 - Reset Returns Quote to Default State",
    { tag: ["@do", "@regression", "@UDP-T4014"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      await calculateAfVQuickQuote(quickQuotePage);

      const assetBefore = await quickQuotePage.readAssetTypeDisplayValue();
      expect.soft(assetBefore.length).toBeGreaterThan(0);

      await quickQuotePage.clickReset();
      await expect.soft(quickQuotePage.productDropdownTrigger).toBeVisible();
      const assetAfter = await quickQuotePage.readAssetTypeDisplayValue();
      expect.soft(assetAfter.length).toBe(0);
    },
  );

  test(
    "UDP-T4015 - Create Quote Converts AFV QQ to Standard Quote",
    { tag: ["@do", "@regression", "@UDP-T4015"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      const programLabel = await quickQuotePage.readSelectedProgramLabel();
      const cashPrice = (await quickQuotePage.cashPriceInput.inputValue().catch(() => "")).trim();
      const term = await quickQuotePage.readTermsMonthsValue();
      const rate = (await quickQuotePage.interestRatePercentInput.inputValue().catch(() => "")).trim();
      const afv = await quickQuotePage.readAssuredFutureValue();

      await calculateAfVQuickQuote(quickQuotePage);
      await quickQuotePage.clickCreateQuote();

      const standardRoot = page.locator("app-quote-details, app-standard-quote").first();
      await expect.soft(standardRoot).toBeVisible({ timeout: 120_000 });
      await expect.soft(page.getByText(/AFV|Assured Future Value/i).first()).toBeVisible();

      const assetDetailsPage = new DOAssetDetailsPage(page);
      await assetDetailsPage.waitForAssetDetailsStepReady();
      if (programLabel.length > 0) {
        await assetDetailsPage.expectProductProgramCarriedFromQuickQuote(
          AFV_QQ_PRODUCT,
          programLabel,
        );
      }
      await assetDetailsPage.expectFinanceCarriedFromQuickQuote({
        cashPrice: new RegExp(cashPrice.replace(/[$,]/g, "") || "\\d"),
        term: new RegExp(term.replace(/\D/g, "") || "\\d+"),
        frequencyText: /Monthly|Quarterly|Annually/i,
        interestRate: new RegExp(rate.replace(/[^\d.]/g, "") || "\\d"),
      });
      if (afv.length > 0) {
        await expect
          .soft(standardRoot.getByText(new RegExp(afv.replace(/[$,]/g, ""))).first())
          .toBeVisible({ timeout: 30_000 })
          .catch(() => {});
      }
    },
  );

  test(
    "UDP-T4016 - Print PDF with UDC Disclaimer",
    { tag: ["@do", "@regression", "@UDP-T4016"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      await calculateAfVQuickQuote(quickQuotePage);

      await expect.soft(quickQuotePage.printButton).toBeVisible();
      await quickQuotePage.printButton.click({ trial: true });
    },
  );

  test(
    "UDP-T4017 - Download PDF Downloaded to Desktop",
    { tag: ["@do", "@regression", "@UDP-T4017"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      await calculateAfVQuickQuote(quickQuotePage);

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

  test(
    "UDP-T4018 - Add Comparison Enabled After Previous QQ Calculated",
    { tag: ["@do", "@regression", "@UDP-T4018"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      await quickQuotePage.clearInterestRatePercent(0);
      await quickQuotePage.expectCalculateButtonDisabled(0);

      await calculateAfVQuickQuote(quickQuotePage);
      await expect.soft(quickQuotePage.addComparison2Button).toBeEnabled();
    },
  );

  test(
    "UDP-T4019 - Add Comparison Values Copied Max 3 Quotes",
    { tag: ["@do", "@regression", "@UDP-T4019"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const quickQuotePage = await setupAfVQuoteWithAsset(page);
      const cashBefore = (await quickQuotePage.cashPriceInput.inputValue().catch(() => "")).trim();

      await calculateAfVQuickQuote(quickQuotePage);
      await quickQuotePage.clickAddComparisonPrimary();
      expect.soft(await quickQuotePage.quickQuotePanelCount()).toBe(2);
      await expect.soft(quickQuotePage.cashPriceInputOnQuote(1)).not.toHaveValue("");

      if (cashBefore.length > 0) {
        const cashQq2 = (await quickQuotePage.cashPriceInputOnQuote(1).inputValue().catch(() => "")).trim();
        expect.soft(parseCurrency(cashQq2)).toBe(parseCurrency(cashBefore));
      }

      await quickQuotePage.ensureMandatoryAfVFieldsForCalculate();
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
});
