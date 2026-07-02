import { expect, type Locator, type Page, type Request, type Response } from "@playwright/test";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { BasePage } from "../../../common";
import { DOFinancialPositionPage } from "./financialPosition";
import { DOCustomerDetailsPage } from "./customerDetailsPage";
import { DOSearchCustomerDialog } from "./searchCustomerDialog";

/** Default PDF used on Customer Details after Reference submit (Upload tab). */
export const DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF = path.join(
  process.cwd(),
  "testData",
  "do-portal",
  "exportedPDFFile (3) (1).pdf",
);

/** Tiny JPEG for upload-tab tests (no checked-in `.jpg` in repo). */
const MINIMAL_JPEG_BYTES = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=",
  "base64",
);

/**
 * Post–Reference Details submit: upload, Documents tab, download + confirm,
 * notes, quote status Submit, Originator Declaration.
 */
export class DOCustomerQuotePostSubmitPage extends BasePage {
  readonly browseFilesButton: Locator;
  readonly confirmButton: Locator;
  readonly addNewNotesButton: Locator;
  readonly noteTextarea: Locator;
  readonly noteSubmitButton: Locator;
  readonly proceedButton: Locator;
  private readonly customerDetails: DOCustomerDetailsPage;
  private readonly searchCustomer: DOSearchCustomerDialog;

  constructor(page: Page) {
    super(page);
    this.customerDetails = new DOCustomerDetailsPage(page);
    this.searchCustomer = this.customerDetails.searchCustomer;
    this.browseFilesButton = page
      .getByRole("button", { name: /^Browse Files$/i })
      .or(page.locator(':text-is("Browse Files")'));
    this.confirmButton = page.locator(':text-is("Confirm")');
    this.addNewNotesButton = page.locator(':text-is("Add New Notes")');
    this.noteTextarea = page.locator(
      "textarea.p-inputtextarea.p-inputtext.p-component.p-element.text-sm.p-inputtextarea-resizable",
    );
    this.noteSubmitButton = page.locator(':text-is("Submit")');
    this.proceedButton = page.locator(':text-is("Proceed")');
  }

  /**
   * **Customer Details** — `+ Add Borrowers / Guarantors`.
   * @see {@link DOCustomerDetailsPage.clickAddBorrowersOrGuarantors}
   */
  async clickAddBorrowersOrGuarantorsButton(): Promise<void> {
    await this.customerDetails.clickAddBorrowersOrGuarantors();
  }

  /**
   * In **Search Customer**, set search type to **Individual**.
   * @see {@link DOSearchCustomerDialog.selectIndividualType}
   */
  async selectSearchCustomerIndividualType(): Promise<void> {
    await this.searchCustomer.selectIndividualType();
  }
  private assertPageOpen(step: string): void {
    if (this.page.isClosed()) {
      throw new Error(
        `Post-submit: browser/page was closed before ${step}. Check download / document dialog, or increase the test timeout.`,
      );
    }
  }

  private async postSubmitMicroDelay(ms: number): Promise<void> {
    this.assertPageOpen("UI settle delay");
    await this.page.waitForTimeout(ms).catch(() => {});
  }

  /** Quote header **Status** control — QAT often uses a `p-inputtext` beside **Status :**, not `name=workFlowStatus`. */
  private workflowStatusOpenQuoteInput(): Locator {
    const p = this.page;
    return p
      .getByText(/^Status\s*:?\s*$/i)
      .locator('xpath=following::input[contains(@class,"p-inputtext")][1]')
      .or(
        p
          .locator(".col-2.status")
          .filter({ visible: true })
          .locator("input.p-inputtext.p-component")
          .first(),
      )
      .or(p.locator('input[name="workFlowStatus"]').filter({ visible: true }).first());
  }

