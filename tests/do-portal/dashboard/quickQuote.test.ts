 import { test } from '@playwright/test';
 
 test('test', async ({ page }) => {
  await page.getByRole('button', { name: '+ Create Quick Quote' }).click();
  await page.locator('#pn_id_284').getByRole('button', { name: 'dropdown trigger' }).click();
  await page.getByText('CSA-B-Assigned').click();
  await page.getByRole('textbox', { name: 'Cash Price* Initial Lease' }).click();
  await page.locator('percentage').filter({ hasText: 'Deposit' }).locator('#percent').click();
  await page.locator('percentage').filter({ hasText: 'Deposit' }).locator('#percent').press('ArrowLeft');
  await page.locator('percentage').filter({ hasText: 'Interest Rate %' }).locator('#percent').click();
  await page.locator('#pn_id_325').getByRole('button', { name: 'dropdown trigger' }).click();
  await page.locator('#pn_id_325').getByRole('button', { name: 'dropdown trigger' }).click();
  await page.locator('#pn_id_307').getByRole('button', { name: 'dropdown trigger' }).click();
  await page.getByText('Frequency *').click();
  await page.locator('percentage').filter({ hasText: 'Balloon' }).locator('#percent').click();
  await page.locator('percentage').filter({ hasText: 'Balloon' }).locator('#percent').press('ArrowLeft');
  await page.locator('.p-checkbox-box').first().click();
  await page.getByRole('button', { name: 'Calculate' }).click();
  await page.getByRole('button', { name: 'Create Quote' }).click();
  });