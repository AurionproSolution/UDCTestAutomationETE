using System;
using Navistar.Navistar.core;
using Navistar.Navistar.Pages.NfcPages;
using NUnit.Framework;
using Reqnroll;


namespace Navistar.StepDefinitions
{
    [Binding]
    public class CreateQuickQuoteStepDefinitions
    {
        private readonly PageObjectContainer _pageObjects;

        public CreateQuickQuoteStepDefinitions(PageObjectContainer pageObjects)
        {
            _pageObjects = pageObjects;
        }

        [Given(@"Login into the Portal")]
        public void GivenLoginIntoThePortal()
        {

            ReportingManager.LogInfo("Navigating to the login page.");
            //DriverContext.InitDriver();
            DriverContext.Driver.Navigate().GoToUrl("https://testnfcportal:81/authentication");

        }

        [When(@"Navigate to the Dashboard")]
        public void WhenNavigateToTheDashboard()
        {
            ReportingManager.LogInfo("Entering valid credentials.");
            _pageObjects.LoginPage.EnterUserName("testuser");
            _pageObjects.LoginPage.EnterPassword("password123");
            ReportingManager.AddScreenshotToReport("Loginpage");
            ReportingManager.LogInfo("Attempting login.");
            _pageObjects.LoginPage.ClickLoginButton();
            ReportingManager.LogPass("Navigated to the dashboard successfully");
        }

        [When(@"Click on the Create Quick Quote button")]
        public void WhenClickOnTheCreateQuickQuoteButton()
        {
            ReportingManager.LogInfo("Click on Create Quick Quote");
            ReportingManager.AddScreenshotToReport("Navigated to dashboard");
            _pageObjects.DashboardPage.ClickOnCreateQuickQuote();
        }

        [When(@"Navigate to the Quick Comparision screen'")]
        public void WhenNavigateToTheQuickComparisionScreen()
        {
            _pageObjects.QuickQuotePage.SelectProgramDropDown("Finance Leases Program");
            _pageObjects.QuickQuotePage.SelectProductDropdown("Finance Lease");
            _pageObjects.QuickQuotePage.SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            ReportingManager.AddScreenshotToReport("Entered program and product combination");
        }

        [When(@"Enter the data in all required field")]
        public void WhenEnterTheDataInAllRequiredField()
        {
            _pageObjects.QuickQuotePage.PurchasePrice(10000);
            _pageObjects.QuickQuotePage.FrequencyDropdown("Monthly");
            _pageObjects.QuickQuotePage.TermInMonths(24);
        }

        [When(@"click on the Calculate button")]
        public void WhenClickOnTheCalculateButton()
        {
            _pageObjects.QuickQuotePage.ClickOnCalcutateButton();
        }

        [Then(@"Quick Quote is generated")]
        public void ThenQuickQuoteIsGenerated()
        {
            ReportingManager.LogInfo("Quick quote is created successfully");
        }

        [Then(@"click on the Create Quote Button")]
        public void ThenClickOnTheCreateQuoteButton()
        {
            _pageObjects.QuickQuotePage.ClickOnCreateQuoteButton();
        }

        [Then(@"Navigate to the Standard Quick Quote")]
        public void ThenNavigateToTheStandardQuickQuote()
        {
            
        }
    }
}
