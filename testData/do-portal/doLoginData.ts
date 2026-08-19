import { getCurrentEnv } from "../../config/env";
import type { LoginCredentials, LoginTestData, LoginUsers } from "../types";
import loginData from "./loginData.json";

const data = loginData as LoginTestData;

/**
 * DO portal login credentials for the active environment.
 * Reads `environments[TEST_ENV]` from loginData.json when present
 * (e.g. `sit`); otherwise falls back to the top-level default users.
 */
export function getDoPortalLoginData(): LoginUsers {
  const env = getCurrentEnv();
  return (
    data.environments?.[env] ?? {
      validUsers: data.validUsers,
      invalidUsers: data.invalidUsers,
    }
  );
}

/** Active DO auth user for setup/fixtures (first valid user unless DO_PORTAL_USERNAME is set). */
export function getDoPortalAuthUser(): LoginCredentials {
  const { validUsers } = getDoPortalLoginData();
  const requested = process.env.DO_PORTAL_USERNAME?.trim();
  if (requested) {
    const match = validUsers.find(
      (user) => user.username.toLowerCase() === requested.toLowerCase(),
    );
    if (!match) {
      throw new Error(
        `DO_PORTAL_USERNAME="${requested}" not found in DO loginData for ${getCurrentEnv()}.`,
      );
    }
    return match;
  }
  return validUsers[0];
}
