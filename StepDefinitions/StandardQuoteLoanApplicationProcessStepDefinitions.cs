using System;
using Navistar.Navistar.core;
using Navistar.Navistar.Pages.NfcPages;
using TechTalk.SpecFlow;

namespace Navistar.StepDefinitions
{
    [Binding]
    public class StandardQuoteLoanApplicationProcessStepDefinitions
    {
        private NFCLoginPage _loginPage;
        private DashboardPage _dashboardPage;
        private ContractDetailsPage _contractDetailsPage;
        private AssetSummeryPage _assetSummeryPage;
        private CustomerDetailsPage _customerDetailsPage;
        private SearchCustomerPage _searchCustomerPage;

        [Given(@"Dealer navigates to the Login page using a URL")]
        public void GivenDealerNavigatesToTheLoginPageUsingAURL()
        {
            ReportingManager.LogInfo("Navigating to the login page.");
            DriverContext.InitDriver();
            DriverContext.Driver.Navigate().GoToUrl("https://testnfcportal:81/authentication");
            _loginPage = new NFCLoginPage(DriverContext.Driver);
            _dashboardPage = new DashboardPage(DriverContext.Driver);
            _contractDetailsPage = new ContractDetailsPage(DriverContext.Driver);
            _assetSummeryPage = new AssetSummeryPage(DriverContext.Driver);
            _customerDetailsPage = new CustomerDetailsPage(DriverContext.Driver);
            _searchCustomerPage = new SearchCustomerPage(DriverContext.Driver);
        }

        [When(@"Dealer enters valid credentials")]
        public void WhenDealerEntersValidCredentials()
        {
            ReportingManager.LogInfo("Entering valid credentials.");
            _loginPage.EnterUserName("testuser");
            _loginPage.EnterPassword("password123");
        }

        [Then(@"Dealer successfully logs in and is redirected to the Dashboard")]
        public void ThenDealerSuccessfullyLogsInAndIsRedirectedToTheDashboard()
        {
            ReportingManager.LogInfo("Attempting login.");
            _loginPage.ClickLoginButton();
            ReportingManager.LogPass("Navigated to the dashboard successfully");
        }

        [When(@"Dealer clicks on Standard Quote and navigates to the Contract Details page")]
        public void WhenDealerClicksOnStandardQuoteAndNavigatesToTheContractDetailsPage()
        {
            ReportingManager.LogInfo("Click on Create Standard Quote");
            _dashboardPage.ClickOnCreateStandardQuote();
        }

        [When(@"Dealer clicks on Asset Summary, adds an asset, and saves it")]
        public void WhenDealerClicksOnAssetSummaryAddsAnAssetAndSavesIt()
        {
            _contractDetailsPage.SelectProgramDropDown("Finance Leases Program");
            _contractDetailsPage.SelectProductDropdown("Finance Lease");
            _contractDetailsPage.SelectTermsInMonthDropdown("12");
            _contractDetailsPage.SelectFrequencyDropdown("Monthly");
            _contractDetailsPage.EnterDaysToFirstPayment("31");
            _contractDetailsPage.ClickOnAssetSummery();
            _assetSummeryPage.AddAsset();
        }

        [When(@"Dealer clicks on Next after filling in all required fields")]
        public void WhenDealerClicksOnNextAfterFillingInAllRequiredFields()
        {
            _contractDetailsPage.ClickOnNextButton();
        }

        [Then(@"Dealer navigates to the Customer page")]
        public void ThenDealerNavigatesToTheCustomerPage()
        {
            _customerDetailsPage.ClickOnAddContractPartiesButton();
            _searchCustomerPage.AddNewCustomer();
        }

        [Then(@"Validates that a Contract ID is generated")]
        public void ThenValidatesThatAContractIDIsGenerated()
        {
            throw new PendingStepException();
        }

        [Then(@"Fills in the required fields, adds Customer Parties, and saves Customer details")]
        public void ThenFillsInTheRequiredFieldsAddsCustomerPartiesAndSavesCustomerDetails()
        {
            throw new PendingStepException();
        }

        [When(@"Dealer navigates to the Customer Summary page")]
        public void WhenDealerNavigatesToTheCustomerSummaryPage()
        {
            throw new PendingStepException();
        }

        [When(@"Clicks on Next")]
        public void WhenClicksOnNext()
        {
            throw new PendingStepException();
        }

        [Then(@"The contract status should change to Application Submitted")]
        public void ThenTheContractStatusShouldChangeToApplicationSubmitted()
        {
            throw new PendingStepException();
        }

        [When(@"Dealer navigates to the Dashboard page")]
        public void WhenDealerNavigatesToTheDashboardPage()
        {
            throw new PendingStepException();
        }

        [When(@"Searches using the Contract ID")]
        public void WhenSearchesUsingTheContractID()
        {
            throw new PendingStepException();
        }

        [Then(@"The contract status should be Application Submitted")]
        public void ThenTheContractStatusShouldBeApplicationSubmitted()
        {
            throw new PendingStepException();
        }
    }
}
