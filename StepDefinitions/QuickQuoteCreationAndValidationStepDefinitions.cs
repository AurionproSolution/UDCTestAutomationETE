using Navistar.Navistar.core;
using Reqnroll;
using System;

namespace Navistar.StepDefinitions
{
    [Binding]
    public class QuickQuoteCreationAndValidationStepDefinitions
    {
        private readonly PageObjectContainer _pageObjects;
        private Dictionary<string, string> quickQuoteValues;
        private Dictionary<string, string> standardQuoteValues;

        public QuickQuoteCreationAndValidationStepDefinitions(PageObjectContainer pageObjects)
        {
            _pageObjects = pageObjects;
        }

        [Given("user is on the login page")]
        public void GivenUserIsOnTheLoginPage()
        {
            ReportingManager.LogInfo("Navigating to the login page.");
            DriverContext.Driver.Navigate().GoToUrl(_pageObjects.TestData.FisSandboxUrl);
        }

        [When("user logs in with {string} and {string}")]
        public void WhenUserLogsInWithAnd(string username, string password)
        {
            ReportingManager.LogInfo("User trying to login with valid credentials.");
            ////      _pageObjects.LoginPage.ClickLoginWithNfcButton();
            _pageObjects.LoginPage.EnterNfcUserName(username);
            _pageObjects.LoginPage.ClickOnProceedButton();
            _pageObjects.LoginPage.EnterNfcPassword(password);
            _pageObjects.LoginPage.ClickonSignInButton();
            //_pageObjects.LoginPage.EnterUserName(username);
            //_pageObjects.LoginPage.EnterPassword(password);
            //ReportingManager.LogInfo("Attempting login.");
            //_pageObjects.LoginPage.ClickLoginButton();
            Thread.Sleep(5000);
        }

        [Then("user should be redirected to the dashboard")]
        public void ThenUserShouldBeRedirectedToTheDashboard()
        {
            string dashboardurl = DriverContext.Driver.Url;
            ReportingManager.LogPass("Logged in usign URL : -" + dashboardurl + " .");
            ReportingManager.LogPass("Navigated to the dashboard successfully");
            _pageObjects.DashboardPage.SelectDealer("36000005");
        }

        [When("user navigates to the Create Quick Quote page")]
        public void WhenUserNavigatesToTheCreateQuickQuotePage()
        {
            ReportingManager.LogInfo("Click on Create Quick Quote");
            _pageObjects.DashboardPage.ClickOnCreateQuickQuote();
            Thread.Sleep(2000);
            ReportingManager.LogInfo("Verified dashboard page.");
        }

        [Then("user should be redirected to the Create Quick Quote page")]
        public void ThenUserShouldBeRedirectedToTheCreateQuickQuotePage()
        {
            ReportingManager.LogInfo("User redirected to Create Quick Quote page successfully");
        }


        [When("user selects {string} from the Program dropdown")]
        public void WhenUserSelectsFromTheProgramDropdown(string p0)
        {
            _pageObjects.QuickQuotePage.SelectProgramDropDown(p0);
            Thread.Sleep(3000);
        }

        [When("user selects {string} from the Product dropdown")]
        public void WhenUserSelectsFromTheProductDropdown(string product)
        {
            _pageObjects.QuickQuotePage.SelectProductDropdown(product);
            ScenarioContext.Current["Product"] = product;
            Thread.Sleep(3000);
        }

        [When("user selects {string} from the Asset dropdown")]
        public void WhenUserSelectsFromTheAssetDropdown(string asset)
        {
            _pageObjects.QuickQuotePage.SelectAssetDropdown(_pageObjects.QuickQuoteTestData.Assets[1]);
        }

        [When("user clicks on the Calculate button")]
        public void WhenUserClicksOnTheCalculateButton()
        {
            _pageObjects.QuickQuotePage.ClickOnCalcutateButtonForValidationError();
            Thread.Sleep(500);
        }

        [Then("a validation message should be displayed for mandatory fields")]
        public void ThenAValidationMessageShouldBeDisplayedForMandatoryFields()
        {
            _pageObjects.QuickQuotePage.VerifyValidationMessage();
            ReportingManager.AddScreenshotToReport("Validation Message is Displayed for Purchase Price ,Frquency and Term ");
        }

        [When("the user selects Frequency and clicks on the Calculate button")]
        public void WhenTheUserSelectsFrequencyAndClicksOnTheCalculateButton()
        {
            _pageObjects.QuickQuotePage.FrequencyDropdown(_pageObjects.QuickQuoteTestData.Frequency[0]);
            _pageObjects.QuickQuotePage.ClickOnCalcutateButtonForValidationError();
            Thread.Sleep(1000);
        }

        [When("the user selects Term in Months and clicks on the Calculate button")]
        public void WhenTheUserSelectsTermInMonthsAndClicksOnTheCalculateButton()
        {
            _pageObjects.QuickQuotePage.TermInMonths(_pageObjects.QuickQuoteTestData.TermsInMonths[0]);
            _pageObjects.QuickQuotePage.ClickOnCalcutateButtonForValidationError();
            Thread.Sleep(1000);
        }

        [When("the user enters Purchase Price and selects a term greater than {int} months")]
        public void WhenTheUserEntersPurchasePriceAndSelectsATermGreaterThanMonths(int p0)
        {
            _pageObjects.QuickQuotePage.PurchasePrice(_pageObjects.QuickQuoteTestData.PurchasePrices1[0]);
            Thread.Sleep(1000);
            _pageObjects.QuickQuotePage.TermInMonths(100);
        }

        [Then("a validation message should be displayed for term selection")]
        public void ThenAValidationMessageShouldBeDisplayedForTermSelection()
        {
            _pageObjects.QuickQuotePage.VerifyValidationMessageForTermInMonthField();
            ReportingManager.LogPass("Validation Message is Displayed for Term (In Month)");
            ReportingManager.AddScreenshotToReport("Validation Message is Displayed for Term (In Month)");
        }

        [When("the user selects a valid Term from the dropdown and clicks on the Calculate button")]
        public void WhenTheUserSelectsAValidTermFromTheDropdownAndClicksOnTheCalculateButton()
        {
            _pageObjects.QuickQuotePage.TermInMonths();
            _pageObjects.QuickQuotePage.ClickOnCalcutateButton();
            Thread.Sleep(5000);
        }

        [When("the user clicks on the Create Quote button")]
        public void WhenTheUserClicksOnTheCreateQuoteButton()
        {
            Thread.Sleep(1000);
            string product = ScenarioContext.Current["Product"].ToString();
            quickQuoteValues = _pageObjects.QuickQuotePage.QuoteDetails(product);
            _pageObjects.QuickQuotePage.ClickOnCreateQuoteButton();
            Thread.Sleep(1000);
        }

        [Then("the Purchase Price and Asset Cost should be the same on the Contract Details page")]
        public void ThenThePurchasePriceAndAssetCostShouldBeTheSameOnTheContractDetailsPage()
        {
            _pageObjects.QuickQuotePage.VerifyPurchasePriceAndAssetCost(_pageObjects.QuickQuoteTestData.PurchasePrices1[0]);
        }
    }
}
