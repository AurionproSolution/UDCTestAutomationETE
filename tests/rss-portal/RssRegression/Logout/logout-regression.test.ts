/**
 * RSS Regression — Logout (URP-T137)
 * Zephyr: /RSS Regression Suite/Logout
 * Source: Rss Logout Regression test Cases.xlsx
 *
 * User menu → Logout → login landing; protected routes require credentials again.
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import {
  RSSDashboardPage,
  RSSHeaderUserMenuPage,
  RSSLoginPage,
} from "../../../../pages";

test.describe("RSS Portal — Logout @rss @regression", () => {
  test(
    "URP-T137 - Logout - Check functionality",
    { tag: ["@rss", "@regression", "@URP-T137"] },
    async ({ page }) => {
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
    },
  );
});
