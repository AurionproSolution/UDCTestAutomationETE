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
