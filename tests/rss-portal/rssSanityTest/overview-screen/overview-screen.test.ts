/**
 * RSS Sanity — Overview Screen (URP-T46, URP-T76, URP-T224)
 * Zephyr: /RSS Sanity Suite/Overview Screen
 * Source: RSS Overview Screen Test Cases.xlsx
 *
 * Dashboard Overview tab — loan summary sections and What's New sidebar.
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import { RSSDashboardPage } from "../../../../pages";

test.describe("RSS Portal — Overview Screen @rss @sanity", () => {
  test("URP-T46 - Overview - Contract visibility @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);

    expect(await dashboard.isDashboardLoaded()).toBe(true);
    await dashboard.expectOverviewTabSelected();
    await dashboard.expectOverviewLoanSummaryVisible();

    await dashboard.expectOverviewSectionContractVisibility("active");
    await dashboard.expectOverviewSectionContractVisibility("repaid");
    await dashboard.expectOverviewSectionContractVisibility("draft");
  });

  test("URP-T76 - Overview - What's New section @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);

    expect(await dashboard.isDashboardLoaded()).toBe(true);
    await dashboard.expectOverviewTabSelected();
    await dashboard.expectWhatsNewSectionVisible();

    const noOffers = await page
      .getByText(/No offers at this time/i)
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (noOffers) {
      test.skip(
        true,
        "Precondition: promotional offers must be configured for the selected party (SIT shows 'No offers at this time').",
      );
    }

    await dashboard.expectPromotionalOffersForSelectedParty();
  });

  test("URP-T224 - Overview - Welcome back card last login date and time @smoke", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);

    expect(await dashboard.isDashboardLoaded()).toBe(true);
    await dashboard.expectWelcomeBackCardWithLastLoginVisible();
  });
});
