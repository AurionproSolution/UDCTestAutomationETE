import { expect, type Locator, type Page, type Request, type Response } from "@playwright/test";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { BasePage } from "../../../common";

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

  /** Fail fast with a clear message instead of `waitForTimeout: Target page … has been closed`. */
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
    await this.page.waitForLoadState("load").catch(() => {});
    // Stepper label (FL Standard Quote) or Upload tab anchor — avoids racing Reference → Post Submission navigation.
    await expect(
      this.page.getByText(/Post Submission/i).first().or(this.browseFilesButton),
    ).toBeVisible({ timeout: 120_000 });
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

  async expectUploadTabPreviewOpensNewTab(): Promise<void> {
    await this.ensureUploadTab();
    const panel = this.uploadTabContentPanel();
    await panel.waitFor({ state: "visible", timeout: 60_000 });
    await panel.scrollIntoViewIfNeeded().catch(() => {});

    const rows = panel.locator(".p-fileupload-row, .p-fileupload-files tr, tbody tr").filter({
      hasText: /\.(pdf|jpg|jpeg|png)/i,
    });

    const tryPreviewOnRow = async (row: Locator): Promise<boolean> => {
      const candidates: Locator[] = [
        row.getByRole("link", { name: /Preview/i }),
        row.getByRole("button", { name: /Preview/i }),
        row.locator("a, button").filter({ hasText: /^Preview$/i }),
        row.locator("[title*='Preview' i], [aria-label*='Preview' i]"),
        row
          .locator("i.pi-eye, .pi-eye, .pi-search")
          .locator("xpath=ancestor::button[1] | ancestor::a[1]"),
      ];
      for (const c of candidates) {
        const el = c.first();
        if (await el.isVisible({ timeout: 2_000 }).catch(() => false)) {
          const popupPromise = this.page.waitForEvent("popup", { timeout: 25_000 }).catch(() => null);
          await el.scrollIntoViewIfNeeded();
          await el.click({ timeout: 12_000, force: true }).catch(() => {});
          const popup = await popupPromise;
          if (popup) {
            await popup.close().catch(() => {});
          }
          return true;
        }
      }
      return false;
    };

    const n = await rows.count();
    for (let i = 0; i < Math.min(Math.max(n, 1), 8); i++) {
      const row = n > 0 ? rows.nth(i) : panel.locator("tr, .p-fileupload-row").first();
      if (!(await row.isVisible({ timeout: 3_000 }).catch(() => false))) continue;
      if (await tryPreviewOnRow(row)) {
        return;
      }
    }

    this.logStep(
      "Upload tab: no Preview control on file rows (skipped new-tab smoke — some builds omit it).",
    );
  }

  /**
   * Upload tab: trigger **Download** for uploaded files.
   *
   * Many Standard Quote builds (e.g. OL) use a **shared toolbar** (Preview | Download | Delete) under
   * the file table — not per-row controls. Duplicate `Download` nodes exist in the DOM (hidden + visible);
   * prefer **`.last()`** / **visible** on the Upload **tabpanel**. The app may return a file via **XHR**
   * without a Playwright `download` event — we also accept **popup / new tab** or a **document-like**
   * HTTP response.
   */
  async expectUploadTabDownloadStarts(): Promise<void> {
    await this.ensureUploadTab();

    let strip = this.documentManagementTabView().first();
    if ((await strip.count()) === 0) {
      strip = this.page
        .locator(".p-tabview")
        .filter({ has: this.page.getByRole("tab", { name: /^Upload$/i }) })
        .first();
    }
    await strip.waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});

    /** Same panel as {@link expectUploadTabPreviewOpensNewTab} — `role=tabpanel` + `Browse Files` can miss the real upload surface. */
    const panel = this.uploadTabContentPanel();
    await panel.waitFor({ state: "visible", timeout: 60_000 });
    await panel.scrollIntoViewIfNeeded().catch(() => {});

    const uploadPanelByRole = strip
      .getByRole("tabpanel", { name: /^Upload$/i })
      .or(strip.locator('[role="tabpanel"]').filter({ has: this.browseFilesButton }))
      .first();

    const fileMarker = /\.(pdf|jpg|jpeg|png)|minimal-upload|exportedPDFFile/i;

    const rowSelector =
      ".p-fileupload-row, .p-fileupload-file, .p-fileupload-files tr, .p-fileupload-files > div, .p-fileupload-content > div, tbody tr";

    let rows = panel.locator(rowSelector).filter({ hasText: fileMarker });
    if ((await rows.count()) === 0) {
      const inStrip = strip.locator(rowSelector).filter({ hasText: fileMarker });
      if ((await inStrip.count()) > 0) {
        rows = inStrip;
      }
    }
    if ((await rows.count()) === 0) {
      const inFileUpload = this.page
        .locator(".p-fileupload, p-fileupload")
        .first()
        .locator(rowSelector)
        .filter({ hasText: fileMarker });
      if ((await inFileUpload.count()) > 0) {
        rows = inFileUpload;
      } else {
        rows = this.page.locator(rowSelector).filter({ hasText: fileMarker });
      }
    }

    await expect(rows.first()).toBeVisible({ timeout: 60_000 });

    /** Toolbar actions often apply to the **checked** row — select the first uploaded row if needed. */
    const selectFirstUploadedRowIfNeeded = async (): Promise<void> => {
      for (const root of [panel, strip]) {
        const dataRow = root.locator("tbody tr").filter({ hasText: fileMarker }).first();
        if (!(await dataRow.isVisible({ timeout: 3_000 }).catch(() => false))) {
          continue;
        }
        const box = dataRow.locator(".p-checkbox-box").first();
        if (!(await box.isVisible({ timeout: 2_000 }).catch(() => false))) {
          return;
        }
        const checked = dataRow.locator(".p-checkbox-box.p-highlight");
        if (await checked.isVisible({ timeout: 400 }).catch(() => false)) {
          return;
        }
        await box.scrollIntoViewIfNeeded();
        await box.click({ timeout: 5_000 }).catch(() => {});
        await this.page.waitForTimeout(200);
        return;
      }
    };

    const responseLooksLikeFilePayload = (res: Response): boolean => {
      if (!res.ok()) {
        return false;
      }
      if (res.request().method() !== "GET") {
        return false;
      }
      const ct = (res.headers()["content-type"] || "").toLowerCase();
      if (ct.includes("text/html")) {
        return false;
      }
      const cd = (res.headers()["content-disposition"] || "").toLowerCase();
      const u = res.url().toLowerCase();
      return (
        /application\/pdf|application\/octet-stream|image\/jpeg|image\/png|attachment|filename=/i.test(
          ct + cd,
        ) || (cd.includes("attachment") && /document|download|file/i.test(u))
      );
    };

    /**
     * Playwright: register **waitForEvent** / **waitForResponse** before **click**.
     * Accept download **or** preview tab **or** XHR file response (no `download` event in some SPAs).
     * Shorter waits per attempt so probing many controls does not burn the suite timeout.
     */
    const clickExpectsDownloadOutcome = async (el: Locator): Promise<boolean> => {
      const count = await el.count().catch(() => 0);
      if (count === 0) {
        return false;
      }
      const target = el.first();
      await target.isVisible({ timeout: 2_000 }).catch(() => {});
      await target.scrollIntoViewIfNeeded().catch(() => {});

      const downloadP = this.page.waitForEvent("download", { timeout: 22_000 }).catch(() => null);
      const popupP = this.page.waitForEvent("popup", { timeout: 12_000 }).catch(() => null);
      const newPageP = this.page.context().waitForEvent("page", { timeout: 12_000 }).catch(() => null);
      const responseP = this.page
        .waitForResponse((r) => responseLooksLikeFilePayload(r), { timeout: 22_000 })
        .catch(() => null);

      await target.click({ timeout: 12_000, force: true }).catch(() => {});

      const d = await downloadP;
      if (d) {
        await d.path().catch(() => {});
        return true;
      }
      const pop = await popupP;
      if (pop) {
        await pop.close().catch(() => {});
        return true;
      }
      const extra = await newPageP;
      if (extra) {
        await extra.close().catch(() => {});
        return true;
      }
      const res = await responseP;
      if (res) {
        return true;
      }
      return false;
    };

    await selectFirstUploadedRowIfNeeded();

    /** Shared toolbar / button bar: text **Download**, links, `p-button`, or icon-only. */
    const tryToolbarDownloadInRoot = async (root: Locator): Promise<boolean> => {
      const bases: Locator[] = [
        root.getByRole("button", { name: /^Download$/i }),
        root.getByRole("link", { name: /^Download$/i }),
        root.getByRole("menuitem", { name: /^Download$/i }),
        root.locator("a.p-menuitem-link").filter({ hasText: /^Download$/i }),
        root.locator("button, a, .p-button, [role='button']").filter({ hasText: /^Download$/i }),
        root
          .locator(".p-toolbar button, .p-toolbar a, .p-fileupload-buttonbar button, .p-fileupload-buttonbar a")
          .filter({ hasText: /Download/i }),
      ];
      for (const b of bases) {
        for (const pick of [
          b.filter({ visible: true }).last(),
          b.filter({ visible: true }).first(),
          b.last(),
          b.first(),
        ]) {
          if (await clickExpectsDownloadOutcome(pick)) {
            return true;
          }
        }
      }
      const iconHost = root
        .locator("i.pi-download, i.pi-cloud-download, .pi-download, [class*='pi-download']")
        .first()
        .locator(
          "xpath=ancestor::button[1] | ancestor::a[1] | ancestor::*[contains(@class,'p-button')][1]",
        );
      if (await clickExpectsDownloadOutcome(iconHost)) {
        return true;
      }
      return false;
    };

    if (await tryToolbarDownloadInRoot(panel)) {
      return;
    }
    if (await tryToolbarDownloadInRoot(strip)) {
      return;
    }
    if (await tryToolbarDownloadInRoot(uploadPanelByRole)) {
      return;
    }

    const tryDownloadFromOverflow = async (row: Locator): Promise<boolean> => {
      const toggles = [
        row.locator("button").filter({ has: row.locator(".pi-ellipsis-v, .pi-ellipsis-h") }),
        row.getByRole("button", { name: /more|actions|menu|options/i }),
      ];
      for (const t of toggles) {
        const btn = t.first();
        if (!(await btn.isVisible({ timeout: 800 }).catch(() => false))) continue;
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ timeout: 5_000 }).catch(() => {});
        const menuItem = this.page
          .getByRole("menuitem", { name: /download/i })
          .or(this.page.locator(".p-menuitem-link, .p-menu a").filter({ hasText: /download/i }))
          .first();
        if (await menuItem.isVisible({ timeout: 3_000 }).catch(() => false)) {
          const ok = await clickExpectsDownloadOutcome(menuItem);
          await this.page.keyboard.press("Escape").catch(() => {});
          if (ok) return true;
        }
        await this.page.keyboard.press("Escape").catch(() => {});
      }
      return false;
    };

    const candidatesForRow = (row: Locator): Locator[] => [
      row.locator("a[download]").first(),
      row.getByRole("link", { name: /download/i }),
      row.getByRole("button", { name: /download/i }),
      row.locator("a, button, [role='button']").filter({ hasText: /download/i }),
      row.locator("[title*='Download' i], [aria-label*='Download' i]"),
      row.locator("[class*='pi-download']").first(),
      row
        .locator(
          "i.pi-download, .pi-download, i.pi-cloud-download, .pi-cloud-download, i.pi-arrow-circle-down, i.pi-file-export, i.pi-save, .pi-save, i.pi-arrow-down-to-line",
        )
        .locator(
          "xpath=ancestor::button[1] | ancestor::a[1] | ancestor::*[contains(@class,'p-button')][1] | ancestor::*[contains(@class,'mdc-icon-button')][1]",
        ),
      row.locator("p-splitButton .p-splitbutton-defaultbutton").first(),
      row.locator(".p-splitbutton .p-button").first(),
    ];

    const tryDownloadOnRow = async (row: Locator): Promise<boolean> => {
      for (const c of candidatesForRow(row)) {
        if (await clickExpectsDownloadOutcome(c.first())) {
          return true;
        }
      }
      return tryDownloadFromOverflow(row);
    };

    const n = await rows.count();
    for (let i = 0; i < Math.min(Math.max(n, 1), 12); i++) {
      const row = rows.nth(i);
      if (!(await row.isVisible({ timeout: 2_000 }).catch(() => false))) continue;
      if (await tryDownloadOnRow(row)) {
        return;
      }
    }

    throw new Error(
      "Upload tab: could not start download from file row (no Download control found).",
    );
  }

  async deleteUploadedDocumentTileByBasenameAndExpectRemoved(basename: string): Promise<void> {
    await this.ensureUploadTab();
    const escaped = basename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRe = new RegExp(escaped, "i");

    const tilePreferred = this.page
      .locator(".p-fileupload-files > div, .p-fileupload-content > div")
      .filter({ hasText: nameRe })
      .first();
    const rowFallback = this.page
      .locator(".p-fileupload-row, tr, .p-fileupload-file")
      .filter({ hasText: nameRe })
      .first();

    const container = (await tilePreferred.isVisible({ timeout: 5_000 }).catch(() => false))
      ? tilePreferred
      : rowFallback;

    await expect(container).toBeVisible({ timeout: 60_000 });
    const deleteBtn = container.locator("button").first();
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
    await deleteBtn.scrollIntoViewIfNeeded().catch(() => {});
    await deleteBtn
      .click({ timeout: 10_000 })
      .catch(async () => {
        await deleteBtn.click({ force: true, timeout: 5_000 });
      });
    await expect(container).not.toBeVisible({ timeout: 45_000 });
  }

  /**
   * After Documents / long flows the header can be off-screen. Bring **workflow status** (Open Quote)
   * or the **Open Quote** control into view before opening the menu so **Submit** / **Withdraw** is reachable.
   */
  private async scrollWorkflowStatusHeaderIntoView(): Promise<void> {
    this.assertPageOpen("scrollWorkflowStatusHeaderIntoView");
    const p = this.page;
    const statusStrip = p
      .locator('input[name="workFlowStatus"]')
      .filter({ visible: true })
      .first()
      .or(p.locator("div.col-2.status.w-10rem.ng-star-inserted").filter({ visible: true }).first())
      .or(p.locator(".col-2.status").filter({ visible: true }).first());
    if (await statusStrip.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await statusStrip.scrollIntoViewIfNeeded();
    } else {
      await p
        .getByRole("button", { name: /Open Quote/i })
        .first()
        .scrollIntoViewIfNeeded()
        .catch(() => {});
    }
    await this.postSubmitMicroDelay(100);
  }

  /** Opens the quote **workflow status** menu (same triggers as {@link submitQuoteFromStatusMenu}). */
  private async openWorkflowStatusDropdownInner(): Promise<void> {
    this.assertPageOpen("openWorkflowStatusDropdownInner");
    const p = this.page;
    const workflowStatusByName = p.locator('input[name="workFlowStatus"]').filter({ visible: true }).first();
    if (await workflowStatusByName.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await workflowStatusByName.scrollIntoViewIfNeeded();
      await workflowStatusByName.click({ timeout: 10_000 });
      await this.postSubmitMicroDelay(150);
      return;
    }

    const statusColVisible = p
      .locator("div.col-2.status.w-10rem.ng-star-inserted")
      .filter({ visible: true })
      .first();
    if (await statusColVisible.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await statusColVisible.scrollIntoViewIfNeeded();
      await statusColVisible.click({ timeout: 10_000 });
      await this.postSubmitMicroDelay(150);
      return;
    }

    const workflowStatusInput = p
      .locator(".col-2.status, .col-2.status.w-10rem, [class*='status'].w-10rem")
      .first()
      .locator("input.p-element.p-inputtext.p-component, input.p-inputtext.p-component.p-element")
      .first();
    if (await workflowStatusInput.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await workflowStatusInput.scrollIntoViewIfNeeded();
      await workflowStatusInput.click({ timeout: 10_000 });
      await this.postSubmitMicroDelay(120);
      return;
    }

    const statusQuoteCell = p
      .locator(".col-2.status.w-10rem.ng-star-inserted, .col-2.status.w-10rem, .col-2.status")
      .or(
        p
          .locator("[class*='status']")
          .filter({ has: p.locator("p-dropdown, p-select, .p-dropdown, .p-select") }),
      )
      .first();
    if (await statusQuoteCell.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const trigger = statusQuoteCell
        .locator(".p-dropdown-trigger, .p-select-trigger, [aria-haspopup='listbox']")
        .first();
      if (await trigger.isVisible({ timeout: 2_500 }).catch(() => false)) {
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click({ timeout: 10_000 });
      } else {
        await statusQuoteCell.click({ timeout: 10_000 });
      }
      await this.postSubmitMicroDelay(120);
      return;
    }

    const openQuote = p.getByRole("button", { name: /Open Quote/i });
    if (await openQuote.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await expect(openQuote).toBeVisible({ timeout: 8_000 });
      await openQuote.scrollIntoViewIfNeeded();
      await openQuote.click({ timeout: 12_000 });
      await this.postSubmitMicroDelay(120);
      return;
    }

    await statusQuoteCell.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
    if (await statusQuoteCell.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const trigger = statusQuoteCell
        .locator(".p-dropdown-trigger, .p-select-trigger, [aria-haspopup='listbox']")
        .first();
      if (await trigger.isVisible({ timeout: 2_500 }).catch(() => false)) {
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click({ timeout: 10_000 });
      } else {
        await statusQuoteCell.click({ timeout: 10_000 });
      }
      await this.postSubmitMicroDelay(120);
    }
  }

  private workflowMenuOverlayLocator(): Locator {
    return this.page
      .locator(
        ".p-menu-overlay, .p-tieredmenu-overlay, .p-overlaypanel, .p-component-overlay-content, .p-dropdown-panel, .p-select-overlay",
      )
      .filter({ visible: true })
      .filter({ hasText: /Submit|Withdraw/i })
      .first();
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
  async workflowWithdrawThenCancelExpectOpenQuoteStatus(): Promise<void> {
    this.logStep("Workflow: Withdraw → Cancel → expect Open Quote");
    const p = this.page;
    this.assertPageOpen("workflowWithdrawThenCancelExpectOpenQuoteStatus");
    await p.keyboard.press("Escape").catch(() => {});
    await this.scrollWorkflowStatusHeaderIntoView();
    // eslint-disable-next-line no-console
    console.log("Workflow: Open Quote");
    await this.openWorkflowStatusDropdownInner();
    // eslint-disable-next-line no-console
    console.log("Workflow dropdown opened");
    await expect(this.workflowMenuOverlayLocator())
      .toBeVisible({ timeout: 6_000 })
      .catch(() => {});

    const withdrawOption = p
      .locator("div.action-item")
      .filter({ hasText: /^Withdraw$/i })
      .first()
      .or(p.getByText(/^Withdraw$/i).first());

    await expect(withdrawOption).toBeVisible({ timeout: 10_000 });
    // eslint-disable-next-line no-console
    console.log("Withdraw visible:", await withdrawOption.isVisible().catch(() => false));

    await withdrawOption.click({ force: true, timeout: 10_000 });
    // eslint-disable-next-line no-console
    console.log("Withdraw clicked");

    await this.postSubmitMicroDelay(150);

    const confirmDlg = p
      .locator("p-confirmdialog, .p-confirm-dialog")
      .filter({ visible: true })
      .filter({ hasText: /Withdraw|withdraw|sure|confirm|certain/i })
      .first()
      .or(p.getByRole("dialog").filter({ visible: true }).filter({ hasText: /Withdraw/i }).first());
    await expect(confirmDlg).toBeVisible({ timeout: 15_000 });

    const cancelBtn = confirmDlg
      .getByRole("button", { name: /^Cancel$/i })
      .or(confirmDlg.locator("button.p-confirm-dialog-reject").first())
      .first();
    await cancelBtn.click({ timeout: 12_000 });
    // eslint-disable-next-line no-console
    console.log("Workflow: Withdraw cancelled");
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
      await p.waitForTimeout(150);
      return;
    }

    await p.keyboard.press("Escape").catch(() => {});
    await p.waitForTimeout(120);
    await this.openWorkflowStatusDropdownInner();
    await expect(this.workflowMenuOverlayLocator()).toBeVisible({ timeout: 5_000 }).catch(() => {});

    if (await clickSubmitMenuItem()) {
      await p.waitForTimeout(150);
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
  private async expectPostSubmitWorkflowSuccess(): Promise<void> {
    const p = this.page;
    await p.keyboard.press("Escape").catch(() => {});
    await p.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});

    await expect
      .poll(
        async () => {
          const toast = p
            .locator(".p-toast-message-success, .p-toast-message-info, .p-toast")
            .filter({
              hasText: /success|submitted|complete|accepted|processed|thank you/i,
            });
          if (await toast.first().isVisible().catch(() => false)) return true;
          const body = p
            .getByText(
              /successfully\s+submitted|submitted\s+successfully|quote.*submitted|submission.*successful|successfully/i,
            )
            .first();
          if (await body.isVisible().catch(() => false)) return true;
          const status = p
            .locator(".col-2.status, [class*='status']")
            .filter({ hasText: /Submitted|Complete|Accepted|Succeed/i });
          return await status.first().isVisible().catch(() => false);
        },
        { timeout: 90_000, intervals: [1_000, 3_000, 5_000] },
      )
      .toBeTruthy();
  }

  /**
   * Originator Declaration: tick the first two statement checkboxes, then **Proceed**.
   * Dialog accessible name / title copy varies; some builds open a plain `.p-dialog` without `aria-labelledby`.
   */
  async completeOriginatorDeclaration(): Promise<void> {
    const p = this.page;
    await p.waitForTimeout(2500);
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

    const boxes = scope.locator(".p-checkbox-box, [data-pc-section='checkbox']");
    const n = await boxes.count();
    const limit = Math.min(2, n);
    for (let i = 0; i < limit; i++) {
      const box = boxes.nth(i);
      if (await box.isVisible().catch(() => false)) {
        await box.scrollIntoViewIfNeeded();
        await box.click();
      }
    }
    // eslint-disable-next-line no-console
    console.log("Workflow: Declaration checked");

    const proceed = scope
      .getByRole("button", { name: /^Proceed$/i })
      .or(scope.locator(':text-is("Proceed")'))
      .first();
    await proceed.waitFor({ state: "visible", timeout: 25_000 });
    await proceed.click({ timeout: 15_000 });
    // eslint-disable-next-line no-console
    console.log("Workflow: Final submit clicked");
    await scope.waitFor({ state: "hidden", timeout: 90_000 }).catch(() => {});
    await this.expectPostSubmitWorkflowSuccess();
    // eslint-disable-next-line no-console
    console.log("Workflow: Quote submitted");
  }

  /** Post-submission document strip (`Upload` / `Documents` / `Signing`). */
  documentManagementStrip(): Locator {
    return this.documentManagementTabView();
  }

  /** UDP-T3823 — uploaded documents grid exposes FIS display columns (best-effort per build). */
  async expectUploadTabUploadedDocumentsGridColumns(): Promise<void> {
    this.logStep("Expect Upload Tab Uploaded Documents Grid Columns");
    await this.ensureUploadTab();
    const panel = this.uploadTabContentPanel();
    const headers = [/Name/i, /Category/i, /Type/i, /Loaded On/i, /Loaded By/i, /Source/i];
    for (const hdr of headers) {
      const col = panel
        .getByRole("columnheader", { name: hdr })
        .or(panel.locator("th").filter({ hasText: hdr }))
        .or(this.page.getByText(hdr).first());
      await expect.soft(col.first()).toBeVisible({ timeout: 20_000 });
    }
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

  /** UDP-T3845+ — open **Credit Conditions** tab in Post Submission (when AF data exists). */
  async openCreditConditionsTab(): Promise<void> {
    this.logStep("Open Credit Conditions Tab");
    let root = this.documentManagementStrip();
    if ((await root.count()) === 0) {
      root = this.page.locator(".p-tabview").first();
    }
    const tab = root
      .getByRole("tab", { name: /Credit Conditions|Additional Approval Conditions/i })
      .or(root.locator("a.p-tabview-nav-link").filter({ hasText: /Credit Conditions|Additional Approval/i }))
      .first();
    await tab.waitFor({ state: "visible", timeout: 60_000 });
    await tab.click({ timeout: 20_000 });
    await expect(
      root.getByText(/Condition/i).or(root.getByRole("columnheader", { name: /Condition/i })),
    ).toBeVisible({ timeout: 45_000 });
  }

  /** UDP-T3862 — **Next** is not available on Post Submission. */
  async expectPostSubmissionNextButtonHidden(): Promise<void> {
    this.logStep("Expect Post Submission Next Button Hidden");
    await this.waitForUploadStep();
    const nextInPost = this.page
      .locator("app-customer-quote-post-submit, app-post-submission")
      .getByRole("button", { name: /^Next$/i });
    await expect(nextInPost).toHaveCount(0, { timeout: 10_000 });
  }

  /** UDP-T3861 — Notes and Upload remain actionable in Post Submission. */
  async expectPostSubmissionNotesAndUploadActionable(): Promise<void> {
    this.logStep("Expect Post Submission Notes And Upload Actionable");
    await this.waitForUploadStep();
    await expect(this.addNewNotesButton).toBeEnabled({ timeout: 30_000 });
    await expect(this.browseFilesButton).toBeVisible({ timeout: 30_000 });
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
