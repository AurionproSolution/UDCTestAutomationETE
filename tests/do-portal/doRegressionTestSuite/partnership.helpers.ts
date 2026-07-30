/**
 * Partnership regression helpers (UDP-T4456–UDP-T4484).
 * Entry: Finance Lease Business Asg → Customer Details (Loan Purpose = Business).
 */

import { expect, type Locator, type Page } from "@playwright/test";
import { openFinanceLeaseBusinessAsgToAddBorrowerStep } from "../../../pages/do-portal/StandardQuote/CustomerDetails/customerDetailsFLBusiness.helpers.test";
import {
  DOAddressDetailsPage,
  DOAssetDetailsPage,
  DOBusinessDetailsPage,
  DOCustomerDetailsPage,
  DOCustomerQuotePostSubmitPage,
  DOEmploymentDetailsPage,
  DOFinancialPositionPage,
  DOReferenceDetailsPage,
  DOTrustDetailsPage,
  DOSoleTraderDetailsPage,
} from "../../../pages";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import {
  addSecondIndividualCoBorrowerFromPostSubmit,
  addSignatoryContactToReference,
  clickEditPartyFromPartiesList,
  expectPartyRowShowsRole,
  fillValidSecondIndividualPersonalBorrower,
  partyRowByName,
  resolvePartyRowByName,
  returnToBorrowerSummaryForPartyObserve,
  SANITY_NO_MATCH_UDC,
  SANITY_SECOND_PARTY_FIRST_NAME,
  SANITY_SECOND_PARTY_LAST_NAME,
  SANITY_TRUST_NAME,
  selectBusinessTypeSearchNoMatchUdcAndAddNewCustomer,
  selectTrustTypeSearchNoMatchUdcAndAddNewCustomer,
  waitForSearchCustomerDialog,
} from "../doSanityTest/zephyr_sanitytest/sanity.helpers";
import {
  EXISTING_UDC_BUSINESS,
  EXISTING_UDC_INDIVIDUAL,
  EXISTING_UDC_PARTNERSHIP,
  EXISTING_UDC_SECOND_INDIVIDUAL,
} from "../../../testData/do-portal/doExistingCustomerData";

export const PARTNERSHIP_LEGAL_NAME = "Partnership Regression Ltd";
export const PARTNERSHIP_TRADING_NAME = "Partner Trade Co";
export const INCORPORATED_LEGAL_NAME = "Incorp Business Regression Ltd";

export {
  EXISTING_UDC_BUSINESS,
  EXISTING_UDC_INDIVIDUAL,
  EXISTING_UDC_PARTNERSHIP,
  EXISTING_UDC_SECOND_INDIVIDUAL,
};

function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

function customerSearchDialog(page: Page): Locator {
  return page
    .locator('[role="dialog"]')
    .filter({ has: page.locator("app-search-customer") })
    .last();
}

function searchCustomerRoot(dlg: Locator): Locator {
  return dlg.locator("app-search-customer").first();
}

function searchTypeRadioInput(
  dlg: Locator,
  value: "individual" | "business" | "trust",
): Locator {
  return searchCustomerRoot(dlg).locator(
    `input[type="radio"][name="searchCustomer"][value="${value}"]`,
  );
}

function searchTypeRadioHost(dlg: Locator, label: RegExp): Locator {
  return searchCustomerRoot(dlg).locator("p-radiobutton").filter({ hasText: label }).first();
}

function customerRoleDropdownTrigger(page: Page): Locator {
  return page
    .locator("label")
    .filter({ hasText: /Customer Role/i })
    .first()
    .locator(
      "xpath=following::*[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
    );
}

function customerRoleDropdownTriggerInRoot(root: Locator): Locator {
  return root
    .locator("label")
    .filter({ hasText: /Customer Role/i })
    .first()
    .locator(
      "xpath=following::*[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
    );
}

async function resolveCustomerRoleDropdownTrigger(page: Page, scope: Locator): Promise<Locator> {
  const scoped = customerRoleDropdownTriggerInRoot(scope);
  if (await scoped.isVisible({ timeout: 5_000 }).catch(() => false)) {
    return scoped;
  }
  return customerRoleDropdownTrigger(page);
}

export async function expectCustomerRoleDropdownShowsRoles(
  page: Page,
  scope: Locator,
  expectedRolePatterns: RegExp[],
  opts?: { absentRolePatterns?: RegExp[] },
): Promise<void> {
  const roleTrig = await resolveCustomerRoleDropdownTrigger(page, scope);
  await expect(roleTrig).toBeVisible({ timeout: 15_000 });
  await roleTrig.click();

  const listbox = page.getByRole("listbox").filter({ visible: true }).last();
  const panel = page.locator(".p-dropdown-panel").filter({ visible: true }).last();
  const optionsRoot = (await listbox.isVisible({ timeout: 2_000 }).catch(() => false))
    ? listbox
    : panel;
  await expect(optionsRoot).toBeVisible({ timeout: 10_000 });

  for (const rolePattern of expectedRolePatterns) {
    await expect(optionsRoot.getByRole("option", { name: rolePattern }).first()).toBeVisible({
      timeout: 10_000,
    });
  }
  if (opts?.absentRolePatterns) {
    for (const rolePattern of opts.absentRolePatterns) {
      await expect(optionsRoot.getByRole("option", { name: rolePattern })).toHaveCount(0);
    }
  }

  await page.keyboard.press("Escape");
}

