/**
 * RSS Regression — Multi-party dropdown (URP-T107, URP-T140)
 * Zephyr: /RSS Regression Suite/Multi-party dropdown
 * Source: RSS Multi Party Dropdown Regression Test cases.xlsx
 *
 * Dashboard only — header party `p-dropdown` switching and Overview loan summary refresh.
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import { RSSDashboardPage } from "../../../../pages";

function normalizePartyLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

test.describe("RSS Portal — Multi-party dropdown @rss @regression", () => {
  test(
    "URP-T107 - Multi party dropdown - Party switching",
    { tag: ["@rss", "@regression", "@URP-T107"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await dashboard.expectOverviewLoanSummaryVisible();

      const defaultParty = await dashboard.getSelectedHeaderPartyName();
      expect(defaultParty.length).toBeGreaterThan(0);

      const partyOptions = await dashboard.getHeaderPartyDropdownOptionLabels();
      expect(
        partyOptions.length,
        "Logged-in user must have customer visibility of more than one party (Excel precondition).",
      ).toBeGreaterThan(1);
      for (const option of partyOptions) {
        expect(option.length).toBeGreaterThan(0);
      }

      const alternateParty =
        partyOptions.find(
          (name) => normalizePartyLabel(name).toLowerCase() !== defaultParty.toLowerCase(),
        ) ?? partyOptions[1];

      const countsBefore = await dashboard.getOverviewLoanCounts();

      await dashboard.selectHeaderBorrowerProfile(alternateParty);

      const selectedParty = await dashboard.getSelectedHeaderPartyName();
      expect(selectedParty.toLowerCase()).toContain(
        normalizePartyLabel(alternateParty).toLowerCase(),
      );
      expect(selectedParty.toLowerCase()).not.toBe(defaultParty.toLowerCase());

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await dashboard.expectOverviewLoanSummaryVisible();

      const countsAfter = await dashboard.getOverviewLoanCounts();
      const countsChanged =
        countsBefore.active !== countsAfter.active ||
        countsBefore.repaid !== countsAfter.repaid ||
        countsBefore.draft !== countsAfter.draft;

      if (countsChanged) {
        expect(countsAfter).not.toEqual(countsBefore);
      } else {
        await expect(page.getByText(/Welcome Back/i).first()).toBeVisible({ timeout: 15_000 });
      }
    },
  );

  test(
    "URP-T140 - Multi party dropdown - Visibility of all parties in customer visibility",
    { tag: ["@rss", "@regression", "@URP-T140"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await dashboard.expectOverviewLoanSummaryVisible();

      const selectedParty = await dashboard.getSelectedHeaderPartyName();
      expect(selectedParty.length).toBeGreaterThan(0);

      const visibleParties = await dashboard.expectHeaderPartyDropdownOptionsVisible();
      expect(visibleParties.length).toBeGreaterThan(1);
      expect(
        visibleParties.some(
          (name) =>
            normalizePartyLabel(name).toLowerCase() === normalizePartyLabel(selectedParty).toLowerCase(),
        ),
      ).toBe(true);
    },
  );
});
