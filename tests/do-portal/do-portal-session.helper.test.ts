/**
 * Unit checks for DO portal JWT/session helpers (no browser / MFA required).
 */
import { test, expect } from "@playwright/test";
import type { DoPortalAuthMeta } from "../../config/do-portal-auth.config";
import {
  discoverTokensFromStorageState,
  evaluateDoPortalSessionFromState,
  isAccessTokenExpiringSoon,
  looksLikeJwt,
  parseJwtExpiryMs,
} from "../../playwright/do-portal-session.helper";

/** Sample JWT: exp = 4102444800 (year 2099). */
const FAR_FUTURE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjo0MTAyNDQ0ODAwfQ.x";

/** Sample JWT: exp = 1000000000 (year 2001). */
const EXPIRED_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxMDAwMDAwMDAwfQ.x";

function makeTestJwt(iatSec: number, expSec: number): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: "test", iat: iatSec, exp: expSec }),
  ).toString("base64url");
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.x`;
}

function cookieState(jwt: string) {
  return {
    cookies: [
      {
        name: "mfe_access_token",
        value: jwt,
        domain: "testportaludc.aurionpro.com",
        path: "/",
      },
    ],
    origins: [],
  };
}

const BASE_NOW_MS = Date.UTC(2026, 5, 11, 12, 0, 0);

test.describe("do-portal-session.helper", () => {
  test("looksLikeJwt identifies JWT shape", () => {
    expect(looksLikeJwt(FAR_FUTURE_JWT)).toBe(true);
    expect(looksLikeJwt("not-a-jwt")).toBe(false);
  });

  test("parseJwtExpiryMs decodes exp claim", () => {
    expect(parseJwtExpiryMs(FAR_FUTURE_JWT)).toBe(4102444800 * 1000);
    expect(parseJwtExpiryMs(EXPIRED_JWT)).toBe(1000000000 * 1000);
  });

  test("isAccessTokenExpiringSoon respects buffer", () => {
    expect(isAccessTokenExpiringSoon(FAR_FUTURE_JWT, 60_000)).toBe(false);
    expect(isAccessTokenExpiringSoon(EXPIRED_JWT, 60_000)).toBe(true);
    expect(isAccessTokenExpiringSoon(undefined)).toBe(true);
  });

  test("discoverTokensFromStorageState finds oidc.user blob", () => {
    const state = {
      cookies: [],
      origins: [
        {
          origin: "https://aurpr-ia.assetfinance.myfis.cloud",
          localStorage: [
            {
              name: "oidc.user:https://login.example.com/:client",
              value: JSON.stringify({
                access_token: FAR_FUTURE_JWT,
                refresh_token: "rt-abc",
                expires_at: 4102444800,
              }),
            },
          ],
        },
      ],
    };
    const tokens = discoverTokensFromStorageState(state);
    expect(tokens?.accessToken).toBe(FAR_FUTURE_JWT);
    expect(tokens?.refreshToken).toBe("rt-abc");
    expect(tokens?.oidcUserKey).toContain("oidc.user:");
  });

  test("discoverTokensFromStorageState finds mfe_access_token cookie", () => {
    const state = {
      cookies: [
        {
          name: "mfe_access_token",
          value: FAR_FUTURE_JWT,
          domain: "testportaludc.aurionpro.com",
          path: "/",
        },
      ],
      origins: [],
    };
    const tokens = discoverTokensFromStorageState(state);
    expect(tokens?.accessToken).toBe(FAR_FUTURE_JWT);
    expect(tokens?.accessTokenKey).toBe("cookie:mfe_access_token");
    expect(tokens?.cookieDomain).toBe("testportaludc.aurionpro.com");
  });

  test("evaluateDoPortalSessionFromState reuses session saved 10 min ago", () => {
    const nowMs = BASE_NOW_MS;
    const savedAt = new Date(nowMs - 10 * 60_000).toISOString();
    const jwt = makeTestJwt(
      Math.floor((nowMs - 10 * 60_000) / 1000),
      Math.floor((nowMs + 10 * 60_000) / 1000),
    );
    const meta: DoPortalAuthMeta = {
      discoveredAt: savedAt,
      sessionSavedAt: savedAt,
      accessTokenKeys: ["cookie:mfe_access_token"],
      refreshTokenKeys: [],
      oidcUserKeys: [],
      origins: [],
    };

    const result = evaluateDoPortalSessionFromState(cookieState(jwt), meta, { nowMs });
    expect(result.action).toBe("reuse");
    expect(result.ageMinutes).toBe(10);
  });

  test("evaluateDoPortalSessionFromState requires MFA when session saved 16 min ago", () => {
    const nowMs = BASE_NOW_MS;
    const savedAt = new Date(nowMs - 16 * 60_000).toISOString();
    const jwt = makeTestJwt(
      Math.floor((nowMs - 16 * 60_000) / 1000),
      Math.floor((nowMs + 4 * 60_000) / 1000),
    );
    const meta: DoPortalAuthMeta = {
      discoveredAt: savedAt,
      sessionSavedAt: savedAt,
      accessTokenKeys: ["cookie:mfe_access_token"],
      refreshTokenKeys: [],
      oidcUserKeys: [],
      origins: [],
    };

    const result = evaluateDoPortalSessionFromState(cookieState(jwt), meta, { nowMs });
    expect(result.action).toBe("mfa");
    expect(result.reason).toContain("16 min ago");
  });

  test("evaluateDoPortalSessionFromState requires MFA when JWT expired", () => {
    const nowMs = BASE_NOW_MS;
    const savedAt = new Date(nowMs - 5 * 60_000).toISOString();
    const meta: DoPortalAuthMeta = {
      discoveredAt: savedAt,
      sessionSavedAt: savedAt,
      accessTokenKeys: ["cookie:mfe_access_token"],
      refreshTokenKeys: [],
      oidcUserKeys: [],
      origins: [],
    };

    const result = evaluateDoPortalSessionFromState(cookieState(EXPIRED_JWT), meta, {
      nowMs,
    });
    expect(result.action).toBe("mfa");
    expect(result.reason).toBe("JWT expired.");
  });

  test("discoverTokensFromStorageState finds flat access_token keys", () => {
    const state = {
      cookies: [],
      origins: [
        {
          origin: "https://example.com",
          localStorage: [
            { name: "access_token", value: FAR_FUTURE_JWT },
            { name: "refresh_token", value: "rt-flat" },
          ],
        },
      ],
    };
    const tokens = discoverTokensFromStorageState(state);
    expect(tokens?.accessTokenKey).toBe("access_token");
    expect(tokens?.refreshToken).toBe("rt-flat");
  });
});
