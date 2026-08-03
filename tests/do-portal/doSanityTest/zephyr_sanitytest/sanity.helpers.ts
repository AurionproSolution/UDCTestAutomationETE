/**
 * Shared helpers for Zephyr Sanity tests (UDP-T4677–UDP-T4730).
 * Scenario source: Sanity Test Cases.xlsx (/Sanity Automation).
 */

import { expect, type Locator, type Page } from "@playwright/test";
import {
  DOAddOnsAccessoriesPage,
  DOAddressDetailsPage,
  DOAssetDetailsPage,
  DOCustomerDetailsPage,
  DOCustomerQuotePostSubmitPage,
  DODashboardPage,
  DOEmploymentDetailsPage,
  DOFinancialPositionPage,
  DOQuickQuotePage,
} from "../../../../pages";
import { DOAddAssetPage } from "../../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../../config/env";
import {
  CSA_SQ_PRODUCT,
  CSA_SQ_PROGRAM,
  TLC_DEALER,
  addMinimalUsedAsset,
  advanceAssetDetailsToCustomerDetails,
  fillMinimalAddressContinue,
  fillMinimalEmploymentContinue,
  fillMinimalFinancialContinue,
  fillValidIndividualPersonalBorrower,
  openDashboard,
  openPostSubmissionFromFreshQuote,
  openStandardQuoteFromDashboard,
  prepareCalculableCsaQuote,
  standardQuoteRoot,
} from "../../doRegressionTestSuite/workflow.helpers";
import { ensureCsaProductAndProgram } from "../../doRegressionTestSuite/assetDetailsAddAsset.helpers";
import {
  FL_SQ_PRODUCT,
  FL_SQ_PROGRAM,
} from "../../doRegressionTestSuite/fl.helpers";
import { DOPersonalDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import { DOReferenceDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/referenceDetails";
import { DOBusinessDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/businessDetails";
import { DOSearchCustomerDialog } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/searchCustomerDialog";
import { DOSoleTraderDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/soleTraderDetails";
import {
  DOC_T3824_BORROWER,
  openPostSubmissionUploadStepWithAsset,
} from "../../doRegressionTestSuite/documentation.helpers";
import { DOTrustDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/trustDetails";

export const CSA_QQ_PRODUCT = CSA_SQ_PRODUCT;
/** CSAC Quick Quote program (matches `CSAcAssigned.test.ts` / Quick Quote CSA regression). */
export const CSA_QQ_PROGRAM = "CSA Personal - MV Dealer";

export {
  CSA_SQ_PRODUCT,
  CSA_SQ_PROGRAM,
  TLC_DEALER,
  FL_SQ_PRODUCT,
  FL_SQ_PROGRAM,
  standardQuoteRoot,
  openDashboard,
  openStandardQuoteFromDashboard,
  openPostSubmissionFromFreshQuote,
  prepareCalculableCsaQuote,
  addMinimalUsedAsset,
  fillValidIndividualPersonalBorrower,
  fillMinimalAddressContinue,
  fillMinimalEmploymentContinue,
  fillMinimalFinancialContinue,
};

let origRefCounter = 0;

/** Unique origination reference per test run (avoids grid collisions). */
export function uniqueOrigRef(prefix = "SAN"): string {
  origRefCounter += 1;
  return `${prefix}-${Date.now()}-${origRefCounter}`;
}

/** Quote ID from `/standard-quote/edit/{id}` while still on the quote wizard. */
export function readStandardQuoteIdFromUrl(page: Page): string {
  return page.url().match(/standard-quote\/edit\/(\d+)/i)?.[1]?.trim() ?? "";
}

/** Dashboard → reopen quote by ID (preferred) or origination reference listing search. */
export async function reopenSanityQuoteOnDashboard(
  page: Page,
  opts: { origRef: string; quoteId?: string },
): Promise<DODashboardPage> {
  const quoteId = opts.quoteId?.trim() || readStandardQuoteIdFromUrl(page);
  const dashboard = await openDashboard(page);
  if (quoteId) {
    await dashboard.openQuoteById(quoteId);
  } else {
    await dashboard.openOpenQuoteFromListingByReference(opts.origRef);
  }
  return dashboard;
}

/** Reopened quotes land on Asset Details — open Customer Details and assert primary borrower. */
export async function expectSanityPrimaryBorrowerOnCustomerDetailsStep(page: Page): Promise<void> {
  const asset = new DOAssetDetailsPage(page);
  await asset.clickStandardQuoteStepTab(/Customer Details/i);
  const customer = new DOCustomerDetailsPage(page);
  await customer.waitForAddBorrowerButton();
  await expect(standardQuoteRoot(page)).toContainText(/Liza|Marie|Doe/i, { timeout: 60_000 });
}

export async function selectCsaProductAndProgram(asset: DOAssetDetailsPage): Promise<void> {
  await ensureCsaProductAndProgram(asset.page, asset);
}

/** Assert a CSA/MV dealer program is selected (Webform or MYUDC dealer default on QAT). */
export async function expectCsaSanityProgramSelected(asset: DOAssetDetailsPage): Promise<void> {
  const programLabel = (await asset.readSelectedProgramLabel().catch(() => "")).trim();
  expect(programLabel.length).toBeGreaterThan(0);
  expect(programLabel).toMatch(/CSA|MYUDC|MV\s*Dealer/i);
}

export function promotionQuoteCheckbox(page: Page): Locator {
  const root = standardQuoteRoot(page);
  return root
    .locator("p-checkbox")
    .filter({
      has: root
        .locator("label.p-checkbox-label")
        .filter({ hasText: /Promotion\s+Quote/i }),
    })
    .first()
    .or(root.getByRole("checkbox", { name: /Promotion\s+Quote/i }).first());
}

export async function openSanityQuickQuote(page: Page): Promise<{
  dashboard: DODashboardPage;
  quickQuote: DOQuickQuotePage;
}> {
  const dashboard = await openDashboard(page);
  const quickQuote = new DOQuickQuotePage(page);
  await quickQuote.openQuickQuote();
  await expect(quickQuote.quickQuoteRoot).toBeVisible({ timeout: 90_000 });
  return { dashboard, quickQuote };
}

export async function selectCsaQuickQuoteProductAndProgram(quickQuote: DOQuickQuotePage): Promise<void> {
  await quickQuote.selectProduct(CSA_QQ_PRODUCT);
  await quickQuote.dismissQuickQuoteDropdownOverlays();
  if (await quickQuote.programDropdownTrigger.isEnabled().catch(() => false)) {
    await quickQuote.selectProgram(CSA_QQ_PROGRAM);
  }
  await quickQuote.dismissQuickQuoteDropdownOverlays();
}

/** CSAC Quick Quote — mandatory payment fields (aligned with `QuickQuote_CSA.test.ts`). */
export async function fillSanityCsaQuickQuote(quickQuote: DOQuickQuotePage): Promise<void> {
  await selectCsaQuickQuoteProductAndProgram(quickQuote);
  await quickQuote.selectFrequency("Monthly").catch(() => {});
  await quickQuote.enterInterestRatePercent("9");
  await quickQuote.enterTermsMonths("36");
  await quickQuote.enterCashPrice("$20,000");
  await quickQuote.enterDepositPercent("10%").catch(() => {});
  await quickQuote.enterBalloonPercent("0").catch(() => {});
  await expect
    .poll(
      async () => {
        const box = quickQuote.quickQuoteForm.locator(".p-checkbox-box").first();
        return box.evaluate((el) => !el.classList.contains("p-disabled"));
      },
      { timeout: 30_000 },
    )
    .toBe(true)
    .catch(() => {});
  await quickQuote.confirmTermsAndConditions().catch(() => {});
}

export async function openSanityCsaAssetDetails(
  page: Page,
  origRef?: string,
): Promise<{
  asset: DOAssetDetailsPage;
  addAsset: DOAddAssetPage;
  origRef: string;
}> {
  const ref = origRef ?? uniqueOrigRef("SQ");
  const asset = await openStandardQuoteFromDashboard(page);
  const addAsset = new DOAddAssetPage(page);
  await selectCsaProductAndProgram(asset);
  return { asset, addAsset, origRef: ref };
}

export async function openSanityCustomerDetailsStep(
  page: Page,
  origRef?: string,
): Promise<{
  asset: DOAssetDetailsPage;
  customer: DOCustomerDetailsPage;
  origRef: string;
}> {
  const ref = origRef ?? uniqueOrigRef("CD");
  const asset = await openStandardQuoteFromDashboard(page);
  const addAsset = new DOAddAssetPage(page);
  await selectCsaProductAndProgram(asset);
  await prepareCalculableCsaQuote(asset, addAsset, ref);
  await advanceAssetDetailsToCustomerDetails(asset, ref);
  return { asset, customer: new DOCustomerDetailsPage(page), origRef: ref };
}

export function assetInsuranceSummaryDialog(page: Page): Locator {
  return page
    .getByRole("dialog")
    .filter({ hasText: /Asset/i })
    .filter({ hasText: /Insurance|Summary/i })
    .last();
}

export const MOTOCHEK_SANITY_REGO = process.env.MOTOCHEK_SANITY_REGO?.trim() || "BAGGED";

export type ManualAssetDetails = {
  value?: string;
  condition?: string;
  year?: string;
  make?: string;
  model?: string;
  variant?: string;
  rego?: string;
  vin?: string;
  odometer?: string;
  colour?: string;
  serialNo?: string;
  engineNo?: string;
  ccRating?: string;
  motivePower?: string;
  countryRegistered?: string;
  assetLocation?: string;
};

const DEFAULT_MANUAL_ASSET: Required<ManualAssetDetails> = {
  value: "$20,000",
  condition: "Used",
  year: "2025",
  make: "Toyota",
  model: "Hilux",
  variant: "Top",
  rego: "TG08BP5123",
  vin: "1HGCM82633A004352",
  odometer: "50000",
  colour: "Black",
  serialNo: "0999944477",
  engineNo: "1133445588",
  ccRating: "5",
  motivePower: "Petrol",
  countryRegistered: "New Zealand",
  assetLocation: "North Island",
};

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
          if (await loaders.nth(i).isVisible().catch(() => false)) {
            return false;
          }
        }
        return true;
      },
      { timeout: timeoutMs },
    )
    .toBe(true);
}

async function tradeInSearchAssetDialog(page: Page): Promise<Locator> {
  const dlg = page
    .getByRole("dialog")
    .filter({ hasText: /Search Trade-?\s*in\s*Asset/i })
    .last();
  await dlg.waitFor({ state: "visible", timeout: 30_000 });
  return dlg;
}

async function physicalSearchAssetDialog(page: Page): Promise<Locator> {
  const dlg = page.getByRole("dialog", { name: /Search Asset/i });
  await dlg.waitFor({ state: "visible", timeout: 30_000 });
  return dlg;
}

async function clickSearchAndAddAssetFromInsuranceSummary(page: Page): Promise<void> {
  const summaryDlg = assetInsuranceSummaryDialog(page);
  await expect(summaryDlg).toBeVisible({ timeout: 45_000 });
  const trigger = summaryDlg
    .getByRole("link", { name: /Search\s*&\s*Add\s+Asset/i })
    .or(summaryDlg.getByRole("button", { name: /Search\s*&\s*Add\s+Asset/i }))
    .or(summaryDlg.locator("a, button, [role='button']").filter({ hasText: /Search\s*&\s*Add\s+Asset/i }))
    .first();
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await trigger.click({ timeout: 15_000 });
  await physicalSearchAssetDialog(page);
}

async function openPhysicalSearchAssetDialog(
  page: Page,
  asset: DOAssetDetailsPage,
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
    await asset.openAssetInsuranceTradeInSummary();
    await clickSearchAndAddAssetFromInsuranceSummary(page);
  }
  return physicalSearchAssetDialog(page);
}

