/**
 * AFV Motochek helpers shared by Partnership (UDP-T4484) and MotoCheck regression.
 */

import { expect } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DOAssetDetailsPage } from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";

export const AFV_SQ_VEHICLE = {
  make: "SUZUKI",
  model: "IGNIS",
  variant: "GLX MANUAL 1.2P/ 5MT",
  year: "2024",
};

/** Default Motochek VIN on QAT — returns TOYOTA HILUX (mismatch vs AFV SUZUKI IGNIS). */
const MOTOCHEK_DEFAULT_VIN = process.env.MOTOCHEK_VIN?.trim() || "7A433LN8508501772";

export const MOTOCHEK_AFV_MISMATCH_REGO = process.env.MOTOCHEK_AFV_MISMATCH_REGO?.trim() || "";
export const MOTOCHEK_AFV_MISMATCH_VIN =
  process.env.MOTOCHEK_AFV_MISMATCH_VIN?.trim() || MOTOCHEK_DEFAULT_VIN;
export const MOTOCHEK_SANITY_REGO = process.env.MOTOCHEK_SANITY_REGO?.trim() || "BAGGED";

export function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

export function assetInsuranceSummaryDialog(page: Page): Locator {
  return page
    .getByRole("dialog")
    .filter({ hasText: /Asset/i })
    .filter({ hasText: /Insurance/i })
    .filter({ hasText: /Summary/i })
    .last();
}

async function physicalSearchAssetDialog(page: Page): Promise<Locator> {
  const dlg = page.getByRole("dialog", { name: /Search Asset/i });
  await dlg.waitFor({ state: "visible", timeout: 30_000 });
  return dlg;
}

