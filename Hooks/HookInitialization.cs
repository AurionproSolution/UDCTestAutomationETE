using Navistar.Navistar.core;
using Navistar.Navistar.Pages.NfcPages;
using Navistar.StepDefinitions;
using Navistar.StepDefinitions.TestData;
using Reqnroll;
using System;
using System.Collections;


namespace Navistar.Hooks
{
    [Binding]
    public class HookInitialization(ScenarioContext _scenarioContext)
    {

        [BeforeFeature]
        public static void BeforeFeature(FeatureContext featureContext)
        {
            DriverContext.InitDriver();
            var driver = DriverContext.Driver;
            var testData = new TestDataModel();
            var _pageObjectCon = new PageObjectContainer();

            // Navigate to login page
            // ReportingManager.LogInfo("Navigating to the login page.");
            DriverContext.Driver.Navigate().GoToUrl(_pageObjectCon.TestData.FisSandboxUrl);
           // DriverContext.Driver.Navigate().GoToUrl("https://uatportal.aurionpro.com/UANFCPortal/");
            ReportingManager.CreateTest($"Feature: {featureContext.FeatureInfo.Title}");
            ReportingManager.LogInfo("Login page loaded successfully.");

            var loginPage = new NFCLoginPage(driver);
            ReportingManager.LogInfo("User trying to login with valid credentials.");
            //// _pageObjects.LoginPage.ClickLoginWithNfcButton();
            loginPage.EnterNfcUserName("sandeep.bedekar");
            loginPage.ClickOnProceedButton();
            loginPage.EnterNfcPassword("Testing@2211");
            loginPage.ClickonSignInButton();
            //_pageObjects.LoginPage.EnterUserName(username);
            //_pageObjects.LoginPage.EnterPassword(password);
            //ReportingManager.LogInfo("Attempting login.");
            //_pageObjects.LoginPage.ClickLoginButton();
            Thread.Sleep(5000);
        }
        [BeforeTestRun]
        public static void SetupReporting() => ReportingManager.InitReport();

        [BeforeScenario]
        public void BeforeScenario()
        {
            //DriverContext.InitDriver();
            var scenarioTitle = _scenarioContext.ScenarioInfo.Title;

            string program = string.Empty;
            string product = string.Empty;

            foreach (DictionaryEntry entry in _scenarioContext.ScenarioInfo.Arguments)
            {
                Console.WriteLine($"Key: {entry.Key} | Value: {entry.Value}");

                string keyString = entry.Key?.ToString() ?? string.Empty;  // Prevents null reference

                if (keyString.Equals("Program", StringComparison.OrdinalIgnoreCase))
                {
                    program = entry.Value?.ToString() ?? string.Empty;
                }
                else if (keyString.Equals("Product", StringComparison.OrdinalIgnoreCase))
                {
                    product = entry.Value?.ToString() ?? string.Empty;
                }
            }

            // Custom test name for reporting
            string customTestName = !string.IsNullOrEmpty(program) && !string.IsNullOrEmpty(product)
                ? $"{scenarioTitle} - {program} - {product}"
                : scenarioTitle;

            // Initialize Extent Report test
            ReportingManager.CreateTest(customTestName);
            ReportingManager.LogInfo($"Starting scenario: {customTestName}");
        }

        [AfterTestRun]
        public static void TearDownReporting() => ReportingManager.FlushReport();

        [AfterStep]
        public void AfterStep()
        {
            var stepInfo = _scenarioContext.StepContext.StepInfo;
            if (_scenarioContext.TestError == null)
            {
                ReportingManager.LogPass($"Step passed: {stepInfo.Text}");
            }
            else
            {
                var errorMessage = _scenarioContext.TestError.Message;
                var screenshotPath = DriverContext.TakeScreenshot(stepInfo.Text);
                ReportingManager.LogFail($"Step failed: {stepInfo.Text}. Error: {errorMessage}", screenshotPath);
            }
        }

        [AfterScenario]
        public void TearDownDriver()
        {
            if (_scenarioContext.TestError != null)
            {
                ReportingManager.LogFail($"Scenario failed: {_scenarioContext.ScenarioInfo.Title}");
            }
            else
            {
                ReportingManager.LogPass($"Scenario passed: {_scenarioContext.ScenarioInfo.Title}");
            }
            try
            {
                ReportingManager.LogInfo("Navigating back to Dashboard...");
                DriverContext.Driver.Navigate().Refresh();
                var _pageObjectCon = new PageObjectContainer();
                // Navigate back after each test case
                DriverContext.Driver.Navigate().GoToUrl("https://aurpr-ua.assetfinance.myfis.cloud/UANFCPortal/dealer");
                Thread.Sleep(15000);
                ReportingManager.LogInfo("Successfully navigated to Dashboard.");
            }
            catch (Exception ex)
            {
                ReportingManager.LogFail($"Could not navigate to Dashboard. Error: {ex.Message}");
            }
        }
        [AfterFeature]
        public static void AfterFeature(FeatureContext featureContext)
        {
            ReportingManager.LogInfo($"Feature completed: {featureContext.FeatureInfo.Title}");
            DriverContext.CloseDriver();
        }
    }
}
