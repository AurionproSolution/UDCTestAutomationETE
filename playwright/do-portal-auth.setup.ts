/**
 * CI / multi-project mode: dependency project that runs before do-portal-chromium.
 * Not used when PLAYWRIGHT_IDE=1 (see playwright.config.ts globalSetup instead).
 */

import { test as setup } from "@playwright/test";
import { loginDoPortalAndSaveStorage } from "./do-portal-auth.helper";

setup("authenticate DO portal", async ({ page }) => {
  await loginDoPortalAndSaveStorage(page);
});
