/**
 * DO Portal — USIF-491 Bottom task bar moves / disappears when browser zoom below 100%
 * (Customer Details → Search Results)
 *
 * Source: JIRA USIF-491
 * https://aurionprofintechsolutions.atlassian.net/browse/USIF-491
 * Related: MAF-9728
 * Intake: docs/jira-intake/USIF-491/intake.md
 *
 * Repro (description + attachment MAF9728 - Cancel Button not visable when screen on 75%.mp4):
 * 1. Standard Quote → Customer Details → Add Borrowers / Guarantors.
 * 2. Search by UDC → **Borrower Search Results** screen (empty or populated).
 * 3. At 100% zoom, bottom **Cancel** on the task bar is visible.
 * 4. Reduce zoom to 80% — Cancel must stay anchored and visible (video references 75%).
 *
 * Fails while USIF-491 is open; passes when the footer stays static at reduced zoom.
 *
 * Manual OTP (QAT): run with **one worker**:
 *   npx playwright test USIF-491-customerDetailsSearchResultsBottomBarZoom --project=udc-chromium --workers=1
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DOCustomerDetailsPage } from "../../../../pages";
import {
  openSanityCustomerDetailsStep,
  SANITY_NO_MATCH_UDC,
} from "../zephyr_sanitytest/sanity.helpers";

const ZOOM_FULL_PERCENT = 100;
/** Jira description: 100% → 80%. Video attachment title references 75%. */
const ZOOM_REDUCED_PERCENT = 80;
/** Allowed vertical drift of footer Cancel at reduced zoom (px). */
const MAX_FOOTER_VERTICAL_SHIFT_PX = 48;

type Box = { x: number; y: number; width: number; height: number };

/** Cancel on Borrower Search Results chrome (USIF-491 / MAF-9728). */
function searchResultsCancelButton(page: Page): Locator {
  return page.getByRole("button", { name: /^Cancel$/i }).filter({ visible: true }).first();
}

async function setBrowserZoomPercent(page: Page, percent: number): Promise<void> {
  const scale = percent / 100;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: scale });
  await page.waitForTimeout(600);
}

async function viewportSize(page: Page): Promise<{ width: number; height: number }> {
  const configured = page.viewportSize();
  if (configured) return configured;
  return page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
}

async function readVisibleBox(locator: Locator, label: string): Promise<Box> {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await expect(locator, `${label} should be visible`).toBeVisible({ timeout: 30_000 });
  await expect(locator, `${label} should be in viewport`).toBeInViewport({ timeout: 15_000 });
  const box = await locator.boundingBox();
  expect(box, `${label} should have a layout box`).not.toBeNull();
  return box as Box;
}

async function openCustomerDetailsSearchResults(
  page: Page,
): Promise<{ customer: DOCustomerDetailsPage }> {
  const { customer } = await openSanityCustomerDetailsStep(page);
  await customer.clickAddBorrowersOrGuarantors();
  await customer.searchCustomer.selectIndividualType();
  await customer.searchCustomer.searchByUdcNumber(SANITY_NO_MATCH_UDC);
  await customer.searchCustomer.waitForBorrowerSearchResultsScreen();
  await expect(page).toHaveURL(/borrower-search-result/i, { timeout: 90_000 });
  return { customer };
}

test.describe(
  "DO Portal - USIF-491 Customer Details Search Results Bottom Bar Zoom - Bug @do @bug @USIF-491",
  () => {
    test.describe.configure({ mode: "serial", timeout: 900_000 });

    test("USIF-491 - Bottom task bar stays anchored when zoom is reduced from 100% to 80%", async ({
      page,
    }) => {
      await openCustomerDetailsSearchResults(page);

      const cancel = searchResultsCancelButton(page);
      let cancelAt100: Box | undefined;

      try {
        await test.step("Capture Cancel on Search Results at 100% zoom (USIF-491)", async () => {
          await setBrowserZoomPercent(page, ZOOM_FULL_PERCENT);
          cancelAt100 = await readVisibleBox(cancel, "Cancel at 100%");
          await expect(
            page.getByRole("button", { name: /Add New Customer/i }).first(),
          ).toBeVisible({ timeout: 15_000 });
        });

        await test.step("At 80% zoom, Cancel must remain visible and in viewport (USIF-491)", async () => {
          await setBrowserZoomPercent(page, ZOOM_REDUCED_PERCENT);
          await readVisibleBox(cancel, "Cancel at 80%");
        });

        await test.step("At 80% zoom, Cancel must not shift off-screen vertically (USIF-491)", async () => {
          const cancelAt80 = await readVisibleBox(cancel, "Cancel at 80% for shift check");
          const yShift = Math.abs(cancelAt80.y - (cancelAt100 as Box).y);
          expect(
            yShift,
            `USIF-491: Cancel shifted ${yShift}px vertically (100% y=${(cancelAt100 as Box).y}, 80% y=${cancelAt80.y})`,
          ).toBeLessThanOrEqual(MAX_FOOTER_VERTICAL_SHIFT_PX);

          const viewport = await viewportSize(page);
          const bottomEdge = cancelAt80.y + cancelAt80.height;
          expect(
            bottomEdge,
            `USIF-491: Cancel bottom edge (${bottomEdge}) is below viewport (${viewport.height})`,
          ).toBeLessThanOrEqual(viewport.height + 4);
        });
      } finally {
        await setBrowserZoomPercent(page, ZOOM_FULL_PERCENT).catch(() => {});
      }
    });
  },
);
