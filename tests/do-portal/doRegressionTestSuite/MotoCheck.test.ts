/**
 * DO Portal — Motochek regression (UDP-T4161–UDP-T4187).
 * Scenario source: MotoCheck Test Cases.xlsx (Zephyr / Regression 25.0).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOAssetDetailsPage, DODashboardPage } from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";

const CSA_SQ_PRODUCT = "CSA-C-Assigned";
const CSA_SQ_PROGRAM = "Webform - CSA Personal - MV Dealer";
const TLC_DEALER = "Armstrong Prestige Wellington";
const AFV_PRODUCT = "AFV-B-Assigned";
const MOTOCHEK_REGO = "BAGGED";
const MOTOCHEK_VIN = "1HGCM82633A004352";
/** Rego/VIN known absent from Motochek on QAT (override via env). */
const MOTOCHEK_NOT_FOUND_REGO = process.env.MOTOCHEK_NOT_FOUND_REGO?.trim() || "ZZNOTINDB";
const MOTOCHEK_NOT_FOUND_VIN = process.env.MOTOCHEK_NOT_FOUND_VIN?.trim() || "1GNDT13W5RK999999";

function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

async function openStandardQuoteFromDashboard(page: Page): Promise<{
  dashboardPage: DODashboardPage;
  assetDetailsPage: DOAssetDetailsPage;
}> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectCSAproduct();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.waitForAssetDetailsStepReady();
  return { dashboardPage, assetDetailsPage };
}

async function openAfVStandardQuoteFromDashboard(page: Page): Promise<DOAssetDetailsPage> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectAssuredFutureValueProduct();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.waitForAssetDetailsStepReady();
  return assetDetailsPage;
}

async function waitForProductProgramSpinnerThenAssetTypePopulated(
  page: Page,
  timeoutMs = 120_000,
): Promise<void> {
  const loaders = page.locator(
    ".app-loader-overlay, .p-progress-spinner, .p-progressspinner, .p-blockui, [class*='p-progress']",
  );
  await loaders.first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  await expect
    .poll(
      async () => {
        const count = await loaders.count();
        for (let i = 0; i < count; i++) {
          if (await loaders.nth(i).isVisible().catch(() => false)) return false;
        }
        return true;
      },
      { timeout: timeoutMs },
    )
    .toBe(true);
  await page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(() => {});
}

async function selectCsaProductAndProgram(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  program = CSA_SQ_PROGRAM,
): Promise<void> {
  await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(program);
  await waitForProductProgramSpinnerThenAssetTypePopulated(page);
}

async function clickSearchAndAddAsset(page: Page): Promise<void> {
  const root = standardQuoteRoot(page);
  const trigger = root
    .getByRole("link", { name: /Search\s*&\s*Add\s+Asset/i })
    .or(root.getByRole("button", { name: /Search\s*&\s*Add\s+Asset/i }))
    .or(root.locator("a, button, [role='button']").filter({ hasText: /Search\s*&\s*Add\s+Asset/i }))
    .first();
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toBeVisible({ timeout: 30_000 });
  await trigger.click({ timeout: 15_000 });
  await page.getByRole("dialog").last().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
}

async function clickSearchAndAddAssetFromInsuranceSummary(page: Page): Promise<void> {
  const summaryDlg = page
    .getByRole("dialog")
    .filter({ hasText: /Asset/i })
    .filter({ hasText: /Insurance/i })
    .filter({ hasText: /Summary/i })
    .last();
  await summaryDlg.waitFor({ state: "visible", timeout: 45_000 });
  const trigger = summaryDlg
    .getByRole("link", { name: /Search\s*&\s*Add\s+Asset/i })
    .or(summaryDlg.getByRole("button", { name: /Search\s*&\s*Add\s+Asset/i }))
    .or(summaryDlg.locator("a, button, [role='button']").filter({ hasText: /Search\s*&\s*Add\s+Asset/i }))
    .first();
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await trigger.click({ timeout: 15_000 });
  const searchAssetDlg = page.getByRole("dialog", { name: /Search Asset/i });
  await searchAssetDlg.waitFor({ state: "visible", timeout: 30_000 });
}

async function searchAddAssetDialog(page: Page): Promise<Locator> {
  const dlg = page
    .getByRole("dialog")
    .filter({ hasText: /Search|Add Asset|Motochek|Dealer Inventory/i })
    .last();
  await dlg.waitFor({ state: "visible", timeout: 30_000 });
  return dlg;
}

async function physicalSearchAssetDialog(page: Page): Promise<Locator> {
  const dlg = page.getByRole("dialog", { name: /Search Asset/i });
  await dlg.waitFor({ state: "visible", timeout: 30_000 });
  return dlg;
}

async function tradeInSearchAssetDialog(page: Page): Promise<Locator> {
  const dlg = page
    .getByRole("dialog")
    .filter({ hasText: /Search Trade-?\s*in\s*Asset/i })
    .last();
  await dlg.waitFor({ state: "visible", timeout: 30_000 });
  return dlg;
}

