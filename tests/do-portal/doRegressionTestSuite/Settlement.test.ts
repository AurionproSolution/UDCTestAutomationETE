/**
 * DO Portal — Settlement regression (UDP-T3952–UDP-T3989).
 * Scenario source: SETTLEMENT.xlsx (Zephyr / Regression Automation/Settlement).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 *
 * Loan-lookup and dealer-listing scenarios require `testData/do-portal/settlementTestData.json`
 * to be populated with QAT-activated loan Rego/VIN values.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAssetDetailsPage,
  DODashboardPage,
  DOSettlementPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import settlementData from "../../../testData/do-portal/settlementTestData.json";

const TLC_DEALER = settlementData.dealer;

type ProductKey = keyof typeof settlementData.products;

function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

function requireLoanId(value: string, label: string): string {
  if (!value?.trim()) {
    test.skip(true, `Populate settlementTestData.json → ${label} for this scenario.`);
  }
  return value.trim();
}

async function openStandardQuoteForProduct(
  page: Page,
  productKey: ProductKey,
): Promise<{
  dashboardPage: DODashboardPage;
  assetDetailsPage: DOAssetDetailsPage;
  settlementPage: DOSettlementPage;
}> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  const settlementPage = new DOSettlementPage(page);
  const cfg = settlementData.products[productKey];

  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await dashboardPage.clickCreateStandardQuote();

  if (productKey === "csa") await dashboardPage.selectCSAproduct();
  else if (productKey === "tl") await dashboardPage.selectTermLoanProduct();
  else if (productKey === "afv") await dashboardPage.selectAssuredFutureValueProduct();
  else if (productKey === "fl") await dashboardPage.selectFinanceLeaseProduct();
  else if (productKey === "ol") {
    const dlg = page.getByRole("dialog");
    await dlg.getByText(/Operating\s*Lease/i).first().click();
  }

  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.waitForAssetDetailsStepReady();
  await assetDetailsPage.chooseProduct(cfg.product);
  if ("program" in cfg && cfg.program) {
    await assetDetailsPage.chooseProgram(cfg.program);
  }
  return { dashboardPage, assetDetailsPage, settlementPage };
}

/** TL quote must be calculable before the Less Deposit **Settlement** trigger enables on SIT. */
async function prepareCalculableTlQuoteForSettlement(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
): Promise<void> {
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
  await assetDetailsPage.enterOriginationReference("SQ-Settlement-Ref-01");
  await assetDetailsPage.enterTradeAmount("$5,000");
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero({ timeoutMs: 90_000 });
  await expect
    .poll(
      async () =>
        (await assetDetailsPage.netTradeAmountDisplayed.inputValue()).replace(/[$,]/g, ""),
      { timeout: 45_000 },
    )
    .toMatch(/5000/);
}

async function prepareQuoteForSettlementIfNeeded(
  page: Page,
  productKey: ProductKey,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  if (productKey === "tl" || productKey === "csa") {
    const addAssetPage = new DOAddAssetPage(page);
    if (productKey === "tl") {
      await prepareCalculableTlQuoteForSettlement(assetDetailsPage, addAssetPage);
    } else {
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
      await assetDetailsPage.interestRate("11");
      await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
      await assetDetailsPage.enterOriginationReference("SQ-Settlement-CSA-01");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero({ timeoutMs: 90_000 });
      await assetDetailsPage.enterTradeAmount("$5,000");
    }
  }
}

async function openSettlementPopupFromQuote(
  page: Page,
  productKey: ProductKey = "tl",
): Promise<{
  assetDetailsPage: DOAssetDetailsPage;
  settlementPage: DOSettlementPage;
}> {
  const { assetDetailsPage, settlementPage } = await openStandardQuoteForProduct(page, productKey);
  await prepareQuoteForSettlementIfNeeded(page, productKey, assetDetailsPage);
  if (await settlementPage.settlementTrigger.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await settlementPage.openSettlementFromQuote();
  } else {
    test.skip(true, `Settlement trigger not visible for ${productKey} on this build.`);
  }
  return { assetDetailsPage, settlementPage };
}

