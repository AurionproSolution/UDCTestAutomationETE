/**
 * CommonUtils - Visual highlighting and common interactions
 * Adopted from AllyPortal best practices for debug-friendly automation
 */

import { Page, Locator } from '@playwright/test';

export class CommonUtils {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Highlight element with visual indicator for debugging
   * Shows a red glow around the element before interaction
   */
  private async highlight(locator: Locator): Promise<void> {
    try {
      const attached = await locator.isVisible({ timeout: 3000 }).catch(() => false);
      if (!attached) return;

      const handle = await locator.elementHandle();
      if (!handle) return;

      await this.page.evaluate((el) => {
        const orig = el.getAttribute('style') || '';
        el.style.transition = 'box-shadow 0.95s ease';
        el.style.boxShadow = '0 0 15px 5px rgba(231, 12, 23, 0.9)';

        setTimeout(() => {
          el.style.boxShadow = 'none';
          el.setAttribute('style', orig);
        }, 1000);
      }, handle);
    } catch (err) {
      console.warn('⚠ highlight skipped: page/locator was not ready');
    }
  }

  /**
   * Click with visual highlighting
   */
  async click(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this.highlight(locator);
    await locator.click({ timeout: 15000 });
  }

  /**
   * Fill input with visual highlighting
   */
  async fill(locator: Locator, text: string): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this.highlight(locator);
    await locator.clear();
    await locator.fill(text);
  }

  /**
   * Type text with visual highlighting (character by character)
   */
  async type(locator: Locator, text: string): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this.highlight(locator);
    await locator.pressSequentially(text);
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ state: 'visible', ...(timeout && { timeout }) });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ state: 'hidden', ...(timeout && { timeout }) });
  }

  /**
   * Get text content of element
   */
  async getText(locator: Locator): Promise<string> {
    const text = await locator.textContent().catch(() => '');
    return text ?? '';
  }

  /**
   * Get input value
   */
  async getValue(locator: Locator): Promise<string> {
    return await locator.inputValue();
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  /**
   * Check if element is enabled
   */
  async isEnabled(locator: Locator): Promise<boolean> {
    return await locator.isEnabled();
  }

  /**
   * Select dropdown option by value
   */
  async selectByValue(locator: Locator, value: string): Promise<void> {
    await this.highlight(locator);
    await locator.selectOption({ value });
  }

  /**
   * Select dropdown option by label
   */
  async selectByLabel(locator: Locator, label: string): Promise<void> {
    await this.highlight(locator);
    await locator.selectOption({ label });
  }

  /**
   * Hover over element
   */
  async hover(locator: Locator): Promise<void> {
    await this.highlight(locator);
    await locator.hover();
  }

  /**
   * Double click element
   */
  async doubleClick(locator: Locator): Promise<void> {
    await this.highlight(locator);
    await locator.dblclick();
  }

  /**
   * Right click element
   */
  async rightClick(locator: Locator): Promise<void> {
    await this.highlight(locator);
    await locator.click({ button: 'right' });
  }

  /**
   * Press keyboard key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Scroll to element
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Take screenshot with custom name
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }
}




