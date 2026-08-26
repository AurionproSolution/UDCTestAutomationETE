# Agent Kit — Onboarding Checklist

Complete this checklist before your first Architect or Test Case Writer prompt.

## Install (15 min)

**Option A — install script (recommended)**

```powershell
# From test-automation-agents-starter/
.\install.ps1 -TargetRepo "C:\path\to\your-playwright-repo"
```

```bash
./install.sh /path/to/your-playwright-repo
```

**Option B — manual copy**

- [ ] Copy `agents/test-automation-architect.md` → `{your-repo}/.cursor/agents/`
- [ ] Copy `agents/test-case-writer.md` → `{your-repo}/.cursor/agents/`
- [ ] Copy `rules/jira-issue-test-gate.mdc` → `{your-repo}/.cursor/rules/`
- [ ] Copy `templates/automation-blueprint.md` → `{your-repo}/.cursor/project/automation-blueprint.md`
- [ ] Merge `subagents.snippet.md` into `{your-repo}/.cursor/subagents.json`
- [ ] Optional: copy `templates/project-framework/SKILL.md` → `.cursor/skills/project-framework/SKILL.md`

## Blueprint (20 min)

- [ ] Set project name and stack
- [ ] Add at least one **module** (id, tag, JIRA prefix)
- [ ] Set **paths**: tests, pages, config, basePage, pagesBarrel
- [ ] Set **conventions**: file pattern, describe template, tags
- [ ] Customize **JIRA six-block** section titles (block 2 = where user starts)
- [ ] List **2–3 reference tests** that show your import and POM patterns
- [ ] List **URL helpers** per module from your config file
- [ ] Set `catalog.enabled` true/false

See `examples/udc-blueprint.md` for a complete example.

## MCP (10 min)

- [ ] Atlassian MCP enabled in Cursor
- [ ] Authenticated to your Jira site
- [ ] Verified with `getAccessibleAtlassianResources`

## Verify (5 min)

Open **Test Automation Architect**:

```text
Read our automation-blueprint.md and confirm we are ready for JIRA-driven Playwright tests.
```

## First real test

Open **Test Case Writer**:

```text
Create a Playwright test from JIRA using project conventions.

<context>
<jira-issue>YOUR-ISSUE-KEY</jira-issue>
<module>your-module-id</module>
<test-type>regression</test-type>
<output-path>path/from/your/blueprint/feature.test.ts</output-path>
</context>
```

## Help

- **First-time setup:** [SETUP-GUIDE.md](./SETUP-GUIDE.md)
- **Start here:** [START-HERE.md](./START-HERE.md)
- White paper: [docs/AI-Test-Automation-Agents-Whitepaper.md](./docs/AI-Test-Automation-Agents-Whitepaper.md)
- Blueprint example: [examples/udc-blueprint.md](./examples/udc-blueprint.md)
