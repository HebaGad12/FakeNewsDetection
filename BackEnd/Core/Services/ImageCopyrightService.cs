using ServicesAbstraction;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Services
{
    /// <summary>
    /// Calls the Python FastAPI image copyright endpoints.
    /// </summary>
    public class ImageCopyrightService : IImageCopyrightService
    {
        private readonly HttpClient _http;

        public ImageCopyrightService(HttpClient http)
        {
            _http = http;
        }

        public async Task<CopyrightCheckResult> CheckAsync(string imagePath)
        {
            try
            {
                var response = await _http.PostAsJsonAsync("/images/check", new ImageCheckRequest
                {
                    ImagePath = imagePath
                });

                if (!response.IsSuccessStatusCode)
                    return new CopyrightCheckResult(false, new List<CopyrightMatch>());

                var result = await response.Content.ReadFromJsonAsync<ImageCheckResponse>();
                if (result is null)
                    return new CopyrightCheckResult(false, new List<CopyrightMatch>());

                var matches = result.Matches?.Select(m => new CopyrightMatch(
                    m.Id ?? "",
                    m.Similarity,
                    m.Path ?? ""
                )).ToList() ?? new List<CopyrightMatch>();

                return new CopyrightCheckResult(result.IsDuplicate, matches);
            }
            catch
            {
                // Fail open — if Python is down, allow the image
                return new CopyrightCheckResult(false, new List<CopyrightMatch>());
            }
        }

        public async Task StoreAsync(string imagePath, string imageId)
        {
            try
            {
                await _http.PostAsJsonAsync("/images/store", new ImageStoreRequest
                {
                    ImagePath = imagePath,
                    ImageId   = imageId
                });
            }
            catch
            {
                // Fire-and-forget — don't block the response if storing fails
            }
        }

        public async Task RemoveAsync(string imageId)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Delete, "/images/delete")
                {
                    Content = JsonContent.Create(new ImageDeleteRequest
                    {
                        ImageId = imageId
                    })
                };

                await _http.SendAsync(request);
            }
            catch
            {
                // Fire-and-forget — don't block the response if deleting fails
            }
        }

        // ── Request / Response shapes matching grad.py ──────────────────────

        private class ImageCheckRequest
        {
            [JsonPropertyName("image_path")]
            public string ImagePath { get; set; } = "";
        }

        private class ImageStoreRequest
        {
            [JsonPropertyName("image_path")]
            public string ImagePath { get; set; } = "";

            [JsonPropertyName("image_id")]
            public string ImageId { get; set; } = "";
        }

        private class ImageCheckResponse
        {
            [JsonPropertyName("is_duplicate")]
            public bool IsDuplicate { get; set; }

            [JsonPropertyName("matches")]
            public List<ImageMatchItem>? Matches { get; set; }
        }

        private class ImageDeleteRequest
        {
            [JsonPropertyName("image_id")]
            public string ImageId { get; set; } = "";
        }

        private class ImageMatchItem
        {
            [JsonPropertyName("id")]
            public string? Id { get; set; }

            [JsonPropertyName("similarity")]
            public double Similarity { get; set; }

            [JsonPropertyName("path")]
            public string? Path { get; set; }
        }
    }
}