using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Navistar.StepDefinitions.TestData
{
    public class TestDataModel
    {
        public User ValidUser { get; set; }
        public User InvalidUser { get; set; }
        public string BaseUrl { get; set; }
        public string UatUrl { get; set; }
        public string QAUrl { get; set; }
        public string NFCSandboxUrl { get; set; }
        public string FisSandboxUrl { get; set; }
    }

    public class User
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }
    public class QuickQuoteDataModel
    {
        public List<string> Programs { get; set; }
        public List<string> Products { get; set; }
        public List<string> Assets { get; set; }
        public List<int> PurchasePrices { get; set; }
        public List<int> ResidualValues { get; set; }
        public List<int> DownPayments { get; set; }
        public List<int> Balloons { get; set; }
        public List<string> Frequency { get; set; }
        public List<int> TermsInMonths { get; set; }
    }
    public class AssetSummaryDataModel
    {
        public int Year { get; set; }
        public string NU { get; set; }
        public string Category { get; set; }
        public string VIN { get; set; }
        public int Odometer { get; set; }   
        public int PurchasePrice { get; set; }
        public string VINNumber { get; set; }
    }
    public class CustomerPartiesDataModel
    {
        public string CustomerRole { get; set; }
        public string Classification { get; set; }
        public string FirstName { get; set; }
        public string MiddleName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string DateOfBirth { get; set; }
        public string SocialSecurityNumber { get; set; }
        public string Vocation { get; set; }
        public int FleetSize { get; set; }
        public string PriorBankruptcy { get; set; }
        public string PriorRepossession { get; set; }
        public string PriorFiscalYearGrossAnnualRevenueOver5M { get; set; }
        public string BusinessOrOwnerOpenSince { get; set; }
        public string CommercialDriversLicenseNumber { get; set; }
        public DateTime FromDate { get; set; }
    }

}
