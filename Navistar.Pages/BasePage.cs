using Navistar.Navistar.core;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using SeleniumExtras.WaitHelpers;
using System.Threading.Tasks;

namespace Navistar.Navistar.Pages
{
    public abstract class BasePage
    {
        protected WebDriver Driver;
        protected AssertionsHelper assertions;
        protected DropdownHelper dropdown;

        protected BasePage(WebDriver driver)
        {
            Driver = driver;
            dropdown = new DropdownHelper(driver);
        }
        /// <summary>
        /// Sets the implicit wait for the WebDriver session.
        /// </summary>
        /// <param name="seconds">Duration in seconds for the implicit wait.</param>
        public void SetImplicitWait(int seconds)
        {
            Driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(seconds);
        }
        /// <summary>
        /// Performs an explicit wait on a specified condition.
        /// </summary>
        /// <typeparam name="T">The expected condition's return type (e.g., IWebElement).</typeparam>
        /// <param name="condition">The condition to wait for (e.g., visibility, clickability).</param>
        /// <param name="timeoutSeconds">Maximum time to wait in seconds.</param>
        /// <returns>The object returned by the condition, e.g., an IWebElement.</returns>
        public T WaitForCondition<T>(Func<IWebDriver, T> condition, int timeoutSeconds)
        {
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(timeoutSeconds));
            return wait.Until(condition);
        }
        // Method to wait for an element to be visible
        public IWebElement WaitForElementToBeVisible(By locator, int timeoutInSeconds)
        {
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(timeoutInSeconds));
            return wait.Until(ExpectedConditions.ElementIsVisible(locator));
        }

        // Method to wait for an element to be clickable
        public IWebElement WaitForElementToBeClickable(By locator, int timeoutInSeconds)
        {
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(timeoutInSeconds));
            return wait.Until(ExpectedConditions.ElementToBeClickable(locator));
        }
        public void WaitForPageToLoad(IWebElement element, int timeoutInSeconds = 10)
        {
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(timeoutInSeconds));

            // Wait for JavaScript page load to complete
            wait.Until(driver => ((IJavaScriptExecutor)driver).ExecuteScript("return document.readyState").Equals("complete"));

            // Wait for the element to be visible and interactable
            wait.Until(driver => element.Displayed);
        }
        public void ScrollAndClickElement(IWebElement element)
        {
            try
            {
                IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
                js.ExecuteScript("arguments[0].scrollIntoView(true);", element);
                Thread.Sleep(500); // Allow time for scrolling effect
                element.Click();
            }
            catch (ElementClickInterceptedException)
            {
                Console.WriteLine("Element click intercepted. Retrying with JavaScript click.");
                ClickElementUsingJavaScript(element);
            }
        }

        /// <summary>
        /// Clicks an element using JavaScript when normal click fails.
        /// </summary>
        private void ClickElementUsingJavaScript(IWebElement element)
        {
            IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            js.ExecuteScript("arguments[0].click();", element);
        }


        protected IWebElement Find(By locator) => Driver.FindElement(locator);
    }
}
