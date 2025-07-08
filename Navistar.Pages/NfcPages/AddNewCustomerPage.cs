using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading.Tasks;
using Navistar.Navistar.core;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using SeleniumExtras.WaitHelpers;

namespace Navistar.Navistar.Pages.NfcPages
{
    public class AddNewCustomerPage : BasePage
    {
        private AddressPage addressPage;
        public AddNewCustomerPage(WebDriver driver) : base(driver)
        {
            addressPage = new AddressPage(driver);
        }
        private IWebElement classificationRole => Find(By.XPath("//span[@aria-label='Individual']"));
        private IWebElement enterFirstName => Find(By.XPath("//label[text()='First Name ']/following-sibling::span/input"));
        private IWebElement enterMiddleName => Find(By.XPath("//label[text()='Middle Name ']/following-sibling::span/input"));
        private IWebElement enterLastName => Find(By.XPath("//label[text()='Last Name ']/following-sibling::span/input"));
        private IWebElement enterEmailAddress => Find(By.XPath("//label[text()='Email ']/following-sibling::span/input"));
        private IWebElement enterDateOfBirth => Find(By.XPath("//label[text()=' Date Of Birth ']/following-sibling::p-calendar//span/input"));
        private IWebElement enterSocialSecurityNo => Find(By.XPath("//label[text()='Social Security No. ']/following-sibling::span/input"));
        private IWebElement selectEntityTypeDropdown => Find(By.XPath("//label[text()='Entity Type']/following-sibling::p-dropdown//div[@role='button']"));
        private IWebElement selectVocationDropdown => Find(By.XPath("//label[text()='Vocation']/following-sibling::p-dropdown//div[@role='button']"));
        private IWebElement enterFleetSize => Find(By.XPath("//label[text()='# Fleet Size ']/following-sibling::span/input"));
        private IWebElement enterClassification => Find(By.XPath("//label[text()='Classification ']/following-sibling::span//input"));
        private IWebElement selectPriorBankruptcyDropdown => Find(By.XPath("//label[text()='Prior Bankruptcy']/following-sibling::p-dropdown//div[@role='button']"));
        private IWebElement selectPriorRepossesionDropdown => Find(By.XPath("//label[text()='Prior Repossession']/following-sibling::p-dropdown//div[@role='button']"));
        private IWebElement selectGrossAnnaulDropdown => Find(By.XPath("//label[text()='Pr.FY.Gross Annual Rev.>$5M']/following-sibling::p-dropdown//div[@role='button']"));
        private IWebElement enterBusinessOwnerOpenSinceCalendar => Find(By.XPath("//label[text()=' Business/Owner Oper. Since ']/following-sibling::p-calendar//span/input"));
        private IWebElement enterCommercialDrLicense => Find(By.XPath("//label[text()='Commercial Dr.License # ']/following-sibling::span//input"));
        private IWebElement addAddressManually => Find(By.XPath("//span[text()='ADD ADDRESS MANUALLY']"));
        private IWebElement enterFromDate => Find(By.XPath("//p-calendar[@formcontrolname='effectDtFrom']//input"));
        private IWebElement clickOnNextButton => Find(By.XPath("//span[text()='Next']"));
        private IWebElement clickOnSubmitButton => Find(By.XPath("//span[text()='Submit']"));
        private IWebElement enterName => Find(By.XPath("//label[text()='Name ']/following-sibling::span/input"));
        private IWebElement enterTaxRegistrationNo => Find(By.XPath("//label[text()='Tax Registration No ']/following-sibling::span/input"));
        private IWebElement enterPhone => Find(By.XPath("//label[text()=' Phone ']/following-sibling::p-inputmask/input"));
        private IWebElement enterEmail => Find(By.XPath("//label[text()='Email ']/following-sibling::span/input"));
        private IWebElement enterEstablishedDateCalendar => Find(By.XPath("//label[text()='Established Date']/following-sibling::p-calendar//span/input"));

        private IWebElement clickOnSaveButton => Find(By.XPath("//span[text()='Save']"));

