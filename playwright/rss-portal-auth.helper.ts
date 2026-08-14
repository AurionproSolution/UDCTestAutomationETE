/**
 * Shared RSS portal login → playwright/.auth/rss-portal.json
 * Used by globalSetup (IDE) and rss-portal-auth.setup.ts (CI dependency project).
 * MFA/TOTP happens here only — runtime refresh uses refresh_token (see rss-portal-session.helper).
 */

import { chromium, type BrowserContext, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  rssPortalTotpSecret,
  RSS_PORTAL_MFA_LOCK_WAIT_MS,
  RSS_PORTAL_MANUAL_OTP_TIMEOUT_MS,
  rssPortalAuthenticationUrl,
} from "../config/rss-portal-auth.config";
import { RSS_BASE_URL, getCurrentEnv } from "../config/env";
import { RSSLoginPage, RSSDashboardPage } from "../pages";
import { getRssPortalAuthUser } from "../testData/rss-portal/rssLoginData";
import { logTestStep } from "../utils/testStepLog";
import {
  captureAccessTokenFromAuthResponse,
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
  takePendingCapturedTokens,
  injectRssPortalAccessTokenCookie,
  getTokensFromPage,
  tryAppNativeSilentRefresh,
  isCookieTokenKey,
  looksLikeJwt,
  persistRssPortalTokensForStorageState,
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
  const context = page.context();
  context.on("response", (response) => {
    if (response.request().method() === "POST") {
      recordTokenEndpointFromUrl(response.url());
    }
    if (!/\/token|oauth|auth|login|session|userinfo/i.test(response.url())) return;
    void (async () => {
      const contentType = response.headers()["content-type"] ?? "";
      if (!/json/i.test(contentType)) return;
      try {
        const body: unknown = await response.json();
        captureAccessTokenFromAuthResponse(response.url(), body);
      } catch {
        // Non-JSON or consumed body — ignore.
      }
    })();
  });
}

function findPortalPageInContext(context: BrowserContext): Page | undefined {
  const portalHost = (() => {
    try {
      return new URL(RSS_BASE_URL()).hostname;
    } catch {
      return undefined;
    }
  })();
  for (const pg of context.pages()) {
    if (pg.isClosed()) continue;
    const url = pg.url();
    if (/udc-test\.fiscloudservices\.com\/SITRSSPortal/i.test(url)) return pg;
    if (portalHost) {
      try {
        if (new URL(url).hostname === portalHost) return pg;
      } catch {
        // Ignore non-URL tabs.
      }
    }
  }
  return undefined;
}

