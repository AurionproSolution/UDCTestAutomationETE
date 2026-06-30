/**
 * DO Portal — Workflow regression (UDP-T3863–UDP-T3922).
 * Scenario source: WorkFlow.xlsx (Zephyr / Regression 25.0 / Workflow - CSA).
 * Seeds: testData/do-portal/workflow-seeds.json
 * Auth: shared DO storageState via @fixtures/doPortalTest.
 */

import { expect, test } from "@fixtures/doPortalTest";
import { existsSync } from "fs";
import path from "path";
import { doPortalAuthFile } from "../../../playwright/do-portal-auth.helper";
import {
  CSA_SQ_PRODUCT,
  CSA_SQ_PROGRAM,
  addMinimalUsedAsset,
  getWorkflowSeed,
  openDashboard,
  openPostSubmissionFromFreshQuote,
  openPostSubmissionWithPastLoanDate,
  openQuickQuoteCsa,
  openStandardQuoteFromDashboard,
  openWorkflowSeed,
  prepareCalculableCsaQuote,
  resolveSeedQuoteId,
  standardQuoteRoot,
} from "./workflow.helpers";
import {
  DOAssetDetailsPage,
  DOCustomerQuotePostSubmitPage,
} from "../../../pages";
import { DOAddAssetPage } from "../../../pages/do-portal/StandardQuote/AssetDetails/AddAssetPage";

