using System.Collections.Generic;

namespace Shared.DTOs
{
    /// <summary>
    /// Used when a journalist creates a new article.
    /// Media items are optional — paths are stored as-is (file upload handled separately).
    /// IsCopyrighted is only honoured for items where MediaType == "image".
    /// </summary>
    public record JournalistCreatePostRequest(
        string Title,
        string Content,
        List<string> Tags,
        List<MediaItemRequest>? Media = null
    );
}
