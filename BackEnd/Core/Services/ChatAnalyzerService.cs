using ServicesAbstraction;
using System.Net.Http.Json;
using System.Threading.Tasks;

namespace Services
{
    public class ChatAnalyzerService : IChatAnalyzerService
    {
        private readonly HttpClient _http;

        public ChatAnalyzerService(HttpClient http)
        {
            _http = http;
        }

        public async Task<ChatResponse> AnalyzeAsync(ChatRequest request)
        {
            var response = await _http.PostAsJsonAsync("/chat", request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<ChatResponse>() ?? new ChatResponse();
        }
    }
}
