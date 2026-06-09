/**
 * DO Portal — CSA Quick Quote regression (single Playwright test, single run).
 * Scenario source: CSA_Quote_Regression_Split.pdf (steps / validation table).
 * Auth: shared DO `storageState` from `playwright/do-portal-auth.setup.ts` when running under `do-portal-chromium`.
 */

import { expect, test } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOAssetDetailsPage, DOCustomerQuotePostSubmitPage, DODashboardPage, DOQuickQuotePage, DOReferenceDetailsPage, DOTrustDetailsPage } from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOAddressDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/addressDetails";
import { DOEmploymentDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/employmentDetails";
import { DOFinancialPositionPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/financialPosition";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";

const CSA_QQ_PRODUCT = "CSA-C-Assigned";
const CSA_QQ_PROGRAM = "CSA Personal - MV Dealer";
const TLC_DEALER = "Armstrong Prestige Wellington";

test(
  "DO Portal - CSA Quick Quote — PDF regression (single run)",
  { tag: ["@do", "@regression"] },
  async ({ page }) => {
    test.setTimeout(1_800_000); // 30 minutes

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
    await quickQuotePage.selectProduct(CSA_QQ_PRODUCT);
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
      await quickQuotePage.selectProgram(CSA_QQ_PROGRAM);
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
    const calculateForHost = quickQuotePage.calculateForDropdownHost;
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
    // await quickQuotePage.clearTermsMonths(qq);
    // if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
    //   await quickQuotePage.clickCalculate();
    // }
    // await expect.soft(quickQuotePage.calculateButton).toBeDisabled();
    // await quickQuotePage.expectBlankTermsValidation(qq);
    await quickQuotePage.enterTermsMonths("36");
  
    // -------------------------------------------------------------------------
    // PDF: Term > max (inline error + disabled Calculate, or click then message)
    // -------------------------------------------------------------------------
    // await quickQuotePage.enterTermsMonths("9999");
    // if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
    //   await quickQuotePage.clickCalculate();
    // }
    // await quickQuotePage.expectTermExceedsMaxMessage(qq);
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
    // PDF: Calculate For * — after first Calculate, Payment stays read-only but this dropdown unlocks.
    // SelectorHub targets `p-dropdown.p-element.p-inputwrapper…` — `p-dropdown` is the tag, not always in `class`.
    // -------------------------------------------------------------------------
    const calculateForHostAfterFirstCalc = quickQuotePage.calculateForDropdownHost;
    await expect.soft(calculateForHostAfterFirstCalc).toBeVisible({ timeout: 15_000 });
    await expect.soft(calculateForHostAfterFirstCalc).toHaveAttribute("class", /p-inputwrapper|p-element/);
    const calculateForHostClass = (await calculateForHostAfterFirstCalc.getAttribute("class")) ?? "";
    await expect.soft(calculateForHostClass).not.toContain("p-disabled");
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
    // PDF: Calculate For = Cash Price — cash input stays locked; enter rate + term (+ frequency), then expect any cash value after Calculate.
    // -------------------------------------------------------------------------
    await quickQuotePage.selectCalculateFor("Cash Price");
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();
    await expect.soft(quickQuotePage.cashPriceInput).not.toBeEditable({ timeout: 15_000 });
    await quickQuotePage.enterInterestRatePercent("9");
    await quickQuotePage.enterTermsMonths("36");
    await quickQuotePage.selectFrequency("Monthly");
    await quickQuotePage.clickCalculate();
    await quickQuotePage.expectCreateQuoteVisible();
    const cashPriceAfterCashPriceMode = (
      await quickQuotePage.cashPriceInput.inputValue().catch(() => "")
    ).trim();
    expect.soft(cashPriceAfterCashPriceMode.length).toBeGreaterThan(0);
    expect.soft(/\d/.test(cashPriceAfterCashPriceMode)).toBeTruthy();

    // -------------------------------------------------------------------------
    // PDF: Calculate For = Deposit — deposit % / $ read-only until Calculate; then expect either side populated.
    // -------------------------------------------------------------------------
    await quickQuotePage.selectCalculateFor("Deposit");
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();
    await expect.soft(quickQuotePage.depositPercentInput).not.toBeEditable({ timeout: 15_000 });
    await expect.soft(quickQuotePage.depositDollarInput).not.toBeEditable({ timeout: 15_000 });
    // await quickQuotePage.enterPaymentAmount("500");
    // await quickQuotePage.enterCashPrice("$20,000");
    await quickQuotePage.enterInterestRatePercent("9");
    await quickQuotePage.enterTermsMonths("36");
    await quickQuotePage.selectFrequency("Monthly");
    await quickQuotePage.clickCalculate();
    await quickQuotePage.expectCreateQuoteVisible();
    const depositPctAfter = (await quickQuotePage.depositPercentInput.inputValue().catch(() => "")).trim();
    const depositUsdAfter = (await quickQuotePage.depositDollarInput.inputValue().catch(() => "")).trim();
    expect.soft(/\d/.test(depositPctAfter) || /\d/.test(depositUsdAfter)).toBeTruthy();

    // -------------------------------------------------------------------------
    // PDF: Calculate For = Balloon — refresh cash + deposit %, rate, term, frequency; balloon % / $ locked until Calculate.
    // -------------------------------------------------------------------------
    await quickQuotePage.selectCalculateFor("Balloon");
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();
    await quickQuotePage.clearCashPriceField();
    // await quickQuotePage.enterCashPrice("$25,000");
    await quickQuotePage.enterDepositPercent("");
    await quickQuotePage.enterDepositPercent("8%");
    await quickQuotePage.enterInterestRatePercent("9");
    await quickQuotePage.enterTermsMonths("36");
    await quickQuotePage.selectFrequency("Monthly");
    await expect.soft(quickQuotePage.balloonPercentInput).not.toBeEditable({ timeout: 15_000 });
    await expect.soft(quickQuotePage.balloonDollarInput).not.toBeEditable({ timeout: 15_000 });
    await quickQuotePage.clickCalculate();
    await quickQuotePage.expectCreateQuoteVisible();
    const balloonPctAfter = (await quickQuotePage.balloonPercentInput.inputValue().catch(() => "")).trim();
    const balloonUsdAfter = (await quickQuotePage.balloonDollarInput.inputValue().catch(() => "")).trim();
    expect.soft(/\d/.test(balloonPctAfter) || /\d/.test(balloonUsdAfter)).toBeTruthy();
  
    // -------------------------------------------------------------------------
    // PDF: Reset → default / cleared (PrimeNG outlined Reset `p-button p-button-outlined`).
    // -------------------------------------------------------------------------
    await quickQuotePage.clickReset();
    await expect.soft(quickQuotePage.cashPriceInput).toHaveValue("");
  
    // -------------------------------------------------------------------------
    // PDF: QQ1 calculate → Add Comparison → QQ2 copy; Add 3 disabled until QQ2 calc
    // (duplicate first-panel flow — keep commented; active path below uses current panel state)
    // -------------------------------------------------------------------------
    await quickQuotePage.selectProduct(CSA_QQ_PRODUCT);
    await quickQuotePage.selectProgram(CSA_QQ_PROGRAM);
    await quickQuotePage.enterCashPrice("$20,000");
    await quickQuotePage.enterDepositPercent("10%");
    await quickQuotePage.enterBalloonPercent("0");
    await quickQuotePage.clickCalculate();
    await quickQuotePage.expectCreateQuoteVisible();
    await expect.soft(quickQuotePage.addComparison2Button).toBeEnabled();
    const qq1Summary = quickQuotePage.calculationSummaryRegion.first();
    await expect.soft(qq1Summary).toBeVisible({ timeout: 30_000 });
    await expect.soft(qq1Summary).toContainText(/Loan Amount/i);
    await expect.soft(qq1Summary).toContainText(/Total (Amount )?Payable|Total Payable|Amount Payable/i);
  
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
    await expect.soft(page.getByText(/CSA|Credit Sale/i).first()).toBeVisible();
  
    const assetDetailsPage = new DOAssetDetailsPage(page);
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
    // await assetDetailsPage.expectTermExceedsProgramMaxOnCalculateThenRestore({
    //   overMaxTerm: "9999",
    //   restoreTerm: "36",
    // });
    // Product / Program already match QQ carry-over and are often p-disabled — do not call chooseProduct/chooseProgram here.

    const addAssetPage = new DOAddAssetPage(page);

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

    await assetDetailsPage.expandDealerFinanceSection();
    await assetDetailsPage.expectDealerFinanceExpandedSummary();
    await assetDetailsPage.expectPpsrCountValue("1");
    await assetDetailsPage.fillPpsrCountLoanDetails("2");

    // await assetDetailsPage.udcEstablishmentFee("$300.00");
    // await assetDetailsPage.dealerOriginationFee("$200.00");
    // await assetDetailsPage.expectTotalEstablishmentFeeSumDollars(500);

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
    // await page.reload({ waitUntil: "domcontentloaded" });
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
    await addressDetailsPage.clickSaveAddressDetails();

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

test(
  "DO Portal - CSA Quick Quote — through Asset Details interest / brand-hint checks (subset)",
  { tag: ["@do", "@regression"] },
  async ({ page }) => {
    test.setTimeout(900_000); // 15 minutes — same path as full run up to Asset Details interest checks

    // -------------------------------------------------------------------------
    // Subset: duplicate flow through Asset Details interest / brand-hint checks (no shared helper).
    // -------------------------------------------------------------------------
    const dashboardPage = new DODashboardPage(page);
    const quickQuotePage = new DOQuickQuotePage(page);
  
    // -------------------------------------------------------------------------
    // PDF: user logged in, dashboard, open Quick Quote
    // -------------------------------------------------------------------------
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
    await dashboardPage.selectDealer(TLC_DEALER);
  
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
    const calculateForHost = quickQuotePage.calculateForDropdownHost;
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
    // await quickQuotePage.clearTermsMonths(qq);
    // if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
    //   await quickQuotePage.clickCalculate();
    // }
    // await expect(quickQuotePage.calculateButton).toBeDisabled();
    // await quickQuotePage.expectBlankTermsValidation(qq);
    await quickQuotePage.enterTermsMonths("36");
  
    // -------------------------------------------------------------------------
    // PDF: Term > max (inline error + disabled Calculate, or click then message)
    // -------------------------------------------------------------------------
    // await quickQuotePage.enterTermsMonths("9999");
    // if (await quickQuotePage.calculateButton.isEnabled().catch(() => false)) {
    //   await quickQuotePage.clickCalculate();
    // }
    // await quickQuotePage.expectTermExceedsMaxMessage(qq);
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
    await expect(
      summary.getByText(/\$18[, ]?000|18[, ]?000(?:\.00)?|\$180\.00/i).first(),
    ).toBeVisible({ timeout: 5_000 });
    

    // -------------------------------------------------------------------------
    // PDF: Calculate For * — after first Calculate, Payment stays read-only but this dropdown unlocks.
    // SelectorHub targets `p-dropdown.p-element.p-inputwrapper…` — `p-dropdown` is the tag, not always in `class`.
    // -------------------------------------------------------------------------
    const calculateForHostAfterFirstCalc = quickQuotePage.calculateForDropdownHost;
    await expect(calculateForHostAfterFirstCalc).toBeVisible({ timeout: 15_000 });
    await expect(calculateForHostAfterFirstCalc).toHaveAttribute("class", /p-inputwrapper|p-element/);
    const calculateForHostClass = (await calculateForHostAfterFirstCalc.getAttribute("class")) ?? "";
    await expect(calculateForHostClass).not.toContain("p-disabled");
    await expect(quickQuotePage.calculateForDropdownTrigger).toBeEnabled();
  
    // First Calculate can re-format cash (e.g. $20.00) — reset before deposit $ sync.
    // await quickQuotePage.clearCashPriceField();
    // await quickQuotePage.enterCashPrice("$20,000");
  
    // -------------------------------------------------------------------------
    // PDF: Deposit % / $ — % of cash → deposit $ is reliable; $ → % back-fill
    // often does not update the OR % field (UI keeps 0.00% while $ is authoritative).
    // -------------------------------------------------------------------------
    await quickQuotePage.enterDepositPercent("10%");
    await expect(quickQuotePage.depositDollarInput).toHaveValue(/2[, ]?000|2000/, { timeout: 25_000 });
    await quickQuotePage.clearDepositDollarField();
    await quickQuotePage.enterDepositDollars("$4,000.00");
    await expect(quickQuotePage.depositDollarInput).toHaveValue(/4[, ]?000(?:\.00)?/i, {
      timeout: 25_000,
    });
  
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
    // PDF: Calculate For = Cash Price — cash input stays locked; enter rate + term (+ frequency), then expect any cash value after Calculate.
    // -------------------------------------------------------------------------
    await quickQuotePage.selectCalculateFor("Cash Price");
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();
    await expect(quickQuotePage.cashPriceInput).not.toBeEditable({ timeout: 15_000 });
    await quickQuotePage.enterInterestRatePercent("9");
    await quickQuotePage.enterTermsMonths("36");
    await quickQuotePage.selectFrequency("Monthly");
    await quickQuotePage.clickCalculate();
    await quickQuotePage.expectCreateQuoteVisible();
    const cashPriceAfterCashPriceMode = (
      await quickQuotePage.cashPriceInput.inputValue().catch(() => "")
    ).trim();
    expect(cashPriceAfterCashPriceMode.length).toBeGreaterThan(0);
    expect(/\d/.test(cashPriceAfterCashPriceMode)).toBeTruthy();

    // -------------------------------------------------------------------------
    // PDF: Calculate For = Deposit — deposit % / $ read-only until Calculate; then expect either side populated.
    // -------------------------------------------------------------------------
    await quickQuotePage.selectCalculateFor("Deposit");
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();
    await expect(quickQuotePage.depositPercentInput).not.toBeEditable({ timeout: 15_000 });
    await expect(quickQuotePage.depositDollarInput).not.toBeEditable({ timeout: 15_000 });
    // await quickQuotePage.enterPaymentAmount("500");
    await quickQuotePage.enterCashPrice("$20,000");
    await quickQuotePage.enterInterestRatePercent("9");
    await quickQuotePage.enterTermsMonths("36");
    await quickQuotePage.selectFrequency("Monthly");
    await quickQuotePage.clickCalculate();
    await quickQuotePage.expectCreateQuoteVisible();
    const depositPctAfter = (await quickQuotePage.depositPercentInput.inputValue().catch(() => "")).trim();
    const depositUsdAfter = (await quickQuotePage.depositDollarInput.inputValue().catch(() => "")).trim();
    expect(/\d/.test(depositPctAfter) || /\d/.test(depositUsdAfter)).toBeTruthy();

    // -------------------------------------------------------------------------
    // PDF: Calculate For = Balloon — refresh cash + deposit %, rate, term, frequency; balloon % / $ locked until Calculate.
    // -------------------------------------------------------------------------
    await quickQuotePage.selectCalculateFor("Balloon");
    await quickQuotePage.dismissQuickQuoteDropdownOverlays();
    await quickQuotePage.clearCashPriceField();
    await quickQuotePage.enterCashPrice("$25,000");
    await quickQuotePage.enterDepositPercent("");
    await quickQuotePage.enterDepositPercent("8%");
    await quickQuotePage.enterInterestRatePercent("9");
    // await quickQuotePage.enterTermsMonths("36");
    // await quickQuotePage.selectFrequency("Monthly");
    await expect(quickQuotePage.balloonPercentInput).not.toBeEditable({ timeout: 15_000 });
    await expect(quickQuotePage.balloonDollarInput).not.toBeEditable({ timeout: 15_000 });
    await quickQuotePage.clickCalculate();
    await quickQuotePage.expectCreateQuoteVisible();
    const balloonPctAfter = (await quickQuotePage.balloonPercentInput.inputValue().catch(() => "")).trim();
    const balloonUsdAfter = (await quickQuotePage.balloonDollarInput.inputValue().catch(() => "")).trim();
    expect(/\d/.test(balloonPctAfter) || /\d/.test(balloonUsdAfter)).toBeTruthy();
  
    // -------------------------------------------------------------------------
    // PDF: Reset → default / cleared (PrimeNG outlined Reset `p-button p-button-outlined`).
    // -------------------------------------------------------------------------
    await quickQuotePage.clickReset();
    await expect(quickQuotePage.cashPriceInput).toHaveValue("");
  
    // -------------------------------------------------------------------------
    // PDF: QQ1 calculate → Add Comparison → QQ2 copy; Add 3 disabled until QQ2 calc
    // (duplicate first-panel flow — keep commented; active path below uses current panel state)
    // -------------------------------------------------------------------------
    await quickQuotePage.selectProduct(CSA_QQ_PRODUCT);
    await quickQuotePage.selectProgram(CSA_QQ_PROGRAM);
    await quickQuotePage.enterCashPrice("$20,000");
    await quickQuotePage.enterDepositPercent("10%");
    await quickQuotePage.enterBalloonPercent("0");
    await quickQuotePage.clickCalculate();
    await quickQuotePage.expectCreateQuoteVisible();
    await expect(quickQuotePage.addComparison2Button).toBeEnabled();
    const qq1Summary = quickQuotePage.calculationSummaryRegion.first();
    await expect(qq1Summary).toBeVisible({ timeout: 30_000 });
    await expect(qq1Summary).toContainText(/Loan Amount/i);
    await expect(qq1Summary).toContainText(/Total (Amount )?Payable|Total Payable|Amount Payable/i);
  
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
    // await assetDetailsPage.expectTermExceedsProgramMaxOnCalculateThenRestore({
    //   overMaxTerm: "9999",
    //   restoreTerm: "36",
    // });
    // Product / Program already match QQ carry-over and are often p-disabled — do not call chooseProduct/chooseProgram here.
  },
);
test("CSAC Assigned - Create Standard Quote only Customer Validations", async ({ page }) => {
    test.setTimeout(1000000);
    const dashboardPage = new DODashboardPage(page);
    const assetDetailsPage = new DOAssetDetailsPage(page);
    const addAssetPage = new DOAddAssetPage(page);
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboardPage.waitForAuthenticatedDashboard();
    await dashboardPage.clickCreateStandardQuote();
    await dashboardPage.selectCSAproduct();
    await assetDetailsPage.chooseProduct("CSA-C-Assigned");
    await assetDetailsPage.chooseProgram("Webform - CSA Personal - MV Dealer");
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
    await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
    // await assetDetailsPage.clickCalculateButton();
    // await assetDetailsPage.interestRate("4");
    await assetDetailsPage.clickCalculateButton();
    await assetDetailsPage.clickNextButton();
    await assetDetailsPage.waitForAddBorrowerButton();
    await assetDetailsPage.clickAddBorrowerorGuarantorButton();
    await assetDetailsPage.searchByDropdownClick();
    await assetDetailsPage.selectUDCSelectOption();
    await assetDetailsPage.enterUDCCustomerNumber("420");
    await assetDetailsPage.clickSearchButton();
    await assetDetailsPage.clickAddNewCustomerButton();
    const personalDetailsPage = new DOPersonalDetailsPage(page);
    await personalDetailsPage.enterLastName("Doe");
    await personalDetailsPage.clickNextButton();
    const addressDetailsPage = new DOAddressDetailsPage(page);
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
    // await addressDetailsPage.clickSaveAddressDetails();

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
    const employmentDetailsPage = new DOEmploymentDetailsPage(page);
    const financialPositionPage = new DOFinancialPositionPage(page);
    await employmentDetailsPage.waitForEmploymentDetailsStep();
    await employmentDetailsPage.clickNextButton();
    await financialPositionPage.waitForFinancialPositionStep();
    await financialPositionPage.clickNextButton();
    const referenceDetailsPage = new DOReferenceDetailsPage(page);
    await referenceDetailsPage.waitForReferenceDetailsStep();
    await referenceDetailsPage.confirmCustomerDetailsCorrect();
    await referenceDetailsPage.clickSubmitButton();
    await expect(
      page
        .locator(".p-toast, .p-toast-message, [role='alert']")
        .filter({ hasText: /Please confirm all the mandatory fields/i })
        .first(),
    ).toBeVisible({ timeout: 25_000 });
    await page.locator(':text-is("1. Personal Details")').waitFor({ state: "visible", timeout: 20_000 });
    await page.locator(':text-is("1. Personal Details")').click();
    await personalDetailsPage.expectPersonalDetailsRequiredValidationMessages({
      lastNameMayBeFilled: true,
    });

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
    await addressDetailsPage.clickNextButton();
    await employmentDetailsPage.waitForEmploymentDetailsStep();

    // Current Employment — empty / touched fields, Save, assert (screenshot: Employer name, Occupation, Employment Type, Time ×2).
    // await employmentDetailsPage.enterCurrentEmployerName("");
    // await employmentDetailsPage.touchCurrentOccupationDropdownWithoutSelection();
    // await employmentDetailsPage.touchCurrentEmploymentTypeDropdownWithoutSelection();
    // await employmentDetailsPage.enterCurrentTimeWithEmployer("", "");
    // await employmentDetailsPage.clickSaveEmploymentDetails();
    await employmentDetailsPage.expectCurrentEmploymentRequiredValidationMessages();

    await employmentDetailsPage.enterCurrentEmployerName("Acme Finance Ltd");
    await employmentDetailsPage.selectCurrentOccupation("Accountant");
    await employmentDetailsPage.selectCurrentEmploymentType("Full Time Employed");
    await employmentDetailsPage.enterCurrentTimeWithEmployer("1", "2");
    await employmentDetailsPage.clickSaveEmploymentDetails();
    await employmentDetailsPage.expectPreviousEmploymentSectionVisible();

    // await employmentDetailsPage.enterPreviousEmployerName("");
    // await employmentDetailsPage.touchPreviousOccupationDropdownWithoutSelection();
    // await employmentDetailsPage.touchPreviousEmploymentTypeDropdownWithoutSelection();
    // await employmentDetailsPage.enterPreviousTimeWithEmployer("", "");
    // await employmentDetailsPage.clickSaveEmploymentDetails();
    await employmentDetailsPage.expectPreviousEmploymentRequiredValidationMessages();

    await employmentDetailsPage.enterPreviousEmployerName("Prior Employer Ltd");
    await employmentDetailsPage.selectPreviousOccupation("Accountant");
    await employmentDetailsPage.selectPreviousEmploymentType("Full Time Employed");
    await employmentDetailsPage.enterPreviousTimeWithEmployer("1", "0");
    // await employmentDetailsPage.clickSaveEmploymentDetails();
    await employmentDetailsPage.clickNextButton();

    await financialPositionPage.waitForFinancialPositionStep();
    await financialPositionPage.expectIndividualFinancialPositionSectionsVisible();
    await financialPositionPage.clickNextButton();
    await financialPositionPage.expectIndividualFinancialPositionAmountAndIncomeDecreaseValidationMessages();

    await financialPositionPage.selectIndividualHomeOwnershipType("Mortgage");
    await financialPositionPage.fillIndividualVehicleValueAmount("$18,000.00");
    await financialPositionPage.fillIndividualFurnitureEffectsValueAmount("$12,500.00");
    await financialPositionPage.selectIndividualOtherFinancialAssetType("Savings");
    await financialPositionPage.fillIndividualOtherFinancialAssetAmount("$5,000.00");

    await financialPositionPage.fillFirstLiabilityBalanceAndAmount("$500000.00", "$2500.00");
    await financialPositionPage.setFirstLiabilityRowFrequencyMonthly();

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

    await financialPositionPage.expectEssentialOutgoingTypeDefaultOther();
    await financialPositionPage.fillEssentialOutgoingAmount("$150.00");
    await financialPositionPage.setEssentialOutgoingFrequencyMonthly();

    await financialPositionPage.clickNextButton();
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

    const lizaRow = page.locator("tr, div, li, section").filter({ hasText: /Liza Marie Doe/i }).first();
    await expect(lizaRow).toBeVisible({ timeout: 30000 });
    await expect(lizaRow).toContainText(/Borrower/i);
    await customerQuotePostSubmitPage.clickAddBorrowersOrGuarantorsButton();
    await customerQuotePostSubmitPage.selectSearchCustomerTrustType();
    await assetDetailsPage.searchByDropdownClick();
    await assetDetailsPage.selectUDCSelectOption();
    await assetDetailsPage.enterUDCCustomerNumber("420");
    await assetDetailsPage.clickSearchButton();
    await assetDetailsPage.clickAddNewCustomerButton();
    const trustDetailsPage = new DOTrustDetailsPage(page);
    await trustDetailsPage.selectTrustType("Trust - Charitable");
    await trustDetailsPage.enterTrustName("TLC Automation Family Trust");
    await trustDetailsPage.clickSaveTrustDetails();

    await page.locator(':text-is("5. Contact Details")').waitFor({ state: "visible", timeout: 20_000 });
    await page.locator(':text-is("5. Contact Details")').click();
    await referenceDetailsPage.confirmCustomerDetailsCorrect();
    await referenceDetailsPage.clickSubmitButton();
    await expect(
      page
        .locator(".p-toast, .p-toast-message, [role='alert']")
        .filter({ hasText: /Please confirm all the mandatory fields/i })
        .first(),
    ).toBeVisible({ timeout: 25_000 });
    await page.locator(':text-is("1. Trust Details")').waitFor({ state: "visible", timeout: 20_000 });
    await page.locator(':text-is("1. Trust Details")').click();
    await trustDetailsPage.expectTrustDetailsRequiredMessagesAfterMandatoryFieldsToasterPath();
    await trustDetailsPage.selectTrustType("Trust - Charitable");
    await trustDetailsPage.selectPrimaryNatureOfTrust("0112 Cut Flower & Flower Seed Growing");
    await trustDetailsPage.clearTrustName();
    await trustDetailsPage.clearRegisteredNumber();
    await trustDetailsPage.clearTimeInTrust();
    await trustDetailsPage.clearBusinessPhone();
    await trustDetailsPage.clearContactEmail();
    await trustDetailsPage.enterGstNumber("ijioj");
    await trustDetailsPage.clickSaveTrustDetails();
    await trustDetailsPage.expectTrustDetailsValidationWithDropdownsSelected();

    await trustDetailsPage.selectTrustType("Trust - Charitable");
    await trustDetailsPage.enterTrustName("TLC Automation Family Trust");
    await trustDetailsPage.enterRegisteredNumber("12345678");
    await trustDetailsPage.enterGstNumber("123456789");
    await trustDetailsPage.enterTrustPurpose("Automation trust purpose for regression.");
    await trustDetailsPage.selectPrimaryNatureOfTrust("0112 Cut Flower & Flower Seed Growing");
    await trustDetailsPage.enterTimeInTrustYearsMonths("5", "3");
    await trustDetailsPage.enterBusinessPhone("21", "1234567");
    await trustDetailsPage.enterContactEmail("trust.automation@example.com");
    await trustDetailsPage.nextButton.click();

    await addressDetailsPage.expectTrustAddressStepRequiredValidationAfterSave();
    await addressDetailsPage.fillTrustPhysicalAddressMandatoryCore({
      years: "1",
      months: "1",
      streetNumber: "123",
      streetName: "Main Street",
      city: "Wellington",
    });
    await addressDetailsPage.fillTrustPreviousPhysicalAddressMandatoryCore({
      years: "1",
      months: "0",
      streetNumber: "123",
      streetName: "Main Street",
      city: "Wellington",
    });
    await addressDetailsPage.setTrustReuseForPostalAddressOn();
    await addressDetailsPage.setTrustReuseForRegisteredAddressOn();
    // Reuse copies lines into Registered but usually leaves Years/Months empty — align with physical.
    await addressDetailsPage.fillTrustRegisteredTimeAtAddressAfterReuse("1", "1");
    await addressDetailsPage.clickNextButton();

    await financialPositionPage.expectTrustProfitDeclarationRequiredAfterSave();
    await financialPositionPage.selectTrustNetProfitLastYearYes();
    await financialPositionPage.expectTrustNetProfitLastYearMustBeGreaterThanZeroAfterSave();
    await financialPositionPage.fillTrustNetProfitLastYear("$25,000.00");
    await financialPositionPage.fillTrustTurnoverLatestYear("$10,000.00", "25/05/2026");
    await financialPositionPage
      .expectTrustBalanceYearEndingsMatchLatestTurnoverDate({ timeoutMs: 30_000 })
      .catch(async () => {
        for (let i = 0; i < 4; i++) {
          await financialPositionPage.fillTrustBalanceRowYearEndingIfEmpty(i, "25/05/2026");
        }
      });
    await financialPositionPage.fillTrustBalanceRowAmountOnly(0, "$10,000.00");
    await financialPositionPage.fillTrustBalanceRowAmountOnly(1, "$2,500.00");
    await financialPositionPage.fillTrustBalanceRowAmountOnly(2, "$1,500.00");
    await financialPositionPage.fillTrustBalanceRowAmountOnly(3, "$0.00");
    await financialPositionPage.fillTrustPersonalPropertyAmount("$5,000.00");
    await financialPositionPage.fillTrustVehicleValueAmount("$18,000.00");
    await financialPositionPage.fillTrustOtherAssetAmount("$2,000.00");
    await financialPositionPage.fillTrustMortgageRentMonthlyAmount("$850.00");
    await financialPositionPage.fillTrustLoansMonthlyAmount("$300.00");
    await financialPositionPage.fillTrustCreditCardsMonthlyAmount("$150.00");
    await financialPositionPage.fillTrustOtherLiabilitiesMonthlyAmount("$100.00");
    await financialPositionPage.clickNextButton();

    await page.getByText(/Add Trustees Details/i).waitFor({ state: "visible", timeout: 60_000 });
    await financialPositionPage.clickNextButton();
    await referenceDetailsPage.confirmCustomerDetailsCorrect();
    await referenceDetailsPage.clickSubmitButton();
    await customerQuotePostSubmitPage.waitForUploadStep();
    await customerQuotePostSubmitPage.expectBorrowerOrGuarantorRowShowsRole(
      "TLC Automation Family Trust",
      "Guarantor",
    );
    await customerQuotePostSubmitPage.deleteBorrowerOrGuarantorRow(
      "TLC Automation Family Trust",
      "Guarantor",
    );
    await customerQuotePostSubmitPage.expectBorrowerOrGuarantorRowRemoved(
      "TLC Automation Family Trust",
    );

    // Re-open primary borrower from Borrowers & Guarantors (name link in frozen column wrapper).
    await page
      .locator(
        "div.align-items-center.capitalize.cursor-pointer.ng-star-inserted a.cursor-pointer.text-primary",
      )
      .filter({ hasText: /^Liza Marie Doe/i })
      .first()
      .click({ timeout: 60_000 });
    await page.locator(':text-is("1. Personal Details")').waitFor({ state: "visible", timeout: 60_000 });

    await personalDetailsPage.chooseTitle("Dame");
    await personalDetailsPage.enterFirstName("Test");
    await personalDetailsPage.enterMiddleName("Marie");
    await personalDetailsPage.enterLastName("Doe");
    await personalDetailsPage.chooseGender("Female");
    await personalDetailsPage.enterDateOfBirth("01/01/1980");
    await personalDetailsPage.clickSavePersonalDetails();

    await page.locator(':text-is("5. Reference Details")').waitFor({ state: "visible", timeout: 60_000 });
    await page.locator(':text-is("5. Reference Details")').click();
    await referenceDetailsPage.waitForReferenceDetailsStep();
    await referenceDetailsPage.confirmCustomerDetailsCorrect();
    await referenceDetailsPage.clickSubmitButton();

    await customerQuotePostSubmitPage.waitForUploadStep();
    await customerQuotePostSubmitPage.uploadDocument();
    await customerQuotePostSubmitPage.expectDocumentUploaded();
    await customerQuotePostSubmitPage.openDocumentsTab();
    await customerQuotePostSubmitPage.selectCustomerQuoteBasicRow();
    await customerQuotePostSubmitPage.clickDownload();
    await customerQuotePostSubmitPage.confirmDocumentParameters();
    await customerQuotePostSubmitPage.addNoteAndSubmit(
      "Automated sanity note — CSAC Assigned quote.",
    );
    await customerQuotePostSubmitPage.submitQuoteFromStatusMenu();
    await customerQuotePostSubmitPage.completeOriginatorDeclaration();



    

});


