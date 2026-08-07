/**
 * RSS Sanity — Variation Request (URP-T51 – URP-T54)
 * Zephyr: /RSS Sanity Suite/Variation Request
 * Source: Rss Variation Request Test Cases.xlsx
 *
 * Precondition: header party must have at least one **active** loan.
 */

import { test } from "../../../../fixtures/rssPortalTest";
import type { VariationRequestCategory } from "../../../../pages";
import {
  RSSDashboardPage,
  RSSLoansPage,
  RSSVariationRequestPage,
} from "../../../../pages";
import { openActiveLoanForServiceRequest } from "../active-loan.helpers";

async function runVariationRequestTest(
  dashboard: RSSDashboardPage,
  loans: RSSLoansPage,
  variation: RSSVariationRequestPage,
  category: VariationRequestCategory,
  note: string,
  options?: Parameters<RSSVariationRequestPage["completeCategoryFlow"]>[2],
): Promise<void> {
  await openActiveLoanForServiceRequest(dashboard, loans);
  await loans.openVariationRequestFromLoan();
  await variation.expectVariationRequestScreen();
  await variation.completeCategoryFlow(category, { note, preferredContactMethod: /Email/i }, options);
  await variation.submitVariationRequest();
  await variation.expectSubmissionConfirmation();
  await variation.clickViewMyRequest();
  await variation.expectMyRequestsWithListedRequest();
}

test.describe("RSS Portal — Variation Request @rss @sanity", () => {
  test("URP-T51 - Variation request - Update Payment details @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);
    const variation = new RSSVariationRequestPage(page);

    await runVariationRequestTest(
      dashboard,
      loans,
      variation,
      "Update Payment Details",
      `Automation URP-T51 update payment ${Date.now()}`,
      { subRequestType: "Change Payment Frequency" },
    );
  });

  test("URP-T52 - Variation request - Make a Lump Sum Payment @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);
    const variation = new RSSVariationRequestPage(page);

    await runVariationRequestTest(
      dashboard,
      loans,
      variation,
      "Make a Lump Sum Payment",
      `Automation URP-T52 lump sum ${Date.now()}`,
    );
  });

  test("URP-T53 - Variation request - Variation Request @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);
    const variation = new RSSVariationRequestPage(page);

    await runVariationRequestTest(
      dashboard,
      loans,
      variation,
      "Variation Request",
      `Automation URP-T53 variation ${Date.now()}`,
    );
  });

  test("URP-T54 - Variation request - Request a Payment Arrangement @smoke", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);
    const variation = new RSSVariationRequestPage(page);

    await runVariationRequestTest(
      dashboard,
      loans,
      variation,
      "Request a Payment Arrangement",
      `Automation URP-T54 payment arrangement ${Date.now()}`,
    );
  });
});
