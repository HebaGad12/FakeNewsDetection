using ServicesAbstraction;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Services
{
    /// <summary>
    /// Calls the Python FastAPI image copyright endpoints.
    ///
    /// CheckAsync  → POST /images/check?check_web=false   (local DB only, no web search)
    /// StoreAsync  → POST /images/store?check_web=true    (local DB + web search before storing)
    /// RemoveAsync → DELETE /images/delete                (unchanged)
    ///
    /// Both Check and Store now send the image as multipart/form-data file upload
    /// instead of a JSON path, matching the updated grad.py API.
    /// </summary>
    public class ImageCopyrightService : IImageCopyrightService
    {
        private readonly HttpClient _http;

        public ImageCopyrightService(HttpClient http)
        {
            _http = http;
        }

        /// <summary>
        /// Checks the image against the local vector DB only (check_web=false).
        /// Called for every image upload regardless of the IsCopyrighted flag.
        /// </summary>
        public async Task<CopyrightCheckResult> CheckAsync(byte[] imageBytes, string fileName)
        {
            try
            {
                using var content = BuildImageMultipart(imageBytes, fileName);
                var response = await _http.PostAsync("/images/check?check_web=true", content);

                if (!response.IsSuccessStatusCode)
                    return new CopyrightCheckResult(false, new List<CopyrightMatch>());

                var result = await response.Content.ReadFromJsonAsync<ImageCheckResponse>();
                if (result is null)
                    return new CopyrightCheckResult(false, new List<CopyrightMatch>());

                var matches = result.LocalMatches?.Select(m => new CopyrightMatch(
                    m.Id ?? "",
                    m.Similarity,
                    m.Path ?? ""
                )).ToList() ?? new List<CopyrightMatch>();

                if (result.WebMatches != null)
                {
                    matches.AddRange(result.WebMatches.Select(m => new CopyrightMatch(
                        m.Source ?? "",
                        m.Similarity,
                        m.Url ?? ""
                    )));
                }

                return new CopyrightCheckResult(result.IsDuplicate, matches);
            }
            catch
            {
                // Fail open — if Python is down, allow the image
                return new CopyrightCheckResult(false, new List<CopyrightMatch>());
            }
        }

        /// <summary>
        /// Stores the image in the vector DB after running both local + web checks (check_web=true).
        /// Only called for images where the journalist marks IsCopyrighted = true.
        /// Rejected by the Python API if either check finds a duplicate.
        /// </summary>
        public async Task<CopyrightCheckResult> StoreAsync(byte[] imageBytes, string fileName, string imageId)
        {
            try
            {
                using var multipart = BuildStoreMultipart(imageBytes, fileName, imageId);
                var response = await _http.PostAsync("/images/store?check_web=true", multipart);

                // 409 = rejected (local DB or web duplicate found)
                // FastAPI wraps HTTPException detail as: { "detail": { ... } }
                if (response.StatusCode == System.Net.HttpStatusCode.Conflict)
                {
                    var envelope = await response.Content.ReadFromJsonAsync<FastApiErrorEnvelope>();
                    var rejection = envelope?.Detail;
                    var matches = new List<CopyrightMatch>();

                    foreach (var m in rejection?.LocalMatches ?? new())
                        matches.Add(new CopyrightMatch(m.Id ?? "", m.Similarity, m.Path ?? ""));

                    foreach (var m in rejection?.WebMatches ?? new())
                        matches.Add(new CopyrightMatch(m.Source ?? "", m.Similarity, m.Url ?? ""));

                    return new CopyrightCheckResult(true, matches);
                }

                return new CopyrightCheckResult(false, new List<CopyrightMatch>());
            }
            catch
            {
                // Fail open — if Python is down, allow the image
                return new CopyrightCheckResult(false, new List<CopyrightMatch>());
            }
        }

        public async Task RemoveAsync(string imageId)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Delete, "/images/delete")
                {
                    Content = JsonContent.Create(new ImageDeleteRequest { ImageId = imageId })
                };
                await _http.SendAsync(request);
            }
            catch
            {
                // Fire-and-forget — don't block the response if deleting fails
            }
        }

        // ── Multipart helpers ───────────────────────────────────────────────

        /// <summary>Builds a multipart body with just the image file (for /images/check).</summary>
        private static MultipartFormDataContent BuildImageMultipart(byte[] imageBytes, string fileName)
        {
            var content = new MultipartFormDataContent();
            var imageContent = new ByteArrayContent(imageBytes);
            imageContent.Headers.ContentType =
                new System.Net.Http.Headers.MediaTypeHeaderValue(GetMimeType(fileName));
            content.Add(imageContent, "image", fileName);
            return content;
        }

        /// <summary>Builds a multipart body with image + image_id form field (for /images/store).</summary>
        private static MultipartFormDataContent BuildStoreMultipart(
            byte[] imageBytes, string fileName, string imageId)
        {
            var content = BuildImageMultipart(imageBytes, fileName);
            content.Add(new StringContent(imageId), "image_id");
            return content;
        }

        private static string GetMimeType(string fileName)
        {
            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            return ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png"            => "image/png",
                ".webp"           => "image/webp",
                ".gif"            => "image/gif",
                _                 => "application/octet-stream"
            };
        }

        // ── Response shapes matching updated grad.py ────────────────────────

        private class ImageCheckResponse
        {
            [JsonPropertyName("is_duplicate")]
            public bool IsDuplicate { get; set; }

            [JsonPropertyName("checked_web")]
            public bool CheckedWeb { get; set; }

            [JsonPropertyName("local_matches")]
            public List<ImageMatchItem>? LocalMatches { get; set; }

            [JsonPropertyName("web_matches")]
            public List<WebMatchItem>? WebMatches { get; set; }
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

        private class WebMatchItem
        {
            [JsonPropertyName("url")]
            public string? Url { get; set; }

            [JsonPropertyName("similarity")]
            public double Similarity { get; set; }

            [JsonPropertyName("source")]
            public string? Source { get; set; }

            [JsonPropertyName("title")]
            public string? Title { get; set; }
        }

        private class ImageDeleteRequest
        {
            [JsonPropertyName("image_id")]
            public string ImageId { get; set; } = "";
        }

        private class FastApiErrorEnvelope
        {
            [JsonPropertyName("detail")]
            public StoreRejectionDetail? Detail { get; set; }
        }

        private class StoreRejectionDetail
        {
            [JsonPropertyName("local_matches")]
            public List<ImageMatchItem>? LocalMatches { get; set; }

            [JsonPropertyName("web_matches")]
            public List<WebMatchItem>? WebMatches { get; set; }
        }
    }
}