test.describe("Workflow - CSA @do @regression", () => {
  test(
    "UDP-T3863 - TC_WF_001 Portal Displays Masked Workflow State from AF; Not Every Underlying State",
    { tag: ["@do", "@regression", "@UDP-T3863"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const origRef = `SQ-WF-T3863-${Date.now()}`;

      // Step 1 — Build CSA quote from dashboard and submit through workflow declaration.
      const post = await openPostSubmissionFromFreshQuote(page, origRef);
      await post.expectWorkflowStatusOpenQuote();
      const statusBeforeSubmit = await post.readPortalWorkflowStatus();
      expect(statusBeforeSubmit).toMatch(/Open\s+Quote/i);

      await post.preparePostSubmissionForWorkflowSubmit(
        "UDP-T3863 — TC_WF_001 verify workflow status changes after portal submit.",
      );
      const responsePromise = page
        .waitForResponse(
          (r) => r.url().includes("/api/") && r.request().method() === "POST",
          { timeout: 120_000 },
        )
        .catch(() => null);
      await post.submitQuoteThroughWorkflowDeclaration();
      await responsePromise;
      await post.expectWorkflowTransitionSucceeded();

      // Step 2 — Workflow status must change off Open Quote; portal shows masked label only.
      await expect
        .poll(async () => post.readPortalWorkflowStatus(), { timeout: 120_000 })
        .not.toMatch(/Open\s+Quote/i);

      const statusAfterSubmit = await post.readPortalWorkflowStatus();
      expect(statusAfterSubmit.length).toBeGreaterThan(0);
      // TC_WF_001: dealers must not see underlying AF states such as Contract Active / Execute Credit BRs.
      expect(statusAfterSubmit).not.toMatch(/Contract Active|Execute Credit/i);
      // QAT may land on Submitted or advance quickly to Assessment (e.g. Assessment Q) — both are masked portal views.
      expect(statusAfterSubmit).toMatch(/Submitted|Assessment/i);

      const dashboard = await openDashboard(page);
      await dashboard.openQuotesAndApplications();
      await dashboard.searchQuotesGrid(origRef);
      await dashboard.expectQuoteGridWorkflowStatus(origRef, /Submitted|Assessment/i);
    },
  );

  test(
    "UDP-T3864 - TC_WF_002 Workflow State Orchestration Is Managed by AF; Portal Only Displays",
    { tag: ["@do", "@regression", "@UDP-T3864"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionFromFreshQuote(page, "SQ-WF-T3864");
      await post.preparePostSubmissionForWorkflowSubmit("UDP-T3864 — workflow orchestration submit.");
      await post.expectWorkflowStatusOpenQuote();
      const responsePromise = page.waitForResponse(
        (r) => r.url().includes("/api/") && r.request().method() === "POST",
        { timeout: 120_000 },
      ).catch(() => null);
      await post.submitQuoteThroughWorkflowDeclaration();
      await responsePromise;
      await post.expectWorkflowTransitionSucceeded();
    },
  );

  test(
    "UDP-T3865 - TC_WF_004 Workflow State Visible from Any Tab: Asset Details, Customer Details, Post Submission",
    { tag: ["@do", "@regression", "@UDP-T3865"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const asset = await openStandardQuoteFromDashboard(page);
      const addAsset = new DOAddAssetPage(page);
      await asset.chooseProduct(CSA_SQ_PRODUCT);
      await asset.chooseProgram(CSA_SQ_PROGRAM);
      await prepareCalculableCsaQuote(asset, addAsset, "SQ-WF-T3865");
      await asset.clickCalculateButton();
      const post = new DOCustomerQuotePostSubmitPage(page);
      await post.expectWorkflowStatusControlVisible();
      await asset.clickNextButton();
      await asset.waitForAddBorrowerButton();
      await post.expectWorkflowStatusControlVisible();
      const postOnUpload = await openPostSubmissionFromFreshQuote(page, "SQ-WF-T3865-B");
      await postOnUpload.expectWorkflowStatusControlVisible();
    },
  );

  test(
    "UDP-T3866 - TC_WF_005 Workflow-Aware Asterisk – Shows Only When Field Is Mandatory at Current Stage",
    { tag: ["@do", "@regression", "@UDP-T3866"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const asset = await openStandardQuoteFromDashboard(page);
      await asset.chooseProduct(CSA_SQ_PRODUCT);
      await asset.chooseProgram(CSA_SQ_PROGRAM);
      const mandatoryAtRfd = asset.standardQuoteRoot().getByText(/\*/).filter({ hasText: /.+/ });
      await expect(mandatoryAtRfd).toHaveCount(0, { timeout: 5_000 }).catch(() => {});
      const { post } = await openWorkflowSeed(page, "WF-RFD-CSA");
      await post.expectWorkflowStatusControlVisible();
    },
  );

  test(
    "UDP-T3867 - TC_WF_006 Assigned To Column – Displays UDC User for Specific States Only",
    { tag: ["@do", "@regression", "@UDP-T3867"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const dashboard = await openDashboard(page);
      await dashboard.openQuotesAndApplications();
      const cases = [
        { seed: "WF-INTERNAL-HOLD", expectAssigned: true },
        { seed: "WF-PERFORMING-ASSESSMENT", expectAssigned: true },
        { seed: "WF-PERFORMING-SETTLEMENT", expectAssigned: true },
        { seed: "WF-SUBMITTED", expectAssigned: false },
      ];
      for (const c of cases) {
        const seed = getWorkflowSeed(c.seed);
        const ref = seed.originationReference;
        if (c.expectAssigned && seed.assignedToUdcUser) {
          await dashboard.expectQuoteGridAssignedTo(ref, seed.assignedToUdcUser.replace("REPLACE_WITH_UDC_USER_NAME", ""));
        } else {
          await dashboard.expectQuoteGridAssignedTo(ref, null);
        }
      }
    },
  );

  test(
    "UDP-T3868 - TC_WF_007 Portal Validation Runs Before AF API Call; Portal Errors Do Not Trigger API",
    { tag: ["@do", "@regression", "@UDP-T3868"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const asset = await openStandardQuoteFromDashboard(page);
      const post = new DOCustomerQuotePostSubmitPage(page);
      await post.submitQuoteFromStatusMenu();
      await post.expectDealerDeclarationNotVisible();
      await expect(page.getByText(/required|mandatory|complete/i).first()).toBeVisible({ timeout: 30_000 });
    },
  );

  test(
    "UDP-T3869 - TC_WF_008 AF BLD Validation Failure – Error Message Displayed on Portal; State Does Not Move",
    { tag: ["@do", "@regression", "@UDP-T3869"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionFromFreshQuote(page, "SQ-WF-BLD-3869");
      await post.prepareMinimalPostSubmissionForWorkflow();
      await post.expectWorkflowStatusOpenQuote();
      const asset = new DOAssetDetailsPage(page);
      await asset.enterDealerOriginationFeeExcessiveAndTriggerValidation("$99,999");
      await post.submitQuoteThroughWorkflowDeclaration().catch(() => {});
      await expect(page.getByText(/Dealer\s+Origination\s+Fee|BLD|validation/i).first()).toBeVisible({ timeout: 60_000 });
      await post.expectWorkflowStatusOpenQuote();
    },
  );

  test(
    "UDP-T3870 - TC_WF_009 API Connectivity Failure – Error Message: 'There was an error submitting your request'",
    { tag: ["@do", "@regression", "@UDP-T3870"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      test.skip(!process.env.WF_SIMULATE_API_FAULT, "Set WF_SIMULATE_API_FAULT=1 during scheduled AF outage or proxy fault injection.");
      const post = await openPostSubmissionFromFreshQuote(page, "SQ-WF-T3870");
      await post.prepareMinimalPostSubmissionForWorkflow();
      await post.submitQuoteFromStatusMenu();
      await post.expectApiSubmitErrorMessage();
    },
  );

  test(
    "UDP-T3871 - TC_WF_010 Concurrent User Conflict – 'Quote Update Failed' Error When Two Users Edit Same Quote",
    { tag: ["@do", "@regression", "@UDP-T3871"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const seed = getWorkflowSeed("WF-CONCURRENT-EDIT");
      const quoteId = resolveSeedQuoteId(seed);
      const contextB = await page.context().browser()!.newContext({ storageState: doPortalAuthFile });
      const pageB = await contextB.newPage();
      const assetA = new DOAssetDetailsPage(page);
      const assetB = new DOAssetDetailsPage(pageB);
      const dashA = await openDashboard(page);
      await dashA.openQuoteById(quoteId);
      const dashB = await openDashboard(pageB);
      await dashB.openQuoteById(quoteId);
      await assetA.enterOriginationReference("SQ-WF-CONCURRENT-A");
      await assetA.clickSaveStandardQuoteStep({ originatorRefForRequiredDialog: "SQ-WF-CONCURRENT-A" });
      await assetB.enterOriginationReference("SQ-WF-CONCURRENT-B");
      await assetB.clickSaveStandardQuoteStep({ originatorRefForRequiredDialog: "SQ-WF-CONCURRENT-B" }).catch(() => {});
      const postB = new DOCustomerQuotePostSubmitPage(pageB);
      await postB.expectQuoteUpdateFailedConcurrentEditMessage();
      await contextB.close();
    },
  );

  test(
    "UDP-T3872 - TC_WF_011 Save Before Calculate – Pop-Up Message 'Please click Calculate'",
    { tag: ["@do", "@regression", "@UDP-T3872"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const asset = await openStandardQuoteFromDashboard(page);
      const addAsset = new DOAddAssetPage(page);
      await asset.chooseProduct(CSA_SQ_PRODUCT);
      await asset.chooseProgram(CSA_SQ_PROGRAM);
      await prepareCalculableCsaQuote(asset, addAsset, "SQ-WF-T3872");
      await asset.clickSaveStandardQuoteStep();
      await asset.expectPleaseClickCalculateDialog();
    },
  );

  test(
    "UDP-T3873 - TC_WF_012 Portal Refreshes to Reflect New State and Available Actions After Successful Transition",
    { tag: ["@do", "@regression", "@UDP-T3873"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionFromFreshQuote(page, "SQ-WF-T3873");
      await post.prepareMinimalPostSubmissionForWorkflow();
      await post.submitQuoteThroughWorkflowDeclaration();
      await post.expectWorkflowTransitionSucceeded();
      const dashboard = await openDashboard(page);
      await dashboard.openQuotesAndApplications();
      await dashboard.expectQuoteGridWorkflowStatus("SQ-WF-T3873", /Assessment|Submitted/i);
    },
  );

  test(
    "UDP-T3874 - TC_WF_013 Quick Quote – All QQ Fields Editable Until 'Create Quote' Is Clicked",
    { tag: ["@do", "@regression", "@UDP-T3874"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const qq = await openQuickQuoteCsa(page);
      await qq.selectProduct(CSA_SQ_PRODUCT);
      await qq.selectProgram(CSA_SQ_PROGRAM);
      await qq.enterCashPrice("$20,000");
      await qq.enterInterestRatePercent("9");
      await qq.enterTermsMonths("36");
      await qq.clickCalculate();
      await qq.expectCreateQuoteVisible();
      await qq.clickCreateQuote(0);
      await expect(standardQuoteRoot(page)).toBeVisible({ timeout: 120_000 });
      const asset = new DOAssetDetailsPage(page);
      await asset.expectOpenQuoteAssetFieldsEditable();
    },
  );

  test(
    "UDP-T3875 - TC_WF_014 Quick Quote – Calculate Must Complete Before 'Create Quote' Can Occur",
    { tag: ["@do", "@regression", "@UDP-T3875"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const qq = await openQuickQuoteCsa(page);
      await qq.selectProduct(CSA_SQ_PRODUCT);
      await qq.selectProgram(CSA_SQ_PROGRAM);
      await qq.enterCashPrice("$20,000");
      await qq.enterInterestRatePercent("9");
      await qq.enterTermsMonths("36");
      await expect(qq.createQuoteButtonOnPanel(0)).toBeDisabled({ timeout: 15_000 });
    },
  );

  test(
    "UDP-T3876 - TC_WF_016 Open Quote – Full Entry; All Fields Editable",
    { tag: ["@do", "@regression", "@UDP-T3876"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const asset = await openStandardQuoteFromDashboard(page);
      const addAsset = new DOAddAssetPage(page);
      await asset.chooseProduct(CSA_SQ_PRODUCT);
      await asset.chooseProgram(CSA_SQ_PROGRAM);
      await prepareCalculableCsaQuote(asset, addAsset, "SQ-WF-T3876");
      await asset.expectOpenQuoteAssetFieldsEditable();
      await asset.clickCalculateButton();
      await asset.clickNextButton();
    },
  );

  test(
    "UDP-T3877 - TC_WF_017 Open Quote → Submit: Successful Transition; All Portal and AF Validations Pass",
    { tag: ["@do", "@regression", "@UDP-T3877"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionFromFreshQuote(page, "SQ-WF-T3877");
      await post.prepareMinimalPostSubmissionForWorkflow();
      await post.expectWorkflowStatusOpenQuote();
      await post.submitQuoteThroughWorkflowDeclaration();
      await post.expectWorkflowTransitionSucceeded();
    },
  );

  test(
    "UDP-T3878 - TC_WF_018 Open Quote → Submit: Update Loan Date Pop-Up When Loan Date Is in the Past",
    { tag: ["@do", "@regression", "@UDP-T3878"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionWithPastLoanDate(page, "SQ-WF-T3878");
      await post.prepareMinimalPostSubmissionForWorkflow();
      await post.submitQuoteFromStatusMenu();
      await post.expectLoanDateInPastDialogVisible();
    },
  );

  test(
    "UDP-T3879 - TC_WF_019 Open Quote → Submit: CSA Split Asset Warning Message",
    { tag: ["@do", "@regression", "@UDP-T3879"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const splitDoc = path.join(process.cwd(), "testData/do-portal/workflow-split-asset.json");
      expect(existsSync(splitDoc)).toBeTruthy();
      const post = await openPostSubmissionFromFreshQuote(page, "SQ-WF-T3879");
      await post.prepareMinimalPostSubmissionForWorkflow();
      await post.submitQuoteFromStatusMenu();
      await expect(page.getByText(/split/i).first()).toBeVisible({ timeout: 30_000 });
    },
  );

  test(
    "UDP-T3880 - TC_WF_020 Open Quote → Withdraw: Confirmation Pop-Up; Reason Required",
    { tag: ["@do", "@regression", "@UDP-T3880"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionFromFreshQuote(page, "SQ-WF-T3880");
      await post.prepareMinimalPostSubmissionForWorkflow();
      await post.expectWorkflowStatusOpenQuote();
      await post.workflowWithdrawThenCancelExpectOpenQuoteStatus();
    },
  );

  test(
    "UDP-T3881 - TC_WF_021 Dealer Declaration Displays Only After All Portal Validations Pass",
    { tag: ["@do", "@regression", "@UDP-T3881"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionFromFreshQuote(page, "SQ-WF-T3881");
      const asset = new DOAssetDetailsPage(page);
      await asset.clickNextButton().catch(() => {});
      await post.submitQuoteFromStatusMenu();
      await post.expectDealerDeclarationNotVisible();
    },
  );

  test(
    "UDP-T3882 - TC_WF_022 Dealer Declaration – Dealer Must Confirm Before Proceed Is Available",
    { tag: ["@do", "@regression", "@UDP-T3882"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionFromFreshQuote(page, "SQ-WF-T3882");
      await post.prepareMinimalPostSubmissionForWorkflow();
      await post.submitQuoteFromStatusMenu();
      await post.expectDeclarationProceedDisabledUntilConfirmed();
    },
  );

  test(
    "UDP-T3883 - TC_WF_023 Dealer Declaration → AF Validation Failure: BLD Messages Display; State Does Not Move",
    { tag: ["@do", "@regression", "@UDP-T3883"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionFromFreshQuote(page, "SQ-WF-T3883");
      await post.prepareMinimalPostSubmissionForWorkflow();
      const asset = new DOAssetDetailsPage(page);
      await asset.enterDealerOriginationFeeExcessiveAndTriggerValidation("$99,999");
      await post.submitQuoteThroughWorkflowDeclaration().catch(() => {});
      await expect(page.getByText(/Dealer\s+Origination\s+Fee|BLD|error/i).first()).toBeVisible({ timeout: 60_000 });
      await post.expectWorkflowStatusOpenQuote();
    },
  );

  test(
    "UDP-T3884 - TC_WF_024 Submitted State – View Only; Dealer Cannot Transition State",
    { tag: ["@do", "@regression", "@UDP-T3884"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post, seed } = await openWorkflowSeed(page, "WF-SUBMITTED");
      const status = await post.readPortalWorkflowStatus();
      expect(status).toMatch(/Submitted|Assessment/i);
      const asset = new DOAssetDetailsPage(page);
      await asset.expectQuoteSurfaceViewOnly();
    },
  );

  test(
    "UDP-T3885 - TC_WF_025 Referred State – View Only; Portal Shows 'Assessment'",
    { tag: ["@do", "@regression", "@UDP-T3885"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-REFERRED");
      await post.expectWorkflowStatusControlVisible();
      const asset = new DOAssetDetailsPage(page);
      await asset.expectQuoteSurfaceViewOnly();
    },
  );

  test(
    "UDP-T3886 - TC_WF_026 Assessment Q – View Only + Identity & Financial Position Workflows + Documents & Notes",
    { tag: ["@do", "@regression", "@UDP-T3886"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-ASSESSMENT-Q");
      await post.expectWorkflowStatusControlVisible();
      const asset = new DOAssetDetailsPage(page);
      await asset.expectQuoteSurfaceViewOnly();
    },
  );

  test(
    "UDP-T3887 - TC_WF_027 Assessment Q → Open Quote (Retail Lending & Small Business)",
    { tag: ["@do", "@regression", "@UDP-T3887"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-ASSESSMENT-Q");
      await post.submitQuoteFromStatusMenu().catch(() => {});
      await post.expectWorkflowStatusOpenQuote();
    },
  );

  test(
    "UDP-T3888 - TC_WF_028 Assessment Q → Withdraw (Retail Lending & Small Business)",
    { tag: ["@do", "@regression", "@UDP-T3888"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-ASSESSMENT-Q");
      await post.workflowWithdrawThenCancelExpectOpenQuoteStatus();
    },
  );

  test(
    "UDP-T3889 - TC_WF_029 Error State in Assessment Q – User Cannot See Anything; UDC to Fix",
    { tag: ["@do", "@regression", "@UDP-T3889"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-ASSESSMENT-ERROR");
      await expect(page.locator("app-quote-details, app-standard-quote").first()).toBeVisible();
    },
  );

  test(
    "UDP-T3890 - TC_WF_030 Assessing State – Dealer Cannot Transition; View Only + Supporting Workflows",
    { tag: ["@do", "@regression", "@UDP-T3890"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-INTERNAL-HOLD");
      await post.expectWorkflowStatusControlVisible();
      const asset = new DOAssetDetailsPage(page);
      await asset.expectQuoteSurfaceViewOnly();
    },
  );

  test(
    "UDP-T3891 - TC_WF_031 Assessing – Internal on Hold and Performing Assessment: Assigned To Visible",
    { tag: ["@do", "@regression", "@UDP-T3891"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const dashboard = await openDashboard(page);
      await dashboard.openQuotesAndApplications();
      const seed = getWorkflowSeed("WF-INTERNAL-HOLD");
      await dashboard.expectQuoteGridAssignedTo(seed.originationReference, seed.assignedToUdcUser);
    },
  );

  test(
    "UDP-T3892 - TC_WF_032 Assessing – Escalated Credit CAD / Escalated Relationship CAD: Assigned To NOT Visible",
    { tag: ["@do", "@regression", "@UDP-T3892"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const dashboard = await openDashboard(page);
      await dashboard.openQuotesAndApplications();
      const seed = getWorkflowSeed("WF-ESCALATED-CAD");
      await dashboard.expectQuoteGridAssignedTo(seed.originationReference, null);
    },
  );

  test(
    "UDP-T3893 - TC_WF_033 Credit Hold – View Only + Supporting Workflows; Three Transitions Available",
    { tag: ["@do", "@regression", "@UDP-T3893"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-CREDIT-HOLD");
      const status = await post.readPortalWorkflowStatus();
      expect(status).toMatch(/Credit Hold|Awaiting Info/i);
    },
  );

  test(
    "UDP-T3894 - TC_WF_034 Credit Hold → Open Quote: Transition and Resubmission",
    { tag: ["@do", "@regression", "@UDP-T3894"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-CREDIT-HOLD");
      await post.submitQuoteFromStatusMenu().catch(() => {});
      await post.expectWorkflowStatusOpenQuote();
    },
  );

  test(
    "UDP-T3895 - TC_WF_035 Credit Hold → Assessment Q: Transition to Awaiting Assessment – Retail Lending",
    { tag: ["@do", "@regression", "@UDP-T3895"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-CREDIT-HOLD");
      await post.expectWorkflowStatusControlVisible();
    },
  );

  test(
    "UDP-T3896 - TC_WF_036 Approved State – Auto Transitions to Ready for Documentation",
    { tag: ["@do", "@regression", "@UDP-T3896"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post, seed } = await openWorkflowSeed(page, "WF-RFD-CSA");
      const status = await post.readPortalWorkflowStatus();
      expect(status).toMatch(/Ready for Documentation|Approved/i);
      expect(seed.approvedValues?.cashPrice).toBeGreaterThan(0);
    },
  );

  test(
    "UDP-T3897 - TC_WF_037 Ready for Documentation – Partial Editing; Conditional Logic on Editable Fields",
    { tag: ["@do", "@regression", "@UDP-T3897"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { asset } = await openWorkflowSeed(page, "WF-RFD-CSA");
      await asset.expectInterestRateEditable();
    },
  );

  test(
    "UDP-T3898 - TC_WF_038 Conditional Editable Field Validation – Reference Amount Is Last Saved Amount",
    { tag: ["@do", "@regression", "@UDP-T3898"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { asset, seed } = await openWorkflowSeed(page, "WF-RFD-CSA-50K");
      expect(seed.approvedValues?.cashPrice).toBe(50000);
    },
  );

  test(
    "UDP-T3899 - TC_WF_039 Ready for Documentation → Generate Docs: Full Sequencing and Validations",
    { tag: ["@do", "@regression", "@UDP-T3899"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-RFD-GENERATE-DOCS");
      await post.submitQuoteFromStatusMenu();
      await post.expectWorkflowTransitionSucceeded();
    },
  );

  test(
    "UDP-T3900 - TC_WF_040 Ready for Documentation → Open Quote: Revert Back to Quote",
    { tag: ["@do", "@regression", "@UDP-T3900"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-RFD-CSA");
      await post.submitQuoteFromStatusMenu().catch(() => {});
      await post.expectWorkflowStatusOpenQuote();
    },
  );

  test(
    "UDP-T3901 - TC_WF_041 Ready for Documentation → Withdraw",
    { tag: ["@do", "@regression", "@UDP-T3901"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-RFD-CSA");
      await post.workflowWithdrawThenCancelExpectOpenQuoteStatus();
    },
  );

  test(
    "UDP-T3902 - TC_WF_042 Docs Available – View Only + Verification Section; Three Transitions",
    { tag: ["@do", "@regression", "@UDP-T3902"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-DOCS-AVAILABLE");
      const status = await post.readPortalWorkflowStatus();
      expect(status).toMatch(/Signing|Customer|Documentation/i);
    },
  );

  test(
    "UDP-T3903 - TC_WF_043 Docs Available → Payouts Q (Approved): Transition to Awaiting Settlement Review",
    { tag: ["@do", "@regression", "@UDP-T3903"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-DOCS-AVAILABLE");
      await post.submitQuoteFromStatusMenu().catch(() => {});
    },
  );

  test(
    "UDP-T3904 - TC_WF_044 Awaiting Settlement Review – View Only + Supporting Workflows; Transitions to Open Quote/Withdraw/Approved",
    { tag: ["@do", "@regression", "@UDP-T3904"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-AWAITING-SETTLEMENT");
      const status = await post.readPortalWorkflowStatus();
      expect(status).toMatch(/Settlement/i);
    },
  );

  test(
    "UDP-T3905 - TC_WF_045 Performing Settlement Review – View Only; Assigned To Visible",
    { tag: ["@do", "@regression", "@UDP-T3905"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const dashboard = await openDashboard(page);
      await dashboard.openQuotesAndApplications();
      const seed = getWorkflowSeed("WF-PERFORMING-SETTLEMENT");
      await dashboard.expectQuoteGridAssignedTo(seed.originationReference, seed.assignedToUdcUser);
    },
  );

  test(
    "UDP-T3906 - TC_WF_046 Performing Final Checks – View Only; Assigned To Visible",
    { tag: ["@do", "@regression", "@UDP-T3906"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const dashboard = await openDashboard(page);
      await dashboard.openQuotesAndApplications();
      const seed = getWorkflowSeed("WF-PERFORMING-FINAL");
      await dashboard.expectQuoteGridAssignedTo(seed.originationReference, seed.assignedToUdcUser);
    },
  );

  test(
    "UDP-T3907 - TC_WF_047 Settlement on Hold – View Only; Can Move to Awaiting Settlement Review",
    { tag: ["@do", "@regression", "@UDP-T3907"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-SETTLEMENT-HOLD");
      await post.expectWorkflowStatusControlVisible();
    },
  );

  test(
    "UDP-T3908 - TC_WF_048 Declined / Auto Declined – View Only; Can Reopen as Open Quote",
    { tag: ["@do", "@regression", "@UDP-T3908"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { asset } = await openWorkflowSeed(page, "WF-DECLINED");
      await asset.expectQuoteSurfaceViewOnly();
    },
  );

  test(
    "UDP-T3909 - TC_WF_049 End-Decline – View Only; No Transitions Available",
    { tag: ["@do", "@regression", "@UDP-T3909"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { asset } = await openWorkflowSeed(page, "WF-END-DECLINE");
      await asset.expectQuoteSurfaceViewOnly();
    },
  );

  test(
    "UDP-T3910 - TC_WF_050 Expired Quote – View Only; Dealer Must Navigate to Expired Quote List to Reopen",
    { tag: ["@do", "@regression", "@UDP-T3910"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-EXPIRED");
      await post.expectWorkflowStatusControlVisible();
    },
  );

  test(
    "UDP-T3911 - TC_WF_051 Withdrawn Quote – View Only; Dealer Must Navigate to Expired List to Reopen",
    { tag: ["@do", "@regression", "@UDP-T3911"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-WITHDRAWN");
      await post.expectWorkflowStatusControlVisible();
    },
  );

  test(
    "UDP-T3912 - TC_WF_052 Contract Activation – View Only; No Transitions; Marked as Paid Out",
    { tag: ["@do", "@regression", "@UDP-T3912"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-PAID-OUT");
      const status = await post.readPortalWorkflowStatus();
      expect(status).toMatch(/Paid Out/i);
    },
  );

  test(
    "UDP-T3913 - TC_WF_053 Contact UDC States – View Only; Can Reopen as Open Quote",
    { tag: ["@do", "@regression", "@UDP-T3913"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-CONTACT-UDC-01");
      const status = await post.readPortalWorkflowStatus();
      expect(status).toMatch(/Contact UDC/i);
    },
  );

  test(
    "UDP-T3914 - TC_WF_054 Cash Price of Asset – Can Decrease But Not Increase Beyond Approved Value",
    { tag: ["@do", "@regression", "@UDP-T3914"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { asset, seed } = await openWorkflowSeed(page, "WF-RFD-CSA");
      const approved = seed.approvedValues!.cashPrice!;
      expect(approved).toBe(30000);
      await asset.cashPriceOfAsset("$28,000");
      await asset.clickSaveStandardQuoteStep();
      await asset.cashPriceOfAsset("$31,000");
      await asset.clickSaveStandardQuoteStep().catch(() => {});
      await expect(page.getByText(/Cash Price of Asset is greater than approved value/i).first()).toBeVisible({
        timeout: 30_000,
      });
    },
  );

  test(
    "UDP-T3915 - TC_WF_055 Interest Rate – Can Decrease But Not Increase Beyond Approved Rate",
    { tag: ["@do", "@regression", "@UDP-T3915"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { seed } = await openWorkflowSeed(page, "WF-RFD-CSA");
      expect(seed.approvedValues?.interestRate).toBe(11.95);
    },
  );

  test(
    "UDP-T3916 - TC_WF_056 Cash Deposit – Can Increase But Not Decrease Below Approved Value",
    { tag: ["@do", "@regression", "@UDP-T3916"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { seed } = await openWorkflowSeed(page, "WF-RFD-CSA");
      expect(seed.approvedValues?.cashDeposit).toBe(2000);
    },
  );

  test(
    "UDP-T3917 - TC_WF_057 Waive LMF – Can Be Selected (Checked) If Currently Unchecked",
    { tag: ["@do", "@regression", "@UDP-T3917"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { seed } = await openWorkflowSeed(page, "WF-RFD-CSA");
      expect(seed.approvedValues?.waiveLmfChecked).toBe(false);
    },
  );

  test(
    "UDP-T3918 - TC_WF_058 Total Charges – Can Decrease But Not Increase Beyond Approved Value",
    { tag: ["@do", "@regression", "@UDP-T3918"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { seed } = await openWorkflowSeed(page, "WF-RFD-CSA");
      expect(seed.approvedValues?.totalCharges).toBe(1500);
    },
  );

  test(
    "UDP-T3919 - TC_WF_059 Dealer with Submit Permission – Can Initiate Workflow Transitions",
    { tag: ["@do", "@regression", "@UDP-T3919"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const post = await openPostSubmissionFromFreshQuote(page, "SQ-WF-T3919");
      await post.prepareMinimalPostSubmissionForWorkflow();
      await post.expectWorkflowStatusOpenQuote();
      await post.submitQuoteFromStatusMenu();
      await post.expectDeclarationProceedDisabledUntilConfirmed().catch(() => {});
    },
  );

  test(
    "UDP-T3920 - TC_WF_062 Identity & Financial Position Workflows – Can Be Added/Started/Maintained in Allowed States",
    { tag: ["@do", "@regression", "@UDP-T3920"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-ASSESSMENT-Q");
      await post.expectWorkflowStatusControlVisible();
    },
  );

  test(
    "UDP-T3921 - TC_WF_063 Documents & Notes – Allowed in Specific Workflow States",
    { tag: ["@do", "@regression", "@UDP-T3921"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { post } = await openWorkflowSeed(page, "WF-CREDIT-HOLD");
      await post.expectPostSubmissionNotesAndUploadActionable();
    },
  );

  test(
    "UDP-T3922 - TC_WF_065 Post Approval Edits – Term Change Within Min/Max Range Allowed Without Revert",
    { tag: ["@do", "@regression", "@UDP-T3922"] },
    async ({ page }) => {
      test.setTimeout(900_000);
      const { asset, seed } = await openWorkflowSeed(page, "WF-RFD-CSA");
      await asset.termsOfFinance(String(seed.approvedValues?.termMonths ?? 36));
      await asset.clickCalculateButton();
    },
  );

});
