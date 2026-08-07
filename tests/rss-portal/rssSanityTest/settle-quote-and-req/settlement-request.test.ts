/**
 * RSS Sanity — Settle Quote & Request (URP-T56 – URP-T57)
 * Zephyr: /RSS Sanity Suite/Settle. Quote & Req.
 * Source: RSS Settlement Request Test cases.xlsx
 *
 * Precondition: header party must have at least one **active** loan.
 */

import { test } from "../../../../fixtures/rssPortalTest";
import {
  RSSDashboardPage,
  RSSLoansPage,
  RSSSettlementRequestPage,
} from "../../../../pages";
import { openActiveLoanForServiceRequest } from "../active-loan.helpers";

test.describe("RSS Portal — Settle Quote & Request @rss @sanity", () => {
  test("URP-T56 - Settlement - Get Amount @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);

    await openActiveLoanForServiceRequest(dashboard, loans);
    await loans.selectLoanDetailTab("settlements");
    await loans.expectSettlementsSectionVisible();
    await loans.clickGetAmount();
    await loans.expectSettlementAmountPopulated();
  });

  test("URP-T57 - Settlement - Request formal Settlement quote @smoke", async ({ page }) => {
    test.setTimeout(300_000);

    const dashboard = new RSSDashboardPage(page);
    const loans = new RSSLoansPage(page);
    const settlement = new RSSSettlementRequestPage(page);

    await openActiveLoanForServiceRequest(dashboard, loans);
    await loans.selectLoanDetailTab("settlements");
    await loans.expectSettlementsSectionVisible();
    await loans.clickGetAmount();
    await loans.expectSettlementAmountPopulated();
    await loans.clickRequestFormalSettlementQuote();
    await settlement.expectFormalSettlementQuoteFormVisible();
    await settlement.fillFormalSettlementQuoteForm({
      note: `Automation URP-T57 formal settlement ${Date.now()}`,
      sourceOfFunds: "Automation funds",
      paymentMethod: /Debit my nominated bank/i,
      reason: /Bank Consolidation/i,
      preferredContactMethod: /Email/i,
    });
    await settlement.submitSettlementRequest();
    await settlement.expectSubmissionConfirmation();
    await settlement.clickViewMyRequest();
    await settlement.expectMyRequestsWithListedRequest();
  });
});
