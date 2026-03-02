import { Page } from '@playwright/test';
import { LoginPage } from '../pages';

/**
 * Login Test Logic
 * Core test logic separated from spec files
 * This allows reusability across different test scenarios
 */

export interface LoginTestResult {
  success: boolean;
  message: string;
  currentUrl?: string;
}

/**
 * Test valid login flow
 * @param page - Playwright page object
 * @param username - Username to test
 * @param password - Password to test
 */
export async function testValidLogin(
  page: Page,
  username: string,
  password: string
): Promise<LoginTestResult> {
  const loginPage = new LoginPage(page);
  
  try {
    await loginPage.goto();
    await loginPage.login(username, password);
    await loginPage.waitForPageLoad();
    
    const currentUrl = loginPage.getCurrentUrl();
    const isLoggedIn = currentUrl.includes('dashboard') || currentUrl.includes('home');
    
    return {
      success: isLoggedIn,
      message: isLoggedIn ? 'Login successful' : 'Login failed - not redirected to expected page',
      currentUrl,
    };
  } catch (error) {
    return {
      success: false,
      message: `Login test failed with error: ${(error as Error).message}`,
    };
  }
}

/**
 * Test invalid login flow
 * @param page - Playwright page object
 * @param username - Invalid username
 * @param password - Invalid password
 * @param expectedError - Expected error message
 */
export async function testInvalidLogin(
  page: Page,
  username: string,
  password: string,
  expectedError: string
): Promise<LoginTestResult> {
  const loginPage = new LoginPage(page);
  
  try {
    await loginPage.goto();
    await loginPage.login(username, password);
    
    const isErrorVisible = await loginPage.isErrorMessageVisible();
    
    if (!isErrorVisible) {
      return {
        success: false,
        message: 'Expected error message was not displayed',
      };
    }
    
    const errorMessage = await loginPage.getErrorMessage();
    const hasExpectedError = errorMessage.includes(expectedError);
    
    return {
      success: hasExpectedError,
      message: hasExpectedError
        ? 'Invalid login correctly showed error'
        : `Error message mismatch. Expected: "${expectedError}", Got: "${errorMessage}"`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Invalid login test failed with error: ${(error as Error).message}`,
    };
  }
}

/**
 * Test login page elements are present
 * @param page - Playwright page object
 */
export async function testLoginPageElements(page: Page): Promise<LoginTestResult> {
  const loginPage = new LoginPage(page);
  
  try {
    await loginPage.goto();
    
    const elements = [
      { name: 'Username input', visible: await loginPage.isElementVisible(loginPage.usernameInput) },
      { name: 'Password input', visible: await loginPage.isElementVisible(loginPage.passwordInput) },
      { name: 'Login button', visible: await loginPage.isElementVisible(loginPage.loginButton) },
    ];
    
    const missingElements = elements.filter(el => !el.visible);
    
    if (missingElements.length > 0) {
      return {
        success: false,
        message: `Missing elements: ${missingElements.map(el => el.name).join(', ')}`,
      };
    }
    
    return {
      success: true,
      message: 'All login page elements are present',
    };
  } catch (error) {
    return {
      success: false,
      message: `Login page elements test failed: ${(error as Error).message}`,
    };
  }
}

