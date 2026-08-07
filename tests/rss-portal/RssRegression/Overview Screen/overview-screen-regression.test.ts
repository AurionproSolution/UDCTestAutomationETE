/**
 * RSS Regression — Overview Screen (URP-T92, URP-T122, URP-T159–T162, URP-T198)
 * Zephyr: /RSS Regression Suite/Overview Screen
 * Source: RSS Overview Screen Regression test cases.xlsx
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import { RSSDashboardPage } from "../../../../pages";
import { tryEnsurePartyWithOverviewLoanSection } from "../../rssSanityTest/active-loan.helpers";

async function skipUnlessOverviewSectionAvailable(
  dashboard: RSSDashboardPage,
  section: "active" | "repaid" | "draft",
): Promise<void> {
  const found = await tryEnsurePartyWithOverviewLoanSection(dashboard, section);
  if (!found) {
    test.skip(
      true,
      `Precondition: at least one party must have ${section} contracts (Excel precondition).`,
    );
  }
}

test.describe("RSS Portal — Overview Screen @rss @regression", () => {
  test(
    "URP-T92 - Overview - Contract visibility",
    { tag: ["@rss", "@regression", "@URP-T92"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await dashboard.expectOverviewTabSelected();
      await dashboard.expectOverviewLoanSummaryVisible();

      await dashboard.expectOverviewSectionContractVisibility("active");
      await dashboard.expectOverviewSectionContractVisibility("repaid");
      await dashboard.expectOverviewSectionContractVisibility("draft");
    },
  );

  test(
    "URP-T122 - Overview - What's New section",
    { tag: ["@rss", "@regression", "@URP-T122"] },
    async ({ page }) => {
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
          "Precondition: promotional offers must be configured for the selected party.",
        );
      }

      await dashboard.expectPromotionalOffersForSelectedParty();
    },
  );

  test(
    "URP-T159 - Overview - Active Loans - Visibility of fields",
    { tag: ["@rss", "@regression", "@URP-T159"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await dashboard.expectOverviewTabSelected();
      await skipUnlessOverviewSectionAvailable(dashboard, "active");
      await dashboard.expectOverviewLoanCardFieldsVisible("active");
    },
  );

  test(
    "URP-T160 - Overview - Draft quotes - Visibility of fields",
    { tag: ["@rss", "@regression", "@URP-T160"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await dashboard.expectOverviewTabSelected();
      await skipUnlessOverviewSectionAvailable(dashboard, "draft");
      await dashboard.expectOverviewLoanCardFieldsVisible("draft");
    },
  );

  test(
    "URP-T161 - Overview - Repaid Loans - Visibility of fields",
    { tag: ["@rss", "@regression", "@URP-T161"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await dashboard.expectOverviewTabSelected();
      await skipUnlessOverviewSectionAvailable(dashboard, "repaid");
      await dashboard.expectOverviewLoanCardFieldsVisible("repaid");
    },
  );

  test(
    "URP-T162 - Overview - Check View more on contract visibility",
    { tag: ["@rss", "@regression", "@URP-T162"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await dashboard.expectOverviewTabSelected();

      for (const section of ["active", "repaid", "draft"] as const) {
        await tryEnsurePartyWithOverviewLoanSection(dashboard, section);
        const counts = await dashboard.getOverviewLoanCounts();
        if (counts[section] <= 1) {
          continue;
        }
        await dashboard.expectViewMoreLoadsAdditionalOverviewCards(section);
      }
    },
  );

  test(
    "URP-T198 - Overview - Visibility of Login Time and Date",
    { tag: ["@rss", "@regression", "@URP-T198"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await dashboard.expectLoginDateTimeVisibleAndUpdatesOnRefresh();
    },
  );
});
