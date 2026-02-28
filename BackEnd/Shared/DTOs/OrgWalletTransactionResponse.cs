using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record OrgWalletTransactionResponse(
        Guid Id,
        decimal Amount,
        string Type,
        string? Description,
        string? DonorName,
        DateTime CreatedAt
    );
}
