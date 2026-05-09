using System.Threading.Tasks;

namespace ServicesAbstraction
{
    public class ChatRequest
    {
        [System.Text.Json.Serialization.JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;
        
        [System.Text.Json.Serialization.JsonPropertyName("mode")]
        public string Mode { get; set; } = string.Empty;
    }

    public class ChatResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;
        
        [System.Text.Json.Serialization.JsonPropertyName("mode")]
        public string Mode { get; set; } = string.Empty;
        
        [System.Text.Json.Serialization.JsonPropertyName("analysis")]
        public string Analysis { get; set; } = string.Empty;
    }

    public interface IChatAnalyzerService
    {
        Task<ChatResponse> AnalyzeAsync(ChatRequest request);
    }
}
