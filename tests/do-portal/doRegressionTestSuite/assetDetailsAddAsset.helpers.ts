/**
 * Shared helpers for Add Asset editor regression (UDP-T4749–UDP-T4778).
 * Scenario source: Asset Details Test cases.xlsx — Add Asset / Asset Breakdown flows.
 */

import { expect } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOAssetDetailsPage, DODashboardPage } from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";

export const CSA_SQ_PRODUCT = "CSA-C-Assigned";
export const CSA_SQ_PROGRAM = "Webform - CSA Personal - MV Dealer";
export const CSA_SQ_ALT_PROGRAM = "CSA Personal - MV Dealer";
/** QAT dealer default for Armstrong Prestige Wellington (CSA-C). */
export const CSA_SQ_DEALER_PROGRAM = "MYUDC-C-CSA- Assigned MV";
export const CSA_SQ_DEALER_PROGRAM_ALT = "MYUDC-B-CSA-Assigned MV";
export const TL_SQ_PRODUCT = "TL-B-Assigned";
export const TL_SQ_PROGRAM =
  process.env.TL_SQ_PROGRAM?.trim() || "Term Loan Business - MV Dealer";
export const TLC_DEALER = "Armstrong Prestige Wellington";
export const VEHICLE_ASSET_TYPE = "Car and Light Commercial /";
export const MOTOCHEK_REGO = "BAGGED";

export function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

export function addAssetHost(page: Page): Locator {
  return page
    .locator("app-add-asset, app-asset-details-add-asset, app-standard-quote-add-asset")
    .filter({ visible: true })
    .first();
}

/** FIS IA may host Add Asset as `/asset/addAsset/edit` (full page) or inside `app-add-asset`. */
export async function isAddAssetEditorOpen(page: Page): Promise<boolean> {
  if (/\/asset\/addAsset/i.test(page.url())) {
    return true;
  }
  if (await addAssetHost(page).isVisible({ timeout: 500 }).catch(() => false)) {
    return true;
  }
  const addAssetPage = new DOAddAssetPage(page);
  return (
    (await addAssetPage.assetValueInputField.isVisible({ timeout: 500 }).catch(() => false)) ||
    (await addAssetPage.makeInputField.first().isVisible({ timeout: 500 }).catch(() => false)) ||
    (await page.getByRole("button", { name: /^Submit$/i }).filter({ visible: true }).count()) > 0
  );
}

export async function expectAddAssetEditorVisible(page: Page): Promise<void> {
  await expect
    .poll(async () => isAddAssetEditorOpen(page), {
      timeout: 60_000,
      intervals: [300, 500, 1_000],
    })
    .toBeTruthy();
}

export async function ensureStandardQuoteShellVisible(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  const addAssetPage = new DOAddAssetPage(page);
  await addAssetPage.returnToStandardQuoteFromAddAssetRouteIfNeeded().catch(() => {});
  await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
  await page.keyboard.press("Escape").catch(() => {});
  await expect
    .poll(
      async () => {
        if (/\/standard-quote|\/dealer\/standard-quote/i.test(page.url())) {
          return true;
        }
        return standardQuoteRoot(page).isVisible({ timeout: 500 }).catch(() => false);
      },
      { timeout: 90_000, intervals: [500, 1_000, 1_500] },
    )
    .toBeTruthy();
  await assetDetailsPage.waitForQuoteLoadersToFinish().catch(() => {});
}

export async function closeAddAssetEditorAndReturnToQuote(
  page: Page,
  addAssetPage: DOAddAssetPage,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await addAssetPage.clickCrossButton().catch(() => {});
  await addAssetPage.returnToStandardQuoteFromAddAssetRouteIfNeeded().catch(() => {});
  await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
  await page.keyboard.press("Escape").catch(() => {});
  await ensureStandardQuoteShellVisible(page, assetDetailsPage);
}

export function addAssetAssetTypeInput(page: Page): Locator {
  const host = addAssetHost(page);
  return page
    .locator(".p-float-label, [class*='float-label']")
    .filter({ hasText: /^Asset Type\s*\*?\s*$/i })
    .locator("input, textarea")
    .first()
    .or(
      page
        .locator("input, textarea")
        .filter({
          has: page.locator("xpath=following-sibling::*[contains(normalize-space(.),'Asset Type')]"),
        })
        .first(),
    )
    .or(host.locator('input[name="assetTypeDD"]'))
    .or(host.getByRole("searchbox").first())
    .or(
      host
        .locator("xpath=.//*[contains(normalize-space(.),'Asset Type')]/following::input[1]")
        .first(),
    )
    .first();
}

export function addAssetAssetTypeSelectLink(page: Page): Locator {
  const host = addAssetHost(page);
  return host
    .getByRole("link", { name: /^Select$/i })
    .or(host.getByRole("button", { name: /^Select$/i }))
    .or(
      host.locator(
        "xpath=.//*[contains(normalize-space(.),'Asset Type')]/ancestor::*[contains(@class,'row') or contains(@class,'grid')][1]//*[self::a or self::button][contains(.,'Select')]",
      ),
    )
    .first();
}

