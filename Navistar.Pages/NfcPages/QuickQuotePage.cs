using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Navistar.Navistar.core;
using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using SeleniumExtras.WaitHelpers;

namespace Navistar.Navistar.Pages.NfcPages
{
    public class QuickQuotePage : BasePage
    {
        public QuickQuotePage(WebDriver driver) : base(driver)
        {
        }
        private IWebElement programDropdown => Find(By.XPath("//label[text()='Program']/following-sibling::p-dropdown//span"));
        private IWebElement productDropdown => Find(By.XPath("//label[text()='Product']/following-sibling::p-dropdown//span"));
        private IWebElement assetDropdown => Find(By.XPath("//label[text()='Asset']/following-sibling::p-dropdown//span"));
        private IWebElement purchasePrice => Find(By.XPath("(//input[@role='spinbutton'])[1]"));
        private IWebElement residualValue => Find(By.XPath("(//input[@class='p-inputtext p-component p-element p-inputnumber-input'])[4]"));

        private IWebElement downPayment => Find(By.XPath("(//input[@class='p-inputtext p-component p-element p-inputnumber-input'])[2]"));
        private IWebElement balloon => Find(By.XPath("(//input[@class='p-inputtext p-component p-element p-inputnumber-input'])[7]"));
        private IWebElement frequency => Find(By.XPath("//div[@class='p-dropdown p-component p-inputwrapper']//span[@role='combobox']"));
        private IWebElement termInMonths => Find(By.XPath("//input[@class='p-element p-dropdown-label p-inputtext ng-star-inserted']"));
        private IWebElement calculateBtn => Find(By.XPath("//span[normalize-space()='CALCULATE']"));
        private IWebElement createQuoteButton => Find(By.XPath("//span[text()='Create Quote']"));
        private IWebElement element => Find(By.XPath("//input[@role='searchbox']"));
        private IWebElement payment => Find(By.XPath("//p[text()='Payment']/following-sibling::p"));
        private IWebElement totalInterest => Find(By.XPath("//p[text()='Total Interest']/following-sibling::p"));
        private IWebElement totalCost => Find(By.XPath("//p[text()='Total Cost']/following-sibling::p"));

        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");
        public void SelectProgramDropDown(string value)
        {
            WaitTillTheLoadSpinnerDisappearsAndElementExist(By.XPath("(//div[@class='col-12 ng-star-inserted']//span[@role='combobox'])[1]"));
            SetImplicitWait(15);
            dropdown.SelectCustomDropdown(programDropdown, value, optionsLocator);
            WaitTillTheLoadSpinnerDisappears();
        }
        public void SelectProductDropdown(string value)
        {
            Thread.Sleep(800);
            dropdown.SelectCustomDropdown(productDropdown, value, optionsLocator);
            WaitTillTheLoadSpinnerDisappears();
        }
        public void SelectAssetDropdown(string value)
        {
            Thread.Sleep(800);
            dropdown.SelectCustomDropdown(assetDropdown, value, optionsLocator);
        }
        public void PurchasePrice(int amount)
        {
            purchasePrice.SendKeys(amount.ToString());
        }
        public void ResidaulValue(int amount)
        {
            residualValue.SendKeys(amount.ToString());
        }
        public void DownPayment(int amount)
        {
            downPayment.SendKeys(amount.ToString());
        }
        public void Balloon(int amount)
        {
            balloon.SendKeys(amount.ToString());
        }
        public void FrequencyDropdown(string value)
        {
            try
            {
                dropdown.SelectCustomDropdown(frequency, value, optionsLocator);
            }
            catch
            {
                frequency.Click();
                element.SendKeys(value);
            }
        }
        public void TermInMonths(int value = 24)
        {
            if (!string.IsNullOrEmpty(value.ToString()))
            {
                termInMonths.Clear();
                termInMonths.SendKeys(value.ToString());
            }
        }
        public void ClickOnCalcutateButton()
        {
            calculateBtn.Click();
            MoveToElement(createQuoteButton);
            ReportingManager.LogPass("Clicked on Calculate Button");
            ReportingManager.AddScreenshotToReport("Calculation captured ");
        }
        public void ClickOnCreateQuoteButton()
        {
            createQuoteButton.Click();
            WaitTillTheLoadSpinnerDisappears();
            ReportingManager.LogPass("Clicked on Create Quote Button");
        }
        public void GetQuickQuoteDetails()
        {

        }
        //public Dictionary<string, string> QuoteDetails()
        //{
        //    return new Dictionary<string, string>
        //{
        //    {"program",programDropdown.Text },
        //    {"product",productDropdown.Text },
        //    { "Payment", payment.Text },
        //    { "TotalInterest", totalInterest.Text },
        //    { "TotalCost", totalCost.Text }
        //};
        //}
        public Dictionary<string, string> QuoteDetails(string product)
        {
            var quoteDetails = new Dictionary<string, string>
    {
        { "program", programDropdown.Text },
        { "product", productDropdown.Text },
        { "Payment", payment.Text }
    };

            // Only add TotalCost if the product is NOT "Operating Lease", "TRAC Lease", or "Finance Lease"
            var excludedProducts = new[] { "Operating Lease", "TRAC Lease", "Finance Lease" };
            if (!excludedProducts.Any(p => p.Equals(product, StringComparison.OrdinalIgnoreCase)))
            {
                quoteDetails.Add("TotalInterest", totalInterest.Text);
                quoteDetails.Add("TotalCost", totalCost.Text);
            }
            else
            {
                TestContext.WriteLine($"Skipping 'TotalCost' for product: {product}.");
            }

            return quoteDetails;
        }

