# Test Automation Agents Kit

**Give this folder (or zip) to new team members.** They should open **[START-HERE.md](./START-HERE.md)** first, then **[SETUP-GUIDE.md](./SETUP-GUIDE.md)**.
## Quick start

```powershell
.\install.ps1 -TargetRepo "C:\path\to\your-playwright-repo"
```

Or on macOS/Linux: `./install.sh /path/to/your-playwright-repo`

Then:

1. Read [ONBOARDING.md](./ONBOARDING.md)
2. Fill `.cursor/project/automation-blueprint.md`
3. Merge [subagents.snippet.md](./subagents.snippet.md) into `.cursor/subagents.json`
4. Open **Test Automation Architect** → verify setup
5. Read [docs/AI-Test-Automation-Agents-Whitepaper.md](./docs/AI-Test-Automation-Agents-Whitepaper.md)

## Contents

| Path | Purpose |
|------|---------|
| `agents/` | Generic base agent definitions |
| `rules/` | JIRA requirements gate rule |
| `templates/automation-blueprint.md` | Empty blueprint to copy |
| `templates/project-framework/SKILL.md` | Optional POM map skill template |
| `START-HERE.md` | Entry point for new team members |
| `SETUP-GUIDE.md` | Full step-by-step setup |
| `docs/AI-Test-Automation-Agents-Whitepaper.md` | Daily usage guide |
| `install.ps1` / `install.sh` | Copy kit into a target repo |
| `examples/udc-blueprint.md` | Full UDC reference blueprint |
| `subagents.snippet.md` | Merge into `.cursor/subagents.json` |

## Version

See [CHANGELOG.md](./CHANGELOG.md). Current: **1.0.0**.
