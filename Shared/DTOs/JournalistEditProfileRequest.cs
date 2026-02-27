using System;

namespace Shared.DTOs
{
    // OrganizationId intentionally removed - journalists cannot change their organization via edit profile
    public record JournalistEditProfileRequest(string? Name, string? Email);
}
