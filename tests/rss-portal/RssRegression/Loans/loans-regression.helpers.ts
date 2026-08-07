import { expect } from "../../../../fixtures/rssPortalTest";
import { RSSDashboardPage, RSSLoansPage } from "../../../../pages";
import { getRssPortalTestPartyName } from "../../../../testData/rss-portal/rssLoginData";

function normalizePartyLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function openLoansForRssTestUser(
  dashboard: RSSDashboardPage,
  loans: RSSLoansPage,
): Promise<void> {
  expect(await dashboard.isDashboardLoaded()).toBe(true);

  const rssTestUserParty = getRssPortalTestPartyName();
  const selectedParty = await dashboard.getSelectedHeaderPartyName();
  if (
    !normalizePartyLabel(selectedParty)
      .toLowerCase()
      .includes(rssTestUserParty.toLowerCase())
  ) {
    await dashboard.selectHeaderBorrowerProfile(rssTestUserParty);
    const afterSelect = await dashboard.getSelectedHeaderPartyName();
    expect(
      normalizePartyLabel(afterSelect).toLowerCase(),
      `Header party must be ${rssTestUserParty}.`,
    ).toContain(rssTestUserParty.toLowerCase());
    await dashboard.waitForRssShellIdle();
  }

  await dashboard.clickLoans();
  expect(await dashboard.isLoansSelected()).toBe(true);
  await loans.waitForLoansScreen();
}
