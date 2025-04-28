using Navistar.Navistar.core;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using SeleniumExtras.WaitHelpers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Navistar.Navistar.Pages.NfcPages
{
    public class NFCLoginPage : BasePage
    {

        public NFCLoginPage(WebDriver driver) : base(driver) { }

        private IWebElement UserName => Find(By.XPath("//input[@type='text']"));
        private IWebElement nfcUserName => Find(By.XPath("//input[@aria-label='Username']"));
        private IWebElement Password => Find(By.XPath("//input[@type='password']"));
        private IWebElement nfcPassword => Find(By.XPath("//input[@aria-label='Password']"));
        private IWebElement LoginButton => Find(By.XPath("//span[@class='p-button-label ng-star-inserted']"));
        private IWebElement LoginWithNfcButton => Find(By.XPath("//span[text()='Login with NFC']"));
        private IWebElement proceedButton => Find(By.XPath("//span[text()='Proceed']"));
        private IWebElement signInButton => Find(By.XPath("//button[text()='Sign in']"));

        public void EnterUserName(string username)
        {
            Thread.Sleep(6000);
            WaitForPageToLoad(UserName);
            WaitTillTheElementIsLoaded(UserName);
            UserName.SendKeys("AURPR.RESTAPI.UA");
            ReportingManager.LogPass("Entered username successfully.");
        }
        public void EnterNfcUserName(string username)
        {
            Thread.Sleep(8000);
            WaitForPageToLoad(nfcUserName);
            WaitTillTheElementIsLoaded(nfcUserName);
            nfcUserName.SendKeys(username);
            ReportingManager.LogPass("Entered username successfully.");
        }

        public void EnterPassword(string password)
        {
            WaitTillTheElementIsLoaded(Password);
            Password.SendKeys("VKx%RJS4psMZ");
            ReportingManager.LogPass("Entered password successfully.");
        }
        public void EnterNfcPassword(string password)
        {
            Thread.Sleep(10000);
            WaitTillTheElementIsLoaded(nfcPassword);
            Password.SendKeys(password);
            ReportingManager.LogPass("Entered password successfully.");
        }
        public void ClickLoginButton()
        {
            WaitForPageToLoad(LoginButton, 20);
            LoginButton.Click();
            ReportingManager.LogPass("Clicked on login button successfully.");
        }
        public void ClickLoginWithNfcButton()
        {
            // Wait for spinner to disappear
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(15));
            wait.Until(drv =>
            {
                try
                {
                    return !drv.FindElement(By.CssSelector(".p-progressspinner")).Displayed;
                }
                catch (NoSuchElementException)
                {
                    return true; // Element is no longer in the DOM
                }
            });
            var LoginWithNfcButtonElement = wait.Until(ExpectedConditions.ElementExists(By.XPath("//span[text()='Login with NFC']")));
            wait.Until(ExpectedConditions.ElementToBeClickable(LoginWithNfcButtonElement));
            LoginWithNfcButton.Click();
            ReportingManager.LogPass("Clicked on login with NFC button successfully");
        }
        public void ClickOnProceedButton()
        {
            WebDriverWait waitForElement = new WebDriverWait(Driver, TimeSpan.FromSeconds(5000));
            var createStandardQuoteElement = waitForElement.Until(ExpectedConditions.ElementExists(By.XPath("//span[text()='Proceed']")));
            waitForElement.Until(ExpectedConditions.ElementToBeClickable(proceedButton));
            IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            js.ExecuteScript("arguments[0].click();", proceedButton);

            ReportingManager.LogPass("Clicked on login with NFC button successfully");
        }
        public void ClickonSignInButton()
        {
            WebDriverWait waitForElement = new WebDriverWait(Driver, TimeSpan.FromSeconds(5000));
            var createStandardQuoteElement = waitForElement.Until(ExpectedConditions.ElementExists(By.XPath("//button[text()='Sign in']")));
            waitForElement.Until(ExpectedConditions.ElementToBeClickable(signInButton));
            IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            js.ExecuteScript("arguments[0].click();", signInButton);
            //WaitForPageToLoad(signInButton, 20);
            //signInButton.Click();
            ReportingManager.LogPass("Clicked on sign In button successfully");
        }


    }
}
