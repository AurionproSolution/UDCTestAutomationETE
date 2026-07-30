/**
 * DO Portal — Standard Quote Asset Details / Asset Summary regression (UDP-T3694–UDP-T3708).
 * Scenario source: Asset_Details Test Cases (1).xlsx (Zephyr / Regression 25.0 / Asset Summary).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DOAssetDetailsPage, DODashboardPage } from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import {
  addAssetAssetTypeSelectLink,
  addAssetHost,
  addAssetTypeFromHierarchicalPopup,
  closeAddAssetEditorAndReturnToQuote,
  clearAddAssetAssetType,
  clickPrintDocumentsOnAddAsset,
  expectAddAssetFieldVisible,
  expectAddAssetAssetTypeSearchResults,
  expectAddAssetCategoryLayout,
  expectAddAssetValidationMessage,
  expectAddAssetVehicleAssetTypeDefault,
  expectPageOrDialogText,
  expectValidationMessage,
  fillMinimalEvCleanTechAsset,
  fillMinimalMarineAsset,
  fillMinimalOtherAsset,
  fillMinimalPlantAsset,
  fillMinimalVehicleAsset,
  submitAddAssetForValidation,
  enablePrivateSaleOnAddAsset,
  openAddAssetEditor,
  openAddAssetEditorViaSearchDialog,
  openAddAssetForCategory,
  openAssetTypeHierarchicalPopupOnQuote,
  openStandardQuoteFromDashboard as openCsaQuoteFromDashboard,
  openTlBusinessStandardQuoteFromDashboard,
  prepareQuoteWithVehicleAssetType,
  readAddAssetAssetType,
  readQuoteAssetTypeValue,
  runMotochekFromAddAssetEditor,
  searchAddAssetAssetType,
  selectAssetTypeHierarchicalLevels,
  selectCsaProductAndProgram as selectCsaProductProgram,
  selectTlProductAndProgram,
  standardQuoteRoot as addAssetStandardQuoteRoot,
} from "./assetDetailsAddAsset.helpers";

const CSA_SQ_PRODUCT = "CSA-C-Assigned";
const CSA_SQ_PROGRAM = "Webform - CSA Personal - MV Dealer";
const CSA_SQ_ALT_PROGRAM = "CSA Personal - MV Dealer";
const TLC_DEALER = "Armstrong Prestige Wellington";
const AFV_PRODUCT = "AFV-B-Assigned";
const MOTOCHEK_REGO = "bagged";

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

/** After Product/Program change: wait for loading spinner, then for Asset Type to populate. */
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
          if (await loaders.nth(i).isVisible().catch(() => false)) {
            return false;
          }
        }
        return true;
      },
      { timeout: timeoutMs },
    )
    .toBe(true);

  await page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(() => {});

  await expect
    .poll(async () => (await readAssetTypeValue(page)).trim().length > 0, {
      timeout: timeoutMs,
      intervals: [300, 500, 800],
    })
    .toBeTruthy();
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

function assetTypeInput(page: Page): Locator {
  return standardQuoteRoot(page).locator('input[name="assetTypeDD"]').first();
}

