/**
 * DO Portal — Settlement regression (UDP-T3952–UDP-T3989).
 * Scenario source: SETTLEMENT.xlsx (Zephyr / Regression Automation/Settlement).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 *
 * Loan-lookup and dealer-listing scenarios require `testData/do-portal/settlementTestData.json`
 * to be populated with QAT-activated loan Rego/VIN values.
 */

import { expect, test } from "@fixtures/doPortalTest";
import type { Locator, Page } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL, getCurrentEnv } from "../../../config/env";
import {
  DOAddressDetailsPage,
  DOAssetDetailsPage,
  DODashboardPage,
  DOEmploymentDetailsPage,
  DOFinancialPositionPage,
  DOReferenceDetailsPage,
  DOSettlementPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import { DOPersonalDetailsPage } from "../../../pages/do-portal/StandardQuote/CustomerDetails/personalDetails";
import settlementData from "../../../testData/do-portal/settlementTestData.json";
import {
  fillMinimalAddressContinue,
  fillMinimalEmploymentContinue,
  fillMinimalFinancialContinue,
  fillValidIndividualPersonalBorrower,
  openDashboard,
} from "./workflow.helpers";

const TLC_DEALER = settlementData.dealer;
const UDP_T3987_ORIG_REF = "SQ-Settlement-Ref-01";

function settlementDealer(): string {
  const env = getCurrentEnv();
  const fromEnv = (
    settlementData as {
      environments?: Record<string, { dealer?: string }>;
    }
  ).environments?.[env]?.dealer;
  return fromEnv ?? TLC_DEALER;
}

function sitDealerListingSettlementRego(): string {
  return (
    (
      settlementData as {
        environments?: Record<string, { dealerListing?: { settlementRego?: string } }>;
      }
    ).environments?.sit?.dealerListing?.settlementRego ??
    settlementData.dealerListing.activatedLoanRegoOrVin?.trim() ??
    "BAGGED"
  );
}

function sitDealerListingSettlementVin(): string {
  return (
    (
      settlementData as {
        environments?: Record<string, { dealerListing?: { settlementVin?: string } }>;
      }
    ).environments?.sit?.dealerListing?.settlementVin ??
    settlementData.loanLookup.validVinDifferentDealer?.trim() ??
    "KMHKM81BUPU2257CK"
  );
}

/** Dealer listing activated-loan key — BAGGED rego on SIT, Rego/VIN elsewhere. */
function dealerListingSettlementLoanRef(): string {
  if (getCurrentEnv() === "sit") {
    return sitDealerListingSettlementRego();
  }
  return requireLoanId(
    settlementData.dealerListing.activatedLoanRegoOrVin,
    "dealerListing.activatedLoanRegoOrVin",
  );
}

type ProductKey = keyof typeof settlementData.products;

function standardQuoteRoot(page: Page): Locator {
  return page.locator("app-quote-details, app-standard-quote").first();
}

function requireLoanId(value: string, label: string): string {
  if (!value?.trim()) {
    test.skip(true, `Populate settlementTestData.json → ${label} for this scenario.`);
  }
  return value.trim();
}

/** UDP-T3967 — arrears Rego candidates (BY7737 preferred on SIT). */
function arrearsRegoCandidates(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: string | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed.toUpperCase()) || trimmed.length > 8) {
      return;
    }
    seen.add(trimmed.toUpperCase());
    out.push(trimmed);
  };

  push(settlementData.loanLookup.arrearsRegoOrVin);
  push("BY7737");
  for (const rego of settlementData.loanLookup.arrearsRegoOrVinFallbacks ?? []) {
    push(rego);
  }

  if (out.length === 0) {
    test.skip(true, "Populate settlementTestData.json → loanLookup.arrearsRegoOrVin for UDP-T3967.");
  }
  return out;
}

/** UDP-T3963–T3965 — VIN first, then Rego BY7737 (and optional further fallbacks). */
function differentDealerLoanSearchCandidates(): Array<{ value: string; useVin: boolean }> {
  const seen = new Set<string>();
  const out: Array<{ value: string; useVin: boolean }> = [];
  const push = (value: string | undefined, useVin: boolean) => {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed.toUpperCase())) {
      return;
    }
    seen.add(trimmed.toUpperCase());
    out.push({ value: trimmed, useVin });
  };

  push(settlementData.loanLookup.validVinDifferentDealer, true);
  push("BY7737", false);
  for (const rego of settlementData.loanLookup.validRegoDifferentDealerFallbacks ?? []) {
    push(rego, false);
  }

  if (out.length === 0) {
    test.skip(
      true,
      "Populate settlementTestData.json → validVinDifferentDealer or validRegoDifferentDealerFallbacks.",
    );
  }
  return out;
}

function differentDealerVinAndRegoFallback(): { vin: string; regoFallback: string } {
  const vin = settlementData.loanLookup.validVinDifferentDealer?.trim() || "KMHKM81BUPU2257CK";
  const regoFallback =
    settlementData.loanLookup.validRegoDifferentDealerFallbacks?.find((r) => r.trim())?.trim() ||
    "BY7737";
  return { vin, regoFallback };
}

/** Rego lookup first; if loan search fails, retry with VIN + privacy waiver. */
async function completeLoanSearchToDisplayWithRegoVinFallback(
  settlementPage: DOSettlementPage,
  rego: string,
  vin: string,
): Promise<void> {
  await submitSettlementLoanSearch(settlementPage, rego, false);
  const reachedDisplay = await settlementPage
    .expectSettlementDisplayScreen()
    .then(() => true)
    .catch(() => false);
  if (reachedDisplay) {
    return;
  }

  await settlementPage.clickBack().catch(() => {});
  await settlementPage.expectSettlementSearchScreenVisible();
  const { regoFallback } = differentDealerVinAndRegoFallback();
  await completeDifferentDealerLoanSearchToDisplay(settlementPage, vin, regoFallback || rego);
}
function multipleSettlementSecondRegoOrVin(): string {
  const env = getCurrentEnv();
  const fromEnv = (
    settlementData as {
      environments?: Record<string, { dealerListing?: { secondSettlementRegoOrVin?: string } }>;
    }
  ).environments?.[env]?.dealerListing?.secondSettlementRegoOrVin;
  const fromRoot = settlementData.dealerListing.secondSettlementRegoOrVin?.trim();
  const fallback =
    settlementData.loanLookup.validRegoDifferentDealerFallbacks?.find((r) => r.trim())?.trim() ||
    settlementData.loanLookup.validRegoDifferentDealer?.trim();
  return (fromEnv ?? fromRoot ?? fallback ?? "").trim();
}

/** UDP-T3978 — saved quote with settlement (TL on QAT matches T3977 add-to-quote; CSA-B on SIT). */
async function openQuoteForMultipleSettlements(page: Page): Promise<{
  assetDetailsPage: DOAssetDetailsPage;
  settlementPage: DOSettlementPage;
}> {
  const productKey: ProductKey = getCurrentEnv() === "qat" ? "tl" : "csab";
  return accessSettlementScreenAfterAssetDetailsSaved(page, productKey);
}

/** SIT — try same-dealer rego (333aaa) first; fall back to VIN + privacy waiver if lookup fails. */
async function completeFirstMultipleSettlementLoanSearchToDisplay(
  settlementPage: DOSettlementPage,
): Promise<void> {
  const rego =
    getCurrentEnv() === "sit"
      ? (
          settlementData.loanLookup as { validRegoSameDealerFallback?: string }
        ).validRegoSameDealerFallback?.trim() ||
        settlementData.loanLookup.validRegoSameDealer?.trim() ||
        "333aaa"
      : settlementData.loanLookup.validRegoSameDealer?.trim() || "BAGGED";
  const vin =
    settlementData.loanLookup.validVinSameDealer?.trim() ||
    settlementData.loanLookup.validVinDifferentDealer?.trim() ||
    "KMHKM81BUPU2257CK";

  if (getCurrentEnv() === "sit") {
    await submitSettlementLoanSearch(settlementPage, rego, false);
    const reachedDisplay = await settlementPage
      .expectSettlementDisplayScreen()
      .then(() => true)
      .catch(() => false);
    if (reachedDisplay) {
      return;
    }
    await settlementPage.clickBack().catch(() => {});
    await settlementPage.expectSettlementSearchScreenVisible();
  }

  const { regoFallback } = differentDealerVinAndRegoFallback();
  await completeDifferentDealerLoanSearchToDisplay(settlementPage, vin, regoFallback || rego);
}

/** UDP-T3978 — **Add this Settlement Amount to this Quote** (never Create New Quote). */
function addSettlementToThisQuoteButton(page: Page) {
  return page
    .getByRole("button", {
      name: /Add this Settlement Amount to (my|this) Quote/i,
    })
    .or(page.locator("button, a").filter({ hasText: /Add this Settlement Amount/i }))
    .first();
}

