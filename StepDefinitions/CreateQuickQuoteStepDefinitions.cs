using System;
using Navistar.Navistar.core;
using Navistar.Navistar.Pages.NfcPages;
using TechTalk.SpecFlow;

namespace Navistar.StepDefinitions
{
    [Binding]
    public class CreateQuickQuoteStepDefinitions
    {
        private NFCLoginPage _loginPage;
        private DashboardPage _dashboardPage;
        private QuickQuotePage _quickQuotePage;

        [Given(@"Login into the Portal")]
        public void GivenLoginIntoThePortal()
        {
            
            ReportingManager.LogInfo("Navigating to the login page.");
            DriverContext.InitDriver();
            DriverContext.Driver.Navigate().GoToUrl("https://testnfcportal:81/authentication");
            _loginPage = new NFCLoginPage(DriverContext.Driver);
            _dashboardPage = new DashboardPage(DriverContext.Driver);
            _quickQuotePage = new QuickQuotePage(DriverContext.Driver);
        }

        [When(@"Navigate to the Dashboard")]
        public void WhenNavigateToTheDashboard()
        {
            ReportingManager.LogInfo("Entering valid credentials.");
            _loginPage.EnterUserName("testuser");
            _loginPage.EnterPassword("password123");
            ReportingManager.LogInfo("Attempting login.");
            _loginPage.ClickLoginButton();
            ReportingManager.LogPass("Navigated to the dashboard successfully");
        }

        [When(@"Click on the Create Quick Quote button")]
        public void WhenClickOnTheCreateQuickQuoteButton()
        {
            ReportingManager.LogInfo("Click on Create Quick Quote");
            _dashboardPage.ClickOnCreateQuickQuote();
        }

        [When(@"Navigate to the Quick Comparision screen'")]
        public void WhenNavigateToTheQuickComparisionScreen()
        {
            _quickQuotePage.SelectProgramDropDown("Finance Leases Program");
            _quickQuotePage.SelectProductDropdown("Finance Lease");
            _quickQuotePage.SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
        }

        [When(@"Enter the data in all required field")]
        public void WhenEnterTheDataInAllRequiredField()
        {
            _quickQuotePage.PurchasePrice("10,000.00");
            _quickQuotePage.Frequency("Monthly");
            _quickQuotePage.TermInMonths("24");
        }

        [When(@"click on the Calculate button")]
        public void WhenClickOnTheCalculateButton()
        {
            _quickQuotePage.CalcutateButton();
        }

        [Then(@"Quick Quote is generated")]
        public void ThenQuickQuoteIsGenerated()
        {
            
        }

        [Then(@"click on the Create Quote Button")]
        public void ThenClickOnTheCreateQuoteButton()
        {
           
        }

        [Then(@"Navigate to the Standard Quick Quote")]
        public void ThenNavigateToTheStandardQuickQuote()
        {
            
        }
    }
}
