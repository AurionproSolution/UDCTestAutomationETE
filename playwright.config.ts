/**
 * UDC Automation Tests - Playwright Configuration
 * Supports DO, RSS, and CSS portals with environment-based configuration
 *
 * DO portal: shared session via playwright/do-portal-auth.setup.ts → playwright/.auth/do-portal.json
 * Chromium only; headed mode everywhere (CI uses Xvfb — see .github/workflows/playwright.yml).
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";
import type { OrtoniReportConfig } from "ortoni-report";
import * as os from "os";
import path from "path";
import { getDoPortalAuthFile } from "./playwright/do-portal-auth.helper";

/** VS Code / Cursor Test Explorer: one project is always enabled (see docs/test-explorer.md). */
const ideMode = process.env.PLAYWRIGHT_IDE === "1";

/** Admin perf script against a different host; uses empty storageState in spec file. */
const ignoreDoPerfInPortalOnly = "**/udc-perf-test-data.test.ts";

// Environment variable for selecting test environment
const TEST_ENV = process.env.TEST_ENV || "qat";

// Ortoni Report Configuration — unique folder per process avoids Windows EPERM when
// ortoni-report tries to rmSync locked videos under a previous run's ortoni-data.
const ortoniReportFolder =
  process.env.ORTONI_REPORT_FOLDER ||
  path.join("ortoni-report", `run-${Date.now()}-${process.pid}`);

// Ortoni Report Configuration
const ortoniConfig: OrtoniReportConfig = {
  open: process.env.CI ? "never" : "on-failure",
  folderPath: ortoniReportFolder,
  filename: "index.html",
  title: "UDC Automation Tests Report",
  showProject: true,
  projectName: "UDC Automation",
  testType: "E2E-Functional",
  authorName: os.userInfo().username,
  base64Image: false,
  stdIO: true,
  console: true,
  meta: {
    "Test Environment": TEST_ENV.toUpperCase(),
    "Executed On": new Date().toLocaleString(),
    Platform: os.type(),
    "Node Version": process.version,
  },
} as OrtoniReportConfig;

// Shared config for maximized browser window (Chromium only)
const maximizedChrome = {
  ...devices["Desktop Chrome"],
  viewport: null,
  deviceScaleFactor: undefined,
  launchOptions: {
    args: ["--start-maximized"],
  },
};

/**
 * OTP during do-portal-auth.setup cannot run unattended on GitHub-hosted runners.
 * - Local / non-CI: always use global DO storage (single login per run).
 * - CI: set PLAYWRIGHT_USE_DO_GLOBAL_AUTH=1 when you have unattended storage or a self-hosted runner.
 */
const useGlobalDoAuth =
  !process.env.CI || process.env.PLAYWRIGHT_USE_DO_GLOBAL_AUTH === "1";

/**
 * Only attach storageState after do-portal-auth.setup has created the file.
 * A path to a missing file can break project registration (e.g. VS Code Test Explorer lists no DO tests).
 */
function doPortalResolvedUse(): typeof maximizedChrome & {
  storageState?: string;
} {
  if (!useGlobalDoAuth) return maximizedChrome;
  const authFile = getDoPortalAuthFile();
  if (fs.existsSync(authFile)) {
    return { ...maximizedChrome, storageState: authFile };
  }
  return maximizedChrome;
}

const doPortalAuthSetupProject = {
  name: "do-portal-auth-setup",
  testDir: "./playwright",
  testMatch: "**/do-portal-auth.setup.ts",
  use: maximizedChrome,
};

const doPortalChromiumProject = {
  name: "do-portal-chromium",
  testDir: "./tests/do-portal",
  testIgnore: [ignoreDoPerfInPortalOnly, "**/do-portal-session.helper.test.ts"],
  ...(useGlobalDoAuth
    ? { dependencies: ["do-portal-auth-setup"] as const, use: doPortalResolvedUse() }
    : { use: maximizedChrome }),
};

const tagPortalTestIgnore = [
  "**/udc-perf-test-data.test.ts",
  ...(useGlobalDoAuth ? [] : ["**/do-portal/**"]),
];

/** Flat tree for IDE: all portals under tests/, DO auth via globalSetup (no setup project in explorer). */
const ideChromiumProject = {
  name: "udc-chromium",
  testDir: "./tests",
  testIgnore: [
    "**/udc-perf-test-data.test.ts",
    ...(!useGlobalDoAuth ? ["**/do-portal/**"] : []),
  ],
  use: useGlobalDoAuth ? doPortalResolvedUse() : maximizedChrome,
};

const ciProjects = [
  ...(useGlobalDoAuth ? [doPortalAuthSetupProject] : []),

  doPortalChromiumProject,

  /** Perf / bulk admin script: not DO-dealer; no shared DO storageState. */
  {
    name: "do-portal-perf-data",
    testDir: "./tests/do-portal",
    testMatch: "**/udc-perf-test-data.test.ts",
    use: maximizedChrome,
  },

  {
    name: "all-tests",
    testDir: "./tests",
    testIgnore: ["**/do-portal/**"],
    use: maximizedChrome,
  },

  {
    name: "rss-portal-chromium",
    testDir: "./tests/rss-portal",
    use: maximizedChrome,
  },

  {
    name: "css-portal-chromium",
    testDir: "./tests/css-portal",
    use: maximizedChrome,
  },

  {
    name: "samples",
    testDir: "./tests/samples",
    use: maximizedChrome,
  },

  {
    name: "do-portal-unit",
    testDir: "./tests/do-portal",
    testMatch: "**/do-portal-session.helper.test.ts",
    use: maximizedChrome,
  },

  {
    name: "all-portals-smoke",
    testDir: "./tests",
    grep: /@smoke/,
    testIgnore: tagPortalTestIgnore,
    ...(useGlobalDoAuth
      ? { dependencies: ["do-portal-auth-setup"] as const, use: doPortalResolvedUse() }
      : { use: maximizedChrome }),
  },
  {
    name: "all-portals-regression",
    testDir: "./tests",
    grep: /@regression/,
    testIgnore: tagPortalTestIgnore,
    ...(useGlobalDoAuth
      ? { dependencies: ["do-portal-auth-setup"] as const, use: doPortalResolvedUse() }
      : { use: maximizedChrome }),
  },
];

export default defineConfig({
  testDir: "./tests",

  testMatch: [
    "**/*.test.ts",
    "**/do-portal/jira/quickQuotejira.ts",
    "**/do-portal/doSanityTest/jira tickets/quickQuoteissue.ts",
  ],

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  outputDir: "test-results",

  reporter: [
    ["list"],
    ["html", { outputFolder: "my-report", open: "never" }],
    ["./playwright/step-failure-reporter.ts"],
    ...(process.env.PLAYWRIGHT_SKIP_ORTONI === "1"
      ? []
      : ([["ortoni-report", ortoniConfig]] as const)),
    ["./playwright/report-backup-reporter.ts"],
  ],

  use: {
    headless: false,
    trace: process.env.CI ? "on-first-retry" : "on",
    screenshot: process.env.CI ? "only-on-failure" : "on",
    video: process.env.CI ? "retain-on-failure" : "on",
    actionTimeout: 180000,
    navigationTimeout: 180000,
  },

  timeout: 180000,

  expect: {
    timeout: 180000,
  },

  globalSetup:
    ideMode && useGlobalDoAuth
      ? path.join(__dirname, "playwright", "do-portal-global-setup.ts")
      : undefined,

  projects: ideMode ? [ideChromiumProject] : ciProjects,
});
