import { expect, test } from "@playwright/test";
import { DODashboardPage, DOLoginPage, DOQuickQuotePage } from "../../../pages";
import doLoginData from "../../../testData/do-portal/loginData.json";

test.describe.serial("DO Portal - QucikQuoteModule - Sanity @do @smoke", () => {
  let loginPage: DOLoginPage;
  let dashboardPage: DODashboardPage;
  let quickQuotePage: DOQuickQuotePage;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    loginPage = new DOLoginPage(page);
    dashboardPage = new DODashboardPage(page);
    quickQuotePage = new DOQuickQuotePage(page);

    await loginPage.navigate("https://testportaludc.aurionpro.com/");
    await loginPage.loginWithTestData(doLoginData.validUsers[0]);
    await page.waitForLoadState("networkidle").catch(() => {});
  });

  const fillMandatoryQuickQuoteInputs = async (): Promise<void> => {
    await quickQuotePage.selectProduct("Finance Lease - Business Asg");
    await quickQuotePage.selectProgram("Finance Lease Business - MV Dealer");
    await quickQuotePage.enterCashPrice("100000");
    await quickQuotePage.enterDepositPercent("10");
    await quickQuotePage.enterInterestRatePercent("4");
    await quickQuotePage.enterTermsMonths("36");
    await quickQuotePage.enterBalloonPercent("20");
    await quickQuotePage.confirmTermsAndConditions();
  };

  test("TC1 - Launch Quick Quote screen", async () => {
    test.setTimeout(240000);
    await quickQuotePage.openQuickQuote();

    await expect(quickQuotePage.quickQuoteRoot).toBeVisible();
    await expect(quickQuotePage.quickQuoteForm).toBeVisible();
    await expect(quickQuotePage.page.getByText("Quick Quote", { exact: false }).first()).toBeVisible();
  });

  test("TC2 - Check defaulting after product/program selection", async () => {
    test.setTimeout(240000);
    await quickQuotePage.openQuickQuote();
    await quickQuotePage.selectProduct("Finance Lease - Business Asg");
    await quickQuotePage.selectProgram("Finance Lease Business - MV Dealer");

    await expect(quickQuotePage.cashPriceInput).toBeVisible();
    await expect(quickQuotePage.depositPercentInput).toBeVisible();
    await expect(quickQuotePage.interestRatePercentInput).toBeVisible();
    await expect(quickQuotePage.termsMonthsInput).toBeVisible();
    await expect(quickQuotePage.calculateButton).toBeVisible();
  });

  test("TC3 - Create new quote: mandatory fields + calculate", async () => {
    test.setTimeout(240000);
    await quickQuotePage.openQuickQuote();
    await fillMandatoryQuickQuoteInputs();
    await quickQuotePage.clickCalculate();

    await expect(quickQuotePage.createQuoteButton).toBeVisible();
    const calcSummary = quickQuotePage.page.locator("app-quick-quote .calculation-result, app-quick-quote [class*='result'], app-quick-quote [class*='amount']");
    await expect(calcSummary.first()).toBeVisible();
  });

  test("TC4 - Create Quote opens Standard Quote with data transfer", async () => {
    test.setTimeout(300000);
    await quickQuotePage.openQuickQuote();
    await fillMandatoryQuickQuoteInputs();
    await quickQuotePage.clickCalculate();
    await quickQuotePage.clickCreateQuote();

    const standardQuoteRoot = quickQuotePage.page.locator("app-quote-details, app-standard-quote").first();
    await expect(standardQuoteRoot).toBeVisible({ timeout: 120000 });
    await expect(
      quickQuotePage.page.getByText(/Finance Lease/i).first(),
    ).toBeVisible();
  });

  test("TC5 - Calculate then Create Quote flow", async () => {
    test.setTimeout(300000);
    await quickQuotePage.openQuickQuote();
    await fillMandatoryQuickQuoteInputs();
    await quickQuotePage.clickCalculate();
    await quickQuotePage.clickCreateQuote();

    await expect(quickQuotePage.page.locator("app-quote-details, app-standard-quote").first()).toBeVisible({
      timeout: 120000,
    });
    await expect(quickQuotePage.page.getByRole("button", { name: /^Next$/i }).first()).toBeVisible();
  });

  test("TC6 - Add Comparison opens comparison section", async () => {
    test.setTimeout(240000);
    await quickQuotePage.openQuickQuote();
    await fillMandatoryQuickQuoteInputs();
    await quickQuotePage.clickCalculate();
    await quickQuotePage.clickAddComparison2();

    await expect(quickQuotePage.addComparison3Button).toBeVisible();
  });

  test("TC7 - Reset clears fields, Create Quote remains available after recalculate", async () => {
    test.setTimeout(300000);
    await quickQuotePage.openQuickQuote();
    await fillMandatoryQuickQuoteInputs();

    await expect(quickQuotePage.cashPriceInput).toHaveValue(/100000|100,000/);
    await quickQuotePage.clickReset();
    await expect(quickQuotePage.cashPriceInput).toHaveValue("");

    await fillMandatoryQuickQuoteInputs();
    await quickQuotePage.clickCalculate();
    await expect(quickQuotePage.createQuoteButton).toBeVisible();
  });

  test("TC8 - Print and Download buttons visible and actionable", async () => {
    test.setTimeout(240000);
    await quickQuotePage.openQuickQuote();
    await fillMandatoryQuickQuoteInputs();
    await quickQuotePage.clickCalculate();

    await expect(quickQuotePage.printButton).toBeVisible();
    await expect(quickQuotePage.downloadButton).toBeVisible();

    await quickQuotePage.printButton.click({ trial: true });
    await quickQuotePage.downloadButton.click({ trial: true });
  });
});

