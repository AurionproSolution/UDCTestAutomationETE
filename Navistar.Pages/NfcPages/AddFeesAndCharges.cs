using OpenQA.Selenium;
using Reqnroll.Assist;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Navistar.Navistar.Pages.NfcPages
{
    public class AddFeesAndChargesPage : BasePage
    {
        public AddFeesAndChargesPage(WebDriver driver) : base(driver)
        {
        }
        private IWebElement textboxEntreExtendedServiceContracts => Find(By.XPath("//label[contains(text(),' Extended Service Contracts ')]//following::input"));
        private IWebElement textboxPreventativeMaintenance => Find(By.XPath("//label[contains(text(),' Preventative Maintenance ')]//following::input"));
        private IWebElement textboxTitlingLienOther => Find(By.XPath("//label[contains(text(),' Titling/Lien/Other (Dealer) ')]//following::input"));
        private IWebElement AddButton => Find(By.XPath("//span[contains(text(),'ADD')]"));

        private IWebElement labelTotalFeesAndCharges => Find(By.XPath("//label[contains(text(),'Total Fees and Charges ')]//following-sibling::label"));

        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");
        public void EntreExtendedServiceContractsTextbox(string value)
        {
            Thread.Sleep(500);
            textboxEntreExtendedServiceContracts.SendKeys(value);
        }

        public void PreventativeMaintenanceTextbox(string value)
        {
            Thread.Sleep(500);
            textboxPreventativeMaintenance.SendKeys(value);
        }

        public void TitlingLienOtherTextboxDealer(string value)
        {
            Thread.Sleep(500);
            textboxTitlingLienOther.SendKeys(value);
        }

        public void clickonAddButton()
        {
            Thread.Sleep(500);
            AddButton.Click();
        }

        public  string GetTotalFeesAndCharges()
        {
            string labelAddFessandCharges = labelTotalFeesAndCharges.Text;
            return labelAddFessandCharges;
            Thread.Sleep(500);
        }

    }
}