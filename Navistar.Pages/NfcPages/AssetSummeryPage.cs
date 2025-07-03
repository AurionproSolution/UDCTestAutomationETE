using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Emit;
using System.Text;
using System.Threading.Tasks;
using Navistar.Navistar.core;
using OpenQA.Selenium;

using OpenQA.Selenium.Support.UI;
using SeleniumExtras.WaitHelpers;

namespace Navistar.Navistar.Pages.NfcPages
{
    public class AssetSummeryPage : BasePage
    {
        public AssetSummeryPage(WebDriver driver) : base(driver)
        {
        }
        private IWebElement vinSearchField => Find(By.XPath("//input[@placeholder=\"Enter VIN to Search\"]"));
        private IWebElement vinSearchButton => Find(By.XPath("//button[@class='p-ripple p-element p-button p-component p-button-icon-only']"));
        private IWebElement addAssetManuallyButton => Find(By.XPath("//p-button[@label='Add Asset Manually']//button[@type='button']"));
        private IWebElement assetEditButton => Find(By.XPath("//span[@class='p-button-icon fa-regular fa-pen ng-star-inserted']"));
        private IWebElement yearField => Find(By.XPath("//p-calendar[@view='year']//input"));
        private IWebElement newOrUserDropdown => Find(By.XPath("//p-dropdown[@formcontrolname='conditionOfGood']//span"));
        private IWebElement assetDropdown => Find(By.XPath("//p-dropdown[@formcontrolname='assetTypeId']//span"));
        private IWebElement categoryDropdown => Find(By.XPath("//p-dropdown[@formcontrolname='category']//span"));
        private IWebElement purchasePrice => Find(By.XPath("//p-inputnumber[@formcontrolname='cost']//input"));
        private IWebElement saveAsset => Find(By.XPath("//span[@class='p-button-icon ng-star-inserted fa-solid fa-check']"));
        private IWebElement deleteAsset => Find(By.XPath("//span[@class='p-button-icon fa-regular fa-trash-can ng-star-inserted']"));
        private IWebElement enterVIN => Find(By.XPath("//input[@formcontrolname='vin']"));
        private IWebElement enterOdometer => Find(By.XPath("//p-inputnumber[@formcontrolname='odometer']//input"));
        private IWebElement enterISCAmount => Find(By.XPath("//p-inputnumber[@formcontrolname='intServCountAmt']//input[@role='spinbutton']"));
        private IWebElement enterBodySerialNumber => Find(By.XPath("//input[@formcontrolname='bodySerialNumber']"));
        private IWebElement deleteVehicleDetailsButton => Find(By.XPath("//i[@class='fa-regular fa-trash-can']"));
        private IWebElement cancelButton => Find(By.XPath("//span[normalize-space()='CANCEL']"));
        private IWebElement saveButton => Find(By.XPath("//span[normalize-space()='SAVE']"));
        private IWebElement deleteButton => Find(By.XPath("//span[contains(@class, 'fa-trash-can')]"));
        private IWebElement searchBoxInput => Find(By.XPath("//input[@placeholder='Enter VIN to Search']"));
        private IWebElement searchButton => Find(By.XPath("//input[@placeholder='Enter VIN to Search']//following::button"));
        private IWebElement selectSearchAsset=> Find(By.XPath("//div[@class='p-radiobutton-box p-component']"));
        private IWebElement addButton => Find(By.XPath("//span[contains(text(),'ADD')]"));
        private IWebElement purchasePriceButtonValidationMessage => Find(By.XPath("//small[contains(text(),' This field is required.')]"));


        By optionsLocator = By.XPath("//p-dropdownitem[@class='p-element ng-star-inserted']");

        public void SearchByVinNo(string vinNo)
        {
            vinSearchField.SendKeys(vinNo);
            vinSearchButton.Click();
            ReportingManager.LogPass("User entered " + vinNo + " and clicked on search successfully");
        }
        public void ClickOnAddAssetManuallyButton()
        {
            Thread.Sleep(1000);
            SetImplicitWait(15);
            addAssetManuallyButton.Click();
            ReportingManager.LogPass("Clicked on Add Asset Manually Button.");
        }
        public void ClickOnAssetEditButton()
        {
            WebDriverWait wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(15));

