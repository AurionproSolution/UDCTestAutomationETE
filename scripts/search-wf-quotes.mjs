import { chromium } from "@playwright/test";
import path from "path";

const authFile = path.join(process.cwd(), "playwright", ".auth", "do-portal.json");
const baseUrl = "https://udc-test.fiscloudservices.com/SITDOPortal/dealer";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: authFile });
const page = await ctx.newPage();
await page.goto(baseUrl);
await page.getByRole("combobox").first().click();
await page.getByRole("option", { name: "Armstrong Prestige Wellington" }).click();
await page.waitForTimeout(2000);
const search = page.locator('input[placeholder="Search Quote"]').first();
await search.waitFor({ state: "visible", timeout: 60_000 });

for (const q of ["SQ-WF", "WF-SUBMITTED", "Submitted"]) {
  await search.fill(q);
  const view = page.locator("app-quote-list").getByRole("button", { name: /^View$/i }).first();
  if (await view.isVisible().catch(() => false)) await view.click();
  await page.waitForTimeout(2500);
  const rows = await page.locator("tbody tr").allInnerTexts();
  console.log(`--- query: ${q} rows: ${rows.length}`);
  for (const [i, r] of rows.slice(0, 8).entries()) {
    console.log(`${i + 1}: ${r.replace(/\s+/g, " ").slice(0, 220)}`);
  }
}
await browser.close();
