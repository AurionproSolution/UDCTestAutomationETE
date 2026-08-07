/**
 * RSS portal silent token refresh configuration.
 * Secrets (tokens) are never stored here — only endpoint URLs and storage key hints.
 * Override via env vars when discovery metadata differs per environment.
 */

import * as fs from "fs";
import * as path from "path";
import { getRssPortalLoginData, getRssPortalAuthUser } from "../testData/rss-portal/rssLoginData";
import { RSS_BASE_URL, getCurrentEnv } from "./env";

/** Playwright storageState path for the active TEST_ENV. */
export function getRssPortalAuthFileRel(): string {
  return `playwright/.auth/rss-portal.${getCurrentEnv()}.json`;
}

/** Non-secret metadata path for the active TEST_ENV. */
export function getRssPortalAuthMetaFileRel(): string {
  return `playwright/.auth/rss-portal-auth-meta.${getCurrentEnv()}.json`;
}

/** Default keepalive interval — refresh before 20 min JWT expiry. */
export const RSS_PORTAL_KEEPALIVE_INTERVAL_MS = Number(
  process.env.RSS_PORTAL_KEEPALIVE_INTERVAL_MS ?? 5 * 60 * 1000,
);

/** Refresh when access token expires within this buffer. */
export const RSS_PORTAL_TOKEN_EXPIRY_BUFFER_MS = Number(
  process.env.RSS_PORTAL_TOKEN_EXPIRY_BUFFER_MS ?? 2 * 60 * 1000,
);

/**
 * Proactively refresh access_token (via refresh_token grant) when the session is older than this.
 * Does NOT trigger FIS MFA — only silent OAuth refresh. JWT lifetime is ~20 min; default 15 min
 * refreshes before expiry so parallel workers keep one shared session without re-login.
 */
export const RSS_PORTAL_MAX_SESSION_REUSE_AGE_MS = Number(
  process.env.RSS_PORTAL_MAX_SESSION_REUSE_AGE_MS ?? 15 * 60 * 1000,
);

/**
 * When true (default), each Playwright run clears saved RSS auth and runs MFA login once.
 * Parallel workers in the same run still share the session saved during that login.
 * Set RSS_PORTAL_LOGIN_EVERY_RUN=0 to reuse a saved session across runs (silent refresh).
 */
export const RSS_PORTAL_LOGIN_EVERY_RUN = process.env.RSS_PORTAL_LOGIN_EVERY_RUN !== "0";

/** Max wait for another parallel worker to finish the single coordinated MFA login. */
export const RSS_PORTAL_MFA_LOCK_WAIT_MS = Number(
  process.env.RSS_PORTAL_MFA_LOCK_WAIT_MS ?? 5 * 60 * 1000,
);

/**
 * Abandon an MFA lock file when older than this (default: lock wait + 60s).
 * Prevents interrupted runs from blocking subsequent workers on a dead lock.
 */
export const RSS_PORTAL_MFA_LOCK_MAX_AGE_MS = Number(
  process.env.RSS_PORTAL_MFA_LOCK_MAX_AGE_MS ?? RSS_PORTAL_MFA_LOCK_WAIT_MS + 60_000,
);

/** Auto-start keepalive when test timeout exceeds this (15 min). */
export const RSS_PORTAL_LONG_TEST_TIMEOUT_MS = Number(
  process.env.RSS_PORTAL_LONG_TEST_TIMEOUT_MS ?? 900_000,
);

export const RSS_PORTAL_ACCESS_TOKEN_KEYS = [
  "access_token",
  "accessToken",
  "token",
  "authToken",
  "id_token",
];

export const RSS_PORTAL_REFRESH_TOKEN_KEYS = [
  "refresh_token",
  "refreshToken",
];

export const RSS_PORTAL_ACCESS_TOKEN_COOKIE_NAMES = [
  "mfe_access_token",
  "access_token",
  "accessToken",
];

export const RSS_PORTAL_REFRESH_TOKEN_COOKIE_NAMES = [
  "refresh_token",
  "refreshToken",
  "mfe_refresh_token",
];

export const RSS_PORTAL_COOKIE_TOKEN_KEY_PREFIX = "cookie:";

export const OIDC_USER_KEY_PATTERN = /^oidc\.user:/i;
export const OIDC_METADATA_KEY_PATTERN = /^oidc\./i;

export function rssPortalTokenEndpointUrl(): string | undefined {
  const fromEnv = process.env.RSS_PORTAL_TOKEN_URL?.trim();
  if (fromEnv) return fromEnv;
  return undefined;
}

export function rssPortalOAuthClientId(): string | undefined {
  const fromEnv = process.env.RSS_PORTAL_OAUTH_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  return undefined;
}

/** Max wait for manual OTP entry during headed RSS login (SIT users with mfaMode=manual). */
export const RSS_PORTAL_MANUAL_OTP_TIMEOUT_MS = Number(
  process.env.RSS_PORTAL_MANUAL_OTP_TIMEOUT_MS ?? 5 * 60 * 1000,
);

/**
 * Base32 TOTP secret used for automated MFA during headed RSS login.
 * SIT-only by design: for other environments this returns `undefined`.
 * Skipped when the active auth user has `mfaMode: "manual"`.
 * Priority: 1) RSS_PORTAL_TOTP_SECRET env var, 2) loginData.json (committed),
 * 3) config/secrets.local.json (optional local override).
 */
export function rssPortalTotpSecret(): string | undefined {
  if (getCurrentEnv() !== "sit") return undefined;

  const authUser = getRssPortalAuthUser();
  if (authUser.mfaMode === "manual") return undefined;

  const fromEnv = process.env.RSS_PORTAL_TOTP_SECRET?.trim();
  if (fromEnv) return fromEnv;

  const fromLoginData = getRssPortalLoginData().totpSecret?.trim();
  if (fromLoginData) return fromLoginData;

  try {
    const secretsPath = path.join(__dirname, "secrets.local.json");
    if (fs.existsSync(secretsPath)) {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, "utf-8"));
      const secret = secrets?.sit?.totpSecret?.trim();
      if (secret) return secret;
    }
  } catch {
    // Ignore file read errors
  }

  return undefined;
}

/** Origins that may hold auth tokens (portal base + RSS paths). */
export function rssPortalAuthOrigins(): string[] {
  const base = RSS_BASE_URL().replace(/\/$/, "");
  return [base, `${base}/authentication`, `${base}/authentication/login`, `${base}/rss`];
}

/** Hostname for the active RSS portal (e.g. udc-test.fiscloudservices.com). */
export function rssPortalHostname(): string {
  return new URL(rssPortalAuthOrigins()[0]).hostname;
}

/** Cookie names that indicate an authenticated RSS portal host session (no JWT required). */
export const RSS_PORTAL_SESSION_COOKIE_HINTS = [
  "ApplicationGatewayAffinity",
  "ApplicationGatewayAffinityCORS",
  "ai_user",
];

export interface RssPortalAuthMeta {
  discoveredAt: string;
  testEnv?: string;
  portalBaseUrl?: string;
  sessionSavedAt?: string;
  lastRefreshedAt?: string;
  accessTokenIssuedAt?: string;
  accessTokenExpiresAt?: string;
  tokenEndpointUrl?: string;
  clientId?: string;
  accessTokenKeys: string[];
  refreshTokenKeys: string[];
  oidcUserKeys: string[];
  origins: string[];
}
