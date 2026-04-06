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
├── tests/
│   ├── do-portal/                  # DO Portal tests
│   │   ├── login/
│   │   │   └── login.test.ts
│   │   └── dashboard/
│   │       └── dashboard.test.ts
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

# Install Playwright browsers
npx playwright install
```

## 🧪 Running Tests

### By Portal

```bash
# DO Portal tests
npm run test:do
npm run test:do:firefox
npm run test:do:webkit

# RSS Portal tests
npm run test:rss
npm run test:rss:firefox

# CSS Portal tests
npm run test:css
npm run test:css:firefox

# All portals
npm run test:all-portals
```

### By Test Type

```bash
# Smoke tests (all portals)
npm run test:smoke

# Regression tests (all portals)
npm run test:regression

# Mobile tests
npm run test:mobile
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

# Headed mode (see browser)
npm run test:headed
```

## 📊 Reports

```bash
# View Playwright HTML report
npm run report

# View Ortoni custom report
npm run report:ortoni
```

## 🏷️ Test Tags

Use tags to categorize and filter tests:

| Tag | Description |
|-----|-------------|
| `@smoke` | Quick validation tests |
| `@regression` | Full regression suite |
| `@do` | DO Portal specific tests |
| `@rss` | RSS Portal specific tests |
| `@css` | CSS Portal specific tests |
| `@mobile` | Mobile viewport tests |

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
| `CI` | CI environment flag | - |

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