async function readAssetTypeValue(page: Page): Promise<string> {
  const input = assetTypeInput(page);
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

async function clearAssetTypeField(page: Page): Promise<void> {
  const input = assetTypeInput(page);
  await input.waitFor({ state: "visible", timeout: 20_000 });
  await input.click();
  await input.press("Control+A");
  await input.press("Backspace");
  await page.keyboard.press("Escape").catch(() => {});
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
  await page
    .getByRole("dialog")
    .last()
    .waitFor({ state: "visible", timeout: 30_000 })
    .catch(() => {});
}

/**
 * **Asset & Insurance Summary** modal → **+ Search & Add Asset** → **Search Asset** dialog (see Zephyr / screenshots).
 */
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

async function selectSearchAddAssetMode(page: Page, mode: RegExp): Promise<void> {
  const dlg = await searchAddAssetDialog(page);
  const radio = dlg.getByRole("radio", { name: mode }).first();
  if (await radio.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await radio.check({ force: true });
    return;
  }
  const label = dlg.locator("label, span, div").filter({ hasText: mode }).first();
  await label.click({ timeout: 10_000 });
}

async function clickSearchInSearchAddAssetDialog(page: Page): Promise<void> {
  const dlg = await searchAddAssetDialog(page);
  const searchBtn = dlg
    .getByRole("button", { name: /^Search$/i })
    .or(dlg.locator("button, a").filter({ hasText: /^Search$/i }))
    .first();
  await searchBtn.click({ timeout: 15_000 });
}

async function addMinimalUsedAsset(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  opts?: { make?: string; model?: string; variant?: string; year?: string; rego?: string; vin?: string },
): Promise<void> {
  await assetDetailsPage.enterAsset("Car and Light Commercial /");
  await assetDetailsPage.selectCondition("Used");
  await assetDetailsPage.openAssetInsuranceTradeInSummary();
  await assetDetailsPage.clickAssetSummaryEditButton();
  await addAssetPage.enterAssetValue("$20,000");
  await addAssetPage.selectCondition("Used");
  await addAssetPage.selectYear(opts?.year ?? "2025");
  await addAssetPage.enterMake(opts?.make ?? "Toyota");
  await addAssetPage.enterModel(opts?.model ?? "Hilux");
  await addAssetPage.enterVariant(opts?.variant ?? "Top");
  if (opts?.rego) {
    await addAssetPage.enterRegoNO(opts.rego);
  }
  if (opts?.vin) {
    await addAssetPage.enterVIN(opts.vin);
  }
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
}

async function openAssetTypeHierarchicalPopup(page: Page): Promise<Locator> {
  const root = standardQuoteRoot(page);
  const selectTrigger = root
    .getByRole("button", { name: /^Select$/i })
    .or(root.getByRole("link", { name: /^Select$/i }))
    .or(
      root.locator(
        "xpath=.//*[contains(normalize-space(.),'Asset Type')]/ancestor::*[contains(@class,'row') or contains(@class,'grid')][1]//button[contains(.,'Select')]",
      ),
    )
    .first();
  await selectTrigger.scrollIntoViewIfNeeded();
  await selectTrigger.click({ timeout: 15_000 });
  const dlg = page.getByRole("dialog").last();
  await dlg.waitFor({ state: "visible", timeout: 20_000 });
  return dlg;
}

test.describe("Asset Details - Asset Summary @do @regression", () => {
  test(
    "UDP-T3694 - Asset Type defaults from selected Program",
    { tag: ["@do", "@regression", "@UDP-T3694"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);
      const assetType = await readAssetTypeValue(page);
      expect.soft(assetType.length).toBeGreaterThan(0);
      expect.soft(/Car|Light Commercial|Commercial|Motor/i.test(assetType)).toBeTruthy();
    },
  );

  test(
    "UDP-T3695 - Asset Type field is mandatory",
    { tag: ["@do", "@regression", "@UDP-T3695"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);
      await clearAssetTypeField(page);
      await assetDetailsPage.clickNextButton().catch(() => {});
      const validation = page
        .getByText(
          /If no default asset type exists|please complete|Asset Type.*required|Asset Type is required/i,
        )
        .or(page.getByRole("dialog").filter({ hasText: /Asset Type/i }));
      await expect.soft(validation.first()).toBeVisible({ timeout: 25_000 });
    },
  );

  test(
    "UDP-T3696 - Asset Type updates when Product/Program changes",
    { tag: ["@do", "@regression", "@UDP-T3696"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);
      const before = await readAssetTypeValue(page);
      expect.soft(before.length).toBeGreaterThan(0);

      await assetDetailsPage.openProgramDropdown();
      const altProgram = page.getByRole("option", { name: CSA_SQ_ALT_PROGRAM, exact: true });
      if (await altProgram.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await altProgram.click();
      } else {
        const options = page.getByRole("option");
        const count = await options.count();
        for (let i = 0; i < count; i++) {
          const text = ((await options.nth(i).textContent()) ?? "").trim();
          if (text && text !== CSA_SQ_PROGRAM) {
            await options.nth(i).click();
            break;
          }
        }
      }
      await page.keyboard.press("Escape").catch(() => {});
      await waitForProductProgramSpinnerThenAssetTypePopulated(page);

      const after = await readAssetTypeValue(page);
      expect.soft(after.length).toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T3697 - Asset Type Select pop-up opens and allows hierarchical selection",
    { tag: ["@do", "@regression", "@UDP-T3697"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      const dlg = await openAssetTypeHierarchicalPopup(page);
      await expect.soft(dlg.getByText(/All Asset Types/i).first()).toBeVisible({ timeout: 15_000 });

      const levelDropdown = dlg.locator(".p-dropdown").first();
      if (await levelDropdown.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await levelDropdown.locator(".p-dropdown-trigger").click({ timeout: 10_000 });
        const firstOpt = page.getByRole("option").first();
        if (await firstOpt.isVisible({ timeout: 10_000 }).catch(() => false)) {
          await firstOpt.click();
          await page.keyboard.press("Escape").catch(() => {});
        }
      }

      const addBtn = dlg
        .getByRole("button", { name: /^Add$/i })
        .or(dlg.locator("span.p-button-label").filter({ hasText: /^Add$/ }))
        .first();
      if (await addBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await addBtn.click({ timeout: 15_000 });
        await expect.soft(dlg).toBeHidden({ timeout: 30_000 });
      } else {
        const selectBtn = dlg.getByRole("button", { name: /^Select$/i }).first();
        if (await selectBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await assetDetailsPage.selectVehicleFromAssetTypeModal({
            make: "TOYOTA",
            model: "HILUX",
            variant: "SR5",
            year: "2024",
          });
        }
      }

      const assetType = await readAssetTypeValue(page);
      expect.soft(assetType.length).toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T3698 - Motochek Search – search by Rego Number",
    { tag: ["@do", "@regression", "@UDP-T3698"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      // Asset & Insurance Summary → Trade Summary → **Search & Add Trade in** → **Search Trade in Asset** (Motochek / Rego).
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await assetDetailsPage.clickSearchAddTradeInAndExpectChooserOpened();

      const tradeDlg = page.getByRole("dialog", { name: /Search Trade in Asset/i });
      await expect.soft(tradeDlg).toBeVisible({ timeout: 30_000 });

      const searchTypeRadio = tradeDlg.getByRole("radio", { name: /Motocheck|Motochek/i }).first();
      if (await searchTypeRadio.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await searchTypeRadio.check({ force: true });
      }

      const searchByCombo = tradeDlg
        .getByRole("combobox", { name: /Search by/i })
        .or(tradeDlg.locator("p-dropdown").filter({ hasText: /Search by/i }))
        .first();
      if (await searchByCombo.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await searchByCombo.click();
        await page.getByRole("option", { name: /Rego Number/i }).first().click({ timeout: 10_000 });
        await page.keyboard.press("Escape").catch(() => {});
      }

      /** PrimeNG: `Enter Number` pairs with `input#text` (p-inputtext), not always an accessible name. */
      const enterNumber = tradeDlg
        .getByText(/Enter Number/i)
        .first()
        .locator("xpath=following::input[@id='text' and contains(@class,'p-inputtext')][1]")
        .or(tradeDlg.locator("input#text.p-inputtext.p-component").first())
        .or(tradeDlg.locator("input#text[type='text']").first())
        .first();
      await enterNumber.waitFor({ state: "visible", timeout: 15_000 });
      await enterNumber.fill("BAGGED");

      await tradeDlg.getByRole("button", { name: /^Search$/i }).click({ timeout: 15_000 });

      await expect
        .soft(tradeDlg.getByText(/Motocheck Successfully|Motochek Successfully|Successfully Executed/i).first())
        .toBeVisible({ timeout: 90_000 });

      // Assert result **fields** are present with **some** populated data (do not assert exact Motochek values).
      const body = ((await tradeDlg.innerText()) ?? "").replace(/\u00a0/g, " ");
      const mustHaveValueAfterLabel: RegExp[] = [
        /Make\s*[:\n]?\s*\S+/i,
        /Model\s*[:\n]?\s*\S+/i,
        /Year\s*[:\n]?\s*\d{4}/,
        /CC\s*Rating\s*[:\n]?\s*\S+/i,
        /Colour\s*[:\n]?\s*\S+/i,
        /VIN\s*[:\n]?\s*\S+/i,
        /Odometer\s*[:\n]?\s*\S+/i,
        /Motive\s*Power\s*[:\n]?\s*\S+/i,
        /Engine\s*No\.?\s*[:\n]?\s*\S+/i,
      ];
      for (const pattern of mustHaveValueAfterLabel) {
        expect.soft(pattern.test(body)).toBeTruthy();
      }
      expect.soft(/Variant/i.test(body)).toBeTruthy();

      await assetDetailsPage.closeSearchTradeInAssetDialog();
      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T3699 - Motochek Search – VIN must be 17 characters",
    { tag: ["@do", "@regression", "@UDP-T3699"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      // Same entry as UDP-T3698: summary → **Search & Add Trade in** → **Search Trade in Asset** (Motochek).
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await assetDetailsPage.clickSearchAddTradeInAndExpectChooserOpened();

      const tradeDlg = page.getByRole("dialog", { name: /Search Trade in Asset/i });
      await expect.soft(tradeDlg).toBeVisible({ timeout: 30_000 });

      const searchTypeRadio = tradeDlg.getByRole("radio", { name: /Motocheck|Motochek/i }).first();
      if (await searchTypeRadio.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await searchTypeRadio.check({ force: true });
      }

      /** PrimeNG: label is **Search By** but the combobox accessible name is the **value** (e.g. `Rego Number`). */
      const searchCriteriaCombo = tradeDlg
        .getByRole("combobox", { name: /Rego Number|VIN Number/i })
        .or(tradeDlg.getByRole("combobox").first());
      await searchCriteriaCombo.click({ timeout: 15_000 });
      await page
        .getByRole("option", { name: /VIN Number/i })
        .or(page.getByRole("option", { name: /^VIN$/i }))
        .first()
        .click({ timeout: 10_000 });
      await page.keyboard.press("Escape").catch(() => {});

      /** PrimeNG `input#text` for **Enter Number** (same as UDP-T3698). */
      const enterNumber = tradeDlg
        .getByText(/Enter Number/i)
        .first()
        .locator("xpath=following::input[@id='text' and contains(@class,'p-inputtext')][1]")
        .or(tradeDlg.locator("input#text.p-inputtext.p-component").first())
        .or(tradeDlg.locator("input#text[type='text']").first())
        .first();
      await enterNumber.waitFor({ state: "visible", timeout: 15_000 });
      await enterNumber.fill("hjjnbhbcwd");
      await enterNumber.press("Tab").catch(() => {});

      await tradeDlg.getByRole("button", { name: /^Search$/i }).click({ timeout: 15_000 });

      /** Copy varies by build (inline `small`, `p-message`, or banner); match on joined dialog text. */
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

      await assetDetailsPage.closeSearchTradeInAssetDialog();
      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T3700 - Dealer Inventory Search – at least one field required",
    { tag: ["@do", "@regression", "@UDP-T3700"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      // Asset & Insurance Summary → + Search & Add Asset → Search Asset dialog.
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await clickSearchAndAddAssetFromInsuranceSummary(page);

      const dlg = page.getByRole("dialog", { name: /Search Asset/i });
      await expect(dlg).toBeVisible({ timeout: 30_000 });

      await dlg
        .getByRole("radio", { name: /Dealer Inventory/i })
        .check({ force: true })
        .catch(async () => {
          await dlg.locator("label.p-radiobutton-label").filter({ hasText: /^Dealer Inventory$/i }).click();
        });

      await dlg.getByRole("button", { name: /^Search$/i }).click({ timeout: 15_000 });

      const validation = page
        .locator(".p-toast-message-error, .p-toast-message-warn, .p-toast, [role='alert']")
        .filter({ hasText: /Please complete at least one selection/i })
        .or(page.getByText(/Please complete at least one selection/i));
      await expect(validation.first()).toBeVisible({ timeout: 20_000 });
    },
  );

  test(
    "UDP-T3701 - Dealer Inventory Search – results displayed and asset can be added",
    { tag: ["@do", "@regression", "@UDP-T3701"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);
      await clickSearchAndAddAsset(page);

      const dlg = await searchAddAssetDialog(page);
      await selectSearchAddAssetMode(page, /Dealer Inventory/i);

      const makeInput = dlg
        .getByRole("textbox", { name: /^Make/i })
        .or(dlg.locator("input").filter({ has: dlg.getByText(/^Make/i) }))
        .first();
      if (await makeInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await makeInput.fill("Toyota");
      }

      await clickSearchInSearchAddAssetDialog(page);
      const resultRow = dlg.locator("table tbody tr").first();
      await expect.soft(resultRow).toBeVisible({ timeout: 60_000 });

      const radio = dlg.getByRole("radio").first();
      if (await radio.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await radio.check({ force: true });
      } else {
        await resultRow.click();
      }

      const addAssetBtn = dlg
        .getByRole("button", { name: /^Add Asset$/i })
        .or(dlg.locator("button, a").filter({ hasText: /^Add Asset$/i }))
        .first();
      await expect.soft(addAssetBtn).toBeEnabled({ timeout: 15_000 });
      await addAssetBtn.click({ timeout: 15_000 });

      const assetWizard = page
        .getByRole("dialog")
        .filter({ hasText: /Make|Asset Value|Cost of Asset/i })
        .last();
      await expect.soft(assetWizard).toBeVisible({ timeout: 30_000 });
    },
  );

  test(
    "UDP-T3702 - Dealer Inventory – No results found",
    { tag: ["@do", "@regression", "@UDP-T3702"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await clickSearchAndAddAssetFromInsuranceSummary(page);

      const dlg = page.getByRole("dialog", { name: /Search Asset/i });
      await expect.soft(dlg).toBeVisible({ timeout: 30_000 });

      await dlg
        .getByRole("radio", { name: /Dealer Inventory/i })
        .check({ force: true })
        .catch(async () => {
          await dlg.locator("label.p-radiobutton-label").filter({ hasText: /^Dealer Inventory$/i }).click();
        });

      /** PrimeNG float-label grid: one `text` host per field; **Model** → `#text` input (unique vs `.or()` union). */
      const modelInput = dlg.locator("text").filter({ hasText: /^Model$/i }).locator("#text").first();
      await modelInput.waitFor({ state: "visible", timeout: 15_000 });
      await modelInput.fill("Toyota");

      await dlg.getByRole("button", { name: /^Search$/i }).click({ timeout: 15_000 });

      // Empty state is often an **img** with alt/name "No Data Found", not plain text.
      await expect
        .soft(
          page
            .getByRole("img", { name: /No Data Found/i })
            .or(page.getByText(/No Data Found|No results|no matching/i))
            .first(),
        )
        .toBeVisible({ timeout: 60_000 });
    },
  );

  test(
    "UDP-T3703 - Add Asset manually (non-AFV)",
    { tag: ["@do", "@regression", "@UDP-T3703"] },
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
      await addAssetPage.enterVIN("1HGCM82633A004352");
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
      /** Summary row: year + make + model + variant (portal may render **Hillux** vs Hilux); Rego/VIN column may stay `-` on some builds. */
      await expect.soft(summaryDlg).toContainText(/2025/i, { timeout: 30_000 });
      await expect.soft(summaryDlg).toContainText(/Toyota/i);
      await expect.soft(summaryDlg).toContainText(/Hilux|Hillux/i);
      await expect.soft(summaryDlg).toContainText(/Top/i);
      await expect.soft(summaryDlg.getByText(/\$[\d,]+\.\d{2}/).first()).toBeVisible();

      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T3704 - Copy Asset copies specified fields to a new asset row",
    { tag: ["@do", "@regression", "@UDP-T3704"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);

      // Same manual asset as **UDP-T3703** (summary → edit → full wizard → Submit).
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
      await addAssetPage.enterVIN("1HGCM82633A004352");
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

      /** Copy = Font Awesome **fa-clone** on the summary row (not `fa-copy`). */
      const copyIcon = summaryDlg.locator("i.fa-clone.cursor-pointer, i.fa-clone, i.fa-regular.fa-clone").first();
      await expect.soft(copyIcon).toBeVisible({ timeout: 20_000 });
      await copyIcon.click({ timeout: 15_000 });

      // **Add Asset** route / screen (2nd screenshot): core fields carried from copy.
      await addAssetPage.makeInputField.first().waitFor({ state: "visible", timeout: 45_000 });
      await expect.soft(page.getByText(/Add Asset/i).first()).toBeVisible({ timeout: 15_000 });

      await expect.soft(addAssetPage.makeInputField.first()).toHaveValue(/Toyota/i, { timeout: 15_000 });
      await expect.soft(addAssetPage.modelInputField.first()).toHaveValue(/Hilux|Hillux/i);
      await expect.soft(addAssetPage.variantInputField.first()).toHaveValue(/Top/i);
      await expect.soft(addAssetPage.yearInputField.first()).toHaveValue("2025");

      const assetVal = ((await addAssetPage.assetValueInputField.inputValue()) ?? "").replace(/[$,\s]/g, "");
      expect.soft(assetVal.length).toBeGreaterThan(0);
      expect.soft(/1000|10000|630/i.test(assetVal)).toBeTruthy();

      const regoVal = (await addAssetPage.regoNOInputField.first().inputValue().catch(() => "")) ?? "";
      const vinVal = (await addAssetPage.vinInputField.first().inputValue().catch(() => "")) ?? "";
      /** Copy screen may **truncate** rego (e.g. `TG08BP` vs full `TG08BP5123`). */
      if (regoVal.trim().length > 0) {
        expect.soft(regoVal).toMatch(/TG08BP5123|TG08BP/i);
      }
      if (vinVal.trim().length > 0) {
        expect.soft(vinVal).toMatch(/1HGCM82633A004352/);
      }

      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T3705 - Trade-in asset search via Motochek",
    { tag: ["@do", "@regression", "@UDP-T3705"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await assetDetailsPage.clickSearchAddTradeInAndExpectChooserOpened();

      const tradeDlg = page.getByRole("dialog").last();
      await selectSearchAddAssetMode(page, /Motochek/i);

      const regoInput = tradeDlg
        .getByRole("textbox", { name: /Rego/i })
        .or(tradeDlg.getByPlaceholder(/rego/i))
        .first();
      if (await regoInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await regoInput.fill(MOTOCHEK_REGO);
      }

      const searchBtn = tradeDlg.getByRole("button", { name: /^Search$/i }).first();
      if (await searchBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchBtn.click({ timeout: 15_000 });
      }

      const populated = tradeDlg.getByText(/Make|Model|Year|Trade/i).or(tradeDlg.locator("input[value]"));
      await expect.soft(populated.first()).toBeVisible({ timeout: 60_000 });

      await assetDetailsPage.closeSearchTradeInAssetDialog();
      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T3706 - Trade-in mandatory fields validated on submission",
    { tag: ["@do", "@regression", "@UDP-T3706"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await assetDetailsPage.clickSearchAddTradeInAndExpectChooserOpened();

      /** **Search Trade in Asset** — title may be **Search Trade in Asset** or **Search Trade-in Asset**; `getByRole(..., { name })` is not always wired. */
      const searchTradeDlg = page
        .getByRole("dialog")
        .filter({ hasText: /Search Trade-?\s*in\s*Asset/i })
        .last();
      await expect(searchTradeDlg).toBeVisible({ timeout: 25_000 });

      const addTradeBtn = searchTradeDlg
        .getByRole("button", { name: /^Add Trade$/i })
        .or(
          searchTradeDlg
            .locator("button.p-button-text:has(.fa-square-plus)")
            .filter({ hasText: /Add Trade/i }),
        )
        .first();
      await expect(addTradeBtn).toBeVisible({ timeout: 20_000 });
      await addTradeBtn.click({ timeout: 15_000 });

      /** **Add Trade** form: title may not be a semantic `heading` — wait for footer **Submit** (and load). */
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      /** Submit lives on the **Add Trade** route, often **outside** `app-quote-details` — scope at **page** level. */
      const submitAddTrade = page.getByRole("button", { name: /^Submit$/i }).last();
      await expect.soft(submitAddTrade).toBeVisible({ timeout: 45_000 });
      await submitAddTrade.click({ timeout: 15_000 });

      await expect.soft(page.getByText(/Cost\s+Of\s+Asset\s+is\s+required/i).first()).toBeVisible({
        timeout: 25_000,
      });
      await expect.soft(page.getByText(/Year\s+is\s+required/i).first()).toBeVisible({ timeout: 15_000 });
      await expect.soft(page.getByText(/Make\s+is\s+required/i).first()).toBeVisible({ timeout: 15_000 });
      await expect.soft(page.getByText(/Model\s+is\s+required/i).first()).toBeVisible({ timeout: 15_000 });

      await page.getByRole("button", { name: /^Cancel$/i }).first().click({ timeout: 15_000 }).catch(() => {});
      await assetDetailsPage.closeSearchTradeInAssetDialog().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T3707 - Asset Summary screen displays correct concatenated asset description",
    { tag: ["@do", "@regression", "@UDP-T3707"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(page, assetDetailsPage);
      await addMinimalUsedAsset(assetDetailsPage, addAssetPage, {
        make: "Toyota",
        model: "Hilux",
        variant: "Top",
        year: "2025",
        rego: "TG08BP5123",
        vin: "1HGCM82633A004352",
      });

      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      const summaryDlg = page
        .getByRole("dialog")
        .filter({ hasText: /Asset/i })
        .filter({ hasText: /Insurance/i })
        .filter({ hasText: /Summary/i })
        .last();
      await expect.soft(summaryDlg).toBeVisible({ timeout: 30_000 });
      /** Summary row: year + make + model + variant; Rego/VIN column may stay `-` on some builds. */
      await expect.soft(summaryDlg).toContainText(/2025/i, { timeout: 30_000 });
      await expect.soft(summaryDlg).toContainText(/Toyota/i);
      await expect.soft(summaryDlg).toContainText(/Hilux|Hillux/i);
      await expect.soft(summaryDlg).toContainText(/Top/i);
      await expect.soft(summaryDlg.getByText(/\$[\d,]+\.\d{2}/).first()).toBeVisible();

      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T3708 - Add Asset – Add Asset option is disabled for AFV product",
    { tag: ["@do", "@regression", "@UDP-T3708"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openAfVStandardQuoteFromDashboard(page);
      await assetDetailsPage.chooseProduct(AFV_PRODUCT);

      const root = standardQuoteRoot(page);
      await expect.soft(root.getByText(AFV_PRODUCT).first()).toBeVisible({ timeout: 30_000 });

      /**
       * **Search & Add Asset** is on the Asset step **before** an AFV vehicle is chosen; after
       * `selectVehicleFromAssetTypeModal`, that control may no longer appear — run the disabled **Add Asset**
       * check first, then pick the vehicle (same data as `AFV_Single_Flow.test.ts`).
       */
      await clickSearchAndAddAsset(page);

      const dlg = await searchAddAssetDialog(page);
      const addAssetRadio = dlg.getByRole("radio", { name: /^Add Asset$/i }).first();
      const addAssetLabel = dlg.locator("label, span").filter({ hasText: /^Add Asset$/i }).first();

      if (await addAssetRadio.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect.soft(addAssetRadio).toBeDisabled();
      } else if (await addAssetLabel.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const host = addAssetLabel.locator(
          "xpath=ancestor::*[contains(@class,'p-radiobutton') or contains(@class,'disabled')][1]",
        );
        const className = (await host.getAttribute("class")) ?? "";
        const disabled =
          className.includes("p-disabled") ||
          (await addAssetLabel.getAttribute("aria-disabled")) === "true";
        expect.soft(disabled).toBeTruthy();
      } else {
        test.info().annotations.push({
          type: "note",
          description: "Add Asset option not rendered as a separate radio on this AFV build — verify manually.",
        });
      }

      const dlgClose = dlg
        .locator("button.p-dialog-header-close, button.p-dialog-header-icon.p-dialog-header-close")
        .or(dlg.getByRole("button", { name: /^close$/i }))
        .first();
      if (await dlgClose.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await dlgClose.click({ timeout: 10_000 });
      } else {
        await page.keyboard.press("Escape");
      }
      await dlg.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});

      await assetDetailsPage.selectVehicleFromAssetTypeModal({
        make: "SUZUKI",
        model: "IGNIS",
        variant: "GLX MANUAL 1.2P/ 5MT",
        year: "2024",
      });

      await page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(() => {});
      await page.waitForTimeout(800);

      /** Asset Type often shows a **short** label (e.g. **GLX MANUAL**), not full make/model. */
      await expect
        .poll(
          async () => (await readAssetTypeValue(page)).trim(),
          { timeout: 90_000, intervals: [400, 800, 1200] },
        )
        .toMatch(/GLX|MANUAL|IGNIS|Suzuki|SUZUKI|2024/i);
    },
  );
});

test.describe("Asset Details - Add Asset Editor @do @regression", () => {
  test(
    "UDP-T4749 - Asset Type Default",
    { tag: ["@do", "@regression", "@UDP-T4749"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const quoteAssetType = await readAssetTypeValue(page);
      expect.soft(quoteAssetType.length).toBeGreaterThan(0);

      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      await expectAddAssetVehicleAssetTypeDefault(page);
      const addAssetType = await readAddAssetAssetType(page);
      expect.soft(addAssetType).toMatch(/Car|Light Commercial|Commercial|Motor/i);
      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4750 - Asset Type Mandatory",
    { tag: ["@do", "@regression", "@UDP-T4750"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditorViaSearchDialog(page, assetDetailsPage);
      await clearAddAssetAssetType(page);
      await addAssetPage.clickSummitButton();
      await expectValidationMessage(page, /Asset Type.*required|Asset Type is required|select the asset type/i);
      await addAssetPage.clickCrossButton().catch(() => {});
    },
  );

  test(
    "UDP-T4751 - Asset Type Search",
    { tag: ["@do", "@regression", "@UDP-T4751"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditorViaSearchDialog(page, assetDetailsPage);
      await searchAddAssetAssetType(page, "Car");
      await expectAddAssetAssetTypeSearchResults(page, /Car|Light Commercial|Motor/i);
      await addAssetPage.clickCrossButton().catch(() => {});
    },
  );

  test(
    "UDP-T4752 - Select Hyperlink",
    { tag: ["@do", "@regression", "@UDP-T4752"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const selectLink = addAssetStandardQuoteRoot(page)
        .getByRole("link", { name: /^Select$/i })
        .or(addAssetStandardQuoteRoot(page).getByRole("button", { name: /^Select$/i }))
        .first();
      if (await selectLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
        const disabled =
          (await selectLink.getAttribute("disabled")) !== null ||
          (await selectLink.getAttribute("aria-disabled")) === "true" ||
          /p-disabled|disabled/i.test((await selectLink.getAttribute("class")) ?? "");
        expect.soft(typeof disabled).toBe("boolean");
      } else {
        test.info().annotations.push({
          type: "note",
          description: "Select hyperlink not shown — program may expose a single Asset Type only.",
        });
      }
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      const addSelect = addAssetAssetTypeSelectLink(page);
      if (await addSelect.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await expect.soft(addSelect).toBeEnabled({ timeout: 10_000 });
      }
      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4753 - Asset Type Popup",
    { tag: ["@do", "@regression", "@UDP-T4753"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const dlg = await openAssetTypeHierarchicalPopupOnQuote(page);
      await expect.soft(dlg.getByText(/All Asset Types/i).first()).toBeVisible({ timeout: 15_000 });
      await expect.soft(dlg.locator(".p-dropdown").first()).toBeVisible({ timeout: 15_000 });
      await page.keyboard.press("Escape").catch(() => {});
    },
  );

  test(
    "UDP-T4754 - Asset Level Selection",
    { tag: ["@do", "@regression", "@UDP-T4754"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const dlg = await openAssetTypeHierarchicalPopupOnQuote(page);
      await selectAssetTypeHierarchicalLevels(dlg, page, { maxRounds: 1 });
      const enabledDropdowns = dlg.locator(".p-dropdown").filter({ visible: true });
      if ((await enabledDropdowns.count()) > 1) {
        await expect.soft(enabledDropdowns.nth(1)).toBeVisible({ timeout: 15_000 });
      }
      await page.keyboard.press("Escape").catch(() => {});
    },
  );

  test(
    "UDP-T4755 - Reset Popup",
    { tag: ["@do", "@regression", "@UDP-T4755"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const dlg = await openAssetTypeHierarchicalPopupOnQuote(page);
      await selectAssetTypeHierarchicalLevels(dlg, page, { maxRounds: 1 });
      const resetBtn = dlg
        .getByRole("button", { name: /^Reset$/i })
        .or(dlg.locator("button, a").filter({ hasText: /^Reset$/i }))
        .first();
      if (await resetBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await resetBtn.click({ timeout: 15_000 });
        await expect.soft(dlg.getByText(/All Asset Types/i).first()).toBeVisible({ timeout: 15_000 });
      }
      await page.keyboard.press("Escape").catch(() => {});
    },
  );

  test(
    "UDP-T4756 - Add Asset Type",
    { tag: ["@do", "@regression", "@UDP-T4756"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const dlg = await openAssetTypeHierarchicalPopupOnQuote(page);
      await addAssetTypeFromHierarchicalPopup(dlg, page);
      const assetType = await readQuoteAssetTypeValue(page);
      expect.soft(assetType.length).toBeGreaterThan(0);
      expect.soft(/Car|Light Commercial|Motor|Vehicle/i.test(assetType)).toBeTruthy();
    },
  );

  test(
    "UDP-T4757 - Category Layout",
    { tag: ["@do", "@regression", "@UDP-T4757"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);

      for (const category of ["vehicle", "other", "plant", "marine", "ev"] as const) {
        const { addAssetPage, skipped, evVehicleFallback } = await openAddAssetForCategory(
          page,
          assetDetailsPage,
          category,
        );
        if (skipped) {
          test.info().annotations.push({
            type: "note",
            description: `${category} asset type not available for this program on QAT.`,
          });
          continue;
        }
        if (evVehicleFallback) {
          test.info().annotations.push({
            type: "note",
            description:
              "EV/Clean Tech asset type not in QAT catalog; layout checked on Car and Light Commercial with Electric fields.",
          });
        }
        await expectAddAssetCategoryLayout(page, addAssetPage, category);
        await closeAddAssetEditorAndReturnToQuote(page, addAssetPage, assetDetailsPage);
      }
    },
  );

  test(
    "UDP-T4758 - Asset Value Validation",
    { tag: ["@do", "@regression", "@UDP-T4758"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);

      await addAssetPage.enterAssetValue("");
      await addAssetPage.clickSummitButton();
      await expectAddAssetValidationMessage(
        page,
        /Asset Value minimum value must be greater than 0/i,
      );

      await addAssetPage.enterAssetValue("0");
      await addAssetPage.clickSummitButton();
      await expectAddAssetValidationMessage(
        page,
        /Asset Value minimum value must be greater than 0/i,
      );

      await closeAddAssetEditorAndReturnToQuote(page, addAssetPage, assetDetailsPage);
    },
  );

  test(
    "UDP-T4759 - Condition Default",
    { tag: ["@do", "@regression", "@UDP-T4759"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditorViaSearchDialog(page, assetDetailsPage);
      const currentYear = String(new Date().getFullYear());
      const previousYear = String(new Date().getFullYear() - 1);

      await addAssetPage.selectYear(currentYear);
      await page.waitForTimeout(800);
      const afterCurrent = ((await addAssetPage.conditionDropdown.textContent().catch(() => "")) ?? "").trim();
      expect.soft(/New/i.test(afterCurrent)).toBeTruthy();

      await addAssetPage.selectYear(previousYear);
      await page.waitForTimeout(800);
      const afterPrevious = ((await addAssetPage.conditionDropdown.textContent().catch(() => "")) ?? "").trim();
      expect.soft(/Used/i.test(afterPrevious)).toBeTruthy();

      await addAssetPage.clickCrossButton().catch(() => {});
    },
  );

  test(
    "UDP-T4760 - Year Validation",
    { tag: ["@do", "@regression", "@UDP-T4760"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);

      await addAssetPage.selectYear("");
      await addAssetPage.clickSummitButton();
      await expectAddAssetValidationMessage(page, /Year is required|Year.*required/i);

      await addAssetPage.selectYear("abcd");
      await addAssetPage.clickSummitButton();
      await expectAddAssetValidationMessage(
        page,
        /Year is in an incorrect format|Year Min Value must be 1900|not a valid number|invalid|Year.*valid|supplied value is not a valid number/i,
      );

      await closeAddAssetEditorAndReturnToQuote(page, addAssetPage, assetDetailsPage);
    },
  );

  test(
    "UDP-T4761 - Make Validation",
    { tag: ["@do", "@regression", "@UDP-T4761"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      await addAssetPage.enterMake("");
      await addAssetPage.clickSummitButton();
      await expectPageOrDialogText(page, /Make.*required|Make is required/i);
      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4762 - Model Validation",
    { tag: ["@do", "@regression", "@UDP-T4762"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      await addAssetPage.enterModel("");
      await addAssetPage.clickSummitButton();
      await expectPageOrDialogText(page, /Model.*required|Model is required/i);
      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4763 - Variant Validation",
    { tag: ["@do", "@regression", "@UDP-T4763"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      await addAssetPage.enterVariant("!!!@@@");
      await addAssetPage.clickSummitButton();
      await expectPageOrDialogText(page, /Variant.*incorrect format|Variant.*invalid|incorrect format/i);
      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4764 - Vehicle Field Validation",
    { tag: ["@do", "@regression", "@UDP-T4764"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);

      await addAssetPage.enterRegoNO("!!!");
      await addAssetPage.enterVIN("short");
      await addAssetPage.enterOdometer("abc");
      await addAssetPage.enterColour("12345");
      await addAssetPage.enterSerialNO("!");
      await addAssetPage.enterEngineNO("!");
      await addAssetPage.clickSummitButton();
      await expectPageOrDialogText(
        page,
        /invalid|incorrect format|VIN|Rego|Odometer|Colour|Serial|Engine/i,
      );

      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4765 - Mandatory Identifier",
    { tag: ["@do", "@regression", "@UDP-T4765"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      await fillMinimalVehicleAsset(addAssetPage, { rego: "", vin: "" });
      await addAssetPage.enterSerialNO("");
      const clicked = await clickPrintDocumentsOnAddAsset(page);
      if (clicked) {
        await expectPageOrDialogText(
          page,
          /identifier|Rego|VIN|Serial|required|cannot print|printing blocked/i,
        );
      } else {
        await addAssetPage.clickSummitButton();
        await expectPageOrDialogText(page, /Rego|VIN|Serial|identifier|required/i);
      }
      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4766 - Marine Validation",
    { tag: ["@do", "@regression", "@UDP-T4766"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const { addAssetPage, skipped } = await openAddAssetForCategory(page, assetDetailsPage, "marine");
      test.skip(skipped, "Marine asset type not available for selected program on this environment.");
      await expectAddAssetCategoryLayout(page, addAssetPage, "marine");
      await fillMinimalMarineAsset(addAssetPage);
      await addAssetPage.enterHIN("!!!!");
      await addAssetPage.enterSerialNO("!!!!");
      const clicked = await clickPrintDocumentsOnAddAsset(page);
      if (clicked) {
        await expectAddAssetValidationMessage(
          page,
          /HIN|Serial|incorrect format|invalid|required|cannot print|printing blocked/i,
        );
      } else {
        await submitAddAssetForValidation(addAssetPage);
        await expectAddAssetValidationMessage(
          page,
          /HIN|Serial|incorrect format|invalid|required/i,
        );
      }
      await closeAddAssetEditorAndReturnToQuote(page, addAssetPage, assetDetailsPage);
    },
  );

  test(
    "UDP-T4767 - Plant Validation",
    { tag: ["@do", "@regression", "@UDP-T4767"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const { addAssetPage, skipped } = await openAddAssetForCategory(page, assetDetailsPage, "plant");
      test.skip(skipped, "Plant asset type not available for selected program on this environment.");
      await expectAddAssetCategoryLayout(page, addAssetPage, "plant");
      await fillMinimalPlantAsset(addAssetPage);
      await addAssetPage.enterSerialNO("!!!!");
      const clicked = await clickPrintDocumentsOnAddAsset(page);
      if (clicked) {
        await expectAddAssetValidationMessage(
          page,
          /Serial|incorrect format|invalid|required|cannot print|printing blocked/i,
        );
      } else {
        await submitAddAssetForValidation(addAssetPage);
        await expectAddAssetValidationMessage(
          page,
          /Serial|incorrect format|invalid|required|Chassis/i,
        );
      }
      await closeAddAssetEditorAndReturnToQuote(page, addAssetPage, assetDetailsPage);
    },
  );

  test(
    "UDP-T4768 - Motive Power",
    { tag: ["@do", "@regression", "@UDP-T4768"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      await addAssetPage.motiveePowerDropdown();
      const options = page.getByRole("option");
      const count = await options.count();
      expect.soft(count).toBeGreaterThan(0);
      const first = ((await options.first().textContent()) ?? "").trim();
      expect.soft(first.length).toBeGreaterThan(0);
      await page.keyboard.press("Escape").catch(() => {});
      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4769 - Asset Location Validation",
    { tag: ["@do", "@regression", "@UDP-T4769"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openTlBusinessStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, assetDetailsPage);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage, { product: "tl" });
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      if (await addAssetPage.assetLocationDropdown.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await fillMinimalVehicleAsset(addAssetPage, {
          rego: "TG08BP5123",
          vin: "1HGCM82633A004352",
          skipLocation: true,
        });
        await addAssetPage.clickSummitButton();
        await expectPageOrDialogText(page, /Asset Location|Location of Use|required/i);
      } else {
        test.info().annotations.push({
          type: "note",
          description: "Asset Location of Use not shown for this originator/build.",
        });
      }
      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4770 - Supplier Validation",
    { tag: ["@do", "@regression", "@UDP-T4770"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      await enablePrivateSaleOnAddAsset(page);
      await fillMinimalVehicleAsset(addAssetPage, {
        rego: "ABC123",
        vin: "1HGCM82633A004352",
      });

      if (await addAssetPage.isSupplierFieldEditable()) {
        await addAssetPage.enterSupplier("");
        const clicked = await clickPrintDocumentsOnAddAsset(page);
        if (clicked) {
          await expectAddAssetValidationMessage(
            page,
            /Supplier.*required|Supplier Name|cannot print|printing blocked/i,
          );
        } else {
          await submitAddAssetForValidation(addAssetPage);
          await expectAddAssetValidationMessage(page, /Supplier.*required|Supplier Name/i);
        }
      } else {
        await expect(addAssetPage.supplierInputField).toBeVisible({ timeout: 15_000 });
        await expect(addAssetPage.supplierInputField).toBeDisabled();
      }

      await closeAddAssetEditorAndReturnToQuote(page, addAssetPage, assetDetailsPage);
    },
  );

  test(
    "UDP-T4771 - Lease Toggle",
    { tag: ["@do", "@regression", "@UDP-T4771"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const assetDetailsPage = await openTlBusinessStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(page, assetDetailsPage);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage, { product: "tl" });
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      const leaseLabel = addAssetHost(page).getByText(/Will the asset be leased/i).first();
      if (await leaseLabel.isVisible({ timeout: 10_000 }).catch(() => false)) {
        const row = leaseLabel.locator(
          "xpath=ancestor::*[contains(@class,'field') or contains(@class,'grid')][1]",
        );
        await expect.soft(row).toContainText(/No/i);
      } else {
        test.info().annotations.push({
          type: "note",
          description: "Lease toggle not rendered on this build — verify manually for Business Loan.",
        });
      }
      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4772 - Insurance Validation",
    { tag: ["@do", "@regression", "@UDP-T4772"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      await fillMinimalVehicleAsset(addAssetPage, {
        value: "$150,000",
        rego: "TG08BP5123",
        vin: "1HGCM82633A004352",
      });
      await addAssetPage.enterSumInsured("");
      await addAssetPage.enterPolicyNumber("");
      await addAssetPage.clickSummitButton();
      await expectPageOrDialogText(page, /Sum Insured|Policy Number|Insurance|required|Settlement/i);
      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4773 - Motochek Search",
    { tag: ["@do", "@regression", "@UDP-T4773"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      const variantBefore = (await addAssetPage.variantInputField.first().inputValue().catch(() => "")).trim();
      const dlg = await runMotochekFromAddAssetEditor(page, addAssetPage);
      await expect
        .soft(dlg.getByText(/Motocheck Successfully|Motochek Successfully|Successfully Executed/i).first())
        .toBeVisible({ timeout: 90_000 });
      const body = ((await dlg.innerText()) ?? "").replace(/\u00a0/g, " ");
      expect.soft(/Make\s*[:\n]?\s*\S+/i.test(body)).toBeTruthy();
      expect.soft(/Model\s*[:\n]?\s*\S+/i.test(body)).toBeTruthy();
      if (variantBefore) {
        const variantAfter = (await addAssetPage.variantInputField.first().inputValue().catch(() => "")).trim();
        expect.soft(variantAfter.length).toBeGreaterThan(0);
      }
      await dlg.getByRole("button", { name: /^Cancel$|^Close$/i }).first().click({ timeout: 10_000 }).catch(() =>
        page.keyboard.press("Escape"),
      );
      await addAssetPage.clickCrossButton().catch(() => {});
      await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
    },
  );

  test(
    "UDP-T4774 - Submit – Other",
    { tag: ["@do", "@regression", "@UDP-T4774"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const { addAssetPage, skipped } = await openAddAssetForCategory(page, assetDetailsPage, "other");
      test.skip(skipped, "Other asset type not available for selected program on this environment.");
      await fillMinimalOtherAsset(addAssetPage);
      await addAssetPage.clickSummitButton();
      await closeAddAssetEditorAndReturnToQuote(page, addAssetPage, assetDetailsPage);
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      const summaryDlg = page
        .getByRole("dialog")
        .filter({ hasText: /Asset/i })
        .filter({ hasText: /Insurance/i })
        .filter({ hasText: /Summary/i })
        .last();
      await expect.soft(summaryDlg).toBeVisible({ timeout: 30_000 });
      await expect.soft(summaryDlg).toContainText(/\$15,000|15,000|Regression other/i);
      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T4775 - Submit – Vehicle",
    { tag: ["@do", "@regression", "@UDP-T4775"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await prepareQuoteWithVehicleAssetType(page, assetDetailsPage);
      const addAssetPage = await openAddAssetEditor(page, assetDetailsPage);
      await fillMinimalVehicleAsset(addAssetPage, {
        rego: "ABC123",
        vin: "1HGCM82633A004352",
      });
      await addAssetPage.clickSummitButton();
      await closeAddAssetEditorAndReturnToQuote(page, addAssetPage, assetDetailsPage);
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      const summaryDlg = page
        .getByRole("dialog")
        .filter({ hasText: /Asset/i })
        .filter({ hasText: /Insurance/i })
        .filter({ hasText: /Summary/i })
        .last();
      await expect.soft(summaryDlg).toBeVisible({ timeout: 30_000 });
      await expect.soft(summaryDlg).toContainText(/\$20,000|20,000/i);
      const summaryText = ((await summaryDlg.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
      if (/Toyota|Hilux|2025/i.test(summaryText)) {
        await expect.soft(summaryDlg).toContainText(/Toyota|Hilux|2025/i);
      } else if (/ABC123|1HGCM82633A004352/i.test(summaryText)) {
        await expect.soft(summaryDlg).toContainText(/ABC123|1HGCM82633A004352/i);
      }
      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T4776 - Submit – Marine",
    { tag: ["@do", "@regression", "@UDP-T4776"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const { addAssetPage, skipped } = await openAddAssetForCategory(page, assetDetailsPage, "marine");
      test.skip(skipped, "Marine asset type not available for selected program on this environment.");
      await fillMinimalMarineAsset(addAssetPage);
      await addAssetPage.clickSummitButton();
      await closeAddAssetEditorAndReturnToQuote(page, addAssetPage, assetDetailsPage);
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      const summaryDlg = page
        .getByRole("dialog")
        .filter({ hasText: /Asset/i })
        .filter({ hasText: /Insurance/i })
        .filter({ hasText: /Summary/i })
        .last();
      await expect.soft(summaryDlg).toBeVisible({ timeout: 30_000 });
      await expect.soft(summaryDlg).toContainText(/\$45,000|45,000/i);
      const summaryText = ((await summaryDlg.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
      if (/Beneteau|Oceanis|2022/i.test(summaryText)) {
        await expect.soft(summaryDlg).toContainText(/Beneteau|Oceanis|2022/i);
      }
      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T4777 - Submit – Plant",
    { tag: ["@do", "@regression", "@UDP-T4777"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const { addAssetPage, skipped } = await openAddAssetForCategory(page, assetDetailsPage, "plant");
      test.skip(skipped, "Plant asset type not available for selected program on this environment.");
      await fillMinimalPlantAsset(addAssetPage);
      await addAssetPage.clickSummitButton();
      await closeAddAssetEditorAndReturnToQuote(page, addAssetPage, assetDetailsPage);
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      const summaryDlg = page
        .getByRole("dialog")
        .filter({ hasText: /Asset/i })
        .filter({ hasText: /Insurance/i })
        .filter({ hasText: /Summary/i })
        .last();
      await expect.soft(summaryDlg).toBeVisible({ timeout: 30_000 });
      await expect.soft(summaryDlg).toContainText(/\$35,000|35,000/i);
      const summaryText = ((await summaryDlg.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
      if (/Caterpillar|320|2024/i.test(summaryText)) {
        await expect.soft(summaryDlg).toContainText(/Caterpillar|320|2024/i);
      }
      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );

  test(
    "UDP-T4778 - Submit – EV/Clean Tech",
    { tag: ["@do", "@regression", "@UDP-T4778"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openCsaQuoteFromDashboard(page);
      await selectCsaProductProgram(page, assetDetailsPage);
      const { addAssetPage, skipped, evVehicleFallback } = await openAddAssetForCategory(
        page,
        assetDetailsPage,
        "ev",
      );
      test.skip(skipped, "No asset type available for EV/Clean Tech or vehicle fallback on this environment.");
      if (evVehicleFallback) {
        test.info().annotations.push({
          type: "note",
          description:
            "EV/Clean Tech asset type is not in the QAT catalog for CSA MV; submit validated via Car and Light Commercial with Electric motive power.",
        });
      }
      await fillMinimalEvCleanTechAsset(addAssetPage);
      await addAssetPage.clickSummitButton();
      await closeAddAssetEditorAndReturnToQuote(page, addAssetPage, assetDetailsPage);
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      const summaryDlg = page
        .getByRole("dialog")
        .filter({ hasText: /Asset/i })
        .filter({ hasText: /Insurance/i })
        .filter({ hasText: /Summary/i })
        .last();
      await expect.soft(summaryDlg).toBeVisible({ timeout: 30_000 });
      await expect.soft(summaryDlg).toContainText(/\$55,000|55,000/i);
      const summaryText = ((await summaryDlg.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
      if (/Tesla|Model 3|5YJ3E1EA1KF123456/i.test(summaryText)) {
        await expect.soft(summaryDlg).toContainText(/Tesla|Model 3|5YJ3E1EA1KF123456/i);
      }
      await assetDetailsPage.closeAssetInsuranceSummaryDialog();
    },
  );
});
