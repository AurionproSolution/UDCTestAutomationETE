/**
 * DO portal test entry — session gate, keepalive, and pre-test storage validation.
 * Import { test, expect } from here instead of @playwright/test in tests/do-portal/**.
 *
 * Auth strategy: one FIS MFA login per run (coordinated across parallel workers);
 * JWT renewal via refresh_token grant only — avoids CC0299 max-login-count errors.
 */

import { test as base, expect } from "@playwright/test";
import { ensureDoPortalAuthSession } from "../playwright/do-portal-auth.helper";
import {
  installDoPortalAuthRecovery,
  startDoPortalSessionKeepAlive,
} from "../playwright/do-portal-session.helper";

export const test = base.extend({
  page: async ({ page }, use) => {
    await ensureDoPortalAuthSession(page);

    const uninstallRecovery = installDoPortalAuthRecovery(page);
    const keepalive = startDoPortalSessionKeepAlive(page);

    try {
      await use(page);
    } finally {
      keepalive.stop();
      uninstallRecovery();
    }
  },
});

export { expect };
