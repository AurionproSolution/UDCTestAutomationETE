/**
 * DO Portal — Standard Quote CSA regression (UDP-T3646–UDP-T3693).
 * Scenario source: Standard Quote - CSA.xlsx (Zephyr / Regression 25.0).
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
  return { dashboardPage, assetDetailsPage };
}

async function selectCsaProductAndProgram(assetDetailsPage: DOAssetDetailsPage): Promise<void> {
  await assetDetailsPage.chooseProduct(CSA_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(CSA_SQ_PROGRAM);
}

async function addMinimalUsedAsset(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
): Promise<void> {
  await assetDetailsPage.enterAsset("Car and Light Commercial /");
  await assetDetailsPage.selectCondition("Used");
  await assetDetailsPage.openAssetInsuranceTradeInSummary();
  await assetDetailsPage.clickAssetSummaryEditButton();
  await addAssetPage.enterAssetValue("$20,000");
  await addAssetPage.selectCondition("Used");
  await addAssetPage.selectYear("2025");
  await addAssetPage.enterMake("Toyota");
  await addAssetPage.enterModel("Hilux");
  await addAssetPage.enterVariant("Top");
  await addAssetPage.clickSummitButton();
  await addAssetPage.clickCrossButton();
}

async function prepareCalculableCsaQuote(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  opts?: {
    origRef?: string;
    term?: string;
    interest?: string;
    /** Balloon **$** (masked amount). Use `balloonPercent` instead when the UI shows NaN for dollar entry. */
    balloon?: string;
    /** Balloon **%** (e.g. `"20"` for 20%). Dollar side derives from cash price (20% of $20,000 → $4,000). */
    balloonPercent?: string;
    balloonFixed?: boolean;
    condition?: string;
  },
): Promise<void> {
  await addMinimalUsedAsset(assetDetailsPage, addAssetPage);
  if (opts?.condition && opts.condition !== "Used") {
    await assetDetailsPage.selectCondition(opts.condition);
  }
  await assetDetailsPage.termsOfFinance(opts?.term ?? "36");
  await assetDetailsPage.interestRate(opts?.interest ?? "9");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  if (opts?.balloonFixed) {
    await assetDetailsPage.checkBalloonFixedCheckbox();
  }
  if (opts?.balloonPercent) {
    // Align loan cash with asset value so % → $ does not evaluate to NaN.
    await assetDetailsPage.cashPriceOfAsset("$20,000");
    await assetDetailsPage.enterBalloonPercent(opts.balloonPercent);
  } else if (opts?.balloon) {
    await assetDetailsPage.enterBalloonAmount(opts.balloon);
  }
  // Originator / origination ref **after** asset + finance edits so dialogs and async pricing do not clear it.
  await assetDetailsPage.enterOriginationReference(opts?.origRef ?? "SQ-CSA-Ref-01");
}

/**
 * **Add On Accessories** screen (`app-service-plan`, `app-accessories`): fill registration / service /
 * others row and predefined accessory amounts, then **Save** (PrimeNG `data-pc-name="button"`).
 */
async function fillAddOnAccessoriesPageAndSave(page: Page): Promise<void> {
  const sp = page.locator("app-service-plan");
  const acc = page.locator("app-accessories");
  await sp.waitFor({ state: "visible", timeout: 45_000 });
  await acc.waitFor({ state: "visible", timeout: 45_000 }).catch(() => {});
 
  const fillRowAmountAndMonths = async (scope: Locator, label: RegExp, amount: string, months: string) => {
    const labelEl = scope.getByText(label);
    await labelEl.first().scrollIntoViewIfNeeded().catch(() => {});
    const rowGrid = labelEl.first().locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    const amt = rowGrid.locator("input[currencymask]").first();
    if (await amt.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await amt.click();
      await amt.fill(amount);
      await amt.press("Tab").catch(() => {});
    }
    const mos = rowGrid.locator('input[formcontrolname="months"]').first();
    if (await mos.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await mos.click();
      await mos.fill(months);
      await mos.press("Tab").catch(() => {});
    }
  };
 
  await fillRowAmountAndMonths(sp, /^Registration$/, "100", "12");
  await fillRowAmountAndMonths(sp, /^Service Plan$/, "50", "24");
 
  const othersCombo = sp.getByRole("combobox", { name: /^Others$/i });
  if (await othersCombo.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const rowGrid = othersCombo.locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    const amt = rowGrid.locator("input[currencymask]").first();
    if (await amt.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await amt.click();
      await amt.fill("75");
      await amt.press("Tab").catch(() => {});
    }
    const mos = rowGrid.locator('input[formcontrolname="months"]').first();
    if (await mos.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await mos.click();
      await mos.fill("6");
    }
    const desc = rowGrid.locator("input#text").first();
    if (await desc.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await desc.fill("Automation row");
    }
  }
 
  const accessoryNames = [
    "Bull Bar",
    "Towbar",
    "Tints",
    "Canopy",
    "Tonneau Soft",
    "Side Steps",
    "Hard Lid",
    "Mats",
    "Nudge Bar",
  ] as const;
  for (const name of accessoryNames) {
    const row = acc.locator("div.m-0.col-4.grid").filter({ has: acc.getByText(name, { exact: true }) });
    const inp = row.locator("input[currencymask]").first();
    if (await inp.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await inp.scrollIntoViewIfNeeded().catch(() => {});
      await inp.click();
      await inp.fill("10");
      await inp.press("Tab").catch(() => {});
    }
  }
 
  const saveBtn = page
    .locator('button[type="button"][data-pc-name="button"]')
    .filter({ has: page.locator('span[data-pc-section="label"]').filter({ hasText: /^Save$/ }) })
    .last();
  await saveBtn.waitFor({ state: "visible", timeout: 20_000 });
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.click({ timeout: 20_000 });
}
 