async function openPhysicalSearchAssetDialog(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<Locator> {
  const root = standardQuoteRoot(page);
  const onQuoteStep = root
    .getByRole("link", { name: /Search\s*&\s*Add\s+Asset/i })
    .or(root.getByRole("button", { name: /Search\s*&\s*Add\s+Asset/i }))
    .or(root.locator("a, button, [role='button']").filter({ hasText: /Search\s*&\s*Add\s+Asset/i }))
    .first();

  if (await onQuoteStep.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await onQuoteStep.click({ timeout: 15_000 });
  } else {
    await assetDetailsPage.openAssetInsuranceTradeInSummary();
    await clickSearchAndAddAssetFromInsuranceSummary(page);
  }
  return physicalSearchAssetDialog(page);
}

async function ensureMotochekSelected(dlg: Locator): Promise<void> {
  const radio = dlg.getByRole("radio", { name: /Motocheck|Motochek/i }).first();
  if (await radio.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await radio.check({ force: true });
  }
}

function enterNumberInput(dlg: Locator): Locator {
  return dlg
    .getByText(/Enter Number/i)
    .first()
    .locator("xpath=following::input[@id='text' and contains(@class,'p-inputtext')][1]")
    .or(dlg.locator("input#text.p-inputtext.p-component").first())
    .or(dlg.locator("input#text[type='text']").first())
    .first();
}

async function selectSearchBy(page: Page, dlg: Locator, option: RegExp): Promise<void> {
  const combos = dlg.getByRole("combobox");
  const comboCount = await combos.count();
  for (let i = 0; i < comboCount; i++) {
    const combo = combos.nth(i);
    if (!(await combo.isVisible({ timeout: 1_000 }).catch(() => false))) continue;
    const label = ((await combo.textContent()) ?? "").replace(/\s+/g, " ").trim();
    if (option.test(label)) return;
  }

  const searchByCombo = dlg
    .getByRole("combobox", { name: /Search [Bb]y|Rego Number|VIN Number/i })
    .or(dlg.locator("p-dropdown").filter({ hasText: /Search [Bb]y/i }))
    .or(dlg.getByRole("combobox").first())
    .first();
  if (!(await searchByCombo.isVisible({ timeout: 10_000 }).catch(() => false))) {
    return;
  }

  await searchByCombo.click({ timeout: 15_000 });
  await page.getByRole("option", { name: option }).first().click({ timeout: 10_000 });
  await page.keyboard.press("Escape").catch(() => {});
}

async function clickSearchOnDialog(dlg: Locator): Promise<void> {
  await dlg.getByRole("button", { name: /^Search$/i }).click({ timeout: 15_000 });
}

async function expectMotochekSuccess(dlg: Locator): Promise<void> {
  await expect
    .poll(
      async () => {
        if (!(await dlg.isVisible().catch(() => false))) return false;
        const body = ((await dlg.innerText()) ?? "").replace(/\u00a0/g, " ");
        if (
          /Motocheck Successfully|Motochek Successfully|Successfully Executed|Successfully Completed|Executed Successfully|Search Completed/i.test(
            body,
          )
        ) {
          return true;
        }
        return /Make\s*[:\n]?\s*\S+/i.test(body) && /Model\s*[:\n]?\s*\S+/i.test(body);
      },
      { timeout: 90_000, intervals: [500, 1000, 2000] },
    )
    .toBeTruthy();
}

async function expectMotochekVehicleNotFound(dlg: Locator): Promise<void> {
  const notFoundMsg = dlg
    .getByText(
      /No matching vehicle record found|vehicle\s+not\s+found|not\s+found\s+in\s+motochek|unable\s+to\s+find/i,
    )
    .first();
  await expect(notFoundMsg).toBeVisible({ timeout: 90_000 });
  await expect
    .soft(dlg.getByText(/Motocheck Successfully|Motochek Successfully|Successfully Executed/i).first())
    .toBeHidden({ timeout: 5_000 });
}

async function expectMotochekCannotProceed(dlg: Locator): Promise<void> {
  const body = ((await dlg.innerText()) ?? "").replace(/\u00a0/g, " ");
  const hasPopulatedVehicle =
    /Make\s*[:\n]?\s*\S+/i.test(body) &&
    /Model\s*[:\n]?\s*\S+/i.test(body) &&
    !/Make\s*[:\n]?\s*$/i.test(body);
  expect(hasPopulatedVehicle).toBeFalsy();

  const continueBtn = dlg
    .getByRole("button", { name: /^Continue$/i })
    .or(dlg.locator("button, a").filter({ hasText: /^Continue$/i }))
    .first();
  if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(continueBtn).toBeDisabled();
  }
}

