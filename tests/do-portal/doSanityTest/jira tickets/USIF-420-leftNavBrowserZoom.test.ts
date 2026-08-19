/**
 * DO Portal — USIF-420 Left-hand navigation bar shifts when browser zoom is reduced (100% → 80%)
 *
 * Source: JIRA USIF-420
 * https://aurionprofintechsolutions.atlassian.net/browse/USIF-420
 * Related: MAF-9652
 *
 * Repro (description + attachments image-20260810-034917.png, MAF-9652_*.mp4):
 * 1. Log in to DO Portal and open the dealer dashboard.
 * 2. Note the left-hand icon navigation bar at 100% zoom.
 * 3. Reduce browser zoom to 80%.
 * 4. The left nav must stay anchored — it must not shift across the screen or cover main content.
 *
 * Fails while USIF-420 is open; passes when the nav remains static at 80% zoom.
 *
 * Manual OTP (QAT): run with **one worker**:
 *   npx playwright test "tests/do-portal/doSanityTest/jira tickets/USIF-420-leftNavBrowserZoom.test.ts" --project=udc-chromium --workers=1
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { openDashboard } from "../../doRegressionTestSuite/workflow.helpers";

const ZOOM_FULL_PERCENT = 100;
const ZOOM_REDUCED_PERCENT = 80;
/** Allowed horizontal drift of the left nav when zoom changes (px). */
const MAX_NAV_HORIZONTAL_SHIFT_PX = 8;

type Box = { x: number; y: number; width: number; height: number };

/** DO Portal vertical icon sidebar (not the breadcrumb nav with Home / Dashboard text). */
function leftHandIconNavigation(page: Page): Locator {
  return page
    .locator("nav")
    .filter({ has: page.locator("li img") })
    .filter({ hasNot: page.getByText(/^Home$/i) })
    .first();
}

/** Main dashboard work area — widgets inside dealer shell (USIF-420 overlap check). */
function dashboardMainContent(page: Page): Locator {
  return page.locator("app-dashboard").first();
}

async function setBrowserZoomPercent(page: Page, percent: number): Promise<void> {
  const scale = percent / 100;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: scale });
  await page.waitForTimeout(600);
}

async function readVisibleBox(locator: Locator, label: string): Promise<Box> {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await expect(locator, `${label} should be visible`).toBeVisible({ timeout: 30_000 });
  const box = await locator.boundingBox();
  expect(box, `${label} should have a layout box`).not.toBeNull();
  return box as Box;
}

test.describe("DO Portal - USIF-420 Left Nav Browser Zoom - Bug @do @bug @USIF-420", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  test("USIF-420 - Left-hand navigation stays anchored when zoom is reduced from 100% to 80%", async ({
    page,
  }) => {
    const dashboard = await openDashboard(page);
    await dashboard.waitForAuthenticatedDashboard();

    const leftNav = leftHandIconNavigation(page);
    const mainContent = dashboardMainContent(page);

    let navAt100: Box | undefined;
    let contentAt100: Box | undefined;

    try {
      await test.step("Capture left nav and main content layout at 100% zoom", async () => {
        await setBrowserZoomPercent(page, ZOOM_FULL_PERCENT);
        navAt100 = await readVisibleBox(leftNav, "Left-hand navigation at 100%");
        contentAt100 = await readVisibleBox(mainContent, "Dashboard main content at 100%");
      });

      await test.step("At 80% zoom, left nav must not shift horizontally (USIF-420)", async () => {
        await setBrowserZoomPercent(page, ZOOM_REDUCED_PERCENT);
        const navAt80 = await readVisibleBox(leftNav, "Left-hand navigation at 80%");

        const xShift = Math.abs(navAt80.x - (navAt100 as Box).x);
        expect(
          xShift,
          `USIF-420: left nav shifted ${xShift}px on X axis (100% x=${(navAt100 as Box).x}, 80% x=${navAt80.x})`,
        ).toBeLessThanOrEqual(MAX_NAV_HORIZONTAL_SHIFT_PX);
      });

      await test.step("At 80% zoom, left nav must not overlap dashboard content (USIF-420)", async () => {
        const navAt80 = await readVisibleBox(leftNav, "Left-hand navigation at 80%");
        const contentAt80 = await readVisibleBox(mainContent, "Dashboard main content at 80%");

        const navRight = navAt80.x + navAt80.width;
        expect(
          contentAt80.x,
          `USIF-420: nav overlaps content (nav right edge=${navRight}, content left=${contentAt80.x})`,
        ).toBeGreaterThanOrEqual(navRight - 2);

        if (contentAt100) {
          const contentShift = Math.abs(contentAt80.x - contentAt100.x);
          expect(
            contentShift,
            `USIF-420: main content shifted ${contentShift}px — nav may be blocking layout`,
          ).toBeLessThanOrEqual(40);
        }
      });
    } finally {
      await setBrowserZoomPercent(page, ZOOM_FULL_PERCENT).catch(() => {});
    }
  });
});
