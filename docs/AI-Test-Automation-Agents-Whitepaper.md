# AI Test Automation Agents — White Paper

**Version:** 1.0  
**Audience:** SDETs, QA automation leads, BAs writing JIRA tickets  
**Stack:** Playwright + TypeScript + Page Object Model + Cursor subagents + Atlassian MCP

---

## 1. Executive summary

This program provides two Cursor subagents for Playwright teams:

| Agent | Role |
|-------|------|
| **Test Automation Architect** | Orchestrates the pipeline—tells you which agent to run next and gives copy-paste handoff prompts |
| **Test Case Writer** | Fetches JIRA requirements, enforces a six-block quality gate, generates Playwright test files |

**Time to first value:** ~30–60 minutes to install the kit and fill your **automation blueprint**; first JIRA-driven test the same day.

**Key idea:** Base agents are **generic** and shared across teams. Each repo maintains one file—**`.cursor/project/automation-blueprint.md`**—that describes *your* modules, paths, conventions, and JIRA template labels.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Agent Kit (shared)                                      │
│  • test-automation-architect.md                          │
│  • test-case-writer.md                                   │
│  • jira-issue-test-gate rule                             │
└───────────────────────┬─────────────────────────────────┘
                        │ install
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Your Playwright repo                                    │
│  • .cursor/project/automation-blueprint.md  ← YOU FILL  │
│  • .cursor/skills/project-framework/        ← optional  │
│  • tests/, pages/, config/                               │
└─────────────────────────────────────────────────────────┘
```

Optional agents (not required for JIRA path): Playwright Test Planner, Generator, Healer.

**Manual handoffs:** Cursor runs one subagent at a time. The Architect gives you the exact prompt to paste into the next agent.

---

## 3. Day 0 setup

### 3.1 Prerequisites

- [ ] Cursor IDE with subagents enabled
- [ ] Playwright project (existing or new) with tests and page objects
- [ ] Atlassian MCP connected (`getJiraIssue`, `addCommentToJiraIssue`)
- [ ] Node.js for running Playwright tests

### 3.2 Install the Agent Kit

From `test-automation-agents-starter/` in this repository (or your internal kit repo):

1. Copy `agents/` → your repo `.cursor/agents/` (merge with existing agents if any)
2. Copy `rules/jira-issue-test-gate.mdc` → `.cursor/rules/`
3. Copy `templates/automation-blueprint.md` → `.cursor/project/automation-blueprint.md`
4. Update `.cursor/subagents.json` to register both agents (see starter `subagents.snippet.json`)
5. Optional: copy `templates/project-framework/SKILL.md` → `.cursor/skills/project-framework/SKILL.md`

See [test-automation-agents-starter/ONBOARDING.md](../test-automation-agents-starter/ONBOARDING.md) for the full checklist.

### 3.3 Fill the automation blueprint (required)

Edit `.cursor/project/automation-blueprint.md`:

| Section | Minimum required |
|---------|------------------|
| **Modules** | At least one module id, tag, JIRA prefix |
| **Paths** | tests, pages, config, basePage globs/paths |
| **Conventions** | describe template, tags, file suffix |
| **JIRA template** | Six block titles (especially block 2 — "where user starts") |
| **Reference tests** | 2–3 existing spec paths to copy patterns from |
| **URL helpers** | Imports from your config file |

**Reference implementation:** [`.cursor/project/automation-blueprint.md`](../.cursor/project/automation-blueprint.md) (UDC).

### 3.4 Configure Atlassian MCP

1. Open Cursor MCP settings
2. Enable Atlassian server
3. Authenticate to your Jira cloud site
4. Test: ask main chat to run `getAccessibleAtlassianResources`

### 3.5 Verify setup (first prompt)

Open **Test Automation Architect** and send:

```text
Read our automation-blueprint.md and confirm we are ready for JIRA-driven Playwright tests.
List any missing blueprint sections.
```

Expected: confirmation of modules, paths, and reference tests—or a clear list of gaps.

---

## 4. Agent reference

### Test Automation Architect

- **When:** You don't know where to start; need pipeline phases; want handoff text
- **Does not:** Write test files, fetch JIRA, drive browser
- **Reads:** `automation-blueprint.md` first every session

### Test Case Writer

- **When:** You have a JIRA issue key and want a Playwright spec
- **Does:** JIRA fetch → six-block gate → analyze repo → Write test file
- **Blocks:** Posts JIRA comment to **reporter** if ticket is incomplete; no file written until gate passes

---

## 5. First-prompt playbooks

### 5.1 Architect — "where do I start?"

```text
We use the test automation agents kit. I have JIRA PROJ-456 for a new checkout flow.
What pipeline should I follow and what is the exact handoff for the next agent?
```

### 5.2 Test Case Writer — JIRA → test (most common)

```text
Create a Playwright test from JIRA using project conventions.

