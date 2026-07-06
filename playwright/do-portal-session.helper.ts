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
  DO_PORTAL_ACCESS_TOKEN_COOKIE_NAMES,
  DO_PORTAL_ACCESS_TOKEN_KEYS,
  DO_PORTAL_COOKIE_TOKEN_KEY_PREFIX,
  DO_PORTAL_KEEPALIVE_INTERVAL_MS,
  DO_PORTAL_MAX_SESSION_REUSE_AGE_MS,
  DO_PORTAL_REFRESH_TOKEN_COOKIE_NAMES,
  DO_PORTAL_REFRESH_TOKEN_KEYS,
  DO_PORTAL_TOKEN_EXPIRY_BUFFER_MS,
  type DoPortalAuthMeta,
  getDoPortalAuthMetaFileRel,
  OIDC_USER_KEY_PATTERN,
  doPortalAuthOrigins,
  doPortalOAuthClientId,
  doPortalTokenEndpointUrl,
} from "../config/do-portal-auth.config";
import { DO_BASE_URL, DO_DEALER_STANDARD_QUOTE_URL, getCurrentEnv } from "../config/env";
import { logTestStep } from "../utils/testStepLog";
import { getDoPortalAuthFile } from "./do-portal-auth.helper";

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
  /** Set when the access token lives in an HTTP cookie (not localStorage). */
  cookieDomain?: string;
  cookiePath?: string;
}

export function isCookieTokenKey(key: string): boolean {
  return key.startsWith(DO_PORTAL_COOKIE_TOKEN_KEY_PREFIX);
}

export function cookieNameFromTokenKey(key: string): string {
  return isCookieTokenKey(key) ? key.slice(DO_PORTAL_COOKIE_TOKEN_KEY_PREFIX.length) : key;
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

export interface DoPortalSessionEvaluation {
  action: "reuse" | "refresh" | "mfa";
  reason: string;
  ageMinutes?: number;
  expiresAt?: string;
  tokens?: DiscoveredTokens;
}

export interface DiscoverAuthMetaOptions {
  /** Set sessionSavedAt to now (MFA login only — not keepalive / silent refresh). */
  stampSessionSavedAt?: boolean;
  /** Set lastRefreshedAt to now after silent refresh_token grant or keepalive save. */
  stampLastRefreshedAt?: boolean;
}

// ---------------------------------------------------------------------------
// JWT utilities
// ---------------------------------------------------------------------------

export function looksLikeJwt(value: string): boolean {
  const parts = value.trim().split(".");
  return parts.length === 3 && parts[0].startsWith("eyJ");
}

function decodeJwtPayload(token: string): { exp?: number; iat?: number } | undefined {
  try {
    const payload = token.trim().split(".")[1];
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
      exp?: number;
      iat?: number;
    };
  } catch {
    return undefined;
  }
}

export function parseJwtExpiryMs(token: string): number | undefined {
  const json = decodeJwtPayload(token);
  if (typeof json?.exp === "number") return json.exp * 1000;
  return undefined;
}

export function parseJwtIssuedMs(token: string): number | undefined {
  const json = decodeJwtPayload(token);
  if (typeof json?.iat === "number") return json.iat * 1000;
  return undefined;
}

export function isAccessTokenExpiringSoon(
  token: string | undefined,
  bufferMs = DO_PORTAL_TOKEN_EXPIRY_BUFFER_MS,
  nowMs = Date.now(),
): boolean {
  if (!token) return true;
  const expMs = parseJwtExpiryMs(token);
  if (!expMs) return false;
  return expMs - nowMs <= bufferMs;
}

// ---------------------------------------------------------------------------
// Storage state I/O
// ---------------------------------------------------------------------------

