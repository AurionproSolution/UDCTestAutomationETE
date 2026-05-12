/**
 * RSS Portal — Individual Apply Now **Conditional Approval** path
 * E2E: “What would you like to do?” → **I am after a Conditional Approval**, Car or Van asset, repayment, About You, application documents & submit.
 *
 * Apply Now step 1 + asset / repayment: `pages/rss-portal/Applynow/HowCanWeHelpIndividualPage.ts`.
 */
import rssLoginData from "../../../testData/rss-portal/loginData.json";
 
import { expect, test } from "@playwright/test";
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


/** OTP / MFA completion window after login submit (RSS QA). */
const OTP_NAVIGATION_TIMEOUT_MS = 300_000; // 5 min

/** Dealership list API can be slow — wait until the dropdown is enabled before selecting (max 5 min). */
const DEALERS_LIST_LOAD_TIMEOUT_MS = 300_000;

/** After hub login, `app-landing` may show `p-progressspinner` over Retail Self Service (QAT). */
const RETAIL_SELF_SERVICE_SPINNER_WAIT_MS = 180_000;
const RETAIL_SELF_SERVICE_CLICK_TIMEOUT_MS = 120_000;

/** Local Ionic shell — Hub `#username` / `#password`; flip login blocks below when testing locally. */
const LOCAL_AUTH_LOGIN_URL = "http://localhost:8100/authentication/login";
const LOCAL_SHELL_USERNAME = "AURPRRSS.RESTAPI.DEVQA";
const LOCAL_SHELL_PASSWORD = "u20UUm@i(s8&";

let loginPage: RSSLoginPage;
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

test.describe("RSS Portal - Individual Conditional Approval @rss @smoke", () => {
  test.beforeEach(async ({ page }) => {
    loginPage = new RSSLoginPage(page);
    dashboardPage = new RSSDashboardPage(page);
    applyNowHowCanWeHelpPage = new RSSApplyNowHowCanWeHelpIndividualPage(page);
    applyNowDealershipAssetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
    applyNowAboutYouPage = new RSSApplyNowAboutYouIndividualPage(page);
    applyNowApplicationDocumentsPage = new RSSApplyNowApplicationDocumentsPage(page);
  });

  test("RSS Individual Conditional Approval - Login Dashboard and Apply Now flow", async () => {
    /** Must cover OTP, retail landing, repayment, and documents (no dealership step for conditional approval). */
    test.setTimeout(900_000);

    /**
     * Login: keep exactly ONE block active — comment the other.
     * - QA / FIS (CI / qaportalrss): use block A.
     * - Local shell (localhost:8100): comment block A, uncomment block B.
     */
    // ----- Block A — QA / FIS -----
    await loginPage.navigate("https://qaportalrss.aurionpro.com/");
    await loginPage.loginWithTestData(rssLoginData.validUsers[0], {
      navigationTimeoutMs: OTP_NAVIGATION_TIMEOUT_MS,
    });

    // ----- Block B — localhost app shell (#username / #password + Retail Self Service) -----
    // await loginPage.navigate(LOCAL_AUTH_LOGIN_URL);
    // await loginPage.loginWithLocalShellForm(
    //   LOCAL_SHELL_USERNAME,
    //   LOCAL_SHELL_PASSWORD,
    //   {
    //     navigationTimeoutMs: OTP_NAVIGATION_TIMEOUT_MS,
    //     retailSelfServiceSpinnerWaitMs: RETAIL_SELF_SERVICE_SPINNER_WAIT_MS,
    //     retailSelfServiceClickTimeoutMs: RETAIL_SELF_SERVICE_CLICK_TIMEOUT_MS,
    //   },
    // );

    const session = loginPage.getSessionPage();
    dashboardPage = new RSSDashboardPage(session);
    applyNowHowCanWeHelpPage = new RSSApplyNowHowCanWeHelpIndividualPage(session);
    applyNowDealershipAssetPage = new RSSApplyNowDealershipAssetRepaymentPage(session);
    applyNowAboutYouPage = new RSSApplyNowAboutYouIndividualPage(session);
    applyNowApplicationDocumentsPage = new RSSApplyNowApplicationDocumentsPage(session);

    expect(await dashboardPage.isDashboardLoaded()).toBe(true);
    // await dashboardPage.selectHeaderBorrowerProfile(RSS_HEADER_BORROWER_DISPLAY_NAME);
    await dashboardPage.clickApplyNow();
    expect(await dashboardPage.isApplyNowSelected()).toBe(true);

    await applyNowHowCanWeHelpPage.waitForHowCanWeHelpStep();
    await applyNowHowCanWeHelpPage.clickIndividual();
    await applyNowHowCanWeHelpPage.selectConditionalApproval();
    await applyNowHowCanWeHelpPage.expectConditionalApprovalSelected();

    // await applyNowDealershipAssetPage.waitForDealershipSection();
    // await applyNowDealershipAssetPage.waitForDealersLoaded(DEALERS_LIST_LOAD_TIMEOUT_MS);
    // await applyNowDealershipAssetPage.selectDealerYouHaveUsedBefore(DEALERSHIP_USED_BEFORE);

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