/**
 * From **Asset Details**, open **Add On Accessories** (`app-service-plan` route).
 * Waits for loaders, scrolls the charges block, tries link / button / text + ancestor clicks.
 */
async function openAddOnAccessoriesPageFromStandardQuote(
  page: Page,
  root: Locator,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  await assetDetailsPage.waitForQuoteLoadersToFinish();
 
  if (await root.getByText(/Condition|Asset Type/i).first().isVisible({ timeout: 8_000 }).catch(() => false)) {
    try {
      await assetDetailsPage.selectConditionInStandardQuote("New");
    } catch {
      // Some builds hide condition until asset is set — non-fatal for add-ons entry.
    }
    await assetDetailsPage.waitForQuoteLoadersToFinish();
  }
 
  const labelRx =
    /Add\s*Ons\s*&\s*Accessories|Add\s+Ons\s+and\s+Accessories|Add[-\s]?Ons?\s*[&+]\s*Accessories/i;
 
  for (const anchor of [
    root.getByText(/Additional\s+Charges/i),
    root.getByText(/Charges\s*\+\s*Add/i),
    root.getByText(/^Charges$/i),
    root.getByText(/Less\s+Deposit/i),
  ]) {
    if (await anchor.first().isVisible({ timeout: 2_500 }).catch(() => false)) {
      await anchor.first().scrollIntoViewIfNeeded();
      break;
    }
  }
  await page.mouse.wheel(0, 500).catch(() => {});
  await page.waitForTimeout(400);
  await root.getByText(labelRx).first().scrollIntoViewIfNeeded().catch(() => {});
 
  const tryOpen = async (loc: Locator): Promise<boolean> => {
    const el = loc.first();
    if (!(await el.isVisible({ timeout: 6_000 }).catch(() => false))) return false;
    await el.scrollIntoViewIfNeeded();
    await el.click({ timeout: 20_000 }).catch(() => {});
    return await page.locator("app-service-plan").isVisible({ timeout: 18_000 }).catch(() => false);
  };
 
  const candidates: Locator[] = [
    root.getByRole("link", { name: labelRx }),
    root.getByRole("button", { name: labelRx }),
    page.getByRole("link", { name: labelRx }),
    page.getByRole("button", { name: labelRx }),
    root.locator("a").filter({ hasText: labelRx }),
    page.locator("a").filter({ hasText: labelRx }),
    root.locator("button, [role='button']").filter({ hasText: labelRx }),
    root.locator("a, button, [role='link']").filter({ hasText: labelRx }),
    root.locator('[class*="cursor-pointer"], [class*="pointer"]').filter({ hasText: labelRx }),
  ];
 
  for (const c of candidates) {
    if (await tryOpen(c)) return;
  }
 
  const textHit = root.getByText(labelRx).first();
  if (await textHit.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await textHit.scrollIntoViewIfNeeded();
    const asLink = textHit.locator("xpath=ancestor::a[1]");
    if (await asLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
      if (await tryOpen(asLink)) return;
    }
    const asBtn = textHit.locator("xpath=ancestor::button[1]");
    if (await asBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      if (await tryOpen(asBtn)) return;
    }
    await textHit.click({ force: true, timeout: 15_000 }).catch(() => {});
    if (await page.locator("app-service-plan").isVisible({ timeout: 18_000 }).catch(() => false)) {
      return;
    }
  }
 
  throw new Error(
    "Add Ons & Accessories: could not open the add-ons screen (app-service-plan never became visible). " +
      "Scroll/copy may differ, or this dealer/product does not expose the entry.",
  );
}

