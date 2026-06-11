/**
 * Shared DO portal login → playwright/.auth/do-portal.json
 * Used by globalSetup (IDE) and do-portal-auth.setup.ts (CI dependency project).
 * MFA/TOTP happens here only — runtime refresh uses refresh_token (see do-portal-session.helper).
 */

import { chromium, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { DO_BASE_URL, DO_DEALER_STANDARD_QUOTE_URL } from "../config/env";
import { DOLoginPage } from "../pages";
import doLoginData from "../testData/do-portal/loginData.json";
import { logTestStep } from "../utils/testStepLog";
import {
  discoverAndSaveAuthMeta,
  evaluateDoPortalSession,
  readStorageStateFile,
  recordTokenEndpointFromUrl,
  refreshAccessTokenFromFile,
} from "./do-portal-session.helper";

export const doPortalAuthFile = path.join(
  process.cwd(),
  "playwright",
  ".auth",
  "do-portal.json",
);

function attachTokenDiscoveryListeners(page: Page): void {
  page.on("response", (response) => {
    if (response.request().method() === "POST") {
      recordTokenEndpointFromUrl(response.url());
    }
  });
}

export async function loginDoPortalAndSaveStorage(page: Page): Promise<void> {
  fs.mkdirSync(path.dirname(doPortalAuthFile), { recursive: true });
  attachTokenDiscoveryListeners(page);

  const loginPage = new DOLoginPage(page);
  await loginPage.navigate(DO_BASE_URL());
  await loginPage.loginWithTestData(doLoginData.validUsers[0]);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await page.waitForLoadState("domcontentloaded");
  logTestStep(`Saving DO portal storage state to ${doPortalAuthFile}`);
  await page.context().storageState({ path: doPortalAuthFile });

  const state = readStorageStateFile();
  if (state) discoverAndSaveAuthMeta(state, { stampSessionSavedAt: true });
}

/**
 * Ensures auth storage exists and access token is usable.
 * - Missing file → full MFA login.
 * - Expired access + valid refresh → silent file refresh (no MFA).
 * - Expired access + no refresh → full MFA login.
 */
export async function ensureDoPortalAuthStorage(): Promise<void> {
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
    logTestStep(`DO silent file refresh failed: ${refreshed.message}`);
  }

  logTestStep(`DO auth: ${evaluation.reason} — running MFA login.`);
  await runHeadedLoginAndSave();
}

async function runHeadedLoginAndSave(): Promise<void> {
  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"],
  });
  try {
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();
    await loginDoPortalAndSaveStorage(page);
  } finally {
    await browser.close();
  }
}
