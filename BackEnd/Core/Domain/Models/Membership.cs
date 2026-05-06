using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Models
{
    public class Membership
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid CommunityId { get; set; }
        public string Role { get; set; } = "Member";
        public bool IsBanned { get; set; } = false;
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        public User User { get; set; }
        public Community Community { get; set; }
    }

}