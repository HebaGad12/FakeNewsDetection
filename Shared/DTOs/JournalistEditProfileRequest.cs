using System;

namespace Shared.DTOs
{
    public record JournalistEditProfileRequest(string? Name, Guid? OrganizationId);
}