function motochekResetButton(dlg: Locator): Locator {
  return dlg
    .getByRole("button", { name: /^Reset$/i })
    .or(dlg.locator("button, a").filter({ hasText: /^Reset$/i }))
    .first();
}

async function expectMotochekResultFieldsPopulated(dlg: Locator): Promise<void> {
  const body = ((await dlg.innerText()) ?? "").replace(/\u00a0/g, " ");
  const mustHaveValueAfterLabel: RegExp[] = [
    /Make\s*[:\n]?\s*\S+/i,
    /Model\s*[:\n]?\s*\S+/i,
    /Year\s*[:\n]?\s*\d{4}/,
    /VIN\s*[:\n]?\s*\S+/i,
  ];
  for (const pattern of mustHaveValueAfterLabel) {
    expect.soft(pattern.test(body)).toBeTruthy();
  }
}

/** QAT: **Add Asset** after Motochek success; Zephyr: **Continue**. */
function motochekProceedToAddAssetButton(dlg: Locator): Locator {
  return dlg
    .getByRole("button", { name: /^Continue$/i })
    .or(dlg.locator("button, a").filter({ hasText: /^Continue$/i }))
    .or(dlg.getByRole("button", { name: /^Add Asset$/i }))
    .or(dlg.locator("button, a").filter({ hasText: /^\s*Add Asset\s*$/i }))
    .first();
}

async function clickMotochekProceedToAddAsset(dlg: Locator): Promise<void> {
  const btn = motochekProceedToAddAssetButton(dlg);
  await expect(btn).toBeEnabled({ timeout: 30_000 });
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ timeout: 15_000 });
}

async function expectAddAssetWizardFromMotochek(addAssetPage: DOAddAssetPage): Promise<void> {
  await addAssetPage.makeInputField.first().waitFor({ state: "visible", timeout: 60_000 });
  await expect(addAssetPage.makeInputField.first()).not.toHaveValue("", { timeout: 20_000 });
  await expect(addAssetPage.modelInputField.first()).not.toHaveValue("", { timeout: 20_000 });
  await expect(addAssetPage.yearInputField.first()).toHaveValue(/\d{4}/, { timeout: 15_000 });
}

async function expectAddAssetFieldsEditable(addAssetPage: DOAddAssetPage): Promise<void> {
  await expect(addAssetPage.makeInputField.first()).toBeEditable();
  await expect(addAssetPage.modelInputField.first()).toBeEditable();
  await expect(addAssetPage.variantInputField.first()).toBeEditable();
  await expect(addAssetPage.colourInputField.first()).toBeEditable();
  await expect(addAssetPage.odometerInputField.first()).toBeEditable();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function expectSummaryListsPhysicalAssetWithDetails(
  summaryDlg: Locator,
  opts: {
    make: string;
    model: string;
    variant?: string;
    year?: string;
    regoOrVin?: string;
    valuePattern?: RegExp;
  },
): Promise<void> {
  await expect(summaryDlg).toBeVisible({ timeout: 45_000 });
  await expect(summaryDlg).toContainText(new RegExp(escapeRegex(opts.make), "i"));
  await expect(summaryDlg).toContainText(new RegExp(escapeRegex(opts.model), "i"));
  if (opts.variant) {
    await expect(summaryDlg).toContainText(new RegExp(escapeRegex(opts.variant), "i"));
  }
  if (opts.year) {
    await expect(summaryDlg).toContainText(new RegExp(escapeRegex(opts.year)));
  }
  // Rego/VIN column may render "-" on some builds — assert header; value when present.
  await expect(summaryDlg.getByText(/Rego|VIN/i).first()).toBeVisible({ timeout: 15_000 });
  if (opts.regoOrVin) {
    const regoVinVisible = await summaryDlg
      .getByText(new RegExp(escapeRegex(opts.regoOrVin), "i"))
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect.soft(regoVinVisible).toBeTruthy();
  }
  await expect(summaryDlg.getByText(opts.valuePattern ?? /\$[\d,]+\.\d{2}/).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(summaryDlg.getByText(/Insurer/i).first()).toBeVisible({ timeout: 15_000 });
}

async function expectInvalidVinValidation(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const dialogs = page.getByRole("dialog");
        const n = await dialogs.count();
        const parts: string[] = [];
        for (let i = 0; i < n; i++) {
          if (await dialogs.nth(i).isVisible().catch(() => false)) {
            parts.push((await dialogs.nth(i).innerText()) ?? "");
          }
        }
        const blob = parts.join("\n");
        return (
          /Enter Number must be at least 17 characters/i.test(blob) ||
          /Invalid VIN Entered/i.test(blob) ||
          /valid VIN should have 17 alphanumeric characters/i.test(blob) ||
          /VIN must be 17 characters/i.test(blob) ||
          /at least 17 character/i.test(blob)
        );
      },
      { timeout: 35_000, intervals: [200, 400, 800] },
    )
    .toBeTruthy();
}

