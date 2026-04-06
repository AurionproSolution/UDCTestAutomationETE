import { test } from '@playwright/test';
import { LoginPage } from '../../pages/Samples/Loginpage';
 
test('test', async ({ page }) => {
 
    const login = new LoginPage(page)
    await login.gotoLoginPage();
    await login.login('tomsmith');
    await login.password('SuperSecretPassword');
    await login.loginbutton();
 
//   await page.goto('https://the-internet.herokuapp.com/login');
//   await page.getByRole('textbox', { name: 'Username' }).click();
//   await page.getByRole('textbox', { name: 'Username' }).fill('tomsmith');
//   await page.getByRole('textbox', { name: 'Password' }).click();
//   await page.getByRole('textbox', { name: 'Password' }).fill('SuperSecretPassword!');
//   await page.getByRole('button', { name: ' Login' }).click();
});