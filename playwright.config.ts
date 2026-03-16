/**
 * UDC Automation Tests - Playwright Configuration
 * Supports DO, RSS, and CSS portals with environment-based configuration
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from "@playwright/test";
import type { OrtoniReportConfig } from "ortoni-report";
import * as os from "os";

// Environment variable for selecting test environment
const TEST_ENV = process.env.TEST_ENV || "qat";

// Ortoni Report Configuration
const ortoniConfig: OrtoniReportConfig = {
  open: process.env.CI ? "never" : "on-failure",
  folderPath: "ortoni-report",
  filename: "index.html",
  title: "UDC Automation Tests Report",
  showProject: true,
  projectName: "UDC Automation",
  testType: "E2E-Functional",
  authorName: os.userInfo().username,
  base64Image: false,
  stdIO: false,
  meta: {
    "Test Environment": TEST_ENV.toUpperCase(),
    "Executed On": new Date().toLocaleString(),
    Platform: os.type(),
    "Node Version": process.version,
  },
} as OrtoniReportConfig;

// Shared config for maximized browser window
const maximizedChrome = {
  ...devices["Desktop Chrome"],
  viewport: null,
  deviceScaleFactor: undefined,
  launchOptions: {
    args: ["--start-maximized"],
  },
};

const maximizedFirefox = {
  ...devices["Desktop Firefox"],
  viewport: null,
  deviceScaleFactor: undefined,
  launchOptions: {
    args: ["-width", "1920", "-height", "1080"],
  },
};

const maximizedWebkit = {
  ...devices["Desktop Safari"],
  viewport: null,
  deviceScaleFactor: undefined,
};

export default defineConfig({
  // Test directory - contains all portal tests
  testDir: "./tests",

  // Test file pattern
  testMatch: "**/*.test.ts",

  // Run tests in parallel
  fullyParallel: true,

  // Fail build on CI if test.only is left in code
  forbidOnly: !!process.env.CI,

  // Retry failed tests
  retries: process.env.CI ? 2 : 0,

  // Worker configuration
  workers: process.env.CI ? 1 : undefined,

  // Output directory for test artifacts
  outputDir: "test-results",

  // Reporter configuration
  reporter: [
    ["list"],
    ["html", { outputFolder: "my-report", open: "never" }],
    ["ortoni-report", ortoniConfig],
  ],

  // Global settings for all projects
  use: {
    // Trace - captures actions, DOM snapshots, network logs
    trace: "on",

    // Screenshot after every test (pass or fail)
    screenshot: "on",

    // Video of every test (pass or fail)
    video: "on",

    // Default timeout for actions
    actionTimeout: 60000,

    // Default navigation timeout
    navigationTimeout: 30000,
  },

  // Timeout for each test
  timeout: 120000,

  // Expect timeout
  expect: {
    timeout: 60000,
  },

  // ============ Projects ============
  projects: [
    // ======== DEFAULT: All Tests (shows everything in UI) ========
    {
      name: "all-tests",
      testDir: "./tests",
      use: maximizedChrome,
    },

    // -------- DO Portal Projects --------
    {
      name: "do-portal-chromium",
      testDir: "./tests/do-portal",
      use: maximizedChrome,
    },
    {
      name: "do-portal-firefox",
      testDir: "./tests/do-portal",
      use: maximizedFirefox,
    },
    {
      name: "do-portal-webkit",
      testDir: "./tests/do-portal",
      use: maximizedWebkit,
    },

    // -------- RSS Portal Projects --------
    {
      name: "rss-portal-chromium",
      testDir: "./tests/rss-portal",
      use: maximizedChrome,
    },
    {
      name: "rss-portal-firefox",
      testDir: "./tests/rss-portal",
      use: maximizedFirefox,
    },

    // -------- CSS Portal Projects --------
    {
      name: "css-portal-chromium",
      testDir: "./tests/css-portal",
      use: maximizedChrome,
    },
    {
      name: "css-portal-firefox",
      testDir: "./tests/css-portal",
      use: maximizedFirefox,
    },

    // -------- Sample/Demo Tests --------
    {
      name: "samples",
      testDir: "./tests/samples",
      use: maximizedChrome,
    },

    // -------- Filtered by Tags --------
    {
      name: "all-portals-smoke",
      testDir: "./tests",
      grep: /@smoke/,
      use: maximizedChrome,
    },
    {
      name: "all-portals-regression",
      testDir: "./tests",
      grep: /@regression/,
      use: maximizedChrome,
    },

    // -------- Mobile Testing --------
    {
      name: "mobile-chrome",
      testDir: "./tests",
      grep: /@mobile/,
      use: {
        ...devices["Pixel 5"],
      },
    },
    {
      name: "mobile-safari",
      testDir: "./tests",
      grep: /@mobile/,
      use: {
        ...devices["iPhone 13"],
      },
    },
  ],
});