        private IWebElement fromDate => Find(By.XPath("//span[@data-date='2020-0-15' ]"));
        private IWebElement customerRoleDropdown => Find(By.XPath("//label[contains(text(),'Customer Role ')]//following::div[@class='p-dropdown-trigger']"));
        private IWebElement subLeaseOption => Find(By.XPath("//span[contains(text(),'Sub-Lessee')]"));


        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");
        public void EnterFirstName(string value)
        {
            enterFirstName.SendKeys(value);
            ReportingManager.LogPass("Dealer entered First name as " + value + ".");
        }
        public void SelectClassificationRole(string value)
        {
            Thread.Sleep(3500);
            dropdown.SelectCustomDropdown(classificationRole, value, optionsLocator);
        }
        public void EnterMiddleName(string value)
        {
            enterMiddleName.SendKeys(value);
            ReportingManager.LogPass("Dealer entered middle name as " + value + ".");
        }
        public void EnterLastName(string value)
        {
            enterLastName.SendKeys(value);
            ReportingManager.LogPass("Dealer entered last name as " + value + ".");
        }
        public void EnterEmailAddress(string value)
        {
            enterEmailAddress.SendKeys(value);
            ReportingManager.LogPass("Dealer entered Email address as " + value + ".");
        }
        public void EnterDateOfBirth(string value)
        {
            enterDateOfBirth.SendKeys(value);
            enterDateOfBirth.SendKeys(Keys.Enter);
            ReportingManager.LogPass("Dealer entered date of birth as " + value + ".");
        }
        public void EnterSocialSecurityNo(string value)
        {
            enterSocialSecurityNo.SendKeys(value);
            ReportingManager.LogPass("Dealer entered Social Security No as " + value + ".");
        }
        public void SelectVocationDropdown(string value)
        {
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(15));
            wait.Until(ExpectedConditions.InvisibilityOfElementLocated(By.CssSelector(".p-progressspinner")));

            //Thread.Sleep(2000);
            MoveToElement(enterClassification);
            SetImplicitWait(15);
            dropdown.SelectCustomDropdown(selectVocationDropdown, value, optionsLocator);
        }
        public void EnterFleetSize(int value)
        {
            enterFleetSize.SendKeys(value.ToString());
            ReportingManager.LogPass("Dealer entered Fleet size as " + value + ".");
        }
        public void SelectPriorBankrupcyDropdown(string value)
        {
            Thread.Sleep(1000);
            MoveToElement(selectPriorBankruptcyDropdown);
            dropdown.SelectCustomDropdown(selectPriorBankruptcyDropdown, value, optionsLocator);
        }
        public void SelectPriorRepossessionDropdown(string value)
        {
            Thread.Sleep(500);
            dropdown.SelectCustomDropdown(selectPriorRepossesionDropdown, value, optionsLocator);
        }
        public void SelectGrossAnnaulDropdown(string value)
        {
            Thread.Sleep(500);
            dropdown.SelectCustomDropdown(selectGrossAnnaulDropdown, value, optionsLocator);
        }

