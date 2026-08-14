/**
 * RSS Regression — Apply Now form validation & UI (URP-T179, URP-T181, URP-T186–T197, URP-T210–T211)
 * Zephyr: /RSS Regression Suite/Apply Now
 * Source: RSS Apply Now Regression Test Cases.xlsx
 */

import fs from "fs";
import os from "os";
import path from "path";
import { expect, test } from "../../../../fixtures/rssPortalTest";
import {
  RSSApplyNowApplicationDocumentsPage,
  RSSApplyNowCustomerDetailsPage,
  RSSApplyNowDealershipAssetRepaymentPage,
  RSSApplyNowHowCanWeHelpIndividualPage,
  RSSDashboardPage,
} from "../../../../pages";
import {
  APPLY_NOW_ASSET_CAR_OR_VAN,
  APPLY_NOW_DEALERS_LOAD_TIMEOUT_MS,
  APPLY_NOW_DEALERSHIP_FALLBACK_SEARCH,
  APPLY_NOW_REPAYMENT,
} from "../../../../testData/rss-portal/applyNowData";
import {
  completeDealershipPurchaseFlow,
  completeRepaymentAndGoToCustomerDetails,
  openApplyNow,
} from "./apply-now-regression.helpers";

test.describe("RSS Portal — Apply Now form validation @rss @regression", () => {
  test(
    "URP-T179 - Apply Now - What would you like to do dropdown selection contract note",
    { tag: ["@rss", "@regression", "@URP-T179"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await howCanWeHelp.expectWhatWouldYouLikeToDoOptions();
    },
  );

  test(
    "URP-T181 - Apply Now - Address search fuzzy logic",
    { tag: ["@rss", "@regression", "@URP-T181"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
      await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
      await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
      await customerDetails.searchCurrentAddress("48 Hoo");
      await customerDetails.expectAddressSearchSuggestions();
    },
  );

  test(
    "URP-T186 - Apply Now - Check if both the Dealer list fields are populating data",
    { tag: ["@rss", "@regression", "@URP-T186"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await howCanWeHelp.selectPurchaseThroughDealership();
      await assetPage.waitForDealershipSection();
      await assetPage.waitForDealersLoaded(APPLY_NOW_DEALERS_LOAD_TIMEOUT_MS);
      await assetPage.expectDealershipDropdownFieldsVisible();
      const usedBeforeLabels = await assetPage.getDealerUsedBeforeOptionLabels();
      expect(usedBeforeLabels.length).toBeGreaterThan(0);
      await assetPage.expectAnotherDealershipSearchSuggestions(
        1,
        APPLY_NOW_DEALERSHIP_FALLBACK_SEARCH,
      );
    },
  );

  test(
    "URP-T187 - Apply Now - Check if Term and Frequency is populating",
    { tag: ["@rss", "@regression", "@URP-T187"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
      await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
      await assetPage.expectTermAndFrequencyOptionsPopulated();
    },
  );

  test(
    "URP-T188 - Apply Now - Installment amount changes when repayment calculator fields change",
    { tag: ["@rss", "@regression", "@URP-T188"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
      await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
      await assetPage.fillRepaymentCalculatorFields({
        ...APPLY_NOW_REPAYMENT,
        termMonths: "12",
      });
      await assetPage.clickRepaymentCalculate();
      await assetPage.expectRepaymentCalculationTableVisible();
      const firstInstallment = await assetPage.readInstallmentAmount();
      await assetPage.fillRepaymentCalculatorFields({
        ...APPLY_NOW_REPAYMENT,
        termMonths: "36",
      });
      await assetPage.clickRepaymentCalculate();
      await assetPage.expectRepaymentCalculationTableVisible();
      const secondInstallment = await assetPage.expectInstallmentAmountChanged(firstInstallment);
      expect(secondInstallment).not.toBe(firstInstallment);
    },
  );

  test(
    "URP-T189 - Apply Now - 1st screen Next button mandatory field validation",
    { tag: ["@rss", "@regression", "@URP-T189"] },
    async ({ page }) => {
      test.setTimeout(300_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await howCanWeHelp.clickApplyNowFooterNext();
      await howCanWeHelp.expectMandatoryFieldValidationMessage();
    },
  );

  test(
    "URP-T190 - Apply Now - 2nd screen Next button mandatory field validation (Individual)",
    { tag: ["@rss", "@regression", "@URP-T190"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
      await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
      await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
      await customerDetails.clickApplyNowFooterNext();
      await customerDetails.expectMandatoryFieldValidationMessage();
    },
  );

  test(
    "URP-T191 - Apply Now - Joint journey Next blocked when Borrower is not added",
    { tag: ["@rss", "@regression", "@URP-T191"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
      await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
      await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
      await customerDetails.selectApplicantType("joint");
      await customerDetails.fillMandatoryCustomerSections();
      await customerDetails.clickApplyNowFooterNext();
      await customerDetails.expectMandatoryFieldValidationMessage();
    },
  );

  test(
    "URP-T192 - Apply Now - Limited Company journey Next blocked when Guarantor is not added",
    { tag: ["@rss", "@regression", "@URP-T192"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickBusiness();
      await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
      await assetPage.fillCarOrLightCommercialAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
      await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
      await customerDetails.selectBusinessType("limited company");
      await customerDetails.fillMandatoryCustomerSections({ includeBusinessDetails: true });
      await customerDetails.clickApplyNowFooterNext();
      await customerDetails.expectMandatoryFieldValidationMessage();
    },
  );

  test(
    "URP-T193 - Apply Now - 2nd screen Previous button",
    { tag: ["@rss", "@regression", "@URP-T193"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
      await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
      await assetPage.fillRepaymentCalculatorFields(APPLY_NOW_REPAYMENT);
      await assetPage.clickRepaymentCalculate();
      await assetPage.clickApplyNowFooterNext();
      await customerDetails.waitForCustomerDetailsStep();
      await customerDetails.clickApplyNowFooterPrevious();
      await assetPage.expectDealershipSelected();
      await expect(assetPage.repaymentRoot).toBeVisible({ timeout: 30_000 });
    },
  );

  test(
    "URP-T194 - Apply Now - 3rd screen Previous button",
    { tag: ["@rss", "@regression", "@URP-T194"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);
      const documents = new RSSApplyNowApplicationDocumentsPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
      await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
      await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
      await customerDetails.selectApplicantType("single");
      await customerDetails.fillMandatoryCustomerSections();
      await customerDetails.completeIndividualFinancialPosition();
      await customerDetails.clickApplyNowFooterNext();
      await documents.waitForApplicationDocumentsStep();
      await documents.clickApplyNowFooterPrevious();
      await customerDetails.expectCustomerDetailsStepVisible();
    },
  );

  test(
    "URP-T195 - Apply Now - Switching between Borrower and Borrower",
    { tag: ["@rss", "@regression", "@URP-T195"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
      await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
      await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
      await customerDetails.selectApplicantType("joint");
      await customerDetails.fillMandatoryCustomerSections();
      await customerDetails.clickBorrowerFooterAction();
      await customerDetails.expectCoBorrowerSelectionScreen();
      await customerDetails.clickBorrowerTab();
      await customerDetails.expectCustomerDetailsStepVisible();
    },
  );

  test(
    "URP-T196 - Apply Now - Switching between Limited Company and Guarantor",
    { tag: ["@rss", "@regression", "@URP-T196"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickBusiness();
      await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
      await assetPage.fillCarOrLightCommercialAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
      await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
      await customerDetails.selectBusinessType("limited company");
      await customerDetails.fillMandatoryCustomerSections({ includeBusinessDetails: true });
      await customerDetails.clickGuarantorFooterAction();
      await customerDetails.expectGuarantorSelectionScreen();
      await customerDetails.clickGuarantorTab();
      await customerDetails.expectCustomerDetailsStepVisible();
    },
  );

  test(
    "URP-T197 - Apply Now - 3rd screen Submit blocked when acknowledgement is missing",
    { tag: ["@rss", "@regression", "@URP-T197"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);
      const documents = new RSSApplyNowApplicationDocumentsPage(page);

      await openApplyNow(dashboard, howCanWeHelp);
      await howCanWeHelp.clickIndividual();
      await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
      await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
      await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
      await customerDetails.selectApplicantType("single");
      await customerDetails.fillMandatoryCustomerSections();
      await customerDetails.completeIndividualFinancialPosition();
      await customerDetails.clickApplyNowFooterNext();
      await documents.waitForApplicationDocumentsStep();
      await documents.expectSubmitBlockedWithoutAcknowledgement();
    },
  );

  test(
    "URP-T210 - Apply Now - Check 20mb size limit for documents",
    { tag: ["@rss", "@regression", "@URP-T210"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);
      const documents = new RSSApplyNowApplicationDocumentsPage(page);

      const oversizedPath = path.join(os.tmpdir(), `rss-apply-now-21mb-${Date.now()}.pdf`);
      fs.writeFileSync(oversizedPath, Buffer.alloc(21 * 1024 * 1024, 0));

      try {
        await openApplyNow(dashboard, howCanWeHelp);
        await howCanWeHelp.clickIndividual();
        await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
        await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
        await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
        await customerDetails.selectApplicantType("single");
        await customerDetails.fillMandatoryCustomerSections();
        await customerDetails.completeIndividualFinancialPosition();
        await customerDetails.clickApplyNowFooterNext();
        await documents.waitForApplicationDocumentsStep();
        await documents.expectOversizedFileRejected(oversizedPath);
      } finally {
        fs.unlinkSync(oversizedPath);
      }
    },
  );

  test(
    "URP-T211 - Apply Now - Check invalid file type upload rejected",
    { tag: ["@rss", "@regression", "@URP-T211"] },
    async ({ page }) => {
      test.setTimeout(600_000);
      const dashboard = new RSSDashboardPage(page);
      const howCanWeHelp = new RSSApplyNowHowCanWeHelpIndividualPage(page);
      const assetPage = new RSSApplyNowDealershipAssetRepaymentPage(page);
      const customerDetails = new RSSApplyNowCustomerDetailsPage(page);
      const documents = new RSSApplyNowApplicationDocumentsPage(page);

      const invalidPath = path.join(os.tmpdir(), `rss-apply-now-invalid-${Date.now()}.exe`);
      fs.writeFileSync(invalidPath, "invalid");

      try {
        await openApplyNow(dashboard, howCanWeHelp);
        await howCanWeHelp.clickIndividual();
        await completeDealershipPurchaseFlow(howCanWeHelp, assetPage);
        await assetPage.fillCarOrVanAssetRow(APPLY_NOW_ASSET_CAR_OR_VAN);
        await completeRepaymentAndGoToCustomerDetails(assetPage, customerDetails);
        await customerDetails.selectApplicantType("single");
        await customerDetails.fillMandatoryCustomerSections();
        await customerDetails.completeIndividualFinancialPosition();
        await customerDetails.clickApplyNowFooterNext();
        await documents.waitForApplicationDocumentsStep();
        await documents.expectInvalidFileTypeRejected(invalidPath);
      } finally {
        fs.unlinkSync(invalidPath);
      }
    },
  );
});
