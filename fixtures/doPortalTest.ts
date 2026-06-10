/**
 * DO portal test entry — silent refresh_token keepalive and pre-test storage file refresh.
 * Import { test, expect } from here instead of @playwright/test in tests/do-portal/**.
 */

import { test as base, expect } from "@playwright/test";
import {
  ensureFreshDoPortalStorageFile,
  installDoPortalAuthRecovery,
  startDoPortalSessionKeepAlive,
} from "../playwright/do-portal-session.helper";

export const test = base.extend({
  page: async ({ page }, use) => {
    await ensureFreshDoPortalStorageFile();

    const uninstallRecovery = installDoPortalAuthRecovery(page);
    // Always on for DO portal tests: test.setTimeout() inside the test body runs too late
    // for fixture setup, so we cannot gate on testInfo.timeout (>15 min) here.
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
