import { expect, test } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DODashboardPage } from "../../../pages";
import { DOQuickQuotePage } from "../../../pages";

test.describe.serial("DO Portal - QuickQuoteModule - Sanity @do @smoke", () => {
  let dashboardPage: DODashboardPage;
  let quickQuotePage: DOQuickQuotePage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DODashboardPage(page);
    quickQuotePage = new DOQuickQuotePage(page);
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
  });

  const fillMandatoryQuickQuoteInputs = async (): Promise<void> => {
    await quickQuotePage.selectProduct("Finance Lease - Business Asg");
    await quickQuotePage.selectProgram("Finance Lease Business - MV Dealer");
    await quickQuotePage.enterCashPrice("100000");
    //await quickQuotePage.enterDepositPercent("10");
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
    // Deposit % can be hidden/disabled for some product/program combinations.
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

  /**
   * Jira UDP-2831 — Add comparison 3 should not be enabled without calculating
   * quick quote 1 and quick quote 2.
   *
   * After QQ1 is calculated and "Add Comparison 2" adds the second quote block,
   * "Add Comparison 3" must remain disabled until that second quote is calculated
   * (regression: it was incorrectly enabled too early).
   */
  test("UDP-2831 - Add Comparison 3 disabled until Quick Quote 2 is calculated @do @sanity", async () => {
    test.setTimeout(240000);
    await quickQuotePage.openQuickQuote();
    await quickQuotePage.selectProduct("Finance Lease - Business Asg");
    await quickQuotePage.selectProgram("Finance Lease Business - MV Dealer");
    await quickQuotePage.enterCashPrice("100000");
    await quickQuotePage.enterInterestRatePercent("4");
    await quickQuotePage.enterTermsMonths("36");
    //await quickQuotePage.enterBalloonPercent("20");
    await quickQuotePage.clickCalculate();
    await quickQuotePage.clickAddComparison2();

    await expect(quickQuotePage.addComparison3Button).toBeVisible();
    await expect(quickQuotePage.addComparison3Button).toBeDisabled();
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
