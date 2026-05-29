/**
 * RSS Apply Now — Application documents (step 3): optional uploads, APLYiD, acknowledgements, Submit.
 * Aligns with `ion-checkbox[name="startVerification"|"legalConfirmed"]`, `#fileInput` (same backup PDF pattern as DO post-submit).
 */

import path from "path";
import { expect, Page } from "@playwright/test";
import { BasePage } from "../../common/BasePage";

/** Default PDF under `backup/testData` (shared with DO customer quote upload). */
export const RSS_DEFAULT_APPLY_NOW_UPLOAD_PDF = path.join(
  process.cwd(),
  "backup",
  "testData",
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
    await expect(this.page.getByText(/Application documents/i).first()).toBeVisible({
      timeout: 120_000,
    });
    await this.waitForLoadingComplete();
  }

  /**
   * Hidden `#fileInput` behind the Browse Files label — `setInputFiles` does not require clicking Browse.
   */
  async uploadSupportingDocument(
    filePath: string = RSS_DEFAULT_APPLY_NOW_UPLOAD_PDF,
  ): Promise<void> {
    this.logStep("Upload Supporting Document");
    await this.waitForProgressSpinnersHidden();
    const input = this.page.locator("#fileInput");
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
}
