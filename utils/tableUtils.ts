/**
 * Table Utilities - Common table operations for UI testing
 * Adopted from AllyPortal best practices
 */

import { Page, Locator, expect } from '@playwright/test';

export class TableUtils {
  readonly page: Page;
  readonly tableLocator: Locator;

  constructor(page: Page, tableSelector: string = 'table') {
    this.page = page;
    this.tableLocator = page.locator(tableSelector);
  }

  /**
   * Get all table headers
   */
  async getHeaders(): Promise<string[]> {
    const headers = this.tableLocator.locator('thead th, thead td');
    return await headers.allTextContents();
  }

  /**
   * Get row count (excluding header)
   */
  async getRowCount(): Promise<number> {
    const rows = this.tableLocator.locator('tbody tr');
    return await rows.count();
  }

  /**
   * Get cell value by row and column index
   * @param rowIndex - Row index (0-based)
   * @param colIndex - Column index (0-based)
   */
  async getCellValue(rowIndex: number, colIndex: number): Promise<string> {
    const cell = this.tableLocator.locator(`tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${colIndex + 1})`);
    return (await cell.textContent())?.trim() || '';
  }

  /**
   * Get entire row data as array
   * @param rowIndex - Row index (0-based)
   */
  async getRowData(rowIndex: number): Promise<string[]> {
    const cells = this.tableLocator.locator(`tbody tr:nth-child(${rowIndex + 1}) td`);
    const texts = await cells.allTextContents();
    return texts.map((t) => t.trim());
  }

  /**
   * Get entire column data as array
   * @param colIndex - Column index (0-based)
   */
  async getColumnData(colIndex: number): Promise<string[]> {
    const cells = this.tableLocator.locator(`tbody tr td:nth-child(${colIndex + 1})`);
    const texts = await cells.allTextContents();
    return texts.map((t) => t.trim());
  }

  /**
   * Find row by cell value
   * @param columnIndex - Column to search in
   * @param value - Value to find
   */
  async findRowByValue(columnIndex: number, value: string): Promise<number> {
    const columnData = await this.getColumnData(columnIndex);
    return columnData.findIndex((cell) => cell === value);
  }

  /**
   * Click on a cell
   * @param rowIndex - Row index (0-based)
   * @param colIndex - Column index (0-based)
   */
  async clickCell(rowIndex: number, colIndex: number): Promise<void> {
    const cell = this.tableLocator.locator(`tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${colIndex + 1})`);
    await cell.click();
  }

  /**
   * Verify table is sorted ascending by column
   * @param colIndex - Column index to verify
   */
  async verifySortedAscending(colIndex: number): Promise<boolean> {
    const data = await this.getColumnData(colIndex);
    const sorted = [...data].sort((a, b) => a.localeCompare(b));
    return JSON.stringify(data) === JSON.stringify(sorted);
  }

  /**
   * Verify table is sorted descending by column
   * @param colIndex - Column index to verify
   */
  async verifySortedDescending(colIndex: number): Promise<boolean> {
    const data = await this.getColumnData(colIndex);
    const sorted = [...data].sort((a, b) => b.localeCompare(a));
    return JSON.stringify(data) === JSON.stringify(sorted);
  }

  /**
   * Search for text in entire table
   * @param searchText - Text to search for
   */
  async searchInTable(searchText: string): Promise<{ row: number; col: number } | null> {
    const rowCount = await this.getRowCount();
    const headers = await this.getHeaders();

    for (let row = 0; row < rowCount; row++) {
      const rowData = await this.getRowData(row);
      const colIndex = rowData.findIndex((cell) => cell.includes(searchText));
      if (colIndex !== -1) {
        return { row, col: colIndex };
      }
    }
    return null;
  }

  /**
   * Wait for table to have minimum rows
   * @param minRows - Minimum number of rows expected
   * @param timeout - Timeout in milliseconds
   */
  async waitForRows(minRows: number, timeout: number = 30000): Promise<void> {
    await expect(this.tableLocator.locator('tbody tr').first()).toBeVisible({ timeout });
    await expect(async () => {
      const count = await this.getRowCount();
      expect(count).toBeGreaterThanOrEqual(minRows);
    }).toPass({ timeout });
  }
}




