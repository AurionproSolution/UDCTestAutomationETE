/**
 * Shared DO portal login → playwright/.auth/do-portal.json
 * Used by globalSetup (IDE) and do-portal-auth.setup.ts (CI dependency project).
 */

import { chromium, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { DO_BASE_URL, DO_DEALER_STANDARD_QUOTE_URL } from "../config/env";
import { DOLoginPage } from "../pages";
import doLoginData from "../testData/do-portal/loginData.json";
import { logTestStep } from "../utils/testStepLog";

export const doPortalAuthFile = path.join(
  process.cwd(),
  "playwright",
  ".auth",
  "do-portal.json",
);

export async function loginDoPortalAndSaveStorage(page: Page): Promise<void> {
  fs.mkdirSync(path.dirname(doPortalAuthFile), { recursive: true });
  const loginPage = new DOLoginPage(page);
  await loginPage.navigate(DO_BASE_URL());
  await loginPage.loginWithTestData(doLoginData.validUsers[0]);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await page.waitForLoadState("domcontentloaded");
  logTestStep(`Saving DO portal storage state to ${doPortalAuthFile}`);
  await page.context().storageState({ path: doPortalAuthFile });
}

/** Creates auth storage when missing. No-op when the file already exists. */
export async function ensureDoPortalAuthStorage(): Promise<void> {
  if (fs.existsSync(doPortalAuthFile)) return;

  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"],
  });
  try {
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();
    await loginDoPortalAndSaveStorage(page);
  } finally {
    await browser.close();
  }
}
