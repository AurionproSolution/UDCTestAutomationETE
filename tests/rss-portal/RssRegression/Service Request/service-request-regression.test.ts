/**
 * RSS Regression — Service Request (URP-T93–T96, URP-T145–T149, URP-T182, URP-T202–T205, URP-T212–T213)
 * Zephyr: /RSS Regression Suite/Service Request
 * Source: RSS Service request Regression Test Cases.xlsx
 */

import fs from "fs";
import os from "os";
import path from "path";
import { expect, test } from "../../../../fixtures/rssPortalTest";
import {
  RSS_DEFAULT_SERVICE_REQUEST_UPLOAD_PDF,
  RSSDashboardPage,
  RSSServiceRequestPage,
  RSSSideMenuPage,
} from "../../../../pages";
import {
  ensureServiceRequestParty,
  openServiceRequestFromDrawer,
} from "./service-request-regression.helpers";

test.describe("RSS Portal — Service Request @rss @regression", () => {
  test(
    "URP-T93 - Service request - Experiencing financial difficulty",
    { tag: ["@rss", "@regression", "@URP-T93"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Experiencing Financial Difficulty/i);
      await serviceRequest.expectCategorySelected(/Experiencing Financial Difficulty/i);
      await serviceRequest.expectExperiencingFinancialDifficultyFormVisible();
    },
  );

  test(
    "URP-T94 - Service request - Update Contact Details",
    { tag: ["@rss", "@regression", "@URP-T94"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Update Contact Details/i);
      await serviceRequest.expectCategorySelected(/Update Contact Details/i);
      await serviceRequest.expectUpdateContactDetailsFormVisible();
    },
  );

  test(
    "URP-T95 - Service request - Update Address Details",
    { tag: ["@rss", "@regression", "@URP-T95"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Update Address Details/i);
      await serviceRequest.expectCategorySelected(/Update Address Details/i);
      await serviceRequest.expectUpdateAddressDetailsFormVisible();
    },
  );

  test(
    "URP-T96 - Service request - Change Bank Account Details",
    { tag: ["@rss", "@regression", "@URP-T96"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await ensureServiceRequestParty(dashboard);
      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Change Bank Account Details/i);
      await serviceRequest.expectCategorySelected(/Change Bank Account Details/i);
      await serviceRequest.expectChangeBankAccountDetailsFormVisible();
    },
  );

  test(
    "URP-T145 - Service request - Experiencing financial difficulty - Mandatory field validation",
    { tag: ["@rss", "@regression", "@URP-T145"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Experiencing Financial Difficulty/i);
      await serviceRequest.expectExperiencingFinancialDifficultyFormVisible();
      await serviceRequest.submitAndExpectMandatoryFieldError();
    },
  );

  test(
    "URP-T146 - Service request - Experiencing financial difficulty - Document upload",
    { tag: ["@rss", "@regression", "@URP-T146"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Experiencing Financial Difficulty/i);
      await serviceRequest.expectExperiencingFinancialDifficultyFormVisible();
      await serviceRequest.uploadFinancialDifficultyDocument(RSS_DEFAULT_SERVICE_REQUEST_UPLOAD_PDF);
      await serviceRequest.expectUploadedDocumentVisible("exportedPDFFile");
    },
  );

  test(
    "URP-T147 - Service request - Experiencing financial difficulty - Preferred contact time disabled for Email",
    { tag: ["@rss", "@regression", "@URP-T147"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Experiencing Financial Difficulty/i);
      await serviceRequest.expectExperiencingFinancialDifficultyFormVisible();
      await serviceRequest.fillExperiencingFinancialDifficultyForm(
        `Automation URP-T147 financial difficulty ${Date.now()}`,
      );
      await serviceRequest.selectFinancialDifficultyPreferredContactMethod("Phone");

      const contactTimeDropdown = serviceRequest
        .financialDifficultyForm()
        .locator("p-dropdown#preferredContactTime");
      const contactTimeOptions = await serviceRequest.getPrimeNgDropdownOptionLabels(
        contactTimeDropdown,
      );

      if (contactTimeOptions.length > 0) {
        await serviceRequest.selectFinancialDifficultyPreferredContactTime(contactTimeOptions[0]);
      } else {
        await serviceRequest.selectFinancialDifficultyPreferredContactTime("Morning");
      }
      await serviceRequest.selectFinancialDifficultyPreferredContactMethod("Email");
      await serviceRequest.expectFinancialDifficultyPreferredContactTimeDisabled();

      await serviceRequest.selectFinancialDifficultyPreferredContactMethod("Phone");
      if (contactTimeOptions.length > 0) {
        await serviceRequest.selectFinancialDifficultyPreferredContactTime(contactTimeOptions[0]);
      } else {
        await serviceRequest.selectFinancialDifficultyPreferredContactTime("Morning");
      }
      await serviceRequest.selectFinancialDifficultyPreferredContactMethod("Email");
      await serviceRequest.expectFinancialDifficultyPreferredContactTimeCleared();
    },
  );

  test(
    "URP-T148 - Service request - Change Bank Account Details - Submit blocked when not authorised",
    { tag: ["@rss", "@regression", "@URP-T148"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await ensureServiceRequestParty(dashboard);
      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Change Bank Account Details/i);
      await serviceRequest.expectChangeBankAccountDetailsFormVisible();
      await serviceRequest.selectDirectDebitAuthorisedNo();
      await serviceRequest.expectSubmitServiceRequestButtonHidden();
    },
  );

  test(
    "URP-T149 - Service request - Cancel confirmation pop-up",
    { tag: ["@rss", "@regression", "@URP-T149"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Experiencing Financial Difficulty/i);
      await serviceRequest.expectExperiencingFinancialDifficultyFormVisible();
      await serviceRequest.fillExperiencingFinancialDifficultyForm(
        `Automation URP-T149 cancel confirmation ${Date.now()}`,
      );
      await serviceRequest.clickCancelAndExpectUnsavedChangesDialog();

      await serviceRequest.unsavedChangesDialog().getByRole("button", { name: /^No$/i }).click();
      await serviceRequest.expectExperiencingFinancialDifficultyFormVisible();
      await serviceRequest.clickCancelAndExpectUnsavedChangesDialog();
    },
  );

  test(
    "URP-T182 - Service Request - Update Address Details - Address search fuzzy logic",
    { tag: ["@rss", "@regression", "@URP-T182"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Update Address Details/i);
      await serviceRequest.expectUpdateAddressDetailsFormVisible();
      await serviceRequest.searchUpdateAddress("48 Hoo");
      await serviceRequest.expectAddressSearchSuggestions();
    },
  );

  test(
    "URP-T202 - Service request - Change Bank Account Details - Request visible in My requests",
    { tag: ["@rss", "@regression", "@URP-T202"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      expect(await dashboard.isDashboardLoaded()).toBe(true);
      await ensureServiceRequestParty(dashboard);
      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Change Bank Account Details/i);
      await serviceRequest.expectChangeBankAccountDetailsFormVisible();
      await serviceRequest.fillChangeBankAccountDetailsForm(
        `Automation URP-T202 bank account update ${Date.now()}`,
      );
      await serviceRequest.submitServiceRequest();
      await serviceRequest.expectSubmissionConfirmation();
      await serviceRequest.clickViewMyRequest();
      await serviceRequest.expectMyRequestsWithListedRequest();
    },
  );

  test(
    "URP-T203 - Service request - Update Contact Details - Request visible in My requests",
    { tag: ["@rss", "@regression", "@URP-T203"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Update Contact Details/i);
      await serviceRequest.expectUpdateContactDetailsFormVisible();
      await serviceRequest.fillUpdateContactDetailsForm(
        `Automation URP-T203 contact update ${Date.now()}`,
      );
      await serviceRequest.submitServiceRequest();
      await serviceRequest.expectSubmissionConfirmation();
      await serviceRequest.clickViewMyRequest();
      await serviceRequest.expectMyRequestsWithListedRequest();
    },
  );

  test(
    "URP-T204 - Service request - Experiencing financial difficulty - Request visible in My requests",
    { tag: ["@rss", "@regression", "@URP-T204"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Experiencing Financial Difficulty/i);
      await serviceRequest.expectExperiencingFinancialDifficultyFormVisible();
      await serviceRequest.fillExperiencingFinancialDifficultyForm(
        `Automation URP-T204 financial difficulty ${Date.now()}`,
      );
      await serviceRequest.submitServiceRequest();
      await serviceRequest.expectSubmissionConfirmation();
      await serviceRequest.clickViewMyRequest();
      await serviceRequest.expectMyRequestsWithListedRequest();
    },
  );

  test(
    "URP-T205 - Service request - Update Address Details - Request visible in My requests",
    { tag: ["@rss", "@regression", "@URP-T205"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
      await serviceRequest.selectCategory(/Update Address Details/i);
      await serviceRequest.expectUpdateAddressDetailsFormVisible();
      await serviceRequest.fillUpdateAddressDetailsForm(
        `Automation URP-T205 address update ${Date.now()}`,
      );
      await serviceRequest.submitServiceRequest();
      await serviceRequest.expectSubmissionConfirmation();
      await serviceRequest.clickViewMyRequest();
      await serviceRequest.expectMyRequestsWithListedRequest();
    },
  );

  test(
    "URP-T212 - Service request - Experiencing financial difficulty - Invalid file type rejected",
    { tag: ["@rss", "@regression", "@URP-T212"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      const invalidFile = path.join(os.tmpdir(), `urp-t212-invalid-${Date.now()}.exe`);
      fs.writeFileSync(invalidFile, "invalid upload");

      try {
        await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
        await serviceRequest.selectCategory(/Experiencing Financial Difficulty/i);
        await serviceRequest.expectExperiencingFinancialDifficultyFormVisible();
        await serviceRequest.uploadFinancialDifficultyDocument(invalidFile);
        await serviceRequest.expectUploadValidationError(
          /file type|not acceptable|not allowed|invalid file/i,
        );
      } finally {
        fs.unlinkSync(invalidFile);
      }
    },
  );

  test(
    "URP-T213 - Service request - Experiencing financial difficulty - 20MB file size limit",
    { tag: ["@rss", "@regression", "@URP-T213"] },
    async ({ page }) => {
      test.setTimeout(600_000);

      const dashboard = new RSSDashboardPage(page);
      const sideMenu = new RSSSideMenuPage(page);
      const serviceRequest = new RSSServiceRequestPage(page);

      const oversizedFile = path.join(os.tmpdir(), `urp-t213-oversized-${Date.now()}.pdf`);
      fs.writeFileSync(oversizedFile, Buffer.alloc(21 * 1024 * 1024, 0));

      try {
        await openServiceRequestFromDrawer(dashboard, sideMenu, serviceRequest);
        await serviceRequest.selectCategory(/Experiencing Financial Difficulty/i);
        await serviceRequest.expectExperiencingFinancialDifficultyFormVisible();
        await serviceRequest.uploadFinancialDifficultyDocument(oversizedFile);
        await serviceRequest.expectUploadValidationError(/20\s*mb|file size|too large/i);
      } finally {
        fs.unlinkSync(oversizedFile);
      }
    },
  );
});
