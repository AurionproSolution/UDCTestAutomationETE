# UDC Automation Tests

A comprehensive Playwright TypeScript automation framework for **DO**, **RSS**, and **CSS** portals under the UDC umbrella.

## 📁 Project Structure

```
udc-automation-tests/
├── .github/
│   └── workflows/
│       └── playwright.yml          # CI/CD pipeline for all portals
├── .vscode/                        # VS Code editor settings
├── config/
│   ├── env.ts                      # Environment configuration (DEV/QAT/UAT/PROD)
│   └── index.ts
├── fixtures/
│   ├── portalFixtures.ts           # Custom Playwright fixtures
│   └── index.ts
├── pages/
│   ├── common/                     # Shared page components
│   │   └── BasePage.ts
│   ├── do-portal/                  # DO Portal page objects
│   │   ├── login/
│   │   │   └── LoginPage.ts
│   │   ├── dashboard/
│   │   │   └── DashboardPage.ts
│   │   └── index.ts
│   ├── rss-portal/                 # RSS Portal page objects
│   │   ├── login/
│   │   │   └── LoginPage.ts
│   │   ├── dashboard/
│   │   │   └── DashboardPage.ts
│   │   └── index.ts
│   ├── css-portal/                 # CSS Portal page objects
│   │   ├── login/
│   │   │   └── LoginPage.ts
│   │   ├── dashboard/
│   │   │   └── DashboardPage.ts
│   │   └── index.ts
│   └── index.ts                    # Root barrel export
├── playwright/                     # Playwright-only helpers (not mixed into tests/do-portal in IDE)
│   └── do-portal-auth.setup.ts     # Dependency project: login → playwright/.auth/do-portal.json
├── tests/
│   ├── do-portal/                  # DO Portal tests (specs only; auth setup lives in ./playwright)
│   │   ├── dashboard/
│   │   ├── doSanityTest/
│   │   └── regression/
│   ├── rss-portal/                 # RSS Portal tests
│   │   └── login/
│   │       └── login.test.ts
│   └── css-portal/                 # CSS Portal tests
│       └── login/
│           └── login.test.ts
├── testData/
│   ├── types/                      # TypeScript interfaces
│   │   └── index.ts
│   ├── do-portal/                  # DO Portal test data
│   │   └── loginData.json
│   ├── rss-portal/                 # RSS Portal test data
│   │   └── loginData.json
│   ├── css-portal/                 # CSS Portal test data
│   │   └── loginData.json
│   └── shared/                     # Shared test data
│       └── commonData.json
├── utils/
│   ├── commonUtils.ts              # Visual highlighting utilities
│   ├── tableUtils.ts               # Table/grid utilities
│   ├── csvHelper.ts                # CSV parsing utilities
│   ├── apiHelpers.ts               # API testing utilities
│   └── index.ts
├── playwright.config.ts            # Playwright configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Project dependencies & scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers (Chromium is enough for this repo)
npx playwright install chromium
```

After changing `package.json`, run `npm install` and **commit `package-lock.json`** so CI can switch back to `npm ci` for reproducible installs.

## Test Explorer (VS Code / Cursor)

If DO tests do not appear under **Testing**, see [docs/test-explorer.md](docs/test-explorer.md). The repo sets **`playwright.env.PLAYWRIGHT_IDE=1`** in [`.vscode/settings.json`](.vscode/settings.json) so the IDE loads a **single Playwright project** (`udc-chromium`) with all specs under `tests/` (including `tests/do-portal/`). Terminal and CI keep the multi-project layout (`do-portal-chromium`, smoke, regression, etc.) because they do not set `PLAYWRIGHT_IDE`.

## 🔐 DO portal authentication (session reuse)

