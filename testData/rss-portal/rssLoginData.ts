import { getCurrentEnv } from "../../config/env";
import type { LoginTestData, LoginUsers } from "../types";
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
