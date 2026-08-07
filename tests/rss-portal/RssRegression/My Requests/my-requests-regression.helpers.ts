import { expect } from "../../../../fixtures/rssPortalTest";
import {
  RSSDashboardPage,
  RSSMyRequestsPage,
  RSSSideMenuPage,
} from "../../../../pages";
import { getRssPortalTestPartyName } from "../../../../testData/rss-portal/rssLoginData";

function normalizePartyLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function openMyRequestsForTestParty(
  dashboard: RSSDashboardPage,
  sideMenu: RSSSideMenuPage,
  myRequests: RSSMyRequestsPage,
  minimumRows = 2,
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
  await myRequests.expectMinimumRequestRows(minimumRows);
}
