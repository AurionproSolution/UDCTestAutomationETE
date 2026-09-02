/**
 * DO Portal — USIF-378 Financial Position save fails with Invalid Object Property in XML (PartyId)
 *
 * Source: JIRA USIF-378
 * https://aurionprofintechsolutions.atlassian.net/browse/USIF-378
 * Intake: docs/jira-intake/USIF-378/intake.md
 *
 * Repro (description + image-20260731-023218.png):
 * 1. Standard Quote → Customer Details → Add Borrowers / Guarantors → **Add New Customer**.
 * 2. Complete Personal → Address → Employment → Financial Position.
 * 3. Save Financial Position — must not show:
 *    "Invalid object property in XML file … invalid for property PartyId …"
 *
 * Regression guard — Resolved; QA/SIT could not reproduce after fix.
 *
 * Manual OTP (QAT): run with **one worker**:
 *   npx playwright test USIF-378-financialPositionXmlPartyIdError --project=udc-chromium --workers=1
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import {
  DOAddressDetailsPage,
  DOEmploymentDetailsPage,
  DOFinancialPositionPage,
  DOReferenceDetailsPage,
} from "../../../../pages";
import { DOPersonalDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import {
  fillMinimalAddressContinue,
  fillMinimalEmploymentContinue,
} from "../../doRegressionTestSuite/workflow.helpers";
import { openSanityCustomerDetailsStep } from "../zephyr_sanitytest/sanity.helpers";

const USIF378_XML_PARTY_ID_ERROR =
  /Invalid object property in XML file|invalid for property PartyId/i;

/** Minimal personal — 0 dependants (QAT stability; avoids dependants age fields). */
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

async function expectNoFinancialPositionXmlPartyIdError(page: Page): Promise<void> {
  const roots = page.locator(
    ".p-toast, .p-toast-message, .p-toast-detail, [role='alert'], .p-message, .p-inline-message, .p-dialog-content",
  );
  await expect
    .poll(
      async () => {
        const count = await roots.filter({ hasText: USIF378_XML_PARTY_ID_ERROR }).count();
        return count === 0;
      },
      { timeout: 20_000, intervals: [400, 800, 1_500] },
    )
    .toBe(true);
}

async function fillMinimalIndividualFinancialPosition(fin: DOFinancialPositionPage): Promise<void> {
  await fin.waitForFinancialPositionStep();
  await fin.selectIndividualHomeOwnershipType("Mortgage");
  await fin.fillIndividualVehicleValueAmount("$18,000.00");
  await fin.fillFirstLiabilityBalanceAndAmount("$500,000.00", "$2,500.00");
  await fin.setFirstLiabilityRowFrequencyMonthly();
  await fin.fillFirstIncomeAmount("$5,000.00");
  await fin.setTakeHomePayFrequencyMonthly();
  await fin.selectIncomeLikelyToDecreaseNo().catch(() => {});
  await fin.fillExpenditureAmountByLabel(/Council Rates/i, "$220.00");
  await fin.setExpenditureRowFrequencyMonthlyByLabel(/Council Rates/i);
  await fin.fillEssentialOutgoingAmount("$150.00");
  await fin.setEssentialOutgoingFrequencyMonthly();
}

test.describe(
  "DO Portal - USIF-378 Financial Position XML PartyId - Bug @do @bug @USIF-378",
  () => {
    test.describe.configure({ mode: "serial", timeout: 900_000 });

    test("USIF-378 - New customer Financial Position saves without XML PartyId error", async ({
      page,
    }) => {
      const { customer } = await openSanityCustomerDetailsStep(page);

      await test.step("Add new individual borrower (USIF-378 party path)", async () => {
        await customer.clickAddBorrowersOrGuarantors();
        await customer.searchCustomer.searchByUdcNumber("420");
        await customer.clickAddNewCustomerButton();

        const personal = new DOPersonalDetailsPage(page);
        await fillMinimalIndividualPersonal(personal);
        await personal.clickNextButton();
      });

      await test.step("Address and Employment — advance to Financial Position", async () => {
        const address = new DOAddressDetailsPage(page);
        await fillMinimalAddressContinue(page, address);
        const emp = new DOEmploymentDetailsPage(page);
        await fillMinimalEmploymentContinue(emp);
      });

      await test.step("Financial Position save must not show XML PartyId error (USIF-378)", async () => {
        const fin = new DOFinancialPositionPage(page);
        await fillMinimalIndividualFinancialPosition(fin);
        await fin.clickNextButton();

        await expectNoFinancialPositionXmlPartyIdError(page);

        const ref = new DOReferenceDetailsPage(page);
        await ref.waitForReferenceDetailsStep();
      });
    });
  },
);
