# Test Explorer (VS Code / Cursor) and Playwright projects

## Urgent: `tests/do-portal` missing, **0/0**, or lines like **`[do-portal-chromium] — disabled`**

That is almost always the **Playwright project toggle** and/or stale **workspace state** from the old multi-project config—not missing files in Git.

### Fix built into this repo (preferred)

[`.vscode/settings.json`](../.vscode/settings.json) sets **`PLAYWRIGHT_IDE=1`**. That switches [`playwright.config.ts`](../playwright.config.ts) to a **single project** (`udc-chromium`) that includes **all portals under `tests/`**, including **`tests/do-portal`**. The Playwright VS Code extension **always enables** a config that has only one project, so you should not need to tick nine project checkboxes.

DO login in IDE mode uses **`globalSetup`** (invisible in the tree), not the separate **`do-portal-auth-setup`** project.

### DO session reuse (15-minute gate)

Saved auth lives in **`playwright/.auth/do-portal.<env>.json`** with timestamps in **`do-portal-auth-meta.<env>.json`**.

Before each DO test run, the framework checks:

- **Reuse** saved cookies when the session was saved **≤ 15 minutes ago** and the JWT is still valid.
- **Run MFA login** when the session is **older than 15 minutes**, the JWT is **expired**, or the JWT expires within **2 minutes**.

In IDE mode, MFA runs on the **same browser** as your test (login → OTP → dealer). `globalSetup` only performs silent token refresh — it does not open a second headed window.

If a reused session lands on **`/landing`** (Select Application), the dashboard helper clicks **Quotes & Applications** automatically before continuing.

After pulling this change:

1. **Developer: Reload Window**
2. **Playwright: Clear cache** (Command Palette) if the tree still looks wrong
3. **Refresh tests** in Testing

### Manual fix (old multi-project state)

1. **Clear the filter** at the top of **Testing** (empty box → **Refresh**).
2. In the **Playwright** panel → **PROJECTS**, enable **`do-portal-chromium`** (or **Select all**). Disabled projects contribute **no** tests, so **`tests/do-portal`** vanishes.
3. **Reload window** → **Refresh tests**.
4. If toggles revert: **Playwright: Clear cache** → reload → enable projects again.

Terminal / CI still use the **multi-project** config (smoke, regression, `do-portal-chromium`, etc.) because they do **not** set `PLAYWRIGHT_IDE=1`.

## Troubleshooting: browser stuck on `about:blank` (no URL)

**Symptom:** Chrome opens but stays on `about:blank`; the test never navigates to the portal.

**Cause:** DO auth runs in the `@fixtures/doPortalTest` fixture *before* `page.goto()`. If a prior run was stopped during MFA (IDE stop, VM timeout, CI cancel), a coordination lock file may remain at `playwright/.auth/do-portal.<env>.json.mfa.lock`.

**Auto-fix (built in):** Before each run, `globalSetup` and `ensureDoPortalAuthSession` remove **stale** locks when the owning PID is dead or the lock is older than ~6 minutes. You should see a log line: `DO auth: removing stale MFA lock at ...`.

**Manual fallback:** Delete stale lock files and re-run:

```powershell
Remove-Item playwright\.auth\*.mfa.lock -ErrorAction SilentlyContinue
```

Then run `npx playwright test --project=do-portal-auth-setup` (or your DO test). Complete MFA/OTP when prompted; the browser will then navigate to the dealer URL.

## What you want

All Playwright tests—including everything under `tests/do-portal/`—visible in the **Testing** sidebar so you can **Run / Debug** with one click.

Playwright does **not** offer Cucumber-style `@Before` / “before folder” hooks that run outside the test list. Shared browser state is done with **`storageState`** plus either a **dependency project** (one `setup()` step) or **`test.beforeAll` / fixtures** inside each spec. This repo keeps the dependency-project pattern (reliable OTP login once per run) but places that step in **`playwright/do-portal-auth.setup.ts`** so the explorer’s `tests/do-portal` tree shows **only real specs**, not the setup file.

## Why they disappear

The Playwright extension does **not** mirror “folders on disk” only. It loads **`playwright.config.ts`** and builds one tree **per project** (`do-portal-chromium`, `rss-portal-chromium`, etc.).

