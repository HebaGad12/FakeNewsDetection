using System;

namespace Shared.DTOs
{
    public record EditProfileRequest(string? Name, string? Email, string? Profile);
}
