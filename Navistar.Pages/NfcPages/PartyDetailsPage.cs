using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using OpenQA.Selenium;

namespace Navistar.Navistar.Pages.NfcPages
{
    public class PartyDetailsPage : BasePage
    {
        public PartyDetailsPage(WebDriver driver) : base(driver)
        {
        }
        private IWebElement customerRoleDropdown => Find(By.XPath("(//div[@class='dropdown-width p-dropdown p-component p-inputwrapper p-inputwrapper-filled'])[1]"));
        private IWebElement classificationDropdown => Find(By.XPath("(//div[@class='dropdown-width p-dropdown p-component p-inputwrapper p-inputwrapper-filled'])[2]"));
        private IWebElement firstName => Find(By.XPath("//label[text()='First Name ']/following-sibling::span"));
        private IWebElement middleName => Find(By.XPath("//label[text()='Middle Name ']/following-sibling::span"));
        private IWebElement lastName => Find(By.XPath("//label[text()='Last Name ']/following-sibling::span"));
        private IWebElement EnterEmail => Find(By.XPath("//label[text()='Email ']/following-sibling::span"));

        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");

        public void CustomerRoleDropdown(string value)
        {
            dropdown.SelectCustomDropdown(customerRoleDropdown, value, optionsLocator);
        }
        public void ClassificationDropdown(string value)
        {
            dropdown.SelectCustomDropdown(classificationDropdown, value, optionsLocator);
        }

    }
}
