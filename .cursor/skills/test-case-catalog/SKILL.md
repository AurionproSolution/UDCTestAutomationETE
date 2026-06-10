---
name: test-case-catalog
description: >-
  Names Playwright tests with TCC catalog IDs, analyzes flow and validation scope,
  and generates Excel test-case documentation. Use when the user asks to name a
  test case, assign TCC001/TCC00x, document flow steps, validation points, create
  test-case Excel, or catalog an existing spec.
---

# Test Case Catalog (TCC naming + Excel documentation)

Use this skill after a Playwright test exists (or when renaming/documenting one). Read the full spec before naming or writing flows.

## Naming convention

### Playwright `test()` title

```
TCC00x - DO Portal - {product} - {entryPath} {scope} - {customerScope} - {primaryFocus}
```

| Segment | Examples |
|---------|----------|
| **TC ID** | `TCC001`, `TCC002` — from team catalog; add `@TCC00x` tag |
| **Portal** | `DO Portal` (or `RSS Portal`, `CSS Portal`) |
| **Product** | `CSA-C-Assigned`, `Finance Lease`, etc. |
| **Entry path** | `Quick Quote to Standard Quote`, `Standard Quote Direct` |
| **Scope** | `Full E2E`, `Subset` |
| **Customer** | `Individual Borrower`, `Individual Borrower and Trust Guarantor`, or omit if no customer step |
| **Focus** | What is uniquely validated (e.g. `customer validations`, `QQ calculation modes`, `asset carry-over`) |

### Tags

```ts
{ tag: ["@do", "@regression", "@TCC00x"] }
```

Adjust portal tag (`@rss`, `@css`) and type (`@sanity`, `@smoke`) as appropriate.

### Spec file naming

- Prefer `{Product}_Regression.test.ts` (e.g. `CSA-C-Assigned_Regression.test.ts`)
- Avoid `SingleFlow` when the file has multiple tests or mixed entry paths
- Use kebab-case product codes with hyphens when they match the app (`CSA-C-Assigned`)

### Structured metadata (for Excel / catalog)

| Field | Content |
|-------|---------|
| Module | Portal + quote type (e.g. DO Portal — Quick Quote / Standard Quote) |
| Feature | Product + program |
| Scenario | What user journey is covered |
| Condition | Empty fields, invalid formats, conditional UI |
| Expected behavior | What must pass before progress / at end |
| Unique ID | `TCC00x` |

## Analysis checklist (before naming or documenting)

Read the test and note:

1. **Entry** — Quick Quote, Standard Quote direct, or both
2. **End point** — subset (stops mid-flow) vs full E2E (submission)
3. **Customer types and roles** — Individual, Trust, Borrower, Guarantor
4. **Assertion style** — `expect.soft` vs hard `expect()` / POM `expect*`
5. **Page objects** — list classes used and map to `pages/` paths
6. **Commented-out steps** — mention in Notes / Blocker

## Flow steps (how to write)

- Number steps sequentially (1, 2, 3…)
- Use `→` between navigation actions
- Group: setup → validations (negative) → happy path → assertions
- Call out **assert** points inline: `empty Save → assert required messages`
- Mark conditionals: `(if section visible)`
- One step = one logical phase (not every line of code)

## Validation points (how to write)

- Format: `{Area} — {What is validated}`
- Include: required fields, invalid format, toasts, conditional fields, carry-over, post-submit rules
- Map each point to an `expect`, `expect.soft`, or POM `expect*` in the spec
- Skip pure data-entry steps with no assertion unless they gate a validation

## Excel documentation workflow

1. Add or update the case in [`scripts/generate-test-case-excel.mjs`](../../../scripts/generate-test-case-excel.mjs) under `testCases.TCC00x`:
   - `flowSteps` (array of strings)
   - `validationPoints` (array of `[area, description]`)
   - `pageObjects` (array of `[className, filePath]`)
   - `summary` (id, name, objective, assertionStyle, testFile with line range, etc.)
2. Regenerate (close open Excel files first on Windows):

```bash
node scripts/generate-test-case-excel.mjs TCC00x
```

3. Output: `docs/TCC00x_test_case_documentation.xlsx` (4 sheets: Summary, Flow Steps, Validation Points, Page Objects)

### Summary row columns

TC ID, Test Case Name, Test Objective, Flow Steps, Validation Points, Assertion Style, Test Type, Automation Status, Flow Automated, Validations Automated, Owner, Test File, Page Object, Status, Notes / Blocker

## Reference examples

See [examples.md](examples.md) for TCC001–TCC003 from [`tests/do-portal/Regression/CSA-C-Assigned_Regression.test.ts`](../../../tests/do-portal/Regression/CSA-C-Assigned_Regression.test.ts).

## When to apply

- User provides or asks for a **TCC** / catalog ID
- User asks to **name** a test, **document flow**, or **create Excel** for a spec
- After **Test Case Writer** Step 7 or **Playwright Test Generator** produces a new regression test (optional Step 8)

## Linked agents

| Agent | Role with this skill |
|-------|----------------------|
| [Test Automation Architect](../../agents/test-automation-architect.md) | Routes catalog requests (**Path D**); optional **Phase 3** after JIRA → test |
| [Test Case Writer](../../agents/test-case-writer.md) | **Step 8** — apply this skill when `TCC00x` is in the prompt |

Do **not** use for JIRA requirements gate — use `jira-issue-test-gate` rule and Test Case Writer Step 2.5 instead.
