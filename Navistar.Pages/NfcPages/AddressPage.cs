using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using OpenQA.Selenium;

namespace Navistar.Navistar.Pages.NfcPages
{
    public class AddressPage : BasePage
    {
        public AddressPage(WebDriver driver) : base(driver)
        {
        }
        private IWebElement selectAddressTypeDropdown => Find(By.XPath("//label[text()='Address Type ']/following-sibling::p-dropdown//div[@role='button']"));
        private IWebElement enterStreet => Find(By.XPath("//label[text()='Street ']/following-sibling::span/input"));
        private IWebElement enterSuburb => Find(By.XPath("//label[text()='Suburb ']/following-sibling::span/input"));
        private IWebElement enterCity => Find(By.XPath("//label[text()='City']/following-sibling::span//input"));
        private IWebElement selectCity => Find(By.XPath("(//ul[@role='listbox']/li)[1]"));
        private IWebElement enterCounty => Find(By.XPath("//label[text()='County ']/following-sibling::span/input"));
        private IWebElement enterState => Find(By.XPath("//label[text()='State/Province ']/following-sibling::span/input"));
        private IWebElement enterPostalCodeZipCode => Find(By.XPath("//label[text()='Postal Code/Zip Code ']/following-sibling::span/input"));
        private IWebElement enterCountryOrRegion => Find(By.XPath("//label[text()='Country/Region ']/following-sibling::span/input"));
        private IWebElement clickOnOkButton => Find(By.XPath("//span[text()='OK']"));
        private IWebElement clickOnCancleButton => Find(By.XPath("//span[text()='CANCEL']"));

        private IWebElement AddressFieldTextBox => Find(By.XPath("//input[@name='undefined']"));

        private IWebElement AddressFieldDropdwonOption => Find(By.XPath("//input[@name='undefined']//following::span"));

        
        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");
        public void SelectAddressTypeDropdown(string value)
        {
            Thread.Sleep(500);
            dropdown.SelectCustomDropdown(selectAddressTypeDropdown, value, optionsLocator);
        }
        public void EnterStreet(string value)
        {
            enterStreet.SendKeys(value);
        }
        public void EnterSuburb(string value)
        {
            enterSuburb.SendKeys(value);
        }
        public void EnterCity(string value)
        {
            enterCity.SendKeys(value);
            Thread.Sleep(3000);
            selectCity.Click();

        }
        public void EnterCounty(string value)
        {
            enterCounty.SendKeys(value);
        }
        public void EnterState(string value)
        {
            enterState.SendKeys(value);
        }
        public void EnterPostalCodeOrZipCode(string value)
        {
            enterPostalCodeZipCode.SendKeys(value);
        }
        public void EnterCountryOrRegion(string value)
        {
            enterCountryOrRegion.SendKeys(value);
        }
        public void ClickOnOkButton()
        {
            clickOnOkButton.Click();
        }

        private void AddressFieldTextbox()
        {
            Thread.Sleep(2000);
            AddressFieldTextBox.SendKeys("Navistar");
            Thread.Sleep(5000);
            IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            //  js.ExecuteScript("arguments[0].click();", AddressFieldDropdwonOption);
            js.ExecuteScript(@"const element = arguments[0];element.click();element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));", AddressFieldDropdwonOption);
            //   AddressFieldDropdwonOption.Click();
            Thread.Sleep(2000);
        }
        public void AddAddress()
        {
            AddressFieldTextbox();
       //     SelectAddressTypeDropdown("Street");
            //EnterStreet("main");
            //EnterSuburb("main");
            //EnterCity("Auckland, New Zealand");
            //EnterCounty("Orange");
            //EnterState("Auckland, New Zealand");
            //EnterPostalCodeOrZipCode("816");
            //EnterCountryOrRegion("United States");
            //ClickOnOkButton();

        }
    }
}