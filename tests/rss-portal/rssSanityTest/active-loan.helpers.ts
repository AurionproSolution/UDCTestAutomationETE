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
  const found = await tryEnsurePartyWithOverviewLoanSection(dashboard, "active");
  expect(
    found,
    "No party with active contracts found for this user (active loan precondition).",
  ).toBe(true);
}

/** Returns true when a header party with contracts in the Overview section was selected. */
export async function tryEnsurePartyWithOverviewLoanSection(
  dashboard: RSSDashboardPage,
  section: "active" | "repaid" | "draft",
): Promise<boolean> {
  expect(await dashboard.isDashboardLoaded()).toBe(true);
  await dashboard.clickOverviewIfNeeded();
  await dashboard.expectOverviewTabSelected();

  const sectionCount = async (): Promise<number> => {
    const counts = await dashboard.getOverviewLoanCounts();
    return counts[section];
  };

  if ((await sectionCount()) > 0) {
    return true;
  }

  const tried = new Set<string>();
  const trySelectParty = async (party: string): Promise<boolean> => {
    const key = normalizePartyLabel(party).toLowerCase();
    if (!key || tried.has(key)) {
      return false;
    }
    tried.add(key);

    await dashboard.selectHeaderBorrowerProfile(party);
    await dashboard.waitForRssShellIdle();
    await dashboard.clickOverviewIfNeeded();
    await dashboard.expectOverviewTabSelected();
    return (await sectionCount()) > 0;
  };

  if (await trySelectParty(getRssPortalTestPartyName())) {
    return true;
  }

  const parties = await dashboard.getHeaderPartyDropdownOptionLabels();
  for (const party of parties) {
    if (await trySelectParty(party)) {
      return true;
    }
  }

  return (await sectionCount()) > 0;
}

/** Select a header party that has at least one contract in the given Overview section. */
export async function ensurePartyWithOverviewLoanSection(
  dashboard: RSSDashboardPage,
  section: "active" | "repaid" | "draft",
): Promise<void> {
  const found = await tryEnsurePartyWithOverviewLoanSection(dashboard, section);
  expect(
    found,
    `No party with ${section} contracts found for this user (Excel precondition).`,
  ).toBe(true);
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
