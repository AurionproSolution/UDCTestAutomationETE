/**
 * RSS Apply Now — Application documents (step 3): optional uploads, APLYiD, acknowledgements, Submit.
 * Aligns with `ion-checkbox[name="startVerification"|"legalConfirmed"]`, `#fileInput` (same default PDF pattern as DO post-submit).
 */

import path from "path";
import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

/** Default PDF under `testData/rss-portal` (same asset name as DO customer quote upload). */
export const RSS_DEFAULT_APPLY_NOW_UPLOAD_PDF = path.join(
  process.cwd(),
  "testData",
  "rss-portal",
  "exportedPDFFile (3) (1).pdf",
);

export class RSSApplyNowApplicationDocumentsPage extends BasePage {
  private static readonly SPINNER_WAIT_MS = 300_000;

  constructor(page: Page) {
    super(page);
  }

  protected stepLogPrefix(): string {
    return "RSS Apply Now — Application documents";
  }

  private async waitForProgressSpinnersHidden(
    timeoutMs = RSSApplyNowApplicationDocumentsPage.SPINNER_WAIT_MS,
  ): Promise<void> {
    await expect
      .poll(
        async () => {
          const items = this.page.locator("p-progressspinner");
          const count = await items.count();
          for (let i = 0; i < count; i++) {
            if (await items.nth(i).isVisible().catch(() => false)) {
              return false;
            }
          }
          return true;
        },
        { timeout: timeoutMs, intervals: [200, 400, 800, 1500] },
      )
      .toBe(true);
  }

  async waitForApplicationDocumentsStep(): Promise<void> {
    this.logStep("Wait For Application Documents Step");
    await expect
      .poll(
        async () => {
          const fileInputCount = await this.page.locator('#fileInput, input[type="file"]').count();
          if (fileInputCount > 0) return true;
          return this.page
            .getByText(/Browse Files|Upload documents|Supporting document/i)
            .first()
            .isVisible()
            .catch(() => false);
        },
        { timeout: 120_000, intervals: [250, 500, 1_000, 2_000] },
      )
      .toBe(true);
    await this.waitForLoadingComplete();
  }

  private fileUploadInput(): Locator {
    return this.page.locator('#fileInput, input[type="file"]').first();
  }

  /**
   * Hidden `#fileInput` behind the Browse Files label — `setInputFiles` does not require clicking Browse.
   */
  async uploadSupportingDocument(
    filePath: string = RSS_DEFAULT_APPLY_NOW_UPLOAD_PDF,
  ): Promise<void> {
    this.logStep("Upload Supporting Document");
    await this.waitForProgressSpinnersHidden();
    const input = this.fileUploadInput();
    await input.waitFor({ state: "attached", timeout: 30_000 });
    await input.setInputFiles(filePath);
    await this.waitForLoadingComplete();
  }

  private async checkIonCheckboxByName(
    name: "startVerification" | "legalConfirmed",
  ): Promise<void> {
    const box = this.page.locator(`ion-checkbox[name="${name}"]`).first();
    await box.waitFor({ state: "visible", timeout: 30_000 });
    if ((await box.getAttribute("aria-checked")) === "true") {
      return;
    }
    await this.scrollIfNeeded(box);
    await box.click({ timeout: 30_000 });
    await expect(box).toHaveAttribute("aria-checked", "true", { timeout: 15_000 });
    await this.waitForLoadingComplete();
  }

  /** APLYiD — `ion-checkbox[name="startVerification"]` beside the logo. */
  async checkApplyIdStartVerification(): Promise<void> {
    this.logStep("Check Apply Id Start Verification");
    await this.checkIonCheckboxByName("startVerification");
  }

  /** Acknowledgements* — required before Submit in the live form. */
  async confirmLegalAcknowledgements(): Promise<void> {
    this.logStep("Confirm Legal Acknowledgements");
    await this.checkIonCheckboxByName("legalConfirmed");
  }

  async fillNotes(notes: string): Promise<void> {
    this.logStep("Fill Notes");
    const notesInput = this.page
      .getByLabel(/Notes/i)
      .or(this.page.locator('[formcontrolname="notes"] textarea, [formcontrolname="notes"] input'))
      .or(this.page.getByPlaceholder(/Notes/i))
      .first();
    if (await notesInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await this.clickAndFillElement(notesInput, notes);
      await this.waitForLoadingComplete();
    }
  }

  /** Footer primary — solid Submit (same pattern as `:text-is("Next")`). */
  async clickSubmit(clickTimeoutMs = 60_000): Promise<void> {
    this.logStep("Click Submit");
    await this.waitForProgressSpinnersHidden();
    const submit = this.page
      .locator(':text-is("Submit")')
      .filter({ visible: true })
      .first();
    await submit.waitFor({ state: "visible", timeout: 30_000 });
    await this.scrollIfNeeded(submit);
    await this.clickElement(submit, clickTimeoutMs);
    await this.waitForLoadingComplete();
  }

  private applyNowSubmissionSuccessDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ hasText: /Your application has been submitted/i })
      .first();
  }

  async dismissApplyNowSubmissionSuccessDialog(): Promise<void> {
    this.logStep("Dismiss Apply Now Submission Success Dialog");
    const dialog = this.applyNowSubmissionSuccessDialog();
    const mask = this.page.locator(".p-dialog-mask.p-component-overlay").last();

    if (!(await dialog.isVisible({ timeout: 5_000 }).catch(() => false))) {
      if (await mask.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await this.page.keyboard.press("Escape").catch(() => undefined);
        await expect(mask).toBeHidden({ timeout: 15_000 });
      }
      return;
    }

    const closeButton = dialog
      .getByRole("button", { name: /^Close$/i })
      .or(dialog.locator("button.p-dialog-header-close"))
      .or(this.page.locator('[role="dialog"] button[aria-label="Close"]'))
      .first();

    if (await closeButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await closeButton.click({ force: true, timeout: 15_000 });
    } else {
      await this.page.keyboard.press("Escape");
    }

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(mask).toBeHidden({ timeout: 15_000 }).catch(() => undefined);
    await this.waitForLoadingComplete();
  }

  private readQuoteIdFromSubmissionConfirmationText(text: string): string {
    const normalized = text.replace(/\s+/g, " ");
    const patterns = [
      /Your\s+Quote\s+No\.?\s*:\s*(\d+)/i,
      /Quote\s*No\.?\s*[:#-]?\s*(\d+)/i,
      /\b(\d{2,})\s*\|\s*(?:TL|CSA|FL|AFV|MV|Dealer|Credit|Term|Consumer)/i,
      /Quote(?:\s*(?:ID|No\.?|Number))?\s*[:#-]?\s*(\d{2,})/i,
    ];
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }
    return "";
  }

  async expectQuoteCreatedConfirmation(): Promise<void> {
    this.logStep("Expect Quote Created Confirmation");
    await expect(this.applyNowSubmissionSuccessDialog()).toBeVisible({
      timeout: 120_000,
    });
    await expect(
      this.applyNowSubmissionSuccessDialog().getByText(/Your application has been submitted/i),
    ).toBeVisible({ timeout: 15_000 });
    await this.waitForLoadingComplete();
  }

  /** Quote / contract id shown after successful Apply Now submit (e.g. `Your Quote No :546`). */
  async readCreatedQuoteIdFromConfirmation(): Promise<string> {
    this.logStep("Read Created Quote Id From Confirmation");
    await this.expectQuoteCreatedConfirmation();

    try {
      const dialogText = (await this.applyNowSubmissionSuccessDialog().innerText()).replace(
        /\s+/g,
        " ",
      );
      let quoteId = this.readQuoteIdFromSubmissionConfirmationText(dialogText);
      if (!quoteId) {
        const bodyText = (await this.page.locator("body").innerText()).replace(/\s+/g, " ");
        quoteId = this.readQuoteIdFromSubmissionConfirmationText(bodyText);
      }

      expect(quoteId, "Created quote id must be available after Apply Now submit.").toBeTruthy();
      return quoteId;
    } finally {
      await this.dismissApplyNowSubmissionSuccessDialog();
    }
  }

  uploadedDocumentNameHint(filePath: string = RSS_DEFAULT_APPLY_NOW_UPLOAD_PDF): string {
    const baseName = path.basename(filePath);
    return baseName.replace(/\.[^.]+$/, "").split("(")[0].trim();
  }

  async submitApplicationWithDocuments(options?: {
    notes?: string;
    useApplyId?: boolean;
  }): Promise<void> {
    this.logStep("Submit Application With Documents");
    await this.uploadSupportingDocument();
    if (options?.useApplyId) {
      await this.checkApplyIdStartVerification();
    }
    await this.confirmLegalAcknowledgements();
    if (options?.notes) {
      await this.fillNotes(options.notes);
    }
    await this.clickSubmit();
    await this.expectQuoteCreatedConfirmation();
    await this.dismissApplyNowSubmissionSuccessDialog();
  }

  async clickApplyNowFooterPrevious(clickTimeoutMs = 60_000): Promise<void> {
    this.logStep("Click Apply Now Footer Previous");
    await this.waitForProgressSpinnersHidden();
    const previous = this.page.locator(':text-is("Previous")').filter({ visible: true }).first();
    await previous.waitFor({ state: "visible", timeout: 30_000 });
    await this.clickElement(previous, clickTimeoutMs);
    await this.waitForLoadingComplete();
  }

  async expectSubmitBlockedWithoutAcknowledgement(): Promise<void> {
    this.logStep("Expect Submit Blocked Without Acknowledgement");
    await this.uploadSupportingDocument();
    await this.clickSubmit();
    await expect(
      this.page.getByText(/acknowledg|terms|condition|required|mandatory/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  async expectInvalidFileTypeRejected(filePath: string): Promise<void> {
    this.logStep("Expect Invalid File Type Rejected");
    const input = this.fileUploadInput();
    await input.waitFor({ state: "attached", timeout: 30_000 });
    await input.setInputFiles(filePath);
    await expect(
      this.page.getByText(/file type|not acceptable|not allowed|invalid/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  async expectOversizedFileRejected(filePath: string): Promise<void> {
    this.logStep("Expect Oversized File Rejected");
    const input = this.fileUploadInput();
    await input.waitFor({ state: "attached", timeout: 30_000 });
    await input.setInputFiles(filePath);
    await expect(
      this.page.getByText(/20\s*mb|file size|too large|size limit/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  }
}
