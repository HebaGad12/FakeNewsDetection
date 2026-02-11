using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record AdminUserListResponse(
        Guid Id,
        string Name,
        string Email,
        string Role,
        bool IsActive,
        DateTime CreatedAt,
        Guid? OrganizationId,
        string? OrganizationName,
        int PostCount,
        int FollowerCount,
        int FollowingCount
    );
}

