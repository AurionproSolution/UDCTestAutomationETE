using Navistar.Navistar.core;
using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using Reqnroll;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static System.Net.Mime.MediaTypeNames;

namespace Navistar.Navistar.Pages.NfcPages
{
    public class ContractSummaryPage : BasePage
    {
        public ContractSummaryPage(WebDriver driver) : base(driver)
        {
        }
        private IWebElement clickOnNextButton => Find(By.XPath("//span[text()='Next']"));
        private IWebElement contractIdElement => Find(By.XPath("//label[text()=' Contract ID  ']/following-sibling::div/span"));
        private IWebElement StatusElement => Driver.FindElement(By.XPath("//div[@class='status-container mt-2']/span"));
        private IWebElement labelPaymentSummary => Driver.FindElement(By.XPath("//span[contains(text(),' Total Amount Borrowed ')]"));
        private IWebElement residualValueRequestButton => Driver.FindElement(By.XPath("//span[contains(text(),'Residual Value Request')]//parent::button"));
        private IWebElement uploadSpecificationandInvoiceButton => Driver.FindElement(By.XPath("//span[contains(text(),'Upload')]//parent::span"));
        private IWebElement nextStateDropdown => Driver.FindElement(By.XPath("//p-dropdown[@id='nextState']//child::span"));
        private IWebElement rvAssessmentOption => Driver.FindElement(By.XPath("//span[contains(text(),'RV Assessment')]//parent::li"));
        private IWebElement submitButton => Driver.FindElement(By.XPath("//span[contains(text(),'Submit')]"));
        private IWebElement contractDetailsPageTab => Driver.FindElement(By.XPath("//div[contains(text(),'Contract Details')]"));
        private IWebElement lablelTotalAmountBorrowedOnContractSummaryPage => Driver.FindElement(By.XPath("//span[contains(text(),' Total Amount Borrowed ')]//following-sibling::span"));
        private IWebElement lablelAssetCostOnContractSummaryPage => Driver.FindElement(By.XPath("//span[contains(text(),' Asset Cost')]//following::div/span[1]"));
        private IWebElement contractSummaryDetailsPageTab => Driver.FindElement(By.XPath("//div[contains(text(),'Contract Summary')]"));
        private IWebElement programDropdown => Find(By.XPath("//label[text()='Program']/following-sibling::p-dropdown//span"));
        private IWebElement productDropdown => Find(By.XPath("//label[text()='Product']/following-sibling::p-dropdown//span"));
        private IWebElement installment => Find(By.XPath("//label[text()='Installment']/following-sibling::span"));
        private IWebElement labelMarkup => Find(By.XPath("//label[contains(text(),'Markup')]//following::input"));
        private IWebElement labelTotalFess => Find(By.XPath("//p[contains(text(),' Total Fees ')]//child::span"));
        private IWebElement textboxContractStartDate => Find(By.XPath("//label[contains(text(),' Contract Start Date ')]//following::input"));
        private IWebElement labelInstallementFromPaymentSummary => Find(By.XPath("//label[contains(text(),'Term (In Month)')]//following::input"));
        private IWebElement labelCustomerOnContractSummaryPage => Find(By.XPath("//th[contains(text(),'Customer Name')]//following::a"));
        private IWebElement paymentSummaryDetailsPageTab => Driver.FindElement(By.XPath("//div[contains(text(),'Contract Summary')]"));
        private IWebElement lablelAssetCostOnContractDetails => Driver.FindElement(By.XPath("//p[contains(text(),' Asset Cost')]//child::Span"));
        private IWebElement lablelTotalAmountBorrowedOnContractDetailsPage => Driver.FindElement(By.XPath("//p[contains(text(),' Total Amount Borrowed ')]//child::span"));
        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");

        By dropdownOptionsLocator = By.XPath("//span[contains(text(),'Completed')]//parent::li");



