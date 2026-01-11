using Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Models
{
    public class Post
    {
        public Guid Id { get; set; }
        public Guid AuthorId { get; set; }
        public Guid? OrganizationId { get; set; } 
        public string Title { get; set; } = "";
        public string Content { get; set; } = "";
        public string[] Tags { get; set; } = Array.Empty<string>();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Unknown;
        public double? ConfidenceScore { get; set; } 
        public int? CommunityCredibilityPercent { get; set; }
        public ModerationStatus ModerationStatus { get; set; } = ModerationStatus.Pending;
        public string? ModerationNotes { get; set; }
    }
}
