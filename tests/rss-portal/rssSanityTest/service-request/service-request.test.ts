/**
 * RSS Sanity — Service Request (URP-T47 – URP-T50)
 * Zephyr: /RSS Sanity Suite/Service Request
 * Source: Rss Service request Tests case.xlsx
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import {
  RSSDashboardPage,
  RSSLoansPage,
  RSSServiceRequestPage,
  RSSSideMenuPage,
} from "../../../../pages";
import { getRssPortalTestPartyName } from "../../../../testData/rss-portal/rssLoginData";

function normalizePartyLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

async function ensureServiceRequestParty(dashboard: RSSDashboardPage): Promise<void> {
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

async function openCreateRequestScreen(
  dashboard: RSSDashboardPage,
  sideMenu: RSSSideMenuPage,
  serviceRequest: RSSServiceRequestPage,
): Promise<void> {
  expect(await dashboard.isDashboardLoaded()).toBe(true);
  await sideMenu.clickDrawerMenuItem("Create Request");
  await serviceRequest.expectServiceRequestScreen();
}

test.describe("RSS Portal — Service Request @rss @sanity", () => {
  test("URP-T47 - Service request - Experiencing financial difficulty @smoke", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const sideMenu = new RSSSideMenuPage(page);
    const serviceRequest = new RSSServiceRequestPage(page);

    await openCreateRequestScreen(dashboard, sideMenu, serviceRequest);
    await serviceRequest.selectCategory(/Experiencing Financial Difficulty/i);
    await serviceRequest.expectCategorySelected(/Experiencing Financial Difficulty/i);
    await serviceRequest.expectExperiencingFinancialDifficultyFormVisible();
    await serviceRequest.fillExperiencingFinancialDifficultyForm(
      `Automation URP-T47 financial difficulty ${Date.now()}`,
    );
    await serviceRequest.submitServiceRequest();
    await serviceRequest.expectSubmissionConfirmation();
    await serviceRequest.clickViewMyRequest();
    await serviceRequest.expectMyRequestsWithListedRequest();
  });

  test("URP-T48 - Service request - Update Contact Details @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const sideMenu = new RSSSideMenuPage(page);
    const serviceRequest = new RSSServiceRequestPage(page);

    await openCreateRequestScreen(dashboard, sideMenu, serviceRequest);
    await serviceRequest.selectCategory(/Update Contact Details/i);
    await serviceRequest.expectCategorySelected(/Update Contact Details/i);
    await serviceRequest.expectUpdateContactDetailsFormVisible();
    await serviceRequest.fillUpdateContactDetailsForm(
      `Automation URP-T48 contact update ${Date.now()}`,
    );
    await serviceRequest.submitServiceRequest();
    await serviceRequest.expectSubmissionConfirmation();
    await serviceRequest.clickViewMyRequest();
    await serviceRequest.expectMyRequestsWithListedRequest();
  });

  test("URP-T49 - Service request - Update Address Details @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const sideMenu = new RSSSideMenuPage(page);
    const serviceRequest = new RSSServiceRequestPage(page);

    await openCreateRequestScreen(dashboard, sideMenu, serviceRequest);
    await serviceRequest.selectCategory(/Update Address Details/i);
    await serviceRequest.expectCategorySelected(/Update Address Details/i);
    await serviceRequest.expectUpdateAddressDetailsFormVisible();
    await serviceRequest.fillUpdateAddressDetailsForm(
      `Automation URP-T49 address update ${Date.now()}`,
    );
    await serviceRequest.submitServiceRequest();
    await serviceRequest.expectSubmissionConfirmation();
    await serviceRequest.clickViewMyRequest();
    await serviceRequest.expectMyRequestsWithListedRequest();
  });

  test("URP-T50 - Service request - Change Bank Account Details @smoke", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const sideMenu = new RSSSideMenuPage(page);
    const serviceRequest = new RSSServiceRequestPage(page);
    const loans = new RSSLoansPage(page);

    expect(await dashboard.isDashboardLoaded()).toBe(true);
    await ensureServiceRequestParty(dashboard);
    await dashboard.waitForRssShellIdle();
    await sideMenu.clickDrawerMenuItem("Create Request");
    await serviceRequest.expectServiceRequestScreen();
    await serviceRequest.selectCategory(/Change Bank Account Details/i);
    await serviceRequest.expectCategorySelected(/Change Bank Account Details/i);
    // await serviceRequest.expectChangeBankAccountDetailsFormVisible();
    // await serviceRequest.fillChangeBankAccountDetailsForm(
    //   `Automation URP-T50 bank account update ${Date.now()}`,
    // );
    await serviceRequest.submitServiceRequest();
    await serviceRequest.expectSubmissionConfirmation();
    await serviceRequest.clickViewMyRequest();
    await serviceRequest.expectMyRequestsWithListedRequest();
  });
});
