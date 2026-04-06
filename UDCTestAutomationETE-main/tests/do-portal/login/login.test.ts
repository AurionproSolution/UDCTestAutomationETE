/**
 * DO Portal - Login Tests
 * E2E tests for DO Portal authentication
 */

import { expect, test } from "@playwright/test";
import { DODashboardPage, DOLoginPage } from "../../../pages";
import doLoginData from "../../../testData/do-portal/loginData.json";

test.describe("DO Portal - Login Module", () => {
  let loginPage: DOLoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new DOLoginPage(page);
  });

  test("should display login page with all elements @smoke @do", async ({
    page,
  }) => {
    await loginPage.navigate();

    // Verify login page elements
    await expect(loginPage.logo).toBeVisible();
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginWithFisButton).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
  });

  test("should login with valid credentials @smoke @do @regression", async ({
    page,
  }) => {
    const dashboardPage = new DODashboardPage(page);

    await loginPage.navigate();
    await loginPage.loginWithTestData(doLoginData.validUsers[0]);

    // Verify successful login
    const isLoaded = await dashboardPage.isDashboardLoaded();
    expect(isLoaded).toBe(true);
  });

  test("should show error for invalid credentials @regression @do", async ({
    page,
  }) => {
    await loginPage.navigate();
    await loginPage.login("invalidUser", "wrongPassword");

    // Verify error message
    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toBeTruthy();
  });

  test("should navigate to forgot password page @smoke @do", async ({
    page,
  }) => {
    await loginPage.navigateToForgotPassword();

    // Verify navigation to forgot password
    expect(page.url()).toContain("forgot");
  });

  test("should toggle remember me checkbox @do", async ({ page }) => {
    await loginPage.navigate();
    await loginPage.toggleRememberMe();

    // Verify checkbox is checked
    await expect(loginPage.rememberMeCheckbox).toBeChecked();
  });
});

// Data-Driven Tests
test.describe("DO Portal - Data-Driven Login Tests", () => {
  const invalidCredentials = [
    { username: "", password: "password", scenario: "empty username" },
    { username: "user", password: "", scenario: "empty password" },
    { username: "", password: "", scenario: "empty credentials" },
    {
      username: "invalid@user",
      password: "wrongPass",
      scenario: "invalid credentials",
    },
  ];

  for (const testCase of invalidCredentials) {
    test(`should fail login with ${testCase.scenario} @regression @do`, async ({
      page,
    }) => {
      const loginPage = new DOLoginPage(page);
      await loginPage.navigate();
      await loginPage.login(testCase.username, testCase.password);

      // Should show error or stay on login page
      expect(page.url()).toContain(loginPage.url);
    });
  }
});