- All specs under `tests/do-portal/` run under project **`do-portal-chromium`** with a shared **`storageState`** file at `playwright/.auth/do-portal.json` (gitignored).
- The session is created once by **`playwright/do-portal-auth.setup.ts`** (project `do-portal-auth-setup`), using `testData/do-portal/loginData.json` (OTP still applies at login time). Run it alone with **`npm run test:do:auth`** when you need to refresh `playwright/.auth/do-portal.json` without running the full DO suite.
- **Local / non-CI:** auth setup runs automatically before DO tests.
- **CI (`CI=true`):** global DO auth is **off** by default (GitHub-hosted runners cannot complete OTP). Set **`PLAYWRIGHT_USE_DO_GLOBAL_AUTH=1`** when you have unattended auth (e.g. self-hosted runner or a checked-in non-prod storage file policy). Until then, PR smoke/regression jobs **exclude** `tests/do-portal/**`; the default matrix runs **RSS + CSS** only. Run DO with `npm run test:do` locally.
- **Headed mode:** `playwright.config.ts` uses `headless: false` everywhere. On Linux CI, workflows use **`xvfb-run`** so Chromium can run headed.

## 🧪 Running Tests

**Chromium only** (no Firefox/WebKit/mobile projects in this repo).

### By Portal

```bash
# DO Portal (all tests under tests/do-portal/, including sanity + regression)
npm run test:do

# DO sanity folder only
npm run test:do:sanity

# Admin / perf script (separate project, no DO dealer storageState)
npm run test:do:perf

# RSS / CSS
npm run test:rss
npm run test:css

# All three portal projects in one run
npm run test:all-portals
```

### By Test Type

```bash
# Smoke (@smoke) — on CI excludes DO unless PLAYWRIGHT_USE_DO_GLOBAL_AUTH=1
npm run test:smoke

# Regression (@regression)
npm run test:regression
```

### By Environment

```bash
# DEV environment
npm run test:env:dev

# QAT environment (default)
npm run test:env:qat

# UAT environment
npm run test:env:uat

# PROD environment
npm run test:env:prod
```

### Interactive Modes

```bash
# UI mode (visual test runner)
npm run test:ui

# Debug mode
npm run test:debug

# Headed (default in config; flag kept for explicit runs)
npm run test:headed
```

### Lint

```bash
# TypeScript check + ESLint (run `npm install` after clone to sync devDependencies / lockfile)
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## 📊 Reports

### Live reports (current run)

These folders always hold the **latest** run. Round 2 overwrites Round 1 here — that is expected.

```bash
# View Playwright HTML report (live)
npm run report

# View Ortoni custom report (live)
npm run report:ortoni
```

| Folder | Purpose |
|--------|---------|
| `ortoni-report/` | Live Ortoni report (`index.html`, screenshots, videos, traces, steps, logs) |
| `my-report/` | Live Playwright HTML report |

### Automatic backups (`results/`)

After each **CLI** test run completes, a timestamped backup is created automatically:

```
results/report-2026-05-29_09-15-30/
  run-info.json
  ortoni-report/    ← full recursive copy (identical to live)
  my-report/        ← full copy when present
```

The Ortoni backup is a **complete copy** of the live folder: `index.html`, `ortoni-data/` (screenshots, videos, trace files), `trace/` (in-report trace viewer), step logs, console output, and `ortoni-data-history.sqlite` when present. Open a past round the same way as live:

```bash
# Example: open Round 1 Ortoni backup
npx playwright show-report results/report-2026-05-29_09-15-30/ortoni-report
```

To share with stakeholders, **zip the entire `ortoni-report` subfolder** inside the backup (not `index.html` alone).

List backups (newest last):

```powershell
Get-ChildItem results -Directory | Sort-Object Name
```

`npm run clean` removes live `ortoni-report/` and `my-report/` only — **`results/` is never deleted**.

### Skip flags

| Variable | When set | Effect |
|----------|----------|--------|
| `PLAYWRIGHT_SKIP_REPORT_BACKUP=1` | Manual / CI | No backup to `results/` |
| `PLAYWRIGHT_IDE=1` | VS Code / Cursor Test Explorer | No backup (avoids flooding `results/` on debug runs) |
| `PLAYWRIGHT_SKIP_ORTONI=1` | IDE (default in `.vscode/settings.json`) | Ortoni not generated; backup skipped if no `ortoni-report/index.html` |

## 🏷️ Test Tags

Use tags to categorize and filter tests:

| Tag | Description |
|-----|-------------|
| `@smoke` | Quick validation tests |
| `@regression` | Full regression suite |
| `@do` | DO Portal specific tests |
| `@rss` | RSS Portal specific tests |
| `@css` | CSS Portal specific tests |
| `@mobile` | Reserved for future mobile runs (not configured) |

Example:
```typescript
test('should login successfully @smoke @do', async ({ page }) => {
  // Test code
});
```

Run tagged tests:
```bash
npx playwright test --grep "@smoke"
npx playwright test --grep "@do"
```

## 📝 Writing Tests

### Using Page Objects

```typescript
import { test, expect } from '@playwright/test';
import { DOLoginPage, DODashboardPage } from '../../../pages';
import doLoginData from '../../../testData/do-portal/loginData.json';

