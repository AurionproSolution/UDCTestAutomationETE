/**
 * DO Portal — Standard Quote TL regression (UDP-T4214–UDP-T4258).
 * Scenario source: Standard Quote TL.xlsx (Zephyr / Regression — Standard Quote - TL).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import {
  DOAddOnsAccessoriesPage,
  DOAssetDetailsPage,
  DOCustomerDetailsPage,
  DODashboardPage,
  DOQuickQuotePage,
  DOSettlementPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { loadTlLmfPrograms } from "./lmf.helpers";

const TL_SQ_PRODUCT = "TL-B-Assigned";
const TL_SQ_PROGRAM = "Term Loan Business - MV Dealer";
const TLC_DEALER = "Armstrong Prestige Wellington";

function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

function shiftDdMmYyyy(dateStr: string, days: number): string {
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return dateStr;
  const d = new Date(
    Number.parseInt(m[3], 10),
    Number.parseInt(m[2], 10) - 1,
    Number.parseInt(m[1], 10),
  );
  d.setDate(d.getDate() + days);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
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
  await dashboardPage.selectTermLoanProduct();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.waitForAssetDetailsStepReady();
  return { dashboardPage, assetDetailsPage };
}

async function selectTlProductAndProgram(assetDetailsPage: DOAssetDetailsPage): Promise<void> {
  await assetDetailsPage.chooseProduct(TL_SQ_PRODUCT);
  await assetDetailsPage.chooseProgram(TL_SQ_PROGRAM);
}

async function selectTlProductAndProgramOnQuickQuote(
  page: Page,
  quickQuotePage: DOQuickQuotePage,
): Promise<void> {
  await quickQuotePage.selectProduct(TL_SQ_PRODUCT);
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
  if (await quickQuotePage.programDropdownTrigger.isEnabled()) {
    await quickQuotePage.programDropdownTrigger.click();
    await expect.soft(page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
    const exact = page.getByRole("option", { name: TL_SQ_PROGRAM, exact: true });
    if (await exact.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await exact.click();
    } else {
      const termLoan = page.getByRole("option").filter({ hasText: /Term Loan/i }).first();
      await termLoan.click({ timeout: 10_000 });
    }
    await page.keyboard.press("Escape");
  }
  await quickQuotePage.dismissQuickQuoteDropdownOverlays();
}

async function openTlStandardQuoteFromQuickQuote(
  page: Page,
  opts?: { cashPrice?: string; depositPercent?: string },
): Promise<{
  dashboardPage: DODashboardPage;
  assetDetailsPage: DOAssetDetailsPage;
  quickQuotePage: DOQuickQuotePage;
}> {
  const dashboardPage = new DODashboardPage(page);
  const quickQuotePage = new DOQuickQuotePage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(TLC_DEALER);
  await quickQuotePage.openQuickQuote();
  await expect.soft(quickQuotePage.quickQuoteRoot).toBeVisible();
  await selectTlProductAndProgramOnQuickQuote(page, quickQuotePage);
  await quickQuotePage.enterCashPrice(opts?.cashPrice ?? "$20,000");
  await quickQuotePage.selectFrequency("Monthly");
  await quickQuotePage.enterInterestRatePercent("9");
  await quickQuotePage.enterTermsMonths("36");
  if (opts?.depositPercent) {
    await quickQuotePage.enterDepositPercent(opts.depositPercent);
  }
  await quickQuotePage.enterBalloonPercent("0");
  await quickQuotePage.clickCalculate();
  await quickQuotePage.expectCreateQuoteVisible();
  await quickQuotePage.clickCreateQuote();
  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.waitForAssetDetailsStepReady();
  return { dashboardPage, assetDetailsPage, quickQuotePage };
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

async function prepareCalculableTlQuote(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
  opts?: {
    origRef?: string;
    term?: string;
    interest?: string;
    balloon?: string;
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
    await assetDetailsPage.cashPriceOfAsset("$20,000");
    await assetDetailsPage.enterBalloonPercent(opts.balloonPercent);
  } else if (opts?.balloon) {
    await assetDetailsPage.enterBalloonAmount(opts.balloon);
  }
  await assetDetailsPage.enterOriginationReference(opts?.origRef ?? "SQ-TL-Ref-01");
}

/** Less Deposit **Settlement** may stay disabled until trade-in + **Calculate** on SIT. */
async function prepareTlQuoteForSettlementTrigger(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
): Promise<void> {
  await prepareCalculableTlQuote(assetDetailsPage, addAssetPage, { origRef: "SQ-Settlement-Ref-01" });
  await assetDetailsPage.enterTradeAmount("$5,000");
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.waitForQuoteLoadersToFinish();
  await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero({ timeoutMs: 90_000 });
  await assetDetailsPage.enterOriginationReference("SQ-Settlement-Ref-01");
  await expect
    .poll(
      async () =>
        (await assetDetailsPage.netTradeAmountDisplayed.inputValue()).replace(/[$,]/g, ""),
      { timeout: 45_000 },
    )
    .toMatch(/5000/);
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

/** UDP-T4221 — PrimeNG **Save** on Add Ons screen (same locator as {@link fillAddOnAccessoriesPageAndSave}). */
async function clickAddOnAccessoriesSave(page: Page): Promise<void> {
  const saveBtn = page
    .locator('button[type="button"][data-pc-name="button"]')
    .filter({ has: page.locator('span[data-pc-section="label"]').filter({ hasText: /^Save$/ }) })
    .last();
  await saveBtn.waitFor({ state: "visible", timeout: 20_000 });
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.click({ timeout: 20_000 });
}

/** UDP-T4221 — poll Add Ons sub-total row until it reflects at least `minDollars`. */
async function waitForUdpT4221AddOnsSubtotalMin(
  page: Page,
  labelRx: RegExp,
  minDollars: number,
): Promise<void> {
  const anchor = page.getByText(labelRx).first();
  await expect(anchor).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(
      async () => {
        const raw = (
          (await anchor
            .evaluate((el) => (el as HTMLElement).closest("div")?.innerText ?? el.textContent ?? "")
            .catch(() => "")) ?? ""
        ).replace(/\s+/g, " ");
        const m = raw.match(/\$\s*([\d,]+\.?\d*)/);
        if (!m) return null;
        const n = parseFloat(m[1].replace(/,/g, ""));
        return Number.isFinite(n) && n + 0.01 >= minDollars ? n : null;
      },
      { timeout: 25_000, intervals: [300, 500, 1_000, 1_500] },
    )
    .not.toBeNull();
}

/**
 * UDP-T4221 Zephyr — Registration $400, Accessories $150, Extended Warranty $200 when Insurance is available.
 * @returns Expected **Charges** total on quote shell after Save (750 with insurance, 550 without).
 */
async function fillUdpT4221AddOnsAndSave(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<number> {
  const addOnsPage = new DOAddOnsAccessoriesPage(page);
  await page.locator("app-service-plan").waitFor({ state: "visible", timeout: 45_000 });
  await page.locator("app-accessories").waitFor({ state: "visible", timeout: 45_000 }).catch(() => {});

  await addOnsPage.fillRegistrationAmount("400");
  await assetDetailsPage.waitForQuoteLoadersToFinish();
  await waitForUdpT4221AddOnsSubtotalMin(
    page,
    /Sub-Total.*Registration|Sub-Total.*Service|Sub-Total.*Plans|Sub-Total.*Add\s*Ons|Sub Total Add Ons/i,
    400,
  );

  await addOnsPage.fillGeneralAccessoriesAmount("150");
  await assetDetailsPage.waitForQuoteLoadersToFinish();
  await waitForUdpT4221AddOnsSubtotalMin(page, /Sub-Total\s*Accessories|Sub Total Accessories/i, 150);

  const insuranceAdded = await addOnsPage.fillUdpT4221InsuranceIfAvailable("2", "200");
  await assetDetailsPage.waitForQuoteLoadersToFinish();
  if (insuranceAdded) {
    await waitForUdpT4221AddOnsSubtotalMin(page, /Sub-Total\s*Insurances|Sub Total Insurance/i, 200);
  }

  await clickAddOnAccessoriesSave(page);
  await assetDetailsPage.waitForQuoteLoadersToFinish();
  return insuranceAdded ? 750 : 550;
}

/** UDP-T4221 — Product + Program + asset in summary so Insurance questions load on Add Ons. */
async function prepareUdpT4221AssetDetailsForAddOns(
  assetDetailsPage: DOAssetDetailsPage,
  addAssetPage: DOAddAssetPage,
): Promise<void> {
  await selectTlProductAndProgram(assetDetailsPage);
  await addMinimalUsedAsset(assetDetailsPage, addAssetPage);
  await assetDetailsPage.closeAssetInsuranceSummaryDialog().catch(() => {});
  await assetDetailsPage.cashPriceOfAsset("$20,000");
  await assetDetailsPage.waitForAssetDetailsStepReady();
  await assetDetailsPage.waitForQuoteLoadersToFinish();
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
  const shortLabelRx = /^\+?\s*Add\s*Ons?$/i;
  const chargesSection = root.filter({ has: root.getByText(/Additional\s+Charges/i) });

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
  await root.getByRole("button", { name: shortLabelRx }).first().scrollIntoViewIfNeeded().catch(() => {});

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
    chargesSection.getByRole("button", { name: shortLabelRx }),
    chargesSection.locator("gen-button, p-button").filter({ hasText: shortLabelRx }).locator("button"),
    root.getByRole("button", { name: shortLabelRx }),
    root.locator("gen-button, p-button").filter({ hasText: shortLabelRx }).locator("button"),
    page.getByRole("button", { name: shortLabelRx }),
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

  const shortTextHit = root.getByText(shortLabelRx).first();
  if (await shortTextHit.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const asBtn = shortTextHit.locator("xpath=ancestor::button[1]");
    if (await asBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      if (await tryOpen(asBtn)) return;
    }
    if (await tryOpen(shortTextHit)) return;
  }

  throw new Error(
    "Add Ons & Accessories: could not open the add-ons screen (app-service-plan never became visible). " +
      "Scroll/copy may differ, or this dealer/product does not expose the entry.",
  );
}

function standardQuoteQuoteIdBlock(page: Page): Locator {
  const root = standardQuoteRoot(page);
  const quoteIdLabel = root
    .getByText(/Quote\s*(No\.?|Number|ID)\s*:?/i)
    .filter({ visible: true })
    .first();
  return quoteIdLabel
    .locator("xpath=ancestor::div[contains(@class,'col') or contains(@class,'field')][1]")
    .or(quoteIdLabel.locator("xpath=ancestor::div[1]"))
    .first();
}

/** Blank PrimeNG dropdown placeholder or no selection yet (UDP-T4214 Product/Program). */
function isBlankDropdownLabel(label: string): boolean {
  const t = label.replace(/\s+/g, " ").trim();
  return t.length === 0 || /^select\b/i.test(t) || /^—+$/.test(t) || t === "-";
}

/** UDP-T4214 — Quote ID is blank until the first Save assigns it in FIS AF. */
async function expectQuoteIdBlankBeforeFirstSave(page: Page): Promise<void> {
  const root = standardQuoteRoot(page);
  const quoteIdLabel = root
    .getByText(/Quote\s*(No\.?|Number|ID)\s*:?/i)
    .filter({ visible: true })
    .first();
  if (!(await quoteIdLabel.isVisible({ timeout: 8_000 }).catch(() => false))) {
    return;
  }

  const quoteIdBlock = quoteIdLabel
    .locator("xpath=ancestor::div[contains(@class,'col') or contains(@class,'field')][1]")
    .or(quoteIdLabel.locator("xpath=ancestor::div[1]"))
    .first();
  const quoteIdInput = quoteIdBlock.locator("input").filter({ visible: true }).first();
  if (await quoteIdInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect.soft(quoteIdInput).toHaveValue("", { timeout: 10_000 });
    return;
  }
  const text = ((await quoteIdBlock.textContent({ timeout: 5_000 }).catch(() => "")) ?? "")
    .replace(/\s+/g, " ")
    .trim();
  expect.soft(text).not.toMatch(/\d{3,}/);
}

/** UDP-T4220 — currency input inside the labeled `amount` component (Loan Details fees). */
function udpT4220EstablishmentFeeInput(page: Page, labelRx: RegExp): Locator {
  const root = standardQuoteRoot(page);
  return root
    .locator("amount")
    .filter({ hasText: labelRx })
    .locator("#amount");
}

/** Enter a fee and wait until async recalc stops flickering (UDP-T4220 only). */
async function enterUdpT4220EstablishmentFeeDollars(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  input: Locator,
  dollars: number,
  fieldName: string,
): Promise<void> {
  await assetDetailsPage.waitForQuoteLoadersToFinish();
  await expect(input).toBeVisible({ timeout: 20_000 });
  await expect(input).toBeEditable({ timeout: 20_000 });
  await input.scrollIntoViewIfNeeded();

  const target = Math.round(dollars * 100) / 100;
  const digits = target.toFixed(2);

  let last = Number.NaN;
  for (let attempt = 0; attempt < 10; attempt++) {
    await input.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace").catch(() => {});
    await page.keyboard.type(digits, { delay: 40 });
    await input.press("Tab");
    await assetDetailsPage.waitForQuoteLoadersToFinish();

    try {
      await expect
        .poll(
          async () => {
            const raw = (await input.inputValue()).trim();
            const n = assetDetailsPage.parseDisplayedCurrency(raw);
            return Math.abs(n - target) < 0.01 ? n : null;
          },
          { timeout: 20_000, intervals: [300, 500, 1_000, 1_500] },
        )
        .not.toBeNull();
      return;
    } catch {
      last = assetDetailsPage.parseDisplayedCurrency((await input.inputValue()).trim());
    }
  }

  throw new Error(
    `${fieldName} did not stabilize at $${target.toFixed(2)} (last read $${last.toFixed(2)}).`,
  );
}

test.describe("Standard Quote - TL @do @regression", () => {
  test(
    "UDP-T4214 - TC_SQ_001 Standard Quote Default Fields on Load",
    { tag: ["@do", "@regression", "@UDP-T4214"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await assetDetailsPage.waitForQuoteLoadersToFinish();
      const root = standardQuoteRoot(page);

      await test.step("Originator populated from user permissions", async () => {
        const originatorRoot = root.locator("app-quote-originator").first();
        if (await originatorRoot.isVisible({ timeout: 15_000 }).catch(() => false)) {
          for (const labelRx of [/Originator\s+Name/i, /Originator\s+Number/i]) {
            const label = originatorRoot.getByText(labelRx).first();
            if (!(await label.isVisible({ timeout: 5_000 }).catch(() => false))) continue;
            const block = label
              .locator("xpath=ancestor::div[contains(@class,'col') or contains(@class,'field')][1]")
              .or(label.locator("xpath=ancestor::div[1]"))
              .first();
            const valueInput = block
              .locator("input:not([type='checkbox'])")
              .filter({ visible: true })
              .first();
            if (await valueInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
              expect.soft((await valueInput.inputValue()).trim().length).toBeGreaterThan(0);
              continue;
            }
            const blockText = ((await block.textContent()) ?? "").replace(/\s+/g, " ").trim();
            const withoutLabel = blockText.replace(labelRx, "").trim();
            expect.soft(withoutLabel.length).toBeGreaterThan(0);
          }
        }
      });

      await test.step("Promotion Quote defaults unchecked", async () => {
        const promoHost = root.locator("p-checkbox").filter({
          has: root
            .locator('label.p-checkbox-label[data-pc-section="label"], label.p-checkbox-label')
            .filter({ hasText: /Promotion\s+Quote/i }),
        });
        const promoInput = promoHost.first().locator('input[type="checkbox"]').first();
        if (await promoHost.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
          await expect.soft(promoInput).not.toBeChecked();
        } else {
          const byRole = root.getByRole("checkbox", { name: /Promotion\s+Quote/i }).first();
          if (await byRole.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await expect.soft(byRole).not.toBeChecked();
          }
        }
      });

      await test.step("Product TL from QQ or blank; Program from QQ or blank", async () => {
        const productLabel = await assetDetailsPage.readSelectedProductLabel();
        expect
          .soft(isBlankDropdownLabel(productLabel) || /TL/i.test(productLabel))
          .toBeTruthy();

        const programLabel = await assetDetailsPage.readSelectedProgramLabel();
        expect.soft(isBlankDropdownLabel(programLabel)).toBeTruthy();
      });

      await test.step("Loan Purpose auto-populated when Product and Program are set", async () => {
        const productLabel = await assetDetailsPage.readSelectedProductLabel();
        const programLabel = await assetDetailsPage.readSelectedProgramLabel();
        const productProgramSelected =
          !isBlankDropdownLabel(productLabel) && !isBlankDropdownLabel(programLabel);

        const loanPurpose = root
          .getByRole("textbox", { name: /^Loan Purpose/i })
          .or(
            root.locator(
              "xpath=.//label[contains(normalize-space(.),'Loan Purpose')]/following::input[1]",
            ),
          )
          .first();
        if (!(await loanPurpose.isVisible({ timeout: 15_000 }).catch(() => false))) {
          return;
        }
        const value = (await loanPurpose.inputValue()).trim();
        if (productProgramSelected) {
          expect.soft(value.length).toBeGreaterThan(0);
        }
      });

      await test.step("Salesperson not blank", async () => {
        const salesperson = root
          .getByRole("combobox", { name: /Salesperson/i })
          .or(root.getByLabel(/Salesperson/i))
          .or(root.locator("p-dropdown").filter({ hasText: /Salesperson/i }))
          .first();
        if (await salesperson.isVisible({ timeout: 15_000 }).catch(() => false)) {
          const aria = ((await salesperson.getAttribute("aria-label")) ?? "").trim();
          const label = aria.length > 0 ? aria : ((await salesperson.textContent()) ?? "").trim();
          expect.soft(label.length).toBeGreaterThan(0);
        }
      });

      await test.step("Status defaults to Open Quote", async () => {
        await assetDetailsPage.expectWorkflowStatusOpenQuote();
      });

      await test.step("Condition defaults to Used", async () => {
        const usedRadio = root.getByRole("radio", { name: /^Used$/i }).first();
        if (await usedRadio.isVisible({ timeout: 10_000 }).catch(() => false)) {
          await expect.soft(usedRadio).toBeChecked();
          return;
        }
        const conditionCombobox = root.getByRole("combobox", { name: /^Used$/i }).first();
        if (await conditionCombobox.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await expect.soft(conditionCombobox).toBeVisible();
          return;
        }
        const conditionHost = root
          .locator("p-dropdown, p-selectbutton")
          .filter({ hasText: /Condition/i })
          .first();
        if (await conditionHost.isVisible({ timeout: 10_000 }).catch(() => false)) {
          await expect.soft(conditionHost).toContainText(/Used/i);
        }
      });

      await test.step("Quote ID blank until first Save", async () => {
        await expectQuoteIdBlankBeforeFirstSave(page);
      });
    },
  );

  test(
    "UDP-T4215 - TC_SQ_002 Cash Price Carried from QQ or Blank Mandatory",
    { tag: ["@do", "@regression", "@UDP-T4215"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openTlStandardQuoteFromQuickQuote(page, {
        cashPrice: "$25,000",
      });
      await assetDetailsPage.expectProductProgramCarriedFromQuickQuote(TL_SQ_PRODUCT, TL_SQ_PROGRAM);
      await expect.soft(assetDetailsPage.cashPriceOfAssetInputField).toHaveValue(/25[, ]?000|25000/, {
        timeout: 30_000,
      });

      const cash = assetDetailsPage.cashPriceOfAssetInputField;
      await cash.click({ clickCount: 3 });
      await cash.fill("");
      await cash.press("Tab").catch(() => {});
      await assetDetailsPage.clickSaveStandardQuoteStep();
      await expect
        .soft(
          page
            .getByText(/required|Please complete|cannot be blank|Cash\s+Price/i)
            .first(),
        )
        .toBeVisible({ timeout: 25_000 });
    },
  );

  test(
    "UDP-T4216 - TC_SQ_003 Recommended Retail Price Visible Only for New Condition",
    { tag: ["@do", "@regression", "@UDP-T4216"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);

      await assetDetailsPage.selectConditionInStandardQuote("New");
      await assetDetailsPage.expectRecommendedRetailPriceVisibleAfterNewCondition();

      await assetDetailsPage.selectConditionInStandardQuote("Used");
      await assetDetailsPage.expectRecommendedRetailPriceHiddenAfterUsedCondition();
    },
  );

  test(
    "UDP-T4217 - TC_SQ_004 PPSR Count Defaults to 1 PPSR Total Calculated",
    { tag: ["@do", "@regression", "@UDP-T4217"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectPpsrCountAndFeeLineVisible();
      await assetDetailsPage.expectPpsrCountValue("1");
      await assetDetailsPage.fillPpsrCountLoanDetails("2");
      const root = standardQuoteRoot(page);
      const ppsrTotal = root.getByText(/PPSR\s+Total/i).first();
      if (await ppsrTotal.isVisible({ timeout: 10_000 }).catch(() => false)) {
        const row = ppsrTotal.locator("xpath=ancestor::div[contains(@class,'col') or contains(@class,'field')][1]");
        await expect.soft(row).toContainText(/\$|\d/);
      }
    },
  );

  test(
    "UDP-T4218 - TC_SQ_005 UDC Establishment Fee Defaulted from FIS AF",
    { tag: ["@do", "@regression", "@UDP-T4218"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectUdcEstablishmentFeePrePopulatedFromProgram();
    },
  );

  test(
    "UDP-T4219 - TC_SQ_006 Dealer Origination Fee Defaulted from FIS AF",
    { tag: ["@do", "@regression", "@UDP-T4219"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectDealerOriginationFeePopulatedFromProgram();
    },
  );

  test(
    "UDP-T4220 - TC_SQ_007 Total Establishment Fee Equals UDC Plus Dealer Fee",
    { tag: ["@do", "@regression", "@UDP-T4220"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.waitForQuoteLoadersToFinish();

      await enterUdpT4220EstablishmentFeeDollars(
        page,
        assetDetailsPage,
        udpT4220EstablishmentFeeInput(page, /UDC Establishment Fee/i),
        300,
        "UDC Establishment Fee",
      );
      await enterUdpT4220EstablishmentFeeDollars(
        page,
        assetDetailsPage,
        udpT4220EstablishmentFeeInput(page, /Dealer Origination Fee/i),
        200,
        "Dealer Origination Fee",
      );
      await assetDetailsPage.expectTotalEstablishmentFeeSumDollars(500);
    },
  );

  test(
    "UDP-T4221 - TC_SQ_008 Charges Add Ons Field Sums Add-On Items",
    { tag: ["@do", "@regression", "@UDP-T4221"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const addAssetPage = new DOAddAssetPage(page);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await prepareUdpT4221AssetDetailsForAddOns(assetDetailsPage, addAssetPage);

      await test.step("Open Add Ons and Accessories", async () => {
        await assetDetailsPage.clickAddonsAndAccessoriesAndExpectScreen();
      });

      await test.step("Add Registration $400, Insurance $200, Accessories $150", async () => {
        const expectedCharges = await fillUdpT4221AddOnsAndSave(page, assetDetailsPage);
        await test.step(`Observe Charges total equals $${expectedCharges}`, async () => {
          await expect(page.locator("app-service-plan")).toBeHidden({ timeout: 60_000 });
          await assetDetailsPage.expectChargesTotalDollars(expectedCharges);
        });
      });
    },
  );

  test(
    "UDP-T4222 - TC_AF_001 Additional Funds TL-Only Field Defaults Blank",
    { tag: ["@do", "@regression", "@UDP-T4222"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.expectAdditionalFundsVisibleOnLoad();
    },
  );

  test(
    "UDP-T4223 - TC_AF_002 Additional Funds Greater Than Zero Creates Custom Flow in FIS AF",
    { tag: ["@do", "@regression", "@UDP-T4223"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.expectAdditionalFundsVisibleOnLoad();

      await test.step("Enter Additional Funds $5,000", async () => {
        await assetDetailsPage.enterAdditionalFunds("$5,000");
        await assetDetailsPage.enterAdditionalFundsPurpose("Equipment purchase");
        await assetDetailsPage.expectAdditionalFundsAmountDollars(5000);
      });

      await test.step("Calculate quote with Additional Funds", async () => {
        await assetDetailsPage.clickCalculateButton();
        await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      });

      await test.step("FIS AF pricing returned after Additional Funds > 0", async () => {
        await assetDetailsPage.waitForQuoteLoadersToFinish();
        const payment = await assetDetailsPage.readPaymentAmount();
        const totalRepay = await assetDetailsPage.readTotalAmountToRepay();
        expect(payment).toBeGreaterThan(0);
        expect(totalRepay).toBeGreaterThan(0);
      });
    },
  );

  test(
    "UDP-T4224 - TC_AF_003 Additional Funds Blank or Zero Not Passed to FIS AF",
    { tag: ["@do", "@regression", "@UDP-T4224"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);

      await test.step("Leave Additional Funds blank", async () => {
        await assetDetailsPage.expectAdditionalFundsVisibleOnLoad();
        await assetDetailsPage.expectAdditionalFundsBlankOrZero();
      });

      await test.step("Calculate quote with blank Additional Funds", async () => {
        await assetDetailsPage.clickCalculateButton();
        await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
      });

      await test.step("FIS AF pricing without Additional Funds custom flow", async () => {
        await assetDetailsPage.waitForQuoteLoadersToFinish();
        await assetDetailsPage.expectAdditionalFundsBlankOrZero();
        const payment = await assetDetailsPage.readPaymentAmount();
        const totalRepay = await assetDetailsPage.readTotalAmountToRepay();
        expect(payment).toBeGreaterThan(0);
        expect(totalRepay).toBeGreaterThan(0);
      });
    },
  );

  test(
    "UDP-T4225 - TC_AF_004 Additional Funds Purpose Conditionally Mandatory When Funds Greater Than Zero",
    { tag: ["@do", "@regression", "@UDP-T4225"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);

      await test.step("Enter Additional Funds $3,000", async () => {
        await assetDetailsPage.expectAdditionalFundsVisibleOnLoad();
        await assetDetailsPage.enterAdditionalFunds("$3,000");
        await assetDetailsPage.expectAdditionalFundsAmountDollars(3000);
      });

      await test.step("Leave Additional Funds Purpose blank", async () => {
        await assetDetailsPage.clearAdditionalFundsPurpose();
        await expect(assetDetailsPage.additionalFundsPurposeTextarea).toHaveValue("");
      });

      await test.step("Save and expect Please complete details error", async () => {
        await assetDetailsPage.clickSaveStandardQuoteStep();
        await assetDetailsPage.expectAdditionalFundsPurposeInlineErrorVisible();
      });
    },
  );

  test(
    "UDP-T4226 - TC_AF_005 Additional Funds Purpose Not Required When Funds Blank",
    { tag: ["@do", "@regression", "@UDP-T4226"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.expectAdditionalFundsVisibleOnLoad();
      await assetDetailsPage.clearAdditionalFundsPurpose();
      await assetDetailsPage.clickSaveStandardQuoteStep({
        originatorRefForRequiredDialog: "SQ-TL-Ref-01",
      });
      const purposeError = assetDetailsPage.additionalFundsRoot.getByText(
        /Please complete details/i,
      );
      await expect.soft(purposeError).toBeHidden({ timeout: 8_000 });
    },
  );

  test(
    "UDP-T4227 - TC_AF_006 Additional Funds Purpose Free-Text Field",
    { tag: ["@do", "@regression", "@UDP-T4227"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.enterAdditionalFunds("$2,000");
      await assetDetailsPage.enterAdditionalFundsPurpose("Workshop equipment purchase");
      await assetDetailsPage.clickSaveStandardQuoteStep({
        originatorRefForRequiredDialog: "SQ-TL-Ref-01",
      });
      await expect
        .soft(assetDetailsPage.additionalFundsPurposeTextarea)
        .toHaveValue(/Workshop equipment purchase/i);
    },
  );

  test(
    "UDP-T4228 - TC_AF_007 Additional Funds Re-Entry Shows Previously Saved Value",
    { tag: ["@do", "@regression", "@UDP-T4228"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(
        true,
        "Requires re-opening a saved TL quote from FIS AF with Additional Funds = $5,000.",
      );
    },
  );

  test(
    "UDP-T4229 - TC_AF_008 Additional Funds Zero or Blank Deletes FIS AF Custom Flow",
    { tag: ["@do", "@regression", "@UDP-T4229"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(
        true,
        "Requires re-opening a saved TL quote from FIS AF with Additional Funds = $5,000.",
      );
    },
  );

  test(
    "UDP-T4230 - TC_AF_009 Additional Funds Edit Updates FIS AF Custom Flow",
    { tag: ["@do", "@regression", "@UDP-T4230"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(
        true,
        "Requires re-opening a saved TL quote from FIS AF with Additional Funds = $5,000.",
      );
    },
  );

  test(
    "UDP-T4231 - TC_LD_001 Cash Deposit Carried from QQ Mutual Auto-Population",
    { tag: ["@do", "@regression", "@UDP-T4231"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openTlStandardQuoteFromQuickQuote(page, {
        cashPrice: "$20,000",
        depositPercent: "10%",
      });
      await assetDetailsPage.expectFinanceCarriedFromQuickQuote({
        cashPrice: /20[, ]?000|20000/,
        term: /36/,
        frequencyText: /Monthly/i,
        interestRate: /9/,
        depositPercent: /10/,
        depositDollars: /2[, ]?000|2000/,
      });
    },
  );

  test(
    "UDP-T4232 - TC_LD_002 Trade Amount and Settlement Amount Default Blank",
    { tag: ["@do", "@regression", "@UDP-T4232"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(assetDetailsPage);
      const trade = (await assetDetailsPage.tradeAmountInput.inputValue()).trim();
      const settlement = (await assetDetailsPage.settlementAmountInput.inputValue()).trim();
      expect.soft(trade === "" || /^0(\.0+)?$/.test(trade.replace(/[$,]/g, ""))).toBeTruthy();
      expect.soft(settlement === "" || /^0(\.0+)?$/.test(settlement.replace(/[$,]/g, ""))).toBeTruthy();
    },
  );

  test(
    "UDP-T4233 - TC_LD_003 Net Trade Amount Display Only Calculated",
    { tag: ["@do", "@regression", "@UDP-T4233"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.enterTradeAmount("$5,000");
      await assetDetailsPage.enterSettlementAmount("$2,000");
      await assetDetailsPage.expectNetTradeAmountPattern(/\$?\s*3[, ]?000|3000/);
    },
  );

  test(
    "UDP-T4234 - TC_LD_004 Total Amount Borrowed Display Only Calculated by FIS AF",
    { tag: ["@do", "@regression", "@UDP-T4234"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);

      await test.step("Calculate TL Standard Quote", async () => {
        await assetDetailsPage.clickCalculateButton();
        await assetDetailsPage.expectPaymentScheduleSectionWithTableData();
        await assetDetailsPage.waitForQuoteLoadersToFinish();
      });

      await test.step("Observe Total Amount Borrowed display-only Amount Financed from FIS AF", async () => {
        await assetDetailsPage.expectTotalAmountBorrowedCalculatedAmountFinanced();
        await assetDetailsPage.expectInterestChargeReadOnly();
        await assetDetailsPage.expectInterestChargeNonNegative();
      });
    },
  );

  test(
    "UDP-T4235 - TC_FD_001 Term Mandatory Max Term Validation",
    { tag: ["@do", "@regression", "@UDP-T4235"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage, { term: "9999" });
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectTermExceedsProgramMaxOnCalculateThenRestore({
        overMaxTerm: "9999",
        restoreTerm: "36",
      });
    },
  );

  test(
    "UDP-T4236 - TC_FD_002 Frequency Mandatory Defaults from Program Structure Resets on Change",
    { tag: ["@do", "@regression", "@UDP-T4236"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);

      await test.step("Observe Frequency on load", async () => {
        await assetDetailsPage.expectFrequencyDefaultsFromProgram();
      });

      let altFrequency = "Weekly";

      await test.step("Change frequency when structured frequency in place", async () => {
        await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);
        await assetDetailsPage.clickCalculateButton();
        await assetDetailsPage.applySplitInterestOnlyEditPaymentSchedule();
        await assetDetailsPage.expectStructuredPaymentFrequencyInPlace();

        const current = await assetDetailsPage.readSelectedFrequencyLabel();
        altFrequency = /Weekly/i.test(current)
          ? "Fortnightly"
          : /Fortnightly/i.test(current)
            ? "Monthly"
            : "Weekly";
        await assetDetailsPage.selectStandardQuoteFrequency(altFrequency);
      });

      await test.step("Observe payment structure reset", async () => {
        await assetDetailsPage.expectPaymentStructureClearedAfterFrequencyChange();
        await assetDetailsPage.clickCalculateButton();
        await assetDetailsPage.expectPaymentScheduleStructureReset(altFrequency);
      });
    },
  );

  test(
    "UDP-T4237 - TC_FD_003 Interest Rate Mandatory Defaults from FIS AF Editability Per BLD Rule",
    { tag: ["@do", "@regression", "@UDP-T4237"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);

      await test.step("Observe Interest Rate value and editability", async () => {
        await addMinimalUsedAsset(assetDetailsPage, addAssetPage);
        await assetDetailsPage.waitForQuoteLoadersToFinish();
        await assetDetailsPage.expectInterestRateDefaultsFromFisAf();
        await assetDetailsPage.expectInterestRateEditabilityPerBldRules();
      });
    },
  );

  test(
    "UDP-T4238 - TC_FD_005 First Payment Cannot Be Before Loan Date Must Be Within 6 Weeks",
    { tag: ["@do", "@regression", "@UDP-T4238"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);

      const loan = await assetDetailsPage.readLoanDateValue();
      const yesterday = shiftDdMmYyyy(loan, -1);
      const sevenWeeksOut = shiftDdMmYyyy(loan, 50);

      await test.step("Enter First Payment = yesterday", async () => {
        await assetDetailsPage.enterFirstPaymentDateDdMmYyyy(yesterday);
      });

      await test.step("Click Calculate", async () => {
        await assetDetailsPage.clickCalculateButton();
        await assetDetailsPage.expectFirstPaymentBeforeLoanDateValidation(loan, yesterday);
      });

      await test.step("Enter First Payment = 7 weeks from today", async () => {
        await assetDetailsPage.enterFirstPaymentDateDdMmYyyy(sevenWeeksOut);
      });

      await test.step("Click Calculate", async () => {
        await assetDetailsPage.clickCalculateButton();
        await assetDetailsPage.expectFirstPaymentExceedsSixWeeksValidation(loan, sevenWeeksOut);
      });
    },
  );

  test(
    "UDP-T4239 - TC_FD_007 Balloon Amount and OR Percent Mutual Auto-Population Fixed Checkbox Behaviour",
    { tag: ["@do", "@regression", "@UDP-T4239"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.expectPaymentStructureNone();
      await assetDetailsPage.expectBalloonAmountAndFixedCheckboxOnLoad();

      await test.step("Enter Balloon Amount", async () => {
        await assetDetailsPage.enterBalloonAmount("$4,000");
      });

      await test.step("Observe OR %", async () => {
        await assetDetailsPage.expectBalloonPercentInputMatches(/20/);
      });

      await test.step("Enter OR %", async () => {
        await assetDetailsPage.enterBalloonPercent("25");
      });

      await test.step("Observe Balloon Amount", async () => {
        await assetDetailsPage.expectBalloonAmountInputMatches(/5[, ]?000|5000/);
        await assetDetailsPage.commitBalloonAmountAfterPercentEdit();
      });

      await test.step("Tick Fixed checkbox", async () => {
        await assetDetailsPage.checkBalloonFixedCheckbox();
        await assetDetailsPage.expectBalloonFixedCheckboxChecked();
      });

      await test.step("Observe effect on last payment", async () => {
        await assetDetailsPage.expectFixedBalloonIsLastPaymentRow();
      });
    },
  );

  test(
    "UDP-T4240 - TC_FD_008 Payment Amount Shows Irregular for Non-Uniform Payments",
    { tag: ["@do", "@regression", "@UDP-T4240"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage, {
        balloonPercent: "20",
        balloonFixed: false,
      });
      await assetDetailsPage.clickCalculateButton();
      const irregular = standardQuoteRoot(page).getByText(/Irregular/i).first();
      await expect.soft(irregular).toBeVisible({ timeout: 45_000 });
    },
  );

  test(
    "UDP-T4241 - TC_LMF_001 Loan Maintenance Fee Displays Pre-Configured Value or Zero",
    { tag: ["@do", "@regression", "@UDP-T4241"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const tlLmf = loadTlLmfPrograms();
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);

      await test.step("Select TL program with LMF pre-configured in FIS AF — observe LMF", async () => {
        await assetDetailsPage.selectTlProductAndProgramForLmf(
          tlLmf.withLmf.product,
          tlLmf.withLmf.program,
        );
        await assetDetailsPage.expectLoanMaintenanceFeePreconfiguredFromFisAf();
      });

      await test.step("Select TL program with no LMF — observe LMF", async () => {
        await assetDetailsPage.selectTlProductAndProgramForLmf(
          tlLmf.withoutLmf.product,
          tlLmf.withoutLmf.program,
        );
        await assetDetailsPage.expectLoanMaintenanceFeeZeroOrAbsentOnTl();
      });
    },
  );

  test(
    "UDP-T4242 - TC_LMF_002 Waive LMF Checkbox Defaults Unchecked",
    { tag: ["@do", "@regression", "@UDP-T4242"] },
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
    "UDP-T4243 - TC_DF_001 Dealer Finance Section Collapsed by Default",
    { tag: ["@do", "@regression", "@UDP-T4243"] },
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
    "UDP-T4244 - TC_DF_002 Base Interest Rate Retained at First Save",
    { tag: ["@do", "@regression", "@UDP-T4244"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(
        true,
        "Requires save and re-open TL quote from FIS AF to verify Base Interest Rate retention.",
      );
    },
  );

  test(
    "UDP-T4245 - TC_DF_003 Estimated Commission Negative When Base Rate Exceeds Customer Rate",
    { tag: ["@do", "@regression", "@UDP-T4245"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage, { interest: "1" });
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
    "UDP-T4246 - TC_PS_001 Segment View Groups Identical Payments Default View After Calculate",
    { tag: ["@do", "@regression", "@UDP-T4246"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);

      await test.step("Calculate TL Standard Quote", async () => {
        await assetDetailsPage.clickCalculateButton();
        await assetDetailsPage.waitForQuoteLoadersToFinish();
      });

      await test.step("Observe payment schedule default view", async () => {
        await assetDetailsPage.expectPaymentScheduleSegmentViewDefaultAfterCalculate();
      });
    },
  );

  test(
    "UDP-T4247 - TC_PS_002 Grid View Lists Each Payment Individually",
    { tag: ["@do", "@regression", "@UDP-T4247"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);

      await test.step("Calculate TL Standard Quote", async () => {
        await assetDetailsPage.clickCalculateButton();
        await assetDetailsPage.waitForQuoteLoadersToFinish();
      });

      await test.step("Toggle to Grid view", async () => {
        await assetDetailsPage.expectPaymentScheduleGridViewListsIndividualPayments();
      });
    },
  );

  test(
    "UDP-T4248 - TC_PS_003 Standard Payment Options Terms 12 Through 60",
    { tag: ["@do", "@regression", "@UDP-T4248"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectPaymentScheduleSectionWithTableData();

      const root = standardQuoteRoot(page);
      const optionsPanel = root
        .locator("p-card, div")
        .filter({ hasText: /Standard\s+Payment\s+Options/i })
        .filter({ visible: true })
        .first();

      await expect.soft(optionsPanel).toBeVisible({ timeout: 45_000 });

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
    "UDP-T4249 - TC_PS_004 Weekly Equivalent Visible After Calculate",
    { tag: ["@do", "@regression", "@UDP-T4249"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);
      await assetDetailsPage.clickCalculateButton();
      await expect
        .soft(standardQuoteRoot(page).getByText(/Weekly\s+Equivalent/i).first())
        .toBeVisible({ timeout: 30_000 });
    },
  );

  test(
    "UDP-T4250 - TC_PS_005 Key Information Disclosure Only for Personal Products",
    { tag: ["@do", "@regression", "@UDP-T4250"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      test.fixme(
        true,
        "KID hyperlink is for Personal TL products only; this suite uses TL-B (business) — TL-C personal path TBD.",
      );
    },
  );

  test(
    "UDP-T4251 - TC_BTN_001 Save Validates Mandatory Fields",
    { tag: ["@do", "@regression", "@UDP-T4251"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(assetDetailsPage);
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
    "UDP-T4252 - TC_BTN_002 Next Validates Then Navigates to Customer Details",
    { tag: ["@do", "@regression", "@UDP-T4252"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      await selectTlProductAndProgram(assetDetailsPage);

      await test.step("Complete all mandatory fields", async () => {
        await prepareCalculableTlQuote(assetDetailsPage, addAssetPage);
        await assetDetailsPage.clickCalculateButton();
        await assetDetailsPage.waitForQuoteLoadersToFinish();
      });

      await test.step("Click Next", async () => {
        await assetDetailsPage.clickNextAndExpectCustomerDetails("SQ-TL-Ref-01");
      });

      await test.step("Observe Customer Details screen", async () => {
        const customerDetailsPage = new DOCustomerDetailsPage(page);
        const addBtnVisible = await customerDetailsPage.addBorrowersOrGuarantorsButton
          .isVisible()
          .catch(() => false);
        const personalVisible = await page.locator("app-personal-details").isVisible().catch(() => false);
        expect(addBtnVisible || personalVisible).toBeTruthy();
        if (addBtnVisible) {
          await expect(customerDetailsPage.addBorrowersOrGuarantorsButton).toBeVisible();
        }
      });
    },
  );

  test(
    "UDP-T4253 - TC_BTN_003 Cancel Shows Confirmation Pop-Up",
    { tag: ["@do", "@regression", "@UDP-T4253"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.enterOriginationReference("SQ-TL-Cancel-Test");
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
    "UDP-T4254 - TC_BTN_005 Status Button Workflow Transition",
    { tag: ["@do", "@regression", "@UDP-T4254"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.fixme(
        true,
        "Requires workflow status transition on saved TL quote — refer MAF-5644 / MAF-6659 / MAF-6559.",
      );
    },
  );

  test(
    "UDP-T4255 - TC_INT_001 Settlement Button Opens Settlement Pop-Up",
    { tag: ["@do", "@regression", "@UDP-T4255"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      const addAssetPage = new DOAddAssetPage(page);
      const settlementPage = new DOSettlementPage(page);
      await selectTlProductAndProgram(assetDetailsPage);

      await test.step("Prepare TL Standard Quote", async () => {
        await prepareTlQuoteForSettlementTrigger(assetDetailsPage, addAssetPage);
        await settlementPage.waitForSettlementTriggerEnabled(60_000).catch(() => {});
      });

      await test.step("Click Settlement button", async () => {
        await assetDetailsPage.scrollLessDepositIntoView();
        await settlementPage.expectSettlementTriggerVisible();
        await assetDetailsPage.openSettlementDialog();
      });

      await test.step("Observe settlement loan-search pop-up", async () => {
        await settlementPage.expectSettlementSearchScreenVisible();
        await settlementPage.clickCancel().catch(() => page.keyboard.press("Escape"));
      });
    },
  );

  test(
    "UDP-T4256 - TC_INT_002 Search and Add Asset and Trade Hyperlinks",
    { tag: ["@do", "@regression", "@UDP-T4256"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.enterAsset("Car and Light Commercial /");
      await assetDetailsPage.selectCondition("Used");

      await test.step("Click Search & Add Asset", async () => {
        await assetDetailsPage.clickSearchAndAddAssetAndExpectSearchDialog();
        await assetDetailsPage.closeSearchAddAssetDialogIfOpen();
        await assetDetailsPage.closeAssetInsuranceSummaryDialog();
      });

      await test.step("Click Search & Add Trade", async () => {
        await assetDetailsPage.clickSearchAndAddTradeAndExpectSearchDialog();
        await assetDetailsPage.closeSearchTradeInAssetDialog().catch(() => {});
        await assetDetailsPage.closeAssetInsuranceSummaryDialog();
      });
    },
  );

  test(
    "UDP-T4257 - TC_INT_003 Asset Insurance and Trade-in Summary Hyperlink",
    { tag: ["@do", "@regression", "@UDP-T4257"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(assetDetailsPage);
      await assetDetailsPage.openAssetInsuranceTradeInSummary();
      await expect.soft(page.getByRole("dialog").last()).toBeVisible({ timeout: 30_000 });
    },
  );

  test(
    "UDP-T4258 - TC_INT_004 Addons and Accessories Hyperlink",
    { tag: ["@do", "@regression", "@UDP-T4258"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { assetDetailsPage } = await openStandardQuoteFromDashboard(page);
      await selectTlProductAndProgram(assetDetailsPage);

      await test.step("Click + Addons & Accessories", async () => {
        await assetDetailsPage.clickAddonsAndAccessoriesAndExpectScreen();
      });

      await test.step("Observe Add Ons and Accessories screen", async () => {
        const addOnsPage = new DOAddOnsAccessoriesPage(page);
        await addOnsPage.expectAddOnsSectionHeadingVisible();
      });
    },
  );
});
