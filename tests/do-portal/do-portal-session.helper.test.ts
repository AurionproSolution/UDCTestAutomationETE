/**
 * Unit checks for DO portal JWT/session helpers (no browser / MFA required).
 */
import { test, expect } from "@playwright/test";
import {
  discoverTokensFromStorageState,
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
