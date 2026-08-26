---
name: project-framework
description: >-
  Domain-specific Playwright framework knowledge for this repo: POM maps,
  wizard flows, anti-patterns, and entry-path helpers. Linked from
  .cursor/project/automation-blueprint.md. Read when routing or authoring
  tests for multi-step flows (especially DO Standard Quote).
---

# Project framework — UDC

Read [`.cursor/project/automation-blueprint.md`](../../project/automation-blueprint.md) for modules, paths, and conventions. This skill holds **domain POM maps** too large for the blueprint.

## DO Portal — Standard Quote wizard POM map

When routing or reviewing **DO Standard Quote** / **Customer Details** work, map UI to the **wizard step**, not the navigation path used to get there.

| Wizard step | Page object | Path under `pages/do-portal/` |
|-------------|-------------|-------------------------------|
| Asset Details (step 1) | `DOAssetDetailsPage` | `StandardQuote/AssetDetails/AssetDetailsPage.ts` |
| Customer Details shell (step 2) | `DOCustomerDetailsPage` | `StandardQuote/CustomerDetails/customerDetailsPage.ts` |
| **Search Customer** modal | `DOSearchCustomerDialog` | `StandardQuote/CustomerDetails/searchCustomerDialog.ts` |
| Personal / Address / Employment / FP / Reference / Trust / Business | `DOPersonalDetailsPage`, `DOAddressDetailsPage`, … | `StandardQuote/CustomerDetails/*.ts` |
| Post submission | `DOCustomerQuotePostSubmitPage` | `StandardQuote/CustomerDetails/customerQuotePostSubmit.ts` |

### Rules (Test Case Writer, Generator, Healer)

- On **Customer Details** (borrowers grid, **Add Borrowers / Guarantors**, customer search): use `DOCustomerDetailsPage` and `customerDetailsPage.searchCustomer` (`DOSearchCustomerDialog`).
- Do **not** add new Customer Details or Search Customer actions on `DOAssetDetailsPage`; methods there are **legacy delegates** only.
- Name instances by responsibility: `customerDetailsPage` on step 2 — not `assetDetailsPage` after **Next** from Asset Details.
- Example helper: `openStandardQuoteOnCustomerDetailsStep` in `tests/do-portal/doRegressionTestSuite/CustomerDetails.test.ts`.

Exported from `pages/do-portal/index.ts` (barrel: `pages/`).

## Quick Quote entry

- Page object: `DOQuickQuotePage` — `pages/do-portal/QuickQuote/QuickQuotePage.ts`
- Used for Quick Quote → Standard Quote carry-over flows (see CSA-C-Assigned regression pack).

## RSS / CSS portals

- RSS: login `pages/rss-portal/login/LoginPage.ts`; Apply Now flows under `pages/rss-portal/Applynow/`
- CSS: login `pages/css-portal/login/LoginPage.ts`; dashboard `pages/css-portal/dashboard/DashboardPage.ts`
- Read existing specs under `tests/{module}-portal/` before adding new coverage.
