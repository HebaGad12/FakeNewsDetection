using System;

namespace Domain.Models
{
    public class OrganizationFollow
    {
        public Guid FollowerId { get; set; }
        public User Follower { get; set; } = null!;

        public Guid OrganizationId { get; set; }
        public Organization Organization { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}