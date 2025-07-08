using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Navistar.Navistar.core;
using OpenQA.Selenium;

namespace Navistar.Navistar.Pages.NfcPages
{
    public class SearchCustomerPage : BasePage
    {
        private readonly AddNewCustomerPage _addNewCustomerPage;
        private static string _customerName;
        public SearchCustomerPage(WebDriver driver) : base(driver)
        {
            _addNewCustomerPage = new AddNewCustomerPage(driver);
        }

        private IWebElement individualRadioButton => Find(By.XPath("//label[normalize-space()='Individual']"));
        private IWebElement businessRadioButton => Find(By.XPath("//label[normalize-space()='Business']"));
        private IWebElement searchByName => Find(By.XPath("//span[@aria-label='Name']"));
        private IWebElement searchByValue => Find(By.XPath("//div[@class='col-3 ng-star-inserted']//input[@type='text']"));
        private IWebElement addNewCustomer => Find(By.XPath("//span[normalize-space()='Add New Customer']"));
        private IWebElement searchButton => Find(By.XPath("//span[normalize-space()='SEARCH']"));
        private IWebElement addCustomerSearchResult => Find(By.XPath("(//span[text()='ADD'])[1]"));
        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");
        public void ClickOnIndividualRadioButton()
        {
            individualRadioButton.Click();
        }
        public void ClickOnBusinessRadioButton()
        {
            businessRadioButton.Click();
        }
        public void SelectSearchByNameDropdown(string value)
        {
            dropdown.SelectCustomDropdown(searchByName, value, optionsLocator);
        }
        public void SearchByValue(string name)
        {
            searchByValue.SendKeys(name);
            ReportingManager.LogInfo($" ✅ Searched existing customer: {name}");
        }
        public void ClickOnAddNewCustomerButton()
        {
            Thread.Sleep(1000);
            addNewCustomer.Click();
            WaitTillTheLoadSpinnerDisappears(10);
            ReportingManager.LogPass("Dealer clicked on Add New Customer Button.");
        }
        public void ClickOnSearchButton()
        {
            searchButton.Click();
        }
        public void AddCustomerSearchResult()
        {
            addCustomerSearchResult.Click();
        }
        public string CreateOrReuseCustomer()
        {
            if (string.IsNullOrEmpty(_customerName))
            {
                // First-time execution: create a new customer
                _customerName = GenerateUniqueCustomerName();
                ClickOnAddNewCustomerButton();
                _addNewCustomerPage.AddNewIndividualCustomer(_customerName);
                ReportingManager.LogPass($" ✅ Created new customer: {_customerName}");
                Console.WriteLine($"Created new customer: {_customerName}");
            }
            else
            {
                // Customer already exists: search and use it
                SearchByValue(_customerName);
                ClickOnSearchButton();
                WaitTillTheLoadSpinnerDisappears(10);
                AddCustomerSearchResult();
                WaitTillTheLoadSpinnerDisappears(10);
                Thread.Sleep(1000);
                _addNewCustomerPage.ClickOnNextButton();
                Thread.Sleep(1000);
                _addNewCustomerPage.ClickOnSubmitButton();
                Thread.Sleep(5000);
                ReportingManager.LogPass($"Reusing existing customer: {_customerName}");
                Console.WriteLine($"♻️ Reusing existing customer: {_customerName}");
            }
            return _customerName;
        }
        private string GenerateUniqueCustomerName()
        {
            return $"NewCustomer_{DateTime.Now:yyyyMMdd_HHmmssfff}";
        }
    }
}
