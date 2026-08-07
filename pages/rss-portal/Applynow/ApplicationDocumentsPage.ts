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

  async expectQuoteCreatedConfirmation(): Promise<void> {
    this.logStep("Expect Quote Created Confirmation");
    await expect(
      this.page
        .getByText(/quote|contract|created|submitted|confirmation/i)
        .first(),
    ).toBeVisible({ timeout: 120_000 });
    await expect(
      this.page.getByText(/Quote|Loan|Contract/i).first(),
    ).toBeVisible({ timeout: 60_000 });
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