        public void CreateFinanceLeaseContract()
        {
            SelectProgramDropDown("Finance Leases Program");
            SelectProductDropdown("Finance Lease");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateFinanceLeaseTracContract()
        {
            SelectProgramDropDown("Finance Leases Program");
            SelectProductDropdown("TRAC Lease");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateFinanceIncludedLoanContract()
        {
            SelectProgramDropDown("Loan Program");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateFmvContract()
        {
            SelectProgramDropDown("FMV Program");
            SelectProductDropdown("Operating Lease");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateCreditLineFinanceLeaseContract()
        {
            SelectProgramDropDown("Credit Line Lease Takedown");
            SelectProductDropdown("Finance Lease");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateCreditLineOperatingLeaseContract()
        {
            SelectProgramDropDown("Credit Line Lease Takedown");
            SelectProductDropdown("Operating Lease");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateCreditLineTracLeaseContract()
        {
            SelectProgramDropDown("Credit Line Lease Takedown");
            SelectProductDropdown("TRAC Lease");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateCreditLineFixedPrincipalLoanContract()
        {
            SelectProgramDropDown("Credit Line Loan Takedown");
            SelectProductDropdown("Fixed Principal (IBI) Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateCreditLineFinanceIncludedLoanContract()
        {
            SelectProgramDropDown("Credit Line Loan Takedown");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateS13IdealLeaseContract()
        {
            SelectProgramDropDown("S13 Idealease Program");
            SelectProductDropdown("Fixed Principal (IBI) Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateUtcBuydownContract()
        {
            SelectProgramDropDown("UTC - 1.9% Buy Down");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateUtcBuydownCreditLineContract()
        {
            SelectProgramDropDown("UTC - 1.9% Buy Down Credit Line");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateIdeaLeaseContract()
        {
            SelectProgramDropDown("Idealease Program");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreatePromissoryLoanContract()
        {
            SelectProgramDropDown("Promissory Loan Program");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateNAIPContract()
        {
            SelectProgramDropDown("National Account Idealease Program");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice(10000);
            FrequencyDropdown("Monthly");
            TermInMonths(24);
            ClickOnCalcutateButton();
            ClickOnCreateQuoteButton();
        }

    }
}