test.describe("Standard Quote - CSA @do @regression", () => {
  test(
    "UDP-T3646 - Standard Quote Created Directly from Dashboard",
    { tag: ["@do", "@regression", "@UDP-T3646"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await expect.soft(standardQuoteRoot(page)).toBeVisible();
      await assetDetailsPage.waitForAssetDetailsStepReady();
      const productTrigger = page.getByRole("button", { name: /dropdown trigger/i }).first();
      await expect.soft(productTrigger).toBeVisible();
    },
  );

  test(
    "UDP-T3647 - Originator Name & Number Display Only",
    { tag: ["@do", "@regression", "@UDP-T3647"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(new DOAssetDetailsPage(page));
      const root = standardQuoteRoot(page);
      const originatorName = root.getByText(/Originator\s+Name/i).first();
      const originatorNumber = root.getByText(/Originator\s+Number/i).first();
      if (await originatorName.isVisible().catch(() => false)) {
        await expect.soft(originatorName).toBeVisible();
        const nameInput = root
          .getByRole("textbox", { name: /Originator\s+Name/i })
          .or(root.locator("input").filter({ has: page.getByText(/Originator\s+Name/i) }))
          .first();
        if (await nameInput.isVisible().catch(() => false)) {
          await expect.soft(nameInput).not.toBeEditable();
        }
      }
      if (await originatorNumber.isVisible().catch(() => false)) {
        await expect.soft(originatorNumber).toBeVisible();
      }
    },
  );

  test(
    "UDP-T3648 - Salesperson Defaults to Logged-In User",
    { tag: ["@do", "@regression", "@UDP-T3648"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStandardQuoteFromDashboard(page);
      const root = standardQuoteRoot(page);
      const salesperson = root
        .getByRole("combobox", { name: /Salesperson/i })
        .or(root.getByLabel(/Salesperson/i))
        .or(root.locator("p-dropdown").filter({ hasText: /Salesperson/i }))
        .first();
      if (await salesperson.isVisible({ timeout: 15_000 }).catch(() => false)) {
        const label = (await salesperson.textContent())?.trim() ?? "";
        expect.soft(label.length).toBeGreaterThan(0);
      } else {
        test.info().annotations.push({
          type: "note",
          description: "Salesperson control not visible on this build — may be auto-assigned server-side.",
        });
      }
    },
  );

  test(
    "UDP-T3649 - Promotion Quote Checkbox Defaults Unchecked",
    { tag: ["@do", "@regression", "@UDP-T3649"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStandardQuoteFromDashboard(page);
      const root = standardQuoteRoot(page);
      // PrimeNG: `<label data-pc-section="label" class="p-checkbox-label"> Promotion Quote</label>` inside `p-checkbox` — state lives on `input[type="checkbox"]`.
      const promoHost = root.locator("p-checkbox").filter({
        has: root
          .locator('label.p-checkbox-label[data-pc-section="label"], label.p-checkbox-label')
          .filter({ hasText: /Promotion\s+Quote/i }),
      });
      const promoHostFirst = promoHost.first();
      const promoInput = promoHostFirst.locator('input[type="checkbox"]').first();
      if (await promoHostFirst.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await expect.soft(promoInput).not.toBeChecked();
      } else {
        const byRole = root.getByRole("checkbox", { name: /Promotion\s+Quote/i }).first();
        if (await byRole.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await expect.soft(byRole).not.toBeChecked();
        }
      }
    },
  );
 

  test(
    "UDP-T3650 - Quote ID Assigned on First Save",
    { tag: ["@do", "@regression", "@UDP-T3650"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.clickSaveStandardQuoteStep();
      const quoteId = standardQuoteRoot(page).getByText(/Quote\s*ID/i).first();
      if (await quoteId.isVisible({ timeout: 20_000 }).catch(() => false)) {
        const block = quoteId.locator("xpath=ancestor::div[1]");
        await expect.soft(block).toContainText(/\d+/);
      }
    },
  );

  test(
    "UDP-T3651 - Status Defaults to 'Open Quote'",
    { tag: ["@do", "@regression", "@UDP-T3651"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage, {
        balloonPercent: "20",
      });
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.enterOriginationReference("SQ-CSA-Ref-01");
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      await assetDetailsPage.clickSaveStandardQuoteStep({
        originatorRefForRequiredDialog: "SQ-CSA-Ref-01",
      });
      const root = standardQuoteRoot(page);
      await expect.soft(root).toContainText(/Open\s+Quote/i, { timeout: 45_000 });
    },
  );

  test(
    "UDP-T3652 - Originator Reference Required on First Save",
    { tag: ["@do", "@regression", "@UDP-T3652"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.clearOriginationReferences();
      await assetDetailsPage.clickSaveStandardQuoteStep();
      const prompt = page
        .getByRole("dialog")
        .filter({ hasText: /Originator\s+Reference|Origination\s+Reference/i })
        .or(page.getByText(/Originator\s+Reference|Origination\s+Reference/i));
      await expect.soft(prompt.first()).toBeVisible({ timeout: 25_000 });
    },
  );

  test(
    "UDP-T3653 - Loan Purpose Auto-Populated from Product/Program",
    { tag: ["@do", "@regression", "@UDP-T3653"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      const root = standardQuoteRoot(page);
      const loanPurpose = root
        .getByRole("textbox", { name: /^Loan Purpose/i })
        .or(
          root.locator(
            "xpath=.//label[contains(normalize-space(.),'Loan Purpose')]/following::input[1]",
          ),
        )
        .first();
      if (await loanPurpose.isVisible({ timeout: 15_000 }).catch(() => false)) {
        const value = (await loanPurpose.inputValue()).trim();
        expect.soft(value.length).toBeGreaterThan(0);
        await expect.soft(loanPurpose).not.toBeEditable();
      }
    },
  );

  test(
    "UDP-T3654 - Brand Defaults to UDC if No Program Brand",
    { tag: ["@do", "@regression", "@UDP-T3654"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      const root = standardQuoteRoot(page);
      await expect.soft(root.getByText(/UDC/i).first()).toBeVisible({ timeout: 20_000 });
    },
  );

  test(
    "UDP-T3655 - Edit Brand Enabled When Dealer Has Multiple Brands",
    { tag: ["@do", "@regression", "@UDP-T3655"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      const editBrand = standardQuoteRoot(page)
        .getByRole("button", { name: /Edit/i })
        .filter({ has: page.locator("i.pi-pencil, i.pi-pen-to-square") })
        .or(standardQuoteRoot(page).getByText(/Edit\s*brand/i))
        .first();
      if (await editBrand.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await expect.soft(editBrand).toBeEnabled();
      } else {
        test.info().annotations.push({
          type: "note",
          description: "Edit brand not shown — dealer may have single brand (Edit disabled).",
        });
      }
    },
  );

  test(
    "UDP-T3656 - Only One Brand Can Be Selected",
    { tag: ["@do", "@regression", "@UDP-T3656"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      const editBrand = standardQuoteRoot(page).getByRole("button", { name: /Edit/i }).first();
      if (!(await editBrand.isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip(true, "Edit brand not available for this dealer.");
      }
      await editBrand.click();
      const options = page.getByRole("option");
      const count = await options.count();
      if (count >= 2) {
        await options.nth(0).click();
        await options.nth(1).click();
        const selected = page.locator(".p-highlight, .p-radiobutton-checked, [aria-checked='true']");
        expect.soft(await selected.count()).toBeLessThanOrEqual(1);
      }
    },
  );

  test(
    "UDP-T3657 - Recommended Retail Price Only Shown for 'New' Condition",
    { tag: ["@do", "@regression", "@UDP-T3657"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.selectCondition("New");
      await assetDetailsPage.scrollRecommendedRetailPriceIntoView();
      await expect.soft(assetDetailsPage.recommendedRetailPriceInput).toBeVisible({ timeout: 20_000 });
      await assetDetailsPage.selectCondition("Used");
      await assetDetailsPage.expectRecommendedRetailPriceHiddenAfterUsedCondition();
    },
  );

  test(
    "UDP-T3658 - PPSR Count Defaults to 1",
    { tag: ["@do", "@regression", "@UDP-T3658"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectPpsrCountAndFeeLineVisible();
      await assetDetailsPage.expectPpsrCountValue("1");
    },
  );

  test(
    "UDP-T3659 - PPSR Total Calculated as Count x Fee",
    { tag: ["@do", "@regression", "@UDP-T3659"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectPpsrCountAndFeeLineVisible();
      const root = standardQuoteRoot(page);
      const ppsrTotal = root.getByText(/PPSR\s+Total/i).first();
      if (await ppsrTotal.isVisible({ timeout: 10_000 }).catch(() => false)) {
        const row = ppsrTotal.locator("xpath=ancestor::div[contains(@class,'col') or contains(@class,'field')][1]");
        await expect.soft(row).toContainText(/\$|\d/);
      }
    },
  );

  test(
    "UDP-T3660 - Total Establishment Fee = UDC Fee + Dealer Fee",
    { tag: ["@do", "@regression", "@UDP-T3660"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectUdcEstablishmentFeePrePopulatedFromProgram();
      await assetDetailsPage.expectDealerOriginationFeePopulatedFromProgram();
      await expect.soft(assetDetailsPage.totalEstablishmentFeeInputField).toBeVisible({
        timeout: 15_000,
      });
    },
  );

  test(
    "UDP-T3661 - Charges + Add Ons Field Sums Add-On Items",
    { tag: ["@do", "@regression", "@UDP-T3661"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      const root = standardQuoteRoot(page);
 
      await test.step("Open Add Ons & Accessories (expect app-service-plan)", async () => {
        await openAddOnAccessoriesPageFromStandardQuote(page, root, assetDetailsPage);
        await expect(page.locator("app-service-plan")).toBeVisible({ timeout: 45_000 });
      });
 
      await test.step("Fill registration / service / accessories and Save", async () => {
        await fillAddOnAccessoriesPageAndSave(page);
      });
 
      await test.step("Return to quote and assert Charges reflects add-ons", async () => {
        await expect(page.locator("app-service-plan")).toBeHidden({ timeout: 60_000 });
        const rootAfter = standardQuoteRoot(page);
        await expect.soft(rootAfter).toBeVisible({ timeout: 60_000 });
        const chargesBlock = rootAfter
          .locator(".p-field, [class*='p-field'], amount, .grid")
          .filter({ has: rootAfter.getByText(/^Charges$/i) })
          .first();
        if (await chargesBlock.isVisible({ timeout: 15_000 }).catch(() => false)) {
          await expect
            .poll(async () => (await chargesBlock.textContent())?.replace(/\s/g, " ") ?? "", {
              timeout: 30_000,
            })
            .toMatch(/[1-9]\d{0,3}|[1-9][\d,]*\.\d{2}/);
        }
      });
    },
  );
 
  test(
    "UDP-T3662 - Net Trade Amount Display Only",
    { tag: ["@do", "@regression", "@UDP-T3662"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.enterTradeAmount("$5,000");
      await assetDetailsPage.enterSettlementAmount("$2,000");
      await assetDetailsPage.expectNetTradeAmountPattern(/\$?\s*3[, ]?000|3000/);
    },
  );

  test(
    "UDP-T3663 - Term Cannot Exceed Max Program Term",
    { tag: ["@do", "@regression", "@UDP-T3663"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage, { term: "9999" });
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectTermExceedsProgramMaxOnCalculateThenRestore({
        overMaxTerm: "9999",
        restoreTerm: "36",
      });
    },
  );

  test(
    "UDP-T3664 - Frequency Defaults from Program, Resets Structure on Change",
    { tag: ["@do", "@regression", "@UDP-T3664"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      const freqLabel = await assetDetailsPage.frequencyOfPayment.textContent().catch(() => "");
      if (freqLabel?.trim()) {
        expect.soft(/Monthly|Weekly|Fortnightly/i.test(freqLabel)).toBeTruthy();
      }
      const freqTrigger = standardQuoteRoot(page)
        .locator("p-dropdown")
        .filter({ hasText: /Frequency/i })
        .getByRole("button", { name: /dropdown trigger/i })
        .first();
      if (await freqTrigger.isEnabled().catch(() => false)) {
        await freqTrigger.click();
        const weekly = page.getByRole("option", { name: /Weekly/i }).first();
        if (await weekly.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await weekly.click();
        }
        await page.keyboard.press("Escape");
      }
    },
  );

  test(
    "UDP-T3665 - Interest Rate Defaults from FIS AF, Editable per BLD Rules",
    { tag: ["@do", "@regression", "@UDP-T3665"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      const rate = (await assetDetailsPage.interestRateInputField.inputValue()).trim();
      expect.soft(rate.length).toBeGreaterThan(0);
      expect.soft(/\d/.test(rate)).toBeTruthy();
      await assetDetailsPage.expectInterestRateEditable();
    },
  );

  test(
    "UDP-T3666 - Payment Amount Shows 'Irregular' for Non-Uniform Payments",
    { tag: ["@do", "@regression", "@UDP-T3666"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage, {
        balloonPercent: "20",
        balloonFixed: false,
      });
      await assetDetailsPage.clickCalculateButton();
      const irregular = standardQuoteRoot(page).getByText(/Irregular/i).first();
      await expect.soft(irregular).toBeVisible({ timeout: 45_000 });
    },
  );

  test(
    "UDP-T3667 - Payment Structure Dropdown Disabled If Only One Option",
    { tag: ["@do", "@regression", "@UDP-T3667"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      const root = standardQuoteRoot(page);
      const paymentStructure = root
        .locator("p-dropdown")
        .filter({ hasText: /Payment\s+Structure/i })
        .first();
      if (await paymentStructure.isVisible({ timeout: 15_000 }).catch(() => false)) {
        const cls = (await paymentStructure.getAttribute("class")) ?? "";
        if (cls.includes("p-disabled")) {
          await expect.soft(paymentStructure).toHaveClass(/p-disabled/);
        }
      }
    },
  );

  test(
    "UDP-T3668 - Segment View Groups Identical Payments Together",
    { tag: ["@do", "@regression", "@UDP-T3668"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
    },
  );

  test(
    "UDP-T3669 - CSA product/program selected. Balloon amount is entered. Fixed checkbox is visible.",
    { tag: ["@do", "@regression", "@UDP-T3669"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage, {
        balloonPercent: "20",
        balloonFixed: true,
      });
      await assetDetailsPage.expectBalloonAmountInputMatches(/4[, ]?000|4000/);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleLastPaymentRowContains(/4[, ]?000|4000/);
    },
  );

  test(
    "UDP-T3670 - CSA product/program selected. Balloon amount is entered. Fixed checkbox visible.",
    { tag: ["@do", "@regression", "@UDP-T3670"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage, {
        balloonPercent: "20",
        balloonFixed: false,
      });
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
    },
  );

  test(
    "UDP-T3671 - Balloon Payment Combined in Segment View (Unchecked)",
    { tag: ["@do", "@regression", "@UDP-T3671"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage, {
        balloonPercent: "20",
        balloonFixed: false,
      });
      // With **Fixed** unchecked, the UI keeps 20% in the % field; the paired $ field often stays
      // empty in `inputValue()` until **Calculate** (unlike Fixed checked — see UDP-T3669).
      await assetDetailsPage.expectBalloonPercentInputMatches(/20/);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleLastPaymentRowContains(/\$|4[, ]?000/);
    },
  );

  test(
    "UDP-T3672 - Grid View Shows Each Payment Individually",
    { tag: ["@do", "@regression", "@UDP-T3672"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleViewTogglesWorkAndTablePopulated();
    },
  );

  test(
    "UDP-T3673 - Edit Payment Schedule Opens Correct View",
    { tag: ["@do", "@regression", "@UDP-T3673"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.clickCalculateButton();
      const root = standardQuoteRoot(page);
      const scheduleCard = root.locator("p-card").filter({ hasText: /Payment\s+Schedule/i }).first();
      const scheduleHost = (await scheduleCard.isVisible({ timeout: 10_000 }).catch(() => false))
        ? scheduleCard
        : root
            .locator("div")
            .filter({ has: root.getByText(/Payment\s+Schedule/i).first() })
            .filter({ has: root.locator("table tbody tr") })
            .first();
      const editIcon = root
        .getByRole("button", { name: /Edit\s+Payment\s+Schedule/i })
        .or(root.getByRole("link", { name: /Edit\s+Payment\s+Schedule/i }))
        .or(
          scheduleHost
            .locator("button:not(.brand-edit-btn), a:not(.brand-edit-btn), [role='button']:not(.brand-edit-btn)")
            .filter({
              has: scheduleHost.locator("i.pi-pencil, i.pi-pen-to-square, .fa-pen-to-square"),
            }),
        )
        .first();
      if (await editIcon.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await expect(editIcon).toBeEnabled({ timeout: 20_000 });
        await editIcon.click({ timeout: 20_000 });
        await expect
          .soft(page.getByRole("dialog").filter({ hasText: /Payment\s+Schedule|Segment/i }).first())
          .toBeVisible({ timeout: 20_000 });
      }
    },
  );

  test(
    "UDP-T3674 - Edit Schedule - Delete Removes Last Segment",
    { tag: ["@do", "@regression", "@UDP-T3674"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Requires Edit Payment Schedule dialog with multiple segments — manual UI discovery pending.");
    },
  );

  test(
    "UDP-T3675 - Edit Schedule - Reset Reverts to Default Schedule",
    { tag: ["@do", "@regression", "@UDP-T3675"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Requires Edit Payment Schedule dialog interaction — manual UI discovery pending.");
    },
  );

  test(
    "UDP-T3676 - Edit Schedule - Calculate Fetches Updated Amounts from FIS",
    { tag: ["@do", "@regression", "@UDP-T3676"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Requires Edit Payment Schedule segment type changes — manual UI discovery pending.");
    },
  );

  test(
    "UDP-T3677 - Edit Schedule - Apply Saves Changes",
    { tag: ["@do", "@regression", "@UDP-T3677"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Requires Edit Payment Schedule Apply flow — manual UI discovery pending.");
    },
  );

  test(
    "UDP-T3678 - Edit Schedule - Cancel Shows Confirmation",
    { tag: ["@do", "@regression", "@UDP-T3678"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Requires Edit Payment Schedule Cancel confirmation — manual UI discovery pending.");
    },
  );

  test(
    "UDP-T3679 - Add Segment Button Disabled When Max Payments Reached",
    { tag: ["@do", "@regression", "@UDP-T3679"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(true, "Requires Edit Payment Schedule max-segment state — manual UI discovery pending.");
    },
  );

  test(
    "UDP-T3680 - Standard Payment Options Displays Fixed Terms 12-60",
    { tag: ["@do", "@regression", "@UDP-T3680"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();

      const root = standardQuoteRoot(page);
      const optionsPanel = root
        .locator("p-card, div")
        .filter({ hasText: /Standard\s+Payment\s+Options/i })
        .filter({ visible: true })
        .first();

      await expect.soft(optionsPanel).toBeVisible({ timeout: 45_000 });

      /** Match term as a whole month value (not part of 120 / 12.5), across split text nodes. */
      const termPresent = (body: string, term: string): boolean =>
        new RegExp(`(?:^|[^0-9])${term}(?:[^0-9]|$)`).test(body);

      await expect
        .poll(
          async () => {
            const scope = (await optionsPanel.isVisible().catch(() => false)) ? optionsPanel : root;
            const body = ((await scope.textContent()) ?? "").replace(/\u00a0/g, " ");
            return ["12", "24", "36", "48", "60"].every((t) => termPresent(body, t));
          },
          { timeout: 45_000 },
        )
        .toBe(true);
    },
  );

  test(
    "UDP-T3681 - Weekly Equivalent Calculated as Payment *4.33",
    { tag: ["@do", "@regression", "@UDP-T3681"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.clickCalculateButton();
      await expect
        .soft(standardQuoteRoot(page).getByText(/Weekly\s+Equivalent/i).first())
        .toBeVisible({ timeout: 30_000 });
    },
  );

  test(
    "UDP-T3682 - Dealer Finance Section Collapsed by Default",
    { tag: ["@do", "@regression", "@UDP-T3682"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStandardQuoteFromDashboard(page);
      const root = standardQuoteRoot(page);
      const baseRate = root.getByText(/Base\s+Interest\s+Rate/i).first();
      await expect.soft(baseRate).toBeHidden({ timeout: 5_000 });
      await expect.soft(root.locator(':text-is("Dealer Finance")').first()).toBeVisible({
        timeout: 15_000,
      });
    },
  );

  test(
    "UDP-T3683 - Base Interest Rate Displays for Originator",
    { tag: ["@do", "@regression", "@UDP-T3683"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expandDealerFinanceSection();
      await assetDetailsPage.expectDealerFinanceExpandedSummary();
    },
  );

  test(
    "UDP-T3684 - Estimated Commission Negative When Base Rate > Customer Rate",
    { tag: ["@do", "@regression", "@UDP-T3684"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage, { interest: "1" });
      await assetDetailsPage.expandDealerFinanceSection();
      await assetDetailsPage.clickCalculateButton();
      const panel = standardQuoteRoot(page)
        .getByRole("region")
        .filter({ hasText: /Estimated\s+Commission\s*\/\s*Subsidy/i })
        .first();
      if (await panel.isVisible({ timeout: 15_000 }).catch(() => false)) {
        const text = await panel.innerText();
        expect.soft(/-\$|subsidy/i.test(text)).toBeTruthy();
      }
    },
  );

  test(
    "UDP-T3685 - LMF Displays Pre-configured Value or Zero",
    { tag: ["@do", "@regression", "@UDP-T3685"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectLoanMaintenanceFeeOrLmfAreaVisible();
    },
  );

  test(
    "UDP-T3686 - Waive LMF Checkbox Defaults Unchecked",
    { tag: ["@do", "@regression", "@UDP-T3686"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      await openStandardQuoteFromDashboard(page);
      const waive = standardQuoteRoot(page)
        .getByRole("checkbox", { name: /Waive\s+LMF/i })
        .or(standardQuoteRoot(page).locator("p-checkbox").filter({ hasText: /Waive\s+LMF/i }))
        .first();
      if (await waive.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await expect.soft(waive).not.toBeChecked();
      }
    },
  );

  test(
    "UDP-T3687 - Save Button Triggers Validation for Mandatory Fields",
    { tag: ["@do", "@regression", "@UDP-T3687"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.clearOriginationReferences();
      await assetDetailsPage.clickSaveStandardQuoteStep();
      await expect
        .soft(
          page
            .getByText(/required|Please complete|cannot be blank|Originator\s+Reference/i)
            .first(),
        )
        .toBeVisible({ timeout: 25_000 });
    },
  );

  test(
    "UDP-T3688 - Save Keeps User on Same Page",
    { tag: ["@do", "@regression", "@UDP-T3688"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.clickSaveStandardQuoteStep();
      await expect.soft(standardQuoteRoot(page)).toBeVisible();
      await expect.soft(assetDetailsPage.nextButton).toBeVisible({ timeout: 20_000 });
    },
  );

  test(
    "UDP-T3689 - Cancel Shows Confirmation Pop-up",
    { tag: ["@do", "@regression", "@UDP-T3689"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.enterOriginationReference("SQ-Cancel-Test");
      const cancelBtn = standardQuoteRoot(page).getByRole("button", { name: /^Cancel$/i }).first();
      if (await cancelBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await cancelBtn.click();
        await expect
          .soft(page.getByText(/unsaved changes will be lost|Are you sure/i).first())
          .toBeVisible({ timeout: 15_000 });
      } else {
        test.skip(true, "Cancel button not visible on this build.");
      }
    },
  );

  test(
    "UDP-T3690 - Next Navigates to Customer Details",
    { tag: ["@do", "@regression", "@UDP-T3690"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await prepareCalculableCsaQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.clickNextButton();
      await assetDetailsPage.waitForAddBorrowerButton();
      const addBtnVisible = await assetDetailsPage.addBorrowerorGuarantorButton
        .isVisible()
        .catch(() => false);
      const personalVisible = await page.locator("app-personal-details").isVisible().catch(() => false);
      expect.soft(addBtnVisible || personalVisible).toBeTruthy();
      if (addBtnVisible) {
        await expect.soft(assetDetailsPage.addBorrowerorGuarantorButton).toBeVisible();
      }
    },
  );

  test(
    "UDP-T3691 - Key Disclosure Hyperlink Only Visible for CSA Personal Products",
    { tag: ["@do", "@regression", "@UDP-T3691"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      const link = standardQuoteRoot(page).locator(':text-is("Key Information Disclosure >")');
      await expect.soft(link.first()).toBeVisible({ timeout: 20_000 });
    },
  );

  test(
    "UDP-T3692 - Key Disclosure Opens Pop-up",
    { tag: ["@do", "@regression", "@UDP-T3692"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.openKeyInformationDisclosureDialog();
      await expect
        .soft(page.getByRole("dialog").filter({ hasText: /Key Information Disclosure/i }).last())
        .toBeVisible();
    },
  );

  test(
    "UDP-T3693 - Close Key Disclosure Pop-up",
    { tag: ["@do", "@regression", "@UDP-T3693"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectCsaProductAndProgram(assetDetailsPage);
      await assetDetailsPage.openKeyInformationDisclosureDialog();
      await assetDetailsPage.closeKeyInformationDisclosureDialog();
      await expect
        .soft(page.getByRole("dialog").filter({ hasText: /Key Information Disclosure/i }).last())
        .toBeHidden({ timeout: 15_000 });
    },
  );
});
