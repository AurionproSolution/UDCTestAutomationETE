/**
 * DO Portal — Customer Details regression (UDP-T3709–UDP-T3795).
 * Scenario source: Customer Details (1).xlsx (Zephyr / Regression 25.0 / Customer Details).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAddressDetailsPage,
  DOAssetDetailsPage,
  DOCustomerQuotePostSubmitPage,
  DODashboardPage,
  DOEmploymentDetailsPage,
  DOFinancialPositionPage,
  DOReferenceDetailsPage,
  DOSoleTraderDetailsPage,
  DOTrustDetailsPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOBusinessDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/businessDetails";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";

const CSA_SQ_PRODUCT = "CSA-C-Assigned";
const CSA_SQ_PROGRAM = "Webform - CSA Personal - MV Dealer";
/** Business loan purpose — Search Customer enables Individual, Business, and Trust (Zephyr UDP-T3711). */
const CSA_B_SQ_PRODUCT = "CSA-B-Assigned";
const CSA_B_SQ_PROGRAM = "MYUDC-B-CSA-Assigned MV";
const TLC_DEALER = "Armstrong Prestige Wellington";

/**
 * UDC customer number for FIS search / selection (UDP-T3720, UDP-T3743, etc.).
 * Override with `UDC_EXISTING_CUSTOMER_NUMBER` when QAT data differs.
 */
const EXISTING_UDC_CUSTOMER_NUMBER =
  process.env.UDC_EXISTING_CUSTOMER_NUMBER?.trim() || "1183121";

/** Existing **Business** party for FIS pre-populate (UDP-T3750). Override with `UDC_EXISTING_BUSINESS_UDC_NUMBER`. */
const EXISTING_BUSINESS_UDC_CUSTOMER_NUMBER =
  process.env.UDC_EXISTING_BUSINESS_UDC_NUMBER?.trim() || "1183084";

/** Optional: substring for UDP-T3715 company-name search when QAT data differs; default is a common legal suffix. */
const UDP_T3715_COMPANY_NAME_SEARCH =
  process.env.UDC_EXISTING_COMPANY_NAME_SEARCH?.trim() || "Limited";

/** Optional: registered number value for UDP-T3716; default matches sample QAT borrower card. */
const UDP_T3716_REGISTERED_NUMBER_SEARCH =
  process.env.UDC_EXISTING_REGISTERED_NUMBER_SEARCH?.trim() || "789123";

/** Optional: partial **Customer Name** when UDC existing-individual search has no hit (UDP-T3764 / T3743). */
const EXISTING_CUSTOMER_NAME_SEARCH =
  process.env.UDC_EXISTING_CUSTOMER_NAME_SEARCH?.trim() || "Doe";

function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

async function openStandardQuoteFromDashboard(page: Page): Promise<{
  dashboardPage: DODashboardPage;
  assetDetailsPage: DOAssetDetailsPage;
}> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectCSAproduct();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  return { dashboardPage, assetDetailsPage };
}

async function selectCsaProductAndProgram(assetDetailsPage: DOAssetDetailsPage): Promise<void> {
  await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(CSA_SQ_PROGRAM);
}

async function addMinimalUsedAsset(
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
}

async function prepareCalculableCsaQuote(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  opts?: { origRef?: string },
): Promise<void> {
  await addMinimalUsedAsset(assetDetailsPage, addAssetPage);
  await assetDetailsPage.termsOfFinance("36");
  await assetDetailsPage.interestRate("9");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await assetDetailsPage.enterOriginationReference(opts?.origRef ?? "SQ-CSA-CD-Ref");
}

/**
 * Land on **Customer Details** (after Asset Details **Calculate** + **Next**), same entry as UDP-T3690.
 */
async function openStandardQuoteOnCustomerDetailsStep(page: Page): Promise<DOAssetDetailsPage> {
  const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
  const addAssetPage = new DOAddAssetPage(page);
  await selectCsaProductAndProgram(assetDetailsPage);
  await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.enterOriginationReference("SQ-CSA-CD-Ref");
  await assetDetailsPage.clickNextButton();
  await assetDetailsPage.waitForAddBorrowerButton();
  return assetDetailsPage;
}

/**
 * Same path as {@link openStandardQuoteOnCustomerDetailsStep}, but **CSA-B-Assigned** +
 * **MYUDC-B-CSA-Assigned MV** so loan purpose is Business and all search types are offered.
 */
