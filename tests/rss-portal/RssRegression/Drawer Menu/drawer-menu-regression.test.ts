/**
 * RSS Regression — Drawer Menu (URP-T123, URP-T138, URP-T139)
 * Zephyr: /RSS Regression Suite/Drawer Menu
 * Source: RSS Drawer Menu Regression test cases.xlsx
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import { RSSDashboardPage, RSSSideMenuPage } from "../../../../pages";

test.describe("RSS Portal — Drawer Menu @rss @regression", () => {
  test(
    "URP-T123 - Drawer Menu - Navigation to different sections",
    { tag: ["@rss", "@regression", "@URP-T123"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);

      await sideMenu.openDrawerIfNeeded();
      await sideMenu.expectDrawerMenuItemsVisible();

      await sideMenu.clickDrawerMenuItem("Home");
      await sideMenu.expectOverviewScreen();

      await sideMenu.clickDrawerMenuItem("My Info");
      await sideMenu.expectMyProfileScreen();

      await sideMenu.clickDrawerMenuItem("My Requests");
      await sideMenu.expectMyRequestsScreen();

      await sideMenu.clickDrawerMenuItem("Create Request");
      await sideMenu.expectServiceRequestScreen();

      await sideMenu.clickDrawerMenuItem("Contact Us");
      await sideMenu.expectContactUdcPopup();
    },
  );

  test(
    "URP-T138 - Drawer Menu - Alignment of listed items",
    { tag: ["@rss", "@regression", "@URP-T138"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await dashboard.expectOverviewTabSelected();

      await sideMenu.openDrawerIfNeeded();
      await sideMenu.expectDrawerMenuItemsLeftAligned();
    },
  );

  test(
    "URP-T139 - Drawer Menu - Visibility of list of items in the panel",
    { tag: ["@rss", "@regression", "@URP-T139"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await dashboard.expectOverviewTabSelected();

      await sideMenu.openDrawerIfNeeded();
      await sideMenu.expectDrawerMenuItemsVisible();
    },
  );
});
