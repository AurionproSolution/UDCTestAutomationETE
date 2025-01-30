using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Navistar.Navistar.core;
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
        private IWebElement programDropdown => Find(By.XPath("(//div[@class='col-12 ng-star-inserted']//span[@role='combobox'])[1]"));
        private IWebElement productDropdown => Find(By.XPath("(//div[@class='col-12 ng-star-inserted']//span[@role='combobox'])[2]"));
        private IWebElement assetDropdown => Find(By.XPath("(//div[@class='col-12 ng-star-inserted']//span[@role='combobox'])[3]"));
        private IWebElement purchasePrice => Find(By.XPath("(//input[@role='spinbutton'])[1]"));
        private IWebElement downPayment => Find(By.XPath("//p-inputnumber[@class='p-element p-inputwrapper ng-pristine ng-valid ng-star-inserted ng-touched']//input[@role='spinbutton']"));
        private IWebElement balloon => Find(By.XPath("//div[@class='col-4 label-text-right px-0 ng-star-inserted']//p-inputnumber[@class='p-element p-inputwrapper ng-untouched ng-pristine ng-valid ng-star-inserted']//input[@role='spinbutton']"));
        private IWebElement frequency => Find(By.XPath("//div[@class='p-dropdown p-component p-inputwrapper']//span[@role='combobox']"));
        private IWebElement termInMonths => Find(By.XPath("//input[@class='p-element p-dropdown-label p-inputtext ng-star-inserted']"));
        private IWebElement calculateBtn => Find(By.XPath("//span[normalize-space()='CALCULATE']"));
        private IWebElement createQuoteButton => Find(By.XPath("//span[text()='Create Quote']"));
        private IWebElement element => Find(By.XPath("//input[@role='searchbox']"));

        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");
        public void SelectProgramDropDown(string value)
        {
            SetImplicitWait(15);
            dropdown.SelectCustomDropdown(programDropdown, value, optionsLocator);
        }
        public void SelectProductDropdown(string value)
        {
            dropdown.SelectCustomDropdown(productDropdown, value, optionsLocator);
        }
        public void SelectAssetDropdown(string value)
        {
            dropdown.SelectCustomDropdown(assetDropdown, value, optionsLocator);
        }
        public void PurchasePrice(string value)
        {
            purchasePrice.SendKeys(value);
        }
        public void DownPayment(string value)
        {
            downPayment.SendKeys(value);
        }
        public void Balloon(string value)
        {
            balloon.SendKeys(value);
        }
        public void Frequency(string value)
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
        public void TermInMonths(string value)
        {
            termInMonths.SendKeys("24");
        }
        public void CalcutateButton()
        {
            calculateBtn.Click();
            ReportingManager.LogPass("Clicked on Calculate Button");
        }
        public void ClickOnCreateQuoteButton()
        {
            createQuoteButton.Click();
            ReportingManager.LogPass("Clicked on Create Quote Button");
        }
        public void CreateFinanceLeaseContract()
        {
            SelectProgramDropDown("Finance Leases Program");
            SelectProductDropdown("Finance Lease");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateFinanceLeaseTracContract()
        {
            SelectProgramDropDown("Finance Leases Program");
            SelectProductDropdown("TRAC Lease");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateFinanceIncludedLoanContract()
        {
            SelectProgramDropDown("Loan Program");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateFmvContract()
        {
            SelectProgramDropDown("FMV Program");
            SelectProductDropdown("Operating Lease");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateCreditLineFinanceLeaseContract()
        {
            SelectProgramDropDown("Credit Line Lease Takedown");
            SelectProductDropdown("Finance Lease");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateCreditLineOperatingLeaseContract()
        {
            SelectProgramDropDown("Credit Line Lease Takedown");
            SelectProductDropdown("Operating Lease");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateCreditLineTracLeaseContract()
        {
            SelectProgramDropDown("Credit Line Lease Takedown");
            SelectProductDropdown("TRAC Lease");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateCreditLineFixedPrincipalLoanContract()
        {
            SelectProgramDropDown("Credit Line Loan Takedown");
            SelectProductDropdown("Fixed Principal (IBI) Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateCreditLineFinanceIncludedLoanContract()
        {
            SelectProgramDropDown("Credit Line Loan Takedown");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateS13IdealLeaseContract()
        {
            SelectProgramDropDown("S13 Idealease Program");
            SelectProductDropdown("Fixed Principal (IBI) Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateUtcBuydownContract()
        {
            SelectProgramDropDown("UTC - 1.9% Buy Down");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateUtcBuydownCreditLineContract()
        {
            SelectProgramDropDown("UTC - 1.9% Buy Down Credit Line");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateIdeaLeaseContract()
        {
            SelectProgramDropDown("Idealease Program");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreatePromissoryLoanContract()
        {
            SelectProgramDropDown("Promissory Loan Program");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }
        public void CreateNAIPContract()
        {
            SelectProgramDropDown("National Account Idealease Program");
            SelectProductDropdown("Finance Included Loan");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            PurchasePrice("10,000.00");
            Frequency("Monthly");
            TermInMonths("24");
            CalcutateButton();
            ClickOnCreateQuoteButton();
        }

    }
}
