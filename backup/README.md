# UDC Automation Tests

A Playwright TypeScript automation framework for end-to-end testing.

## 📁 Project Structure

```
udc-automation-tests/
├── .github/
│   └── workflows/          # CI/CD pipeline configurations
├── .vscode/                # VS Code editor settings
├── my-report/              # Playwright HTML report output
├── ortoni-report/          # Ortoni custom report output
├── pages/                  # Page Object Model classes
├── specs/                  # Test specification files
├── testData/               # Test data files (JSON/CSV)
├── tests/                  # Core test logic modules
├── utils/                  # Helper functions and utilities
├── playwright.config.ts    # Playwright configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project dependencies
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

```bash
# Run all tests
npm test

# Run tests in headed mode
npm run test:headed

# Run tests with UI mode
npm run test:ui

# Run tests in debug mode
npm run test:debug

# Run tests for specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

## 📊 Reports

```bash
# View Playwright HTML report
npm run report

# View Ortoni report
npm run report:ortoni
```

## 📝 Writing Tests

### Page Object Model

Create page objects in the `/pages` directory:

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyPage extends BasePage {
  readonly myElement: Locator;

  constructor(page: Page) {
    super(page);
    this.myElement = page.locator('[data-testid="my-element"]');
  }

  async doSomething(): Promise<void> {
    await this.clickElement(this.myElement);
  }
}
```

### Test Specifications

Create test specs in the `/specs` directory:

```typescript
import { test, expect } from '@playwright/test';
import { MyPage } from '../pages';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    const myPage = new MyPage(page);
    await myPage.goto();
    await myPage.doSomething();
    await expect(page).toHaveURL(/expected-url/);
  });
});
```

## 🔧 Configuration

- **playwright.config.ts** - Main Playwright configuration
- **tsconfig.json** - TypeScript compiler options
- **testData/** - Store test data in JSON format

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

