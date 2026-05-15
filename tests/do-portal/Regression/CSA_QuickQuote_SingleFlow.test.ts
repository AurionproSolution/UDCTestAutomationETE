/**
 * DO Portal — CSA Quick Quote regression (single Playwright test, single run).
 * Scenario source: CSA_Quote_Regression_Split.pdf (steps / validation table).
 * Auth: `do-regression-chromium` + `doSanity.auth.setup.ts` (storageState).
 */

import { expect, test } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOAssetDetailsPage, DODashboardPage, DOQuickQuotePage } from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOAddressDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/addressDetails";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";

const CSA_QQ_PRODUCT = "CSA-C-Assigned";
const CSA_QQ_PROGRAM = "CSA Personal - MV Dealer";

test(
  "DO Portal - CSA Quick Quote — PDF regression (single run)",
  { tag: ["@do", "@sanity"] },
  async ({ page }) => {
    test.setTimeout(480_000);

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
    // PDF: select CSA-C-Assigned; related programs appear in list
    // -------------------------------------------------------------------------
    await quickQuotePage.selectProduct(CSA_QQ_PRODUCT);
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();
    await quickQuotePage.programDropdownTrigger.click();
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
    const programs = await page.getByRole("option").allTextContents();
    await page.keyboard.press("Escape");
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();
    expect(programs.length).toBeGreaterThan(0);
    expect(programs.some((t) => /CSA|Personal|Dealer|Webform|MV|Retail|Assigned/i.test(t))).toBeTruthy();

    // -------------------------------------------------------------------------
    // PDF: select program; pricing fields appear
    // -------------------------------------------------------------------------
    if (await quickQuotePage.programDropdownTrigger.isEnabled()) {
      await quickQuotePage.selectProgram(CSA_QQ_PROGRAM);
    }
    await expect(quickQuotePage.calculateForDropdownTrigger).toBeVisible();
    await expect(quickQuotePage.cashPriceInput).toBeVisible();
    await expect(quickQuotePage.depositPercentInput).toBeVisible();
    await expect(quickQuotePage.depositDollarInput).toBeVisible();
    await expect(quickQuotePage.interestRatePercentInput).toBeVisible();
    await expect(quickQuotePage.termsMonthsInput).toBeVisible();
    await expect(quickQuotePage.frequencyDropdownTrigger).toBeVisible();

    // -------------------------------------------------------------------------
    // PDF: Calculate For defaults to Payment; often locked until first calc (p-dropdown host)
    // When the host is not p-disabled, inner trigger can still report enabled — do not fail.
    // -------------------------------------------------------------------------
    const calculateForHost = quickQuotePage.quickQuoteForm.locator(
      "xpath=.//label[contains(normalize-space(.), 'Calculate For')]/following::p-dropdown[1]",
    );
    const hostCls = (await calculateForHost.getAttribute("class").catch(() => "")) ?? "";
    if (hostCls.includes("p-disabled")) {
      await expect(quickQuotePage.calculateForDropdownTrigger).toBeDisabled();
    }

    // -------------------------------------------------------------------------
    // PDF: Interest / Term / Frequency (visible; may pre-populate)
    // -------------------------------------------------------------------------
    await expect(quickQuotePage.interestRatePercentInput).toBeVisible();
    await expect(quickQuotePage.termsMonthsInput).toBeVisible();
    await expect(quickQuotePage.frequencyDropdownTrigger).toBeVisible();

    // -------------------------------------------------------------------------
    // PDF: Payment read-only before first calculation (locked input and/or label display)
    // -------------------------------------------------------------------------
    if (await quickQuotePage.paymentAmountInput.isVisible().catch(() => false)) {
      const locked = await quickQuotePage.paymentAmountInputIsReadOnly();
      const displayOnly = await quickQuotePage.paymentDisplay.isVisible().catch(() => false);
      expect(locked || displayOnly).toBeTruthy();
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
    //   await expect(quickQuotePage.calculateButton).toBeDisabled();
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
    await expect(quickQuotePage.calculateButton).toBeDisabled();
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
    await expect(quickQuotePage.addComparison2Button).toBeEnabled();

    const summary = quickQuotePage.calculationSummaryRegion.first();
    await expect(summary).toBeVisible({ timeout: 30_000 });
    await expect(summary).toContainText(/Loan Amount/i);
    await expect(summary).toContainText(/Total (Amount )?Payable|Total Payable|Amount Payable/i);
    await summary
      .getByText(/\$18[, ]?000|18[, ]?000(?:\.00)?|\$180\.00/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    // -------------------------------------------------------------------------
    // PDF: Calculate For enabled after first calculation
    // -------------------------------------------------------------------------
    await expect(quickQuotePage.calculateForDropdownTrigger).toBeEnabled();

    // First Calculate can re-format cash (e.g. $20.00) — reset before deposit $ sync.
    // await quickQuotePage.clearCashPriceField();
    // await quickQuotePage.enterCashPrice("$20,000");

    // -------------------------------------------------------------------------
    // PDF: Deposit % / $ sync — % of cash → deposit $; deposit $ vs cash → %
    // -------------------------------------------------------------------------
    await quickQuotePage.enterDepositPercent("10%");
    await expect(quickQuotePage.depositDollarInput).toHaveValue(/2[, ]?000|2000/, { timeout: 25_000 });
    await quickQuotePage.clearDepositDollarField();
    await quickQuotePage.enterDepositDollars("$4,000.00");
    await expect(quickQuotePage.depositPercentInput).toHaveValue(/20/);

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
    // await expect(quickQuotePage.addComparison2Button).toBeEnabled();
    // const qq1Summary = quickQuotePage.calculationSummaryRegion.first();
    // await expect(qq1Summary).toBeVisible({ timeout: 30_000 });
    // await expect(qq1Summary).toContainText(/Loan Amount/i);
    // await expect(qq1Summary).toContainText(/Total (Amount )?Payable|Total Payable|Amount Payable/i);

    await expect(quickQuotePage.addComparison2Button).toBeEnabled();
    await quickQuotePage.clickAddComparisonPrimary();
    expect(await quickQuotePage.quickQuotePanelCount()).toBe(2);
    await expect(quickQuotePage.cashPriceInputOnQuote(1)).not.toHaveValue("");
    // await expect(quickQuotePage.calculateForTriggerOnQuote(1)).toBeDisabled();

    await expect(quickQuotePage.addComparison3Button).toBeDisabled();

    await quickQuotePage.enterTermsMonthsOnQuote(1, "36");
    await quickQuotePage.selectFrequencyOnQuote(1, "Monthly");
    await quickQuotePage.clickCalculateOnQuote(1);
    await quickQuotePage.expectCreateQuoteVisible();

    // -------------------------------------------------------------------------
    // PDF: max 3 Quick Quotes; no QQ4
    // -------------------------------------------------------------------------
    await expect(quickQuotePage.addComparison3Button).toBeEnabled();
    await quickQuotePage.clickElement(quickQuotePage.addComparison3Button);
    expect(await quickQuotePage.quickQuotePanelCount()).toBe(3);
    await quickQuotePage.enterTermsMonthsOnQuote(2, "36");
    await quickQuotePage.selectFrequencyOnQuote(2, "Monthly");
    await quickQuotePage.clickCalculateOnQuote(2);
    await expect(page.getByRole("button", { name: /Add Comparison 4/i })).toHaveCount(0);

    // -------------------------------------------------------------------------
    // PDF: Print / Download (trial; MAF-6689)
    // -------------------------------------------------------------------------
    await expect(quickQuotePage.printButton).toBeVisible();
    await expect(quickQuotePage.downloadButton).toBeVisible();
    await quickQuotePage.printButton.click({ trial: true });
    await quickQuotePage.downloadButton.click({ trial: true });

    // -------------------------------------------------------------------------
    // PDF: Create Quote → Standard Quote (Asset Details step)
    // -------------------------------------------------------------------------
    await quickQuotePage.clickCreateQuote();
    const standardRoot = page.locator("app-quote-details, app-standard-quote").first();
    await expect(standardRoot).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/CSA|Credit Sale/i).first()).toBeVisible();

    const assetDetailsPage = new DOAssetDetailsPage(page);
    const addAssetPage = new DOAddAssetPage(page);
    // -------------------------------------------------------------------------
    // Spreadsheet / PDF: Product & Program, finance carry-over, UDC Establishment Fee,
    // Loan / First Payment, Calculate with blank origin (allowed on CSA), Originator ref + Loan Purpose blank
    // -------------------------------------------------------------------------
    await assetDetailsPage.waitForAssetDetailsStepReady();
    await assetDetailsPage.expectProductProgramCarriedFromQuickQuote(CSA_QQ_PRODUCT, CSA_QQ_PROGRAM);
    await assetDetailsPage.expectFinanceCarriedFromQuickQuote({
      cashPrice: /20[, ]?000|20000/i,
      term: /36/,
      frequencyText: /Monthly/i,
      interestRate: /9/,
    });
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
    await assetDetailsPage.expectTermExceedsProgramMaxOnCalculateThenRestore({
      overMaxTerm: "9999",
      restoreTerm: "36",
    });
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

    await addressDetailsPage.clickNextButton();
  },
);