async function ensureMotochekSelected(dlg: Locator): Promise<void> {
  const host = dlg.locator("p-radiobutton").filter({ hasText: /Motocheck|Motochek/i }).first();
  const input = host.locator('input[type="radio"]').first();
  if (await input.isChecked().catch(() => false)) {
    return;
  }
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

function motochekEnterNumberInput(dlg: Locator): Locator {
  return dlg
    .getByText(/Enter Number/i)
    .first()
    .locator("xpath=following::input[@id='text' and contains(@class,'p-inputtext')][1]")
    .or(dlg.locator("input#text.p-inputtext.p-component").first())
    .or(dlg.locator("input#text[type='text']").first())
    .first();
}

async function selectMotochekSearchBy(page: Page, dlg: Locator, option: RegExp): Promise<void> {
  const searchByCombo = dlg
    .getByRole("combobox", { name: /Search [Bb]y|Rego Number|VIN Number/i })
    .or(dlg.locator("p-dropdown").filter({ hasText: /Search [Bb]y/i }))
    .or(dlg.getByRole("combobox").first())
    .first();
  if (!(await searchByCombo.isVisible({ timeout: 10_000 }).catch(() => false))) {
    return;
  }
  const label = ((await searchByCombo.textContent()) ?? "").replace(/\s+/g, " ").trim();
  if (option.test(label)) {
    return;
  }
  await searchByCombo.click({ timeout: 15_000 });
  await page.getByRole("option", { name: option }).first().click({ timeout: 10_000 });
  await page.keyboard.press("Escape").catch(() => {});
}

async function clickMotochekSearchButton(dlg: Locator): Promise<void> {
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

async function expectMotochekSearchSuccess(dlg: Locator): Promise<void> {
  await expect
    .poll(
      async () => {
        if (!(await dlg.isVisible().catch(() => false))) {
          return false;
        }
        const body = ((await dlg.innerText().catch(() => "")) ?? "").replace(/\u00a0/g, " ");
        if (
          /Motocheck Successfully|Motochek Successfully|Successfully Executed|Successfully Completed|Executed Successfully|Search Completed/i.test(
            body,
          )
        ) {
          return true;
        }
        return /Make\s*[:\n]?\s*\S+/i.test(body) && /Model\s*[:\n]?\s*\S+/i.test(body);
      },
      { timeout: 90_000, intervals: [500, 1_000, 2_000] },
    )
    .toBe(true);
}

async function runMotochekRegoSearch(page: Page, dlg: Locator, rego: string): Promise<void> {
  await ensureMotochekSelected(dlg);
  await selectMotochekSearchBy(page, dlg, /Rego Number/i);
  const enterNumber = motochekEnterNumberInput(dlg);
  await enterNumber.waitFor({ state: "visible", timeout: 15_000 });
  await enterNumber.fill(rego);
  await clickMotochekSearchButton(dlg);
  await expectMotochekSearchSuccess(dlg);
}

function motochekProceedButton(dlg: Locator): Locator {
  return dlg
    .getByRole("button", { name: /^Continue$/i })
    .or(dlg.locator("button, a").filter({ hasText: /^Continue$/i }))
    .or(dlg.getByRole("button", { name: /^Add Asset$/i }))
    .or(dlg.locator("button, a").filter({ hasText: /^\s*Add Asset\s*$/i }))
    .or(dlg.getByRole("button", { name: /^Add Trade$/i }))
    .or(dlg.locator("button, a").filter({ hasText: /Add Trade/i }))
    .first();
}

async function clickMotochekProceed(dlg: Locator): Promise<void> {
  const btn = motochekProceedButton(dlg);
  await expect(btn).toBeVisible({ timeout: 30_000 });
  await expect(btn).toBeEnabled({ timeout: 30_000 });
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ timeout: 15_000 });
}

type MotochekDialogFields = {
  make: string;
  model: string;
  year: string;
  rego?: string;
  vin?: string;
};

async function parseMotochekDialogFields(dlg: Locator): Promise<MotochekDialogFields> {
  const body = ((await dlg.innerText()) ?? "").replace(/\u00a0/g, " ");
  const pick = (label: string): string => {
    const m = body.match(new RegExp(`${label}\\s*[:\\n]?\\s*([^\\n]+)`, "i"));
    return (m?.[1] ?? "").trim();
  };
  const yearRaw = pick("Year");
  const yearMatch = yearRaw.match(/\d{4}/);
  return {
    make: pick("Make"),
    model: pick("Model"),
    year: yearMatch?.[0] ?? yearRaw,
    rego: pick("Rego No") || pick("Rego"),
    vin: pick("VIN"),
  };
}

async function clickTradeInMotochekProceed(dlg: Locator): Promise<void> {
  const btn = dlg
    .getByRole("button", { name: /^Add Trade$/i })
    .or(dlg.locator("button, a").filter({ hasText: /Add Trade/i }))
    .or(motochekProceedButton(dlg))
    .first();
  await expect(btn).toBeVisible({ timeout: 30_000 });
  await expect(btn).toBeEnabled({ timeout: 30_000 });
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ timeout: 15_000 });
  await dlg.page().waitForLoadState("domcontentloaded").catch(() => {});
}

