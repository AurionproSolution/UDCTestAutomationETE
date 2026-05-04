import { test } from '@playwright/test';
import { DOLoginPage, DODashboardPage } from '../../../pages';
import doLoginData from '../../../testData/do-portal/loginData.json';

test.describe('DO Portal - Quick Quote', () => {
  let loginPage: DOLoginPage;
  let dashboardPage: DODashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new DOLoginPage(page);
    dashboardPage = new DODashboardPage(page);

    // Login before each test so we are on the dashboard
    await loginPage.navigate();
    await loginPage.loginWithTestData(doLoginData.validUsers[0]);
    await dashboardPage.isDashboardLoaded();
    
    // Added a wait here to ensure the dashboard is fully rendered before clicking
    await page.waitForTimeout(3000); 
  });

  test('test quick quote creation (original recorded steps)', async ({ page }) => {
    // Restoring the original recorded code that you had earlier
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
});
