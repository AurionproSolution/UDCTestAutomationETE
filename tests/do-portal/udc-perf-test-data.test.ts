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
const startUserId = 1603;
const endUserId = 4007;
const password = "Passw0rd1";

async function savePassword(page: Page) {
  const save = page.getByRole("button", { name: "Save", exact: true });
  const saveEnabled = await save.isEnabled().catch(() => false);
  console.log(`[UDC perf] Save button enabled before wait? ${saveEnabled}`);
  await save.scrollIntoViewIfNeeded();

  try {
    await expect(save).toBeEnabled({ timeout: 30_000 });
  } catch (error) {
    const fieldValue = await page
      .locator("#PasswordFld")
      .inputValue()
      .catch(() => "<no field>");
    console.log(
      `[UDC perf] Save button disabled after 30s. Password field: ${fieldValue}`,
    );
    throw error;
  }

  await save.click({ timeout: 120_000 });
  console.log("[UDC perf] Clicked Save button");

  const successMessage = page.getByText(
    /Saved|Success|Successfully|Update complete|Changes saved/i,
  );
  await successMessage
    .first()
    .waitFor({ timeout: 10_000 })
    .catch(() => {
      console.log("[UDC perf] No toast message appeared after save click");
    });
}

/** Some users show Password as readonly until focused/unlocked; ensure the field accepts input. */
async function fillPortalPassword(page: Page, value: string) {
  const pw = page.getByRole("textbox", { name: "Password" });
  const passwordField = page.locator("#PasswordFld");

  await pw.waitFor({ state: "visible", timeout: 20_000 });
  await pw.click({ clickCount: 2 });

  const readonly = await pw.getAttribute("readonly").catch(() => null);
  console.log(`[UDC perf] Password wrapper readonly attr: ${readonly}`);

  if (readonly !== null) {
    await passwordField.evaluate((el: HTMLInputElement) => {
      el.removeAttribute("readonly");
      el.removeAttribute("aria-readonly");
    });
  }

  const candidates = page.locator(
    '#PasswordFld, input[type="password"], input[name*="password" i], input[id*="Password" i]',
  );
  const candidateCount = await candidates.count();
  console.log(`[UDC perf] password input candidate count: ${candidateCount}`);

  for (let i = 0; i < candidateCount; i++) {
    const field = candidates.nth(i);
    const attr = await field.getAttribute("id").catch(() => "");
    const visible = await field.isVisible().catch(() => false);
    console.log(`    candidate[${i}] id=${attr} visible=${visible}`);
    await field.fill(value, { timeout: 120_000 }).catch(() => undefined);
    await field.evaluate((el: HTMLInputElement, newValue: string) => {
      el.value = newValue;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  }

  await pw.fill(value, { timeout: 20_000 });
  await pw.press("Tab");

  const visiblePwValue = await pw.inputValue().catch(() => "<no visible pw>");
  const hiddenPwValue = await passwordField
    .inputValue()
    .catch(() => "<no hidden field>");
  console.log(`[UDC perf] visible password value: ${visiblePwValue}`);
  console.log(`[UDC perf] hidden password value: ${hiddenPwValue}`);

  // if ((await passwordField.count()) > 0) {
  //   await expect(passwordField).toHaveValue(value, { timeout: 30_000 });
  // } else {
  //   await expect(pw).toHaveValue(value, { timeout: 30_000 });
  // }
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

  // Wait for post-login page navigation to complete+
  await page.waitForTimeout(2000);
  //await page.waitForURL("**/Admin/**").catch(() => {});

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
    await page.waitForTimeout(2000);
    await savePassword(page);
    await page.waitForTimeout(2000);
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