async function clickAddThisSettlementAmountToQuote(
  page: Page,
  settlementPage: DOSettlementPage,
): Promise<void> {
  const addToQuote = addSettlementToThisQuoteButton(page);
  if (await addToQuote.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await addToQuote.scrollIntoViewIfNeeded();
    await addToQuote.click({ timeout: 20_000 });
  } else if (/standard-quote\/(edit|create)\/\d+/i.test(page.url())) {
    await settlementPage.addSelectedSettlementToQuote();
  } else {
    await expect(
      addToQuote,
      "Settlement display must show Add this Settlement Amount to this Quote",
    ).toBeVisible({ timeout: 45_000 });
    await addToQuote.click({ timeout: 20_000 });
  }
  const confirm = page.getByRole("dialog").filter({ visible: true }).last();
  if (await confirm.isVisible({ timeout: 8_000 }).catch(() => false)) {
    const newQuotePrompt = confirm.getByText(/proceed for a new quote with this settlement amount/i);
    if (await newQuotePrompt.isVisible({ timeout: 2_000 }).catch(() => false)) {
      throw new Error(
        "UDP-T3978: settlement flow offered Create New Quote — use same-dealer Rego/VIN on saved quote.",
      );
    }
    const ok = confirm.getByRole("button", { name: /^(OK|Confirm)$/i }).first();
    if (await ok.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await ok.click({ timeout: 15_000 });
    }
  }
}

async function reopenSettlementLoanSearchFromAssetDetails(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  settlementPage: DOSettlementPage,
): Promise<void> {
  if (/settlement-quote-details/i.test(page.url())) {
    const cancel = page.getByRole("button", { name: /^Cancel$/i }).first();
    if (await cancel.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await cancel.click({ timeout: 15_000 });
    } else {
      await page.goBack({ timeout: 20_000 }).catch(() => {});
    }
  } else {
    await settlementPage.clickCancel().catch(() => {});
  }

  await assetDetailsPage.waitForQuoteLoadersToFinish(120_000);
  await assetDetailsPage.clickStandardQuoteStepTab(/Asset\s*Details/i);
  await assetDetailsPage.waitForAssetDetailsStepReady();
  await settlementPage.waitForSettlementTriggerEnabled(90_000);
  await assetDetailsPage.openSettlementDialog();
  await settlementPage.expectSettlementSearchScreenVisible();
  await settlementPage.expectSettlementDateIsPopulated();
  await settlementPage.ensureSettlementDateReadyForNext();
}

/** UDP-T3978 QAT — reach settlement display (BAGGED → HG7765 → T3979 VIN). */
async function completeQatT3978LoanToDisplay(
  settlementPage: DOSettlementPage,
  exclude: Array<"bagged" | "rego" | "vin"> = [],
): Promise<"bagged" | "rego" | "vin"> {
  const blocked = new Set(exclude);
  const bagged = settlementData.loanLookup.validRegoSameDealer?.trim() || "BAGGED";
  const rego = requireLoanId(
    businessSettlementLoanRegoOrVin(),
    "loanLookup.businessLoanRegoOrVin",
  );
  const vin = businessSettlementVin();
  const order: Array<"bagged" | "rego" | "vin"> =
    blocked.has("bagged") && !blocked.has("rego") && !blocked.has("vin")
      ? ["rego", "vin"]
      : blocked.has("rego") && !blocked.has("vin")
        ? ["vin", "bagged"]
        : blocked.has("vin") && !blocked.has("rego")
          ? ["rego", "bagged"]
          : ["bagged", "rego", "vin"];

  const attempts: Array<{ key: "bagged" | "rego" | "vin"; run: () => Promise<void> }> = [];
  for (const key of order) {
    if (blocked.has(key)) continue;
    if (key === "bagged") {
      attempts.push({ key, run: () => completeLoanSearchToDisplay(settlementPage, bagged, false) });
    } else if (key === "rego") {
      attempts.push({ key, run: () => completeLoanSearchToDisplay(settlementPage, rego, false) });
    } else if (vin) {
      attempts.push({
        key: "vin",
        run: () => completeLoanSearchToDisplayWithPrivacyWaiver(settlementPage, vin, true),
      });
    }
  }

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      await attempt.run();
      await settlementPage.expectSettlementDisplayScreen();
      await settlementPage.readStandardSettlementTotalAmount();
      return attempt.key;
    } catch (error) {
      lastError = error;
      await settlementPage.clickCancel().catch(() => {});
      await settlementPage.expectSettlementSearchScreenVisible().catch(() => {});
    }
  }
  throw lastError ?? new Error("UDP-T3978 QAT: loan search did not reach settlement display.");
}

/** UDP-T3978 — first settlement loan search (QAT: VIN/rego with add-to-quote; SIT: BAGGED / VIN). */
async function completeMultipleSettlementFirstLoanToDisplay(
  settlementPage: DOSettlementPage,
  _page: Page,
  _assetDetailsPage: DOAssetDetailsPage,
): Promise<"bagged" | "rego" | "vin" | "sit"> {
  if (getCurrentEnv() === "qat") {
    const bagged = settlementData.loanLookup.validRegoSameDealer?.trim() || "BAGGED";
    const rego = requireLoanId(
      businessSettlementLoanRegoOrVin(),
      "loanLookup.businessLoanRegoOrVin",
    );
    const vin = businessSettlementVin();
    const tries: Array<{ key: "bagged" | "rego" | "vin"; run: () => Promise<void> }> = [
      { key: "bagged", run: () => completeLoanSearchToDisplay(settlementPage, bagged, false) },
      { key: "rego", run: () => completeLoanSearchToDisplay(settlementPage, rego, false) },
    ];
    if (vin) {
      tries.push({
        key: "vin",
        run: () => completeLoanSearchToDisplayWithPrivacyWaiver(settlementPage, vin, true),
      });
    }

    let lastError: unknown;
    for (const attempt of tries) {
      try {
        await attempt.run();
        await settlementPage.expectSettlementDisplayScreen();
        await settlementPage.readStandardSettlementTotalAmount();
        return attempt.key;
      } catch (error) {
        lastError = error;
        await settlementPage.clickCancel().catch(() => {});
        await settlementPage.expectSettlementSearchScreenVisible().catch(() => {});
      }
    }
    throw lastError ?? new Error("UDP-T3978 QAT: first settlement loan search failed.");
  }
  await completeFirstMultipleSettlementLoanSearchToDisplay(settlementPage);
  return "sit";
}

