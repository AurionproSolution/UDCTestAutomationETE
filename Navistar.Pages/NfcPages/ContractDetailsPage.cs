using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Emit;
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
        private IWebElement labelTotalFess => Find(By.XPath("//p[contains(text(),' Total Fees ')]//child::span"));
        private IWebElement addFessAndChargesButton => Find(By.XPath("//span[contains(text(),'Add Fees and Charges')]"));
        private IWebElement labelInstallementFromPaymentSummary => Find(By.XPath("//label[contains(text(),'Installment')]//following-sibling::span"));
        private IWebElement labeCalculatdAmount => Find(By.XPath("//div[contains(text(),' Monthly ')]//following::div"));
        private IWebElement labeBuyRate => Find(By.XPath("//label[contains(text(),'Buy Rate')]//following::input"));
        private IWebElement buttonDetailSchedule => Find(By.XPath("//label[contains(text(),' Detailed Schedule ')]"));
        private IWebElement previousButton => Find(By.XPath("//span[contains(text(),'Previous')]//parent::button"));
        private IWebElement editPaymentScheduleButton => Find(By.XPath("//span[contains(text(),'Edit Payment Schedule')]//parent::button"));
        private IWebElement numberTextBox => Find(By.XPath("//input[@type='number']"));
        private IWebElement applyButton => Find(By.XPath("(//span[contains(text(),'Calculate')]//parent::button)[2]"));
        private IWebElement validationErrorMessage => Find(By.XPath("//div[@class='p-toast-detail ng-tns-c3576075022-1213' and @data-pc-section='detail']"));
        private IWebElement frquancyTermDropdown => Find(By.XPath("//label[contains(text(),'Term (In Month)')]//following::input"));
        private IWebElement frquancyTermDropdownValidationMessage => Find(By.XPath("//label[contains(text(),'Term (In Month)')]//following::input//following::small"));
        private IWebElement labelAssetCost => Find(By.XPath("//p[@class='px-2 p-inline asset-text-sub-black']//child::span"));
        private IWebElement labelTotalAmountBorrowed => Find(By.XPath("//p[contains(text(),' Total Amount Borrowed ')]//child::span"));
        private IWebElement labelMarkup => Find(By.XPath("//label[contains(text(),'Markup')]//following::input"));
        private IWebElement textboxContractStartDate => Find(By.XPath("//label[contains(text(),' Contract Start Date ')]//following::input"));
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
            WaitTillTheLoadSpinnerDisappears();
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
            WaitTillTheLoadSpinnerDisappears();
            SetImplicitWait(15);
            nextButton.Click();
            WaitTillTheLoadSpinnerDisappears();
            Thread.Sleep(5000);
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
        { "Payment", installment.Text },
        { "BuyRate", labeBuyRate.Text },
        { "AssetCost", labelAssetCost.Text },
        { "TotalAmountBorrowed", labelTotalAmountBorrowed.Text },
        //{ "TotalFess", labelTotalFess.Text },
        { "TermInMonths", labelInstallementFromPaymentSummary.Text },
        { "Markup", labelMarkup.Text },
        { "TotalFess", labelTotalFess.Text },
        { "Contract Start Date", labelTotalFess.Text },

    };

            // Only add TotalInterest and TotalCost if the product is NOT "Operating Lease", "TRAC Lease", or "Finance Lease"
            var excludedProducts = new[] { "Operating Lease", "TRAC Lease", "Finance Lease", "Idealease", "Finance Included Loan" };
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

        public void ClickOnAddFeesAndChargesButton()
        {
            SetImplicitWait(10);
            addFessAndChargesButton.Click();
            Thread.Sleep(2000);
            ReportingManager.LogPass("Add Fess And Charges Button click");
        }

        public string GetTotalFess()
        {
            string labelTotalCost = labelTotalFess.Text;
            return labelTotalCost;
            Thread.Sleep(500);
        }
        public string GetInstallementFromPaymentSummary()
        {
            string installementFromPaymentSummaryLabel = labelInstallementFromPaymentSummary.Text;
            return installementFromPaymentSummaryLabel;
            Thread.Sleep(500);
        }

        public string GetCalculateAmountFromContractPaymentSchedule()
        {
            string calculatdAmountLabel = labeCalculatdAmount.Text;
            return calculatdAmountLabel;
            Thread.Sleep(500);
        }

        public string GetBuyRate()
        {
            string buyRateLabel = Driver.FindElement(By.XPath("//label[contains(text(),'Buy Rate')]//following::input")).GetAttribute("aria-valuenow");
            return buyRateLabel;
            Thread.Sleep(500);
        }

        public string GetCalculateAmountFromDetailsScheduleTab()
        {
            ScrollAndClickElement(labelInstallementFromPaymentSummary);
            buttonDetailSchedule.Click();
            Thread.Sleep(1000);
            string calculatdAmountLabel = labeCalculatdAmount.Text;
            return calculatdAmountLabel;
        }

        public void clickonPreviousButton()
        {
            previousButton.Click();
            WaitTillTheLoadSpinnerDisappears();
            Thread.Sleep(3000);
        }

        public void clickOnEditPaymentButtonAndVerifyTerms(string expectedTerm)
        {

            ScrollAndClickElement(labelInstallementFromPaymentSummary);
            editPaymentScheduleButton.Click();
            Thread.Sleep(2000);
            string actualNumberofTerms = Driver.FindElement(By.XPath("//input[@formcontrolname='installments']")).GetAttribute("value");
            Thread.Sleep(1000);
            if (actualNumberofTerms.Equals(expectedTerm))
            {
                ReportingManager.LogPass("Number of Term/Frequnacy is updated on Edit Payment Page"+ actualNumberofTerms);
              //  ReportingManager.AddScreenshotToReport("Number of Term/Frequnacy is updated on Edit Payment Page");
            }
            else
            {
                ReportingManager.LogFail("Number of Term/Frequnacy is not updated on Edit Payment Page" + actualNumberofTerms);
                ReportingManager.AddScreenshotToReport("Number of Term/Frequnacy is not updated on Edit Payment Page" + actualNumberofTerms);
            }

        }

        public void EntreNumberinTermAndApply(string number)
        {
            numberTextBox.Clear();
            
        }

        public void VerifyFrequancyTermErrorMessage()
        {
           bool isDisplayed = frquancyTermDropdownValidationMessage.Displayed;
            if (isDisplayed)
            {
                ReportingManager.LogPass("Validation Message is Displayed");
                ReportingManager.AddScreenshotToReport("Validation Message is Displayed");
            }
            else
            {
                Assert.Fail("Validation Message is not Displayed");
                ReportingManager.LogFail("Validation Message is not Displayed");
                ReportingManager.AddScreenshotToReport("Validation Message is not Displayed");
            }
        }

        public void EntreFrquancyTermDropdown(string frquancyTerm)
        {
            frquancyTermDropdown.Clear();
            Thread.Sleep(500);
            frquancyTermDropdown.SendKeys(frquancyTerm);
            calculateBtn.Click();
            WaitTillTheLoadSpinnerDisappears();

        }

        public string GetMarkup()
        {
            string makupValue = Driver.FindElement(By.XPath("//label[contains(text(),'Markup')]//following::input")).GetAttribute("aria-valuenow");
            return makupValue;
            Thread.Sleep(500);
        }

        public string GetCustomerRate()
        {
            string customerRateValue = Driver.FindElement(By.XPath("//label[contains(text(),'Customer Rate')]//following::input")).GetAttribute("aria-valuenow");
            return customerRateValue;
            Thread.Sleep(500);
        }

        public string GetAssetCost()
        {
            string assetCostValue = labelAssetCost.Text;
            return assetCostValue;
            Thread.Sleep(500);
        }

        public string GetTotalAmountBorrowed()
        {
            string assetCostValue = labelTotalAmountBorrowed.Text;
            return assetCostValue;
            Thread.Sleep(500);
        }

        public Dictionary<string, string> DetailsStandardQuote(string product)
        {
            var details = new Dictionary<string, string>
        {
        { "program", programDropdown.Text },
        { "product", productDropdown.Text },
        { "AssetCost", labelAssetCost.Text },
        { "TotalAmountBorrowed", labelTotalAmountBorrowed.Text },
        { "TermInMonths", labelInstallementFromPaymentSummary.Text },
        { "Markup", labelMarkup.Text },
        { "TotalFess", labelTotalFess.Text },
        { "Contract Start Date", textboxContractStartDate.Text },

    };

           return details;
        }


        public void  EntreMarkup(string value)
        {
            MoveToElement(labelMarkup);
            labelMarkup.Click();
            Thread.Sleep(500);
            IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            js.ExecuteScript("arguments[0].value='" + value + "';", labelMarkup);
            ReportingManager.LogPass("Entered purchase price value as " + value + ".");
        }

    }
}