export async function loginRssPortalAndSaveStorage(page: Page): Promise<Page> {
  const authFile = getRssPortalAuthFile();
  const authUser = getRssPortalAuthUser();
  const env = getCurrentEnv();
  const baseUrl = RSS_BASE_URL();
  const manualOtp = authUser.mfaMode === "manual";
  const totpSecret = manualOtp ? undefined : rssPortalTotpSecret();

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  attachTokenDiscoveryListeners(page);

  logTestStep(
    `RSS auth: environment=${env}, url=${baseUrl}, user=${authUser.username}, mfa=${manualOtp ? "manual" : "totp"}`,
  );

  const loginPage = new RSSLoginPage(page);
  await loginPage.navigate(baseUrl);
  await loginPage.loginWithTestData(
    {
      ...authUser,
      totpSecret,
    },
    {
      manualOtpTimeoutMs: RSS_PORTAL_MANUAL_OTP_TIMEOUT_MS,
    },
  );

  const portalPage = findPortalPageInContext(page.context()) ?? loginPage.getSessionPage();
  await portalPage.bringToFront().catch(() => {});

  const dashboardUrl = `${baseUrl.replace(/\/$/, "")}/rss/dashboard`;
  await portalPage.goto(dashboardUrl, { waitUntil: "load" });

  const dashboardPage = new RSSDashboardPage(portalPage);
  if (!(await dashboardPage.isDashboardLoaded())) {
    throw new Error(
      "RSS auth: dashboard did not load after navigating to /rss/dashboard.",
    );
  }

  await tryAppNativeSilentRefresh(portalPage);

  let discoveredTokens = await waitForRssPortalTokensOnPage(portalPage);
  if (!discoveredTokens) {
    const captured = takePendingCapturedTokens();
    if (captured) {
      await injectRssPortalAccessTokenCookie(
        portalPage,
        captured.accessToken,
        captured.refreshToken,
      );
      discoveredTokens = await getTokensFromPage(portalPage);
      logTestStep("RSS auth: injected mfe_access_token from captured auth response.");
    }
  }
  if (!discoveredTokens) {
    throw new Error(
      "RSS auth: mfe_access_token not found after dashboard load. Session not saved — re-run MFA login.",
    );
  }

  if (!isCookieTokenKey(discoveredTokens.accessTokenKey)) {
    await injectRssPortalAccessTokenCookie(
      portalPage,
      discoveredTokens.accessToken,
      discoveredTokens.refreshToken,
    );
    await persistRssPortalTokensForStorageState(portalPage, discoveredTokens);
    discoveredTokens = await getTokensFromPage(portalPage);
    logTestStep(
      "RSS auth: persisted access token as mfe_access_token cookie and localStorage for storageState.",
    );
  } else {
    await persistRssPortalTokensForStorageState(portalPage, discoveredTokens);
  }

  if (!discoveredTokens?.accessToken || !looksLikeJwt(discoveredTokens.accessToken)) {
    throw new Error(
      "RSS auth: could not persist mfe_access_token cookie before save.",
    );
  }
  logTestStep("RSS auth: JWT tokens discovered in browser before save.");

  logTestStep(`Saving RSS portal storage state to ${authFile}`);
  await saveRssPortalStorageState(portalPage.context(), { stampSessionSavedAt: true });

  const evaluation = evaluateRssPortalSession(authFile);
  if (evaluation.action !== "reuse" && evaluation.action !== "refresh") {
    throw new Error(
      `RSS auth saved but session is not reusable: ${evaluation.reason}`,
    );
  }

  return portalPage;
}

/**
 * After cookies/storage are applied, start at /authentication (Select Application),
 * choose Retail Self Service, then wait for the RSS dashboard shell.
 * Unlike DO (which deep-links /dealer/), RSS UI entry with a stored token is the launcher.
 *
 * @returns Dashboard page when Select Application → Retail Self Service succeeds; otherwise undefined
 *          (caller should treat stored session as inactive and run MFA).
 */
export async function ensureRssPortalDashboardReady(page: Page): Promise<Page | undefined> {
  const loginPage = new RSSLoginPage(page);
  const authUrl = rssPortalAuthenticationUrl();
  const dashboardUrl = `${RSS_BASE_URL().replace(/\/$/, "")}/rss/dashboard`;
  const retailCard = page
    .locator("app-landing div.border-1.cursor-pointer")
    .filter({ hasText: /Retail Self Service/i });

  logTestStep(`RSS auth: opening Select Application at ${authUrl}`);
  await page.goto(authUrl, { waitUntil: "load" });

  // Auth SPA can take several seconds to hydrate stored SSO into Select Application.
  const launcherVisible = await retailCard
    .waitFor({ state: "visible", timeout: 25_000 })
    .then(() => true)
    .catch(() => false);

  if (!launcherVisible) {
    const onLoginEntry = await loginPage.loginWithFisButton
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    logTestStep(
      onLoginEntry
        ? "RSS auth: Login with FIS shown — stored session not accepted; MFA required"
        : "RSS auth: Select Application not shown — stored session inactive; MFA required",
    );
    return undefined;
  }

  logTestStep("RSS auth: Select Application visible — clicking Retail Self Service");
  await loginPage.selectRetailSelfService();

  let sessionPage = loginPage.getSessionPage();
  const shellVisible = await sessionPage
    .locator("app-sidemenu nav.sidebar, app-rss ion-segment[role='tablist']")
    .first()
    .isVisible({ timeout: 20_000 })
    .catch(() => false);
  if (!shellVisible || !/\/rss(\/|$)/i.test(sessionPage.url())) {
    await sessionPage.goto(dashboardUrl, { waitUntil: "load" });
  }

  const dashboard = new RSSDashboardPage(sessionPage);
  if (!(await dashboard.isDashboardLoaded())) {
    logTestStep(
      "RSS auth: dashboard did not load after Retail Self Service — treating session as inactive",
    );
    return undefined;
  }
  return sessionPage;
}

