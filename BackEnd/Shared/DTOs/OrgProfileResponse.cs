using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record OrgProfileResponse(
        Guid Id,
        string Name,
        string Email,
        string? Profile,
        bool IsActive,
        DateTime CreatedAt,
        int TotalFollowers,
        int TotalPosts,
        decimal WalletBalance
    );
}
