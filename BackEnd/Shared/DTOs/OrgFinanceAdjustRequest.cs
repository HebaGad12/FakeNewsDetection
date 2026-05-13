using System;

namespace Shared.DTOs
{
    public record OrgFinanceAdjustRequest(
        Guid UserId,
        decimal Amount,
        string? Description
    );
}