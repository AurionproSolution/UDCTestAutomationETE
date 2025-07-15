using Navistar.Navistar.core;
using Navistar.StepDefinitions.TestData;
using NUnit.Framework;
using Reqnroll;
using System;
using System.Diagnostics.Contracts;
using System.Text.RegularExpressions;

namespace Navistar.StepDefinitions
{
    [Binding]
    public class QuickQuoteCreationAndContractVerificationStepDefinitions
    {
        private readonly PageObjectContainer _pageObjects;
        private Dictionary<string, string> quickQuoteValues;
        private Dictionary<string, string> standardQuoteValues;
        public QuickQuoteCreationAndContractVerificationStepDefinitions(PageObjectContainer pageObjects)
        {
            _pageObjects = pageObjects;
        }
        [Given("User is on the login page")]
        public void GivenUserIsOnTheLoginPage()
        {
            ReportingManager.LogInfo("Navigating to the login page.");
            DriverContext.Driver.Navigate().GoToUrl(_pageObjects.TestData.FisSandboxUrl);
        }

        [When("User logs in with {string} and {string}")]
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

        [Then("User should be redirected to the dashboard")]
        public void ThenUserShouldBeRedirectedToTheDashboard()
        {
            string dashboardurl = DriverContext.Driver.Url;
            ReportingManager.LogPass("Logged in usign URL : -" + dashboardurl + " .");
            ReportingManager.LogPass("Navigated to the dashboard successfully");
            _pageObjects.DashboardPage.SelectDealer("36000005");
        }

        [When("User clicks on Create Quick Quote")]
        public void WhenUserClicksOnCreateQuickQuote()
        {
            ReportingManager.LogInfo("Click on Create Quick Quote");
            _pageObjects.DashboardPage.ClickOnCreateQuickQuote();
            Thread.Sleep(2000);
            ReportingManager.LogInfo("Verified dashboard page.");
        }

        [Then("User should be redirected to the Create Quick Quote page")]
        public void ThenUserShouldBeRedirectedToTheCreateQuickQuotePage()
        {
            ReportingManager.LogInfo("User redirected to Create Quick Quote page successfully");
        }

        [When("User selects {string} from the Program dropdown")]
        public void WhenUserSelectsFromTheProgramDropdown(string program)
        {
            _pageObjects.QuickQuotePage.SelectProgramDropDown(program);
            Thread.Sleep(3000);
        }

        [When("User selects {string} from the Product dropdown")]
        public void WhenUserSelectsFromTheProductDropdown(string product)
        {
            _pageObjects.QuickQuotePage.SelectProductDropdown(product);
            ScenarioContext.Current["Product"] = product;
            Thread.Sleep(3000);
        }

        [When("User selects {string} from the dropdown")]
        public void WhenUserSelectsFromTheDropdown(string asset)
        {
            _pageObjects.QuickQuotePage.SelectAssetDropdown(_pageObjects.QuickQuoteTestData.Assets[1]);
        }

        [When("User enters {string}")]
        public void WhenUserEnters(string fieldName)
        {
            switch (fieldName)
            {
                case "Purchase Price":
                    _pageObjects.QuickQuotePage.PurchasePrice(_pageObjects.QuickQuoteTestData.PurchasePrices[0]);
                    break;
                case "Down Payment":
                    _pageObjects.QuickQuotePage.DownPayment(_pageObjects.QuickQuoteTestData.DownPayments[0]);
                    break;
                case "Balloon":
                    _pageObjects.QuickQuotePage.Balloon(_pageObjects.QuickQuoteTestData.Balloons[0]);
                    break;
                case "Residual Value":
                    string product = ScenarioContext.Current["Product"].ToString();
                    if (product == "TRAC Lease")
                    {
                        _pageObjects.QuickQuotePage.ResidaulValue(_pageObjects.QuickQuoteTestData.ResidualValues[0]);
                    }
                    break;
                default:
                    throw new ArgumentException($"Invalid field name: {fieldName}");
            }
        }

        [When("User selects Frequency from the dropdown")]
        public void WhenUserSelectsFrequencyFromTheDropdown()
        {
            _pageObjects.QuickQuotePage.FrequencyDropdown(_pageObjects.QuickQuoteTestData.Frequency[0]);
        }

        [When("User selects Term from the dropdown")]
        public void WhenUserSelectsTermFromTheDropdown()
        {
            _pageObjects.QuickQuotePage.TermInMonths(_pageObjects.QuickQuoteTestData.TermsInMonths[0]);
        }

