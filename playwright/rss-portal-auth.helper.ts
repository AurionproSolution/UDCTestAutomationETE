/**
 * Shared RSS portal login → playwright/.auth/rss-portal.json
 * Used by globalSetup (IDE) and rss-portal-auth.setup.ts (CI dependency project).
 * MFA/TOTP happens here only — runtime refresh uses refresh_token (see rss-portal-session.helper).
 */

import { chromium, type BrowserContext, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { rssPortalTotpSecret, RSS_PORTAL_MFA_LOCK_WAIT_MS } from "../config/rss-portal-auth.config";
import { RSS_BASE_URL, getCurrentEnv } from "../config/env";
import { RSSLoginPage, RSSDashboardPage } from "../pages";
import { getRssPortalLoginData } from "../testData/rss-portal/rssLoginData";
import { logTestStep } from "../utils/testStepLog";
import { rssPortalAuthOrigins } from "../config/rss-portal-auth.config";
import {
  discoverAndSaveAuthMeta,
  evaluateRssPortalSession,
  readStorageStateFile,
  recordTokenEndpointFromUrl,
  applyRssPortalAuthToContext,
  getRssPortalMfaLockPath,
  readMfaLock,
  releaseMfaLock,
  releaseStaleMfaLockIfNeeded,
  tryAcquireMfaLock,
  trySilentRefreshSession,
  saveRssPortalStorageState,
  waitForRssPortalTokensOnPage,
} from "./rss-portal-session.helper";

export function getRssPortalAuthFile(): string {
  return path.join(
    process.cwd(),
    "playwright",
    ".auth",
    `rss-portal.${getCurrentEnv()}.json`,
  );
}

function attachTokenDiscoveryListeners(page: Page): void {
  page.on("response", (response) => {
    if (response.request().method() === "POST") {
      recordTokenEndpointFromUrl(response.url());
    }
  });
}

function findPortalPageInContext(context: BrowserContext): Page | undefined {
  const portalPattern = /fiscloudservices\.com\/SITRSSPortal/i;
  for (const pg of context.pages()) {
    if (!pg.isClosed() && portalPattern.test(pg.url())) {
      return pg;
    }
  }
  return undefined;
}

export async function loginRssPortalAndSaveStorage(page: Page): Promise<void> {
  const authFile = getRssPortalAuthFile();
  const loginData = getRssPortalLoginData();
  const env = getCurrentEnv();
  const baseUrl = RSS_BASE_URL();
  const totpSecret = rssPortalTotpSecret();

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  attachTokenDiscoveryListeners(page);

  logTestStep(
    `RSS auth: environment=${env}, url=${baseUrl}, user=${loginData.validUsers[0].username}`,
  );

  const loginPage = new RSSLoginPage(page);
  await loginPage.navigate(baseUrl);
  await loginPage.loginWithTestData({
    ...loginData.validUsers[0],
    totpSecret,
  });

  const portalPage = findPortalPageInContext(page.context()) ?? loginPage.getSessionPage();
  await portalPage.bringToFront().catch(() => {});
  const dashboardPage = new RSSDashboardPage(portalPage);
  const dashboardLoaded = await dashboardPage.isDashboardLoaded();
  if (!dashboardLoaded) {
    throw new Error("RSS auth saved but dashboard did not load after Retail Self Service selection.");
  }

  const discoveredTokens = await waitForRssPortalTokensOnPage(portalPage);
  if (discoveredTokens) {
    logTestStep("RSS auth: JWT tokens discovered in browser before save.");
  } else {
    logTestStep(
      "RSS auth: no JWT in browser storage yet — saving cookie SSO session (reuse up to 15 min).",
    );
  }

  logTestStep(`Saving RSS portal storage state to ${authFile}`);
  await saveRssPortalStorageState(portalPage.context(), { stampSessionSavedAt: true });

  const evaluation = evaluateRssPortalSession(authFile);
  if (evaluation.action !== "reuse" && evaluation.action !== "refresh") {
    throw new Error(
      `RSS auth saved but session is not reusable: ${evaluation.reason}`,
    );
  }
}

/**
 * After cookies/storage are applied, open the RSS shell and land on the dashboard.
 * Handles Select Application → Retail Self Service when the launcher is shown.
 */
export async function ensureRssPortalDashboardReady(page: Page): Promise<Page> {
  const loginPage = new RSSLoginPage(page);
  const portalRoot = rssPortalAuthOrigins()[0];

  await page.goto(portalRoot, { waitUntil: "load" });

  if (await loginPage.isAppLauncherVisible()) {
    await loginPage.selectRetailSelfService();
  } else {
    const onLoginEntry = await loginPage.loginWithFisButton
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (onLoginEntry) {
      const loginUrl = `${portalRoot.replace(/\/$/, "")}/authentication/login`;
      await page.goto(loginUrl, { waitUntil: "load" });
      if (await loginPage.isAppLauncherVisible()) {
        await loginPage.selectRetailSelfService();
      }
    }
  }

  const sessionPage = loginPage.getSessionPage();
  const dashboard = new RSSDashboardPage(sessionPage);
  if (!(await dashboard.isDashboardLoaded())) {
    throw new Error("RSS dashboard did not load after applying stored session.");
  }
  return sessionPage;
}

/**
 * Ensures a reusable RSS session for parallel tests with a single shared credential.
 * 1. Silent refresh_token grant when JWT ages out (no FIS login).
 * 2. Coordinated MFA — only one worker logs in; others wait and reuse the saved file.
 */
export async function ensureRssPortalAuthSession(page: Page): Promise<void> {
  const authFile = getRssPortalAuthFile();
  const lockPath = getRssPortalMfaLockPath(authFile);
  const deadline = Date.now() + RSS_PORTAL_MFA_LOCK_WAIT_MS;

  const syncBrowserFromFile = async (): Promise<void> => {
    await applyRssPortalAuthToContext(page.context());
  };

  let evaluation = await trySilentRefreshSession(authFile);
  if (evaluation.action === "reuse") {
    await syncBrowserFromFile();
    logTestStep(`RSS auth: ${evaluation.reason}`);
    return;
  }

  logTestStep(
    "RSS auth: session needs MFA — coordinating login (browser will navigate shortly).",
  );
  releaseStaleMfaLockIfNeeded(lockPath);

  while (Date.now() < deadline) {
    evaluation = await trySilentRefreshSession(authFile);
    if (evaluation.action === "reuse") {
      await syncBrowserFromFile();
      logTestStep(`RSS auth: ${evaluation.reason}`);
      return;
    }

    const acquiredLock = tryAcquireMfaLock(lockPath);
    if (!acquiredLock) {
      releaseStaleMfaLockIfNeeded(lockPath);
      await new Promise((r) => setTimeout(r, 250));
      continue;
    }

    try {
      evaluation = await trySilentRefreshSession(authFile);
      if (evaluation.action === "reuse") {
        await syncBrowserFromFile();
        logTestStep(`RSS auth: ${evaluation.reason}`);
        return;
      }

      logTestStep(`RSS auth: ${evaluation.reason} — running coordinated MFA login.`);
      await page.context().clearCookies();
      await loginRssPortalAndSaveStorage(page);

      evaluation = evaluateRssPortalSession(authFile);
      if (evaluation.action !== "reuse") {
        throw new Error(
          `RSS portal session is not reusable after MFA login: ${evaluation.reason}`,
        );
      }
      await syncBrowserFromFile();
      logTestStep(`RSS auth: MFA login complete — ${evaluation.reason}`);
      return;
    } finally {
      releaseMfaLock(lockPath);
    }
  }

  const lockInfo = readMfaLock(lockPath);
  const lockDetail = lockInfo
    ? ` Lock held by PID ${lockInfo.pid} since ${lockInfo.startedAt}.`
    : "";
  throw new Error(
    `Timed out after ${RSS_PORTAL_MFA_LOCK_WAIT_MS / 1000}s waiting for RSS portal auth (parallel MFA lock at ${lockPath}).${lockDetail} Stale lock auto-removal failed; delete playwright/.auth/*.mfa.lock manually if needed.`,
  );
}

/**
 * Ensures auth storage exists and access token is usable.
 */
export async function ensureRssPortalAuthStorage(page?: Page): Promise<void> {
  if (page) {
    await ensureRssPortalAuthSession(page);
    return;
  }

  const evaluation = await trySilentRefreshSession();

  if (evaluation.action === "reuse") {
    logTestStep(`RSS auth: reusing session (${evaluation.reason})`);
    return;
  }

  logTestStep(`RSS auth: ${evaluation.reason} — running headed MFA login.`);
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
    await loginRssPortalAndSaveStorage(page);
  } finally {
    await browser.close();
  }
}