async function expectSearchTypeRadioChecked(
  dlg: Locator,
  value: "individual" | "business" | "trust",
): Promise<void> {
  const input = searchTypeRadioInput(dlg, value);
  await expect(input).toBeChecked({ timeout: 20_000 });
  const host = searchCustomerRoot(dlg).locator(`p-radiobutton:has(input[value="${value}"])`).first();
  await expect(
    host
      .locator('[data-pc-section="root"].p-radiobutton-checked, .p-radiobutton-box.p-highlight')
      .first(),
  ).toBeVisible({ timeout: 10_000 });
}

async function selectSearchCustomerIndividualType(dlg: Locator): Promise<void> {
  const individualBox = searchTypeRadioHost(dlg, /Individual/i).locator(".p-radiobutton-box").first();
  if (await individualBox.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await individualBox.click({ force: true });
  } else {
    await searchTypeRadioInput(dlg, "individual").check({ force: true });
  }
  await expectSearchTypeRadioChecked(dlg, "individual");
}

/** Post Submission **Add Borrowers / Guarantors** → Individual → no-match search → **Add New Customer**. */
async function openAddNewIndividualFromPostSubmit(page: Page): Promise<{
  personal: DOPersonalDetailsPage;
  sole: DOSoleTraderDetailsPage;
  isSoleTrader: boolean;
}> {
  const post = new DOCustomerQuotePostSubmitPage(page);
  const customer = new DOCustomerDetailsPage(page);
  await post.clickAddBorrowersOrGuarantorsButton();
  const dlg = await waitForSearchCustomerDialog(page);
  await selectSearchCustomerIndividualType(dlg);
  await customer.searchCustomer.searchByUdcNumber(SANITY_NO_MATCH_UDC);
  await customer.clickAddNewCustomerButton();

  const personal = new DOPersonalDetailsPage(page);
  const sole = new DOSoleTraderDetailsPage(page);
  const soleRoot = page.locator("app-sole-trade").filter({ visible: true }).first();
  await expect(personal.personalDetailsRoot.or(soleRoot)).toBeVisible({ timeout: 120_000 });

  const isSoleTrader = await soleRoot.isVisible({ timeout: 3_000 }).catch(() => false);
  if (isSoleTrader) {
    await sole.waitForSoleTraderBusinessDetailsStep();
  }
  return { personal, sole, isSoleTrader };
}

async function fillMinimalSoleTraderSecondParty(
  sole: DOSoleTraderDetailsPage,
  personal: DOPersonalDetailsPage,
): Promise<void> {
  await sole.enterTradingName("Second Sole Trader");
  await sole.enterGstNumber("12345678");
  await sole.fillBusinessDescription("Partnership regression — second sole trader.");
  await sole.selectPrimaryNatureOfBusiness("0113 Vegetable Growing");
  await sole.enterTimeInBusiness("5", "3");
  await personal.chooseTitle("Mr");
  await personal.enterFirstName(SANITY_SECOND_PARTY_FIRST_NAME);
  await personal.enterMiddleName("Alan");
  await personal.enterLastName(SANITY_SECOND_PARTY_LAST_NAME);
  await personal.chooseGender("Male");
  await sole.enterDateOfBirth("15/06/1985");
  await personal.chooseMarritalStatus("Single");
  await personal.chooseNoOfDependents("0");
  await sole.enterBusinessAreaCode("9");
  await sole.enterBusinessPhoneNumber("0219876543");
  await sole.enterBusinessEmail("john.smith@example.com");
  await personal.chooseLicenceType("Full Licence");
  await personal.chooseCountryOfIssue("New Zealand");
  await personal.enterLicenceNumber("CD654321");
  await personal.enterVersionNumber("512");
  await personal.chooseNewZealandResident("Yes");
  await personal.chooseCountryOfBirth("New Zealand");
  await personal.chooseCountryOfCitizenship("New Zealand");
}

async function saveNewIndividualCustomerDetails(
  page: Page,
  personal: DOPersonalDetailsPage,
  isSoleTrader: boolean,
): Promise<void> {
  if (isSoleTrader) {
    const saveBtn = page.getByRole("button", { name: /^Save$/i }).last();
    await saveBtn.scrollIntoViewIfNeeded().catch(() => {});
    await saveBtn.click({ timeout: 15_000 });
    return;
  }
  await personal.clickSavePersonalDetails();
}

async function selectCustomerRoleIfAvailable(page: Page, rolePattern: RegExp): Promise<boolean> {
  const roleTrig = customerRoleDropdownTrigger(page);
  if (!(await roleTrig.isVisible({ timeout: 15_000 }).catch(() => false))) {
    return false;
  }
  await roleTrig.click();
  const opt = page.getByRole("option", { name: rolePattern }).first();
  const visible = await opt.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!visible) {
    await page.keyboard.press("Escape");
    return false;
  }
  const disabled = await opt
    .evaluate((el) => {
      return (
        el.classList.contains("p-disabled") ||
        el.getAttribute("aria-disabled") === "true" ||
        el.hasAttribute("disabled")
      );
    })
    .catch(() => true);
  if (disabled) {
    await page.keyboard.press("Escape");
    return false;
  }
  await opt.click();
  return true;
}

async function clickAddOnBorrowerSearchResult(page: Page, udcCustomerNumber: string): Promise<void> {
  await page.waitForURL(/borrower-search-result/i, { timeout: 90_000 }).catch(() => {});
  await expect(page.getByText(udcCustomerNumber, { exact: false }).first()).toBeVisible({
    timeout: 90_000,
  });
  const resultCard = page
    .locator("div, section, article")
    .filter({ hasText: udcCustomerNumber })
    .filter({ hasText: /UDC Customer Number/i })
    .last();
  const addBtn = resultCard
    .getByRole("button", { name: /^Add$/i })
    .or(page.getByRole("button", { name: /^Add$/i }).first());
  await addBtn.first().click({ timeout: 30_000 });
  await page.waitForLoadState("domcontentloaded").catch(() => {});
}

