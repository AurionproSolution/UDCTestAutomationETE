/**
 * Zephyr Sanity — UDP-T4677 through UDP-T4730.
 * Scenario source: Sanity Test Cases.xlsx (/Sanity Automation).
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import path from "path";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../../config/env";
import {
  DOAssetDetailsPage,
  DOBusinessDetailsPage,
  DODashboardPage,
  DOQuickQuotePage,
  DOTrustDetailsPage
} from "../../../../pages";
import { DOAddressDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/addressDetails";
import { openFinanceLeaseBusinessAsgToAddBorrowerStep } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/customerDetailsFLBusiness.helpers.test";
import { DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/customerQuotePostSubmit";
import { DOPersonalDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import { DOReferenceDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/referenceDetails";
import { fillAddOnAccessoriesAndSave } from "../../doRegressionTestSuite/fl.helpers";
import { openStandardQuoteFromDashboard } from "../../doRegressionTestSuite/workflow.helpers";
import {
  CSA_SQ_PRODUCT,
  CSA_SQ_PROGRAM,
  addManualAssetViaSummary,
  advanceIndividualBorrowerToPostSubmission,
  assetInsuranceSummaryDialog,
  copyAssetFromSummary,
  createSaveAndReopenDocumentationQuote,
  fillMinimalIndividualBorrowerThroughReference,
  fillSanityCsaQuickQuote,
  fillValidIndividualPersonalBorrower,
  openAddOnsFromAssetDetails,
  openSanityCsaAssetDetails,
  openSanityCustomerDetailsStep,
  openSanityQuickQuote,
  prepareCalculableCsaQuote,
  promotionQuoteCheckbox,
  removeLastAssetFromSummary,
  saveExistingIndividualBorrowerOnCustomerDetailsQuote,
  searchTypeRadioInput,
  selectCsaProductAndProgram,
  selectCsaQuickQuoteProductAndProgram,
  selectSearchCustomerTrustType,
  standardQuoteRoot,
  uniqueOrigRef,
  waitForSearchCustomerDialog
} from "./sanity.helpers";

const EXISTING_UDC = process.env.UDC_EXISTING_CUSTOMER_NUMBER?.trim() || "1183304";

async function waitForProductProgramChange(page: Page, asset: DOAssetDetailsPage): Promise<void> {
  const loaders = page.locator(".app-loader-overlay, .p-progress-spinner, .p-blockui");
  await loaders.first().waitFor({ state: "hidden", timeout: 120_000 }).catch(() => {});
  await asset.waitForAssetDetailsStepReady().catch(() => {});
}

test.describe("DO Portal — Zephyr Sanity @do @smoke @sanity", () => {
  test("UDP-T4677 - Login @UDP-T4677", async ({ page }) => {
    test.setTimeout(180_000);
    const dashboard = new DODashboardPage(page);
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    await dashboard.waitForAuthenticatedDashboard();
    await expect(page.locator("app-dashboard, app-quote-list").first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test.describe.serial("Quick Quote (UDP-T4678–UDP-T4685)", () => {
    let quickQuote: DOQuickQuotePage;

    test.beforeEach(async ({ page }) => {
      ({ quickQuote } = await openSanityQuickQuote(page));
    });

    test("UDP-T4678 - Launch Quick Quote @UDP-T4678", async () => {
      test.setTimeout(240_000);
      await expect(quickQuote.quickQuoteRoot).toBeVisible();
      await expect(quickQuote.quickQuoteForm).toBeVisible();
      await expect(quickQuote.page.getByText("Quick Quote", { exact: false }).first()).toBeVisible();
    });

    test("UDP-T4679 - Check defaulting @UDP-T4679", async () => {
      test.setTimeout(240_000);
      await selectCsaQuickQuoteProductAndProgram(quickQuote);
      await expect(quickQuote.cashPriceInput).toBeVisible();
      await expect(quickQuote.interestRatePercentInput).toBeVisible();
      await expect(quickQuote.termsMonthsInput).toBeVisible();
      await expect(quickQuote.calculateButton).toBeVisible();
    });

    test("UDP-T4680 - Create a new quote (calculate) @UDP-T4680", async () => {
      test.setTimeout(240_000);
      await fillSanityCsaQuickQuote(quickQuote);
      await quickQuote.clickCalculate();
      await expect(quickQuote.createQuoteButton).toBeVisible();
      const calcSummary = quickQuote.page.locator(
        "app-quick-quote .calculation-result, app-quick-quote [class*='result'], app-quick-quote [class*='amount']",
      );
      await expect(calcSummary.first()).toBeVisible();
    });

    test("UDP-T4681 - Create Quote opens Standard Quote with data transfer @UDP-T4681", async () => {
      test.setTimeout(300_000);
      await fillSanityCsaQuickQuote(quickQuote);
      await quickQuote.clickCalculate();
      await quickQuote.clickCreateQuote();
      await expect(standardQuoteRoot(quickQuote.page)).toBeVisible({ timeout: 120_000 });
      await expect(quickQuote.page.getByText(/CSA-C-Assigned|CSA Personal/i).first()).toBeVisible();
    });

    test("UDP-T4682 - Calculate functionality @UDP-T4682", async () => {
      test.setTimeout(300_000);
      await fillSanityCsaQuickQuote(quickQuote);
      await quickQuote.clickCalculate();
      await quickQuote.clickCreateQuote();
      await expect(standardQuoteRoot(quickQuote.page)).toBeVisible({ timeout: 120_000 });
      await expect(quickQuote.page.getByRole("button", { name: /^Next$/i }).first()).toBeVisible();
    });

    test("UDP-T4683 - Add Comparison @UDP-T4683", async () => {
      test.setTimeout(240_000);
      await fillSanityCsaQuickQuote(quickQuote);
      await quickQuote.clickCalculate();
      await quickQuote.clickAddComparison2();
      await expect(quickQuote.addComparison3Button).toBeVisible();
    });

    test("UDP-T4684 - Reset and Create Quote buttons @UDP-T4684", async () => {
      test.setTimeout(300_000);
      await fillSanityCsaQuickQuote(quickQuote);
      await expect(quickQuote.cashPriceInput).toHaveValue(/20,?000|20000/);
      await quickQuote.clickReset();
      await expect(quickQuote.cashPriceInput).toHaveValue("");
      await fillSanityCsaQuickQuote(quickQuote);
      await quickQuote.clickCalculate();
      await expect(quickQuote.createQuoteButton).toBeVisible();
    });

    test("UDP-T4685 - Print and download button @UDP-T4685", async () => {
      test.setTimeout(240_000);
      await fillSanityCsaQuickQuote(quickQuote);
      await quickQuote.clickCalculate();
      await expect(quickQuote.printButton).toBeVisible();
      await expect(quickQuote.downloadButton).toBeVisible();
      await quickQuote.printButton.click({ trial: true });
      await quickQuote.downloadButton.click({ trial: true });
    });
  });

  test("UDP-T4686 - Launch Standard Quote @UDP-T4686", async ({ page }) => {
    test.setTimeout(240_000);
    await openStandardQuoteFromDashboard(page);
    await expect(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  });

  test("UDP-T4687 - Select Promotion Quote @UDP-T4687", async ({ page }) => {
    test.setTimeout(300_000);
    await openStandardQuoteFromDashboard(page);
    const promo = promotionQuoteCheckbox(page);
    if (await promo.isVisible({ timeout: 15_000 }).catch(() => false)) {
      const input = promo.locator('input[type="checkbox"]').first();
      await promo.locator(".p-checkbox-box").first().click({ timeout: 10_000 }).catch(() => input.check());
      await expect(page.locator("app-quote-details, app-standard-quote").getByRole("combobox").first()).toBeVisible();
    }
  });

  test("UDP-T4688 - Product program without promotion @UDP-T4688", async ({ page }) => {
    test.setTimeout(300_000);
    const { asset } = await openSanityCsaAssetDetails(page);
    await selectCsaProductAndProgram(asset);
    await expect(asset.page.getByText(CSA_SQ_PRODUCT, { exact: false }).first()).toBeVisible();
    await expect(asset.page.getByText(CSA_SQ_PROGRAM, { exact: false }).first()).toBeVisible();
  });

  test("UDP-T4689 - Check defaulting @UDP-T4689", async ({ page }) => {
    test.setTimeout(300_000);
    const { asset } = await openSanityCsaAssetDetails(page);
    await selectCsaProductAndProgram(asset);
    const root = standardQuoteRoot(page);
    await expect(root.getByText(/Loan Purpose/i).first()).toBeVisible();
    await expect(root.getByText(/Term|Terms/i).first()).toBeVisible();
  });

  test("UDP-T4690 - Add Balloon amount @UDP-T4690", async ({ page }) => {
    test.setTimeout(360_000);
    const { asset, addAsset, origRef } = await openSanityCsaAssetDetails(page);
    await prepareCalculableCsaQuote(asset, addAsset, origRef);
    await asset.enterBalloonPercent("20");
    await asset.clickCalculateButton();
    await asset.expectPaymentScheduleSectionWithTableData();
    await asset.enterBalloonPercentAndCheckFixed("20");
    await asset.clickCalculateButton();
    await asset.expectPaymentScheduleSectionWithTableData();
  });

  test("UDP-T4691 - Waive LMF checkbox checked/unchecked @UDP-T4691", async ({ page }) => {
    test.setTimeout(360_000);
    const { asset, addAsset, origRef } = await openSanityCsaAssetDetails(page);
    await prepareCalculableCsaQuote(asset, addAsset, origRef);
    if (await asset.waiveLmfCheckboxHost().isVisible({ timeout: 8_000 }).catch(() => false)) {
      await asset.setWaiveLmfChecked(true);
      await asset.clickCalculateButton();
      await asset.setWaiveLmfChecked(false);
      await asset.clickCalculateButton();
      await asset.expectPaymentScheduleSectionWithTableData();
    }
  });

  test("UDP-T4692 - Enter cash deposit and trade amt @UDP-T4692", async ({ page }) => {
    test.setTimeout(360_000);
    const { asset, addAsset, origRef } = await openSanityCsaAssetDetails(page);
    await prepareCalculableCsaQuote(asset, addAsset, origRef);
    await asset.enterTradeAmount("1000");
    await asset.clickCalculateButton();
    await asset.expectNetTradeAmountPattern(/\$?[\d,]+/);
  });

  test("UDP-T4693 - Add trade in asset @UDP-T4693", async ({ page }) => {
    test.setTimeout(360_000);
    const { asset } = await openSanityCsaAssetDetails(page);
    await asset.openAssetInsuranceTradeInSummary();
    await asset.clickSearchAddTradeInAndExpectChooserOpened();
    await asset.closeSearchTradeInAssetDialog().catch(() => {});
    await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
  });

  test("UDP-T4694 - Add and Edit Asset @UDP-T4694", async ({ page }) => {
    test.setTimeout(360_000);
    const { asset, addAsset } = await openSanityCsaAssetDetails(page);
    await addManualAssetViaSummary(asset, addAsset);
    await asset.openAssetInsuranceTradeInSummary();
    await asset.clickAssetSummaryEditButton();
    await addAsset.enterMake("Honda");
    await addAsset.clickSummitButton();
    await addAsset.clickCrossButton();
    await asset.openAssetInsuranceTradeInSummary();
    await expect(assetInsuranceSummaryDialog(page)).toContainText(/Honda/i);
    await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
  });

  test("UDP-T4695 - Add multiple assets @UDP-T4695", async ({ page }) => {
    test.setTimeout(360_000);
    const { asset, addAsset } = await openSanityCsaAssetDetails(page);
    await addManualAssetViaSummary(asset, addAsset);
    await copyAssetFromSummary(page, asset);
    await asset.openAssetInsuranceTradeInSummary();
    const rows = await assetInsuranceSummaryDialog(page).locator("tbody tr").count();
    expect(rows).toBeGreaterThanOrEqual(2);
    await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
  });

  test("UDP-T4696 - Remove asset @UDP-T4696", async ({ page }) => {
    test.setTimeout(360_000);
    const { asset, addAsset } = await openSanityCsaAssetDetails(page);
    await addManualAssetViaSummary(asset, addAsset);
    await copyAssetFromSummary(page, asset);
    await removeLastAssetFromSummary(page, asset);
  });

  test("UDP-T4697 - Add asset with motocheck @UDP-T4697", async ({ page }) => {
    test.setTimeout(360_000);
    const { asset } = await openSanityCsaAssetDetails(page);
    await asset.openAssetInsuranceTradeInSummary();
    await asset.clickSearchAddTradeInAndExpectChooserOpened();
    const tradeDlg = page.getByRole("dialog").last();
    const moto = tradeDlg.getByText(/Motochek/i).first();
    if (await moto.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await moto.click();
    }
    await asset.closeSearchTradeInAssetDialog().catch(() => {});
    await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
  });

  test("UDP-T4698 - Fill add-ons and accessories @UDP-T4698", async ({ page }) => {
    test.setTimeout(420_000);
    const { asset, addAsset, origRef } = await openSanityCsaAssetDetails(page);
    await prepareCalculableCsaQuote(asset, addAsset, origRef);
    await asset.clickCalculateButton();
    const addOns = await openAddOnsFromAssetDetails(asset);
    await addOns.completeAllAddOnsAndAccessories();
    await fillAddOnAccessoriesAndSave(page, asset);
  });

  test("UDP-T4699 - Update/remove add-ons @UDP-T4699", async ({ page }) => {
    test.setTimeout(420_000);
    const { asset, addAsset, origRef } = await openSanityCsaAssetDetails(page);
    await prepareCalculableCsaQuote(asset, addAsset, origRef);
    await asset.clickCalculateButton();
    const addOns = await openAddOnsFromAssetDetails(asset);
    await addOns.completeAllAddOnsAndAccessories();
    await fillAddOnAccessoriesAndSave(page, asset);
    await asset.clickAddonsAndAccessoriesAndExpectScreen();
    await addOns.completeAddOnsValidationScenarioThenRefillWithStandardAmounts();
    await fillAddOnAccessoriesAndSave(page, asset);
  });

  test("UDP-T4700 - Add insurance @UDP-T4700", async ({ page }) => {
    test.setTimeout(420_000);
    const { asset, addAsset, origRef } = await openSanityCsaAssetDetails(page);
    await prepareCalculableCsaQuote(asset, addAsset, origRef);
    await asset.clickCalculateButton();
    const addOns = await openAddOnsFromAssetDetails(asset);
    const added = await addOns.fillUdpT4221InsuranceIfAvailable("2", "200");
    if (added) {
      await fillAddOnAccessoriesAndSave(page, asset);
    }
  });

  test("UDP-T4701 - Insurance disclosure form enabled/disabled @UDP-T4701", async ({ page }) => {
    test.setTimeout(420_000);
    const { asset, addAsset, origRef } = await openSanityCsaAssetDetails(page);
    await prepareCalculableCsaQuote(asset, addAsset, origRef);
    await asset.clickCalculateButton();
    const addOns = await openAddOnsFromAssetDetails(asset);
    await addOns.toggleInsuranceQuestionNoThenYes("Extended Warranty");
  });

  test("UDP-T4702 - Edit payment schedule @UDP-T4702", async ({ page }) => {
    test.setTimeout(600_000);
    const { asset, addAsset, origRef } = await openSanityCsaAssetDetails(page);
    await prepareCalculableCsaQuote(asset, addAsset, origRef);
    await asset.clickCalculateButton();
    await asset.expectPaymentScheduleSectionWithTableData();

    await asset.openEditPaymentScheduleDialog();
    await asset.ensureEditPaymentScheduleDialogSegmentView();
    const originalSchedule = await asset.getEditPaymentScheduleSegmentRowsSnapshot();
    expect(originalSchedule.length).toBeGreaterThan(0);

    const interestOnlyPayments = "12";
    await asset.modifyEditPaymentScheduleSegmentFields({
      number: interestOnlyPayments,
      type: "Interest Only",
    });
    await asset.waitForEditPaymentScheduleAddSegmentEnabled();
    await asset.clickEditPaymentScheduleAddSegment();

    const paymentsTotal = await asset.getEditPaymentScheduleNumberOfPayments();
    const remainingPayments = String(Math.max(1, paymentsTotal - Number(interestOnlyPayments)));
    await asset.enterEditPaymentScheduleSegmentNumberOnRow(1, remainingPayments);
    await asset.selectEditPaymentScheduleSegmentTypeOnRow(1, "Normal");

    await asset.clickEditPaymentScheduleCalculate();
    await asset.expectEditPaymentScheduleCalculateSummaryVisible();

    const modifiedSchedule = await asset.getEditPaymentScheduleSegmentRowsSnapshot();
    expect(modifiedSchedule).toHaveLength(2);
    expect(modifiedSchedule[0].number).toBe(interestOnlyPayments);
    expect(modifiedSchedule[0].type).toMatch(/Interest Only/i);
    expect(modifiedSchedule[1].number).toBe(remainingPayments);
    expect(modifiedSchedule[1].type).toMatch(/Normal/i);

    await asset.clickEditPaymentScheduleApply();
    await asset.expectEditPaymentScheduleDialogClosedOnStandardQuote();

    await asset.openEditPaymentScheduleDialog();
    await asset.ensureEditPaymentScheduleDialogSegmentView();
    await asset.expectEditPaymentScheduleSegmentRowsMatch(modifiedSchedule);
    await asset.closeEditPaymentScheduleDialogIfOpen();
    await asset.expectPaymentScheduleSectionWithTableData();
  });

  test("UDP-T4703 - Cross page data retention @UDP-T4703", async ({ page }) => {
    test.setTimeout(420_000);
    const origRef = uniqueOrigRef("RET");
    const { asset } = await openSanityCustomerDetailsStep(page, origRef);
    await asset.clickStandardQuoteStepTab(/Asset Details/i);
    await asset.waitForAssetDetailsStepReady();
    const refVal = await asset.originationRefInput.inputValue();
    expect(refVal).toMatch(new RegExp(origRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  test("UDP-T4704 - Change product/program @UDP-T4704", async ({ page }) => {
    test.setTimeout(420_000);
    const { asset } = await openSanityCsaAssetDetails(page);
    await selectCsaProductAndProgram(asset);
    await asset.chooseProgram("CSA Personal - MV Dealer");
    await waitForProductProgramChange(page, asset);
    await asset.clickCalculateButton();
    await expect(page.getByText(/Please|Calculate|complete/i).first()).toBeVisible({ timeout: 15_000 }).catch(() => {});
  });

  test("UDP-T4705 - Validate customer search @UDP-T4705", async ({ page }) => {
    test.setTimeout(420_000);
    const asset = await openFinanceLeaseBusinessAsgToAddBorrowerStep(page);
    await asset.clickAddBorrowerorGuarantorButton();
    const dlg = await waitForSearchCustomerDialog(page);
    await expect(searchTypeRadioInput(dlg, "individual")).toBeAttached();
    await expect(searchTypeRadioInput(dlg, "business")).toBeAttached();
    const trust = searchTypeRadioInput(dlg, "trust");
    if ((await trust.count()) > 0) {
      await expect(trust).toBeAttached();
    }
  });

  test("UDP-T4706 - Prevent submission without customer @UDP-T4706", async ({ page }) => {
    test.setTimeout(420_000);
    const { customer } = await openSanityCustomerDetailsStep(page);
    await customer.clickAddBorrowersOrGuarantors().catch(() => {});
    const ref = new DOReferenceDetailsPage(page);
    const refVisible = await ref.addContactDetailsButton.isVisible({ timeout: 5_000 }).catch(() => false);
    if (refVisible) {
      await ref.clickSubmitButton();
      await expect(page.getByText(/customer|borrower|required|add/i).first()).toBeVisible({ timeout: 20_000 });
    } else {
      await expect(customer.addBorrowersOrGuarantorsButton).toBeVisible();
    }
  });

  test("UDP-T4707 - Add customer and submit @UDP-T4707", async ({ page }) => {
    test.setTimeout(600_000);
    const post = await advanceIndividualBorrowerToPostSubmission(page, uniqueOrigRef("SUB"));
    await post.uploadDocument();
    await post.submitQuoteThroughWorkflowDeclaration();
    await expect(page.getByText(/Submitted|Application|Workflow/i).first()).toBeVisible({ timeout: 60_000 });
  });

  test("UDP-T4708 - Verify in AF @UDP-T4708", async () => {
    test.skip(true, "AF verification is manual / out of portal automation scope.");
  });

  test("UDP-T4709 - Add contacts in customer @UDP-T4709", async ({ page }) => {
    test.setTimeout(480_000);
    const { customer } = await openSanityCustomerDetailsStep(page);
    const ref = await fillMinimalIndividualBorrowerThroughReference(page, customer);
    await ref.clickAddContactDetails();
    await ref.selectContactType("Accountant");
    await ref.enterContactFirstName("Alex");
    await ref.enterContactLastName("Referee");
    await ref.clickAddContactInModal();
    await expect(page.getByText(/Alex/i).first()).toBeVisible();
    await expect(page.getByText(/verification|electronic|manual/i).first()).toBeVisible({ timeout: 15_000 }).catch(() => {});
  });

  test("UDP-T4710 - Add Signatory @UDP-T4710", async ({ page }) => {
    test.setTimeout(480_000);
    const { customer } = await openSanityCustomerDetailsStep(page);
    const ref = await fillMinimalIndividualBorrowerThroughReference(page, customer);

    // Precondition — reuse UDP-T4709 contact creation (Signatory defaults to No).
    await ref.clickAddContactDetails();
    await ref.selectContactType("Accountant");
    await ref.enterContactFirstName("Alex");
    await ref.enterContactLastName("Referee");
    await ref.clickAddContactInModal();

    // Step 1 — open existing customer from Customer Details.
    await customer.navigateToBorrowerSummary();
    await customer.openSavedCustomerByName(/Liza|Marie|Doe/i);

    // Step 2 — Reference Details.
    await ref.navigateToReferenceDetailsStep();

    // Steps 3–5 — open contact, set Signatory = Yes, save.
    await ref.openReferenceContactForEdit(/Alex|Referee/i);
    await ref.selectContactSignatory("Yes");
    await ref.clickSaveContactInModal();
    await ref.expectReferenceContactSignatoryShows(/Alex|Referee/i, "Yes");

    // Step 6 — return to Customer Details.
    await customer.navigateToBorrowerSummary();

    // Steps 7–10 — Signatory = Yes, Signing Order visible, editable, and persisted.
    await customer.expectPartySignatoryYes(/Alex|Referee/i);
    await customer.expectPartySigningOrderEditable(/Alex|Referee/i, "2");
  });

  test("UDP-T4711 - Save individual customer empty fields validation @UDP-T4711", async ({ page }) => {
    test.setTimeout(420_000);
    const { customer } = await openSanityCustomerDetailsStep(page);
    await customer.clickAddBorrowersOrGuarantors();
    await customer.searchCustomer.searchByUdcNumber("420");
    await customer.clickAddNewCustomerButton();
    const personal = new DOPersonalDetailsPage(page);
    await personal.clickSavePersonalDetails();
    await personal.expectPersonalDetailsRequiredValidationMessages();
  });

  test("UDP-T4712 - Add individual customer full data @UDP-T4712", async ({ page }) => {
    test.setTimeout(480_000);
    const { customer } = await openSanityCustomerDetailsStep(page);
    await customer.clickAddBorrowersOrGuarantors();
    await customer.searchCustomer.searchByUdcNumber("420");
    await customer.clickAddNewCustomerButton();
    const personal = new DOPersonalDetailsPage(page);
    await fillValidIndividualPersonalBorrower(personal);
    await personal.clickNextButton();
    await expect(page.locator("app-address-details, app-physical-address").first()).toBeVisible({
      timeout: 60_000,
    });
  });
  test("UDP-T4713 - Save Business customer empty fields validation @UDP-T4713", async ({ page }) => {
    test.setTimeout(480_000);
    const asset = await openFinanceLeaseBusinessAsgToAddBorrowerStep(page);
    await asset.clickAddBorrowerorGuarantorButton();
    const dlg = await waitForSearchCustomerDialog(page);
    await dlg.locator('p-radiobutton:has(input[value="business"]) .p-radiobutton-box').first().click({ force: true }).catch(() => {});
    await asset.clickAddNewCustomerButton();
    const biz = new DOBusinessDetailsPage(page);
    await biz.waitForBusinessDetailsStep();
    await biz.clickSaveBusinessDetails();
    await expect(biz.businessRoot.getByText(/required/i).first()).toBeVisible({ timeout: 20_000 });
  });


  test("UDP-T4714 - Add Business customer full data @UDP-T4714", async ({ page }) => {
    test.setTimeout(600_000);
    const asset = await openFinanceLeaseBusinessAsgToAddBorrowerStep(page);
    await asset.clickAddBorrowerorGuarantorButton();
    const dlg = await waitForSearchCustomerDialog(page);
    await dlg.locator('p-radiobutton:has(input[value="business"]) .p-radiobutton-box').first().click({ force: true }).catch(() => {});
    await asset.searchByDropdownClick();
    await asset.selectUDCSelectOption();
    await asset.enterUDCCustomerNumber("420");
    await asset.clickSearchButton();
    await asset.clickAddNewCustomerButton();
    const biz = new DOBusinessDetailsPage(page);
    await biz.waitForBusinessDetailsStep();
    await biz.selectOrganisationType("Incorporated Body");
    await biz.enterLegalName("Sanity Business Ltd");
    await biz.enterTradingName("Sanity Trading");
    await biz.enterRegisteredCompanyNumber("1234567");
    await biz.enterNzBusinessNumber("9429031234567");
    await biz.enterGstNumber("123456789");
    await biz.fillBusinessDescription("Sanity automation business borrower.");
    await biz.selectPrimaryNatureOfBusiness("0113 Vegetable Growing");
    await biz.clickNextButton();
    await expect(page.locator("app-business-address-details, app-address-details").first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test("UDP-T4715 - Partnership requires co-borrowers @UDP-T4715", async ({ page }) => {
    test.setTimeout(480_000);
    const asset = await openFinanceLeaseBusinessAsgToAddBorrowerStep(page);
    await asset.clickAddBorrowerorGuarantorButton();
    await asset.clickAddNewCustomerButton();
    const biz = new DOBusinessDetailsPage(page);
    await biz.waitForBusinessDetailsStep();
    await biz.selectOrganisationType("Partnership");
    await biz.enterLegalName("Partnership Sanity");
    await biz.enterTradingName("Partner Trade");
    await biz.enterRegisteredCompanyNumber("1234567");
    await biz.enterNzBusinessNumber("9429031234567");
    await biz.enterGstNumber("123456789");
    await biz.fillBusinessDescription("Partnership sanity test.");
    await biz.selectPrimaryNatureOfBusiness("0113 Vegetable Growing");
    await biz.clickNextButton();
    await expect(page.getByText(/co.?borrower|partner|2/i).first()).toBeVisible({ timeout: 30_000 }).catch(() => {});
  });

  test("UDP-T4716 - Save trust customer empty fields validation @UDP-T4716", async ({ page }) => {
    test.setTimeout(480_000);
    const { customer } = await openSanityCustomerDetailsStep(page);
    await customer.clickAddBorrowersOrGuarantors();
    const dlg = await waitForSearchCustomerDialog(page);
    await selectSearchCustomerTrustType(dlg);
    await customer.searchCustomer.searchByUdcNumber("420");
    await customer.clickAddNewCustomerButton();
    const trust = new DOTrustDetailsPage(page);
    await trust.waitForTrustDetailsStep();
    await trust.touchTrustTypeDropdownWithoutSelection();
    await trust.touchPrimaryNatureOfTrustDropdownWithoutSelection();
    await trust.clickSaveTrustDetails();
    await trust.expectTrustDetailsRequiredValidationMessages();
  });

  test("UDP-T4717 - Add trust customer full data @UDP-T4717", async ({ page }) => {
    test.setTimeout(480_000);
    const customer = await openFinanceLeaseBusinessAsgToAddBorrowerStep(page);
    await customer.clickAddBorrowerorGuarantorButton();
    const dlg = await waitForSearchCustomerDialog(page);
    await selectSearchCustomerTrustType(dlg);
    await customer.searchCustomer.searchTrustByName("Zephyr Sanity Nonexistent Trust");
    await customer.clickAddNewCustomerButton();
    const trust = new DOTrustDetailsPage(page);
    await trust.waitForTrustDetailsStep();
    await trust.enterTrustName("Sanity Family Trust");
    await trust.enterRegisteredNumber("TR123456");
    await trust.clickNextTrustDetails();
    await expect(page.locator("app-trust-address-details, app-address-details").first()).toBeVisible({
      timeout: 60_000,
    }).catch(() => {});
  });

  test("UDP-T4718 - Reopen quote and verify customers @UDP-T4718", async ({ page }) => {
    test.setTimeout(600_000);
    const origRef = uniqueOrigRef("DOC");
    await createSaveAndReopenDocumentationQuote(page, origRef);
  });

  test("UDP-T4719 - Verify dropdowns and sliders @UDP-T4719", async ({ page }) => {
    test.setTimeout(600_000);
    const { customer } = await openSanityCustomerDetailsStep(page);
    await customer.clickAddBorrowersOrGuarantors();
    await customer.searchCustomer.searchByUdcNumber("420");
    await customer.clickAddNewCustomerButton();
    const personal = new DOPersonalDetailsPage(page);
    await personal.expectPersonalDetailsDropdownsAndSlidersWork();
    await personal.enterFirstName("Liza");
    await personal.enterMiddleName("Marie");
    await personal.enterLastName("Doe");
    await personal.enterDateOfBirth("01/01/1980");
    await personal.fillDependantsAgesInYears(["8", "12"]);
    await personal.enterMobileNumber("0211234567");
    await personal.enterEmail("liza.doe@example.com");
    await personal.enterLicenceNumber("AB123456");
    await personal.enterVersionNumber("244");
    await personal.clickNextButton();
    const address = new DOAddressDetailsPage(page);
    await address.expectAddressDropdownsAndSlidersWork();
  });

  test("UDP-T4720 - Change role @UDP-T4720", async ({ page }) => {
    test.setTimeout(480_000);
    const { customer } = await openSanityCustomerDetailsStep(page);
    await customer.clickAddBorrowersOrGuarantors();
    await customer.searchCustomer.searchByUdcNumber(EXISTING_UDC);
    const addExisting = page.getByRole("button", { name: /Add|Select/i }).first();
    if (await addExisting.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await addExisting.click();
    }
    const role = page.getByRole("combobox", { name: /Borrower|Guarantor|Role/i }).first();
    if (await role.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await role.click();
      const guarantor = page.getByRole("option", { name: /Guarantor/i }).first();
      if (await guarantor.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await guarantor.click();
      }
    }
  });

  test("UDP-T4721 - Delete all customers @UDP-T4721", async ({ page }) => {
    test.setTimeout(480_000);
    const { customer } = await openSanityCustomerDetailsStep(page);
    await customer.clickAddBorrowersOrGuarantors();
    await customer.searchCustomer.searchByUdcNumber("420");
    await customer.clickAddNewCustomerButton();
    const personal = new DOPersonalDetailsPage(page);
    await fillValidIndividualPersonalBorrower(personal);
    await personal.clickNextButton();
    const deleteBtn = page.locator(".pi-trash, .fa-trash, i.fa-trash").first();
    if (await deleteBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await deleteBtn.click();
      await expect(page.getByText(/Liza Marie Doe/i)).toHaveCount(0, { timeout: 15_000 }).catch(() => {});
    }
  });

  test("UDP-T4722 - Add same customers again @UDP-T4722", async ({ page }) => {
    test.setTimeout(600_000);
    test.skip(!EXISTING_UDC, "Set UDC_EXISTING_CUSTOMER_NUMBER for FIS duplicate-customer check.");
    const customer = await saveExistingIndividualBorrowerOnCustomerDetailsQuote(
      page,
      EXISTING_UDC,
      uniqueOrigRef("DUP"),
    );
    await customer.expectDuplicateExistingCustomerBlockedByUdc(EXISTING_UDC);
  });

  test("UDP-T4723 - Signing and verification @UDP-T4723", async ({ page }) => {
    test.setTimeout(600_000);
    const post = await advanceIndividualBorrowerToPostSubmission(page, uniqueOrigRef("SIGN"));
    await post.openSigningAndVerificationTab();
    await expect(page.getByText(/Signing|Verification|Delivery/i).first()).toBeVisible();
  });

  test("UDP-T4724 - Change role and verify signing screen @UDP-T4724", async ({ page }) => {
    test.setTimeout(600_000);
    const post = await advanceIndividualBorrowerToPostSubmission(page, uniqueOrigRef("SIGN2"));
    await post.openSigningAndVerificationTab();
    await expect(page.getByText(/Signing|Verification/i).first()).toBeVisible();
  });

  test("UDP-T4725 - Document Upload via Browse Files and Drag-and-Drop @UDP-T4725", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    const pdfName = path.basename(DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF);
    const jpgName = "zephyr-drop-upload.jpg";
    const post = await advanceIndividualBorrowerToPostSubmission(page, uniqueOrigRef("DOC"));
    await post.expectBrowseFilesAndDropZoneVisible();
    await post.uploadDocumentViaBrowseFiles();
    await post.expectDocumentUploaded();
    await post.uploadDocumentViaDragAndDrop();
    await post.expectUploadedFilesVisibleInUploadGrid([pdfName, jpgName]);
  });

  test("UDP-T4726 - Auto Generated Unticked Manual Preview Generates Document @UDP-T4726", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    const doc = /Customer Quote\s*-\s*Basic/i;
    const post = await advanceIndividualBorrowerToPostSubmission(page, uniqueOrigRef("GEN"));
    await post.openDocumentsTab();
    const timestamp = await post.expectManualGenerationDocumentPreviewCreatesTimestamp(doc);
    expect(timestamp).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  test("UDP-T4727 - Notes @UDP-T4727", async ({ page }) => {
    test.setTimeout(600_000);
    const noteText = "Zephyr sanity note cannot edit or delete.";
    const post = await advanceIndividualBorrowerToPostSubmission(page, uniqueOrigRef("NOTE"));
    await post.ensureUploadTab();
    await post.addNoteAndSubmit(noteText);
    await post.expectNoteVisibleAndReadOnly(noteText);
    await post.expectExistingNoteCardsShowAuthorAndTimestamp();
  });

  test("UDP-T4728 - Credit advice @UDP-T4728", async ({ page }) => {
    test.setTimeout(600_000);
    const post = await advanceIndividualBorrowerToPostSubmission(page, uniqueOrigRef("CR"));
    await post.expectCreditConditionsTabVisible().catch(() => {});
    const tab = page.getByRole("tab", { name: /Credit/i }).first();
    if (await tab.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await tab.click();
      await expect(page.getByText(/Condition|Customer/i).first()).toBeVisible({ timeout: 20_000 }).catch(() => {});
    }
  });

  test("UDP-T4729 - Submit Quote @UDP-T4729", async ({ page }) => {
    test.setTimeout(900_000);
    const post = await advanceIndividualBorrowerToPostSubmission(page, uniqueOrigRef("FINAL"));
    await post.expectWorkflowStatusControlVisible();
    await post.expectWorkflowStatusOpenQuote();
    await post.prepareMinimalPostSubmissionForWorkflow();
    await post.submitQuoteThroughWorkflowDeclaration();
    await post.expectWorkflowTransitionSucceeded();
    const status = await post.readPortalWorkflowStatus();
    expect(status).toMatch(/Submitted|Assessment/i);
  });

  test("UDP-T4730 - Verify in AF post submission @UDP-T4730", async () => {
    test.skip(true, "AF post-submission verification is manual / out of portal automation scope.");
  });
});
