/**
 * Shared setup for RSS sanity flows that require an active loan (variation, settlement, etc.).
 */

import { expect } from "../../../fixtures/rssPortalTest";
import { RSSDashboardPage, RSSLoansPage } from "../../../pages";
import { getRssPortalTestPartyName } from "../../../testData/rss-portal/rssLoginData";

export function normalizePartyLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function ensureTestPartyWithActiveLoan(
  dashboard: RSSDashboardPage,
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
}

/** Overview → first active contract card → contract detail. */
export async function openActiveLoanFromOverview(
  dashboard: RSSDashboardPage,
  loans: RSSLoansPage,
): Promise<void> {
  await ensureTestPartyWithActiveLoan(dashboard);
  await dashboard.clickOverviewIfNeeded();
  await dashboard.expectOverviewTabSelected();
  await dashboard.switchOverviewLoanSection("active");
  await dashboard.clickFirstActiveLoanCard();
  await loans.waitForContractDetailScreen();
}

/** Opens Loans tab and waits for contract detail (active loan precondition). */
export async function openActiveLoanFromLoansTab(
  dashboard: RSSDashboardPage,
  loans: RSSLoansPage,
): Promise<void> {
  await ensureTestPartyWithActiveLoan(dashboard);

  try {
    await openActiveLoanFromOverview(dashboard, loans);
    if (await loans.isActiveLoanDetail()) {
      return;
    }
  } catch {
    // fall through to Loans tab picker
  }

  await dashboard.clickLoans();
  expect(await dashboard.isLoansSelected()).toBe(true);
  await loans.waitForContractDetailScreen();
  await loans.ensureActiveLoanSelected();
}

/**
 * Primary entry for variation / settlement tests:
 * Overview active loan card first, then Loans tab agreement picker fallback.
 */
export async function openActiveLoanForServiceRequest(
  dashboard: RSSDashboardPage,
  loans: RSSLoansPage,
): Promise<void> {
  await openActiveLoanFromLoansTab(dashboard, loans);
}
