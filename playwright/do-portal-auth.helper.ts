/**
 * Shared DO portal login → playwright/.auth/do-portal.json
 * Used by globalSetup (IDE) and do-portal-auth.setup.ts (CI dependency project).
 * MFA/TOTP happens here only — runtime refresh uses refresh_token (see do-portal-session.helper).
 */

import { chromium, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { doPortalTotpSecret } from "../config/do-portal-auth.config";
import { DO_BASE_URL, DO_DEALER_STANDARD_QUOTE_URL, getCurrentEnv } from "../config/env";
import { DOLoginPage } from "../pages";
import { getDoPortalLoginData } from "../testData/do-portal/doLoginData";
import { logTestStep } from "../utils/testStepLog";
import {
  discoverAndSaveAuthMeta,
  evaluateDoPortalSession,
  readStorageStateFile,
  recordTokenEndpointFromUrl,
  refreshAccessTokenFromFile,
} from "./do-portal-session.helper";

export function getDoPortalAuthFile(): string {
  return path.join(
    process.cwd(),
    "playwright",
    ".auth",
    `do-portal.${getCurrentEnv()}.json`,
  );
}

/** @deprecated Use {@link getDoPortalAuthFile}() for environment-specific storage. */
export const doPortalAuthFile = getDoPortalAuthFile();

function attachTokenDiscoveryListeners(page: Page): void {
  page.on("response", (response) => {
    if (response.request().method() === "POST") {
      recordTokenEndpointFromUrl(response.url());
    }
  });
}

export async function loginDoPortalAndSaveStorage(page: Page): Promise<void> {
  const authFile = getDoPortalAuthFile();
  const loginData = getDoPortalLoginData();
  const env = getCurrentEnv();
  const baseUrl = DO_BASE_URL();
  const totpSecret = doPortalTotpSecret();

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  attachTokenDiscoveryListeners(page);

  logTestStep(
    `DO auth: environment=${env}, url=${baseUrl}, user=${loginData.validUsers[0].username}`,
  );

  const loginPage = new DOLoginPage(page);
  await loginPage.navigate(baseUrl);
  await loginPage.loginWithTestData({
    ...loginData.validUsers[0],
    totpSecret,
  });
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await page.waitForLoadState("domcontentloaded");
  logTestStep(`Saving DO portal storage state to ${authFile}`);
  await page.context().storageState({ path: authFile });

  const state = readStorageStateFile(authFile);
  if (state) discoverAndSaveAuthMeta(state, { stampSessionSavedAt: true });
}

/**
 * Ensures auth storage exists and access token is usable.
 * - Missing file → full MFA login (on `page` when provided, else headed browser).
 * - Expired access + valid refresh → silent file refresh (no MFA).
 * - Expired access + no refresh → full MFA login.
 */
export async function ensureDoPortalAuthStorage(page?: Page): Promise<void> {
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
  if (page) {
    await loginDoPortalAndSaveStorage(page);
    return;
  }
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
