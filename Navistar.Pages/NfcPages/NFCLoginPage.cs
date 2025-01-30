using Navistar.Navistar.core;
using OpenQA.Selenium;
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
        private IWebElement Password => Find(By.XPath("//input[@type='password']"));
        private IWebElement LoginButton => Find(By.XPath("//span[@class='p-button-label ng-star-inserted']"));
        private IWebElement createQuickQuote => Find(By.XPath("//span[normalize-space()='+ Create Quick Quote']"));
        public void ClickOnCreateQuickQuote()
        {
            createQuickQuote.Click();
        }
        public void EnterUserName(string username)
        {
            Thread.Sleep(1000);
            UserName.SendKeys(username);
            ReportingManager.LogPass("Entered username successfully.");
        }

        public void EnterPassword(string password)
        {
            Thread.Sleep(1000);
            Password.SendKeys(password);
            ReportingManager.LogPass("Entered password successfully.");
        }
        public void ClickLoginButton()
        {
            WaitForPageToLoad(LoginButton,20);
            LoginButton.Click();
            ReportingManager.LogPass("Clicked on login button successfully.");
        }
    }
}
