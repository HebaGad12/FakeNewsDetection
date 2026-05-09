using Domain.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string PasswordHash { get; set; } = "";
        public Role Role { get; set; }
        public bool IsActive { get; set; } = true;
        public RegistrationStatus RegistrationStatus { get; set; } = RegistrationStatus.Approved;
        public string? RejectionReason { get; set; }
        public string? ProfilePictureUrl { get; set; }

        // Journalist-specific
        public string? JournalistExternalId { get; set; }

        // Organization-specific fields (null for non-org users)
        public string? License { get; set; }
        public string? Profile { get; set; }

        // For journalists: which org user they belong to (FK to another User with Role=Organization)
        public Guid? OrganizationId { get; set; }
        public User? Organization { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Post> Posts { get; set; } = new List<Post>();
        public ICollection<Interaction> Interactions { get; set; } = new List<Interaction>();
        public ICollection<ModerationAction> ModerationActions { get; set; } = new List<ModerationAction>();
        public ICollection<Follow> Followers { get; set; } = new List<Follow>();
        public ICollection<Follow> Followees { get; set; } = new List<Follow>();
        public ICollection<Membership> Memberships { get; set; } = new List<Membership>();


        // Organization-specific navigations (only populated when Role=Organization)
        public ICollection<User> OrgMembers { get; set; } = new List<User>();
        [InverseProperty("Creator")]
        public ICollection<Community> CommunitiesCreated { get; set; } = new List<Community>();
    }
}
