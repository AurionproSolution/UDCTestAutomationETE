/**
 * RSS Regression — My Requests (URP-T108–T110)
 * Zephyr: /RSS Regression Suite/My Requests
 * Source: Rss My Request Regression Test Cases.xlsx
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import {
  RSSDashboardPage,
  RSSMyRequestsPage,
  RSSSideMenuPage,
} from "../../../../pages";
import { openMyRequestsForTestParty } from "./my-requests-regression.helpers";

test.describe("RSS Portal — My Requests @rss @regression", () => {
  test(
    "URP-T108 - My Requests - Filters/Sorting of requests list",
    { tag: ["@rss", "@regression", "@URP-T108"] },
    async ({ page }) => {
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
    },
  );

  test(
    "URP-T109 - My Requests - Request Preview",
    { tag: ["@rss", "@regression", "@URP-T109"] },
    async ({ page }) => {
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
    },
  );

  test(
    "URP-T110 - My Requests - Search box",
    { tag: ["@rss", "@regression", "@URP-T110"] },
    async ({ page }) => {
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
    },
  );
});
