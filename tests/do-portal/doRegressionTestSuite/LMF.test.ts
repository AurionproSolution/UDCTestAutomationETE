/**
 * DO Portal — LMF regression (UDP-T3932–UDP-T3940).
 * Scenario source: LMF Test Cases.xlsx (Zephyr / Regression 25.0 / LMF).
 * Auth: shared DO `storageState` via `@fixtures/doPortalTest`.
 */

import { expect, test } from "@fixtures/doPortalTest";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";
import {
  authorisedDealer,
  calculateQuickQuoteStandardQuote,
  expectLoanMaintenanceFeeZeroOrAbsent,
  loadLmfConfig,
  openQuickQuoteStandardQuoteForDealer,
  openStandardQuoteForDealer,
  prepareCalculableLmfQuote,
  selectProductProgram,
  standardQuoteRoot,
  unauthorisedDealer,
} from "./lmf.helpers";

test.describe("LMF @do @regression", () => {
  test(
    "UDP-T3932 - LMF Checkbox visible for authorised dealer",
    { tag: ["@do", "@regression", "@UDP-T3932"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const cfg = loadLmfConfig();
      const { asset } = await openStandardQuoteForDealer(page, authorisedDealer());
      await selectProductProgram(asset, cfg.lmfConfigured.product, cfg.lmfConfigured.program);
      await asset.expectWaiveLmfCheckboxVisibleAndEnabled();
    },
  );

  test(
    "UDP-T3933 - LMF Checkbox NOT visible / disabled for unauthorised dealer",
    { tag: ["@do", "@regression", "@UDP-T3933"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const cfg = loadLmfConfig();
      const { asset } = await openStandardQuoteForDealer(page, unauthorisedDealer());
      await selectProductProgram(asset, cfg.lmfConfigured.product, cfg.lmfConfigured.program);
      await asset.expectWaiveLmfCheckboxHiddenOrDisabled();
    },
  );

  test(
    "UDP-T3934 - Default state of Waive LMF checkbox is unticked",
    { tag: ["@do", "@regression", "@UDP-T3934"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const cfg = loadLmfConfig();
      const { asset } = await openStandardQuoteForDealer(page, authorisedDealer());
      await selectProductProgram(asset, cfg.lmfConfigured.product, cfg.lmfConfigured.program);
      await asset.expectWaiveLmfCheckboxUnchecked();
    },
  );

  test(
    "UDP-T3935 - LMF field defaults to preconfigured value from FIS AF",
    { tag: ["@do", "@regression", "@UDP-T3935"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const cfg = loadLmfConfig();
      const { asset } = await openStandardQuoteForDealer(page, authorisedDealer());
      await prepareCalculableLmfQuote(page, asset, {
        product: cfg.lmfConfigured.product,
        program: cfg.lmfConfigured.program,
        origRef: "SQ-LMF-T3935",
      });
      await asset.expectLoanMaintenanceFeeGreaterThanZero();
      await asset.expectLoanMaintenanceFeeDisplayOnly();
    },
  );

  test(
    "UDP-T3936 - LMF field shows 0.00 when no preconfigured value exists",
    { tag: ["@do", "@regression", "@UDP-T3936"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const cfg = loadLmfConfig();
      const zeroProduct = process.env.LMF_ZERO_PRODUCT?.trim() || cfg.lmfZeroConfigured.product;
      const zeroProgram = process.env.LMF_ZERO_PROGRAM?.trim() || cfg.lmfZeroConfigured.program;
      const { asset } = await openStandardQuoteForDealer(page, authorisedDealer(), {
        productDialog: "financeLease",
      });
      await prepareCalculableLmfQuote(page, asset, {
        product: zeroProduct,
        program: zeroProgram,
        origRef: "SQ-LMF-T3936",
      });
      await expectLoanMaintenanceFeeZeroOrAbsent(asset);
    },
  );

  test(
    "UDP-T3937 - Ticking Waive LMF resets LMF to 0.00 and adjusts instalment",
    { tag: ["@do", "@regression", "@UDP-T3937"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const cfg = loadLmfConfig();
      const { asset } = await openStandardQuoteForDealer(page, authorisedDealer());
      await prepareCalculableLmfQuote(page, asset, {
        product: cfg.lmfConfigured.product,
        program: cfg.lmfConfigured.program,
        origRef: "SQ-LMF-T3937",
      });

      const lmfBefore = await asset.readLoanMaintenanceFee();
      const paymentBefore = await asset.readPaymentAmount();
      expect(lmfBefore).toBeGreaterThan(0);

      await asset.setWaiveLmfChecked(true);
      await asset.clickCalculateButton();
      await asset.waitForLoadingComplete(120_000);

      await asset.expectLoanMaintenanceFeeZero();
      const paymentAfter = await asset.readPaymentAmount();
      expect(paymentAfter).toBeLessThanOrEqual(paymentBefore);
    },
  );

  test(
    "UDP-T3938 - LMF checkbox access via Quick Quote to Standard Quote navigation",
    { tag: ["@do", "@regression", "@UDP-T3938"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const cfg = loadLmfConfig();
      const sqProgram =
        process.env.LMF_QUICK_QUOTE_SQ_PROGRAM?.trim() ||
        cfg.quickQuote.standardQuoteProgram ||
        cfg.lmfConfigured.program;

      const { asset } = await openQuickQuoteStandardQuoteForDealer(page, authorisedDealer());

      // Standard Quote — verify QQ carry-over, then complete steps through Calculate.
      await asset.waitForAssetDetailsStepReady();
      await asset.expectProductProgramCarriedFromQuickQuote(cfg.quickQuote.product, sqProgram, {
        requireLockedDropdowns: false,
      });
      await asset.expectFinanceCarriedFromQuickQuote({
        cashPrice: /20[, ]?000|20000/i,
        term: /36/,
        frequencyText: /Monthly/i,
        interestRate: /^4(\.0+)?$/,
        depositPercent: /10/,
      });
      await calculateQuickQuoteStandardQuote(asset, "SQ-LMF-T3938");

      // Zephyr: Waiving LMF checkbox in Less Deposit below Total Amount Borrowed.
      await asset.expectWaiveLmfInLessDepositBelowTotalBorrowed();
      await asset.expectWaiveLmfCheckboxVisibleAndEnabled();
    },
  );

  test(
    "UDP-T3939 - LMF checkbox access via Create Standard Quote on dashboard",
    { tag: ["@do", "@regression", "@UDP-T3939"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const cfg = loadLmfConfig();
      const { asset } = await openStandardQuoteForDealer(page, authorisedDealer());
      await selectProductProgram(asset, cfg.lmfConfigured.product, cfg.lmfConfigured.program);
      await asset.expectWaiveLmfInLessDepositBelowTotalBorrowed();
      await asset.expectWaiveLmfCheckboxVisibleAndEnabled();
    },
  );

  test(
    "UDP-T3940 - LMF interacts with Payment Schedule (MAF-4801)",
    { tag: ["@do", "@regression", "@UDP-T3940"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const cfg = loadLmfConfig();
      const { asset } = await openStandardQuoteForDealer(page, authorisedDealer());
      await prepareCalculableLmfQuote(page, asset, {
        product: cfg.lmfConfigured.product,
        program: cfg.lmfConfigured.program,
        origRef: "SQ-LMF-T3940",
      });

      const repayBefore = await asset.readTotalAmountToRepay();
      await asset.setWaiveLmfChecked(true);
      await asset.clickCalculateButton();
      await asset.waitForLoadingComplete(120_000);
      await asset.expectLoanMaintenanceFeeZero();

      const repayAfter = await asset.readTotalAmountToRepay();
      expect(repayAfter).toBeLessThanOrEqual(repayBefore);

      await asset.expectPaymentScheduleViewTogglesWorkAndTablePopulated();
      await asset.openEditPaymentScheduleDialog();
      await asset.expectPaymentScheduleExcludesLmfFeeRows();
    },
  );
});
