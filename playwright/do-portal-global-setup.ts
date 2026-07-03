/**
 * IDE / single-project mode: silent token refresh before the run (no headed browser).
 * MFA login runs in the doPortalTest fixture on the same browser as the test — one window,
 * visible login → OTP → dealer shell.
 */

import type { FullConfig } from "@playwright/test";
import { logTestStep } from "../utils/testStepLog";
import {
  evaluateDoPortalSession,
  refreshAccessTokenFromFile,
} from "./do-portal-session.helper";

async function globalSetup(_config: FullConfig): Promise<void> {
  const useGlobalDoAuth =
    !process.env.CI || process.env.PLAYWRIGHT_USE_DO_GLOBAL_AUTH === "1";
  if (!useGlobalDoAuth) return;

  let evaluation = evaluateDoPortalSession();

  if (evaluation.action === "mfa" && evaluation.tokens?.refreshToken) {
    const refreshed = await refreshAccessTokenFromFile();
    if (refreshed.ok) {
      evaluation = evaluateDoPortalSession();
      if (evaluation.action === "reuse") {
        logTestStep(`DO auth (globalSetup): silently refreshed — ${evaluation.reason}`);
        return;
      }
    }
    logTestStep(`DO auth (globalSetup): silent refresh failed — ${refreshed.message}`);
  }

  if (evaluation.action === "reuse") {
    logTestStep(`DO auth (globalSetup): ${evaluation.reason}`);
    return;
  }

  logTestStep(
    `DO auth (globalSetup): ${evaluation.reason} — MFA will run in the test browser.`,
  );
}

export default globalSetup;
