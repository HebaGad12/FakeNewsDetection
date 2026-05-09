using Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Domain.Models
{
    public class Post
    {
        public Guid Id { get; set; }

        public Guid AuthorId { get; set; }
        public Guid? CommunityId { get; set; }
        [JsonIgnore]
        public User Author { get; set; } = null!;
        [JsonIgnore]
        public Community Community { get; set; }

        // FK to User with Role=Organization (nullable - only set when journalist is org member)
        public Guid? OrganizationId { get; set; }
        public User? OrganizationUser { get; set; }

        public string Title { get; set; } = "";
        public string Content { get; set; } = "";
        public string[] Tags { get; set; } = Array.Empty<string>();

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Unknown;
        public double? ConfidenceScore { get; set; }
        public int? CommunityCredibilityPercent { get; set; }
        public ModerationStatus ModerationStatus { get; set; } = ModerationStatus.Pending;
        public string? ModerationNotes { get; set; }
        public ICollection<Interaction> Interactions { get; set; } = new List<Interaction>();
        public ICollection<ModerationAction> ModerationActions { get; set; } = new List<ModerationAction>();
        public ICollection<PostMedia> Media { get; set; } = new List<PostMedia>();
    }
}
