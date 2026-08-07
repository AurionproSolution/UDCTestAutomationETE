/**
 * Shared helpers for RSS Apply Now sanity tests (URP-T79 – URP-T84).
 */

import { expect } from "../../../../fixtures/rssPortalTest";
import {
  RSSApplyNowApplicationDocumentsPage,
  RSSApplyNowCustomerDetailsPage,
  RSSApplyNowDealershipAssetRepaymentPage,
  RSSApplyNowHowCanWeHelpIndividualPage,
  RSSDashboardPage,
} from "../../../../pages";
import { getRssPortalTestPartyName } from "../../../../testData/rss-portal/rssLoginData";
import {
  APPLY_NOW_DEALERS_LOAD_TIMEOUT_MS,
  APPLY_NOW_DEALERSHIP_FALLBACK_SEARCH,
  APPLY_NOW_DEALERSHIP_USED_BEFORE,
  APPLY_NOW_REPAYMENT,
} from "../../../../testData/rss-portal/applyNowData";

export function normalizePartyLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function ensureApplyNowParty(dashboard: RSSDashboardPage): Promise<void> {
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

export async function openApplyNow(
  dashboard: RSSDashboardPage,
  howCanWeHelp: RSSApplyNowHowCanWeHelpIndividualPage,
): Promise<void> {
  expect(await dashboard.isDashboardLoaded()).toBe(true);
  await ensureApplyNowParty(dashboard);
  await dashboard.clickApplyNow();
  expect(await dashboard.isApplyNowSelected()).toBe(true);
  await howCanWeHelp.waitForHowCanWeHelpStep();
}

export async function completeDealershipPurchaseFlow(
  howCanWeHelp: RSSApplyNowHowCanWeHelpIndividualPage,
  assetPage: RSSApplyNowDealershipAssetRepaymentPage,
  options?: {
    preferredDealershipLabel?: string;
    fallbackSearch?: string;
  },
): Promise<void> {
  await howCanWeHelp.selectPurchaseThroughDealership();
  await howCanWeHelp.expectPurchaseThroughDealershipSelected();
  await assetPage.waitForDealershipSection();
  await assetPage.waitForDealersLoaded(APPLY_NOW_DEALERS_LOAD_TIMEOUT_MS);
  await assetPage.selectDealershipForApplyNow({
    preferredLabel:
      options?.preferredDealershipLabel ?? APPLY_NOW_DEALERSHIP_USED_BEFORE,
    fallbackSearch: options?.fallbackSearch ?? APPLY_NOW_DEALERSHIP_FALLBACK_SEARCH,
  });
  await assetPage.expectDealershipSelected();
}

export async function completeRepaymentAndGoToCustomerDetails(
  assetPage: RSSApplyNowDealershipAssetRepaymentPage,
  customerDetails: RSSApplyNowCustomerDetailsPage,
): Promise<void> {
  await assetPage.fillRepaymentCalculatorFields(APPLY_NOW_REPAYMENT);
  await assetPage.clickRepaymentCalculate();
  await assetPage.expectRepaymentCalculationTableVisible();
  await assetPage.clickApplyNowFooterNext();
  await customerDetails.waitForCustomerDetailsStep();
  await customerDetails.expectLoanSummaryCardVisible();
}

export async function completeDocumentsAndSubmit(
  documents: RSSApplyNowApplicationDocumentsPage,
  notes?: string,
): Promise<void> {
  await documents.waitForApplicationDocumentsStep();
  await documents.submitApplicationWithDocuments({ notes });
}
