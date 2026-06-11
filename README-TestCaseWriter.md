# Test Case Writer Agent

A Cursor subagent that automatically generates Playwright test scripts from JIRA requirements, following the UDC Test Automation ETE project patterns.

## Overview

The Test Case Writer agent fetches requirements from JIRA issues, runs a **requirements gate** (six-block template on **Description + issue comments** + attachments), posts a **JIRA comment to the reporter** if the gate fails, then analyzes your project's existing test patterns and generates complete Playwright test files. It handles:

- Fetching JIRA issue details (summary, description, **comments**, attachments, labels, reporter)
- **Step 2.5 gate** — no test file is written until the template is satisfied (unless you explicitly override in chat)
- Analyzing existing test file patterns in your project
- Identifying relevant Page Objects for the feature
- Generating properly structured test files with correct imports
- Following the project's Page Object Model conventions

## Prerequisites

1. **Atlassian MCP Server**: The agent requires the Atlassian MCP server to be configured in Cursor for JIRA access.
2. **JIRA Issue**: Have a JIRA issue key ready (e.g., `DO-123`, `RSS-456`)
3. **Project Structure**: Your project should follow the standard UDC Test Automation structure with:
   - `tests/{portal}-portal/` folders
   - `pages/{portal}-portal/` Page Objects
   - `config/env.ts` for environment URLs

## Usage

### Method 1: Using the Task Tool

Invoke the agent via Cursor's Task tool:

```typescript
Task tool with:
- subagent_type: "test-case-writer"
- prompt: "Create a test for JIRA issue DO-456 in the DO portal for document upload feature"
```

### Method 2: Natural Language Request

Simply ask in the chat:

```
Generate a Playwright test for JIRA issue DO-123 which describes the new customer quote feature.
```

### Method 3: With Specific Parameters

Provide detailed context:

```
Create a test for:
- JIRA Issue: RSS-789
- Portal: rss
- Test Type: smoke
- Feature: Login with 2FA
```

## Input Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| JIRA Issue Key | Yes | The JIRA issue identifier | `DO-123`, `RSS-456` |
| Portal | No | Target portal: `do`, `rss`, or `css` | Auto-detected from issue key |
| Test Type | No | `sanity`, `smoke`, or `regression` | Auto-determined |
| Output Path | No | Specific file path | Auto-generated |

## How It Works

### 1. Fetches JIRA Requirements

The agent connects to JIRA via MCP and retrieves:

- Issue summary (used for test naming)
- Description and **issue comments** (merged for the Step 2.5 gate and for context)
- Acceptance criteria (from description, comments, or AC fields when present)
- Labels and components (for tagging)
- Attachments and **reporter** (for screenshot/reference checks and gate-failure comments)

### 1.5 Requirements gate (Step 2.5)

Before any file is written, the agent checks the **six-block** template against **Description + issue comments** (+ AC fields, attachments). If anything required is missing, it posts a JIRA comment for the **reporter** and stops. See [`.cursor/agents/test-case-writer.md`](.cursor/agents/test-case-writer.md).

### 2. Analyzes Project Patterns

The agent examines your existing code to understand:
- Import patterns (how to import from `config/env` and `pages/`)
- Test file structure (`test.describe`, `test.beforeEach` patterns)
- Page Object usage patterns
- Timeout configurations
- Tag conventions (`@do`, `@smoke`, `@regression`)

### 3. Identifies Relevant Page Objects

Based on the feature area from JIRA, the agent searches for:
- Existing Page Objects in the relevant portal folder
- Common base page objects
- Re-export patterns from `pages/index.ts`

### 4. Generates the Test File

**After Step 2.5 passes** (or you explicitly override in chat), creates a complete test file including:
- File header comment with JIRA reference
- Proper imports (Playwright, URLs, Page Objects)
- Page object declarations and beforeEach setup
- Test steps mapped from JIRA acceptance criteria
- Appropriate tags and timeout settings

## Generated Test Structure

```typescript
/**
 * DO Portal - Document Upload Tests
 * E2E tests for verifying document upload functionality
 *
 * Source: JIRA DO-456
 */

import { test, expect } from "@playwright/test";
import { DO_DEALER_STANDARD_QUOTE_URL } from "../../../config/env";
import { DODashboardPage } from "../../../pages";

let dashboardPage: DODashboardPage;

test.describe("DO Portal - Document Upload - Feature @do @regression", () => {
  test.beforeEach(async ({ page }) => {
    dashboardPage = new DODashboardPage(page);
  });

  test("Document Upload - Dealer can upload documents", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto(DO_DEALER_STANDARD_QUOTE_URL());
    // ... test steps
  });
});
```

## Output Location

Generated tests are saved to:

| Portal | Output Path |
|--------|-------------|
| DO | `tests/do-portal/{feature-name}.test.ts` |
| RSS | `tests/rss-portal/{feature-name}.test.ts` |
| CSS | `tests/css-portal/{feature-name}.test.ts` |

## Examples

### Example 1: Simple Feature Test

**Request:**
```
Create a test for JIRA DO-123 about the dealer login feature
```

**Output:** `tests/do-portal/login/dealer-login.test.ts`

### Example 2: Complex Multi-Step Feature

**Request:**
```
Generate a test for RSS-789 - Customer quote creation with multiple assets
```

