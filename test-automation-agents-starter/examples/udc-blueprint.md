# Automation Blueprint — UDC Test Automation ETE (reference example)

Completed blueprint example. Copy ideas from this file when filling in your own
`templates/automation-blueprint.md` → `.cursor/project/automation-blueprint.md`.
## Project

- **name:** UDC Test Automation ETE
- **stack:** Playwright + TypeScript + Page Object Model

## Modules

| id | label | tag | jiraPrefixes | components |
|----|-------|-----|--------------|------------|
| do | DO Portal | `@do` | DO-, UDP- | DO Portal, Dealer Online |
| rss | RSS Portal | `@rss` | RSS- | RSS Portal |
| css | CSS Portal | `@css` | CSS- | CSS Portal |

**Module inference:** JIRA project key prefix → module id (e.g. `DO-123` → `do`). Fall back to JIRA `components` or `labels`, then ask the user.

## Paths

| key | value |
|-----|-------|
| tests | `tests/{module}-portal/**/*.test.ts` |
| pages | `pages/{module}-portal/**/*.ts` |
| config | `config/env.ts` |
| basePage | `pages/common/BasePage.ts` |
| pagesBarrel | `pages/index.ts` |

Replace `{module}` with the module id (`do`, `rss`, `css`).

## Conventions

- **testFile:** kebab-case or `{Product}_Regression.test.ts` for multi-scenario packs; suffix `*.test.ts`
- **describeTemplate:** `{Module} Portal - {Feature} - {Type} @{module} @{type}`
- **tags:** `@smoke`, `@sanity`, `@regression`, plus module tag (`@do`, `@rss`, `@css`)
- **timeouts:** default from `playwright.config.ts`; long flows `test.setTimeout(360000)` (6 min)
- **imports:** URL helpers from `config/env`; page objects from `pages/` barrel when possible
- **pageObjects:** extend `BasePage`; prefer URL helpers over hard-coded strings

## URL helpers

Import from `config/env.ts`:

| module | helpers |
|--------|---------|
| do | `DO_BASE_URL`, `DO_DEALER_STANDARD_QUOTE_URL` |
| rss | `RSS_BASE_URL` |
| css | `CSS_BASE_URL` |

## JIRA requirements template (six blocks)

Use these section titles when evaluating the requirements gate (Description + all issue comments):

1. **Summary** — what + for whom (actor)
2. **Where dealer goes (portal / entry)** — module (`do` \| `rss` \| `css`) + concrete URL, deep link, or menu path to first screen
3. **Preconditions** — environment, user/role, test data or "create new …"
4. **Steps to reproduce** — numbered navigation + actions in order
5. **Screenshot / reference** — attachment, recording, or link (waivable for non-UI if steps + AC fully describe visible outcomes)
6. **Acceptance criteria** — observable UI results (not "works as expected" alone)

## Reference tests

Read 2–3 of these before generating new specs:

- `tests/do-portal/doRegressionTestSuite/CustomerDetails.test.ts` — Standard Quote wizard, Customer Details step, helper `openStandardQuoteOnCustomerDetailsStep`
- `tests/do-portal/Regression/CSA-C-Assigned_Regression.test.ts` — TCC catalog regression pack (TCC001–TCC003)
- `tests/rss-portal/rssSanityTest/RSS_Sanity.Individual.test.ts` — RSS portal patterns

## Skills

| skill | path | when |
|-------|------|------|
| framework | `.cursor/skills/project-framework/SKILL.md` | DO Standard Quote POM maps, wizard routing rules |
| catalog | `.cursor/skills/test-case-catalog/SKILL.md` | TCC00x naming, flow steps, Excel documentation |

## Catalog

```yaml
enabled: true
skillPath: .cursor/skills/test-case-catalog/SKILL.md
excelScript: scripts/generate-test-case-excel.mjs
docsPath: docs/
idPattern: TCC00x
```

When `enabled: false`, skip Architect Path D and Test Case Writer Step 8.

## Handoff placeholders

Use when emitting copy-paste prompts:

- `{module}` — module id from table above
- `{testsPath}` — e.g. `tests/do-portal/feature/feature-name.test.ts`
- `{configPath}` — `config/env.ts`
