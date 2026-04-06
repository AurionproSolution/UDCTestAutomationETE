/**
 * CSV Helper - Utilities for reading and parsing CSV test data
 * Adopted from AllyPortal best practices
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CsvParseOptions {
  delimiter?: string;
  hasHeaders?: boolean;
  skipEmptyLines?: boolean;
}

/**
 * Parse CSV file and return array of objects
 * @param filePath - Path to CSV file
 * @param options - Parse options
 */
export function parseCsv<T = Record<string, string>>(
  filePath: string,
  options: CsvParseOptions = {}
): T[] {
  const { delimiter = ',', hasHeaders = true, skipEmptyLines = true } = options;

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const lines = content.split('\n').map((line) => line.trim());

  const filteredLines = skipEmptyLines ? lines.filter((line) => line.length > 0) : lines;

  if (filteredLines.length === 0) {
    return [];
  }

  if (hasHeaders) {
    const headers = filteredLines[0].split(delimiter).map((h) => h.trim());
    const dataLines = filteredLines.slice(1);

    return dataLines.map((line) => {
      const values = line.split(delimiter).map((v) => v.trim());
      const obj: Record<string, string> = {};

      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });

      return obj as T;
    });
  }

  return filteredLines.map((line) => {
    const values = line.split(delimiter).map((v) => v.trim());
    return values as unknown as T;
  });
}

/**
 * Read CSV and return specific columns
 * @param filePath - Path to CSV file
 * @param columns - Array of column names to extract
 */
export function getCsvColumns<T = Record<string, string>>(
  filePath: string,
  columns: string[]
): T[] {
  const allData = parseCsv(filePath);

  return allData.map((row) => {
    const filtered: Record<string, string> = {};
    columns.forEach((col) => {
      if (col in row) {
        filtered[col] = row[col];
      }
    });
    return filtered as T;
  });
}

/**
 * Get single row from CSV by index
 * @param filePath - Path to CSV file
 * @param index - Row index (0-based, excluding header)
 */
export function getCsvRow<T = Record<string, string>>(
  filePath: string,
  index: number
): T | undefined {
  const allData = parseCsv<T>(filePath);
  return allData[index];
}

/**
 * Filter CSV data by column value
 * @param filePath - Path to CSV file
 * @param columnName - Column to filter by
 * @param value - Value to match
 */
export function filterCsvByColumn<T = Record<string, string>>(
  filePath: string,
  columnName: string,
  value: string
): T[] {
  const allData = parseCsv(filePath);
  return allData.filter((row) => row[columnName] === value) as T[];
}




