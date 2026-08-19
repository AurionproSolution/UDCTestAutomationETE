/**
 * DO Portal — USIF-421 Trade Amount not populating Asset Value on Add Trade (sanity)
 *
 * Source: JIRA USIF-421
 * https://aurionprofintechsolutions.atlassian.net/browse/USIF-421
 *
 * Steps derived from Jira description, comments, and attachments
 * (MAF-9659 Trade Details_Asset Value.mp4, Trade amt.mp4):
 * 1. Open DO Standard Quote (CSA) and add a primary financed asset.
 * 2. Enter Trade Amount on Less Deposit (settlement calculation not used).
 * 3. Asset & Insurance Summary → Trade Summary → Search & Add Trade in → Add Trade (first trade).
 * 4. Asset Value on Add Trade should auto-populate from the quoted Trade Amount (editable).
 *
 * Note: Marked `test.fail` while USIF-421 is open. Remove when the bug is fixed.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import {
  openSanityCsaAssetDetails,
  prepareCalculableCsaQuote,
} from "../zephyr_sanitytest/sanity.helpers";

const TRADE_AMOUNT = "$5,000";
const USIF_421_OPEN = true;

function normalizeMoney(value: string): string {
  return value.replace(/[$,\s]/g, "").replace(/\.0+$/, "");
}

/** Add Trade route labels the field **Asset Value*** (not Sum Insured Net). */
function addTradeAssetValueInput(page: Page) {
  return page.getByRole("textbox", { name: /^Asset Value\*$/i }).first();
}

test.describe("DO Portal - USIF-421 Trade Amount Asset Value - Bug @do @bug @USIF-421", () => {
  test("USIF-421 - Add Trade Asset Value auto-populates from quoted Trade Amount (first trade)", async ({
    page,
  }) => {
    test.fail(
      USIF_421_OPEN,
      "USIF-421 open: Asset Value on Add Trade does not auto-populate from Trade Amount — remove test.fail when fixed",
    );
    test.setTimeout(420_000);

    const { asset: assetDetailsPage, addAsset: addAssetPage, origRef } =
      await openSanityCsaAssetDetails(page);

    await test.step("Wait for quote screen to finish loading", async () => {
      await assetDetailsPage.waitForAssetDetailsStepReady();
      await assetDetailsPage.waitForQuoteLoadersToFinish();
    });

    await test.step("Prepare CSA quote with primary asset", async () => {
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage, origRef);
    });

    await test.step("Enter Trade Amount on Less Deposit (no settlement)", async () => {
      await assetDetailsPage.enterTradeAmount(TRADE_AMOUNT);
      const entered = normalizeMoney(
        (await assetDetailsPage.tradeAmountInput.inputValue().catch(() => "")) ?? "",
      );
      expect(entered.length).toBeGreaterThan(0);
      expect(entered).not.toBe("0");
    });

    await test.step("Open Add Trade for first trade-in vehicle", async () => {
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await assetDetailsPage.clickSearchAddTradeInAndExpectChooserOpened();

      const searchTradeDlg = page
        .getByRole("dialog")
        .filter({ hasText: /Search Trade-?\s*in\s*Asset/i })
        .last();
      await expect(searchTradeDlg).toBeVisible({ timeout: 30_000 });

      const addTradeBtn = searchTradeDlg
        .getByRole("button", { name: /^Add Trade$/i })
        .or(
          searchTradeDlg
            .locator("button.p-button-text:has(.fa-square-plus)")
            .filter({ hasText: /Add Trade/i }),
        )
        .first();
      await expect(addTradeBtn).toBeVisible({ timeout: 20_000 });
      await addTradeBtn.click({ timeout: 15_000 });

      await addAssetPage.makeInputField.first().waitFor({ state: "visible", timeout: 60_000 });
      await expect(page.getByText(/Add Trade/i).first()).toBeVisible({ timeout: 30_000 });
    });

    await test.step("Asset Value auto-populates from Trade Amount and remains editable", async () => {
      const expectedTrade = normalizeMoney(TRADE_AMOUNT);
      const assetValueOnAddTrade = addTradeAssetValueInput(page);
      await expect(assetValueOnAddTrade).toBeVisible({ timeout: 30_000 });

      await expect
        .poll(
          async () =>
            normalizeMoney((await assetValueOnAddTrade.inputValue().catch(() => "")) ?? ""),
          {
            timeout: 60_000,
            intervals: [500, 1_000, 2_000],
            message:
              "USIF-421: Asset Value on Add Trade should auto-populate from quoted Trade Amount (first trade)",
          },
        )
        .toBe(expectedTrade);

      await expect(assetValueOnAddTrade).toBeEditable();
    });

    await page.getByRole("button", { name: /^Cancel$/i }).first().click({ timeout: 15_000 }).catch(() => {});
    await assetDetailsPage.closeSearchTradeInAssetDialog().catch(() => {});
    await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
  });
});
