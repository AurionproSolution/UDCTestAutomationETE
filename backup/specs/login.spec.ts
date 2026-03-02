import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages';
import { testData } from '../testData/users.json';

/**
 * Login Test Suite
 * Demonstrates test structure with Page Object Model
 */
test.describe('Login Functionality', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    // Note: Update baseURL in playwright.config.ts or use full URL
    // await loginPage.goto();
  });

  test('should display login page elements', async ({ page }) => {
    // This is a sample test - update with your actual application URL
    await page.goto('https://example.com/login');
    
    // Example assertions - customize based on your application
    await expect(page).toHaveTitle(/Login/i);
  });

  test('should login with valid credentials', async ({ page }) => {
    // Sample test demonstrating POM usage
    await page.goto('https://example.com/login');
    
    // Using Page Object methods
    // await loginPage.login('validUser', 'validPassword');
    // await expect(page).toHaveURL(/dashboard/);
    
    // Placeholder assertion
    expect(true).toBe(true);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Sample test for negative scenario
    await page.goto('https://example.com/login');
    
    // Using Page Object methods
    // await loginPage.login('invalidUser', 'wrongPassword');
    // const errorMessage = await loginPage.getErrorMessage();
    // expect(errorMessage).toContain('Invalid credentials');
    
    // Placeholder assertion
    expect(true).toBe(true);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    // Sample test for navigation
    await page.goto('https://example.com/login');
    
    // Using Page Object methods
    // await loginPage.clickForgotPassword();
    // await expect(page).toHaveURL(/forgot-password/);
    
    // Placeholder assertion
    expect(true).toBe(true);
  });
});

/**
 * Data-Driven Login Tests
 * Demonstrates parameterized testing
 */
test.describe('Data-Driven Login Tests', () => {
  const loginTestCases = [
    { username: 'user1', password: 'pass1', shouldPass: true, description: 'valid user 1' },
    { username: 'user2', password: 'pass2', shouldPass: true, description: 'valid user 2' },
    { username: 'invalid', password: 'wrong', shouldPass: false, description: 'invalid user' },
  ];

  for (const testCase of loginTestCases) {
    test(`Login test - ${testCase.description}`, async ({ page }) => {
      // Sample data-driven test structure
      // const loginPage = new LoginPage(page);
      // await loginPage.goto();
      // await loginPage.login(testCase.username, testCase.password);
      
      // if (testCase.shouldPass) {
      //   await expect(page).toHaveURL(/dashboard/);
      // } else {
      //   await expect(loginPage.errorMessage).toBeVisible();
      // }
      
      // Placeholder
      expect(testCase).toBeDefined();
    });
  }
});