async function tradeInFormPopulated(addAsset: DOAddAssetPage): Promise<boolean> {
  const make = (await addAsset.makeInputField.first().inputValue().catch(() => "")).trim();
  const model = (await addAsset.modelInputField.first().inputValue().catch(() => "")).trim();
  const year = (await addAsset.yearInputField.first().inputValue().catch(() => "")).trim();
  return make.length > 0 && model.length > 0 && /\d{4}/.test(year);
}

/** Add Trade route may not copy Motochek hits — refill mandatory identity from search dialog text. */
async function ensureTradeInFormPopulated(
  addAsset: DOAddAssetPage,
  moto: MotochekDialogFields,
): Promise<void> {
  if (await tradeInFormPopulated(addAsset).catch(() => false)) {
    return;
  }
  if (moto.year) {
    await addAsset.selectYear(moto.year).catch(async () => {
      await addAsset.yearInputField.first().fill(moto.year);
    });
  }
  if (moto.make) {
    await addAsset.enterMake(moto.make);
  }
  if (moto.model) {
    await addAsset.enterModel(moto.model);
  }
  if (moto.rego) {
    await addAsset.enterRegoNO(moto.rego).catch(() => {});
  }
  if (moto.vin) {
    await addAsset.enterVIN(moto.vin).catch(() => {});
  }
  await expect.poll(() => tradeInFormPopulated(addAsset), { timeout: 20_000 }).toBe(true);
}

async function returnFromAddTradeRouteToStandardQuote(page: Page): Promise<void> {
  const root = standardQuoteRoot(page);
  if (await root.isVisible({ timeout: 5_000 }).catch(() => false)) {
    return;
  }
  if (/\/asset\/addTrade/i.test(page.url())) {
    const cancel = page.getByRole("button", { name: /^Cancel$/i }).first();
    if (await cancel.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await cancel.click({ timeout: 15_000 }).catch(() => {});
      await page.waitForLoadState("domcontentloaded").catch(() => {});
    }
  }
  if (await root.isVisible({ timeout: 8_000 }).catch(() => false)) {
    return;
  }
  const quoteCrumb = page
    .getByRole("link", { name: /Standard Quote\s*-/i })
    .or(page.getByRole("link", { name: /Create Standard Quote/i }))
    .first();
  if (await quoteCrumb.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await quoteCrumb.click({ timeout: 15_000 });
  } else {
    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
  }
  await expect(root).toBeVisible({ timeout: 120_000 });
}

async function waitForReturnToStandardQuote(page: Page, asset: DOAssetDetailsPage): Promise<void> {
  await returnFromAddTradeRouteToStandardQuote(page);
  await asset.waitForAssetDetailsStepReady();
}

async function isConditionAlreadySelected(addAsset: DOAddAssetPage, condition: string): Promise<boolean> {
  const pattern = new RegExp(condition, "i");
  const combos = addAsset.conditionDropdown.getByRole("combobox");
  const count = await combos.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    const combo = combos.nth(i);
    const aria = (await combo.getAttribute("aria-label").catch(() => "")) ?? "";
    const text = ((await combo.textContent().catch(() => "")) ?? "").trim();
    if (pattern.test(aria) || pattern.test(text)) {
      return true;
    }
  }
  const hostText = ((await addAsset.conditionDropdown.textContent().catch(() => "")) ?? "").trim();
  return pattern.test(hostText);
}

async function selectConditionIfNeeded(addAsset: DOAddAssetPage, condition: string): Promise<void> {
  if (await isConditionAlreadySelected(addAsset, condition)) {
    return;
  }
  await addAsset.selectCondition(condition);
}

export async function fillManualAssetDetails(
  addAsset: DOAddAssetPage,
  details: ManualAssetDetails = {},
  opts?: { afterClear?: boolean },
): Promise<void> {
  const d = { ...DEFAULT_MANUAL_ASSET, ...details };

  if (opts?.afterClear) {
    // Edit route: condition stays **Used**; refill identity + value after text clear.
    await addAsset.selectYear(d.year);
    await addAsset.enterMake(d.make);
    await addAsset.enterModel(d.model);
    await addAsset.enterVariant(d.variant);
    await addAsset.enterAssetValue(d.value);
  } else {
    // New asset wizard: asset value entry waits for loaders to finish first.
    await addAsset.enterAssetValue(d.value);
    await selectConditionIfNeeded(addAsset, d.condition);
    await addAsset.selectYear(d.year);
    await addAsset.enterMake(d.make);
    await addAsset.enterModel(d.model);
    await addAsset.enterVariant(d.variant);
  }

  await addAsset.enterRegoNO(d.rego);
  await addAsset.enterVIN(d.vin);
  await addAsset.enterOdometer(d.odometer);
  await addAsset.enterColour(d.colour);
  await addAsset.enterSerialNO(d.serialNo);
  await addAsset.enterEngineNO(d.engineNo);
  await addAsset.enterCCRating(d.ccRating);
  await addAsset.chooseMotivePower(d.motivePower);
  await addAsset.chooseCountryRegistered(d.countryRegistered);
  await addAsset.chooseAssetLocation(d.assetLocation);
}

export async function clearManualAssetEditableFields(addAsset: DOAddAssetPage): Promise<void> {
  const clearInput = async (input: Locator): Promise<void> => {
    if (!(await input.isVisible({ timeout: 1_000 }).catch(() => false))) {
      return;
    }
    if (!(await input.isEditable().catch(() => false))) {
      return;
    }
    await input.fill("", { timeout: 5_000 }).catch(async () => {
      await input.click({ timeout: 3_000 }).catch(() => {});
      await input.press("ControlOrMeta+a").catch(() => {});
      await input.press("Backspace").catch(() => {});
    });
    await input.press("Tab").catch(() => {});
  };

  // Do not clear asset value — PrimeNG currencymask corrupts; `enterAssetValue` replaces safely.
  await clearInput(addAsset.yearInputField.first());
  await clearInput(addAsset.makeInputField.first());
  await clearInput(addAsset.modelInputField.first());
  await clearInput(addAsset.variantInputField.first());
  await clearInput(addAsset.regoNOInputField.first());
  await clearInput(addAsset.vinInputField.first());
  await clearInput(addAsset.odometerInputField.first());
  await clearInput(addAsset.colourInputField.first());
  await clearInput(addAsset.serialNOInputField.first());
  await clearInput(addAsset.engineNOInputField.first());
  await clearInput(addAsset.ccRatingInputField.first());
}

export async function expectSummaryPhysicalAssetCount(page: Page, count: number): Promise<void> {
  const summaryDlg = assetInsuranceSummaryDialog(page);
  await expect(summaryDlg).toBeVisible({ timeout: 30_000 });
  const rows = physicalAssetSummaryRows(summaryDlg);
  await expect(rows).toHaveCount(count, { timeout: 30_000 });
}

function physicalAssetSummaryRows(summaryDlg: Locator): Locator {
  return summaryDlg
    .locator("table")
    .first()
    .locator("tbody tr")
    .filter({ hasText: /.+/ })
    .filter({ hasNotText: /^\s*\d+\s+-\s*-\s*-\s*-/i });
}

export async function addPhysicalAssetViaMotocheck(
  page: Page,
  asset: DOAssetDetailsPage,
  addAsset: DOAddAssetPage,
  assetValue = "$20,000",
): Promise<{ make: string; model: string }> {
  // Do not call enterAsset/selectCondition first — that auto-creates an empty placeholder
  // physical row; Search & Add via Motocheck would then add a second row (UDP-T4187).
  const searchDlg = await openPhysicalSearchAssetDialog(page, asset);
  await runMotochekRegoSearch(page, searchDlg, MOTOCHEK_SANITY_REGO);
  await clickMotochekProceed(searchDlg);

  await addAsset.makeInputField.first().waitFor({ state: "visible", timeout: 60_000 });
  const make = (await addAsset.makeInputField.first().inputValue()).trim();
  const model = (await addAsset.modelInputField.first().inputValue()).trim();
  expect(make.length).toBeGreaterThan(0);
  expect(model.length).toBeGreaterThan(0);

  await addAsset.enterAssetValue(assetValue);
  if (await addAsset.conditionDropdown.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await addAsset.selectCondition("Used").catch(() => {});
  }
  await addAsset.chooseMotivePower("Petrol").catch(() => {});
  await addAsset.chooseCountryRegistered("New Zealand").catch(() => {});
  await addAsset.chooseAssetLocation("North Island").catch(() => {});
  await addAsset.clickSummitButton();
  await addAsset.clickCrossButton().catch(() => {});
  await asset.closeSearchAddAssetDialogIfOpen().catch(() => {});

  await asset.openAssetInsuranceTradeInSummary();
  const summaryDlg = assetInsuranceSummaryDialog(page);
  await expect(summaryDlg).toContainText(new RegExp(escapeRegex(make), "i"));
  await expect(summaryDlg).toContainText(new RegExp(escapeRegex(model), "i"));
  await expect(summaryDlg.getByText(/\$[\d,]+\.\d{2}/).first()).toBeVisible({ timeout: 20_000 });
  await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
  return { make, model };
}

