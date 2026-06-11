/**
 * DO portal silent session refresh — JWT expiry checks and refresh_token renewal.
 * MFA/TOTP only at initial auth setup; no FIS re-login during test execution.
 */

import {
  type APIRequestContext,
  type BrowserContext,
  chromium,
  type Page,
} from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  DO_PORTAL_ACCESS_TOKEN_KEYS,
  DO_PORTAL_AUTH_META_FILE_REL,
  DO_PORTAL_KEEPALIVE_INTERVAL_MS,
  DO_PORTAL_LONG_TEST_TIMEOUT_MS,
  DO_PORTAL_REFRESH_TOKEN_KEYS,
  DO_PORTAL_TOKEN_EXPIRY_BUFFER_MS,
  type DoPortalAuthMeta,
  OIDC_USER_KEY_PATTERN,
  doPortalAuthOrigins,
  doPortalOAuthClientId,
  doPortalTokenEndpointUrl,
} from "../config/do-portal-auth.config";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../config/env";
import { logTestStep } from "../utils/testStepLog";
import { doPortalAuthFile } from "./do-portal-auth.helper";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StorageOriginEntry {
  origin: string;
  localStorage: Array<{ name: string; value: string }>;
}

export interface PlaywrightStorageState {
  cookies: Array<Record<string, unknown>>;
  origins: StorageOriginEntry[];
}

export interface DiscoveredTokens {
  origin: string;
  accessToken: string;
  accessTokenKey: string;
  refreshToken?: string;
  refreshTokenKey?: string;
  expiresAtMs?: number;
  oidcUserKey?: string;
}

export interface TokenRefreshResult {
  ok: boolean;
  message: string;
  tokens?: DiscoveredTokens;
}

export interface KeepaliveHandle {
  stop: () => void;
}

export interface KeepaliveOptions {
  intervalMs?: number;
  expiryBufferMs?: number;
}

// ---------------------------------------------------------------------------
// JWT utilities
// ---------------------------------------------------------------------------

export function looksLikeJwt(value: string): boolean {
  const parts = value.trim().split(".");
  return parts.length === 3 && parts[0].startsWith("eyJ");
}

export function parseJwtExpiryMs(token: string): number | undefined {
  try {
    const payload = token.trim().split(".")[1];
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
      exp?: number;
    };
    if (typeof json.exp === "number") return json.exp * 1000;
  } catch {
    // not a decodable JWT
  }
  return undefined;
}

export function isAccessTokenExpiringSoon(
  token: string | undefined,
  bufferMs = DO_PORTAL_TOKEN_EXPIRY_BUFFER_MS,
): boolean {
  if (!token) return true;
  const expMs = parseJwtExpiryMs(token);
  if (!expMs) return false;
  return expMs - Date.now() <= bufferMs;
}

// ---------------------------------------------------------------------------
// Storage state I/O
// ---------------------------------------------------------------------------

export function readStorageStateFile(
  filePath = doPortalAuthFile,
): PlaywrightStorageState | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as PlaywrightStorageState;
  } catch {
    return undefined;
  }
}

export function writeStorageStateFile(
  state: PlaywrightStorageState,
  filePath = doPortalAuthFile,
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

export function readAuthMeta(): DoPortalAuthMeta | undefined {
  const metaPath = path.join(process.cwd(), DO_PORTAL_AUTH_META_FILE_REL);
  if (!fs.existsSync(metaPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8")) as DoPortalAuthMeta;
  } catch {
    return undefined;
  }
}

export function writeAuthMeta(meta: DoPortalAuthMeta): void {
  const metaPath = path.join(process.cwd(), DO_PORTAL_AUTH_META_FILE_REL);
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
}

async function withStorageFileLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const lockPath = `${doPortalAuthFile}.lock`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      fs.closeSync(fd);
      try {
        return await fn();
      } finally {
        fs.unlinkSync(lockPath);
      }
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`Timed out acquiring lock for ${doPortalAuthFile}`);
}

// ---------------------------------------------------------------------------
// Token discovery
// ---------------------------------------------------------------------------

