using AventStack.ExtentReports.Reporter;
using AventStack.ExtentReports;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using NUnit.Framework;

namespace Navistar.Navistar.core
{
    public static class ReportingManager
    {
        private static ExtentReports _extent;
        private static ExtentTest _test;

        public static void InitReport()
        {

            string reportDirectory = @"C:\Project\Navistar\Reports";

            if (!Directory.Exists(reportDirectory))
            {
                Directory.CreateDirectory(reportDirectory);
            }

            string testMethod = TestContext.CurrentContext.Test.MethodName;
            string testClass = TestContext.CurrentContext.Test.ClassName;
            string reportName = $"{testClass} - {testMethod} Report";
            string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            string uniqueReportName = $"{reportName}_{timestamp}.html";
            string reportPath = Path.Combine(reportDirectory, uniqueReportName);

            var htmlReporter = new ExtentSparkReporter(reportPath);
            _extent = new ExtentReports();
            _extent.AttachReporter(htmlReporter);
        }

        public static void CreateTest(string testName)
        {
            _test = _extent.CreateTest(testName);
        }

        public static void LogInfo(string message)
        {
            _test.Log(Status.Info, message);
        }

        public static void LogPass(string message)
        {
            _test.Log(Status.Pass, message);
        }

        public static void LogFail(string message, string screenshotPath = null)
        {
            if (screenshotPath != null)
            {
                _test.Log(Status.Fail, message + "Test failed with screenshot attached.")
                     .AddScreenCaptureFromPath(screenshotPath);
            }
            else
            {
                _test.Log(Status.Fail, "Test failed.");
            }
        }

        public static void FlushReport()
        {
            _extent.Flush();
        }

    }

}