**Output:** `tests/rss-portal/quote/customer-quote-multi-asset.test.ts`

### Example 3: Smoke Test

**Request:**
```
Create a smoke test for CSS-456 - Login page load verification
```

**Output:** `tests/css-portal/smoke/login-page-load.test.ts`

## Best Practices

### JIRA issue template (required for automation)

Tickets used with this agent must satisfy the **six-block** checklist (non-empty, specific — no “TBD”). Canonical instructions live in **[`.cursor/agents/test-case-writer.md`](.cursor/agents/test-case-writer.md)** (Step 2.5). Put content in the **Description** (preferred) or in **issue comments**; the agent merges **Description + returned comments** when running the gate.

**Blocks:** Summary · Where dealer goes (portal + start path) · Preconditions · Steps to reproduce · Screenshot/reference (or waiver) · Acceptance criteria (observable UI).

If the gate fails, the agent posts a **[Test automation]** comment on the issue for the **reporter** with what is missing and a filled example.

### JIRA Issue Preparation

For best results, also include:
1. Labels indicating the portal (e.g., `do-portal`, `rss-portal`) when helpful
2. Component assignment for feature area

Example well-structured JIRA issue (still valid; align section headings with the six-block template where possible):
```markdown
**Summary:** Dealer Document Upload Feature

**Description:**
As a dealer, I want to upload customer documents so that...

**Acceptance Criteria:**
1. Dealer navigates to quote page
2. Dealer clicks "Upload Document" button
3. Dealer selects file and uploads
4. System displays success message
5. Document appears in document list
```

### After Generation

1. **Review the generated test** for accuracy against the JIRA requirements
2. **Verify page object methods** match the actual UI elements
3. **Run the test** to ensure it executes:
   ```bash
   npx playwright test tests/do-portal/your-test.test.ts --project=do-portal-chromium
   ```
4. **Update the JIRA issue** with the test file path in the comments or description
5. **Add any missing page objects** if the UI has changed since existing tests were written

## Troubleshooting

### "Cannot fetch JIRA issue"

**Cause:** JIRA issue key is invalid or you don't have access
**Solution:** 
- Verify the issue key format (e.g., `DO-123`)
- Check JIRA permissions and **Atlassian MCP** authentication in Cursor
- Try accessing the issue directly in JIRA

### Gate failed / agent posted "[Test automation] Blocked"

**Cause:** Description + scanned comments do not yet cover all six blocks (or only automation boilerplate comments exist).

**Solution:** Update the **Description** (preferred) or add a comment with numbered steps, portal/start path, preconditions, and AC. Re-run the agent. Avoid deleting the only comment that contained the repro details.

### "No relevant page objects found"

**Cause:** Feature area is new or hasn't been automated yet
**Solution:**
- The agent will add TODO comments indicating where page objects are needed
- Create the necessary page objects first, then re-run
- Or update the generated test with raw Playwright locators

### "Portal cannot be determined"

**Cause:** JIRA issue doesn't have clear portal labels/components
**Solution:**
- Explicitly specify the portal in your request: "in the DO portal"
- Add portal labels to the JIRA issue
- Check the JIRA project key prefix (e.g., "DO-" usually means DO portal)

### Generated test has incorrect steps

**Cause:** JIRA acceptance criteria were not detailed enough
**Solution:**
- Update the JIRA issue with more specific steps
- Manually edit the generated test
- Provide additional context in your agent request

## Configuration

The agent reads configuration from:
- `config/env.ts` - Environment URLs and portal configurations
- `playwright.config.ts` - Test timeouts and project settings
- Existing test files - Patterns and conventions

No additional configuration files are needed.

## Supported Portals

| Portal | Description | URL Helper |
|--------|-------------|------------|
| DO | Dealer Operations Portal | `DO_DEALER_STANDARD_QUOTE_URL()` |
| RSS | RSS Portal | `RSS_BASE_URL()` |
| CSS | CSS Portal | `CSS_BASE_URL()` |

## Integration with CI/CD

Generated tests can be run as part of your CI/CD pipeline:

```bash
# Run all DO portal tests
npx playwright test tests/do-portal/ --project=do-portal-chromium

# Run smoke tests only
npx playwright test --grep=@smoke --project=all-portals-smoke

# Run specific test
npx playwright test tests/do-portal/your-feature.test.ts
```

## Contributing

To improve the Test Case Writer agent:

1. Update the agent definition: [`.cursor/agents/test-case-writer.md`](.cursor/agents/test-case-writer.md)
2. Optional workspace rule: [`.cursor/rules/jira-issue-test-gate.mdc`](.cursor/rules/jira-issue-test-gate.mdc) (main chat follows the same gate when a Jira key is used)
3. Add new patterns as the project evolves
4. Update this documentation with new examples

## See Also

- [Playwright Test Generator](.cursor/agents/playwright-test-generator.md) — generating tests by driving the browser from a plan
- [Playwright Test Planner](.cursor/agents/playwright-test-planner.md) — exploratory plans and saved test plans
- [Beginner guide — Playwright in VS Code, Test Explorer, packages, MCP, agents](docs/BEGINNER-GUIDE-PLAYWRIGHT-CURSOR-JIRA.md) — product-agnostic onboarding for any team
- [Project README](README.md) — general project documentation
