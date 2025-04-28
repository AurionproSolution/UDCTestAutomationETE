using Navistar.Navistar.core;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using SeleniumExtras.WaitHelpers;
using System.Threading.Tasks;
using OpenQA.Selenium.Interactions;

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
            assertions = new AssertionsHelper(driver);
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
        protected void ClickElementUsingJavaScript(IWebElement element)
        {
            IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            js.ExecuteScript("arguments[0].click();", element);
        }
        public void MoveToElement(IWebElement element)
        {
            try
            {
                // Wait for element to be visible and enabled before scrolling
                // Wait.Until(ExpectedConditions.ElementToBeClickable(element));

                // Check if element is already in the viewport
                bool isElementInView = (bool)((IJavaScriptExecutor)Driver).ExecuteScript(
                    "var rect = arguments[0].getBoundingClientRect();" +
                    "return (rect.top >= 0 && rect.bottom <= window.innerHeight);", element);

                // Scroll only if element is not in view
                if (!isElementInView)
                {
                    ((IJavaScriptExecutor)Driver).ExecuteScript(
                        "window.scrollBy({ top: arguments[0].getBoundingClientRect().top - (window.innerHeight / 3), behavior: 'smooth' });",
                        element);

                    // Small delay to let scrolling complete
                    Thread.Sleep(500);
                }

                // Move mouse to element
                Actions actions = new Actions(Driver);
                actions.MoveToElement(element).Perform();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in MoveToElement: " + ex.Message);
                throw; // Rethrow exception for better debugging
            }
        }

        public void HoverOverElement(IWebElement element)
        {
            Actions actions = new Actions(Driver);
            actions.MoveToElement(element).Click().Build().Perform();
        }
        public void WaitTillTheElementIsLoaded(IWebElement element)
        {
            for (int i = 0; i <= 60; i++)
            {
                if (element.Displayed)
                {
                    element.Click();
                    break;
                }
                else
                {
                    Thread.Sleep(1000);
                }
            }
        }
        public void SafeClick(IWebElement locator)
        {
            for (int i = 0; i < 5; i++)
            {
                try
                {
                    WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
                    IWebElement element = wait.Until(ExpectedConditions.ElementToBeClickable(locator));

                    try
                    {
                        element.Click();
                    }
                    catch (StaleElementReferenceException)
                    {
                        // Re-find element
                        locator.Click();
                    }
                    return;
                }
                catch (StaleElementReferenceException)
                {
                    Thread.Sleep(500);
                }
            }
            throw new Exception("Element is still stale after multiple retries.");
        }
        public void WaitTillTheLoadSpinnerDisappears(int timeoutInSeconds = 5)
        {
            // Wait for spinner to disappear
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(timeoutInSeconds));
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
        }
        public void WaitTillTheLoadSpinnerDisappearsAndElementExist(By locator)
        {
            Thread.Sleep(2000);
            // Wait for spinner to disappear
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(15));
            wait.Until(drv =>
            {
                try
                {
                    var spinner = Driver.FindElement(By.CssSelector(".p-progressspinner"));
                    return !spinner.Displayed;
                }
                catch (NoSuchElementException)
                {
                    // Spinner not in DOM anymore
                    return true;
                }
                catch (StaleElementReferenceException)
                {
                    // Spinner has been replaced in the DOM
                    return true;
                }
            });
            var Element = wait.Until(ExpectedConditions.ElementExists(locator));
            //wait.Until(ExpectedConditions.ElementToBeClickable(Element));
            SetImplicitWait(15);
            //WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            //wait.Until(drv =>
            //{
            //    var spinners = drv.FindElements(By.CssSelector(".p-progressspinner"));
            //    return spinners.Count == 0 || !spinners[0].Displayed;
            //});
        }

        protected IWebElement Find(By locator) => Driver.FindElement(locator);

    }
}
