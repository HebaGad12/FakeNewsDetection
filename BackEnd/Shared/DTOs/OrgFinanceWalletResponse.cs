using System;

namespace Shared.DTOs
{
    public record OrgFinanceWalletResponse(
        Guid WalletId,
        Guid UserId,
        string UserName,
        string Email,
        string LicenceNumber,
        string Role,
        bool IsActive,
        decimal Balance,
        DateTime UpdatedAt,
        int TransactionCount
    );
}