        public void EnterBusinessOwnerOpenSince(string value)
        {
            enterBusinessOwnerOpenSinceCalendar.SendKeys(value);
            enterBusinessOwnerOpenSinceCalendar.SendKeys(Keys.Enter);
            ReportingManager.LogPass("Dealer entered Business owner open since as " + value + ".");
        }
        public void EnterCommercialDrLicense(string value)
        {
            enterCommercialDrLicense.SendKeys(value);
            ReportingManager.LogPass("Dealer entered Business owner open since as " + value + ".");
        }
        public void ClickOnAddAddressManually()
        {
            Thread.Sleep(500);
            ScrollAndClickElement(addAddressManually);
            ReportingManager.LogPass("Dealer clicked on Add Address Manually button.");
        }
        public void EnterFromDate(string date)
        {
            enterFromDate.SendKeys(date);
            ReportingManager.LogPass("Dealer entered date of birth as " + date + ".");
        }
        public void ClickOnNextButton()
        {
            clickOnNextButton.Click();
            WaitTillTheLoadSpinnerDisappears();
            //Thread.Sleep(20000);
        }
        public void ClickOnSubmitButton()
        {
            clickOnSubmitButton.Click();
            WaitTillTheLoadSpinnerDisappears();
        }
        public void SelectEntityTypeDropdown(string value)
        {
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            wait.Until(ExpectedConditions.InvisibilityOfElementLocated(By.CssSelector(".p-progressspinner")));

            dropdown.SelectCustomDropdown(selectEntityTypeDropdown, value, optionsLocator);
        }
        public void EnterName(string value)
        {
            enterName.SendKeys(value);
            ReportingManager.LogPass("Dealer entered name as " + value + ".");
        }
        public void EnterTaxRegistrationNo(string value)
        {
            enterTaxRegistrationNo.SendKeys(value);
            ReportingManager.LogPass("Dealer entered Tax registration No as " + value + ".");
        }
        public void EnterEstablishedDateCalendar(string value)
        {
            enterEstablishedDateCalendar.SendKeys(value);
            enterEstablishedDateCalendar.SendKeys(Keys.Enter);
            ReportingManager.LogPass("Dealer entered Established Date Calendar as " + value + ".");
        }
        public void EnterPhone(string value)
        {
            IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            js.ExecuteScript("arguments[0].value = arguments[1];", enterPhone, value);
            enterPhone.SendKeys(Keys.Enter);
            ReportingManager.LogPass("Dealer entered name as " + value + ".");
        }
        public void EnterEmail(string value)
        {
            enterEmail.SendKeys(value);
            ReportingManager.LogPass("Dealer entered name as " + value + ".");
        }
        public void AddNewIndividualCustomer(string customerName)
        {
            ReportingManager.LogInfo("Dealer adding New customer or party.");
            EnterFirstName(customerName);
            EnterMiddleName("I");
            EnterLastName("Doe");
            EnterEmailAddress("Johndoe@gmail.com");
            EnterPhone("+1 (234) 567 8912"); 
            EnterDateOfBirth("01/01/1996");
            EnterSocialSecurityNo("919782968");
            SelectVocationDropdown("Agriculture");
            EnterFleetSize(1234);
            SelectPriorBankrupcyDropdown("No");
            SelectPriorRepossessionDropdown("No");
            SelectGrossAnnaulDropdown("No");
            EnterBusinessOwnerOpenSince("02/08/2022");
            EnterCommercialDrLicense("123456789");
            //ClickOnAddAddressManually();
            addressPage.AddAddress();
            EnterFromDate("01/15/2020");
            clickOnDate();
            Thread.Sleep(1000);
            ClickOnNextButton();
            Thread.Sleep(1000);
            ClickOnSubmitButton();
            Thread.Sleep(5000);
        }
        public void AddNewBusinessCustomer()
        {
            ReportingManager.LogInfo("Dealer adding New customer or party.");
            SelectClassificationRole("Business");
            SelectEntityTypeDropdown("None");
            EnterName("Peter");
            EnterTaxRegistrationNo("123456789");
            EnterEstablishedDateCalendar("01/05/2009");
            EnterPhone("12345678910");
            EnterEmail("peter@gmail.com");
            SelectVocationDropdown("Agriculture");
            EnterFleetSize(1234);
            SelectPriorBankrupcyDropdown("No");
            SelectPriorRepossessionDropdown("No");
            SelectGrossAnnaulDropdown("No");
            EnterBusinessOwnerOpenSince("02/08/2022");
            EnterCommercialDrLicense("123456789");
            ClickOnAddAddressManually();
            addressPage.AddAddress();
        }

        public void ClickOnSaveButton()
        {
            clickOnSaveButton.Click();
            WaitTillTheLoadSpinnerDisappears();
            Thread.Sleep(10000);
        }

        public void clickOnDate()
        {
            Thread.Sleep(1000);
            fromDate.Click();

        }

        public void CustomerRole()
        {
            customerRoleDropdown.Click();
            Thread.Sleep(1000);
            subLeaseOption.Click();
            Thread.Sleep(1000);
        }
    }
}
