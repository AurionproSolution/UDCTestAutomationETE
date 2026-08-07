/**
 * RSS portal test entry — session gate, keepalive, and pre-test storage validation.
 * Import { test, expect } from here instead of @playwright/test in tests/rss-portal/**.
 *
 * Auth strategy: MFA login once per Playwright run (globalSetup clears saved session);
 * parallel workers in the same run share the session saved during that login.
 */

import { test as base, expect } from "@playwright/test";
import {
  ensureRssPortalAuthSession,
  ensureRssPortalDashboardReady,
} from "../playwright/rss-portal-auth.helper";
import {
  installRssPortalAuthRecovery,
  startRssPortalSessionKeepAlive,
} from "../playwright/rss-portal-session.helper";

export const test = base.extend({
  page: async ({ page }, use) => {
    const sessionPage = await ensureRssPortalAuthSession(page);
    const activePage = sessionPage ?? (await ensureRssPortalDashboardReady(page));

    const uninstallRecovery = installRssPortalAuthRecovery(activePage);
    const keepalive = startRssPortalSessionKeepAlive(activePage);

    try {
      await use(activePage);
    } finally {
      keepalive.stop();
      uninstallRecovery();
    }
  },
});

export { expect };
