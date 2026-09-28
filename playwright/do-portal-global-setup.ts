/**
 * IDE / single-project mode: silent token refresh before the run (no headed browser).
 * MFA login runs in the doPortalTest fixture on the same browser as the test — one window,
 * visible login → OTP → dealer shell.
 */

import type { FullConfig } from "@playwright/test";
import { DO_PORTAL_LOGIN_EVERY_RUN } from "../config/do-portal-auth.config";
import { getDoPortalAuthFile } from "./do-portal-auth.helper";
import { logTestStep } from "../utils/testStepLog";
import {
  clearSavedDoPortalAuthFiles,
  getDoPortalMfaLockPath,
  releaseStaleMfaLockIfNeeded,
  trySilentRefreshSession,
} from "./do-portal-session.helper";

async function globalSetup(_config: FullConfig): Promise<void> {
  const useGlobalDoAuth =
    !process.env.CI || process.env.PLAYWRIGHT_USE_DO_GLOBAL_AUTH === "1";
  if (!useGlobalDoAuth) return;

  const lockPath = getDoPortalMfaLockPath(getDoPortalAuthFile());
  releaseStaleMfaLockIfNeeded(lockPath);

  if (DO_PORTAL_LOGIN_EVERY_RUN) {
    clearSavedDoPortalAuthFiles();
    logTestStep(
      "DO auth (globalSetup): cleared saved session — coordinated MFA login will run in the test browser.",
    );
    return;
  }

  let evaluation = await trySilentRefreshSession();

  if (evaluation.action === "reuse") {
    logTestStep(`DO auth (globalSetup): ${evaluation.reason}`);
    return;
  }

  logTestStep(
    `DO auth (globalSetup): ${evaluation.reason} — coordinated MFA will run in the test browser if needed.`,
  );
}

export default globalSetup;
