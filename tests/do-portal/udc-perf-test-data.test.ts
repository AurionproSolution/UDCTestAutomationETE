import { expect, test } from "@playwright/test";

const baseUserEditUrl =
  "https://udc-test.fiscloudservices.com/MIGBEnterprise/Admin/Setup/UsersAndTeams/Edit/";
const startUserId = 697;
const endUserId = 797;
const password = "Passw0rd1";

test("UDC perf Test data", async ({ page }) => {
  // Login once
  await page.goto(
    "https://login4.fisglobal.com/idp/UDC/?ClientID=MIGB_Enterprise",
  );
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

  // Navigate to first user ID after sign in
  const firstUrl = `${baseUserEditUrl}${startUserId}`;
  await page.goto(firstUrl);
  await page.waitForURL(`**/Edit/${startUserId}`);
  expect(page.url()).toContain(`/Edit/${startUserId}`);

  await page.getByRole("textbox", { name: "Password" }).dblclick();
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Save", exact: true }).click();

  // Loop through remaining user IDs and update password
  for (let userId = startUserId + 1; userId <= endUserId; userId++) {
    const url = `${baseUserEditUrl}${userId}`;

    await page.goto(url);
    await page.waitForURL(`**/Edit/${userId}`);
    expect(page.url()).toContain(`/Edit/${userId}`);

    await page.getByRole("textbox", { name: "Password" }).dblclick();
    await page.getByRole("textbox", { name: "Password" }).fill(password);
    await page.getByRole("button", { name: "Save", exact: true }).click();
  }
});
