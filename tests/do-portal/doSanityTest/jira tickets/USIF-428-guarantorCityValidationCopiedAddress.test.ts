/**
 * DO Portal — USIF-428 City validation error when City field is populated (copied guarantor address)
 *
 * Source: JIRA USIF-428
 * https://aurionprofintechsolutions.atlassian.net/browse/USIF-428
 *
 * Repro (description + attachments MAF9680 City Field.mp4, image-20260811-234139.png):
 * 1. Primary borrower — address with City populated (e.g. Wellington).
 * 2. Add guarantor → Address Details → **Copy primary borrower** = Yes.
 * 3. City field shows a value — no **City is required** validation must appear.
 *
 * Regression guard — resolved in next version; passes when copy preserves City without false validation.
 *
 * Manual OTP (QAT): run with **one worker**:
 *   npx playwright test "tests/do-portal/doSanityTest/jira tickets/USIF-428-guarantorCityValidationCopiedAddress.test.ts" --project=udc-chromium --workers=1
 */

import { test } from "@fixtures/doPortalTest";
import {
  DOAddressDetailsPage,
  DOCustomerDetailsPage,
  DOEmploymentDetailsPage,
  DOFinancialPositionPage,
} from "../../../../pages";
import { DOPersonalDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import {
  fillMinimalEmploymentContinue,
  fillMinimalFinancialContinue,
} from "../../doRegressionTestSuite/workflow.helpers";
import { openSanityCustomerDetailsStep } from "../zephyr_sanitytest/sanity.helpers";

const MANUAL_STREET_NAME = "Zephyr";
const MANUAL_CITY = "Wellington";
const MANUAL_COUNTRY = "New Zealand";
const STREET_TYPE_ROAD = "Road";

async function fillMinimalIndividualPersonal(personal: DOPersonalDetailsPage): Promise<void> {
  await personal.chooseTitle("Dame");
  await personal.enterFirstName("Liza");
  await personal.enterMiddleName("Marie");
  await personal.enterLastName("Doe");
  await personal.chooseGender("Female");
  await personal.enterDateOfBirth("01/01/1980");
  await personal.chooseMarritalStatus("Married");
  await personal.chooseNoOfDependents("0");
  await personal.enterMobileNumber("0211234567");
  await personal.enterEmail("liza.doe@example.com");
  await personal.chooseLicenceType("Full Licence");
  await personal.chooseCountryOfIssue("New Zealand");
  await personal.enterLicenceNumber("AB123456");
  await personal.enterVersionNumber("244");
  await personal.chooseNewZealandResident("Yes");
  await personal.chooseCountryOfBirth("New Zealand");
  await personal.chooseCountryOfCitizenship("New Zealand");
}

async function fillGuarantorPersonal(personal: DOPersonalDetailsPage): Promise<void> {
  await personal.chooseTitle("Mr");
  await personal.enterFirstName("John");
  await personal.enterMiddleName("Alan");
  await personal.enterLastName("Smith");
  await personal.chooseGender("Male");
  await personal.enterDateOfBirth("15/06/1985");
  await personal.chooseMarritalStatus("Single");
  await personal.chooseNoOfDependents("0");
  await personal.enterMobileNumber("0219876543");
  await personal.enterEmail("john.smith@example.com");
  await personal.chooseLicenceType("Full Licence");
  await personal.chooseCountryOfIssue("New Zealand");
  await personal.enterLicenceNumber("CD654321");
  await personal.enterVersionNumber("512");
  await personal.chooseNewZealandResident("Yes");
  await personal.chooseCountryOfBirth("New Zealand");
  await personal.chooseCountryOfCitizenship("New Zealand");
}

async function fillPrimaryBorrowerCityAddress(address: DOAddressDetailsPage): Promise<void> {
  await address.waitForPhysicalAddressStep();
  await address.fillPhysicalManualWithStreetType({
    streetNumber: "10",
    streetName: MANUAL_STREET_NAME,
    city: MANUAL_CITY,
    country: MANUAL_COUNTRY,
    residenceType: "Boarding",
    timeAtYears: "5",
    timeAtMonths: "0",
    streetType: STREET_TYPE_ROAD,
    postcode: "6011",
  });

  await address.fillPostalManualWithStreetType({
    streetNumber: "20",
    streetName: MANUAL_STREET_NAME,
    city: MANUAL_CITY,
    country: MANUAL_COUNTRY,
    streetType: STREET_TYPE_ROAD,
  });
  await address.clickSaveAddressDetails();
}

async function completePrimaryBorrowerWizard(page: import("@playwright/test").Page): Promise<void> {
  const emp = new DOEmploymentDetailsPage(page);
  await fillMinimalEmploymentContinue(emp);
  const fin = new DOFinancialPositionPage(page);
  await fillMinimalFinancialContinue(fin);
}

async function returnToCustomerDetailsPartiesList(
  page: import("@playwright/test").Page,
  customer: DOCustomerDetailsPage,
): Promise<void> {
  const customerTab = page
    .getByRole("button", { name: /^Customer\s+Details$/i })
    .or(page.getByRole("link", { name: /^Customer\s+Details$/i }))
    .or(page.locator("button, a, span").filter({ hasText: /^\s*1\.\s*Customer\s+Details/i }))
    .first();
  if (await customerTab.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await customerTab.click({ timeout: 15_000 });
  }
  await customer.waitForAddBorrowerButton();
}

test.describe("DO Portal - USIF-428 Guarantor City Validation Copied Address - Bug @do @bug @USIF-428", () => {
  test.describe.configure({ mode: "serial", timeout: 900_000 });

  test("USIF-428 - Copy primary borrower must not show City required when City is populated", async ({
    page,
  }) => {
    const { customer, asset } = await openSanityCustomerDetailsStep(page);

    await test.step("Primary borrower — personal + address with City Wellington", async () => {
      await customer.clickAddBorrowersOrGuarantors();
      await customer.searchCustomer.searchByUdcNumber("420");
      await customer.clickAddNewCustomerButton();

      const personal = new DOPersonalDetailsPage(page);
      await fillMinimalIndividualPersonal(personal);
      await personal.clickNextButton();

      const address = new DOAddressDetailsPage(page);
      await fillPrimaryBorrowerCityAddress(address);
      await completePrimaryBorrowerWizard(page);
      await returnToCustomerDetailsPartiesList(page, customer);
    });

    await test.step("Guarantor — Copy primary borrower address", async () => {
      await customer.clickAddBorrowersOrGuarantors();
      await customer.searchCustomer.searchByUdcNumber("420");
      await customer.clickAddNewCustomerButton();

      const personal = new DOPersonalDetailsPage(page);
      await fillGuarantorPersonal(personal);
      await personal.chooseCustomerRole(/^Guarantor$/i);
      await personal.clickSavePersonalDetails();
      await personal.clickNextButton();

      const address = new DOAddressDetailsPage(page);
      await address.waitForPhysicalAddressStep();
      await address.expectCopyPrimaryBorrowerSliderVisible();
      await address.enableCopyPrimaryBorrowerAddress();
    });

    await test.step("City populated — no City is required validation (USIF-428)", async () => {
      const address = new DOAddressDetailsPage(page);
      await address.expectPhysicalCityPopulated();
      await address.expectNoCityRequiredValidation();

      await address.clickSaveAddressDetails();
      await address.expectNoCityRequiredValidation();
    });

    await asset.clickStandardQuoteStepTab(/Customer\s*Details/i).catch(() => {});
  });
});
