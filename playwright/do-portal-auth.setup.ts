/**
 * CI / multi-project mode: dependency project that runs before do-portal-chromium.
 * Not used when PLAYWRIGHT_IDE=1 (see playwright.config.ts globalSetup instead).
 */

import * as fs from "fs";
import { test as setup } from "@playwright/test";
import {
  doPortalAuthFile,
  loginDoPortalAndSaveStorage,
} from "./do-portal-auth.helper";
import {
  discoverTokensFromStorageState,
  isAccessTokenExpiringSoon,
  readStorageStateFile,
  refreshAccessTokenFromFile,
} from "./do-portal-session.helper";

setup("authenticate DO portal", async ({ page }) => {
  if (fs.existsSync(doPortalAuthFile)) {
    const state = readStorageStateFile();
    const tokens = state ? discoverTokensFromStorageState(state) : undefined;
    if (tokens && !isAccessTokenExpiringSoon(tokens.accessToken)) {
      return;
    }
    if (tokens?.refreshToken) {
      const refreshed = await refreshAccessTokenFromFile();
      if (refreshed.ok) return;
    }
  }

  await loginDoPortalAndSaveStorage(page);
});
