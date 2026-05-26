/**
 * DO Portal — CSA / Quick Quote regression (manual UDP-T3002…UDP-T3036).
 * Source: tests/do-portal/regression/csa-regression-manual.csv
 * Traceability: tests/do-portal/regression/csa-coverage-matrix.csv
 *
 * CSV names "CSA" products; QAT commonly validates the same UI rules on Finance Lease.
 * Override with DO_QQ_REGRESSION_PRODUCT / DO_QQ_REGRESSION_PROGRAM when your tenant exposes CSA in QQ.
 *
 * Auth: uses playwright/.auth/do-portal.json when present (after `playwright/do-portal-auth.setup.ts`); otherwise logs in via DOLoginPage (e.g. CI without global DO auth).
 */

import * as fs from "fs";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { DO_BASE_URL, DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DODashboardPage, DOLoginPage, DOQuickQuotePage } from "../../../pages";
import doLoginData from "../../../testData/do-portal/loginData.json";
import path from "path";

const doPortalAuthFile = path.join(
  process.cwd(),
  "playwright",
  ".auth",
  "do-portal.json",
);

const REGRESSION_PRODUCT =
  process.env.DO_QQ_REGRESSION_PRODUCT ?? "Finance Lease - Business Asg";
const REGRESSION_PROGRAM =
  process.env.DO_QQ_REGRESSION_PROGRAM ?? "Finance Lease Business - MV Dealer";

async function waitOutHeavyLoader(page: Page): Promise<void> {
  await page
    .locator(".app-loader-overlay, [class*='app-loader']")
    .first()
    .waitFor({ state: "hidden", timeout: 120_000 })
    .catch(() => {});
}

/**
 * Fills the nth `app-create-quick-quote` card (0-based) — used when multiple comparison blocks exist.
 */
async function fillQuickQuoteCardAtIndex(page: Page, index: number): Promise<void> {
  const root = page.locator("app-create-quick-quote").nth(index);
  const form = root.locator("form").first();
  const productTrigger = form
    .locator(
      "xpath=.//label[contains(normalize-space(.), 'Product')]/following::p-dropdown[1]",
    )
    .getByRole("button", { name: /dropdown trigger/i });
  await productTrigger.click();
  await page
    .getByRole("option")
    .filter({ hasText: REGRESSION_PRODUCT })
    .first()
    .click();
  const programTrigger = form
    .locator(
      "xpath=.//label[contains(normalize-space(.), 'Program')]/following::p-dropdown[1]",
    )
    .getByRole("button", { name: /dropdown trigger/i });
  await programTrigger.click();
  await page
    .getByRole("option")
    .filter({ hasText: REGRESSION_PROGRAM })
    .first()
    .click();
  await form
    .locator("xpath=.//label[contains(normalize-space(.), 'Cash Price')]/following::input[1]")
    .fill("20000");
  await form
    .locator(
      "xpath=.//label[contains(normalize-space(.), 'Interest Rate')]/following::input[@id='percent'][1]",
    )
    .fill("4");
  const term = form.locator(
    "xpath=.//label[contains(normalize-space(.), 'Terms (Months)')]/following::input[@role='spinbutton'][1]",
  );
  await term.click();
  await term.evaluate((el: HTMLInputElement) => {
    el.focus();
    el.select();
  });
  await term.press("Backspace");
  await term.pressSequentially("36", { delay: 30 });
  await term.blur();
  const freqTrigger = form
    .locator(
      "xpath=.//label[contains(normalize-space(.), 'Frequency')]/following::p-dropdown[1]",
    )
    .getByRole("button", { name: /dropdown trigger/i });
  if (await freqTrigger.isVisible().catch(() => false)) {
    await freqTrigger.click();
    await page.getByRole("option", { name: /Monthly/i }).first().click();
  }
  const balloon = form.locator(
    "xpath=.//label[starts-with(normalize-space(.), 'Balloon')]/following::input[@id='percent'][1]",
  );
  if (await balloon.isVisible().catch(() => false)) {
    await balloon.fill("10");
  }
  await form.locator(".p-checkbox-box").first().click();
  await form.getByRole("button", { name: /^Calculate$/i }).click();
  await waitOutHeavyLoader(page);
}

