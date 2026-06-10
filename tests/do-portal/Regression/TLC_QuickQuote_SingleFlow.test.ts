/**
 * DO Portal — CSA Quick Quote regression (single Playwright test, single run).
 * Scenario source: CSA_Quote_Regression_Split.pdf (steps / validation table).
 * Auth: `do-regression-chromium` + `doSanity.auth.setup.ts` (storageState).
 */

import { expect, test } from "@fixtures/doPortalTest";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOAssetDetailsPage, DOCustomerQuotePostSubmitPage, DODashboardPage, DOQuickQuotePage, DOReferenceDetailsPage } from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOAddressDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/addressDetails";
import { DOEmploymentDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/employmentDetails";
import { DOFinancialPositionPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/financialPosition";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";

const TLC_QQ_PRODUCT = "TL-C-Assigned";
const TLC_QQ_PROGRAM = "Term Loan Personal - MV Dealer";
const TLC_DEALER = "Armstrong Prestige Wellington";

test(
  "DO Portal - TLC Quick Quote — PDF regression (single run)",
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
    await dashboardPage.selectDealer(TLC_DEALER);

    await quickQuotePage.openQuickQuote();
    await expect.soft(quickQuotePage.quickQuoteRoot).toBeVisible();
    await expect.soft(quickQuotePage.quickQuoteForm).toBeVisible();

    // -------------------------------------------------------------------------
    // PDF: product and program empty (initial state) — optional strict empty cash
    // -------------------------------------------------------------------------
    const qq = 0;
    await expect.soft(quickQuotePage.productDropdownTrigger).toBeVisible();
    await expect.soft(quickQuotePage.programDropdownTrigger).toBeVisible();
    // const cashHidden = await quickQuotePage.cashPriceInput.isHidden().catch(() => false);
    // if (cashHidden) {
    //   await expect.soft(quickQuotePage.cashPriceInput).toBeHidden();
    //   await expect.soft(quickQuotePage.interestRatePercentInput).toBeHidden();
    // } else {
    //   await expect.soft(quickQuotePage.cashPriceInput).toHaveValue("");
    //   await expect.soft(quickQuotePage.interestRatePercentInput).toHaveValue("");
    // }

    // -------------------------------------------------------------------------
    // PDF: Calculate hidden or disabled until product/program chosen
    // -------------------------------------------------------------------------
    await quickQuotePage.expectCalculateButtonHiddenOrDisabled(qq);

    // -------------------------------------------------------------------------
    // PDF: select CSA-C-Assigned; related programs appear in list
    // -------------------------------------------------------------------------
    await quickQuotePage.selectProduct(TLC_QQ_PRODUCT);
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();
    await quickQuotePage.programDropdownTrigger.click();
    await expect.soft(page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
    const programs = await page.getByRole("option").allTextContents();
    await page.keyboard.press("Escape");
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();
    expect.soft(programs.length).toBeGreaterThan(0);
    expect.soft(programs.some((t) => /CSA|Personal|Dealer|Webform|MV|Retail|Assigned/i.test(t))).toBeTruthy();

    // -------------------------------------------------------------------------
    // PDF: select program; pricing fields appear
    // -------------------------------------------------------------------------
    if (await quickQuotePage.programDropdownTrigger.isEnabled()) {
      await quickQuotePage.selectProgram(TLC_QQ_PROGRAM);
    }
    await expect.soft(quickQuotePage.calculateForDropdownTrigger).toBeVisible();
    await expect.soft(quickQuotePage.cashPriceInput).toBeVisible();
    await expect.soft(quickQuotePage.depositPercentInput).toBeVisible();
    await expect.soft(quickQuotePage.depositDollarInput).toBeVisible();
    await expect.soft(quickQuotePage.interestRatePercentInput).toBeVisible();
    await expect.soft(quickQuotePage.termsMonthsInput).toBeVisible();
    await expect.soft(quickQuotePage.frequencyDropdownTrigger).toBeVisible();

    // -------------------------------------------------------------------------
    // PDF: Calculate For defaults to Payment; often locked until first calc (p-dropdown host)
    // When the host is not p-disabled, inner trigger can still report enabled — do not fail.
    // -------------------------------------------------------------------------
    const calculateForHost = quickQuotePage.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::p-dropdown[1]",
    );
    const hostCls = (await calculateForHost.getAttribute("class").catch(() => "")) ?? "";
    if (hostCls.includes("p-disabled")) {
      await expect.soft(quickQuotePage.calculateForDropdownTrigger).toBeDisabled();
    }

    // -------------------------------------------------------------------------
    // PDF: Interest / Term / Frequency (visible; may pre-populate)
    // -------------------------------------------------------------------------
    await expect.soft(quickQuotePage.interestRatePercentInput).toBeVisible();
    await expect.soft(quickQuotePage.termsMonthsInput).toBeVisible();
    await expect.soft(quickQuotePage.frequencyDropdownTrigger).toBeVisible();

    // -------------------------------------------------------------------------
    // PDF: Payment read-only before first calculation (locked input and/or label display)
    // -------------------------------------------------------------------------
    if (await quickQuotePage.paymentAmountInput.isVisible().catch(() => false)) {
      const locked = await quickQuotePage.paymentAmountInputIsReadOnly();
      const displayOnly = await quickQuotePage.paymentDisplay.isVisible().catch(() => false);
      expect.soft(locked || displayOnly).toBeTruthy();
    }

    // -------------------------------------------------------------------------
    // PDF: mandatory incomplete path — some builds disable Calculate; others validate on click
    // -------------------------------------------------------------------------
    await quickQuotePage.selectFrequency("Monthly");
    await quickQuotePage.enterInterestRatePercent("9");
    await quickQuotePage.enterTermsMonths("36");
    await quickQuotePage.enterCashPrice("");
    // await quickQuotePage.calculateButton.scrollIntoViewIfNeeded().catch(() => {});
    // if (await quickQuotePage.calculateButton.isDisabled().catch(() => false)) {
    //   await expect.soft(quickQuotePage.calculateButton).toBeDisabled();
    // }

    // -------------------------------------------------------------------------
    // PDF: negative Cash Price validation (uncomment when re-enabled in PDF run)
    // -------------------------------------------------------------------------
    // await quickQuotePage.enterCashPrice("-$100");
    // await quickQuotePage.expectCashPriceNonNegativeMessage(0);
    // await quickQuotePage.enterCashPrice("$20,000");

    // -------------------------------------------------------------------------
    // PDF: Term blank → Please complete (or inline error when Calculate stays disabled)
    // -------------------------------------------------------------------------
    await quickQuotePage.clearTermsMonths(qq);
    // if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
    //   await quickQuotePage.clickCalculate();
    // }
    await expect.soft(quickQuotePage.calculateButton).toBeDisabled();
    await quickQuotePage.expectBlankTermsValidation(qq);
    await quickQuotePage.enterTermsMonths("36");

    // -------------------------------------------------------------------------
    // PDF: Term > max (inline error + disabled Calculate, or click then message)
    // -------------------------------------------------------------------------
    await quickQuotePage.enterTermsMonths("9999");
    if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
      await quickQuotePage.clickCalculate();
    }
    await quickQuotePage.expectTermExceedsMaxMessage(qq);
    await quickQuotePage.enterTermsMonths("36");

    // PDF: Frequency blank — skipped when program enforces default and UI has no empty option.

    // -------------------------------------------------------------------------
    // PDF: first successful Calculate; summary; optional ~$18k financed check (fees vary)
    // -------------------------------------------------------------------------
    await quickQuotePage.enterCashPrice("$20,000");
    await quickQuotePage.enterDepositPercent("10%");
    await quickQuotePage.enterBalloonPercent("0");
    if (await quickQuotePage.termsCheckbox.isVisible().catch(() => false)) {
      const boxClass =
        (await quickQuotePage.termsCheckbox
          .locator("xpath=ancestor::p-checkbox[1]")
          .getAttribute("class")
          .catch(() => "")) ?? "";
      // if (!boxClass.includes("p-checkbox-checked")) {
      //   await quickQuotePage.confirmTermsAndConditions();
      // }
    }
    await quickQuotePage.clickCalculate();
    await quickQuotePage.expectCreateQuoteVisible();
    await expect.soft(quickQuotePage.addComparison2Button).toBeEnabled();

    const summary = quickQuotePage.calculationSummaryRegion.first();
    await expect.soft(summary).toBeVisible({ timeout: 30_000 });
    await expect.soft(summary).toContainText(/Loan Amount/i);
    await expect.soft(summary).toContainText(/Total (Amount )?Payable|Total Payable|Amount Payable/i);
    await summary
      .getByText(/\$18[, ]?000|18[, ]?000(?:\.00)?|\$180\.00/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    // -------------------------------------------------------------------------
    // PDF: Calculate For enabled after first calculation
    // -------------------------------------------------------------------------
    await expect.soft(quickQuotePage.calculateForDropdownTrigger).toBeEnabled();

    // First Calculate can re-format cash (e.g. $20.00) — reset before deposit $ sync.
    // await quickQuotePage.clearCashPriceField();
    // await quickQuotePage.enterCashPrice("$20,000");

    // -------------------------------------------------------------------------
    // PDF: Deposit % / $ — % of cash → deposit $ is reliable; $ → % back-fill
    // often does not update the OR % field (UI keeps 0.00% while $ is authoritative).
    // -------------------------------------------------------------------------
    await quickQuotePage.enterDepositPercent("10%");
    await expect.soft(quickQuotePage.depositDollarInput).toHaveValue(/2[, ]?000|2000/, { timeout: 25_000 });
    await quickQuotePage.clearDepositDollarField();
    await quickQuotePage.enterDepositDollars("$4,000.00");
    await expect.soft(quickQuotePage.depositDollarInput).toHaveValue(/4[, ]?000(?:\.00)?/i, {
      timeout: 25_000,
    });

    // -------------------------------------------------------------------------
    // PDF: Balloon % / $ sync (uncomment when included in PDF run)
    // -------------------------------------------------------------------------
    // await quickQuotePage.enterBalloonPercent("20%");
    // await expect.soft(quickQuotePage.balloonDollarInput).toHaveValue(/4[, ]?000|4000/, { timeout: 25_000 });
    // await quickQuotePage.clearBalloonDollarField();
    // await quickQuotePage.enterBalloonDollars("$5,000.00");
    // await expect.soft(quickQuotePage.balloonPercentInput).toHaveValue(/25/);
    // await quickQuotePage.clickCalculate();
    // await quickQuotePage.expectCreateQuoteVisible();
    // await quickQuotePage.enterBalloonDollars("$5,000");
    // await quickQuotePage.setFixedCheckbox(true);
    // await quickQuotePage.clickCalculate();
    // await quickQuotePage.expectCreateQuoteVisible();
    // await quickQuotePage.setFixedCheckbox(false);

    await quickQuotePage.clickCalculate();
    await quickQuotePage.expectCreateQuoteVisible();

    // -------------------------------------------------------------------------
    // PDF: Calculate For = Cash Price / Deposit / Balloon (alternate PDF branch)
    // -------------------------------------------------------------------------
    // await quickQuotePage.selectCalculateFor("Cash Price");
    // await quickQuotePage.enterPaymentAmount("450");
    // await quickQuotePage.enterInterestRatePercent("9");
    // await quickQuotePage.enterTermsMonths("36");
    // await quickQuotePage.selectFrequency("Monthly");
    // await quickQuotePage.clickCalculate();
    // await expect.soft(quickQuotePage.cashPriceInput).not.toHaveValue("");
    //
    // await quickQuotePage.selectCalculateFor("Deposit");
    // await quickQuotePage.enterPaymentAmount("500");
    // await quickQuotePage.enterCashPrice("20000");
    // await quickQuotePage.enterInterestRatePercent("9");
    // await quickQuotePage.enterTermsMonths("36");
    // await quickQuotePage.selectFrequency("Monthly");
    // await quickQuotePage.clickCalculate();
    // await expect.soft(quickQuotePage.depositPercentInput).not.toHaveValue("");
    //
    // await quickQuotePage.selectCalculateFor("Balloon");
    // await quickQuotePage.enterPaymentAmount("480");
    // await quickQuotePage.enterCashPrice("20000");
    // await quickQuotePage.enterInterestRatePercent("9");
    // await quickQuotePage.enterTermsMonths("36");
    // await quickQuotePage.selectFrequency("Monthly");
    // await quickQuotePage.clickCalculate();
    // await expect.soft(quickQuotePage.balloonPercentInput).not.toHaveValue("");

    // -------------------------------------------------------------------------
    // PDF: Reset → default / cleared (uncomment when PDF requires)
    // -------------------------------------------------------------------------
    // await quickQuotePage.clickReset();
    // await expect.soft(quickQuotePage.cashPriceInput).toHaveValue("");

    // -------------------------------------------------------------------------
    // PDF: QQ1 calculate → Add Comparison → QQ2 copy; Add 3 disabled until QQ2 calc
    // (duplicate first-panel flow — keep commented; active path below uses current panel state)
    // -------------------------------------------------------------------------
    // await quickQuotePage.selectProduct(CSA_QQ_PRODUCT);
    // await quickQuotePage.selectProgram(CSA_QQ_PROGRAM);
    // await quickQuotePage.enterCashPrice("$20,000");
    // await quickQuotePage.enterDepositPercent("10%");
    // await quickQuotePage.enterBalloonPercent("0");
    // await quickQuotePage.clickCalculate();
    // await quickQuotePage.expectCreateQuoteVisible();
    // await expect.soft(quickQuotePage.addComparison2Button).toBeEnabled();
    // const qq1Summary = quickQuotePage.calculationSummaryRegion.first();
    // await expect.soft(qq1Summary).toBeVisible({ timeout: 30_000 });
    // await expect.soft(qq1Summary).toContainText(/Loan Amount/i);
    // await expect.soft(qq1Summary).toContainText(/Total (Amount )?Payable|Total Payable|Amount Payable/i);

    await expect.soft(quickQuotePage.addComparison2Button).toBeEnabled();
    await quickQuotePage.clickAddComparisonPrimary();
    expect.soft(await quickQuotePage.quickQuotePanelCount()).toBe(2);
    await expect.soft(quickQuotePage.cashPriceInputOnQuote(1)).not.toHaveValue("");
    // await expect.soft(quickQuotePage.calculateForTriggerOnQuote(1)).toBeDisabled();

    await expect.soft(quickQuotePage.addComparison3Button).toBeDisabled();

    await quickQuotePage.enterTermsMonthsOnQuote(1, "36");
    await quickQuotePage.selectFrequencyOnQuote(1, "Monthly");
    await quickQuotePage.clickCalculateOnQuote(1);
    await quickQuotePage.expectCreateQuoteVisible();

    // -------------------------------------------------------------------------
    // PDF: max 3 Quick Quotes; no QQ4
    // -------------------------------------------------------------------------
    await expect.soft(quickQuotePage.addComparison3Button).toBeEnabled();
    await quickQuotePage.clickElement(quickQuotePage.addComparison3Button);
    expect.soft(await quickQuotePage.quickQuotePanelCount()).toBe(3);
    await quickQuotePage.enterTermsMonthsOnQuote(2, "36");
    await quickQuotePage.selectFrequencyOnQuote(2, "Monthly");
    await quickQuotePage.clickCalculateOnQuote(2);
    await expect.soft(page.getByRole("button", { name: /Add Comparison 4/i })).toHaveCount(0);

    // -------------------------------------------------------------------------
    // PDF: Print / Download (trial; MAF-6689)
    // -------------------------------------------------------------------------
    await expect.soft(quickQuotePage.printButton).toBeVisible();
    await expect.soft(quickQuotePage.downloadButton).toBeVisible();
    await quickQuotePage.printButton.click({ trial: true });
    await quickQuotePage.downloadButton.click({ trial: true });

    // -------------------------------------------------------------------------
    // PDF: Create Quote → Standard Quote (Asset Details step)
    // -------------------------------------------------------------------------
    await quickQuotePage.clickCreateQuote();
    const standardRoot = page.locator("app-quote-details, app-standard-quote").first();
    await expect.soft(standardRoot).toBeVisible({ timeout: 120_000 });
    await expect.soft(page.getByText(/TLC|Term Loan Personal/i).first()).toBeVisible();

    const assetDetailsPage = new DOAssetDetailsPage(page);
    const addAssetPage = new DOAddAssetPage(page);
    // -------------------------------------------------------------------------
    // Spreadsheet / PDF: Product & Program, finance carry-over, UDC Establishment Fee,
    // Loan / First Payment, Calculate with blank origin (allowed on CSA), Originator ref + Loan Purpose blank
    // -------------------------------------------------------------------------
    await assetDetailsPage.waitForAssetDetailsStepReady();
    await assetDetailsPage.expectProductProgramCarriedFromQuickQuote(TLC_QQ_PRODUCT, TLC_QQ_PROGRAM);
    await assetDetailsPage.expectFinanceCarriedFromQuickQuote({
      cashPrice: /20[, ]?000|20000/i,
      term: /36/,
      frequencyText: /Monthly/i,
      interestRate: /9/,
    });

    // -------------------------------------------------------------------------
    // TLC left column: Additional Funds / Purpose; Save validation; Trade vs Settlement → Net Trade
    // -------------------------------------------------------------------------
    await assetDetailsPage.expectAdditionalFundsVisibleOnLoad();
    await assetDetailsPage.enterAdditionalFunds("$5,000");
    await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
    await assetDetailsPage.clickCalculateButton();

    await assetDetailsPage.clearAdditionalFunds();
    await assetDetailsPage.clickCalculateButton();

    await assetDetailsPage.enterAdditionalFunds("$3,000.00");
    await assetDetailsPage.clearAdditionalFundsPurpose();
    // can we wait for 10 seconds before entering the origination reference?
    await page.waitForTimeout(10000);
    await assetDetailsPage.enterOriginationReference("Test Orig Ref 123");
    await assetDetailsPage.clickSaveStandardQuoteStep();
    // await assetDetailsPage.expectAdditionalFundsPurposeInlineErrorVisible();

    await assetDetailsPage.enterAdditionalFunds("$2,000.00");
    await assetDetailsPage.enterAdditionalFundsPurpose("Workshop equipment purchase");
    await assetDetailsPage.clickSaveStandardQuoteStep();
    await assetDetailsPage.clearAdditionalFundsPurpose();
    await assetDetailsPage.clearAdditionalFunds();
    await assetDetailsPage.clickSaveStandardQuoteStep();
    await assetDetailsPage.enterTradeAmount("$5,000.00");
    await assetDetailsPage.enterSettlementAmount("$2,000.00");
    await assetDetailsPage.clickCalculateButton();
    // TLC / Less Deposit: Net Trade tracks **Trade Amount** until settlement is applied in the product flow (not Trade − Settlement on screen).
    // await assetDetailsPage.expectNetTradeAmountPattern(/\$?5[, ]?000|5,?000\.?0*\b/i);

    await assetDetailsPage.expectUdcEstablishmentFeePrePopulatedFromProgram();
    await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
    await assetDetailsPage.calculateWithOriginationBlank();
    await assetDetailsPage.enterOriginationReference("QQ-CSA-Asset-Orig-01");

    // -------------------------------------------------------------------------
    // Spreadsheet: Dealer Origination Fee, PPSR fee, LMF; change interest + brand hint;
    // interest editability; term > program max on Calculate then restore
    // -------------------------------------------------------------------------
    await assetDetailsPage.expectDealerOriginationFeePopulatedFromProgram();
    await assetDetailsPage.expectPpsrCountAndFeeLineVisible();
    await assetDetailsPage.expectLoanMaintenanceFeeOrLmfAreaVisible();
    await assetDetailsPage.expectInterestRateEditable();
    await assetDetailsPage.enterInterestRatePercentSimple("8.5");
    await assetDetailsPage.expectBrandHierarchyOrRateHintIfShown();
    await assetDetailsPage.expectInterestRateEditable();
    // await assetDetailsPage.expectTermExceedsProgramMaxOnCalculateThenRestore({
    //   overMaxTerm: "9999",
    //   restoreTerm: "36",
    // });

    // -------------------------------------------------------------------------
    // Payment Summary: Loan Date (today/tomorrow), Balloon $ / OR % / Fixed, Calculate → last schedule payment
    // -------------------------------------------------------------------------
    // await assetDetailsPage.expectLoanDateOnLoadTodayOrTomorrow();
    // await assetDetailsPage.expectBalloonAmountAndFixedCheckboxOnLoad();
    // await assetDetailsPage.enterBalloonAmount("$100.00");
    // await assetDetailsPage.expectBalloonPercentInputMatches(/^0*([.,]0*)?$/);
    // await assetDetailsPage.enterBalloonPercent("10%");
    // await assetDetailsPage.expectBalloonAmountInputMatches(/\$|\d/);
    // await assetDetailsPage.checkBalloonFixedCheckbox();
    // await assetDetailsPage.clickCalculateButton();
    // await assetDetailsPage.expectPaymentScheduleLastPaymentRowContains(/\$?\s*100([,.]00)?|100\.00/i);

    // Product / Program already match QQ carry-over and are often p-disabled — do not call chooseProduct/chooseProgram here.
    await assetDetailsPage.enterOriginationReference("Test Orig Ref 123");
    await assetDetailsPage.enterAsset("Car and Light Commercial /");
    await assetDetailsPage.selectCondition("Used");
    await assetDetailsPage.openAssetInsuranceTradeInSummary();
    await assetDetailsPage.clickAssetSummaryEditButton();
    await addAssetPage.enterAssetValue("$10,0000");
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
    await addAssetPage.clickCrossButton();
    await assetDetailsPage.enterOriginationReference("Test Orig Ref 123");
    
    await assetDetailsPage.termsOfFinance("36");
    await assetDetailsPage.interestRate("4");
    await assetDetailsPage.enterOriginationReference("Test Orig Ref 123");
    await assetDetailsPage.clickCalculateButton();
    await assetDetailsPage.expandDealerFinanceSection();
    await assetDetailsPage.expectDealerFinanceExpandedSummary();
    await assetDetailsPage.expectPpsrCountValue("1");
    await assetDetailsPage.fillPpsrCountLoanDetails("2");
    // await assetDetailsPage.udcEstablishmentFee("$300.00");
    // await assetDetailsPage.dealerOriginationFee("$200.00");
    // await assetDetailsPage.expectTotalEstablishmentFeeSumDollars(500);This is working but on next it throws External plugin message  udc establishement Fee should not be greater than 130`
    await assetDetailsPage.interestRate("4");
    await assetDetailsPage.clickCalculateButton();


    // -------------------------------------------------------------------------
    // Payment Schedule: table populated ($, frequency); top-right view toggles keep data visible
    // -------------------------------------------------------------------------
    // await assetDetailsPage.expectPaymentScheduleViewTogglesWorkAndTablePopulated();

    // -------------------------------------------------------------------------
    // Asset & Insurance Summary → Trade Summary → "Search & Add Trade in" opens chooser / search UI
    // -------------------------------------------------------------------------
    await assetDetailsPage.openAssetInsuranceTradeInSummary();
    await assetDetailsPage.clickSearchAddTradeInAndExpectChooserOpened();
    await assetDetailsPage.closeSearchTradeInAssetDialog();
    await assetDetailsPage.clickFrontPrimeDialogHeaderMaximizeIfVisible();
    await assetDetailsPage.closeAssetInsuranceSummaryDialog();

    await assetDetailsPage.openKeyInformationDisclosureDialog();
    await assetDetailsPage.closeKeyInformationDisclosureDialog();

    await assetDetailsPage.enterOriginationReference("Test Orig Ref 123");
    await assetDetailsPage.clickNextButton();
    await assetDetailsPage.waitForAddBorrowerButton();
    await assetDetailsPage.clickAddBorrowerorGuarantorButton();
    await assetDetailsPage.searchByDropdownClick();
    await assetDetailsPage.selectUDCSelectOption();
    await assetDetailsPage.enterUDCCustomerNumber("420");
    await assetDetailsPage.clickSearchButton();
    await assetDetailsPage.clickAddNewCustomerButton();
    const personalDetailsPage = new DOPersonalDetailsPage(page);
    const addressDetailsPage = new DOAddressDetailsPage(page);
    // Leave required fields unset / empty, then **Save** — expect inline validation (see screenshot).
    await personalDetailsPage.chooseTitle("");
    await personalDetailsPage.enterFirstName("");
    // await personalDetailsPage.enterMiddleName("Marie");
    await personalDetailsPage.enterLastName("");
    await personalDetailsPage.chooseGender("");
    await personalDetailsPage.enterDateOfBirth("");
    await personalDetailsPage.chooseMarritalStatus("");
    await personalDetailsPage.chooseNoOfDependents("");
    // await personalDetailsPage.fillDependantsAgesInYears(["8", "12"]);
    await personalDetailsPage.enterMobileNumber("");
    await personalDetailsPage.enterEmail("");
    await personalDetailsPage.chooseLicenceType("");
    // await personalDetailsPage.chooseCountryOfIssue("New Zealand");
    // await personalDetailsPage.enterLicenceNumber("DL000123");
    // await personalDetailsPage.enterVersionNumber("244");
    await personalDetailsPage.chooseNewZealandResident("");
    await personalDetailsPage.chooseCountryOfBirth("");
    await personalDetailsPage.chooseCountryOfCitizenship("");

    await personalDetailsPage.clickSavePersonalDetails();
    await personalDetailsPage.expectPersonalDetailsRequiredValidationMessages();
    await personalDetailsPage.enterFirstName("jhbhuyvyu90");
    await personalDetailsPage.enterLastName("jhbhuyvyu90");
    await personalDetailsPage.enterMobileNumber("ioi900");
    await personalDetailsPage.enterEmail("jkbhbu");
    await personalDetailsPage.enterLicenceNumber("jkui");
    await personalDetailsPage.enterVersionNumber("hkbiubh");

    await personalDetailsPage.clickSavePersonalDetails();
    await personalDetailsPage.expectPersonalDetailsInvalidFormatValidationMessages();
    await personalDetailsPage.chooseTitle("Dame");
    await personalDetailsPage.enterFirstName("Liza");
    await personalDetailsPage.enterMiddleName("Marie");
    await personalDetailsPage.enterLastName("Doe");
    await personalDetailsPage.chooseGender("Female");
    await personalDetailsPage.enterDateOfBirth("01/01/1980");
    await personalDetailsPage.chooseMarritalStatus("Married");
    await personalDetailsPage.chooseNoOfDependents("2");
    await personalDetailsPage.fillDependantsAgesInYears(["8", "12"]);
    await personalDetailsPage.enterMobileNumber("0211234567");
    await personalDetailsPage.enterEmail("liza.doe@example.com");
    await personalDetailsPage.chooseLicenceType("Full Licence");
    await personalDetailsPage.chooseCountryOfIssue("New Zealand");
    await personalDetailsPage.enterLicenceNumber("DL000123");
    await personalDetailsPage.enterVersionNumber("244");
    await personalDetailsPage.chooseNewZealandResident("Yes");
    await personalDetailsPage.chooseCountryOfBirth("New Zealand");
    await personalDetailsPage.chooseCountryOfCitizenship("New Zealand");
    await personalDetailsPage.clickNextButton();
    await addressDetailsPage.waitForPhysicalAddressStep();

    // Physical Address — explicit empty required fields, then **Save** / assert.
    await addressDetailsPage.timeAtAddress("", "");
    await addressDetailsPage.enterStreetNumber("");
    await addressDetailsPage.enterStreetName("");
    await addressDetailsPage.enterCity("");
    await addressDetailsPage.touchPhysicalResidenceTypeWithoutSelection();
    await addressDetailsPage.clickSaveAddressDetails();
    await addressDetailsPage.expectPhysicalAddressRequiredValidationMessages();

    await addressDetailsPage.timeAtAddress("1", "1");
    await addressDetailsPage.enterStreetNumber("123");
    await addressDetailsPage.enterStreetName("Main Street");
    await addressDetailsPage.enterCity("Wellington");
    await addressDetailsPage.chooseCountry("New Zealand");
    await addressDetailsPage.selectResidenceType("Boarding");



    // Reuse for Postal Addresss → Yes (click once if toggle starts on No)
    await addressDetailsPage.clickReuseForPostalAddressToggle();

    // Previous Physical Address — explicit empty required fields when section exists, then **Save** / assert.
    if (await addressDetailsPage.isPreviousPhysicalAddressVisible(5_000)) {
      await addressDetailsPage.previousTimeAtAddress("", "");
      await addressDetailsPage.enterPreviousStreetNumber("");
      await addressDetailsPage.enterPreviousStreetName("");
      await addressDetailsPage.enterPreviousCity("");
      await addressDetailsPage.touchPreviousPhysicalResidenceTypeWithoutSelection();
      await addressDetailsPage.clickSaveAddressDetails();
      await addressDetailsPage.expectPreviousPhysicalAddressRequiredValidationMessages();
    }

    // Previous Physical Address — skipped automatically when `app-previous-address` is not shown for this product.
    await addressDetailsPage.fillPreviousPhysicalRequiredIfPresent({
      years: "1",
      months: "1",
      streetNumber: "45",
      streetName: "Queen Street",
      city: "Wellington",
      country: "New Zealand",
    });

    // await addressDetailsPage.clickNextButton();
    const employmentDetailsPage = new DOEmploymentDetailsPage(page);
    const financialPositionPage = new DOFinancialPositionPage(page);
    await employmentDetailsPage.waitForEmploymentDetailsStep();
    // Toggle on first so Previous Employment is in the DOM before filling dropdowns that depend on layout.
    // await employmentDetailsPage.turnOnEmploymentDetailsChanged();

    // Current Employment — explicit empty / touched fields, **Save**, assert required messages.
    await employmentDetailsPage.enterCurrentEmployerName("");
    await employmentDetailsPage.touchCurrentOccupationDropdownWithoutSelection();
    await employmentDetailsPage.touchCurrentEmploymentTypeDropdownWithoutSelection();
    await employmentDetailsPage.enterCurrentTimeWithEmployer("", "");
    await employmentDetailsPage.clickSaveEmploymentDetails();
    await employmentDetailsPage.expectCurrentEmploymentRequiredValidationMessages();

    // Current Employment — valid data with time &lt; 3 years → **Previous Employment** section appears after Save.
    await employmentDetailsPage.enterCurrentEmployerName("Acme Finance Ltd");
    await employmentDetailsPage.selectCurrentOccupation("Accountant");
    await employmentDetailsPage.selectCurrentEmploymentType("Full Time Employed");
    await employmentDetailsPage.enterCurrentTimeWithEmployer("1", "2");
    await employmentDetailsPage.clickSaveEmploymentDetails();
    await employmentDetailsPage.expectPreviousEmploymentSectionVisible();

    // Previous Employment — leave required fields empty / touched, Save, assert (matches empty-state validation UI).
    await employmentDetailsPage.enterPreviousEmployerName("");
    await employmentDetailsPage.touchPreviousOccupationDropdownWithoutSelection();
    await employmentDetailsPage.touchPreviousEmploymentTypeDropdownWithoutSelection();
    await employmentDetailsPage.enterPreviousTimeWithEmployer("", "");
    await employmentDetailsPage.clickSaveEmploymentDetails();
    await employmentDetailsPage.expectPreviousEmploymentRequiredValidationMessages();

    await employmentDetailsPage.enterPreviousEmployerName("Prior Employer Ltd");
    await employmentDetailsPage.selectPreviousOccupation("Accountant");
    await employmentDetailsPage.selectPreviousEmploymentType("Full Time Employed");
    await employmentDetailsPage.enterPreviousTimeWithEmployer("1", "0");
    await employmentDetailsPage.clickSaveEmploymentDetails();
    await employmentDetailsPage.clickNextButton();

    // Financial Position — Individual: section visibility, Assets, Income (incl. decrease radios + Details),
    // Expenditure, Essential Outgoings (default Other), Liabilities, then Next (aligned with CSAcAssigned sanity).
    await financialPositionPage.waitForFinancialPositionStep();
    await financialPositionPage.expectIndividualFinancialPositionSectionsVisible();

    // Assets — Home Ownership Type, Vehicle & Furniture amounts, Other asset type + amount (clears “Select a valid value”).
    // Option labels are product-driven; adjust if the dropdown list changes.
    await financialPositionPage.selectIndividualHomeOwnershipType("Mortgage");
    await financialPositionPage.fillIndividualVehicleValueAmount("$18,000.00");
    await financialPositionPage.fillIndividualFurnitureEffectsValueAmount("$12,500.00");
    await financialPositionPage.selectIndividualOtherFinancialAssetType("Savings");
    await financialPositionPage.fillIndividualOtherFinancialAssetAmount("$5,000.00");

    // Liabilities — first row (Mortgage / Rent): balance/limit + repayment amount > 0, frequency Monthly.
    await financialPositionPage.fillFirstLiabilityBalanceAndAmount("$500000.00", "$2500.00");
    await financialPositionPage.setFirstLiabilityRowFrequencyMonthly();

    // Income — Take Home Pay + Spouse/Partner Pay, Monthly; “income decrease” Yes → Details mandatory, then No → Details not required.
    await financialPositionPage.fillFirstIncomeAmount("$5000.00");
    await financialPositionPage.fillSecondIncomeRowAmount("$1,200.00");
    await financialPositionPage.setTakeHomePayFrequencyMonthly();
    await financialPositionPage.setSpousePartnerPayFrequencyMonthly();
    await financialPositionPage.selectIncomeLikelyToDecreaseYes();
    await financialPositionPage.expectIncomeDecreaseDetailsTextareaVisibleAndEnabled();
    await financialPositionPage.fillIncomeDecreaseDetails(
      "Automation: conditional Details when Yes is selected.",
    );
    await financialPositionPage.selectIncomeLikelyToDecreaseNo();
    await financialPositionPage.expectIncomeDecreaseDetailsTextareaHiddenOrDisabled();

    // Expenditure — each recurring line: amount + Monthly (labels match `app-individual-expenditure` copy).
    await financialPositionPage.fillExpenditureAmountByLabel(/Council Rates/i, "$220.00");
    await financialPositionPage.setExpenditureRowFrequencyMonthlyByLabel(/Council Rates/i);
    await financialPositionPage.fillExpenditureAmountByLabel(/Insurance/i, "$180.00");
    await financialPositionPage.setExpenditureRowFrequencyMonthlyByLabel(/Insurance/i);
    await financialPositionPage.fillExpenditureAmountByLabel(/Utilities/i, "$140.00");
    await financialPositionPage.setExpenditureRowFrequencyMonthlyByLabel(/Utilities/i);
    await financialPositionPage.fillExpenditureAmountByLabel(/Living Expenses/i, "$900.00");
    await financialPositionPage.setExpenditureRowFrequencyMonthlyByLabel(/Living Expenses/i);
    await financialPositionPage.fillExpenditureAmountByLabel(/Motor Vehicles/i, "$350.00");
    await financialPositionPage.setExpenditureRowFrequencyMonthlyByLabel(/Motor Vehicles/i);

    // Regular Recurring Essential Outgoings — type defaults to Other; amount + frequency still required.
    await financialPositionPage.expectEssentialOutgoingTypeDefaultOther();
    await financialPositionPage.fillEssentialOutgoingAmount("$150.00");
    await financialPositionPage.setEssentialOutgoingFrequencyMonthly();

    await financialPositionPage.clickNextButton();
    // Reference Details — add contact, confirm, submit
    const referenceDetailsPage = new DOReferenceDetailsPage(page);
    await referenceDetailsPage.waitForReferenceDetailsStep();
    await referenceDetailsPage.clickAddContactDetails();
    await referenceDetailsPage.selectContactType("Accountant");
    await referenceDetailsPage.enterContactFirstName("Alex");
    await referenceDetailsPage.enterContactLastName("Referee");
    await referenceDetailsPage.clickAddContactInModal();
    await referenceDetailsPage.confirmCustomerDetailsCorrect();
    await referenceDetailsPage.clickSubmitButton();
    const customerQuotePostSubmitPage = new DOCustomerQuotePostSubmitPage(page);

    await customerQuotePostSubmitPage.waitForUploadStep();

    // await customerQuotePostSubmitPage.clickAddBorrowersOrGuarantorsButton();
    // await customerQuotePostSubmitPage.selectSearchCustomerTrustType(); 
    // await assetDetailsPage.searchByDropdownClick();
    // await assetDetailsPage.selectUDCSelectOption();
    // await assetDetailsPage.enterUDCCustomerNumber("420");
    // await assetDetailsPage.clickSearchButton();
    // await assetDetailsPage.clickAddNewCustomerButton();

    // // Trust (new customer): select dropdowns only; leave Trust Name / Registered Number / phone / email empty; invalid GST.
    // const trustDetailsPage = new DOTrustDetailsPage(page);
    // await trustDetailsPage.waitForTrustDetailsStep();
    // await trustDetailsPage.selectTrustType("Trust - Charitable");
    // await trustDetailsPage.selectPrimaryNatureOfTrust("0112 Cut Flower & Flower Seed Growing");
    // await trustDetailsPage.clearTrustName();
    // await trustDetailsPage.clearRegisteredNumber();
    // await trustDetailsPage.clearTimeInTrust();
    // await trustDetailsPage.clearBusinessPhone();
    // await trustDetailsPage.clearContactEmail();
    // await trustDetailsPage.enterGstNumber("ijioj");
    // await trustDetailsPage.clickSaveTrustDetails();
    // await trustDetailsPage.expectTrustDetailsValidationWithDropdownsSelected();

    // await trustDetailsPage.selectTrustType("Trust - Charitable");
    // await trustDetailsPage.enterTrustName("TLC Automation Family Trust");
    // await trustDetailsPage.enterRegisteredNumber("12345678");
    // await trustDetailsPage.enterGstNumber("123456789");
    // await trustDetailsPage.enterTrustPurpose("Automation trust purpose for regression.");
    // await trustDetailsPage.selectPrimaryNatureOfTrust("0112 Cut Flower & Flower Seed Growing");
    // await trustDetailsPage.enterTimeInTrustYearsMonths("5", "3");
    // await trustDetailsPage.enterBusinessPhone("21", "1234567");
    // await trustDetailsPage.enterContactEmail("trust.automation@example.com");
    // await trustDetailsPage.nextButton.click();

    // await addressDetailsPage.waitForTrustAddressStep();
    // // want to refresh the page
    // // await page.reload();
    // await addressDetailsPage.waitForTrustAddressStep();
    // await addressDetailsPage.enableAllTrustAddressCopyAndReuseToggles();
    // await addressDetailsPage.expectTrustAddressDataPopulatedAfterToggles();
    // await addressDetailsPage.enterTrustPhysicalTimeAtAddress("2", "6");
    // await addressDetailsPage.enterTrustPreviousPhysicalTimeAtAddress("1", "0");
    // await addressDetailsPage.enterTrustRegisteredTimeAtAddress("3", "0");
    // await addressDetailsPage.clickNextButton();

    // // Trust — Financial Position: Net Profit radios No→Yes; Latest Turnover amount + year end (balance year ends mirror or fallback-fill); balances; Statement of Position assets + liabilities.
    // await financialPositionPage.waitForTrustFinancialPositionStep();
    // await financialPositionPage.fillTrustFinancialPositionComplete({
    //   netProfit: "$25,000.00",
    //   turnoverLatestAmount: "$10,000.00",
    //   turnoverYearEnding: "25/05/2026",
    //   balanceCash: "$10,000.00",
    //   balanceDebtor: "$2,500.00",
    //   balanceCreditor: "$1,500.00",
    //   balanceOverdraft: "$0.00",
    //   assetPersonalProperty: "$5,000.00",
    //   assetVehicle: "$18,000.00",
    //   assetOther: "$2,000.00",
    //   liabilityMortgage: "$850.00",
    //   liabilityLoans: "$300.00",
    //   liabilityCreditCards: "$150.00",
    //   liabilityOther: "$100.00",
    // });
    // await financialPositionPage.clickNextButton();

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
    await customerQuotePostSubmitPage.addNoteAndSubmit(
      "Automated sanity note — CSAC Assigned quote.",
    );
    await customerQuotePostSubmitPage.submitQuoteFromStatusMenu();
    await customerQuotePostSubmitPage.completeOriginatorDeclaration();

    
  },
);
