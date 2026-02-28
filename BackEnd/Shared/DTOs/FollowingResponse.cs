using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record FollowingResponse(Guid Id, string Name, string Role, string? OrganizationName, int FollowersCount, int RecentPostsCount, DateTime MemberSince);
}
