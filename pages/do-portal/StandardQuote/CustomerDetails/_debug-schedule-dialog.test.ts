import { test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "config/env";
import { DODashboardPage } from "pages/do-portal/dashboard/DashboardPage";
import { DOAddAssetPage, } from "pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOAssetDetailsPage } from "pages/do-portal/StandardQuote/AssetDetails/AssetDetailsPage";
function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

test("debug schedule dialog html", async ({ page }) => {
  test.setTimeout(600_000);
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  const addAssetPage = new DOAddAssetPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer("Armstrong Prestige Wellington");
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectCSAproduct();
  await standardQuoteRoot(page).waitFor({ state: "visible", timeout: 120_000 });
  await assetDetailsPage.chooseProduct("CSA-C-Assigned");
  await assetDetailsPage.chooseProgram("CSA Personal - MV Dealer");
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
  await assetDetailsPage.enterOriginationReference("SQ-CSA-Ref-01");
  await assetDetailsPage.clickCalculateButton();

  const root = standardQuoteRoot(page);
  const scheduleCard = root.locator("p-card").filter({ hasText: /Payment\s+Schedule/i }).first();
  const scheduleHost = (await scheduleCard.isVisible({ timeout: 10_000 }).catch(() => false))
    ? scheduleCard
    : root
        .locator("div")
        .filter({ has: root.getByText(/Payment\s+Schedule/i).first() })
        .filter({ has: root.locator("table tbody tr") })
        .first();
  const editIcon = root
    .getByRole("button", { name: /Edit\s+Payment\s+Schedule/i })
    .or(root.getByRole("link", { name: /Edit\s+Payment\s+Schedule/i }))
    .or(
      scheduleHost
        .locator("button:not(.brand-edit-btn), a:not(.brand-edit-btn), [role='button']:not(.brand-edit-btn)")
        .filter({
          has: scheduleHost.locator("i.pi-pencil, i.pi-pen-to-square, .fa-pen-to-square"),
        }),
    )
    .first();
  await editIcon.click({ timeout: 20_000 });
  const dialog = page.getByRole("dialog").filter({ hasText: /Payment\s+Schedule|Segment/i }).first();
  await dialog.waitFor({ state: "visible", timeout: 20_000 });
  // eslint-disable-next-line no-console
  console.log("DIALOG_OUTER", await dialog.evaluate((el) => el.outerHTML.slice(0, 16000)));
});
