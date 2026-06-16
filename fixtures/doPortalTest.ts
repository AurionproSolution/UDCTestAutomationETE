/**
 * DO portal test entry — session gate, keepalive, and pre-test storage validation.
 * Import { test, expect } from here instead of @playwright/test in tests/do-portal/**.
 */

import { test as base, expect } from "@playwright/test";
import { ensureDoPortalAuthStorage } from "../playwright/do-portal-auth.helper";
import {
  applyDoPortalAuthToContext,
  evaluateDoPortalSession,
  installDoPortalAuthRecovery,
  startDoPortalSessionKeepAlive,
} from "../playwright/do-portal-session.helper";

export const test = base.extend({
  page: async ({ page }, use) => {
    let evaluation = evaluateDoPortalSession();

    if (evaluation.action === "mfa") {
      await ensureDoPortalAuthStorage();
      await applyDoPortalAuthToContext(page.context());
      evaluation = evaluateDoPortalSession();
      if (evaluation.action === "mfa") {
        throw new Error(
          `DO portal session is not reusable after auth setup: ${evaluation.reason}`,
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
