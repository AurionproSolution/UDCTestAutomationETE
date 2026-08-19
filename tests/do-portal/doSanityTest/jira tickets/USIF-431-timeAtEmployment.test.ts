/**
 * DO Portal — USIF-431 Time at Employment mandatory for Retired / Beneficiary-Unemployed / Unknown
 *
 * Source: JIRA USIF-431
 * https://aurionprofintechsolutions.atlassian.net/browse/USIF-431
 * Related: MAF-8526
 *
 * Acceptance criteria:
 * - Occupation Retired, Beneficiary/Unemployed, Unknown: employer name may be optional.
 * - **Time with Employer** (Time at Employment) must NOT be blank — mandatory on Save (scorecard / FDD).
 * - Employment type Retired: same rule for time at employment.
 *
 * This test **fails** while USIF-431 is open (portal allows blank time).
 *
 * Manual OTP (QAT): run with **one worker**:
 *   npx playwright test "tests/do-portal/doSanityTest/jira tickets/USIF-431-timeAtEmployment.test.ts" --project=udc-chromium --workers=1
 */

import { test } from "@fixtures/doPortalTest";
import {
  DOAddressDetailsPage,
  DOEmploymentDetailsPage,
} from "../../../../pages";
import { DOPersonalDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import {
  fillMinimalAddressContinue,
  openSanityCustomerDetailsStep,
} from "../zephyr_sanitytest/sanity.helpers";

/**
 * QAT dropdown labels. Set **both** occupation and employment type so employer name is optional
 * (per UDP-T3766 / USIF-431), then assert time at employment is still mandatory on Save.
 */
const OCCUPATION_SCENARIOS = [
  { occupation: "Retired / Pensioner", employmentType: "Retired", label: "Retired" },
  { occupation: "Beneficiary", employmentType: "Beneficiary", label: "Beneficiary" },
  { occupation: "Unemployed", employmentType: "Unemployed", label: "Unemployed" },
  { occupation: "Unknown", employmentType: "Unknown", label: "Unknown" },
] as const;

/** Minimal personal data — 0 dependants avoids flaky dependant-age fields on QAT. */
async function fillUsif431PersonalBorrower(personal: DOPersonalDetailsPage): Promise<void> {
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

async function openIndividualEmploymentStep(page: import("@playwright/test").Page): Promise<DOEmploymentDetailsPage> {
  const { customer } = await openSanityCustomerDetailsStep(page);
  await customer.clickAddBorrowersOrGuarantors();
  await customer.searchCustomer.searchByUdcNumber("420");
  await customer.clickAddNewCustomerButton();

  const personal = new DOPersonalDetailsPage(page);
  await fillUsif431PersonalBorrower(personal);
  await personal.clickNextButton();

  const address = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, address);

  const employment = new DOEmploymentDetailsPage(page);
  await employment.waitForEmploymentDetailsStep();
  return employment;
}

async function assertTimeAtEmploymentMandatoryThenAcceptsValue(
  employment: DOEmploymentDetailsPage,
  years: string,
  months: string,
): Promise<void> {
  await employment.expectTimeAtEmploymentMandatoryWhenEmployerOptional();
  await employment.enterCurrentTimeWithEmployer(years, months);
  await employment.clickSaveEmploymentDetails();
  await employment.expectCurrentTimeWithEmployerRequiredValidationMessageAbsent();
  await employment.expectCurrentTimeWithEmployerYearsMonths(years, months);
}

test.describe("DO Portal - USIF-431 Time at Employment - Bug @do @bug @USIF-431", () => {
  test.describe.configure({ mode: "serial", timeout: 900_000 });

  test("USIF-431 - Time at Employment required for Retired, Beneficiary-Unemployed, Unknown", async ({
    page,
  }) => {
    for (const scenario of OCCUPATION_SCENARIOS) {
      await test.step(`Occupation ${scenario.label} — blank time must show validation (USIF-431)`, async () => {
        const employment = await openIndividualEmploymentStep(page);
        await employment.selectCurrentOccupation(scenario.occupation);
        await employment.selectCurrentEmploymentType(scenario.employmentType);
        await employment.enterCurrentEmployerName("");
        await employment.enterCurrentTimeWithEmployer("", "");
        await employment.clickSaveEmploymentDetails();
        await assertTimeAtEmploymentMandatoryThenAcceptsValue(employment, "3", "0");
      });
    }

    await test.step("Employment type Retired — blank time must show validation (USIF-431)", async () => {
      const employment = await openIndividualEmploymentStep(page);
      await employment.selectCurrentOccupation("Retired / Pensioner");
      await employment.selectCurrentEmploymentType("Retired");
      await employment.enterCurrentEmployerName("");
      await employment.enterCurrentTimeWithEmployer("", "");
      await employment.clickSaveEmploymentDetails();
      await assertTimeAtEmploymentMandatoryThenAcceptsValue(employment, "2", "6");
    });
  });
});
