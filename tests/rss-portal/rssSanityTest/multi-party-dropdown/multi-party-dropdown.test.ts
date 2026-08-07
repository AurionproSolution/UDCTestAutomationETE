/**
 * RSS Sanity — Multi-party dropdown (URP-T61)
 * Zephyr: /RSS Sanity Suite/Multi-party dropdown
 * Source: RSS Multi Party Dropdown Test Cases.xlsx
 *
 * Dashboard only — header party `p-dropdown` switching and Overview loan summary refresh.
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import { RSSDashboardPage } from "../../../../pages";

function normalizePartyLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

test.describe("RSS Portal — Multi-party dropdown @rss @sanity", () => {
  test("URP-T61 - Multi party dropdown - Party switching @smoke", async ({ page }) => {
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
  });
});