async function closePhysicalSearchAssetDialog(page: Page): Promise<void> {
  const dlg = await physicalSearchAssetDialog(page);
  const closeBtn = dlg
    .locator("button.p-dialog-header-close")
    .or(dlg.getByRole("button", { name: /^close$/i }))
    .first();
  await closeBtn.click({ timeout: 10_000 });
  await dlg.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
}

/** Search Asset has no footer Cancel on QAT — header **Close** abandons Motochek search. */
async function clickSearchAssetCancelOrClose(dlg: Locator): Promise<void> {
  const cancelBtn = dlg
    .getByRole("button", { name: /^Cancel$/i })
    .or(dlg.locator("button, a").filter({ hasText: /^Cancel$/i }))
    .first();
  if (await cancelBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await cancelBtn.click({ timeout: 15_000 });
    return;
  }
  const closeBtn = dlg
    .locator("button.p-dialog-header-close")
    .or(dlg.getByRole("button", { name: /^Close$/i }))
    .first();
  await closeBtn.click({ timeout: 15_000 });
}

function assetInsuranceSummaryDialog(page: Page): Locator {
  return page
    .getByRole("dialog")
    .filter({ hasText: /Asset/i })
    .filter({ hasText: /Insurance/i })
    .filter({ hasText: /Summary/i })
    .last();
}

async function clickSearchAddAssetOnAfVQuoteWithoutFinancialAsset(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  const root = standardQuoteRoot(page);
  const mainTrigger = root
    .getByRole("link", { name: /Search\s*&\s*Add\s+Asset/i })
    .or(root.getByRole("button", { name: /Search\s*&\s*Add\s+Asset/i }))
    .first();
  if (await mainTrigger.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await mainTrigger.click({ timeout: 15_000 });
    return;
  }
  await assetDetailsPage.openAssetInsuranceTradeInSummary();
  const summaryDlg = assetInsuranceSummaryDialog(page);
  const trigger = summaryDlg
    .getByRole("link", { name: /Search\s*&\s*Add\s+Asset/i })
    .or(summaryDlg.getByRole("button", { name: /Search\s*&\s*Add\s+Asset/i }))
    .first();
  await trigger.click({ timeout: 15_000 });
}