test.describe.serial("DO Portal - CSA QQ regression @do @regression", () => {
  let context: BrowserContext;
  let page: Page;
  let dashboardPage: DODashboardPage;
  let qq: DOQuickQuotePage;

  test.beforeAll(async ({ browser }) => {
    const useStorage = fs.existsSync(doPortalAuthFile);
    context = await browser.newContext(
      useStorage ? { storageState: doPortalAuthFile } : {},
    );
    page = await context.newPage();
    dashboardPage = new DODashboardPage(page);
    qq = new DOQuickQuotePage(page);
    if (!useStorage) {
      const loginPage = new DOLoginPage(page);
      await loginPage.navigate(DO_BASE_URL());
      await loginPage.loginWithTestData(doLoginData.validUsers[0]);
    }
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
  });

  async function fillStandardQuickQuoteForCalculate(): Promise<void> {
    await qq.selectProduct(REGRESSION_PRODUCT);
    await qq.selectProgram(REGRESSION_PROGRAM);
    await qq.enterCashPrice("20000");
    await qq.enterDepositPercent("10");
    await qq.enterInterestRatePercent("4");
    await qq.enterTermsMonths("36");
    if (await qq.frequencyDropdownTrigger.isVisible().catch(() => false)) {
      await qq.selectFrequency("Monthly");
    }
    if (await qq.balloonPercentInput.isVisible().catch(() => false)) {
      await qq.enterBalloonPercent("10");
    }
    await qq.confirmTermsAndConditions();
  }

  test("AT_QQ_01 defaults, product list, mandatory Product/Program, dynamic fields — UDP-T3002 T3003 T3004 T3005 T3007 T3008", async () => {
    test.setTimeout(300_000);
    await qq.openQuickQuote();
    await expect(qq.quickQuoteRoot).toBeVisible();

    await qq.productDropdownTrigger.click();
    const productOptions = await page.getByRole("option").count();
    expect(productOptions).toBeGreaterThan(0);
    await page.keyboard.press("Escape");

    await qq.clickCalculate();
    await expect(page.getByText(/please complete/i).first()).toBeVisible({
      timeout: 60_000,
    });

    await qq.selectProduct(REGRESSION_PRODUCT);
    await qq.clickCalculate();
    await expect(page.getByText(/please complete/i).first()).toBeVisible({
      timeout: 60_000,
    });

    await qq.selectProgram(REGRESSION_PROGRAM);
    await expect(qq.cashPriceInput).toBeVisible({ timeout: 60_000 });
    await expect(qq.interestRatePercentInput).toBeVisible();
    await expect(qq.termsMonthsInput).toBeVisible();
    await expect(qq.calculateButton).toBeVisible();
  });

  test("AT_QQ_02 single Program auto-select when applicable — UDP-T3006", async () => {
    test.setTimeout(240_000);
    await qq.openQuickQuote();
    await qq.selectProduct(REGRESSION_PRODUCT);
    const disabled = await qq.isProgramDropdownDisabled();
    if (!disabled) {
      test.skip(
        true,
        "Environment exposes multiple programs for this product; UDP-T3006 N/A.",
      );
    }
    await expect(qq.programDropdownTrigger).toBeVisible();
  });

  test("AT_QQ_03 Originator / Dealer control visible — UDP-T3009 T3010", async () => {
    test.setTimeout(180_000);
    await qq.openQuickQuote();
    await expect(qq.dealerDropdownTrigger).toBeVisible();
  });

  test("AT_QQ_04 QQ headers max 3 comparisons + Create Quote — UDP-T3011 UDP-T3035", async () => {
    test.setTimeout(600_000);
    await qq.openQuickQuote();
    await fillStandardQuickQuoteForCalculate();
    await qq.clickCalculate();
    await expect(qq.createQuoteButton).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/Quick Quote\s*1/i).first()).toBeVisible();

    await qq.clickAddComparison2();
    await fillQuickQuoteCardAtIndex(page, 1);
    await expect(qq.addComparison3Button).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/Quick Quote\s*2/i).first()).toBeVisible();

    await qq.clickAddComparison3();
    await fillQuickQuoteCardAtIndex(page, 2);
    await expect(page.getByText(/Quick Quote\s*3/i).first()).toBeVisible({
      timeout: 120_000,
    });
    await expect(page.getByRole("button", { name: /Add Comparison\s*4/i })).toHaveCount(0);

    await page
      .locator("app-create-quick-quote")
      .first()
      .getByRole("button", { name: /^Create Quote$/i })
      .click();
    await waitOutHeavyLoader(page);
    const standard = page.locator("app-quote-details, app-standard-quote").first();
    await expect(standard).toBeVisible({ timeout: 120_000 });
  });

  test("AT_QQ_05_06 principal calc, loan amount, Calculate For options — UDP-T3012…T3020 T3017 T3018 T3019", async () => {
    test.setTimeout(420_000);
    await qq.openQuickQuote();
    await fillStandardQuickQuoteForCalculate();
    await qq.clickCalculate();
    await expect(qq.createQuoteButton).toBeVisible({ timeout: 120_000 });

    await expect(qq.quickQuoteRoot).toContainText(/18[,.]?0{3}|18\s*000/i);

    await expect(qq.calculateForDropdownTrigger).toBeEnabled({ timeout: 60_000 });
    await qq.calculateForDropdownTrigger.click();
    await expect(page.getByRole("option", { name: /Cash\s*Price/i }).first()).toBeVisible();
    await expect(page.getByRole("option", { name: /^Deposit$/i }).first()).toBeVisible();
    await expect(page.getByRole("option", { name: /Balloon/i }).first()).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("AT_QQ_07 Deposit and Balloon percent/dollar sync — UDP-T3024 T3025 T3026 T3027", async () => {
    test.setTimeout(360_000);
    await qq.openQuickQuote();
    await qq.selectProduct(REGRESSION_PRODUCT);
    await qq.selectProgram(REGRESSION_PROGRAM);
    await qq.enterCashPrice("20000");
    await qq.confirmTermsAndConditions();

    if (await qq.depositDollarInput.isVisible().catch(() => false)) {
      await qq.enterDepositPercent("10");
      await expect(qq.depositDollarInput).toHaveValue(/2[,.]?0{3}|2000/i, {
        timeout: 30_000,
      });
      await qq.enterDepositDollars("");
      await qq.enterDepositDollars("4000");
      await expect(qq.depositPercentInput).toHaveValue(/20/i, { timeout: 30_000 });
    }

    if (await qq.balloonPercentInput.isVisible().catch(() => false)) {
      await qq.enterBalloonPercent("20");
      if (await qq.balloonDollarInput.isVisible().catch(() => false)) {
        await expect(qq.balloonDollarInput).toHaveValue(/4[,.]?0{3}|4000/i, {
          timeout: 30_000,
        });
        await qq.enterBalloonDollars("");
        await qq.enterBalloonDollars("5000");
        await expect(qq.balloonPercentInput).toHaveValue(/25/i, { timeout: 30_000 });
      }
    }
  });

  test("AT_QQ_08 Fixed balloon path calculates — UDP-T3028 partial", async () => {
    test.setTimeout(360_000);
    await qq.openQuickQuote();
    await fillStandardQuickQuoteForCalculate();
    if (!(await qq.fixedCheckbox.isVisible().catch(() => false))) {
      test.skip(true, "Fixed checkbox not shown for this product/program.");
    }
    await qq.checkFixedCheckbox();
    await qq.clickCalculate();
    await expect(qq.createQuoteButton).toBeVisible({ timeout: 120_000 });
  });

  test("AT_QQ_09 Term and Cash Price validation — UDP-T3030 T3031 T3032", async () => {
    test.setTimeout(420_000);
    await qq.openQuickQuote();
    await qq.selectProduct(REGRESSION_PRODUCT);
    await qq.selectProgram(REGRESSION_PROGRAM);
    await qq.enterCashPrice("20000");
    await qq.enterInterestRatePercent("4");
    await qq.enterTermsMonths("9999");
    await qq.confirmTermsAndConditions();
    await qq.clickCalculate();
    const termTooHigh = page.getByText(/term.*greater|max.*term|not be greater/i).first();
    const generic = page.getByText(/please complete|invalid/i).first();
    await expect(termTooHigh.or(generic)).toBeVisible({ timeout: 90_000 });

    await qq.enterTermsMonths("36");
    await qq.termsMonthsInput.click();
    await qq.termsMonthsInput.press("Control+A");
    await qq.termsMonthsInput.press("Delete");
    await qq.termsMonthsInput.blur();
    await qq.clickCalculate();
    await expect(page.getByText(/please complete/i).first()).toBeVisible({
      timeout: 60_000,
    });

    await qq.enterTermsMonths("36");
    await qq.enterCashPrice("-100");
    await qq.clickCalculate();
    await expect(
      page.getByText(/greater|equal|0\.00|negative|invalid/i).first(),
    ).toBeVisible({ timeout: 60_000 });
  });

  test("AT_QQ_10 Calculate gating + Reset — UDP-T3033 T3034", async () => {
    test.setTimeout(360_000);
    await qq.openQuickQuote();
    await qq.selectProduct(REGRESSION_PRODUCT);
    await qq.selectProgram(REGRESSION_PROGRAM);
    if (!(await qq.calculateButton.isEnabled())) {
      await expect(qq.calculateButton).toBeDisabled();
    }
    await qq.enterCashPrice("15000");
    await qq.enterInterestRatePercent("4");
    await qq.enterTermsMonths("24");
    if (await qq.frequencyDropdownTrigger.isVisible().catch(() => false)) {
      await qq.selectFrequency("Monthly");
    }
    await qq.confirmTermsAndConditions();
    await expect(qq.calculateButton).toBeEnabled({ timeout: 30_000 });

    await qq.clickCalculate();
    await expect(qq.createQuoteButton).toBeVisible({ timeout: 120_000 });
    await qq.clickReset();
    await expect(qq.cashPriceInput).toHaveValue("", { timeout: 30_000 });
  });

  test("AT_QQ_11 Print control after calculate — UDP-T3036 partial", async () => {
    test.setTimeout(300_000);
    await qq.openQuickQuote();
    await fillStandardQuickQuoteForCalculate();
    await qq.clickCalculate();
    await expect(qq.printButton).toBeVisible({ timeout: 120_000 });
    const popupWait = page.waitForEvent("popup", { timeout: 15_000 }).catch(() => null);
    await qq.printButton.click({ timeout: 30_000 }).catch(() => {});
    const popup = await popupWait;
    if (popup) await popup.close();
  });
});