function parseOidcUserValue(value: string): {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
} | undefined {
  try {
    return JSON.parse(value) as {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
  } catch {
    return undefined;
  }
}

function discoverTokensInOrigin(
  origin: string,
  entries: Array<{ name: string; value: string }>,
  meta?: DoPortalAuthMeta,
): DiscoveredTokens | undefined {
  const accessKeys = [
    ...(meta?.accessTokenKeys ?? []),
    ...DO_PORTAL_ACCESS_TOKEN_KEYS,
  ];
  const refreshKeys = [
    ...(meta?.refreshTokenKeys ?? []),
    ...DO_PORTAL_REFRESH_TOKEN_KEYS,
  ];
  const oidcKeys = meta?.oidcUserKeys ?? [];

  for (const entry of entries) {
    if (OIDC_USER_KEY_PATTERN.test(entry.name) || oidcKeys.includes(entry.name)) {
      const oidc = parseOidcUserValue(entry.value);
      if (oidc?.access_token) {
        return {
          origin,
          accessToken: oidc.access_token,
          accessTokenKey: entry.name,
          refreshToken: oidc.refresh_token,
          refreshTokenKey: oidc.refresh_token ? entry.name : undefined,
          expiresAtMs: oidc.expires_at ? oidc.expires_at * 1000 : parseJwtExpiryMs(oidc.access_token),
          oidcUserKey: entry.name,
        };
      }
    }
  }

  for (const key of accessKeys) {
    const entry = entries.find((e) => e.name === key);
    if (entry && looksLikeJwt(entry.value)) {
      let refreshToken: string | undefined;
      let refreshTokenKey: string | undefined;
      for (const rk of refreshKeys) {
        const rt = entries.find((e) => e.name === rk);
        if (rt?.value) {
          refreshToken = rt.value;
          refreshTokenKey = rk;
          break;
        }
      }
      return {
        origin,
        accessToken: entry.value,
        accessTokenKey: key,
        refreshToken,
        refreshTokenKey,
        expiresAtMs: parseJwtExpiryMs(entry.value),
      };
    }
  }

  for (const entry of entries) {
    if (looksLikeJwt(entry.value)) {
      return {
        origin,
        accessToken: entry.value,
        accessTokenKey: entry.name,
        expiresAtMs: parseJwtExpiryMs(entry.value),
      };
    }
  }

  return undefined;
}

export function discoverTokensFromStorageState(
  state: PlaywrightStorageState,
  meta?: DoPortalAuthMeta,
): DiscoveredTokens | undefined {
  const preferredOrigins = doPortalAuthOrigins();
  const sorted = [...state.origins].sort((a, b) => {
    const aIdx = preferredOrigins.findIndex((o) => a.origin.startsWith(o));
    const bIdx = preferredOrigins.findIndex((o) => b.origin.startsWith(o));
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  for (const origin of sorted) {
    const found = discoverTokensInOrigin(origin.origin, origin.localStorage, meta);
    if (found) return found;
  }
  return undefined;
}

export async function getTokensFromPage(page: Page): Promise<DiscoveredTokens | undefined> {
  const meta = readAuthMeta();
  const origins = doPortalAuthOrigins();
  for (const origin of origins) {
    const entries = await page.evaluate((o) => {
      const result: Array<{ name: string; value: string }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) result.push({ name: key, value: localStorage.getItem(key) ?? "" });
      }
      return result;
    }, origin).catch(() => null);

    if (!entries?.length) continue;
    const found = discoverTokensInOrigin(origin, entries, meta);
    if (found) return found;
  }

  const currentOrigin = new URL(page.url()).origin;
  const entries = await page.evaluate(() => {
    const result: Array<{ name: string; value: string }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) result.push({ name: key, value: localStorage.getItem(key) ?? "" });
    }
    return result;
  }).catch(() => []);

  return discoverTokensInOrigin(currentOrigin, entries, meta);
}

