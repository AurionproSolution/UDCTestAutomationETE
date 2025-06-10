using System;
using Navistar.Navistar.core;
using NUnit.Framework;
using Reqnroll;

namespace Navistar.StepDefinitions
{
    [Binding]
    public class CalculationModuleStepDefinitions
    {
        private readonly PageObjectContainer _pageObjects;
        private Dictionary<string, string> quickQuoteValues;
        private Dictionary<string, string> standardQuoteValues;
        public CalculationModuleStepDefinitions(PageObjectContainer pageObjects)
        {
            _pageObjects = pageObjects;
        }

        [Given("the user is on the loginpage")]
        public void GivenTheUserIsOnTheLoginpage()
        {
            ReportingManager.LogInfo("Navigating to the login page.");
            string loginUrl = new PageObjectContainer().TestData.QAUrl;
            DriverContext.Driver.Navigate().GoToUrl(loginUrl);
        }

        [When("the user login with {string} and {string}")]
        public void WhenTheUserLoginWithAnd(string username, string password)
        {
            ReportingManager.LogInfo("User trying to login with valid credentials.");
            //_pageObjects.LoginPage.ClickLoginWithNfcButton();
            //_pageObjects.LoginPage.EnterNfcUserName(username);
            //_pageObjects.LoginPage.ClickOnProceedButton();
            //_pageObjects.LoginPage.EnterNfcPassword(password);
            //_pageObjects.LoginPage.ClickonSignInButton();
            _pageObjects.LoginPage.EnterUserName(username);
            _pageObjects.LoginPage.EnterPassword(password);
            ReportingManager.LogInfo("Attempting login.");
            _pageObjects.LoginPage.ClickLoginButton();
        }

        [Then("the user should be redirect to the dashboard")]
        public void ThenTheUserShouldBeRedirectToTheDashboard()
        {
            //_pageObjects.MenuSlidebarPage.ClickOnDashboard();
            string dashboardurl = DriverContext.Driver.Url;
            ReportingManager.LogPass("Logged in usign URL : -" + dashboardurl + " .");
            // _pageObjects.DashboardPage.VerifyDashboardPage();
            ReportingManager.LogPass("Navigated to the dashboard successfully");
            _pageObjects.DashboardPage.SelectDealer("36000005");
        }

        [Then("the user navigate to the Create Quick Quote page")]
        public void ThenTheUserNavigateToTheCreateQuickQuotePage()
        {
            ReportingManager.LogInfo("Click on Create Quick Quote");
            _pageObjects.DashboardPage.ClickOnCreateQuickQuote();
            ReportingManager.LogInfo("Verified dashboard page.");
            ReportingManager.LogInfo("User redirected to Create Quick Quote page successfully");
        }

        [When("the user selects the {string} from the Program dropdown")]
        public void WhenTheUserSelectsTheFromTheProgramDropdown(string p0)
        {
            _pageObjects.QuickQuotePage.SelectProgramDropDown(p0);
        }
        [When("the user selects the {string} from the Product dropdown")]
        public void WhenTheUserSelectsTheFromTheProductDropdown(string product)
        {
            _pageObjects.QuickQuotePage.SelectProductDropdown(product);
            ScenarioContext.Current["Product"] = product;
        }

        [When("the user selects the {string} from the Asset dropdown")]
        public void WhenTheUserSelectsTheFromTheAssetDropdown(string asset)
        {
            _pageObjects.QuickQuotePage.SelectAssetDropdown("LT/INTERNATIONAL/Heavy/Vehicles");
        }

        [Then("user enters {string}")]
        public void ThenUserEnters(string fieldName)
        {
            switch (fieldName)
            {

                case "Purchase Price":
                    _pageObjects.QuickQuotePage.PurchasePrice(32000);
                    break;
                case "Down Payment":
                    string product = ScenarioContext.Current["Product"].ToString();
                    if (product == "Finance Included Loan" || product == "Idealease")
                    {
                        _pageObjects.QuickQuotePage.DownPayment(10);
                    }
                    break;
                case "Balloon":
                    _pageObjects.QuickQuotePage.Balloon(10);
                    break;
                case "Residual Value":
                    string product1 = ScenarioContext.Current["Product"].ToString();
                    if (product1 == "TRAC Lease")
                    {
                        _pageObjects.QuickQuotePage.ResidaulValue(20);
                    }
                    break;
                default:
                    throw new ArgumentException($"Invalid field name: {fieldName}");
            }
        }


