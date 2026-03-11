using System;
using System.Collections.Generic;

namespace Shared.DTOs
{
    public record JournalistPostResponse(
        Guid Id,
        string Title,
        string Content,
        DateTime CreatedAt,
        int Likes,
        int Comments,
        int Reports,
        string Organization,
        string ModerationStatus,
        List<MediaDto> Media
    );
}