export function discoverAndSaveAuthMeta(state: PlaywrightStorageState): DoPortalAuthMeta {
  const accessTokenKeys = new Set<string>();
  const refreshTokenKeys = new Set<string>();
  const oidcUserKeys = new Set<string>();
  const origins = new Set<string>();

  for (const origin of state.origins) {
    origins.add(origin.origin);
    for (const entry of origin.localStorage) {
      if (OIDC_USER_KEY_PATTERN.test(entry.name)) {
        oidcUserKeys.add(entry.name);
        const oidc = parseOidcUserValue(entry.value);
        if (oidc?.access_token) accessTokenKeys.add(entry.name);
        if (oidc?.refresh_token) refreshTokenKeys.add(entry.name);
      }
      if (DO_PORTAL_ACCESS_TOKEN_KEYS.includes(entry.name) || looksLikeJwt(entry.value)) {
        accessTokenKeys.add(entry.name);
      }
      if (DO_PORTAL_REFRESH_TOKEN_KEYS.includes(entry.name)) {
        refreshTokenKeys.add(entry.name);
      }
    }
  }

  const meta: DoPortalAuthMeta = {
    discoveredAt: new Date().toISOString(),
    tokenEndpointUrl: doPortalTokenEndpointUrl() ?? readAuthMeta()?.tokenEndpointUrl,
    clientId: doPortalOAuthClientId() ?? readAuthMeta()?.clientId,
    accessTokenKeys: [...accessTokenKeys],
    refreshTokenKeys: [...refreshTokenKeys],
    oidcUserKeys: [...oidcUserKeys],
    origins: [...origins],
  };
  writeAuthMeta(meta);
  return meta;
}

export function recordTokenEndpointFromUrl(url: string): void {
  if (!/\/token|oauth2\/token|\/refresh/i.test(url)) return;
  const meta = readAuthMeta() ?? {
    discoveredAt: new Date().toISOString(),
    accessTokenKeys: [],
    refreshTokenKeys: [],
    oidcUserKeys: [],
    origins: [],
  };
  meta.tokenEndpointUrl = url.split("?")[0];
  meta.discoveredAt = new Date().toISOString();
  writeAuthMeta(meta);
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

interface RefreshTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

function applyTokensToStorageState(
  state: PlaywrightStorageState,
  tokens: DiscoveredTokens,
  newAccess: string,
  newRefresh?: string,
): void {
  const origin = state.origins.find((o) => o.origin === tokens.origin);
  if (!origin) {
    state.origins.push({
      origin: tokens.origin,
      localStorage: [],
    });
  }
  const target = state.origins.find((o) => o.origin === tokens.origin)!;

  if (tokens.oidcUserKey) {
    const entry = target.localStorage.find((e) => e.name === tokens.oidcUserKey);
    const oidc = parseOidcUserValue(entry?.value ?? "{}") ?? {};
    oidc.access_token = newAccess;
    if (newRefresh) oidc.refresh_token = newRefresh;
    if (tokens.expiresAtMs) {
      oidc.expires_at = Math.floor(tokens.expiresAtMs / 1000);
    } else if (oidc.expires_at) {
      const ttl = parseJwtExpiryMs(newAccess);
      if (ttl) oidc.expires_at = Math.floor(ttl / 1000);
    }
    const serialized = JSON.stringify(oidc);
    if (entry) entry.value = serialized;
    else target.localStorage.push({ name: tokens.oidcUserKey, value: serialized });
    return;
  }

  const accessEntry = target.localStorage.find((e) => e.name === tokens.accessTokenKey);
  if (accessEntry) accessEntry.value = newAccess;
  else target.localStorage.push({ name: tokens.accessTokenKey, value: newAccess });

  if (newRefresh && tokens.refreshTokenKey) {
    const refreshEntry = target.localStorage.find((e) => e.name === tokens.refreshTokenKey);
    if (refreshEntry) refreshEntry.value = newRefresh;
    else target.localStorage.push({ name: tokens.refreshTokenKey, value: newRefresh });
  }
}

async function tryAppNativeSilentRefresh(page: Page): Promise<boolean> {
  return page
    .evaluate(async () => {
      const w = window as unknown as Record<string, unknown>;
      const oauth = w.oauthService as
        | { refreshToken?: () => Promise<boolean> }
        | undefined;
      if (oauth?.refreshToken) {
        await oauth.refreshToken();
        return true;
      }
      const mgr = w.__oidcUserManager as
        | { signinSilent?: () => Promise<unknown> }
        | undefined;
      if (mgr?.signinSilent) {
        await mgr.signinSilent();
        return true;
      }
      return false;
    })
    .catch(() => false);
}

async function callTokenEndpoint(
  request: APIRequestContext,
  tokenUrl: string,
  refreshToken: string,
  clientId?: string,
): Promise<RefreshTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  if (clientId) body.set("client_id", clientId);

  const response = await request.post(tokenUrl, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: body.toString(),
  });

  try {
    return (await response.json()) as RefreshTokenResponse;
  } catch {
    return {
      error: "invalid_response",
      error_description: await response.text().catch(() => "Unknown error"),
    };
  }
}