export function readStorageStateFile(
  filePath = getDoPortalAuthFile(),
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
  filePath = getDoPortalAuthFile(),
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

export function readAuthMeta(): DoPortalAuthMeta | undefined {
  const metaPath = path.join(process.cwd(), getDoPortalAuthMetaFileRel());
  if (!fs.existsSync(metaPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8")) as DoPortalAuthMeta;
  } catch {
    return undefined;
  }
}

export function writeAuthMeta(meta: DoPortalAuthMeta): void {
  const metaPath = path.join(process.cwd(), getDoPortalAuthMetaFileRel());
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
}

async function withStorageFileLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const lockPath = `${getDoPortalAuthFile()}.lock`;
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
  throw new Error(`Timed out acquiring lock for ${getDoPortalAuthFile()}`);
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

function portalHostnames(): string[] {
  return doPortalAuthOrigins().map((o) => {
    try {
      return new URL(o).hostname;
    } catch {
      return o;
    }
  });
}

function cookieOrigin(domain: string): string {
  const hosts = portalHostnames();
  const match = hosts.find((h) => domain === h || domain.endsWith(`.${h}`) || h.endsWith(domain));
  if (match) {
    return `https://${match}`;
  }
  return `https://${domain.replace(/^\./, "")}`;
}

function discoverTokensFromCookies(
  state: PlaywrightStorageState,
  meta?: DoPortalAuthMeta,
): DiscoveredTokens | undefined {
  const cookies = state.cookies ?? [];
  if (!cookies.length) return undefined;

  const accessNames = new Set<string>([
    ...DO_PORTAL_ACCESS_TOKEN_COOKIE_NAMES,
    ...(meta?.accessTokenKeys ?? [])
      .filter(isCookieTokenKey)
      .map(cookieNameFromTokenKey),
  ]);
  const refreshNames = new Set<string>([
    ...DO_PORTAL_REFRESH_TOKEN_COOKIE_NAMES,
    ...(meta?.refreshTokenKeys ?? [])
      .filter(isCookieTokenKey)
      .map(cookieNameFromTokenKey),
  ]);
  const preferredHosts = portalHostnames();

  const scoreCookie = (domain: unknown): number => {
    const d = String(domain ?? "");
    const idx = preferredHosts.findIndex((h) => d === h || d.endsWith(`.${h}`) || h.endsWith(d));
    return idx === -1 ? 99 : idx;
  };

  const sorted = [...cookies].sort(
    (a, b) => scoreCookie(a.domain) - scoreCookie(b.domain),
  );

  for (const name of accessNames) {
    const cookie = sorted.find((c) => c.name === name && typeof c.value === "string");
    if (!cookie || !looksLikeJwt(String(cookie.value))) continue;

    let refreshToken: string | undefined;
    let refreshTokenKey: string | undefined;
    for (const refreshName of refreshNames) {
      const rt = sorted.find((c) => c.name === refreshName && typeof c.value === "string");
      if (rt?.value) {
        refreshToken = String(rt.value);
        refreshTokenKey = `${DO_PORTAL_COOKIE_TOKEN_KEY_PREFIX}${refreshName}`;
        break;
      }
    }

    const domain = String(cookie.domain ?? preferredHosts[0] ?? "");
    return {
      origin: cookieOrigin(domain),
      accessToken: String(cookie.value),
      accessTokenKey: `${DO_PORTAL_COOKIE_TOKEN_KEY_PREFIX}${name}`,
      refreshToken,
      refreshTokenKey,
      expiresAtMs: parseJwtExpiryMs(String(cookie.value)),
      cookieDomain: domain,
      cookiePath: String(cookie.path ?? "/"),
    };
  }

  for (const cookie of sorted) {
    const value = cookie.value;
    if (typeof value !== "string" || !looksLikeJwt(value)) continue;
    const domain = String(cookie.domain ?? preferredHosts[0] ?? "");
    return {
      origin: cookieOrigin(domain),
      accessToken: value,
      accessTokenKey: `${DO_PORTAL_COOKIE_TOKEN_KEY_PREFIX}${String(cookie.name)}`,
      expiresAtMs: parseJwtExpiryMs(value),
      cookieDomain: domain,
      cookiePath: String(cookie.path ?? "/"),
    };
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

  return discoverTokensFromCookies(state, meta);
}

function resolveSessionSavedAtMs(
  meta: DoPortalAuthMeta | undefined,
  tokens: DiscoveredTokens | undefined,
  filePath = getDoPortalAuthFile(),
): number | undefined {
  const candidates: number[] = [];
  if (meta?.lastRefreshedAt) {
    const parsed = Date.parse(meta.lastRefreshedAt);
    if (!Number.isNaN(parsed)) candidates.push(parsed);
  }
  if (meta?.sessionSavedAt) {
    const parsed = Date.parse(meta.sessionSavedAt);
    if (!Number.isNaN(parsed)) candidates.push(parsed);
  }
  if (candidates.length) return Math.max(...candidates);
  if (tokens?.accessToken) {
    const iatMs = parseJwtIssuedMs(tokens.accessToken);
    if (iatMs) return iatMs;
  }
  if (fs.existsSync(filePath)) {
    return fs.statSync(filePath).mtimeMs;
  }
  return undefined;
}

function sessionNeedsProactiveRefresh(
  meta: DoPortalAuthMeta | undefined,
  tokens: DiscoveredTokens | undefined,
  nowMs: number,
  filePath = getDoPortalAuthFile(),
): boolean {
  const savedAtMs = resolveSessionSavedAtMs(meta, tokens, filePath);
  if (savedAtMs === undefined) return false;
  return nowMs - savedAtMs > DO_PORTAL_MAX_SESSION_REUSE_AGE_MS;
}

export function evaluateDoPortalSessionFromState(
  state: PlaywrightStorageState | undefined,
  meta: DoPortalAuthMeta | undefined,
  options: { filePath?: string; nowMs?: number } = {},
): DoPortalSessionEvaluation {
  const filePath = options.filePath ?? getDoPortalAuthFile();
  const nowMs = options.nowMs ?? Date.now();

  if (!state) {
    return { action: "mfa", reason: "Auth storage file does not exist." };
  }

  const expectedEnv = getCurrentEnv();
  const expectedBaseUrl = DO_BASE_URL().replace(/\/$/, "");
  if (meta?.testEnv && meta.testEnv !== expectedEnv) {
    return {
      action: "mfa",
      reason: `Saved session is for "${meta.testEnv}" but TEST_ENV is "${expectedEnv}".`,
    };
  }
  if (meta?.portalBaseUrl) {
    const savedBaseUrl = meta.portalBaseUrl.replace(/\/$/, "");
    if (savedBaseUrl !== expectedBaseUrl) {
      return {
        action: "mfa",
        reason: `Saved session URL "${savedBaseUrl}" does not match ${expectedBaseUrl}.`,
      };
    }
  }

  const tokens = discoverTokensFromStorageState(state, meta);

  if (!tokens) {
    return { action: "mfa", reason: "No discoverable access token in saved session." };
  }

  const expMs = parseJwtExpiryMs(tokens.accessToken);
  const expiresAt = expMs ? new Date(expMs).toISOString() : undefined;
  const savedAtMs = resolveSessionSavedAtMs(meta, tokens, filePath);
  const ageMinutes =
    savedAtMs !== undefined ? Math.round((nowMs - savedAtMs) / 60_000) : undefined;
  const maxAgeMinutes = Math.round(DO_PORTAL_MAX_SESSION_REUSE_AGE_MS / 60_000);

  const jwtExpiringSoon = isAccessTokenExpiringSoon(
    tokens.accessToken,
    DO_PORTAL_TOKEN_EXPIRY_BUFFER_MS,
    nowMs,
  );
  const proactiveRefresh = sessionNeedsProactiveRefresh(meta, tokens, nowMs, filePath);

  if (jwtExpiringSoon || proactiveRefresh) {
    const expired = expMs !== undefined && expMs <= nowMs;
    if (tokens.refreshToken) {
      const reason = expired
        ? "JWT expired — silent refresh_token grant required."
        : jwtExpiringSoon
          ? "JWT expiring soon — silent refresh_token grant required."
          : `Session age ${ageMinutes ?? "?"} min exceeds ${maxAgeMinutes} min — proactive silent refresh.`;
      return { action: "refresh", reason, ageMinutes, expiresAt, tokens };
    }
    return {
      action: "mfa",
      reason: expired
        ? "JWT expired and no refresh_token — MFA login required."
        : jwtExpiringSoon
          ? "JWT expiring soon and no refresh_token — MFA login required."
          : `Session age ${ageMinutes ?? "?"} min exceeds ${maxAgeMinutes} min and no refresh_token — MFA login required.`,
      ageMinutes,
      expiresAt,
      tokens,
    };
  }

  if (savedAtMs === undefined) {
    return {
      action: "reuse",
      reason: `JWT valid until ${expiresAt ?? "unknown"} (session age unknown).`,
      expiresAt,
      tokens,
    };
  }

  return {
    action: "reuse",
    reason: `Session fresh (${ageMinutes ?? "?"} min), JWT valid until ${expiresAt ?? "unknown"}.`,
    ageMinutes,
    expiresAt,
    tokens,
  };
}

export function evaluateDoPortalSession(
  filePath = getDoPortalAuthFile(),
): DoPortalSessionEvaluation {
  if (!fs.existsSync(filePath)) {
    return { action: "mfa", reason: "Auth storage file does not exist." };
  }

  return evaluateDoPortalSessionFromState(readStorageStateFile(filePath), readAuthMeta(), {
    filePath,
  });
}

export function hasReusableDoPortalSession(filePath = getDoPortalAuthFile()): boolean {
  return evaluateDoPortalSession(filePath).action === "reuse";
}

/** Auth file exists and contains tokens (may need silent refresh before reuse). */
export function hasUsableDoPortalAuthFile(filePath = getDoPortalAuthFile()): boolean {
  if (!fs.existsSync(filePath)) return false;
  const state = readStorageStateFile(filePath);
  if (!state) return false;
  return discoverTokensFromStorageState(state, readAuthMeta()) !== undefined;
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

  const fromCookies = await getTokensFromContextCookies(page, meta);
  if (fromCookies) return fromCookies;

  return discoverTokensInOrigin(currentOrigin, entries, meta);
}

async function getTokensFromContextCookies(
  page: Page,
  meta?: DoPortalAuthMeta,
): Promise<DiscoveredTokens | undefined> {
  const cookies = await page.context().cookies();
  return discoverTokensFromCookies(
    { cookies: cookies as unknown as Array<Record<string, unknown>>, origins: [] },
    meta,
  );
}

export function discoverAndSaveAuthMeta(
  state: PlaywrightStorageState,
  options: DiscoverAuthMetaOptions = {},
): DoPortalAuthMeta {
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

  for (const cookie of state.cookies ?? []) {
    const name = String(cookie.name ?? "");
    const value = cookie.value;
    if (!name || typeof value !== "string") continue;
    const domain = String(cookie.domain ?? "");
    if (domain) origins.add(cookieOrigin(domain));
    if (DO_PORTAL_ACCESS_TOKEN_COOKIE_NAMES.includes(name) || looksLikeJwt(value)) {
      accessTokenKeys.add(`${DO_PORTAL_COOKIE_TOKEN_KEY_PREFIX}${name}`);
    }
    if (DO_PORTAL_REFRESH_TOKEN_COOKIE_NAMES.includes(name)) {
      refreshTokenKeys.add(`${DO_PORTAL_COOKIE_TOKEN_KEY_PREFIX}${name}`);
    }
  }

  const previousMeta = readAuthMeta();
  const tokens = discoverTokensFromStorageState(state, previousMeta);
  const iatMs = tokens ? parseJwtIssuedMs(tokens.accessToken) : undefined;
  const expMs = tokens ? parseJwtExpiryMs(tokens.accessToken) : undefined;
  const nowIso = new Date().toISOString();

  const meta: DoPortalAuthMeta = {
    discoveredAt: nowIso,
    testEnv: getCurrentEnv(),
    portalBaseUrl: DO_BASE_URL(),
    sessionSavedAt: options.stampSessionSavedAt
      ? nowIso
      : previousMeta?.sessionSavedAt,
    lastRefreshedAt: options.stampLastRefreshedAt
      ? nowIso
      : previousMeta?.lastRefreshedAt,
    accessTokenIssuedAt: iatMs ? new Date(iatMs).toISOString() : previousMeta?.accessTokenIssuedAt,
    accessTokenExpiresAt: expMs ? new Date(expMs).toISOString() : previousMeta?.accessTokenExpiresAt,
    tokenEndpointUrl: doPortalTokenEndpointUrl() ?? previousMeta?.tokenEndpointUrl,
    clientId: doPortalOAuthClientId() ?? previousMeta?.clientId,
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
  if (isCookieTokenKey(tokens.accessTokenKey)) {
    const accessName = cookieNameFromTokenKey(tokens.accessTokenKey);
    const existing = state.cookies.find((c) => c.name === accessName);
    if (existing) {
      existing.value = newAccess;
      const expMs = parseJwtExpiryMs(newAccess);
      if (expMs) existing.expires = expMs / 1000;
    } else {
      state.cookies.push({
        name: accessName,
        value: newAccess,
        domain: tokens.cookieDomain ?? portalHostnames()[0],
        path: tokens.cookiePath ?? "/",
        expires: (parseJwtExpiryMs(newAccess) ?? Date.now() + 20 * 60_000) / 1000,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      });
    }

    if (newRefresh && tokens.refreshTokenKey && isCookieTokenKey(tokens.refreshTokenKey)) {
      const refreshName = cookieNameFromTokenKey(tokens.refreshTokenKey);
      const refreshCookie = state.cookies.find((c) => c.name === refreshName);
      if (refreshCookie) refreshCookie.value = newRefresh;
      else {
        state.cookies.push({
          name: refreshName,
          value: newRefresh,
          domain: tokens.cookieDomain ?? portalHostnames()[0],
          path: tokens.cookiePath ?? "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        });
      }
    }
    return;
  }

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
    return { ok: false, message: "No access token found in browser cookies or localStorage." };
  }

  const jwtExpiringSoon = isAccessTokenExpiringSoon(tokens.accessToken);
  const proactiveRefresh = sessionNeedsProactiveRefresh(meta, tokens);
  if (!jwtExpiringSoon && !proactiveRefresh) {
    return { ok: true, message: "Access token still valid.", tokens };
  }

  if (await tryAppNativeSilentRefresh(page)) {
    const refreshed = await getTokensFromPage(page);
    if (refreshed && !isAccessTokenExpiringSoon(refreshed.accessToken)) {
      await saveDoPortalStorageState(page.context(), { stampLastRefreshedAt: true });
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
  await saveDoPortalStorageState(page.context(), { stampLastRefreshedAt: true });
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
  if (isCookieTokenKey(tokens.accessTokenKey)) {
    const accessName = cookieNameFromTokenKey(tokens.accessTokenKey);
    const domain = tokens.cookieDomain ?? portalHostnames()[0];
    const path = tokens.cookiePath ?? "/";
    const expMs = parseJwtExpiryMs(newAccess);
    await page.context().addCookies([
      {
        name: accessName,
        value: newAccess,
        domain,
        path,
        expires: expMs ? Math.floor(expMs / 1000) : undefined,
      },
      ...(newRefresh && tokens.refreshTokenKey && isCookieTokenKey(tokens.refreshTokenKey)
        ? [
            {
              name: cookieNameFromTokenKey(tokens.refreshTokenKey),
              value: newRefresh,
              domain,
              path,
            },
          ]
        : []),
    ]);
    return;
  }

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
  filePath = getDoPortalAuthFile(),
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

    const metaNow = readAuthMeta();
    const jwtExpiringSoon = isAccessTokenExpiringSoon(tokens.accessToken);
    const proactiveRefresh = sessionNeedsProactiveRefresh(metaNow, tokens);

    if (!jwtExpiringSoon && !proactiveRefresh) {
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
      discoverAndSaveAuthMeta(state, { stampLastRefreshedAt: true });
      logTestStep("DO session: refreshed access token in storage state file.");
      return { ok: true, message: "File refresh succeeded.", tokens };
    } finally {
      await browser.close();
    }
  });
}

export async function ensureFreshDoPortalStorageFile(): Promise<TokenRefreshResult> {
  const evaluation = evaluateDoPortalSession();
  if (evaluation.action === "reuse" && evaluation.tokens) {
    return {
      ok: true,
      message: `Saved session still valid — ${evaluation.reason}`,
      tokens: evaluation.tokens,
    };
  }

  if (!fs.existsSync(getDoPortalAuthFile())) {
    return { ok: false, message: evaluation.reason };
  }

  return refreshAccessTokenFromFile();
}

export async function saveDoPortalStorageState(
  context: BrowserContext,
  options: DiscoverAuthMetaOptions = {},
): Promise<void> {
  const authFile = getDoPortalAuthFile();
  await withStorageFileLock(async () => {
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    await context.storageState({ path: authFile });
    const state = readStorageStateFile(authFile);
    if (state) discoverAndSaveAuthMeta(state, options);
  });
}

/** Load saved cookies into an existing context (after MFA in fixture / stale reuseBrowser). */
export async function applyDoPortalAuthToContext(
  context: BrowserContext,
  filePath = getDoPortalAuthFile(),
): Promise<void> {
  const state = readStorageStateFile(filePath);
  if (!state?.cookies?.length) return;

  await context.clearCookies();
  const cookies = state.cookies
    .filter((c) => c.name && c.domain)
    .map((c) => ({
      name: String(c.name),
      value: String(c.value ?? ""),
      domain: String(c.domain),
      path: String(c.path ?? "/"),
      expires:
        typeof c.expires === "number" && c.expires > 0
          ? c.expires
          : undefined,
      httpOnly: Boolean(c.httpOnly),
      secure: Boolean(c.secure),
      sameSite: (c.sameSite as "Strict" | "Lax" | "None") ?? "Lax",
    }));
  if (cookies.length) {
    await context.addCookies(cookies);
  }
}

/**
 * Silent refresh_token grant when JWT is expiring or session age exceeds the proactive threshold.
 * Never opens FIS MFA.
 */
export async function trySilentRefreshSession(
  filePath = getDoPortalAuthFile(),
): Promise<DoPortalSessionEvaluation> {
  let evaluation = evaluateDoPortalSession(filePath);
  if (evaluation.action === "reuse") {
    return evaluation;
  }
  if (evaluation.action === "refresh" && evaluation.tokens?.refreshToken) {
    const refreshed = await refreshAccessTokenFromFile(filePath);
    if (refreshed.ok) {
      evaluation = evaluateDoPortalSession(filePath);
      if (evaluation.action === "reuse") {
        logTestStep(`DO auth: silent refresh succeeded — ${evaluation.reason}`);
      }
      return evaluation;
    }
    logTestStep(`DO auth: silent refresh failed — ${refreshed.message}`);
  }
  return evaluation;
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
      const meta = readAuthMeta();
      const jwtExpiringSoon =
        !tokens || isAccessTokenExpiringSoon(tokens.accessToken, expiryBufferMs);
      const proactiveRefresh =
        !!tokens && sessionNeedsProactiveRefresh(meta, tokens);
      if (jwtExpiringSoon || proactiveRefresh) {
        const result = await refreshAccessToken(page);
        if (result.ok) {
          logTestStep("DO session keepalive: refreshed JWT and saved storage state.");
        } else {
          logTestStep(`DO session keepalive: ${result.message}`);
        }
      } else {
        await saveDoPortalStorageState(page.context(), { stampLastRefreshedAt: true });
        logTestStep("DO session keepalive: re-saved storage state (JWT still valid).");
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
