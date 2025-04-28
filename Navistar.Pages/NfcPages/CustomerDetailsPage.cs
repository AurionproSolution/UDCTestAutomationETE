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
    public class CustomerDetailsPage : BasePage
    {
        public CustomerDetailsPage(WebDriver driver) : base(driver)
        {
        }
        private IWebElement addContractPartiesButton => Find(By.XPath("//span[normalize-space()='Add Contract Parties']"));
        private IWebElement uploadDocumentsTab => Find(By.XPath("//label[normalize-space()='Uploaded Documents']"));
        private IWebElement generatedDocumentsTab => Find(By.XPath("//label[normalize-space()='Generated Documents']"));
        private IWebElement clickOnNextButton => Find(By.XPath("//span[text()='Next']"));
        private IWebElement contractIdElement => Find(By.XPath("//label[text()=' Contract ID  ']/following-sibling::div/span"));
        public void ClickOnAddContractPartiesButton()
        {
            WaitTillTheLoadSpinnerDisappears(); 
            addContractPartiesButton.Click();
            ReportingManager.LogPass("Dealer clicked on Add Contract Parties Button.");
        }
        public void ClickOnUploadDocumentsTab()
        {
            uploadDocumentsTab.Click();
            ReportingManager.LogPass("Dealer clicked on Upload Document Tab.");
        }
        public void ClickOnGeneratedDocumentsTab()
        {
            generatedDocumentsTab.Click();
            ReportingManager.LogPass("Dealer clicked on Generated Document Tab.");
        }
        public void ClickOnNextButton()
        {
            clickOnNextButton.Click();
            ReportingManager.LogPass("Dealer clicked on next button in customer details page.");
        }
        public void ValidateContractIdIsGenerated()
        {
            string contractId = contractIdElement.Text.Trim();
            Assert.That(contractId, Is.Not.Null.Or.Empty, "Contract ID was not generated.");
            ReportingManager.LogPass($" Contract ID Generated: {contractId}");
        }
    }
}