function resolveTokenEndpoint(meta?: DoPortalAuthMeta): string | undefined {
  return doPortalTokenEndpointUrl() ?? meta?.tokenEndpointUrl;
}

export async function refreshAccessToken(page: Page): Promise<TokenRefreshResult> {
  const meta = readAuthMeta();
  let tokens = await getTokensFromPage(page);

  if (!tokens?.refreshToken) {
    const state = readStorageStateFile();
    if (state) tokens = discoverTokensFromStorageState(state, meta) ?? tokens;
  }

  if (!tokens) {
    return { ok: false, message: "No access token found in browser storage." };
  }

  if (!isAccessTokenExpiringSoon(tokens.accessToken)) {
    return { ok: true, message: "Access token still valid.", tokens };
  }

  if (await tryAppNativeSilentRefresh(page)) {
    const refreshed = await getTokensFromPage(page);
    if (refreshed && !isAccessTokenExpiringSoon(refreshed.accessToken)) {
      await saveDoPortalStorageState(page.context());
      logTestStep("DO session: app-native silent token refresh succeeded.");
      return { ok: true, message: "App-native silent refresh.", tokens: refreshed };
    }
  }

  const refreshToken = tokens.refreshToken;
  if (!refreshToken) {
    return {
      ok: false,
      message:
        "Access token expiring but no refresh_token in storage. Re-run `npm run test:do:auth` with MFA.",
      tokens,
    };
  }

  const tokenUrl = resolveTokenEndpoint(meta);
  if (!tokenUrl) {
    return {
      ok: false,
      message:
        "Access token expiring but token endpoint unknown. Set DO_PORTAL_TOKEN_URL or re-run auth setup to capture it.",
      tokens,
    };
  }

  const response = await callTokenEndpoint(
    page.request,
    tokenUrl,
    refreshToken,
    doPortalOAuthClientId() ?? meta?.clientId,
  );

  if (!response.access_token) {
    return {
      ok: false,
      message:
        response.error_description ??
        response.error ??
        "Token refresh endpoint did not return access_token. Re-run `npm run test:do:auth` with MFA.",
      tokens,
    };
  }

  if (response.expires_in && tokens.oidcUserKey) {
    tokens.expiresAtMs = Date.now() + response.expires_in * 1000;
  }

  await applyTokensToPage(page, tokens, response.access_token, response.refresh_token);
  const updated = await getTokensFromPage(page);
  await saveDoPortalStorageState(page.context());
  logTestStep("DO session: silent refresh_token exchange succeeded.");
  return {
    ok: true,
    message: "Refresh token exchange succeeded.",
    tokens: updated ?? tokens,
  };
}

async function applyTokensToPage(
  page: Page,
  tokens: DiscoveredTokens,
  newAccess: string,
  newRefresh?: string,
): Promise<void> {
  await page.evaluate(
    ({ origin, accessKey, refreshKey, oidcKey, access, refresh }) => {
      if (window.location.origin !== origin) return;
      if (oidcKey) {
        const raw = localStorage.getItem(oidcKey);
        const oidc = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        oidc.access_token = access;
        if (refresh) oidc.refresh_token = refresh;
        localStorage.setItem(oidcKey, JSON.stringify(oidc));
        return;
      }
      localStorage.setItem(accessKey, access);
      if (refresh && refreshKey) localStorage.setItem(refreshKey, refresh);
    },
    {
      origin: tokens.origin,
      accessKey: tokens.accessTokenKey,
      refreshKey: tokens.refreshTokenKey,
      oidcKey: tokens.oidcUserKey,
      access: newAccess,
      refresh: newRefresh,
    },
  );
}

