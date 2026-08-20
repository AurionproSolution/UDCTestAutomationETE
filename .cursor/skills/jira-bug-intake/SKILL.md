---
name: jira-bug-intake
description: >-
  Extract Jira bug/ticket requirements including description, expectation, notes,
  comments, images, and video repro steps; write structured intake.md; then generate
  Playwright tests. Use when user provides a Jira key for a bug or defect with
  attachments, or asks to extract repro steps from Jira videos/screenshots.
---

# Jira Bug Intake

Use this skill when processing a Jira issue key for bug automation. Read fully before Phase 1.

## Auth for attachment download

Scripts use Jira REST API with Basic auth:

| Env var | Value |
|---------|-------|
| `ATLASSIAN_EMAIL` | Your Atlassian account email |
| `ATLASSIAN_API_TOKEN` | API token from https://id.atlassian.com/manage-profile/security/api-tokens |
| `ATLASSIAN_SITE` | Optional; default `aurionprofintechsolutions.atlassian.net` |

If download fails, continue with text-only intake and note the gap in **Gaps / assumptions**.

## Output locations

| Artifact | Path |
|----------|------|
| Intake document | `docs/jira-intake/{KEY}/intake.md` |
| Attachments | `docs/jira-intake/{KEY}/assets/{filename}` |
| Video frames | `docs/jira-intake/{KEY}/frames/frame-NNN.png` |
| Frame manifest | `docs/jira-intake/{KEY}/frames/manifest.json` |
| Asset manifest | `docs/jira-intake/{KEY}/assets/manifest.json` |

Binary assets are gitignored; `intake.md` may be committed.

## Media priority (repro extraction)

1. **Videos first** — prefer filenames containing `MAF`, `repro`, `screen`, or reporter-uploaded `.mp4`
2. When multiple videos exist, analyze the **smallest** repro video first (skip `--skip-large` files > 50 MB unless user requests)
3. **Images second** — PNG/JPG from attachments
4. **Text third** — description table + human comments; **ignore** noise:
   - Status-sync comments (`currently 'Open'`, `Status update from client Jira`)
   - Prior `[Test automation] Blocked` boilerplate without user structure

## Video frame extraction

```bash
node scripts/jira-extract-video-frames.mjs "docs/jira-intake/{KEY}/assets/{video}.mp4" --interval 5 --max-frames 20
```

- Requires `ffmpeg` on PATH
- Read each frame with `Read` (vision) and note UI state, field values, errors visible
- Merge frame observations into **Steps to reproduce** and **Video-derived observations**
- If ffmpeg missing: document in intake; rely on images + Jira text

## Download attachments

```bash
node scripts/jira-download-attachments.mjs {KEY}
node scripts/jira-download-attachments.mjs {KEY} --skip-large
```

Skips re-download when local file exists and size matches manifest.

## Description table parsing

Many USIF bugs use a table:

| Issue | Expectation | Notes |

Map columns explicitly into intake sections — do not leave as raw markdown only.

## Intake template

Write `docs/jira-intake/{KEY}/intake.md` using this structure:

```markdown
# {KEY} — Intake

## Metadata
- **Summary:** …
- **Type:** Bug
- **Status:** …
- **Resolution:** …
- **Portal:** do | rss | css (from labels/components)
- **Reporter:** …
- **Jira:** https://aurionprofintechsolutions.atlassian.net/browse/{KEY}

## Bug description (Issue)
…

## Expectation
…

## Notes
…

## Steps to reproduce
1. …
(merged from description, comments, video frames, images)

## Acceptance criteria (observable UI)
- …

## Media inventory
| File | Type | Role | Local path |
|------|------|------|------------|
| … | video | primary repro | assets/… |

## Video-derived observations
- frame-001: …
- frame-002: …

## Gaps / assumptions
…
```

## Six-block gate

After writing intake.md, run the readiness gate from [test-case-writer Step 2.5](../../agents/test-case-writer.md) on:

1. `intake.md` (full file)
2. Original Jira description + comments + AC fields

Video-derived steps count toward **Steps to reproduce**. Intake **Expectation** and **Acceptance criteria** satisfy those blocks when Jira description is thin.

## Phase 2 — Test generation

If gate passes, continue with test-case-writer Steps 3–7:

- Portal from labels (`DO` → `do`)
- Jira bug tests: `tests/do-portal/doSanityTest/jira tickets/{KEY}-{slug}.test.ts`
- Tags: `@do @bug @{KEY}`
- Header comment: source, Jira URL, repro steps, `--workers=1` run command
- Reuse POM patterns from sibling USIF tests (e.g. USIF-425 for copy-primary-borrower)

## Linked agents

| Agent | Role |
|-------|------|
| [jira-bug-intake](../../agents/jira-bug-intake.md) | Full intake + test generation |
| [test-case-writer](../../agents/test-case-writer.md) | Step 2.5 gate + Steps 3–7 patterns |
| [test-case-catalog](../test-case-catalog/SKILL.md) | Optional TCC naming / Excel after test exists |
