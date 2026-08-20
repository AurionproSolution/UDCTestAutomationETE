# USIF-463 — Intake

## Metadata
- **Summary:** [MAF-9631] DO: Customer Details_Ribbon Navigation Displays Save Message When Leaving Personal | Business Details Tab for the first time
- **Type:** Bug
- **Status:** Open
- **Portal:** do (label: DO)
- **Reporter:** Kamal Nayyar
- **Related:** MAF-9631, MAF-8627
- **Environment:** 25.2.0
- **Jira:** https://aurionprofintechsolutions.atlassian.net/browse/USIF-463

## Bug description (Issue)
Adding a Customer: user is unable to navigate to another tab using the **Customer Details ribbon** the **first time** they leave the **Personal | Business Details** tab. The message **"Please save the party to proceed"** is displayed.

## Expectation
Selecting a tab from the ribbon should **automatically save** the party details (minimum: first name + last name) and navigate to the selected tab **without** displaying the save-party block message.

## Notes
- Party save requires minimum **first name** and **last name** (Save or Next also counts as party save per MAF-8627).
- Ribbon tab navigation should cache changes without committing until Save — but first navigation should auto-save party when min fields are met.
- Message copy may change to **"Please save to move to another tab"** (acknowledged in comments) — behavior fix is still: no block when min fields present.

## Steps to reproduce (description + Screen Recording 2026-08-06 173108.mp4)
1. Open DO Standard Quote → **Customer Details**.
2. **Add Borrowers / Guarantors** → **Add New Customer** (Individual).
3. On **Personal Details**, enter minimum party fields (**First Name**, **Last Name**) — do **not** click **Save** or **Next**.
4. First time leaving Personal Details: click **Address Details** on the Customer Details ribbon/stepper.
5. **Bug:** Toast/message **"Please save the party to proceed"** appears; navigation blocked.
6. **Expected:** Auto-save party and land on **Address Details** with no block message.

## Acceptance criteria (observable UI)
- After min first/last name on Personal Details, first ribbon click to **Address Details** navigates successfully.
- No **"Please save the party to proceed"** or **"Please save to move to another tab"** message.
- **Address Details** physical address step is visible.

## Media inventory
| File | Type | Role | Local path |
|------|------|------|------------|
| Screen Recording 2026-08-06 173108.mp4 | video | primary repro | assets/ (download via `node scripts/jira-download-attachments.mjs USIF-463`) |
| image-20260819-055914.png | image | message copy update | assets/ |

## Video-derived observations
- Repro: Personal Details → ribbon **Address Details** first time → save-party message blocks navigation.
- Run `node scripts/jira-extract-video-frames.mjs` on downloaded mp4 for frame notes when `ATLASSIAN_EMAIL` + `ATLASSIAN_API_TOKEN` are set.

## Gaps / assumptions
- Test covers **Individual / Personal Details** path (primary video repro). Business Details ribbon path can be added when needed.
- Bug is **open** — test fails on QAT until ribbon auto-save is implemented.
