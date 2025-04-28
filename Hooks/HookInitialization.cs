using Navistar.Navistar.core;
using Navistar.StepDefinitions.TestData;
using Reqnroll;
using System;
using System.Collections;


namespace Navistar.Hooks
{
    [Binding]
    public class HookInitialization(ScenarioContext _scenarioContext)
    {
        [BeforeTestRun]
        public static void SetupReporting() => ReportingManager.InitReport();

        [BeforeScenario]
        public void BeforeScenario()
        {
            DriverContext.InitDriver();
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
            DriverContext.CloseDriver();
        }
    }
}