/** UDP-T3978 — add standard settlement to the open quote via **Add to this Quote**. */
async function addStandardSettlementToCurrentQuote(
  page: Page,
  settlementPage: DOSettlementPage,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<number> {
  await settlementPage.expectSettlementDisplayScreen();
  const total = await settlementPage.readStandardSettlementTotalAmount();
  await settlementPage.selectSettlementAmountOption("standard");
  await settlementPage.addSelectedSettlementToQuote();

  const newQuoteDialog = page
    .getByRole("dialog", { name: /Settlement Quote/i })
    .filter({ hasText: /proceed for a new quote with this settlement amount/i })
    .last();
  if (await newQuoteDialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await newQuoteDialog.getByRole("button", { name: /^No$/i }).click({ timeout: 15_000 });
    throw new Error(
      "UDP-T3978: settlement offered Create New Quote — use same-dealer Rego on saved quote (HG7765 / BAGGED).",
    );
  }

  await settlementPage.expectOnAssetDetailsScreen();
  await assetDetailsPage.waitForQuoteLoadersToFinish(120_000);
  await expect
    .poll(
      async () => parseSettlementAmountField(await assetDetailsPage.settlementAmountInput.inputValue()),
      { timeout: 120_000 },
    )
    .toBeGreaterThan(0);
  return total;
}

/** UDP-T3978 — second settlement (different Rego/VIN, same borrower). */
async function completeMultipleSettlementSecondLoanToDisplay(
  settlementPage: DOSettlementPage,
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
  firstLoanKey: "bagged" | "rego" | "vin" | "sit",
): Promise<void> {
  if (getCurrentEnv() === "qat") {
    const exclude =
      firstLoanKey === "bagged" || firstLoanKey === "rego" || firstLoanKey === "vin"
        ? [firstLoanKey]
        : [];
    await completeQatT3978LoanToDisplay(settlementPage, exclude);
    return;
  }

  const second = requireLoanId(
    multipleSettlementSecondRegoOrVin(),
    "dealerListing.secondSettlementRegoOrVin",
  );
  if (isSettlementVin(second)) {
    const { regoFallback } = differentDealerVinAndRegoFallback();
    await completeDifferentDealerLoanSearchToDisplay(settlementPage, second, regoFallback);
  } else {
    await completeLoanSearchToDisplayWithPrivacyWaiver(settlementPage, second, false);
  }
}

function parseSettlementAmountField(value: string): number {
  return Number.parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
}

function isSettlementVin(regoOrVin: string): boolean {
  return regoOrVin.trim().length >= 15;
}

/** VIN/Rego lookup → privacy waiver (if shown) → settlement display. */
async function completeLoanSearchToDisplayWithPrivacyWaiver(
  settlementPage: DOSettlementPage,
  regoOrVin: string,
  useVin = false,
): Promise<void> {
  if (useVin) {
    await settlementPage.prepareDifferentDealerVinLoanSearch(regoOrVin);
  } else {
    await settlementPage.prepareDifferentDealerRegoLoanSearch(regoOrVin);
  }
  await settlementPage.clickNext();
  if (
    await settlementPage
      .expectPrivacyWaiverScreen()
      .then(() => true)
      .catch(() => false)
  ) {
    await settlementPage.setPrivacyWaiverConsent(true);
    await settlementPage.clickNext();
  }
  await settlementPage.expectSettlementDisplayScreen();
}

/** UDP-T3963–T3965 — different-dealer VIN (with Rego fallback) through privacy waiver to display. */
async function completeDifferentDealerLoanSearchToDisplay(
  settlementPage: DOSettlementPage,
  vin: string,
  regoFallback: string,
): Promise<void> {
  await settlementPage.searchDifferentDealerLoanAndAdvanceToPrivacyWaiver(vin, regoFallback);
  await settlementPage.setPrivacyWaiverConsent(true);
  await settlementPage.clickNext();
  await settlementPage.expectSettlementDisplayScreen();
}

function businessRuleExpectedMessagePattern(): RegExp {
  const fromData = (
    settlementData as { businessRuleError?: { expectedMessagePattern?: string } }
  ).businessRuleError?.expectedMessagePattern?.trim();
  return new RegExp(fromData ?? businessRuleErrorPatternSource(), "i");
}

function businessRuleErrorPatternSource(): string {
  return "arrears|overdue|in arrears|past due|not eligible|cannot proceed|unable to proceed|business rule|finance lease|operating lease|lease.*not.*(?:eligible|support)|not.*(?:eligible|allowed).*settlement|settlement can not be completed|settlement cannot be completed|can not be completed|contact UDC finance|please contact UDC|ineligible|MAF-5580";
}

/** Steps 2–4 — enter Rego/VIN on Settlement search and submit (Next + API wait). */
async function submitSettlementLoanSearch(
  settlementPage: DOSettlementPage,
  regoOrVin: string,
  useVin = false,
): Promise<void> {
  await settlementPage.expectSettlementSearchScreenVisible();
  await settlementPage.expectSettlementDateIsPopulated();
  await settlementPage.ensureSettlementDateReadyForNext();
  if (useVin) {
    await settlementPage.clearRego();
    await settlementPage.enterVin(regoOrVin);
    await settlementPage.expectVinValue(regoOrVin);
    await settlementPage.expectNoVinValidationError();
    await settlementPage.expectRegoIsBlank();
  } else {
    await settlementPage.enterRego(regoOrVin);
    await settlementPage.expectRegoValue(regoOrVin);
    await settlementPage.expectNoRegoValidationError();
    await settlementPage.clearVinIfVisible();
  }
  await settlementPage.expectRegoDoesNotContainSettlementDate();
  await settlementPage.clickNext();
}

async function openStandardQuoteForProduct(
  page: Page,
  productKey: ProductKey,
): Promise<{
  dashboardPage: DODashboardPage;
  assetDetailsPage: DOAssetDetailsPage;
  settlementPage: DOSettlementPage;
}> {
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  const settlementPage = new DOSettlementPage(page);
  const cfg = settlementData.products[productKey];

  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(settlementDealer());
  await dashboardPage.clickCreateStandardQuote();

  if (productKey === "csa" || productKey === "csab") await dashboardPage.selectCSAproduct();
  else if (productKey === "tl") await dashboardPage.selectTermLoanProduct();
  else if (productKey === "afv") await dashboardPage.selectAssuredFutureValueProduct();
  else if (productKey === "fl") await dashboardPage.selectFinanceLeaseProduct();
  else if (productKey === "ol") {
    const dlg = page.getByRole("dialog");
    await dlg.getByText(/Operating\s*Lease/i).first().click();
  }

  await expect.soft(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
  await assetDetailsPage.waitForAssetDetailsStepReady();
  await assetDetailsPage.chooseProduct(cfg.product);
  if ("program" in cfg && cfg.program) {
    await assetDetailsPage.chooseProgram(cfg.program);
  }
  return { dashboardPage, assetDetailsPage, settlementPage };
}

/** TL quote must be calculable before the Less Deposit **Settlement** trigger enables on SIT. */
async function prepareCalculableTlQuoteForSettlement(
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
  await assetDetailsPage.termsOfFinance("36");
  await assetDetailsPage.interestRate("9");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await assetDetailsPage.enterOriginationReference("SQ-Settlement-Ref-01");
  await assetDetailsPage.enterTradeAmount("$5,000");
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero({ timeoutMs: 90_000 });
  await expect
    .poll(
      async () =>
        (await assetDetailsPage.netTradeAmountDisplayed.inputValue()).replace(/[$,]/g, ""),
      { timeout: 45_000 },
    )
    .toMatch(/5000/);
}

async function prepareQuoteForSettlementIfNeeded(
  page: Page,
  productKey: ProductKey,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  if (productKey === "tl" || productKey === "csa") {
    const addAssetPage = new DOAddAssetPage(page);
    if (productKey === "tl") {
      await prepareCalculableTlQuoteForSettlement(assetDetailsPage, addAssetPage);
    } else {
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
      await assetDetailsPage.interestRate("11");
      await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
      await assetDetailsPage.enterOriginationReference("SQ-Settlement-CSA-01");
      await assetDetailsPage.clickCalculateButton();
      await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero({ timeoutMs: 90_000 });
      await assetDetailsPage.enterTradeAmount("$5,000");
    }
  }
}

async function openSettlementPopupFromQuote(
  page: Page,
  productKey: ProductKey = "tl",
): Promise<{
  assetDetailsPage: DOAssetDetailsPage;
  settlementPage: DOSettlementPage;
}> {
  const { assetDetailsPage, settlementPage } = await openStandardQuoteForProduct(page, productKey);
  await prepareQuoteForSettlementIfNeeded(page, productKey, assetDetailsPage);
  if (await settlementPage.settlementTrigger.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await settlementPage.openSettlementFromQuote();
  } else {
    test.skip(true, `Settlement trigger not visible for ${productKey} on this build.`);
  }
  return { assetDetailsPage, settlementPage };
}

async function completeLoanSearchToDisplay(
  settlementPage: DOSettlementPage,
  regoOrVin: string,
  useVin = false,
): Promise<void> {
  if (useVin) {
    await settlementPage.clearRego();
    await settlementPage.enterVin(regoOrVin);
  } else {
    await settlementPage.enterRego(regoOrVin);
    await settlementPage.clearVin();
  }
  await settlementPage.ensureSettlementDateReadyForNext();
  await settlementPage.clickNext();
  await settlementPage.expectSettlementDisplayScreen();
}

/** UDP-T3963–T3965 — CSA-B quote → different-dealer loan lookup → privacy waiver screen. */
async function openDifferentDealerSettlementWaiverScreen(
  page: Page,
): Promise<DOSettlementPage> {
  const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page, "csab");
  const { vin, regoFallback } = differentDealerVinAndRegoFallback();
  await settlementPage.searchDifferentDealerLoanAndAdvanceToPrivacyWaiver(vin, regoFallback);
  return settlementPage;
}

/** UDP-T3965 / UDP-T3971 — privacy waiver accepted → Settlement Quote display screen. */
async function openDifferentDealerSettlementDisplayScreen(
  page: Page,
): Promise<DOSettlementPage> {
  const settlementPage = await openDifferentDealerSettlementWaiverScreen(page);
  await settlementPage.setPrivacyWaiverConsent(true);
  await settlementPage.clickNext();
  await settlementPage.expectSettlementDisplayScreen();
  return settlementPage;
}

/** UDP-T3983 — optional Business settlement VIN (per-environment override). */
function businessSettlementVin(): string {
  const env = getCurrentEnv();
  const fromEnv = (
    settlementData as {
      environments?: Record<string, { businessLoanVin?: string }>;
      loanLookup?: { businessLoanVin?: string };
    }
  ).environments?.[env]?.businessLoanVin;
  const fromRoot = (
    settlementData.loanLookup as { businessLoanVin?: string }
  ).businessLoanVin?.trim();
  return (fromEnv ?? fromRoot ?? "").trim();
}

/** UDP-T3983 — business settlement loan Rego (per-environment override in environments when needed). */
function businessSettlementLoanRegoOrVin(): string {
  const env = getCurrentEnv();
  const fromEnv = (
    settlementData as {
      environments?: Record<string, { businessLoanRegoOrVin?: string }>;
    }
  ).environments?.[env]?.businessLoanRegoOrVin;
  return (fromEnv ?? settlementData.loanLookup.businessLoanRegoOrVin ?? "").trim();
}

/** UDP-T3977 QAT — VIN first, Rego HG7765 fallback → settlement quote display. */
async function completeUdpT3977LoanSearchToSettlementDisplay(
  settlementPage: DOSettlementPage,
): Promise<void> {
  const vin = businessSettlementVin();
  const rego = requireLoanId(
    businessSettlementLoanRegoOrVin(),
    "loanLookup.businessLoanRegoOrVin",
  );

  if (vin) {
    try {
      await completeLoanSearchToDisplayWithPrivacyWaiver(settlementPage, vin, true);
      return;
    } catch {
      await settlementPage.clickBack().catch(() => {});
      await settlementPage.expectSettlementSearchScreenVisible().catch(() => {});
    }
  }

  if (isSettlementVin(rego)) {
    await completeLoanSearchToDisplayWithPrivacyWaiver(settlementPage, rego, true);
    return;
  }

  await completeLoanSearchToDisplay(settlementPage, rego, false);
}

/** UDP-T3982 — CSA-C consumer quote → VIN loan lookup → privacy waiver → settlement display. */
async function openConsumerSettlementDisplayScreen(page: Page): Promise<DOSettlementPage> {
  const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page, "csa");
  const { vin, regoFallback } = differentDealerVinAndRegoFallback();
  await settlementPage.searchDifferentDealerLoanAndAdvanceToPrivacyWaiver(vin, regoFallback);
  await settlementPage.setPrivacyWaiverConsent(true);
  await settlementPage.clickNext();
  await settlementPage.expectSettlementDisplayScreen();
  return settlementPage;
}