export async function addTradeInAssetViaMotocheck(
  page: Page,
  asset: DOAssetDetailsPage,
  addAsset: DOAddAssetPage,
  tradeValue = "$5,000",
): Promise<{ make: string; model: string; tradeValue: string }> {
  await asset.openAssetInsuranceTradeInSummary();
  await asset.clickSearchAddTradeInAndExpectChooserOpened();
  const tradeDlg = await tradeInSearchAssetDialog(page);
  await runMotochekRegoSearch(page, tradeDlg, MOTOCHEK_SANITY_REGO);
  const motoFields = await parseMotochekDialogFields(tradeDlg);
  expect(motoFields.make.length).toBeGreaterThan(0);
  expect(motoFields.model.length).toBeGreaterThan(0);
  expect(motoFields.year.length).toBeGreaterThan(0);

  await clickTradeInMotochekProceed(tradeDlg);

  await addAsset.makeInputField.first().waitFor({ state: "visible", timeout: 60_000 });
  await ensureTradeInFormPopulated(addAsset, motoFields);
  const make =
    (await addAsset.makeInputField.first().inputValue().catch(() => "")).trim() || motoFields.make;
  const model =
    (await addAsset.modelInputField.first().inputValue().catch(() => "")).trim() || motoFields.model;

  await addAsset.enterAssetValue(tradeValue);
  if (await addAsset.conditionDropdown.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await addAsset.selectCondition("Used").catch(() => {});
  }
  await addAsset.chooseMotivePower("Petrol").catch(() => {});
  await addAsset.clickSummitButton();
  await addAsset.clickCrossButton().catch(() => {});
  await waitForReturnToStandardQuote(page, asset);

  await asset.openAssetInsuranceTradeInSummary();
  const summaryDlg = assetInsuranceSummaryDialog(page);
  await expect(summaryDlg).toBeVisible({ timeout: 30_000 });
  if (make.length > 0) {
    await expect(summaryDlg).toContainText(new RegExp(escapeRegex(make), "i"));
  }
  if (model.length > 0) {
    await expect(summaryDlg).toContainText(new RegExp(escapeRegex(model), "i"));
  }
  await expect(summaryDlg.getByText(/Trade/i).first()).toBeVisible({ timeout: 15_000 });
  await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
  return { make, model, tradeValue };
}

export async function editManualAssetClearAndRefill(
  asset: DOAssetDetailsPage,
  addAsset: DOAddAssetPage,
  after: ManualAssetDetails,
): Promise<void> {
  await asset.openAssetInsuranceTradeInSummary();
  await asset.clickAssetSummaryEditButton();
  await addAsset.makeInputField.first().waitFor({ state: "visible", timeout: 60_000 });
  // Overwrite in place — clearing PrimeNG fields on the edit route breaks bindings.
  await fillManualAssetDetails(addAsset, after, { afterClear: true });
  await addAsset.clickSummitButton();
  await addAsset.clickCrossButton();
  await asset.waitForAssetDetailsStepReady();
}

export async function addSecondDistinctManualAssetViaSummary(
  page: Page,
  asset: DOAssetDetailsPage,
  addAsset: DOAddAssetPage,
  details: ManualAssetDetails,
): Promise<void> {
  await openCopiedAssetEditorFromSummary(page, asset, addAsset);
  await fillManualAssetDetails(addAsset, details, { afterClear: true });
  await addAsset.clickSummitButton();
  await addAsset.clickCrossButton();
  await asset.waitForAssetDetailsStepReady();
  await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
}

/** Summary **copy** icon — opens Add Asset with copied values; does not submit. */
export async function openCopiedAssetEditorFromSummary(
  page: Page,
  asset: DOAssetDetailsPage,
  addAsset: DOAddAssetPage,
): Promise<void> {
  await asset.openAssetInsuranceTradeInSummary();
  const summaryDlg = assetInsuranceSummaryDialog(page);
  await expect(summaryDlg).toBeVisible({ timeout: 30_000 });
  const copyIcon = summaryDlg
    .locator("i.fa-clone.cursor-pointer, i.fa-clone, i.fa-regular.fa-clone")
    .first();
  await expect(copyIcon).toBeVisible({ timeout: 20_000 });
  await copyIcon.click({ timeout: 15_000 });
  await addAsset.makeInputField.first().waitFor({ state: "visible", timeout: 60_000 });
}

/** @deprecated Use {@link openCopiedAssetEditorFromSummary} when values must be edited before submit. */
export async function copyAssetFromSummary(page: Page, asset: DOAssetDetailsPage): Promise<void> {
  const addAsset = new DOAddAssetPage(page);
  await openCopiedAssetEditorFromSummary(page, asset, addAsset);
  await addAsset.clickSummitButton();
  await addAsset.clickCrossButton();
  await asset.waitForAssetDetailsStepReady();
  await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
}

export async function addManualAssetViaSummary(
  asset: DOAssetDetailsPage,
  addAsset: DOAddAssetPage,
  details: ManualAssetDetails = {},
): Promise<void> {
  await asset.enterAsset("Car and Light Commercial /");
  await asset.selectCondition("Used");
  await asset.openAssetInsuranceTradeInSummary();
  await asset.clickAssetSummaryEditButton();
  await fillManualAssetDetails(addAsset, details);
  await addAsset.clickSummitButton();
  await addAsset.clickCrossButton();
  await asset.waitForAssetDetailsStepReady();
}

export async function removeLastAssetFromSummary(page: Page, asset: DOAssetDetailsPage): Promise<void> {
  await asset.openAssetInsuranceTradeInSummary();
  const summaryDlg = assetInsuranceSummaryDialog(page);
  await expect(summaryDlg).toBeVisible({ timeout: 30_000 });
  const rowsBefore = await summaryDlg.locator("tbody tr, .asset-row, tr").count();
  const trash = summaryDlg
    .locator("i.fa-trash, i.fa-trash-can, i.fa-light.fa-trash-can, .pi-trash")
    .last();
  await expect(trash).toBeVisible({ timeout: 15_000 });
  await trash.click({ timeout: 15_000 });
  await expect
    .poll(async () => summaryDlg.locator("tbody tr, .asset-row, tr").count(), { timeout: 20_000 })
    .toBeLessThan(rowsBefore);
  await asset.closeAssetInsuranceSummaryDialog().catch(() => {});
}

export async function openAddOnsFromAssetDetails(asset: DOAssetDetailsPage): Promise<DOAddOnsAccessoriesPage> {
  await asset.clickAddonsAndAccessoriesAndExpectScreen();
  const addOns = new DOAddOnsAccessoriesPage(asset.page);
  return addOns;
}

export async function fillMinimalIndividualBorrowerThroughReference(
  page: Page,
  customer: DOCustomerDetailsPage,
): Promise<DOReferenceDetailsPage> {
  await customer.clickAddBorrowersOrGuarantors();
  await customer.searchCustomer.searchByUdcNumber("420");
  await customer.clickAddNewCustomerButton();
  const personal = new DOPersonalDetailsPage(page);
  await fillValidIndividualPersonalBorrower(personal);
  await personal.clickNextButton();
  const address = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, address);
  const emp = new DOEmploymentDetailsPage(page);
  await fillMinimalEmploymentContinue(emp);
  const fin = new DOFinancialPositionPage(page);
  await fillMinimalFinancialContinue(fin);
  const ref = new DOReferenceDetailsPage(page);
  await ref.waitForReferenceDetailsStep();
  return ref;
}

