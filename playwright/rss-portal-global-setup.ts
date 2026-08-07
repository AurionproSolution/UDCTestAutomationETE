/**
 * Clears saved RSS auth at the start of each Playwright run when RSS_PORTAL_LOGIN_EVERY_RUN is on.
 * MFA then runs once in the test browser (rss-portal-auth.setup or rssPortalTest fixture).
 */

import type { FullConfig } from "@playwright/test";
import { RSS_PORTAL_LOGIN_EVERY_RUN } from "../config/rss-portal-auth.config";
import { logTestStep } from "../utils/testStepLog";
import {
  clearSavedRssPortalAuthFiles,
  getRssPortalMfaLockPath,
  releaseStaleMfaLockIfNeeded,
} from "./rss-portal-session.helper";
import { getRssPortalAuthFile } from "./rss-portal-auth.helper";

async function globalSetup(_config: FullConfig): Promise<void> {
  const useGlobalRssAuth =
    !process.env.CI || process.env.PLAYWRIGHT_USE_RSS_GLOBAL_AUTH === "1";
  if (!useGlobalRssAuth || !RSS_PORTAL_LOGIN_EVERY_RUN) return;

  const authFile = getRssPortalAuthFile();
  releaseStaleMfaLockIfNeeded(getRssPortalMfaLockPath(authFile));
  clearSavedRssPortalAuthFiles();
  logTestStep(
    "RSS auth (globalSetup): cleared saved session — MFA login will run in the test browser.",
  );
}

export default globalSetup;
