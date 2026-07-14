/**
 * Temporary probe — delete after T3967 data discovery.
 */
import { expect, test } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOAssetDetailsPage, DODashboardPage, DOSettlementPage } from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import settlementData from "../../../testData/do-portal/settlementTestData.json";

async function openSettlementSearch(page: Page): Promise<DOSettlementPage> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  const settlementPage = new DOSettlementPage(page);
  const addAssetPage = new DOAddAssetPage(page);

  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(settlementData.dealer);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectTermLoanProduct();
  await assetDetailsPage.enterAsset("Car and Light Commercial /");
  await assetDetailsPage.selectCondition("Used");
  await assetDetailsPage.openAssetInsuranceTradeInSummary();
  await assetDetailsPage.clickAssetSummaryEditButton();
  await addAssetPage.enterAssetValue("$20,000");
  await addAssetPage.selectCondition("Used");
  await addAssetPage.selectYear("2025");
  await addAssetPage.enterMake("Toyota");
  await addAssetPage.enterModel("Hilux");
  await addAssetPage.enterVariant("Top");
  await addAssetPage.clickSummitButton();
  await addAssetPage.clickCrossButton();
  await assetDetailsPage.termsOfFinance("36");
  await assetDetailsPage.interestRate("9");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await assetDetailsPage.enterOriginationReference("SQ-Settlement-Probe");
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero({ timeoutMs: 90_000 });
  await assetDetailsPage.clickNextAndExpectCustomerDetails("SQ-Settlement-Probe");
  await assetDetailsPage.clickStandardQuoteStepTab(/Asset\s*Details/i);
  await assetDetailsPage.waitForAssetDetailsStepReady();
  await settlementPage.openSettlementFromQuote();
  await settlementPage.expectSettlementSearchScreenVisible();
  return settlementPage;
}

const REGOS = ["214", "NN8838", "hg7765", "BC7474"];

for (const rego of REGOS) {
  test(`probe settlement after next rego=${rego}`, async ({ page }) => {
    test.setTimeout(300_000);
    const settlementPage = await openSettlementSearch(page);
    await settlementPage.enterRego(rego);
    await settlementPage.clearVin();
    const dialogBefore = settlementPage.activeDialog();
    await expect(dialogBefore).toBeVisible();
    const next = dialogBefore.getByRole("button", { name: /^Next$/i }).last();
    await next.click({ timeout: 20_000 });
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(2_000);
      const dialogVisible = await settlementPage.activeDialog().isVisible().catch(() => false);
      const dialogText = dialogVisible
        ? ((await settlementPage.activeDialog().innerText().catch(() => "")) ?? "").replace(/\s+/g, " ")
        : "";
      const toastText = ((await page.locator(".p-toast-message, .p-toast, [class*='toast']").allInnerTexts().catch(() => [])) ?? [])
        .join(" | ")
        .replace(/\s+/g, " ");
      const body = ((await page.locator("body").innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
      console.log(
        `REGO=${rego} T=${i * 2}s DIALOG_VISIBLE=${dialogVisible} DIALOG=${dialogText.slice(0, 400)} TOAST=${toastText.slice(0, 200)}`,
      );
      if (/arrears|overdue|not eligible|business|finance lease|operating lease|FIS|error|cannot/i.test(dialogText + toastText + body)) {
        console.log(`REGO=${rego} MATCH_BODY=${body.slice(0, 1200)}`);
      }
    }
  });
}
