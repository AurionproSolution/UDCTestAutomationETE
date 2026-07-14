import { test } from "@fixtures/doPortalTest";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DODashboardPage, DOSettlementPage } from "../../../pages";
import settlementData from "../../../testData/do-portal/settlementTestData.json";

test("probe FL 214 create settlement quote dialog text", async ({ page }) => {
  test.setTimeout(120_000);
  const dashboardPage = new DODashboardPage(page);
  const settlementPage = new DOSettlementPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(settlementData.dealer);
  await dashboardPage.navigateToDealerListingActiveLoans();
  await dashboardPage.clickCreateSettlementQuoteForLoan("214");
  await page.waitForTimeout(3_000);
  const dialogText = ((await settlementPage.activeDialog().innerText().catch(() => "")) ?? "").replace(
    /\s+/g,
    " ",
  );
  console.log(`DIALOG_AFTER_CREATE=${dialogText}`);
});
