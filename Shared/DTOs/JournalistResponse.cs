using System;

namespace Shared.DTOs
{
    public record JournalistResponse(
        Guid Id,
        string Name,
        string Email,
        string Role,
        string? Organization,
        int Followers,
        int Posts,
        DateTime CreatedAt
    );
}