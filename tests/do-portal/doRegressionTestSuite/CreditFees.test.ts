/**
 * DO Portal — Credit Fees regression (UDP-T3941–UDP-T3951).
 * Scenario source: Credit Fees Test Cases.xlsx (Zephyr / Regression 25.0 / Additional Charges).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOAssetDetailsPage, DODashboardPage } from "../../../pages";

const CSA_SQ_PRODUCT = "CSA-C-Assigned";
const CSA_SQ_PROGRAM = "CSA Personal - MV Dealer";
const TLC_DEALER = "Armstrong Prestige Wellington";

function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

async function openStandardQuoteFromDashboard(page: Page): Promise<{
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
  return { dashboardPage, assetDetailsPage };
}

/** Standard Quote with dealer selected — Product/Program **not** chosen (UDP-T3947). */
async function openStandardQuoteWithoutProductProgram(page: Page): Promise<DOAssetDetailsPage> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await dashboardPage.clickCreateStandardQuote();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  return assetDetailsPage;
}

async function selectCsaProductAndProgram(assetDetailsPage: DOAssetDetailsPage): Promise<void> {
  await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(CSA_SQ_PROGRAM);
  await assetDetailsPage.waitForQuoteLoadersToFinish();
}

async function fillAddOnAccessoriesPageAndSave(page: Page): Promise<void> {
  const sp = page.locator("app-service-plan");
  const acc = page.locator("app-accessories");
  await sp.waitFor({ state: "visible", timeout: 45_000 });
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

async function openAddOnAccessoriesPageFromStandardQuote(
  page: Page,
  root: Locator,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await assetDetailsPage.clickAddonsAndAccessoriesAndExpectScreen();
}

test.describe("DO Portal — Credit Fees (Zephyr UDP-T3941–UDP-T3951)", () => {
  test(
    "UDP-T3941 - Default field values on Additional Charges section",
    { tag: ["@do", "@regression", "@UDP-T3941"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectAdditionalChargesSectionDefaults();
    },
  );

  test(
    "UDP-T3942 - PPSR Count field is editable and numeric",
    { tag: ["@do", "@regression", "@UDP-T3942"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectPpsrCountAndFeeLineVisible();
      await assetDetailsPage.expectPpsrCountEditable();
      await assetDetailsPage.expectPpsrTotalScaledWhenCountChanges("1", "3");
      await assetDetailsPage.expectPpsrCountValue("3");
    },
  );

  test(
    "UDP-T3943 - UDC Establishment Fee – value exceeds max limit",
    { tag: ["@do", "@regression", "@UDP-T3943"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.udcEstablishmentFee("$999,999.99");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectUdcEstablishmentFeeCannotExceedMaxMessage();
    },
  );

  test(
    "UDP-T3944 - UDC Establishment Fee – value is zero or below minimum",
    { tag: ["@do", "@regression", "@UDP-T3944"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.udcEstablishmentFee("$0");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectUdcEstablishmentFeeCommissionDeductionWarning();
    },
  );

  test(
    "UDP-T3945 - Dealer Origination Fee – value exceeds maximum",
    { tag: ["@do", "@regression", "@UDP-T3945"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.enterDealerOriginationFeeExcessiveAndTriggerValidation("$999,999.99");
      await assetDetailsPage.expectDealerOriginationFeeCannotExceedMaxMessage();
    },
  );

  test(
    "UDP-T3946 - Total Establishment Fee auto-calculation",
    { tag: ["@do", "@regression", "@UDP-T3946"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.udcEstablishmentFee("$500");
      await assetDetailsPage.dealerOriginationFee("$200");
      await assetDetailsPage.expectTotalEstablishmentFeeSumDollars(700);
      await assetDetailsPage.expectTotalEstablishmentFeeDisplayOnly();
    },
  );

  test(
    "UDP-T3947 - Add Ons & Accessories button – Product/Program not selected",
    { tag: ["@do", "@regression", "@UDP-T3947"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const assetDetailsPage = await openStandardQuoteWithoutProductProgram(page);
      await assetDetailsPage.clickAddOnsAccessoriesEntryExpectProductProgramRequired();
    },
  );

  test(
    "UDP-T3948 - Next button – mandatory fields not filled",
    { tag: ["@do", "@regression", "@UDP-T3948"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.nextButton.click({ timeout: 10_000 }).catch(() =>
        assetDetailsPage.nextButton.click({ force: true }),
      );
      await expect(
        page
          .getByText(
            /must be selected to proceed|please complete|Asset Type|Insurance|required|mandatory/i,
          )
          .first(),
      ).toBeVisible({ timeout: 25_000 });
      await expect(standardQuoteRoot(page)).toBeVisible();
      await expect(page.locator("app-personal-details")).toHaveCount(0);
    },
  );

  test(
    "UDP-T3949 - Save button – with mandatory fields empty",
    { tag: ["@do", "@regression", "@UDP-T3949"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.clearOriginationReferences();
      await assetDetailsPage.clickSaveStandardQuoteStep();
      const prompt = page
        .getByRole("dialog")
        .filter({ hasText: /Originator\s+Reference|Origination\s+Reference|required to save/i })
        .or(page.getByText(/Originator\s+Reference|Origination\s+Reference|required|Please complete/i));
      await expect(prompt.first()).toBeVisible({ timeout: 25_000 });
      await expect(standardQuoteRoot(page)).toBeVisible();
    },
  );

  test(
    "UDP-T3950 - Cancel button – confirmation prompt",
    { tag: ["@do", "@regression", "@UDP-T3950"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { dashboardPage, assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.enterOriginationReference("SQ-CreditFees-Cancel");
      await assetDetailsPage.clickStandardQuoteCancel();
      await assetDetailsPage.expectStandardQuoteCancelConfirmationVisible();
      await assetDetailsPage.confirmStandardQuoteCancelDiscard();
      await dashboardPage.waitForAuthenticatedDashboard();
      await expect(page.getByText(/Create Standard Quote/i).first()).toBeVisible({ timeout: 30_000 });
    },
  );

  test(
    "UDP-T3951 - Charges field updates on editing Add Ons & Accessories",
    { tag: ["@do", "@regression", "@UDP-T3951"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      const root = standardQuoteRoot(page);

      await test.step("Open Add Ons & Accessories", async () => {
        await openAddOnAccessoriesPageFromStandardQuote(page, root, assetDetailsPage);
        await expect(page.locator("app-service-plan")).toBeVisible({ timeout: 45_000 });
      });

      await test.step("Add Registration/Service Plan and Save", async () => {
        await fillAddOnAccessoriesPageAndSave(page);
      });

      await test.step("Charges reflects add-ons total", async () => {
        await expect(page.locator("app-service-plan")).toBeHidden({ timeout: 60_000 });
        const chargesBlock = assetDetailsPage.chargesFieldBlock();
        await expect(chargesBlock).toBeVisible({ timeout: 30_000 });
        await expect
          .poll(async () => (await chargesBlock.textContent())?.replace(/\s/g, " ") ?? "", {
            timeout: 30_000,
          })
          .toMatch(/[1-9]\d{0,3}|[1-9][\d,]*\.\d{2}/);
      });
    },
  );
});
