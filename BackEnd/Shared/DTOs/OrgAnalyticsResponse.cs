using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record OrgAnalyticsResponse(
        Guid OrganizationId,
        string OrganizationName,
        int TotalPosts,
        int PendingPosts,
        int ApprovedPosts,
        int RejectedPosts,
        int TotalFollowers,
        int JournalistCount,
        int ActiveJournalistCount,
        int TotalLikesReceived,
        int TotalCommentsReceived,
        int TotalReportsReceived,
        decimal WalletBalance
    );
}