            // 1️⃣ Wait for the assetEditButton to be visible and clickable
            var assetEditButtonElement = wait.Until(ExpectedConditions.ElementToBeClickable(By.XPath("//span[@class='p-button-icon fa-regular fa-pen ng-star-inserted']")));
            WaitTillTheLoadSpinnerDisappears(10);
            // 2️⃣ Try clicking directly
            try
            {
                assetEditButtonElement.Click();
                ReportingManager.LogPass("Clicked on Edit Asset Button");
            }
            catch (ElementClickInterceptedException)
            {
                // If click is intercepted, retry with JavaScript
                IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
                js.ExecuteScript("arguments[0].click();", assetEditButtonElement);
                ReportingManager.LogPass("Clicked on Edit Asset Button using JavaScript");
            }
            //assetEditButton.Click();
            //ReportingManager.LogPass("Clicked on Edit Asset Button");
        }
        public void SelectyearField(int year)
        {
            yearField.SendKeys(year.ToString());
            ReportingManager.LogPass("Entered " + year + " year in the field.");
        }
        public void SelectNewOrUsed(string value)
        {
            dropdown.SelectCustomDropdown(newOrUserDropdown, value, optionsLocator);
        }
        public void SelectAssetDropdown(String value)
        {
            dropdown.SelectCustomDropdown(assetDropdown, value, optionsLocator);
            ReportingManager.LogPass("Selected asset " + value + " from the dropdown.");
        }
        public void SelectCategory(String value)
        {
            Thread.Sleep(500);
            dropdown.SelectCustomDropdown(categoryDropdown, value, optionsLocator);
            ReportingManager.LogPass("Selected category" + value + " from the dropdown.");
        }
        public void EnterPurchasePriceValue(String value)
        {
            purchasePrice.Click();
            Thread.Sleep(500);
            IJavaScriptExecutor js = (IJavaScriptExecutor)Driver;
            js.ExecuteScript("arguments[0].value='"+ value + "';", purchasePrice);
            ReportingManager.LogPass("Entered purchase price value as " + value + ".");
        }
        public void SaveTheAsset()
        {
            saveAsset.Click();
            ReportingManager.LogPass("Dealer clicked on Save Asset Button");
        }
        public void EnterVinNumber(string value)
        {
            enterVIN.SendKeys(value);
        }
        public void EnterOdometer(int value)
        {
            enterOdometer.SendKeys(value.ToString());
            ReportingManager.LogPass("Entered Odometer value as " + value + ".");
        }
        public void ClickOnSaveButton()
        {
            saveButton.Click();
            WaitTillTheLoadSpinnerDisappears(10);
            ReportingManager.LogPass("Dealer clicked on Save button.");
        }
        public void AddAsset()
        {
            ClickOnAddAssetManuallyButton();
            ClickOnAssetEditButton();
            SelectyearField(2020);
            SelectNewOrUsed("Used");
            SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            SelectCategory("Day Cab");
            EnterPurchasePriceValue("11000");
            EnterOdometer(12345);
            SaveTheAsset();
            ClickOnSaveButton();
        }

        public void SearchVINNo(string value)
        {
           deleteButton.Click();
           Thread.Sleep(1000);
           searchBoxInput.SendKeys(value);
           Thread.Sleep(1000);
           searchButton.Click();
           WaitTillTheLoadSpinnerDisappears();
        }

        public void AddSearchAsset()
        {
            selectSearchAsset.Click();
            Thread.Sleep(1000);
            addButton.Click();
            Thread.Sleep(2000);
        }

        public void VerifyValidationMessageForPurchasePrice()
        {
            Thread.Sleep(1000);
            bool isErrorDisplay = purchasePriceButtonValidationMessage.Displayed;          
            if (isErrorDisplay) 
            {
                ReportingManager.LogPass("Error Message is displayed for Currency Purchase Price empty value");
                ReportingManager.AddScreenshotToReport("Error Message is displayed for Currency Purchase Price empty value");
            }
            else
            {
                ReportingManager.LogFail("Error Message is not displayed for Currency Purchase Price empty value");
            }
        }

        public void ClearPurchasePriceValue()
        {
            purchasePrice.Clear();
            Thread.Sleep(500);            
        }
    }
}
