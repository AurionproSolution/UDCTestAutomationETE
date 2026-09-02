# USIF-492 — Intake

## Metadata

- **Summary:** [MAF-9727] DO: Split Asset Bad Request Error on Calculate
- **Type:** Bug
- **Status:** Open
- **Portal:** DO
- **Related:** MAF-9727
- **Reporter:** Dharmveer Baroniya
- **Jira:** https://aurionprofintechsolutions.atlassian.net/browse/USIF-492
- **Environment (Jira):** 25.2.0
- **Product / program:** TL-B-Assigned / Term Loan Business - MV Dealer
- **Contract (Jira):** 120
- **Dealer (Jira):** Fairview Hamilton - Ford (1047541)
- **Role (Jira):** Kelli.Test

## Bug description (Issue)

After **copying a split asset** (duplicate asset from Asset & Insurance Summary) and returning to the **Asset Details** tab, clicking **Calculate** displays a **Bad Request (400)** error.

Comment (UAT): *Getting 400 error on save*.

## Expectation

Users should be able to **Calculate** successfully without receiving a 400 error after split/copy asset workflow.

## Notes

- Enclosed video on Jira (`MAF9727 - Bad Request.mp4`).
- Screenshot `image-20260818-021235.png` shows error state.

## Where dealer goes (portal / entry)

- Portal: **do**
- Start: Standard Quote → **TL-B-Assigned** → **Term Loan Business - MV Dealer** → **Asset Details**

## Preconditions

- Term Loan Business Standard Quote with at least one physical asset in **Asset & Insurance Summary**.
- Quote has been **Calculate**d at least once before copy/split workflow.
- Automation uses **Armstrong Prestige Wellington** (QAT default) when Fairview Hamilton dealer is unavailable.

## Steps to reproduce

1. Create a **TL-B-Assigned** Standard Quote (Term Loan Business - MV Dealer).
2. Add asset via **Asset & Insurance Summary** (enter asset summary / edit financial asset).
3. Set terms and click **Calculate** (first successful calculate).
4. Re-open summary → **edit** the financial/physical asset → **Submit**.
5. **Copy** asset (split — `fa-clone` icon) → change identifying fields → **Submit**.
6. Return to **Asset Details** tab.
7. Click **Calculate** again.
8. **Bug:** **Bad Request (400)** toast/error; calculate does not complete.

## Acceptance criteria (observable UI)

- After copy/split asset and return to Asset Details, **Calculate** completes without **Bad Request** / **400** error.
- Payment summary / schedule or Total Amount Borrowed updates (quote remains calculable).
- Test **fails while USIF-492 is open**; **passes when fixed**.

## Media inventory

| File | Type | Role | Local path |
|------|------|------|------------|
| MAF9727 - Bad Request.mp4 | video | Primary repro (~5.5 MB) | *(not downloaded — ATLASSIAN_API_TOKEN not set)* |
| Dealer - Google Chrome 2026-08-21 11-00-49.mp4 | video | UAT repro (~80 MB) | *(not downloaded)* |
| image-20260818-021235.png | image | Error screenshot | *(not downloaded)* |

## Video-derived observations

- Primary repro video filename: **MAF9727 - Bad Request.mp4** — Calculate after split/copy asset on TL Business quote.
- UAT comment video shows 400 on save/calculate after same workflow.
- Frames not extracted locally (attachment download skipped).

## Gaps / assumptions

- Attachment download / ffmpeg frame extraction skipped (no `ATLASSIAN_EMAIL` / `ATLASSIAN_API_TOKEN`).
- Automation dealer: **Armstrong Prestige Wellington** + `TL_SQ_PROGRAM` env fallback (Jira used Fairview Hamilton - Ford).
- “Split asset” mapped to **copy asset from summary** (`fa-clone`) creating a second physical asset row.
- TL-B on QAT: empty summary exposes **Search & Add Asset** only (no Edit pen until a row exists) — automation uses `openAddAssetEditorViaSearchDialog` for the first asset.
