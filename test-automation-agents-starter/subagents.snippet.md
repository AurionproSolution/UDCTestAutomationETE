# subagents.json snippet

Merge these entries into your repo's `.cursor/subagents.json` `subagents` array.
Adjust descriptions if needed. Keep existing entries for Planner, Generator, Healer.

```json
{
  "id": "test-automation-architect",
  "name": "Test Automation Architect",
  "description": "Playwright workflow orchestration: which subagent to run next (JIRA vs plan vs heal vs catalog). Reads automation-blueprint.md.",
  "model": "inherit",
  "file": ".cursor/agents/test-automation-architect.md"
},
{
  "id": "test-case-writer",
  "name": "Test Case Writer",
  "description": "JIRA → Playwright test. Reads automation-blueprint.md, six-block gate, optional catalog Step 8.",
  "model": "inherit",
  "file": ".cursor/agents/test-case-writer.md"
}
```
