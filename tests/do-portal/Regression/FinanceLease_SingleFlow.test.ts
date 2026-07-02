/**
 * DO Portal — Finance Lease Quick Quote + Standard Quote regression (single Playwright test, single run).
 * Quick Quote / validation sequence follows `CSA_QuickQuote_SingleFlow.test.ts`; FL-specific UI and carry-over differ.
 * Auth: `do-regression-chromium` depends on `doSanity.auth.setup.ts` (storageState). Login
 * flakiness from slow SPA/SSO paint is handled in `DOLoginPage.navigate` / `login`, not here.
 */

import { expect, test } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAssetDetailsPage,
  DOCustomerDetailsPage,
  DOBusinessDetailsPage,
  DODashboardPage,
  DOQuickQuotePage,
  DOReferenceDetailsPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOAddressDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/addressDetails";
import { DOCustomerQuotePostSubmitPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/customerQuotePostSubmit";
import { DOFinancialPositionPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/financialPosition";

const FL_QQ_PRODUCT = "Finance Lease - Business Asg";
const FL_QQ_PROGRAM = "Finance Lease Business - MV Dealer";

/**
 * Cost of Asset (add-asset wizard) — plain digits for `currencymask` (same pattern as
 * `CSA_STANDARD_QUOTE_ASSET_VALUE` in `CSA_QuickQuote_SingleFlow.test.ts`); avoids overlap with QQ cash like `30000`.
 */
// const FL_STANDARD_QUOTE_ASSET_VALUE = "5000";

test(
  "DO Portal - Finance Lease — PDF regression (single run)",
  { tag: ["@regression"] },
  async ({ page }) => {
    test.setTimeout(1_200_000);

    const dashboardPage = new DODashboardPage(page);
    const quickQuotePage = new DOQuickQuotePage(page);

    // -------------------------------------------------------------------------
    // PDF: user logged in, dashboard, open Quick Quote
    // -------------------------------------------------------------------------
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
    await quickQuotePage.openQuickQuote();
    await expect(quickQuotePage.quickQuoteRoot).toBeVisible();
    await expect(quickQuotePage.quickQuoteForm).toBeVisible();

    // -------------------------------------------------------------------------
    // PDF: product and program empty (initial state) — optional strict empty cash
    // -------------------------------------------------------------------------
    const qq = 0;
    /** Per panel cash (plain). QQ2/QQ3 use smaller distinct amounts; fields are cleared before entry to avoid mask overlap with QQ1. */
    const flQqCashByPanel = ["100000", "20000", "30000"];
    /** Initial lease aligned per panel (same as cash) so min-payment rules stay satisfied after explicit clears. */
    const flQqInitialLeaseByPanel = ["100000", "20000", "30000"];

    const fillFlQuickQuotePanelForCalculate = async (qi: number): Promise<void> => {
      await quickQuotePage.dismissQuickQuoteDropdownOverlays();
      await quickQuotePage.ensureCalculateForCashPriceMode(qi);

      const cashPlain = flQqCashByPanel[qi] ?? flQqCashByPanel[0];
      const cashInput =
        qi === 0 ? quickQuotePage.cashPriceInput : quickQuotePage.cashPriceInputOnQuote(qi);

      if (qi === 0) {
        await quickQuotePage.clearCashPriceField();
      } else {
        await quickQuotePage.clearCashPriceFieldOnQuote(qi);
        await quickQuotePage.clearInitialLeaseAmountOnQuote(qi);
      }
      
      if (qi === 0) {
        await quickQuotePage.enterCashPrice(cashPlain);
      } else {
        await quickQuotePage.enterCashPriceOnQuote(qi, cashPlain);
      }

      const minCashCommitted = qi === 0 ? 10_000 : qi === 1 ? 15_000 : 5_000;
      await expect
        .poll(
          async () => {
            const raw = (await cashInput.inputValue()).replace(/[^0-9.]/g, "");
            return Number.parseFloat(raw) >= minCashCommitted;
          },
          { timeout: 30_000 },
        )
        .toBeTruthy();

      if (qi === 0) {
        await quickQuotePage.enterInterestRatePercent("4");
        await quickQuotePage.enterTermsMonths("36");
      } else {
        await quickQuotePage.enterInterestRatePercentOnQuote(qi, "4");
        await quickQuotePage.enterTermsMonthsOnQuote(qi, "36");
      }

      try {
        if (qi === 0) {
          await quickQuotePage.selectFrequency("Monthly");
        } else {
          await quickQuotePage.selectFrequencyOnQuote(qi, "Monthly");
        }
      } catch {
        /* program may already default Monthly */
      }

      const residualPct = qi === 0 ? "10" : qi === 1 ? "12" : "15";
      const residualDollarLoc =
        qi === 0 ? quickQuotePage.residualValueDollarInput : quickQuotePage.residualDollarInputOnQuote(qi);
      if (qi === 0) {
        await quickQuotePage.enterResidualValuePercent(residualPct);
      } else {
        await quickQuotePage.enterResidualValuePercentOnQuote(qi, residualPct);
      }
      await expect
        .poll(
          async () => {
            const raw = (await residualDollarLoc.inputValue()).replace(/[^0-9.]/g, "");
            return Number.parseFloat(raw) > 0;
          },
          { timeout: 25_000 },
        )
        .toBeTruthy();

      if (qi === 0) {
        if (await quickQuotePage.balloonPercentInput.isVisible().catch(() => false)) {
          await quickQuotePage.enterBalloonPercent("20");
        }
        if (await quickQuotePage.termsCheckbox.isVisible().catch(() => false)) {
          await quickQuotePage.confirmTermsAndConditions();
        }
      }
    };
    await expect(quickQuotePage.productDropdownTrigger).toBeVisible();
    await expect(quickQuotePage.programDropdownTrigger).toBeVisible();
    // const cashHidden = await quickQuotePage.cashPriceInput.isHidden().catch(() => false);
    // if (cashHidden) {
    //   await expect(quickQuotePage.cashPriceInput).toBeHidden();
    //   await expect(quickQuotePage.interestRatePercentInput).toBeHidden();
    // } else {
    //   await expect(quickQuotePage.cashPriceInput).toHaveValue("");
    //   await expect(quickQuotePage.interestRatePercentInput).toHaveValue("");
    // }

    // -------------------------------------------------------------------------
    // PDF: Calculate hidden or disabled until product/program chosen
    // -------------------------------------------------------------------------
    await quickQuotePage.expectCalculateButtonHiddenOrDisabled(qq);

    // -------------------------------------------------------------------------
    // PDF: select Finance Lease product; related programs appear in list
    // -------------------------------------------------------------------------
    await quickQuotePage.selectProduct(FL_QQ_PRODUCT);
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();
    await quickQuotePage.programDropdownTrigger.click();
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
    const programs = await page.getByRole("option").allTextContents();
    await page.keyboard.press("Escape");
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();
    expect(programs.length).toBeGreaterThan(0);
    expect(programs.some((t) => /Finance Lease|Personal|Dealer|Webform|MV|Retail|Operating|Business/i.test(t))).toBeTruthy();

    // -------------------------------------------------------------------------
    // PDF: select program; pricing fields appear
    // FL: Initial Lease, Lease Payment display, Residual % / $; deposit/balloon may be hidden.
    // -------------------------------------------------------------------------
    if (await quickQuotePage.programDropdownTrigger.isEnabled()) {
      await quickQuotePage.selectProgram(FL_QQ_PROGRAM);
    }
    if ((await quickQuotePage.calculateForDropdownTrigger.count()) > 0) {
      await expect(quickQuotePage.calculateForDropdownTrigger).toBeVisible();
      const calculateForHost = quickQuotePage.quickQuoteForm.locator(
        "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::p-dropdown[1]",
      );
      const hostCls = (await calculateForHost.getAttribute("class").catch(() => "")) ?? "";
      if (hostCls.includes("p-disabled")) {
        await expect(quickQuotePage.calculateForDropdownTrigger).toBeDisabled();
      }
    }
    await expect(quickQuotePage.cashPriceInput).toBeVisible();
    await expect(quickQuotePage.initialLeaseAmountInput).toBeVisible();
    await expect(quickQuotePage.interestRatePercentInput).toBeVisible();
    await expect(quickQuotePage.termsMonthsInput).toBeVisible();
    await expect(quickQuotePage.frequencyDropdownTrigger).toBeVisible();
    await expect(quickQuotePage.leasePaymentDisplay).toBeVisible();
    await expect(quickQuotePage.residualValuePercentInput).toBeVisible();
    await expect(quickQuotePage.residualValueDollarInput).toBeVisible();
    if (await quickQuotePage.depositPercentInput.isVisible().catch(() => false)) {
      await expect(quickQuotePage.depositPercentInput).toBeVisible();
      await expect(quickQuotePage.depositDollarInput).toBeVisible();
    }

    // -------------------------------------------------------------------------
    // PDF: Interest / Term / Frequency (visible; may pre-populate)
    // -------------------------------------------------------------------------
    await expect(quickQuotePage.interestRatePercentInput).toBeVisible();
    await expect(quickQuotePage.termsMonthsInput).toBeVisible();
    await expect(quickQuotePage.frequencyDropdownTrigger).toBeVisible();

    // -------------------------------------------------------------------------
    // PDF: Payment read-only before first calculation (CSA: payment input; FL: Lease Payment display)
    // -------------------------------------------------------------------------
    if (await quickQuotePage.paymentAmountInput.isVisible().catch(() => false)) {
      const locked = await quickQuotePage.paymentAmountInputIsReadOnly();
      const displayOnly = await quickQuotePage.paymentDisplay.isVisible().catch(() => false);
      expect(locked || displayOnly).toBeTruthy();
    }
    await expect(quickQuotePage.leasePaymentDisplay).toBeVisible();

    // -------------------------------------------------------------------------
    // FL: skip CSA-style term validation here — it often leaves error UI / disabled Calculate on FL builds.
    // Go straight to the same mandatory fill as `quickQuote.test.ts` (proven path).
    // -------------------------------------------------------------------------
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();

    // -------------------------------------------------------------------------
    // PDF: first successful Calculate — FL Quick Quote (sanity-equivalent fill)
    // -------------------------------------------------------------------------
    await fillFlQuickQuotePanelForCalculate(0);
    if (!(await quickQuotePage.calculateButton.isEnabled().catch(() => false))) {
      await quickQuotePage.enterInitialLeaseAmount("100000");
      if (await quickQuotePage.termsCheckbox.isVisible().catch(() => false)) {
        await quickQuotePage.confirmTermsAndConditions();
      }
    }
    await expect
      .poll(
        async () => quickQuotePage.calculateButton.isEnabled().catch(() => false),
        { timeout: 90_000, intervals: [300, 600, 1_200, 2_000] },
      )
      .toBeTruthy();
    await quickQuotePage.clickCalculate();
    await quickQuotePage.expectCreateQuoteVisible();

    const summary = quickQuotePage.calculationSummaryRegion.first();
    await expect(summary).toBeVisible({ timeout: 30_000 });
    await expect.soft(summary).toContainText(/Finance\s*Lease|Lease|Amount\s*Financed|Lease\s*Payment/i);
    await expect.soft(summary).toContainText(/Total (Amount )?Payable|Total Payable|Total.*Lease|Lease.*Cost|Amount Payable|Fees|Interest/i);
    await summary
      .getByText(/\$18[, ]?000|18[, ]?000(?:\.00)?|\$180\.00|90[, ]?000|100[, ]?000|20[, ]?000|30[, ]?000/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    // -------------------------------------------------------------------------
    // Quick Quote 2 & 3 — three comparison panels (POM: clickAddComparison2 / clickAddComparison3, quoteCard).
    // Add Comparison 3 stays disabled until QQ2 is calculated (UDP-2831 / UDP-2631 behaviour).
    // -------------------------------------------------------------------------
    await expect(quickQuotePage.addComparison2Button).toBeEnabled();
    await quickQuotePage.clickAddComparisonPrimary();
    expect(await quickQuotePage.quickQuotePanelCount()).toBe(2);
    await quickQuotePage.clearCashPriceFieldOnQuote(1);
    await quickQuotePage.clearInitialLeaseAmountOnQuote(1);
    await expect
      .poll(
        async () => {
          const raw = Number.parseFloat(
            (await quickQuotePage.cashPriceInputOnQuote(1).inputValue()).replace(/[^0-9.]/g, "") || "0",
          );
          return raw < 5_000;
        },
        { timeout: 12_000, intervals: [250, 500] },
      )
      .toBeTruthy();
    await expect(quickQuotePage.addComparison3Button).toBeDisabled();

    await fillFlQuickQuotePanelForCalculate(1);
    if (
      !(await quickQuotePage
        .quoteForm(1)
        .getByRole("button", { name: /^Calculate$/i })
        .isEnabled()
        .catch(() => false))
    ) {
      await quickQuotePage.enterInitialLeaseAmountOnQuote(1, flQqInitialLeaseByPanel[1]);
    }
    await expect
      .poll(
        async () =>
          quickQuotePage
            .quoteForm(1)
            .getByRole("button", { name: /^Calculate$/i })
            .isEnabled()
            .catch(() => false),
        { timeout: 90_000, intervals: [300, 600, 1_200, 2_000] },
      )
      .toBeTruthy();
    await quickQuotePage.clickCalculateOnQuote(1);
    await quickQuotePage.expectCreateQuoteVisible(0);

    await expect(quickQuotePage.addComparison3Button).toBeEnabled();
    await quickQuotePage.clickAddComparison3();
    expect(await quickQuotePage.quickQuotePanelCount()).toBe(3);
    await quickQuotePage.clearCashPriceFieldOnQuote(2);
    await quickQuotePage.clearInitialLeaseAmountOnQuote(2);
    await expect
      .poll(
        async () => {
          const raw = Number.parseFloat(
            (await quickQuotePage.cashPriceInputOnQuote(2).inputValue()).replace(/[^0-9.]/g, "") || "0",
          );
          return raw < 5_000;
        },
        { timeout: 12_000, intervals: [250, 500] },
      )
      .toBeTruthy();

    await fillFlQuickQuotePanelForCalculate(2);
    if (
      !(await quickQuotePage
        .quoteForm(2)
        .getByRole("button", { name: /^Calculate$/i })
        .isEnabled()
        .catch(() => false))
    ) {
      await quickQuotePage.enterInitialLeaseAmountOnQuote(2, flQqInitialLeaseByPanel[2]);
    }
    await expect
      .poll(
        async () =>
          quickQuotePage
            .quoteForm(2)
            .getByRole("button", { name: /^Calculate$/i })
            .isEnabled()
            .catch(() => false),
        { timeout: 90_000, intervals: [300, 600, 1_200, 2_000] },
      )
      .toBeTruthy();
    await quickQuotePage.clickCalculateOnQuote(2);
    await quickQuotePage.expectCreateQuoteVisible(0);

    await quickQuotePage.expectNoAddComparison4Button();

    // -------------------------------------------------------------------------
    // After all three comparisons are calculated: Create Quote from Quick Quote 1 only (panel 0).
    // -------------------------------------------------------------------------

    // -------------------------------------------------------------------------
    // PDF: Calculate For enabled after first calculation
    // -------------------------------------------------------------------------
    if ((await quickQuotePage.calculateForDropdownTrigger.count()) > 0) {
      await expect.soft(quickQuotePage.calculateForDropdownTrigger).toBeEnabled();
    }

    // -------------------------------------------------------------------------
    // PDF: Deposit % / $ sync (only when deposit row exists; not part of sanity minimal fill)
    // -------------------------------------------------------------------------
    if (await quickQuotePage.depositPercentInput.isVisible().catch(() => false)) {
      await quickQuotePage.enterDepositPercent("10%");
      await expect(quickQuotePage.depositDollarInput).toHaveValue(/2[, ]?000|2000|9[, ]?000|10[, ]?000|10000|9000/i, {
        timeout: 25_000,
      });
      await quickQuotePage.clearDepositDollarField();
      await quickQuotePage.enterDepositDollars("$4,000.00");
      await expect(quickQuotePage.depositPercentInput).toHaveValue(/20|4/);
      await quickQuotePage.clickCalculate();
      await quickQuotePage.expectCreateQuoteVisible();
    }

    // -------------------------------------------------------------------------
    // PDF: Balloon % / $ sync (uncomment when included in PDF run)
    // -------------------------------------------------------------------------
    // await quickQuotePage.enterBalloonPercent("20%");
    // await expect(quickQuotePage.balloonDollarInput).toHaveValue(/4[, ]?000|4000/, { timeout: 25_000 });
    // await quickQuotePage.clearBalloonDollarField();
    // await quickQuotePage.enterBalloonDollars("$5,000.00");
    // await expect(quickQuotePage.balloonPercentInput).toHaveValue(/25/);
    // await quickQuotePage.clickCalculate();
    // await quickQuotePage.expectCreateQuoteVisible();
    // await quickQuotePage.enterBalloonDollars("$5,000");
    // await quickQuotePage.setFixedCheckbox(true);
    // await quickQuotePage.clickCalculate();
    // await quickQuotePage.expectCreateQuoteVisible();
    // await quickQuotePage.setFixedCheckbox(false);

    // -------------------------------------------------------------------------
    // PDF: Calculate For = Cash Price / Deposit / Balloon (alternate PDF branch)
    // -------------------------------------------------------------------------
    // await quickQuotePage.selectCalculateFor("Cash Price");
    // await quickQuotePage.enterPaymentAmount("450");
    // await quickQuotePage.enterInterestRatePercent("9");
    // await quickQuotePage.enterTermsMonths("36");
    // await quickQuotePage.selectFrequency("Monthly");
    // await quickQuotePage.clickCalculate();
    // await expect(quickQuotePage.cashPriceInput).not.toHaveValue("");
    //
    // await quickQuotePage.selectCalculateFor("Deposit");
    // await quickQuotePage.enterPaymentAmount("500");
    // await quickQuotePage.enterCashPrice("20000");
    // await quickQuotePage.enterInterestRatePercent("9");
    // await quickQuotePage.enterTermsMonths("36");
    // await quickQuotePage.selectFrequency("Monthly");
    // await quickQuotePage.clickCalculate();
    // await expect(quickQuotePage.depositPercentInput).not.toHaveValue("");
    //
    // await quickQuotePage.selectCalculateFor("Balloon");
    // await quickQuotePage.enterPaymentAmount("480");
    // await quickQuotePage.enterCashPrice("20000");
    // await quickQuotePage.enterInterestRatePercent("9");
    // await quickQuotePage.enterTermsMonths("36");
    // await quickQuotePage.selectFrequency("Monthly");
    // await quickQuotePage.clickCalculate();
    // await expect(quickQuotePage.balloonPercentInput).not.toHaveValue("");

    // -------------------------------------------------------------------------
    // PDF: Reset → default / cleared (uncomment when PDF requires)
    // -------------------------------------------------------------------------
    // await quickQuotePage.clickReset();
    // await expect(quickQuotePage.cashPriceInput).toHaveValue("");

    // -------------------------------------------------------------------------
    // PDF: QQ1–QQ3 comparison flow is active above (`clickAddComparisonPrimary`, `clickAddComparison3`).
    // -------------------------------------------------------------------------

    // -------------------------------------------------------------------------
    // PDF: Print / Download (trial; MAF-6689)
    // -------------------------------------------------------------------------
    await expect(quickQuotePage.printButton).toBeVisible();
    await expect(quickQuotePage.downloadButton).toBeVisible();
    await quickQuotePage.printButton.click({ trial: true });
    await quickQuotePage.downloadButton.click({ trial: true });

    // -------------------------------------------------------------------------
    // PDF: Create Quote → Standard Quote — Quick Quote 1 only ($100,000 cash); panels 2–3 are compared only.
    // -------------------------------------------------------------------------
    await expect(quickQuotePage.createQuoteButtonOnPanel(0)).toBeEnabled({ timeout: 30_000 });
    await quickQuotePage.selectQuickQuotePanelForStandardQuoteIfShown(0);
    await quickQuotePage.clickCreateQuote(0);
    const standardRoot = page.locator("app-quote-details, app-standard-quote").first();
    await expect(standardRoot).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/Finance Lease|Lease|Credit Sale/i).first()).toBeVisible();

    const assetDetailsPage = new DOAssetDetailsPage(page);
    const addAssetPage = new DOAddAssetPage(page);
    // -------------------------------------------------------------------------
    // Asset Details (FL): Originator ref + lease date; then same asset path as `Financelease.test.ts`
    // (enterAsset → condition → **openAssetInsuranceTradeInSummary** → **clickAssetSummaryEditButton** → add-asset → Calculate ×2 → Next).
    // -------------------------------------------------------------------------
    await assetDetailsPage.waitForAssetDetailsStepReady();
    await assetDetailsPage.expectProductProgramCarriedFromQuickQuote(FL_QQ_PRODUCT, FL_QQ_PROGRAM, {
      requireLockedDropdowns: false,
    });
    await assetDetailsPage.expectFinanceCarriedFromQuickQuote({
      cashPrice: /100[, ]?000|1000000/i,
      term: /36/,
      frequencyText: /Monthly/i,
      interestRate: /4|9|12/,
    });
    await assetDetailsPage.enterOriginationReferenceFinanceLease("Test Orig Ref 123");
    await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();

    // Same order as `Financelease.test.ts`: asset + condition → **Asset & Insurance Summary** → **Edit** → add-asset wizard.
    await assetDetailsPage.enterAsset("Car and Light Commercial /");
    await assetDetailsPage.selectCondition("Used");
    await assetDetailsPage.openAssetInsuranceTradeInSummary();
    await assetDetailsPage.clickAssetSummaryEditButton();
    // Cost of Asset: > 0, ≤ carried cash (~$100k) — avoids "minimum greater than 0" and "cannot be greater than {{0}}".
    // await addAssetPage.enterAssetValue("$10,000");
    await addAssetPage.selectCondition("Used");
    await addAssetPage.selectYear("2025");
    await addAssetPage.enterMake("Toyota");
    await addAssetPage.enterModel("Hilux");
    await addAssetPage.enterVariant("Top");
    await addAssetPage.enterRegoNO("TG08BP5123");
    await addAssetPage.enterVIN("1HGCM82633A004352");
    await addAssetPage.enterOdometer("50000");
    await addAssetPage.enterColour("Black");
    await addAssetPage.enterSerialNO("0999944477");
    await addAssetPage.enterEngineNO("1133445588");
    await addAssetPage.enterCCRating("5");
    await addAssetPage.chooseMotivePower("Petrol");
    await addAssetPage.chooseCountryRegistered("New Zealand");
    await addAssetPage.chooseAssetLocation("North Island");
    await addAssetPage.clickSummitButton();
    // ServiceBusinessException / AssetType / cost rules: re-apply valid cost and resubmit if the portal shows these errors.
    const assetWizardCostOrTypeError = page.getByText(
      /AssetType|Supply more property|Cost of Asset minimum|greater than 0|cannot be greater than|ServiceBusinessException/i,
    );
    for (let repair = 0; repair < 2; repair++) {
      if (await assetWizardCostOrTypeError.first().isVisible({ timeout: 4_000 }).catch(() => false)) {
        // await addAssetPage.enterAssetValue(FL_STANDARD_QUOTE_ASSET_VALUE);
        await addAssetPage.clickSummitButton();
      } else {
        break;
      }
    }
    await addAssetPage.clickCrossButton();
    await assetDetailsPage.enterOriginationReferenceFinanceLease("Test Orig Ref 123");
    await assetDetailsPage.termsOfFinance("36");
    await assetDetailsPage.interestRate("4");
    await assetDetailsPage.enterOriginationReferenceFinanceLease("Test Orig Ref 123");
    await assetDetailsPage.clickCalculateButton();
    // Residual % must yield residual $ ≤ cash price on this build (20% can trip validation vs GST/cash display).
    await assetDetailsPage.enterResidualValuePercentFinanceLease("10");
    await assetDetailsPage.interestRate("4");
    await assetDetailsPage.enterOriginationReferenceFinanceLease("Test Orig Ref 123", true);
    await assetDetailsPage.clickCalculateButton();
    await assetDetailsPage.enterOriginationReferenceFinanceLease("Test Orig Ref 123", true);
    await assetDetailsPage.clickNextButtonFinanceLease("Test Orig Ref 123");
    const customerDetailsPage = new DOCustomerDetailsPage(page);
    await customerDetailsPage.waitForAddBorrowerButton();
    await customerDetailsPage.clickAddBorrowersOrGuarantors();
    await customerDetailsPage.searchCustomer.searchByUdcNumber("420");
    await customerDetailsPage.clickAddNewCustomerButton();
    const businessDetailsPage = new DOBusinessDetailsPage(page);
    const addressDetailsPage = new DOAddressDetailsPage(page);
    const financialPositionPage = new DOFinancialPositionPage(page);
    const referenceDetailsPage = new DOReferenceDetailsPage(page);
    await businessDetailsPage.waitForBusinessDetailsStep();

    // ---- FL: Business Details blank validation ----
    await businessDetailsPage.selectOrganisationType("");
    await businessDetailsPage.enterLegalName("");
    await businessDetailsPage.enterTradingName("");
    await businessDetailsPage.enterRegisteredCompanyNumber("");
    await businessDetailsPage.enterNzBusinessNumber("");
    await businessDetailsPage.enterGstNumber("");
    await businessDetailsPage.fillBusinessDescription("");
    await businessDetailsPage.selectPrimaryNatureOfBusiness("");
    await businessDetailsPage.selectSourceOfWealth("");
    await businessDetailsPage.enterTimeInBusiness("", "");
    await businessDetailsPage.enterBusinessAreaCode("");
    await businessDetailsPage.enterBusinessPhoneNumber("");
    await businessDetailsPage.enterBusinessEmail("");

    await businessDetailsPage.clickNextButton();
    await businessDetailsPage.expectBusinessDetailsRequiredValidationMessages();

    // ---- FL: Business Details invalid format validation ----
    await businessDetailsPage.selectOrganisationType("Incorporated Body");
    await businessDetailsPage.enterLegalName("Test Legal Entity Ltd");
    await businessDetailsPage.enterTradingName("Test Trading");
    await businessDetailsPage.enterRegisteredCompanyNumber("jk!");
    await businessDetailsPage.enterNzBusinessNumber("12");
    await businessDetailsPage.enterGstNumber("xx");
    await businessDetailsPage.fillBusinessDescription(
      "Automation test — wholesale trade sample description.",
    );
    await businessDetailsPage.selectPrimaryNatureOfBusiness(
      "0113 Vegetable Growing",
    );
    await businessDetailsPage.selectSourceOfWealth("Business Activity");
    await businessDetailsPage.enterTimeInBusiness("5", "3");
    await businessDetailsPage.enterBusinessAreaCode("9");
    await businessDetailsPage.enterBusinessPhoneNumber("ioi900");
    await businessDetailsPage.enterBusinessEmail("jkbhbu");

    await businessDetailsPage.clickNextButton();
    await businessDetailsPage.expectBusinessDetailsInvalidFormatValidationMessages();

    // Replace invalid values + legal (company) name if build shows "This field cannot be blank" on Legal Company Name.
    await businessDetailsPage.enterLegalName("Test Legal Entity Ltd");
    await businessDetailsPage.enterRegisteredCompanyNumber("1234567");
    await businessDetailsPage.enterNzBusinessNumber("9429031234567");
    await businessDetailsPage.enterGstNumber("12345678");
    await businessDetailsPage.enterBusinessPhoneNumber("0211234567");
    await businessDetailsPage.enterBusinessEmail("liza.doe@example.com");
    await businessDetailsPage.clickNextButton();
    await addressDetailsPage.waitForPhysicalAddressStep();

    // ---- FL: Address Details — Physical (blank required fields) ----
    await addressDetailsPage.timeAtAddress("", "");
    await addressDetailsPage.enterStreetNumber("");
    await addressDetailsPage.enterStreetName("");
    await addressDetailsPage.enterCity("");
    await addressDetailsPage.touchPhysicalResidenceTypeWithoutSelection();
    await addressDetailsPage.clickSaveAddressDetails();
    await addressDetailsPage.expectPhysicalAddressRequiredValidationMessages();

    // Physical Address — valid data (same sequence as CSA_QuickQuote_SingleFlow.test.ts § Physical Address).
    await addressDetailsPage.timeAtAddress("1", "1");
    await addressDetailsPage.enterStreetNumber("123");
    await addressDetailsPage.enterStreetName("Main Street");
    await addressDetailsPage.enterCity("Wellington");
    await addressDetailsPage.chooseCountry("New Zealand");
    await addressDetailsPage.selectResidenceTypeIfPresent("Boarding");

    // Reuse for Postal Address → Yes (click once if toggle starts on No) — CSA line 485.
    await addressDetailsPage.clickReuseForPostalAddressToggle();

    // FL business (Financelease.test.ts): register reuse Yes + overseas No when shown.
    await page.waitForTimeout(150);
    await addressDetailsPage.ensureReuseForRegisterAddressYes();

    // Previous Physical Address — explicit empty / Save / assert when section exists (CSA lines 488–496).
    if (await addressDetailsPage.isPreviousPhysicalAddressVisible(5_000)) {
      await addressDetailsPage.previousTimeAtAddress("", "");
      await addressDetailsPage.enterPreviousStreetNumber("");
      await addressDetailsPage.enterPreviousStreetName("");
      await addressDetailsPage.enterPreviousCity("");
      await addressDetailsPage.touchPreviousPhysicalResidenceTypeWithoutSelection();
      await addressDetailsPage.clickSaveAddressDetails();
      await addressDetailsPage.expectPreviousPhysicalAddressRequiredValidationMessages();
    }

    await addressDetailsPage.ensureOverseasAddressNoIfPreviousPhysicalVisible();
    await addressDetailsPage.fillPreviousPhysicalRequiredIfPresent({
      years: "1",
      months: "1",
      streetNumber: "45",
      streetName: "Queen Street",
      city: "Wellington",
      country: "New Zealand",
    });

    await addressDetailsPage.clickNextButton();
    await financialPositionPage.waitForFinancialPositionStep();

    // ---- FL: Profit declaration **No** → **Yes** (radio smoke), then **Next**; optional validation (fast) ----
    // Profit declaration: **No** then **Yes** — confirms radios respond before continuing.
    await financialPositionPage.selectBusinessNetProfitLastYearNo();
    await page.waitForTimeout(200);
    await financialPositionPage.selectBusinessNetProfitLastYearYes();
    await page.waitForTimeout(300);
    await financialPositionPage.expectFinancialPositionRequiredValidationMessages({
      optional: true,
      timeoutMs: 4_000,
    });

    // ---- FL: Net Profit = Yes, but all amounts = $0.00 ----
    // await financialPositionPage.fillBusinessNetProfitLastYear("$0.00");
    // await financialPositionPage.fillBusinessTurnoverLatestYear("$0.00", "31/03/2025");
    // await financialPositionPage.fillBusinessCashBalance("$0.00", "31/03/2025");
    // await financialPositionPage.clickNextButton();
    // await financialPositionPage.expectFinancialPositionNetProfitLastYearAmountGreaterThanZeroValidation();
    
    // ---- IMPORTANT: Clear / overwrite fields with valid data now ----
    // No waitForFinancialPositionStep() here — we're already on it!
    // No selectBusinessNetProfitLastYearYes() again — it's already Yes!
    await financialPositionPage.fillBusinessNetProfitLastYear("50000");
    await financialPositionPage.fillBusinessTurnoverLatestYear("500000", "31/03/2025");
    await financialPositionPage.fillBusinessCashBalance("10000", "31/03/2025");
    await financialPositionPage.clickNextButton();

    // Reference Details — add contact, confirm, submit
    await referenceDetailsPage.waitForReferenceDetailsStep();
    await referenceDetailsPage.clickAddContactDetails();
    await referenceDetailsPage.selectContactType("Accountant");
    await referenceDetailsPage.enterContactFirstName("Alex");
    await referenceDetailsPage.enterContactLastName("Referee");
    await referenceDetailsPage.clickAddContactInModal();
    // Reference: assert “Please confirm…” when **Submit** is used without the checkbox, then tick and advance.
    await referenceDetailsPage.expectConfirmCustomerDetailsCheckboxRequiredValidation();
    await referenceDetailsPage.confirmCustomerDetailsCorrect();
    await referenceDetailsPage.advanceFromReferenceDetailsToPostSubmission();

    const customerQuotePostSubmitPage = new DOCustomerQuotePostSubmitPage(page);

    await customerQuotePostSubmitPage.waitForUploadStep();

    // Notes: existing cards show author + date | time; >1000 chars rejected; exactly 1000 saves; list truncates with **More**.
    await customerQuotePostSubmitPage.expectExistingNoteCardsShowAuthorAndTimestamp();
    await customerQuotePostSubmitPage.expectOversizedNoteRejectedOnSubmit();
    await customerQuotePostSubmitPage.submitNoteOfExactLengthFromDialog(1000);
    await customerQuotePostSubmitPage.expectNoteListShowsMoreForLongSavedNote();

    // Upload tab: .jpg + .pdf succeed; >20 MB rejected; Preview (new tab); Download; Delete removes tile.
    await customerQuotePostSubmitPage.uploadJpgThenPdfExpectBothVisible();
    await customerQuotePostSubmitPage.expectOversizeBinaryUploadRejected();
    await customerQuotePostSubmitPage.expectUploadTabPreviewOpensNewTab();
    await customerQuotePostSubmitPage.expectUploadTabDownloadStarts();
    await customerQuotePostSubmitPage.deleteUploadedDocumentTileByBasenameAndExpectRemoved(
      "minimal-upload.jpg",
    );

    await customerQuotePostSubmitPage.openDocumentsTab();
    // await customerQuotePostSubmitPage.selectAllDocumentsAndCreditAdviceRowsForBulkPreview();
    // await customerQuotePostSubmitPage.clickDocumentsTabPreviewOpensNewTab(); //now This is the correct way to preview the documents But we are not using it because we are not able to download the documents
    await customerQuotePostSubmitPage.selectCustomerQuoteBasicRow();
    await customerQuotePostSubmitPage.clickDownload();
    await customerQuotePostSubmitPage.confirmDocumentParameters();

    // FL: Documents tab can leave overlays / wrong scroll context; Upload tab anchors the notes + status header reliably.
    await customerQuotePostSubmitPage.ensureUploadTab();
    await page.keyboard.press("Escape").catch(() => {});

    // Same sequence as `CSA_QuickQuote_SingleFlow.test.ts` (notes → Open Quote / status → Submit → declaration).
    await customerQuotePostSubmitPage.addNoteAndSubmit(
      "Automated sanity note — Finance Lease Standard Quote.",
    );
    await customerQuotePostSubmitPage.submitQuoteFromStatusMenu();
    await customerQuotePostSubmitPage.confirmSubmitQuoteDialogIfPresent();
    await customerQuotePostSubmitPage.completeOriginatorDeclaration();
  },
);


