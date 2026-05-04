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
    await this.page.getByRole("dialog", { name: /Document Parameters/i }).waitFor({
      state: "visible",
      timeout: 30000,
    });
    await this.confirmButton.click();
    await this.page.getByRole("dialog", { name: /Document Parameters/i }).waitFor({
      state: "hidden",
      timeout: 30000,
    }).catch(() => {});
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

  /**
   * **Status :** quote dropdown (Selector Hub: `.col-2.status.w-10rem.ng-star-inserted`) → **Submit**.
   * Submit uses `:text("Submit")` scoped to the open `.p-dropdown-panel` so other Submit buttons are not hit.
   */
  async submitQuoteFromStatusMenu(): Promise<void> {
    const statusQuoteCell = this.page.locator(".col-2.status.w-10rem.ng-star-inserted").or(
      this.page.locator(".col-2.status.w-10rem"),
    );

    await statusQuoteCell.first().waitFor({ state: "visible", timeout: 60000 });

    const trigger = statusQuoteCell
      .first()
      .locator(".p-dropdown-trigger, .p-select-trigger, [aria-haspopup='listbox']")
      .first();

    if (await trigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click({ timeout: 15000 });
    } else {
      await statusQuoteCell.first().click({ timeout: 15000 });
    }

    let panel = this.page
      .locator(".p-dropdown-panel")
      .filter({ visible: true })
      .filter({ hasText: /Withdraw/i })
      .last();

    try {
      await panel.waitFor({ state: "visible", timeout: 8000 });
    } catch {
      panel = this.page.locator(".p-dropdown-panel").filter({ visible: true }).last();
      await panel.waitFor({ state: "visible", timeout: 20000 });
    }

    await new Promise((r) => setTimeout(r, 300));

    const submitChoices: Locator[] = [
      panel.getByRole("option", { name: /^Submit$/i }),
      panel.locator("li.p-dropdown-item").filter({ hasText: /^Submit$/i }),
      panel.locator("li.p-dropdown-item span").filter({ hasText: /^Submit$/i }),
      panel.locator("li").filter({ hasText: /^Submit$/i }),
      panel.getByText("Submit", { exact: true }),
      panel.locator(':text-is("Submit")'),
      panel.locator(':text("Submit")'),
      this.page.locator(".cdk-overlay-pane").filter({ visible: true }).locator(':text-is("Submit")'),
    ];

    let clicked = false;
    for (const choice of submitChoices) {
      const target = choice.first();
      try {
        await target.waitFor({ state: "visible", timeout: 4000 });
        await target.scrollIntoViewIfNeeded();
        await target.click({ timeout: 10000 });
        clicked = true;
        break;
      } catch {
        /* next */
      }
    }

    if (!clicked) {
      await panel.locator("li.p-dropdown-item").first().click({ timeout: 10000, force: true });
    }

    await this.page.locator(".p-dropdown-panel").waitFor({
      state: "hidden",
      timeout: 15000,
    }).catch(() => {});
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