async function fillMinimalAddressContinue(page: Page, address: DOAddressDetailsPage): Promise<void> {
  await address.waitForPhysicalAddressStep();
  await address.timeAtAddress("3", "0");
  await address.enterStreetNumber("123");
  await address.enterStreetName("Main Street");
  await address.enterCity("Wellington");
  await address.chooseCountry("New Zealand");
  await address.clickReuseForPostalAddressToggle();
  await address.clickNextButton();
}

async function fillMinimalEmploymentContinue(emp: DOEmploymentDetailsPage): Promise<void> {
  await emp.waitForEmploymentDetailsStep();
  await emp.enterEmployerName("Test Employer Ltd");
  await emp.selectOccupation("Accountant");
  await emp.selectEmploymentType("Full Time");
  await emp.enterTimeInEmployment("3", "0");
  await emp.clickNextButton();
}

async function fillMinimalFinancialContinue(fin: DOFinancialPositionPage): Promise<void> {
  await fin.waitForFinancialPositionStep();
  await fin.selectNetProfitLastYearNo();
  await fin.clickNextButton();
}

async function fillMinimalBusinessFinancialContinue(fin: DOFinancialPositionPage): Promise<void> {
  await fin.waitForFinancialPositionStep();

  const sharedIncome = fin.page
    .getByText(/all income and expenses shared between Borrower and Co-borrower/i)
    .first();
  if (await sharedIncome.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await fin.clickNextButton();
    return;
  }

  await fin.selectBusinessNetProfitLastYearNo();
  await fin.clickNextButton();
}

async function fillMinimalReferenceAndAdvance(
  page: Page,
  ref: DOReferenceDetailsPage,
): Promise<DOCustomerQuotePostSubmitPage> {
  await ref.waitForReferenceDetailsStep();
  await ref.clickAddContactDetails();
  await ref.selectContactType("Accountant");
  await ref.enterContactFirstName("Alex");
  await ref.enterContactLastName("Referee");
  await ref.clickAddContactInModal();
  await ref.confirmCustomerDetailsCorrect();
  await ref.advanceFromReferenceDetailsToPostSubmission();
  const post = new DOCustomerQuotePostSubmitPage(page);
  await post.waitForUploadStep();
  return post;
}

export async function fillPartnershipBusinessMandatoryDetails(
  biz: DOBusinessDetailsPage,
  opts?: { legalName?: string; tradingName?: string },
): Promise<void> {
  await biz.selectOrganisationType("Partnership");
  await biz.enterLegalName(opts?.legalName ?? PARTNERSHIP_LEGAL_NAME);
  await biz.enterTradingName(opts?.tradingName ?? PARTNERSHIP_TRADING_NAME);
  await biz.enterRegisteredCompanyNumber("1234567");
  await biz.enterNzBusinessNumber("9429031234567");
  await biz.enterGstNumber("123456789");
  await biz.fillBusinessDescription("Partnership automation regression borrower.");
  await biz.selectPrimaryNatureOfBusiness("0113 Vegetable Growing");
  await biz.selectSourceOfWealth("Business Activity");
  await biz.enterTimeInBusiness("5", "3");
  await biz.enterBusinessAreaCode("9");
  await biz.enterBusinessPhoneNumber("0211234567");
  await biz.enterBusinessEmail("partnership.regression@example.com");
}

export async function fillIncorporatedBusinessMandatoryDetails(
  biz: DOBusinessDetailsPage,
  opts?: { legalName?: string },
): Promise<void> {
  await biz.selectOrganisationType("Incorporated Body");
  await biz.enterLegalName(opts?.legalName ?? INCORPORATED_LEGAL_NAME);
  await biz.enterTradingName("Incorp Trading");
  await biz.enterRegisteredCompanyNumber("1234567");
  await biz.enterNzBusinessNumber("9429031234567");
  await biz.enterGstNumber("123456789");
  await biz.fillBusinessDescription("Incorporated business automation regression.");
  await biz.selectPrimaryNatureOfBusiness("0113 Vegetable Growing");
  await biz.selectSourceOfWealth("Business Activity");
  await biz.enterTimeInBusiness("5", "3");
  await biz.enterBusinessAreaCode("9");
  await biz.enterBusinessPhoneNumber("0211234567");
  await biz.enterBusinessEmail("incorp.regression@example.com");
}

async function fillBusinessAddressFinancialReference(
  page: Page,
  biz: DOBusinessDetailsPage,
): Promise<DOReferenceDetailsPage> {
  await biz.clickNextButton();
  const address = new DOAddressDetailsPage(page);
  await address.waitForPhysicalAddressStep();
  await address.timeAtAddress("1", "1");
  await address.enterStreetNumber("123");
  await address.enterStreetName("Main Street");
  await address.enterCity("Wellington");
  await address.chooseCountry("New Zealand");
  await address.clickReuseForPostalAddressToggle();
  await page.waitForTimeout(400);
  await address.ensureReuseForRegisterAddressYes();
  await address.ensureOverseasAddressNoIfPreviousPhysicalVisible();
  await address.fillPreviousPhysicalRequiredIfPresent({
    years: "1",
    months: "1",
    streetNumber: "45",
    streetName: "Queen Street",
    city: "Wellington",
    country: "New Zealand",
  });
  await address.clickNextButton();

  const fin = new DOFinancialPositionPage(page);
  await fillMinimalBusinessFinancialContinue(fin);

  const ref = new DOReferenceDetailsPage(page);
  await ref.waitForReferenceDetailsStep();
  return ref;
}

