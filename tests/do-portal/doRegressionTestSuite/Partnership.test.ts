/**
 * DO Portal — Partnership regression (UDP-T4456–UDP-T4484).
 * Scenario source: Partnership.xlsx (Zephyr / Regression Automation / Partnership).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAddressDetailsPage,
  DOAssetDetailsPage,
  DOBusinessDetailsPage,
  DOCustomerDetailsPage,
  DOCustomerQuotePostSubmitPage,
  DODashboardPage,
  DOFinancialPositionPage,
  DOReferenceDetailsPage,
  DOTrustDetailsPage,
} from "../../../pages";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import {
  addBusinessCoBorrowerFromPostSubmit,
  addIndividualCoBorrowerFromPostSubmit,
  addPartnershipBorrowerOverExistingIndividual,
  addTrustCoBorrowerFromPostSubmit,
  addPartnershipOrgTypeBusinessCoBorrowerFromPostSubmit,
  advanceFlIndividualBorrowerToPostSubmission,
  advanceFlIncorporatedBusinessBorrowerToPostSubmission,
  advanceFlTrustBorrowerToPostSubmission,
  advancePartnershipBorrowerToPostSubmission,
  attemptAddSecondCustomerAsBorrower,
  clickEditPartyFromPartiesList,
  clickPostSubmissionNextExpectPartnershipOrgTypeGuard,
  expectApplyIdOnlyOnIndividualParties,
  expectCopyPrimaryBorrowerSliderVisible,
  expectCustomerRoleDropdownShowsRoles,
  expectPartyRedRoleChangeIcon,
  expectPartyRowShowsRole,
  EXISTING_UDC_BUSINESS,
  EXISTING_UDC_INDIVIDUAL,
  EXISTING_UDC_SECOND_INDIVIDUAL,
  fillPartnershipBusinessMandatoryDetails,
  openAddNewBusinessFromPostSubmit,
  openAddNewPartnershipBorrower,
  openAddNewTrustFromPostSubmit,
  openExistingPartnershipOnAddressDetailsStep,
  PARTNERSHIP_LEGAL_NAME,
  resolvePartyRowByName,
  returnToBorrowerSummaryForPartyObserve,
  submitBorrowersSummaryExpectBldPartnershipToast,
} from "./partnership.helpers";
import {
  AFV_SQ_VEHICLE,
  afvAssetIdentitiesMatch,
  closePhysicalSearchAssetDialog,
  ensureAfVQuoteReadyForMotochekSearch,
  enterNumberInput,
  expectMotochekAfVProgramVehicleMismatch,
  MOTOCHEK_AFV_MISMATCH_REGO,
  MOTOCHEK_AFV_MISMATCH_VIN,
  MOTOCHEK_SANITY_REGO,
  motochekResetButton,
  openAfVPhysicalSearchAssetDialog,
  readAfVAssetIdentity,
  runMotochekSearch,
} from "./afvMotochek.helpers";

const AFV_SQ_PRODUCT = "AFV-B-Assigned";
const AFV_SQ_PROGRAM = "AFV - B-Distributor";
const AFV_SQ_DEALER =
  process.env.AFV_SQ_DEALER ?? process.env.AFV_QQ_DEALER ?? "Armstrong Prestige - Audi";
function standardQuoteRoot(page: Page) {
  return page.locator("app-quote-details, app-standard-quote").filter({ visible: true }).first();
}

async function openAfVAssetDetailsStep(page: Page): Promise<DOAssetDetailsPage> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(AFV_SQ_DEALER);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectAssuredFutureValueProduct();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.waitForAssetDetailsStepReady();
  await assetDetailsPage.chooseProduct(AFV_SQ_PRODUCT);
  await assetDetailsPage.selectVehicleFromAssetTypeModal(AFV_SQ_VEHICLE);
  await assetDetailsPage.waitForAfVAssetTypeSelectedOnStandardQuote(AFV_SQ_VEHICLE.variant);
  await assetDetailsPage.ensureAfVProgramForStandardQuote(AFV_SQ_PROGRAM);
  await assetDetailsPage.enterOriginationReference(`SQ-AFV-PART-${Date.now()}`);
  return assetDetailsPage;
}

test.describe("DO Portal — Partnership (Zephyr UDP-T4456–UDP-T4484)", () => {
  test(
    "UDP-T4456 - Add Partnership as Borrower - Loan Purpose Business - Individual Search",
    { tag: ["@do", "@regression", "@UDP-T4456"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      await expectPartyRowShowsRole(page, /Partnership Regression/i, /^Borrower$/i);
      const row = await resolvePartyRowByName(page, /Partnership Regression/i);
      await expect(row.getByText(/Apply\s*ID/i)).toHaveCount(0, { timeout: 10_000 });
    },
  );

  test(
    "UDP-T4457 - Add 1st Individual Co-Borrower After Partnership Borrower",
    { tag: ["@do", "@regression", "@UDP-T4457"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      const coBorrower = await addIndividualCoBorrowerFromPostSubmit(page, EXISTING_UDC_INDIVIDUAL);
      await expectPartyRowShowsRole(page, /Partnership Regression/i, /^Borrower$/i);
      await expectPartyRowShowsRole(page, coBorrower, /Co[\s-]*Borrower/i);
    },
  );

  test(
    "UDP-T4458 - Add 2nd Individual Co-Borrower After Partnership Borrower",
    { tag: ["@do", "@regression", "@UDP-T4458"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      await addIndividualCoBorrowerFromPostSubmit(page, EXISTING_UDC_INDIVIDUAL);
      await addIndividualCoBorrowerFromPostSubmit(page, EXISTING_UDC_SECOND_INDIVIDUAL);
      await expectPartyRowShowsRole(page, /Partnership Regression/i, /^Borrower$/i);

      const secondBiz = await openAddNewBusinessFromPostSubmit(page);
      await expectCustomerRoleDropdownShowsRoles(
        page,
        secondBiz.businessRoot,
        [/^Co[\s-]*Borrower$/i, /^Guarantor$/i],
        { absentRolePatterns: [/^Borrower$/i] },
      );
    },
  );

  test(
    "UDP-T4459 - Individual Added as Borrower First - BLD Detects No Partnership - Role Change",
    { tag: ["@do", "@regression", "@UDP-T4459"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advanceFlIndividualBorrowerToPostSubmission(page, EXISTING_UDC_INDIVIDUAL);
      await addIndividualCoBorrowerFromPostSubmit(page, EXISTING_UDC_SECOND_INDIVIDUAL);
      await submitBorrowersSummaryExpectBldPartnershipToast(page);
    },
  );

  test(
    "UDP-T4460 - Organisation Type = Partnership Only Allowed for Borrower Role",
    { tag: ["@do", "@regression", "@UDP-T4460"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      await expectPartyRowShowsRole(page, /Partnership Regression/i, /^Borrower$/i);
      await addPartnershipOrgTypeBusinessCoBorrowerFromPostSubmit(page, {
        legalName: "Invalid Partnership Co",
      });
      await clickPostSubmissionNextExpectPartnershipOrgTypeGuard(page);
    },
  );

  test(
    "UDP-T4461 - Partnership Selected as Borrower - Customer Role Dropdown Restricted",
    { tag: ["@do", "@regression", "@UDP-T4461"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      const secondBiz = await openAddNewBusinessFromPostSubmit(page);
      await expectCustomerRoleDropdownShowsRoles(
        page,
        secondBiz.businessRoot,
        [/^Co[\s-]*Borrower$/i, /^Guarantor$/i],
        { absentRolePatterns: [/^Borrower$/i] },
      );
    },
  );

  test(
    "UDP-T4462 - Role Change - Existing Borrower Becomes Co-Borrower on Partnership Addition",
    { tag: ["@do", "@regression", "@UDP-T4462"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advanceFlIndividualBorrowerToPostSubmission(page, EXISTING_UDC_INDIVIDUAL);
      await addPartnershipBorrowerOverExistingIndividual(page);
      await returnToBorrowerSummaryForPartyObserve(page);
      await expectPartyRowShowsRole(page, /Partnership Regression/i, /^Borrower$/i);
      await expectPartyRowShowsRole(page, new RegExp(EXISTING_UDC_INDIVIDUAL, "i"), /Co[\s-]*Borrower/i);
      await expectPartyRedRoleChangeIcon(page, new RegExp(EXISTING_UDC_INDIVIDUAL, "i"));
    },
  );

  test(
    "UDP-T4463 - Partnership Business - Add Partnership Borrower then Business Co-Borrower",
    { tag: ["@do", "@regression", "@UDP-T4463"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      const coBiz = await addBusinessCoBorrowerFromPostSubmit(page, { legalName: "Biz CoBorrower One" });
      await expectPartyRowShowsRole(page, /Partnership Regression/i, /^Borrower$/i);
      await expectPartyRowShowsRole(page, coBiz, /Co[\s-]*Borrower/i);
    },
  );

  test(
    "UDP-T4464 - Partnership Business - Add 2nd Business Co-Borrower",
    { tag: ["@do", "@regression", "@UDP-T4464"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      await addBusinessCoBorrowerFromPostSubmit(page, { legalName: "Biz CoBorrower One" });
      await addBusinessCoBorrowerFromPostSubmit(page, { legalName: "Biz CoBorrower Two" });
      await expectPartyRowShowsRole(page, /Partnership Regression/i, /^Borrower$/i);
      await expectPartyRowShowsRole(page, /Biz CoBorrower/i, /Co[\s-]*Borrower/i);
    },
  );

  test(
    "UDP-T4465 - Business Borrower Added First - BLD Checks for Partnership - Role Change",
    { tag: ["@do", "@regression", "@UDP-T4465"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advanceFlIncorporatedBusinessBorrowerToPostSubmission(page);
      await addBusinessCoBorrowerFromPostSubmit(page, { legalName: "Second Incorp Biz" });
      await submitBorrowersSummaryExpectBldPartnershipToast(page);
    },
  );

  test(
    "UDP-T4466 - Existing Business Borrower - Change Organisation Type to Partnership",
    { tag: ["@do", "@regression", "@UDP-T4466"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advanceFlIncorporatedBusinessBorrowerToPostSubmission(page);
      await addBusinessCoBorrowerFromPostSubmit(page, { legalName: "Second Incorp Biz" });
      await submitBorrowersSummaryExpectBldPartnershipToast(page).catch(() => {});

      await clickEditPartyFromPartiesList(page, /Incorp Business/i);
      const biz = new DOBusinessDetailsPage(page);
      await biz.waitForBusinessDetailsStep();
      await biz.selectOrganisationType("Partnership");
      await biz.clickSaveBusinessDetails();
      await returnToBorrowerSummaryForPartyObserve(page);
      await expectPartyRowShowsRole(page, /Incorp Business/i, /^Borrower$/i);
    },
  );

  test(
    "UDP-T4467 - Partnership Trust - Add Partnership Borrower then Trust Co-Borrower",
    { tag: ["@do", "@regression", "@UDP-T4467"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      const trustParty = await addTrustCoBorrowerFromPostSubmit(page);
      await expectPartyRowShowsRole(page, /Partnership Regression/i, /^Borrower$/i);
      await expectPartyRowShowsRole(page, trustParty, /Co[\s-]*Borrower/i);
    },
  );

  test(
    "UDP-T4468 - Partnership Trust - Add 2nd Trust Co-Borrower",
    { tag: ["@do", "@regression", "@UDP-T4468"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      await addTrustCoBorrowerFromPostSubmit(page);
      await addTrustCoBorrowerFromPostSubmit(page);
      await expectPartyRowShowsRole(page, /Partnership Regression/i, /^Borrower$/i);
      await expect(await resolvePartyRowByName(page, /Trust CoBorrower/i)).toBeVisible({ timeout: 60_000 });
    },
  );

  test(
    "UDP-T4469 - Trust Borrower Added First - BLD Checks for Partnership - Role Change",
    { tag: ["@do", "@regression", "@UDP-T4469"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advanceFlTrustBorrowerToPostSubmission(page);
      await addIndividualCoBorrowerFromPostSubmit(page, EXISTING_UDC_INDIVIDUAL);
      await submitBorrowersSummaryExpectBldPartnershipToast(page);
    },
  );

  test(
    "UDP-T4470 - Trust Type Dropdown - Valid Values",
    { tag: ["@do", "@regression", "@UDP-T4470"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      const trust = await openAddNewTrustFromPostSubmit(page);
      await trust.expectTrustTypeDropdownOptions([
        /Trust\s*[–-]\s*Charitable/i,
        /Trust\s*[–-]\s*Discretionary/i,
        /Trust\s*[–-]\s*Domestic/i,
      ]);
    },
  );

  test(
    "UDP-T4471 - Submit Validation - Only One Borrower Allowed",
    { tag: ["@do", "@regression", "@UDP-T4471"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      const secondBorrowerAdded = await attemptAddSecondCustomerAsBorrower(page);
      expect(
        secondBorrowerAdded,
        "Only one Borrower is permitted per quote — second Borrower must be blocked.",
      ).toBe(false);
    },
  );

  test(
    "UDP-T4472 - Submit Validation - Partnership Must Be Borrower (Not Co-Borrower/Guarantor)",
    { tag: ["@do", "@regression", "@UDP-T4472"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      await addPartnershipOrgTypeBusinessCoBorrowerFromPostSubmit(page, {
        legalName: "Invalid Partnership Co",
      });
      await clickPostSubmissionNextExpectPartnershipOrgTypeGuard(page);
    },
  );

  test(
    "UDP-T4473 - BLD Toast Message - Partnership Must Be Added as Borrower",
    { tag: ["@do", "@regression", "@UDP-T4473"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advanceFlIncorporatedBusinessBorrowerToPostSubmission(page);
      await addBusinessCoBorrowerFromPostSubmit(page, { legalName: "Second Incorp Biz" });
      await submitBorrowersSummaryExpectBldPartnershipToast(page);
    },
  );

  test(
    "UDP-T4474 - Red Icon - Manual Role Change on Borrower & Guarantor Summary Page",
    { tag: ["@do", "@regression", "@UDP-T4474"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      const coBorrower = await addIndividualCoBorrowerFromPostSubmit(page, EXISTING_UDC_INDIVIDUAL);
      await clickEditPartyFromPartiesList(page, coBorrower);
      const personal = new DOPersonalDetailsPage(page);
      await expect(personal.personalDetailsRoot).toBeVisible({ timeout: 30_000 });
      await personal.chooseCustomerRole(/^Guarantor$/i);
      await personal.clickSavePersonalDetails();
      await returnToBorrowerSummaryForPartyObserve(page);
      await expectPartyRedRoleChangeIcon(page, coBorrower);
      const ref = new DOReferenceDetailsPage(page);
      await clickEditPartyFromPartiesList(page, coBorrower);
      await ref.waitForReferenceDetailsStep();
      const host = page.locator("p-checkbox").filter({ hasText: /I confirm that all customer details are correct/i }).first();
      const input = host.locator('input[type="checkbox"]').first();
      await expect(input).not.toBeChecked({ timeout: 15_000 });
    },
  );

  test(
    "UDP-T4475 - Red Icon - Automatic Role Change on Business/Trust Details Screen",
    { tag: ["@do", "@regression", "@UDP-T4475"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advanceFlIndividualBorrowerToPostSubmission(page, EXISTING_UDC_INDIVIDUAL);
      await addPartnershipBorrowerOverExistingIndividual(page);
      await returnToBorrowerSummaryForPartyObserve(page);
      await expectPartyRedRoleChangeIcon(page, new RegExp(EXISTING_UDC_INDIVIDUAL, "i"));
    },
  );

  test(
    "UDP-T4476 - Financial Position - Business Loan - Income/Expenses Shared Slider Not Applicable",
    { tag: ["@do", "@regression", "@UDP-T4476"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      await addIndividualCoBorrowerFromPostSubmit(page, EXISTING_UDC_INDIVIDUAL);
      const post = new DOCustomerQuotePostSubmitPage(page);
      await post.clickAddBorrowersOrGuarantorsButton();
      const customer = new DOCustomerDetailsPage(page);
      await customer.searchCustomer.searchByUdcNumber(EXISTING_UDC_SECOND_INDIVIDUAL);
      await customer.searchCustomer.clickAddFromBorrowerSearchResult(EXISTING_UDC_SECOND_INDIVIDUAL);
      const personal = new DOPersonalDetailsPage(page);
      await personal.chooseCustomerRole(/^Co[\s-]*Borrower$/i);
      await personal.clickSavePersonalDetails();
      await personal.clickNextButton();
      const address = new DOAddressDetailsPage(page);
      await address.waitForPhysicalAddressStep();
      await address.clickNextButton().catch(() => {});
      const fin = new DOFinancialPositionPage(page);
      await fin.waitForFinancialPositionStep();
      await expect(
        page.getByText(/Is Income\s*&\s*Expenses Shared between Borrower and Co[\s-]*Borrower/i),
      ).toHaveCount(0, { timeout: 10_000 });
    },
  );

  test(
    "UDP-T4477 - Address Details - Copy Primary Borrower Address Slider for Co-Borrower/Guarantor",
    { tag: ["@do", "@regression", "@UDP-T4477"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      const post = new DOCustomerQuotePostSubmitPage(page);
      await post.clickAddBorrowersOrGuarantorsButton();
      const customer = new DOCustomerDetailsPage(page);
      await customer.searchCustomer.searchByUdcNumber(EXISTING_UDC_INDIVIDUAL);
      await customer.searchCustomer.clickAddFromBorrowerSearchResult(EXISTING_UDC_INDIVIDUAL);
      const personal = new DOPersonalDetailsPage(page);
      await personal.chooseCustomerRole(/^Co[\s-]*Borrower$/i);
      await personal.clickSavePersonalDetails();
      await personal.clickNextButton();
      await expectCopyPrimaryBorrowerSliderVisible(page);
    },
  );

  test(
    "UDP-T4478 - Address Details - Create New and Copy to Previous Address for Existing Partnership",
    { tag: ["@do", "@regression", "@UDP-T4478"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const address = await openExistingPartnershipOnAddressDetailsStep(page);
      await address.expectCreateNewAndCopyToPreviousAddressVisible();
    },
  );

  test(
    "UDP-T4479 - Cancel on Business Details Screen - Unsaved Data Confirmation",
    { tag: ["@do", "@regression", "@UDP-T4479"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const biz = await openAddNewPartnershipBorrower(page);
      await biz.enterLegalName(PARTNERSHIP_LEGAL_NAME);
      await biz.clickCancelBusinessDetails();
      await biz.expectUnsavedChangesCancelConfirmation();
      await biz.confirmCancelDiscardUnsavedChanges();
      const customer = new DOCustomerDetailsPage(page);
      await customer.waitForAddBorrowerButton();
    },
  );

  test(
    "UDP-T4480 - Save on Business Details Screen - No Mandatory Field Validation",
    { tag: ["@do", "@regression", "@UDP-T4480"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const biz = await openAddNewPartnershipBorrower(page);
      await biz.selectOrganisationType("Partnership");
      await biz.enterLegalName(PARTNERSHIP_LEGAL_NAME);
      await biz.clickSaveBusinessDetails();
      await biz.expectNoMandatoryValidationOnBusinessDetails();
      await expect(biz.businessRoot).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    "UDP-T4481 - Next on Business Details - Navigates Without Mandatory Validation",
    { tag: ["@do", "@regression", "@UDP-T4481"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const biz = await openAddNewPartnershipBorrower(page);
      await biz.selectOrganisationType("Partnership");
      await biz.enterLegalName(PARTNERSHIP_LEGAL_NAME);
      await biz.clickNextButton();
      const address = new DOAddressDetailsPage(page);
      await address.waitForPhysicalAddressStep();
      await expect(address.physicalSearchInput).toBeVisible({ timeout: 60_000 });
    },
  );

  test(
    "UDP-T4482 - Next on Contact Reference Screen - All Mandatory Validations Fire",
    { tag: ["@do", "@regression", "@UDP-T4482"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const biz = await openAddNewPartnershipBorrower(page);
      await fillPartnershipBusinessMandatoryDetails(biz);
      await biz.clickNextButton();
      const address = new DOAddressDetailsPage(page);
      await address.waitForPhysicalAddressStep();
      await address.clickNextButton().catch(() => {});
      const fin = new DOFinancialPositionPage(page);
      await fin.waitForFinancialPositionStep();
      await fin.clickNextButton().catch(() => {});
      const ref = new DOReferenceDetailsPage(page);
      await ref.waitForReferenceDetailsStep();
      await ref.clickSubmitButton();
      await ref.expectConfirmCustomerDetailsCheckboxRequiredValidation();
    },
  );

  test(
    "UDP-T4483 - ApplyID - Only Applicable for Individual Customer Type",
    { tag: ["@do", "@regression", "@UDP-T4483"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await advancePartnershipBorrowerToPostSubmission(page);
      const individual = await addIndividualCoBorrowerFromPostSubmit(page, EXISTING_UDC_INDIVIDUAL);
      await expectApplyIdOnlyOnIndividualParties(page, individual, /Partnership Regression/i);
    },
  );

  test(
    "UDP-T4484 - BLD AFV Asset Override Role - Reset Does Not Update Asset Details",
    { tag: ["@do", "@regression", "@UDP-T4484"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openAfVAssetDetailsStep(page);
      await ensureAfVQuoteReadyForMotochekSearch(page, assetDetailsPage);

      const assetIdentityBefore = await readAfVAssetIdentity(page);
      expect(assetIdentityBefore.variant.length).toBeGreaterThan(2);
      expect.soft(assetIdentityBefore.variant).toMatch(
        new RegExp(`${AFV_SQ_VEHICLE.variant}|${AFV_SQ_VEHICLE.model}|${AFV_SQ_VEHICLE.make}`, "i"),
      );

      const mismatchTerm = MOTOCHEK_AFV_MISMATCH_REGO || MOTOCHEK_AFV_MISMATCH_VIN;
      const searchBy = MOTOCHEK_AFV_MISMATCH_REGO ? /Rego Number/i : /VIN Number|^VIN$/i;

      const dlg = await openAfVPhysicalSearchAssetDialog(page, assetDetailsPage);
      await runMotochekSearch(page, dlg, searchBy, mismatchTerm);
      await expectMotochekAfVProgramVehicleMismatch(page, dlg);

      const enterNumber = enterNumberInput(dlg);
      await expect(motochekResetButton(dlg)).toBeVisible({ timeout: 15_000 });
      await motochekResetButton(dlg).click({ timeout: 15_000 });
      await expect(enterNumber).toHaveValue("", { timeout: 10_000 });

      const assetIdentityAfterReset = await readAfVAssetIdentity(page);
      expect(afvAssetIdentitiesMatch(assetIdentityBefore, assetIdentityAfterReset)).toBe(true);
      expect.soft(assetIdentityAfterReset.make).toMatch(new RegExp(AFV_SQ_VEHICLE.make, "i"));
      expect.soft(assetIdentityAfterReset.model).toMatch(new RegExp(AFV_SQ_VEHICLE.model, "i"));

      const secondSearchBy = MOTOCHEK_AFV_MISMATCH_REGO ? /VIN Number|^VIN$/i : /Rego Number/i;
      const secondTerm = MOTOCHEK_AFV_MISMATCH_REGO ? MOTOCHEK_AFV_MISMATCH_VIN : MOTOCHEK_SANITY_REGO;
      await runMotochekSearch(page, dlg, secondSearchBy, secondTerm);

      const assetIdentityAfterSecondSearch = await readAfVAssetIdentity(page);
      expect(afvAssetIdentitiesMatch(assetIdentityBefore, assetIdentityAfterSecondSearch)).toBe(true);

      await closePhysicalSearchAssetDialog(page);
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );
});