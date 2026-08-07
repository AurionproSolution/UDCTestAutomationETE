/**
 * RSS Sanity — My Requests (URP-T62 – URP-T64)
 * Zephyr: /RSS Sanity Suite/My Requests
 * Source: RSS My requests Test cases.xlsx
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import {
  RSSDashboardPage,
  RSSMyRequestsPage,
  RSSSideMenuPage,
} from "../../../../pages";
import { getRssPortalTestPartyName } from "../../../../testData/rss-portal/rssLoginData";

function normalizePartyLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

async function openMyRequestsForTestParty(
  dashboard: RSSDashboardPage,
  sideMenu: RSSSideMenuPage,
  myRequests: RSSMyRequestsPage,
): Promise<void> {
  expect(await dashboard.isDashboardLoaded()).toBe(true);

  const partyName = getRssPortalTestPartyName();
  const selectedParty = await dashboard.getSelectedHeaderPartyName();
  if (
    !normalizePartyLabel(selectedParty)
      .toLowerCase()
      .includes(partyName.toLowerCase())
  ) {
    await dashboard.selectHeaderBorrowerProfile(partyName);
    const afterSelect = await dashboard.getSelectedHeaderPartyName();
    expect(
      normalizePartyLabel(afterSelect).toLowerCase(),
      `Header party must be ${partyName}.`,
    ).toContain(partyName.toLowerCase());
    await dashboard.waitForRssShellIdle();
  }

  await sideMenu.clickDrawerMenuItem("My Requests");
  await myRequests.expectMyRequestsScreen();
  await myRequests.expectMinimumRequestRows(2);
}

test.describe("RSS Portal — My Requests @rss @sanity", () => {
  test("URP-T62 - My Requests - Filters/Sorting of requests list @smoke", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const sideMenu = new RSSSideMenuPage(page);
    const myRequests = new RSSMyRequestsPage(page);

    await openMyRequestsForTestParty(dashboard, sideMenu, myRequests);

    await myRequests.sortByColumn(/Date/i);
    await myRequests.expectDateColumnSorted("asc");

    await myRequests.sortByColumn(/Date/i);
    await myRequests.expectDateColumnSorted("desc");

    await myRequests.openColumnFilter(/Request Type/i);
    await myRequests.expectColumnFilterMatchOptions([
      /Starts\s*with/i,
      /Contains/i,
      /Not\s*contains/i,
      /Ends\s*with/i,
      /Equals/i,
      /Not\s*equals/i,
    ]);
    await myRequests.closeColumnFilterOverlay();

    const rowsBeforeFilter = await myRequests.getVisibleRequestRows();
    const requestNoFragment = rowsBeforeFilter[0]?.requestNo.slice(0, 2) ?? "38";
    await myRequests.filterColumn(/Request No\./i, /Contains/i, requestNoFragment);
    await myRequests.expectVisibleRequestNumbersMatch(new RegExp(requestNoFragment));
    await myRequests.clearColumnFilter(/Request No\./i);
    await myRequests.expectMinimumRequestRows(2);
  });

  test("URP-T63 - My Requests - Request Preview @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const sideMenu = new RSSSideMenuPage(page);
    const myRequests = new RSSMyRequestsPage(page);

    await openMyRequestsForTestParty(dashboard, sideMenu, myRequests);

    const [firstRow] = await myRequests.getVisibleRequestRows();
    expect(firstRow.requestNo.length).toBeGreaterThan(0);

    await myRequests.openRequestPreview();
    await myRequests.expectRequestPreviewVisible();
    await myRequests.expectRequestPreviewShowsRow(firstRow);
    await myRequests.closeRequestPreview();
  });

  test("URP-T64 - My Requests - Search box @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const sideMenu = new RSSSideMenuPage(page);
    const myRequests = new RSSMyRequestsPage(page);

    await openMyRequestsForTestParty(dashboard, sideMenu, myRequests);

    const rows = await myRequests.getVisibleRequestRows();
    const firstRow = rows[0];
    expect(firstRow.requestNo.length).toBeGreaterThan(0);

    await myRequests.searchRequests(firstRow.requestNo);
    await myRequests.expectSearchResultsContainRequestNo(firstRow.requestNo);
    await expect(myRequests.requestRowByNumber(firstRow.requestNo)).toBeVisible({
      timeout: 15_000,
    });

    await myRequests.clearSearch();
    await myRequests.expectMinimumRequestRows(2);

    const rowWithLoan = rows.find((row) => row.loanNo && row.loanNo !== "-");
    expect(rowWithLoan, "Need at least one request with a loan number for search.").toBeTruthy();

    await myRequests.searchRequests(rowWithLoan!.loanNo);
    await myRequests.expectSearchResultsContainLoanNo(rowWithLoan!.loanNo);
    await expect(myRequests.requestRowByLoanNo(rowWithLoan!.loanNo)).toBeVisible({
      timeout: 15_000,
    });
  });
});
