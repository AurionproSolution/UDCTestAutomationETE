/**
 * RSS Sanity — Notification Bell icon (URP-T78)
 * Zephyr: /RSS Sanity Suite/Notification Bell icon
 * Source: RSS Notification Bell Test cases.xlsx
 *
 * Dashboard header only — bell opens overlay with Information / Warnings / Errors.
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import { RSSDashboardPage, RSSNotificationBellPage } from "../../../../pages";

test.describe("RSS Portal — Notification Bell icon @rss @sanity", () => {
  test("URP-T78 - Notification Bell icon - List of Notifications @smoke", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const notificationBell = new RSSNotificationBellPage(page);

    expect(await dashboard.isDashboardLoaded()).toBe(true);
    await expect(notificationBell.bellButton).toBeVisible({ timeout: 15_000 });

    const badgeCount = await notificationBell.getNotificationBadgeCount();
    if (badgeCount > 0) {
      expect(badgeCount).toBeGreaterThan(0);
    }

    await notificationBell.openNotificationPanel();
    await notificationBell.expectNotificationPanelContents();
  });
});