export async function waitForQuoteLoadersOnly(page: Page, timeoutMs = 120_000): Promise<void> {
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

export async function waitForProductProgramSpinnerThenAssetTypePopulated(
  page: Page,
  timeoutMs = 120_000,
): Promise<void> {
  await waitForQuoteLoadersOnly(page, timeoutMs);
  await expect
    .poll(async () => (await readQuoteAssetType(page)).trim().length > 0, {
      timeout: timeoutMs,
      intervals: [300, 500, 800],
    })
    .toBeTruthy();
}

function isCsaProgramLabel(programLabel: string): boolean {
  const t = programLabel.trim();
  if (!t) return false;
  return /CSA/i.test(t) || /MYUDC/i.test(t) || /MV\s*Dealer/i.test(t);
}

function isCsaProductLabel(productLabel: string): boolean {
  return /CSA-C-Assigned/i.test(productLabel.trim());
}

function isTlProgramLabel(programLabel: string): boolean {
  const t = programLabel.trim();
  if (!t) return false;
  return /Term Loan|TL/i.test(t) || /MYUDC/i.test(t) || /MV\s*Dealer/i.test(t);
}

function isTlProductLabel(productLabel: string): boolean {
  return /TL-B-Assigned|TL-C-Assigned/i.test(productLabel.trim());
}

/** Read **Program** from the quote shell when POM `readSelectedProgramLabel()` is still empty. */
async function readQuoteProgramLabelFromShell(page: Page): Promise<string> {
  const root = standardQuoteRoot(page);
  const programCaption = root.locator("label, span").filter({ hasText: /^Program\s*\*?\s*$/i }).first();
  if (await programCaption.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const combobox = programCaption
      .locator(
        "xpath=ancestor::div[contains(@class,'col-') or contains(@class,'grid') or contains(@class,'p-field')][1]//span[@role='combobox']",
      )
      .or(programCaption.locator("xpath=following::span[@role='combobox'][1]"))
      .first();
    if (await combobox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const aria = ((await combobox.getAttribute("aria-label")) ?? "").trim();
      if (aria.length > 0 && !/^select\b/i.test(aria)) {
        return aria;
      }
      const text = ((await combobox.textContent()) ?? "").replace(/\s+/g, " ").trim();
      if (text.length > 0 && !/^select\b/i.test(text)) {
        return text;
      }
    }
  }

  const combos = root.getByRole("combobox");
  const count = await combos.count();
  for (let i = 0; i < count; i++) {
    const combo = combos.nth(i);
    const name = (
      (await combo.getAttribute("aria-label")) ??
      (await combo.textContent()) ??
      ""
    )
      .replace(/\s+/g, " ")
      .trim();
    if (!name || /^select\b/i.test(name)) continue;
    if (/Salesperson|dropdown trigger|Armstrong Prestige/i.test(name)) continue;
    if (isCsaProductLabel(name) || isTlProductLabel(name)) continue;
    if (/CSA|MYUDC|MV\s*Dealer|Term Loan|AFV|Finance Lease/i.test(name)) {
      return name;
    }
  }
  return "";
}

async function readQuoteProductLabelFromShell(page: Page): Promise<string> {
  const root = standardQuoteRoot(page);
  const productCaption = root.locator("label, span").filter({ hasText: /^Product\s*\*?\s*$/i }).first();
  if (await productCaption.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const combobox = productCaption
      .locator(
        "xpath=ancestor::div[contains(@class,'col-') or contains(@class,'grid') or contains(@class,'p-field')][1]//span[@role='combobox']",
      )
      .or(productCaption.locator("xpath=following::span[@role='combobox'][1]"))
      .first();
    if (await combobox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return (
        (await combobox.getAttribute("aria-label")) ??
        (await combobox.textContent()) ??
        ""
      )
        .replace(/\s+/g, " ")
        .trim();
    }
  }
  return "";
}

async function waitForQuoteProgramLabel(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  timeoutMs = 60_000,
): Promise<string> {
  let resolved = "";
  await expect
    .poll(
      async () => {
        resolved =
          (await assetDetailsPage.readSelectedProgramLabel().catch(() => "")).trim() ||
          (await readQuoteProgramLabelFromShell(page)).trim();
        return resolved.length > 0 ? resolved : null;
      },
      { timeout: timeoutMs, intervals: [300, 500, 1_000, 2_000] },
    )
    .not.toBeNull()
    .catch(() => {});
  return resolved;
}

async function waitForQuoteProductLabel(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  timeoutMs = 30_000,
): Promise<string> {
  let resolved = "";
  await expect
    .poll(
      async () => {
        resolved =
          (await assetDetailsPage.readSelectedProductLabel().catch(() => "")).trim() ||
          (await readQuoteProductLabelFromShell(page)).trim();
        return resolved.length > 0 ? resolved : null;
      },
      { timeout: timeoutMs, intervals: [300, 500, 1_000] },
    )
    .not.toBeNull()
    .catch(() => {});
  return resolved;
}

/**
 * Keep dealer-default CSA program when already valid (e.g. **MYUDC-C-CSA- Assigned MV** on QAT).
 * Only changes program when the quote has no usable CSA program yet.
 */
export async function ensureCsaProductAndProgram(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await assetDetailsPage.waitForQuoteLoadersToFinish().catch(() => {});

  const productLabel = await waitForQuoteProductLabel(page, assetDetailsPage);
  if (!isCsaProductLabel(productLabel)) {
    await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
    await assetDetailsPage.waitForQuoteLoadersToFinish().catch(() => {});
  }

  let programLabel = await waitForQuoteProgramLabel(page, assetDetailsPage);
  if (!isCsaProgramLabel(programLabel) || isCsaProductLabel(programLabel)) {
    const candidates = [
      process.env.CSA_SQ_PROGRAM?.trim(),
      CSA_SQ_DEALER_PROGRAM,
      CSA_SQ_DEALER_PROGRAM_ALT,
      CSA_SQ_PROGRAM,
      CSA_SQ_ALT_PROGRAM,
    ].filter((v, i, arr): v is string => Boolean(v?.trim()) && arr.indexOf(v) === i);

    for (const program of candidates) {
      try {
        await assetDetailsPage.chooseProgram(program);
        programLabel = await waitForQuoteProgramLabel(page, assetDetailsPage, 20_000);
        if (isCsaProgramLabel(programLabel)) {
          break;
        }
      } catch {
        // Try next program name for this dealer/env.
      }
    }

    if (!isCsaProgramLabel(programLabel)) {
      const options = await assetDetailsPage.listProgramDropdownOptions().catch(() => []);
      const csaOption = options.find((o) => isCsaProgramLabel(o));
      if (csaOption) {
        await assetDetailsPage.chooseProgram(csaOption);
        programLabel = csaOption;
      }
    }

    programLabel = (await waitForQuoteProgramLabel(page, assetDetailsPage, 15_000)) || programLabel;
    if (!isCsaProgramLabel(programLabel)) {
      throw new Error(
        `Could not select a CSA program. Current program: "${programLabel || "empty"}". ` +
          `Set CSA_SQ_PROGRAM env var for this dealer.`,
      );
    }
  }

  await waitForQuoteLoadersOnly(page);
  const assetType = (await readQuoteAssetType(page)).trim();
  if (assetType.length > 0) {
    await waitForProductProgramSpinnerThenAssetTypePopulated(page).catch(() => {});
  }
}

async function readQuoteAssetType(page: Page): Promise<string> {
  const input = standardQuoteRoot(page).locator('input[name="assetTypeDD"]').first();
  if (await input.isVisible({ timeout: 10_000 }).catch(() => false)) {
    return ((await input.inputValue()) || (await input.getAttribute("value")) || "").trim();
  }
  const root = standardQuoteRoot(page);
  const labelRow = root
    .locator("label, span")
    .filter({ hasText: /^Asset Type/i })
    .first();
  if (await labelRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const row = labelRow.locator("xpath=ancestor::div[contains(@class,'col-') or contains(@class,'grid')][1]");
    return ((await row.textContent()) ?? "").replace(/Asset Type\s*\*?/i, "").trim();
  }
  return "";
}

/** Ensure quote shell has a vehicle asset type so **Search & Add Asset** is not blocked by toast. */
export async function ensureQuoteVehicleAssetTypeSelected(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  const current = (await readQuoteAssetType(page)).trim();
  if (current.length > 0 && !/^(select|choose)$/i.test(current)) {
    return;
  }
  const selected = await selectAssetTypeOptionBySearch(
    page,
    assetDetailsPage,
    "Car",
    /Car and Light Commercial/i,
  );
  if (!selected) {
    await assetDetailsPage.enterAsset(VEHICLE_ASSET_TYPE);
  }
  await waitForQuoteLoadersOnly(page, 30_000).catch(() => {});
}

export async function readAddAssetAssetType(page: Page): Promise<string> {
  const isPlaceholder = (val: string): boolean =>
    !val.trim() || /^(select|choose|--|please\s+select)$/i.test(val.trim());

  const readLocatorValue = async (el: Locator): Promise<string> => {
    if (!(await el.isVisible({ timeout: 1_500 }).catch(() => false))) {
      return "";
    }
    const tag = await el.evaluate((n) => n.tagName.toLowerCase()).catch(() => "input");
    if (tag === "input" || tag === "textarea") {
      const inputVal = ((await el.inputValue().catch(() => "")) || "").trim();
      if (inputVal.length > 0 && !isPlaceholder(inputVal)) {
        return inputVal;
      }
    }
    const aria = ((await el.getAttribute("aria-label")) ?? "").trim();
    if (aria.length > 0 && !isPlaceholder(aria)) {
      return aria;
    }
    const text = ((await el.textContent()) ?? "").replace(/\s+/g, " ").trim();
    return isPlaceholder(text) ? "" : text;
  };

  const floatLabelInput = page
    .locator(".p-float-label, [class*='float-label']")
    .filter({ hasText: /^Asset Type\s*\*?\s*$/i })
    .locator("input, textarea")
    .first();
  const fromFloatLabel = await readLocatorValue(floatLabelInput);
  if (fromFloatLabel.length > 0) {
    return fromFloatLabel;
  }

  const labelledInput = page
    .locator("input, textarea")
    .filter({
      has: page.locator("xpath=following-sibling::*[contains(normalize-space(.),'Asset Type')]"),
    })
    .first();
  const fromLabelled = await readLocatorValue(labelledInput);
  if (fromLabelled.length > 0) {
    return fromLabelled;
  }

  const scopes: Locator[] = [];
  const host = addAssetHost(page);
  if (await host.isVisible({ timeout: 3_000 }).catch(() => false)) {
    scopes.push(host);
  }
  if (/\/asset\/addAsset/i.test(page.url())) {
    scopes.push(page.locator("body"));
  }

  for (const scope of scopes) {
    for (const loc of [
      scope.locator('input[name="assetTypeDD"]').first(),
      scope.locator("input.p-autocomplete-input").first(),
      scope.getByRole("searchbox").first(),
      scope
        .locator("label, span, .p-float-label")
        .filter({ hasText: /^Asset Type\s*\*?\s*$/i })
        .first()
        .locator(
          "xpath=following::input[1] | preceding::input[1] | ancestor::div[contains(@class,'col-') or contains(@class,'grid')][1]//input[not(@type='hidden')][1]",
        ),
    ]) {
      const val = await readLocatorValue(loc);
      if (val.length > 0) {
        return val;
      }
    }
  }

  const row = page
    .locator("label, span")
    .filter({ hasText: /^Asset Type/i })
    .first();
  if (await row.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const fromRow = ((await row.locator("xpath=ancestor::div[contains(@class,'col-')][1]").textContent()) ?? "")
      .replace(/Asset Type\s*\*?/i, "")
      .trim();
    if (fromRow.length > 0 && !isPlaceholder(fromRow)) {
      return fromRow;
    }
  }
  return "";
}

export async function openStandardQuoteFromDashboard(page: Page): Promise<{
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

export async function openTlBusinessStandardQuoteFromDashboard(page: Page): Promise<DOAssetDetailsPage> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await dashboardPage.clickCreateStandardQuote();
  await dashboardPage.selectTermLoanProduct();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.waitForAssetDetailsStepReady();
  return assetDetailsPage;
}

export async function selectCsaProductAndProgram(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  _program = CSA_SQ_PROGRAM,
): Promise<void> {
  await ensureCsaProductAndProgram(page, assetDetailsPage);
}

export async function ensureTlProductAndProgram(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await assetDetailsPage.waitForQuoteLoadersToFinish().catch(() => {});

  const productLabel = await waitForQuoteProductLabel(page, assetDetailsPage);
  if (!isTlProductLabel(productLabel)) {
    await assetDetailsPage.chooseProduct(TL_SQ_PRODUCT);
    await assetDetailsPage.waitForQuoteLoadersToFinish().catch(() => {});
  }

  let programLabel = await waitForQuoteProgramLabel(page, assetDetailsPage);
  if (!isTlProgramLabel(programLabel) || isTlProductLabel(programLabel)) {
    const candidates = [process.env.TL_SQ_PROGRAM?.trim(), TL_SQ_PROGRAM].filter(
      (v): v is string => Boolean(v?.trim()),
    );

    for (const program of candidates) {
      try {
        await assetDetailsPage.chooseProgram(program);
        programLabel = await waitForQuoteProgramLabel(page, assetDetailsPage, 20_000);
        if (isTlProgramLabel(programLabel)) {
          break;
        }
      } catch {
        // Try next program name for this dealer/env.
      }
    }

    if (!isTlProgramLabel(programLabel)) {
      const options = await assetDetailsPage.listProgramDropdownOptions().catch(() => []);
      const tlOption = options.find((o) => isTlProgramLabel(o));
      if (tlOption) {
        await assetDetailsPage.chooseProgram(tlOption);
        programLabel = tlOption;
      }
    }

    programLabel = (await waitForQuoteProgramLabel(page, assetDetailsPage, 15_000)) || programLabel;
    if (!isTlProgramLabel(programLabel)) {
      throw new Error(
        `Could not select a TL program. Current program: "${programLabel || "empty"}". ` +
          `Set TL_SQ_PROGRAM env var for this dealer.`,
      );
    }
  }

  await waitForQuoteLoadersOnly(page);
  const assetType = (await readQuoteAssetType(page)).trim();
  if (assetType.length > 0) {
    await waitForProductProgramSpinnerThenAssetTypePopulated(page).catch(() => {});
  }
}

export async function selectTlProductAndProgram(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await ensureTlProductAndProgram(page, assetDetailsPage);
}

export async function prepareQuoteWithVehicleAssetType(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  opts?: { product?: "csa" | "tl"; condition?: string },
): Promise<void> {
  if (opts?.product === "tl") {
    await ensureTlProductAndProgram(page, assetDetailsPage);
  } else {
    await ensureCsaProductAndProgram(page, assetDetailsPage);
  }
  const selected = await selectAssetTypeOptionBySearch(
    page,
    assetDetailsPage,
    "Car",
    /Car and Light Commercial/i,
  );
  if (!selected) {
    await assetDetailsPage.enterAsset(VEHICLE_ASSET_TYPE);
  }
  await assetDetailsPage.selectConditionInStandardQuote(opts?.condition ?? "Used").catch(() =>
    assetDetailsPage.selectCondition(opts?.condition ?? "Used"),
  );
  await waitForQuoteLoadersOnly(page, 60_000).catch(() => {});
}

export async function openAddAssetEditor(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<DOAddAssetPage> {
  const addAssetPage = new DOAddAssetPage(page);
  if (await isAddAssetEditorOpen(page)) {
    await addAssetPage.makeInputField.first().waitFor({ state: "visible", timeout: 60_000 }).catch(() =>
      addAssetPage.assetValueInputField.waitFor({ state: "visible", timeout: 60_000 }),
    );
    return addAssetPage;
  }

  await ensureStandardQuoteShellVisible(page, assetDetailsPage);
  await assetDetailsPage.openAssetInsuranceTradeInSummary();
  await assetDetailsPage.clickAssetSummaryEditButton();
  await expectAddAssetEditorVisible(page);
  await addAssetPage.makeInputField.first().waitFor({ state: "visible", timeout: 60_000 }).catch(() =>
    addAssetPage.assetValueInputField.waitFor({ state: "visible", timeout: 60_000 }),
  );
  return addAssetPage;
}

/** Poll until Add Asset editor shows a vehicle asset type default (from quote). */
export async function expectAddAssetVehicleAssetTypeDefault(page: Page): Promise<void> {
  const vehiclePattern = /Car|Light Commercial|Commercial|Motor/i;
  await expect
    .poll(async () => (await readAddAssetAssetType(page)).trim(), {
      timeout: 30_000,
      intervals: [300, 500, 1_000],
    })
    .toMatch(vehiclePattern);
}

export async function openAddAssetEditorViaSearchDialog(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<DOAddAssetPage> {
  await ensureQuoteVehicleAssetTypeSelected(page, assetDetailsPage);
  await assetDetailsPage.clickSearchAndAddAssetAndExpectSearchDialog();
  const addAssetPage = new DOAddAssetPage(page);

  const isAddAssetEditorOpen = async (): Promise<boolean> =>
    /\/asset\/addAsset/i.test(page.url()) ||
    (await addAssetPage.assetValueInputField.isVisible().catch(() => false)) ||
    (await addAssetPage.makeInputField.first().isVisible().catch(() => false));

  const waitForAddAssetEditor = async (): Promise<void> => {
    await expect
      .poll(async () => isAddAssetEditorOpen(), {
        timeout: 60_000,
        intervals: [300, 500, 1_000],
      })
      .toBeTruthy();
  };

  if (await isAddAssetEditorOpen()) {
    return addAssetPage;
  }

  const dlg = page
    .getByRole("dialog")
    .filter({ hasText: /Search Asset|Motochek|Dealer Inventory|Add Asset/i })
    .last();
  const addAssetRadio = dlg.getByRole("radio", { name: /^Add Asset$/i }).first();
  if (await addAssetRadio.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await addAssetRadio.check({ force: true }).catch(() => addAssetRadio.click({ force: true }));
  } else {
    await dlg.locator("label, span").filter({ hasText: /^Add Asset$/i }).first().click({ timeout: 10_000 });
  }

  await expect
    .poll(
      async () => {
        if (await isAddAssetEditorOpen()) {
          return true;
        }
        const proceed = dlg
          .getByRole("button", { name: /^Continue$|^Proceed$|^Next$/i })
          .first();
        if (await proceed.isVisible({ timeout: 500 }).catch(() => false)) {
          await proceed.click({ force: true, timeout: 3_000 }).catch(() => {});
        }
        return isAddAssetEditorOpen();
      },
      { timeout: 60_000, intervals: [300, 500, 1_000] },
    )
    .toBeTruthy()
    .catch(async () => {
      await waitForAddAssetEditor();
    });

  return addAssetPage;
}

export async function clearAddAssetAssetType(page: Page): Promise<void> {
  const candidates = [
    addAssetAssetTypeInput(page),
    page
      .locator(".p-float-label, [class*='float-label']")
      .filter({ hasText: /^Asset Type\s*\*?\s*$/i })
      .locator("input, textarea")
      .first(),
    page
      .locator("input, textarea")
      .filter({
        has: page.locator("xpath=following-sibling::*[contains(normalize-space(.),'Asset Type')]"),
      })
      .first(),
  ];
  for (const input of candidates) {
    if (await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await input.click();
      await input.press("Control+A");
      await input.press("Backspace");
      await page.keyboard.press("Escape").catch(() => {});
      return;
    }
  }
}

export async function searchAddAssetAssetType(page: Page, keyword: string): Promise<void> {
  const input = addAssetAssetTypeInput(page);
  await input.waitFor({ state: "visible", timeout: 20_000 });
  await input.click();
  await input.fill(keyword);
  await page.waitForTimeout(500);
}

/** Fuzzy-search options visible after typing in Add Asset **Asset Type** field. */
export async function expectAddAssetAssetTypeSearchResults(
  page: Page,
  pattern: RegExp,
): Promise<void> {
  const option = page
    .getByRole("option")
    .filter({ hasText: pattern })
    .or(page.locator(".p-autocomplete-panel li, .p-dropdown-panel li").filter({ hasText: pattern }))
    .first();
  await expect(option).toBeVisible({ timeout: 20_000 });
}

export async function openAssetTypeHierarchicalPopupOnAddAsset(page: Page): Promise<Locator> {
  const selectLink = addAssetAssetTypeSelectLink(page);
  await selectLink.scrollIntoViewIfNeeded();
  await selectLink.click({ timeout: 15_000 });
  const dlg = page
    .getByRole("dialog")
    .filter({ hasText: /Asset Type|All Asset Types/i })
    .last();
  await dlg.waitFor({ state: "visible", timeout: 20_000 });
  return dlg;
}

export async function openAssetTypeHierarchicalPopupOnQuote(page: Page): Promise<Locator> {
  const root = standardQuoteRoot(page);
  const selectTrigger = root
    .getByRole("button", { name: /^Select$/i })
    .or(root.getByRole("link", { name: /^Select$/i }))
    .or(
      root.locator(
        "xpath=.//*[contains(normalize-space(.),'Asset Type')]/ancestor::*[contains(@class,'row') or contains(@class,'grid')][1]//button[contains(.,'Select')]",
      ),
    )
    .or(
      root
        .locator("xpath=.//*[contains(normalize-space(.),'Asset Type')]/following::button[1]")
        .filter({ visible: true }),
    )
    .first();
  await selectTrigger.scrollIntoViewIfNeeded();
  await selectTrigger.click({ timeout: 15_000 });
  const dlg = page
    .getByRole("dialog")
    .filter({ hasText: /Asset Type|All Asset Type/i })
    .last();
  await dlg.waitFor({ state: "visible", timeout: 20_000 });
  return dlg;
}

export function quoteAssetTypeInput(page: Page): Locator {
  const root = standardQuoteRoot(page);
  return page
    .locator(".p-float-label, [class*='float-label']")
    .filter({ hasText: /^Asset Type\s*\*?\s*$/i })
    .locator("input, textarea")
    .first()
    .or(root.locator('input[name="assetTypeDD"]').first())
    .or(
      root.locator(
        "xpath=.//*[contains(normalize-space(.),'Asset Type')]/following::input[1]",
      ),
    )
    .first();
}

/** Read **Asset Type** on the quote shell (autocomplete input or label row). */
export async function readQuoteAssetTypeValue(page: Page): Promise<string> {
  const input = quoteAssetTypeInput(page);
  if (await input.isVisible({ timeout: 10_000 }).catch(() => false)) {
    return (
      (await input.inputValue().catch(() => "")) ||
      (await input.getAttribute("value")) ||
      (await input.textContent()) ||
      ""
    ).trim();
  }
  const root = standardQuoteRoot(page);
  const labelRow = root
    .locator("label, span, .p-float-label")
    .filter({ hasText: /^Asset Type/i })
    .first();
  if (await labelRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const row = labelRow.locator(
      "xpath=ancestor::div[contains(@class,'col-') or contains(@class,'grid') or contains(@class,'p-field')][1]",
    );
    return ((await row.textContent()) ?? "").replace(/Asset Type\s*\*?/i, "").trim();
  }
  return "";
}

async function readPrimeDropdownLabel(dropdown: Locator): Promise<string> {
  const combobox = dropdown.getByRole("combobox").first();
  if (await combobox.isVisible({ timeout: 1_000 }).catch(() => false)) {
    return (
      (await combobox.getAttribute("aria-label")) ??
      (await combobox.textContent()) ??
      ""
    ).trim();
  }
  return ((await dropdown.locator(".p-dropdown-label").first().textContent()) ?? "").trim();
}

async function isAssetTypeDropdownUnset(dropdown: Locator): Promise<boolean> {
  const disabled =
    (await dropdown.evaluate((el) => el.classList.contains("p-disabled")).catch(() => false)) ||
    (await dropdown.getAttribute("class"))?.includes("p-disabled");
  if (disabled) return false;

  const label = await readPrimeDropdownLabel(dropdown);
  return (
    label.length === 0 ||
    /^(select|choose|all asset type)/i.test(label) ||
    /\bselect asset\b/i.test(label)
  );
}

/**
 * Fills each enabled hierarchical **Asset Type** level (skips disabled **All Asset Type** root).
 * New levels may appear after each selection — repeats until no unset dropdowns remain.
 */
export async function selectAssetTypeHierarchicalLevels(
  dlg: Locator,
  page: Page,
  opts?: { maxRounds?: number; preferPattern?: RegExp },
): Promise<void> {
  const maxRounds = opts?.maxRounds ?? 6;
  const preferPattern = opts?.preferPattern ?? /Car|Light Commercial|Motor|Vehicle/i;

  for (let round = 0; round < maxRounds; round++) {
    const dropdowns = dlg.locator(".p-dropdown").filter({ visible: true });
    const count = await dropdowns.count();
    let selectedAny = false;

    for (let i = 0; i < count; i++) {
      const dropdown = dropdowns.nth(i);
      if (!(await isAssetTypeDropdownUnset(dropdown))) {
        continue;
      }

      const trigger = dropdown
        .locator(".p-dropdown-trigger")
        .or(dropdown.getByRole("combobox"))
        .or(dropdown.getByRole("button", { name: /dropdown trigger/i }))
        .first();
      await trigger.scrollIntoViewIfNeeded().catch(() => {});
      await trigger.click({ timeout: 10_000 });

      const panel = page.locator("div.p-dropdown-panel").filter({ visible: true }).last();
      const options = panel.getByRole("option").filter({ visible: true });
      const optCount = await options.count();
      let picked = false;

      for (let j = 0; j < optCount; j++) {
        const opt = options.nth(j);
        const text = ((await opt.textContent()) ?? "").replace(/\s+/g, " ").trim();
        if (!text || /^(select|choose|all asset type)/i.test(text)) {
          continue;
        }
        if (preferPattern.test(text)) {
          await opt.click({ timeout: 10_000 });
          picked = true;
          break;
        }
      }

      if (!picked) {
        for (let j = 0; j < optCount; j++) {
          const opt = options.nth(j);
          const text = ((await opt.textContent()) ?? "").replace(/\s+/g, " ").trim();
          if (text && !/^(select|choose|all asset type)/i.test(text)) {
            await opt.click({ timeout: 10_000 });
            picked = true;
            break;
          }
        }
      }

      await page.keyboard.press("Escape").catch(() => {});
      if (picked) {
        selectedAny = true;
        await page.waitForTimeout(400);
      }
    }

    if (!selectedAny) {
      break;
    }
  }
}

/** Select all required hierarchical levels, click **Add**, and wait for the popup to close. */
export async function addAssetTypeFromHierarchicalPopup(dlg: Locator, page: Page): Promise<void> {
  const addBtn = dlg
    .getByRole("button", { name: /^Add$/i })
    .or(dlg.locator("span.p-button-label").filter({ hasText: /^Add$/ }))
    .first();

  await expect
    .poll(
      async () => {
        if (!(await dlg.isVisible().catch(() => false))) {
          return true;
        }

        await selectAssetTypeHierarchicalLevels(dlg, page);
        const validation = dlg.getByText(/required/i).filter({ visible: true });
        const hasValidation = (await validation.count()) > 0;

        if (await addBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await addBtn.click({ force: true, timeout: 10_000 }).catch(() => {});
        }

        if (hasValidation) {
          return false;
        }

        return !(await dlg.isVisible().catch(() => false));
      },
      { timeout: 60_000, intervals: [500, 1_000, 1_500] },
    )
    .toBeTruthy();

  await expect
    .poll(async () => (await readQuoteAssetTypeValue(page)).trim().length > 0, {
      timeout: 30_000,
      intervals: [300, 500, 1_000],
    })
    .toBeTruthy();
}

export async function expectValidationMessage(page: Page, pattern: RegExp): Promise<void> {
  const validation = page
    .locator(
      ".p-toast-message, .p-toast-message-text, .p-toast-detail, .p-toast-message-error, .p-toast-message-warn, .p-inline-message-error, .p-message-error",
    )
    .or(page.getByText(pattern))
    .or(page.getByRole("alert").filter({ hasText: pattern }));
  await expect.soft(validation.first()).toBeVisible({ timeout: 25_000 });
}

export async function collectPageAndDialogText(page: Page): Promise<string> {
  const parts: string[] = [];

  if (await addAssetHost(page).isVisible({ timeout: 500 }).catch(() => false)) {
    parts.push((await addAssetHost(page).innerText().catch(() => "")) ?? "");
  }
  if (/\/asset\/addAsset/i.test(page.url())) {
    parts.push((await page.locator("body").innerText().catch(() => "")) ?? "");
  }

  const inlineValidation = page.locator(
    ".p-error, .p-inline-message-error, .p-message-error, .p-message-text, small.p-error",
  );
  const validationCount = await inlineValidation.count();
  for (let i = 0; i < validationCount; i++) {
    if (await inlineValidation.nth(i).isVisible().catch(() => false)) {
      parts.push((await inlineValidation.nth(i).innerText()) ?? "");
    }
  }

  const dialogs = page.getByRole("dialog");
  const dialogCount = await dialogs.count();
  for (let i = 0; i < dialogCount; i++) {
    if (await dialogs.nth(i).isVisible().catch(() => false)) {
      parts.push((await dialogs.nth(i).innerText()) ?? "");
    }
  }

  return parts.join("\n");
}

export async function expectPageOrDialogText(page: Page, pattern: RegExp): Promise<void> {
  await expect
    .poll(async () => pattern.test(await collectPageAndDialogText(page)), {
      timeout: 30_000,
      intervals: [300, 500, 1_000],
    })
    .toBeTruthy();
}

/** Inline field validation on Add Asset (full-page or dialog). */
export async function expectAddAssetValidationMessage(page: Page, pattern: RegExp): Promise<void> {
  await expectPageOrDialogText(page, pattern);
}

export async function selectAssetTypeOptionBySearch(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  keyword: string,
  optionPattern: RegExp,
): Promise<boolean> {
  const input = quoteAssetTypeInput(page);
  if (!(await input.isVisible({ timeout: 10_000 }).catch(() => false))) {
    return false;
  }
  await input.click();
  await input.fill(keyword);
  const option = page
    .getByRole("option")
    .filter({ hasText: optionPattern })
    .or(page.locator(".p-autocomplete-panel li, .p-dropdown-panel li").filter({ hasText: optionPattern }))
    .first();
  if (!(await option.isVisible({ timeout: 15_000 }).catch(() => false))) {
    await page.keyboard.press("Escape").catch(() => {});
    return false;
  }
  await option.click({ timeout: 10_000 });
  await assetDetailsPage.confirmAssetTypeDialogIfOpen();
  await waitForQuoteLoadersOnly(page, 60_000).catch(() => {});
  const value = await readQuoteAssetTypeValue(page);
  return optionPattern.test(value);
}

export type AddAssetCategory = "vehicle" | "other" | "plant" | "marine" | "ev";

const categoryAssetTypeSearch: Record<AddAssetCategory, { keyword: string; pattern: RegExp }> = {
  vehicle: { keyword: "Car", pattern: /Car and Light Commercial|Car|Light Commercial/i },
  other: { keyword: "Other", pattern: /Other/i },
  plant: { keyword: "Plant", pattern: /Plant/i },
  marine: { keyword: "Marine", pattern: /Marine/i },
  ev: {
    keyword: "Clean Tech",
    pattern: /\bEV\b|Clean\s*Tech|Electric\s*Vehicle|Plug-?in/i,
  },
};

async function trySelectEvCleanTechAssetType(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<boolean> {
  const pattern = categoryAssetTypeSearch.ev.pattern;

  for (const keyword of ["Clean Tech", "Electric Vehicle", "EV Clean"]) {
    const input = quoteAssetTypeInput(page);
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      break;
    }
    await input.click();
    await input.fill(keyword);
    const option = page
      .getByRole("option")
      .filter({ hasText: pattern })
      .first();
    if (!(await option.isVisible({ timeout: 4_000 }).catch(() => false))) {
      await page.keyboard.press("Escape").catch(() => {});
      continue;
    }
    if (await selectAssetTypeOptionBySearch(page, assetDetailsPage, keyword, pattern)) {
      const value = await readQuoteAssetTypeValue(page);
      if (pattern.test(value)) {
        return true;
      }
    }
  }

  return false;
}

/** Category-specific fields on the Add Asset breakdown screen. */
export const addAssetCategoryLayoutPattern: Record<AddAssetCategory, RegExp> = {
  vehicle: /Rego|VIN/i,
  other: /Description/i,
  plant: /Serial|Make|Year/i,
  marine: /HIN|Serial|Make|Year/i,
  ev: /VIN|Odometer|Make|Motive|Electric/i,
};

export async function selectQuoteAssetTypeForCategory(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  category: AddAssetCategory,
): Promise<boolean> {
  if (category === "ev") {
    return trySelectEvCleanTechAssetType(page, assetDetailsPage);
  }

  const { keyword, pattern } = categoryAssetTypeSearch[category];
  if (await selectAssetTypeOptionBySearch(page, assetDetailsPage, keyword, pattern)) {
    return true;
  }

  const dlg = await openAssetTypeHierarchicalPopupOnQuote(page);
  await selectAssetTypeHierarchicalLevels(dlg, page, { preferPattern: pattern });
  await addAssetTypeFromHierarchicalPopup(dlg, page);
  const value = await readQuoteAssetTypeValue(page);
  return pattern.test(value);
}

export async function expectAddAssetCategoryLayout(
  page: Page,
  addAssetPage: DOAddAssetPage,
  category: AddAssetCategory,
): Promise<void> {
  await expectAddAssetEditorVisible(page);
  await expectAddAssetFieldVisible(addAssetPage, addAssetCategoryLayoutPattern[category]);
}

export async function fillMinimalVehicleAsset(
  addAssetPage: DOAddAssetPage,
  opts?: {
    value?: string;
    year?: string;
    make?: string;
    model?: string;
    variant?: string;
    rego?: string;
    vin?: string;
    skipLocation?: boolean;
  },
): Promise<void> {
  await addAssetPage.enterAssetValue(opts?.value ?? "$20,000");
  await addAssetPage.selectCondition("Used");
  await addAssetPage.selectYear(opts?.year ?? "2025");
  await addAssetPage.enterMake(opts?.make ?? "Toyota");
  await addAssetPage.enterModel(opts?.model ?? "Hilux");
  await addAssetPage.enterVariant(opts?.variant ?? "Top");
  if (opts?.rego) await addAssetPage.enterRegoNO(opts.rego);
  if (opts?.vin) await addAssetPage.enterVIN(opts.vin);
  await addAssetPage.enterOdometer("50000");
  await addAssetPage.enterColour("Black");
  await addAssetPage.enterSerialNO("0999944477");
  await addAssetPage.enterEngineNO("1133445588");
  await addAssetPage.enterCCRating("5");
  await addAssetPage.chooseMotivePower("Petrol").catch(() => {});
  await addAssetPage.chooseCountryRegistered("New Zealand").catch(() => {});
  if (!opts?.skipLocation) {
    await addAssetPage.chooseAssetLocation("North Island").catch(() => {});
  }
}

export async function fillMinimalOtherAsset(addAssetPage: DOAddAssetPage): Promise<void> {
  await addAssetPage.enterAssetValue("$15,000");
  await addAssetPage.selectCondition("Used");
  await addAssetPage.enterDescription("Regression other asset item");
}

export async function fillMinimalPlantAsset(addAssetPage: DOAddAssetPage): Promise<void> {
  await addAssetPage.enterAssetValue("$35,000");
  await addAssetPage.selectCondition("Used");
  await addAssetPage.selectYear("2024");
  await addAssetPage.enterMake("Caterpillar");
  await addAssetPage.enterModel("320");
  await addAssetPage.enterVariant("Excavator");
  await addAssetPage.enterSerialNO("1234567890");
  await addAssetPage.enterDescription("Plant regression asset");
}

export async function fillMinimalMarineAsset(addAssetPage: DOAddAssetPage): Promise<void> {
  await addAssetPage.enterAssetValue("$45,000");
  await addAssetPage.selectCondition("Used");
  await addAssetPage.selectYear("2022");
  await addAssetPage.enterMake("Beneteau");
  await addAssetPage.enterModel("Oceanis");
  await addAssetPage.enterVariant("40");
  await addAssetPage.enterHIN("HIN123456789");
  await addAssetPage.enterSerialNO("MARINE-SERIAL-001");
}

/** Submit Add Asset but stay on the editor when inline validation blocks save. */
export async function submitAddAssetForValidation(addAssetPage: DOAddAssetPage): Promise<void> {
  await addAssetPage.clickSummitButton({ waitForNavigation: false });
}

/** Enable **Private Sale** when shown — unlocks editable **Supplier Name** on some builds. */
export async function enablePrivateSaleOnAddAsset(page: Page): Promise<boolean> {
  const host = addAssetHost(page);
  const toggle = page
    .getByText(/Private Sale/i)
    .first()
    .locator(
      "xpath=ancestor::*[contains(@class,'field') or contains(@class,'grid') or contains(@class,'p-col')][1]",
    )
    .getByRole("switch")
    .or(page.locator("p-inputswitch").filter({ hasText: /Private Sale/i }))
    .or(page.getByRole("switch", { name: /Private Sale/i }))
    .or(host.getByText(/Private Sale/i).locator("xpath=following::p-inputswitch[1]"))
    .first();
  if (!(await toggle.isVisible({ timeout: 8_000 }).catch(() => false))) {
    return false;
  }
  await toggle.click({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(500);
  return true;
}

export async function fillMinimalEvCleanTechAsset(addAssetPage: DOAddAssetPage): Promise<void> {
  await addAssetPage.enterAssetValue("$55,000");
  await addAssetPage.selectCondition("New");
  await addAssetPage.selectYear(String(new Date().getFullYear()));
  await addAssetPage.enterMake("Tesla");
  await addAssetPage.enterModel("Model 3");
  await addAssetPage.enterVariant("Long Range");
  await addAssetPage.enterVIN("5YJ3E1EA1KF123456");
  await addAssetPage.enterOdometer("1000");
  await addAssetPage.enterColour("White");
  await addAssetPage.chooseMotivePower("Electric").catch(() => {});
  await addAssetPage.chooseCountryRegistered("New Zealand").catch(() => {});
}

async function ensureQuoteConditionForCategory(
  assetDetailsPage: DOAssetDetailsPage,
  category: AddAssetCategory,
): Promise<void> {
  const preferred = category === "ev" ? "New" : "Used";
  const current = await assetDetailsPage.readSelectedConditionLabel().catch(() => "");
  if (current.length > 0 && new RegExp(preferred, "i").test(current)) {
    return;
  }
  try {
    await assetDetailsPage.selectConditionInStandardQuote(preferred);
  } catch {
    await assetDetailsPage.selectCondition(preferred).catch(() => {});
  }
}

export async function openAddAssetForCategory(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  category: AddAssetCategory,
): Promise<{ addAssetPage: DOAddAssetPage; skipped: boolean; evVehicleFallback?: boolean }> {
  await ensureStandardQuoteShellVisible(page, assetDetailsPage);
  let evVehicleFallback = false;
  let selected = await selectQuoteAssetTypeForCategory(page, assetDetailsPage, category);

  if (!selected && category === "ev") {
    selected = await selectAssetTypeOptionBySearch(
      page,
      assetDetailsPage,
      "Car",
      categoryAssetTypeSearch.vehicle.pattern,
    );
    evVehicleFallback = selected;
  }

  if (!selected) {
    return { addAssetPage: new DOAddAssetPage(page), skipped: true };
  }
  await ensureQuoteConditionForCategory(assetDetailsPage, category);
  await waitForQuoteLoadersOnly(page, 60_000).catch(() => {});
  const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
  return { addAssetPage, skipped: false, evVehicleFallback };
}

export async function runMotochekFromAddAssetEditor(
  page: Page,
  addAssetPage: DOAddAssetPage,
): Promise<Locator> {
  await addAssetPage.clickSearchForAssetButton();
  const dlg = page
    .getByRole("dialog")
    .filter({ hasText: /Search Asset|Motochek|Motocheck/i })
    .last();
  await dlg.waitFor({ state: "visible", timeout: 30_000 });

  const motochekRadio = dlg.getByRole("radio", { name: /Motocheck|Motochek/i }).first();
  if (await motochekRadio.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await motochekRadio.check({ force: true });
  }

  const searchByCombo = dlg
    .getByRole("combobox", { name: /Rego Number|VIN Number|Search by/i })
    .or(dlg.getByRole("combobox").first());
  if (await searchByCombo.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await searchByCombo.click({ timeout: 10_000 });
    await page.getByRole("option", { name: /Rego Number/i }).first().click({ timeout: 10_000 }).catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
  }

  const enterNumber = dlg
    .getByText(/Enter Number/i)
    .first()
    .locator("xpath=following::input[@id='text' and contains(@class,'p-inputtext')][1]")
    .or(dlg.locator("input#text.p-inputtext").first())
    .first();
  await enterNumber.waitFor({ state: "visible", timeout: 15_000 });
  await enterNumber.fill(MOTOCHEK_REGO);
  await dlg.getByRole("button", { name: /^Search$/i }).click({ timeout: 15_000 });
  return dlg;
}

export async function clickPrintDocumentsOnAddAsset(page: Page): Promise<boolean> {
  const host = addAssetHost(page);
  const printBtn = host
    .getByRole("button", { name: /Print Documents?/i })
    .or(host.getByRole("link", { name: /Print Documents?/i }))
    .or(page.getByRole("button", { name: /Print Documents?/i }))
    .first();
  if (!(await printBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
    return false;
  }
  await printBtn.click({ timeout: 15_000 });
  return true;
}

export async function expectAddAssetFieldVisible(addAssetPage: DOAddAssetPage, label: RegExp): Promise<void> {
  await expect
    .soft(addAssetPage.page.locator("text, label").filter({ hasText: label }).first())
    .toBeVisible({ timeout: 20_000 });
}
