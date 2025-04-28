using OpenQA.Selenium.Chrome;
using OpenQA.Selenium;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using OpenQA.Selenium.Edge;
using WebDriverManager;
using WebDriverManager.DriverConfigs.Impl;
using WebDriverManager.Helpers;

namespace Navistar.Navistar.core
{
    public static class DriverContext
    {
        public static WebDriver Driver { get; private set; }

        public static void InitDriver(string browserType = "chrome")
        {
            var chromeOptions = new ChromeOptions();
            var edgeOptions = new EdgeOptions();

            try
            {
                if (browserType.Equals("chrome", StringComparison.OrdinalIgnoreCase))
                {
                    new DriverManager().SetUpDriver(new ChromeConfig(), VersionResolveStrategy.MatchingBrowser);

                    // Chrome-specific options
                    chromeOptions.AddArgument("--ignore-certificate-errors");
                    chromeOptions.AddArgument("--ignore-ssl-errors");
                    chromeOptions.AddArgument("--allow-insecure-localhost");
                    chromeOptions.AddArgument("--disable-web-security");
                    chromeOptions.AddArgument("--disable-site-isolation-trials");

                    string tempProfilePath = Path.Combine(Path.GetTempPath(), "ChromeProfile_" + Guid.NewGuid());
                    Directory.CreateDirectory(tempProfilePath);
                    chromeOptions.AddArgument($"--user-data-dir={tempProfilePath}");

                    if (Environment.GetEnvironmentVariable("CI") == "true")
                    {
                        chromeOptions.AddArgument("--headless");
                        chromeOptions.AddArgument("--disable-gpu");
                        chromeOptions.AddArgument("--no-sandbox");
                        chromeOptions.AddArgument("--window-size=1920,1080");
                    }

                    Driver = new ChromeDriver(chromeOptions);
                }
                else if (browserType.Equals("edge", StringComparison.OrdinalIgnoreCase))
                {
                    new DriverManager().SetUpDriver(new EdgeConfig(), VersionResolveStrategy.MatchingBrowser);

                    // Edge-specific options
                    edgeOptions.AddArgument("--ignore-certificate-errors");
                    edgeOptions.AddArgument("--ignore-ssl-errors");
                    edgeOptions.AddArgument("--allow-insecure-localhost");

                    if (Environment.GetEnvironmentVariable("CI") == "true")
                    {
                        edgeOptions.AddArgument("--headless");
                        edgeOptions.AddArgument("--disable-gpu");
                        edgeOptions.AddArgument("--no-sandbox");
                        edgeOptions.AddArgument("--window-size=1920,1080");
                    }

                    Driver = new EdgeDriver(edgeOptions);
                }
                else
                {
                    throw new ArgumentException($"Unsupported browser type: {browserType}");
                }

                Driver.Manage().Window.Maximize();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Driver initialization failed: {ex.Message}");
                ReportingManager.LogFail($"Driver initialization failed: {ex.Message}");
                throw; // Very important — rethrow so test fails early if driver not created
            }
        }

        public static void CloseDriver()
        {
            if (Driver != null)
            {
                try
                {
                    Driver.Quit();
                    Driver.Dispose();
                    Driver = null;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error during driver teardown: {ex.Message}");
                    ReportingManager.LogInfo($"Error during driver teardown: {ex.Message}");
                }
            }
        }
        public static string TakeScreenshot(string screenshotName)
        {
            try
            {
                if (Driver == null)
                    throw new InvalidOperationException("Driver is not initialized for taking screenshots.");

                ITakesScreenshot ts = (ITakesScreenshot)Driver;
                Screenshot screenshot = ts.GetScreenshot();

                string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
                string screenshotDirectory = Path.Combine(baseDirectory, "Reports", "Screenshots");

                if (!Directory.Exists(screenshotDirectory))
                    Directory.CreateDirectory(screenshotDirectory);

                string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                string uniqueScreenshotName = $"{screenshotName}_{timestamp}.png";
                string screenshotPath = Path.Combine(screenshotDirectory, uniqueScreenshotName);

                screenshot.SaveAsFile(screenshotPath);
                return screenshotPath;
            }
            catch (Exception e)
            {
                ReportingManager.LogFail("Screenshot capture failed: " + e.Message);
                Console.WriteLine("Screenshot capture failed: " + e.Message);
                return null;
            }
        }
    }
}
