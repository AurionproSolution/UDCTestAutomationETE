/**
 * DO Portal — USIF-463 Personal Details ribbon auto-save on first tab navigation
 *
 * Source: JIRA USIF-463 (MAF-9631)
 * https://aurionprofintechsolutions.atlassian.net/browse/USIF-463
 *
 * Repro (description + Screen Recording 2026-08-06 173108.mp4):
 * 1. Customer Details → Add New Customer (Individual).
 * 2. Personal Details — enter min party fields (First Name + Last Name); do **not** Save/Next.
 * 3. First ribbon navigation: click **Address Details**.
 * 4. Party must auto-save and Address Details must load — no "Please save the party to proceed".
 *
 * Fails while USIF-463 is open (ribbon shows save-party block message).
 *
 * Manual OTP (QAT): run with **one worker**:
 *   npx playwright test "tests/do-portal/doSanityTest/jira tickets/USIF-463-personalDetailsRibbonAutoSave.test.ts" --project=udc-chromium --workers=1
 */

import { test } from "@fixtures/doPortalTest";
import { DOAddressDetailsPage } from "../../../../pages";
import { DOPersonalDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import { openSanityCustomerDetailsStep } from "../zephyr_sanitytest/sanity.helpers";

test.describe("DO Portal - USIF-463 Personal Details Ribbon Auto Save - Bug @do @bug @USIF-463", () => {
  test.describe.configure({ mode: "serial", timeout: 900_000 });

  test("USIF-463 - Ribbon Address Details auto-saves party without save-party block message", async ({
    page,
  }) => {
    const { customer } = await openSanityCustomerDetailsStep(page);

    await test.step("Add new individual — Personal Details with min party fields only", async () => {
      await customer.clickAddBorrowersOrGuarantors();
      await customer.searchCustomer.searchByUdcNumber("420");
      await customer.clickAddNewCustomerButton();

      const personal = new DOPersonalDetailsPage(page);
      await personal.fillMinimalPartySaveFields("Liza", "Doe");
    });

    await test.step("First ribbon leave Personal → Address Details (USIF-463)", async () => {
      const personal = new DOPersonalDetailsPage(page);
      const address = new DOAddressDetailsPage(page);

      await address.clickCustomerDetailsStepTab(/Address\s*Details/i);
      await personal.expectNoSavePartyRibbonBlockMessage();
      await address.expectAddressDetailsSectionHeaderVisible();
    });
  });
});
