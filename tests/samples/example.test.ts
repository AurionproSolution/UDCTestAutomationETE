/**
 * Example Test Suite
 * Basic Playwright tests to verify framework setup
 * These tests use the Playwright website as a sample target
 */

import { test, expect } from "@playwright/test";

test.describe("Framework Verification Tests @sample @smoke", () => {
  test("should navigate to Playwright homepage", async ({ page }) => {
    await page.goto("https://playwright.dev/");

    // Verify page title
    await expect(page).toHaveTitle(/Playwright/);
  });

  test("should have Get Started link", async ({ page }) => {
    await page.goto("https://playwright.dev/");

    // Verify Get Started link is visible
    const getStartedLink = page.getByRole("link", { name: "Get started" });
    await expect(getStartedLink).toBeVisible();
  });

  test("should navigate to docs page", async ({ page }) => {
    await page.goto("https://playwright.dev/");

    // Click the get started link
    await page.getByRole("link", { name: "Get started" }).click();

    // Expects page to have a heading with the name of Installation
    await expect(
      page.getByRole("heading", { name: "Installation" })
    ).toBeVisible();
  });
});

test.describe("Data-Driven Sample Tests @sample", () => {
  const testCases = [
    { url: "https://playwright.dev/", expectedTitle: /Playwright/ },
    { url: "https://github.com/", expectedTitle: /GitHub/ },
  ];

  for (const testCase of testCases) {
    test(`should load ${testCase.url} with correct title`, async ({ page }) => {
      await page.goto(testCase.url);
      await expect(page).toHaveTitle(testCase.expectedTitle);
    });
  }
});




