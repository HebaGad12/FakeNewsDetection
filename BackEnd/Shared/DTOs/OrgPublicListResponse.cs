using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record OrgPublicListResponse(
        Guid Id,
        string Name,
        string? Profile,
        DateTime CreatedAt
    );
}