export async function refreshAccessTokenFromFile(
  filePath = doPortalAuthFile,
): Promise<TokenRefreshResult> {
  return withStorageFileLock(async () => {
    const state = readStorageStateFile(filePath);
    if (!state) {
      return { ok: false, message: `Auth file missing: ${filePath}` };
    }

    const meta = readAuthMeta();
    const tokens = discoverTokensFromStorageState(state, meta);
    if (!tokens) {
      return { ok: false, message: "No tokens found in storage state file." };
    }

    if (!isAccessTokenExpiringSoon(tokens.accessToken)) {
      return { ok: true, message: "File access token still valid.", tokens };
    }

    if (!tokens.refreshToken) {
      return {
        ok: false,
        message:
          "File access token expired and no refresh_token present. Re-run `npm run test:do:auth` with MFA.",
        tokens,
      };
    }

    const tokenUrl = resolveTokenEndpoint(meta);
    if (!tokenUrl) {
      return {
        ok: false,
        message:
          "Token endpoint unknown. Set DO_PORTAL_TOKEN_URL env var or complete auth setup with network capture.",
        tokens,
      };
    }

    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ storageState: filePath });
      const response = await callTokenEndpoint(
        context.request,
        tokenUrl,
        tokens.refreshToken,
        doPortalOAuthClientId() ?? meta?.clientId,
      );
      await context.close();

      if (!response.access_token) {
        return {
          ok: false,
          message:
            response.error_description ??
            response.error ??
            "File-based refresh failed. Re-run `npm run test:do:auth` with MFA.",
          tokens,
        };
      }

      const updatedTokens = { ...tokens };
      if (response.expires_in) {
        updatedTokens.expiresAtMs = Date.now() + response.expires_in * 1000;
      }
      applyTokensToStorageState(
        state,
        updatedTokens,
        response.access_token,
        response.refresh_token ?? tokens.refreshToken,
      );
      writeStorageStateFile(state, filePath);
      logTestStep("DO session: refreshed access token in storage state file.");
      return { ok: true, message: "File refresh succeeded.", tokens };
    } finally {
      await browser.close();
    }
  });
}

export async function ensureFreshDoPortalStorageFile(): Promise<TokenRefreshResult> {
  if (!fs.existsSync(doPortalAuthFile)) {
    return { ok: false, message: "Auth storage file does not exist yet." };
  }
  return refreshAccessTokenFromFile();
}

export async function saveDoPortalStorageState(context: BrowserContext): Promise<void> {
  await withStorageFileLock(async () => {
    fs.mkdirSync(path.dirname(doPortalAuthFile), { recursive: true });
    await context.storageState({ path: doPortalAuthFile });
    const state = readStorageStateFile();
    if (state) discoverAndSaveAuthMeta(state);
  });
}

// ---------------------------------------------------------------------------
// Keepalive
// ---------------------------------------------------------------------------

export function startDoPortalSessionKeepAlive(
  page: Page,
  options: KeepaliveOptions = {},
): KeepaliveHandle {
  const intervalMs = options.intervalMs ?? DO_PORTAL_KEEPALIVE_INTERVAL_MS;
  const expiryBufferMs = options.expiryBufferMs ?? DO_PORTAL_TOKEN_EXPIRY_BUFFER_MS;
  let stopped = false;

  const tick = async () => {
    if (stopped || page.isClosed()) return;
    try {
      const tokens = await getTokensFromPage(page);
      if (!tokens || isAccessTokenExpiringSoon(tokens.accessToken, expiryBufferMs)) {
        const result = await refreshAccessToken(page);
        if (!result.ok) {
          logTestStep(`DO session keepalive: ${result.message}`);
        }
      } else {
        await saveDoPortalStorageState(page.context());
      }
    } catch (err) {
      logTestStep(
        `DO session keepalive error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  void tick();

  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}

// ---------------------------------------------------------------------------
// 401 recovery (refresh only — no MFA re-login)
// ---------------------------------------------------------------------------

export function installDoPortalAuthRecovery(page: Page): () => void {
  const handler = (response: {
    status: () => number;
    text: () => Promise<string>;
  }) => {
    void (async () => {
      if (response.status() !== 401) return;
      const body = await response.text().catch(() => "");
      if (!/jwt|token.*expir|unauthorized/i.test(body)) return;
      logTestStep("DO session: 401/JWT expired detected — attempting silent refresh.");
      await refreshAccessToken(page);
    })();
  };

  page.on("response", handler);

  return () => {
    page.off("response", handler);
  };
}

export async function ensureLiveDoPortalSession(page: Page): Promise<void> {
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  const result = await refreshAccessToken(page);
  if (!result.ok && result.message.includes("expiring")) {
    throw new Error(result.message);
  }
}