/** UDP-T3983 — return to Asset Details and reopen Settlement loan search (after VIN is not business). */
async function reopenSettlementFromAssetDetails(
  assetDetailsPage: DOAssetDetailsPage,
  settlementPage: DOSettlementPage,
): Promise<void> {
  await assetDetailsPage.clickStandardQuoteStepTab(/Asset\s*Details/i);
  await assetDetailsPage.waitForAssetDetailsStepReady();
  await settlementPage.waitForSettlementTriggerEnabled(90_000);
  await assetDetailsPage.openSettlementDialog();
  await settlementPage.expectSettlementSearchScreenVisible();
}

/** UDP-T3983 — business loan: VIN first; Rego fallback when VIN is not a Business settlement. */
async function completeBusinessLoanSearchToSettlementDisplay(
  assetDetailsPage: DOAssetDetailsPage,
  settlementPage: DOSettlementPage,
): Promise<void> {
  const rego = requireLoanId(
    businessSettlementLoanRegoOrVin(),
    "loanLookup.businessLoanRegoOrVin",
  );
  const vin = businessSettlementVin();

  const tryBusinessSettlementDisplay = async (search: () => Promise<void>): Promise<boolean> => {
    try {
      await search();
      await settlementPage.expectSettlementDisplayScreen();
      await settlementPage.expectBusinessSettlementCustomFlowsDisplayed();
      return true;
    } catch {
      await settlementPage.clickBack().catch(() => {});
      await settlementPage.clickCancel().catch(() => {});
      return false;
    }
  };

  if (
    vin &&
    (await tryBusinessSettlementDisplay(() =>
      completeLoanSearchToDisplayWithPrivacyWaiver(settlementPage, vin, true),
    ))
  ) {
    return;
  }

  await reopenSettlementFromAssetDetails(assetDetailsPage, settlementPage);

  if (isSettlementVin(rego)) {
    if (
      await tryBusinessSettlementDisplay(() =>
        completeLoanSearchToDisplayWithPrivacyWaiver(settlementPage, rego, true),
      )
    ) {
      return;
    }
  } else if (
    await tryBusinessSettlementDisplay(() =>
      completeLoanSearchToDisplay(settlementPage, rego, false),
    )
  ) {
    return;
  }

  throw new Error(
    "UDP-T3983 QAT: VIN and Rego did not reach Business settlement display — check QAT business loan test data.",
  );
}

/** UDP-T3979 — QAT activated-loan row key (Rego HG7765). */
function udpT3979DealerListingLoanRef(): string {
  const env = getCurrentEnv();
  const fromEnv = (
    settlementData as {
      environments?: Record<string, { dealerListing?: { activatedLoanRegoOrVin?: string } }>;
    }
  ).environments?.[env]?.dealerListing?.activatedLoanRegoOrVin;
  return requireLoanId(
    fromEnv ?? businessSettlementLoanRegoOrVin(),
    "environments.qat.dealerListing.activatedLoanRegoOrVin or loanLookup.businessLoanRegoOrVin",
  );
}

function udpT3979MultipleSettlementBlockedPattern(): RegExp {
  return new RegExp(
    `multiple\\s+settlement|already\\s+.*settlement|second\\s+settlement|not\\s+allowed.*settlement|cannot\\s+.*(?:add|create).*settlement|only\\s+one\\s+settlement|settlement\\s+already|${businessRuleErrorPatternSource()}`,
    "i",
  );
}

/** UDP-T3979 — Dealer listing → Settlement loan search (VIN first, Rego fallback). */
async function openDealerListingSettlementSearchUdpT3979(page: Page): Promise<DOSettlementPage> {
  const loanReference = udpT3979DealerListingLoanRef();
  const dashboardPage = new DODashboardPage(page);
  const settlementPage = new DOSettlementPage(page);

  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(settlementDealer());
  await dashboardPage.navigateToDealerListingActiveLoans();
  await dashboardPage.clickCreateSettlementQuoteForLoan(loanReference);
  await settlementPage.expectSettlementSearchScreenVisible();
  await settlementPage.expectSettlementDateIsPopulated();
  await settlementPage.ensureSettlementDateReadyForNext();
  return settlementPage;
}

/** UDP-T3979 — VIN HT56TR456YU787548 first; Rego HG7765 if VIN does not reach display. */
async function completeUdpT3979LoanSearchToDisplay(settlementPage: DOSettlementPage): Promise<void> {
  const vin = businessSettlementVin();
  const rego = requireLoanId(
    businessSettlementLoanRegoOrVin(),
    "loanLookup.businessLoanRegoOrVin",
  );

  if (vin) {
    try {
      await completeLoanSearchToDisplayWithPrivacyWaiver(settlementPage, vin, true);
      return;
    } catch {
      await settlementPage.clickBack().catch(() => {});
      await settlementPage.expectSettlementSearchScreenVisible().catch(() => {});
    }
  }

  if (isSettlementVin(rego)) {
    await completeLoanSearchToDisplayWithPrivacyWaiver(settlementPage, rego, true);
    return;
  }

  await completeLoanSearchToDisplayWithPrivacyWaiver(settlementPage, rego, false);
}

async function navigateDealerListingActivatedLoansUdpT3979(page: Page): Promise<DODashboardPage> {
  const dashboardPage = new DODashboardPage(page);
  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(settlementDealer());
  await dashboardPage.navigateToDealerListingActiveLoans();
  return dashboardPage;
}

/** UDP-T3979 — second settlement blocked at listing actions or during settlement flow. */
async function expectSecondDealerListingSettlementBlocked(
  page: Page,
  loanRef: string,
  settlementPage: DOSettlementPage,
): Promise<void> {
  const dashboardPage = await navigateDealerListingActivatedLoansUdpT3979(page);
  await dashboardPage.searchQuotesGrid(loanRef);
  await dashboardPage.openQuoteGridRowActions(loanRef);

  const actionHidden = await dashboardPage
    .expectQuoteGridActionVisible(/Create Settlement Quote/i, false)
    .then(() => true)
    .catch(() => false);
  if (actionHidden) {
    return;
  }

  await dashboardPage.clickQuoteGridAction(/Create Settlement Quote/i);

  const onSearch = await settlementPage
    .expectSettlementSearchScreenVisible()
    .then(() => true)
    .catch(() => false);
  if (!onSearch) {
    await settlementPage.expectBusinessRuleError(udpT3979MultipleSettlementBlockedPattern());
    await settlementPage.expectBusinessRuleErrorBlocksProceed();
    return;
  }

  try {
    await completeUdpT3979LoanSearchToDisplay(settlementPage);
    await settlementPage.selectSettlementAmountOption("standard");
    await settlementPage.addSelectedSettlementToQuote();
  } catch {
    // add may throw when UI blocks; fall through to error assertions
  }

  await settlementPage.expectBusinessRuleError(udpT3979MultipleSettlementBlockedPattern());
  await settlementPage.expectBusinessRuleErrorBlocksProceed();
}

