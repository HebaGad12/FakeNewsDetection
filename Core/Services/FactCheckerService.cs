using Domain.Enums;
using ServicesAbstraction;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Services
{
    /// <summary>
    /// Calls the Python FastAPI fact-checker endpoint at POST /fact-check.
    /// </summary>
    public class FactCheckerService : IFactCheckerService
    {
        private readonly HttpClient _http;

        public FactCheckerService(HttpClient http)
        {
            _http = http;
        }

        public async Task<FactCheckResult> CheckAsync(string articleText)
        {
            try
            {
                var response = await _http.PostAsJsonAsync("/fact-check", new FactCheckRequest
                {
                    Article = articleText
                });

                if (!response.IsSuccessStatusCode)
                    return new FactCheckResult(FactCheckVerdict.Unknown, string.Empty);

                var result = await response.Content.ReadFromJsonAsync<FactCheckResponse>();
                if (result is null)
                    return new FactCheckResult(FactCheckVerdict.Unknown, string.Empty);

                var verdict = result.Verdict.Trim().ToUpper() switch
                {
                    "TRUE"  => FactCheckVerdict.True,
                    "FALSE" => FactCheckVerdict.False,
                    _       => FactCheckVerdict.Unknown
                };

                return new FactCheckResult(verdict, result.Analysis ?? string.Empty);
            }
            catch
            {
                return new FactCheckResult(FactCheckVerdict.Unknown, string.Empty);
            }
        }

        private class FactCheckRequest
        {
            [JsonPropertyName("article")]
            public string Article { get; set; } = "";
        }

        private class FactCheckResponse
        {
            [JsonPropertyName("verdict")]
            public string Verdict { get; set; } = "";

            [JsonPropertyName("analysis")]
            public string? Analysis { get; set; }
        }
    }
}