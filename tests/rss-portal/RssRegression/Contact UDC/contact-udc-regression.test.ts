/**
 * RSS Regression — Contact UDC (URP-T101, URP-T141–T144, URP-T201)
 * Zephyr: /RSS Regression Suite/Contact UDC
 * Source: RSS Contact UDC Regression Test cases.xlsx
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import { RSSContactUdcPage, RSSDashboardPage } from "../../../../pages";

async function openContactUdcDialog(
  dashboard: RSSDashboardPage,
  contactUdc: RSSContactUdcPage,
): Promise<void> {
  expect(await dashboard.isDashboardLoaded()).toBe(true);
  await expect(contactUdc.contactTopbarButton).toBeVisible({ timeout: 15_000 });
  await contactUdc.openFromTopbar();
}

test.describe("RSS Portal — Contact UDC @rss @regression", () => {
  test(
    "URP-T101 - Contact UDC - Submission of Contact UDC request",
    { tag: ["@rss", "@regression", "@URP-T101"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const contactUdc = new RSSContactUdcPage(page);

      await openContactUdcDialog(dashboard, contactUdc);

      const categoryOptions = await contactUdc.getDropdownOptionLabels(
        contactUdc.messageCategoryDropdown(),
      );
      const contactMethodOptions = await contactUdc.getDropdownOptionLabels(
        contactUdc.preferredContactMethodDropdown(),
      );
      expect(categoryOptions.length).toBeGreaterThan(0);
      expect(contactMethodOptions.length).toBeGreaterThan(0);

      const message = `Automation URP-T101 contact request ${Date.now()}`;
      await contactUdc.fillRequiredFields({
        messageCategory: categoryOptions[0],
        message,
        preferredContactMethod: contactMethodOptions[0],
      });

      await contactUdc.submit();
      await contactUdc.expectSubmissionConfirmation();
    },
  );

  test(
    "URP-T141 - Contact UDC - Mandatory field validation on submit",
    { tag: ["@rss", "@regression", "@URP-T141"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const contactUdc = new RSSContactUdcPage(page);

      await openContactUdcDialog(dashboard, contactUdc);
      await contactUdc.submitAndExpectMandatoryFieldError();
    },
  );

  test(
    "URP-T142 - Contact UDC - Preferred contact time disabled when method is Email",
    { tag: ["@rss", "@regression", "@URP-T142"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const contactUdc = new RSSContactUdcPage(page);

      await openContactUdcDialog(dashboard, contactUdc);

      const categoryOptions = await contactUdc.getDropdownOptionLabels(
        contactUdc.messageCategoryDropdown(),
      );
      await contactUdc.fillRequiredFields({
        messageCategory: categoryOptions[0],
        message: `Automation URP-T142 contact ${Date.now()}`,
        preferredContactMethod: "Phone",
      });

      const contactTimeOptions = await contactUdc.getDropdownOptionLabels(
        contactUdc.preferredContactTimeDropdown(),
      );
      if (contactTimeOptions.length > 0) {
        await contactUdc.selectPreferredContactTime(contactTimeOptions[0]);
      }

      await contactUdc.selectPreferredContactMethod("Email");
      await contactUdc.expectPreferredContactTimeDisabled();

      await contactUdc.selectPreferredContactMethod("Phone");
      if (contactTimeOptions.length > 0) {
        await contactUdc.selectPreferredContactTime(contactTimeOptions[0]);
      }
      await contactUdc.selectPreferredContactMethod("Email");
      await contactUdc.expectPreferredContactTimeCleared();
    },
  );

  test(
    "URP-T143 - Contact UDC - Message character limit 1000",
    { tag: ["@rss", "@regression", "@URP-T143"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const contactUdc = new RSSContactUdcPage(page);

      await openContactUdcDialog(dashboard, contactUdc);
      await contactUdc.expectMessageCharacterLimit1000();
    },
  );

  test(
    "URP-T144 - Contact UDC - Cancel and close confirmation pop-up",
    { tag: ["@rss", "@regression", "@URP-T144"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const contactUdc = new RSSContactUdcPage(page);

      await openContactUdcDialog(dashboard, contactUdc);
      await contactUdc.clickCancelAndExpectUnsavedChangesDialog();

      await contactUdc.unsavedChangesDialog().getByRole("button", { name: /^No$/i }).click();
      await contactUdc.expectContactDialogVisible();

      await contactUdc.clickCloseAndExpectUnsavedChangesDialog();
    },
  );

  test(
    "URP-T201 - Contact UDC - Submitted request visible in My requests list",
    { tag: ["@rss", "@regression", "@URP-T201"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const contactUdc = new RSSContactUdcPage(page);

      await openContactUdcDialog(dashboard, contactUdc);

      const categoryOptions = await contactUdc.getDropdownOptionLabels(
        contactUdc.messageCategoryDropdown(),
      );
      const contactMethodOptions = await contactUdc.getDropdownOptionLabels(
        contactUdc.preferredContactMethodDropdown(),
      );

      await contactUdc.fillRequiredFields({
        messageCategory: categoryOptions[0],
        message: `Automation URP-T201 contact request ${Date.now()}`,
        preferredContactMethod: contactMethodOptions[0],
      });

      await contactUdc.submit();
      await contactUdc.expectSubmissionConfirmation();
      await contactUdc.clickViewMyRequest();
      await contactUdc.expectMyRequestsWithListedRequest();
    },
  );
});
