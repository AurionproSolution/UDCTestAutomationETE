/**
 * RSS Portal — Individual Sanity Tests
 * E2E: login, dashboard, Apply Now — Individual, dealership, asset/repayment, About You, application documents & submit.
 *
 * Apply Now step 1 + dealership / asset / repayment: `pages/rss-portal/Applynow/HowCanWeHelpIndividualPage.ts`.
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import {
  RSSApplyNowAboutYouIndividualPage,
  RSSApplyNowApplicationDocumentsPage,
  RSSDashboardPage,
} from "../../../../pages";
import {
  RSSApplyNowDealershipAssetRepaymentPage,
  RSSApplyNowHowCanWeHelpIndividualPage,
} from "../../../../pages/rss-portal/Applynow/HowCanWeHelpIndividualPage";

/** Dealership list API can be slow — wait until the dropdown is enabled before selecting (max 5 min). */
const DEALERS_LIST_LOAD_TIMEOUT_MS = 300_000;

/** Local Ionic shell — Hub `#username` / `#password`; flip login blocks below when testing locally. */
const LOCAL_AUTH_LOGIN_URL = "http://localhost:8100/authentication/login";
const LOCAL_SHELL_USERNAME = "AURPRRSS.RESTAPI.DEVQA";
const LOCAL_SHELL_PASSWORD = "u20UUm@i(s8&";
const RETAIL_SELF_SERVICE_SPINNER_WAIT_MS = 180_000;
const RETAIL_SELF_SERVICE_CLICK_TIMEOUT_MS = 120_000;
let dashboardPage: RSSDashboardPage;
let applyNowHowCanWeHelpPage: RSSApplyNowHowCanWeHelpIndividualPage;
let applyNowDealershipAssetPage: RSSApplyNowDealershipAssetRepaymentPage;
let applyNowAboutYouPage: RSSApplyNowAboutYouIndividualPage;
let applyNowApplicationDocumentsPage: RSSApplyNowApplicationDocumentsPage;

/** Reference data — Apply Now `/rss/apply-now` Car or Van + repayment screenshot (May 2026). */
const DEALERSHIP_USED_BEFORE = "1034401-1034401 -";
const ASSET_CAR_OR_VAN = {
  purchasePrice: "$100000",
  make: "tOYOAT",
  model: "tOYOAT",
  rego: "123456",
  year: "2025",
} as const;
const REPAYMENT = {
  deposit: "$0.02",
  termMonths: "24",
  frequency: "Monthly",
  balloon: "$1000",
} as const;

/** Borrower name shown in the header profile PrimeNG list (QAT / local). */
const RSS_HEADER_BORROWER_DISPLAY_NAME = "Christopher Ngahina Robinson";

test.describe("RSS Portal - Individual Sanity @rss @smoke", () => {
  test.beforeEach(async ({ page }) => {
    dashboardPage = new RSSDashboardPage(page);
    applyNowHowCanWeHelpPage = new RSSApplyNowHowCanWeHelpIndividualPage(page);
    applyNowDealershipAssetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
    applyNowAboutYouPage = new RSSApplyNowAboutYouIndividualPage(page);
    applyNowApplicationDocumentsPage = new RSSApplyNowApplicationDocumentsPage(page);
  });

  /** Title avoids `()` so `-g` / regex filters stay simple in CI and launch.json. */
  test("RSS Individual Sanity - Login Dashboard and Apply Now purchase flow", async () => {
    test.setTimeout(900_000);

    /**
     * Local shell login (manual): comment rssPortalTest import, use @playwright/test, and in beforeEach:
     * await loginPage.navigate(LOCAL_AUTH_LOGIN_URL);
     * await loginPage.loginWithLocalShellForm(LOCAL_SHELL_USERNAME, LOCAL_SHELL_PASSWORD, {
     *   retailSelfServiceSpinnerWaitMs: RETAIL_SELF_SERVICE_SPINNER_WAIT_MS,
     *   retailSelfServiceClickTimeoutMs: RETAIL_SELF_SERVICE_CLICK_TIMEOUT_MS,
     * });
     */

    expect(await dashboardPage.isDashboardLoaded()).toBe(true);
    // await dashboardPage.selectHeaderBorrowerProfile(RSS_HEADER_BORROWER_DISPLAY_NAME);
    await dashboardPage.clickApplyNow();
    expect(await dashboardPage.isApplyNowSelected()).toBe(true);

    await applyNowHowCanWeHelpPage.waitForHowCanWeHelpStep();
    await applyNowHowCanWeHelpPage.clickIndividual();
    await applyNowHowCanWeHelpPage.selectPurchaseThroughDealership();
    await applyNowHowCanWeHelpPage.expectPurchaseThroughDealershipSelected();

    await applyNowDealershipAssetPage.waitForDealershipSection();
    await applyNowDealershipAssetPage.waitForDealersLoaded(DEALERS_LIST_LOAD_TIMEOUT_MS);
    await applyNowDealershipAssetPage.selectDealerYouHaveUsedBefore(DEALERSHIP_USED_BEFORE);

    await applyNowDealershipAssetPage.fillCarOrVanAssetRow(ASSET_CAR_OR_VAN);

    await applyNowDealershipAssetPage.fillRepaymentCalculatorFields(REPAYMENT);
    await applyNowDealershipAssetPage.clickRepaymentCalculate();
    // await applyNowDealershipAssetPage.expectRepaymentSummaryLikeScreenshot();
    await applyNowDealershipAssetPage.clickApplyNowFooterNext();

    await applyNowAboutYouPage.waitForAboutYouStep();
    await applyNowAboutYouPage.clickFinancialPositionPerSelectorHub();
    await applyNowAboutYouPage.selectIncomeNotLikelyToDecreaseNo();
    await applyNowAboutYouPage.clickApplyNowFooterNext();

    await applyNowApplicationDocumentsPage.waitForApplicationDocumentsStep();
    await applyNowApplicationDocumentsPage.uploadSupportingDocument();
    // await applyNowApplicationDocumentsPage.checkApplyIdStartVerification();
    await applyNowApplicationDocumentsPage.confirmLegalAcknowledgements();
    await applyNowApplicationDocumentsPage.clickSubmit();
  });
});
