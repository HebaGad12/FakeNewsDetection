using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record AdminPostDetailResponse(
        Guid Id,
        string Title,
        string Content,
        string[] Tags,
        Guid AuthorId,
        string AuthorName,
        string AuthorEmail,
        string AuthorRole,
        Guid? OrganizationId,
        string? OrganizationName,
        string VerificationStatus,
        double? ConfidenceScore,
        int? CommunityCredibilityPercent,
        string ModerationStatus,
        string? ModerationNotes,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        int LikeCount,
        int CommentCount,
        int ShareCount,
        int ReportCount,
        int TotalInteractions
    );
}