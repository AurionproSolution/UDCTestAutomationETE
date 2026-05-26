import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { expect, type Locator, type Page, type Request, type Response } from "@playwright/test";
import { BasePage } from "../../../common";

/** Default PDF used on Customer Details after Reference submit (Upload tab). */
export const DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF = path.join(
  process.cwd(),
  "backup",
  "testData",
  "exportedPDFFile (3) (1).pdf",
);

/** Tiny valid JPEG for upload-format tests (Upload tab accepts .jpg). */
export const DEFAULT_CUSTOMER_QUOTE_UPLOAD_JPG = path.join(
  process.cwd(),
  "testData",
  "do-portal",
  "minimal-upload.jpg",
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

  constructor(page: Page) {
    super(page);
    this.browseFilesButton = page.locator(':text-is("Browse Files")');
    this.confirmButton = page.locator(':text-is("Confirm")');
    this.addNewNotesButton = page.locator(':text-is("Add New Notes")');
    this.noteTextarea = page.locator(
      "textarea.p-inputtextarea.p-inputtext.p-component.p-element.text-sm.p-inputtextarea-resizable",
    );
    this.noteSubmitButton = page.locator(':text-is("Submit")');
    this.proceedButton = page.locator(':text-is("Proceed")');
  }

  /**
   * **Search Customer** modal (same host as {@link DOAssetDetailsPage} borrower search).
   */
  private searchCustomerDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ has: this.page.getByRole("button", { name: /^Search$/i }) })
      .last();
  }

  /**
   * **Customer Details** — `+ Add Borrowers / Guarantors` (Selector Hub `:text-is("Add Borrowers / Guarantors")`).
   * Prefer `getByRole("button")` when the control is a real button; fall back to exact text (may be a link).
   */
  async clickAddBorrowersOrGuarantorsButton(): Promise<void> {
    const byRole = this.page.getByRole("button", {
      name: /Add Borrowers\s*\/\s*Guarantors/i,
    });
    const byTextIs = this.page.locator(':text-is("Add Borrowers / Guarantors")');
    const byTextLoose = this.page.getByText(/^\+\s*Add Borrowers\s*\/\s*Guarantors$/i);

    let target: Locator | null = null;
    if (await byRole.isVisible({ timeout: 3000 }).catch(() => false)) {
      target = byRole;
    } else if (await byTextIs.isVisible({ timeout: 3000 }).catch(() => false)) {
      target = byTextIs;
    } else if (await byTextLoose.isVisible({ timeout: 2000 }).catch(() => false)) {
      target = byTextLoose;
    } else {
      target = this.page
        .getByText("Add Borrowers / Guarantors", { exact: false })
        .first();
    }

    await target.waitFor({ state: "visible", timeout: 120000 });
    await target.scrollIntoViewIfNeeded();
    await target.click({ timeout: 30000 });
    await this.searchCustomerDialog().waitFor({ state: "visible", timeout: 60000 });
  }

  /**
   * In **Search Customer**, set search type to **Individual** (first radio: Individual | Business | Trust).
   * Prefers accessible name; falls back to PrimeNG box or Selector Hub xpath on first `p-radiobutton`.
   */
  async selectSearchCustomerIndividualType(): Promise<void> {
    const dialog = this.searchCustomerDialog();
    await dialog.waitFor({ state: "visible", timeout: 60000 });

    const byRole = dialog.getByRole("radio", { name: /^Individual$/i });
    if (await byRole.isVisible({ timeout: 4000 }).catch(() => false)) {
      await byRole.click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(300);
      return;
    }

    const box = dialog
      .locator("p-radiobutton")
      .filter({ hasText: /^Individual$/i })
      .locator(".p-radiobutton-box")
      .first();
    if (await box.isVisible({ timeout: 3000 }).catch(() => false)) {
      await box.click({ timeout: 15000, force: true });
      await this.page.waitForTimeout(300);
      return;
    }

    await dialog
      .locator("xpath=.//p-radiobutton[1]//div[1]//div[1]")
      .click({ timeout: 15000, force: true });
    await this.page.waitForTimeout(300);
  }

  /**
   * In **Search Customer**, set search type to **Trust** (third radio: Individual | Business | Trust).
   * Prefers `getByRole('radio')`; falls back to `.p-radiobutton-box` or SelectorHub `p-radiobutton[3]…`.
   */
  async selectSearchCustomerTrustType(): Promise<void> {
    const dialog = this.searchCustomerDialog();
    await dialog.waitFor({ state: "visible", timeout: 60000 });

    const byRole = dialog.getByRole("radio", { name: /^Trust$/i });
    if (await byRole.isVisible({ timeout: 4000 }).catch(() => false)) {
      await byRole.click({ timeout: 15_000, force: true });
      await this.page.waitForTimeout(300);
      return;
    }

    const box = dialog
      .locator("p-radiobutton")
      .filter({ hasText: /^Trust$/i })
      .locator(".p-radiobutton-box")
      .first();
    if (await box.isVisible({ timeout: 3000 }).catch(() => false)) {
      await box.click({ timeout: 15_000, force: true });
      await this.page.waitForTimeout(300);
      return;
    }

    const thirdRadioBox = dialog.locator("p-radiobutton").nth(2).locator(".p-radiobutton-box").first();
    if (await thirdRadioBox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await thirdRadioBox.click({ timeout: 15_000, force: true });
      await this.page.waitForTimeout(300);
      return;
    }

    await dialog
      .locator("xpath=.//p-radiobutton[3]//div[1]//div[contains(@class,'p-radiobutton-box')]")
      .first()
      .click({ timeout: 15_000, force: true });
    await this.page.waitForTimeout(300);
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

  /** When `role="tab"` / accessible name fails, hit the PrimeNG nav link directly. */
  private documentsTabInStrip(root: Locator): Locator {
    const link = root.locator("a.p-tabview-nav-link").filter({ hasText: /^Documents$/i });
    const li = root.locator(".p-tabview-nav li").filter({ hasText: /^Documents$/i });
    const byHeaderAction = root
      .locator('[id^="pn_id_"][id$="_header_action"]')
      .filter({ hasText: /Documents/i });
    return link.or(li).or(byHeaderAction).first();
  }

  async waitForUploadStep(): Promise<void> {
    await this.browseFilesButton.waitFor({ state: "visible", timeout: 120000 });
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
      intervals: [400, 1000, 2000],
      timeout: 90000,
    });
  }

  async openDocumentsTab(): Promise<void> {
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

    const scopedRole = root.getByRole("tab", { name: /Documents/i });
    let tab: Locator =
      (await scopedRole.count()) > 0 ? scopedRole.first() : this.documentsTabInStrip(root);

    await tab.waitFor({ state: "visible", timeout: 30000 });
    await tab.scrollIntoViewIfNeeded();
    try {
      await tab.click({ timeout: 15000 });
    } catch {
      tab = this.documentsTabInStrip(root);
      await tab.click({ timeout: 30000 });
    }

    await root
      .locator("tr")
      .filter({ hasText: /Customer Quote\s*-\s*Basic/i })
      .first()
      .waitFor({ state: "visible", timeout: 45000 });
  }

  /**
   * **Documents** tab — `app-generate-document` (generated docs table).
   * Use the **active** `tabpanel` so we never match a hidden copy still in the DOM (`.first()` + `hasText` alone is flaky).
   */
  private documentsGeneratedRoot(): Locator {
    const tv = this.documentManagementTabView();
    const byAria = tv.locator('[role="tabpanel"][aria-hidden="false"] app-generate-document').first();
    const byPanelNotHidden = tv.locator(".p-tabview-panel:not([hidden]) app-generate-document").first();
    const byContent = tv
      .locator("app-generate-document")
      .filter({ hasText: /Business Declaration|\bCredit Advice\b|Customer Quote\s*-\s*Basic/i })
      .first();
    return byAria.or(byPanelNotHidden).or(byContent);
  }

  /**
   * Click the table header **Select All** checkbox (`p-tableheadercheckbox` / first header `.p-checkbox-box`).
   * SelectorHub-style row boxes are `tbody tr .p-checkbox-box`; the header control lives in `thead`.
   */
  async clickSelectAllCheckboxesDocumentsGeneratedTable(): Promise<void> {
    const root = this.documentsGeneratedRoot();
    await root.waitFor({ state: "visible", timeout: 45000 });
    const headerBox = root
      .locator("thead tr")
      .first()
      .locator("p-tableheadercheckbox .p-checkbox-box, th .p-checkbox-box")
      .first();
    await headerBox.scrollIntoViewIfNeeded();
    await headerBox.click();
    await this.page.waitForTimeout(350);
  }

  /**
   * **Select All** does not include **Credit Advice** rows — tick each Credit Advice line individually
   * until the row checkbox shows selected (`.p-checkbox-box.p-highlight`).
   */
  async selectEachCreditAdviceRowInDocumentsGeneratedTable(): Promise<void> {
    const root = this.documentsGeneratedRoot();
    await root.waitFor({ state: "visible", timeout: 45000 });
    // Row text includes the document title; do not rely on `span.document-name` (class/markup varies).
    // `filter({ has: root.locator(...) })` with a `root`-anchored inner locator does not scope per-`tr` reliably.
    const creditRows = root.locator("tbody tr").filter({ hasText: /\bCredit Advice\b/i });
    const n = await creditRows.count();
    expect(n, "Expected at least one Credit Advice row on the Documents tab").toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const row = creditRows.nth(i);
      await row.scrollIntoViewIfNeeded();
      const box = row.locator("td").first().locator(".p-checkbox-box").first();
      const checked = row.locator(".p-checkbox-box.p-highlight").first();
      if (!(await checked.isVisible({ timeout: 1200 }).catch(() => false))) {
        await box.click({ timeout: 15000 });
      }
      await checked.waitFor({ state: "visible", timeout: 15000 });
    }
  }

  /**
   * Bulk selection for **Preview**: header **Select All**, then each **Credit Advice** row
   * (excluded from select-all per product rules).
   */
  async selectAllDocumentsAndCreditAdviceRowsForBulkPreview(): Promise<void> {
    await this.clickSelectAllCheckboxesDocumentsGeneratedTable();
    await this.selectEachCreditAdviceRowInDocumentsGeneratedTable();
  }

  /**
   * **Documents** tab **Preview**: bulk preview opens **Document Parameters** first (`.dynamic-params-body`);
   * fill required fields, **Confirm**, then the preview opens in a new tab. If no modal appears, treat as direct new-tab preview.
   */
  async clickDocumentsTabPreviewOpensNewTab(): Promise<void> {
    const root = this.documentsGeneratedRoot();
    await root.waitFor({ state: "visible", timeout: 45000 });
    const previewBtn = root
      .locator("#preview-button")
      .locator('button[type="button"]')
      .first()
      .or(
        root
          .getByText("Preview", { exact: true })
          .locator("xpath=ancestor::p-button[1]")
          .locator('button[type="button"]')
          .first(),
      );
    await previewBtn.waitFor({ state: "visible", timeout: 30000 });
    await previewBtn.scrollIntoViewIfNeeded();

    const ctx = this.page.context();
    const initialPageCount = ctx.pages().length;
    const dialog = this.page.getByRole("dialog", { name: /Document Parameters/i });

    await previewBtn.click();

    const deadline = Date.now() + 25_000;
    let dialogVisible = false;
    while (Date.now() < deadline) {
      if (await dialog.isVisible().catch(() => false)) {
        dialogVisible = true;
        break;
      }
      if (ctx.pages().length > initialPageCount) {
        const latest = ctx.pages().at(-1);
        if (latest && latest !== this.page) {
          expect(latest.url().length, "Documents Preview tab").toBeGreaterThan(0);
          await latest.close().catch(() => {});
          return;
        }
      }
      await this.page.waitForTimeout(250);
    }

    if (!dialogVisible) {
      throw new Error(
        "Documents Preview: Document Parameters dialog did not open and no new browser tab was detected.",
      );
    }

    await this.fillDocumentParametersDynamicBodyDefaults(dialog);
    const confirm = dialog.getByRole("button", { name: /^Confirm$/i });
    await expect(confirm).toBeEnabled({ timeout: 30_000 });
    const [newPage] = await Promise.all([
      ctx.waitForEvent("page", { timeout: 45_000 }),
      confirm.click(),
    ]);
    expect(newPage.url().length, "Documents Preview should open a new tab after Confirm").toBeGreaterThan(0);
    await newPage.close().catch(() => {});
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
   * Toolbar link next to Preview / Print on the Documents tab — must not use a page-wide "Download"
   * match (menus, grids elsewhere also use that label).
   */
  async clickDownload(): Promise<void> {
    let root = this.documentManagementTabView();
    if ((await root.count()) === 0) {
      root = this.page
        .locator(".p-tabview")
        .filter({ has: this.page.getByRole("tab", { name: /^Documents$/i }) })
        .first();
    }
    await root.waitFor({ state: "visible", timeout: 30000 });

    const documentsPanel = root.locator(".p-tabview-panel").filter({
      has: this.page.locator("tr").filter({ hasText: /Customer Quote\s*-\s*Basic/i }),
    });

    const panel =
      (await documentsPanel.count()) > 0
        ? documentsPanel.first()
        : root.locator(".p-tabview-panel").filter({ hasText: /Preview/i }).first();

    await panel.waitFor({ state: "visible", timeout: 45000 });

    const downloadControl = panel
      .getByRole("link", { name: /^Download$/i })
      .or(panel.locator("a").filter({ hasText: /^Download$/i }))
      .or(panel.locator('button, [role="button"]').filter({ hasText: /^Download$/i }))
      .or(panel.locator("span").filter({ hasText: /^Download$/i }).locator("xpath=ancestor::a[1]"))
      .first();

    await downloadControl.waitFor({ state: "visible", timeout: 30000 });
    await downloadControl.scrollIntoViewIfNeeded();
    try {
      await downloadControl.click({ timeout: 15000 });
    } catch {
      await downloadControl.click({ timeout: 15000, force: true });
    }
  }

  async confirmDocumentParameters(): Promise<void> {
    const dialog = this.page.getByRole("dialog", { name: /Document Parameters/i });
    await dialog.waitFor({
      state: "visible",
      timeout: 30000,
    });
    await this.fillDocumentParametersDynamicBodyDefaults(dialog);
    const confirm = dialog.getByRole("button", { name: /^Confirm$/i });
    await expect(confirm).toBeEnabled({ timeout: 30000 });
    await confirm.click();
    await dialog.waitFor({
      state: "hidden",
      timeout: 30000,
    }).catch(() => {});
  }

  /**
   * **Document Parameters** modal (Preview / Download) — `.dynamic-params-body` text fields
   * must be satisfied before **Confirm** enables (e.g. ID Form Party No, quote type inputs).
   */
  private async fillDocumentParametersDynamicBodyDefaults(
    dialog: Locator = this.page.getByRole("dialog", { name: /Document Parameters/i }),
  ): Promise<void> {
    const body = dialog.locator(".dynamic-params-body");
    if (!(await body.isVisible({ timeout: 4000 }).catch(() => false))) {
      return;
    }
    await body.scrollIntoViewIfNeeded();
    await body.evaluate((el: HTMLElement) => {
      el.scrollTop = el.scrollHeight;
    }).catch(() => {});

    const fillSectionInput = async (
      sectionHeading: RegExp,
      value: string,
      alwaysOverwrite: boolean,
    ): Promise<void> => {
      const section = body.locator(".document-section").filter({ hasText: sectionHeading }).first();
      if (!(await section.isVisible({ timeout: 2500 }).catch(() => false))) {
        return;
      }
      await section.scrollIntoViewIfNeeded();
      const input = section.locator("input.param-input").first();
      if (!(await input.isVisible({ timeout: 2500 }).catch(() => false))) {
        return;
      }
      const current = (await input.inputValue().catch(() => "")).trim();
      if (alwaysOverwrite || !current) {
        await input.fill(value);
      }
    };

    await fillSectionInput(/Customer Quote\s*-\s*Basic/i, "Basic Quote", false);
    await fillSectionInput(/Customer Quote\s*-\s*Detailed/i, "Detailed Quote", false);
    await fillSectionInput(/ID Form/i, "1", true);
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

  private notesListRoot(): Locator {
    return this.page.locator("app-notes .notes-container");
  }

  /**
   * When notes already exist, each card shows author (bold label) and a date | time line.
   */
  async expectExistingNoteCardsShowAuthorAndTimestamp(): Promise<void> {
    const cards = this.page.locator("app-notes .notes-container .col-4");
    await this.addNewNotesButton.scrollIntoViewIfNeeded();
    if ((await cards.count()) === 0) {
      return;
    }
    const first = cards.first();
    await expect(first.locator("label.font-semibold").first()).toBeVisible();
    await expect(first).toContainText(/\d{1,2}\/\d{1,2}\/\d{4}\s*\|\s*\d{1,2}:\d{2}/);
  }

  private async dismissAddNoteDialogIfOpen(): Promise<void> {
    const dialog = this.page.getByRole("dialog", { name: /Add Note/i });
    if (!(await dialog.isVisible({ timeout: 1500 }).catch(() => false))) {
      return;
    }
    const cancel = dialog.getByRole("button", { name: /^Cancel$/i });
    if (await cancel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancel.click();
    } else {
      await this.page.keyboard.press("Escape");
    }
    await dialog.waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
  }

  /**
   * Add Note: enter >1000 characters and submit — validation must mention 1000-char limit
   * (copy varies slightly by build; we match common phrasings).
   */
  async expectOversizedNoteRejectedOnSubmit(): Promise<void> {
    await this.addNewNotesButton.waitFor({ state: "visible", timeout: 60000 });
    await this.addNewNotesButton.scrollIntoViewIfNeeded();
    await this.addNewNotesButton.click();

    const dialog = this.page.getByRole("dialog", { name: /Add Note/i });
    await dialog.waitFor({ state: "visible", timeout: 30000 });
    const ta = dialog.locator("textarea").first();
    await ta.waitFor({ state: "visible", timeout: 15000 });
    const over = "Z".repeat(1001);
    await ta.evaluate((el: HTMLTextAreaElement, value: string) => {
      el.removeAttribute("maxlength");
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, over);

    await dialog.locator(':text-is("Submit")').click();

    await expect(
      dialog.getByText(
        /((length|note|characters?).{0,120}1000|1000.{0,80}(char|character|greater|exceed|longer|max)|not\s*be\s*greater\s*than\s*1000|no\s*be\s*greater\s*than\s*1000|must\s*not.{0,40}1000|exceed.{0,40}1000)/i,
      ),
    ).toBeVisible({ timeout: 20000 });

    await this.dismissAddNoteDialogIfOpen();
  }

  /** Submit a note of exactly `length` characters from the Add Note dialog. */
  async submitNoteOfExactLengthFromDialog(length: number, fillChar = "R"): Promise<void> {
    await this.addNewNotesButton.waitFor({ state: "visible", timeout: 60000 });
    await this.addNewNotesButton.scrollIntoViewIfNeeded();
    await this.addNewNotesButton.click();

    const dialog = this.page.getByRole("dialog", { name: /Add Note/i });
    await dialog.waitFor({ state: "visible", timeout: 30000 });
    const ta = dialog.locator("textarea").first();
    await ta.fill(fillChar.repeat(length));
    await dialog.locator(':text-is("Submit")').click();
    await dialog.waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
  }

  /**
   * Long notes are truncated in the list with a **More** link (preview > ~100 chars stored).
   */
  async expectNoteListShowsMoreForLongSavedNote(): Promise<void> {
    const list = this.notesListRoot();
    await expect(list.getByText("More", { exact: true })).toBeVisible({ timeout: 45000 });
    const cardWithMore = list.locator(".col-4").filter({ hasText: "More" }).first();
    await expect(cardWithMore.locator("label.font-semibold").first()).toBeVisible();
    await expect(cardWithMore).toContainText(/\d{1,2}\/\d{1,2}\/\d{4}\s*\|\s*\d{1,2}:\d{2}/);
  }

  /** Ensure the document tab strip is on **Upload** (Browse Files visible). */
  async ensureUploadTab(): Promise<void> {
    let root = this.documentManagementTabView();
    if ((await root.count()) === 0) {
      root = this.page
        .locator(".p-tabview")
        .filter({ has: this.page.getByRole("tab", { name: /^Upload$/i }) })
        .first();
    }
    await root.waitFor({ state: "visible", timeout: 60000 });
    const uploadTab = root.locator("a.p-tabview-nav-link").filter({ hasText: /^Upload$/i }).first();
    if ((await uploadTab.count()) > 0) {
      const selected = await uploadTab.getAttribute("aria-selected");
      if (selected !== "true") {
        await uploadTab.click();
      }
    }
    await this.browseFilesButton.waitFor({ state: "visible", timeout: 45000 });
  }

  private uploadAppRoot(): Locator {
    return this.documentManagementTabView().locator("app-upload-document").first();
  }

  /** Upload `.jpg` then default PDF; both appear under the Upload tab. */
  async uploadJpgThenPdfExpectBothVisible(): Promise<void> {
    await this.ensureUploadTab();
    await this.uploadDocument(DEFAULT_CUSTOMER_QUOTE_UPLOAD_JPG);
    await this.expectDocumentUploaded(DEFAULT_CUSTOMER_QUOTE_UPLOAD_JPG);
    await this.uploadDocument(DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF);
    await this.expectDocumentUploaded(DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF);

    const root = this.uploadAppRoot();
    const jpgBase = path.basename(DEFAULT_CUSTOMER_QUOTE_UPLOAD_JPG).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pdfBase = path.basename(DEFAULT_CUSTOMER_QUOTE_UPLOAD_PDF).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await expect(root.getByText(new RegExp(`^${jpgBase}$`, "i")).first()).toBeVisible({ timeout: 60000 });
    await expect(root.getByText(new RegExp(`^${pdfBase}$`, "i")).first()).toBeVisible({ timeout: 60000 });
  }

  /**
   * Attempt to upload a file larger than 20 MB — UI should reject / warn (toast or inline message).
   */
  async expectOversizeBinaryUploadRejected(): Promise<void> {
    await this.ensureUploadTab();
    const dir = mkdtempSync(path.join(tmpdir(), "do-pw-upload-"));
    const hugePath = path.join(dir, "oversized.bin");
    try {
      writeFileSync(hugePath, Buffer.alloc(21 * 1024 * 1024));
      const fileInput = this.page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(hugePath);

      const message = this.page
        .locator(".p-toast, .p-toast-message, .p-message, .p-messages, [role='alert']")
        .filter({ hasText: /20|MB|exceed|max|size|limit|upload/i });
      await expect(message.first()).toBeVisible({ timeout: 45000 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  /** Select the first row in the Upload tab supporting-documents table (checkbox). */
  async selectFirstUploadedDocumentRowInUploadTable(): Promise<void> {
    const root = this.uploadAppRoot();
    const firstRow = root.locator("tbody tr").first();
    await firstRow.waitFor({ state: "visible", timeout: 45000 });
    const box = firstRow.locator(".p-checkbox-box").first();
    if (!(await firstRow.locator(".p-checkbox-box.p-highlight").isVisible().catch(() => false))) {
      await box.click();
    }
    await firstRow.locator(".p-checkbox-box.p-highlight").waitFor({ state: "visible", timeout: 15000 });
  }

  /** Select the supporting-documents table row whose name matches `basename`. */
  async selectUploadedDocumentRowByBasename(basename: string): Promise<void> {
    const root = this.uploadAppRoot();
    const escaped = basename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const row = root.locator("tbody tr").filter({ hasText: new RegExp(escaped, "i") }).first();
    await row.waitFor({ state: "visible", timeout: 45000 });
    const box = row.locator(".p-checkbox-box").first();
    if (!(await row.locator(".p-checkbox-box.p-highlight").isVisible().catch(() => false))) {
      await box.click();
    }
    await row.locator(".p-checkbox-box.p-highlight").waitFor({ state: "visible", timeout: 15000 });
  }

  /**
   * Upload-tab **Preview** / **Download** / **Delete** are PrimeNG `p-button` text actions; the label
   * is often in a child `span.p-button-label` with `aria-hidden`, so `getByRole("button", { name })`
   * does not resolve. Prefer `#preview-button` (upload template) then label text → `p-button` → inner `button`.
   */
  private uploadTabToolbarButton(root: Locator, label: "Preview" | "Download" | "Delete"): Locator {
    const fromExactText = root
      .getByText(label, { exact: true })
      .locator("xpath=ancestor::p-button[1]")
      .locator('button[type="button"]')
      .first();

    if (label === "Preview") {
      return root.locator("#preview-button").locator('button[type="button"]').first().or(fromExactText);
    }

    return fromExactText;
  }

  /** **Preview** on Upload tab opens a new browser tab. */
  async expectUploadTabPreviewOpensNewTab(): Promise<void> {
    await this.ensureUploadTab();
    await this.selectFirstUploadedDocumentRowInUploadTable();
    const root = this.uploadAppRoot();
    const previewBtn = this.uploadTabToolbarButton(root, "Preview");
    await previewBtn.waitFor({ state: "visible", timeout: 30000 });
    await previewBtn.scrollIntoViewIfNeeded();

    const context = this.page.context();
    const [newPage] = await Promise.all([
      context.waitForEvent("page", { timeout: 45000 }),
      previewBtn.click(),
    ]);
    expect(newPage.url().length, "Preview should navigate to a new tab/window").toBeGreaterThan(0);
    await newPage.close().catch(() => {});
  }

  /** **Download** on Upload tab triggers a file download in the browser. */
  async expectUploadTabDownloadStarts(): Promise<void> {
    await this.ensureUploadTab();
    await this.selectFirstUploadedDocumentRowInUploadTable();
    const root = this.uploadAppRoot();
    const dl = this.uploadTabToolbarButton(root, "Download");
    await dl.waitFor({ state: "visible", timeout: 30000 });
    await dl.scrollIntoViewIfNeeded();

    const [download] = await Promise.all([
      this.page.waitForEvent("download", { timeout: 60000 }),
      dl.click(),
    ]);
    expect(download.suggestedFilename().length).toBeGreaterThan(0);
  }

  /**
   * Remove an uploaded file: select its row in the table, use the toolbar **Delete** action
   * (label is **Delete**, not "Delete document"; role-based name lookup often fails), then assert
   * it disappeared from the table and optional preview tile.
   */
  async deleteUploadedDocumentTileByBasenameAndExpectRemoved(basename: string): Promise<void> {
    await this.ensureUploadTab();
    const root = this.uploadAppRoot();
    const escaped = basename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRe = new RegExp(escaped, "i");

    await this.selectUploadedDocumentRowByBasename(basename);

    const deleteToolbar = this.uploadTabToolbarButton(root, "Delete");
    await deleteToolbar.waitFor({ state: "visible", timeout: 30000 });
    await deleteToolbar.scrollIntoViewIfNeeded();
    await deleteToolbar.click();

    const confirmBtn = this.page.getByRole("button", { name: /^Confirm$/i });
    if (await confirmBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(root.locator("tbody tr").filter({ hasText: nameRe })).toHaveCount(0, { timeout: 60000 });
    await expect(root.locator(".document-tile").filter({ hasText: nameRe })).toHaveCount(0, {
      timeout: 60000,
    });
  }

  /**
   * **Status** → **Submit** (Quote header). Some products use **Open Quote** + `div.action-item` menu
   * (not `li[role=option]` / `.p-dropdown-panel` only). Handle both.
   */
  async submitQuoteFromStatusMenu(): Promise<void> {
    const p = this.page;

    const openMenu = async (): Promise<void> => {
      const openQuote = p.getByRole("button", { name: /Open Quote/i });
      if (await openQuote.isVisible({ timeout: 5000 }).catch(() => false)) {
        await openQuote.scrollIntoViewIfNeeded();
        await openQuote.click({ timeout: 20_000 });
        return;
      }
      const statusQuoteCell = p
        .locator(".col-2.status.w-10rem.ng-star-inserted, .col-2.status.w-10rem, .col-2.status")
        .or(p.locator("[class*='status']").filter({ has: p.locator("p-dropdown, p-select, .p-dropdown, .p-select") }))
        .first();
      await statusQuoteCell.waitFor({ state: "visible", timeout: 60_000 });
      const trigger = statusQuoteCell
        .locator(".p-dropdown-trigger, .p-select-trigger, [aria-haspopup='listbox']")
        .first();
      if (await trigger.isVisible({ timeout: 5000 }).catch(() => false)) {
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click({ timeout: 15_000 });
      } else {
        await statusQuoteCell.click({ timeout: 15_000 });
      }
    };

    await openMenu();

    /** Custom menus: `div.action-item` with text Submit (not listbox `option`). */
    const submitAction = p
      .locator("div.action-item, .action-item")
      .filter({ hasText: /^\s*Submit\s*$/i })
      .first();

    const flexSubmit = p
      .locator("div.flex.justify-content-center.action-item")
      .filter({ hasText: /^\s*Submit\s*$/i })
      .first();

    const clickSubmitMenuItem = async (): Promise<boolean> => {
      for (const candidate of [submitAction, flexSubmit]) {
        try {
          await candidate.waitFor({ state: "visible", timeout: 12_000 });
          await candidate.scrollIntoViewIfNeeded();
          await candidate.click({ timeout: 15_000 });
          await p.keyboard.press("Escape").catch(() => {});
          return true;
        } catch {
          /* try next */
        }
      }
      return false;
    };

    if (await clickSubmitMenuItem()) {
      return;
    }

    const panel = p
      .locator(".p-dropdown-panel, .p-select-overlay")
      .filter({ visible: true })
      .filter({ hasText: /Submit/i })
      .last();

    if (await panel.isVisible({ timeout: 12_000 }).catch(() => false)) {
      const submitChoices: Locator[] = [
        panel.getByRole("option", { name: /^Submit$/i }),
        panel.locator("li.p-dropdown-item").filter({ hasText: /^Submit$/i }),
        panel.locator("div.action-item, .action-item").filter({ hasText: /^\s*Submit\s*$/i }),
        panel.getByText("Submit", { exact: true }),
        panel.locator(':text-is("Submit")'),
      ];

      let clicked = false;
      for (const choice of submitChoices) {
        const target = choice.first();
        try {
          await target.waitFor({ state: "visible", timeout: 6000 });
          await target.scrollIntoViewIfNeeded();
          await target.click({ timeout: 12_000 });
          clicked = true;
          break;
        } catch {
          /* next */
        }
      }
      if (!clicked) {
        await flexSubmit.or(submitAction).first().click({ timeout: 12_000, force: true });
      }
    } else {
      await flexSubmit.or(submitAction).first().click({ timeout: 15_000, force: true });
    }

    await p
      .locator(".p-dropdown-panel, .p-select-overlay")
      .filter({ visible: true })
      .waitFor({ state: "hidden", timeout: 15_000 })
      .catch(() => {});
  }

  /**
   * Originator Declaration: tick the first two statement checkboxes, then Proceed.
   */
  async completeOriginatorDeclaration(): Promise<void> {
    const dialog = this.page.getByRole("dialog", {
      name: /Originator Declaration/i,
    });
    await dialog.waitFor({ state: "visible", timeout: 60000 });

    const boxes = dialog.locator(".p-checkbox-box");
    const n = await boxes.count();
    const limit = Math.min(2, n);
    for (let i = 0; i < limit; i++) {
      const box = boxes.nth(i);
      if (await box.isVisible().catch(() => false)) {
        await box.scrollIntoViewIfNeeded();
        await box.click();
      }
    }

    await this.proceedButton.waitFor({ state: "visible", timeout: 15000 });
    await this.proceedButton.click();
    await dialog.waitFor({ state: "hidden", timeout: 60000 }).catch(() => {});
  }
}
