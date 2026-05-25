/**
 * IDE / single-project mode: login once before the run when auth storage is missing.
 * Replaces the dependency-project setup step so Test Explorer stays a flat tests/ tree.
 */

import type { FullConfig } from "@playwright/test";
import { ensureDoPortalAuthStorage } from "./do-portal-auth.helper";

async function globalSetup(_config: FullConfig): Promise<void> {
  const useGlobalDoAuth =
    !process.env.CI || process.env.PLAYWRIGHT_USE_DO_GLOBAL_AUTH === "1";
  if (!useGlobalDoAuth) return;

  await ensureDoPortalAuthStorage();
}

export default globalSetup;
