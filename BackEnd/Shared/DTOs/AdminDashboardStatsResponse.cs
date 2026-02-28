using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record AdminDashboardStatsResponse(
        int TotalUsers,
        int ActiveUsers,
        int InactiveUsers,
        int TotalPosts,
        int PendingPosts,
        int ApprovedPosts,
        int RejectedPosts,
        int FlaggedPosts,
        int VerifiedPosts,
        int FakePosts,
        int MisleadingPosts,
        int UnknownPosts,
        int TotalJournalists,
        int TotalOrganizations,
        int TotalRegularUsers,
        int TotalAdmins,
        int PendingJournalistRequests,
        int RejectedJournalistRequests,
        int PendingOrganizationRequests,    
        int RejectedOrganizationRequests
    );
}