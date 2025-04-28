using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Navistar.Navistar.core;
using Navistar.Navistar.Pages.NfcPages;
using Navistar.StepDefinitions.TestData;

namespace Navistar.StepDefinitions
{
    public class PageObjectContainer
    {
        public NFCLoginPage LoginPage { get; }
        public DashboardPage DashboardPage { get; }
        public ContractDetailsPage ContractDetailsPage { get; }
        public AssetSummeryPage AssetSummeryPage { get; }
        public CustomerDetailsPage CustomerDetailsPage { get; }
        public SearchCustomerPage SearchCustomerPage { get; }
        public AddNewCustomerPage AddNewCustomerPage { get; }
        public ContractSummaryPage ContractSummaryPage { get; }
        public MenuSlidebarPage MenuSlidebarPage { get; }
        public QuickQuotePage QuickQuotePage { get; }
        public AddressPage AddressPage { get; }
        public TestDataModel TestData { get; }
        public QuickQuoteDataModel QuickQuoteTestData { get; }
        public AssetSummaryDataModel AssetSummaryTestData { get; }
        public CustomerPartiesDataModel CustomerPartiesTestData { get; }
        
        public PageObjectContainer()
        {
            var driver = DriverContext.Driver;

            LoginPage = new NFCLoginPage(driver);
            DashboardPage = new DashboardPage(driver);
            ContractDetailsPage = new ContractDetailsPage(driver);
            AssetSummeryPage = new AssetSummeryPage(driver);
            CustomerDetailsPage = new CustomerDetailsPage(driver);
            SearchCustomerPage = new SearchCustomerPage(driver);
            AddNewCustomerPage = new AddNewCustomerPage(driver);
            ContractSummaryPage = new ContractSummaryPage(driver);
            MenuSlidebarPage = new MenuSlidebarPage(driver);
            QuickQuotePage = new QuickQuotePage(driver);
            AddressPage = new AddressPage(driver);
            TestData = JsonUtilities.ReadJson<TestDataModel>("TestDatafiles/TestData.json");
            QuickQuoteTestData = JsonUtilities.ReadJson<QuickQuoteDataModel>("TestDatafiles/QuickQuote.json");
            AssetSummaryTestData = JsonUtilities.ReadJson<List<AssetSummaryDataModel>>("TestDatafiles/AssetSummary.json").FirstOrDefault();
            CustomerPartiesTestData = JsonUtilities.ReadJson<CustomerPartiesDataModel>("TestDatafiles/CustomerParties.json");

        }
    }
}
