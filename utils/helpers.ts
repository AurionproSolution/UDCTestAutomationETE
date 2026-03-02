import { Page } from '@playwright/test';

/**
 * Utility Helper Functions
 * Common helper methods for test automation
 */

/**
 * Generate a random string
 * @param length - Length of the string
 * @returns Random alphanumeric string
 */
export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Generate a random email address
 * @param domain - Email domain (default: test.com)
 * @returns Random email address
 */
export function generateRandomEmail(domain: string = 'test.com'): string {
  const randomPart = generateRandomString(10).toLowerCase();
  return `user_${randomPart}@${domain}`;
}

/**
 * Wait for a specific amount of time
 * @param ms - Milliseconds to wait
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format date to YYYY-MM-DD
 * @param date - Date object
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get current timestamp
 * @returns Current timestamp in milliseconds
 */
export function getTimestamp(): number {
  return Date.now();
}

/**
 * Parse JSON file
 * @param filePath - Path to JSON file
 * @returns Parsed JSON object
 */
export async function parseJsonFile<T>(filePath: string): Promise<T> {
  const fs = await import('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Scroll to bottom of page
 * @param page - Playwright page object
 */
export async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
}

/**
 * Scroll to element
 * @param page - Playwright page object
 * @param selector - Element selector
 */
export async function scrollToElement(page: Page, selector: string): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Clear all cookies
 * @param page - Playwright page object
 */
export async function clearCookies(page: Page): Promise<void> {
  await page.context().clearCookies();
}

/**
 * Get all cookies
 * @param page - Playwright page object
 * @returns Array of cookies
 */
export async function getCookies(page: Page) {
  return await page.context().cookies();
}