export async function openAddNewPartnershipBorrower(page: Page): Promise<DOBusinessDetailsPage> {
  const customer = await openFinanceLeaseBusinessAsgToAddBorrowerStep(page);
  await customer.clickAddBorrowersOrGuarantors();
  await selectBusinessTypeSearchNoMatchUdcAndAddNewCustomer(page, customer);
  const biz = new DOBusinessDetailsPage(page);
  await biz.waitForBusinessDetailsStep();
  return biz;
}

export async function advancePartnershipBorrowerToPostSubmission(
  page: Page,
  opts?: { legalName?: string },
): Promise<DOCustomerQuotePostSubmitPage> {
  const biz = await openAddNewPartnershipBorrower(page);
  await fillPartnershipBusinessMandatoryDetails(biz, { legalName: opts?.legalName });
  const ref = await fillBusinessAddressFinancialReference(page, biz);
  await addSignatoryContactToReference(ref, {
    contactType: "Accountant",
    firstName: "Part",
    lastName: "Signatory",
    email: "part.signatory@example.com",
  });
  await ref.confirmCustomerDetailsCorrect();
  return fillMinimalReferenceAndAdvance(page, ref);
}

async function tryEnableCopyPrimaryBorrowerAddress(page: Page): Promise<boolean> {
  const label = page.getByText(/Copy primary borrower/i).first();
  if (!(await label.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }
  const slider = label.locator("xpath=following::span[contains(@class,'p-inputswitch-slider')][1]");
  if (!(await slider.isVisible({ timeout: 3_000 }).catch(() => false))) {
    return false;
  }
  await slider.click({ force: true });
  await page.waitForTimeout(1_000);
  return true;
}

async function fillCoBorrowerAddressSaveOnly(page: Page, address: DOAddressDetailsPage): Promise<void> {
  await address.waitForPhysicalAddressStep();
  const copied = await tryEnableCopyPrimaryBorrowerAddress(page);
  if (copied) {
    await address.selectResidenceType("Boarding").catch(() => {});
    await address.clickReuseForPostalAddressToggle().catch(() => {});
  } else {
    await address.waitForAddressStepReadyForInput();
    await address.timeAtAddress("3", "0");
    await address.enterStreetNumber("456");
    await address.enterStreetName("CoBorrower Street");
    await address.enterCity("Auckland");
    await address.chooseCountry("New Zealand");
    await address.selectResidenceType("Boarding");
    await address.clickReuseForPostalAddressToggle();
  }
  await address.clickSaveAddressDetails();
}

async function dismissUnsavedChangesCancelDialogIfVisible(page: Page): Promise<void> {
  const confirmDlg = page
    .locator("p-confirmdialog, .p-confirm-dialog, [role='alertdialog']")
    .filter({ visible: true })
    .filter({ hasText: /unsaved changes|lost|cancel/i })
    .first();
  if (!(await confirmDlg.isVisible({ timeout: 3_000 }).catch(() => false))) {
    return;
  }
  const discardBtn = confirmDlg
    .getByRole("button", { name: /^(Yes|OK|Confirm|Discard)$/i })
    .or(confirmDlg.locator("button.p-confirm-dialog-accept").first())
    .first();
  await discardBtn.click({ timeout: 10_000 });
  await expect(confirmDlg).toBeHidden({ timeout: 20_000 }).catch(() => {});
}

/** Business co-borrower wizard: advance past Address → Financial so the party is listed on Post Submission. */
async function advanceBusinessCoBorrowerPastAddressIfNeeded(page: Page): Promise<void> {
  const address = new DOAddressDetailsPage(page);
  if (await address.physicalSearchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await address.clickNextButton().catch(() => {});
    await page.waitForTimeout(500);
  }

  const fin = new DOFinancialPositionPage(page);
  if (await fin.waitForFinancialPositionStep().then(() => true).catch(() => false)) {
    await fillMinimalBusinessFinancialContinue(fin);
  }
}

async function returnToPostSubmitPartiesView(page: Page): Promise<void> {
  const post = new DOCustomerQuotePostSubmitPage(page);
  const quoteCrumb = page.getByRole("link", { name: /Standard Quote\s*-/i }).first();

  for (let attempt = 0; attempt < 2; attempt++) {
    if (await quoteCrumb.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await quoteCrumb.click({ timeout: 20_000 }).catch(() => {});
      await dismissUnsavedChangesCancelDialogIfVisible(page);
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      await page.waitForTimeout(1_000);
    }
    if (
      await page
        .getByText(/Borrowers\s*&\s*Guarantors/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
    ) {
      break;
    }
  }

  if (
    !(await page
      .getByText(/Borrowers\s*&\s*Guarantors/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false))
  ) {
    await post.clickPostSubmissionStepTab().catch(() => {});
  }
  await post.waitForUploadStep();
}

export async function addIndividualCoBorrowerFromPostSubmit(
  page: Page,
  udcNumber: string = EXISTING_UDC_INDIVIDUAL,
): Promise<RegExp> {
  return addSecondIndividualCoBorrowerFromPostSubmit(page, udcNumber);
}

export async function openAddNewBusinessFromPostSubmit(page: Page): Promise<DOBusinessDetailsPage> {
  const post = new DOCustomerQuotePostSubmitPage(page);
  await post.clickAddBorrowersOrGuarantorsButton();
  const dlg = await waitForSearchCustomerDialog(page);
  const businessBox = searchTypeRadioHost(dlg, /Business/i).locator(".p-radiobutton-box").first();
  if (await businessBox.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await businessBox.click({ force: true });
  } else {
    await searchTypeRadioInput(dlg, "business").check({ force: true });
  }
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await assetDetailsPage.searchByDropdownClick();
  await assetDetailsPage.selectUDCSelectOption();
  await assetDetailsPage.enterUDCCustomerNumber(SANITY_NO_MATCH_UDC);
  await assetDetailsPage.clickSearchButton();
  await assetDetailsPage.clickAddNewCustomerButton();
  const biz = new DOBusinessDetailsPage(page);
  await biz.waitForBusinessDetailsStep();
  return biz;
}

export async function addPartnershipOrgTypeBusinessCoBorrowerFromPostSubmit(
  page: Page,
  opts?: { legalName?: string },
): Promise<RegExp> {
  const legalName = opts?.legalName ?? "Invalid Partnership Co";
  const biz = await openAddNewBusinessFromPostSubmit(page);
  await selectCustomerRoleIfAvailable(page, /^Co[\s-]*Borrower$/i);
  await fillPartnershipBusinessMandatoryDetails(biz, { legalName });
  await biz.clickSaveBusinessDetails();
  await biz.clickNextButton();

  const address = new DOAddressDetailsPage(page);
  await fillCoBorrowerAddressSaveOnly(page, address);
  await advanceBusinessCoBorrowerPastAddressIfNeeded(page);
  await returnToPostSubmitPartiesView(page);

  const namePattern = new RegExp(legalName.split(/\s+/)[0]!, "i");
  await expect(await resolvePartyRowByName(page, namePattern)).toBeVisible({ timeout: 60_000 });
  await expectPartyRowShowsRole(page, namePattern, /Co[\s-]*Borrower/i);
  return namePattern;
}

/** Post Submission parties list — footer **Next** surfaces partnership org-type / co-borrower guards (UDP-T4460, T4472). */
export async function clickPostSubmissionNextExpectPartnershipOrgTypeGuard(page: Page): Promise<void> {
  const post = new DOCustomerQuotePostSubmitPage(page);
  await post.waitForUploadStep();
  await expect(page.getByText(/Borrowers\s*&\s*Guarantors/i).first()).toBeVisible({ timeout: 30_000 });
  await post.clickFooterNextForPartnershipValidation();

  const biz = new DOBusinessDetailsPage(page);
  await biz.expectPartnershipRoleOrganisationTypeValidation();
}

export async function addBusinessCoBorrowerFromPostSubmit(
  page: Page,
  opts?: { udcNumber?: string; legalName?: string },
): Promise<RegExp> {
  const post = new DOCustomerQuotePostSubmitPage(page);
  const customer = new DOCustomerDetailsPage(page);
  await post.clickAddBorrowersOrGuarantorsButton();

  if (opts?.udcNumber) {
    const dlg = await waitForSearchCustomerDialog(page);
    const businessBox = searchTypeRadioHost(dlg, /Business/i).locator(".p-radiobutton-box").first();
    if (await businessBox.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await businessBox.click({ force: true });
    }
    await customer.searchCustomer.searchByUdcNumber(opts.udcNumber);
    await customer.searchCustomer.clickAddFromBorrowerSearchResult(opts.udcNumber);
  } else {
    await selectBusinessTypeSearchNoMatchUdcAndAddNewCustomer(page, customer);
  }

  const biz = new DOBusinessDetailsPage(page);
  await biz.waitForBusinessDetailsStep();
  await selectCustomerRoleIfAvailable(page, /^Co[\s-]*Borrower$/i);
  if (!opts?.udcNumber) {
    await fillIncorporatedBusinessMandatoryDetails(biz, {
      legalName: opts?.legalName ?? "Biz CoBorrower Ltd",
    });
    await biz.clickSaveBusinessDetails();
  } else {
    const legalName =
      ((await biz.legalNameInput().inputValue().catch(() => "")) || opts.legalName || "Business").trim();
    await biz.clickSaveBusinessDetails();
    const namePattern = new RegExp(legalName.split(/\s+/)[0]!, "i");
    await biz.clickNextButton().catch(() => {});
    const address = new DOAddressDetailsPage(page);
    if (await address.physicalSearchInput.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await fillCoBorrowerAddressSaveOnly(page, address);
    }
    await returnToPostSubmitPartiesView(page);
    return namePattern;
  }

  await biz.clickNextButton();
  const address = new DOAddressDetailsPage(page);
  await fillCoBorrowerAddressSaveOnly(page, address);
  await advanceBusinessCoBorrowerPastAddressIfNeeded(page);
  await returnToPostSubmitPartiesView(page);
  const namePattern = new RegExp((opts?.legalName ?? "Biz CoBorrower").split(/\s+/)[0]!, "i");
  await expect(await resolvePartyRowByName(page, namePattern)).toBeVisible({ timeout: 60_000 });
  return namePattern;
}

export async function openAddNewTrustFromPostSubmit(page: Page): Promise<DOTrustDetailsPage> {
  const post = new DOCustomerQuotePostSubmitPage(page);
  await post.clickAddBorrowersOrGuarantorsButton();
  const customer = new DOCustomerDetailsPage(page);
  await selectTrustTypeSearchNoMatchUdcAndAddNewCustomer(page, customer);
  const trust = new DOTrustDetailsPage(page);
  await trust.waitForTrustDetailsStep();
  return trust;
}


export async function addTrustCoBorrowerFromPostSubmit(page: Page): Promise<RegExp> {
  const trust = await openAddNewTrustFromPostSubmit(page);
  const trustName = `Trust CoBorrower ${Date.now()}`;
  await selectCustomerRoleIfAvailable(page, /^Co[\s-]*Borrower$/i);
  await trust.selectTrustTypeFirstAvailableOption();
  await trust.enterTrustName(trustName);
  await trust.enterRegisteredNumber("12345678");
  await trust.enterGstNumber("123456789");
  await trust.enterTrustPurpose("Partnership regression trust co-borrower.");
  await trust.selectPrimaryNatureOfTrustFirstAvailableOption();
  await trust.enterTimeInTrustYearsMonths("5", "3");
  await trust.enterBusinessPhone("21", "1234567");
  await trust.enterContactEmail("trust.coborrower@example.com");
  await trust.clickSaveTrustDetails();
  await trust.clickNextTrustDetails();

  const address = new DOAddressDetailsPage(page);
  await address.fillTrustPhysicalAddressMandatoryCore({
    years: "3",
    months: "0",
    streetNumber: "100",
    streetName: "Queen Street",
    city: "Auckland",
  });
  await address.fillTrustPreviousPhysicalAddressMandatoryCore({
    years: "2",
    months: "0",
    streetNumber: "50",
    streetName: "Lambton Quay",
    city: "Wellington",
  });
  await address.setTrustReuseForPostalAddressOn();
  await address.setTrustReuseForRegisteredAddressOn();
  await address.fillTrustRegisteredTimeAtAddressAfterReuse("1", "0");
  await address.clickSaveAddressDetails();
  await returnToPostSubmitPartiesView(page);
  const namePattern = new RegExp(trustName.split(/\s+/)[0]!, "i");
  await expect(await resolvePartyRowByName(page, namePattern)).toBeVisible({ timeout: 60_000 });
  return namePattern;
}

export async function advanceFlIndividualBorrowerToPostSubmission(
  page: Page,
  udcNumber: string = EXISTING_UDC_INDIVIDUAL,
): Promise<DOCustomerQuotePostSubmitPage> {
  const customer = await openFinanceLeaseBusinessAsgToAddBorrowerStep(page);
  await customer.clickAddBorrowersOrGuarantors();
  await customer.searchCustomer.searchByUdcNumber(udcNumber);
  await customer.searchCustomer.clickAddFromBorrowerSearchResult(udcNumber);
  const personal = new DOPersonalDetailsPage(page);
  await expect(personal.personalDetailsRoot).toBeVisible({ timeout: 120_000 });
  await personal.clickSavePersonalDetails();
  await personal.clickNextButton();
  const address = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, address);
  const emp = new DOEmploymentDetailsPage(page);
  await fillMinimalEmploymentContinue(emp);
  const fin = new DOFinancialPositionPage(page);
  await fillMinimalFinancialContinue(fin);
  await returnToBorrowerSummaryForPartyObserve(page);
  const ref = new DOReferenceDetailsPage(page);
  return fillMinimalReferenceAndAdvance(page, ref);
}

export async function advanceFlIncorporatedBusinessBorrowerToPostSubmission(
  page: Page,
): Promise<DOCustomerQuotePostSubmitPage> {
  const customer = await openFinanceLeaseBusinessAsgToAddBorrowerStep(page);
  await customer.clickAddBorrowersOrGuarantors();
  await selectBusinessTypeSearchNoMatchUdcAndAddNewCustomer(page, customer);
  const biz = new DOBusinessDetailsPage(page);
  await biz.waitForBusinessDetailsStep();
  await fillIncorporatedBusinessMandatoryDetails(biz);
  const ref = await fillBusinessAddressFinancialReference(page, biz);
  await addSignatoryContactToReference(ref, {
    contactType: "Accountant",
    firstName: "Incorp",
    lastName: "Signatory",
    email: "incorp.signatory@example.com",
  });
  await ref.confirmCustomerDetailsCorrect();
  return fillMinimalReferenceAndAdvance(page, ref);
}

export async function advanceFlTrustBorrowerToPostSubmission(page: Page): Promise<DOCustomerQuotePostSubmitPage> {
  const customer = await openFinanceLeaseBusinessAsgToAddBorrowerStep(page);
  await customer.clickAddBorrowersOrGuarantors();
  await selectTrustTypeSearchNoMatchUdcAndAddNewCustomer(page, customer);
  const trust = new DOTrustDetailsPage(page);
  await trust.waitForTrustDetailsStep();
  await trust.selectTrustTypeFirstAvailableOption();
  await trust.enterTrustName(SANITY_TRUST_NAME);
  await trust.enterRegisteredNumber("12345678");
  await trust.enterGstNumber("123456789");
  await trust.enterTrustPurpose("Partnership regression trust borrower.");
  await trust.selectPrimaryNatureOfTrustFirstAvailableOption();
  await trust.enterTimeInTrustYearsMonths("5", "3");
  await trust.enterBusinessPhone("21", "1234567");
  await trust.enterContactEmail("trust.borrower@example.com");
  await trust.clickNextTrustDetails();

  const address = new DOAddressDetailsPage(page);
  await address.fillTrustPhysicalAddressMandatoryCore({
    years: "3",
    months: "0",
    streetNumber: "100",
    streetName: "Queen Street",
    city: "Auckland",
  });
  await address.fillTrustPreviousPhysicalAddressMandatoryCore({
    years: "2",
    months: "0",
    streetNumber: "50",
    streetName: "Lambton Quay",
    city: "Wellington",
  });
  await address.setTrustReuseForPostalAddressOn();
  await address.setTrustReuseForRegisteredAddressOn();
  await address.fillTrustRegisteredTimeAtAddressAfterReuse("1", "0");
  await address.clickNextButton();

  const fin = new DOFinancialPositionPage(page);
  await fin.fillTrustFinancialPositionComplete({
    netProfit: "$25,000.00",
    turnoverLatestAmount: "$10,000.00",
    turnoverYearEnding: "25/05/2026",
    balanceCash: "$10,000.00",
    balanceDebtor: "$2,500.00",
    balanceCreditor: "$1,500.00",
    balanceOverdraft: "$0.00",
    assetPersonalProperty: "$5,000.00",
    assetVehicle: "$18,000.00",
    assetOther: "$2,000.00",
    liabilityMortgage: "$850.00",
    liabilityLoans: "$300.00",
    liabilityCreditCards: "$150.00",
    liabilityOther: "$100.00",
  });
  await page.getByText(/Add Trustees Details/i).waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
  await fin.clickNextButton();

  const ref = new DOReferenceDetailsPage(page);
  await addSignatoryContactToReference(ref, {
    contactType: "Trustee",
    firstName: "Trust",
    lastName: "Signatory",
    email: "trust.signatory@example.com",
  });
  await ref.confirmCustomerDetailsCorrect();
  await page.getByRole("button", { name: /^Save$/i }).last().click({ timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
  return fillMinimalReferenceAndAdvance(page, ref);
}

async function isOnPostSubmissionUploadStep(page: Page): Promise<boolean> {
  return (
    (await page
      .getByRole("button", { name: /^Browse Files$/i })
      .isVisible({ timeout: 2_000 })
      .catch(() => false)) ||
    (await page
      .getByRole("tab", { name: /^Upload$/i })
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false))
  );
}

async function navigateToCustomerDetailsBorrowerSummarySubmit(page: Page): Promise<void> {
  await returnToBorrowerSummaryForPartyObserve(page);
  const customer = new DOCustomerDetailsPage(page);
  if (await customer.addBorrowersOrGuarantorsButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await customer.navigateToBorrowerSummary();
  }
}

export async function submitBorrowersSummaryExpectBldPartnershipToast(page: Page): Promise<void> {
  const ref = new DOReferenceDetailsPage(page);
  const post = new DOCustomerQuotePostSubmitPage(page);

  if (await isOnPostSubmissionUploadStep(page)) {
    await post.waitForUploadStep();
    await expect(page.getByText(/Borrowers\s*&\s*Guarantors/i).first()).toBeVisible({ timeout: 30_000 });
    await post.clickFooterNextForPartnershipValidation();
  } else {
    await navigateToCustomerDetailsBorrowerSummarySubmit(page);
    const submitBtn = standardQuoteRoot(page)
      .getByRole("button", { name: /^Submit$/i })
      .or(page.getByRole("button", { name: /^Submit$/i }))
      .first();
    if (await submitBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
      await submitBtn.click({ timeout: 30_000 });
    } else if (await ref.submitButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await ref.clickSubmitButton();
    } else {
      await post.clickFooterNextForPartnershipValidation();
    }
  }

  await ref.expectBldPartnershipMustBeBorrowerToast();
}

export async function expectPartyRedRoleChangeIcon(page: Page, namePattern: RegExp): Promise<void> {
  const row = await resolvePartyRowByName(page, namePattern);
  await expect(row).toBeVisible({ timeout: 60_000 });
  const icon = row
    .locator(
      ".pi-exclamation-circle, .pi-exclamation-triangle, .text-danger, [class*='role-change'], i.fa-exclamation, .p-badge-danger",
    )
    .first();
  await expect(icon).toBeVisible({ timeout: 30_000 });
}

function applyIdLocatorInPartyRow(row: Locator): Locator {
  const applyId = /Apply\s*ID/i;
  return row
    .getByRole("button", { name: applyId })
    .or(row.getByRole("link", { name: applyId }))
    .or(row.getByText(applyId))
    .first();
}

export async function expectApplyIdOnlyOnIndividualParties(
  page: Page,
  individualNamePattern: RegExp,
  businessNamePattern: RegExp,
): Promise<void> {
  const customer = new DOCustomerDetailsPage(page);
  const asset = new DOAssetDetailsPage(page);

  if (
    await page
      .getByText(/Borrowers\s*&\s*Guarantors/i)
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false)
  ) {
    await asset.clickStandardQuoteStepTab(/Customer\s*Details/i);
    await customer.waitForAddBorrowerButton();
  }
  await customer.navigateToBorrowerSummary();

  const individualRow = await resolvePartyRowByName(page, individualNamePattern);
  const businessRow = await resolvePartyRowByName(page, businessNamePattern);
  await expect(individualRow).toBeVisible({ timeout: 60_000 });
  await expect(businessRow).toBeVisible({ timeout: 60_000 });
  await expect(applyIdLocatorInPartyRow(individualRow)).toBeVisible({ timeout: 15_000 });
  await expect(applyIdLocatorInPartyRow(businessRow)).toHaveCount(0, { timeout: 10_000 });
}

export async function expectCopyPrimaryBorrowerSliderVisible(page: Page): Promise<void> {
  await expect(page.getByText(/Copy primary borrower/i).first()).toBeVisible({ timeout: 30_000 });
}

export function createNewCopyToPreviousAddressLabel(page: Page): Locator {
  return page.getByText(/Create new and copy to previous\s*Address/i).first();
}

async function countPrimaryBorrowerPartiesOnQuote(page: Page): Promise<number> {
  const roleBadges = page.getByText(/^Borrower$/i);
  let count = 0;
  const n = await roleBadges.count();
  for (let i = 0; i < n; i++) {
    const badge = roleBadges.nth(i);
    if (!(await badge.isVisible().catch(() => false))) {
      continue;
    }
    const container = badge
      .locator("xpath=ancestor::tr[1] | ancestor::li[1] | ancestor::section[1]")
      .first();
    const text = (await container.textContent({ timeout: 2_000 }).catch(() => "")) ?? "";
    if (/Co[\s-]*Borrower/i.test(text)) {
      continue;
    }
    count++;
  }
  return count;
}

async function secondBorrowerValidationVisible(page: Page, extraRoot?: Locator): Promise<boolean> {
  const patterns = [
    /only one borrower/i,
    /one borrower.{0,40}(permitted|allowed)/i,
    /borrower.{0,40}(permitted|allowed).{0,20}one/i,
    /maximum.{0,20}borrower/i,
    /Only one Borrower can be added/i,
  ];
  const roots: Locator[] = [
    page.locator(".p-toast, .p-toast-message, [role='alert'], .p-message, .p-inline-message"),
  ];
  if (extraRoot) {
    roots.push(extraRoot);
  }
  for (const root of roots) {
    for (const pattern of patterns) {
      const msg = root.getByText(pattern).first();
      if (await msg.isVisible({ timeout: 3_000 }).catch(() => false)) {
        return true;
      }
    }
  }
  return false;
}

export async function attemptAddSecondCustomerAsBorrower(page: Page): Promise<boolean> {
  const beforeCount = await countPrimaryBorrowerPartiesOnQuote(page);
  const { personal, sole, isSoleTrader } = await openAddNewIndividualFromPostSubmit(page);
  const validationRoot = isSoleTrader ? sole.soleTradeRoot : personal.personalDetailsRoot;

  const borrowerRoleSelected = await selectCustomerRoleIfAvailable(page, /^Borrower$/i);
  if (!borrowerRoleSelected) {
    return false;
  }

  if (await secondBorrowerValidationVisible(page, validationRoot)) {
    return false;
  }

  if (isSoleTrader) {
    await fillMinimalSoleTraderSecondParty(sole, personal);
  } else {
    await fillValidSecondIndividualPersonalBorrower(personal);
  }
  await saveNewIndividualCustomerDetails(page, personal, isSoleTrader);
  if (await secondBorrowerValidationVisible(page, validationRoot)) {
    return false;
  }

  if (isSoleTrader) {
    await sole.nextButton.click({ timeout: 15_000 }).catch(() => {});
  } else {
    await personal.clickNextButton().catch(() => {});
  }
  await page.waitForLoadState("domcontentloaded").catch(() => {});

  if (await secondBorrowerValidationVisible(page, validationRoot)) {
    return false;
  }

  const secondBorrowerRow = page
    .locator("tr, div, li, section")
    .filter({ hasText: new RegExp(`${SANITY_SECOND_PARTY_FIRST_NAME}|${SANITY_SECOND_PARTY_LAST_NAME}`, "i") })
    .first();
  if (await secondBorrowerRow.isVisible({ timeout: 15_000 }).catch(() => false)) {
    const rowText = (await secondBorrowerRow.textContent()) ?? "";
    if (/\bBorrower\b/i.test(rowText) && !/Co[\s-]*Borrower/i.test(rowText)) {
      return true;
    }
  }

  const afterCount = await countPrimaryBorrowerPartiesOnQuote(page);
  return afterCount > beforeCount;
}

export async function addPartnershipBorrowerOverExistingIndividual(
  page: Page,
): Promise<void> {
  const post = new DOCustomerQuotePostSubmitPage(page);
  await post.clickAddBorrowersOrGuarantorsButton();
  await selectBusinessTypeSearchNoMatchUdcAndAddNewCustomer(page, new DOCustomerDetailsPage(page));
  const biz = new DOBusinessDetailsPage(page);
  await biz.waitForBusinessDetailsStep();
  await fillPartnershipBusinessMandatoryDetails(biz);
  await biz.clickSaveBusinessDetails();
}

async function selectBusinessSearchTypeInDialog(page: Page): Promise<void> {
  const dlg = await waitForSearchCustomerDialog(page);
  const businessBox = searchTypeRadioHost(dlg, /Business/i).locator(".p-radiobutton-box").first();
  if (await businessBox.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await businessBox.click({ force: true });
  }
}

export async function openExistingPartnershipFromFisSearch(page: Page): Promise<DOBusinessDetailsPage> {
  const customer = await openFinanceLeaseBusinessAsgToAddBorrowerStep(page);
  await customer.clickAddBorrowersOrGuarantors();
  await customer.searchCustomer.waitForVisible();
  await selectBusinessSearchTypeInDialog(page);

  if (EXISTING_UDC_PARTNERSHIP) {
    await customer.searchCustomer.searchByUdcNumber(EXISTING_UDC_PARTNERSHIP);
    await customer.searchCustomer.clickAddFromBorrowerSearchResult(EXISTING_UDC_PARTNERSHIP);
  } else {
    await customer.searchCustomer.searchBusinessByLegalName(PARTNERSHIP_LEGAL_NAME);
    await customer.searchCustomer.clickAddFromBorrowerSearchResultByName(/Partnership Regression/i);
  }

  const biz = new DOBusinessDetailsPage(page);
  await biz.waitForBusinessDetailsStep();
  await biz.expectOrganisationTypePartnership();
  return biz;
}

/** UDP-T4478 — existing Partnership from FIS → Business Details → Address Details. */
export async function openExistingPartnershipOnAddressDetailsStep(
  page: Page,
): Promise<DOAddressDetailsPage> {
  const biz = await openExistingPartnershipFromFisSearch(page);
  await biz.clickSaveBusinessDetails();
  await biz.clickNextButton();
  const address = new DOAddressDetailsPage(page);
  await address.waitForPhysicalAddressStep();
  return address;
}

export {
  clickEditPartyFromPartiesList,
  expectPartyRowShowsRole,
  partyRowByName,
  resolvePartyRowByName,
  returnToBorrowerSummaryForPartyObserve,
};
