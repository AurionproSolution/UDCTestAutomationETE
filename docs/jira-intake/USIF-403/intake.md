# USIF-403 — Intake

## Metadata
- **Summary:** DO: Customer Details Ribbon Requires Manual Save Before Navigation from Asset Details (Standard Quote) Screen
- **Type:** Bug
- **Status:** Resolved
- **Resolution:** Done
- **Portal:** do (label: DO)
- **Reporter:** Dharmveer Baroniya
- **Environment:** 25.2.0
- **Jira:** https://aurionprofintechsolutions.atlassian.net/browse/USIF-403

## Bug description (Issue)
Unable to navigate from Asset Details to Customer Details using the ribbon without clicking on the **Save** button.

## Expectation
Selecting the **Customer Details** ribbon should navigate the user from the Asset Details screen to the Customer Details screen without the user having to click **Save**.

## Notes
Refer to Workflow Management Design Document v1.9; discussed in UDC/AP Weekly Implementation Cadence (Aug 06, 2026). QAT verification (2026-08-18): working as expected.

## Steps to reproduce
1. Open DO Portal → Standard Quote (CSA).
2. On **Asset Details**, enter mandatory asset / finance data (do **not** click **Save**).
3. Click **Customer Details** on the Standard Quote step ribbon (header stepper).
4. User must land on **Customer Details** (Add Borrowers / Guarantors) without being blocked on Asset Details.

## Acceptance criteria (observable UI)
- **Customer Details** ribbon click navigates to Customer Details step.
- **Add Borrowers / Guarantors** (or Customer Details shell) is visible without prior **Save** on Asset Details.
- User is not stuck on Asset Details / Payment Summary only.

## Media inventory
| File | Type | Role | Local path |
|------|------|------|------------|
| Dealer - Google Chrome 2026-08-18 13-38-17.mp4 | video | QAT verification | assets/ (large) |

## Video-derived observations
- Reporter comment + video: ribbon navigation works without Save on fixed build.

## Gaps / assumptions
- Test uses CSA Standard Quote sanity path (`openSanityCsaAssetDetails`). **Calculate** clears Originator Reference — re-fill after double-calculate (same as `advanceAssetDetailsToCustomerDetails`) but **without** `clickSaveStandardQuoteStep`.
- Ribbon navigation requires mandatory Asset Details fields (incl. Originator Reference) to be valid; USIF-403 is about not needing the explicit **Save** button.
