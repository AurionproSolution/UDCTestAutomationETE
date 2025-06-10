using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Navistar.Navistar.core;
using NUnit.Framework;
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
        private IWebElement calculateBtn => Find(By.XPath("//span[normalize-space()='Calculate']"));
        private IWebElement termsInMonthDropdown => Find(By.XPath("//label[text()='Term (In Month)']/following-sibling::p-dropdown//div[@role='button']"));
        private IWebElement termsInMonthField => Find(By.XPath("//input[@class='p-element p-dropdown-label p-inputtext ng-star-inserted']"));
        private IWebElement frequencyDropdown => Find(By.XPath("//label[text()='Frequency']/following-sibling::p-dropdown/div"));
        private IWebElement contractStartDateCalendar => Find(By.XPath("//input[@class='p-element ng-tns-c1685646730-11 p-inputtext p-component ng-star-inserted']"));
        private IWebElement currentDateElement => Find(By.XPath($"//div[text()=' {currentDate} ']"));
        private IWebElement daysToFirstPaymentField => Find(By.XPath("//label[text()='Days to First Payment']/following-sibling::p-inputnumber//input"));
        private IWebElement intServiceCount => Find(By.XPath("//label[text()='Int. Serv. Cont.']/following-sibling::p-dropdown/div"));
        private IWebElement assetSummery => Find(By.XPath("//span[text()='Asset Summary']"));
        private IWebElement nextButton => Find(By.XPath("//span[normalize-space()=\"Next\"]"));
        private IWebElement editPaymentSchedule => Find(By.XPath("//span[normalize-space()='Edit Payment Schedule']"));
        private IWebElement installment => Find(By.XPath("//label[text()='Installment']/following-sibling::span"));
        private IWebElement totalInterest => Find(By.XPath("//label[text()='Total Interest']/following-sibling::span"));
        private IWebElement totalAmountToRepay => Find(By.XPath("//label[text()='Total Amount to Repay']/following-sibling::span"));
        private IWebElement element => Find(By.XPath("//p-dropdown[@class='p-element p-inputwrapper ng-pristine ng-invalid ng-star-inserted ng-touched']//span[@role='combobox']"));
        private IWebElement AnnualMileage => Find(By.XPath("//label[contains(text(),'Annual Mileage ')]//following::span/input"));

        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");
        public void SelectProgramDropDown(string value)
        {
            Thread.Sleep(5000);
            SetImplicitWait(15);
            dropdown.SelectCustomDropdown(programDropdown, value, optionsLocator);
        }
        public void SelectProductDropdown(string value)
        {
            Thread.Sleep(10000);
            SetImplicitWait(15);
            dropdown.SelectCustomDropdown(productDropdown, value, optionsLocator);
        }
        public void ClickOnCalcutateButton()
        {
            MoveToElement(calculateBtn);
            calculateBtn.Click();
            Thread.Sleep(2000);
            ReportingManager.LogPass("Clicked on Calculate Button");
            ReportingManager.AddScreenshotToReport("Contract details page Calculation grid.");
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
            daysToFirstPaymentField.Clear();
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
            ReportingManager.LogPass("Dealer clicked on Asset Summery button");
        }
        public void ValidateContractDetailsPageTitle()
        {
            Thread.Sleep(2000);
            try
            {
                string actaul = Driver.Title;
                assertions.AssertPageTitleEquals("Quote Originator");
                ReportingManager.LogPass("Page title validation passed: 'Quote Originator' is displayed.");
            }
            catch (AssertionException ex)
            {
                ReportingManager.LogFail($"Page title validation failed. Expected: 'Quote Originator', but found: '{Driver.Title}'. Error: {ex.Message}");
                throw; // Rethrow to ensure test fails
            }
        }
        public void ClickOnNextButton()
        {
            //WaitTillTheLoadSpinnerDisappears();
            SetImplicitWait(15);
            nextButton.Click();
            WaitTillTheLoadSpinnerDisappears();
            //Thread.Sleep(15000);
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
        //public Dictionary<string, string> StandardQuoteDetails()
        //{
        //    return new Dictionary<string, string>
        //{
        //    {"program",programDropdown.Text },
        //    {"product",productDropdown.Text },
        //    { "Payment", installment.Text },
        //    { "TotalInterest", totalInterest.Text },
        //    { "TotalCost", totalAmountToRepay.Text }
        //};
        //}
        public Dictionary<string, string> StandardQuoteDetails(string product)
        {
            var details = new Dictionary<string, string>
    {
        { "program", programDropdown.Text },
        { "product", productDropdown.Text },
        { "Payment", installment.Text }
    };

            // Only add TotalInterest and TotalCost if the product is NOT "Operating Lease", "TRAC Lease", or "Finance Lease"
            var excludedProducts = new[] { "Operating Lease", "TRAC Lease", "Finance Lease" };
            if (!excludedProducts.Any(p => p.Equals(product, StringComparison.OrdinalIgnoreCase)))
            {
                details.Add("TotalInterest", totalInterest.Text);
                details.Add("TotalCost", totalAmountToRepay.Text);
            }
            else
            {
                TestContext.WriteLine($"Skipping 'TotalInterest' and 'TotalCost' for product: {product}.");
            }

            return details;
        }
        public void EnterAnnualMileage(string value)
        {
            SetImplicitWait(10);
            AnnualMileage.SendKeys(value);
            ReportingManager.LogPass("Annual Mileage entered " + value + "");
        }
    }
}
