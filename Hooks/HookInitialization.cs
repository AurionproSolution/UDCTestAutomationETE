using Navistar.Navistar.core;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Navistar.Hooks
{
    [Binding]
    public class HookInitialization
    {
        [BeforeTestRun]
        public static void SetupReporting() => ReportingManager.InitReport();

        [BeforeScenario]
        public void BeforeScenario()
        {
            var scenarioTitle = ScenarioContext.Current.ScenarioInfo.Title;
            ReportingManager.CreateTest(scenarioTitle);
            ReportingManager.LogInfo($"Starting scenario: {scenarioTitle}");
        }

        [AfterTestRun]
        public static void TearDownReporting() => ReportingManager.FlushReport();

        [AfterStep]
        public void AfterStep()
        {
            var stepInfo = ScenarioContext.Current.StepContext.StepInfo;
            if (ScenarioContext.Current.TestError == null)
            {
                ReportingManager.LogPass($"Step passed: {stepInfo.Text}");
            }
            else
            {
                var errorMessage = ScenarioContext.Current.TestError.Message;
                var screenshotPath = DriverContext.TakeScreenshot(stepInfo.Text);
                ReportingManager.LogFail($"Step failed: {stepInfo.Text}. Error: {errorMessage}", screenshotPath);
            }
        }

        [AfterScenario]
        public void TearDownDriver()
        {
            if (ScenarioContext.Current.TestError != null)
            {
                ReportingManager.LogFail($"Scenario failed: {ScenarioContext.Current.ScenarioInfo.Title}");
            }
            else
            {
                ReportingManager.LogPass($"Scenario passed: {ScenarioContext.Current.ScenarioInfo.Title}");
            }
            DriverContext.CloseDriver();
        }
    }
}
