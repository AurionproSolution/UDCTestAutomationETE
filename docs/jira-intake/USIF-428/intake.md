# USIF-428 — Intake

## Metadata
- **Summary:** DO: Customer Detail City Validation Error Displayed When City Field Is Populated
- **Type:** Bug
- **Status:** Resolved
- **Resolution:** Done (fixed in next version)
- **Portal:** do (label: DO)
- **Reporter:** Dharmveer Baroniya
- **Environment:** 25.2.0
- **Jira:** https://aurionprofintechsolutions.atlassian.net/browse/USIF-428

## Bug description (Issue)
The guarantor (1190537) address was copied from an existing borrower. Although the City field was showing as populated on screen, an error message displayed.

## Expectation
If the City field contains a value, no validation message should appear.

## Notes
This did not appear when the borrower (1190536) was loaded.

## Steps to reproduce
1. Open DO Portal Standard Quote → Customer Details.
2. Add/load primary borrower with a complete address (City populated).
3. Add guarantor (or second party) and use **Copy primary borrower** address on Address Details.
4. Observe City field shows a value on screen.
5. Save or attempt to continue — **City is required** validation must **not** appear when City is populated.

## Acceptance criteria (observable UI)
- Physical City input displays a non-empty value after copy-primary-borrower.
- No inline **City is required** message on physical address when City is populated.
- No inline **City is required** on postal address when postal City is populated (if postal section visible).

## Media inventory
| File | Type | Role | Local path |
|------|------|------|------------|
| MAF9680 City Field.mp4 | video | primary repro | assets/MAF9680 City Field.mp4 |
| image-20260811-234139.png | image | screenshot | assets/image-20260811-234139.png |
| Dealer - Google Chrome 2026-08-18 11-39-25.mp4 | video | QAT unable-to-reproduce recording | assets/ (large — skip by default) |

## Video-derived observations
- Primary repro video (`MAF9680 City Field.mp4`): copy-borrower address flow on guarantor; City visible but validation fires — run `node scripts/jira-extract-video-frames.mjs` after download for frame-by-frame notes.
- QAT comment (2026-08-18): team unable to reproduce on current build — test serves as regression guard.

## Gaps / assumptions
- Customer numbers 1190536/1190537 from production may not exist on QAT — test uses manual address + copy-primary-borrower (same pattern as USIF-425).
- Download attachments requires `ATLASSIAN_EMAIL` + `ATLASSIAN_API_TOKEN` env vars.