test.describe("DO Portal — Motochek (UDP-T4161–UDP-T4187)", () => {
  test(
    "UDP-T4161 - Search Without Rego No. or VIN  Validation Error",
    { tag: ["@do", "@regression", "@UDP-T4161"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const dlg = await openPhysicalSearchAssetDialog(page, assetDetailsPage);
      await ensureMotochekSelected(dlg);
      await clickSearchOnDialog(dlg);

      const validation = page.getByText(
        /Rego No\.?\s*or\s*VIN|Enter Number.*required|must be provided|Rego.*VIN.*required/i,
      );
      await expect.soft(validation.first()).toBeVisible({ timeout: 25_000 });
      await closePhysicalSearchAssetDialog(page);
    },
  );

  test(
    "UDP-T4162 - Invalid VIN Format  Incorrect Length/Characters",
    { tag: ["@do", "@regression", "@UDP-T4162"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const dlg = await openPhysicalSearchAssetDialog(page, assetDetailsPage);
      await ensureMotochekSelected(dlg);
      await selectSearchBy(page, dlg, /VIN Number|^VIN$/i);

      const enterNumber = enterNumberInput(dlg);
      await enterNumber.waitFor({ state: "visible", timeout: 15_000 });
      await enterNumber.fill("hjjnbhbcwd");
      await enterNumber.press("Tab").catch(() => {});
      await clickSearchOnDialog(dlg);

      await expectInvalidVinValidation(page);
      await closePhysicalSearchAssetDialog(page);
    },
  );

  test(
    "UDP-T4163 - Valid Rego No. Entered  Search Proceeds",
    { tag: ["@do", "@regression", "@UDP-T4163"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const dlg = await openPhysicalSearchAssetDialog(page, assetDetailsPage);
      await ensureMotochekSelected(dlg);
      await selectSearchBy(page, dlg, /Rego Number/i);

      const enterNumber = enterNumberInput(dlg);
      await enterNumber.waitFor({ state: "visible", timeout: 15_000 });
      await enterNumber.fill(MOTOCHEK_REGO);
      await clickSearchOnDialog(dlg);

      await expectMotochekSuccess(dlg);
      await closePhysicalSearchAssetDialog(page);
    },
  );

  test(
    "UDP-T4164 - Valid VIN (17 Chars Alphanumeric). Search Proceeds",
    { tag: ["@do", "@regression", "@UDP-T4164"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const dlg = await openPhysicalSearchAssetDialog(page, assetDetailsPage);
      await ensureMotochekSelected(dlg);
      await selectSearchBy(page, dlg, /VIN Number|^VIN$/i);

      const enterNumber = enterNumberInput(dlg);
      await enterNumber.waitFor({ state: "visible", timeout: 15_000 });
      await enterNumber.fill(MOTOCHEK_VIN);
      await clickSearchOnDialog(dlg);

      await expectMotochekSuccess(dlg);
      await closePhysicalSearchAssetDialog(page);
    },
  );

  test(
    "UDP-T4165 - Non-AFV Program  Vehicle Found  Open Quote State  Success",
    { tag: ["@do", "@regression", "@UDP-T4165"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const dlg = await openPhysicalSearchAssetDialog(page, assetDetailsPage);
      await ensureMotochekSelected(dlg);
      await selectSearchBy(page, dlg, /Rego Number/i);

      const enterNumber = enterNumberInput(dlg);
      await enterNumber.fill(MOTOCHEK_REGO);
      await clickSearchOnDialog(dlg);

      await expectMotochekSuccess(dlg);
      await expectMotochekResultFieldsPopulated(dlg);
      await closePhysicalSearchAssetDialog(page);
    },
  );

  test(
    "UDP-T4166 - Non-AFV  Vehicle Not Found in Motochek",
    { tag: ["@do", "@regression", "@UDP-T4166"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const dlg = await openPhysicalSearchAssetDialog(page, assetDetailsPage);
      await ensureMotochekSelected(dlg);
      await selectSearchBy(page, dlg, /Rego Number/i);

      const enterNumber = enterNumberInput(dlg);
      await enterNumber.waitFor({ state: "visible", timeout: 15_000 });
      await enterNumber.fill(MOTOCHEK_NOT_FOUND_REGO);
      await clickSearchOnDialog(dlg);

      await expectMotochekVehicleNotFound(dlg);
      await expectMotochekCannotProceed(dlg);

      await motochekResetButton(dlg).click({ timeout: 15_000 });
      await expect(enterNumber).toHaveValue("", { timeout: 10_000 });
      await expect(dlg.getByText(/No matching vehicle record found/i)).toBeHidden({ timeout: 15_000 });

      // Zephyr: dealer searches again with a different Rego/VIN after Reset.
      await selectSearchBy(page, dlg, /Rego Number/i);
      await enterNumber.fill(MOTOCHEK_REGO);
      await clickSearchOnDialog(dlg);
      await expectMotochekSuccess(dlg);

      await closePhysicalSearchAssetDialog(page);
    },
  );

  test(
    "UDP-T4167 - Non-AFV  Motochek API Error During Search",
    { tag: ["@do", "@regression", "@UDP-T4167"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Motochek API fault injection or outage simulation not available in automated QAT.");
    },
  );

  test(
    "UDP-T4168 - Non-AFV  Continue After Success  Dealer Can Edit Asset Details",
    { tag: ["@do", "@regression", "@UDP-T4168"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const searchDlg = await openPhysicalSearchAssetDialog(page, assetDetailsPage);
      await ensureMotochekSelected(searchDlg);
      await selectSearchBy(page, searchDlg, /Rego Number/i);

      const enterNumber = enterNumberInput(searchDlg);
      await enterNumber.waitFor({ state: "visible", timeout: 15_000 });
      await enterNumber.fill(MOTOCHEK_REGO);
      await clickSearchOnDialog(searchDlg);

      await expectMotochekSuccess(searchDlg);
      await expectMotochekResultFieldsPopulated(searchDlg);

      await clickMotochekProceedToAddAsset(searchDlg);
      await expectAddAssetWizardFromMotochek(addAssetPage);
      await expectAddAssetFieldsEditable(addAssetPage);

      const make = (await addAssetPage.makeInputField.first().inputValue()).trim();
      const model = (await addAssetPage.modelInputField.first().inputValue()).trim();
      expect(make.length).toBeGreaterThan(0);
      expect(model.length).toBeGreaterThan(0);

      const editedColour = "Silver";
      const editedOdometer = "52000";
      await addAssetPage.enterColour(editedColour);
      await addAssetPage.enterOdometer(editedOdometer);

      const assetValue = (await addAssetPage.assetValueInputField.inputValue().catch(() => "")).trim();
      if (!assetValue || assetValue === "$0.00" || assetValue === "0.00") {
        await addAssetPage.enterAssetValue("$20,000");
      }

      if (await addAssetPage.conditionDropdown.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await addAssetPage.selectCondition("Used").catch(() => {});
      }
      await addAssetPage.chooseMotivePower("Petrol").catch(() => {});
      await addAssetPage.chooseCountryRegistered("New Zealand").catch(() => {});
      await addAssetPage.chooseAssetLocation("North Island").catch(() => {});

      await addAssetPage.clickSummitButton();
      await addAssetPage.clickCrossButton();

      const summaryDlg = assetInsuranceSummaryDialog(page);
      await expect(summaryDlg).toBeVisible({ timeout: 45_000 });
      await expect(summaryDlg).toContainText(new RegExp(make.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      await expect(summaryDlg).toContainText(new RegExp(model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      await expect(summaryDlg.getByText(/\$[\d,]+\.\d{2}/).first()).toBeVisible({ timeout: 20_000 });

      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T4169 - Non-AFV  Submit Saves Physical Asset to Contract",
    { tag: ["@do", "@regression", "@UDP-T4169"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const searchDlg = await openPhysicalSearchAssetDialog(page, assetDetailsPage);
      await ensureMotochekSelected(searchDlg);
      await selectSearchBy(page, searchDlg, /Rego Number/i);

      const enterNumber = enterNumberInput(searchDlg);
      await enterNumber.waitFor({ state: "visible", timeout: 15_000 });
      await enterNumber.fill(MOTOCHEK_REGO);
      await clickSearchOnDialog(searchDlg);

      await expectMotochekSuccess(searchDlg);
      await expectMotochekResultFieldsPopulated(searchDlg);
      await clickMotochekProceedToAddAsset(searchDlg);

      await expectAddAssetWizardFromMotochek(addAssetPage);

      const make = (await addAssetPage.makeInputField.first().inputValue()).trim();
      const model = (await addAssetPage.modelInputField.first().inputValue()).trim();
      const year = (await addAssetPage.yearInputField.first().inputValue()).trim();
      const variantBefore = (await addAssetPage.variantInputField.first().inputValue()).trim();
      const vinBefore = (await addAssetPage.vinInputField.first().inputValue().catch(() => "")).trim();
      const regoBefore = (await addAssetPage.regoNOInputField.first().inputValue().catch(() => "")).trim();

      const editedVariant = variantBefore || "Sport";
      const assetValue = "$20,000";
      await addAssetPage.enterVariant(editedVariant);
      await addAssetPage.enterAssetValue(assetValue);
      await addAssetPage.enterColour("Blue");
      await addAssetPage.enterOdometer("48000");

      if (await addAssetPage.conditionDropdown.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await addAssetPage.selectCondition("Used").catch(() => {});
      }
      await addAssetPage.chooseMotivePower("Petrol").catch(() => {});
      await addAssetPage.chooseCountryRegistered("New Zealand").catch(() => {});
      await addAssetPage.chooseAssetLocation("North Island").catch(() => {});

      await addAssetPage.clickSummitButton();
      await expect(page.getByRole("dialog", { name: /Add Asset/i })).toBeHidden({ timeout: 30_000 });
      await addAssetPage.clickCrossButton();

      // Submit returns to Asset Details; re-open summary to verify saved physical asset row.
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      const summaryDlg = assetInsuranceSummaryDialog(page);
      await expectSummaryListsPhysicalAssetWithDetails(summaryDlg, {
        make,
        model,
        variant: editedVariant,
        year: year || undefined,
        regoOrVin: regoBefore || vinBefore || MOTOCHEK_REGO,
        valuePattern: /\$20[, ]?000|20000/i,
      });

      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T4170 - AFV Program  Vehicle Found  Make/Model/Variant Match  Success",
    { tag: ["@do", "@regression", "@UDP-T4170"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "AFV program Motochek with matching Make/Model/Variant — requires AFV vehicle seed data.");
    },
  );

  test(
    "UDP-T4171 - AFV Program  Vehicle Found  Make/Model/Variant Mismatch  Error",
    { tag: ["@do", "@regression", "@UDP-T4171"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "AFV Motochek mismatch error — requires AFV quote with pre-selected vehicle and mismatched rego.");
    },
  );

  test(
    "UDP-T4172 - AFV Program Dealer Inventory Search Not Available",
    { tag: ["@do", "@regression", "@UDP-T4172"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "AFV Search Asset dialog — assert Dealer Inventory option disabled/absent.");
    },
  );

  test(
    "UDP-T4173 - AFV Program  Asset Fields Read-Only After Motochek Success",
    { tag: ["@do", "@regression", "@UDP-T4173"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "AFV post-Motochek read-only asset fields — requires AFV flow completion.");
    },
  );

  test(
    "UDP-T4174 - Non-AFV  Vehicle Change After Contract Submission  Valid Year",
    { tag: ["@do", "@regression", "@UDP-T4174"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Requires submitted contract quote — re-search Motochek with valid year change.");
    },
  );

  test(
    "UDP-T4175 - Non-AFV  Vehicle Change After Contract Submission  Invalid Year (Older)",
    { tag: ["@do", "@regression", "@UDP-T4175"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Requires submitted contract quote — assert year validation on Motochek re-search.");
    },
  );

  test(
    "UDP-T4176 - Reset Button  Clears Rego/VIN Field",
    { tag: ["@do", "@regression", "@UDP-T4176"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const dlg = await openPhysicalSearchAssetDialog(page, assetDetailsPage);
      await ensureMotochekSelected(dlg);

      const enterNumber = enterNumberInput(dlg);
      await enterNumber.fill(MOTOCHEK_REGO);
      await expect.soft(enterNumber).toHaveValue(MOTOCHEK_REGO);

      const resetBtn = dlg
        .getByRole("button", { name: /^Reset$/i })
        .or(dlg.locator("button, a").filter({ hasText: /^Reset$/i }))
        .first();
      await resetBtn.click({ timeout: 15_000 });

      await expect.soft(enterNumber).toHaveValue("", { timeout: 10_000 });
      await closePhysicalSearchAssetDialog(page);
    },
  );

  test(
    "UDP-T4177 - Close Button  Exits Search Window",
    { tag: ["@do", "@regression", "@UDP-T4177"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const dlg = await openPhysicalSearchAssetDialog(page, assetDetailsPage);
      await ensureMotochekSelected(dlg);

      const closeBtn = dlg
        .locator("button.p-dialog-header-close")
        .or(dlg.getByRole("button", { name: /^close$/i }))
        .first();
      await closeBtn.click({ timeout: 10_000 });
      await expect.soft(dlg).toBeHidden({ timeout: 15_000 });
    },
  );

  test(
    "UDP-T4178 - Cancel Button  Returns to Asset Details Screen",
    { tag: ["@do", "@regression", "@UDP-T4178"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const dlg = await openPhysicalSearchAssetDialog(page, assetDetailsPage);
      await ensureMotochekSelected(dlg);

      const enterNumber = enterNumberInput(dlg);
      await enterNumber.fill(MOTOCHEK_REGO);
      await expect.soft(enterNumber).toHaveValue(MOTOCHEK_REGO);

      await clickSearchAssetCancelOrClose(dlg);
      await expect.soft(dlg).toBeHidden({ timeout: 15_000 });

      const summaryDlg = assetInsuranceSummaryDialog(page);
      await expect.soft(summaryDlg).toBeVisible({ timeout: 15_000 });

      await clickSearchAndAddAssetFromInsuranceSummary(page);
      const dlgAgain = await physicalSearchAssetDialog(page);
      await ensureMotochekSelected(dlgAgain);
      await expect.soft(enterNumberInput(dlgAgain)).toHaveValue("");

      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
      await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    "UDP-T4179 - Unlimited Re-Searches Permitted (Subject to Workflow State)",
    { tag: ["@do", "@regression", "@UDP-T4179"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await assetDetailsPage.clickSearchAddTradeInAndExpectChooserOpened();

      const tradeDlg = await tradeInSearchAssetDialog(page);
      await ensureMotochekSelected(tradeDlg);
      await selectSearchBy(page, tradeDlg, /Rego Number/i);

      for (let i = 0; i < 2; i++) {
        const enterNumber = enterNumberInput(tradeDlg);
        await enterNumber.fill(MOTOCHEK_REGO);
        await clickSearchOnDialog(tradeDlg);
        await expectMotochekSuccess(tradeDlg);

        const resetBtn = tradeDlg
          .getByRole("button", { name: /^Reset$/i })
          .or(tradeDlg.locator("button, a").filter({ hasText: /^Reset$/i }))
          .first();
        if (await resetBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await resetBtn.click({ timeout: 10_000 });
        } else {
          await enterNumber.fill("");
        }

        await expect.soft(enterNumberInput(tradeDlg)).toHaveValue("", { timeout: 15_000 });
      }

      await assetDetailsPage.closeSearchTradeInAssetDialog();
      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T4180 - Search & Add Asset  Add Additional Physical Asset via Motochek",
    { tag: ["@do", "@regression", "@UDP-T4180"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Requires first physical asset on quote — Motochek search for second asset via summary.");
    },
  );

  test(
    "UDP-T4181 - Add Asset Not Applicable for AFV  Search & Add Asset Disabled",
    { tag: ["@do", "@regression", "@UDP-T4181"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const assetDetailsPage = await openAfVStandardQuoteFromDashboard(page);
      await assetDetailsPage.chooseProduct(AFV_PRODUCT);

      const root = standardQuoteRoot(page);
      await expect.soft(root.getByText(AFV_PRODUCT).first()).toBeVisible({ timeout: 30_000 });

      await clickSearchAddAssetOnAfVQuoteWithoutFinancialAsset(page, assetDetailsPage);

      await expect
        .soft(page.getByText(/Please select the financial asset to proceed/i).first())
        .toBeVisible({ timeout: 15_000 });

      await expect.soft(page.getByRole("dialog", { name: /Search Asset/i })).toBeHidden({ timeout: 5_000 });

      await page.keyboard.press("Escape").catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4182 - Copy Asset Functionality  Creates Duplicate for Editing",
    { tag: ["@do", "@regression", "@UDP-T4182"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      await assetDetailsPage.enterAsset("Car and Light Commercial /");
      await assetDetailsPage.selectCondition("Used");
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await assetDetailsPage.clickAssetSummaryEditButton();

      await addAssetPage.enterAssetValue("$10,0000");
      await addAssetPage.selectCondition("Used");
      await addAssetPage.selectYear("2025");
      await addAssetPage.enterMake("Toyota");
      await addAssetPage.enterModel("Hilux");
      await addAssetPage.enterVariant("Top");
      await addAssetPage.enterRegoNO("TG08BP5123");
      await addAssetPage.enterVIN(MOTOCHEK_VIN);
      await addAssetPage.enterOdometer("50000");
      await addAssetPage.enterColour("Black");
      await addAssetPage.enterSerialNO("0999944477");
      await addAssetPage.enterEngineNO("1133445588");
      await addAssetPage.enterCCRating("5");
      await addAssetPage.chooseMotivePower("Petrol");
      await addAssetPage.chooseCountryRegistered("New Zealand");
      await addAssetPage.chooseAssetLocation("North Island");
      await addAssetPage.clickSummitButton();
      await addAssetPage.clickCrossButton();

      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      const summaryDlg = page
        .getByRole("dialog")
        .filter({ hasText: /Asset/i })
        .filter({ hasText: /Insurance/i })
        .filter({ hasText: /Summary/i })
        .last();
      await expect.soft(summaryDlg).toBeVisible({ timeout: 30_000 });

      const copyIcon = summaryDlg.locator("i.fa-clone.cursor-pointer, i.fa-clone, i.fa-regular.fa-clone").first();
      await expect.soft(copyIcon).toBeVisible({ timeout: 20_000 });
      await copyIcon.click({ timeout: 15_000 });

      await addAssetPage.makeInputField.first().waitFor({ state: "visible", timeout: 45_000 });
      await expect.soft(addAssetPage.makeInputField.first()).toHaveValue(/Toyota/i, { timeout: 15_000 });
      await expect.soft(addAssetPage.modelInputField.first()).toHaveValue(/Hilux|Hillux/i);

      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4183 - Trade-In Asset Search Motochek Non-AFV Open Quote  Success",
    { tag: ["@do", "@regression", "@UDP-T4183"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await assetDetailsPage.clickSearchAddTradeInAndExpectChooserOpened();

      const tradeDlg = await tradeInSearchAssetDialog(page);
      await ensureMotochekSelected(tradeDlg);
      await selectSearchBy(page, tradeDlg, /Rego Number/i);

      const enterNumber = enterNumberInput(tradeDlg);
      await enterNumber.fill(MOTOCHEK_REGO);
      await clickSearchOnDialog(tradeDlg);

      await expectMotochekSuccess(tradeDlg);
      await expectMotochekResultFieldsPopulated(tradeDlg);

      await assetDetailsPage.closeSearchTradeInAssetDialog();
      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T4184 - Trade-In Vehicle Change After Submission Year Validation",
    { tag: ["@do", "@regression", "@UDP-T4184"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Requires submitted contract — trade-in Motochek re-search with invalid older year.");
    },
  );

  test(
    "UDP-T4185 - Trade-In  Dealer Inventory Not Available (Motochek Only for Trade-In)",
    { tag: ["@do", "@regression", "@UDP-T4185"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await assetDetailsPage.clickSearchAddTradeInAndExpectChooserOpened();

      const tradeDlg = await tradeInSearchAssetDialog(page);
      const motochekRadio = tradeDlg.getByRole("radio", { name: /Motocheck|Motochek/i }).first();
      await expect.soft(motochekRadio).toBeVisible({ timeout: 15_000 });

      const dealerInvRadio = tradeDlg.getByRole("radio", { name: /Dealer Inventory/i }).first();
      if (await dealerInvRadio.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect.soft(dealerInvRadio).toBeDisabled();
      }

      await assetDetailsPage.closeSearchTradeInAssetDialog();
      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T4186 - Default Screen State  Motochek Selected, Rego No. Default Search By",
    { tag: ["@do", "@regression", "@UDP-T4186"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const dlg = await openPhysicalSearchAssetDialog(page, assetDetailsPage);

      const motochekRadio = dlg.getByRole("radio", { name: /Motocheck|Motochek/i }).first();
      await expect.soft(motochekRadio).toBeChecked({ timeout: 10_000 });

      const combo = dlg.getByRole("combobox").first();
      if (await combo.isVisible({ timeout: 8_000 }).catch(() => false)) {
        const comboText = ((await combo.textContent()) ?? (await combo.inputValue()) ?? "").trim();
        expect.soft(/Rego/i.test(comboText)).toBeTruthy();
      }

      await closePhysicalSearchAssetDialog(page);
    },
  );

  test(
    "UDP-T4187 - First Physical Asset Auto-Created When Financial Asset Selected",
    { tag: ["@do", "@regression", "@UDP-T4187"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(
        true,
        "Assert auto-created first physical asset row when financial asset type selected — needs program-specific seed.",
      );
    },
  );
});
