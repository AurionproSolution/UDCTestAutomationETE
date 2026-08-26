---
name: project-framework
description: >-
  Domain-specific Playwright knowledge for this repo: POM maps, wizard flows,
  anti-patterns. Linked from automation-blueprint.md.
---

# Project framework — {Project Name}

Read [`.cursor/project/automation-blueprint.md`](../../project/automation-blueprint.md) first.

## POM maps

Document multi-step flows here. Example:

| UI step | Page object class | File path |
|---------|-------------------|-----------|
| Login | `LoginPage` | `src/pages/LoginPage.ts` |
| Checkout | `CheckoutPage` | `src/pages/CheckoutPage.ts` |

## Rules

- List anti-patterns (e.g. "do not put checkout actions on LoginPage")
- List helper functions in reference tests (e.g. `openCheckoutAsGuest`)

## Entry paths

- **Happy path URL:** which config helper to call
- **Menu navigation:** step-by-step if no deep link exists
