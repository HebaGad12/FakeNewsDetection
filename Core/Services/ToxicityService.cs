using ServicesAbstraction;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Services
{
    /// <summary>
    /// Calls the Python FastAPI toxicity endpoint at POST /istoxic.
    /// </summary>
    public class ToxicityService : IToxicityService
    {
        private readonly HttpClient _http;

        public ToxicityService(HttpClient http)
        {
            _http = http;
        }

        public async Task<bool> IsToxicAsync(string text)
        {
            try
            {
                var response = await _http.PostAsJsonAsync("/istoxic", new ToxicityRequest
                {
                    Text = text,
                    ReturnProbabilities = false
                });

                if (!response.IsSuccessStatusCode)
                    return false; // fail open — don't block if Python is down

                var result = await response.Content.ReadFromJsonAsync<ToxicityResponse>();
                return result?.PredictionInt == 1;
            }
            catch
            {
                // If the Python service is unreachable, fail open
                return false;
            }
        }

        // ── Request / Response shapes matching grad.py ──────────────────────

        private class ToxicityRequest
        {
            [JsonPropertyName("text")]
            public string Text { get; set; } = "";

            [JsonPropertyName("return_probabilities")]
            public bool ReturnProbabilities { get; set; }
        }

        private class ToxicityResponse
        {
            [JsonPropertyName("prediction_int")]
            public int PredictionInt { get; set; }

            [JsonPropertyName("predicted_label")]
            public string PredictedLabel { get; set; } = "";
        }
    }
}