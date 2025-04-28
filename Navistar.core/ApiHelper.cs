using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using RestSharp;

namespace Navistar.Navistar.core
{
    public class ApiHelper
    {
        private readonly RestClient _client;

        public ApiHelper(string baseUrl)
        {
            _client = new RestClient(baseUrl);
        }

        public string GetContractId(string quoteId)
        {
            var request = new RestRequest($"/api/getContract/{quoteId}", Method.Get);
            request.AddHeader("Content-Type", "application/json");
            request.AddHeader("Authorization", "Bearer your_token_here"); // Add if required

            var response = _client.Execute(request);
            if (response.IsSuccessful)
            {
                var jsonResponse = JObject.Parse(response.Content);
                return jsonResponse["contractId"]?.ToString(); // Extract contractId
            }
            else
            {
                throw new Exception("Failed to get contract ID. Response: " + response.Content);
            }
        }
    }
}