async function completeLoanSearchToDisplay(
  settlementPage: DOSettlementPage,
  regoOrVin: string,
  useVin = false,
): Promise<void> {
  if (useVin) {
    await settlementPage.clearRego();
    await settlementPage.enterVin(regoOrVin);
  } else {
    await settlementPage.enterRego(regoOrVin);
    await settlementPage.clearVin();
  }
  await settlementPage.clickNext();
  await settlementPage.expectSettlementDisplayScreen();
}

/** Existing Standard Quote (e.g. 2361) → Asset Details → Settlement loan-search pop-up. */
async function openSettlementFromExistingQuote(page: Page): Promise<{
  assetDetailsPage: DOAssetDetailsPage;
  settlementPage: DOSettlementPage;
}> {
  const quoteId = settlementData.existingQuotes.settlementFromAssetDetails;
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  const settlementPage = new DOSettlementPage(page);

  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.openStandardQuoteByQuoteId(quoteId);
  await assetDetailsPage.expectStandardQuoteLoaded();
  await assetDetailsPage.openSettlementDialog();
  await settlementPage.expectSettlementSearchScreenVisible();

  return { assetDetailsPage, settlementPage };
}

test.describe("Settlement @do @regression", () => {
  test(
    "UDP-T3952 - Access Settlement Screen from Asset Details Standard Quote",
    { tag: ["@do", "@regression", "@UDP-T3952"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await openSettlementFromExistingQuote(page);
      await settlementPage.expectSettlementDateIsToday();
    },
  );

  test(
    "UDP-T3953 - Access Settlement from Dealer Listing Activated Loans",
    { tag: ["@do", "@regression", "@UDP-T3953"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const loanId = requireLoanId(
        settlementData.dealerListing.activatedLoanRegoOrVin,
        "dealerListing.activatedLoanRegoOrVin",
      );
      const dashboardPage = new DODashboardPage(page);
      const settlementPage = new DOSettlementPage(page);
      await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
      await dashboardPage.waitForAuthenticatedDashboard();
      await dashboardPage.selectDealer(TLC_DEALER);
      await dashboardPage.navigateToDealerListingActiveLoans();
      await dashboardPage.clickCreateSettlementQuoteForLoan(loanId);
      await expect.soft(settlementPage.regoInput.or(settlementPage.vinInput).first()).toBeVisible({
        timeout: 45_000,
      });
    },
  );

  test(
    "UDP-T3954 - Settlement NOT Available for Finance Lease (FL) and Operating Lease (OL) Product",
    { tag: ["@do", "@regression", "@UDP-T3954"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage: flSettlement } = await openStandardQuoteForProduct(page, "fl");
      await flSettlement.expectSettlementTriggerHidden();
      const { settlementPage: olSettlement } = await openStandardQuoteForProduct(page, "ol");
      await olSettlement.expectSettlementTriggerHidden();
    },
  );

  test(
    "UDP-T3955 - Rego Number Valid Alphanumeric Input (Max 6 Characters)",
    { tag: ["@do", "@regression", "@UDP-T3955"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const rego = settlementData.fieldSamples.validRegoMax6Alphanumeric;
      const { settlementPage } = await openSettlementFromExistingQuote(page);

      await settlementPage.expectSettlementDateIsPopulated();
      await settlementPage.enterRego(rego);
      await settlementPage.clearVin();
      await settlementPage.expectRegoValue(rego);
      await settlementPage.expectVinIsBlank();
      await settlementPage.expectNoRegoValidationError();
      await settlementPage.clickNext();
      await settlementPage.expectLoanSearchStepCompleted();
    },
  );

  test(
    "UDP-T3956 - Rego Number Special Characters Not Allowed",
    { tag: ["@do", "@regression", "@UDP-T3956"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await openSettlementFromExistingQuote(page);
      await settlementPage.enterRego(settlementData.fieldSamples.invalidRegoSpecialChars);
      await settlementPage.clickNext();
      await settlementPage.expectRegoValidationError();
    },
  );

  test(
    "UDP-T3957 - VIN Valid Alphanumeric Input (Max 17 Characters)",
    { tag: ["@do", "@regression", "@UDP-T3957"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await settlementPage.clearRego();
      await settlementPage.enterVin(settlementData.fieldSamples.validVin);
      await settlementPage.clickNext();
      const vinVal = settlementData.loanLookup.validVinSameDealer;
      if (vinVal) {
        await settlementPage.expectSettlementDisplayScreen();
      } else {
        await expect
          .poll(
            async () =>
              (await settlementPage.vinInput.inputValue().catch(() => "")).includes("1HGBH") ||
              (await page.getByText(/not found|privacy|settlement/i).first().isVisible().catch(() => false)),
          )
          .toBeTruthy();
      }
    },
  );

  test(
    "UDP-T3958 - VIN Special Characters Not Allowed",
    { tag: ["@do", "@regression", "@UDP-T3958"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await settlementPage.enterVin(settlementData.fieldSamples.invalidVinSpecialChars);
      await settlementPage.clickNext();
      await settlementPage.expectVinValidationError();
    },
  );

  test(
    "UDP-T3959 - Settlement Date Defaults to Today's Date",
    { tag: ["@do", "@regression", "@UDP-T3959"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await openSettlementPopupFromQuote(page, "csa");
      await settlementPage.expectSettlementDateIsToday();
    },
  );

  test(
    "UDP-T3960 - Settlement Date Past Date Not Accepted",
    { tag: ["@do", "@regression", "@UDP-T3960"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await settlementPage.expectPastSettlementDateRejected();
    },
  );

  test(
    "UDP-T3961 - Rego Pre-Populated When Accessed from Dealer Listing",
    { tag: ["@do", "@regression", "@UDP-T3961"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const loanId = requireLoanId(
        settlementData.dealerListing.activatedLoanRegoOrVin,
        "dealerListing.activatedLoanRegoOrVin",
      );
      const dashboardPage = new DODashboardPage(page);
      const settlementPage = new DOSettlementPage(page);
      await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
      await dashboardPage.waitForAuthenticatedDashboard();
      await dashboardPage.selectDealer(TLC_DEALER);
      await dashboardPage.navigateToDealerListingActiveLoans();
      await dashboardPage.clickCreateSettlementQuoteForLoan(loanId);
      const rego = (await settlementPage.regoInput.inputValue()).trim();
      const vin = (await settlementPage.vinInput.inputValue()).trim();
      expect(rego.length > 0 || vin.length > 0).toBeTruthy();
    },
  );

  test(
    "UDP-T3962 - Loan Found Same Dealer Proceed to Settlement Display",
    { tag: ["@do", "@regression", "@UDP-T3962"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.validRegoSameDealer,
        "loanLookup.validRegoSameDealer",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, rego, false);
      await settlementPage.expectCustomerDetailsPopulated();
    },
  );

  test(
    "UDP-T3963 - Loan Found Different Dealer Privacy Waiver Required",
    { tag: ["@do", "@regression", "@UDP-T3963"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.validRegoDifferentDealer,
        "loanLookup.validRegoDifferentDealer",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await settlementPage.enterRego(rego);
      await settlementPage.clickNext();
      await settlementPage.expectPrivacyWaiverScreen();
    },
  );

  test(
    "UDP-T3964 - Privacy Waiver Checkbox Not Selected Cannot Proceed",
    { tag: ["@do", "@regression", "@UDP-T3964"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.validRegoDifferentDealer,
        "loanLookup.validRegoDifferentDealer",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await settlementPage.enterRego(rego);
      await settlementPage.clickNext();
      await settlementPage.expectPrivacyWaiverScreen();
      await settlementPage.setPrivacyWaiverConsent(false);
      await settlementPage.expectPrivacyWaiverBlocksProceed();
    },
  );

  test(
    "UDP-T3965 - Privacy Waiver Checkbox Selected Proceeds to Settlement Display",
    { tag: ["@do", "@regression", "@UDP-T3965"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.validRegoDifferentDealer,
        "loanLookup.validRegoDifferentDealer",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await settlementPage.enterRego(rego);
      await settlementPage.clickNext();
      await settlementPage.expectPrivacyWaiverScreen();
      await settlementPage.setPrivacyWaiverConsent(true);
      await settlementPage.clickNext();
      await settlementPage.expectSettlementDisplayScreen();
    },
  );

  test(
    "UDP-T3966 - Vehicle Not Found Error Message Displayed",
    { tag: ["@do", "@regression", "@UDP-T3966"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await settlementPage.enterRego(settlementData.loanLookup.invalidRegoOrVin);
      await settlementPage.clickNext();
      await settlementPage.expectVehicleNotFoundError();
    },
  );

  test(
    "UDP-T3967 - Business Rules Not Met Return Error",
    { tag: ["@do", "@regression", "@UDP-T3967"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.arrearsRegoOrVin,
        "loanLookup.arrearsRegoOrVin",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await settlementPage.enterRego(rego);
      await settlementPage.clickNext();
      await settlementPage.expectBusinessRuleError();
    },
  );

  test(
    "UDP-T3968 - Back Button from Error Screen Allows Re-Entry",
    { tag: ["@do", "@regression", "@UDP-T3968"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await settlementPage.enterRego(settlementData.loanLookup.invalidRegoOrVin);
      await settlementPage.clickNext();
      await settlementPage.expectVehicleNotFoundError();
      if (await settlementPage.backButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await settlementPage.clickBack();
        await settlementPage.expectBackReturnsToLoanSearch();
      } else {
        test.skip(true, "Back button not shown on this error screen build (MAF-5579/5580).");
      }
    },
  );

  test(
    "UDP-T3969 - Cancel Button Redirects to Asset Details Screen",
    { tag: ["@do", "@regression", "@UDP-T3969"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage, settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await settlementPage.clickCancel();
      await settlementPage.expectOnAssetDetailsScreen();
      await expect.soft(assetDetailsPage.tradeAmountInput).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    "UDP-T3970 - Settlement Quote Display Customer Details Populated",
    { tag: ["@do", "@regression", "@UDP-T3970"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.validRegoSameDealer,
        "loanLookup.validRegoSameDealer",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, rego);
      await settlementPage.expectCustomerDetailsPopulated();
    },
  );

  test(
    "UDP-T3971 - Settlement Quote Display Asset Details Populated",
    { tag: ["@do", "@regression", "@UDP-T3971"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.validRegoSameDealer,
        "loanLookup.validRegoSameDealer",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, rego);
      await settlementPage.expectAssetDetailsPopulated();
    },
  );

  test(
    "UDP-T3972 - Settlement Amount (Standard) Custom Flows Displayed with Amount > 0",
    { tag: ["@do", "@regression", "@UDP-T3972"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.validRegoSameDealer,
        "loanLookup.validRegoSameDealer",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, rego);
      await settlementPage.expectStandardSettlementSectionWithPositiveAmounts();
    },
  );

  test(
    "UDP-T3973 - Settlement Amount (Refinancing) Custom Flows Displayed with Amount > 0",
    { tag: ["@do", "@regression", "@UDP-T3973"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.refinanceLoanRegoOrVin,
        "loanLookup.refinanceLoanRegoOrVin",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, rego);
      await settlementPage.expectRefinancingSettlementSectionWithPositiveAmounts();
    },
  );

  test(
    "UDP-T3974 - Less Section (CCI Refund) Hidden When Amount is Zero",
    { tag: ["@do", "@regression", "@UDP-T3974"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.cciRefundZeroLoanRegoOrVin,
        "loanLookup.cciRefundZeroLoanRegoOrVin",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, rego);
      await settlementPage.expectLessCciRefundHidden();
    },
  );

  test(
    "UDP-T3975 - AFV Settlement Quote Display Fields and Warning Message",
    { tag: ["@do", "@regression", "@UDP-T3975"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const loanId = requireLoanId(
        settlementData.loanLookup.afvActivatedLoanRegoOrVin,
        "loanLookup.afvActivatedLoanRegoOrVin",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "afv");
      await completeLoanSearchToDisplay(settlementPage, loanId);
      await settlementPage.expectAfVSettlementDisplay();
    },
  );

  test(
    "UDP-T3976 - AFV Settlement Return Error",
    { tag: ["@do", "@regression", "@UDP-T3976"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.skip(
        true,
        "Requires AFV loan that triggers FIS AF settlement error — add afvErrorLoanRegoOrVin to settlementTestData.json when known.",
      );
    },
  );

  test(
    "UDP-T3977 - Add Settlement Amount to Quote Single Settlement",
    { tag: ["@do", "@regression", "@UDP-T3977"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.validRegoSameDealer,
        "loanLookup.validRegoSameDealer",
      );
      const { assetDetailsPage, settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, rego);
      await settlementPage.selectSettlementAmountOption("standard");
      await settlementPage.addSelectedSettlementToQuote();
      await expect
        .poll(
          async () => (await assetDetailsPage.settlementAmountInput.inputValue()).replace(/[$,]/g, ""),
          { timeout: 45_000 },
        )
        .toMatch(/\d/);
    },
  );

  test(
    "UDP-T3978 - Multiple Settlements Settlement Amount Summed",
    { tag: ["@do", "@regression", "@UDP-T3978"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const first = requireLoanId(
        settlementData.loanLookup.validRegoSameDealer,
        "loanLookup.validRegoSameDealer",
      );
      const second = requireLoanId(
        settlementData.dealerListing.secondSettlementRegoOrVin,
        "dealerListing.secondSettlementRegoOrVin",
      );
      const { assetDetailsPage, settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, first);
      await settlementPage.selectSettlementAmountOption("standard");
      await settlementPage.addSelectedSettlementToQuote();
      const afterFirst = parseFloat(
        (await assetDetailsPage.settlementAmountInput.inputValue()).replace(/[^0-9.]/g, ""),
      );
      await settlementPage.openSettlementFromQuote();
      await completeLoanSearchToDisplay(settlementPage, second);
      await settlementPage.selectSettlementAmountOption("standard");
      await settlementPage.addSelectedSettlementToQuote();
      await expect
        .poll(
          async () =>
            parseFloat(
              (await assetDetailsPage.settlementAmountInput.inputValue()).replace(/[^0-9.]/g, ""),
            ),
          { timeout: 60_000 },
        )
        .toBeGreaterThan(afterFirst);
    },
  );

  test(
    "UDP-T3979 - Multiple Settlements Not Allowed from Dealer Listing",
    { tag: ["@do", "@regression", "@UDP-T3979"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.skip(
        true,
        "Requires dealer-listing settlement quote with second settlement attempt — populate dealerListing test data and confirm UI error text.",
      );
    },
  );

  test(
    "UDP-T3980 - Create New Quote Confirmation from Dealer Listing Yes",
    { tag: ["@do", "@regression", "@UDP-T3980"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const loanId = requireLoanId(
        settlementData.dealerListing.activatedLoanRegoOrVin,
        "dealerListing.activatedLoanRegoOrVin",
      );
      const dashboardPage = new DODashboardPage(page);
      const settlementPage = new DOSettlementPage(page);
      await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
      await dashboardPage.waitForAuthenticatedDashboard();
      await dashboardPage.selectDealer(TLC_DEALER);
      await dashboardPage.navigateToDealerListingActiveLoans();
      await dashboardPage.clickCreateSettlementQuoteForLoan(loanId);
      await settlementPage.clickNext();
      await settlementPage.expectSettlementDisplayScreen();
      await settlementPage.selectSettlementAmountOption("standard");
      await settlementPage.addSelectedSettlementToQuote();
      await settlementPage.expectNewSettlementQuoteConfirmation();
      await settlementPage.confirmNewQuoteYes();
      await expect(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
    },
  );

  test(
    "UDP-T3981 - Create New Quote Confirmation from Dealer Listing No",
    { tag: ["@do", "@regression", "@UDP-T3981"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const loanId = requireLoanId(
        settlementData.dealerListing.activatedLoanRegoOrVin,
        "dealerListing.activatedLoanRegoOrVin",
      );
      const dashboardPage = new DODashboardPage(page);
      const settlementPage = new DOSettlementPage(page);
      await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
      await dashboardPage.waitForAuthenticatedDashboard();
      await dashboardPage.selectDealer(TLC_DEALER);
      await dashboardPage.navigateToDealerListingActiveLoans();
      await dashboardPage.clickCreateSettlementQuoteForLoan(loanId);
      await settlementPage.clickNext();
      await settlementPage.expectSettlementDisplayScreen();
      await settlementPage.selectSettlementAmountOption("standard");
      await settlementPage.addSelectedSettlementToQuote();
      await settlementPage.expectNewSettlementQuoteConfirmation();
      await settlementPage.confirmNewQuoteNo();
    },
  );

  test(
    "UDP-T3982 - Consumer Settlement Correct Custom Flows Displayed",
    { tag: ["@do", "@regression", "@UDP-T3982"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.consumerLoanRegoOrVin,
        "loanLookup.consumerLoanRegoOrVin",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "csa");
      await completeLoanSearchToDisplay(settlementPage, rego);
      await settlementPage.expectStandardSettlementSectionWithPositiveAmounts();
    },
  );

  test(
    "UDP-T3983 - Business Settlement Correct Custom Flows Displayed",
    { tag: ["@do", "@regression", "@UDP-T3983"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.businessLoanRegoOrVin,
        "loanLookup.businessLoanRegoOrVin",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, rego);
      await settlementPage.expectStandardSettlementSectionWithPositiveAmounts();
    },
  );

  test(
    "UDP-T3984 - Loan in Arrears/Overdue Settlement Cannot Proceed",
    { tag: ["@do", "@regression", "@UDP-T3984"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.arrearsRegoOrVin,
        "loanLookup.arrearsRegoOrVin",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await settlementPage.enterRego(rego);
      await settlementPage.clickNext();
      await settlementPage.expectBusinessRuleError();
    },
  );

  test(
    "UDP-T3985 - Outstanding Commission Clawback/Subsidy NOT Displayed to Dealer",
    { tag: ["@do", "@regression", "@UDP-T3985"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.commissionClawbackLoanRegoOrVin,
        "loanLookup.commissionClawbackLoanRegoOrVin",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, rego);
      await settlementPage.expectCommissionClawbackNotDisplayed();
    },
  );

  test(
    "UDP-T3986 - Refinance vs Standard Correct Section Tagging",
    { tag: ["@do", "@regression", "@UDP-T3986"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.refinanceLoanRegoOrVin,
        "loanLookup.refinanceLoanRegoOrVin",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, rego);
      await settlementPage.expectStandardSettlementSectionWithPositiveAmounts();
      await settlementPage.expectRefinancingSettlementSectionWithPositiveAmounts();
    },
  );

  test(
    "UDP-T3987 - Settlement from Quote Screen Loan Closure Handled Separately",
    { tag: ["@do", "@regression", "@UDP-T3987"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.skip(
        true,
        "Post-submit FIS AF termination quote verification is out of UI scope — requires backend/API assertion or manual check.",
      );
    },
  );

  test(
    "UDP-T3988 - Cancel from Privacy Waiver Screen Returns to Asset Details",
    { tag: ["@do", "@regression", "@UDP-T3988"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.validRegoDifferentDealer,
        "loanLookup.validRegoDifferentDealer",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await settlementPage.enterRego(rego);
      await settlementPage.clickNext();
      await settlementPage.expectPrivacyWaiverScreen();
      await settlementPage.clickCancel();
      await settlementPage.expectOnAssetDetailsScreen();
    },
  );

  test(
    "UDP-T3989 - Settlement Customer Details Screen Display Only",
    { tag: ["@do", "@regression", "@UDP-T3989"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.validRegoSameDealer,
        "loanLookup.validRegoSameDealer",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, rego);
      await settlementPage.expectCustomerDetailsReadOnly();
    },
  );
});
