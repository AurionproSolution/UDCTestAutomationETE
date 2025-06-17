using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Navistar.Navistar.core;
using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using Reqnroll;

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
        private IWebElement labelPaymentSummary => Driver.FindElement(By.XPath("//p[contains(text(),' Total Amount Borrowed ')]"));
        private IWebElement residualValueRequestButton => Driver.FindElement(By.XPath("//span[contains(text(),'Residual Value Request')]//parent::button"));
        private IWebElement uploadSpecificationandInvoiceButton => Driver.FindElement(By.XPath("//span[contains(text(),'Upload')]//parent::span"));
        private IWebElement nextStateDropdown => Driver.FindElement(By.XPath("//p-dropdown[@id='nextState']//child::span"));
        private IWebElement rvAssessmentOption => Driver.FindElement(By.XPath("//span[contains(text(),'RV Assessment')]//parent::li"));
        private IWebElement submitButton => Driver.FindElement(By.XPath("//span[contains(text(),'Submit')]"));
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
                    Thread.Sleep(3000);
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

            if(product == "Operating Lease")
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
        public void ValidateApplicationSubmittedStatus(string status="")
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
    }
}
