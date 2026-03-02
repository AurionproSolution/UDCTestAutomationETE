/**
 * UDC Portal - Authentication Tests
 * Tests for FIS Login with manual OTP handling
 */

import { expect, test } from "@playwright/test";

test.describe("UDC Authentication Flows @do @smoke", () => {
  test("Manual Login and Quick Quote Creation", async ({ page }) => {
    // 1. Increase timeout to 2 minutes to allow for manual OTP entry
    test.setTimeout(120000);

    // 2. Navigate and start login
    await page.goto(
      "https://aurpr-ia.assetfinance.myfis.cloud/IAUDCPortal/authentication/login"
    );
    await page.getByRole("button", { name: "Login with FIS" }).click();

    // 3. Enter Credentials
    await page
      .getByRole("searchbox", { name: "Username" })
      .fill("deepak.paramanick");
    await page.getByRole("button", { name: "Proceed" }).click();
    await page
      .getByRole("textbox", { name: "Password" })
      .fill("SandBoxAPIfin@2211");

    // 4. Buffer for Manual OTP
    console.log(
      "⏳ Test paused: Please enter the OTP manually in the browser window..."
    );
    // This waits for 60 seconds for manual OTP entry
    await page.waitForTimeout(60000);

    // 5. Submit Login
    await page
      .getByRole("radio", { name: "Yes, this is my computer or" })
      .check();
    await page.getByRole("button", { name: "Sign in" }).click();

    // 6. Post-Login Actions (Create Quote)
    await page.waitForURL("**/IAUDCPortal/authentication");
    await page.getByRole("img").nth(1).click();
    await page.getByRole("button", { name: "+ Create Quick Quote" }).click();

    // 7. Form Selection
    await page
      .locator("#pn_id_252")
      .getByRole("button", { name: "dropdown trigger" })
      .click();
    await page.getByRole("option", { name: "CSA-B-Assigned" }).click();

    await page
      .locator("#pn_id_255")
      .getByRole("button", { name: "dropdown trigger" })
      .click();
    await page
      .getByRole("option", { name: "CSA Business - MV Dealer", exact: true })
      .click();

    await page
      .locator("#pn_id_258")
      .getByRole("button", { name: "dropdown trigger" })
      .click();
    await page.getByRole("option", { name: "1027153 -" }).click();

    // 8. Financial Calculations
    await page.getByRole("button", { name: "Calculate" }).click();

    // 9. Assertion: Verify that the calculation was successful
    await expect(page.getByText("Calculation Successful")).toBeVisible();
    
    console.log("✅ Quick Quote created successfully!");
  });
});

test.describe("UDC Login Page Validation @do @smoke", () => {
  test("should display login page with FIS login button", async ({ page }) => {
    await page.goto(
      "https://aurpr-ia.assetfinance.myfis.cloud/IAUDCPortal/authentication/login"
    );

    // Verify FIS Login button is visible
    const fisLoginButton = page.getByRole("button", { name: "Login with FIS" });
    await expect(fisLoginButton).toBeVisible();
  });

  test("should navigate to FIS authentication page", async ({ page }) => {
    await page.goto(
      "https://aurpr-ia.assetfinance.myfis.cloud/IAUDCPortal/authentication/login"
    );

    // Click FIS Login
    await page.getByRole("button", { name: "Login with FIS" }).click();

    // Verify username field is visible
    const usernameField = page.getByRole("searchbox", { name: "Username" });
    await expect(usernameField).toBeVisible();
  });
});




