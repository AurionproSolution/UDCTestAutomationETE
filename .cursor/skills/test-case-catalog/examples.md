# TCC catalog examples (CSA-C-Assigned regression)

Source file: `tests/do-portal/Regression/CSA-C-Assigned_Regression.test.ts`

## Sibling test comparison

| ID | Entry | Scope | Customer | Ends at |
|----|-------|-------|----------|---------|
| TCC001 | Quick Quote → Standard Quote | Full E2E | Individual Borrower | Quote submission (notes, upload, submit) |
| TCC002 | Quick Quote → Standard Quote | Subset | — | Asset Details (interest / brand-hint) |
| TCC003 | Standard Quote direct | Full E2E | Individual Borrower + Trust Guarantor | Quote submission |

## Title examples

```ts
test(
  "TCC001 - DO Portal - CSA-C-Assigned Quick Quote to Standard Quote - Individual Borrower customer validations, asset carry-over and quote completion",
  { tag: ["@do", "@regression", "@TCC001"] },
  async ({ page }) => { /* ... */ },
);

test(
  "TCC002 - DO Portal - CSA-C-Assigned Quick Quote to Standard Quote - Quick Quote calculation modes, comparison panels and Asset Details interest brand-hint checks (subset)",
  { tag: ["@do", "@regression", "@TCC002"] },
  async ({ page }) => { /* ... */ },
);

test(
  "TCC003 - DO Portal - CSA-C-Assigned Standard Quote - Individual Borrower and Trust Guarantor customer validations and quote completion",
  { tag: ["@do", "@regression", "@TCC003"] },
  async ({ page }) => { /* ... */ },
);
```

## Flow step example (TCC002 excerpt)

```
5. Enter finance (Monthly, 9%, 36mo, $20k, 10% deposit, 0% balloon) → Calculate
6. Assert calculation summary (Loan Amount, Total Payable); Create Quote and Add Comparison 2 enabled
10. Calculate For = Cash Price → cash locked; Calculate → cash value populated
14. Add Comparison 2 → assert 2 panels; QQ2 cash copied; Comparison 3 disabled until QQ2 calculated
```

## Validation point example

```
Quick Quote — Deposit 10% syncs to ~$2,000 on $20,000 cash price
Asset Details — Brand hierarchy or rate hint shown when interest changed to 8.5%
```

## File naming example

| Before | After |
|--------|-------|
| `CSA_QuickQuote_SingleFlow.test.ts` | `CSA-C-Assigned_Regression.test.ts` |

Reason: file holds three tests (not single flow); TCC003 uses direct Standard Quote (not Quick Quote only).
