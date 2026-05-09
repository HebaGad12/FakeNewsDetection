using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicesAbstraction;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    [ApiController]
    [Route("api/chat")]
    [Authorize(Roles = "Journalist")]
    public class ChatController : ControllerBase
    {
        private readonly IChatAnalyzerService _chatAnalyzer;

        public ChatController(IChatAnalyzerService chatAnalyzer)
        {
            _chatAnalyzer = chatAnalyzer;
        }

        [HttpPost]
        public async Task<IActionResult> Analyze([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Text))
                return BadRequest("Text is required");
            if (string.IsNullOrWhiteSpace(request.Mode))
                return BadRequest("Mode is required");

            var result = await _chatAnalyzer.AnalyzeAsync(request);
            return Ok(result);
        }
    }
}
