using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record UserOverviewResponse(int Likes, int Comments, int Reports, int HelpfulReports, int FollowingJournalists);
}
