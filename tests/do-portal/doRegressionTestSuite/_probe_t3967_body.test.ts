import { expect, test } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOAssetDetailsPage, DODashboardPage, DOSettlementPage } from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import settlementData from "../../../testData/do-portal/settlementTestData.json";

async function accessSettlement(page: Page): Promise<DOSettlementPage> {
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

test("probe body after settlement next rego 214", async ({ page }) => {
  test.setTimeout(300_000);
  const settlementPage = await accessSettlement(page);
  await settlementPage.enterRego("214");
  await settlementPage.clearVin();
  const regoVisible = await settlementPage.activeDialog().isVisible();
  console.log(`REGO_DIALOG_VISIBLE_BEFORE_NEXT=${regoVisible}`);
  await settlementPage.clickNext();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(2_000);
    const dialogVisible = await settlementPage.activeDialog().isVisible().catch(() => false);
    const dialogText = dialogVisible
      ? ((await settlementPage.activeDialog().innerText().catch(() => "")) ?? "").replace(/\s+/g, " ")
      : "";
    const body = ((await page.locator("body").innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
    console.log(`T=${i * 2}s DIALOG=${dialogVisible} TEXT=${dialogText.slice(0, 500)}`);
    console.log(`T=${i * 2}s BODY_SNIP=${body.slice(0, 800)}`);
  }
});
