/**
 * CI / multi-project mode: dependency project that runs before rss-portal-chromium.
 */

import { test as setup } from "@playwright/test";
import { ensureRssPortalAuthSession } from "./rss-portal-auth.helper";

setup("authenticate RSS portal", async ({ page }) => {
  await ensureRssPortalAuthSession(page);
});
