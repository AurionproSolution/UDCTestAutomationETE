/**
 * Test Data - Index
 * Export all test data types and helpers
 */

// Export TypeScript types
export * from './types';

// Helper function to load portal-specific test data
import * as fs from 'fs';
import * as path from 'path';

type Portal = 'do-portal' | 'rss-portal' | 'css-portal' | 'shared';

/**
 * Load JSON test data for a specific portal
 * @param portal - Portal name
 * @param fileName - JSON file name (without extension)
 */
export function loadTestData<T>(portal: Portal, fileName: string): T {
  const filePath = path.join(__dirname, portal, `${fileName}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Load login data for a portal
 * @param portal - Portal name
 */
export function loadLoginData(portal: Portal) {
  return loadTestData(portal, 'loginData');
}