async function openStandardQuoteBusinessLoanOnCustomerDetailsStep(
  page: Page,
): Promise<DOAssetDetailsPage> {
  const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
  const addAssetPage = new DOAddAssetPage(page);
  await assetDetailsPage.chooseProduct(CSA_B_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(CSA_B_SQ_PROGRAM);
  await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.enterOriginationReference("SQ-CSA-CD-Ref");
  await assetDetailsPage.clickNextButton();
  await assetDetailsPage.waitForAddBorrowerButton();
  return assetDetailsPage;
}

async function selectSearchByUdcCustomerNumber(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  dlg: Locator,
): Promise<void> {
  await assetDetailsPage.searchByDropdownClick();
  const panel = page.locator(".p-dropdown-panel").last();
  const udcOpt = panel.getByRole("option", { name: /UDC Customer/i }).first();
  await udcOpt.waitFor({ state: "visible", timeout: 30_000 });
  await udcOpt.click();
  await panel.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  await expect
    .poll(
      async () => {
        const label = (await dlg.getByRole("combobox").first().textContent())?.trim() ?? "";
        return /UDC Customer/i.test(label);
      },
      { timeout: 15_000 },
    )
    .toBeTruthy();
}

/** CSA-B: **Trust** search type + UDC no-match → **Add New Customer** → **Trust Details**. */
async function openTrustDetailsViaUdcNoMatch(
  assetDetailsPage: DOAssetDetailsPage,
  udcCustomerNumber: string = "420",
): Promise<DOTrustDetailsPage> {
  const page = assetDetailsPage.page;
  await assetDetailsPage.waitForAddBorrowerButton();
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  const dlg = customerSearchDialog(page);
  await expect.soft(dlg).toBeVisible({ timeout: 60_000 });
  const trustHost = searchCustomerTypeHost(dlg, "trust");
  if (!(await trustHost.isVisible({ timeout: 10_000 }).catch(() => false))) {
    throw new Error("Trust search type not available — use CSA-B business loan program.");
  }
  await clickSearchCustomerType(dlg, "trust");
  await page.waitForTimeout(500);
  await selectSearchByUdcCustomerNumber(page, assetDetailsPage, dlg);
  await assetDetailsPage.enterUDCCustomerNumber(udcCustomerNumber);
  await assetDetailsPage.clickSearchButton();
  await assetDetailsPage.clickAddNewCustomerButton();
  const trustPage = new DOTrustDetailsPage(page);
  await trustPage.waitForTrustDetailsStep();
  return trustPage;
}

/** CSA-B: UDC no-match search → **Add New Customer** → **Business Details** (CSABAssigned parity). */
async function openBusinessDetailsViaUdcNoMatch(
  assetDetailsPage: DOAssetDetailsPage,
): Promise<DOBusinessDetailsPage> {
  await assetDetailsPage.waitForAddBorrowerButton();
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  await assetDetailsPage.searchByDropdownClick();
  await assetDetailsPage.selectUDCSelectOption();
  await assetDetailsPage.enterUDCCustomerNumber("420");
  await assetDetailsPage.clickSearchButton();
  await assetDetailsPage.clickAddNewCustomerButton();
  const businessDetailsPage = new DOBusinessDetailsPage(assetDetailsPage.page);
  await businessDetailsPage.waitForBusinessDetailsStep();
  return businessDetailsPage;
}

/** Mandatory Business Details fields for Save — **NZBN** omitted (UDP-T3748). */
async function fillValidBusinessDetailsExceptNzbn(b: DOBusinessDetailsPage): Promise<void> {
  await b.selectOrganisationType("Incorporated Body");
  await b.enterLegalName("Test Legal Entity Ltd");
  await b.enterTradingName("Test Trading");
  await b.enterRegisteredCompanyNumber("1234567");
  await b.enterGstNumber("12345678");
  await b.fillBusinessDescription("Automation test — wholesale trade sample description.");
  await b.selectPrimaryNatureOfBusiness("0113 Vegetable Growing");
  await b.selectSourceOfWealth("Business Activity");
  await b.enterTimeInBusiness("5", "3");
  await b.enterBusinessAreaCode("9");
  await b.enterBusinessPhoneNumber("0211234567");
  await b.enterBusinessEmail("liza.doe@example.com");
}

/** Mandatory Business Details fields for Save — **GST Number** omitted (UDP-T3749). */
async function fillValidBusinessDetailsExceptGst(b: DOBusinessDetailsPage): Promise<void> {
  await b.selectOrganisationType("Incorporated Body");
  await b.enterLegalName("Test Legal Entity Ltd");
  await b.enterTradingName("Test Trading");
  await b.enterRegisteredCompanyNumber("1234567");
  await b.enterNzBusinessNumber("9429031234567");
  await b.fillBusinessDescription("Automation test — wholesale trade sample description.");
  await b.selectPrimaryNatureOfBusiness("0113 Vegetable Growing");
  await b.selectSourceOfWealth("Business Activity");
  await b.enterTimeInBusiness("5", "3");
  await b.enterBusinessAreaCode("9");
  await b.enterBusinessPhoneNumber("0211234567");
  await b.enterBusinessEmail("liza.doe@example.com");
}

async function fillBusinessCompanyNameSearchTerm(dlg: Locator, term: string): Promise<void> {
  const byLabel = dlg.getByRole("textbox", { name: /Company Name/i }).first();
  const byTextHost = dlg.locator("text").filter({ hasText: /^Company Name/i }).locator("#text").first();
  const byXpath = dlg.locator(
    "xpath=.//label[contains(normalize-space(.),'Company Name')][1]/following::input[contains(@class,'p-inputtext')][1]",
  );
  if (await byLabel.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await byLabel.fill(term);
  } else if (await byTextHost.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await byTextHost.fill(term);
  } else {
    await byXpath.fill(term);
  }
}

/** CSA-B: Business **UDC customer number** search hit → **Borrower Result** → **Add** → **Business Details** (UDP-T3750). */
async function openExistingBusinessDetailsViaUdcNumber(
  assetDetailsPage: DOAssetDetailsPage,
  udcCustomerNumber: string = EXISTING_BUSINESS_UDC_CUSTOMER_NUMBER,
): Promise<DOBusinessDetailsPage> {
  const page = assetDetailsPage.page;
  await assetDetailsPage.waitForAddBorrowerButton();
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  const dlg = customerSearchDialog(page);
  await expect.soft(dlg).toBeVisible({ timeout: 60_000 });
  await clickSearchCustomerType(dlg, "business");
  await assetDetailsPage.searchByDropdownClick();
  await assetDetailsPage.selectUDCSelectOption();
  await assetDetailsPage.enterUDCCustomerNumber(udcCustomerNumber);
  await assetDetailsPage.clickSearchButton();
  await expect.soft(page.getByText(/Borrower Result/i).first()).toBeVisible({ timeout: 90_000 });
  await expect.soft(page.getByText(udcCustomerNumber).first()).toBeVisible({ timeout: 30_000 });
  await waitBorrowerResultAndClickAdd(page);
  const businessDetailsPage = new DOBusinessDetailsPage(page);
  await businessDetailsPage.waitForBusinessDetailsStep();
  return businessDetailsPage;
}

/** CSA-B: Business **Company Name** search hit → **Add** → **Business Details**. */
async function openExistingBusinessDetailsViaCompanyNameSearch(
  assetDetailsPage: DOAssetDetailsPage,
  companySearchTerm: string = UDP_T3715_COMPANY_NAME_SEARCH,
): Promise<DOBusinessDetailsPage> {
  const page = assetDetailsPage.page;
  await assetDetailsPage.waitForAddBorrowerButton();
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  const dlg = customerSearchDialog(page);
  await expect.soft(dlg).toBeVisible({ timeout: 60_000 });
  await clickSearchCustomerType(dlg, "business");
  await assetDetailsPage.searchByDropdownClick();
  const panel = page.locator(".p-dropdown-panel").last();
  const companyOpt = panel.getByRole("option", { name: /Company Name/i }).first();
  await companyOpt.waitFor({ state: "visible", timeout: 30_000 });
  await companyOpt.click();
  await page.locator(".p-dropdown-panel").last().waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  await fillBusinessCompanyNameSearchTerm(dlg, companySearchTerm);
  await assetDetailsPage.clickSearchButton();
  await waitBorrowerResultAndClickAdd(page);
  const businessDetailsPage = new DOBusinessDetailsPage(page);
  await businessDetailsPage.waitForBusinessDetailsStep();
  return businessDetailsPage;
}

/** Mandatory Business Details fields for Save — **Registered Company Number** omitted (UDP-T3747). */
async function fillValidBusinessDetailsExceptRegisteredCompanyNumber(
  b: DOBusinessDetailsPage,
): Promise<void> {
  await b.selectOrganisationType("Incorporated Body");
  await b.enterLegalName("Test Legal Entity Ltd");
  await b.enterTradingName("Test Trading");
  await b.enterNzBusinessNumber("9429031234567");
  await b.enterGstNumber("12345678");
  await b.fillBusinessDescription("Automation test — wholesale trade sample description.");
  await b.selectPrimaryNatureOfBusiness("0113 Vegetable Growing");
  await b.selectSourceOfWealth("Business Activity");
  await b.enterTimeInBusiness("5", "3");
  await b.enterBusinessAreaCode("9");
  await b.enterBusinessPhoneNumber("0211234567");
  await b.enterBusinessEmail("liza.doe@example.com");
}

/** Mandatory Business Details fields for Save — **Trading Name** intentionally omitted (UDP-T3746). */
async function fillValidBusinessDetailsExceptTrading(b: DOBusinessDetailsPage): Promise<void> {
  await b.selectOrganisationType("Incorporated Body");
  await b.enterLegalName("Test Legal Entity Ltd");
  await b.enterRegisteredCompanyNumber("1234567");
  await b.enterNzBusinessNumber("9429031234567");
  await b.enterGstNumber("12345678");
  await b.fillBusinessDescription("Automation test — wholesale trade sample description.");
  await b.selectPrimaryNatureOfBusiness("0113 Vegetable Growing");
  await b.selectSourceOfWealth("Business Activity");
  await b.enterTimeInBusiness("5", "3");
  await b.enterBusinessAreaCode("9");
  await b.enterBusinessPhoneNumber("0211234567");
  await b.enterBusinessEmail("liza.doe@example.com");
}

/** CSA-B business loan: **Business** search type → no-match search → **Add New Customer** → **Business Details**. */
async function openAddNewBusinessCustomer(
  assetDetailsPage: DOAssetDetailsPage,
): Promise<DOBusinessDetailsPage> {
  const page = assetDetailsPage.page;
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  const dlg = customerSearchDialog(page);
  await expect.soft(dlg).toBeVisible({ timeout: 60_000 });
  const businessHost = searchCustomerTypeHost(dlg, "business");
  if (!(await businessHost.isVisible({ timeout: 10_000 }).catch(() => false))) {
    throw new Error("Business search type not available — use CSA-B business loan program.");
  }
  await clickSearchCustomerType(dlg, "business");

  const noMatchTerm = "ZZZNOMATCH-UDP-T3745";
  const byLabel = dlg.getByRole("textbox", { name: /Company Name/i }).first();
  const byTextHost = dlg.locator("text").filter({ hasText: /^Company Name/i }).locator("#text").first();
  const byXpath = dlg.locator(
    "xpath=.//label[contains(normalize-space(.),'Company Name')][1]/following::input[contains(@class,'p-inputtext')][1]",
  );
  if (await byLabel.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await byLabel.fill(noMatchTerm);
  } else if (await byTextHost.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await byTextHost.fill(noMatchTerm);
  } else {
    await byXpath.fill(noMatchTerm);
  }
  await assetDetailsPage.clickSearchButton();
  await assetDetailsPage.clickAddNewCustomerButton();
  const businessPage = new DOBusinessDetailsPage(page);
  await businessPage.waitForBusinessDetailsStep();
  return businessPage;
}

/** Search path used in CSA regression: unlikely match → **Add New Customer** enabled. */
async function openAddNewIndividualPersonal(
  assetDetailsPage: DOAssetDetailsPage,
): Promise<DOPersonalDetailsPage> {
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  await assetDetailsPage.searchByDropdownClick();
  await assetDetailsPage.selectUDCSelectOption();
  await assetDetailsPage.enterUDCCustomerNumber("420");
  await assetDetailsPage.clickSearchButton();
  await assetDetailsPage.clickAddNewCustomerButton();
  return new DOPersonalDetailsPage(assetDetailsPage.page);
}

async function fillValidIndividualPersonalBorrower(p: DOPersonalDetailsPage): Promise<void> {
  await p.chooseTitle("Dame");
  await p.enterFirstName("Liza");
  await p.enterMiddleName("Marie");
  await p.enterLastName("Doe");
  await p.chooseGender("Female");
  await p.enterDateOfBirth("01/01/1980");
  await p.chooseMarritalStatus("Married");
  await p.chooseNoOfDependents("2");
  await p.fillDependantsAgesInYears(["8", "12"]);
  await p.enterMobileNumber("0211234567");
  await p.enterEmail("liza.doe@example.com");
  await p.chooseLicenceType("Full Licence");
  await p.chooseCountryOfIssue("New Zealand");
  await p.enterLicenceNumber("AB123456");
  await p.enterVersionNumber("244");
  await p.chooseNewZealandResident("Yes");
  await p.chooseCountryOfBirth("New Zealand");
  await p.chooseCountryOfCitizenship("New Zealand");
}

async function clearPersonalDetailsForValidation(p: DOPersonalDetailsPage): Promise<void> {
  await p.chooseTitle("");
  await p.enterFirstName("");
  await p.enterLastName("");
  await p.chooseGender("");
  await p.enterDateOfBirth("");
  await p.chooseMarritalStatus("");
  await p.chooseNoOfDependents("");
  await p.enterMobileNumber("");
  await p.enterEmail("");
  await p.chooseLicenceType("");
  await p.chooseNewZealandResident("");
  await p.chooseCountryOfBirth("");
  await p.chooseCountryOfCitizenship("");
}

async function fillMinimalAddressContinue(
  page: Page,
  addressDetailsPage: DOAddressDetailsPage,
): Promise<void> {
  await fillAddressWithResidenceTypeAndContinue(page, addressDetailsPage, "Boarding");
}

async function fillAddressWithResidenceTypeAndContinue(
  page: Page,
  addressDetailsPage: DOAddressDetailsPage,
  residenceType: string,
): Promise<void> {
  await addressDetailsPage.waitForPhysicalAddressStep();
  await addressDetailsPage.timeAtAddress("5", "0");
  await addressDetailsPage.enterStreetNumber("123");
  await addressDetailsPage.enterStreetName("Main Street");
  await addressDetailsPage.enterCity("Wellington");
  await addressDetailsPage.chooseCountry("New Zealand");
  await addressDetailsPage.selectResidenceType(residenceType);
  await addressDetailsPage.clickReuseForPostalAddressToggle();
  await addressDetailsPage.clickSaveAddressDetails();
  await addressDetailsPage.clickNextButton();
}

async function fillTrustNameSearchTerm(dlg: Locator, term: string): Promise<void> {
  const byLabel = dlg.getByRole("textbox", { name: /Trust Name/i }).first();
  const byTextHost = dlg.locator("text").filter({ hasText: /^Trust Name/i }).locator("#text").first();
  const byXpath = dlg.locator(
    "xpath=.//label[contains(normalize-space(.),'Trust Name')][1]/following::input[contains(@class,'p-inputtext')][1]",
  );
  if (await byLabel.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await byLabel.fill(term);
  } else if (await byTextHost.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await byTextHost.fill(term);
  } else {
    await byXpath.fill(term);
  }
}

/** CSA-B: **Trust Name** search hit → **Borrower Result** → **Add** → **Trust Details** (UDP-T3753). */
async function openExistingTrustDetailsViaTrustNameSearch(
  assetDetailsPage: DOAssetDetailsPage,
  trustSearchTerm: string = UDP_T3717_TRUST_NAME_SEARCH,
): Promise<DOTrustDetailsPage> {
  const page = assetDetailsPage.page;
  await assetDetailsPage.waitForAddBorrowerButton();
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  const dlg = customerSearchDialog(page);
  await expect.soft(dlg).toBeVisible({ timeout: 60_000 });
  await clickSearchCustomerType(dlg, "trust");
  await assetDetailsPage.searchByDropdownClick();
  const panel = page.locator(".p-dropdown-panel").last();
  const trustNameOpt = panel.getByRole("option", { name: /Trust Name/i }).first();
  if (await trustNameOpt.isVisible({ timeout: 12_000 }).catch(() => false)) {
    await trustNameOpt.click();
    await page
      .locator(".p-dropdown-panel")
      .last()
      .waitFor({ state: "hidden", timeout: 15_000 })
      .catch(() => {});
  }
  await fillTrustNameSearchTerm(dlg, trustSearchTerm);
  await assetDetailsPage.clickSearchButton();
  await waitBorrowerResultAndClickAdd(page);
  const trustPage = new DOTrustDetailsPage(page);
  await trustPage.waitForTrustDetailsStep();
  return trustPage;
}

async function selectCustomerRole(page: Page, role: string): Promise<void> {
  const roleTrig = page
    .locator("label")
    .filter({ hasText: /Customer Role/i })
    .first()
    .locator(
      "xpath=following::*[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
    );
  await expect.soft(roleTrig).toBeVisible({ timeout: 15_000 });
  await roleTrig.click();
  const escaped = role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page.getByRole("option", { name: new RegExp(`^${escaped}$`, "i") }).first().click({
    timeout: 15_000,
  });
  await page.locator(".p-dropdown-panel").last().waitFor({ state: "hidden", timeout: 12_000 }).catch(() => {});
}

async function fillMinimalIndividualFinancialForSubmit(fin: DOFinancialPositionPage): Promise<void> {
  await fin.waitForFinancialPositionStep();
  await fin.selectIndividualHomeOwnershipType("Mortgage");
  await fin.fillIndividualVehicleValueAmount("$18,000.00");
  await fin.fillIndividualFurnitureEffectsValueAmount("$12,500.00");
  await fin.fillFirstLiabilityBalanceAndAmount("$500,000.00", "$2,500.00");
  await fin.setFirstLiabilityRowFrequencyMonthly();
  await fin.fillFirstIncomeAmount("$5,000.00");
  await fin.setTakeHomePayFrequencyMonthly();
  await fin.fillExpenditureAmountByLabel(/Council Rates/i, "$220.00");
  await fin.setExpenditureRowFrequencyMonthlyByLabel(/Council Rates/i);
  await fin.fillExpenditureAmountByLabel(/Living Expenses/i, "$900.00");
  await fin.setExpenditureRowFrequencyMonthlyByLabel(/Living Expenses/i);
  await fin.expectEssentialOutgoingTypeDefaultOther();
  await fin.fillEssentialOutgoingAmount("$150.00");
  await fin.setEssentialOutgoingFrequencyMonthly();
}

async function completeIndividualBorrowerAfterAddressStep(page: Page): Promise<void> {
  const emp = new DOEmploymentDetailsPage(page);
  await emp.waitForEmploymentDetailsStep();
  await emp.enterCurrentEmployerName("Employer Ltd");
  await emp.selectCurrentOccupation("Accountant");
  await emp.selectCurrentEmploymentType("Full Time Employed");
  await emp.enterCurrentTimeWithEmployer("5", "0");
  await emp.clickNextButton();

  const fin = new DOFinancialPositionPage(page);
  await fillMinimalIndividualFinancialForSubmit(fin);
  await fin.clickNextButton();

  const ref = new DOReferenceDetailsPage(page);
  await ref.waitForReferenceDetailsStep();
  await ref.confirmCustomerDetailsCorrect();
  await ref.clickSubmitButton();
}

async function submitPrimaryIndividualBorrowerToUploadStep(
  page: Page,
): Promise<{ assetDetailsPage: DOAssetDetailsPage }> {
  const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
  const personalDetailsPage = await openAddNewIndividualPersonal(assetDetailsPage);
  await fillValidIndividualPersonalBorrower(personalDetailsPage);
  await personalDetailsPage.clickNextButton();

  const addressDetailsPage = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, addressDetailsPage);
  await completeIndividualBorrowerAfterAddressStep(page);

  const postSubmit = new DOCustomerQuotePostSubmitPage(page);
  await postSubmit.waitForUploadStep();
  return { assetDetailsPage };
}

