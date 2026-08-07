/**
 * RSS Sanity — Contact UDC (URP-T55)
 * Zephyr: /RSS Sanity Suite/Contact UDC
 * Source: RSS Contact UDC Test Cases.xlsx
 *
 * Top-bar mail icon → fill form → submit → View my request → My Requests table.
 */

import { expect, test } from "../../../../fixtures/rssPortalTest";
import { RSSContactUdcPage, RSSDashboardPage } from "../../../../pages";

test.describe("RSS Portal — Contact UDC @rss @sanity", () => {
  test("URP-T55 - Contact UDC - Submission of Contact UDC request @smoke", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const contactUdc = new RSSContactUdcPage(page);

    expect(await dashboard.isDashboardLoaded()).toBe(true);
    await expect(contactUdc.contactTopbarButton).toBeVisible({ timeout: 15_000 });

    await contactUdc.openFromTopbar();

    const categoryOptions = await contactUdc.getDropdownOptionLabels(
      contactUdc.messageCategoryDropdown(),
    );
    const contactMethodOptions = await contactUdc.getDropdownOptionLabels(
      contactUdc.preferredContactMethodDropdown(),
    );
    expect(categoryOptions.length).toBeGreaterThan(0);
    expect(contactMethodOptions.length).toBeGreaterThan(0);

    const message = `Automation URP-T55 contact request ${Date.now()}`;
    await contactUdc.fillRequiredFields({
      messageCategory: categoryOptions[0],
      message,
      preferredContactMethod: contactMethodOptions[0],
    });

    await contactUdc.submit();
    await contactUdc.expectSubmissionConfirmation();
    await contactUdc.clickViewMyRequest();
    await contactUdc.expectMyRequestsWithListedRequest();
  });
});
