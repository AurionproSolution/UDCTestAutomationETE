/**
 * DO portal test entry — session gate, keepalive, and pre-test storage validation.
 * Import { test, expect } from here instead of @playwright/test in tests/do-portal/**.
 */

import { test as base, expect } from "@playwright/test";
import { loginDoPortalAndSaveStorage } from "../playwright/do-portal-auth.helper";
import {
  installDoPortalAuthRecovery,
  evaluateDoPortalSession,
  refreshAccessTokenFromFile,
  startDoPortalSessionKeepAlive,
} from "../playwright/do-portal-session.helper";

export const test = base.extend({
  page: async ({ page }, use) => {
    let evaluation = evaluateDoPortalSession();

    if (evaluation.action === "mfa" && evaluation.tokens?.refreshToken) {
      const refreshed = await refreshAccessTokenFromFile();
      if (refreshed.ok) {
        evaluation = evaluateDoPortalSession();
      }
    }

    if (evaluation.action === "mfa") {
      // Drop stale cookies so MFA does not skip FIS and land on /landing.
      await page.context().clearCookies();
      await loginDoPortalAndSaveStorage(page);
      evaluation = evaluateDoPortalSession();
      if (evaluation.action === "mfa") {
        throw new Error(
          `DO portal session is not reusable after MFA login: ${evaluation.reason}`,
        );
      }
    }

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
