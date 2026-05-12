import { expect, test, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/** On failure, set `startUserId` in this file to the value written here, then rerun. */
const resumeStartFile = path.join(__dirname, "udc-perf-resume-start.txt");

function writeResumeStartUserId(id: number) {
  try {
    fs.writeFileSync(resumeStartFile, `${id}\n`, "utf8");
    console.error(
      `[UDC perf] Next run: set startUserId = ${id} (saved to ${resumeStartFile})`,
    );
  } catch {
    // ignore disk errors
  }
}

const baseUserEditUrl =
  "https://udc-test.fiscloudservices.com/MIGBEnterprise/Admin/Setup/UsersAndTeams/Edit/";
// 1720 users inclusive: endUserId = startUserId + 1719. On failure at user N, set startUserId = N and rerun.
// Run 127336: failed at 2408 (Password textbox readonly / not editable). Rerun continues from here.
const startUserId = 2408;
const endUserId = 2416;
const password = "Passw0rd1";

async function savePassword(page: Page) {
  const save = page.getByRole("button", { name: "Save", exact: true });
  await save.scrollIntoViewIfNeeded();
  await save.click({ timeout: 120_000 });
}

/** Some users show Password as readonly until focused/unlocked; ensure the field accepts input. */
async function fillPortalPassword(page: Page, value: string) {
  const pw = page.getByRole("textbox", { name: "Password" });
  await pw.waitFor({ state: "visible" });
  await pw.dblclick();
  const readonly = await pw.getAttribute("readonly");
  if (readonly !== null) {
    await page.locator("#PasswordFld").evaluate((el: HTMLInputElement) => {
      el.removeAttribute("readonly");
      el.removeAttribute("aria-readonly");
    });
  }
  await pw.fill(value, { timeout: 120_000 });
}

test("UDC DO perf password seed", async ({ page }) => {
  test.setTimeout(24 * 60 * 60 * 1000); // long batch (prior run ~12h)
  // Login once with retry logic
  let loginAttempts = 0;
  let loginSuccess = false;
  while (loginAttempts < 2 && !loginSuccess) {
    try {
      await page.goto(
        "https://login4.fisglobal.com/idp/UDC/?ClientID=MIGB_Enterprise",
        { waitUntil: "domcontentloaded" },
      );
      // Wait for User ID / Alias searchbox to be visible
      await page.getByRole("searchbox", { name: "User ID / Alias" }).waitFor();
      loginSuccess = true;
    } catch (error) {
      loginAttempts++;
      if (loginAttempts < 2) {
        console.log(
          `Login page load failed, retrying... (attempt ${loginAttempts})`,
        );
      } else {
        throw error;
      }
    }
  }

  await page.getByRole("searchbox", { name: "User ID / Alias" }).click();
  await page
    .getByRole("searchbox", { name: "User ID / Alias" })
    .fill("deepak.paramanick");
  await page.getByRole("checkbox", { name: "Remember my User ID" }).check();
  await page.getByRole("button", { name: "Proceed" }).click();
  await page
    .getByRole("textbox", { name: "Password" })
    .fill("(MIGB)APudcAF@2211");
  await page
    .locator("div")
    .filter({
      hasText:
        /^Yes, this is my computer or mobile device that I use regularly\.$/,
    })
    .click();
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for post-login page navigation to complete
  await page.waitForURL("**/Admin/**").catch(() => {});

  // Navigate to first user ID after sign in with retry logic
  const firstUrl = `${baseUserEditUrl}${startUserId}`;
  let navAttempts = 0;
  let navSuccess = false;
  while (navAttempts < 2 && !navSuccess) {
    try {
      await page.goto(firstUrl, {
        waitUntil: "domcontentloaded",
      });
      // Wait for the Password field to be visible
      await page.getByRole("textbox", { name: "Password" }).waitFor();
      navSuccess = true;
    } catch (error) {
      navAttempts++;
      if (navAttempts < 2) {
        console.log(
          `Navigation to user ${startUserId} failed, retrying... (attempt ${navAttempts})`,
        );
      } else {
        throw error;
      }
    }
  }

  try {
    await page.waitForURL(`**/Edit/${startUserId}`);
    expect(page.url()).toContain(`/Edit/${startUserId}`);

    await fillPortalPassword(page, password);
    await savePassword(page);
    // Wait for save to complete
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    console.log(`[UDC perf] completed userId ${startUserId} of ${endUserId}`);
  } catch (error) {
    writeResumeStartUserId(startUserId);
    throw error;
  }

  // Loop through remaining user IDs and update password with retry logic
  for (let userId = startUserId + 1; userId <= endUserId; userId++) {
    try {
      console.log(`[UDC perf] processing userId ${userId} of ${endUserId}`);
      const url = `${baseUserEditUrl}${userId}`;
      let userNavAttempts = 0;
      let userNavSuccess = false;

      while (userNavAttempts < 2 && !userNavSuccess) {
        try {
          await page.goto(url, {
            waitUntil: "domcontentloaded",
          });
          // Wait for the Password field to be visible
          await page.getByRole("textbox", { name: "Password" }).waitFor();
          userNavSuccess = true;
        } catch (error) {
          userNavAttempts++;
          if (userNavAttempts < 2) {
            console.log(
              `Navigation to user ${userId} failed, retrying... (attempt ${userNavAttempts})`,
            );
          } else {
            console.warn(
              `Failed to navigate to user ${userId} after retries, skipping...`,
            );
            continue;
          }
        }
      }

      await page.waitForURL(`**/Edit/${userId}`).catch(() => {});
      expect(page.url()).toContain(`/Edit/${userId}`);

      await fillPortalPassword(page, password);
      await savePassword(page);
      // Wait for page load
      await page.waitForLoadState("domcontentloaded").catch(() => {});
    } catch (error) {
      writeResumeStartUserId(userId);
      throw error;
    }
  }
});
