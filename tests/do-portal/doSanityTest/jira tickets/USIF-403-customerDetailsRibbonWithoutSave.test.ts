/**
 * DO Portal — USIF-403 Customer Details ribbon navigation without Save (Standard Quote)
 *
 * Source: JIRA USIF-403
 * https://aurionprofintechsolutions.atlassian.net/browse/USIF-403
 *
 * Repro (description + attachment Dealer - Google Chrome 2026-08-18 13-38-17.mp4):
 * 1. Open Standard Quote on Asset Details and enter calculable CSA data.
 * 2. Do **not** click **Save**.
 * 3. Click **Customer Details** on the step ribbon.
 * 4. Customer Details must load (Add Borrowers / Guarantors) without requiring Save first.
 *
 * Regression guard — resolved; passes when ribbon navigation works without Save.
 *
 * Manual OTP (QAT): run with **one worker**:
 *   npx playwright test "tests/do-portal/doSanityTest/jira tickets/USIF-403-customerDetailsRibbonWithoutSave.test.ts" --project=udc-chromium --workers=1
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { DOAddAssetPage, DOAssetDetailsPage } from "../../../../pages";
import { DOCustomerDetailsPage } from "../../../../pages";
import {
  openSanityCsaAssetDetails,
  prepareCalculableCsaQuote,
} from "../zephyr_sanitytest/sanity.helpers";

/**
 * CSA Asset Details ready for ribbon navigation — mirrors `advanceAssetDetailsToCustomerDetails`
 * calculate/re-fill pattern but **does not** call Save (USIF-403).
 */
async function prepareAssetDetailsForRibbonWithoutSave(
  asset: DOAssetDetailsPage,
  addAsset: DOAddAssetPage,
  origRef: string,
): Promise<void> {
  await prepareCalculableCsaQuote(asset, addAsset, origRef);

  await asset.clickCalculateButton();
  await asset.waitForLoadingComplete(120_000);
  await asset.interestRate("4");
  await asset.clickCalculateButton();
  await asset.waitForLoadingComplete(120_000);

  await asset.ensureOriginationReferencePopulated(origRef);
  await asset.expectPaymentSummaryCalculated();
  await asset.expectTotalAmountBorrowedGreaterThanZero({ timeoutMs: 90_000 });
}

test.describe("DO Portal - USIF-403 Customer Details Ribbon Without Save - Bug @do @bug @USIF-403", () => {
  test.describe.configure({ mode: "serial", timeout: 600_000 });

  test("USIF-403 - Customer Details ribbon navigates from Asset Details without Save", async ({
    page,
  }) => {
    const { asset: assetDetailsPage, addAsset: addAssetPage, origRef } =
      await openSanityCsaAssetDetails(page);

    const customerDetailsPage = new DOCustomerDetailsPage(page);

    await test.step("Asset Details — calculable quote without Save", async () => {
      await assetDetailsPage.waitForAssetDetailsStepReady();
      await prepareAssetDetailsForRibbonWithoutSave(assetDetailsPage, addAssetPage, origRef);
      await assetDetailsPage.expectAssetDetailsStepVisible();
    });

    await test.step("Ribbon — Customer Details without Save (USIF-403)", async () => {
      await assetDetailsPage.clickStandardQuoteStepTab(/Customer\s*Details/i);
      await customerDetailsPage.waitForAddBorrowerButton();
      await expect(customerDetailsPage.addBorrowersOrGuarantorsButton).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByText(/Borrowers?\s*&\s*Guarantors?/i).first()).toBeVisible({
        timeout: 30_000,
      });
    });
  });
});
