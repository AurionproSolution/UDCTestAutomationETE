/**
 * DO Portal — USIF-492 Split asset copy causes Bad Request (400) on Calculate
 *
 * Source: JIRA USIF-492 / MAF-9727
 * https://aurionprofintechsolutions.atlassian.net/browse/USIF-492
 * Intake: docs/jira-intake/USIF-492/intake.md
 *
 * Repro (description + MAF9727 - Bad Request.mp4):
 * 1. TL-B-Assigned → Term Loan Business - MV Dealer → Asset Details.
 * 2. Add asset via Asset & Insurance Summary → Calculate.
 * 3. Edit financial asset in summary → copy (split) asset → Submit.
 * 4. Return to Asset Details → Calculate must not show Bad Request (400).
 *
 * Fails while USIF-492 is open; passes when Calculate succeeds after split/copy.
 *
 * Manual OTP (QAT): run with **one worker**:
 *   npx playwright test USIF-492-splitAssetCalculateBadRequest --project=udc-chromium --workers=1
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Page } from "@playwright/test";
import { DOAssetDetailsPage } from "../../../../pages";
import { DOAddAssetPage } from "../../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import {
  openAddAssetEditorViaSearchDialog,
  openTlBusinessStandardQuoteFromDashboard,
  selectTlProductAndProgram,
} from "../../doRegressionTestSuite/assetDetailsAddAsset.helpers";
import {
  addSecondDistinctManualAssetViaSummary,
  editManualAssetClearAndRefill,
  fillManualAssetDetails,
  type ManualAssetDetails,
  uniqueOrigRef,
} from "../zephyr_sanitytest/sanity.helpers";

const USIF492_BAD_REQUEST = /Bad Request|\b400\b|Request failed with status code 400/i;

const PRIMARY_TL_ASSET: ManualAssetDetails = {
  value: "$20,000",
  make: "Toyota",
  model: "Hilux",
  variant: "Top",
  year: "2025",
  rego: "TG08BP5123",
  vin: "1HGCM82633A004352",
  odometer: "50000",
  colour: "Black",
};

const SPLIT_TL_ASSET: ManualAssetDetails = {
  value: "$15,000",
  make: "Mazda",
  model: "CX-5",
  variant: "GSX",
  year: "2023",
  rego: "MZD5678",
  vin: "JM3KFBDM5K0123456",
  odometer: "28000",
  colour: "Red",
};

async function expectNoCalculateBadRequest(page: Page): Promise<void> {
  const roots = page.locator(
    ".p-toast, .p-toast-message, .p-toast-detail, [role='alert'], .p-message, .p-inline-message, .p-dialog-content",
  );
  await expect
    .poll(
      async () => {
        const count = await roots.filter({ hasText: USIF492_BAD_REQUEST }).count();
        return count === 0;
      },
      { timeout: 25_000, intervals: [400, 800, 1_500, 2_500] },
    )
    .toBe(true);
}

/** TL-B on QAT: empty summary has **Search & Add Asset** (no summary Edit until a row exists). */
async function addTlAssetViaSearchAndAdd(
  page: Page,
  asset: DOAssetDetailsPage,
  addAsset: DOAddAssetPage,
  details: ManualAssetDetails,
): Promise<void> {
  await asset.enterAsset("Car and Light Commercial /");
  await asset.selectCondition("Used");
  await openAddAssetEditorViaSearchDialog(page, asset);
  await fillManualAssetDetails(addAsset, details);
  await addAsset.clickSummitButton();
  await addAsset.clickCrossButton();
  await asset.waitForAssetDetailsStepReady();
  await asset.closeSearchAddAssetDialogIfOpen().catch(() => {});
  await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
}

async function prepareCalculableTlQuoteWithAsset(
  page: Page,
  asset: DOAssetDetailsPage,
  addAsset: DOAddAssetPage,
  origRef: string,
): Promise<void> {
  await addTlAssetViaSearchAndAdd(page, asset, addAsset, PRIMARY_TL_ASSET);
  await asset.termsOfFinance("36");
  await asset.interestRate("9");
  await asset.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await asset.enterOriginationReference(origRef);
}

test.describe(
  "DO Portal - USIF-492 Split Asset Calculate Bad Request - Bug @do @bug @USIF-492",
  () => {
    test.describe.configure({ mode: "serial", timeout: 900_000 });

    test("USIF-492 - Calculate after copy split asset must not return Bad Request 400", async ({
      page,
    }) => {
      const origRef = uniqueOrigRef("USIF492");
      const asset = await openTlBusinessStandardQuoteFromDashboard(page);
      const addAsset = new DOAddAssetPage(page);
      await selectTlProductAndProgram(page, asset);

      await test.step("Create TL quote, add asset, and first Calculate (USIF-492 setup)", async () => {
        await prepareCalculableTlQuoteWithAsset(page, asset, addAsset, origRef);
        await asset.clickCalculateButton();
        await asset.waitForQuoteLoadersToFinish();
        await asset.expectTotalAmountBorrowedGreaterThanZero({ timeoutMs: 90_000 });
      });

      await test.step("Edit financial asset in summary (USIF-492)", async () => {
        await editManualAssetClearAndRefill(asset, addAsset, {
          ...PRIMARY_TL_ASSET,
          value: "$22,000",
          variant: "SR5",
        });
      });

      await test.step("Copy split asset from summary and Submit (USIF-492)", async () => {
        await addSecondDistinctManualAssetViaSummary(page, asset, addAsset, SPLIT_TL_ASSET);
        await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
      });

      await test.step("Return to Asset Details and Calculate — no Bad Request (USIF-492)", async () => {
        await asset.clickStandardQuoteStepTab(/Asset\s*Details/i);
        await asset.waitForAssetDetailsStepReady();
        await asset.enterOriginationReference(origRef).catch(() => {});

        const calcResponse = page
          .waitForResponse(
            (res) =>
              res.url().includes("/calculate") ||
              res.url().includes("/calculation") ||
              res.url().includes("/quote"),
            { timeout: 120_000 },
          )
          .catch(() => null);

        await asset.clickCalculateButton();
        const response = await calcResponse;
        if (response) {
          expect(
            response.status(),
            `USIF-492: Calculate API returned HTTP ${response.status()}`,
          ).toBeLessThan(400);
        }

        await expectNoCalculateBadRequest(page);
        await asset.waitForQuoteLoadersToFinish();
        await asset.expectPaymentScheduleSectionWithTableData();
      });
    });
  },
);