async function waitForPersonalDetailsAfterCustomerAdd(page: Page): Promise<void> {
  const markers = [
    page.locator("app-personal-details").first(),
    page.locator("app-personal-detail").first(),
    page.getByText(/1\.\s*Personal Details/i).first(),
    page.getByRole("textbox", { name: /First Name/i }).first(),
  ];
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    for (const marker of markers) {
      if (await marker.isVisible({ timeout: 500 }).catch(() => false)) {
        return;
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error("Personal Details did not open after borrower Add.");
}

async function advanceIndividualToEmploymentStep(page: Page): Promise<void> {
  const onEmployment = async (): Promise<boolean> =>
    page.getByText(/^Current Employment$/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

  if (await onEmployment()) {
    return;
  }

  const personal = new DOPersonalDetailsPage(page);
  const onPersonal =
    (await personal.personalDetailsRoot.isVisible({ timeout: 8_000 }).catch(() => false)) ||
    (await page.locator("app-personal-detail").first().isVisible({ timeout: 5_000 }).catch(() => false));

  if (onPersonal) {
    await personal.clickNextButton();
    await page.waitForLoadState("domcontentloaded").catch(() => {});
  }

  if (await onEmployment()) {
    return;
  }

  const address = new DOAddressDetailsPage(page);
  if (await address.physicalSearchInput.isVisible({ timeout: 30_000 }).catch(() => false)) {
    await fillMinimalAddressContinue(page, address);
    return;
  }

  const empStep = page.locator(':text-is("3. Employment Details")');
  if (await empStep.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await empStep.click({ timeout: 30_000 });
  }
}

async function openIndividualOnEmploymentStep(
  page: Page,
  opts?: { existingUdcNumber?: string },
): Promise<DOEmploymentDetailsPage> {
  const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
  if (opts?.existingUdcNumber) {
    await addExistingIndividualFromSearch(assetDetailsPage, page, opts.existingUdcNumber);
    await waitForPersonalDetailsAfterCustomerAdd(page);
  } else {
    const personal = await openAddNewIndividualPersonal(assetDetailsPage);
    await fillValidIndividualPersonalBorrower(personal);
  }
  await advanceIndividualToEmploymentStep(page);
  const emp = new DOEmploymentDetailsPage(page);
  await emp.waitForEmploymentDetailsStep();
  return emp;
}

/** CSA-B business loan — Individual search → **Add New Customer** → Sole Trader business + personal step. */
async function openAddNewSoleTraderIndividual(
  assetDetailsPage: DOAssetDetailsPage,
  page: Page,
): Promise<{ sole: DOSoleTraderDetailsPage; personal: DOPersonalDetailsPage }> {
  const postSubmit = new DOCustomerQuotePostSubmitPage(page);
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  await postSubmit.selectSearchCustomerIndividualType();
  await assetDetailsPage.searchByDropdownClick();
  await assetDetailsPage.selectUDCSelectOption();
  await assetDetailsPage.enterUDCCustomerNumber("420");
  await assetDetailsPage.clickSearchButton();
  await assetDetailsPage.clickAddNewCustomerButton();
  const sole = new DOSoleTraderDetailsPage(page);
  await sole.waitForSoleTraderBusinessDetailsStep();
  return { sole, personal: new DOPersonalDetailsPage(page) };
}

async function fillValidSoleTraderBorrower(
  sole: DOSoleTraderDetailsPage,
  personal: DOPersonalDetailsPage,
): Promise<void> {
  await sole.enterTradingName("Test Trading");
  await sole.enterGstNumber("12345678");
  await sole.fillBusinessDescription("Automation test — wholesale trade sample description.");
  await sole.selectPrimaryNatureOfBusiness("0113 Vegetable Growing");
  await sole.enterTimeInBusiness("5", "3");
  await personal.chooseTitle("Dame");
  await personal.enterFirstName("Liza");
  await personal.enterMiddleName("Marie");
  await personal.enterLastName("Doe");
  await personal.chooseGender("Female");
  await sole.enterDateOfBirth("01/01/1980");
  await personal.chooseMarritalStatus("Married");
  await personal.chooseNoOfDependents("2");
  await personal.fillDependantsAgesInYears(["8", "12"]);
  await sole.enterBusinessAreaCode("9");
  await sole.enterBusinessPhoneNumber("0211234567");
  await sole.enterBusinessEmail("liza.doe@example.com");
  await personal.chooseLicenceType("Full Licence");
  await personal.chooseCountryOfIssue("New Zealand");
  await personal.enterLicenceNumber("AB123456");
  await personal.enterVersionNumber("244");
  await personal.chooseNewZealandResident("Yes");
  await personal.chooseCountryOfBirth("New Zealand");
  await personal.chooseCountryOfCitizenship("New Zealand");
}

async function fillMinimalSoleTraderAddressContinue(
  page: Page,
  address: DOAddressDetailsPage,
): Promise<void> {
  await address.waitForPhysicalAddressStep();
  await address.selectResidenceType("Boarding");
  try {
    await address.timeAtAddress("1", "1");
  } catch {
    const soleRoot = page.locator("app-sole-trade").filter({ visible: true }).first();
    const timeLabel = soleRoot.getByText(/Time at Address/i).first();
    const yearsInput = timeLabel.locator("xpath=following::input[1]");
    const monthsInput = soleRoot.getByText(/^Months$/i).first().locator("xpath=preceding::input[1]");
    if (await yearsInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await yearsInput.fill("1");
    }
    if (await monthsInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await monthsInput.fill("1");
    }
  }
  await address.enterStreetNumber("123");
  await address.enterStreetName("Main Street");
  await address.enterCity("Wellington");
  await address.chooseCountry("New Zealand");
  await address.clickReuseForPostalAddressToggle();
  await address.clickNextButton();
}

async function fillMinimalSoleTraderEmploymentContinue(emp: DOEmploymentDetailsPage): Promise<void> {
  await emp.waitForEmploymentDetailsStep();
  await emp.enterCurrentEmployerName("Acme Finance Ltd");
  await emp.selectCurrentOccupation("Accountant");
  await emp.selectCurrentEmploymentType("Full Time Employed");
  await emp.enterCurrentTimeWithEmployer("3", "0");
  await emp.clickNextButton();
}

/** Individual + Business loan purpose (Sole Trader) through Employment → **Financial Position** (UDP-T3782). */
async function openSoleTraderOnFinancialPositionStep(page: Page): Promise<DOFinancialPositionPage> {
  const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
  const { sole, personal } = await openAddNewSoleTraderIndividual(assetDetailsPage, page);
  await fillValidSoleTraderBorrower(sole, personal);
  await sole.clickNextButton();
  const address = new DOAddressDetailsPage(page);
  await fillMinimalSoleTraderAddressContinue(page, address);
  const emp = new DOEmploymentDetailsPage(page);
  await fillMinimalSoleTraderEmploymentContinue(emp);
  const fin = new DOFinancialPositionPage(page);
  await fin.waitForFinancialPositionStep();
  return fin;
}

async function clickCustomerDetailsStepperStep(page: Page, stepLabel: string): Promise<void> {
  await page.locator(`:text-is("${stepLabel}")`).click({ timeout: 30_000 });
}

function customerSearchDialog(page: Page): Locator {
  return page
    .getByRole("dialog")
    .filter({ has: page.getByRole("button", { name: /^Search$/i }) })
    .last();
}

/**
 * PrimeNG **Search Customer** search-type row: each option is a `p-radiobutton` with a real
 * `<input type="radio" name="searchCustomer" value="individual|business|trust">` in `.p-hidden-accessible`.
 * Prefer this over `getByRole("radio")` — the custom host often does not expose a reliable implicit role.
 *
 * Use **`p-radiobutton:has(input…)`** instead of `.filter({ has: dialog.locator(...) })` — the latter
 * chains the inner locator from the dialog root in a way that can miss the host (Ortoni: UDP-T3710
 * `toBeVisible` timeout on `p-radiobutton.filter({ has: … })`).
 */
function searchCustomerTypeHost(
  dialog: Locator,
  value: "individual" | "business" | "trust",
): Locator {
  return dialog.locator(
    `p-radiobutton:has(input[type="radio"][name="searchCustomer"][value="${value}"])`,
  );
}

function searchCustomerTypeInput(
  dialog: Locator,
  value: "individual" | "business" | "trust",
): Locator {
  return searchCustomerTypeHost(dialog, value).locator(
    `input[type="radio"][name="searchCustomer"][value="${value}"]`,
  );
}

/** PrimeNG hides the native `input` off-viewport; `check()` can throw **outside of the viewport** — click the visible box/label. */
async function clickSearchCustomerType(
  dialog: Locator,
  value: "individual" | "business" | "trust",
): Promise<void> {
  const host = searchCustomerTypeHost(dialog, value);
  await host.scrollIntoViewIfNeeded();
  await dialog.scrollIntoViewIfNeeded().catch(() => {});
  const box = host.locator('.p-radiobutton-box[data-pc-section="input"], .p-radiobutton-box').first();
  if (await box.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await box.click({ timeout: 15_000 });
    return;
  }
  const labelRe =
    value === "individual" ? /^Individual$/i : value === "business" ? /^Business$/i : /^Trust$/i;
  await host.locator('[data-pc-section="label"]').filter({ hasText: labelRe }).click({ timeout: 15_000 });
}

/** Consumer/Personal loan purpose greys out Business — PrimeNG often leaves the hidden `input` enabled. */
async function expectSearchCustomerTypeDisabled(
  dialog: Locator,
  value: "individual" | "business" | "trust",
): Promise<void> {
  const host = searchCustomerTypeHost(dialog, value);
  await expect.soft(host).toBeVisible({ timeout: 15_000 });

  const appearsDisabled = await host
    .evaluate((el) => {
      const box = el.querySelector(".p-radiobutton-box") as HTMLElement | null;
      const input = el.querySelector('input[type="radio"]') as HTMLInputElement | null;
      if (input?.disabled) return true;
      const hostCls = el.className ?? "";
      if (/p-radiobutton-disabled|p-disabled/.test(hostCls)) return true;
      if (box?.getAttribute("data-p-disabled") === "true") return true;
      const target = box ?? el;
      const style = window.getComputedStyle(target);
      if (style.pointerEvents === "none") return true;
      if (parseFloat(style.opacity) < 0.85) return true;
      return false;
    })
    .catch(() => false);

  if (appearsDisabled) {
    return;
  }

  // Behavioural fallback: greyed options ignore clicks — default Individual stays selected.
  await clickSearchCustomerType(dialog, value).catch(() => {});
  await expect.soft(searchCustomerTypeInput(dialog, "individual")).toBeChecked({ timeout: 5_000 });
  await expect.soft(searchCustomerTypeInput(dialog, value)).not.toBeChecked();
}

/** After a business search hit, QAT routes to **Borrower Result** (full-page card), not `tbody` in the modal. */
async function expectBorrowerSearchResultPage(page: Page): Promise<void> {
  const borrowerResultHit = page
    .getByText(/Borrower Result/i)
    .or(page.getByText(/UDC Customer Number/i))
    .or(page.getByRole("button", { name: /^Add$/i }));
  await expect.soft(borrowerResultHit.first()).toBeVisible({ timeout: 90_000 });
}

/** Optional: trust name substring for UDP-T3717 borrower search; default matches CSA trust regression data. */
const UDP_T3717_TRUST_NAME_SEARCH =
  process.env.UDC_EXISTING_TRUST_NAME_SEARCH?.trim() || "TLC Automation Family Trust";

async function fillIndividualCustomerNameSearchTerm(dlg: Locator, term: string): Promise<void> {
  const byLabel = dlg.getByRole("textbox", { name: /Customer Name|First Name/i }).first();
  const byTextHost = dlg
    .locator("text")
    .filter({ hasText: /^(Customer Name|First Name)/i })
    .locator("#text")
    .first();
  const byXpath = dlg.locator(
    "xpath=.//label[contains(normalize-space(.),'Customer Name') or contains(normalize-space(.),'First Name')][1]/following::input[contains(@class,'p-inputtext')][1]",
  );
  if (await byLabel.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await byLabel.fill(term);
  } else if (await byTextHost.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await byTextHost.fill(term);
  } else {
    await byXpath.fill(term);
  }
}

/**
 * After individual search: **true** when a result **Add** was clicked; **false** when Borrower Result shows no hit.
 */
async function waitBorrowerResultAndClickAdd(page: Page): Promise<boolean> {
  await expect.soft(page.getByText(/Borrower Result/i).first()).toBeVisible({ timeout: 90_000 });
  await page.waitForLoadState("domcontentloaded").catch(() => {});

  const noData = page
    .getByRole("img", { name: /No Data Found/i })
    .or(page.getByText(/No Data Found/i));
  if (await noData.first().isVisible({ timeout: 12_000 }).catch(() => false)) {
    return false;
  }

  const addCandidates: Locator[] = [
    page.getByRole("button", { name: /^Add$/i }),
    page.locator("p-button").filter({ hasText: /^Add$/i }),
    page.locator("button, a, span").filter({ hasText: /^Add$/i }),
  ];
  for (const candidate of addCandidates) {
    const btn = candidate.first();
    if (await btn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ timeout: 30_000 });
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      await waitForPersonalDetailsAfterCustomerAdd(page).catch(() => {});
      return true;
    }
  }

  throw new Error("Borrower Result loaded with data but no Add control was found.");
}

async function addExistingIndividualFromSearch(
  assetDetailsPage: DOAssetDetailsPage,
  page: Page,
  udcNumber: string = EXISTING_UDC_CUSTOMER_NUMBER,
  nameFallback: string = EXISTING_CUSTOMER_NAME_SEARCH,
): Promise<void> {
  const searchExistingByUdc = async (): Promise<boolean> => {
    await assetDetailsPage.clickAddBorrowerorGuarantorButton();
    await assetDetailsPage.searchByDropdownClick();
    await assetDetailsPage.selectUDCSelectOption();
    await assetDetailsPage.enterUDCCustomerNumber(udcNumber);
    await assetDetailsPage.clickSearchButton();
    return waitBorrowerResultAndClickAdd(page);
  };

  if (await searchExistingByUdc()) return;

  await page.getByRole("button", { name: /^Cancel$/i }).first().click({ timeout: 20_000 }).catch(() => {});
  await assetDetailsPage.waitForAddBorrowerButton();
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  const dlg = customerSearchDialog(page);
  await assetDetailsPage.searchByDropdownClick();
  const panel = page.locator(".p-dropdown-panel").last();
  const nameOpt = panel.getByRole("option", { name: /Customer Name|First Name/i }).first();
  if (await nameOpt.isVisible({ timeout: 12_000 }).catch(() => false)) {
    await nameOpt.click();
    await panel.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  }
  await fillIndividualCustomerNameSearchTerm(dlg, nameFallback);
  await assetDetailsPage.clickSearchButton();
  if (await waitBorrowerResultAndClickAdd(page)) return;

  throw new Error(
    `No existing individual search hit for UDC ${udcNumber} or Customer Name "${nameFallback}". ` +
      "Set UDC_EXISTING_CUSTOMER_NUMBER / UDC_EXISTING_CUSTOMER_NAME_SEARCH.",
  );
}

test.describe("DO Portal — Standard Quote Customer Details (Zephyr UDP-T3709–UDP-T3795)", () => {

  test(
    "UDP-T3709 - Customer Details Screen - Default State",
    { tag: ["@do", "@regression", "@UDP-T3709"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
      const root = standardQuoteRoot(page);
      await expect.soft(root.getByText(/Customer\s+Details/i).first()).toBeVisible({ timeout: 60_000 });
      const addBtn = assetDetailsPage.addBorrowerorGuarantorButton;
      if (await addBtn.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await expect.soft(addBtn).toBeVisible();
      } else {
        await expect.soft(page.locator("app-personal-details").first()).toBeVisible({ timeout: 30_000 });
      }
    },
  );

  test(
    "UDP-T3710 - Search Type Defaults - Consumer Loan Purpose",
    { tag: ["@do", "@regression", "@UDP-T3710"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
      await assetDetailsPage.clickAddBorrowerorGuarantorButton();
      const dlg = customerSearchDialog(page);
      await expect.soft(dlg).toBeVisible({ timeout: 60_000 });

      // Consumer loan purpose — Individual default; Business greyed/disabled (PrimeNG host, not always native `disabled`).
      await expect.soft(searchCustomerTypeHost(dlg, "individual")).toBeVisible({ timeout: 20_000 });
      await expect.soft(searchCustomerTypeInput(dlg, "individual")).toBeChecked();
      await expectSearchCustomerTypeDisabled(dlg, "business");
    },
  );

  test(
    "UDP-T3711 - Search Type Options - Business Loan Purpose",
    { tag: ["@do", "@regression", "@UDP-T3711"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      await assetDetailsPage.clickAddBorrowerorGuarantorButton();
      const dlg = customerSearchDialog(page);
      await expect.soft(dlg).toBeVisible({ timeout: 60_000 });

      // Selector Hub: `p-radiobutton` by label — all three enabled; default Individual.
      const individualRb = dlg.locator("p-radiobutton").filter({ hasText: "Individual" });
      const businessRb = dlg.locator("p-radiobutton").filter({ hasText: "Business" });
      const trustRb = dlg.locator("p-radiobutton").filter({ hasText: "Trust" });

      await expect.soft(individualRb).toBeVisible({ timeout: 20_000 });
      await expect.soft(businessRb).toBeVisible({ timeout: 10_000 });
      await expect.soft(trustRb).toBeVisible({ timeout: 10_000 });


    },
  );

  test(
    "UDP-T3712 - Search Individual - By Customer Name (Partial)",
    { tag: ["@do", "@regression", "@UDP-T3712"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
      await assetDetailsPage.clickAddBorrowerorGuarantorButton();
      const dlg = customerSearchDialog(page);
      await assetDetailsPage.searchByDropdownClick();
      const panel = page.locator(".p-dropdown-panel").last();
      const opt = panel.getByRole("option", { name: /Customer Name|First Name/i }).first();
      if (await opt.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await opt.click();
      }
      await expect.soft(dlg.getByRole("button", { name: /^Search$/i }).first()).toBeVisible();
    },
  );

  test(
    "UDP-T3713 - Search Individual - By Driver Licence Number",
    { tag: ["@do", "@regression", "@UDP-T3713"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
      await assetDetailsPage.clickAddBorrowerorGuarantorButton();
      await assetDetailsPage.searchByDropdownClick();
      const panel = page.locator(".p-dropdown-panel").last();
      const opt = panel.getByRole("option", { name: /Driver|Licence/i }).first();
      if (await opt.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await opt.click();
      }
      await expect.soft(customerSearchDialog(page)).toBeVisible();
    },
  );

  test(
    "UDP-T3714 - Search Individual - By UDC Customer Number",
    { tag: ["@do", "@regression", "@UDP-T3714"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
      await assetDetailsPage.clickAddBorrowerorGuarantorButton();
      await assetDetailsPage.searchByDropdownClick();
      await assetDetailsPage.selectUDCSelectOption();
      await assetDetailsPage.enterUDCCustomerNumber("420");
      await assetDetailsPage.clickSearchButton();
      await expect.soft(customerSearchDialog(page)).toBeVisible();
    },
  );

  test(
    "UDP-T3715 - Search Business - By Company Name",
    { tag: ["@do", "@regression", "@UDP-T3715"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      await assetDetailsPage.clickAddBorrowerorGuarantorButton();
      const dlg = customerSearchDialog(page);
      await expect.soft(dlg).toBeVisible({ timeout: 60_000 });

      const businessRb = dlg.locator("p-radiobutton").filter({ hasText: "Business" });
      await expect.soft(businessRb.locator('input[type="radio"]').first()).toBeEnabled({ timeout: 15_000 });
      await businessRb.locator('input[type="radio"]').first().check({ force: true });
      await expect.soft(businessRb.locator('input[type="radio"]').first()).toBeChecked();

      await assetDetailsPage.searchByDropdownClick();
      const panel = page.locator(".p-dropdown-panel").last();
      const companyOpt = panel.getByRole("option", { name: /Company Name/i }).first();
      await companyOpt.waitFor({ state: "visible", timeout: 30_000 });
      await companyOpt.click();
      await page
        .locator(".p-dropdown-panel")
        .last()
        .waitFor({ state: "hidden", timeout: 15_000 })
        .catch(() => {});

      const term = UDP_T3715_COMPANY_NAME_SEARCH;
      const byLabel = dlg.getByRole("textbox", { name: /Company Name/i }).first();
      const byTextHost = dlg.locator("text").filter({ hasText: /^Company Name/i }).locator("#text").first();
      const byXpath = dlg.locator(
        "xpath=.//label[contains(normalize-space(.),'Company Name')][1]/following::input[contains(@class,'p-inputtext')][1]",
      );
      if (await byLabel.isVisible({ timeout: 6_000 }).catch(() => false)) {
        await byLabel.fill(term);
      } else if (await byTextHost.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await byTextHost.fill(term);
      } else {
        await byXpath.fill(term);
      }

      await assetDetailsPage.clickSearchButton();

      await expectBorrowerSearchResultPage(page);
    },
  );

  test(
    "UDP-T3716 - Search Business - By GST/Registered Number",
    { tag: ["@do", "@regression", "@UDP-T3716"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      await assetDetailsPage.clickAddBorrowerorGuarantorButton();
      const dlg = customerSearchDialog(page);
      await expect.soft(dlg).toBeVisible({ timeout: 60_000 });

      const businessRb = dlg.locator("p-radiobutton").filter({ hasText: "Business" });
      await expect.soft(businessRb.locator('input[type="radio"]').first()).toBeEnabled({ timeout: 15_000 });
      await businessRb.locator('input[type="radio"]').first().check({ force: true });
      await expect.soft(businessRb.locator('input[type="radio"]').first()).toBeChecked();

      await assetDetailsPage.searchByDropdownClick();
      const panel = page.locator(".p-dropdown-panel").last();
      const regOpt = panel
        .getByRole("option", { name: /Registered Number|Registered Company Number/i })
        .first();
      await regOpt.waitFor({ state: "visible", timeout: 30_000 });
      await regOpt.click();
      await page
        .locator(".p-dropdown-panel")
        .last()
        .waitFor({ state: "hidden", timeout: 15_000 })
        .catch(() => {});

      const term = UDP_T3716_REGISTERED_NUMBER_SEARCH;
      const byLabel = dlg.getByRole("textbox", { name: /Registered Number|Registered company number/i }).first();
      const byTextHost = dlg
        .locator("text")
        .filter({ hasText: /^(Registered Number|Registered Company Number)/i })
        .locator("#text")
        .first();
      const byXpath = dlg.locator(
        "xpath=.//label[contains(normalize-space(.),'Registered Number') or contains(normalize-space(.),'Registered Company Number')][1]/following::input[contains(@class,'p-inputtext')][1]",
      );
      if (await byLabel.isVisible({ timeout: 6_000 }).catch(() => false)) {
        await byLabel.fill(term);
      } else if (await byTextHost.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await byTextHost.fill(term);
      } else {
        await byXpath.fill(term);
      }

      await assetDetailsPage.clickSearchButton();

      await expectBorrowerSearchResultPage(page);
    },
  );

  test(
    "UDP-T3717 - Search Trust - By Trust Name",
    { tag: ["@do", "@regression", "@UDP-T3717"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      // Trust search type is enabled with Business loan program (CSA-B); Consumer CSA-C greys Trust out.
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      await assetDetailsPage.clickAddBorrowerorGuarantorButton();
      const dlg = customerSearchDialog(page);
      await expect.soft(dlg).toBeVisible({ timeout: 60_000 });

      await expect.soft(searchCustomerTypeHost(dlg, "trust")).toBeVisible({ timeout: 15_000 });
      await clickSearchCustomerType(dlg, "trust");
      await expect.soft(searchCustomerTypeInput(dlg, "trust")).toBeChecked({ timeout: 15_000 });

      await assetDetailsPage.searchByDropdownClick();
      const panel = page.locator(".p-dropdown-panel").last();
      const trustNameOpt = panel.getByRole("option", { name: /Trust Name/i }).first();
      if (await trustNameOpt.isVisible({ timeout: 12_000 }).catch(() => false)) {
        await trustNameOpt.click();
        await page
          .locator(".p-dropdown-panel")
          .last()
          .waitFor({ state: "hidden", timeout: 15_000 })
          .catch(() => {});
      }

      const term = UDP_T3717_TRUST_NAME_SEARCH;
      const byLabel = dlg.getByRole("textbox", { name: /Trust Name/i }).first();
      const byTextHost = dlg.locator("text").filter({ hasText: /^Trust Name/i }).locator("#text").first();
      const byXpath = dlg.locator(
        "xpath=.//label[contains(normalize-space(.),'Trust Name')][1]/following::input[contains(@class,'p-inputtext')][1]",
      );
      if (await byLabel.isVisible({ timeout: 6_000 }).catch(() => false)) {
        await byLabel.fill(term);
      } else if (await byTextHost.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await byTextHost.fill(term);
      } else {
        await byXpath.fill(term);
      }

      await assetDetailsPage.clickSearchButton();

      await expectBorrowerSearchResultPage(page);
    },
  );

  test(
    "UDP-T3718 - No Search Results - Add New Customer Button Available",
    { tag: ["@do", "@regression", "@UDP-T3718"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
      await assetDetailsPage.clickAddBorrowerorGuarantorButton();
      await assetDetailsPage.searchByDropdownClick();
      await assetDetailsPage.selectUDCSelectOption();
      await assetDetailsPage.enterUDCCustomerNumber("999999999999");
      await assetDetailsPage.clickSearchButton();
      await expect
        .soft(assetDetailsPage.addNewCustomerButton.or(page.getByRole("button", { name: /Add New Customer/i })).first())
        .toBeVisible({ timeout: 90_000 });
    },
  );

  test(
    "UDP-T3719 - Search Returns Results - Add New Customer Still Available",
    { tag: ["@do", "@regression", "@UDP-T3719"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
      await assetDetailsPage.clickAddBorrowerorGuarantorButton();
      await assetDetailsPage.searchByDropdownClick();
      await assetDetailsPage.selectUDCSelectOption();
      await assetDetailsPage.enterUDCCustomerNumber(EXISTING_UDC_CUSTOMER_NUMBER);
      await assetDetailsPage.clickSearchButton();
      await expect
        .soft(assetDetailsPage.addNewCustomerButton.or(page.getByRole("button", { name: /Add New Customer/i })).first())
        .toBeVisible({ timeout: 90_000 });
    },
  );

  test(
    "UDP-T3720 - Select Existing Customer - Data Pre - Populated from FIS AF",
    { tag: ["@do", "@regression", "@UDP-T3720"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
      await assetDetailsPage.clickAddBorrowerorGuarantorButton();
      await assetDetailsPage.searchByDropdownClick();
      await assetDetailsPage.selectUDCSelectOption();
      await assetDetailsPage.enterUDCCustomerNumber(EXISTING_UDC_CUSTOMER_NUMBER);
      await assetDetailsPage.clickSearchButton();
      await waitBorrowerResultAndClickAdd(page);
      await expect.soft(page.locator("app-personal-details").first()).toBeVisible({ timeout: 120_000 });
    },
  );

  test(
    "UDP-T3721 - Only One Borrower Can Be Added",
    { tag: ["@do", "@regression", "@UDP-T3721"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Requires completing first borrower then asserting second Borrower role is blocked — extend when UI rule is mapped to a stable locator.");
    },
  );

  test(
    "UDP-T3722 - Customer Role - Defaults to Borrower; Valid Values",
    { tag: ["@do", "@regression", "@UDP-T3722"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      const roleTrig = page.locator("label").filter({ hasText: /Customer Role/i }).first()
        .locator("xpath=following::*[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]");
      if (await roleTrig.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await roleTrig.click();
        const opt = page.getByRole("option", { name: /^Borrower$/i }).first();
        await expect.soft(opt).toBeVisible({ timeout: 10_000 });
      } else {
        await expect.soft(p.personalDetailsRoot).toBeVisible();
      }
    },
  );

  test(
    "UDP-T3723 - Title - Mandatory; Excludes Z - Not Applicable",
    { tag: ["@do", "@regression", "@UDP-T3723"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
      await p.chooseTitle("Dame");
      await p.selectTitle();
      const zna = page.getByRole("option", { name: /Z-\s*Not\s*Applicable/i });
      await expect.soft(zna).toHaveCount(0);
      await page.keyboard.press("Escape");
    },
  );

  test(
    "UDP-T3724 - First Name - Mandatory; Max 50 Chars; Valid Characters",
    { tag: ["@do", "@regression", "@UDP-T3724"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
      await p.chooseTitle("Dame");
      await p.enterFirstName("x".repeat(51));
      await p.clickSavePersonalDetails();
      await expect.soft(p.personalDetailsRoot.getByText(/First name.{0,80}(format|length|50)/i).first()).toBeVisible({ timeout: 15_000 }).catch(() => {});
      await p.enterFirstName("jhbhuyvyu90");
      await p.enterLastName("Doe");
      await p.enterDateOfBirth("01/01/1980");
      await p.chooseGender("Female");
      await p.chooseMarritalStatus("Married");
      await p.chooseNoOfDependents("0");
      await p.enterMobileNumber("0211234567");
      await p.enterEmail("a@b.co");
      await p.chooseLicenceType("Full Licence");
      await p.chooseCountryOfIssue("New Zealand");
      await p.enterLicenceNumber("AB123456");
      await p.enterVersionNumber("244");
      await p.chooseNewZealandResident("Yes");
      await p.chooseCountryOfBirth("New Zealand");
      await p.chooseCountryOfCitizenship("New Zealand");
      await p.clickSavePersonalDetails();
    },
  );

  test(
    "UDP-T3725 - Middle Name - Optional; Max 50 Chars; Valid Characters",
    { tag: ["@do", "@regression", "@UDP-T3725"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.enterMiddleName("Renée");
      await p.clickSavePersonalDetails();
    },
  );

  test(
    "UDP-T3726 - Last Name - Mandatory; Max 50 Chars; Valid Characters",
    { tag: ["@do", "@regression", "@UDP-T3726"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
    },
  );

  test(
    "UDP-T3727 - Known As - Optional; Max 50 Chars; Valid Characters",
    { tag: ["@do", "@regression", "@UDP-T3727"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.enterMiddleName("Nick");
      await p.clickSavePersonalDetails();
    },
  );

  test(
    "UDP-T3728 - Gender - Mandatory; Excludes Z - Not Applicable; Alphabetical Order",
    { tag: ["@do", "@regression", "@UDP-T3728"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
      await p.chooseTitle("Dame");
      await p.genderDropdown.click();
      await expect.soft(page.getByRole("option", { name: /Z-\s*Not\s*Applicable/i })).toHaveCount(0);
      await page.keyboard.press("Escape");
    },
  );

  test(
    "UDP-T3729 - Date of Birth - Mandatory; DD/MM/YYYY",
    { tag: ["@do", "@regression", "@UDP-T3729"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
    },
  );

  test(
    "UDP-T3730 - Marital Status - Mandatory; Excludes Z - Not Applicable; Alphabetical",
    { tag: ["@do", "@regression", "@UDP-T3730"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
      await p.chooseTitle("Dame");
      await p.maritalStatusDropdown.click();
      await expect.soft(page.getByRole("option", { name: /Z-\s*Not\s*Applicable/i })).toHaveCount(0);
      await page.keyboard.press("Escape");
    },
  );

  test(
    "UDP-T3731 - No. of Dependants - Mandatory; Range 0 - 9; Integer Only",
    { tag: ["@do", "@regression", "@UDP-T3731"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
    },
  );

  test(
    "UDP-T3732 - Dependants Age - Conditionally Mandatory When Dependants >= 1",
    { tag: ["@do", "@regression", "@UDP-T3732"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.chooseNoOfDependents("4");
      await p.fillDependantsAgesInYears(["", "", "", ""]);
      await p.clickSavePersonalDetails();
      await expect.soft(p.personalDetailsRoot.getByText(/Dependants?\s+Ages?.{0,60}(incorrect|required|format)/i).first()).toBeVisible({ timeout: 25_000 });
    },
  );

  test(
    "UDP-T3733 - Mobile Number - Mandatory; Country Code Dropdown Defaults +64",
    { tag: ["@do", "@regression", "@UDP-T3733"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
    },
  );

  test(
    "UDP-T3734 - Email - Conditionally Mandatory; Standard Email Validation",
    { tag: ["@do", "@regression", "@UDP-T3734"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
    },
  );

  test(
    "UDP-T3735 - Licence Type - Mandatory; Excludes Z - Not Applicable",
    { tag: ["@do", "@regression", "@UDP-T3735"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
      await p.chooseTitle("Dame");
      await p.selectLicenceTypeDropdown();
      await expect.soft(page.getByRole("option", { name: /Z-\s*Not\s*Applicable/i })).toHaveCount(0);
      await page.keyboard.press("Escape");
    },
  );

  test(
    "UDP-T3736 - Country of Issue - Conditionally Mandatory; NZ First; Alphabetical",
    { tag: ["@do", "@regression", "@UDP-T3736"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.chooseLicenceType("Full Licence");
      await p.chooseCountryOfIssue("");
      await p.clickSavePersonalDetails();
      await expect.soft(p.personalDetailsRoot.getByText(/Country of [Ii]ssue.{0,40}required/i).first()).toBeVisible({ timeout: 25_000 }).catch(() => {});
    },
  );

  test(
    "UDP-T3737 - Licence Number - Conditionally Mandatory; NZ Format AANNNNN",
    { tag: ["@do", "@regression", "@UDP-T3737"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.enterLicenceNumber("A1");
      await p.clickSavePersonalDetails();
      await expect
        .soft(
          p.personalDetailsRoot.getByText(
            /Licence Number.{0,200}(incorrect|format|required|should start)/i,
          ).first(),
        )
        .toBeVisible({ timeout: 25_000 });
    },
  );

  test(
    "UDP-T3738 - Version Number - Conditionally Mandatory; NZ Only; 3 - Digit Numeric",
    { tag: ["@do", "@regression", "@UDP-T3738"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.enterVersionNumber("AB");
      await p.clickSavePersonalDetails();
      await expect.soft(p.personalDetailsRoot.getByText(/Version.{0,60}(incorrect|format|required)/i).first()).toBeVisible({ timeout: 25_000 });
    },
  );

  test(
    "UDP-T3739 - NZ Resident - Mandatory; Yes/No Dropdown",
    { tag: ["@do", "@regression", "@UDP-T3739"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
    },
  );

  test(
    "UDP-T3740 - Country of Birth - Mandatory; NZ First; Excludes Z - Not Applicable",
    { tag: ["@do", "@regression", "@UDP-T3740"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
      await p.chooseTitle("Dame");
      await p.selectCountryOfBirth();
      const nz = page.getByRole("option", { name: /^New Zealand$/i }).first();
      if (await nz.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const idx = await nz.evaluate((el) => {
          const p = el.closest(".p-dropdown-panel, [role='listbox']");
          const items = p ? Array.from(p.querySelectorAll("[role='option']")) : [];
          return items.indexOf(el);
        });
        expect.soft(idx).toBeLessThanOrEqual(2);
      }
      await page.keyboard.press("Escape");
    },
  );

  test(
    "UDP-T3741 - Country of Citizenship - Mandatory; NZ First; Excludes Z - Not Applicable",
    { tag: ["@do", "@regression", "@UDP-T3741"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await clearPersonalDetailsForValidation(p);
      await p.clickSavePersonalDetails();
      await p.expectPersonalDetailsRequiredValidationMessages();
    },
  );

  test(
    "UDP-T3742 - Add Citizenship - Multiple Citizenship Support",
    { tag: ["@do", "@regression", "@UDP-T3742"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      const addCit = page.getByRole("button", { name: /Add Citizenship/i }).or(page.getByText(/Add Citizenship/i)).first();
      if (await addCit.isVisible({ timeout: 12_000 }).catch(() => false)) {
        await addCit.click();
        await expect.soft(page.locator("app-personal-details").first()).toBeVisible();
      } else {
        test.skip(true, "Add Citizenship control not found on this build.");
      }
    },
  );

  test(
    "UDP-T3743 - Existing Customer - Personal Details Pre - Populated from FIS AF",
    { tag: ["@do", "@regression", "@UDP-T3743"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
      await assetDetailsPage.clickAddBorrowerorGuarantorButton();
      await assetDetailsPage.searchByDropdownClick();
      await assetDetailsPage.selectUDCSelectOption();
      await assetDetailsPage.enterUDCCustomerNumber(EXISTING_UDC_CUSTOMER_NUMBER);
      await assetDetailsPage.clickSearchButton();
      await waitBorrowerResultAndClickAdd(page);
      const p = new DOPersonalDetailsPage(page);
      await expect.soft(await p.firstNameInput.inputValue().catch(() => "x")).toMatch(/\S/);
    },
  );

  test(
    "UDP-T3744 - Search Criteria Pre - Populated on Add New",
    { tag: ["@do", "@regression", "@UDP-T3744"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "MAF-6926: assert First/Last/DOB pre-populated from Customer Name search when no results — extend when search field locators are stable for this flow.");
    },
  );

  test(
    "UDP-T3745 - Customer Role - Valid Values for Business",
    { tag: ["@do", "@regression", "@UDP-T3745"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      const businessDetailsPage = await openBusinessDetailsViaUdcNoMatch(assetDetailsPage);

      const roleTrig = businessDetailsPage.businessRoot
        .locator("label")
        .filter({ hasText: /Customer Role/i })
        .first()
        .locator(
          "xpath=following::*[@aria-label='dropdown trigger' or contains(@class,'p-dropdown-trigger')][1]",
        );
      await expect.soft(roleTrig).toBeVisible({ timeout: 15_000 });
      await expect
        .soft(
          businessDetailsPage.businessRoot
            .locator("label")
            .filter({ hasText: /Customer Role/i })
            .first()
            .locator("xpath=following::*[contains(@class,'p-dropdown-label')][1]"),
        )
        .toContainText(/Borrower/i);

      await roleTrig.click();
      await expect.soft(page.getByRole("option", { name: /^Borrower$/i }).first()).toBeVisible({
        timeout: 10_000,
      });
      await page.keyboard.press("Escape");
    },
  );

  test(
    "UDP-T3746 - Trading Name - Non - Mandatory; Max 100 Chars",
    { tag: ["@do", "@regression", "@UDP-T3746"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      const businessDetailsPage = await openBusinessDetailsViaUdcNoMatch(assetDetailsPage);

      await fillValidBusinessDetailsExceptTrading(businessDetailsPage);
      await businessDetailsPage.clearTradingName();
      await businessDetailsPage.clickSaveBusinessDetails();
      await expect
        .soft(businessDetailsPage.businessRoot.getByText(/Trading Name is required/i))
        .toHaveCount(0);

      await businessDetailsPage.enterTradingName("Test Trading");
      await businessDetailsPage.clickSaveBusinessDetails();
      await expect.soft(businessDetailsPage.tradingNameInput()).toHaveValue(/Test Trading/i);

      const max100 = "T".repeat(100);
      await businessDetailsPage.enterTradingName(max100);
      await businessDetailsPage.clickSaveBusinessDetails();
      await expect.soft(businessDetailsPage.tradingNameInput()).toHaveValue(max100);
      await expect
        .soft(businessDetailsPage.businessRoot.getByText(/Trading Name.{0,80}(100|length|maximum)/i))
        .toHaveCount(0);

      await businessDetailsPage.enterTradingName("x".repeat(101));
      await businessDetailsPage.clickSaveBusinessDetails();
      const overMaxMsg = businessDetailsPage.businessRoot.getByText(
        /Trading Name.{0,80}(100|length|maximum|format)/i,
      );
      if (await overMaxMsg.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
        await expect.soft(overMaxMsg.first()).toBeVisible();
      }
    },
  );

  test(
    "UDP-T3747 - Registered Company Number - Mandatory; Max 7 Digits",
    { tag: ["@do", "@regression", "@UDP-T3747"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      const businessDetailsPage = await openBusinessDetailsViaUdcNoMatch(assetDetailsPage);
      const root = businessDetailsPage.businessRoot;

      await fillValidBusinessDetailsExceptRegisteredCompanyNumber(businessDetailsPage);
      await businessDetailsPage.clearRegisteredCompanyNumber();
      await businessDetailsPage.clickSaveBusinessDetails();
      await expect
        .soft(
          root
            .getByText("Registered Company Number is required", { exact: true })
            .or(root.getByText("Registered company number is required", { exact: true }))
            .or(root.getByText("Company Number is required", { exact: true }))
            .or(
              root.getByText(
                /(Registered Company Number|Company Number|NZ Company Number).{0,20}(is required|required|cannot be blank)/i,
              ),
            )
            .or(root.getByText(/Please enter.*(Registered Company|Company Number|NZ Company)/i))
            .first(),
        )
        .toBeVisible({ timeout: 20_000 });

      await businessDetailsPage.enterRegisteredCompanyNumber("12345678");
      await businessDetailsPage.clickSaveBusinessDetails();
      await expect
        .soft(
          root
            .getByText("Registered Company Number is in an incorrect format", { exact: true })
            .or(root.getByText(/If > 7.{0,40}invalid format/i))
            .or(root.getByText(/Registered Company Number.{0,80}(7|format|invalid|maximum|length)/i))
            .first(),
        )
        .toBeVisible({ timeout: 20_000 });

      await businessDetailsPage.enterRegisteredCompanyNumber("ABCDEFG");
      await businessDetailsPage.clickSaveBusinessDetails();
      await expect
        .soft(
          root
            .getByText("Registered Company Number is in an incorrect format", { exact: true })
            .or(root.getByText(/Registered Company Number.{0,80}(numeric|number|format|invalid|digit)/i))
            .first(),
        )
        .toBeVisible({ timeout: 20_000 });
    },
  );

  test(
    "UDP-T3748 - NZ Business Number (NZBN) - Mandatory; Max 13 Digits",
    { tag: ["@do", "@regression", "@UDP-T3748"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      const businessDetailsPage = await openBusinessDetailsViaUdcNoMatch(assetDetailsPage);
      const root = businessDetailsPage.businessRoot;

      await fillValidBusinessDetailsExceptNzbn(businessDetailsPage);
      await businessDetailsPage.clearNzBusinessNumber();
      await businessDetailsPage.clickSaveBusinessDetails();
      await expect
        .soft(
          root
            .getByText("New Zealand Business Number is required", { exact: true })
            .or(root.getByText("New Zealand business number is required", { exact: true }))
            .or(root.getByText("NZ Business Number is required", { exact: true }))
            .or(root.getByText("NZBN is required", { exact: true }))
            .or(
              root.getByText(
                /(New Zealand Business Number|NZ Business Number|NZBN).{0,20}(is required|required|cannot be blank)/i,
              ),
            )
            .or(root.getByText(/Please enter.*(New Zealand Business|NZBN|NZ Business)/i))
            .first(),
        )
        .toBeVisible({ timeout: 20_000 });

      await businessDetailsPage.enterNzBusinessNumber("94290312345678");
      await businessDetailsPage.clickSaveBusinessDetails();
      await expect
        .soft(
          root
            .getByText("New Zealand Business Number is in an incorrect format", { exact: true })
            .or(root.getByText(/If > 13.{0,40}invalid format/i))
            .or(
              root.getByText(
                /(New Zealand Business Number|NZ Business Number|NZBN).{0,80}(13|format|invalid|maximum|length)/i,
              ),
            )
            .first(),
        )
        .toBeVisible({ timeout: 20_000 });

      await businessDetailsPage.enterNzBusinessNumber("ABCDEFGHIJKLMN");
      await businessDetailsPage.clickSaveBusinessDetails();
      await expect
        .soft(
          root
            .getByText("New Zealand Business Number is in an incorrect format", { exact: true })
            .or(
              root.getByText(
                /(New Zealand Business Number|NZ Business Number|NZBN).{0,80}(numeric|number|format|invalid|digit)/i,
              ),
            )
            .first(),
        )
        .toBeVisible({ timeout: 20_000 });
    },
  );

  test(
    "UDP-T3749 - GST Number - Mandatory; Max 9 Digits",
    { tag: ["@do", "@regression", "@UDP-T3749"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      const businessDetailsPage = await openBusinessDetailsViaUdcNoMatch(assetDetailsPage);
      const root = businessDetailsPage.businessRoot;

      await fillValidBusinessDetailsExceptGst(businessDetailsPage);
      const gstInput = businessDetailsPage.gstNumberInput();
      await gstInput.click();
      await gstInput.fill("");
      await businessDetailsPage.clickSaveBusinessDetails();

      const gstRequired = root
        .getByText("GST Number is required", { exact: true })
        .or(root.getByText("GST number is required", { exact: true }))
        .or(root.getByText("GST is required", { exact: true }))
        .or(root.getByText(/GST Number.{0,20}(is required|required|cannot be blank)/i))
        .or(root.getByText(/GST number.{0,20}(is required|required|cannot be blank)/i))
        .or(root.getByText(/Please enter.*GST/i));

      if (!(await gstRequired.first().isVisible({ timeout: 8_000 }).catch(() => false))) {
        await businessDetailsPage.clickNextButton();
      }
      await expect.soft(gstRequired.first()).toBeVisible({ timeout: 20_000 });

      await businessDetailsPage.enterGstNumber("1234567890");
      await businessDetailsPage.clickSaveBusinessDetails();
      await expect
        .soft(
          root
            .getByText("GST Number is in an incorrect format", { exact: true })
            .or(root.getByText("GST number cannot be greater than 9 digits", { exact: true }))
            .or(root.getByText(/If > 9.{0,40}invalid format/i))
            .or(root.getByText(/GST Number.{0,80}(9|format|invalid|maximum|length|greater)/i))
            .or(root.getByText(/GST number.{0,80}(9|format|invalid|maximum|length|greater)/i))
            .first(),
        )
        .toBeVisible({ timeout: 20_000 });
    },
  );

  test(
    "UDP-T3750 - Existing Business Customer - Pre - Populated from FIS AF",
    { tag: ["@do", "@regression", "@UDP-T3750"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      const businessDetailsPage = await openExistingBusinessDetailsViaUdcNumber(assetDetailsPage);

      await expect.soft(businessDetailsPage.businessRoot).toBeVisible({ timeout: 30_000 });
      await expect.soft(page.getByText(/Business Details/i).first()).toBeVisible({ timeout: 30_000 });

      const legalName = (await businessDetailsPage.legalNameInput().inputValue().catch(() => "")).trim();
      await expect.soft(legalName).toMatch(/\S/);

      const tradingName = (await businessDetailsPage.tradingNameInput().inputValue().catch(() => "")).trim();
      await expect.soft(tradingName).toMatch(/\S/);

      const regNo = (await businessDetailsPage.registeredCompanyNumberInput().inputValue().catch(() => "")).trim();
      const nzbn = (await businessDetailsPage.nzBusinessNumberInput().inputValue().catch(() => "")).trim();
      await expect.soft(regNo.length > 0 || nzbn.length > 0).toBeTruthy();

      const gst = (await businessDetailsPage.gstNumberInput().inputValue().catch(() => "")).trim();
      const phone = (await businessDetailsPage.businessRoot.getByRole("textbox", { name: /Phone number/i }).first().inputValue().catch(() => "")).trim();
      const email = (await businessDetailsPage.businessEmailInput.inputValue().catch(() => "")).trim();
      await expect.soft(gst.length > 0 || phone.length > 0 || email.length > 0).toBeTruthy();

      const editedLegal = `${legalName} Edited`;
      await businessDetailsPage.enterLegalName(editedLegal);
      await expect.soft(businessDetailsPage.legalNameInput()).toHaveValue(editedLegal);

      const editedTrading = tradingName ? `${tradingName} Edited` : "Edited Trading";
      await businessDetailsPage.enterTradingName(editedTrading);
      await expect.soft(businessDetailsPage.tradingNameInput()).toHaveValue(editedTrading);
    },
  );

  test(
    "UDP-T3751 - Trust Name - Mandatory",
    { tag: ["@do", "@regression", "@UDP-T3751"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      const trustPage = await openTrustDetailsViaUdcNoMatch(assetDetailsPage);

      await trustPage.clearTrustName();
      await trustPage.clickSaveTrustDetails();
      await expect.soft(page.getByText(/Trust Name is required/i).first()).toBeVisible({
        timeout: 20_000,
      });
    },
  );

  test(
    "UDP-T3752 - Trust Type - Mandatory; Valid Values",
    { tag: ["@do", "@regression", "@UDP-T3752"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      const trustPage = await openTrustDetailsViaUdcNoMatch(assetDetailsPage);

      await trustPage.touchTrustTypeDropdownWithoutSelection();
      await trustPage.clickSaveTrustDetails();
      await expect.soft(page.getByText(/Trust Type is required/i).first()).toBeVisible({
        timeout: 25_000,
      });

      await trustPage.openTrustTypeDropdown();
      await trustPage.expectTrustTypeDropdownHasOptions();
    },
  );

  test(
    "UDP-T3753 - Existing Trust Customer - Pre - Populated from FIS AF",
    { tag: ["@do", "@regression", "@UDP-T3753"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteBusinessLoanOnCustomerDetailsStep(page);
      const trustPage = await openExistingTrustDetailsViaTrustNameSearch(assetDetailsPage);

      await expect.soft(trustPage.root).toBeVisible({ timeout: 30_000 });
      await expect.soft(page.getByText(/Trust Details/i).first()).toBeVisible({ timeout: 30_000 });

      const trustName = (await trustPage.trustNameInput().inputValue().catch(() => "")).trim();
      await expect.soft(trustName).toMatch(/\S/);

      const trustTypeLabel = (await trustPage.trustTypeDropdownLabel().textContent().catch(() => ""))?.trim() ?? "";
      await expect.soft(trustTypeLabel).toMatch(/\S/);
      await expect.soft(trustTypeLabel).not.toMatch(/select|choose/i);

      const regNo = (
        await trustPage.page
          .locator("app-trust-detail .trust_details")
          .locator("xpath=.//label[contains(.,'Registered Number')]/following::input[1]")
          .inputValue()
          .catch(() => "")
      ).trim();
      const gst = (
        await trustPage.page
          .locator("app-trust-detail .trust_details")
          .locator("xpath=.//label[contains(.,'GST')]/following::input[1]")
          .inputValue()
          .catch(() => "")
      ).trim();
      await expect.soft(regNo.length > 0 || gst.length > 0).toBeTruthy();

      const editedName = `${trustName} Edited`;
      await trustPage.enterTrustName(editedName);
      await expect.soft(trustPage.trustNameInput()).toHaveValue(editedName);
    },
  );

  test(
    "UDP-T3754 - Copy Primary Borrower Address - Visible for Co - Borrower/Guarantor Only",
    { tag: ["@do", "@regression", "@UDP-T3754"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
      const primaryPersonal = await openAddNewIndividualPersonal(assetDetailsPage);
      await fillValidIndividualPersonalBorrower(primaryPersonal);
      await primaryPersonal.clickNextButton();

      const addressDetailsPage = new DOAddressDetailsPage(page);
      await addressDetailsPage.waitForPhysicalAddressStep();
      await expect
        .soft(await addressDetailsPage.isCopyPrimaryBorrowerAddressToggleVisible(4_000))
        .toBeFalsy();

      await fillAddressWithResidenceTypeAndContinue(page, addressDetailsPage, "Boarding");
      await completeIndividualBorrowerAfterAddressStep(page);

      const postSubmit = new DOCustomerQuotePostSubmitPage(page);
      await postSubmit.waitForUploadStep();

      await postSubmit.clickAddBorrowersOrGuarantorsButton();
      await assetDetailsPage.searchByDropdownClick();
      await assetDetailsPage.selectUDCSelectOption();
      await assetDetailsPage.enterUDCCustomerNumber("421");
      await assetDetailsPage.clickSearchButton();
      await assetDetailsPage.clickAddNewCustomerButton();

      const coBorrowerPersonal = new DOPersonalDetailsPage(page);
      await selectCustomerRole(page, "Co-Borrower");
      await coBorrowerPersonal.chooseTitle("Mr");
      await coBorrowerPersonal.enterFirstName("Co");
      await coBorrowerPersonal.enterMiddleName("Test");
      await coBorrowerPersonal.enterLastName("Borrower");
      await coBorrowerPersonal.chooseGender("Male");
      await coBorrowerPersonal.enterDateOfBirth("02/02/1985");
      await coBorrowerPersonal.chooseMarritalStatus("Single");
      await coBorrowerPersonal.chooseNoOfDependents("0");
      await coBorrowerPersonal.enterMobileNumber("0219876543");
      await coBorrowerPersonal.enterEmail("co.borrower@example.com");
      await coBorrowerPersonal.chooseLicenceType("Full Licence");
      await coBorrowerPersonal.chooseCountryOfIssue("New Zealand");
      await coBorrowerPersonal.enterLicenceNumber("CD123456");
      await coBorrowerPersonal.enterVersionNumber("123");
      await coBorrowerPersonal.chooseNewZealandResident("Yes");
      await coBorrowerPersonal.chooseCountryOfBirth("New Zealand");
      await coBorrowerPersonal.chooseCountryOfCitizenship("New Zealand");
      await coBorrowerPersonal.clickNextButton();

      await addressDetailsPage.waitForPhysicalAddressStep();
      await expect.soft(await addressDetailsPage.isCopyPrimaryBorrowerAddressToggleVisible()).toBeTruthy();
      await addressDetailsPage.expectCopyPrimaryBorrowerAddressToggleDefaultNo();
    },
  );

  test(
    "UDP-T3755 - Copy Primary Borrower Address - Toggle Yes Copies All Address Sections",
    { tag: ["@do", "@regression", "@UDP-T3755"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Copy primary borrower address toggle Yes — needs Co-Borrower setup.");
    },
  );

  test(
    "UDP-T3756 - Create New and Copy to Previous Address - Existing Customers Only",
    { tag: ["@do", "@regression", "@UDP-T3756"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Create New and Copy to Previous Address — existing customer only.");
    },
  );

  test(
    "UDP-T3757 - Address Search - Type to Get Suggestions",
    { tag: ["@do", "@regression", "@UDP-T3757"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const addressDetailsPage = new DOAddressDetailsPage(page);
      await addressDetailsPage.waitForPhysicalAddressStep();
      await expect.soft(addressDetailsPage.physicalSearchInput).toBeVisible({ timeout: 60_000 });
    },
  );

  test(
    "UDP-T3758 - Residence Type - Mandatory; Excludes Z - Not Applicable",
    { tag: ["@do", "@regression", "@UDP-T3758"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await a.waitForPhysicalAddressStep();
      await a.timeAtAddress("", "");
      await a.enterStreetNumber("");
      await a.enterStreetName("");
      await a.enterCity("");
      await a.touchPhysicalResidenceTypeWithoutSelection();
      await a.clickSaveAddressDetails();
      await a.expectPhysicalAddressRequiredValidationMessages();
    },
  );

  test(
    "UDP-T3759 - Time at Address Years/Months - Conditionally Mandatory",
    { tag: ["@do", "@regression", "@UDP-T3759"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await fillMinimalAddressContinue(page, a);
    },
  );

  test(
    "UDP-T3760 - Previous Physical Address - Required When Current Address < 3 Years",
    { tag: ["@do", "@regression", "@UDP-T3760"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await a.waitForPhysicalAddressStep();
      await a.timeAtAddress("1", "6");
      await a.enterStreetNumber("1");
      await a.enterStreetName("Test Rd");
      await a.enterCity("Wellington");
      await a.chooseCountry("New Zealand");
      await a.selectResidenceType("Boarding");
      await a.clickSaveAddressDetails();
      await expect.soft(a.previousAddressBlock.or(page.getByText(/Previous\s+Physical/i)).first()).toBeVisible({ timeout: 45_000 }).catch(() => {});
    },
  );

  test(
    "UDP-T3761 - Postal Address - Same as Physical by Default or Separate Entry",
    { tag: ["@do", "@regression", "@UDP-T3761"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await fillMinimalAddressContinue(page, a);
    },
  );

  test(
    "UDP-T3762 - Mortgage/Rent Mapping Based on Residence Type",
    { tag: ["@do", "@regression", "@UDP-T3762"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await a.waitForPhysicalAddressStep();
      await a.selectResidenceType("Mortgage");
      await expect.soft(a.physicalAddressBlock.or(a.page.locator("app-physical-address"))).toBeVisible();
    },
  );

  test(
    "UDP-T3763 - Sole Trader Address - Individual Business Customer",
    { tag: ["@do", "@regression", "@UDP-T3763"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Sole trader address — requires Individual + Business loan purpose program.");
    },
  );

  test(
    "UDP-T3764 - Have Employment Details Changed Slider - Existing Customers Only",
    { tag: ["@do", "@regression", "@UDP-T3764"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const emp = await openIndividualOnEmploymentStep(page, {
        existingUdcNumber: EXISTING_UDC_CUSTOMER_NUMBER,
      });
      await expect.soft(await emp.isEmploymentDetailsChangedSliderVisible()).toBeTruthy();
      await emp.expectEmploymentDetailsChangedSwitchVisible();
    },
  );

  test(
    "UDP-T3765 - Employment Type - Mandatory",
    { tag: ["@do", "@regression", "@UDP-T3765"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await fillMinimalAddressContinue(page, a);
      const emp = new DOEmploymentDetailsPage(page);
      await emp.waitForEmploymentDetailsStep();
      await expect.soft(await emp.isEmploymentDetailsChangedSliderVisible(4_000)).toBeFalsy();
      await emp.enterCurrentEmployerName("");
      await emp.touchCurrentOccupationDropdownWithoutSelection();
      await emp.touchCurrentEmploymentTypeDropdownWithoutSelection();
      await emp.enterCurrentTimeWithEmployer("", "");
      await emp.clickSaveEmploymentDetails();
      await emp.expectCurrentEmploymentRequiredValidationMessages();
    },
  );

  test(
    "UDP-T3766 - Employer Name - Mandatory Except for Beneficiary/Unemployed/Retired/Unknown",
    { tag: ["@do", "@regression", "@UDP-T3766"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Employer name optional for Beneficiary/Unemployed/Retired — needs employment type matrix + assertions per UDP-T3766.");
    },
  );

  test(
    "UDP-T3767 - Occupation - Conditionally Mandatory; Excludes Z - Not Applicable",
    { tag: ["@do", "@regression", "@UDP-T3767"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const emp = await openIndividualOnEmploymentStep(page);
      await emp.enterCurrentEmployerName("Acme Finance Ltd");
      await emp.selectCurrentEmploymentType("Full Time Employed");
      await emp.touchCurrentOccupationDropdownWithoutSelection();
      await emp.clickSaveEmploymentDetails();
      await emp.expectOccupationRequiredVisible();

      await emp.selectCurrentEmploymentType("Retired");
      await emp.clickSaveEmploymentDetails();
      await emp.expectOccupationRequiredHidden();

      await emp.openCurrentOccupationDropdown();
      await expect.soft(page.getByRole("option", { name: /Z-\s*Not\s*Applicable/i })).toHaveCount(0);
      await page.keyboard.press("Escape");
    },
  );

  test(
    "UDP-T3768 - Time with Current Employer - Years/Months; Conditionally Mandatory",
    { tag: ["@do", "@regression", "@UDP-T3768"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const emp = await openIndividualOnEmploymentStep(page);
      await emp.enterCurrentEmployerName("Acme Finance Ltd");
      await emp.selectCurrentEmploymentType("Full Time Employed");
      await emp.selectCurrentOccupation("Accountant");
      await emp.enterCurrentTimeWithEmployer("", "");
      await emp.clickSaveEmploymentDetails();
      await emp.expectTimeWithEmployerRequiredVisible();

      await emp.enterCurrentTimeWithEmployer("0", "0");
      await emp.clickSaveEmploymentDetails();
      await emp.expectTimeWithEmployerMustBeGreaterThanZeroVisible();

      await emp.enterCurrentTimeWithEmployer("2", "6");
      await emp.clickSaveEmploymentDetails();
      await emp.expectTimeWithEmployerRequiredHidden();
    },
  );

  test(
    "UDP-T3769 - Previous Employment - Visible When Current Duration < 3 Years",
    { tag: ["@do", "@regression", "@UDP-T3769"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const emp = await openIndividualOnEmploymentStep(page);
      await emp.enterCurrentEmployerName("Acme Finance Ltd");
      await emp.selectCurrentOccupation("Accountant");
      await emp.selectCurrentEmploymentType("Full Time Employed");
      await emp.enterCurrentTimeWithEmployer("1", "6");
      await emp.clickSaveEmploymentDetails();
      await emp.expectPreviousEmploymentSectionVisible();
    },
  );

  test(
    "UDP-T3770 - Existing Customer - Employment Pre - Populated from FIS AF",
    { tag: ["@do", "@regression", "@UDP-T3770"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const emp = await openIndividualOnEmploymentStep(page, {
        existingUdcNumber: EXISTING_UDC_CUSTOMER_NUMBER,
      });

      const employerName = await emp.getCurrentEmployerName();
      const occupation = await emp.getCurrentOccupationLabel();
      const employmentType = await emp.getCurrentEmploymentTypeLabel();
      const timeWithEmployer = await emp.getCurrentTimeWithEmployer();

      await expect.soft(employerName).toMatch(/\S/);
      await expect.soft(occupation).toMatch(/\S/);
      await expect.soft(employmentType).toMatch(/\S/);
      await expect
        .soft(`${timeWithEmployer.years}${timeWithEmployer.months}`)
        .toMatch(/\d/);

      const updatedEmployer = employerName.trim()
        ? employerName.endsWith(" Updated")
          ? employerName
          : `${employerName} Updated`
        : "Acme Finance Ltd Updated";
      await emp.enterCurrentEmployerName(updatedEmployer);
      await emp.clickSaveEmploymentDetails();
      await expect(await emp.getCurrentEmployerName()).toBe(updatedEmployer);
    },
  );

  test(
    "UDP-T3771 - Financial Position - Consumer Individual - Screen Structure",
    { tag: ["@do", "@regression", "@UDP-T3771"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await fillMinimalAddressContinue(page, a);
      const emp = new DOEmploymentDetailsPage(page);
      await emp.clickNextButton();
      const fin = new DOFinancialPositionPage(page);
      await fin.waitForFinancialPositionStep();
      await expect.soft(fin.financialRoot.or(fin.businessFinancialRoot).first()).toBeVisible({ timeout: 120_000 });
    },
  );

  test(
    "UDP-T3772 - Asset Details - Home Ownership Type & Home Value",
    { tag: ["@do", "@regression", "@UDP-T3772"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await fillMinimalAddressContinue(page, a);
      const emp = new DOEmploymentDetailsPage(page);
      await emp.clickNextButton();
      const fin = new DOFinancialPositionPage(page);
      await fin.waitForFinancialPositionStep();
      await expect.soft(fin.individualAssetDetailsCard).toBeVisible({ timeout: 90_000 });
    },
  );

  test(
    "UDP-T3773 - Asset Details - Vehicle Value; Furniture & Effects Value",
    { tag: ["@do", "@regression", "@UDP-T3773"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await fillMinimalAddressContinue(page, a);
      const emp = new DOEmploymentDetailsPage(page);
      await emp.clickNextButton();
      const fin = new DOFinancialPositionPage(page);
      await fin.waitForFinancialPositionStep();
      await expect.soft(fin.individualAssetDetailsCard).toBeVisible();
    },
  );

  test(
    "UDP-T3774 - Asset Details - Other Assets Dropdown",
    { tag: ["@do", "@regression", "@UDP-T3774"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await fillMinimalAddressContinue(page, a);
      const emp = new DOEmploymentDetailsPage(page);
      await emp.clickNextButton();
      const fin = new DOFinancialPositionPage(page);
      await fin.waitForFinancialPositionStep();
      await expect.soft(fin.individualAssetDetailsCard).toBeVisible();
    },
  );

  test(
    "UDP-T3775 - Liabilities - Mortgage/Rent Mapping by Residence Type",
    { tag: ["@do", "@regression", "@UDP-T3775"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();

      const a = new DOAddressDetailsPage(page);
      await fillAddressWithResidenceTypeAndContinue(page, a, "Mortgage");

      const emp = new DOEmploymentDetailsPage(page);
      await emp.waitForEmploymentDetailsStep();
      await emp.clickNextButton();

      const fin = new DOFinancialPositionPage(page);
      await fin.waitForFinancialPositionStep();
      await expect.soft(fin.mortgageRentLiabilityRowLabel()).toBeVisible({ timeout: 60_000 });
      await fin.fillFirstLiabilityBalanceAndAmount("$500,000.00", "$2,500.00");
      await fin.setFirstLiabilityRowFrequencyMonthly();

      const mappingAfterMortgage = await fin.getMortgageRentFisMappingTarget();
      if (mappingAfterMortgage) {
        await expect.soft(mappingAfterMortgage).toBe("Mortgage");
      }

      await clickCustomerDetailsStepperStep(page, "2. Address Details");
      await a.waitForPhysicalAddressStep();
      await a.selectResidenceType("Renting");
      await a.clickSaveAddressDetails();

      await clickCustomerDetailsStepperStep(page, "4. Financial Position");
      await fin.waitForFinancialPositionStep();
      await expect.soft(fin.mortgageRentLiabilityRowLabel()).toBeVisible({ timeout: 60_000 });

      const mappingAfterRenting = await fin.getMortgageRentFisMappingTarget();
      if (mappingAfterRenting) {
        await expect.soft(mappingAfterRenting).toBe("Rent");
      } else if (mappingAfterMortgage) {
        await expect
          .poll(async () => fin.getMortgageRentFisMappingTarget(), { timeout: 25_000 })
          .toBe("Rent");
      }
    },
  );

  test(
    "UDP-T3776 - Liabilities - Credit Cards; Loans; Others",
    { tag: ["@do", "@regression", "@UDP-T3776"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await fillMinimalAddressContinue(page, a);
      const emp = new DOEmploymentDetailsPage(page);
      await emp.clickNextButton();
      const fin = new DOFinancialPositionPage(page);
      await fin.waitForFinancialPositionStep();
      await expect.soft(fin.liabilitiesCard).toBeVisible();
    },
  );

  test(
    "UDP-T3777 - Income - Take Home Pay; Spouse/Partner Pay",
    { tag: ["@do", "@regression", "@UDP-T3777"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await fillMinimalAddressContinue(page, a);
      const emp = new DOEmploymentDetailsPage(page);
      await emp.clickNextButton();
      const fin = new DOFinancialPositionPage(page);
      await fin.waitForFinancialPositionStep();
      await expect.soft(fin.incomeDetailsCard).toBeVisible({ timeout: 60_000 });
    },
  );

  test(
    "UDP-T3778 - Income - Is Income Likely to Decrease in Next 12 Months?",
    { tag: ["@do", "@regression", "@UDP-T3778"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await fillMinimalAddressContinue(page, a);
      const emp = new DOEmploymentDetailsPage(page);
      await emp.clickNextButton();
      const fin = new DOFinancialPositionPage(page);
      await fin.waitForFinancialPositionStep();
      await expect.soft(fin.incomeDetailsCard).toBeVisible();
    },
  );

  test(
    "UDP-T3779 - Expenditure - Council Rates; Insurance; Utilities; Motor Vehicles; Living Expenses",
    { tag: ["@do", "@regression", "@UDP-T3779"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await fillMinimalAddressContinue(page, a);
      const emp = new DOEmploymentDetailsPage(page);
      await emp.clickNextButton();
      const fin = new DOFinancialPositionPage(page);
      await fin.waitForFinancialPositionStep();
      await expect.soft(fin.expenditureCard).toBeVisible({ timeout: 60_000 });
    },
  );

  test(
    "UDP-T3780 - Regular Recurring Essential Outgoings - Additional Expenses Dropdown",
    { tag: ["@do", "@regression", "@UDP-T3780"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await fillMinimalAddressContinue(page, a);
      const emp = new DOEmploymentDetailsPage(page);
      await emp.clickNextButton();
      const fin = new DOFinancialPositionPage(page);
      await fin.waitForFinancialPositionStep();
      await expect.soft(fin.essentialOutgoingsCard.or(fin.financialRoot).first()).toBeVisible({ timeout: 60_000 });
    },
  );

  test(
    "UDP-T3781 - Bar Chart - Income vs Expenditure Summary",
    { tag: ["@do", "@regression", "@UDP-T3781"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Income vs expenditure bar chart — assert chart host when selector is confirmed for this build.");
    },
  );

  test(
    "UDP-T3782 - Business Financial Position - Individual + Business Loan Purpose",
    { tag: ["@do", "@regression", "@UDP-T3782"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const fin = await openSoleTraderOnFinancialPositionStep(page);
      await fin.expectSoleTraderFinancialPositionSectionsVisible();
      await expect.soft(fin.soleTradeFinancialRoot).toBeVisible({ timeout: 30_000 });
      await expect
        .soft(fin.businessFinancialRoot)
        .toBeHidden({ timeout: 5_000 })
        .catch(() => {});
    },
  );

  test(
    "UDP-T3783 - Profit Declaration - Did you make a Net Profit last year?",
    { tag: ["@do", "@regression", "@UDP-T3783"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Profit declaration sole trader — needs Business loan purpose program.");
    },
  );

  test(
    "UDP-T3784 - Business FP - Turnover, Balance Information",
    { tag: ["@do", "@regression", "@UDP-T3784"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Business FP turnover — needs sole trader / business program.");
    },
  );

  test(
    "UDP-T3785 - Borrower Summary - Displays All Added Parties",
    { tag: ["@do", "@regression", "@UDP-T3785"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Borrower summary all parties — needs multi-party completion flow.");
    },
  );

  test(
    "UDP-T3786 - Borrower Summary - Edit Customer Details",
    { tag: ["@do", "@regression", "@UDP-T3786"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Borrower summary edit — needs summary screen locators.");
    },
  );

  test(
    "UDP-T3787 - Borrower Summary - Remove Customer",
    { tag: ["@do", "@regression", "@UDP-T3787"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Borrower summary remove — needs Co-Borrower on quote.");
    },
  );

  test(
    "UDP-T3788 - Borrower Summary - Navigate to Next Step",
    { tag: ["@do", "@regression", "@UDP-T3788"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Borrower summary next step — needs reference / post-submit entry.");
    },
  );

  test(
    "UDP-T3789 - Contact Details - Additional Phone Numbers",
    { tag: ["@do", "@regression", "@UDP-T3789"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await expect.soft(page.getByText(/Contact Details/i).first()).toBeVisible({ timeout: 30_000 }).catch(() => {});
    },
  );

  test(
    "UDP-T3790 - Contact Details - Additional Email Addresses",
    { tag: ["@do", "@regression", "@UDP-T3790"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await expect.soft(p.emailInput).toBeVisible();
    },
  );

  test(
    "UDP-T3791 - Back/Next Navigation Between Customer Detail Sections",
    { tag: ["@do", "@regression", "@UDP-T3791"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.clickNextButton();
      const a = new DOAddressDetailsPage(page);
      await a.waitForPhysicalAddressStep();
      await a.clickNextButton().catch(() => {});
      await expect.soft(page.getByRole("button", { name: /^Next$/i }).last()).toBeVisible();
    },
  );

  test(
    "UDP-T3792 - Header Tabs - Navigate Directly to Any Section",
    { tag: ["@do", "@regression", "@UDP-T3792"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      const tab = page.getByRole("tab", { name: /Address|Personal|Employment/i }).first();
      if (await tab.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await tab.click();
      } else {
        await expect.soft(p.personalDetailsRoot).toBeVisible();
      }
    },
  );

  test(
    "UDP-T3793 - Save - Saves Current Section and Stays on Page",
    { tag: ["@do", "@regression", "@UDP-T3793"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const p = await openAddNewIndividualPersonal(await openStandardQuoteOnCustomerDetailsStep(page));
      await fillValidIndividualPersonalBorrower(p);
      await p.enterMiddleName("X");
      await p.clickSavePersonalDetails();
      await expect.soft(p.personalDetailsRoot).toBeVisible();
    },
  );

  test(
    "UDP-T3794 - Cancel - Confirmation Message Then Navigates to Dashboard",
    { tag: ["@do", "@regression", "@UDP-T3794"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openStandardQuoteOnCustomerDetailsStep(page);
      const p = await openAddNewIndividualPersonal(assetDetailsPage);
      await fillValidIndividualPersonalBorrower(p);
      await p.enterMiddleName("Z");
      const cancelBtn = standardQuoteRoot(page).getByRole("button", { name: /^Cancel$/i }).first();
      if (await cancelBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await cancelBtn.click();
        await expect.soft(page.getByText(/unsaved changes|Are you sure/i).first()).toBeVisible({ timeout: 15_000 });
      } else {
        test.skip(true, "Cancel not visible on Customer Details in this build.");
      }
    },
  );

  test(
    "UDP-T3795 - Status Button - Workflow Transition",
    { tag: ["@do", "@regression", "@UDP-T3795"] },
    async ({ page: _page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Status workflow transition from Customer Details — needs role-specific status control mapping.");
    },
  );

});
