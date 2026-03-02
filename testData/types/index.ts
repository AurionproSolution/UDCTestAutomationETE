/**
 * Test Data Types - TypeScript interfaces for type-safe test data
 * Adopted from AllyPortal best practices
 */

// ============ Common Types ============

export interface LoginCredentials {
  username: string;
  password: string;
  role?: string;
  email?: string;
}

export interface LoginTestData {
  validUsers: LoginCredentials[];
  invalidUsers: InvalidLoginData[];
}

export interface InvalidLoginData extends LoginCredentials {
  expectedError?: string;
}

// ============ User Types ============

export interface UserData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface CreateUserData extends Omit<UserData, 'id' | 'status'> {
  password: string;
  confirmPassword: string;
}

// ============ Search/Filter Types ============

export interface SearchData {
  searchText: string;
  expectedResult: string;
  filterBy?: string;
}

// ============ Environment Types ============

export interface EnvironmentData {
  name: string;
  baseUrl: string;
  apiUrl: string;
  credentials: LoginCredentials;
}

// ============ API Types ============

export interface ApiTestData {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload?: Record<string, unknown>;
  expectedStatus: number;
  expectedResponse?: Record<string, unknown>;
}

// ============ Table/Grid Types ============

export interface TableRowData {
  [columnName: string]: string | number | boolean;
}

export interface PaginationData {
  pageSize: number;
  pageNumber: number;
  totalItems: number;
}

// ============ Form Types ============

export interface FormFieldData {
  fieldName: string;
  value: string | number | boolean;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

// ============ Portal-Specific Types ============

// DO Portal Types
export interface DOPaymentData {
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
}

// RSS Portal Types
export interface RSSReportData {
  reportId: string;
  reportName: string;
  dateRange: {
    start: string;
    end: string;
  };
  format: 'pdf' | 'csv' | 'excel';
}

// CSS Portal Types
export interface CSSTicketData {
  ticketId?: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}




