import {
  RSSDashboardPage,
  RSSLoansPage,
  RSSSettlementRequestPage,
} from "../../../../pages";
import { openActiveLoanForServiceRequest } from "../../rssSanityTest/active-loan.helpers";

export async function openSettlementSectionFromActiveLoan(
  dashboard: RSSDashboardPage,
  loans: RSSLoansPage,
): Promise<void> {
  await openActiveLoanForServiceRequest(dashboard, loans);
  await loans.selectLoanDetailTab("settlements");
  await loans.expectSettlementsSectionVisible();
}

export async function openFormalSettlementQuoteForm(
  dashboard: RSSDashboardPage,
  loans: RSSLoansPage,
  settlement: RSSSettlementRequestPage,
): Promise<void> {
  await openSettlementSectionFromActiveLoan(dashboard, loans);
  await loans.clickGetAmount();
  await loans.expectSettlementAmountPopulated();
  await loans.clickRequestFormalSettlementQuote();
  await settlement.expectFormalSettlementQuoteFormVisible();
}
