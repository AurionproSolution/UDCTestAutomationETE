using Navistar.Navistar.core;
using Navistar.Navistar.Pages.NfcPages;
using Navistar.StepDefinitions;
using Navistar.StepDefinitions.TestData;
using Reqnroll;
using System.Collections;

namespace Navistar.Hooks
{
    [Binding]
    public class HookInitialization
    {
        private readonly ScenarioContext _scenarioContext;

        public HookInitialization(ScenarioContext scenarioContext)
        {
            _scenarioContext = scenarioContext;
        }

        [BeforeFeature]
        public static void BeforeFeature(FeatureContext featureContext)
        {
            // Set project and feature name for Excel file
            ExcelHelper.SetProjectAndFeature("Navistar", featureContext.FeatureInfo.Title);

            DriverContext.InitDriver();
            var driver = DriverContext.Driver;
            var testData = new TestDataModel();
            var _pageObjectCon = new PageObjectContainer();

            DriverContext.Driver.Navigate().GoToUrl(_pageObjectCon.TestData.FisSandboxUrl);
            ReportingManager.CreateTest($"Feature: {featureContext.FeatureInfo.Title}");
            ReportingManager.LogInfo("Login page loaded successfully.");

            var loginPage = new NFCLoginPage(driver);
            ReportingManager.LogInfo("User trying to login with valid credentials.");
            loginPage.EnterNfcUserName("seema.chaple");
            loginPage.ClickOnProceedButton();
            loginPage.EnterNfcPassword("Happywork@98");
            loginPage.ClickonSignInButton();
            Thread.Sleep(5000);
        }

        [BeforeTestRun]
        public static void SetupReporting()
        {
            ReportingManager.InitReport();
        }

        [BeforeScenario]
        public void BeforeScenario()
        {
            var scenarioTitle = _scenarioContext.ScenarioInfo.Title;

            string program = string.Empty;
            string product = string.Empty;

            foreach (DictionaryEntry entry in _scenarioContext.ScenarioInfo.Arguments)
            {
                Console.WriteLine($"Key: {entry.Key} | Value: {entry.Value}");

                string keyString = entry.Key?.ToString() ?? string.Empty;

                if (keyString.Equals("Program", StringComparison.OrdinalIgnoreCase))
                {
                    program = entry.Value?.ToString() ?? string.Empty;
                }
                else if (keyString.Equals("Product", StringComparison.OrdinalIgnoreCase))
                {
                    product = entry.Value?.ToString() ?? string.Empty;
                }
            }

            string customTestName = !string.IsNullOrEmpty(program) && !string.IsNullOrEmpty(product)
                ? $"{scenarioTitle} - {program} - {product}"
                : scenarioTitle;

            // Store the unique name for this scenario instance
            _scenarioContext["CustomScenarioName"] = customTestName;

            ReportingManager.CreateTest(customTestName);
            ReportingManager.LogInfo($"Starting scenario: {customTestName}");
        }

        [AfterStep]
        public void AfterStep()
        {
            var stepInfo = _scenarioContext.StepContext.StepInfo;

            string scenarioWithData = _scenarioContext.ContainsKey("CustomScenarioName")
                ? _scenarioContext["CustomScenarioName"].ToString()
                : _scenarioContext.ScenarioInfo.Title;

            string status = _scenarioContext.TestError == null ? "Passed" : "Failed";

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

            ExcelHelper.LogStepResult(scenarioWithData, stepInfo.Text, status);
        }

        [AfterScenario]
        public void TearDownDriver()
        {
            string scenarioName = _scenarioContext.ContainsKey("CustomScenarioName")
                ? _scenarioContext["CustomScenarioName"].ToString()
                : _scenarioContext.ScenarioInfo.Title;

            if (_scenarioContext.TestError != null)
            {
                ReportingManager.LogFail($"Scenario failed: {scenarioName}");
            }
            else
            {
                ReportingManager.LogPass($"Scenario passed: {scenarioName}");
            }

            try
            {
                ReportingManager.LogInfo("Navigating back to Dashboard...");
                DriverContext.Driver.Navigate().Refresh();
                var _pageObjectCon = new PageObjectContainer();
                DriverContext.Driver.Navigate().GoToUrl(_pageObjectCon.TestData.FisSandboxUrl);
                Thread.Sleep(15000);
                ReportingManager.LogInfo("Successfully navigated to Dashboard.");
            }
            catch (Exception ex)
            {
                ReportingManager.LogFail($"Could not navigate to Dashboard. Error: {ex.Message}");
            }
        }

        [AfterTestRun]
        public static void TearDownReporting()
        {
            ReportingManager.FlushReport();
            ExcelHelper.FlushToExcel(); // Save Excel to /bin/ExcelResults/...
        }

        [AfterFeature]
        public static void AfterFeature(FeatureContext featureContext)
        {
            ReportingManager.LogInfo($"Feature completed: {featureContext.FeatureInfo.Title}");
            DriverContext.CloseDriver();
        }
    }
}
