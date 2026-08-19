/**
 * DO Portal — USIF-425 Copy Primary Borrower Address corrupts Street Type (Road → Broadway)
 *
 * Source: JIRA USIF-425
 * https://aurionprofintechsolutions.atlassian.net/browse/USIF-425
 *
 * Repro (description + attachments image-20260812-023916.png, image-20260812-024016.png):
 * 1. Primary borrower — Physical (residential) and Postal addresses with Street Type **Road**.
 * 2. Add co-borrower (or guarantor) → Address Details → **Copy primary borrower** = Yes.
 * 3. Copied Postal and Residential street types must remain **Road** (not Broadway).
 *
 * Fails while USIF-425 is open; passes when copy preserves street type exactly.
 *
 * Manual OTP (QAT): run with **one worker**:
 *   npx playwright test "tests/do-portal/doSanityTest/jira tickets/USIF-425-copyPrimaryBorrowerStreetType.test.ts" --project=udc-chromium --workers=1
 */

import { expect, test } from "@fixtures/doPortalTest";
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

const STREET_TYPE_ROAD = "Road";
const STREET_TYPE_BUG_VALUE = "Broadway";
/** Fictional street name — avoids QAT address lookup mapping real names (e.g. Queen → Broadway). */
const MANUAL_STREET_NAME = "Zephyr";
const MANUAL_CITY = "Wellington";
const MANUAL_COUNTRY = "New Zealand";

/** Minimal personal — 0 dependants (QAT stability). */
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

async function fillSecondPartyPersonal(personal: DOPersonalDetailsPage): Promise<void> {
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

/** Primary borrower physical + separate postal address — both Street Type Road (USIF-425 baseline). */
async function fillPrimaryBorrowerRoadAddress(address: DOAddressDetailsPage): Promise<void> {
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

test.describe("DO Portal - USIF-425 Copy Primary Borrower Street Type - Bug @do @bug @USIF-425", () => {
  test.describe.configure({ mode: "serial", timeout: 900_000 });

  test("USIF-425 - Copy Primary Borrower preserves Road street type on residential and postal", async ({
    page,
  }) => {
    const { customer, asset } = await openSanityCustomerDetailsStep(page);

    await test.step("Primary borrower — personal + address with Street Type Road (postal & residential)", async () => {
      await customer.clickAddBorrowersOrGuarantors();
      await customer.searchCustomer.searchByUdcNumber("420");
      await customer.clickAddNewCustomerButton();

      const personal = new DOPersonalDetailsPage(page);
      await fillMinimalIndividualPersonal(personal);
      await personal.clickNextButton();

      const address = new DOAddressDetailsPage(page);
      await fillPrimaryBorrowerRoadAddress(address);
      await completePrimaryBorrowerWizard(page);
      await returnToCustomerDetailsPartiesList(page, customer);
    });

    await test.step("Co-borrower — Copy primary borrower address", async () => {
      await customer.clickAddBorrowersOrGuarantors();
      await customer.searchCustomer.searchByUdcNumber("420");
      await customer.clickAddNewCustomerButton();

      const personal = new DOPersonalDetailsPage(page);
      await fillSecondPartyPersonal(personal);
      await personal.chooseCustomerRole(/^Co[\s-]*Borrower$/i);
      await personal.clickSavePersonalDetails();
      await personal.clickNextButton();

      const address = new DOAddressDetailsPage(page);
      await address.waitForPhysicalAddressStep();
      await address.expectCopyPrimaryBorrowerSliderVisible();
      await address.enableCopyPrimaryBorrowerAddress();
    });

    await test.step("Residential (physical) and postal street type must stay Road — not Broadway (USIF-425)", async () => {
      const address = new DOAddressDetailsPage(page);

      await address.expectPhysicalStreetType(STREET_TYPE_ROAD);
      const physicalType = await address.readPhysicalStreetTypeLabel();
      expect(physicalType.toLowerCase()).not.toBe(STREET_TYPE_BUG_VALUE.toLowerCase());

      if (await address.isPostalAddressSectionVisible(5_000)) {
        await address.expectPostalStreetType(STREET_TYPE_ROAD);
        const postalType = await address.readPostalStreetTypeLabel();
        expect(postalType.toLowerCase()).not.toBe(STREET_TYPE_BUG_VALUE.toLowerCase());
      }
    });

    await asset.clickStandardQuoteStepTab(/Customer\s*Details/i).catch(() => {});
  });
});
