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
    public class MenuSlidebarPage : BasePage
    {
        public MenuSlidebarPage(WebDriver driver) : base(driver)
        {
        }
        private IWebElement dashboard => Find(By.XPath("//nav[@class='sidebar']//I[@class='fa-solid fa-wallet']"));

        public void ClickOnDashboard()
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
            var dashboardPoElement = wait.Until(ExpectedConditions.ElementExists(By.XPath("//nav[@class='sidebar']//I[@class='fa-solid fa-wallet']")));
            wait.Until(ExpectedConditions.ElementToBeClickable(dashboardPoElement));
            //IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            //js.ExecuteScript("arguments[0].click();", dashboardPoElement);
            HoverOverElement(dashboard);
            //dashboard.Click();
            ReportingManager.LogPass("Clicked on Dashboard from MenuSlidebar");
        }
    }
}
