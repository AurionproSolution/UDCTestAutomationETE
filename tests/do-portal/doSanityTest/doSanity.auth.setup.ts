/**
 * Persists DO Portal session for doSanityTest specs (see playwright.config.ts do-sanity projects).
 */

import * as fs from "fs";
import * as path from "path";
import { test as setup } from "@playwright/test";
import { DO_BASE_URL, DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOLoginPage } from "../../../pages";
import doLoginData from "../../../testData/do-portal/loginData.json";

const authFile = path.join(process.cwd(), "playwright", ".auth", "do-sanity.json");

setup("authenticate DO sanity", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  const loginPage = new DOLoginPage(page);
  await loginPage.navigate(DO_BASE_URL());
  await loginPage.loginWithTestData(doLoginData.validUsers[0]);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await page.waitForLoadState("domcontentloaded");
  await page.context().storageState({ path: authFile });
});