/** UDP-T3983 — CSA-B business quote → settlement loan lookup → settlement display (QAT). */
async function openBusinessSettlementDisplayScreen(page: Page): Promise<DOSettlementPage> {
  const { assetDetailsPage, settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(
    page,
    "csab",
  );
  await completeBusinessLoanSearchToSettlementDisplay(assetDetailsPage, settlementPage);
  return settlementPage;
}

/** Dealer listing **Create Settlement Quote** (BAGGED) → VIN + settlement date → privacy waiver → display. */
async function openSettlementDisplayFromDealerListing(
  page: Page,
  loanReference: string,
): Promise<DOSettlementPage> {
  const dashboardPage = new DODashboardPage(page);
  const settlementPage = new DOSettlementPage(page);
  const vin = getCurrentEnv() === "sit" ? sitDealerListingSettlementVin() : differentDealerVinAndRegoFallback().vin;

  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.selectDealer(settlementDealer());
  await dashboardPage.navigateToDealerListingActiveLoans();
  await dashboardPage.clickCreateSettlementQuoteForLoan(loanReference);
  await settlementPage.expectSettlementSearchScreenVisible();
  await settlementPage.expectSettlementDateIsPopulated();
  await settlementPage.ensureSettlementDateReadyForNext();

  if (getCurrentEnv() === "sit") {
    await settlementPage.prepareDifferentDealerVinLoanSearch(vin);
    await settlementPage.clickSettlementPopupNext();
    await settlementPage.expectPrivacyWaiverScreen();
    await settlementPage.setPrivacyWaiverConsent(true);
    await settlementPage.clickNext();
    await settlementPage.expectSettlementDisplayScreen();
    return settlementPage;
  }

  await settlementPage.clickNext();
  await settlementPage.expectSettlementDisplayScreen();
  return settlementPage;
}

/** UDP-T3952 — minimal calculable TL Asset Details (no trade/settlement prerequisites). */
async function prepareTlMandatoryAssetDetailsForUdpT3952(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  const addAssetPage = new DOAddAssetPage(page);
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
  await assetDetailsPage.termsOfFinance("36");
  await assetDetailsPage.interestRate("9");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await assetDetailsPage.enterOriginationReference("SQ-Settlement-Ref-01");
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero({ timeoutMs: 90_000 });
  await assetDetailsPage.enterOriginationReference("SQ-Settlement-Ref-01");
}

/** CSA-B — Calculate, apply trade-in, then re-Calculate (with retry for SIT loader timing). */
async function calculateCsabQuoteWithTrade(
  assetDetailsPage: DOAssetDetailsPage,
  origRef = "SQ-Settlement-CSA-01",
): Promise<void> {
  await assetDetailsPage.clickCalculateButton();
  await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero({ timeoutMs: 90_000 });
  await assetDetailsPage.enterTradeAmount("$5,000");
  await assetDetailsPage.waitForQuoteLoadersToFinish();
  await assetDetailsPage.enterOriginationReference(origRef);

  for (let attempt = 0; attempt < 3; attempt++) {
    await assetDetailsPage.clickCalculateButton();
    await assetDetailsPage.waitForQuoteLoadersToFinish();
    try {
      await assetDetailsPage.expectTotalAmountBorrowedGreaterThanZero({ timeoutMs: 45_000 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
      await assetDetailsPage.enterTradeAmount("$5,000");
      await assetDetailsPage.enterOriginationReference(origRef);
    }
  }
}

/** CSA-C consumer quote — calculable before Settlement trigger enables on SIT. */
async function prepareCsaMandatoryAssetDetailsForSettlement(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  const addAssetPage = new DOAddAssetPage(page);
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
  await assetDetailsPage.interestRate("11");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await assetDetailsPage.enterOriginationReference("SQ-Settlement-CSA-Consumer-01");
  await calculateCsabQuoteWithTrade(assetDetailsPage, "SQ-Settlement-CSA-Consumer-01");
}

/** CSA-B quote must be calculable before the Less Deposit **Settlement** trigger enables on SIT. */
async function prepareCsabMandatoryAssetDetailsForSettlement(
  page: Page,
  assetDetailsPage: DOAssetDetailsPage,
): Promise<void> {
  const addAssetPage = new DOAddAssetPage(page);
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
  await assetDetailsPage.termsOfFinance("36");
  await assetDetailsPage.interestRate("11");
  await assetDetailsPage.ensureLoanDateAndFirstPaymentReadyForCalculate();
  await assetDetailsPage.enterOriginationReference("SQ-Settlement-CSA-01");
  await calculateCsabQuoteWithTrade(assetDetailsPage);
}

/** UDP-T3987 — complete individual borrower through Reference confirm (Customer Details done). */
async function completeTlQuoteCustomerDetailsThroughReference(
  assetDetailsPage: DOAssetDetailsPage,
  origRef = UDP_T3987_ORIG_REF,
): Promise<void> {
  await assetDetailsPage.clickNextAndExpectCustomerDetails(origRef);
  await assetDetailsPage.clickAddBorrowerorGuarantorButton();
  await assetDetailsPage.searchByDropdownClick();
  await assetDetailsPage.selectUDCSelectOption();
  await assetDetailsPage.enterUDCCustomerNumber("420");
  await assetDetailsPage.clickSearchButton();
  await assetDetailsPage.clickAddNewCustomerButton();

  const personal = new DOPersonalDetailsPage(assetDetailsPage.page);
  await fillValidIndividualPersonalBorrower(personal);
  await personal.clickNextButton();

  const address = new DOAddressDetailsPage(assetDetailsPage.page);
  await fillMinimalAddressContinue(assetDetailsPage.page, address);

  const emp = new DOEmploymentDetailsPage(assetDetailsPage.page);
  await fillMinimalEmploymentContinue(emp);

  const fin = new DOFinancialPositionPage(assetDetailsPage.page);
  await fillMinimalFinancialContinue(fin);

  const ref = new DOReferenceDetailsPage(assetDetailsPage.page);
  await ref.waitForReferenceDetailsStep();
  await ref.clickAddContactDetails();
  await ref.selectContactType("Accountant");
  await ref.enterContactFirstName("Alex");
  await ref.enterContactLastName("Referee");
  await ref.clickAddContactInModal();
  await ref.confirmCustomerDetailsCorrect();
}

/**
 * UDP-T3987 — save quote, advance to Customer Details, return to Asset Details so
 * **Calculate Settlement** enables (same round-trip as UDP-T3952 after save).
 */
async function saveQuoteAndRoundTripToEnableSettlement(
  assetDetailsPage: DOAssetDetailsPage,
  settlementPage: DOSettlementPage,
  origRef = UDP_T3987_ORIG_REF,
): Promise<void> {
  await assetDetailsPage.clickStandardQuoteStepTab(/Asset\s*Details/i);
  await assetDetailsPage.waitForAssetDetailsStepReady();
  await assetDetailsPage.clickSaveStandardQuoteStep({ originatorRefForRequiredDialog: origRef });
  await assetDetailsPage.clickNextAndExpectCustomerDetails(origRef);
  await assetDetailsPage.clickStandardQuoteStepTab(/Asset\s*Details/i);
  await assetDetailsPage.waitForAssetDetailsStepReady();
  await settlementPage.expectSettlementTriggerVisible();
  await settlementPage.waitForSettlementTriggerEnabled();
}

/**
 * UDP-T3952 — **Calculate Settlement** enables only after mandatory Asset Details are saved
 * by advancing to Customer Details once, then returning to Asset Details.
 */
async function accessSettlementScreenAfterAssetDetailsSaved(
  page: Page,
  productKey: ProductKey = "tl",
  options?: { openSettlementDialog?: boolean },
): Promise<{
  assetDetailsPage: DOAssetDetailsPage;
  settlementPage: DOSettlementPage;
}> {
  const { assetDetailsPage, settlementPage } = await openStandardQuoteForProduct(page, productKey);
  const origRef =
    productKey === "csa"
      ? "SQ-Settlement-CSA-Consumer-01"
      : productKey === "csab"
        ? "SQ-Settlement-CSA-01"
        : "SQ-Settlement-Ref-01";

  if (productKey === "tl") {
    await prepareTlMandatoryAssetDetailsForUdpT3952(page, assetDetailsPage);
    await assetDetailsPage.clickNextAndExpectCustomerDetails(origRef);
  } else if (productKey === "csa") {
    await prepareCsaMandatoryAssetDetailsForSettlement(page, assetDetailsPage);
    await assetDetailsPage.clickSaveStandardQuoteStep({ originatorRefForRequiredDialog: origRef });
    await assetDetailsPage.waitForQuoteLoadersToFinish(120_000);
    await assetDetailsPage.clickNextAndExpectCustomerDetails(origRef);
  } else if (productKey === "csab") {
    await prepareCsabMandatoryAssetDetailsForSettlement(page, assetDetailsPage);
    await assetDetailsPage.clickSaveStandardQuoteStep({ originatorRefForRequiredDialog: origRef });
    await assetDetailsPage.waitForQuoteLoadersToFinish(120_000);
    await assetDetailsPage.clickNextAndExpectCustomerDetails(origRef);
  } else {
    test.skip(true, `accessSettlementScreenAfterAssetDetailsSaved not configured for ${productKey}.`);
  }

  await assetDetailsPage.clickStandardQuoteStepTab(/Asset\s*Details/i);
  await assetDetailsPage.waitForAssetDetailsStepReady();

  if (productKey === "csa" || productKey === "csab") {
    await calculateCsabQuoteWithTrade(assetDetailsPage, origRef);
  }

  await settlementPage.expectSettlementTriggerVisible();
  await settlementPage.waitForSettlementTriggerEnabled(90_000);
  if (options?.openSettlementDialog !== false) {
    await assetDetailsPage.openSettlementDialog();
    await settlementPage.expectSettlementSearchScreenVisible();
  }
  return { assetDetailsPage, settlementPage };
}

/** Existing Standard Quote (e.g. 2361) → Asset Details → Settlement loan-search pop-up. */
async function openSettlementFromExistingQuote(page: Page): Promise<{
  assetDetailsPage: DOAssetDetailsPage;
  settlementPage: DOSettlementPage;
}> {
  const quoteId = settlementData.existingQuotes.settlementFromAssetDetails;
  const dashboardPage = new DODashboardPage(page);
  const assetDetailsPage = new DOAssetDetailsPage(page);
  const settlementPage = new DOSettlementPage(page);

  await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
  await dashboardPage.waitForAuthenticatedDashboard();
  await dashboardPage.openStandardQuoteByQuoteId(quoteId);
  await assetDetailsPage.expectStandardQuoteLoaded();
  await assetDetailsPage.openSettlementDialog();
  await settlementPage.expectSettlementSearchScreenVisible();

  return { assetDetailsPage, settlementPage };
}

test.describe("Settlement @do @regression", () => {
  test(
    "UDP-T3952 - Access Settlement Screen from Asset Details Standard Quote",
    { tag: ["@do", "@regression", "@UDP-T3952"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page, "tl");
      await settlementPage.expectSettlementSearchScreenVisible();
    },
  );

  test(
    "UDP-T3953 - Access Settlement from Dealer Listing Activated Loans",
    { tag: ["@do", "@regression", "@UDP-T3953"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const loanId = requireLoanId(
        settlementData.dealerListing.activatedLoanRegoOrVin,
        "dealerListing.activatedLoanRegoOrVin",
      );
      const dashboardPage = new DODashboardPage(page);
      const settlementPage = new DOSettlementPage(page);
      await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
      await dashboardPage.waitForAuthenticatedDashboard();
      await dashboardPage.selectDealer(TLC_DEALER);
      await dashboardPage.navigateToDealerListingActiveLoans();
      await dashboardPage.clickCreateSettlementQuoteForLoan(loanId);
      await settlementPage.expectSettlementSearchScreenVisible();
    },
  );

  test(
    "UDP-T3954 - Settlement NOT Available for Finance Lease (FL) and Operating Lease (OL) Product",
    { tag: ["@do", "@regression", "@UDP-T3954"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage: flSettlement } = await openStandardQuoteForProduct(page, "fl");
      await flSettlement.expectSettlementTriggerHidden();
      const { settlementPage: olSettlement } = await openStandardQuoteForProduct(page, "ol");
      await olSettlement.expectSettlementTriggerHidden();
    },
  );

  test(
    "UDP-T3955 - Rego Number Valid Alphanumeric Input (Max 6 Characters)",
    { tag: ["@do", "@regression", "@UDP-T3955"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const rego = settlementData.fieldSamples.validRego; // SIT activated loan — max 6 alphanumeric
      const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page);

      await settlementPage.expectSettlementSearchScreenVisible();
      await settlementPage.expectSettlementDateIsPopulated();
      await settlementPage.enterRego(rego);
      await settlementPage.clearVin();
      await settlementPage.expectRegoValue(rego);
      await settlementPage.expectVinIsBlank();
      await settlementPage.expectNoRegoValidationError();
      await settlementPage.clickNext();
      await settlementPage.expectLoanSearchStepCompleted();
    },
  );

  test(
    "UDP-T3956 - Rego Number Special Characters Not Allowed",
    { tag: ["@do", "@regression", "@UDP-T3956"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page);

      await settlementPage.expectSettlementSearchScreenVisible();
      await settlementPage.enterRego(settlementData.fieldSamples.invalidRegoSpecialChars);
      await settlementPage.clickNext();
      await settlementPage.expectRegoValidationError();
    },
  );

  test(
    "UDP-T3957 - VIN Valid Alphanumeric Input (Max 17 Characters)",
    { tag: ["@do", "@regression", "@UDP-T3957"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const vin = settlementData.fieldSamples.validVin; // SIT — max 17 alphanumeric
      const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page);

      await settlementPage.expectSettlementSearchScreenVisible();
      await settlementPage.expectSettlementDateIsPopulated();
      await settlementPage.clearRego();
      await settlementPage.enterVin(vin);
      await settlementPage.expectRegoIsBlank();
      await settlementPage.expectVinValue(vin);
      await settlementPage.expectNoVinValidationError();
      await settlementPage.clickNext();
      await settlementPage.expectLoanSearchStepCompleted();
    },
  );

  test(
    "UDP-T3958 - VIN Special Characters Not Allowed",
    { tag: ["@do", "@regression", "@UDP-T3958"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page);

      await settlementPage.expectSettlementSearchScreenVisible();
      await settlementPage.clearRego();
      await settlementPage.enterVin(settlementData.fieldSamples.invalidVinSpecialChars);
      await settlementPage.clickNext();
      await settlementPage.expectVinValidationError();
    },
  );
  
  test(
    "UDP-T3959 - Settlement Date Defaults to Today's Date",
    { tag: ["@do", "@regression", "@UDP-T3959"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page);

      await settlementPage.expectSettlementSearchScreenVisible();
      await settlementPage.expectSettlementDateIsToday();
    },
  );

  test(
    "UDP-T3960 - Settlement Date Past Date Not Accepted",
    { tag: ["@do", "@regression", "@UDP-T3960"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page);

      await settlementPage.expectSettlementSearchScreenVisible();
      await settlementPage.expectSettlementDateIsPopulated();
      await settlementPage.expectPastSettlementDateRejected();
    },
  );

  test(
    "UDP-T3961 - Rego Pre-Populated When Accessed from Dealer Listing",
    { tag: ["@do", "@regression", "@UDP-T3961"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const loanId = requireLoanId(
        settlementData.dealerListing.activatedLoanRegoOrVin,
        "dealerListing.activatedLoanRegoOrVin",
      );
      const dashboardPage = new DODashboardPage(page);
      const settlementPage = new DOSettlementPage(page);
      await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
      await dashboardPage.waitForAuthenticatedDashboard();
      await dashboardPage.selectDealer(TLC_DEALER);
      await dashboardPage.navigateToDealerListingActiveLoans();
      await dashboardPage.clickCreateSettlementQuoteForLoan(loanId);

      await settlementPage.expectSettlementSearchScreenVisible();
      await settlementPage.expectSettlementDateIsPopulated();
      await settlementPage.expectRegoValue(loanId);
    },
  );

  test(
    "UDP-T3962 - Loan Found Same Dealer Proceed to Settlement Display",
    { tag: ["@do", "@regression", "@UDP-T3962"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const rego = requireLoanId(
        settlementData.loanLookup.validRegoSameDealer,
        "loanLookup.validRegoSameDealer",
      );
      const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page);

      await settlementPage.expectSettlementSearchScreenVisible();
      await settlementPage.expectSettlementDateIsPopulated();
      await settlementPage.enterRego(rego);
      await settlementPage.clearVin();
      await settlementPage.expectRegoValue(rego);
      await settlementPage.expectNoRegoValidationError();
      await settlementPage.clickNext();
      await settlementPage.expectSettlementDisplayScreen();
      await settlementPage.expectCustomerDetailsPopulated();
    },
  );

  test(
    "UDP-T3963 - Loan Found Different Dealer Privacy Waiver Required",
    { tag: ["@do", "@regression", "@UDP-T3963"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const settlementPage = await openDifferentDealerSettlementWaiverScreen(page);
      await settlementPage.expectDifferentDealerPrivacyWaiverRequired();
    },
  );

  test(
    "UDP-T3964 - Privacy Waiver Checkbox Not Selected Cannot Proceed",
    { tag: ["@do", "@regression", "@UDP-T3964"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const settlementPage = await openDifferentDealerSettlementWaiverScreen(page);
      await settlementPage.expectPrivacyWaiverBlocksProceed();
    },
  );

  test(
    "UDP-T3965 - Privacy Waiver Checkbox Selected Proceeds to Settlement Display",
    { tag: ["@do", "@regression", "@UDP-T3965"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      await openDifferentDealerSettlementDisplayScreen(page);
    },
  );

  test(
    "UDP-T3966 - Vehicle Not Found Error Message Displayed",
    { tag: ["@do", "@regression", "@UDP-T3966"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page);

      await settlementPage.expectSettlementSearchScreenVisible();
      await settlementPage.expectSettlementDateIsPopulated();
      await settlementPage.enterRego(settlementData.loanLookup.invalidRegoOrVin);
      await settlementPage.clearVin();
      await settlementPage.expectNoRegoValidationError();
      await settlementPage.clickNext();
      await settlementPage.expectVehicleNotFoundError();
    },
  );

  test(
    "UDP-T3967 - Business Rules Not Met Return Error",
    { tag: ["@do", "@regression", "@UDP-T3967"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { assetDetailsPage, settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page);
      const vin =
        settlementData.loanLookup.validVinDifferentDealer?.trim() || "KMHKM81BUPU2257CK";
      await settlementPage.searchLoanAndExpectBusinessRuleErrorWithVinThenRego(
        vin,
        arrearsRegoCandidates(),
        businessRuleExpectedMessagePattern(),
        async () => {
          await settlementPage.waitForSettlementTriggerEnabled(90_000);
          await assetDetailsPage.openSettlementDialog();
        },
      );
    },
  );

  test(
    "UDP-T3968 - Back Button from Error Screen Allows Re-Entry",
    { tag: ["@do", "@regression", "@UDP-T3968"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page, "csab");

      await test.step("Enter Rego/VIN and advance to privacy waiver", async () => {
        const { vin, regoFallback } = differentDealerVinAndRegoFallback();
        await settlementPage.searchDifferentDealerLoanAndAdvanceToPrivacyWaiver(vin, regoFallback);
      });

      await test.step("Accept privacy waiver and proceed to settlement error (MAF-5579/5580)", async () => {
        await settlementPage.setPrivacyWaiverConsent(true);
        await settlementPage.clickNext();
        await settlementPage.expectSettlementErrorScreenWithBack();
      });

      await test.step("Back returns to loan search with editable Rego/VIN", async () => {
        await settlementPage.clickBack();
        await settlementPage.expectLoanSearchReEntryAllowed(
          settlementData.fieldSamples.validRegoMax6Alphanumeric,
        );
      });
    },
  );

  test(
    "UDP-T3969 - Cancel Button Redirects to Asset Details Screen",
    { tag: ["@do", "@regression", "@UDP-T3969"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const { settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(page, "csab");
      await settlementPage.expectSettlementSearchScreenVisible();
      await settlementPage.clickCancel();
      await settlementPage.expectOnAssetDetailsScreen();
    },
  );

  test(
    "UDP-T3970 - Settlement Quote Display Customer Details Populated",
    { tag: ["@do", "@regression", "@UDP-T3970"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const settlementPage = await openDifferentDealerSettlementDisplayScreen(page);
      await settlementPage.expectCustomerDetailsPopulated();
    },
  );

  test(
    "UDP-T3971 - Settlement Quote Display Asset Details Populated",
    { tag: ["@do", "@regression", "@UDP-T3971"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const settlementPage = await openDifferentDealerSettlementDisplayScreen(page);
      await settlementPage.expectAssetDetailsPopulated();
    },
  );

  test(
    "UDP-T3972 - Settlement Amount (Standard) Custom Flows Displayed with Amount > 0",
    { tag: ["@do", "@regression", "@UDP-T3972"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const settlementPage = await openDifferentDealerSettlementDisplayScreen(page);
      await settlementPage.expectStandardSettlementSectionWithPositiveAmounts();
    },
  );

  test(
    "UDP-T3973 - Settlement Amount (Refinancing) Custom Flows Displayed with Amount > 0",
    { tag: ["@do", "@regression", "@UDP-T3973", "@sit"] },
    async ({ page }) => {
      test.skip(
        getCurrentEnv() !== "sit",
        "UDP-T3973 runs on SIT only (FIS AF refinance custom flow amounts).",
      );
      test.setTimeout(600_000);
      const settlementPage = await openDifferentDealerSettlementDisplayScreen(page);
      await settlementPage.expectRefinancingSettlementSectionWithPositiveAmounts();
    },
  );

  test(
    "UDP-T3974 - Less Section (CCI Refund) Hidden When Amount is Zero",
    { tag: ["@do", "@regression", "@UDP-T3974"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const rego = requireLoanId(
        settlementData.loanLookup.cciRefundZeroLoanRegoOrVin,
        "loanLookup.cciRefundZeroLoanRegoOrVin",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "tl");
      await completeLoanSearchToDisplay(settlementPage, rego);
      await settlementPage.expectLessCciRefundHidden();
    },
  );

  test(
    "UDP-T3975 - AFV Settlement Quote Display Fields and Warning Message",
    { tag: ["@do", "@regression", "@UDP-T3975"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const loanId = requireLoanId(
        settlementData.loanLookup.afvActivatedLoanRegoOrVin,
        "loanLookup.afvActivatedLoanRegoOrVin",
      );
      const { settlementPage } = await openSettlementPopupFromQuote(page, "afv");
      await completeLoanSearchToDisplay(settlementPage, loanId);
      await settlementPage.expectAfVSettlementDisplay();
    },
  );

  test(
    "UDP-T3976 - AFV Settlement Return Error",
    { tag: ["@do", "@regression", "@UDP-T3976"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      test.skip(
        true,
        "Requires AFV loan that triggers FIS AF settlement error — add afvErrorLoanRegoOrVin to settlementTestData.json when known.",
      );
    },
  );

  test(
    "UDP-T3977 - Add Settlement Amount to Quote Single Settlement",
    { tag: ["@do", "@regression", "@UDP-T3977", "@qat"] },
    async ({ page }) => {
      test.skip(
        getCurrentEnv() !== "qat",
        "UDP-T3977 runs on Test Portal (QAT) only — add settlement to saved standard quote.",
      );
      test.setTimeout(600_000);
      const { assetDetailsPage, settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(
        page,
        "csab",
      );

      await test.step("VIN then Rego loan search to Settlement Quote display", async () => {
        await completeUdpT3977LoanSearchToSettlementDisplay(settlementPage);
        await settlementPage.expectSettlementDisplayScreen();
      });

      let settlementTotal = 0;

      await test.step("Select settlement amount and add to quote", async () => {
        const standardSection = page.getByText(/Settlement Amount\s*\(Standard\)/i).first();
        if (await standardSection.isVisible({ timeout: 10_000 }).catch(() => false)) {
          await settlementPage.selectSettlementAmountOption("standard");
          settlementTotal = await settlementPage.readStandardSettlementTotalAmount();
        } else {
          await settlementPage.selectSettlementAmountOption("refinance");
        }
        await settlementPage.addSelectedSettlementToQuote();
      });

      await test.step("Verify settlement amount on Asset Details", async () => {
        await settlementPage.expectOnAssetDetailsScreen();
        await assetDetailsPage.waitForQuoteLoadersToFinish(120_000);
        await expect
          .poll(
            async () =>
              parseSettlementAmountField(await assetDetailsPage.settlementAmountInput.inputValue()),
            { timeout: 120_000 },
          )
          .toBeGreaterThan(0);
        if (settlementTotal > 0) {
          await expect
            .poll(
              async () =>
                parseSettlementAmountField(await assetDetailsPage.settlementAmountInput.inputValue()),
              { timeout: 60_000 },
            )
            .toBeCloseTo(settlementTotal, 1);
        }
      });
    },
  );

  test(
    "UDP-T3978 - Multiple Settlements Settlement Amount Summed",
    { tag: ["@do", "@regression", "@UDP-T3978", "@qat", "@sit"] },
    async ({ page }) => {
      test.skip(
        getCurrentEnv() !== "qat" && getCurrentEnv() !== "sit",
        "UDP-T3978 runs on QAT (business VIN/rego) or SIT (BAGGED + BY7737).",
      );
      test.setTimeout(900_000);
      const { assetDetailsPage, settlementPage } = await openQuoteForMultipleSettlements(page);

      let firstSettlementTotal = 0;
      let firstLoanKey: "bagged" | "rego" | "vin" | "sit" = "sit";

      await test.step("Add first settlement to quote", async () => {
        firstLoanKey = await completeMultipleSettlementFirstLoanToDisplay(
          settlementPage,
          page,
          assetDetailsPage,
        );
        firstSettlementTotal = await addStandardSettlementToCurrentQuote(
          page,
          settlementPage,
          assetDetailsPage,
        );
        await expect
          .poll(
            async () => parseSettlementAmountField(await assetDetailsPage.settlementAmountInput.inputValue()),
            { timeout: 120_000 },
          )
          .toBeCloseTo(firstSettlementTotal, 1);
      });

      let secondSettlementTotal = 0;

      await test.step("Add second settlement (different Rego/VIN, same borrower) to quote", async () => {
        await settlementPage.waitForSettlementTriggerEnabled(90_000);
        await assetDetailsPage.openSettlementDialog();
        await settlementPage.expectSettlementSearchScreenVisible();
        await settlementPage.expectSettlementDateIsPopulated();
        await settlementPage.ensureSettlementDateReadyForNext();
        await completeMultipleSettlementSecondLoanToDisplay(
          settlementPage,
          page,
          assetDetailsPage,
          firstLoanKey,
        );
        secondSettlementTotal = await addStandardSettlementToCurrentQuote(
          page,
          settlementPage,
          assetDetailsPage,
        );
      });

      await test.step("Verify Settlement Amount on Asset Details is summed", async () => {
        const expectedTotal = firstSettlementTotal + secondSettlementTotal;
        await assetDetailsPage.clickStandardQuoteStepTab(/Asset\s*Details/i);
        await assetDetailsPage.waitForAssetDetailsStepReady();
        await expect
          .poll(
            async () => parseSettlementAmountField(await assetDetailsPage.settlementAmountInput.inputValue()),
            { timeout: 120_000 },
          )
          .toBeCloseTo(expectedTotal, 1);
      });
    },
  );

  test(
    "UDP-T3979 - Multiple Settlements Not Allowed from Dealer Listing",
    { tag: ["@do", "@regression", "@UDP-T3979", "@qat"] },
    async ({ page }) => {
      test.skip(
        getCurrentEnv() !== "qat",
        "UDP-T3979 runs on Test Portal (QAT) only — multiple settlements from dealer listing.",
      );
      test.setTimeout(900_000);
      const loanRef = udpT3979DealerListingLoanRef();

      await test.step("Open Dealer Listing and add first settlement to a new quote", async () => {
        const settlementPage = await openDealerListingSettlementSearchUdpT3979(page);
        await completeUdpT3979LoanSearchToDisplay(settlementPage);
        await settlementPage.selectSettlementAmountOption("standard");
        await settlementPage.addSelectedSettlementToQuote();
        await settlementPage.expectNewSettlementQuoteConfirmation();
        await settlementPage.confirmNewQuoteYes();
        await settlementPage.expectNewStandardQuoteOpenedAfterConfirmationYes();
      });

      await test.step("Attempt second settlement from Dealer Listing for the same loan", async () => {
        const settlementPage = new DOSettlementPage(page);
        await expectSecondDealerListingSettlementBlocked(page, loanRef, settlementPage);
      });
    },
  );

  test(
    "UDP-T3980 - Create New Quote Confirmation from Dealer Listing Yes",
    { tag: ["@do", "@regression", "@UDP-T3980"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const settlementPage = await openSettlementDisplayFromDealerListing(
        page,
        dealerListingSettlementLoanRef(),
      );

      await test.step("Dealer views New Settlement Quote Confirmation and clicks Yes", async () => {
        await settlementPage.selectSettlementAmountOption("standard");
        await settlementPage.addSelectedSettlementToQuote();
        await settlementPage.expectNewSettlementQuoteConfirmation();
        await settlementPage.confirmNewQuoteYes();
      });

      await test.step("New Standard Quote opens with settlement applied", async () => {
        await settlementPage.expectNewStandardQuoteOpenedAfterConfirmationYes();
      });
    },
  );

  test(
    "UDP-T3981 - Create New Quote Confirmation from Dealer Listing No",
    { tag: ["@do", "@regression", "@UDP-T3981"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const settlementPage = await openSettlementDisplayFromDealerListing(
        page,
        dealerListingSettlementLoanRef(),
      );
      await settlementPage.selectSettlementAmountOption("standard");
      await settlementPage.addSelectedSettlementToQuote();
      await settlementPage.expectNewSettlementQuoteConfirmation();
      await settlementPage.confirmNewQuoteNo();
      await settlementPage.expectNewSettlementQuoteConfirmationDismissed();
    },
  );

  test(
    "UDP-T3982 - Consumer Settlement Correct Custom Flows Displayed",
    { tag: ["@do", "@regression", "@UDP-T3982", "@sit"] },
    async ({ page }) => {
      test.skip(
        getCurrentEnv() !== "sit",
        "UDP-T3982 runs on SIT only (consumer CSA quote + VIN settlement custom flows).",
      );
      test.setTimeout(600_000);
      const settlementPage = await openConsumerSettlementDisplayScreen(page);
      await settlementPage.expectConsumerSettlementCustomFlowsDisplayed();
    },
  );

  test(
    "UDP-T3983 - Business Settlement Correct Custom Flows Displayed",
    { tag: ["@do", "@regression", "@UDP-T3983", "@qat"] },
    async ({ page }) => {
      test.skip(
        getCurrentEnv() !== "qat",
        "UDP-T3983 runs on Test Portal (QAT) only — Business CSA-B settlement custom flows.",
      );
      test.setTimeout(600_000);

      const settlementPage = await test.step(
        "CSA-B quote saved; Settlement popup; VIN then Rego to display",
        async () => openBusinessSettlementDisplayScreen(page),
      );

      await test.step("Verify Settlement Quote Display opens successfully", async () => {
        await settlementPage.expectSettlementDisplayScreen();
      });

      await test.step("Verify Customer Type is Business and details populated", async () => {
        await settlementPage.expectCustomerDetailsPopulated();
        await settlementPage.expectBusinessSettlementCustomFlowsDisplayed();
      });

      await test.step("Verify Asset Details are populated on settlement display", async () => {
        await settlementPage.expectAssetDetailsPopulated();
      });

      await test.step(
        "Verify Business FIS AF custom flows, totals, and no Consumer-only flows",
        async () => {
          await settlementPage.expectBusinessSettlementCustomFlowsDisplayed();
        },
      );
    },
  );

  test(
    "UDP-T3984 - Loan in Arrears/Overdue Settlement Cannot Proceed",
    { tag: ["@do", "@regression", "@UDP-T3984", "@sit"] },
    async ({ page }) => {
      test.skip(
        getCurrentEnv() !== "sit",
        "UDP-T3984 runs on SIT only (arrears/overdue loan BY7737 / NX8838).",
      );
      test.setTimeout(600_000);
      const { assetDetailsPage, settlementPage } = await accessSettlementScreenAfterAssetDetailsSaved(
        page,
        "csab",
      );

      await test.step("Dealer enters Rego/VIN on Settlement pop-up", async () => {
        await settlementPage.searchArrearsLoanAndExpectBusinessRuleError(
          arrearsRegoCandidates(),
          businessRuleExpectedMessagePattern(),
          async () => {
            await settlementPage.waitForSettlementTriggerEnabled(90_000);
            await assetDetailsPage.openSettlementDialog();
          },
        );
      });
    },
  );

  test(
    "UDP-T3985 - Outstanding Commission Clawback/Subsidy NOT Displayed to Dealer",
    { tag: ["@do", "@regression", "@UDP-T3985", "@sit"] },
    async ({ page }) => {
      test.skip(
        getCurrentEnv() !== "sit",
        "UDP-T3985 runs on SIT only (FIS AF custom flows including Commission Clawback/Subsidy).",
      );
      test.setTimeout(600_000);
      const settlementPage = await openDifferentDealerSettlementDisplayScreen(page);
      await settlementPage.expectCommissionClawbackNotDisplayed();
    },
  );

  test(
    "UDP-T3986 - Refinance vs Standard Correct Section Tagging",
    { tag: ["@do", "@regression", "@UDP-T3986", "@sit"] },
    async ({ page }) => {
      test.skip(
        getCurrentEnv() !== "sit",
        "UDP-T3986 runs on SIT only (refinance settlement quote with Standard and Refinancing sections).",
      );
      test.setTimeout(600_000);
      const settlementPage = await openDifferentDealerSettlementDisplayScreen(page);
      await settlementPage.expectStandardSettlementSectionWithPositiveAmounts();
      await settlementPage.expectRefinancingSettlementSectionWithPositiveAmounts();
    },
  );

  test(
    "UDP-T3987 - Settlement from Quote Screen Loan Closure Handled Separately",
    { tag: ["@do", "@regression", "@UDP-T3987"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const rego = requireLoanId(
        settlementData.loanLookup.validRegoSameDealer,
        "loanLookup.validRegoSameDealer",
      );
      const { assetDetailsPage, settlementPage } = await openStandardQuoteForProduct(page, "tl");
      await prepareQuoteForSettlementIfNeeded(page, "tl", assetDetailsPage);

      await test.step("Create and complete Standard Quote", async () => {
        await completeTlQuoteCustomerDetailsThroughReference(assetDetailsPage);
      });

      await test.step("Save quote and round-trip to enable Calculate Settlement", async () => {
        await saveQuoteAndRoundTripToEnableSettlement(assetDetailsPage, settlementPage);
      });

      await test.step("Complete settlement flow and submit from quote screen", async () => {
        await settlementPage.openSettlementFromQuote();
        await completeLoanSearchToDisplay(settlementPage, rego);
        await settlementPage.selectSettlementAmountOption("standard");
        await settlementPage.addSelectedSettlementToQuote();
      });

      await test.step("Verify settlement created successfully", async () => {
        await expect
          .poll(
            async () =>
              (await assetDetailsPage.settlementAmountInput.inputValue()).replace(/[$,]/g, ""),
            { timeout: 60_000 },
          )
          .toMatch(/\d/);
      });

      const quoteId = await assetDetailsPage.readStandardQuoteIdFromHeader();

      await test.step("Navigate away from quote", async () => {
        await openDashboard(page);
        await expect(standardQuoteRoot(page)).toBeHidden({ timeout: 60_000 }).catch(() => {});
      });

      await test.step("Verify quote remains accessible and loan closure is handled separately", async () => {
        const dashboardPage = new DODashboardPage(page);
        await dashboardPage.openOpenQuoteFromListing(quoteId);
        await assetDetailsPage.expectStandardQuoteLoaded();
        await assetDetailsPage.expectQuoteNumberVisible(quoteId);
        await expect(
          page.getByText(/loan\s+(closed|closure|terminated)|closure\s+complete/i).first(),
        ).toBeHidden({ timeout: 10_000 });
        await expect
          .poll(
            async () =>
              (await assetDetailsPage.settlementAmountInput.inputValue()).replace(/[^0-9.]/g, ""),
            { timeout: 45_000 },
          )
          .toMatch(/\d/);
      });
    },
  );

  test(
    "UDP-T3988 - Cancel from Privacy Waiver Screen Returns to Asset Details",
    { tag: ["@do", "@regression", "@UDP-T3988"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const settlementPage = await openDifferentDealerSettlementWaiverScreen(page);
      await settlementPage.expectPrivacyWaiverScreen();
      await settlementPage.clickCancel();
      await settlementPage.expectOnAssetDetailsScreen();
    },
  );

  test(
    "UDP-T3989 - Settlement Customer Details Screen Display Only",
    { tag: ["@do", "@regression", "@UDP-T3989"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const settlementPage =
        getCurrentEnv() === "sit"
          ? await openDifferentDealerSettlementDisplayScreen(page)
          : await (async () => {
              const rego = requireLoanId(
                settlementData.loanLookup.validRegoSameDealer,
                "loanLookup.validRegoSameDealer",
              );
              const { settlementPage: fromQuote } =
                await accessSettlementScreenAfterAssetDetailsSaved(page);
              await completeLoanSearchToDisplay(fromQuote, rego);
              return fromQuote;
            })();

      await test.step("Dealer views Customer Details", async () => {
        await settlementPage.expectSettlementDisplayScreen();
        await settlementPage.expectCustomerDetailsPopulated();
      });

      await test.step("Dealer attempts to edit any field", async () => {
        await settlementPage.expectCustomerDetailsReadOnly();
      });
    },
  );
});
