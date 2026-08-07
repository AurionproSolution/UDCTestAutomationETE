/**
 * RSS Regression — My Profile (URP-T104, URP-T105, URP-T106)
 * Zephyr: /RSS Regression Suite/My Profile
 * Source: RSS My profile Regression Test Cases.xlsx
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import {
  RSSDashboardPage,
  RSSHeaderUserMenuPage,
  RSSMyProfilePage,
} from "../../../../pages";

test.describe("RSS Portal — My Profile @rss @regression", () => {
  test(
    "URP-T104 - My Profile - Name/Business Name, Contact details, Address details visibility",
    { tag: ["@rss", "@regression", "@URP-T104"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const userMenu = new RSSHeaderUserMenuPage(page);
      const myProfile = new RSSMyProfilePage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      const selectedParty = await dashboard.getSelectedHeaderPartyName();

      await userMenu.openUserMenu();
      await userMenu.clickMyProfile();
      await myProfile.expectProfileDetailsForSelectedParty(selectedParty);
    },
  );

  test(
    "URP-T105 - My Profile - Update Contact details",
    { tag: ["@rss", "@regression", "@URP-T105"] },
    async ({ page }) => {
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
        `Automation URP-T105 update contact ${Date.now()}`,
      );
      await myProfile.submitServiceRequest();
      await myProfile.expectSubmissionConfirmation();
      await myProfile.clickViewMyRequest();
      await myProfile.expectMyRequestsWithListedRequest();
    },
  );

  test(
    "URP-T106 - My Profile - Update Address details",
    { tag: ["@rss", "@regression", "@URP-T106"] },
    async ({ page }) => {
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
        `Automation URP-T106 update address ${Date.now()}`,
      );
      await myProfile.submitServiceRequest();
      await myProfile.expectSubmissionConfirmation();
      await myProfile.clickViewMyRequest();
      await myProfile.expectMyRequestsWithListedRequest();
    },
  );
});