<context>
<jira-issue>PROJ-123</jira-issue>
<module>web</module>
<test-type>regression</test-type>
<output-path>tests/e2e/checkout/my-feature.test.ts</output-path>
</context>
```

Replace `module` and `output-path` per your blueprint.

### 5.3 Architect — failing test

```text
Our spec tests/e2e/checkout/happy-path.spec.ts is failing in CI with a locator timeout.
Which agent should I use next and what should I paste into it?
```

### 5.4 After test is written — run it

```bash
npx playwright test tests/e2e/checkout/my-feature.test.ts
```

If red → Architect → hand off to **Playwright Test Healer**.

---

## 6. JIRA requirements standard (for BAs and QAs)

Tickets must include **six blocks** (titles from your blueprint). Default template:

```text
## Summary
<one line: what + for whom>

## Where user starts
Module: <module-id>
Start: <URL or menu path to first screen>

## Preconditions
<env, user/role, test data>

## Steps to reproduce
1. …
2. …

## Screenshot / reference
<attach image or link>

## Acceptance criteria
- <observable UI outcome>
- …
```

**If incomplete:** Test Case Writer posts a comment on the JIRA issue addressing the **reporter**, lists missing blocks, and **does not** generate a test file.

**Good ticket:** Numbered steps + concrete entry URL + observable AC.  
**Bad ticket:** Title only, "works as expected", no entry path.

---

## 7. Maintaining the blueprint

| Event | Action |
|-------|--------|
| New app module | Add row to Modules table |
| Folder restructure | Update Paths |
| New URL helper | Update URL helpers table |
| Multi-step wizard | Document POM map in `project-framework` skill |
| Team rename JIRA labels | Update JIRA template section |

**Owner:** Automation lead or designated champion per repo.  
**Do not** edit base agent files for project-specific changes—update the blueprint.

---

## 8. Upgrading the Agent Kit

1. Pull latest kit version
2. Re-copy `agents/` and `rules/` (overwrites base agents)
3. **Do not** overwrite `.cursor/project/automation-blueprint.md`
4. Read `CHANGELOG.md` for breaking blueprint schema changes

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Agent uses wrong paths | Blueprint missing/stale | Fill/update `automation-blueprint.md` |
| TCW won't write test | JIRA gate failed | Complete six blocks on ticket |
| MCP auth error | Atlassian disconnected | Re-authenticate MCP |
| Wrong page objects | Missing framework skill | Add POM map to `project-framework` |
| Agent mentions another product | Old agent files | Re-install kit agents |
| "Blueprint incomplete" | Missing reference tests | Add 2–3 paths to blueprint |

---

## 10. FAQ

**Can we fork the agents per project?**  
No. Use `automation-blueprint.md` and optional `project-framework` skill.

**Do we need Planner / Generator / Healer?**  
No for JIRA-driven work. Architect + Test Case Writer are enough.

**Can we use without JIRA?**  
Yes—ask Architect for Path B (Planner → Generator).

**What is the automation blueprint?**  
The per-repo design document agents read before acting. It replaces hard-coded UDC/DO knowledge in agent files.

---

## 11. Appendix

- Blueprint template: [test-automation-agents-starter/templates/automation-blueprint.md](../test-automation-agents-starter/templates/automation-blueprint.md)
- UDC reference blueprint: [.cursor/project/automation-blueprint.md](../.cursor/project/automation-blueprint.md)
- Playwright + Cursor basics: [BEGINNER-GUIDE-PLAYWRIGHT-CURSOR-JIRA.docx](./BEGINNER-GUIDE-PLAYWRIGHT-CURSOR-JIRA.docx)
- Onboarding checklist: [test-automation-agents-starter/ONBOARDING.md](../test-automation-agents-starter/ONBOARDING.md)
