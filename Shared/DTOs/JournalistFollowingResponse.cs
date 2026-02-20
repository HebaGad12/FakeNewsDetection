using System;

namespace Shared.DTOs
{
    public record JournalistFollowingResponse(Guid Id, string Name, string Role, int Followers);
}