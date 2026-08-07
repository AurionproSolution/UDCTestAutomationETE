/**
 * Unit checks for RSS portal JWT/session helpers (no browser / MFA required).
 */
import { test, expect } from "@playwright/test";
import type { RssPortalAuthMeta } from "../../config/rss-portal-auth.config";
import {
  discoverTokensFromStorageState,
  evaluateRssPortalSessionFromState,
  hasRssPortalHostSessionCookies,
  looksLikeJwt,
} from "../../playwright/rss-portal-session.helper";

/** Sample JWT: exp = 4102444800 (year 2099). */
const FAR_FUTURE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjo0MTAyNDQ0ODAwfQ.x";

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
        domain: "udc-test.fiscloudservices.com",
        path: "/",
      },
    ],
    origins: [],
  };
}

const BASE_NOW_MS = Date.UTC(2026, 5, 11, 12, 0, 0);

test.describe("rss-portal-session.helper", () => {
  test("looksLikeJwt identifies JWT shape", () => {
    expect(looksLikeJwt(FAR_FUTURE_JWT)).toBe(true);
    expect(looksLikeJwt("not-a-jwt")).toBe(false);
  });

  test("discoverTokensFromStorageState finds mfe_access_token cookie", () => {
    const tokens = discoverTokensFromStorageState(cookieState(FAR_FUTURE_JWT));
    expect(tokens?.accessToken).toBe(FAR_FUTURE_JWT);
    expect(tokens?.accessTokenKey).toBe("cookie:mfe_access_token");
    expect(tokens?.cookieDomain).toBe("udc-test.fiscloudservices.com");
  });

  test("evaluateRssPortalSessionFromState reuses session when mfe_access_token is present", () => {
    const nowMs = BASE_NOW_MS;
    const savedAt = new Date(nowMs - 10 * 60_000).toISOString();
    const jwt = makeTestJwt(
      Math.floor((nowMs - 10 * 60_000) / 1000),
      Math.floor((nowMs + 10 * 60_000) / 1000),
    );
    const meta: RssPortalAuthMeta = {
      discoveredAt: savedAt,
      sessionSavedAt: savedAt,
      accessTokenKeys: ["cookie:mfe_access_token"],
      refreshTokenKeys: [],
      oidcUserKeys: [],
      origins: [],
    };

    const result = evaluateRssPortalSessionFromState(cookieState(jwt), meta, { nowMs });
    expect(result.action).toBe("reuse");
    expect(result.ageMinutes).toBe(10);
  });

  test("evaluateRssPortalSessionFromState requires MFA when only infra cookies are present", () => {
    const nowMs = BASE_NOW_MS;
    const savedAt = new Date(nowMs - 5 * 60_000).toISOString();
    const state = {
      cookies: [
        {
          name: "ApplicationGatewayAffinity",
          value: "affinity-value",
          domain: "udc-test.fiscloudservices.com",
          path: "/",
        },
        {
          name: "ai_user",
          value: "telemetry-user",
          domain: "udc-test.fiscloudservices.com",
          path: "/",
        },
      ],
      origins: [],
    };
    const meta: RssPortalAuthMeta = {
      discoveredAt: savedAt,
      sessionSavedAt: savedAt,
      accessTokenKeys: [],
      refreshTokenKeys: [],
      oidcUserKeys: [],
      origins: [],
    };

    expect(hasRssPortalHostSessionCookies(state)).toBe(true);

    const result = evaluateRssPortalSessionFromState(state, meta, { nowMs });
    expect(result.action).toBe("mfa");
    expect(result.reason).toContain("No discoverable access token");
  });

  test("evaluateRssPortalSessionFromState requires MFA when JWT expired and no refresh_token", () => {
    const nowMs = BASE_NOW_MS;
    const savedAt = new Date(nowMs - 5 * 60_000).toISOString();
    const expiredJwt = makeTestJwt(
      Math.floor((nowMs - 60 * 60_000) / 1000),
      Math.floor((nowMs - 30 * 60_000) / 1000),
    );
    const meta: RssPortalAuthMeta = {
      discoveredAt: savedAt,
      sessionSavedAt: savedAt,
      accessTokenKeys: ["cookie:mfe_access_token"],
      refreshTokenKeys: [],
      oidcUserKeys: [],
      origins: [],
    };

    const result = evaluateRssPortalSessionFromState(cookieState(expiredJwt), meta, {
      nowMs,
    });
    expect(result.action).toBe("mfa");
    expect(result.reason).toContain("no refresh_token");
  });
});
