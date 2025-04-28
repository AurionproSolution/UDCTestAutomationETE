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
        private IWebElement dashboardElement => Find(By.XPath("//a/span[text()='Dashboard']"));
        private IWebElement DealerDropdown => Find(By.XPath("//span[text()='Dealer ']"));
        
        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");

        public void SelectDealer(string value)
        {
            Thread.Sleep(9000);
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(15));
            wait.Until(ExpectedConditions.InvisibilityOfElementLocated(By.CssSelector(".p-progressspinner")));
            
            WaitTillTheLoadSpinnerDisappears(10);
            //WaitTillTheLoadSpinnerDisappearsAndElementExist(By.XPath("//span[text()='Dealer ']"));
            SetImplicitWait(15);
            dropdown.SelectCustomDropdown(DealerDropdown, value, optionsLocator);
            ReportingManager.LogPass($"Selected dealer is {value}");
        }

        public void ClickOnCreateQuickQuote()
        {
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(15));
            wait.Until(drv =>
            {
                try
                {
                    return !drv.FindElement(By.CssSelector(".p-progressspinner")).Displayed;
                }
                catch (NoSuchElementException)
                {
                    return true;
                }
            });
            var createQuickQuoteElement = wait.Until(ExpectedConditions.ElementExists(By.XPath("//span[normalize-space()='+ Create Quick Quote']")));
            wait.Until(ExpectedConditions.ElementToBeClickable(createQuickQuoteElement));
            IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            js.ExecuteScript("arguments[0].click();", createQuickQuoteElement);
            ReportingManager.LogPass("User clicked the 'Create Quick Quote' button successfully.");
        }
        public void ClickOnCreateStandardQuote()
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
            var createStandardQuoteElement = wait.Until(ExpectedConditions.ElementExists(By.XPath("//span[normalize-space()='+ Create Standard Quote']")));
            wait.Until(ExpectedConditions.ElementToBeClickable(createStandardQuoteElement));
            IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            js.ExecuteScript("arguments[0].click();", createStandardQuoteElement);
            ReportingManager.LogPass("User clicked the 'Create Standard Quote' button successfully");
        }
        public void VerifyDashboardPage()
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
            var dashboardPoElement = wait.Until(ExpectedConditions.ElementExists(By.XPath("//a/span[text()='Dashboard']")));
            wait.Until(ExpectedConditions.ElementToBeClickable(dashboardPoElement));
            //IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            //js.ExecuteScript("arguments[0].click();", dashboardPoElement);
            assertions.AssertElementIsVisible(dashboardElement);
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