        public void ClickOnNextButton()
        {
            clickOnNextButton.Click();
            WaitTillTheLoadSpinnerDisappears();
            //Thread.Sleep(5000);
            ReportingManager.LogPass("Dealer clicked on next button in customer details page.");
        }
        public void AdditionalApprovalConditionStatus(string value)
        {
            ScrollAndClickElement(labelPaymentSummary);
            int i = 1; // XPath indexes start from 1
                       // int j = i + 1;

            while (true)
            {
                try
                {
                    // Find the dropdown and OK button using XPath index
                    Thread.Sleep(500);
                    IWebElement dropdownele = Driver.FindElement(By.XPath($"(//div[@class='haulerSourceBody']//div[@class='p-dropdown p-component p-inputwrapper p-inputwrapper-filled']/span)[{i}]"));
                    Thread.Sleep(500);
                    dropdown.SelectCustomDropdown(dropdownele, value, optionsLocator);
                    WaitTillTheLoadSpinnerDisappears();
                    Thread.Sleep(500);
                }
                catch (NoSuchElementException)
                {
                    // Stop the loop when there are no more dropdowns
                    break;
                }
            }

            string product = ScenarioContext.Current["Product"].ToString();

            if (product == "Operating Lease")
            {
                EntreResidualValueRequest("Completed");
            }
        }
        public void ValidateContractIdIsGenerated()
        {
            string contractId = contractIdElement.Text.Trim();
            Assert.That(contractId, Is.Not.Null.Or.Empty, "Contract ID was not generated.");
            ReportingManager.LogPass($" Contract ID Generated: {contractId}");
        }
        public void ValidateApplicationSubmittedStatus(string status = "")
        {
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            wait.Until(drv => StatusElement.Displayed);  // Wait until the status appears

            string actualStatus = StatusElement.Text.Trim();
            string expectedStatus = status;

            if (actualStatus != expectedStatus)
            {
                ReportingManager.LogFail($"Expected status: '{expectedStatus}', but found: '{actualStatus}'");
            }
            else
            {
                ReportingManager.LogPass($"Status updated successfully. Expected: '{expectedStatus}', Actual: '{actualStatus}'");
                MoveToElement(StatusElement);
                ReportingManager.AddScreenshotToReport("Quote status captured.");
            }
            Assert.That(actualStatus, Is.EqualTo(expectedStatus), $"Expected status: '{expectedStatus}', but found: '{actualStatus}'");
        }


        public void EntreResidualValueRequest(string value)
        {
            ScrollAndClickElement(residualValueRequestButton);
            Thread.Sleep(500);
            WaitTillTheLoadSpinnerDisappears();
            Thread.Sleep(5000);
            uploadSpecificationandInvoiceButton.Click();
            Thread.Sleep(1000);
            uploadFile();
            nextStateDropdown.Click();
            Thread.Sleep(2000);
            rvAssessmentOption.Click();
            Thread.Sleep(1000);
            submitButton.Click();
            WaitTillTheLoadSpinnerDisappears();
            ScrollAndClickElement(residualValueRequestButton);
            WaitTillTheLoadSpinnerDisappears();
            Thread.Sleep(5000);
            uploadSpecificationandInvoiceButton.Click();
            Thread.Sleep(1000);
            uploadFile();

            int i = 1;

            while (true)
            {
                try
                {
                    // Find the dropdown and OK button using XPath index
                    Thread.Sleep(3000);
                    IWebElement dropdownele = Driver.FindElement(By.XPath($"(//span[contains(text(),'Pending')])[{i}]"));
                    Thread.Sleep(500);
                    dropdown.SelectCustomDropdown(dropdownele, value, dropdownOptionsLocator);
                    WaitTillTheLoadSpinnerDisappears();
                }
                catch (NoSuchElementException)
                {
                    // Stop the loop when there are no more dropdowns
                    break;
                }

            }
            nextStateDropdown.Click();
            Thread.Sleep(2000);
            rvAssessmentOption.Click();
            Thread.Sleep(1000);
            submitButton.Click();
            WaitTillTheLoadSpinnerDisappears();
        }

