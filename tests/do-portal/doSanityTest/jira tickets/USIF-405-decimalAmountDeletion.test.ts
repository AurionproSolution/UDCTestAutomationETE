/**
 * DO Portal — USIF-405 Decimal amount field deletion / cursor at decimal (Home Ownership amount)
 *
 * Source: JIRA USIF-405
 * https://aurionprofintechsolutions.atlassian.net/browse/USIF-405
 * Related: MAF-9304
 *
 * Repro (description + video Dealer - Google Chrome 2026-08-11 16-53-55.mp4):
 * 1. CSA-C-Assigned quote → add individual → Financial Position.
 * 2. Enter Vehicle Value 4000 under Assets (graph baseline).
 * 3. Enter max Home Ownership amount; with caret in the **decimal** portion:
 *    - Issue 1: Backspace removes digits from the **left** of the integer instead of the fraction.
 *    - Issue 2: Typing digits appends to the **integer** part instead of the decimal part.
 *
 * Fails while USIF-405 is open; passes when decimal editing behaves correctly.
 *
 * Manual OTP (QAT): run with **one worker**:
 *   npx playwright test "tests/do-portal/doSanityTest/jira tickets/USIF-405-decimalAmountDeletion.test.ts" --project=udc-chromium --workers=1
 */

import { expect, test } from "@fixtures/doPortalTest";
import {
  DOAddressDetailsPage,
  DOEmploymentDetailsPage,
  DOFinancialPositionPage,
} from "../../../../pages";
import { DOPersonalDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import {
  fillMinimalAddressContinue,
  openSanityCustomerDetailsStep,
} from "../zephyr_sanitytest/sanity.helpers";

const VEHICLE_VALUE = "4000";
/** Jira issue 1 — $9,999,999,999.99 */
const HOME_AMOUNT_WITH_DECIMAL = "9999999999.99";
/** Jira issue 2 — max integer before decimal editing */
const HOME_AMOUNT_MAX_INTEGER = "9999999999999999";

type AmountParts = { integer: string; fraction: string };

function parseAmountParts(digitsOnly: string): AmountParts {
  const normalized = digitsOnly.replace(/[$,\s]/g, "").trim() || "0";
  const [integer = "0", fraction = ""] = normalized.split(".");
  return { integer, fraction };
}

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

async function openCsaIndividualFinancialPosition(
  page: import("@playwright/test").Page,
): Promise<DOFinancialPositionPage> {
  const { customer } = await openSanityCustomerDetailsStep(page);
  await customer.clickAddBorrowersOrGuarantors();
  await customer.searchCustomer.searchByUdcNumber("420");
  await customer.clickAddNewCustomerButton();

  const personal = new DOPersonalDetailsPage(page);
  await fillMinimalIndividualPersonal(personal);
  await personal.clickNextButton();

  const address = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, address);

  const employment = new DOEmploymentDetailsPage(page);
  await employment.clickNextButton();

  const financial = new DOFinancialPositionPage(page);
  await financial.waitForFinancialPositionStep();
  await expect(financial.individualAssetDetailsCard).toBeVisible({ timeout: 90_000 });
  return financial;
}

test.describe("DO Portal - USIF-405 Decimal Amount Deletion - Bug @do @bug @USIF-405", () => {
  test.describe.configure({ mode: "serial", timeout: 900_000 });

  test("USIF-405 - Home Ownership amount decimal backspace and typing respect caret position", async ({
    page,
  }) => {
    const financial = await openCsaIndividualFinancialPosition(page);

    await test.step("Jira setup — Vehicle Value 4000 and observe Assets chart", async () => {
      await financial.fillIndividualVehicleValueAmount(VEHICLE_VALUE);
      await expect(financial.individualAssetDetailsCard.getByText(/Vehicle Value/i)).toBeVisible();

      const chart = financial.assetsTotalChartLocator();
      if (await chart.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(chart).toBeVisible();
      }
    });

    const homeAmount = await financial.individualHomeOwnershipAmountInput();

    await test.step("Issue 1 — backspace at decimal must not delete leading integer digits (USIF-405)", async () => {
      await financial.fillIndividualHomeValueAmount(HOME_AMOUNT_WITH_DECIMAL);
      const beforeDigits = await financial.readAmountFieldDigits(homeAmount);
      const before = parseAmountParts(beforeDigits);
      expect(before.fraction.length).toBeGreaterThan(0);

      await financial.placeCaretAtDecimalFraction(homeAmount);
      await homeAmount.press("Backspace");
      await page.waitForTimeout(400);

      const after = parseAmountParts(await financial.readAmountFieldDigits(homeAmount));

      expect(
        after.integer,
        `USIF-405: backspace at decimal changed integer (${before.integer} → ${after.integer})`,
      ).toBe(before.integer);
      expect(
        after.fraction.length,
        "USIF-405: backspace at decimal should remove a fractional digit",
      ).toBeLessThan(before.fraction.length);
    });

    await test.step("Issue 2 — typing at decimal must append to fraction, not integer (USIF-405)", async () => {
      await financial.fillIndividualHomeValueAmount(HOME_AMOUNT_MAX_INTEGER);
      const before = parseAmountParts(await financial.readAmountFieldDigits(homeAmount));

      await financial.placeCaretAtDecimalFraction(homeAmount);
      await homeAmount.pressSequentially("5", { delay: 40 });
      await homeAmount.press("Tab").catch(() => {});
      await page.waitForTimeout(400);

      const after = parseAmountParts(await financial.readAmountFieldDigits(homeAmount));

      expect(
        after.integer,
        `USIF-405: typed at decimal but integer changed (${before.integer} → ${after.integer})`,
      ).toBe(before.integer);
      expect(
        after.fraction,
        "USIF-405: digit typed at decimal position should appear in the fraction",
      ).toMatch(/5/);
    });
  });
});
