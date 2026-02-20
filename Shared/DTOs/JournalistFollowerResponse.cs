using System;

namespace Shared.DTOs
{
    public record JournalistFollowerResponse(Guid Id, string Name, string Role, int Followers);
}