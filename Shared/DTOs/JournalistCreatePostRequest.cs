using System.Collections.Generic;

namespace Shared.DTOs
{
    public record JournalistCreatePostRequest(
        string Title,
        string Content,
        List<string> Tags,
        List<MediaAttachmentDto>? Media = null
    );
    public record MediaAttachmentDto(
    string TempId,
    string? Copyright,
    int DisplayOrder
);
}