        [When("User clicks on Create Quote")]
        public void WhenUserClicksOnCreateQuote()
        {
            _pageObjects.QuickQuotePage.ClickOnCalcutateButton();
            string product = ScenarioContext.Current["Product"].ToString();
            quickQuoteValues = _pageObjects.QuickQuotePage.QuoteDetails(product);
            _pageObjects.QuickQuotePage.ClickOnCreateQuoteButton();
            Thread.Sleep(1000);
        }

        [Then("User should be redirected to the Contract Details page")]
        public void ThenUserShouldBeRedirectedToTheContractDetailsPage()
        {
            string pageTitle = DriverContext.Driver.Title;
            Console.WriteLine(pageTitle);
            // _pageObjects.ContractDetailsPage.ValidateContractDetailsPageTitle();
            ReportingManager.LogInfo("User successfully redirected to the Contract Details page in Standard quote.");

            _pageObjects.ContractDetailsPage.ClickOnAssetSummery();
            //_pageObjects.AssetSummeryPage.AddAsset();
            string product = ScenarioContext.Current["Product"].ToString();
            Thread.Sleep(3000);
            _pageObjects.AssetSummeryPage.SearchVINNo(_pageObjects.AssetSummaryTestData.VINNumber);
            _pageObjects.AssetSummeryPage.AddSearchAsset();
            _pageObjects.AssetSummeryPage.ClickOnAssetEditButton();
            Thread.Sleep(1000);
            _pageObjects.AssetSummeryPage.SelectCategory(_pageObjects.AssetSummaryTestData.Category);
            Thread.Sleep(1000);
            _pageObjects.AssetSummeryPage.EnterPurchasePriceValue("26000");
            Thread.Sleep(500);
            _pageObjects.AssetSummeryPage.ClickOnSaveButton();
            Thread.Sleep(2000);
        }


        [When("User clicks on Add Fees and Charges")]
        public void WhenUserClicksOnAddFeesAndCharges()
        {
            _pageObjects.ContractDetailsPage.ClickOnAddFeesAndChargesButton();           
        }

        [When("User enters value in Extended Service Contracts")]
        public void WhenUserEntersValueInExtendedServiceContracts()
        {
            _pageObjects.AddFeesAndChargesPage.EntreExtendedServiceContractsTextbox("20");
        }

        [When("User enters value in Preventative Maintenance")]
        public void WhenUserEntersValueInPreventativeMaintenance()
        {
            _pageObjects.AddFeesAndChargesPage.PreventativeMaintenanceTextbox("30");
        }

        [When("User enters value in Titling\\/Lien\\/Other \\(Dealer)")]
        public void WhenUserEntersValueInTitlingLienOtherDealer()
        {
            _pageObjects.AddFeesAndChargesPage.TitlingLienOtherTextboxDealer("40");
        }

        [When("User clicks on Add Button")]
        public void WhenUserClicksOnAddButton()
        {
            string expectedlableAddFessandChages = _pageObjects.AddFeesAndChargesPage.GetTotalFeesAndCharges();
            _pageObjects.AddFeesAndChargesPage.clickonAddButton();
            Thread.Sleep(1000);
            string actuallableAddFessandChages=_pageObjects.ContractDetailsPage.GetTotalFess();
            if (actuallableAddFessandChages.Equals(expectedlableAddFessandChages))
            {
                ReportingManager.LogPass("Total Fess is Matched With Actual Value" + actuallableAddFessandChages + "and Expected Value" + expectedlableAddFessandChages);
                ReportingManager.AddScreenshotToReport("Total Fess is Matched With Actual Value" + actuallableAddFessandChages + "and Expected Value" + expectedlableAddFessandChages);
            }
            else
            {
                Assert.Fail("Total Fees is not Matched");
            }
        }

        [When("User clicks on Calculate button")]
        public void WhenUserClicksOnCalculateButton()
        {
            string product = ScenarioContext.Current["Product"].ToString();
            if (product.Equals("Operating Lease"))
            {
                _pageObjects.ContractDetailsPage.EnterAnnualMileage("100");
            }
            _pageObjects.ContractDetailsPage.ClickOnCalcutateButton();
        }

