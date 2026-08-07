/**
 * RSS Sanity — Logout (URP-T91)
 * Zephyr: /RSS Sanity Suite/Logout
 *
 * User menu → Logout → login landing; protected routes require credentials again.
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import {
  RSSDashboardPage,
  RSSHeaderUserMenuPage,
  RSSLoginPage,
} from "../../../../pages";

test.describe("RSS Portal — Logout @rss @sanity", () => {
  test("URP-T91 - Logout - Check functionality @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const userMenu = new RSSHeaderUserMenuPage(page);
    const loginPage = new RSSLoginPage(page);

    expect(await dashboard.isDashboardLoaded()).toBe(true);

    await userMenu.openUserMenu();
    await userMenu.expectUserMenuVisible();

    await userMenu.clickLogout();
    await loginPage.expectLoginLandingVisible();
    await loginPage.expectProtectedRouteRequiresLogin();
  });
});
