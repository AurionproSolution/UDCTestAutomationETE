import { expect } from "../../../../fixtures/rssPortalTest";
import {
  RSSDashboardPage,
  RSSServiceRequestPage,
  RSSSideMenuPage,
} from "../../../../pages";
import { getRssPortalTestPartyName } from "../../../../testData/rss-portal/rssLoginData";

function normalizePartyLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function ensureServiceRequestParty(dashboard: RSSDashboardPage): Promise<void> {
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
}

export async function openServiceRequestFromDrawer(
  dashboard: RSSDashboardPage,
  sideMenu: RSSSideMenuPage,
  serviceRequest: RSSServiceRequestPage,
): Promise<void> {
  expect(await dashboard.isDashboardLoaded()).toBe(true);
  await sideMenu.clickDrawerMenuItem("Create Request");
  await serviceRequest.expectServiceRequestScreen();
}
