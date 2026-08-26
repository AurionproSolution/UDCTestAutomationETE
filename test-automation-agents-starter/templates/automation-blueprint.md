# Automation Blueprint — {Project Name}

> Copy this file to `.cursor/project/automation-blueprint.md` and fill every section.
> Delete placeholder rows. Agents **stop** if this file is missing or incomplete.

## Project

- **name:** {Your Project Name}
- **stack:** Playwright + TypeScript + Page Object Model

## Modules

| id | label | tag | jiraPrefixes | components |
|----|-------|-----|--------------|------------|
| web | Web Application | `@web` | PROJ- | Web |

Add one row per app area (portal, service, channel).

**Module inference:** JIRA key prefix → module id. Fall back to components/labels, then ask the user.

## Paths

| key | value |
|-----|-------|
| tests | `tests/e2e/**/*.spec.ts` |
| pages | `src/pages/**/*.ts` |
| config | `src/config/environment.ts` |
| basePage | `src/pages/BasePage.ts` |
| pagesBarrel | `src/pages/index.ts` |

Use `{module}` in globs if your repo is multi-module (e.g. `tests/{module}/**/*.test.ts`).

## Conventions

- **testFile:** kebab-case, suffix `.spec.ts` (or `.test.ts`)
- **describeTemplate:** `{Module} - {Feature} - {Type} @{module} @{type}`
- **tags:** `@smoke`, `@regression`, `@e2e` (adjust per team)
- **timeouts:** default from playwright.config; long flows `test.setTimeout(360000)`
- **imports:** URL helpers from `paths.config`; page objects from barrel when possible
- **pageObjects:** extend base page class; no hard-coded URLs

## URL helpers

Import from your config file:

| module | helpers |
|--------|---------|
| web | `APP_BASE_URL`, `LOGIN_URL` |

## JIRA requirements template (six blocks)

1. **Summary** — what + for whom
2. **Where user starts** — module id + URL, deep link, or menu path to first screen
3. **Preconditions** — environment, user/role, test data
4. **Steps to reproduce** — numbered actions in order
5. **Screenshot / reference** — attachment or link (waivable for non-UI if steps + AC describe all visible outcomes)
6. **Acceptance criteria** — observable UI results

## Reference tests

List 2–3 specs agents should read before generating new tests:

- `tests/e2e/auth/login.spec.ts`
- `tests/e2e/example/happy-path.spec.ts`

## Skills

| skill | path | when |
|-------|------|------|
| framework | `.cursor/skills/project-framework/SKILL.md` | Optional: POM maps, wizard flows |
| catalog | _(none)_ | Optional: test catalog / Excel docs |

## Catalog

```yaml
enabled: false
skillPath: ""
excelScript: ""
docsPath: docs/
idPattern: TCC00x
```

Set `enabled: true` only if your team uses test-case catalog / Excel documentation.

## Handoff placeholders

- `{module}` — module id from table above
- `{testsPath}` — full path to new spec file
- `{configPath}` — path from Paths table