test('should login to DO Portal @smoke @do', async ({ page }) => {
  const loginPage = new DOLoginPage(page);
  const dashboardPage = new DODashboardPage(page);

  await loginPage.navigate();
  await loginPage.loginWithTestData(doLoginData.validUsers[0]);

  const isLoaded = await dashboardPage.isDashboardLoaded();
  expect(isLoaded).toBe(true);
});
```

### Using Custom Fixtures

```typescript
import { test, expect } from '../../../fixtures';

test('should display dashboard @do', async ({ doAuthenticatedPage, doDashboardPage }) => {
  // Already logged in via fixture
  const isLoaded = await doDashboardPage.isDashboardLoaded();
  expect(isLoaded).toBe(true);
});
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_ENV` | Test environment (dev/qat/uat/prod) | `qat` |
| `CI` | Set automatically on GitHub Actions | - |
| `PLAYWRIGHT_IDE` | Set to `1` in VS Code/Cursor (`.vscode/settings.json`) for a **single** `udc-chromium` project so Test Explorer lists all portals under `tests/` | unset (multi-project config for CLI/CI) |
| `PLAYWRIGHT_USE_DO_GLOBAL_AUTH` | On CI, set to `1` to run `playwright/do-portal-auth.setup.ts` and apply DO `storageState` for tag projects and DO matrix jobs | unset (DO auth off on CI) |
| `PLAYWRIGHT_SKIP_ORTONI` | Set to `1` to skip Ortoni reporter (IDE default) | unset (Ortoni enabled on CLI) |
| `PLAYWRIGHT_SKIP_REPORT_BACKUP` | Set to `1` to skip automatic copy to `results/report-<timestamp>/` | unset (backup enabled on CLI) |

### Portal URLs

Configure portal URLs in `config/env.ts`:

```typescript
const environments = {
  qat: {
    do: { baseUrl: 'https://do-qat.udc.com', ... },
    rss: { baseUrl: 'https://rss-qat.udc.com', ... },
    css: { baseUrl: 'https://css-qat.udc.com', ... },
  },
  // ... other environments
};
```

## 🎯 Best Practices

1. **Use Page Object Model** - All page interactions through page objects
2. **Visual Highlighting** - CommonUtils provides debug-friendly element highlighting
3. **Data-Driven Tests** - Store test data in JSON files
4. **Type Safety** - Use TypeScript interfaces for test data
5. **Barrel Exports** - Import from index files for cleaner imports
6. **Tag Tests** - Use tags for filtering and organization

## 📚 Documentation

- **[Beginner guide — Playwright in VS Code, Test Explorer, packages, MCP (Jira), and Cursor agents](docs/BEGINNER-GUIDE-PLAYWRIGHT-CURSOR-JIRA.md)** ([DOCX](docs/BEGINNER-GUIDE-PLAYWRIGHT-CURSOR-JIRA.docx)) — product-agnostic onboarding (install, extension, libraries, Testing sidebar); optional appendix for this repo
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Ortoni Report](https://www.npmjs.com/package/ortoni-report)

## 🤝 Contributing

1. Create a feature branch
2. Write tests for new features
3. Ensure all tests pass
4. Submit a pull request

## 📄 License

ISC