        [Then("the Payment Summary \\(Installment) should match the Contract Payment Schedule section")]
        public void ThenThePaymentSummaryInstallmentShouldMatchTheContractPaymentScheduleSection()
        {
            string InstallmentPaymentSummaryTab = _pageObjects.ContractDetailsPage.GetInstallementFromPaymentSummary();
            string CalculateAmountFromContractPaymentScheduleTab = _pageObjects.ContractDetailsPage.GetInstallementFromPaymentSummary();
            if(InstallmentPaymentSummaryTab.Equals(CalculateAmountFromContractPaymentScheduleTab))
            {
                ReportingManager.LogPass("Installment value is Matched With Installment Payment Summary Tab" + InstallmentPaymentSummaryTab + "and Calculate Amount From Contract Payment Schedule Tab" + CalculateAmountFromContractPaymentScheduleTab);
                ReportingManager.AddScreenshotToReport("Installment value is Matched With Installment Payment Summary Tab" + InstallmentPaymentSummaryTab + "and Calculate Amount From Contract Payment Schedule Tab" + CalculateAmountFromContractPaymentScheduleTab);
            }
            else
            {
                Assert.Fail("Installment value is not Matched With Installment Payment Summary Tab" + InstallmentPaymentSummaryTab + "and Calculate Amount From Contract Payment Schedule Tab" + CalculateAmountFromContractPaymentScheduleTab);
            }

            string CalculateAmountFromDetailsScheduleTab = _pageObjects.ContractDetailsPage.GetCalculateAmountFromDetailsScheduleTab();
           
            if (InstallmentPaymentSummaryTab.Equals(CalculateAmountFromDetailsScheduleTab))
            {
                ReportingManager.LogPass("Installment value is Matched With Installment Payment Summary Tab" + InstallmentPaymentSummaryTab + "and Calculate Amount From  Details Schedule Tab" + CalculateAmountFromDetailsScheduleTab);
                ReportingManager.AddScreenshotToReport("Installment value is Matched With Installment Payment Summary Tab" + InstallmentPaymentSummaryTab + "and Calculate Amount From  Details Schedule Tab" + CalculateAmountFromDetailsScheduleTab);
            }
            else
            {
                Assert.Fail("Installment value is not Matched With Installment Payment Summary Tab" + InstallmentPaymentSummaryTab + "and Calculate Amount From Details Schedule Tab" + CalculateAmountFromDetailsScheduleTab);
            }
           
        }

        [Then("the Buy Rate should be verified before contract created and after contract created")]
        public void ThenTheBuyRateShouldBeVerifiedBeforeContractCreatedAndAfterContractCreated()
        {
            string buyRateBeforeContractCreated = _pageObjects.ContractDetailsPage.GetBuyRate();
            Thread.Sleep(1000);
            _pageObjects.ContractDetailsPage.ClickOnNextButton();
            _pageObjects.ContractDetailsPage.clickonPreviousButton();
            Thread.Sleep(2000);
            string buyRateAfterContractCreated = _pageObjects.ContractDetailsPage.GetBuyRate();
            if (buyRateAfterContractCreated.Equals(buyRateBeforeContractCreated))
            {
                ReportingManager.LogPass("Buy Rate is Matched  before contract created " + buyRateBeforeContractCreated + "and after contract created" + buyRateAfterContractCreated);
                ReportingManager.AddScreenshotToReport("Buy Rate is Matched  before contract created " + buyRateBeforeContractCreated + "and after contract created" + buyRateAfterContractCreated);
            }
            else
            {
                Assert.Fail("Buy Rate is not Matched  before contract created " + buyRateBeforeContractCreated + "and after contract created" + buyRateAfterContractCreated);
            }
        //    _pageObjects.ContractDetailsPage.ClickOnNextButton();
        }

        [Then("click on Edit Payment Schedule and change number of months more that {int}")]
        public void ThenClickOnFrqunacyAndChangeNumberOfMonthsMoreThat(int p0)
        {
            _pageObjects.ContractDetailsPage.EntreNumberinTermAndApply("100");
        }

        [Then("Edit Frequncy number of months more that {int}")]
        public void ThenEditFrequncyNumberOfMonthsMoreThat(int p0)
        {
            _pageObjects.ContractDetailsPage.EntreFrquancyTermDropdown("100");
        }

        [Then("verify error Message for Frquancy")]
        public void ThenVerifyErrorMessageForFrquancy()
        {
            _pageObjects.ContractDetailsPage.VerifyFrequancyTermErrorMessage();
        }

        [Given("Valid Frequncy number of months and click on calculate")]
        public void GivenValidFrequncyNumberOfMonthsAndClickOnCalculate()
        {
            _pageObjects.ContractDetailsPage.EntreFrquancyTermDropdown("75");
        }

        [Then("Frequncy number value will be update in Edit Payment Schedule")]
        public void ThenFrequncyNumberValueWillBeUpdateInEditPaymentSchedule()
        {
            _pageObjects.ContractDetailsPage.clickOnEditPaymentButtonAndVerifyTerms("75");
        }



    }
}