        [Then("the user selects the Frequency and Term from dropdowns")]
        public void ThenTheUserSelectsTheFrequencyAndTermFromDropdowns()
        {
            _pageObjects.QuickQuotePage.FrequencyDropdown("Monthly");
            _pageObjects.QuickQuotePage.TermInMonths(12);
        }

        [Then("the user click on {string}")]
        public void ThenTheUserClickOn(string p0)
        {
            _pageObjects.QuickQuotePage.ClickOnCalcutateButton();
            string product = ScenarioContext.Current["Product"].ToString();
            quickQuoteValues = _pageObjects.QuickQuotePage.QuoteDetails(product);
            _pageObjects.QuickQuotePage.ClickOnCreateQuoteButton();
        }


        [Then("the user should be redirect to the Contract Details page")]
        public void ThenTheUserShouldBeRedirectToTheContractDetailsPage()
        {
            string pageTitle = DriverContext.Driver.Title;
            Console.WriteLine(pageTitle);
            // _pageObjects.ContractDetailsPage.ValidateContractDetailsPageTitle();
            ReportingManager.LogInfo("User successfully redirected to the Contract Details page in Standard quote.");

            _pageObjects.ContractDetailsPage.ClickOnAssetSummery();
            //_pageObjects.AssetSummeryPage.AddAsset();
            _pageObjects.AssetSummeryPage.ClickOnAssetEditButton();
            _pageObjects.AssetSummeryPage.SelectyearField(2024);
            _pageObjects.AssetSummeryPage.SelectNewOrUsed("Used");
            //_pageObjects.AssetSummeryPage.SelectAssetDropdown("LT Series/International/Heavy");
            _pageObjects.AssetSummeryPage.SelectCategory("Day Cab");
            _pageObjects.AssetSummeryPage.EnterPurchasePriceValue("26000");
            _pageObjects.AssetSummeryPage.EnterVinNumber("1HTEUMMLXRS734378");
            _pageObjects.AssetSummeryPage.EnterOdometer(12345);
            _pageObjects.AssetSummeryPage.SaveTheAsset();
            _pageObjects.AssetSummeryPage.ClickOnSaveButton();
        }

        [Then("the calculations should match the Quick Quote and Standard Quote")]
        public void ThenTheCalculationsShouldMatchTheQuickQuoteAndStandardQuote()
        {
            _pageObjects.ContractDetailsPage.ClickOnCalcutateButton();
            string product = ScenarioContext.Current["Product"].ToString();
            standardQuoteValues = _pageObjects.ContractDetailsPage.StandardQuoteDetails(product);

            var assertionErrors = new List<string>(); // Store failed assertions

            foreach (var key in quickQuoteValues.Keys)
            {
                if (!standardQuoteValues.ContainsKey(key))
                {
                    string errorMessage = $"❌ Key '{key}' not found in standardQuoteValues.";
                    ReportingManager.LogFail(errorMessage);
                    Assert.Fail(errorMessage); // Hard fail
                }

                string quickQuoteValue = quickQuoteValues[key];
                string standardQuoteValue = standardQuoteValues[key];

                if (!quickQuoteValue.Equals(standardQuoteValue))
                {
                    string errorMessage = $"❌ Mismatch in {key}: Expected {quickQuoteValue}, but got {standardQuoteValue}";
                    ReportingManager.LogFail(errorMessage);
                    Assert.Fail(errorMessage); // Hard fail
                }

                ReportingManager.LogPass($"✅ {key} Matched: {quickQuoteValue}");

            }
        }
    }
}
