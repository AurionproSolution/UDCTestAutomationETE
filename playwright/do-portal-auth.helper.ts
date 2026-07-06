/**
 * Shared DO portal login → playwright/.auth/do-portal.json
 * Used by globalSetup (IDE) and do-portal-auth.setup.ts (CI dependency project).
 * MFA/TOTP happens here only — runtime refresh uses refresh_token (see do-portal-session.helper).
 */

import { chromium, type BrowserContext, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { doPortalTotpSecret, DO_PORTAL_MFA_LOCK_WAIT_MS } from "../config/do-portal-auth.config";
import { DO_BASE_URL, DO_DEALER_STANDARD_QUOTE_URL, getCurrentEnv } from "../config/env";
import { DOLoginPage, DODashboardPage } from "../pages";
import { getDoPortalLoginData } from "../testData/do-portal/doLoginData";
import { logTestStep } from "../utils/testStepLog";
import {
  discoverAndSaveAuthMeta,
  evaluateDoPortalSession,
  readStorageStateFile,
  recordTokenEndpointFromUrl,
  refreshAccessTokenFromFile,
  applyDoPortalAuthToContext,
  trySilentRefreshSession,
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

function findPortalPageInContext(context: BrowserContext): Page | undefined {
  const portalPattern = /fiscloudservices\.com\/SITDOPortal/i;
  for (const pg of context.pages()) {
    if (!pg.isClosed() && portalPattern.test(pg.url())) {
      return pg;
    }
  }
  return undefined;
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

  const portalPage = findPortalPageInContext(page.context()) ?? page;
  await portalPage.bringToFront().catch(() => {});
  await portalPage.goto(DO_DEALER_STANDARD_QUOTE_URL());
  const dashboardPage = new DODashboardPage(portalPage);
  await dashboardPage.waitForAuthenticatedDashboard({ requireCtaEnabled: false });

  logTestStep(`Saving DO portal storage state to ${authFile}`);
  await portalPage.context().storageState({ path: authFile });

  const state = readStorageStateFile(authFile);
  if (state) discoverAndSaveAuthMeta(state, { stampSessionSavedAt: true });

  const evaluation = evaluateDoPortalSession(authFile);
  if (evaluation.action !== "reuse" && evaluation.action !== "refresh") {
    throw new Error(
      `DO auth saved but session is not reusable: ${evaluation.reason}`,
    );
  }
}

/**
 * Ensures a reusable DO session for parallel tests with a single shared credential.
 * 1. Silent refresh_token grant when JWT ages out (no FIS login).
 * 2. Coordinated MFA — only one worker logs in; others wait and reuse the saved file.
 */
export async function ensureDoPortalAuthSession(page: Page): Promise<void> {
  const authFile = getDoPortalAuthFile();
  const lockPath = `${authFile}.mfa.lock`;
  const deadline = Date.now() + DO_PORTAL_MFA_LOCK_WAIT_MS;

  const syncBrowserFromFile = async (): Promise<void> => {
    await applyDoPortalAuthToContext(page.context());
  };

  let evaluation = await trySilentRefreshSession(authFile);
  if (evaluation.action === "reuse") {
    await syncBrowserFromFile();
    logTestStep(`DO auth: ${evaluation.reason}`);
    return;
  }

  while (Date.now() < deadline) {
    evaluation = await trySilentRefreshSession(authFile);
    if (evaluation.action === "reuse") {
      await syncBrowserFromFile();
      logTestStep(`DO auth: ${evaluation.reason}`);
      return;
    }

    let acquiredLock = false;
    try {
      const fd = fs.openSync(lockPath, "wx");
      fs.writeFileSync(fd, String(process.pid), "utf8");
      fs.closeSync(fd);
      acquiredLock = true;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
      continue;
    }

    try {
      evaluation = await trySilentRefreshSession(authFile);
      if (evaluation.action === "reuse") {
        await syncBrowserFromFile();
        logTestStep(`DO auth: ${evaluation.reason}`);
        return;
      }

      logTestStep(`DO auth: ${evaluation.reason} — running coordinated MFA login.`);
      await page.context().clearCookies();
      await loginDoPortalAndSaveStorage(page);

      evaluation = evaluateDoPortalSession(authFile);
      if (evaluation.action !== "reuse") {
        throw new Error(
          `DO portal session is not reusable after MFA login: ${evaluation.reason}`,
        );
      }
      await syncBrowserFromFile();
      logTestStep(`DO auth: MFA login complete — ${evaluation.reason}`);
      return;
    } finally {
      if (acquiredLock) {
        try {
          fs.unlinkSync(lockPath);
        } catch {
          // ignore
        }
      }
    }
  }

  throw new Error(
    `Timed out after ${DO_PORTAL_MFA_LOCK_WAIT_MS / 1000}s waiting for DO portal auth (parallel MFA lock).`,
  );
}

/**
 * Ensures auth storage exists and access token is usable.
 * - Missing file → full MFA login (on `page` when provided, else headed browser).
 * - Expired access + valid refresh → silent file refresh (no MFA).
 * - Expired access + no refresh → full MFA login.
 */
export async function ensureDoPortalAuthStorage(page?: Page): Promise<void> {
  if (page) {
    await ensureDoPortalAuthSession(page);
    return;
  }

  const evaluation = await trySilentRefreshSession();

  if (evaluation.action === "reuse") {
    logTestStep(`DO auth: reusing session (${evaluation.reason})`);
    return;
  }

  logTestStep(`DO auth: ${evaluation.reason} — running headed MFA login.`);
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