        public void uploadFile()
        {

            string projectRoot = Directory.GetParent(AppDomain.CurrentDomain.BaseDirectory).Parent.Parent.Parent.FullName;
            string filePath = Path.Combine(projectRoot, @"StepDefinitions\TestDataFiles\dummy.pdf");
            Thread.Sleep(1000);
            IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            js.ExecuteScript("document.querySelector('input[type=file]').style.display='block';");
            // Upload the file
            IWebElement fileInput = Driver.FindElement(By.CssSelector("input[type='file']"));
            fileInput.SendKeys(filePath);
            WaitTillTheLoadSpinnerDisappears();
        }

        public void VerifyContractSummaryDetails()
        {
            contractDetailsPageTab.Click();
            Thread.Sleep(5000);
            contractSummaryDetailsPageTab.Click();
            Thread.Sleep(5000);

        }

        public Dictionary<string, string> DetailsStandardSummary(string product)
        {
            var details = new Dictionary<string, string>
        {
        { "program", programDropdown.Text },
        { "product", productDropdown.Text },
        { "AssetCost", lablelAssetCostOnContractSummaryPage.Text },
        { "TotalAmountBorrowed", lablelTotalAmountBorrowedOnContractSummaryPage.Text },
        { "TermInMonths", labelInstallementFromPaymentSummary.Text },
        { "Markup", labelMarkup.Text },
        { "Contract Start Date", textboxContractStartDate.Text },

    };
            return details;
        }

