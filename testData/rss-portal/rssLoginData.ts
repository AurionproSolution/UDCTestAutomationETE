import { getCurrentEnv } from "../../config/env";
import type { LoginCredentials, LoginTestData, LoginUsers } from "../types";
import loginData from "./loginData.json";

const data = loginData as LoginTestData;

/**
 * RSS portal login credentials for the active environment.
 * Reads `environments[TEST_ENV]` from loginData.json when present
 * (e.g. `sit`); otherwise falls back to the top-level default users.
 */
export function getRssPortalLoginData(): LoginUsers {
  const env = getCurrentEnv();
  return (
    data.environments?.[env] ?? {
      validUsers: data.validUsers,
      invalidUsers: data.invalidUsers,
    }
  );
}

/**
 * Active RSS auth user for setup/fixtures.
 * Override with `RSS_PORTAL_USERNAME` (case-insensitive match against loginData.json).
 */
export function getRssPortalAuthUser(): LoginCredentials {
  const { validUsers } = getRssPortalLoginData();
  const requested = process.env.RSS_PORTAL_USERNAME?.trim();
  if (requested) {
    const match = validUsers.find(
      (user) => user.username.toLowerCase() === requested.toLowerCase(),
    );
    if (!match) {
      throw new Error(
        `RSS_PORTAL_USERNAME="${requested}" not found in RSS loginData for ${getCurrentEnv()}.`,
      );
    }
    return match;
  }
  return validUsers[0];
}

/**
 * Header party used by RSS sanity tests that need loans / bank-account data.
 * Override with `RSS_PORTAL_TEST_PARTY`.
 */
export function getRssPortalTestPartyName(): string {
  const fromEnv = process.env.RSS_PORTAL_TEST_PARTY?.trim();
  if (fromEnv) return fromEnv;

  const parties: Partial<Record<ReturnType<typeof getCurrentEnv>, string>> = {
    qat: "Anithmore Limited tested",
    sit: "Andrea Joyce Butcher",
  };
  return parties[getCurrentEnv()] ?? "Rss Test User";
}
