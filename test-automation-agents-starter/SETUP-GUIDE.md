# Step-by-step setup guide — Test Automation Agents Kit

Follow these steps in order. Allow **45–60 minutes** for first-time setup.

---

## Before you start

### What you need

- [ ] **Cursor IDE** installed ([cursor.com](https://cursor.com))
- [ ] **Your team's Playwright repo** cloned to your machine
- [ ] **Node.js** installed (to run Playwright tests)
- [ ] **JIRA access** (same account you use in the browser)
- [ ] This zip folder unzipped (e.g. `C:\Tools\test-automation-agents-starter\`)

### What you will create in your repo

```
your-playwright-repo/
  .cursor/
    agents/
      test-automation-architect.md    ← from kit
      test-case-writer.md             ← from kit
    rules/
      jira-issue-test-gate.mdc        ← from kit
    project/
      automation-blueprint.md         ← YOU fill this in
    skills/
      project-framework/
        SKILL.md                      ← optional POM maps
    subagents.json                    ← merge kit entries
```

---

## Step 1 — Unzip the kit (2 min)

1. Unzip `test-automation-agents-kit.zip` to a folder you will keep (not inside the Playwright repo).
2. Open the folder and confirm you see `START-HERE.md`, `SETUP-GUIDE.md`, `install.ps1`, and `agents/`.

---

## Step 2 — Run the install script (5 min)

### Windows (PowerShell)

```powershell
cd C:\path\to\unzipped\test-automation-agents-starter
.\install.ps1 -TargetRepo "C:\path\to\your-playwright-repo"
```

### macOS / Linux

```bash
cd /path/to/unzipped/test-automation-agents-starter
chmod +x install.sh
./install.sh /path/to/your-playwright-repo
```

### Expected output

- `Created ...\.cursor\project\automation-blueprint.md` (or `Kept existing blueprint` if re-running)
- `Agent kit installed to ...`

### If you cannot run scripts

Copy manually (see **ONBOARDING.md** → Option B).

---

## Step 3 — Register agents in Cursor (10 min)

1. Open your Playwright repo in **Cursor**.
2. Open `.cursor/subagents.json` (create the file if it does not exist).
3. Open **`subagents.snippet.md`** from the kit folder.
4. Copy the two JSON agent entries into the `"subagents"` array in `subagents.json`.
5. If you already have other agents (Planner, Healer, etc.), **add** these two — do not delete existing entries.
6. Save the file.

**Minimal `subagents.json` example:**

```json
{
  "subagents": [
    {
      "id": "test-automation-architect",
      "name": "Test Automation Architect",
      "description": "Playwright workflow orchestration. Reads automation-blueprint.md.",
      "model": "inherit",
      "file": ".cursor/agents/test-automation-architect.md"
    },
    {
      "id": "test-case-writer",
      "name": "Test Case Writer",
      "description": "JIRA to Playwright test. Reads automation-blueprint.md.",
      "model": "inherit",
      "file": ".cursor/agents/test-case-writer.md"
    }
  ]
}
```

7. **Restart Cursor** or reload the window so subagents appear.

---

## Step 4 — Fill the automation blueprint (20–30 min)

This is the **most important step**. Agents read this file to know how **your** repo is organized.

1. Open **`.cursor/project/automation-blueprint.md`** in your Playwright repo.
2. Open **`templates/automation-blueprint.md`** from the kit (empty template).
3. Open **`examples/udc-blueprint.md`** from the kit (completed example).
4. Fill every section in your repo's blueprint:

| Section | What to enter | Example |
|---------|---------------|---------|
| **Project name** | Your project | `My App E2E Tests` |
| **Modules** | App areas + JIRA prefixes | `web`, tag `@web`, prefix `PROJ-` |
| **Paths** | Where tests, pages, config live | `tests/e2e/**/*.spec.ts` |
| **Conventions** | File naming, describe format, tags | `@smoke`, `@regression` |
| **URL helpers** | Imports from your config file | `APP_BASE_URL` |
| **JIRA six blocks** | Section titles for ticket template | Block 2: "Where user starts" |
| **Reference tests** | 2–3 existing spec file paths | Real files in your repo |
| **Catalog** | `enabled: false` unless your team uses TCC Excel | |

**Ask your team lead** to review this file before your first test.

---

## Step 5 — Optional: project framework skill (10 min)

Only if your app has **multi-step wizards** or complex POM routing:

1. Edit **`.cursor/skills/project-framework/SKILL.md`** (created by install script).
2. Add tables: UI step → page object class → file path.
3. Link it in your blueprint under **Skills → framework**.

Skip this step if your app is simple.

---

## Step 6 — Connect Atlassian MCP (10 min)

The **Test Case Writer** reads JIRA tickets via MCP.

1. In Cursor, open **Settings** → **MCP** (or Features → MCP).
2. Enable the **Atlassian** MCP server.
3. Sign in with your JIRA account when prompted.
4. Test in main chat (optional):

   Ask: *"List my Atlassian resources"* or use the MCP tool `getAccessibleAtlassianResources`.

If MCP fails, you can still use the **Architect**; **Test Case Writer** will not fetch JIRA until MCP works.

---

## Step 7 — Verify setup (5 min)

1. In Cursor, open the **subagent** picker.
2. Select **Test Automation Architect**.
3. Paste this prompt:

```text
Read our automation-blueprint.md and confirm we are ready for JIRA-driven Playwright tests.
List any missing or incomplete blueprint sections.
```

### Success looks like

- Agent confirms modules, paths, and reference tests
- Or lists exactly what to fix in the blueprint

### Failure looks like

- "Blueprint missing" → re-run install script or copy template manually
- "Incomplete" → finish Step 4

---

## Step 8 — First JIRA test (15 min)

### 8a. Prepare a JIRA ticket

The ticket must include **six blocks** (see blueprint JIRA template). Minimum:

```text
## Summary
Dealer can save customer details on Standard Quote

## Where user starts
Module: do
Start: Dealer portal → Standard Quote → Customer Details

## Preconditions
QAT env, dealer user with storageState

## Steps to reproduce
1. Open Standard Quote
2. Click Next to Customer Details
3. Click Add Borrower

## Screenshot / reference
(attach or link)

## Acceptance criteria
- Borrower row appears in grid
- Save button is enabled after required fields filled
```

### 8b. Open Test Case Writer

Paste (replace with your values):

```text
Create a Playwright test from JIRA using project conventions.

<context>
<jira-issue>YOUR-ISSUE-KEY</jira-issue>
<module>your-module-id</module>
<test-type>regression</test-type>
<output-path>tests/your-path/feature-name.test.ts</output-path>
</context>
```

### 8c. Run the test

```bash
npx playwright test path/to/your-new-test.test.ts
```

---

## Daily cheat sheet

| I want to… | Agent | Prompt |
|------------|-------|--------|
| Don't know where to start | **Test Automation Architect** | `I have JIRA ABC-123. Where do I start?` |
| Write test from JIRA | **Test Case Writer** | See Step 8b |
| Failing test | **Test Automation Architect** | `Spec X fails with timeout. What agent next?` |
| Check setup | **Test Automation Architect** | Step 7 verify prompt |

---

## Upgrading the kit later

When your team publishes a new kit version:

```powershell
.\install.ps1 -TargetRepo "C:\path\to\your-playwright-repo" -Upgrade
```

This refreshes **agents** and **rules** only. Your **blueprint is not overwritten**.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Subagents not visible | Check `subagents.json`, restart Cursor |
| Agent uses wrong paths | Update `automation-blueprint.md` |
| Test Case Writer won't write | JIRA ticket missing six blocks — complete ticket or read JIRA comment agent posted |
| MCP / JIRA error | Re-authenticate Atlassian MCP in Settings |
| "Blueprint missing" | Run `install.ps1` again or copy `templates/automation-blueprint.md` |

---

## Document map

| Read when… | Document |
|------------|----------|
| First time setup | **SETUP-GUIDE.md** (this file) |
| Quick checklist | **ONBOARDING.md** |
| Daily usage & architecture | **docs/AI-Test-Automation-Agents-Whitepaper.md** |
| Blueprint example | **examples/udc-blueprint.md** |

---

**You are done when** Step 7 passes and you have run one successful Test Case Writer flow (or your lead confirms the blueprint).