        public void VerifycontractDetailsAndContractSummaryValue()
        {
            contractDetailsPageTab.Click();
            Thread.Sleep(3000);
            string contractDetailsProgramDrodown = programDropdown.Text;
            string contractDetailsProductDropdown = productDropdown.Text;
            string contractDetailsAssetCost = lablelAssetCostOnContractDetails.Text;
            string contractDetailsTotalAmountBorrowed = lablelTotalAmountBorrowedOnContractDetailsPage.Text;
            string contractDetialsTermInMonths= Driver.FindElement(By.XPath("//label[contains(text(),'Term (In Month)')]//following::input")).GetAttribute("value");
            string contractDetialsMarkup = Driver.FindElement(By.XPath("//label[contains(text(),'Markup')]//following::input")).GetAttribute("aria-valuenow");
            string contractDetialsContractStartDate = Driver.FindElement(By.XPath("//label[contains(text(),' Contract Start Date ')]//following::input")).GetAttribute("value");
            string contractDetialsFirstPaymentDate = Driver.FindElement(By.XPath("//label[contains(text(),' First Payment Date ')]//following::input")).GetAttribute("value");
            contractSummaryDetailsPageTab.Click();
            Thread.Sleep(3000);
            string contractSummaryProgramDrodown = programDropdown.Text;
            string contractSummaryProductDropdown = productDropdown.Text;
            string contractSummaryAssetCost = lablelAssetCostOnContractSummaryPage.Text;
            string contractSummaryTotalAmountBorrowed = lablelTotalAmountBorrowedOnContractSummaryPage.Text;
            string contractSummaryTermInMonths = Driver.FindElement(By.XPath("//label[contains(text(),'Term (In Month)')]//following::input")).GetAttribute("value");
            string contractSummaryMarkup = Driver.FindElement(By.XPath("//label[contains(text(),'Markup')]//following::input")).GetAttribute("aria-valuenow");
            string contractSummaryContractStartDate = Driver.FindElement(By.XPath("//label[contains(text(),' Contract Start Date ')]//following::input")).GetAttribute("value");
            string contractSummaryFirstPaymentDate = Driver.FindElement(By.XPath("//label[contains(text(),' First Payment Date ')]//following::input")).GetAttribute("value");

            if(contractDetailsProgramDrodown.Equals(contractSummaryProgramDrodown))
            {
                ReportingManager.LogPass("Program value of Contract Summary Page : "+ contractSummaryProgramDrodown + " and Contract Details Pages is Matched : "+ contractDetailsProgramDrodown);
            }
            else
            {
                ReportingManager.LogFail("Program value of Contract Summary Page : " + contractSummaryProgramDrodown + " and Contract Details Pages is not Matched : " + contractDetailsProgramDrodown);
            }

            if (contractDetailsProductDropdown.Equals(contractSummaryProductDropdown))
            {
                ReportingManager.LogPass("Product value of Contract Summary Page : " + contractSummaryProductDropdown + " and Contract Details Pages is Matched : " + contractDetailsProductDropdown);
            }
            else
            {
                ReportingManager.LogFail("Product value of Contract Summary Page : " + contractSummaryProductDropdown + " and Contract Details Pages is not Matched : " + contractDetailsProductDropdown);
            }

            if (contractDetailsAssetCost.Equals(contractSummaryAssetCost))
            {
                ReportingManager.LogPass("Asset Cost value of Contract Summary Page : " + contractSummaryAssetCost + " and Contract Details Pages is Matched : " + contractDetailsAssetCost);
            }
            else
            {
                ReportingManager.LogFail("Asset Cost of Contract Summary Page : " + contractSummaryAssetCost + " and Contract Details Pages is not Matched : " + contractDetailsAssetCost);
            }

            if (contractDetailsTotalAmountBorrowed.Equals(contractSummaryTotalAmountBorrowed))
            {
                ReportingManager.LogPass("Total Amount Borrowed value of Contract Summary Page : " + contractSummaryTotalAmountBorrowed + " and Contract Details Pages is Matched : " + contractDetailsTotalAmountBorrowed);
            }
            else
            {
                ReportingManager.LogFail("Total Amount Borrowed Value of Contract Summary Page : " + contractSummaryTotalAmountBorrowed + " and Contract Details Pages is not Matched : " + contractDetailsTotalAmountBorrowed);
            }

            if (contractDetialsTermInMonths.Equals(contractSummaryTermInMonths))
            {
                ReportingManager.LogPass("Term in Months value of Contract Summary Page : " + contractSummaryTermInMonths + " and Contract Details Pages is Matched : " + contractDetialsTermInMonths);
            }
            else
            {
                ReportingManager.LogFail("Term in Months Value of Contract Summary Page : " + contractSummaryTermInMonths + " and Contract Details Pages is not Matched : " + contractDetialsTermInMonths);
            }

            if (contractDetialsMarkup.Equals(contractSummaryMarkup))
            {
                ReportingManager.LogPass("Markup value of Contract Summary Page : " + contractSummaryMarkup + " and Contract Details Pages is Matched : " + contractDetialsMarkup);
            }
            else
            {
                ReportingManager.LogFail("Markup Value of Contract Summary Page : " + contractSummaryMarkup + " and Contract Details Pages is not Matched : " + contractDetialsMarkup);
            }


            if (contractDetialsContractStartDate.Equals(contractSummaryContractStartDate))
            {
                ReportingManager.LogPass("Contract Start Date value of Contract Summary Page : " + contractSummaryContractStartDate + " and Contract Details Pages is Matched : " + contractDetialsContractStartDate);
            }
            else
            {
                ReportingManager.LogFail("\"Contract Start Date Value of Contract Summary Page : " + contractSummaryContractStartDate + " and Contract Details Pages is not Matched : " + contractDetialsContractStartDate);
            }

            if (contractDetialsFirstPaymentDate.Equals(contractSummaryFirstPaymentDate))
            {
                ReportingManager.LogPass("First Payment Date value of Contract Summary Page : " + contractSummaryFirstPaymentDate + " and Contract Details Pages is Matched : " + contractDetialsFirstPaymentDate);
            }
            else
            {
                ReportingManager.LogFail("First Payment Date Value of Contract Summary Page : " + contractSummaryFirstPaymentDate + " and Contract Details Pages is not Matched : " + contractDetialsFirstPaymentDate);
            }
        }

        public void ValidateCustomerAddedOrNot()
        {
            bool isCustomerDisplay = labelCustomerOnContractSummaryPage.Displayed;

            if (isCustomerDisplay)
            {
                ReportingManager.LogPass("Cusotmer Added Sucesfully");
                ReportingManager.AddScreenshotToReport("Cusotmer Added Sucesfully");
            }
            else
            {
                ReportingManager.LogFail("Cusotmer not Added ");
                ReportingManager.AddScreenshotToReport("Cusotmer not Added.");
            }
            
        }

    }
}
