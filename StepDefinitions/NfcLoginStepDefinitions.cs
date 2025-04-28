using Navistar.Navistar.core;
using Navistar.Navistar.Pages.NfcPages;
using Reqnroll;
using System;

namespace Navistar.StepDefinitions
{
    [Binding]
    public class NfcLoginStepDefinitions
    {
        private NFCLoginPage _loginPage;
        private DashboardPage _dashboardPage;
        private QuickQuotePage _quickQuotePage;

        [Given(@"I navigate to the login page")]
        public void GivenINavigateToTheLoginPage()
        {
            ReportingManager.LogInfo("Navigating to the login page.");
            //DriverContext.InitDriver("edge");
            DriverContext.Driver.Navigate().GoToUrl("https://testnfcportal:81/authentication");
            _loginPage = new NFCLoginPage(DriverContext.Driver);
            _dashboardPage = new DashboardPage(DriverContext.Driver);
            _quickQuotePage = new QuickQuotePage(DriverContext.Driver);
        }

        [When(@"I enter valid credentials")]
        public void WhenIEnterValidCredentials()
        {
            ReportingManager.LogInfo("Entering valid credentials.");
            _loginPage.EnterUserName("testuser");
            _loginPage.EnterPassword("password123");
        }

        [Then(@"I should be logged in successfully")]
        public void ThenIShouldBeLoggedInSuccessfully()
        {
            ReportingManager.LogInfo("Attempting login.");
            _loginPage.ClickLoginButton();
            _dashboardPage.ClickOnCreateQuickQuote();
            _quickQuotePage.SelectProgramDropDown("Finance Leases Program");
            _quickQuotePage.SelectProductDropdown("Finance Lease");
            _quickQuotePage.SelectAssetDropdown("LT Series/International/Heavy/Vehicles/All Asset Types");
            _quickQuotePage.PurchasePrice(10000);
            _quickQuotePage.FrequencyDropdown("Monthly");
            _quickQuotePage.TermInMonths(24);
            _quickQuotePage.ClickOnCalcutateButton();
            _quickQuotePage.ClickOnCreateQuoteButton();
        }
    }
}
