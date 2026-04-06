import { test } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://testportaludc.aurionpro.com/login');
  await page.getByRole('button', { name: 'Login with FIS' }).click();
  await page.getByRole('searchbox', { name: 'Username' }).fill('swaliha.sanadi');
  await page.getByRole('textbox', { name: 'Proceed' }).click({
    modifiers: ['ControlOrMeta']
  });
  await page.getByRole('textbox', { name: 'Password' }).fill('Password@12345');
  await page.getByRole('textbox', { name: 'Password' }).click({
    modifiers: ['ControlOrMeta']
  });
  
  // await page.getByRole('textbox').nth(1).click();
  // await page.getByRole('textbox').nth(1).fill('5');
  // await page.getByRole('textbox').nth(2).fill('5');
  // await page.getByRole('textbox').nth(3).fill('4');
  // await page.getByRole('textbox').nth(4).fill('2');
  // await page.getByRole('textbox').nth(5).fill('8');
  // await page.locator('input[type="text"]').nth(5).fill('0');
  await page.getByRole('radio', { name: 'Yes, this is my computer or' }).check();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto('https://testportaludc.aurionpro.com/landing');
  await page.getByRole('link', { name: 'Quotes & Applications Quotes' }).click();
});