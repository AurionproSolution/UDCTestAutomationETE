using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Navistar.Navistar.core;
using OpenQA.Selenium;

namespace Navistar.Navistar.Pages.NfcPages
{
    public class ContractDetailsPage : BasePage
    {
        protected AssetSummeryPage assetSummeryPage;
        public ContractDetailsPage(WebDriver driver) : base(driver)
        {
            assetSummeryPage = new AssetSummeryPage(driver);
        }

        int currentDate = DateTime.Now.Day;
        private IWebElement programDropdown => Find(By.XPath("//label[text()='Program']/following-sibling::p-dropdown//span"));
        private IWebElement productDropdown => Find(By.XPath("//label[text()='Product']/following-sibling::p-dropdown//span"));
        private IWebElement introducerField => Find(By.XPath("//div[@class=\"col-2 container-subsidy-col ng-star-inserted\"]//input[@type=\"text\"]"));
        private IWebElement introducerEmailField => Find(By.XPath("//div[@class=\"col-1 ng-star-inserted\"]//input[@type=\"text\"]"));
        private IWebElement termsInMonthDropdown => Find(By.XPath("//label[text()='Term (In Month)']/following-sibling::p-dropdown//div[@role='button']"));
        private IWebElement termsInMonthField => Find(By.XPath("//input[@class='p-element p-dropdown-label p-inputtext ng-star-inserted']"));
        private IWebElement frequencyDropdown => Find(By.XPath("//label[text()='Frequency']/following-sibling::p-dropdown/div"));
        private IWebElement contractStartDateCalendar => Find(By.XPath("//input[@class='p-element ng-tns-c1685646730-11 p-inputtext p-component ng-star-inserted']"));
        private IWebElement currentDateElement => Find(By.XPath($"//div[text()=' {currentDate} ']"));
        private IWebElement daysToFirstPaymentField => Find(By.XPath("//p-inputnumber[@class='p-element p-inputwrapper ng-untouched ng-pristine ng-invalid ng-star-inserted']//input[@role='spinbutton']"));
        private IWebElement intServiceCount => Find(By.XPath("//label[text()='Int. Serv. Cont.']/following-sibling::p-dropdown/div"));
        private IWebElement assetSummery => Find(By.XPath("//span[text()='Asset Summary']"));
        private IWebElement nextButton => Find(By.XPath("//span[normalize-space()=\"Next\"]"));
        private IWebElement editPaymentSchedule => Find(By.XPath("//span[normalize-space()='Edit Payment Schedule']"));

        private IWebElement element => Find(By.XPath("//p-dropdown[@class='p-element p-inputwrapper ng-pristine ng-invalid ng-star-inserted ng-touched']//span[@role='combobox']"));
        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");
        public void SelectProgramDropDown(string value)
        {
            Thread.Sleep(5000);
            SetImplicitWait(15);
            //WaitForPageToLoad(programDropdown,20);
            dropdown.SelectCustomDropdown(programDropdown, value, optionsLocator);
        }
        public void SelectProductDropdown(string value)
        {
            SetImplicitWait(15);
            dropdown.SelectCustomDropdown(productDropdown, value, optionsLocator);
        }
        public void SelectTermsInMonthDropdown(string value)
        {
            try
            {
                dropdown.SelectCustomDropdown(termsInMonthDropdown, value, optionsLocator);
            }
            catch
            {
                termsInMonthField.SendKeys(value);
            }
        }
        public void SelectFrequencyDropdown(string value)
        {
            try
            {
                dropdown.SelectCustomDropdown(frequencyDropdown, value, optionsLocator);
            }
            catch
            {
                frequencyDropdown.Click();
                element.SendKeys(value);
            }
        }
        public void SelectContractStartDate()
        {
            contractStartDateCalendar.Click();
            currentDateElement.Click();
        }
        public void EnterDaysToFirstPayment(string value)
        {
            SetImplicitWait(10);
            daysToFirstPaymentField.SendKeys(value);
            ReportingManager.LogPass("Dealer entered " + value + " as Days to First Payment");
        }
        public void SelectIntServiceCountDropdown(string value)
        {
            dropdown.SelectCustomDropdown(intServiceCount, value, optionsLocator);
            ReportingManager.LogPass("Dealer selected " + value + " From " + intServiceCount + " dropdown");
        }
        public void ClickOnAssetSummery()
        {
            ScrollAndClickElement(assetSummery);
            //assetSummery.Click();
            ReportingManager.LogPass("Dealer clicked on Asset Summery button");
        }
        public void ClickOnNextButton()
        {
            SetImplicitWait(10);
            nextButton.Click();
            ReportingManager.LogPass("Dealer clicked on Next button in contract details page");
        }
        public void CreateContract()
        {
            SelectProgramDropDown("Finance Leases Program");
            SelectProductDropdown("Finance Lease");
            SelectTermsInMonthDropdown("12");
            SelectFrequencyDropdown("Monthly");
            SelectContractStartDate();
            ClickOnAssetSummery();
            assetSummeryPage.AddAsset();
            ClickOnNextButton();
        }
    }
}