  private async readWorkflowStatusText(): Promise<string> {
    const input = this.workflowStatusOpenQuoteInput();
    if (await input.isVisible({ timeout: 800 }).catch(() => false)) {
      const value = (await input.inputValue().catch(() => "")).trim();
      if (value.length > 0) {
        return value;
      }
      return ((await input.textContent().catch(() => "")) ?? "").trim();
    }
    const btn = this.page
      .getByRole("button", { name: /Open\s+Quote|Submitted|Assessment|Pending|In\s+Progress/i })
      .first();
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      return ((await btn.textContent().catch(() => "")) ?? "").trim();
    }
    return "";
  }

  /**
   * Minimal Post Submission prep for workflow **Status** → **Submit** (UDP-T3795 / CSA).
   * Upload is required on CSA before declaration **Proceed** succeeds.
   */
  async prepareMinimalPostSubmissionForWorkflow(): Promise<void> {
    this.logStep("Prepare minimal post-submission for workflow");
    await this.waitForUploadStep();
    await this.uploadDocument();
    await this.expectDocumentUploaded();
  }

  /**
   * CSA Post Submission: upload → footer **Next** → **Status** Submit + declaration (UDP-T3845).
   */
  async uploadAdvanceAndSubmitApplication(): Promise<void> {
    await this.uploadAndAdvanceToFullPostSubmission();
    await this.submitApplicationFromPostSubmission();
  }

  /**
   * CSA Post Submission: mandatory **Browse Files** upload, then footer **Next** from Customer Details
   * upload entry into full Post Submission (Credit Conditions tab — UDP-T3844/T3845).
   */
  async uploadAndAdvanceToFullPostSubmission(): Promise<void> {
    await this.prepareMinimalPostSubmissionForWorkflow();
    await this.clickNextToEnterFullPostSubmission();
  }

  /** **Status** → **Submit** + Originator Declaration after Post Submission entry (Zephyr: application submitted). */
  async submitApplicationFromPostSubmission(): Promise<void> {
    this.logStep("Submit Application From Post Submission");
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    await this.submitQuoteThroughWorkflowDeclaration();
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
  }

  /**
   * Customer Details upload entry → footer **Next** → full Post Submission document strip.
   * Retries while **.app-loader-overlay** blocks pointer events (QAT).
   */
  async clickNextToEnterFullPostSubmission(): Promise<void> {
    this.logStep("Click Next To Enter Full Post Submission");
    const creditTab = await this.resolveCreditConditionsTab();
    if (await creditTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return;
    }

    await this.waitForUploadProcessingToFinish();

    const footer = this.postSubmissionFooterScope();
    const footerAdvanceButtons: Locator[] = [
      footer
        .locator("button.p-button, button.p-element")
        .filter({ has: footer.locator("span.p-button-label").filter({ hasText: /^Next$/ }) })
        .last(),
      footer.getByRole("button", { name: /Save\s+and\s+Next|Save\s*&\s*Next/i }).last(),
      footer.locator("button").filter({ has: footer.locator(':text-is("Next")') }).last(),
      footer.getByRole("button", { name: /^Next$/i }).last(),
    ];

    const reachedFullPostSubmission = async (): Promise<boolean> =>
      (await creditTab.isVisible({ timeout: 1_500 }).catch(() => false)) ||
      (await this.page
        .getByRole("tab", { name: /Credit Conditions|Additional Approval Conditions/i })
        .first()
        .isVisible({ timeout: 1_500 })
        .catch(() => false));

    await this.clickFooterAdvanceWhenLoaderClear(footerAdvanceButtons, reachedFullPostSubmission, 180_000);

    await expect
      .poll(async () => creditTab.isVisible().catch(() => false), {
        timeout: 120_000,
        intervals: [500, 1_500, 3_000],
      })
      .toBe(true);
  }

  /** Click sticky footer **Next** / **Save and Next** once the app loader is not intercepting. */
  private async clickFooterAdvanceWhenLoaderClear(
    buttons: Locator[],
    successCheck: () => Promise<boolean>,
    timeoutMs: number,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let forceNext = false;

    while (Date.now() < deadline) {
      if (await successCheck()) {
        return;
      }

      await this.waitUntilNoVisibleAppLoaderOverlays(15_000);

      for (const btn of buttons) {
        const ready =
          (await btn.isVisible({ timeout: 1_000 }).catch(() => false)) &&
          (await btn.isEnabled().catch(() => false));
        if (!ready) continue;

        if (await this.isAppLoaderBlocking()) {
          break;
        }

        await btn.scrollIntoViewIfNeeded();
        try {
          if (forceNext) {
            await btn.click({ force: true, timeout: 15_000 });
          } else {
            await this.clickElement(btn, 15_000);
          }
          await this.page.waitForLoadState("domcontentloaded").catch(() => {});
          if (await successCheck()) {
            return;
          }
        } catch {
          forceNext = true;
          await this.page.waitForTimeout(400);
        }
      }

      await this.page.waitForTimeout(400);
    }
  }

  private async isAppLoaderBlocking(): Promise<boolean> {
    const overlay = this.page.locator(".app-loader-overlay").filter({ visible: true });
    if ((await overlay.count()) > 0) {
      return true;
    }
    const spinner = this.page.locator(
      ".app-loader-overlay p-progressspinner, .app-loader-overlay .p-progressspinner, .p-blockui",
    ).filter({ visible: true });
    return (await spinner.count()) > 0;
  }

  /** PrimeNG upload widget / overlay can still block footer **Next** after `expectDocumentUploaded`. */
  private async waitForUploadProcessingToFinish(): Promise<void> {
    const panel = this.uploadTabContentPanel();
    const uploadProgress = panel.locator("progressbar, .p-progressbar").first();
    if (await uploadProgress.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await uploadProgress.waitFor({ state: "hidden", timeout: 90_000 }).catch(() => {});
    }
    await expect
      .poll(
        async () => {
          const busy = panel.getByText(/Upload complete|Uploaded/i).first();
          return busy.isVisible().catch(() => false);
        },
        { timeout: 60_000, intervals: [300, 800, 1_500] },
      )
      .toBe(true);
  }

  /** **.app-loader-overlay** blocks footer clicks after upload round-trips (same pattern as Personal Details). */
  private async waitUntilNoVisibleAppLoaderOverlays(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!(await this.isAppLoaderBlocking())) {
        return;
      }
      await this.page.waitForTimeout(200);
    }
  }

  /**
   * Full CSA post-submission prep before **Status** → **Submit** (matches CSAC sanity):
   * upload → generate **Customer Quote - Basic** → note, then workflow submit.
   */
  async preparePostSubmissionForWorkflowSubmit(
    noteText = "Workflow automation — submit readiness.",
  ): Promise<void> {
    this.logStep("Prepare post-submission for workflow submit");
    await this.prepareMinimalPostSubmissionForWorkflow();
    await this.openDocumentsTab();
    await this.selectCustomerQuoteBasicRow();
    await this.clickDownload();
    await this.confirmDocumentParameters();
    await this.addNoteAndSubmit(noteText);
  }

  /**
   * The Upload / Documents / Signing strip lives inside one PrimeNG `p-tabview`.
   * Resolving tabs from the whole page hits the wrong tab or misses role/name quirks.
   */
  private documentManagementTabView(): Locator {
    return this.page.locator(".p-tabview").filter({
      has: this.page.locator(':text-is("Browse Files")'),
    });
  }

  /**
   * Active **Upload** tab panel (contains **Browse Files** / file input). Avoids using the first
   * `.p-tabview` on the page, which is often the wrong strip.
   */
  private uploadTabContentPanel(): Locator {
    const strip = this.documentManagementTabView().first();
    return strip
      .locator(".p-tabview-panel")
      .filter({ has: this.browseFilesButton })
      .first()
      .or(
        strip
          .locator(".p-tabview-panel")
          .filter({ has: strip.locator('input[type="file"]') })
          .first(),
      );
  }

  /** Uploaded-documents grid on the **Upload** tab (Name / Loaded On / Loaded By / Source). */
  private uploadTabDocumentsTable(): Locator {
    return this.uploadTabContentPanel().locator("table").first();
  }

  /**
   * Select exactly one uploaded file row (uncheck others) so shared toolbar actions apply to that file.
   */
  async selectUploadTabRowByBasename(basename: string): Promise<Locator> {
    await this.ensureUploadTab();
    const panel = this.uploadTabContentPanel();
    await panel.waitFor({ state: "visible", timeout: 60_000 });
    const escaped = basename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRe = new RegExp(escaped, "i");
    const table = this.uploadTabDocumentsTable();
    const targetRow = table.locator("tbody tr").filter({ hasText: nameRe }).first();
    await expect(targetRow).toBeVisible({ timeout: 30_000 });

    const allRows = table.locator("tbody tr");
    const n = await allRows.count();
    for (let i = 0; i < n; i++) {
      const r = allRows.nth(i);
      const box = r.locator(".p-checkbox-box").first();
      if (!(await box.isVisible({ timeout: 1_000 }).catch(() => false))) {
        continue;
      }
      const isTarget = (await r.filter({ hasText: nameRe }).count()) > 0;
      const checked = r.locator(".p-checkbox-box.p-highlight");
      const isChecked = await checked.isVisible({ timeout: 400 }).catch(() => false);
      if (isTarget === isChecked) {
        continue;
      }
      await box.scrollIntoViewIfNeeded();
      await box.click({ timeout: 8_000 });
      if (isTarget) {
        await expect(checked).toBeVisible({ timeout: 8_000 });
      } else {
        await expect(checked).toHaveCount(0, { timeout: 8_000 });
      }
    }

    await expect(targetRow.locator(".p-checkbox-box.p-highlight")).toBeVisible({ timeout: 8_000 });
    return targetRow;
  }

  /** Shared toolbar control below the upload grid (visible instance — duplicates exist in DOM). */
  private uploadTabSharedActionButton(action: "Preview" | "Download" | "Delete"): Locator {
    const panel = this.uploadTabContentPanel();
    const rx = new RegExp(`^${action}$`, "i");
    return panel
      .getByRole("link", { name: rx })
      .or(panel.getByRole("button", { name: rx }))
      .or(panel.locator("a, button").filter({ hasText: rx }))
      .filter({ visible: true })
      .last();
  }

  private async confirmUploadDeleteDialogIfPresent(): Promise<void> {
    const confirmDlg = this.page
      .locator("p-confirmdialog, .p-confirm-dialog")
      .filter({ visible: true })
      .first();
    const roleDlg = this.page.getByRole("dialog").filter({ visible: true }).first();

    const dlg =
      (await confirmDlg.isVisible({ timeout: 6_000 }).catch(() => false))
        ? confirmDlg
        : (await roleDlg.isVisible({ timeout: 1_000 }).catch(() => false))
          ? roleDlg
          : null;
    if (!dlg) {
      return;
    }

    const accept = dlg
      .getByRole("button", { name: /^(Yes|OK|Delete|Confirm)$/i })
      .or(dlg.locator("button.p-confirm-dialog-accept"))
      .first();
    await accept.waitFor({ state: "visible", timeout: 8_000 });
    await accept.click({ timeout: 8_000 });
    await dlg.waitFor({ state: "hidden", timeout: 25_000 }).catch(() => {});
  }

  /** When `role="tab"` / accessible name fails, hit the PrimeNG nav link directly. */
  private documentsTabInStrip(root: Locator): Locator {
    const link = root.locator("a.p-tabview-nav-link").filter({ hasText: /^Documents$/i });
    const li = root.locator(".p-tabview-nav li").filter({ hasText: /^Documents$/i });
    const byHeaderAction = root
      .locator('[id^="pn_id_"][id$="_header_action"]')
      .filter({ hasText: /Documents/i });
    return link.or(li).or(byHeaderAction).first();
  }

  private signingTabInStrip(root: Locator): Locator {
    const link = root.locator("a.p-tabview-nav-link").filter({ hasText: /Signing\s*&\s*Verification/i });
    const li = root.locator(".p-tabview-nav li").filter({ hasText: /Signing/i });
    const byHeaderAction = root
      .locator('[id^="pn_id_"][id$="_header_action"]')
      .filter({ hasText: /Signing/i });
    return link.or(li).or(byHeaderAction).first();
  }

  /** `app-signatories` panel inside the document-management strip. */
  signatoriesPanel(): Locator {
    return this.documentManagementTabView().locator("app-signatories").first();
  }

  /** Open **Signing & Verification** tab and wait for the signatories grid. */
  async openSigningAndVerificationTab(): Promise<void> {
    this.logStep("Open Signing And Verification Tab");
    let root = this.documentManagementTabView();
    if ((await root.count()) === 0) {
      root = this.page
        .locator(".p-tabview")
        .filter({ has: this.page.getByRole("tab", { name: /^Upload$/i }) })
        .first();
    }
    if ((await root.count()) === 0) {
      root = this.page.locator(".p-tabview").first();
    }
    await root.waitFor({ state: "visible", timeout: 60_000 });

    const scopedRole = root.getByRole("tab", { name: /Signing\s*&\s*Verification/i });
    let tab: Locator =
      (await scopedRole.count()) > 0 ? scopedRole.first() : this.signingTabInStrip(root);

    await tab.waitFor({ state: "visible", timeout: 30_000 });
    await tab.scrollIntoViewIfNeeded();
    try {
      await tab.click({ timeout: 15_000 });
    } catch {
      tab = this.signingTabInStrip(root);
      await tab.click({ timeout: 30_000 });
    }

    const panel = this.signatoriesPanel();
    await expect(panel).toBeVisible({ timeout: 45_000 });
    await expect(panel.locator("table tbody tr").first()).toBeVisible({ timeout: 45_000 });
  }

  /** Preferred Delivery Method on Signing tab (default **Screen** per QAT). */
  async selectPreferredDeliveryMethod(method: "Screen" | "Email" = "Screen"): Promise<void> {
    this.logStep(`Select Preferred Delivery Method (${method})`);
    const panel = this.signatoriesPanel();
    const dropdown = panel.locator("p-dropdown").first();
    await dropdown.waitFor({ state: "visible", timeout: 20_000 });
    const label = dropdown.locator(".p-dropdown-label");
    const current = ((await label.innerText().catch(() => "")) || "").trim();
    if (new RegExp(`^${method}$`, "i").test(current)) {
      return;
    }
    await dropdown.locator(".p-dropdown-trigger").click({ timeout: 10_000 });
    const option = this.page
      .locator(".p-dropdown-panel .p-dropdown-item, .p-dropdown-items .p-dropdown-item")
      .filter({ hasText: new RegExp(`^${method}$`, "i") })
      .first();
    await option.waitFor({ state: "visible", timeout: 10_000 });
    await option.click({ timeout: 8_000 });
    await expect(label).toContainText(new RegExp(method, "i"), { timeout: 8_000 });
  }

  private signatoryRowByCustomerName(customerName: string): Locator {
    const escaped = customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.signatoriesPanel()
      .locator("tbody tr")
      .filter({ hasText: new RegExp(escaped, "i") })
      .first();
  }

  /** Dealer row **Preview/Sign** (eye) — signing order 1 when Screen delivery is used. */
  async completeDealerOnScreenSigningIfRequired(): Promise<void> {
    this.logStep("Complete Dealer On Screen Signing If Required");
    const dealerRow = this.signatoriesPanel().locator("tbody tr").filter({ hasText: /Dealer/i }).first();
    if (!(await dealerRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    const eyeBtn = dealerRow
      .locator("button")
      .filter({ has: dealerRow.locator(".fa-eye, .fa-regular.fa-eye") })
      .first();
    if (!(await eyeBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return;
    }
    await eyeBtn.scrollIntoViewIfNeeded();
    await eyeBtn.click({ timeout: 10_000 });
    await this.completeOnScreenSigningPrompts();
  }

  /**
   * Borrower **Start Verification → Electronic** (UDP-T3826 step 1).
   * QAT overlay: `p-overlaypanel` with Manual | Electronic.
   */
  async startBorrowerElectronicVerification(customerName: string): Promise<void> {
    this.logStep(`Start Borrower Electronic Verification (${customerName})`);
    const row = this.signatoryRowByCustomerName(customerName);
    await expect(row).toBeVisible({ timeout: 30_000 });

    const startVerification = row
      .locator(".id-verification-cell-data, .id-verification-cell")
      .filter({ hasText: /Start Verification/i })
      .or(row.locator("td").filter({ hasText: /Start Verification/i }))
      .first();
    await expect(startVerification).toBeVisible({ timeout: 20_000 });
    await startVerification.scrollIntoViewIfNeeded();
    await startVerification.click({ timeout: 12_000 });

    const picker = this.page.locator("dialog, [role='dialog']").last();
    await expect(picker).toContainText(/Manual/i, { timeout: 15_000 });
    await expect(picker).toContainText(/Electronic/i, { timeout: 5_000 });

    const electronicLabel = picker.getByText("Electronic", { exact: true });
    await expect(electronicLabel).toBeVisible({ timeout: 10_000 });
    await electronicLabel
      .locator("xpath=ancestor::*[contains(@class,'cursor-pointer')][1]")
      .click({ timeout: 10_000 })
      .catch(async () => {
        await electronicLabel.click({ timeout: 10_000, force: true });
      });
  }

  /** Click through on-screen signing / verification prompts until idle or e-signed row appears. */
  async completeOnScreenSigningPrompts(): Promise<void> {
    this.logStep("Complete On Screen Signing Prompts");
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      if (await this.uploadTabHasElectronicallySignedRow()) {
        return;
      }

      const dialog = this.page.getByRole("dialog").filter({ visible: true }).first();
      if (await dialog.isVisible({ timeout: 800 }).catch(() => false)) {
        const action = dialog
          .getByRole("button", {
            name: /^(Sign|I Agree|Agree|Accept|Complete|Proceed|Confirm|Continue|Submit|OK|Yes)$/i,
          })
          .filter({ visible: true })
          .first();
        if (await action.isVisible({ timeout: 1_500 }).catch(() => false)) {
          await action.click({ timeout: 10_000 });
          await dialog.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
          continue;
        }
      }

      const signBtn = this.page
        .getByRole("button", { name: /^Sign$/i })
        .filter({ visible: true })
        .first();
      if (await signBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await signBtn.click({ timeout: 10_000 });
        continue;
      }

      const borrowerRow = this.signatoryRowByCustomerName("Liza Marie Doe");
      const borrowerEye = borrowerRow
        .locator("button")
        .filter({ has: borrowerRow.locator(".fa-eye, .fa-regular.fa-eye") })
        .first();
      if (await borrowerEye.isVisible({ timeout: 800 }).catch(() => false)) {
        const verified = borrowerRow.getByText(/verified|complete|signed/i);
        if (!(await verified.isVisible({ timeout: 400 }).catch(() => false))) {
          await borrowerEye.click({ timeout: 8_000 }).catch(() => {});
        }
      }

      if (
        await this.page
          .getByText(/verification complete|successfully signed|electronically signed/i)
          .first()
          .isVisible({ timeout: 500 })
          .catch(() => false)
      ) {
        return;
      }

      await this.page.waitForTimeout(1_200);
    }
  }

  /** Generate **Customer Quote - Basic** on Documents tab (prerequisite for e-sign). */
  async generateCustomerQuoteBasicDocument(): Promise<void> {
    this.logStep("Generate Customer Quote Basic Document");
    await this.openDocumentsTab();
    const beforeAudit = await this.auditGeneratedDocumentRegenerationState(
      /Customer Quote\s*-\s*Basic/i,
    );
    if (beforeAudit.latestTimestamp) {
      this.logStep(
        `Pre-generation timestamp="${beforeAudit.latestTimestamp}" (${beforeAudit.latestMs} ms), rows=${beforeAudit.rowCount}`,
      );
    }
    await this.selectCustomerQuoteBasicRow();
    await this.clickDownload();
    await this.confirmDocumentParameters();
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    await this.refreshGeneratedDocumentsTab();
    const afterAudit = await this.auditGeneratedDocumentRegenerationState(
      /Customer Quote\s*-\s*Basic/i,
    );
    this.logStep(
      `Post-generation timestamp="${afterAudit.latestTimestamp}" (${afterAudit.latestMs} ms), rows=${afterAudit.rowCount}, historyIcon=${afterAudit.historyIconVisible}`,
    );
  }

  /** Toggle away from **Documents** and back to force the grid to reload after regeneration. */
  private async refreshGeneratedDocumentsTab(): Promise<void> {
    let root = this.documentManagementTabView();
    if ((await root.count()) === 0) {
      root = this.page.locator(".p-tabview").first();
    }
    const uploadTab = root.getByRole("tab", { name: /^Upload$/i }).first();
    if (await uploadTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await uploadTab.click({ timeout: 10_000 }).catch(() => {});
      await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
    }
    const documentsTab = root.getByRole("tab", { name: /^Documents$/i }).first();
    await documentsTab.click({ timeout: 15_000 });
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await this.generatedDocumentsCustomerQuoteBasicRow().waitFor({ state: "visible", timeout: 45_000 });
  }

  private generatedDocumentsCustomerQuoteBasicRow(): Locator {
    return this.documentManagementStrip()
      .locator("tr")
      .filter({ hasText: /Customer Quote\s*-\s*Basic/i })
      .first();
  }

  private async confirmCancelElectronicSigningDialogIfPresent(): Promise<void> {
    const confirmDlg = this.page
      .locator("p-confirmdialog, .p-confirm-dialog")
      .filter({ visible: true })
      .first();
    const roleDlg = this.page
      .getByRole("dialog")
      .filter({ visible: true, hasText: /cancel.*e-?sign|e-?sign.*cancel|sure.*cancel/i })
      .first();

    const dlg =
      (await confirmDlg.isVisible({ timeout: 6_000 }).catch(() => false))
        ? confirmDlg
        : (await roleDlg.isVisible({ timeout: 1_500 }).catch(() => false))
          ? roleDlg
          : null;
    if (!dlg) {
      return;
    }

    const accept = dlg
      .getByRole("button", { name: /^(Yes|OK|Confirm|Cancel E-?Sign)$/i })
      .or(dlg.locator("button.p-confirm-dialog-accept"))
      .first();
    await accept.waitFor({ state: "visible", timeout: 8_000 });
    await accept.click({ timeout: 8_000 });
    await dlg.waitFor({ state: "hidden", timeout: 25_000 }).catch(() => {});
  }

  /**
   * UDP-T3841 / UDP-T3843 — start e-sign (dealer + borrower verification) without completing signing.
   */
  async initiateElectronicSigningWithoutCompletion(options?: {
    borrowerName?: string;
    deliveryMethod?: "Screen" | "Email";
  }): Promise<void> {
    const borrowerName = options?.borrowerName ?? "Liza Marie Doe";
    const deliveryMethod = options?.deliveryMethod ?? "Screen";

    await this.generateCustomerQuoteBasicDocument();
    await this.openSigningAndVerificationTab();
    await this.selectPreferredDeliveryMethod(deliveryMethod);
    await this.completeDealerOnScreenSigningIfRequired();
    await this.startBorrowerElectronicVerification(borrowerName);
  }

  /**
   * UDP-T3843 — cancel in-progress e-sign from Signing & Verification or signatory pop-up.
   */
  async cancelElectronicSigningProcess(): Promise<void> {
    this.logStep("Cancel Electronic Signing Process");
    await this.openSigningAndVerificationTab();
    const panel = this.signatoriesPanel();

    const signingTabCancel = panel
      .getByRole("button", { name: /Cancel\s*E-?Sign(ing)?/i })
      .or(panel.getByRole("link", { name: /Cancel\s*E-?Sign(ing)?/i }))
      .or(panel.locator("button, a").filter({ hasText: /Cancel\s*E-?Sign/i }))
      .filter({ visible: true })
      .first();

    if (await signingTabCancel.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await signingTabCancel.click({ timeout: 12_000 });
      await this.confirmCancelElectronicSigningDialogIfPresent();
      return;
    }

    // UDP-T3840 — E-Sign Status hyperlink opens signatory pop-up; cancel from there.
    await this.openDocumentsTab();
    const row = this.generatedDocumentsCustomerQuoteBasicRow();
    await expect(row).toBeVisible({ timeout: 30_000 });
    const esignStatusLink = row
      .getByRole("link")
      .filter({ hasText: /Pending|In Progress|Started|Cancelled/i })
      .or(row.locator("a, button").filter({ hasText: /^(Pending|In Progress|Started)$/i }))
      .first();
    await expect(esignStatusLink).toBeVisible({ timeout: 20_000 });
    await esignStatusLink.click({ timeout: 12_000 });

    const signatoryDlg = this.page
      .getByRole("dialog")
      .filter({ hasText: /signator|e-?sign|signing/i })
      .last();
    await expect(signatoryDlg).toBeVisible({ timeout: 15_000 });
    const popupCancel = signatoryDlg
      .getByRole("button", { name: /Cancel\s*E-?Sign(ing)?|^Cancel$/i })
      .filter({ visible: true })
      .first();
    await popupCancel.click({ timeout: 12_000 });
    await this.confirmCancelElectronicSigningDialogIfPresent();
  }

  /** UDP-T3843 — initiate e-sign then cancel before completion. */
  async initiateAndCancelElectronicSigningFlow(options?: {
    borrowerName?: string;
    deliveryMethod?: "Screen" | "Email";
  }): Promise<void> {
    await this.initiateElectronicSigningWithoutCompletion(options);
    await this.cancelElectronicSigningProcess();
  }

  /**
   * UDP-T3826 — generate documents, complete dealer + borrower e-sign on **Screen**, then assert Upload tab.
   */
  async completeElectronicSigningFlow(options?: {
    borrowerName?: string;
    deliveryMethod?: "Screen" | "Email";
  }): Promise<void> {
    const borrowerName = options?.borrowerName ?? "Liza Marie Doe";
    const deliveryMethod = options?.deliveryMethod ?? "Screen";

    await this.generateCustomerQuoteBasicDocument();

    await this.openSigningAndVerificationTab();
    await this.selectPreferredDeliveryMethod(deliveryMethod);
    await this.completeDealerOnScreenSigningIfRequired();
    await this.startBorrowerElectronicVerification(borrowerName);
    await this.completeOnScreenSigningPrompts();

    const borrowerRow = this.signatoryRowByCustomerName(borrowerName);
    const eyeBtn = borrowerRow
      .locator("button")
      .filter({ has: borrowerRow.locator(".fa-eye, .fa-regular.fa-eye") })
      .first();
    if (await eyeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await eyeBtn.click({ timeout: 10_000 });
      await this.completeOnScreenSigningPrompts();
    }
  }

  private async uploadTabHasElectronicallySignedRow(): Promise<boolean> {
    const table = this.uploadTabDocumentsTable();
    return table
      .locator("tbody tr")
      .filter({ hasText: /\bElectronically Signed\b/i })
      .first()
      .isVisible({ timeout: 1_500 })
      .catch(() => false);
  }

  /** UDP-T3841 / UDP-T3843 — Generated Documents tab shows unsigned document row. */
  async expectGeneratedDocumentsTabUnsignedDocumentVisible(
    expectedEsignStatus?: RegExp,
  ): Promise<void> {
    this.logStep("Expect Generated Documents Tab Unsigned Document Visible");
    await this.openDocumentsTab();
    const row = this.generatedDocumentsCustomerQuoteBasicRow();
    await expect(row).toBeVisible({ timeout: 45_000 });
    const rowText = (await row.innerText()).replace(/\s+/g, " ").trim();
    expect(rowText).toMatch(/Customer Quote\s*-\s*Basic/i);
    if (expectedEsignStatus) {
      expect(rowText).toMatch(expectedEsignStatus);
    }
  }

  /** UDP-T3843 — E-Sign status **Cancelled** on Generated Documents row. */
  async expectGeneratedDocumentsTabEsignStatusCancelled(): Promise<void> {
    await this.expectGeneratedDocumentsTabUnsignedDocumentVisible(/\bCancelled\b/i);
  }

  /** UDP-T3841 / UDP-T3843 — Upload tab must NOT list Source = Electronically Signed. */
  async expectUploadTabNoElectronicallySignedDocuments(): Promise<void> {
    this.logStep("Expect Upload Tab No Electronically Signed Documents");
    await this.ensureUploadTab();
    const table = this.uploadTabDocumentsTable();
    const eSignedRows = table.locator("tbody tr").filter({ hasText: /\bElectronically Signed\b/i });
    await expect(eSignedRows).toHaveCount(0, { timeout: 15_000 });
  }

  /** UDP-T3826 step 2 — Upload tab lists e-signed documents with Source = Electronically Signed. */
  async expectUploadTabElectronicallySignedDocumentVisible(): Promise<void> {
    this.logStep("Expect Upload Tab Electronically Signed Document Visible");
    await this.ensureUploadTab();
    const table = this.uploadTabDocumentsTable();
    await expect(table).toBeVisible({ timeout: 30_000 });

    const eSignedRow = table.locator("tbody tr").filter({ hasText: /\bElectronically Signed\b/i });
    await expect
      .poll(async () => eSignedRow.count(), { timeout: 120_000, intervals: [1_000, 2_500, 5_000] })
      .toBeGreaterThan(0);

    const row = eSignedRow.first();
    const rowText = (await row.innerText()).replace(/\s+/g, " ").trim();
    expect(rowText).toMatch(/\bElectronically Signed\b/);
    expect(rowText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(rowText).toMatch(/\.(pdf|jpg|jpeg|png)/i);
  }

  async waitForUploadStep(): Promise<void> {
    await this.page.waitForLoadState("load").catch(() => {});
    // Stepper label (FL Standard Quote) or Upload tab anchor — avoids racing Reference → Post Submission navigation.
    // Poll instead of `.or()` — both "Post Submission" and "Browse Files" can be visible (strict-mode safe).
    await expect
      .poll(
        async () =>
          (await this.page.getByText(/Post Submission/i).first().isVisible().catch(() => false)) ||
          (await this.browseFilesButton.isVisible().catch(() => false)),
        { timeout: 120_000, intervals: [500, 1_500, 3_000] },
      )
      .toBeTruthy();
    await this.browseFilesButton.waitFor({ state: "visible", timeout: 60_000 });
  }

  /**
   * Best-effort URL match for the upload API (paths differ per env — never hard-block on this).
   */
  /** True when the outgoing request is likely the file-upload call (URLs vary by environment). */
  private static looksLikeUploadRequest(req: Request): boolean {
    const method = req.method();
    if (method !== "POST" && method !== "PUT" && method !== "PATCH") {
      return false;
    }
    const url = req.url();
    return /upload|document|file|attachment|quote|media|blob|storage|save|customer|portal/i.test(
      url,
    );
  }

  /**
   * Uploads a file from the Upload tab.
   * Success is validated by {@link expectDocumentUploaded} — we only wait briefly for any likely
   * upload response so we do not burn the test timeout when the backend URL does not match.
   */
  async uploadDocument(filePath: string = DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF): Promise<void> {
    const fileInput = this.page.locator('input[type="file"]');
    const count = await fileInput.count();
    if (count > 0) {
      const responsePromise = this.page
        .waitForResponse(
          (res: Response) =>
            DOCustomerQuotePostSubmitPage.looksLikeUploadRequest(res.request()),
          { timeout: 20000 },
        )
        .catch(() => null);

      await fileInput.first().setInputFiles(filePath);

      const response = await responsePromise;
      if (response && !response.ok()) {
        throw new Error(
          `Upload HTTP failed: ${response.status()} ${response.statusText()} ${response.url()}`,
        );
      }
    } else {
      const responsePromise = this.page
        .waitForResponse(
          (res: Response) =>
            DOCustomerQuotePostSubmitPage.looksLikeUploadRequest(res.request()),
          { timeout: 20000 },
        )
        .catch(() => null);

      const fileChooserPromise = this.page.waitForEvent("filechooser", { timeout: 30000 });
      await this.browseFilesButton.click();
      const chooser = await fileChooserPromise;
      await chooser.setFiles(filePath);

      const response = await responsePromise;
      if (response && !response.ok()) {
        throw new Error(
          `Upload HTTP failed: ${response.status()} ${response.statusText()} ${response.url()}`,
        );
      }
    }

    const spinner = this.page.locator(".p-progress-spinner, .p-blockui").first();
    if (await spinner.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spinner.waitFor({ state: "hidden", timeout: 60000 });
    }
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await new Promise((r) => setTimeout(r, 800));
  }

  /**
   * Fails the running test if the UI does not show that the file uploaded (no further steps run).
   * Looks for file name / PDF row / PrimeNG upload row / success toast.
   */
  async expectDocumentUploaded(
    filePath: string = DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF,
  ): Promise<void> {
    const base = path.basename(filePath);
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    let root = this.documentManagementTabView();
    if ((await root.count()) === 0) {
      root = this.page
        .locator(".p-tabview")
        .filter({ has: this.page.getByRole("tab", { name: /^Upload$/i }) })
        .first();
    }
    if ((await root.count()) === 0) {
      root = this.page.locator(".p-tabview").first();
    }

    await expect(async () => {
      const nameOnPage = this.page.getByText(new RegExp(`^${escaped}$`, "i"));
      const nameLoose = this.page.getByText(new RegExp(escaped, "i"));
      const uploadRow = root
        .locator(".p-fileupload-file, .p-fileupload-row, .p-fileupload-files tr")
        .filter({ hasText: /\.pdf/i });
      const successToast = this.page.locator(
        ".p-toast-message-success, .p-message-success, [class*='toast'][class*='success']",
      );

      const ok =
        (await nameOnPage.first().isVisible().catch(() => false)) ||
        (await nameLoose.first().isVisible().catch(() => false)) ||
        (await uploadRow.first().isVisible().catch(() => false)) ||
        (await successToast.first().isVisible().catch(() => false));

      expect(ok, `Uploaded file not detected in UI after upload: "${base}"`).toBeTruthy();
    }).toPass({
      intervals: [400, 800, 1500],
      timeout: 45_000,
    });
  }

  async openDocumentsTab(): Promise<void> {
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    let root = this.documentManagementTabView();
    if ((await root.count()) === 0) {
      root = this.page
        .locator(".p-tabview")
        .filter({ has: this.page.getByRole("tab", { name: /^Upload$/i }) })
        .first();
    }
    if ((await root.count()) === 0) {
      root = this.page.locator(".p-tabview").first();
    }
    await root.waitFor({ state: "visible", timeout: 60000 });

    const basicRow = root
      .locator("tr")
      .filter({ hasText: /Customer Quote\s*-\s*Basic|Purchase\s*Invoice/i })
      .first();
    const documentsTabActive = root
      .locator(".p-tabview-nav li.p-highlight")
      .filter({ hasText: /^Documents$/i })
      .first();
    if (
      (await documentsTabActive.isVisible({ timeout: 1_500 }).catch(() => false)) &&
      (await basicRow.isVisible({ timeout: 1_500 }).catch(() => false))
    ) {
      return;
    }

    const scopedRole = root.getByRole("tab", { name: /Documents/i });
    let tab: Locator =
      (await scopedRole.count()) > 0 ? scopedRole.first() : this.documentsTabInStrip(root);

    await tab.waitFor({ state: "visible", timeout: 30000 });
    await tab.scrollIntoViewIfNeeded();
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    try {
      await tab.click({ timeout: 15000 });
    } catch {
      await this.waitUntilNoVisibleAppLoaderOverlays(30_000);
      tab = this.documentsTabInStrip(root);
      await tab.click({ timeout: 30_000, force: true });
    }

    await basicRow.waitFor({ state: "visible", timeout: 45_000 });
  }

  /** Select "Customer Quote - Basic" row checkbox (PrimeNG `.p-checkbox-box.p-highlight`). */
  async selectCustomerQuoteBasicRow(): Promise<void> {
    const row = this.page
      .locator("tr")
      .filter({ hasText: /Customer Quote\s*-\s*Basic/i })
      .first();
    await row.waitFor({ state: "visible", timeout: 30000 });
    const box = row.locator(".p-checkbox-box").first();
    await box.scrollIntoViewIfNeeded();
    const checked = row.locator(".p-checkbox-box.p-highlight");
    if (!(await checked.isVisible({ timeout: 2000 }).catch(() => false))) {
      await box.click();
    }
    await checked.waitFor({ state: "visible", timeout: 15000 });
  }

  /**
   * Toolbar link next to Preview / Print on the **Documents** tab — scoped to the document strip
   * (never a page-wide "Download"). Some builds duplicate the control in the DOM (hidden + visible);
   * prefer **visible** + **`.last()`** like the Upload toolbar. Labels may be **Download** / **Download document**.
   */
  async clickDownload(): Promise<void> {
    this.assertPageOpen("clickDownload");
    let root = this.documentManagementTabView();
    if ((await root.count()) === 0) {
      root = this.page
        .locator(".p-tabview")
        .filter({ has: this.page.getByRole("tab", { name: /^Documents$/i }) })
        .first();
    }
    await root.waitFor({ state: "visible", timeout: 30_000 });

    /** Prefer panel that actually contains the grid row (scope `tr` under `root`, not the whole page). */
    const documentsPanel = root.locator(".p-tabview-panel").filter({
      has: root.locator("tr").filter({ hasText: /Customer Quote\s*-\s*Basic/i }),
    });

    const panelByRole = root.getByRole("tabpanel", { name: /^Documents$/i });

    let panel: Locator;
    const visibleDocPanel = documentsPanel.filter({ visible: true }).first();
    if ((await visibleDocPanel.count()) > 0 && (await visibleDocPanel.isVisible().catch(() => false))) {
      panel = visibleDocPanel;
    } else if ((await panelByRole.count()) > 0) {
      panel = panelByRole.filter({ visible: true }).first();
    } else {
      panel = root
        .locator(".p-tabview-panel")
        .filter({ visible: true })
        .filter({ has: root.locator("tr").filter({ hasText: /Customer Quote\s*-\s*Basic/i }) })
        .first()
        .or(root.locator(".p-tabview-panel").filter({ visible: true }).filter({ hasText: /Preview/i }))
        .first();
    }

    await expect(panel).toBeVisible({ timeout: 25_000 });
    await panel.scrollIntoViewIfNeeded().catch(() => {});

    const downloadControl = panel
      .getByRole("button", { name: /download/i })
      .filter({ visible: true })
      .last()
      .or(panel.getByRole("link", { name: /download/i }).filter({ visible: true }).last())
      .or(panel.locator("button").filter({ hasText: /^Download$/i }).filter({ visible: true }).last())
      .or(panel.locator("a").filter({ hasText: /^Download$/i }).filter({ visible: true }).last())
      .or(panel.locator("a[download]").filter({ visible: true }).first())
      .or(
        panel
          .locator("span.p-button-label, [data-pc-section='label']")
          .filter({ hasText: /^Download$/i })
          .locator("xpath=ancestor::button[1]"),
      )
      .first();

    await expect(downloadControl).toBeVisible({ timeout: 15_000 });
    await downloadControl.scrollIntoViewIfNeeded();
    await downloadControl.click({ timeout: 12_000 }).catch(async () => {
      await downloadControl.click({ timeout: 12_000, force: true });
    });
  }

  async confirmDocumentParameters(): Promise<void> {
    this.assertPageOpen("confirmDocumentParameters");
    await this.page.getByRole("dialog", { name: /Document Parameters/i }).waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await this.confirmButton.click();
    await this.page.getByRole("dialog", { name: /Document Parameters/i }).waitFor({
      state: "hidden",
      timeout: 20_000,
    }).catch(() => {});

    this.assertPageOpen("confirmDocumentParameters (after dialog)");
    await this.page
      .locator('input[name="workFlowStatus"]')
      .filter({ visible: true })
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
  }

  async addNoteAndSubmit(noteText: string): Promise<void> {
    await this.addNewNotesButton.waitFor({ state: "visible", timeout: 60000 });
    await this.addNewNotesButton.scrollIntoViewIfNeeded();
    await this.addNewNotesButton.click();

    const dialog = this.page.getByRole("dialog", { name: /Add Note/i });
    await dialog.waitFor({ state: "visible", timeout: 30000 });
    const ta = dialog.locator("textarea.p-inputtextarea").first();
    await ta.waitFor({ state: "visible", timeout: 15000 });
    await ta.fill(noteText);
    await dialog.locator(':text-is("Submit")').click();
    await dialog.waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
  }

  /** Switch to **Upload** tab inside the post-submission document strip (safe if already active). */
  async ensureUploadTab(): Promise<void> {
    let root = this.documentManagementTabView();
    if ((await root.count()) === 0) {
      root = this.page
        .locator(".p-tabview")
        .filter({ has: this.page.getByRole("tab", { name: /^Upload$/i }) })
        .first();
    }
    if ((await root.count()) === 0) {
      root = this.page.locator(".p-tabview").first();
    }
    await root.waitFor({ state: "visible", timeout: 60000 });
    const uploadTab = root
      .getByRole("tab", { name: /^Upload$/i })
      .or(root.locator("a.p-tabview-nav-link").filter({ hasText: /^Upload$/i }))
      .first();
    if (await uploadTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await uploadTab.scrollIntoViewIfNeeded();
      await uploadTab.click({ timeout: 15000 }).catch(() => {});
    }
    await this.browseFilesButton.waitFor({ state: "visible", timeout: 60000 });
  }

  private notesRegion(): Locator {
    const tabPanel = this.page
      .locator(".p-tabview-panel")
      .filter({ has: this.addNewNotesButton })
      .first();
    const post = this.page.locator("app-customer-quote-post-submit, app-post-submission").first();
    const strip = this.documentManagementTabView();
    return tabPanel.or(post).or(strip);
  }

  /** Date/time-ish copy in note cards (formats differ by locale and build). */
  private static readonly NOTE_CARD_TIME_RX =
    /\d{1,2}[\/\-.]\d{1,2}([\/\-.]\d{2,4})?|\d{4}-\d{2}-\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d{2}|\d{1,2}:\d{2}|\bago\b|today|yesterday|mins?\s+ago|hours?\s+ago|seconds?\s+ago|\|\s*\d{1,2}/i;

  private async noteTimestampVisibleAnywhere(): Promise<boolean> {
    const roots: Locator[] = [
      this.notesRegion(),
      this.documentManagementTabView(),
      this.page.locator(".p-tabview").filter({ has: this.addNewNotesButton }).first(),
    ];
    for (const root of roots) {
      if ((await root.count()) === 0) continue;
      const hit = root.getByText(DOCustomerQuotePostSubmitPage.NOTE_CARD_TIME_RX).first();
      if (await hit.isVisible({ timeout: 800 }).catch(() => false)) {
        return true;
      }
    }
    const loose = this.page
      .locator("app-customer-quote-post-submit, app-post-submission")
      .locator("gen-card, p-card, .p-card-body, li, tr")
      .filter({ hasText: DOCustomerQuotePostSubmitPage.NOTE_CARD_TIME_RX })
      .first();
    return loose.isVisible({ timeout: 800 }).catch(() => false);
  }

  private async seedShortNoteIfDialogClosed(): Promise<void> {
    await this.addNewNotesButton.click();
    const dialog = this.page.getByRole("dialog", { name: /Add Note/i });
    await dialog.waitFor({ state: "visible", timeout: 30_000 });
    const ta = dialog.locator("textarea.p-inputtextarea").first();
    await ta.fill("UDC automation — seed note for author/timestamp row.");
    await dialog.locator(':text-is("Submit")').click();
    await dialog.waitFor({ state: "hidden", timeout: 45_000 }).catch(() => {});
    await this.page.waitForTimeout(600);
  }

  /**
   * Post-submit **Upload** tab: existing note rows should show a **timestamp** (or author|time).
   * Fresh quotes often have **no** notes yet — we add a short seed note once, then assert a time stamp appears.
   */
  async expectExistingNoteCardsShowAuthorAndTimestamp(): Promise<void> {
    await this.ensureUploadTab();
    await this.addNewNotesButton.waitFor({ state: "visible", timeout: 60_000 });

    try {
      await expect
        .poll(async () => this.noteTimestampVisibleAnywhere(), {
          timeout: 12_000,
          intervals: [400, 1_000, 2_000],
        })
        .toBeTruthy();
    } catch {
      await this.seedShortNoteIfDialogClosed();
    }

    await expect
      .poll(async () => this.noteTimestampVisibleAnywhere(), {
        timeout: 45_000,
        intervals: [500, 1_500, 3_000],
      })
      .toBeTruthy();
  }

  async expectOversizedNoteRejectedOnSubmit(): Promise<void> {
    await this.ensureUploadTab();
    await this.addNewNotesButton.click();
    const dialog = this.page.getByRole("dialog", { name: /Add Note/i });
    await dialog.waitFor({ state: "visible", timeout: 30_000 });
    const ta = dialog.locator("textarea.p-inputtextarea").first();
    await ta.fill("x".repeat(1001));
    await ta.press("Tab").catch(() => {});
    await this.page.waitForTimeout(250);

    /** Portal copy (OL / FL / CSA): e.g. "The length of the note should not be greater than 1000." */
    const msgRx =
      /length\s+of\s+the\s+note|note.*(should\s+not\s+)?(be\s+)?greater\s+than\s*1000|greater\s+than\s*1000|not\s+be\s+greater\s+than\s*1000|exceed(s)?\s*1000|max(imum)?\s*1000|1000\s*characters?|character\s*limit|too\s+long/i;

    const inDialog = dialog
      .locator(
        "small.p-error, .p-error, .p-message-error, .p-message.p-message-error, .p-inline-message, [role='alert'], mat-error, .text-danger, .invalid-feedback",
      )
      .filter({ hasText: msgRx })
      .or(dialog.locator(".p-dialog-content").getByText(msgRx))
      .first();

    const toast = this.page
      .locator(
        ".p-toast-message-error, .p-toast-message-warn, .p-toast-detail, .p-message-error, .p-message-warn",
      )
      .filter({ hasText: msgRx })
      .first();

    await dialog.locator(':text-is("Submit")').click();

    await expect
      .poll(
        async () => {
          if (await inDialog.isVisible().catch(() => false)) return true;
          if (await toast.isVisible().catch(() => false)) return true;
          const any = this.page.getByText(msgRx).first();
          return await any.isVisible().catch(() => false);
        },
        { timeout: 30_000, intervals: [200, 500, 1_000, 2_000] },
      )
      .toBeTruthy();

    await this.page.keyboard.press("Escape").catch(() => {});
    await dialog.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  }

  async submitNoteOfExactLengthFromDialog(length: number): Promise<void> {
    await this.ensureUploadTab();
    await this.addNewNotesButton.click();
    const dialog = this.page.getByRole("dialog", { name: /Add Note/i });
    await dialog.waitFor({ state: "visible", timeout: 30000 });
    const ta = dialog.locator("textarea.p-inputtextarea").first();
    const body = "n".repeat(Math.max(0, length - 1)) + "Z";
    await ta.fill(body.slice(0, length));
    await ta.press("Tab").catch(() => {});
    await this.page.waitForTimeout(150);
    await dialog.locator(':text-is("Submit")').click();
    await dialog.waitFor({ state: "hidden", timeout: 45000 });
  }

  async expectNoteListShowsMoreForLongSavedNote(): Promise<void> {
    await this.ensureUploadTab();
    const more = this.page
      .getByRole("button", { name: /^(More|Show more|Read more|View more|Expand)$/i })
      .or(this.page.getByText(/^(More|Show more|Read more)$/i))
      .or(this.page.locator("a, button, span").filter({ hasText: /^Show more$/i }))
      .first();
    await expect
      .poll(
        async () => {
          if (await more.isVisible().catch(() => false)) return true;
          /** Some builds show the long body inline (no “More”) — look for a stretch of the saved note. */
          const anyLong = this.notesRegion().getByText(/nnnnnnnnnn/).first();
          return await anyLong.isVisible().catch(() => false);
        },
        { timeout: 45_000, intervals: [400, 1_200, 2_500] },
      )
      .toBeTruthy();
  }

  /** UDP-T3827 — upload a small in-memory JPEG on the Upload tab. */
  async uploadMinimalJpegDocument(): Promise<void> {
    this.logStep("Upload Minimal JPEG Document");
    await this.ensureUploadTab();
    await this.uploadFilePayload({
      name: "minimal-upload.jpg",
      mimeType: "image/jpeg",
      buffer: MINIMAL_JPEG_BYTES,
    });
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await this.postSubmitMicroDelay(800);
  }

  async uploadJpgThenPdfExpectBothVisible(): Promise<void> {
    await this.ensureUploadTab();
    const jpgName = "minimal-upload.jpg";
    const pdfPath = DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF;
    if (!existsSync(pdfPath)) {
      throw new Error(`uploadJpgThenPdfExpectBothVisible: PDF fixture missing: ${pdfPath}`);
    }
    const fileInput = this.page.locator('input[type="file"]').first();
    await fileInput.setInputFiles([
      { name: jpgName, mimeType: "image/jpeg", buffer: MINIMAL_JPEG_BYTES },
      {
        name: path.basename(pdfPath),
        mimeType: "application/pdf",
        buffer: readFileSync(pdfPath),
      },
    ]);
    await expect(async () => {
      const jpgOk = await this.page
        .getByText(new RegExp(jpgName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"))
        .first()
        .isVisible()
        .catch(() => false);
      const pdfOk = await this.page.getByText(/\.pdf/i).first().isVisible().catch(() => false);
      expect(jpgOk && pdfOk).toBeTruthy();
    }).toPass({ timeout: 90000, intervals: [500, 1500, 3000] });
  }

  /** Upload one in-memory or on-disk file via the Upload tab file input. */
  private async uploadFilePayload(
    file: string | { name: string; mimeType: string; buffer: Buffer },
  ): Promise<void> {
    const fileInput = this.page.locator('input[type="file"]');
    const responsePromise = this.page
      .waitForResponse(
        (res: Response) => DOCustomerQuotePostSubmitPage.looksLikeUploadRequest(res.request()),
        { timeout: 25_000 },
      )
      .catch(() => null);

    if ((await fileInput.count()) > 0) {
      await fileInput.first().setInputFiles(file);
    } else {
      const fileChooserPromise = this.page.waitForEvent("filechooser", { timeout: 30_000 });
      await this.browseFilesButton.click();
      const chooser = await fileChooserPromise;
      await chooser.setFiles(file);
    }

    const response = await responsePromise;
    if (response && !response.ok()) {
      throw new Error(
        `Upload HTTP failed: ${response.status()} ${response.statusText()} ${response.url()}`,
      );
    }

    const spinner = this.page.locator(".p-progress-spinner, .p-blockui").first();
    if (await spinner.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await spinner.waitFor({ state: "hidden", timeout: 60_000 });
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * UDP-T3825 — upload enough files to overflow the uploaded-documents grid (default 9).
   * Alternates small JPEG + PDF buffers with unique names so each row is distinct.
   */
  async uploadManyDocumentsToUploadTab(count: number = 9): Promise<void> {
    this.logStep(`Upload Many Documents To Upload Tab (${count})`);
    await this.ensureUploadTab();
    const pdfPath = DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF;
    if (!existsSync(pdfPath)) {
      throw new Error(`uploadManyDocumentsToUploadTab: PDF fixture missing: ${pdfPath}`);
    }
    const pdfBuffer = readFileSync(pdfPath);

    for (let i = 1; i <= count; i++) {
      const suffix = String(i).padStart(2, "0");
      const usePdf = i % 2 === 1;
      const name = usePdf ? `scroll-upload-${suffix}.pdf` : `scroll-upload-${suffix}.jpg`;
      const payload = usePdf
        ? { name, mimeType: "application/pdf", buffer: pdfBuffer }
        : { name, mimeType: "image/jpeg", buffer: MINIMAL_JPEG_BYTES };

      await this.uploadFilePayload(payload);
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      await expect(
        this.uploadTabDocumentsTable()
          .locator("tbody tr")
          .filter({ hasText: new RegExp(escaped, "i") })
          .first(),
      ).toBeVisible({ timeout: 90_000 });
    }
  }

  /** Scroll metrics for the uploaded-documents grid wrapper (PrimeNG datatable). */
  private async uploadTabDocumentsScrollMetrics(): Promise<{
    scrollHeight: number;
    clientHeight: number;
    overflowY: string;
  }> {
    const table = this.uploadTabDocumentsTable();
    return table.evaluate((tbl) => {
      const pick = (el: HTMLElement) => {
        const style = getComputedStyle(el);
        return {
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          overflowY: style.overflowY,
        };
      };

      const wrapper = tbl.closest(
        ".p-datatable-wrapper, .p-datatable-scrollable-body, .p-scroller",
      ) as HTMLElement | null;
      if (wrapper) {
        return pick(wrapper);
      }

      let el: Element | null = tbl.parentElement;
      while (el) {
        if (el instanceof HTMLElement) {
          const style = getComputedStyle(el);
          if (el.scrollHeight > el.clientHeight + 2 && /auto|scroll/i.test(style.overflowY)) {
            return pick(el);
          }
        }
        el = el.parentElement;
      }

      const fallback = tbl.parentElement ?? tbl;
      return pick(fallback instanceof HTMLElement ? fallback : (tbl as HTMLElement));
    });
  }

  /**
   * UDP-T3825 / TC_DOC_016 — when uploads exceed visible grid height, vertical scrolling is available.
   */
  async expectUploadTabDocumentsGridScrollable(minRows: number = 9): Promise<void> {
    this.logStep(`Expect Upload Tab Documents Grid Scrollable (>= ${minRows} rows)`);
    await this.ensureUploadTab();
    const table = this.uploadTabDocumentsTable();
    await expect(table).toBeVisible({ timeout: 30_000 });

    const rows = table.locator("tbody tr");
    await expect
      .poll(async () => rows.count(), { timeout: 30_000, intervals: [400, 1_000] })
      .toBeGreaterThanOrEqual(minRows);

    await expect
      .poll(async () => {
        const m = await this.uploadTabDocumentsScrollMetrics();
        return m.scrollHeight > m.clientHeight + 2;
      }, { timeout: 20_000, intervals: [500, 1_500] })
      .toBe(true);

    const firstRow = rows.first();
    const lastRow = rows.nth(minRows - 1);

    await lastRow.scrollIntoViewIfNeeded();
    await expect(lastRow).toBeVisible({ timeout: 15_000 });

    await firstRow.scrollIntoViewIfNeeded();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
  }

  async expectOversizeBinaryUploadRejected(): Promise<void> {
    await this.ensureUploadTab();
    const hugePath = path.join(tmpdir(), `pw-oversize-${Date.now()}.bin`);
    writeFileSync(hugePath, Buffer.alloc(21 * 1024 * 1024, 7));
    try {
      const fileInput = this.page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(hugePath);
    } finally {
      if (existsSync(hugePath)) unlinkSync(hugePath);
    }
    const err = this.page
      .locator(".p-toast-message-error, .p-message-error, small.p-error, .p-error")
      .filter({ hasText: /20|size|large|limit|MB|exceed|too big|invalid/i })
      .first();
    await expect(err).toBeVisible({ timeout: 120000 });
  }

  /**
   * UDP-T3824 step 1 — **Preview** opens the selected upload in a new tab.
   * Uses the shared toolbar below the grid (select row via checkbox first).
   */
  async expectUploadTabPreviewOpensNewTab(
    fileBasename: string = path.basename(DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF),
  ): Promise<void> {
    this.logStep(`Expect Upload Tab Preview Opens New Tab (${fileBasename})`);
    await this.selectUploadTabRowByBasename(fileBasename);
    const preview = this.uploadTabSharedActionButton("Preview");
    await expect(preview).toBeVisible({ timeout: 20_000 });

    const popupPromise = this.page.waitForEvent("popup", { timeout: 25_000 }).catch(() => null);
    const pagePromise = this.page.context().waitForEvent("page", { timeout: 12_000 }).catch(() => null);
    await preview.scrollIntoViewIfNeeded();
    await preview.click({ timeout: 12_000 });

    const popup = (await popupPromise) ?? (await pagePromise);
    expect(popup, `Preview did not open a new tab for "${fileBasename}"`).toBeTruthy();
    await popup!.close().catch(() => {});
  }

  /**
   * UDP-T3824 step 2 — **Download** saves the selected upload locally.
   * Shared toolbar pattern (QAT 25.0): checkbox row → Download below grid.
   */
  async expectUploadTabDownloadStarts(
    fileBasename: string = path.basename(DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF),
  ): Promise<void> {
    this.logStep(`Expect Upload Tab Download Starts (${fileBasename})`);
    await this.selectUploadTabRowByBasename(fileBasename);
    const downloadBtn = this.uploadTabSharedActionButton("Download");
    await expect(downloadBtn).toBeVisible({ timeout: 20_000 });

    const responseLooksLikeFilePayload = (res: Response): boolean => {
      if (!res.ok() || res.request().method() !== "GET") {
        return false;
      }
      const ct = (res.headers()["content-type"] || "").toLowerCase();
      if (ct.includes("text/html")) {
        return false;
      }
      const cd = (res.headers()["content-disposition"] || "").toLowerCase();
      return (
        /application\/pdf|application\/octet-stream|image\/jpeg|image\/png|attachment|filename=/i.test(
          ct + cd,
        ) || cd.includes("attachment")
      );
    };

    const downloadP = this.page.waitForEvent("download", { timeout: 18_000 }).catch(() => null);
    const popupP = this.page.waitForEvent("popup", { timeout: 8_000 }).catch(() => null);
    const responseP = this.page
      .waitForResponse((r) => responseLooksLikeFilePayload(r), { timeout: 18_000 })
      .catch(() => null);

    await downloadBtn.scrollIntoViewIfNeeded();
    await downloadBtn.click({ timeout: 12_000 });

    const d = await downloadP;
    if (d) {
      await d.path().catch(() => {});
      return;
    }
    const pop = await popupP;
    if (pop) {
      await pop.close().catch(() => {});
      return;
    }
    const res = await responseP;
    if (res) {
      return;
    }

    throw new Error(`Upload tab: Download did not start for "${fileBasename}".`);
  }

  /** UDP-T3824 step 3 — **Delete** removes the selected upload from the grid. */
  async deleteUploadedDocumentTileByBasenameAndExpectRemoved(basename: string): Promise<void> {
    this.logStep(`Delete Uploaded Document And Expect Removed (${basename})`);
    await this.selectUploadTabRowByBasename(basename);
    const deleteBtn = this.uploadTabSharedActionButton("Delete");
    await expect(deleteBtn).toBeVisible({ timeout: 20_000 });

    const escaped = basename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRe = new RegExp(escaped, "i");
    const row = this.uploadTabDocumentsTable().locator("tbody tr").filter({ hasText: nameRe });

    await deleteBtn.scrollIntoViewIfNeeded();
    const deleteResponseP = this.page
      .waitForResponse(
        (r) =>
          /delete|document|upload|attachment|file/i.test(r.url()) &&
          (r.request().method() === "DELETE" || r.request().method() === "POST"),
        { timeout: 20_000 },
      )
      .catch(() => null);
    await deleteBtn.click({ timeout: 12_000 });
    await this.confirmUploadDeleteDialogIfPresent();
    await deleteResponseP;
    await expect(row).toHaveCount(0, { timeout: 45_000 });
  }

  /**
   * After Documents / long flows the header can be off-screen. Bring **workflow status** (Open Quote)
   * or the **Open Quote** control into view before opening the menu so **Submit** / **Withdraw** is reachable.
   */
  private async scrollWorkflowStatusHeaderIntoView(): Promise<void> {
    this.assertPageOpen("scrollWorkflowStatusHeaderIntoView");
    const statusInput = this.workflowStatusOpenQuoteInput();
    if (await statusInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await statusInput.scrollIntoViewIfNeeded();
      return;
    }
    await this.page
      .getByRole("button", { name: /Open\s+Quote/i })
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
  }

  /** Opens the quote **workflow status** menu (same triggers as {@link submitQuoteFromStatusMenu}). */
  private async openWorkflowStatusDropdownInner(): Promise<void> {
    this.assertPageOpen("openWorkflowStatusDropdownInner");
    const p = this.page;
    await p.keyboard.press("Escape").catch(() => {});

    const statusInput = this.workflowStatusOpenQuoteInput();
    if (await statusInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await statusInput.scrollIntoViewIfNeeded();
      await statusInput.click({ timeout: 8_000 });
      if (await this.workflowMenuOverlayLocator().isVisible({ timeout: 2_000 }).catch(() => false)) {
        return;
      }
      const submitVisible = p.locator(':text-is("Submit")').filter({ visible: true }).first();
      if (await submitVisible.isVisible({ timeout: 1_000 }).catch(() => false)) {
        return;
      }
      const selectBtn = p
        .locator('input[name="workFlowStatus"]')
        .locator("xpath=ancestor::p-inputgroup[1]")
        .getByRole("button", { name: /^Select$/i })
        .first();
      if (await selectBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await selectBtn.click({ timeout: 8_000 });
        if (await this.workflowMenuOverlayLocator().isVisible({ timeout: 2_000 }).catch(() => false)) {
          return;
        }
      }
    }

    const openQuote = p.getByRole("button", { name: /Open\s+Quote|Ready\s+for\s+Documentation/i }).first();
    if (await openQuote.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await openQuote.scrollIntoViewIfNeeded();
      await openQuote.click({ timeout: 8_000 });
    }
  }

  private workflowMenuOverlayLocator(): Locator {
    return this.page
      .locator(
        ".textSelectOP, .p-menu-overlay, .p-tieredmenu-overlay, .p-overlaypanel, .p-component-overlay-content, .p-dropdown-panel, .p-select-overlay",
      )
      .filter({ visible: true })
      .filter({ hasText: /Submit|Withdraw|Generate\s+Documentation/i })
      .first();
  }

  /** Withdraw confirmation (`p-dialog.loan-date-dialog`). */
  private withdrawConfirmationDialog(): Locator {
    return this.page
      .locator("p-dialog.loan-date-dialog .p-dialog")
      .filter({ visible: true })
      .first()
      .or(
        this.page
          .getByRole("dialog")
          .filter({ hasText: /withdraw this quote/i })
          .first(),
      );
  }

  private async clickWorkflowMenuItemByRegex(
    itemLabel: RegExp,
    opts?: { pressEscapeAfter?: boolean },
  ): Promise<boolean> {
    const pressEscapeAfter = opts?.pressEscapeAfter ?? true;
    const p = this.page;
    const scopedItem = (root: Locator) =>
      root
        .getByRole("menuitem", { name: itemLabel })
        .or(root.locator("li.p-menuitem, li[role='menuitem']").filter({ hasText: itemLabel }))
        .or(root.locator("a.p-menuitem-link, .p-menuitem-text").filter({ hasText: itemLabel }))
        .or(root.getByRole("option", { name: itemLabel }))
        .or(root.locator("li.p-dropdown-item, li.p-select-option").filter({ hasText: itemLabel }))
        .first();

    const overlayRoots = p
      .locator(
        ".p-menu-overlay, .p-tieredmenu-overlay, .p-overlaypanel, .p-component-overlay-content, .p-dropdown-panel, .p-select-overlay",
      )
      .filter({ visible: true });

    const n = await overlayRoots.count();
    for (let i = 0; i < n; i++) {
      const root = overlayRoots.nth(i);
      if (!(await root.isVisible({ timeout: 600 }).catch(() => false))) continue;
      const target = scopedItem(root);
      if (await target.isVisible({ timeout: 1_200 }).catch(() => false)) {
        await target.scrollIntoViewIfNeeded();
        await target.click({ timeout: 12_000 });
        if (pressEscapeAfter) {
          await p.keyboard.press("Escape").catch(() => {});
        }
        return true;
      }
    }

    for (const candidate of [
      p.getByRole("menuitem", { name: itemLabel }).first(),
      p.locator("li.p-menuitem").filter({ hasText: itemLabel }).first(),
    ]) {
      if (await candidate.isVisible({ timeout: 900 }).catch(() => false)) {
        await candidate.scrollIntoViewIfNeeded();
        await candidate.click({ timeout: 12_000 });
        if (pressEscapeAfter) {
          await p.keyboard.press("Escape").catch(() => {});
        }
        return true;
      }
    }
    return false;
  }

  /**
   * **Workflow status** (shows **Open Quote**) → **Withdraw** → expect confirmation → **Cancel** →
   * assert status still **Open Quote**. Same open-menu behaviour as {@link submitQuoteFromStatusMenu}.
   */
  async expectWorkflowStatusOpenQuote(): Promise<void> {
    this.logStep("Expect workflow status Open Quote");
    this.assertPageOpen("expectWorkflowStatusOpenQuote");
    await this.scrollWorkflowStatusHeaderIntoView();
    const statusInput = this.workflowStatusOpenQuoteInput();
    if (await statusInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(statusInput).toHaveValue(/Open\s+Quote/i, { timeout: 10_000 });
      return;
    }
    await expect(this.page.getByRole("button", { name: /Open\s+Quote/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  /** After **Status** → **Submit** + Originator Declaration — poll for success toast / status copy. */
  async expectWorkflowTransitionSucceeded(): Promise<void> {
    this.logStep("Expect workflow transition succeeded");
    await this.expectPostSubmitWorkflowSuccess();
  }

  async workflowWithdrawThenCancelExpectOpenQuoteStatus(): Promise<void> {
    this.logStep("Workflow: Withdraw → Cancel → expect Open Quote");
    const p = this.page;
    this.assertPageOpen("workflowWithdrawThenCancelExpectOpenQuoteStatus");
    await p.keyboard.press("Escape").catch(() => {});
    await this.scrollWorkflowStatusHeaderIntoView();
    await this.openWorkflowStatusDropdownInner();
    await expect(this.workflowMenuOverlayLocator())
      .toBeVisible({ timeout: 6_000 })
      .catch(() => {});

    const withdrawOption = p
      .locator("div.action-item")
      .filter({ hasText: /^Withdraw$/i })
      .first()
      .or(p.getByText(/^Withdraw$/i).first());

    await expect(withdrawOption).toBeVisible({ timeout: 10_000 });
    await withdrawOption.click({ force: true, timeout: 10_000 });
    await this.postSubmitMicroDelay(150);

    const confirmDlg = this.withdrawConfirmationDialog();
    await expect(confirmDlg).toBeVisible({ timeout: 15_000 });

    const noGoBackBtn = confirmDlg
      .getByRole("button", { name: /No,\s*Go back/i })
      .or(confirmDlg.locator("button.no-btn").first())
      .first();
    await noGoBackBtn.click({ timeout: 12_000 });
    await confirmDlg.waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
    await p.keyboard.press("Escape").catch(() => {});

    const wfInp = p.locator('input[name="workFlowStatus"]').filter({ visible: true }).first();
    if (await wfInp.isVisible({ timeout: 6_000 }).catch(() => false)) {
      await expect(wfInp).toHaveValue(/Open Quote/i, { timeout: 12_000 });
      return;
    }
    await expect(p.getByRole("button", { name: /Open Quote/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  /**
   * **Status** → **Submit** (Quote header). Some products use **Open Quote** + `div.action-item` menu
   * (not `li[role=option]` / `.p-dropdown-panel` only). Handle both.
   */
  async submitQuoteFromStatusMenu(): Promise<void> {
    const p = this.page;
    const submitLabel = /^(Submit|Submit\s+quote)(\s+for\s+review)?$/i;

    const submitAction = p
      .locator("div.action-item, .action-item")
      .filter({ hasText: /^\s*Submit\s*$/i })
      .first();

    const flexSubmit = p
      .locator("div.flex.justify-content-center.action-item")
      .filter({ hasText: /^\s*Submit\s*$/i })
      .first();

    await p.keyboard.press("Escape").catch(() => {});

    await this.scrollWorkflowStatusHeaderIntoView();
    await this.openWorkflowStatusDropdownInner();

    /** Short wait for overlay paint — prefer tight timeouts so retries run quickly. */
    await expect(this.workflowMenuOverlayLocator()).toBeVisible({ timeout: 6_000 }).catch(() => {});

    const clickSubmitMenuItem = async (): Promise<boolean> => {
      const scopedSubmit = (root: Locator) =>
        root
          .getByRole("menuitem", { name: submitLabel })
          .or(root.locator("li.p-menuitem, li[role='menuitem']").filter({ hasText: submitLabel }))
          .or(root.locator("a.p-menuitem-link, .p-menuitem-text").filter({ hasText: submitLabel }))
          .or(root.getByRole("option", { name: submitLabel }))
          .or(root.locator("li.p-dropdown-item, li.p-select-option").filter({ hasText: submitLabel }))
          .or(root.locator("div.action-item, .action-item").filter({ hasText: /^\s*Submit\s*$/i }))
          .or(root.locator(':text-is("Submit")'))
          .first();

      const overlayRoots = p
        .locator(
          ".p-menu-overlay, .p-tieredmenu-overlay, .p-overlaypanel, .p-component-overlay-content, .p-dropdown-panel, .p-select-overlay",
        )
        .filter({ visible: true });

      const n = await overlayRoots.count();
      for (let i = 0; i < n; i++) {
        const root = overlayRoots.nth(i);
        if (!(await root.isVisible({ timeout: 600 }).catch(() => false))) continue;
        const target = scopedSubmit(root);
        if (await target.isVisible({ timeout: 1_200 }).catch(() => false)) {
          await target.scrollIntoViewIfNeeded();
          await target.click({ timeout: 12_000 });
          await p.keyboard.press("Escape").catch(() => {});
          return true;
        }
      }

      /** Unscoped fallbacks (custom split / flex rows attached to `body`). */
      for (const candidate of [
        p.locator(':text-is("Submit")').filter({ visible: true }).first(),
        p.getByRole("button", { name: submitLabel }).filter({ visible: true }).first(),
        p.getByRole("menuitem", { name: submitLabel }).first(),
        p.locator("li.p-menuitem").filter({ hasText: submitLabel }).first(),
        submitAction,
        flexSubmit,
      ]) {
        if (await candidate.isVisible({ timeout: 900 }).catch(() => false)) {
          await candidate.scrollIntoViewIfNeeded();
          await candidate.click({ timeout: 12_000 });
          await p.keyboard.press("Escape").catch(() => {});
          return true;
        }
      }
      return false;
    };

    if (await clickSubmitMenuItem()) {
      await this.postSubmitMicroDelay(80);
      return;
    }

    await p.keyboard.press("Escape").catch(() => {});
    await this.postSubmitMicroDelay(80);
    await this.openWorkflowStatusDropdownInner();
    await expect(this.workflowMenuOverlayLocator()).toBeVisible({ timeout: 3_000 }).catch(() => {});

    if (await clickSubmitMenuItem()) {
      await this.postSubmitMicroDelay(80);
      return;
    }

    const panel = p
      .locator(".p-dropdown-panel, .p-select-overlay, .p-overlaypanel")
      .filter({ visible: true })
      .filter({ hasText: /Submit/i })
      .last();

    if (await panel.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const submitChoices: Locator[] = [
        panel.getByRole("option", { name: submitLabel }),
        panel.locator("li.p-dropdown-item").filter({ hasText: submitLabel }),
        panel.locator("div.action-item, .action-item").filter({ hasText: /^\s*Submit\s*$/i }),
        panel.getByText(submitLabel),
        panel.locator(':text-is("Submit")'),
      ];

      let clicked = false;
      for (const choice of submitChoices) {
        const target = choice.first();
        try {
          await target.waitFor({ state: "visible", timeout: 2_500 });
          await target.scrollIntoViewIfNeeded();
          await target.click({ timeout: 8_000 });
          clicked = true;
          break;
        } catch {
          /* next */
        }
      }
      if (!clicked) {
        await flexSubmit.or(submitAction).first().click({ timeout: 8_000, force: true });
      }
    } else {
      await flexSubmit.or(submitAction).first().click({ timeout: 10_000, force: true });
    }

    await p.waitForTimeout(150);

    await p
      .locator(".p-dropdown-panel, .p-select-overlay, .p-overlaypanel, .p-menu-overlay")
      .filter({ visible: true })
      .waitFor({ state: "hidden", timeout: 8_000 })
      .catch(() => {});
  }

  /**
   * After **Submit** from the quote status menu, some builds show a PrimeNG **Confirm** (`p-confirmdialog`)
   * before **Originator Declaration**. Safe no-op when the dialog is absent (other products / tests).
   */
  async confirmSubmitQuoteDialogIfPresent(): Promise<void> {
    const p = this.page;
    const dialog = p.locator("p-confirmdialog, .p-confirm-dialog").filter({ visible: true }).first();
    try {
      await dialog.waitFor({ state: "visible", timeout: 12_000 });
    } catch {
      return;
    }
    const accept = dialog
      .getByRole("button", { name: /^(Yes|Accept|OK)$/i })
      .or(dialog.locator("button.p-confirm-dialog-accept").first());
    const btn = accept.first();
    try {
      await btn.waitFor({ state: "visible", timeout: 8000 });
      await btn.click({ timeout: 15_000 });
      await p.waitForTimeout(500);
    } catch {
      /* dialog present but unexpected chrome — let completeOriginatorDeclaration / caller surface errors */
    }
    await dialog.waitFor({ state: "hidden", timeout: 25_000 }).catch(() => {});
  }

  /**
   * End-to-end after post-submit work (e.g. Documents **Download** + **Confirm**): open **workflow status**
   * / **Open Quote**, **Submit**, optional **Confirm** dialog, then **Originator Declaration** (tick + Proceed).
   * Prefer this over calling the three steps separately so scroll + timing stay consistent.
   */
  async submitQuoteThroughWorkflowDeclaration(): Promise<void> {
    await this.submitQuoteFromStatusMenu();
    // eslint-disable-next-line no-console
    console.log("Workflow: Submit clicked");
    await this.confirmSubmitQuoteDialogIfPresent();
    await this.completeOriginatorDeclaration();
  }

  /** Poll for success toast/copy/status after Originator Declaration **Proceed** (or lone **Proceed**). */
  private async waitForPostSubmitLoaderGone(timeoutMs = 120_000): Promise<void> {
    const p = this.page;
    const loaders = p.locator(
      ".p-progress-spinner, .p-blockui, progressbar, .p-progressbar, .p-progressbar-indeterminate",
    );
    const n = await loaders.count();
    for (let i = 0; i < n; i++) {
      await loaders
        .nth(i)
        .waitFor({ state: "hidden", timeout: timeoutMs })
        .catch(() => {});
    }
    await p.waitForTimeout(500);
  }

  /** Poll for success toast/copy/status after Originator Declaration **Proceed** (or lone **Proceed**). */
  private async expectPostSubmitWorkflowSuccess(): Promise<void> {
    const p = this.page;
    await p.keyboard.press("Escape").catch(() => {});
    await this.waitForPostSubmitLoaderGone();

    await expect
      .poll(
        async () => {
          const status = await this.readWorkflowStatusText();
          if (
            status.length > 0 &&
            !/Open\s+Quote/i.test(status) &&
            /Submitted|Assessment|Credit Hold|Ready|Documentation|Awaiting|Pending|In\s+Progress/i.test(status)
          ) {
            return true;
          }

          const toast = p
            .locator(".p-toast-message-success, .p-toast-message-info, .p-toast")
            .filter({
              hasText: /success|submitted|complete|accepted|processed|thank you/i,
            });
          if (await toast.first().isVisible().catch(() => false)) {
            return true;
          }

          const body = p
            .getByText(
              /successfully\s+submitted|submitted\s+successfully|quote.*submitted|submission.*successful|successfully/i,
            )
            .first();
          if (await body.isVisible().catch(() => false)) {
            return true;
          }

          const statusChip = p
            .locator(".col-2.status, [class*='status']")
            .filter({
              hasText: /Submitted|Assessment|Complete|Accepted|Succeed|Pending|In\s+Progress/i,
            });
          if (await statusChip.first().isVisible().catch(() => false)) {
            return true;
          }

          const err = p
            .locator(".p-toast-message-error, .p-inline-message-error, .p-message-error")
            .filter({ visible: true })
            .first();
          if (await err.isVisible().catch(() => false)) {
            const errText = ((await err.textContent().catch(() => "")) ?? "").trim();
            throw new Error(`Quote submit failed: ${errText || "unknown portal error"}`);
          }

          return false;
        },
        { timeout: 120_000, intervals: [500, 1_000, 2_000] },
      )
      .toBeTruthy()
      .catch(async () => {
        const status = await this.readWorkflowStatusText();
        throw new Error(
          `Workflow status did not transition after submit (last status: "${status || "unknown"}").`,
        );
      });
  }

  /**
   * Originator Declaration: tick the first two statement checkboxes, then **Proceed**.
   * Dialog accessible name / title copy varies; some builds open a plain `.p-dialog` without `aria-labelledby`.
   */
  async completeOriginatorDeclaration(): Promise<void> {
    const p = this.page;
    await p.waitForTimeout(400);
    await p.waitForLoadState("domcontentloaded").catch(() => {});

    const flexDialog = p
      .locator(".p-dialog")
      .filter({ visible: true })
      .filter({
        hasText: /Originator|Declaration\s+by|Declaration|I\s+declare|originator declaration/i,
      })
      .first();

    const dialogWithProceed = p
      .locator(".p-dialog")
      .filter({ visible: true })
      .filter({ has: p.getByRole("button", { name: /^Proceed$/i }) })
      .filter({
        hasText: /Originator|Declaration|declare|originator/i,
      })
      .first();

    const dialog = p
      .getByRole("dialog", {
        name: /Originator\s+Declaration|Originator\s+declaration/i,
      })
      .or(flexDialog)
      .or(dialogWithProceed)
      .or(
        p
          .locator("[role='dialog']")
          .filter({ visible: true })
          .filter({
            has: p.getByText(/Originator|Declaration by the originator|I declare/i),
          })
          .first(),
      );

    let scope: Locator;
    try {
      await dialog.waitFor({ state: "visible", timeout: 120_000 });
      scope = dialog;
    } catch {
      const proceedLoose = p.getByRole("button", { name: /^Proceed$/i }).first();
      if (await proceedLoose.isVisible({ timeout: 12_000 }).catch(() => false)) {
        // eslint-disable-next-line no-console
        console.log("Workflow: Final submit clicked");
        await proceedLoose.click({ timeout: 15_000 }).catch(() => {});
        await this.expectPostSubmitWorkflowSuccess();
        // eslint-disable-next-line no-console
        console.log("Workflow: Quote submitted");
      }
      return;
    }

    const content = scope.locator(".p-dialog-content, [data-pc-section='content']").first().or(scope);
    const hosts = content.locator("p-checkbox");
    const hostCount = await hosts.count();
    const tickDeclarationCheckbox = async (host: Locator): Promise<void> => {
      const visibleBox = host.locator("div.p-checkbox-box:visible").first();
      await visibleBox.waitFor({ state: "visible", timeout: 15_000 });
      await visibleBox.scrollIntoViewIfNeeded();
      await visibleBox.evaluate((el) =>
        (el as HTMLElement).scrollIntoView({ block: "center", inline: "nearest" }),
      );

      const isChecked = async (): Promise<boolean> => {
        const visual = await host
          .locator(".p-checkbox-box.p-checkbox-checked, .p-checkbox-box.p-highlight")
          .first()
          .isVisible({ timeout: 1_500 })
          .catch(() => false);
        if (visual) return true;
        const input = host.locator('input[type="checkbox"]').first();
        return input.isChecked().catch(() => false);
      };

      if (await isChecked()) return;

      await visibleBox.click({ timeout: 10_000 });
      if (await isChecked()) return;

      await visibleBox.click({ force: true, timeout: 10_000 });
      if (await isChecked()) return;

      const input = host.locator('input[type="checkbox"]').first();
      await input.check({ force: true }).catch(() => {});
      await expect.poll(isChecked, { timeout: 8_000 }).toBeTruthy();
    };

    if (hostCount >= 2) {
      for (let i = 0; i < 2; i++) {
        await tickDeclarationCheckbox(hosts.nth(i));
        await p.waitForTimeout(150);
      }
    } else {
      const boxes = scope.locator(".p-checkbox-box:visible");
      const n = await boxes.count();
      const limit = Math.min(2, n);
      for (let i = 0; i < limit; i++) {
        const box = boxes.nth(i);
        const host = box.locator("xpath=ancestor::p-checkbox[1]");
        if ((await host.count()) > 0) {
          await tickDeclarationCheckbox(host);
        } else {
          await box.scrollIntoViewIfNeeded();
          await box.click({ timeout: 10_000, force: true });
        }
        await p.waitForTimeout(150);
      }
    }
    // eslint-disable-next-line no-console
    console.log("Workflow: Declaration checked");

    const proceed = scope
      .getByRole("button", { name: /^Proceed$/i })
      .or(scope.locator(':text-is("Proceed")'))
      .first();
    await proceed.waitFor({ state: "visible", timeout: 15_000 });
    await expect(proceed).toBeEnabled({ timeout: 30_000 });
    await proceed.click({ timeout: 10_000 });
    // eslint-disable-next-line no-console
    console.log("Workflow: Final submit clicked");
    await this.waitForPostSubmitLoaderGone();
    await scope.waitFor({ state: "hidden", timeout: 45_000 }).catch(() => {});
    if (await scope.isVisible({ timeout: 500 }).catch(() => false)) {
      const err = p
        .locator(".p-toast-message-error, .p-inline-message-error, .p-message-error")
        .filter({ visible: true })
        .first();
      const errText = (await err.textContent().catch(() => ""))?.trim();
      throw new Error(
        `Originator Declaration did not close after Proceed${errText ? `: ${errText}` : ""}`,
      );
    }
    await this.expectPostSubmitWorkflowSuccess();
    // eslint-disable-next-line no-console
    console.log("Workflow: Quote submitted");
  }

  /** Post-submission document strip (`Upload` / `Documents` / `Signing`). */
  documentManagementStrip(): Locator {
    return this.documentManagementTabView();
  }

  /**
   * UDP-T3823 / TC_DOC_014 — Upload tab uploaded-documents grid (display-only, FIS/AF).
   * QAT 25.0 **Upload** tab renders **Name**, **Loaded On**, **Loaded By**, **Source** (see TC_DOC_014 screenshot).
   * Zephyr also lists Category + Type; those headers are not on this grid in the current build.
   */
  async expectUploadTabUploadedDocumentsGridColumns(
    filePath: string = DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF,
  ): Promise<void> {
    this.logStep("Expect Upload Tab Uploaded Documents Grid Columns");
    await this.ensureUploadTab();
    const panel = this.uploadTabContentPanel();
    await panel.waitFor({ state: "visible", timeout: 60_000 });
    await panel.scrollIntoViewIfNeeded().catch(() => {});

    const table = panel.locator("table").first();
    await expect(table).toBeVisible({ timeout: 30_000 });

    const headerCell = (label: RegExp): Locator =>
      table
        .getByRole("columnheader", { name: label })
        .or(table.locator("thead th").filter({ hasText: label }));

    for (const hdr of [/Name/i, /Loaded On/i, /Loaded By/i, /Source/i]) {
      await expect(headerCell(hdr).first()).toBeVisible({ timeout: 20_000 });
    }

    const basename = path.basename(filePath);
    const escaped = basename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const row = table.locator("tbody tr").filter({ hasText: new RegExp(escaped, "i") }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });

    // Name — alphanumeric file name (display-only).
    await expect(row.getByText(new RegExp(escaped, "i")).first()).toBeVisible({ timeout: 15_000 });

    const rowText = (await row.innerText()).replace(/\s+/g, " ").trim();

    // Loaded On — DD/MM/YYYY (time may be omitted on some builds).
    expect(rowText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);

    // Loaded By — populated user id from AF (e.g. SIDDHANT.MAGAR).
    expect(rowText).toMatch(/[A-Za-z][A-Za-z0-9._-]+/);

    // Source — manual upload shows "Uploaded"; e-sign flow shows "Electronically Signed".
    expect(rowText).toMatch(/\bUploaded\b|\bElectronically Signed\b/);

    // Row actions — shared toolbar below the grid (Preview | Download | Delete).
    for (const action of ["Preview", "Download", "Delete"] as const) {
      await expect(this.uploadTabSharedActionButton(action)).toBeVisible({ timeout: 15_000 });
    }
  }

  /** Active **Documents** tab panel (generated-documents grid + toolbar). */
  private async generatedDocumentsContentPanel(): Promise<Locator> {
    let root = this.documentManagementTabView();
    if ((await root.count()) === 0) {
      root = this.page
        .locator(".p-tabview")
        .filter({ has: this.page.getByRole("tab", { name: /^Documents$/i }) })
        .first();
    }
    await root.waitFor({ state: "visible", timeout: 30_000 });

    const documentsPanel = root.locator(".p-tabview-panel").filter({
      has: root.locator("table tbody tr").first(),
    });
    const panelByRole = root.getByRole("tabpanel", { name: /^Documents$/i });
    const visibleDocPanel = documentsPanel.filter({ visible: true }).first();
    if ((await visibleDocPanel.count()) > 0 && (await visibleDocPanel.isVisible().catch(() => false))) {
      return visibleDocPanel;
    }
    if ((await panelByRole.count()) > 0) {
      return panelByRole.filter({ visible: true }).first();
    }
    return root
      .locator(".p-tabview-panel")
      .filter({ visible: true })
      .filter({ has: root.locator("table tbody tr") })
      .first();
  }

  private generatedDocumentsPurchaseInvoiceRow(): Locator {
    return this.documentManagementStrip()
      .locator("tbody tr")
      .filter({ hasText: /Purchase\s*Invoice/i })
      .first();
  }

  private async generatedDocumentsSharedActionButton(
    action: "Preview" | "Download" | "Print",
  ): Promise<Locator> {
    const panel = await this.generatedDocumentsContentPanel();
    const rx = new RegExp(`^${action}$`, "i");
    return panel
      .getByRole("link", { name: rx })
      .or(panel.getByRole("button", { name: rx }))
      .or(panel.locator("a, button").filter({ hasText: rx }))
      .filter({ visible: true })
      .last();
  }

  /** Select a Generated Documents grid row by document-name pattern (checkbox). */
  async selectGeneratedDocumentsRowByDocumentName(namePattern: RegExp): Promise<Locator> {
    await this.openDocumentsTab();
    const row = await this.generatedDocumentsRowByName(namePattern);
    await expect(row).toBeVisible({ timeout: 60_000 });
    const box = row.locator(".p-checkbox-box").first();
    await box.scrollIntoViewIfNeeded();
    const checked = row.locator(".p-checkbox-box.p-highlight");
    if (!(await checked.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await box.click({ timeout: 10_000 });
    }
    await checked.waitFor({ state: "visible", timeout: 15_000 });
    return row;
  }

  /** Generated Documents grid inside the active **Documents** tab panel (not Upload / Credit Conditions). */
  private async generatedDocumentsDataTable(): Promise<Locator> {
    await this.openDocumentsTab();
    const panel = await this.generatedDocumentsContentPanel();
    const table = panel.locator("table").first();
    await expect(table).toBeVisible({ timeout: 30_000 });
    return table;
  }

  /** UDP-T3837 — number of selectable Generated Documents grid rows. */
  async countGeneratedDocumentsRows(): Promise<number> {
    this.logStep("Count Generated Documents Rows");
    const rows = (await this.generatedDocumentsDataTable()).locator("tbody tr");
    let count = 0;
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      if (!(await row.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }
      const box = row.locator(".p-checkbox-box").first();
      if (!(await box.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }
      const text = (await row.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
      if (text.length > 0) {
        count += 1;
      }
    }
    return count;
  }

  /** UDP-T3836 — count Generated Documents rows for a document name (version/history rows included). */
  async countGeneratedDocumentsRowsByDocumentName(namePattern: RegExp): Promise<number> {
    this.logStep(`Count Generated Documents Rows By Document Name: ${namePattern.source}`);
    const rows = (await this.generatedDocumentsDataTable())
      .locator("tbody tr")
      .filter({ hasText: namePattern });
    let count = 0;
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      if (await rows.nth(i).isVisible({ timeout: 500 }).catch(() => false)) {
        count += 1;
      }
    }
    return count;
  }

  /** UDP-T3836 — poll until the Generated Documents grid shows the expected row count for a document name. */
  async expectGeneratedDocumentsRowCountByDocumentName(
    namePattern: RegExp,
    expected: number,
  ): Promise<void> {
    this.logStep(
      `Expect Generated Documents Row Count By Document Name: ${namePattern.source} = ${expected}`,
    );
    await expect
      .poll(async () => this.countGeneratedDocumentsRowsByDocumentName(namePattern), {
        timeout: 120_000,
        intervals: [1_000, 2_000, 5_000],
      })
      .toBe(expected);
  }

  /** UDP-T3835 / UDP-T3836 — history icon absent when only the latest version is retained. */
  async expectGeneratedDocumentHistoryIconHidden(namePattern: RegExp): Promise<void> {
    this.logStep("Expect Generated Document History Icon Hidden");
    const row = await this.generatedDocumentsRowByName(namePattern);
    await expect(row).toBeVisible({ timeout: 30_000 });
    const historyColIdx = await this.generatedDocumentsHistoryColumnIndex();
    const history = row
      .locator("td")
      .nth(historyColIdx)
      .locator(
        ".fa-history, .fa-clock-rotate-left, i[class*='history'], button[class*='history'], [class*='history']",
      )
      .filter({ visible: true });
    await expect(history).toHaveCount(0, { timeout: 8_000 });
  }

  /**
   * UDP-T3836 — after manual re-generation (**Download** / **Preview**), portal retains a single
   * row with an advanced **Date & Time** (historical AF versions are not listed separately).
   */
  async expectManuallyGeneratedHistoricalVersionReplacedInPortal(
    namePattern: RegExp,
    beforeTimestamp: string,
  ): Promise<string> {
    this.logStep("Expect Manually Generated Historical Version Replaced In Portal");
    const normalizedBefore =
      DOCustomerQuotePostSubmitPage.normalizeGeneratedDocumentDateTimeText(beforeTimestamp);
    const beforeMs =
      DOCustomerQuotePostSubmitPage.parseGeneratedDocumentDateTimeMs(normalizedBefore);
    this.logStep(
      `Regeneration audit — beforeTimestamp="${normalizedBefore}" (${beforeMs} ms)`,
    );

    await expect
      .poll(async () => this.countGeneratedDocumentsRowsByDocumentName(namePattern), {
        timeout: 120_000,
        intervals: [1_000, 2_000, 5_000],
      })
      .toBe(1);

    let latest = normalizedBefore;
    let pollAttempt = 0;
    let lastAudit = await this.auditGeneratedDocumentRegenerationState(namePattern);
    this.logStep(
      `Regeneration audit — initial grid: rows=${lastAudit.rowCount}, timestamps=[${lastAudit.timestamps.join("; ")}], historyIcon=${lastAudit.historyIconVisible}`,
    );

    try {
      await expect
        .poll(
          async () => {
            pollAttempt += 1;
            lastAudit = await this.auditGeneratedDocumentRegenerationState(namePattern);
            latest = lastAudit.latestTimestamp || latest;
            const latestMs = lastAudit.latestMs;
            const advanced = latestMs > beforeMs && latest.trim() !== normalizedBefore.trim();
            this.logStep(
              `Regeneration poll #${pollAttempt}: read="${latest}" (${latestMs} ms), before="${normalizedBefore}" (${beforeMs} ms), rows=${lastAudit.rowCount}, historyIcon=${lastAudit.historyIconVisible}, advanced=${advanced}`,
            );
            return advanced;
          },
          { timeout: 120_000, intervals: [1_000, 2_000, 5_000] },
        )
        .toBe(true);
    } catch (error) {
      const finalAudit = await this.auditGeneratedDocumentRegenerationState(namePattern);
      const diagnosis =
        finalAudit.latestTimestamp.trim() === normalizedBefore.trim()
          ? "UI Date & Time unchanged after regeneration — regeneration may not have produced a new AF version, or the portal grid did not refresh."
          : `UI Date & Time changed to "${finalAudit.latestTimestamp}" but chronological comparison failed (before=${beforeMs} ms, latest=${finalAudit.latestMs} ms).`;
      throw new Error(
        [
          `Generated Documents regeneration timestamp poll failed for ${namePattern.source}.`,
          `before="${normalizedBefore}" (${beforeMs} ms)`,
          `latest="${finalAudit.latestTimestamp}" (${finalAudit.latestMs} ms)`,
          `visibleRows=${finalAudit.rowCount}, timestamps=[${finalAudit.timestamps.join("; ")}]`,
          `historyIconVisible=${finalAudit.historyIconVisible}`,
          `rowTexts=[${finalAudit.rowTexts.join(" | ")}]`,
          diagnosis,
        ].join(" "),
        { cause: error instanceof Error ? error : undefined },
      );
    }

    if (lastAudit.historyIconVisible) {
      this.logStep(
        "Regeneration audit — History column icon still visible (View Latest / matrix behaviour; TC_DOC_027 verifies single portal row + updated Date & Time only).",
      );
    }
    return latest;
  }

  /**
   * UDP-T3837 — select Generated Documents rows by **zero-based** index (unchecks all others).
   */
  async setGeneratedDocumentsRowSelection(indices: number[]): Promise<void> {
    this.logStep(`Set Generated Documents Row Selection: ${indices.join(", ")}`);
    const rows = (await this.generatedDocumentsDataTable()).locator("tbody tr");
    const want = new Set(indices);
    const n = await rows.count();
    let visibleIndex = 0;

    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      if (!(await row.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }
      const box = row.locator(".p-checkbox-box").first();
      if (!(await box.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }
      const text = (await row.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
      if (!text) {
        continue;
      }

      const shouldCheck = want.has(visibleIndex);
      const checked = row.locator(".p-checkbox-box.p-highlight");
      const isChecked = await checked.isVisible({ timeout: 400 }).catch(() => false);
      if (shouldCheck !== isChecked) {
        await box.scrollIntoViewIfNeeded();
        await box.click({ timeout: 8_000 });
        if (shouldCheck) {
          await expect(checked).toBeVisible({ timeout: 8_000 });
        } else {
          await expect(checked).toHaveCount(0, { timeout: 8_000 });
        }
      }
      visibleIndex += 1;
    }

    for (const idx of indices) {
      expect(
        visibleIndex,
        `Generated Documents row index ${idx} is out of range (${visibleIndex} visible row(s)).`,
      ).toBeGreaterThan(idx);
    }
  }

  /**
   * UDP-T3837 — **Preview** opens `expectedTabCount` new browser tab(s) for the current selection.
   */
  async expectGeneratedDocumentsPreviewOpensTabs(expectedTabCount: number): Promise<void> {
    this.logStep(`Expect Generated Documents Preview Opens ${expectedTabCount} Tab(s)`);
    if (expectedTabCount < 1) {
      throw new Error("expectGeneratedDocumentsPreviewOpensTabs: expectedTabCount must be >= 1.");
    }

    const preview = await this.generatedDocumentsSharedActionButton("Preview");
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await preview.scrollIntoViewIfNeeded();

    const context = this.page.context();
    const pagesBefore = context.pages().length;

    if (expectedTabCount === 1) {
      const popupPromise = this.page.waitForEvent("popup", { timeout: 25_000 }).catch(() => null);
      const pagePromise = context.waitForEvent("page", { timeout: 12_000 }).catch(() => null);
      await preview.click({ timeout: 12_000 });
      const popup = (await popupPromise) ?? (await pagePromise);
      expect(popup, "Generated Documents Preview did not open a new tab").toBeTruthy();
      await popup!.close().catch(() => {});
      return;
    }

    await preview.click({ timeout: 12_000 });
    await expect
      .poll(async () => context.pages().length - pagesBefore, {
        timeout: 30_000,
        intervals: [400, 800, 1_500, 3_000],
      })
      .toBe(expectedTabCount);

    const opened = context.pages().slice(pagesBefore);
    expect(opened.length).toBeGreaterThanOrEqual(expectedTabCount);
    for (const tab of opened.slice(0, expectedTabCount)) {
      await tab.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
      await tab.close().catch(() => {});
    }
  }

  /** UDP-T3850 — **Purchase Invoice** row visible on Generated Documents tab. */
  async expectPurchaseInvoiceVisibleInGeneratedDocuments(): Promise<void> {
    this.logStep("Expect Purchase Invoice Visible In Generated Documents");
    await this.openDocumentsTab();
    const row = this.generatedDocumentsPurchaseInvoiceRow();
    await expect
      .poll(async () => row.isVisible().catch(() => false), {
        timeout: 120_000,
        intervals: [1_000, 2_500, 5_000],
      })
      .toBe(true);
    const rowText = (await row.innerText()).replace(/\s+/g, " ").trim();
    expect(rowText).toMatch(/Purchase\s*Invoice/i);
  }

  /** UDP-T3851 — **Preview** opens Purchase Invoice in a new tab. */
  async expectPurchaseInvoicePreviewOpensNewTab(): Promise<void> {
    this.logStep("Expect Purchase Invoice Preview Opens New Tab");
    await this.selectGeneratedDocumentsRowByDocumentName(/Purchase\s*Invoice/i);
    const preview = await this.generatedDocumentsSharedActionButton("Preview");
    await expect(preview).toBeVisible({ timeout: 20_000 });

    const popupPromise = this.page.waitForEvent("popup", { timeout: 25_000 }).catch(() => null);
    const pagePromise = this.page.context().waitForEvent("page", { timeout: 12_000 }).catch(() => null);
    await preview.scrollIntoViewIfNeeded();
    await preview.click({ timeout: 12_000 });

    const popup = (await popupPromise) ?? (await pagePromise);
    expect(popup, "Preview did not open a new tab for Purchase Invoice").toBeTruthy();
    await popup!.close().catch(() => {});
  }

  /** UDP-T3851 — **Download** saves Purchase Invoice locally. */
  async expectPurchaseInvoiceDownloadStarts(): Promise<void> {
    this.logStep("Expect Purchase Invoice Download Starts");
    await this.selectGeneratedDocumentsRowByDocumentName(/Purchase\s*Invoice/i);
    const downloadBtn = await this.generatedDocumentsSharedActionButton("Download");
    await expect(downloadBtn).toBeVisible({ timeout: 20_000 });

    const responseLooksLikeFilePayload = (res: Response): boolean => {
      if (!res.ok() || res.request().method() !== "GET") {
        return false;
      }
      const ct = (res.headers()["content-type"] || "").toLowerCase();
      if (ct.includes("text/html")) {
        return false;
      }
      const cd = (res.headers()["content-disposition"] || "").toLowerCase();
      return (
        /application\/pdf|application\/octet-stream|attachment|filename=/i.test(ct + cd) ||
        cd.includes("attachment")
      );
    };

    const downloadP = this.page.waitForEvent("download", { timeout: 18_000 }).catch(() => null);
    const popupP = this.page.waitForEvent("popup", { timeout: 8_000 }).catch(() => null);
    const responseP = this.page
      .waitForResponse((r) => responseLooksLikeFilePayload(r), { timeout: 18_000 })
      .catch(() => null);

    await downloadBtn.scrollIntoViewIfNeeded();
    await downloadBtn.click({ timeout: 12_000 });

    const d = await downloadP;
    if (d) {
      await d.path().catch(() => {});
      return;
    }
    const pop = await popupP;
    if (pop) {
      await pop.close().catch(() => {});
      return;
    }
    const res = await responseP;
    if (res) {
      return;
    }

    throw new Error("Generated Documents: Download did not start for Purchase Invoice.");
  }

  /** UDP-T3829 — Generated **Documents** tab grid headers (best-effort). */
  async expectGeneratedDocumentsTabColumnHeaders(): Promise<void> {
    this.logStep("Expect Generated Documents Tab Column Headers");
    await this.openDocumentsTab();
    const strip = this.documentManagementStrip();
    const patterns = [
      /Select All/i,
      /Date\s*&\s*Time|Date and Time/i,
      /Document Name/i,
      /E-?Sign/i,
      /Preview/i,
      /Download/i,
      /Print/i,
    ];
    for (const rx of patterns) {
      await expect
        .soft(strip.getByText(rx).or(strip.getByRole("columnheader", { name: rx })).first())
        .toBeVisible({ timeout: 25_000 });
    }
  }

  /** UDP-T3829 / UDP-T3859 — **Date & Time** cell (DD/MM/YYYY with optional `|` or space before time). */
  static readonly GENERATED_DOC_DATE_TIME_RX =
    /\d{1,2}\/\d{1,2}\/\d{4}(?:\s*(?:\|\s*)?\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)?/i;

  /** Normalize portal **Date & Time** copy (`29/06/2026 | 10:00 PM` → `29/06/2026 10:00 PM`). */
  static normalizeGeneratedDocumentDateTimeText(value: string): string {
    return value
      .replace(/\s*\|\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Extract the **Date & Time** token from a grid cell or row snippet. */
  static extractGeneratedDocumentDateTime(value: string): string {
    const normalized = DOCustomerQuotePostSubmitPage.normalizeGeneratedDocumentDateTimeText(value);
    const match = normalized.match(DOCustomerQuotePostSubmitPage.GENERATED_DOC_DATE_TIME_RX);
    if (!match) {
      throw new Error(`Could not extract Generated Documents Date & Time from "${value}".`);
    }
    return DOCustomerQuotePostSubmitPage.normalizeGeneratedDocumentDateTimeText(match[0]);
  }

  /** Parse Generated Documents **Date & Time** for chronological comparison (local calendar). */
  static parseGeneratedDocumentDateTimeMs(value: string): number {
    const trimmed = DOCustomerQuotePostSubmitPage.normalizeGeneratedDocumentDateTimeText(value);
    const match = trimmed.match(DOCustomerQuotePostSubmitPage.GENERATED_DOC_DATE_TIME_RX);
    if (!match) {
      throw new Error(`Could not parse Generated Documents Date & Time from "${trimmed}".`);
    }
    const normalized = DOCustomerQuotePostSubmitPage.normalizeGeneratedDocumentDateTimeText(match[0]);
    const [datePart, timePart = "00:00"] = normalized.split(/\s+/, 2);
    const [day, month, year] = datePart.split("/").map((part) => Number(part));
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AP]M))?$/i);
    if (timeMatch) {
      hours = Number(timeMatch[1]);
      minutes = Number(timeMatch[2]);
      seconds = timeMatch[3] ? Number(timeMatch[3]) : 0;
      const meridiem = timeMatch[4]?.toUpperCase();
      if (meridiem === "PM" && hours < 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
    }
    return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
  }

  /** Zero-based **Date & Time** column index in the Generated Documents grid. */
  private async generatedDocumentsDateTimeColumnIndex(): Promise<number> {
    const table = await this.generatedDocumentsDataTable();
    const headers = table.locator("thead th");
    const n = await headers.count();
    for (let i = 0; i < n; i++) {
      const text = (await headers.nth(i).innerText()).replace(/\s+/g, " ").trim();
      if (/Date\s*&\s*Time|Date and Time/i.test(text)) {
        return i;
      }
    }
    return 2;
  }

  /** Zero-based **History** column index in the Generated Documents grid. */
  private async generatedDocumentsHistoryColumnIndex(): Promise<number> {
    const table = await this.generatedDocumentsDataTable();
    const headers = table.locator("thead th");
    const n = await headers.count();
    for (let i = 0; i < n; i++) {
      const text = (await headers.nth(i).innerText()).replace(/\s+/g, " ").trim();
      if (/^History$/i.test(text)) {
        return i;
      }
    }
    return 3;
  }

  /** Read **Date & Time** from a Generated Documents row's dedicated column cell. */
  private async readGeneratedDocumentDateTimeFromRow(row: Locator): Promise<string> {
    const colIdx = await this.generatedDocumentsDateTimeColumnIndex();
    const cell = row.locator("td").nth(colIdx);
    await expect(cell).toBeVisible({ timeout: 15_000 });
    const cellText = (await cell.innerText()).replace(/\s+/g, " ").trim();
    if (!cellText || cellText === "-") {
      throw new Error(`Generated Documents Date & Time cell is empty: "${cellText}"`);
    }
    return DOCustomerQuotePostSubmitPage.extractGeneratedDocumentDateTime(cellText);
  }

  /** Visible Generated Documents rows matching `namePattern` (newest **Date & Time** first). */
  private async generatedDocumentsRowsByNameVisible(namePattern: RegExp): Promise<Locator[]> {
    const panel = await this.generatedDocumentsContentPanel();
    const rows = panel.locator("tbody tr").filter({ hasText: namePattern });
    const n = await rows.count();
    const visible: Array<{ row: Locator; ms: number; timestamp: string }> = [];

    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      if (!(await row.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }
      let timestamp = "";
      let ms = Number.NEGATIVE_INFINITY;
      try {
        timestamp = await this.readGeneratedDocumentDateTimeFromRow(row);
        ms = DOCustomerQuotePostSubmitPage.parseGeneratedDocumentDateTimeMs(timestamp);
      } catch {
        timestamp = "";
      }
      visible.push({ row, ms, timestamp });
    }

    visible.sort((a, b) => b.ms - a.ms);
    return visible.map((entry) => entry.row);
  }

  private async generatedDocumentsRowByName(namePattern: RegExp): Promise<Locator> {
    const rows = await this.generatedDocumentsRowsByNameVisible(namePattern);
    if (rows.length === 0) {
      const panel = await this.generatedDocumentsContentPanel();
      return panel.locator("tbody tr").filter({ hasText: namePattern }).first();
    }
    return rows[0];
  }

  /** UDP-T3836 diagnostics — row count, timestamps, history icon, and raw grid copy. */
  async auditGeneratedDocumentRegenerationState(namePattern: RegExp): Promise<{
    rowCount: number;
    timestamps: string[];
    latestTimestamp: string;
    latestMs: number;
    historyIconVisible: boolean;
    rowTexts: string[];
  }> {
    await this.openDocumentsTab();
    const panel = await this.generatedDocumentsContentPanel();
    const rows = panel.locator("tbody tr").filter({ hasText: namePattern });
    const historyColIdx = await this.generatedDocumentsHistoryColumnIndex();
    const timestamps: string[] = [];
    const rowTexts: string[] = [];
    let latestTimestamp = "";
    let latestMs = Number.NEGATIVE_INFINITY;
    let historyIconVisible = false;
    let rowCount = 0;

    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      if (!(await row.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }
      rowCount += 1;
      const rowText = (await row.innerText()).replace(/\s+/g, " ").trim();
      rowTexts.push(rowText);

      try {
        const timestamp = await this.readGeneratedDocumentDateTimeFromRow(row);
        timestamps.push(timestamp);
        const ms = DOCustomerQuotePostSubmitPage.parseGeneratedDocumentDateTimeMs(timestamp);
        if (ms >= latestMs) {
          latestMs = ms;
          latestTimestamp = timestamp;
        }
      } catch {
        timestamps.push("(empty)");
      }

      const historyCell = row.locator("td").nth(historyColIdx);
      const history = historyCell
        .locator(
          ".fa-history, .fa-clock-rotate-left, i[class*='history'], button[class*='history'], [class*='history']",
        )
        .filter({ visible: true });
      if (await history.count()) {
        historyIconVisible = true;
      }
    }

    return {
      rowCount,
      timestamps,
      latestTimestamp,
      latestMs: Number.isFinite(latestMs) ? latestMs : 0,
      historyIconVisible,
      rowTexts,
    };
  }

  /** UDP-T3859 — read **Date & Time** for a Generated Documents row (opens **Documents** tab). */
  async readGeneratedDocumentDateTime(namePattern: RegExp): Promise<string> {
    this.logStep("Read Generated Document Date Time");
    await this.openDocumentsTab();
    const row = await this.generatedDocumentsRowByName(namePattern);
    await expect(row).toBeVisible({ timeout: 60_000 });
    return this.readGeneratedDocumentDateTimeFromRow(row);
  }

  /** Poll until **Date & Time** is populated on a Generated Documents row (after first generation). */
  async readGeneratedDocumentDateTimeWhenReady(namePattern: RegExp): Promise<string> {
    this.logStep("Read Generated Document Date Time When Ready");
    let latest = "";
    await expect
      .poll(
        async () => {
          try {
            latest = await this.readGeneratedDocumentDateTime(namePattern);
            return latest.length > 0;
          } catch {
            return false;
          }
        },
        { timeout: 120_000, intervals: [1_000, 2_000, 5_000] },
      )
      .toBe(true);
    return latest;
  }

  /** UDP-T3859 — workflow header shows **Ready for Documentation**. */
  async expectWorkflowStatusReadyForDocumentation(): Promise<void> {
    this.logStep("Expect Workflow Status Ready For Documentation");
    await this.scrollWorkflowStatusHeaderIntoView();
    await expect
      .poll(async () => /Ready\s+for\s+Documentation/i.test(await this.readWorkflowStatusText()), {
        timeout: 60_000,
        intervals: [500, 1_500, 3_000],
      })
      .toBe(true);
  }

  /** Opens workflow **Status** menu and clicks an action (e.g. **Generate Documentation**). */
  async clickWorkflowStatusMenuItem(itemLabel: RegExp): Promise<void> {
    this.logStep(`Click Workflow Status Menu Item: ${itemLabel.source}`);
    await this.scrollWorkflowStatusHeaderIntoView();
    await this.openWorkflowStatusDropdownInner();
    const clicked = await this.clickWorkflowMenuItemByRegex(itemLabel);
    if (!clicked) {
      throw new Error(`Workflow status menu item not found: ${itemLabel.source}`);
    }
    await this.postSubmitMicroDelay(120);
  }

  /** Confirm / loan-date dialogs after workflow **Status** actions (Generate Documentation, Submit). */
  async confirmWorkflowTransitionDialogsIfPresent(): Promise<void> {
    await this.confirmSubmitQuoteDialogIfPresent();
    const loanDlg = this.page.getByRole("dialog").filter({ hasText: /Loan date is in the past/i });
    if (await loanDlg.isVisible({ timeout: 4_000 }).catch(() => false)) {
      const yes = loanDlg.getByRole("button", { name: /^Yes$/i }).first();
      await yes.click({ timeout: 12_000 });
      await loanDlg.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
      await this.waitUntilNoVisibleAppLoaderOverlays(90_000);
    }
  }

  /**
   * UDP-T3858 / UDP-T3859 — after a quote change, return to **Ready for Documentation** when the
   * workflow offers **Generate Documentation** (no-op when already in that state).
   */
  async advanceToReadyForDocumentationViaGenerateDocumentationIfRequired(): Promise<void> {
    this.logStep("Advance To Ready For Documentation Via Generate Documentation If Required");
    if (/Ready\s+for\s+Documentation/i.test(await this.readWorkflowStatusText())) {
      return;
    }
    await this.clickWorkflowStatusMenuItem(/Generate\s+Documentation/i);
    await this.confirmWorkflowTransitionDialogsIfPresent();
    await expect
      .poll(async () => /Ready\s+for\s+Documentation/i.test(await this.readWorkflowStatusText()), {
        timeout: 120_000,
        intervals: [1_000, 2_500, 5_000],
      })
      .toBe(true);
  }

  /** Jump to **Post Submission** from the Standard Quote header stepper. */
  async clickPostSubmissionStepTab(): Promise<void> {
    this.logStep("Click Post Submission Step Tab");
    const root = this.page.locator("app-quote-details, app-standard-quote").first();
    const tab = root
      .getByRole("tab", { name: /Post Submission/i })
      .or(root.getByRole("link", { name: /Post Submission/i }))
      .or(this.page.getByText(/Post Submission/i).filter({ visible: true }))
      .first();
    await tab.waitFor({ state: "visible", timeout: 30_000 });
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await tab.scrollIntoViewIfNeeded();
    await tab.click({ timeout: 15_000 });
    await this.waitUntilNoVisibleAppLoaderOverlays(60_000);
    await this.expectReopenedPostSubmissionDocumentStripVisible();
  }

  /**
   * UDP-T3859 — poll until Generated Documents **Date & Time** advances after re-generation.
   * @returns Updated timestamp string from the grid.
   */
  async expectGeneratedDocumentTimestampUpdatedAfterRegeneration(
    namePattern: RegExp,
    originalTimestamp: string,
  ): Promise<string> {
    this.logStep("Expect Generated Document Timestamp Updated After Regeneration");
    const originalMs =
      DOCustomerQuotePostSubmitPage.parseGeneratedDocumentDateTimeMs(originalTimestamp);
    let latest = originalTimestamp;

    await expect
      .poll(
        async () => {
          latest = await this.readGeneratedDocumentDateTime(namePattern);
          const latestMs = DOCustomerQuotePostSubmitPage.parseGeneratedDocumentDateTimeMs(latest);
          return latestMs > originalMs && latest.trim() !== originalTimestamp.trim();
        },
        { timeout: 120_000, intervals: [1_000, 2_000, 5_000] },
      )
      .toBe(true);

    await this.openDocumentsTab();
    const row = await this.generatedDocumentsRowByName(namePattern);
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row).toContainText(latest);

    return latest;
  }

  /** UDP-T3830 — click **Select All** on Generated Documents (when present). */
  async clickGeneratedDocumentsSelectAll(): Promise<void> {
    this.logStep("Click Generated Documents Select All");
    await this.openDocumentsTab();
    const strip = this.documentManagementStrip();
    const selectAll = strip
      .getByRole("checkbox", { name: /Select All/i })
      .or(strip.locator("th").filter({ hasText: /Select All/i }).locator(".p-checkbox-box"))
      .or(strip.getByText(/Select All/i).locator("xpath=ancestor::th[1]//div[contains(@class,'p-checkbox-box')]"))
      .first();
    await selectAll.scrollIntoViewIfNeeded();
    await selectAll.click({ timeout: 20_000 });
  }

  /** UDP-T3844 — Credit Conditions tab is not offered during Customer Details. */
  async expectCreditConditionsTabHidden(): Promise<void> {
    this.logStep("Expect Credit Conditions Tab Hidden");
    const tab = this.page
      .getByRole("tab", { name: /Credit Conditions|Additional Approval Conditions/i })
      .or(this.page.getByText(/Credit Conditions|Additional Approval Conditions/i));
    await expect(tab).toHaveCount(0, { timeout: 8_000 });
  }

  /** UDP-T3844 — Credit Conditions tab appears on Post Submission document strip (after mandatory upload). */
  async expectCreditConditionsTabVisible(): Promise<void> {
    this.logStep("Expect Credit Conditions Tab Visible");
    await this.waitForUploadStep();
    const tab = await this.resolveCreditConditionsTab();
    await expect
      .poll(async () => tab.isVisible().catch(() => false), {
        timeout: 120_000,
        intervals: [500, 1_500, 3_000],
      })
      .toBe(true);
  }

  /** UDP-T3845+ — open **Credit Conditions** tab in Post Submission (when AF data exists). */
  async openCreditConditionsTab(): Promise<void> {
    this.logStep("Open Credit Conditions Tab");
    let root = this.documentManagementStrip();
    if ((await root.count()) === 0) {
      root = this.page.locator(".p-tabview").first();
    }
    const tab = await this.resolveCreditConditionsTab();
    await tab.waitFor({ state: "visible", timeout: 60_000 });
    await tab.click({ timeout: 20_000 });
    const panel = await this.creditConditionsTabContentPanel(root);
    await expect(
      panel
        .getByRole("columnheader", { name: /^Condition$/i })
        .or(panel.locator("thead th").filter({ hasText: /^Condition$/i })),
    ).toBeVisible({ timeout: 45_000 });
  }

  /** Strip PrimeNG filter-menu suffix from grid header labels. */
  static normalizeGridHeaderLabel(raw: string): string {
    return raw
      .replace(/\s+/g, " ")
      .replace(/show filter menu/gi, "")
      .trim();
  }

  /** Visible Credit Conditions column headers mapped to zero-based `th` index. */
  private async creditConditionsHeaderColumnMap(table: Locator): Promise<Map<string, number>> {
    const headers = table.locator("thead th");
    const n = await headers.count();
    const map = new Map<string, number>();

    for (let i = 0; i < n; i++) {
      const th = headers.nth(i);
      if (!(await th.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }
      const label = DOCustomerQuotePostSubmitPage.normalizeGridHeaderLabel(
        (await th.innerText().catch(() => "")) ?? "",
      );
      if (label) {
        map.set(label.toLowerCase(), i);
      }
    }
    return map;
  }

  /**
   * UDP-T3845 — read visible Credit Conditions data rows using header labels
   * (**Condition** / **Customer**), not fixed column indexes.
   */
  private async readCreditConditionsVisibleRowData(
    table: Locator,
  ): Promise<Array<{ conditionText: string; customerText: string }>> {
    const columnMap = await this.creditConditionsHeaderColumnMap(table);
    const conditionIdx = columnMap.get("condition");
    const customerIdx = columnMap.get("customer");
    if (conditionIdx === undefined || customerIdx === undefined) {
      throw new Error(
        `Credit Conditions grid is missing Condition and/or Customer column headers (found: ${[...columnMap.keys()].join(", ")}).`,
      );
    }

    const rows = table.locator("tbody tr");
    const rowCount = await rows.count();
    const data: Array<{ conditionText: string; customerText: string }> = [];

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      if (!(await row.isVisible({ timeout: 1_000 }).catch(() => false))) {
        continue;
      }

      const conditionCell = row.locator("td").nth(conditionIdx);
      const customerCell = row.locator("td").nth(customerIdx);
      const conditionRaw = ((await conditionCell.innerText().catch(() => "")) ?? "")
        .replace(/\s+/g, " ")
        .trim();
      const customerText = ((await customerCell.innerText().catch(() => "")) ?? "")
        .replace(/\s+/g, " ")
        .trim();
      const conditionText = DOCustomerQuotePostSubmitPage.normalizeCreditConditionText(conditionRaw);

      if (!conditionText && !customerText) {
        continue;
      }

      data.push({ conditionText, customerText });
    }

    return data;
  }

  /**
   * UDP-T3845 — Credit Conditions grid has **Condition** and **Customer** only;
   * **To-Do Name** is not displayed on the portal.
   */
  async expectCreditConditionsTabTwoColumnsOnly(): Promise<void> {
    this.logStep("Expect Credit Conditions Tab Two Columns Only");
    await this.openCreditConditionsTab();
    let root = this.documentManagementStrip();
    if ((await root.count()) === 0) {
      root = this.page.locator(".p-tabview").first();
    }
    const panel = await this.creditConditionsTabContentPanel(root);
    const table = panel.locator("table").first();
    await expect(table).toBeVisible({ timeout: 30_000 });

    const headerCell = (label: RegExp): Locator =>
      table
        .getByRole("columnheader", { name: label })
        .or(table.locator("thead th").filter({ hasText: label }));

    await expect(headerCell(/^Condition$/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(headerCell(/^Customer$/i).first()).toBeVisible({ timeout: 20_000 });

    const todoName = panel
      .getByRole("columnheader", { name: /To-?Do\s*Name/i })
      .or(panel.getByText(/^To-?Do\s*Name$/i))
      .or(table.locator("thead th").filter({ hasText: /To-?Do\s*Name/i }));
    await expect(todoName).toHaveCount(0, { timeout: 8_000 });

    const columnMap = await this.creditConditionsHeaderColumnMap(table);
    const visibleHeaders = [...columnMap.keys()];
    this.logStep(`Credit Conditions visible headers: [${visibleHeaders.join(", ")}]`);
    expect(visibleHeaders, "Credit Conditions grid must expose exactly two data columns").toHaveLength(2);
    expect(columnMap.has("condition"), "Missing Condition column header").toBe(true);
    expect(columnMap.has("customer"), "Missing Customer column header").toBe(true);
    expect(
      visibleHeaders.some((label) => /to-?do\s*name/i.test(label)),
      "To-Do Name column must not be rendered",
    ).toBe(false);

    const rowData = await this.readCreditConditionsVisibleRowData(table);
    expect(
      rowData.length,
      "Credit Conditions grid has no visible AF data rows",
    ).toBeGreaterThan(0);

    for (const row of rowData) {
      expect(
        row.conditionText.length,
        `Credit Conditions row must include a Condition description (customer="${row.customerText}")`,
      ).toBeGreaterThan(0);
      expect(
        row.customerText.length,
        `Credit Conditions row must include an associated Customer for condition "${row.conditionText}"`,
      ).toBeGreaterThan(0);
    }
  }

  /**
   * UDP-T3849 — Credit Conditions grid is **view-only** for dealers: no add / edit / delete
   * controls and no editable fields in condition rows.
   */
  async expectCreditConditionsTabViewOnlyForDealer(): Promise<void> {
    this.logStep("Expect Credit Conditions Tab View Only For Dealer");
    await this.openCreditConditionsTab();
    let root = this.documentManagementStrip();
    if ((await root.count()) === 0) {
      root = this.page.locator(".p-tabview").first();
    }
    const panel = await this.creditConditionsTabContentPanel(root);
    await expect(panel).toBeVisible({ timeout: 30_000 });

    const table = panel.locator("table").first();
    await expect(table).toBeVisible({ timeout: 30_000 });
    const dataRows = table.locator("tbody tr").filter({ visible: true });
    await expect(dataRows.first()).toBeVisible({ timeout: 30_000 });

    const mutationControls: Locator[] = [
      panel.getByRole("button", { name: /^(Add|New|Create)(\s+Condition)?$/i }),
      panel.getByRole("button", { name: /^Edit(\s+Condition)?$/i }),
      panel.getByRole("button", { name: /^(Delete|Remove)(\s+Condition)?$/i }),
      panel.getByRole("link", { name: /^(Add|Edit|Delete|Remove)(\s+Condition)?$/i }),
      table
        .locator("xpath=ancestor::div[1]")
        .locator("button, a")
        .filter({ hasText: /^(Add|Edit|Delete|Remove)$/i }),
      table.locator(".fa-plus, .fa-pencil, .fa-pen, .fa-trash, .fa-trash-alt, .fa-edit"),
    ];
    for (const control of mutationControls) {
      await expect(control).toHaveCount(0, { timeout: 5_000 });
    }

    const editableInputs = table.locator(
      "tbody input:not([disabled]):not([readonly]), tbody textarea:not([disabled]):not([readonly])",
    );
    await expect(editableInputs).toHaveCount(0, { timeout: 8_000 });

    const editableContent = table.locator("tbody [contenteditable='true']");
    await expect(editableContent).toHaveCount(0, { timeout: 5_000 });

    const rowCheckboxes = table.locator("tbody .p-checkbox-box");
    await expect(rowCheckboxes).toHaveCount(0, { timeout: 5_000 });

    const rowActionButtons = table.locator(
      "tbody button, tbody a[role='button'], tbody .p-row-editor-init, tbody .p-row-editor-save, tbody .p-row-editor-cancel",
    );
    await expect(rowActionButtons).toHaveCount(0, { timeout: 5_000 });
  }

  /** UDP-T3848 — one Credit Conditions grid row with mandatory-indicator audit. */
  static creditConditionRowShowsMandatoryAsterisk(conditionCell: Locator): Promise<boolean> {
    return (async () => {
      const marker = conditionCell
        .locator('[class*="mandatory"], [class*="required"], .fa-asterisk, .p-error')
        .filter({ visible: true })
        .first();
      if (await marker.isVisible({ timeout: 400 }).catch(() => false)) {
        return true;
      }
      if (await conditionCell.getByText("*", { exact: true }).isVisible({ timeout: 400 }).catch(() => false)) {
        return true;
      }
      const text = ((await conditionCell.innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
      return /^\*\s+/.test(text) || /\s\*\s*$/.test(text);
    })();
  }

  /** Strip leading/trailing mandatory asterisk from **Condition** column display text. */
  static normalizeCreditConditionText(raw: string): string {
    return raw.replace(/\s+/g, " ").trim().replace(/^\*\s+/, "").replace(/\s*\*\s*$/, "").trim();
  }

  private async creditConditionsDataTable(): Promise<Locator> {
    await this.openCreditConditionsTab();
    let root = this.documentManagementStrip();
    if ((await root.count()) === 0) {
      root = this.page.locator(".p-tabview").first();
    }
    const panel = await this.creditConditionsTabContentPanel(root);
    const table = panel.locator("table").first();
    await expect(table).toBeVisible({ timeout: 30_000 });
    return table;
  }

  /**
   * UDP-T3848 — read Credit Conditions rows and whether the **Condition** column shows a mandatory (*).
   */
  async readCreditConditionsMandatoryIndicatorAudit(): Promise<
    Array<{
      conditionText: string;
      customerText: string;
      mandatoryIndicatorPresent: boolean;
    }>
  > {
    this.logStep("Read Credit Conditions Mandatory Indicator Audit");
    const table = await this.creditConditionsDataTable();
    const columnMap = await this.creditConditionsHeaderColumnMap(table);
    const conditionIdx = columnMap.get("condition");
    const customerIdx = columnMap.get("customer");
    if (conditionIdx === undefined || customerIdx === undefined) {
      return [];
    }

    const rows = table.locator("tbody tr");
    const rowCount = await rows.count();
    if (rowCount === 0) {
      return [];
    }

    const audits: Array<{
      conditionText: string;
      customerText: string;
      mandatoryIndicatorPresent: boolean;
    }> = [];

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      if (!(await row.isVisible({ timeout: 1_000 }).catch(() => false))) {
        continue;
      }

      const conditionCell = row.locator("td").nth(conditionIdx);
      const customerCell = row.locator("td").nth(customerIdx);
      const conditionRaw = ((await conditionCell.innerText().catch(() => "")) ?? "")
        .replace(/\s+/g, " ")
        .trim();
      const customerText = ((await customerCell.innerText().catch(() => "")) ?? "")
        .replace(/\s+/g, " ")
        .trim();
      const conditionText = DOCustomerQuotePostSubmitPage.normalizeCreditConditionText(conditionRaw);

      if (!conditionText && !customerText) {
        continue;
      }

      const mandatoryIndicatorPresent =
        await DOCustomerQuotePostSubmitPage.creditConditionRowShowsMandatoryAsterisk(conditionCell);

      audits.push({ conditionText, customerText, mandatoryIndicatorPresent });
    }

    return audits;
  }

  private async creditConditionsTabContentPanel(root: Locator): Promise<Locator> {
    const byRole = root
      .getByRole("tabpanel", { name: /Credit Conditions|Additional Approval Conditions/i })
      .first();
    if (await byRole.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return byRole;
    }
    return root
      .locator(".p-tabview-panel")
      .filter({
        has: root
          .getByRole("columnheader", { name: /^Condition$/i })
          .or(root.locator("thead th").filter({ hasText: /^Condition$/i })),
      })
      .first();
  }

  private async resolveCreditConditionsTab(): Promise<Locator> {
    let root = this.documentManagementStrip();
    if ((await root.count()) === 0) {
      root = this.page.locator(".p-tabview").first();
    }
    return root
      .getByRole("tab", { name: /Credit Conditions|Additional Approval Conditions/i })
      .or(root.locator("a.p-tabview-nav-link").filter({ hasText: /Credit Conditions|Additional Approval/i }))
      .first();
  }

  /** Post-submission host (`app-customer-quote-post-submit` / `app-post-submission`). */
  private postSubmissionHost(): Locator {
    return this.page.locator("app-customer-quote-post-submit, app-post-submission").first();
  }

  /** Standard Quote chrome wrapping Post Submission (footer **Save** / **Previous** / **Cancel**). */
  private postSubmissionFooterScope(): Locator {
    return this.page.locator("app-quote-details, app-standard-quote").last();
  }

  /** Quote footer PrimeNG buttons (Save / Previous / Cancel) — same chrome as Customer Details steps. */
  private footerPrimeButton(label: RegExp): Locator {
    return this.page
      .locator("button.p-button.p-component")
      .filter({ has: this.page.locator("span.p-button-label", { hasText: label }) })
      .filter({ visible: true })
      .last();
  }

  /** UDP-T3861 / UDP-T3862 — Post Submission screen is loaded. */
  async expectPostSubmissionScreenVisible(): Promise<void> {
    this.logStep("Expect Post Submission Screen Visible");
    await this.waitForUploadStep();
    await expect(this.postSubmissionHost()).toBeVisible({ timeout: 60_000 });
    await expect(this.page.getByText(/Post Submission/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(this.browseFilesButton).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Reopened post-submit application (Submitted, Ready for Documentation, etc.) —
   * Post Submission shell + document strip; does not require **Browse Files** upload entry.
   */
  async expectReopenedPostSubmissionDocumentStripVisible(): Promise<void> {
    this.logStep("Expect Reopened Post Submission Document Strip Visible");
    await this.waitUntilNoVisibleAppLoaderOverlays(120_000);
    await expect(this.page.locator("app-quote-details, app-standard-quote").first()).toBeVisible({
      timeout: 60_000,
    });

    await expect
      .poll(
        async () => {
          if (await this.postSubmissionHost().isVisible().catch(() => false)) {
            return true;
          }
          if (await this.page.getByText(/Post Submission/i).first().isVisible().catch(() => false)) {
            return true;
          }
          const strip = this.documentManagementStrip();
          if (!(await strip.isVisible({ timeout: 800 }).catch(() => false))) {
            return false;
          }
          const creditTab = await this.resolveCreditConditionsTab();
          return (
            (await creditTab.isVisible({ timeout: 500 }).catch(() => false)) ||
            (await strip
              .getByRole("tab", { name: /^Upload$/i })
              .isVisible({ timeout: 500 })
              .catch(() => false)) ||
            (await strip
              .getByRole("tab", { name: /^Documents$/i })
              .isVisible({ timeout: 500 })
              .catch(() => false))
          );
        },
        { timeout: 120_000, intervals: [500, 1_500, 3_000] },
      )
      .toBe(true);
  }

  /**
   * UDP-T3860 — Submitted application reopened from dashboard lands directly on Post Submission
   * (document strip + footer controls).
   */
  async expectOpenedDirectlyInPostSubmissionFromDashboard(): Promise<void> {
    this.logStep("Expect Opened Directly In Post Submission From Dashboard");
    await this.expectPostSubmissionScreenVisible();
    await this.expectPostSubmissionSavePreviousCancelVisible();
    const strip = this.documentManagementStrip();
    await expect(
      strip
        .getByRole("tab", { name: /^Upload$/i })
        .or(strip.getByRole("tab", { name: /^Documents$/i }))
        .first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  /** UDP-T3862 — **Save**, **Previous**, and **Cancel** remain on Post Submission footer. */
  async expectPostSubmissionSavePreviousCancelVisible(): Promise<void> {
    this.logStep("Expect Post Submission Save Previous Cancel Visible");
    await this.waitForUploadStep();
    const footer = this.postSubmissionFooterScope();
    await expect(footer).toBeVisible({ timeout: 30_000 });

    const save = footer.getByRole("button", { name: /^Save$/i }).filter({ visible: true }).last();
    const previous = footer
      .getByRole("button", { name: /^Previous$/i })
      .filter({ visible: true })
      .last();
    const cancel = footer.getByRole("button", { name: /^Cancel$/i }).filter({ visible: true }).last();

    await expect(save).toBeVisible({ timeout: 20_000 });
    await expect(previous).toBeVisible({ timeout: 20_000 });
    await expect(cancel).toBeVisible({ timeout: 20_000 });
  }

  /** UDP-T3862 — **Next** is not available on Post Submission. */
  async expectPostSubmissionNextButtonHidden(): Promise<void> {
    this.logStep("Expect Post Submission Next Button Hidden");
    await this.waitForUploadStep();
    const nextInPost = this.postSubmissionHost().getByRole("button", { name: /^Next$/i });
    await expect(nextInPost).toHaveCount(0, { timeout: 10_000 });
    await expect(this.footerPrimeButton(/^Next$/)).toHaveCount(0, { timeout: 10_000 });
  }

  /** UDP-T3861 — Notes and Upload remain actionable in Post Submission. */
  async expectPostSubmissionNotesAndUploadActionable(): Promise<void> {
    this.logStep("Expect Post Submission Notes And Upload Actionable");
    await this.waitForUploadStep();
    await expect(this.addNewNotesButton).toBeEnabled({ timeout: 30_000 });
    await expect(this.browseFilesButton).toBeVisible({ timeout: 30_000 });
  }

  private borrowerSummaryRow(customerName: string): Locator {
    const escaped = customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.postSubmissionHost()
      .locator("tr, .p-datatable-row, .p-row")
      .filter({ hasText: new RegExp(escaped, "i") })
      .first();
  }

  private postSubmissionCustomerNameLink(customerName: string): Locator {
    const escaped = customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.page
      .locator(
        "div.align-items-center.capitalize.cursor-pointer.ng-star-inserted a.cursor-pointer.text-primary, a.cursor-pointer.text-primary",
      )
      .filter({ hasText: new RegExp(`^${escaped}`, "i") })
      .first();
  }

  private postSubmissionFinancialPositionLink(customerName: string): Locator {
    const row = this.borrowerSummaryRow(customerName);
    return row
      .getByRole("link", { name: /Financial\s*Position/i })
      .or(
        row
          .locator("a, span.cursor-pointer, .text-primary")
          .filter({ hasText: /Financial\s*Position/i }),
      )
      .or(
        this.postSubmissionHost()
          .locator("a, span.cursor-pointer, .text-primary")
          .filter({ hasText: /Financial\s*Position/i }),
      )
      .first();
  }

  /**
   * UDP-T3861 — contract terms and borrower summary fields are not editable on Post Submission
   * (Notes and Upload remain interactive separately).
   */
  async expectPostSubmissionContractAndCustomerDetailsViewOnly(): Promise<void> {
    this.logStep("Expect Post Submission Contract And Customer Details View Only");
    await this.waitForUploadStep();
    const host = this.postSubmissionHost();
    await expect(host).toBeVisible({ timeout: 60_000 });

    const quoteShell = this.page.locator("app-quote-details, app-standard-quote").last();
    const lessDeposit = quoteShell.locator("app-less-deposit").first();
    if (await lessDeposit.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const contractInputs = lessDeposit.locator(
        "input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])",
      );
      await expect(contractInputs.filter({ visible: true })).toHaveCount(0, { timeout: 10_000 });

      const enabledDropdowns = lessDeposit.locator("p-dropdown:not(.p-disabled) .p-dropdown-trigger");
      await expect(enabledDropdowns.filter({ visible: true })).toHaveCount(0, { timeout: 8_000 });
    }

    const customerInputs = host.locator(
      'input:not([type="file"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])',
    );
    await expect(customerInputs.filter({ visible: true })).toHaveCount(0, { timeout: 10_000 });

    const customerDropdowns = host.locator(
      "p-dropdown:not(.p-disabled) .p-dropdown-trigger, p-multiselect:not(.p-disabled) .p-multiselect-trigger",
    );
    await expect(customerDropdowns.filter({ visible: true })).toHaveCount(0, { timeout: 8_000 });
  }

  /** UDP-T3861 — **Customer Name** hyperlink opens a view-only Personal Details screen. */
  async clickPostSubmissionCustomerNameLinkAndExpectViewDialog(customerName: string): Promise<void> {
    this.logStep(`Click Post Submission Customer Name Link (${customerName})`);
    const link = this.postSubmissionCustomerNameLink(customerName);
    await expect(link).toBeVisible({ timeout: 30_000 });
    await link.scrollIntoViewIfNeeded();
    await link.click({ timeout: 15_000 });

    await expect(this.page.locator(':text-is("1. Personal Details")')).toBeVisible({
      timeout: 60_000,
    });
    const personalRoot = this.page.locator("app-personal-details").first();
    await expect(personalRoot).toBeVisible({ timeout: 30_000 });
    const editable = personalRoot.locator(
      'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])',
    );
    await expect(editable.filter({ visible: true })).toHaveCount(0, { timeout: 15_000 });

    await this.clickPostSubmissionStepTab();
    await this.waitForUploadStep();
  }

  /** UDP-T3861 — **Financial Position** hyperlink opens a view-only Financial Position screen. */
  async clickPostSubmissionFinancialPositionLinkAndExpectViewDialog(
    customerName: string = "Liza Marie Doe",
  ): Promise<void> {
    this.logStep(`Click Post Submission Financial Position Link (${customerName})`);
    const link = this.postSubmissionFinancialPositionLink(customerName);
    await expect(link).toBeVisible({ timeout: 30_000 });
    await link.scrollIntoViewIfNeeded();
    await link.click({ timeout: 15_000 });

    const fin = new DOFinancialPositionPage(this.page);
    await fin.waitForFinancialPositionStep();
    const finRoot = this.page
      .locator(
        "app-individual-financial, app-financial-position, app-individual-financial-details, app-business-financial, app-sole-trade-financial",
      )
      .first();
    await expect(finRoot).toBeVisible({ timeout: 30_000 });
    const editable = finRoot.locator(
      'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])',
    );
    await expect(editable.filter({ visible: true })).toHaveCount(0, { timeout: 15_000 });
  }

  /** UDP-T3865 — workflow status control visible on current quote step. */
  async expectWorkflowStatusControlVisible(): Promise<void> {
    this.logStep("Expect Workflow Status Control Visible");
    await this.scrollWorkflowStatusHeaderIntoView();
    const statusInput = this.workflowStatusOpenQuoteInput();
    if (await statusInput.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(statusInput).toBeVisible();
      return;
    }
    await expect(
      this.page
        .getByRole("button", { name: /Open\s+Quote|Submitted|Assessment|Credit Hold/i })
        .first(),
    ).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Read masked portal workflow status from quote header. */
  async readPortalWorkflowStatus(): Promise<string> {
    return this.readWorkflowStatusText();
  }

  /** UDP-T3881 — Dealer Declaration must not show while portal validations fail. */
  async expectDealerDeclarationNotVisible(): Promise<void> {
    this.logStep("Expect Dealer Declaration Not Visible");
    const decl = this.page
      .getByRole("dialog")
      .filter({ hasText: /Declaration|Originator Declaration|Dealer Declaration/i });
    await expect(decl).toHaveCount(0, { timeout: 8_000 });
  }

  /** UDP-T3882 — Proceed disabled until declaration checkboxes ticked. */
  async expectDeclarationProceedDisabledUntilConfirmed(): Promise<void> {
    this.logStep("Expect Declaration Proceed Disabled Until Confirmed");
    const dlg = this.page
      .getByRole("dialog")
      .filter({ hasText: /Declaration|Originator Declaration|Dealer Declaration/i })
      .first();
    await expect(dlg).toBeVisible({ timeout: 60_000 });
    const proceed = dlg.getByRole("button", { name: /^Proceed$/i }).first();
    await expect(proceed).toBeDisabled({ timeout: 15_000 });
  }

  /** UDP-T3870 — API connectivity failure message. */
  async expectApiSubmitErrorMessage(): Promise<void> {
    this.logStep("Expect API Submit Error Message");
    await expect(
      this.page.getByText(/There was an error submitting your request/i).first(),
    ).toBeVisible({ timeout: 60_000 });
  }

  /** UDP-T3871 — concurrent update conflict. */
  async expectQuoteUpdateFailedConcurrentEditMessage(): Promise<void> {
    this.logStep("Expect Quote Update Failed Concurrent Edit");
    await expect(
      this.page.getByText(/Quote Update Failed.*another user/i).first(),
    ).toBeVisible({ timeout: 45_000 });
  }

  /** UDP-T3880 — withdraw confirmation copy and actions. */
  async expectWithdrawConfirmationVisible(): Promise<void> {
    this.logStep("Expect Withdraw Confirmation Visible");
    const dlg = this.withdrawConfirmationDialog();
    await expect(dlg).toBeVisible({ timeout: 20_000 });
    await expect(dlg).toContainText(/Are you sure you want to withdraw this quote/i);
    await expect(dlg).toContainText(/Expired Listing/i);
    await expect(dlg).toContainText(/Do you want to continue/i);
    await expect(dlg.getByRole("button", { name: /No,\s*Go back/i })).toBeVisible();
    await expect(dlg.getByRole("button", { name: /Yes,\s*Cancel/i })).toBeVisible();
  }

  /** UDP-T3852+ — loan date in the past confirmation dialog (Submit / Generate Documentation). */
  async expectLoanDateInPastDialogVisible(): Promise<void> {
    this.logStep("Expect Loan Date In Past Dialog Visible");
    const dlg = this.page.getByRole("dialog").filter({
      hasText: /Loan date is in the past/i,
    });
    await expect(dlg).toBeVisible({ timeout: 60_000 });
    await expect.soft(dlg.getByText(/Update to today/i)).toBeVisible();
    await expect.soft(dlg.getByRole("button", { name: /^Yes$/i })).toBeVisible();
    await expect.soft(dlg.getByRole("button", { name: /^No$/i })).toBeVisible();
    await expect.soft(dlg.getByRole("button", { name: /^Close$/i })).toBeVisible();
  }
}
