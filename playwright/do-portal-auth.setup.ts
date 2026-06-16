/**
 * CI / multi-project mode: dependency project that runs before do-portal-chromium.
 * Not used when PLAYWRIGHT_IDE=1 (see playwright.config.ts globalSetup instead).
 */

import { test as setup } from "@playwright/test";
import { loginDoPortalAndSaveStorage } from "./do-portal-auth.helper";
import { logTestStep } from "../utils/testStepLog";
import {
  evaluateDoPortalSession,
  refreshAccessTokenFromFile,
} from "./do-portal-session.helper";

setup("authenticate DO portal", async ({ page }) => {
  const evaluation = evaluateDoPortalSession();

  if (evaluation.action === "reuse") {
    logTestStep(`DO auth: reusing session (${evaluation.reason})`);
    return;
  }

  if (evaluation.tokens?.refreshToken) {
    const refreshed = await refreshAccessTokenFromFile();
    if (refreshed.ok) {
      const afterRefresh = evaluateDoPortalSession();
      if (afterRefresh.action === "reuse") {
        logTestStep(`DO auth: silently refreshed session (${afterRefresh.reason})`);
        return;
      }
    }
  }

  logTestStep(`DO auth: ${evaluation.reason} — running MFA login.`);
  await loginDoPortalAndSaveStorage(page);
});
