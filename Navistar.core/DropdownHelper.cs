using OpenQA.Selenium.Support.UI;
using OpenQA.Selenium;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SeleniumExtras.WaitHelpers;
using OpenQA.Selenium.BiDi.Modules.BrowsingContext;
using OpenQA.Selenium.Interactions;

namespace Navistar.Navistar.core
{
    public class DropdownHelper
    {
        private WebDriver Driver;

        public DropdownHelper(WebDriver driver)
        {
            Driver = driver;
        }
        public void SelectCustomDropdown(IWebElement dropdownTrigger, string optionText, By optionsLocator)
        {
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            Actions actions = new Actions(Driver);

            // Ensure dropdown trigger is clickable before clicking
            dropdownTrigger.Click();
            // Wait for dropdown options to be visible
            wait.Until(ExpectedConditions.ElementIsVisible(optionsLocator));

            var options = Driver.FindElements(optionsLocator);
            foreach (var option in options)
            {
                if (option.Text.Trim().Equals(optionText, StringComparison.OrdinalIgnoreCase))
                {
                    wait.Until(ExpectedConditions.ElementToBeClickable(option));

                    // Use Actions to ensure smooth interaction
                    actions.MoveToElement(option).Click().Perform();
                    //ReportingManager.LogPass($"Selected option '{option.Text}' from the '{dropdownTrigger.Text}' dropdown.");
                    return;

                }
            }

            throw new NoSuchElementException($"Option '{optionText}' not found.");
        }

        // Method to select an option by text
        public void SelectByText(IWebElement dropdownElement, string text)
        {
            var selectElement = new SelectElement(dropdownElement);
            selectElement.SelectByText(text);
        }

        // Method to select an option by value
        public void SelectByValue(IWebElement dropdownElement, string value)
        {
            var selectElement = new SelectElement(dropdownElement);
            selectElement.SelectByValue(value);
        }

        // Method to select an option by index
        public void SelectByIndex(IWebElement dropdownElement, int index)
        {
            var selectElement = new SelectElement(dropdownElement);
            selectElement.SelectByIndex(index);
        }

        // Method to list all options in the dropdown
        public List<string> GetAllOptions(IWebElement dropdownElement)
        {
            var selectElement = new SelectElement(dropdownElement);
            return selectElement.Options.Select(option => option.Text).ToList();
        }
        // Check if the dropdown allows multiple selections
        public bool IsMultiSelect(IWebElement element)
        {
            var selectElement = new SelectElement(element);
            return selectElement.IsMultiple;
        }

        // Get the selected option
        public string GetSelectedOption(IWebElement element)
        {
            var selectElement = new SelectElement(element);
            return selectElement.SelectedOption.Text;
        }
        // Method to deselect all options in a multi-select dropdown
        public void DeselectAllOptions(IWebElement dropdownElement)
        {
            var selectElement = new SelectElement(dropdownElement);
            if (selectElement.IsMultiple)
            {
                selectElement.DeselectAll();
            }
            else
            {
                throw new InvalidOperationException("Cannot deselect options: Dropdown does not support multiple selections.");
            }
        }

        // Method to deselect an option by text in a multi-select dropdown
        public void DeselectByText(IWebElement dropdownElement, string text)
        {
            var selectElement = new SelectElement(dropdownElement);
            if (selectElement.IsMultiple)
            {
                selectElement.DeselectByText(text);
            }
            else
            {
                throw new InvalidOperationException("Cannot deselect option: Dropdown does not support multiple selections.");
            }
        }

        // Method to deselect an option by value in a multi-select dropdown
        public void DeselectByValue(IWebElement dropdownElement, string value)
        {
            var selectElement = new SelectElement(dropdownElement);
            if (selectElement.IsMultiple)
            {
                selectElement.DeselectByValue(value);
            }
            else
            {
                throw new InvalidOperationException("Cannot deselect option: Dropdown does not support multiple selections.");
            }
        }

        // Method to deselect an option by index in a multi-select dropdown
        public void DeselectByIndex(IWebElement dropdownElement, int index)
        {
            var selectElement = new SelectElement(dropdownElement);
            if (selectElement.IsMultiple)
            {
                selectElement.DeselectByIndex(index);
            }
            else
            {
                throw new InvalidOperationException("Cannot deselect option: Dropdown does not support multiple selections.");
            }
        }
    }
}
