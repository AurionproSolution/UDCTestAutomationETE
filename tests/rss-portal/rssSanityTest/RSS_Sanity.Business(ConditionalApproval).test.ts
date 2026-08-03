/**
 * RSS Portal — Business Apply Now **Conditional Approval** path
 * E2E: “What would you like to do?” → **I am after a Conditional Approval**, Car or Light Commercial asset, repayment, About You, application documents & submit.
 *
 * Apply Now step 1 + dealership / asset / repayment: `pages/rss-portal/Applynow/HowCanWeHelpIndividualPage.ts`.
 */

import { expect, test } from "../../../fixtures/rssPortalTest";
import {
    RSSApplyNowAboutYouIndividualPage,
    RSSApplyNowApplicationDocumentsPage,
    RSSDashboardPage,
    RSSLoginPage,
} from "../../../pages";
import {
    RSSApplyNowDealershipAssetRepaymentPage,
    RSSApplyNowHowCanWeHelpIndividualPage,
} from "../../../pages/rss-portal/Applynow/HowCanWeHelpIndividualPage";
import { RSS_BASE_URL } from "../../../config/env";

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

const DEALERSHIP_USED_BEFORE = "1034401-1034401 -";

/** Same purchase / make / model / rego / year as Individual sanity — only the **asset tile** differs (Car or Light Commercial). */
const ASSET_ROW_SAME_DATA = {
  purchasePrice: "$100000.00",
  make: "tOYOAT",
  model: "tOYOAT",
  rego: "123456",
  year: "2025",
} as const;

const REPAYMENT = {
  deposit: "$0.02",
  termMonths: "24",
  frequency: "Monthly",
  balloon: "$1000.00",
} as const;

/** About You → profit last year = **Yes**, then net profit (USD) for the currency field. */
const BUSINESS_PROFIT_LAST_YEAR: "yes" | "no" = "yes";
const BUSINESS_NET_PROFIT_LAST_YEAR_USD = "$50000.00";

/** Header borrower list — exact option (SelectorHub `:text-is("…")`). */
const RSS_HEADER_BORROWER_TEXT_IS = "Christopher Ngahina Robinson";

test.describe("RSS Portal - Business Conditional Approval @rss @smoke", () => {
  test.beforeEach(async ({ page }) => {
    dashboardPage = new RSSDashboardPage(page);
    applyNowHowCanWeHelpPage = new RSSApplyNowHowCanWeHelpIndividualPage(page);
    applyNowDealershipAssetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
    applyNowAboutYouPage = new RSSApplyNowAboutYouIndividualPage(page);
    applyNowApplicationDocumentsPage = new RSSApplyNowApplicationDocumentsPage(page);
  });

  test("RSS Business Conditional Approval - Login Dashboard and Apply Now flow", async () => {
    test.setTimeout(900_000);

    expect(await dashboardPage.isDashboardLoaded()).toBe(true);
    // await dashboardPage.selectHeaderBorrowerProfileByTextIs(RSS_HEADER_BORROWER_TEXT_IS);
    await dashboardPage.clickApplyNow();
    expect(await dashboardPage.isApplyNowSelected()).toBe(true);

    await applyNowHowCanWeHelpPage.waitForHowCanWeHelpStep();
    await applyNowHowCanWeHelpPage.clickBusiness();
    await applyNowHowCanWeHelpPage.selectConditionalApproval();
    await applyNowHowCanWeHelpPage.expectConditionalApprovalSelected();

    // await applyNowDealershipAssetPage.waitForDealershipSection();
    // await applyNowDealershipAssetPage.waitForDealersLoaded(DEALERS_LIST_LOAD_TIMEOUT_MS);
    // await applyNowDealershipAssetPage.selectDealerYouHaveUsedBefore(DEALERSHIP_USED_BEFORE);

    await applyNowDealershipAssetPage.fillCarOrLightCommercialAssetRow(ASSET_ROW_SAME_DATA);

    await applyNowDealershipAssetPage.fillRepaymentCalculatorFields(REPAYMENT);
    await applyNowDealershipAssetPage.clickRepaymentCalculate();
    await applyNowDealershipAssetPage.clickApplyNowFooterNext();

    await applyNowAboutYouPage.waitForAboutYouStep();
    await applyNowAboutYouPage.clickFinancialPositionPerSelectorHub();
    await applyNowAboutYouPage.selectMadeProfitLastYear(BUSINESS_PROFIT_LAST_YEAR);
    await applyNowAboutYouPage.fillNetProfitLastYearDollars(BUSINESS_NET_PROFIT_LAST_YEAR_USD);
    // await applyNowAboutYouPage.selectIncomeNotLikelyToDecreaseNo();
    await applyNowAboutYouPage.clickApplyNowFooterNext();

    await applyNowApplicationDocumentsPage.waitForApplicationDocumentsStep();
    await applyNowApplicationDocumentsPage.uploadSupportingDocument();
    // await applyNowApplicationDocumentsPage.checkApplyIdStartVerification();
    await applyNowApplicationDocumentsPage.confirmLegalAcknowledgements();
    await applyNowApplicationDocumentsPage.clickSubmit();
  });
});
