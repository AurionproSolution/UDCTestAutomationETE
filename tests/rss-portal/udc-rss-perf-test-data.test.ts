import { expect, test, type Page } from "@playwright/test";

// Test case parameters — set RSS_PERF_START_USER_ID / RSS_PERF_END_USER_ID to override
const startUserId = Number(process.env.RSS_PERF_START_USER_ID) || 2494;
const endUserId = Number(process.env.RSS_PERF_END_USER_ID) || 3616;

const portalPassword = "Passw0rd1";
const loginPassword = "(MIGB)APudcAF@2211";
const baseUserEditUrl =
  "https://udc-test.fiscloudservices.com/MIGBEnterprise/Admin/Setup/UsersAndTeams/Edit/";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Display string for Add party / grid — avoid `Rss Rss ...` when combo already includes `Rss `. */
function partyDisplayForSearch(raw: string): string {
  const t = raw.trim();
  if (/^Rss\s+/i.test(t)) return t;
  return `Rss ${t}`;
}

/** Edit form Password — same pattern as UDC DO perf (readonly Kendo field). */
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

test("UDC RSS perf test data setup", async ({ page }) => {
  test.setTimeout(24 * 60 * 60 * 1000);

  const loginUrl =
    "https://login4.fisglobal.com/idp/UDC/?ClientID=MIGB_Enterprise";

  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });

  const cookieAccept = page.getByRole("button", { name: "Accept" });
  if (await cookieAccept.isVisible().catch(() => false)) {
    await cookieAccept.click();
  }

  await page.getByRole("searchbox", { name: "User ID / Alias" }).waitFor();
  await page.getByRole("searchbox", { name: "User ID / Alias" }).click();
  await page
    .getByRole("searchbox", { name: "User ID / Alias" })
    .fill("deepak.paramanick");
  await page.getByRole("checkbox", { name: "Remember my User ID" }).check();
  await page.getByRole("button", { name: "Proceed" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill(loginPassword);
  await page
    .locator("div")
    .filter({
      hasText:
        /^Yes, this is my computer or mobile device that I use regularly\.$/,
    })
    .click();
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForLoadState("domcontentloaded").catch(() => {});

  let workingPage: Page = page;
  if (workingPage.isClosed()) {
    const open = page.context().pages().find((p) => !p.isClosed());
    if (!open) {
      throw new Error("Login closed the page and no active page was found");
    }
    workingPage = open;
  }

  await workingPage.waitForURL("**/Admin/**", { timeout: 120_000 }).catch(
    () => {},
  );

  const postLoginPassword = workingPage.getByRole("textbox", {
    name: "Password",
  });
  if (await postLoginPassword.isVisible().catch(() => false)) {
    await fillPortalPassword(workingPage, portalPassword);
  }

  for (let userId = startUserId; userId <= endUserId; userId++) {
    console.log(`[RSS Perf] Processing userId ${userId} of ${endUserId}`);

    if (workingPage.isClosed()) {
      const open = page.context().pages().find((p) => !p.isClosed());
      if (!open) {
        throw new Error("Browser closed with no active page");
      }
      workingPage = open;
    }

    const userEditUrl = `${baseUserEditUrl}${userId}`;
    await workingPage.goto(userEditUrl, { waitUntil: "domcontentloaded" });
    await workingPage.waitForURL(`**/Edit/${userId}`, { timeout: 120_000 });
    expect(workingPage.url()).toContain(`/Edit/${userId}`);

    await fillPortalPassword(workingPage, portalPassword);

    const defaultOuCombo = workingPage.getByRole("combobox", {
      name: "Default operating unit",
    });
    await defaultOuCombo.waitFor({ state: "visible", timeout: 120_000 });
    await defaultOuCombo.click();
    await defaultOuCombo.fill("mv");
    await workingPage.getByRole("option", { name: "MV Dealer" }).click();

    await expect(defaultOuCombo).toBeVisible();

    await workingPage.waitForTimeout(2000);

    const partyCombo = workingPage.getByRole("combobox", { name: "Party" });
    const partyName = await partyCombo.inputValue();
    console.log(
      `[RSS Perf] User ${userId}: Extracted Party name = ${partyName}`,
    );

    await workingPage.getByRole("button", { name: "Add party" }).click();

    const partySearchValue = partyDisplayForSearch(partyName);
    await workingPage.locator("#PartyId_input").fill(partySearchValue);

    const escaped = escapeRegExp(partySearchValue);
    await workingPage
      .getByRole("option", { name: new RegExp(`^${escaped}-`) })
      .first()
      .click({ timeout: 120_000 });
    await workingPage.getByRole("button", { name: "OK" }).click();

    const gridCell = workingPage.getByRole("gridcell", {
      name: partySearchValue,
    });
    await gridCell.click();

    await expect(
      workingPage
        .getByLabel("Customer Visibility")
        .getByText(partySearchValue),
    ).toBeVisible();

    await workingPage
      .getByRole("button", { name: "Save", exact: true })
      .scrollIntoViewIfNeeded();
    await workingPage
      .getByRole("button", { name: "Save", exact: true })
      .click({ timeout: 120_000 });

    await expect(defaultOuCombo).toBeVisible();
    await expect(
      workingPage
        .getByLabel("Customer Visibility")
        .getByText(partySearchValue),
    ).toBeVisible();

    console.log(`[RSS Perf] Completed userId ${userId}`);
  }

  console.log(
    `[RSS Perf] All users processed from ${startUserId} to ${endUserId}`,
  );
});
