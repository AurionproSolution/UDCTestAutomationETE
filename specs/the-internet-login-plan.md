# The Internet Login Page Test Plan

## Application Overview

Comprehensive test plan for the-internet.herokuapp.com login page covering authentication validation, UI/UX elements, and edge cases for a practice login application.

## Test Scenarios

### 1. Authentication Suite

**Seed:** `tests/seed.spec.ts`

#### 1.1. Valid Login with Correct Credentials

**File:** `tests/samples/loginTests/validLogin.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login page is displayed
    - expect: Username textbox is visible
    - expect: Password textbox is visible
  2. Enter valid username 'tomsmith'
    - expect: Username field contains 'tomsmith'
  3. Enter valid password 'SuperSecretPassword!'
    - expect: Password field is filled but masked
  4. Click the Login button
    - expect: User is redirected to the dashboard/home page
    - expect: Login success message is displayed

#### 1.2. Invalid Login with Wrong Password

**File:** `tests/samples/loginTests/invalidPassword.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login page is displayed
  2. Enter valid username 'tomsmith'
    - expect: Username field contains 'tomsmith'
  3. Enter incorrect password 'wrongpassword'
    - expect: Password field is filled
  4. Click the Login button
    - expect: Error message appears: 'Your password is invalid!'
    - expect: User remains on login page

#### 1.3. Invalid Login with Non-existent Username

**File:** `tests/samples/loginTests/invalidUsername.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login page is displayed
  2. Enter non-existent username 'invaliduser'
    - expect: Username field is filled
  3. Enter any password
    - expect: Password field is filled
  4. Click the Login button
    - expect: Error message appears: 'Your username is invalid!'
    - expect: User remains on login page

### 2. UI/UX Validation Suite

**Seed:** `tests/seed.spec.ts`

#### 2.1. Login Form Elements Visibility

**File:** `tests/samples/loginTests/formElementsVisibility.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login page title is visible
    - expect: Username textbox is displayed
    - expect: Password textbox is displayed
    - expect: Login button is displayed
  2. Verify all form elements are interactive
    - expect: All form fields are enabled and clickable

#### 2.2. Empty Fields Submission

**File:** `tests/samples/loginTests/emptyFieldsSubmission.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login page is displayed
  2. Click Login button without entering credentials
    - expect: Form validation error is shown or empty field handling occurs

#### 2.3. Password Field Masking

**File:** `tests/samples/loginTests/passwordMasking.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login page is displayed
  2. Enter text in the password field
    - expect: Text is masked/hidden as dots or asterisks
    - expect: Text is not visible in plain

### 3. Edge Cases Suite

**Seed:** `tests/seed.spec.ts`

#### 3.1. Special Characters in Credentials

**File:** `tests/samples/loginTests/specialCharacters.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login page is displayed
  2. Enter username with special characters '@!#$%'
    - expect: Special characters are accepted in username field
  3. Enter password with special characters
    - expect: Special characters are accepted in password field
  4. Click Login button
    - expect: Form submission handles special characters properly

#### 3.2. SQL Injection Prevention

**File:** `tests/samples/loginTests/sqlInjectionPrevention.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login page is displayed
  2. Enter SQL injection payload in username field
    - expect: Payload is treated as regular text
  3. Click Login button
    - expect: No SQL error is displayed
    - expect: Application handles input safely

#### 3.3. Case Sensitivity Check

**File:** `tests/samples/loginTests/caseSensitivity.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login page is displayed
  2. Enter username with different case: 'TomSmith'
    - expect: Username field accepts the input
  3. Enter correct password
    - expect: Password field is filled
  4. Click Login button
    - expect: System response indicates if login is case-sensitive or not
