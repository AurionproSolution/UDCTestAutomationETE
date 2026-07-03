/**
 * DO portal silent token refresh configuration.
 * Secrets (tokens) are never stored here — only endpoint URLs and storage key hints.
 * Override via env vars when discovery metadata differs per environment.
 */

import { DO_BASE_URL, getCurrentEnv } from "./env";

/** Playwright storageState path for the active TEST_ENV. */
export function getDoPortalAuthFileRel(): string {
  return `playwright/.auth/do-portal.${getCurrentEnv()}.json`;
}

/** Non-secret metadata path for the active TEST_ENV. */
export function getDoPortalAuthMetaFileRel(): string {
  return `playwright/.auth/do-portal-auth-meta.${getCurrentEnv()}.json`;
}

/** @deprecated Use {@link getDoPortalAuthFileRel}(). */
export const DO_PORTAL_AUTH_FILE_REL = getDoPortalAuthFileRel();

/** @deprecated Use {@link getDoPortalAuthMetaFileRel}(). */
export const DO_PORTAL_AUTH_META_FILE_REL = getDoPortalAuthMetaFileRel();

/** Default keepalive interval — refresh before 20 min JWT expiry. */
export const DO_PORTAL_KEEPALIVE_INTERVAL_MS = Number(
  process.env.DO_PORTAL_KEEPALIVE_INTERVAL_MS ?? 5 * 60 * 1000,
);

/** Refresh when access token expires within this buffer. */
export const DO_PORTAL_TOKEN_EXPIRY_BUFFER_MS = Number(
  process.env.DO_PORTAL_TOKEN_EXPIRY_BUFFER_MS ?? 2 * 60 * 1000,
);

/** Max age of a saved MFA session before forcing re-login (Test Explorer / CLI reuse gate). */
export const DO_PORTAL_MAX_SESSION_REUSE_AGE_MS = Number(
  process.env.DO_PORTAL_MAX_SESSION_REUSE_AGE_MS ?? 15 * 60 * 1000,
);

/** Auto-start keepalive when test timeout exceeds this (15 min). */
export const DO_PORTAL_LONG_TEST_TIMEOUT_MS = Number(
  process.env.DO_PORTAL_LONG_TEST_TIMEOUT_MS ?? 900_000,
);

/**
 * Known localStorage key names (checked in order; discovery may append more).
 * OIDC user-store keys match {@link OIDC_USER_KEY_PATTERN} and hold JSON blobs.
 */
export const DO_PORTAL_ACCESS_TOKEN_KEYS = [
  "access_token",
  "accessToken",
  "token",
  "authToken",
  "id_token",
];

export const DO_PORTAL_REFRESH_TOKEN_KEYS = [
  "refresh_token",
  "refreshToken",
];

/** HTTP cookies that hold the portal JWT (DO stores access token in mfe_access_token). */
export const DO_PORTAL_ACCESS_TOKEN_COOKIE_NAMES = [
  "mfe_access_token",
  "access_token",
  "accessToken",
];

export const DO_PORTAL_REFRESH_TOKEN_COOKIE_NAMES = [
  "refresh_token",
  "refreshToken",
  "mfe_refresh_token",
];

/** Prefix for cookie-backed keys in auth meta and {@link DiscoveredTokens}. */
export const DO_PORTAL_COOKIE_TOKEN_KEY_PREFIX = "cookie:";

export const OIDC_USER_KEY_PATTERN = /^oidc\.user:/i;
export const OIDC_METADATA_KEY_PATTERN = /^oidc\./i;

/**
 * Token endpoint URL. Set `DO_PORTAL_TOKEN_URL` after first headed login if auto-discovery
 * does not capture it. Common FIS / OIDC paths are listed as fallbacks for discovery.
 */
export function doPortalTokenEndpointUrl(): string | undefined {
  const fromEnv = process.env.DO_PORTAL_TOKEN_URL?.trim();
  if (fromEnv) return fromEnv;

  return undefined;
}

/** OAuth client_id for refresh_token grant (optional; read from meta after discovery). */
export function doPortalOAuthClientId(): string | undefined {
  const fromEnv = process.env.DO_PORTAL_OAUTH_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  return undefined;
}

/**
 * Base32 TOTP secret used for automated MFA during headed DO login.
 * Enabled for SIT/QAT when DO_PORTAL_TOTP_SECRET is set in the environment.
 */
export function doPortalTotpSecret(): string | undefined {
  const env = getCurrentEnv();
  if (env !== "sit" && env !== "qat") return undefined;
  const fromEnv = process.env.DO_PORTAL_TOTP_SECRET?.trim();
  return fromEnv || undefined;
}

/** Origins that may hold auth tokens (portal base + dealer path). */
export function doPortalAuthOrigins(): string[] {
  const base = DO_BASE_URL().replace(/\/$/, "");
  return [base, `${base}/dealer`, `${base}/dealer/`];
}

export interface DoPortalAuthMeta {
  discoveredAt: string;
  /** TEST_ENV value when this session was saved (e.g. sit, qat). */
  testEnv?: string;
  /** DO portal base URL for this session. */
  portalBaseUrl?: string;
  /** ISO timestamp when MFA login last saved storage state. */
  sessionSavedAt?: string;
  /** ISO timestamp from JWT iat. */
  accessTokenIssuedAt?: string;
  /** ISO timestamp from JWT exp. */
  accessTokenExpiresAt?: string;
  tokenEndpointUrl?: string;
  clientId?: string;
  accessTokenKeys: string[];
  refreshTokenKeys: string[];
  oidcUserKeys: string[];
  origins: string[];
}
