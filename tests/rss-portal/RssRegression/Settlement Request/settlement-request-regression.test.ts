/**
 * RSS Regression — Settlement Request (URP-T102–T103, URP-T167–T169, URP-T217)
 * Zephyr: /RSS Regression Suite/Settle. Quote & Req.
 * Source: RSS Settlement Request Regression Tests Cases.xlsx
 */

import { test } from "../../../../fixtures/rssPortalTest";
import {
  RSSDashboardPage,
  RSSLoansPage,
  RSSSettlementRequestPage,
} from "../../../../pages";
import {
  openFormalSettlementQuoteForm,
  openSettlementSectionFromActiveLoan,
} from "./settlement-request-regression.helpers";

test.describe("RSS Portal — Settlement Request @rss @regression", () => {
  test(
    "URP-T102 - Settlements - Get Amount",
    { tag: ["@rss", "@regression", "@URP-T102"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);

      await openSettlementSectionFromActiveLoan(dashboard, loans);
      await loans.clickGetAmount();
      await loans.expectSettlementAmountPopulated();
    },
  );

  test(
    "URP-T103 - Settlements - Request formal Settlement quote",
    { tag: ["@rss", "@regression", "@URP-T103"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const settlement = new RSSSettlementRequestPage(page);

      await openFormalSettlementQuoteForm(dashboard, loans, settlement);
      await settlement.fillFormalSettlementQuoteForm({
        note: `Automation URP-T103 formal settlement ${Date.now()}`,
        sourceOfFunds: "Automation funds",
        paymentMethod: /Debit my nominated bank/i,
        reason: /Bank Consolidation/i,
        preferredContactMethod: /Email/i,
      });
      await settlement.submitSettlementRequest();
      await settlement.expectSubmissionConfirmation();
    },
  );

  test(
    "URP-T167 - Settlements - Request Formal Settlement Quote - Calendar blocks past dates",
    { tag: ["@rss", "@regression", "@URP-T167"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const settlement = new RSSSettlementRequestPage(page);

      await openFormalSettlementQuoteForm(dashboard, loans, settlement);
      await settlement.expectSettlementCalendarPastDatesDisabled();
    },
  );

  test(
    "URP-T168 - Settlements - Request Formal Settlement Quote - Source of Funds mandatory when amount high",
    { tag: ["@rss", "@regression", "@URP-T168"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const settlement = new RSSSettlementRequestPage(page);

      await openFormalSettlementQuoteForm(dashboard, loans, settlement);
      const amountText = await loans.getSettlementAmountText();
      if (loans.isSettlementAmountAtLeast9999(amountText)) {
        await settlement.expectSourceOfFundsMandatoryWhenAmountHigh(amountText);
      }
    },
  );

  test(
    "URP-T169 - Settlements - Request Formal Settlement Quote - Cancel confirmation pop-up",
    { tag: ["@rss", "@regression", "@URP-T169"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const settlement = new RSSSettlementRequestPage(page);

      await openFormalSettlementQuoteForm(dashboard, loans, settlement);
      await settlement.fillFormalSettlementQuoteForm({
        note: `Automation URP-T169 cancel ${Date.now()}`,
      });
      await settlement.clickCancelAndExpectUnsavedChangesDialog();

      await settlement.unsavedChangesDialog().getByRole("button", { name: /^No$/i }).click();
      await settlement.expectFormalSettlementQuoteFormVisible();
      await settlement.clickCancelAndExpectUnsavedChangesDialog();
    },
  );

  test(
    "URP-T217 - Settlement - Request Formal Settlement Quote - Request visible in My requests",
    { tag: ["@rss", "@regression", "@URP-T217"] },
    async ({ page }) => {
      test.setTimeout(300_000);

      const dashboard = new RSSDashboardPage(page);
      const loans = new RSSLoansPage(page);
      const settlement = new RSSSettlementRequestPage(page);

      await openFormalSettlementQuoteForm(dashboard, loans, settlement);
      await settlement.fillFormalSettlementQuoteForm({
        note: `Automation URP-T217 formal settlement ${Date.now()}`,
        sourceOfFunds: "Automation funds",
        paymentMethod: /Debit my nominated bank/i,
        reason: /Bank Consolidation/i,
        preferredContactMethod: /Email/i,
      });
      await settlement.submitSettlementRequest();
      await settlement.expectSubmissionConfirmation();
      await settlement.clickViewMyRequest();
      await settlement.expectMyRequestsWithListedRequest();
    },
  );
});
