import { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * API Helper Functions
 * Common methods for API testing with Playwright
 */

/**
 * Response interface for API calls
 */
export interface ApiResponse<T = unknown> {
  status: number;
  statusText: string;
  data: T;
  headers: { [key: string]: string };
}

/**
 * Make a GET request
 * @param request - Playwright API request context
 * @param url - Request URL
 * @param headers - Optional headers
 */
export async function get<T>(
  request: APIRequestContext,
  url: string,
  headers?: { [key: string]: string }
): Promise<ApiResponse<T>> {
  const response = await request.get(url, { headers });
  return parseResponse<T>(response);
}

/**
 * Make a POST request
 * @param request - Playwright API request context
 * @param url - Request URL
 * @param data - Request body
 * @param headers - Optional headers
 */
export async function post<T>(
  request: APIRequestContext,
  url: string,
  data: unknown,
  headers?: { [key: string]: string }
): Promise<ApiResponse<T>> {
  const response = await request.post(url, {
    data,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  return parseResponse<T>(response);
}

/**
 * Make a PUT request
 * @param request - Playwright API request context
 * @param url - Request URL
 * @param data - Request body
 * @param headers - Optional headers
 */
export async function put<T>(
  request: APIRequestContext,
  url: string,
  data: unknown,
  headers?: { [key: string]: string }
): Promise<ApiResponse<T>> {
  const response = await request.put(url, {
    data,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  return parseResponse<T>(response);
}

/**
 * Make a DELETE request
 * @param request - Playwright API request context
 * @param url - Request URL
 * @param headers - Optional headers
 */
export async function del<T>(
  request: APIRequestContext,
  url: string,
  headers?: { [key: string]: string }
): Promise<ApiResponse<T>> {
  const response = await request.delete(url, { headers });
  return parseResponse<T>(response);
}

/**
 * Parse API response
 * @param response - Playwright API response
 */
async function parseResponse<T>(response: APIResponse): Promise<ApiResponse<T>> {
  let data: T;
  
  try {
    data = await response.json();
  } catch {
    data = (await response.text()) as unknown as T;
  }

  const headers: { [key: string]: string } = {};
  response.headers();
  
  return {
    status: response.status(),
    statusText: response.statusText(),
    data,
    headers,
  };
}

/**
 * Validate response status
 * @param response - API response
 * @param expectedStatus - Expected status code
 */
export function validateStatus(response: ApiResponse, expectedStatus: number): boolean {
  return response.status === expectedStatus;
}