/** FIS existing individual — search UDC, **Add** on borrower result, advance to Reference Details. */
export async function fillExistingIndividualBorrowerThroughReference(
  page: Page,
  customer: DOCustomerDetailsPage,
  udcCustomerNumber: string,
): Promise<DOReferenceDetailsPage> {
  await customer.clickAddBorrowersOrGuarantors();
  await customer.searchCustomer.addExistingCustomerFromUdcSearch(udcCustomerNumber);
  const personal = new DOPersonalDetailsPage(page);
  await expect(personal.personalDetailsRoot).toBeVisible({ timeout: 120_000 });
  await personal.clickNextButton();
  const address = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, address);
  const emp = new DOEmploymentDetailsPage(page);
  await fillMinimalEmploymentContinue(emp);
  const fin = new DOFinancialPositionPage(page);
  await fillMinimalFinancialContinue(fin);
  await navigateToBorrowerSummaryIfAvailable(page);
  const ref = new DOReferenceDetailsPage(page);
  await ref.waitForReferenceDetailsStep();
  return ref;
}

/** Leave individual/borrower wizard and reopen Standard Quote **Customer Details**. */
export async function returnToStandardQuoteCustomerDetailsStep(
  page: Page,
  customer: DOCustomerDetailsPage,
  origRef?: string,
): Promise<void> {
  const quoteId =
    page.url().match(/individual\/edit\/(\d+)/i)?.[1] ??
    page.url().match(/standard-quote\/create\/(\d+)/i)?.[1];
  if (!quoteId) {
    throw new Error(`Cannot resolve quote id from URL: ${page.url()}`);
  }
  const dealerBase = DO_DEALER_STANDARD_QUOTE_URL().replace(/\/$/, "");
  await page.goto(`${dealerBase}/standard-quote/create/${quoteId}`);
  await page.waitForLoadState("domcontentloaded").catch(() => {});

  const asset = new DOAssetDetailsPage(page);
  await asset.waitForAssetDetailsStepReady().catch(() => {});
  if (origRef) {
    await asset.enterOriginationReference(origRef).catch(() => {});
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    await asset.clickNextButton();
    try {
      await customer.waitForAddBorrowerButton();
      return;
    } catch (err) {
      if (attempt === 2) {
        throw err;
      }
      if (origRef) {
        await asset.enterOriginationReference(origRef).catch(() => {});
      }
      await asset.waitForLoadingComplete().catch(() => {});
    }
  }
}

/**
 * FIS existing individual added to the quote (borrower search **Add**), then return to Customer Details grid.
 */
export async function saveExistingIndividualBorrowerOnCustomerDetailsQuote(
  page: Page,
  udcCustomerNumber: string,
  origRef?: string,
): Promise<DOCustomerDetailsPage> {
  const { customer } = await openSanityCustomerDetailsStep(page, origRef);
  await customer.clickAddBorrowersOrGuarantors();
  await customer.searchCustomer.addExistingCustomerFromUdcSearch(udcCustomerNumber);
  const personal = new DOPersonalDetailsPage(page);
  await expect(personal.personalDetailsRoot).toBeVisible({ timeout: 120_000 });
  await personal.clickSavePersonalDetails();
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await returnToStandardQuoteCustomerDetailsStep(page, customer, origRef);
  return customer;
}

/** Save an existing FIS individual on the quote through Reference submit → Upload. */
export async function advanceExistingIndividualBorrowerFromUdcToPostSubmission(
  page: Page,
  udcCustomerNumber: string,
  origRef?: string,
): Promise<DOCustomerQuotePostSubmitPage> {
  const { customer } = await openSanityCustomerDetailsStep(page, origRef);
  const ref = await fillExistingIndividualBorrowerThroughReference(page, customer, udcCustomerNumber);
  await ref.clickAddContactDetails();
  await ref.selectContactType("Accountant");
  await ref.enterContactFirstName("Alex");
  await ref.enterContactLastName("Referee");
  await ref.clickAddContactInModal();
  await ref.confirmCustomerDetailsCorrect();
  await ref.advanceFromReferenceDetailsToPostSubmission();
  const post = new DOCustomerQuotePostSubmitPage(page);
  await post.waitForUploadStep();
  return post;
}

export async function addSignatoryContactToReference(
  ref: DOReferenceDetailsPage,
  opts: {
    contactType?: string;
    firstName: string;
    lastName: string;
    email: string;
    mobileAreaCode?: string;
    mobileNumber?: string;
  },
): Promise<void> {
  await ref.clickAddContactDetails();
  await ref.selectContactType(opts.contactType ?? "Accountant");
  await ref.enterContactFirstName(opts.firstName);
  await ref.enterContactLastName(opts.lastName);
  await ref.enterContactMobileAreaCode(opts.mobileAreaCode ?? "123");
  await ref.enterContactMobileNumber(opts.mobileNumber ?? "897897897");
  await ref.enterContactEmail(opts.email);
  await ref.setContactSignatoryYes();
  await ref.clickAddContactInModal();
  await ref.expectContactListedInAdvisoryTable({
    firstName: opts.firstName,
    lastName: opts.lastName,
    email: opts.email,
    phoneFragment: opts.mobileNumber ?? "897897897",
    signatory: true,
  });
  await ref.expectSigningOrderEditableForContact(opts.firstName);
}

/** Trust borrower — all mandatory steps through Reference Details with a signatory contact. */
export const SANITY_TRUST_NAME = "Sanity Family Trust";

