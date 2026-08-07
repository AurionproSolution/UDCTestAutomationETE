import {
  RSSDashboardPage,
  RSSLoansPage,
  RSSVariationRequestPage,
} from "../../../../pages";
import { openActiveLoanForServiceRequest } from "../../rssSanityTest/active-loan.helpers";

export async function openVariationRequestFromActiveLoan(
  dashboard: RSSDashboardPage,
  loans: RSSLoansPage,
  variation: RSSVariationRequestPage,
): Promise<void> {
  await openActiveLoanForServiceRequest(dashboard, loans);
  await loans.openVariationRequestFromLoan();
  await variation.expectVariationRequestScreen();
}
