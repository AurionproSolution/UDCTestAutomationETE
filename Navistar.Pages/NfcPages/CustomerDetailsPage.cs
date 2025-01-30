using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Navistar.Navistar.core;
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
        
        public void ClickOnAddContractPartiesButton()
        {
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

    }
}
