/**
 * RSS Sanity — My Profile (URP-T58, URP-T59, URP-T60)
 * Zephyr: /RSS Sanity Suite/My Profile
 * Source: rss my profile test cases.xlsx
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import {
  RSSDashboardPage,
  RSSHeaderUserMenuPage,
  RSSMyProfilePage,
} from "../../../../pages";

test.describe("RSS Portal — My Profile @rss @sanity", () => {
  test("URP-T58 - My Profile - Name/Business Name, Contact details, Address details visibility @smoke", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const userMenu = new RSSHeaderUserMenuPage(page);
    const myProfile = new RSSMyProfilePage(page);

    expect(await dashboard.isDashboardLoaded()).toBe(true);
    const selectedParty = await dashboard.getSelectedHeaderPartyName();

    await userMenu.openUserMenu();
    await userMenu.clickMyProfile();
    await myProfile.expectProfileDetailsForSelectedParty(selectedParty);
  });

  test("URP-T59 - My Profile - Update Contact details @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const userMenu = new RSSHeaderUserMenuPage(page);
    const myProfile = new RSSMyProfilePage(page);

    expect(await dashboard.isDashboardLoaded()).toBe(true);

    await userMenu.openMyProfileFromTopbar();
    await myProfile.expectProfilePageLoaded();
    await myProfile.expectContactSectionDetailsVisible();

    await myProfile.clickContactUpdate();
    await myProfile.expectServiceRequestWithCategory(/Update Contact Details/i);
    await myProfile.fillUpdateContactDetailsForm(
      `Automation URP-T59 update contact ${Date.now()}`,
    );
    await myProfile.submitServiceRequest();
    await myProfile.expectSubmissionConfirmation();
    await myProfile.clickViewMyRequest();
    await myProfile.expectMyRequestsWithListedRequest();
  });

  test("URP-T60 - My Profile - Update Address details @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const userMenu = new RSSHeaderUserMenuPage(page);
    const myProfile = new RSSMyProfilePage(page);

    expect(await dashboard.isDashboardLoaded()).toBe(true);

    await userMenu.openMyProfileFromTopbar();
    await myProfile.expectProfilePageLoaded();
    await myProfile.expectAddressSectionDetailsVisible();

    await myProfile.clickAddressUpdate();
    await myProfile.expectServiceRequestWithCategory(/Update Address Details/i);
    await myProfile.fillUpdateAddressDetailsForm(
      `Automation URP-T60 update address ${Date.now()}`,
    );
    await myProfile.submitServiceRequest();
    await myProfile.expectSubmissionConfirmation();
    await myProfile.clickViewMyRequest();
    await myProfile.expectMyRequestsWithListedRequest();
  });
});