/**
 * Ensures a reusable RSS session for parallel tests with a single shared credential.
 * When RSS_PORTAL_LOGIN_EVERY_RUN is on (default), globalSetup clears saved auth so this
 * always runs MFA once per Playwright invocation; parallel workers reuse the file saved in that run.
 *
 * Stored-token reuse opens /authentication → Retail Self Service (not DO-style /dealer deep-link).
 * If the auth SPA still shows Login with FIS, the file JWT is ignored and MFA runs.
 *
 * @returns Session page already on the RSS dashboard.
 */
export async function ensureRssPortalAuthSession(page: Page): Promise<Page> {
  const authFile = getRssPortalAuthFile();
  const lockPath = getRssPortalMfaLockPath(authFile);
  const deadline = Date.now() + RSS_PORTAL_MFA_LOCK_WAIT_MS;
  /** After /authentication rejects the saved JWT once, skip further UI reuse attempts and MFA. */
  let storedSessionUiRejected = false;

  const tryReuseViaAuthentication = async (reason: string): Promise<Page | undefined> => {
    if (storedSessionUiRejected) return undefined;
    await applyRssPortalAuthToContext(page.context());
    logTestStep(`RSS auth: ${reason}`);
    const activated = await ensureRssPortalDashboardReady(page);
    if (!activated) storedSessionUiRejected = true;
    return activated;
  };

  let evaluation = await trySilentRefreshSession(authFile);
  if (evaluation.action === "reuse") {
    const activated = await tryReuseViaAuthentication(evaluation.reason);
    if (activated) return activated;
  }

  logTestStep(
    "RSS auth: session needs MFA — coordinating login (browser will navigate shortly).",
  );
  releaseStaleMfaLockIfNeeded(lockPath);

  while (Date.now() < deadline) {
    evaluation = await trySilentRefreshSession(authFile);
    if (evaluation.action === "reuse") {
      const activated = await tryReuseViaAuthentication(evaluation.reason);
      if (activated) return activated;
    }

    const acquiredLock = tryAcquireMfaLock(lockPath);
    if (!acquiredLock) {
      releaseStaleMfaLockIfNeeded(lockPath);
      await new Promise((r) => setTimeout(r, 250));
      continue;
    }

    try {
      // Another worker may have saved a fresh session while we waited for the lock.
      storedSessionUiRejected = false;
      evaluation = await trySilentRefreshSession(authFile);
      if (evaluation.action === "reuse") {
        const activated = await tryReuseViaAuthentication(evaluation.reason);
        if (activated) return activated;
      }

      logTestStep(`RSS auth: ${evaluation.reason} — running coordinated MFA login.`);
      await page.context().clearCookies();
      const sessionPage = await loginRssPortalAndSaveStorage(page);

      evaluation = evaluateRssPortalSession(authFile);
      if (evaluation.action !== "reuse") {
        throw new Error(
          `RSS portal session is not reusable after MFA login: ${evaluation.reason}`,
        );
      }
      logTestStep(`RSS auth: MFA login complete — ${evaluation.reason}`);
      return sessionPage;
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
