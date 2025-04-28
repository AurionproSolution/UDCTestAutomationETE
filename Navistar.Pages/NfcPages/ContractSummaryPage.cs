using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Navistar.Navistar.core;
using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Navistar.Navistar.Pages.NfcPages
{
    public class ContractSummaryPage : BasePage
    {
        public ContractSummaryPage(WebDriver driver) : base(driver)
        {
        }
        private IWebElement clickOnNextButton => Find(By.XPath("//span[text()='Next']"));
        private IWebElement contractIdElement => Find(By.XPath("//label[text()=' Contract ID  ']/following-sibling::div/span"));
        private IWebElement StatusElement => Driver.FindElement(By.XPath("//div[@class='status-container']/span"));

        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");
        public void ClickOnNextButton()
        {
            clickOnNextButton.Click();
            WaitTillTheLoadSpinnerDisappears();
            //Thread.Sleep(5000);
            ReportingManager.LogPass("Dealer clicked on next button in customer details page.");
        }
        public void AdditionalApprovalConditionStatus(string value)
        {
            int i = 1; // XPath indexes start from 1
            int j = i + 1;

            while (true)
            {
                try
                {
                    // Find the dropdown and OK button using XPath index
                    IWebElement dropdownele = Driver.FindElement(By.XPath($"(//div[@class='haulerSourceBody']//div[@class='p-dropdown p-component p-inputwrapper p-inputwrapper-filled']/span)[{i}]"));
                    IWebElement okButton = Driver.FindElement(By.XPath($"(//span[text()='OK'])[ {j} ]"));

                    MoveToElement(okButton);
                    dropdown.SelectCustomDropdown(dropdownele, value, optionsLocator);
                    Thread.Sleep(300);
                    okButton.Click();
                    Thread.Sleep(500);

                    i++; // Move to the next dropdown and button
                    j++;
                }
                catch (NoSuchElementException)
                {
                    // Stop the loop when there are no more dropdowns
                    break;
                }
            }
        }
        public void ValidateContractIdIsGenerated()
        {
            string contractId = contractIdElement.Text.Trim();
            Assert.That(contractId, Is.Not.Null.Or.Empty, "Contract ID was not generated.");
            ReportingManager.LogPass($" Contract ID Generated: {contractId}");
        }
        public void ValidateApplicationSubmittedStatus()
        {
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            wait.Until(drv => StatusElement.Displayed);  // Wait until the status appears

            string actualStatus = StatusElement.Text.Trim();
            string expectedStatus = "Status : Application Submitted";

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
    }
}