export async function waitForProductProgramSpinnerThenAssetTypePopulated(
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

async function waitForAppLoadersGone(page: Page, timeoutMs = 60_000): Promise<void> {
  const loaders = page.locator(
    ".app-loader-overlay, .p-progress-spinner, .p-progressspinner, .p-blockui, [class*='p-progress']",
  );
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
}

async function waitForDialogMasksGone(page: Page, timeoutMs = 30_000): Promise<void> {
  const masks = page.locator(
    ".p-dialog-mask.p-component-overlay, .p-dialog-mask-scrollblocker, .p-component-overlay.p-dialog-mask-scrollblocker",
  );
  await expect
    .poll(
      async () => {
        const count = await masks.count();
        for (let i = 0; i < count; i++) {
          if (await masks.nth(i).isVisible().catch(() => false)) return false;
        }
        return true;
      },
      { timeout: timeoutMs },
    )
    .toBe(true);
}

async function ensureAfVQuoteBaselineForMotochek(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await expect.soft(standardQuoteRoot(page).getByText(/AFV/i).first()).toBeVisible({ timeout: 15_000 });

  const orig = (await assetDetailsPage.originationRefInput.inputValue().catch(() => "")).trim();
  if (!orig) {
    await assetDetailsPage.enterOriginationReference("SQ-AFV-Motochek-Ref");
  }

  await assetDetailsPage.selectConditionInStandardQuote("Used").catch(() => {});
  await waitForAppLoadersGone(page, 30_000);

  try {
    await assetDetailsPage.waitForAfVCashPricePopulated();
  } catch {
    await assetDetailsPage.cashPriceOfAsset("$25,000");
    await waitForAppLoadersGone(page, 30_000);
    await assetDetailsPage.waitForAfVCashPricePopulated();
  }
}

/** Persist AFV baseline after product/vehicle/program are already on the quote. */
export async function ensureAfVQuoteReadyForMotochekSearch(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await ensureAfVQuoteBaselineForMotochek(page, assetDetailsPage);
  await waitForProductProgramSpinnerThenAssetTypePopulated(page, 60_000);
  await assetDetailsPage
    .clickSaveStandardQuoteStep({
      originatorRefForRequiredDialog: "SQ-AFV-Motochek-Ref",
    })
    .catch(() => {});
  await waitForProductProgramSpinnerThenAssetTypePopulated(page, 60_000);
  await ensureAfVQuoteBaselineForMotochek(page, assetDetailsPage);
}

export type AfVAssetIdentity = {
  year: string;
  make: string;
  model: string;
  variant: string;
};

function normalizeAfVAssetPart(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

/** Compare snapshots when quote shell shows variant-only but Add Asset shows full make/model/variant. */
export function afvAssetIdentitiesMatch(before: AfVAssetIdentity, after: AfVAssetIdentity): boolean {
  const pairs: (keyof AfVAssetIdentity)[] = ["year", "make", "model", "variant"];
  for (const key of pairs) {
    const left = normalizeAfVAssetPart(before[key]);
    const right = normalizeAfVAssetPart(after[key]);
    if (left && right && left !== right) {
      return false;
    }
  }
  return normalizeAfVAssetPart(before.variant).length > 0
    ? normalizeAfVAssetPart(after.variant) === normalizeAfVAssetPart(before.variant)
    : true;
}

function parseAfVAssetFromSummaryRow(text: string): AfVAssetIdentity {
  const normalized = text.replace(/\s+/g, " ").trim();
  const year = normalized.match(/\b(20\d{2})\b/)?.[1] ?? "";
  const withoutYear = normalized.replace(/^\d{4}\s*/, "").trim();
  const tokens = withoutYear.split(/\s+/);
  const make = tokens[0] ?? "";
  const model = tokens[1] ?? "";
  const variant = tokens.slice(2).join(" ");
  return { year, make, model, variant };
}

/**
 * Read AFV asset identity from standard quote, Add Asset editor, or insurance summary row.
 * Motochek via row **Edit** navigates to `/asset/addAsset/edit` — quote shell is not visible.
 */
export async function readAfVAssetIdentity(page: Page): Promise<AfVAssetIdentity> {
  const empty: AfVAssetIdentity = { year: "", make: "", model: "", variant: "" };
  const addAssetPage = new DOAddAssetPage(page);

  if (await addAssetPage.makeInputField.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
    return {
      year: (await addAssetPage.yearInputField.first().inputValue({ timeout: 5_000 }).catch(() => "")).trim(),
      make: (await addAssetPage.makeInputField.first().inputValue({ timeout: 5_000 }).catch(() => "")).trim(),
      model: (await addAssetPage.modelInputField.first().inputValue({ timeout: 5_000 }).catch(() => "")).trim(),
      variant: (await addAssetPage.variantInputField.first().inputValue({ timeout: 5_000 }).catch(() => "")).trim(),
    };
  }

  const summaryDlg = assetInsuranceSummaryDialog(page);
  if (await summaryDlg.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const rowText = (
      await summaryDlg
        .locator("table")
        .first()
        .locator("tbody tr")
        .first()
        .locator("td")
        .nth(1)
        .innerText({ timeout: 5_000 })
        .catch(() => "")
    ).trim();
    if (rowText) {
      return parseAfVAssetFromSummaryRow(rowText);
    }
  }

  const root = standardQuoteRoot(page).filter({ visible: true });
  if (await root.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const assetTypeValue = root
      .locator(
        "xpath=.//*[contains(normalize-space(.),'Asset Type')]/ancestor::*[contains(@class,'row') or contains(@class,'grid')][1]//input",
      )
      .or(root.locator("xpath=.//*[contains(normalize-space(.),'Asset Type')]/following::input[1]"))
      .first();
    const variant =
      (await assetTypeValue.inputValue({ timeout: 5_000 }).catch(() => "")).trim() ||
      (await assetTypeValue.textContent({ timeout: 5_000 }).catch(() => ""))?.trim() ||
      "";
    if (variant) {
      return { ...empty, variant };
    }
  }

  return empty;
}

/** @deprecated Prefer {@link readAfVAssetIdentity}. */
export async function readAfVAssetTypeOnStandardQuote(page: Page): Promise<string> {
  const identity = await readAfVAssetIdentity(page);
  return identity.variant || [identity.year, identity.make, identity.model].filter(Boolean).join(" ");
}

async function openMotochekViaExistingAfVAssetRow(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  summaryDlg: Locator,
): Promise<void> {
  const physicalRow = summaryDlg
    .locator("table")
    .first()
    .locator("tbody tr")
    .filter({ hasText: /\d{4}|SUZUKI|IGNIS|GLX|Asset/i })
    .first();
  const rowEdit = physicalRow
    .locator("i.fa-pen-to-square, i.fa-pen, i.fa-pencil, .pi-pencil, .pi-pen")
    .or(physicalRow.locator("td").last().locator("[class*='cursor-pointer'], button, a").first())
    .first();

  if (await rowEdit.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await rowEdit.scrollIntoViewIfNeeded();
    await rowEdit.click({ timeout: 15_000, force: true });
  } else {
    await assetDetailsPage.clickAssetSummaryEditButton();
  }

  const addAssetPage = new DOAddAssetPage(page);
  await addAssetPage.clickSearchForAssetButton();
}

export async function openAfVPhysicalSearchAssetDialog(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<Locator> {
  await assetDetailsPage.openAssetInsuranceTradeInSummary();
  const summaryDlg = assetInsuranceSummaryDialog(page);
  await expect(summaryDlg).toBeVisible({ timeout: 45_000 });

  const searchAndAdd = summaryDlg
    .getByRole("button", { name: /Search\s*&\s*Add\s+Asset/i })
    .or(summaryDlg.getByRole("link", { name: /Search\s*&\s*Add\s+Asset/i }))
    .first();

  const searchAndAddEnabled =
    (await searchAndAdd.isVisible({ timeout: 8_000 }).catch(() => false)) &&
    (await searchAndAdd.isEnabled().catch(() => false));

  if (searchAndAddEnabled) {
    await searchAndAdd.scrollIntoViewIfNeeded();
    await searchAndAdd.click({ timeout: 15_000 });
  } else {
    await openMotochekViaExistingAfVAssetRow(page, assetDetailsPage, summaryDlg);
  }

  return physicalSearchAssetDialog(page);
}

export function enterNumberInput(dlg: Locator): Locator {
  return dlg
    .locator("div")
    .filter({ hasText: /Enter Number/i })
    .locator("input.p-inputtext, input[type='text']")
    .first()
    .or(dlg.locator("text").filter({ hasText: /^Enter Number/i }).locator("#text").first())
    .or(
      dlg
        .getByText(/Enter Number/i)
        .first()
        .locator("xpath=following::input[@id='text' and contains(@class,'p-inputtext')][1]"),
    )
    .or(dlg.locator("input#text.p-inputtext.p-component").first())
    .or(dlg.locator("input#text[type='text']").first())
    .first();
}

export function motochekResetButton(dlg: Locator): Locator {
  return dlg
    .getByRole("button", { name: /^Reset$/i })
    .or(dlg.locator("button, a").filter({ hasText: /^Reset$/i }))
    .first();
}

function motochekProceedToAddAssetButton(dlg: Locator): Locator {
  return dlg
    .getByRole("button", { name: /^Continue$/i })
    .or(dlg.locator("button, a").filter({ hasText: /^Continue$/i }))
    .or(dlg.getByRole("button", { name: /^Add Asset$/i }))
    .or(dlg.locator("button, a").filter({ hasText: /^\s*Add Asset\s*$/i }))
    .first();
}

async function ensureMotochekSelected(dlg: Locator): Promise<void> {
  const host = dlg.locator("p-radiobutton").filter({ hasText: /Motocheck|Motochek/i }).first();
  const input = host.locator('input[type="radio"]').first();
  if (await input.isChecked().catch(() => false)) {
    return;
  }
  await host.scrollIntoViewIfNeeded().catch(() => {});
  const box = host.locator(".p-radiobutton-box").first();
  if (await box.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await box.click({ timeout: 15_000 });
    return;
  }
  const radio = dlg.getByRole("radio", { name: /Motocheck|Motochek/i }).first();
  if (await radio.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await radio.click({ timeout: 15_000 });
  }
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
  const page = dlg.page();
  await waitForAppLoadersGone(page, 30_000);

  const searchBtn = dlg.getByRole("button", { name: /^Search$/i }).first();
  await searchBtn.scrollIntoViewIfNeeded();
  await expect(searchBtn).toBeVisible({ timeout: 15_000 });
  await expect(searchBtn).toBeEnabled({ timeout: 15_000 });

  const motochekResponse = page
    .waitForResponse(
      (r) =>
        r.request().method() !== "OPTIONS" &&
        /motochek|motocheck|vehicle|assetsearch|asset-search|party|fis|bld/i.test(r.url()),
      { timeout: 120_000 },
    )
    .catch(() => null);

  await searchBtn.click({ timeout: 15_000 });
  await motochekResponse;
  await waitForAppLoadersGone(page, 120_000);
}

async function motochekDialogTextBlob(dlg: Locator): Promise<string> {
  const page = dlg.page();
  const parts: string[] = [(await dlg.innerText().catch(() => "")) ?? ""];
  const toasts = page.locator(".p-toast-message, .p-toast, [role='alert']");
  const toastCount = await toasts.count().catch(() => 0);
  for (let i = 0; i < toastCount; i++) {
    if (await toasts.nth(i).isVisible().catch(() => false)) {
      parts.push((await toasts.nth(i).innerText()) ?? "");
    }
  }
  return parts.join("\n").replace(/\u00a0/g, " ");
}

async function expectMotochekSuccess(dlg: Locator): Promise<void> {
  await expect
    .poll(
      async () => {
        if (!(await dlg.isVisible().catch(() => false))) return false;
        const body = await motochekDialogTextBlob(dlg);
        if (
          /Motocheck Successfully|Motochek Successfully|Successfully Executed|Successfully Completed|Executed Successfully|Search Completed/i.test(
            body,
          )
        ) {
          return true;
        }
        if (
          /Make\s*[:\n]?\s*\S+/i.test(body) &&
          /Model\s*[:\n]?\s*\S+/i.test(body) &&
          !/Make\s*[:\n]?\s*$/i.test(body)
        ) {
          return true;
        }
        if (/Year\s*[:\n]?\s*\d{4}/i.test(body) && /VIN\s*[:\n]?\s*\S+/i.test(body) && /Make/i.test(body)) {
          return true;
        }
        return false;
      },
      { timeout: 120_000, intervals: [500, 1000, 2000] },
    )
    .toBeTruthy();
}

function returnedVehicleMismatchesAfVProgram(body: string): boolean {
  const hasProgramVehicle =
    new RegExp(AFV_SQ_VEHICLE.make, "i").test(body) && new RegExp(AFV_SQ_VEHICLE.model, "i").test(body);
  const hasMotochekVehicle =
    /Make\s*[:\n]?\s*\S+/i.test(body) &&
    /Model\s*[:\n]?\s*\S+/i.test(body) &&
    !/Make\s*[:\n]?\s*$/i.test(body);
  return hasMotochekVehicle && !hasProgramVehicle;
}

function hasMotochekFisMismatchError(blob: string): boolean {
  return /mismatch|does not match|doesn't match|not match|not eligible|cannot proceed|unable to proceed|validation failed|lookupset|program configuration|invalid vehicle|not valid for|not valid for this program/i.test(
    blob,
  );
}

/** Vehicle found but Make/Model/Variant do not match AFV program (UDP-T4171 / UDP-T4484). */
export async function expectMotochekAfVProgramVehicleMismatch(page: Page, dlg: Locator): Promise<void> {
  await expectMotochekSuccess(dlg);
  const body = await motochekDialogTextBlob(dlg);
  expect.soft(/Make\s*[:\n]?\s*\S+/i.test(body)).toBeTruthy();
  expect.soft(/Model\s*[:\n]?\s*\S+/i.test(body)).toBeTruthy();
  expect(returnedVehicleMismatchesAfVProgram(body)).toBeTruthy();

  const proceed = motochekProceedToAddAssetButton(dlg);
  if (hasMotochekFisMismatchError(body) || (await proceed.isDisabled().catch(() => false))) {
    await expect(proceed).toBeDisabled();
    return;
  }

  await expect.soft(proceed).toBeEnabled();
  await expect(enterNumberInput(dlg)).toBeEditable();
  await expect(motochekResetButton(dlg)).toBeVisible({ timeout: 15_000 });
}

export async function runMotochekSearch(
  page: Page,
  dlg: Locator,
  searchBy: RegExp,
  value: string,
): Promise<void> {
  await ensureMotochekSelected(dlg);
  await selectSearchBy(page, dlg, searchBy);
  const enterNumber = enterNumberInput(dlg);
  await enterNumber.waitFor({ state: "visible", timeout: 15_000 });
  await enterNumber.click({ timeout: 10_000 });
  await enterNumber.fill(value);
  await enterNumber.press("Tab").catch(() => {});
  await clickSearchOnDialog(dlg);
}

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

export async function closePhysicalSearchAssetDialog(page: Page): Promise<void> {
  const dlg = page.getByRole("dialog", { name: /Search Asset/i });
  if (await dlg.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await clickSearchAssetCancelOrClose(dlg);
    await dlg.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  }
  await page.keyboard.press("Escape").catch(() => {});
  await waitForDialogMasksGone(page);
}