export async function fillSanityTrustCustomerFullDataWithSignatories(
  page: Page,
  trust: DOTrustDetailsPage,
): Promise<DOReferenceDetailsPage> {
  await trust.selectTrustTypeFirstAvailableOption();
  await trust.enterTrustName(SANITY_TRUST_NAME);
  await trust.enterRegisteredNumber("12345678");
  await trust.enterGstNumber("123456789");
  await trust.enterTrustPurpose("Sanity automation trust borrower.");
  await trust.selectPrimaryNatureOfTrustFirstAvailableOption();
  await trust.enterTimeInTrustYearsMonths("5", "3");
  await trust.enterBusinessPhone("21", "1234567");
  await trust.enterContactEmail("trust.sanity@example.com");
  await trust.clickNextTrustDetails();

  const address = new DOAddressDetailsPage(page);
  await address.fillTrustPhysicalAddressMandatoryCore({
    years: "3",
    months: "0",
    streetNumber: "100",
    streetName: "Queen Street",
    city: "Auckland",
  });
  await address.fillTrustPreviousPhysicalAddressMandatoryCore({
    years: "2",
    months: "0",
    streetNumber: "50",
    streetName: "Lambton Quay",
    city: "Wellington",
  });
  await address.setTrustReuseForPostalAddressOn();
  await address.setTrustReuseForRegisteredAddressOn();
  await address.fillTrustRegisteredTimeAtAddressAfterReuse("1", "0");
  await address.clickNextButton();

  const fin = new DOFinancialPositionPage(page);
  await fin.fillTrustFinancialPositionComplete({
    netProfit: "$25,000.00",
    turnoverLatestAmount: "$10,000.00",
    turnoverYearEnding: "25/05/2026",
    balanceCash: "$10,000.00",
    balanceDebtor: "$2,500.00",
    balanceCreditor: "$1,500.00",
    balanceOverdraft: "$0.00",
    assetPersonalProperty: "$5,000.00",
    assetVehicle: "$18,000.00",
    assetOther: "$2,000.00",
    liabilityMortgage: "$850.00",
    liabilityLoans: "$300.00",
    liabilityCreditCards: "$150.00",
    liabilityOther: "$100.00",
  });
  await page.getByText(/Add Trustees Details/i).waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
  await fin.clickNextButton();

  const ref = new DOReferenceDetailsPage(page);
  await ref.waitForReferenceDetailsStep();
  await addSignatoryContactToReference(ref, {
    contactType: "Trustee",
    firstName: "Trust",
    lastName: "Signatory",
    email: "trust.signatory@example.com",
  });
  await ref.confirmCustomerDetailsCorrect();
  await page.getByRole("button", { name: /^Save$/i }).last().click({ timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
  await ref.expectContactListedInAdvisoryTable({
    firstName: "Trust",
    lastName: "Signatory",
    email: "trust.signatory@example.com",
    signatory: true,
  });
  return ref;
}

export const SANITY_BUSINESS_LEGAL_NAME = "Sanity Business Ltd";

/** Business borrower — all mandatory steps through Reference Details with a signatory contact. */
export async function fillSanityBusinessCustomerFullDataWithSignatories(
  page: Page,
  biz: DOBusinessDetailsPage,
): Promise<DOReferenceDetailsPage> {
  await biz.selectOrganisationType("Incorporated Body");
  await biz.enterLegalName(SANITY_BUSINESS_LEGAL_NAME);
  await biz.enterTradingName("Sanity Trading");
  await biz.enterRegisteredCompanyNumber("1234567");
  await biz.enterNzBusinessNumber("9429031234567");
  await biz.enterGstNumber("123456789");
  await biz.fillBusinessDescription("Sanity automation business borrower.");
  await biz.selectPrimaryNatureOfBusiness("0113 Vegetable Growing");
  await biz.selectSourceOfWealth("Business Activity");
  await biz.enterTimeInBusiness("5", "3");
  await biz.enterBusinessAreaCode("9");
  await biz.enterBusinessPhoneNumber("0211234567");
  await biz.enterBusinessEmail("sanity.business@example.com");
  await biz.clickNextButton();

  const address = new DOAddressDetailsPage(page);
  await address.waitForPhysicalAddressStep();
  await address.timeAtAddress("1", "1");
  await address.enterStreetNumber("123");
  await address.enterStreetName("Main Street");
  await address.enterCity("Wellington");
  await address.chooseCountry("New Zealand");
  await address.clickReuseForPostalAddressToggle();
  await page.waitForTimeout(400);
  await address.ensureReuseForRegisterAddressYes();
  await address.ensureOverseasAddressNoIfPreviousPhysicalVisible();
  await address.fillPreviousPhysicalRequiredIfPresent({
    years: "1",
    months: "1",
    streetNumber: "45",
    streetName: "Queen Street",
    city: "Wellington",
    country: "New Zealand",
  });
  await address.clickNextButton();

  const fin = new DOFinancialPositionPage(page);
  await fin.waitForFinancialPositionStep();
  await fin.selectBusinessNetProfitLastYearNo();
  await page.waitForTimeout(200);
  await fin.selectBusinessNetProfitLastYearYes();
  await fin.fillBusinessNetProfitLastYear("$50000.00");
  await fin.fillBusinessTurnoverLatestYear("$500000.00", "31/03/2025");
  await fin.fillBusinessCashBalance("$10000.00", "31/03/2025");
  await fin.clickNextButton();

  const ref = new DOReferenceDetailsPage(page);
  await ref.waitForReferenceDetailsStep();
  await addSignatoryContactToReference(ref, {
    contactType: "Accountant",
    firstName: "Biz",
    lastName: "Signatory",
    email: "biz.signatory@example.com",
    mobileAreaCode: "123",
    mobileNumber: "897897897",
  });
  await ref.confirmCustomerDetailsCorrect();
  await page.getByRole("button", { name: /^Save$/i }).last().click({ timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
  await ref.expectContactListedInAdvisoryTable({
    firstName: "Biz",
    lastName: "Signatory",
    email: "biz.signatory@example.com",
    phoneFragment: "897897897",
    signatory: true,
  });
  return ref;
}

export async function advanceIndividualBorrowerToPostSubmission(
  page: Page,
  origRef?: string,
): Promise<DOCustomerQuotePostSubmitPage> {
  const { customer } = await openSanityCustomerDetailsStep(page, origRef);
  const ref = await fillMinimalIndividualBorrowerThroughReference(page, customer);
  await ref.clickAddContactDetails();
  await ref.selectContactType("Accountant");
  await ref.enterContactFirstName("Alex");
  await ref.enterContactLastName("Referee");
  await ref.clickAddContactInModal();
  await ref.confirmCustomerDetailsCorrect();
  await ref.advanceFromReferenceDetailsToPostSubmission();
  const post = new DOCustomerQuotePostSubmitPage(page);
  await post.waitForUploadStep();
  return post;
}

export async function waitForSearchCustomerDialog(page: Page): Promise<Locator> {
  const dlg = page.getByRole("dialog").filter({ hasText: /Search|Customer/i }).last();
  await expect(dlg).toBeVisible({ timeout: 30_000 });
  return dlg;
}

export function searchTypeRadioInput(dlg: Locator, value: "individual" | "business" | "trust"): Locator {
  const root = dlg.locator("app-search-customer").first();
  return root
    .locator(`input[type="radio"][name="searchCustomer"][value="${value}"]`)
    .first()
    .or(root.locator(`input[type="radio"][value="${value}"]`).first());
}

/** Search Customer dialog — select **Individual** and verify the radio is checked (FL Business Asg defaults to Business). */
export async function selectIndividualTypeInSearchDialog(page: Page, dlg?: Locator): Promise<void> {
  const dialog = dlg ?? (await waitForSearchCustomerDialog(page));
  const search = new DOSearchCustomerDialog(page);
  await search.selectIndividualType();
  await expect(searchTypeRadioInput(dialog, "individual")).toBeChecked({ timeout: 20_000 });
}

/** UDC number that should not match — enables **Add New Customer** after Search. */
export const SANITY_NO_MATCH_UDC = "999999999999";

/** Search Customer dialog: select **Business**, search by UDC with no match, then **Add New Customer**. */
export async function selectBusinessTypeSearchNoMatchUdcAndAddNewCustomer(
  page: Page,
  customer: DOCustomerDetailsPage,
): Promise<void> {
  const dlg = await waitForSearchCustomerDialog(page);
  const businessBox = dlg.locator('p-radiobutton:has(input[value="business"]) .p-radiobutton-box').first();
  if (await businessBox.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await businessBox.click({ force: true });
  } else {
    await searchTypeRadioInput(dlg, "business").check({ force: true });
  }
  await customer.searchByDropdownClick();
  await customer.selectUDCSelectOption();
  await customer.enterUDCCustomerNumber(SANITY_NO_MATCH_UDC);
  await customer.clickSearchButton();
  await customer.clickAddNewCustomerButton();
}

/** Search Customer dialog: select **Trust**, search by UDC with no match, then **Add New Customer**. */
export async function selectTrustTypeSearchNoMatchUdcAndAddNewCustomer(
  page: Page,
  customer: DOCustomerDetailsPage,
): Promise<void> {
  const dlg = await waitForSearchCustomerDialog(page);
  const trustBox = dlg.locator('p-radiobutton:has(input[value="trust"]) .p-radiobutton-box').first();
  if (await trustBox.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await trustBox.click({ force: true });
  } else if ((await searchTypeRadioInput(dlg, "trust").count()) > 0) {
    await searchTypeRadioInput(dlg, "trust").check({ force: true });
  }
  await customer.searchByDropdownClick();
  await customer.selectUDCSelectOption();
  await customer.enterUDCCustomerNumber(SANITY_NO_MATCH_UDC);
  await customer.clickSearchButton();
  await customer.clickAddNewCustomerButton();
}

/** Second-party identity used when adding Co-Borrower / Guarantor in sanity role-change flows. */
export const SANITY_SECOND_PARTY_FIRST_NAME = "John";
export const SANITY_SECOND_PARTY_LAST_NAME = "Smith";

async function navigateToBorrowerSummaryIfAvailable(page: Page): Promise<void> {
  const root = standardQuoteRoot(page);
  const byRole = root
    .getByRole("button", { name: /^Borrower\s+Summary$/i })
    .or(root.getByRole("link", { name: /^Borrower\s+Summary$/i }))
    .or(root.getByRole("tab", { name: /^Borrower\s+Summary$/i }))
    .first();
  if (await byRole.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await byRole.click({ timeout: 15_000 });
    await page.waitForTimeout(400);
    return;
  }
  const numbered = root.locator("button, a, span, li").filter({ hasText: /\d+\.\s*Borrower\s+Summary/i }).first();
  if (await numbered.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await numbered.click({ timeout: 15_000 });
    await page.waitForTimeout(400);
  }
}

export async function returnToBorrowerSummaryForPartyObserve(page: Page): Promise<void> {
  if (
    await page
      .getByText(/Borrowers\s*&\s*Guarantors/i)
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false)
  ) {
    return;
  }

  const inNestedPartyEditor =
    (await page
      .getByRole("link", { name: /Business\s*-\s*\d+/i })
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false)) ||
    (await page
      .getByRole("link", { name: /Individual\s*-/i })
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false)) ||
    (await page
      .locator("app-business-details, app-personal-details, app-trust-details")
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false));

  if (inNestedPartyEditor) {
    await returnToPostSubmitPartiesView(page);
    return;
  }

  const ref = new DOReferenceDetailsPage(page);
  if (await ref.addContactDetailsButton.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await navigateToBorrowerSummaryIfAvailable(page);
    return;
  }
  await navigateToBorrowerSummaryIfAvailable(page);

  if (
    !(await page
      .getByText(/Borrowers\s*&\s*Guarantors/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false))
  ) {
    await returnToPostSubmitPartiesView(page).catch(() => {});
  }
}

