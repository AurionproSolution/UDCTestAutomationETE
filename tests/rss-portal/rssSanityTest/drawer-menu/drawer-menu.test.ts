/**
 * RSS Sanity — Drawer Menu (URP-T77)
 * Zephyr: /RSS Sanity Suite/Drawer Menu
 * Source: RSS Drawer Menu Test cases.xlsx
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import { RSSDashboardPage, RSSSideMenuPage } from "../../../../pages";

test.describe("RSS Portal — Drawer Menu @rss @sanity", () => {
  test("URP-T77 - Drawer Menu - Navigation to different sections @smoke", async ({
    page,
  }) => {
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
  });
});
