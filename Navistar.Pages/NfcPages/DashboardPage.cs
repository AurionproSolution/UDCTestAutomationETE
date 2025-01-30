using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Navistar.Navistar.core;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using SeleniumExtras.WaitHelpers;

namespace Navistar.Navistar.Pages.NfcPages
{
    public class DashboardPage : BasePage
    {
        public DashboardPage(WebDriver driver) : base(driver)
        {
        }
        private IWebElement createQuickQuote => Find(By.XPath("//span[normalize-space()='+ Create Quick Quote']"));
        private IWebElement createStandardQuote => Find(By.XPath("//span[normalize-space()='+ Create Standard Quote']"));
        private IWebElement viewBtn => Find(By.XPath("//span[text()='View']"));
        private IWebElement resetBtn => Find(By.XPath("//span[text()='Reset']"));
        private IWebElement searchQuoteField => Find(By.XPath("//input[@placeholder='Search Quote']"));



        public void ClickOnCreateQuickQuote()
        {
            Thread.Sleep(15000);
            var loginButton = WaitForCondition(
               ExpectedConditions.ElementToBeClickable(createQuickQuote),
               15
           );
            loginButton.Click();
            ReportingManager.LogPass("User clicked the 'Create Quick Quote' button successfully.");
        }
        public void ClickOnCreateStandardQuote()
        {
            Thread.Sleep(15000);
            var loginButton = WaitForCondition(
               ExpectedConditions.ElementToBeClickable(createStandardQuote),
               15
           );
            WaitForPageToLoad(createStandardQuote,15);
            createStandardQuote.Click();
            ReportingManager.LogPass("User clicked the 'Create Standard Quote' button successfully");
        }
        public void ClickOnViewBtn()
        {
            viewBtn.Click();
        }
        public void ClickOnResetBtn()
        {
            resetBtn.Click();
        }
        public void SearchQuote(string value)
        {
            searchQuoteField.SendKeys(value);
        }
    }
}
