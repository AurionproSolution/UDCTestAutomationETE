using OpenQA.Selenium.Chrome;
using OpenQA.Selenium;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Navistar.Navistar.core
{
    public static class DriverContext
    {
        public static WebDriver Driver { get; private set; }

        public static void InitDriver(string browserType = "chrome")
        {
            var chromeOptions = new ChromeOptions();

            // Ignore SSL certificate errors
            chromeOptions.AddArgument("--ignore-certificate-errors");
            chromeOptions.AddArgument("--ignore-ssl-errors");
            chromeOptions.AddArgument("--allow-insecure-localhost");

            switch (browserType.ToLower())
            {
                case "chrome":
                    Driver = new ChromeDriver(chromeOptions);
                    break;
                default:
                    throw new ArgumentException("Browser type not supported");
            }
            Driver.Manage().Window.Maximize();
        }

        public static void CloseDriver()
        {
            if (Driver != null)
            {
                Driver.Quit();
                Driver = null;
            }
        }

        public static string TakeScreenshot1(string screenshotName)
        {
            var screenshot = ((ITakesScreenshot)Driver).GetScreenshot();
            string screenshotPath = Path.Combine("Reports", "Screenshots", $"{screenshotName}.png");
            Directory.CreateDirectory(Path.GetDirectoryName(screenshotPath));
            screenshot.SaveAsFile(screenshotPath);
            return screenshotPath;
        }
        public static string TakeScreenshot(string screenshotName)
        {
            try
            {
                ITakesScreenshot ts = (ITakesScreenshot)Driver;
                Screenshot screenshot = ts.GetScreenshot();
                string screenshotDirectory = @"C:\Project\Navistar\bin\Debug\net6.0\Reports\Screenshots";
                if (!Directory.Exists(screenshotDirectory))
                {
                    Directory.CreateDirectory(screenshotDirectory);
                }
                string screenshotPath = Path.Combine(screenshotDirectory, screenshotName + ".png");
                screenshot.SaveAsFile(screenshotPath);
                return screenshotPath;
            }
            catch (Exception e)
            {
                Console.WriteLine("Screenshot capture failed: " + e.Message);
                return null;
            }
        }
    }
}
