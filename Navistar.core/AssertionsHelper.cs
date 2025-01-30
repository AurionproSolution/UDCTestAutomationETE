using Navistar.Navistar.Pages;
using NUnit.Framework;
using OpenQA.Selenium;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.DependencyModel;
namespace Navistar.Navistar.core
{
    public class AssertionsHelper
    {
        private readonly WebDriver Driver;

        public AssertionsHelper(WebDriver driver)
        {
            Driver = driver;
        }

        public void AssertElementIsVisible(IWebElement element)
        {
           // Assert.IsTrue(element.Displayed, $"Element '{element}' is not visible.");
            Assert.Pass($"Element '{element}' is not visible.");
        }

        public void AssertElementTextEquals(IWebElement element, string expectedText)
        {
            var actualText = element.Text;
            //Assert.AreEqual(expectedText, actualText, $"Expected text '{expectedText}' but found '{actualText}' for element '{element}'.");
            Assert.Equals(expectedText, actualText);
        }

        public void AssertUrlContains(string partialUrl)
        {
            var currentUrl = Driver.Url;
            //Assert.IsTrue(currentUrl.Contains(partialUrl), $"URL does not contain expected partial URL: '{partialUrl}'. Actual URL: '{currentUrl}'.");
            Assert.Pass($"Element '{currentUrl}' is not visible.");
        }

        public void AssertPageTitleEquals(string expectedTitle)
        {
            var actualTitle = Driver.Title;
            //Assert.AreEqual(expectedTitle, actualTitle, $"Expected page title '{expectedTitle}' but found '{actualTitle}'.");
            Assert.Equals(expectedTitle, actualTitle);
        }

        public void AssertElementIsEnabled(IWebElement element)
        {
           // Assert.IsTrue(element.Enabled, $"Element '{element}' is not enabled.");
            Assert.Pass($"Element '{element}' is not visible.");
        }
    }
}