const PARTY_HOST_SELECTOR =
  "app-customer-parties, app-borrower-summary, app-parties, app-customer-quote-post-submit, app-post-submission";

const BORROWERS_GUARANTORS_HEADING_RX = /Borrowers?\s*([&/]|and)\s*Guarantors?/i;

const PARTY_ROW_SELECTOR =
  "tbody > tr, tr.p-selectable-row, tr[role='row'], .p-datatable-tbody > tr, .p-datatable-row, [role='row']";

/** Header row in the parties grid — exclude when matching data rows. */
const PARTY_GRID_HEADER_RX = /^Name\s+UDC\s+Number/i;

function borrowersGuarantorsSection(page: Page): Locator {
  return page
    .locator("*")
    .filter({ has: page.getByText(BORROWERS_GUARANTORS_HEADING_RX) })
    .first();
}

function partyDataRows(scope: Locator, namePattern: RegExp): Locator {
  return scope
    .locator(PARTY_ROW_SELECTOR)
    .filter({ hasText: namePattern })
    .filter({ hasNotText: PARTY_GRID_HEADER_RX });
}

function partyTableRowsByName(scope: Locator, namePattern: RegExp): Locator {
  return scope
    .locator("table tbody tr")
    .filter({ hasText: namePattern })
    .filter({ hasNotText: PARTY_GRID_HEADER_RX });
}

function partyRowsByAccessibleName(scope: Locator, namePattern: RegExp): Locator {
  return scope.getByRole("row", { name: namePattern }).filter({ hasNotText: PARTY_GRID_HEADER_RX });
}

async function pickNamedPartyRow(scope: Locator, namePattern: RegExp): Promise<Locator | undefined> {
  const strategies = [
    () => partyRowsByAccessibleName(scope, namePattern),
    () => partyTableRowsByName(scope, namePattern),
    () => partyDataRows(scope, namePattern),
  ];

  for (const build of strategies) {
    const candidates = build();
    const count = await candidates.count();
    if (count === 0) {
      continue;
    }
    if (count === 1) {
      return candidates.first();
    }

    for (let i = 0; i < count; i++) {
      const row = candidates.nth(i);
      const nameCell = row.locator("td").first();
      if (!(await nameCell.isVisible({ timeout: 800 }).catch(() => false))) {
        continue;
      }
      const cellText = ((await nameCell.textContent()) ?? "").trim();
      if (namePattern.test(cellText)) {
        return row;
      }
    }

    return candidates.first();
  }

  return undefined;
}

export function partyRowByName(page: Page, namePattern: RegExp): Locator {
  const root = standardQuoteRoot(page);
  const borrowersSection = borrowersGuarantorsSection(page);

  return partyRowsByAccessibleName(borrowersSection, namePattern)
    .first()
    .or(partyTableRowsByName(borrowersSection, namePattern).first())
    .or(partyDataRows(borrowersSection, namePattern).first())
    .or(partyRowsByAccessibleName(root, namePattern).first())
    .or(partyTableRowsByName(root, namePattern).first())
    .or(partyDataRows(root, namePattern).first())
    .first();
}

/** When the parties grid duplicates name text (breadcrumb + row), pick the table row. */
export async function resolvePartyRowByName(page: Page, namePattern: RegExp): Promise<Locator> {
  const root = standardQuoteRoot(page);
  const scopes = [
    borrowersGuarantorsSection(page),
    page.locator(PARTY_HOST_SELECTOR).filter({ visible: true }).first(),
    root,
  ];

  for (const scope of scopes) {
    const picked = await pickNamedPartyRow(scope, namePattern);
    if (picked) {
      return picked;
    }
  }

  return partyRowByName(page, namePattern);
}