If a project is **disabled** in the Playwright panel (shown as `playwright.config.ts [project-name] — disabled` at the bottom of Testing), the extension **does not attach that project’s tests** to the explorer (or treats them as inactive). After some extension updates, **many or all projects default to disabled**, so you often only see items that still match an enabled project—commonly just **`authenticate DO portal`** under the `playwright` folder for project **`do-portal-auth-setup`**.

DO UI tests live under project **`do-portal-chromium`**. If that project is disabled, you will not see those specs in the tree.

## What we changed in the repo

### 1. `playwright.env.PLAYWRIGHT_USE_DO_GLOBAL_AUTH` in `.vscode/settings.json`

`playwright.config.ts` only registers **`do-portal-auth-setup`** and DO **`storageState`** when `useGlobalDoAuth` is true (`!process.env.CI || PLAYWRIGHT_USE_DO_GLOBAL_AUTH === "1"`).

Some environments (or tools) expose **`CI=true`** to the Playwright extension even while you are working locally. Then `useGlobalDoAuth` becomes **false**, the auth project disappears from the resolved config, and **`do-portal-chromium` may stay disabled or fail discovery**—you might only see the auth setup step under **`playwright`** and the Testing view can show an error like **0/1**.

Setting **`"playwright.env": { "PLAYWRIGHT_USE_DO_GLOBAL_AUTH": "1" }`** makes the resolved config **always** include the DO auth pipeline for runs launched from VS Code / Cursor, so **`do-portal-chromium`** can list every spec under `tests/do-portal/`.

This does **not** change GitHub Actions unless you add the same variable to the workflow; CI jobs still default to unattended-safe behavior unless you opt in there.

### 3. Missing `playwright/.auth/do-portal.json` (common on fresh clones)

If `do-portal-chromium` used `storageState` pointing at a file that **does not exist yet**, some Playwright / VS Code versions fail to register that project correctly. You then see only the auth step under **`playwright`** and an error badge (e.g. **0/1**) in Testing, while **`tests/do-portal/**`** specs may be missing from the tree.

The main [`playwright.config.ts`](../playwright.config.ts) now **only adds `storageState` after the auth file exists**; until then the project still loads so tests appear in the explorer. Run **`authenticate DO portal`** once (or from the terminal: `npx playwright test --project=do-portal-auth-setup`), then **Refresh tests**.

### 4. Ortoni reporter and the IDE

If config evaluation fails on the **`ortoni-report`** reporter in the extension host, discovery can break. Workspace settings set **`PLAYWRIGHT_SKIP_ORTONI=1`** for VS Code so the config skips that reporter in the IDE. CLI / CI still load Ortoni unless you export that variable.


### 2. Documentation

This file and the README link explain behavior and recovery.

## Consequences (trade-offs)

| Topic | Effect |
|--------|--------|
| **First open / migration** | On first load, the extension may **copy** `playwright.workspaceSettings` into internal workspace state and **clear** the `playwright.workspaceSettings` key from `.vscode/settings.json`. You might see a **one-time git diff** on `settings.json`; you can **discard** that hunk to keep the template in git, or commit the removal—either is OK. New clones still get the block from git until they open the IDE once. |
| **Existing “bad” workspace state** | If your machine **already** stored “all projects disabled”, migration may **not** run again (workspace state already exists). Then: use the **manual steps** below once, or reset Playwright’s workspace data for this folder. |
| **Extension version** | Very old Playwright extensions may ignore `workspaceSettings`. **Update “Playwright Test for VSCode”** (`ms-playwright.playwright`) to a current release. |
| **Config vs. disk** | `all-tests` **ignores** `tests/do-portal/**`, so DO tests **never** appear under the `all-tests` project—only under **`do-portal-chromium`**. That is intentional. |
| **Run behavior** | Enabling more projects does **not** change how `npm run test:do` works from a plain terminal; it mainly fixes **IDE discovery and Run/Debug** from Testing. |

## Manual fix (always works)

1. Open **Testing** (beaker icon).
2. Open the **Playwright** section (gear / settings view in the Testing sidebar, or project list at the bottom).
3. **Enable** at least **`do-portal-chromium`** (and any other projects you use). Use **“select all projects”** if the UI offers it.
4. Click **Refresh tests** in the Testing toolbar.

## Verify from CLI

```bash
npx playwright test --list --project=do-portal-chromium
```

If tests appear here but not in the IDE, the issue is **IDE project selection**, not missing files.

## Optional: clear Playwright / test cache

Use the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run any **Playwright: … Clear … / Install …** commands your extension version exposes, then refresh tests.
