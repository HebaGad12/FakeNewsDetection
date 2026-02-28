using System.Collections.Generic;

namespace Shared.DTOs
{
    public record JournalistCreatePostRequest(string Title, string Content, List<string> Tags);
}