async function tryEnableCopyPrimaryBorrowerAddress(page: Page): Promise<boolean> {
  const label = page.getByText(/Copy primary borrower/i).first();
  if (!(await label.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }
  const slider = label.locator(
    "xpath=following::span[contains(@class,'p-inputswitch-slider')][1]",
  );
  if (!(await slider.isVisible({ timeout: 3_000 }).catch(() => false))) {
    return false;
  }
  await slider.click({ force: true });
  await page.waitForTimeout(1_000);
  return true;
}

export async function expectPartyRowShowsRole(
  page: Page,
  namePattern: RegExp,
  rolePattern: RegExp,
): Promise<void> {
  const row = await resolvePartyRowByName(page, namePattern);
  await expect(row).toBeVisible({ timeout: 60_000 });

  const roleCombo = row.getByRole("combobox").first();
  if (await roleCombo.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(roleCombo).toContainText(rolePattern);
    return;
  }

  const roleCell = row
    .locator("td, [role='gridcell'], span, div, label")
    .filter({ hasText: rolePattern })
    .first();
  if (await roleCell.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(roleCell).toContainText(rolePattern);
    return;
  }

  await expect(row).toContainText(rolePattern);
}

export async function clickEditPartyFromPartiesList(page: Page, namePattern: RegExp): Promise<void> {
  const scopedRow = await resolvePartyRowByName(page, namePattern);
  const editInRow = scopedRow
    .getByRole("button", { name: /^Edit$/i })
    .or(scopedRow.getByRole("link", { name: /^Edit$/i }))
    .or(scopedRow.locator("button, a").filter({ hasText: /^Edit$/i }))
    .first();
  if (await editInRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await editInRow.click({ timeout: 20_000 });
    await page.waitForTimeout(500);
    return;
  }
  const pencil = scopedRow.locator("i.pi-pencil, .pi-pencil, [class*='pi-pencil'], i.fa-pen").first();
  if (await pencil.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await pencil.click({ timeout: 15_000 });
    await page.waitForTimeout(500);
    return;
  }
  const nameLink = scopedRow
    .locator("a.cursor-pointer.text-primary, .cursor-pointer.text-primary")
    .filter({ hasText: namePattern })
    .first();
  if (await nameLink.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await nameLink.click({ timeout: 20_000 });
    await page.waitForTimeout(500);
    return;
  }
  throw new Error(`Could not open party editor for name matching ${namePattern}`);
}

export async function fillValidSecondIndividualPersonalBorrower(p: DOPersonalDetailsPage): Promise<void> {
  await p.chooseTitle("Mr");
  await p.enterFirstName(SANITY_SECOND_PARTY_FIRST_NAME);
  await p.enterMiddleName("Alan");
  await p.enterLastName(SANITY_SECOND_PARTY_LAST_NAME);
  await p.chooseGender("Male");
  await p.enterDateOfBirth("15/06/1985");
  await p.chooseMarritalStatus("Single");
  await p.chooseNoOfDependents("0");
  await p.enterMobileNumber("0219876543");
  await p.enterEmail("john.smith@example.com");
  await p.chooseLicenceType("Full Licence");
  await p.chooseCountryOfIssue("New Zealand");
  await p.enterLicenceNumber("CD654321");
  await p.enterVersionNumber("512");
  await p.chooseNewZealandResident("Yes");
  await p.chooseCountryOfBirth("New Zealand");
  await p.chooseCountryOfCitizenship("New Zealand");
}

/** Existing UDC individual as primary Borrower through Post Submission. */
export async function advanceExistingUdcBorrowerToPostSubmission(
  page: Page,
  udcNumber: string,
  origRef?: string,
): Promise<DOCustomerQuotePostSubmitPage> {
  const { customer } = await openSanityCustomerDetailsStep(page, origRef);
  await customer.clickAddBorrowersOrGuarantors();
  await customer.searchCustomer.searchByUdcNumber(udcNumber);
  await customer.searchCustomer.clickAddFromBorrowerSearchResult(udcNumber);
  const personal = new DOPersonalDetailsPage(page);
  await expect(personal.personalDetailsRoot).toBeVisible({ timeout: 120_000 });
  await personal.clickSavePersonalDetails();
  await personal.clickNextButton();
  const address = new DOAddressDetailsPage(page);
  await fillMinimalAddressContinue(page, address);
  const emp = new DOEmploymentDetailsPage(page);
  await fillMinimalEmploymentContinue(emp);
  const fin = new DOFinancialPositionPage(page);
  await fillMinimalFinancialContinue(fin);
  await navigateToBorrowerSummaryIfAvailable(page);
  const ref = new DOReferenceDetailsPage(page);
  await ref.waitForReferenceDetailsStep();
  await ref.clickAddContactDetails();
  await ref.selectContactType("Accountant");
  await ref.enterContactFirstName("Alex");
  await ref.enterContactLastName("Referee");
  await ref.clickAddContactInModal();
  await ref.confirmCustomerDetailsCorrect();
  await ref.advanceFromReferenceDetailsToPostSubmission();
  const post = new DOCustomerQuotePostSubmitPage(page);
  await post.waitForUploadStep();
  return post;
}

/** Save co-borrower address only (parties list updates without advancing the full wizard). */
async function fillCoBorrowerAddressSaveOnly(page: Page, address: DOAddressDetailsPage): Promise<void> {
  await address.waitForPhysicalAddressStep();
  const copied = await tryEnableCopyPrimaryBorrowerAddress(page);
  if (copied) {
    await address.selectResidenceType("Boarding").catch(() => {});
    await address.clickReuseForPostalAddressToggle().catch(() => {});
  } else {
    await address.waitForAddressStepReadyForInput();
    await address.timeAtAddress("3", "0");
    await address.enterStreetNumber("456");
    await address.enterStreetName("CoBorrower Street");
    await address.enterCity("Auckland");
    await address.chooseCountry("New Zealand");
    await address.selectResidenceType("Boarding");
    await address.clickReuseForPostalAddressToggle();
  }
  await address.clickSaveAddressDetails();
}

async function dismissUnsavedChangesCancelDialogIfVisible(page: Page): Promise<void> {
  const confirmDlg = page
    .locator("p-confirmdialog, .p-confirm-dialog, [role='alertdialog']")
    .filter({ visible: true })
    .filter({ hasText: /unsaved changes|lost|cancel/i })
    .first();
  if (!(await confirmDlg.isVisible({ timeout: 3_000 }).catch(() => false))) {
    return;
  }
  const discardBtn = confirmDlg
    .getByRole("button", { name: /^(Yes|OK|Confirm|Discard)$/i })
    .or(confirmDlg.locator("button.p-confirm-dialog-accept").first())
    .first();
  await discardBtn.click({ timeout: 10_000 });
  await expect(confirmDlg).toBeHidden({ timeout: 20_000 }).catch(() => {});
}

async function returnToPostSubmitPartiesView(page: Page): Promise<void> {
  const post = new DOCustomerQuotePostSubmitPage(page);
  const quoteCrumb = page.getByRole("link", { name: /Standard Quote\s*-/i }).first();

  for (let attempt = 0; attempt < 2; attempt++) {
    if (await quoteCrumb.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await quoteCrumb.click({ timeout: 20_000 }).catch(() => {});
      await dismissUnsavedChangesCancelDialogIfVisible(page);
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      await page.waitForTimeout(1_000);
    }
    if (
      await page
        .getByText(/Borrowers\s*&\s*Guarantors/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
    ) {
      break;
    }
  }

  if (
    !(await page
      .getByText(/Borrowers\s*&\s*Guarantors/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false))
  ) {
    await post.clickPostSubmissionStepTab().catch(() => {});
  }
  await post.waitForUploadStep();
}

/** Add a second existing UDC Individual as Co-Borrower from Post Submission. Returns a name pattern for party assertions. */
export async function addSecondIndividualCoBorrowerFromPostSubmit(
  page: Page,
  udcNumber: string,
): Promise<RegExp> {
  const post = new DOCustomerQuotePostSubmitPage(page);
  const customer = new DOCustomerDetailsPage(page);
  await post.clickAddBorrowersOrGuarantorsButton();
  await customer.searchCustomer.waitForVisible();
  await customer.searchCustomer.selectIndividualType();
  await customer.searchCustomer.searchByUdcNumber(udcNumber);
  await customer.searchCustomer.clickAddFromBorrowerSearchResult(udcNumber);

  const personal = new DOPersonalDetailsPage(page);
  const soleRoot = page.locator("app-sole-trade").filter({ visible: true }).first();
  await expect(personal.personalDetailsRoot.or(soleRoot)).toBeVisible({ timeout: 120_000 });
  const isSoleTrader = await soleRoot.isVisible({ timeout: 2_000 }).catch(() => false);

  const coBorrowerRole = page.getByRole("combobox", { name: /Co[\s-]*Borrower/i }).first();
  if (!(await coBorrowerRole.isVisible({ timeout: 5_000 }).catch(() => false))) {
    await personal.chooseCustomerRole(/^Co[\s-]*Borrower$/i);
  }

  const firstName = ((await personal.firstNameInput.inputValue().catch(() => "")) || "").trim();
  const lastName = ((await personal.lastNameInput.inputValue().catch(() => "")) || "").trim();
  const namePattern = new RegExp(
    firstName.length > 0 ? firstName.split(/\s+/)[0]! : lastName.length > 0 ? lastName : udcNumber,
    "i",
  );
  if (isSoleTrader) {
    const sole = new DOSoleTraderDetailsPage(page);
    await sole.clickSaveSoleTraderDetails();
    await sole.clickNextButton();
  } else {
    await personal.clickSavePersonalDetails();
    await personal.clickNextButton();
  }

  const address = new DOAddressDetailsPage(page);
  await fillCoBorrowerAddressSaveOnly(page, address);
  await returnToPostSubmitPartiesView(page);
  await expect(partyRowByName(page, namePattern)).toBeVisible({ timeout: 60_000 });
  return namePattern;
}

export async function selectSearchCustomerTrustType(dlg: Locator): Promise<void> {
  const trustInput = searchTypeRadioInput(dlg, "trust");
  if ((await trustInput.count()) === 0) {
    return;
  }
  const trustBox = dlg
    .locator('p-radiobutton:has(input[value="trust"]) .p-radiobutton-box')
    .first()
    .or(dlg.getByRole("radio", { name: /^Trust$/i }));
  await trustBox.click({ force: true });
  await expect(trustInput).toBeChecked({ timeout: 15_000 });
}

/**
 * UDP-T4718 — reopen from dashboard, open Customer Details, open each saved borrower, verify sections.
 */
export async function verifyT3824BorrowerDataOnReopenedQuote(page: Page): Promise<void> {
  const asset = new DOAssetDetailsPage(page);
  const customer = new DOCustomerDetailsPage(page);
  await asset.waitForQuoteLoadersToFinish(120_000);
  await asset.clickStandardQuoteStepTab(/Customer\s*Details/i);
  await customer.waitForAddBorrowerButton();

  await customer.expectSavedCustomerListed(DOC_T3824_BORROWER.displayName, DOC_T3824_BORROWER.role);
  await customer.openSavedCustomerByName(DOC_T3824_BORROWER.displayName);

  const personal = new DOPersonalDetailsPage(page);
  await personal.expectIndividualPersonalDetailsMatch(DOC_T3824_BORROWER.personal);

  const address = new DOAddressDetailsPage(page);
  await address.clickCustomerDetailsStepTab(/Address\s+Details/i);
  await address.expectSavedPhysicalAddressDetailsMatch(DOC_T3824_BORROWER.address);

  await address.clickCustomerDetailsStepTab(/Employment\s+Details/i);
  const employment = new DOEmploymentDetailsPage(page);
  await employment.expectSavedCurrentEmploymentMatch(DOC_T3824_BORROWER.employment);

  await address.clickCustomerDetailsStepTab(/Financial\s+Position/i);
  const financial = new DOFinancialPositionPage(page);
  await financial.waitForFinancialPositionStep();
  await expect(financial.financialRoot).toContainText(/\$500,?000/, { timeout: 15_000 });
  await expect(financial.financialRoot).toContainText(/\$5,?000/, { timeout: 15_000 });
}

/** UDP-T4718 — create/submit via UDP-T3824 flow, save quote, reopen from dashboard by quote ID. */
export async function createSaveAndReopenDocumentationQuote(
  page: Page,
  origRef: string,
): Promise<void> {
  const { asset } = await openPostSubmissionUploadStepWithAsset(page, origRef);
  await asset.waitForQuoteLoadersToFinish(120_000);
  const quoteId = await asset.readStandardQuoteIdFromHeader();
  await asset.clickSaveStandardQuoteStep({ originatorRefForRequiredDialog: origRef });
  const dashboard = await openDashboard(page);
  await dashboard.openOpenQuoteFromListing(quoteId);
  await verifyT3824BorrowerDataOnReopenedQuote(page);
}
