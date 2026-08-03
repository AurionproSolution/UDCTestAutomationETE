/**
 * RSS portal test entry — session gate, keepalive, and pre-test storage validation.
 * Import { test, expect } from here instead of @playwright/test in tests/rss-portal/**.
 *
 * Auth strategy: one FIS MFA login per run (coordinated across parallel workers);
 * JWT renewal via refresh_token grant when tokens exist; cookie SSO reuse otherwise.
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
    await ensureRssPortalAuthSession(page);
    const activePage = await ensureRssPortalDashboardReady(page);

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
