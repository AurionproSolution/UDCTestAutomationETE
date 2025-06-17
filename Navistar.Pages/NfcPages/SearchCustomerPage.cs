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
        public SearchCustomerPage(WebDriver driver) : base(driver)
        {
        }
        private IWebElement individualRadioButton => Find(By.XPath("//label[normalize-space()='Individual']"));
        private IWebElement businessRadioButton => Find(By.XPath("//label[normalize-space()='Business']"));
        private IWebElement searchByName => Find(By.XPath("//span[@aria-label='Name']"));
        private IWebElement searchByValue => Find(By.XPath("//input[@class='p-inputtext p-component p-element ng-pristine ng-invalid ng-touched']"));
        private IWebElement addNewCustomer => Find(By.XPath("//span[normalize-space()='Add New Customer']"));
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
        }
        public void ClickOnAddNewCustomerButton()
        {
            Thread.Sleep(1000);
            addNewCustomer.Click();
            WaitTillTheLoadSpinnerDisappears(10);
            ReportingManager.LogPass("Dealer clicked on Add New Customer Button.");
        }
    }
}
