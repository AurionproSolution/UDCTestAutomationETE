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
import {
  FL_SQ_PRODUCT,
  FL_SQ_PROGRAM,
} from "../../doRegressionTestSuite/fl.helpers";
import { DOPersonalDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import { DOReferenceDetailsPage } from "../../../../pages/do-portal/StandardQuote/CustomerDetails/referenceDetails";
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

export async function selectCsaProductAndProgram(asset: DOAssetDetailsPage): Promise<void> {
  await asset.chooseProduct(CSA_SQ_PRODUCT);
  await asset.chooseProgram(CSA_SQ_PROGRAM);
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

  const addTradeBtn = tradeDlg
    .getByRole("button", { name: /^Add Trade$/i })
    .or(tradeDlg.locator("button, a").filter({ hasText: /Add Trade/i }))
    .first();
  if (await addTradeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await addTradeBtn.click({ timeout: 15_000 });
  } else {
    await clickMotochekProceed(tradeDlg);
  }

  await addAsset.makeInputField.first().waitFor({ state: "visible", timeout: 60_000 });
  const make = (await addAsset.makeInputField.first().inputValue()).trim();
  const model = (await addAsset.modelInputField.first().inputValue()).trim();
  await addAsset.enterAssetValue(tradeValue);
  if (await addAsset.conditionDropdown.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await addAsset.selectCondition("Used").catch(() => {});
  }
  await addAsset.chooseMotivePower("Petrol").catch(() => {});
  await addAsset.chooseCountryRegistered("New Zealand").catch(() => {});
  await addAsset.chooseAssetLocation("North Island").catch(() => {});
  await addAsset.clickSummitButton();
  await addAsset.clickCrossButton().catch(() => {});
  await asset.closeSearchTradeInAssetDialog().catch(() => {});

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
  }
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
export async function fillSanityTrustCustomerFullDataWithSignatories(
  page: Page,
  trust: DOTrustDetailsPage,
): Promise<DOReferenceDetailsPage> {
  await trust.selectTrustTypeFirstAvailableOption();
  await trust.enterTrustName("Sanity Family Trust");
  await trust.enterRegisteredNumber("TR123456");
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
  await trust.clickSaveTrustDetails();
  await expect(page.getByText(/Sanity Family Trust/i).first()).toBeVisible({ timeout: 30_000 });
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
  return dlg.locator(`input[type="radio"][value="${value}"]`).first();
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
  await asset.waitUntilNoVisibleAppLoaderOverlays(120_000);
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
  await asset.waitUntilNoVisibleAppLoaderOverlays(120_000);
  const quoteId = await asset.readStandardQuoteIdFromHeader();
  await asset.clickSaveStandardQuoteStep({ originatorRefForRequiredDialog: origRef });
  const dashboard = await openDashboard(page);
  await dashboard.openOpenQuoteFromListing(quoteId);
  await verifyT3824BorrowerDataOnReopenedQuote(page);
}
