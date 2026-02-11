using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record AdminPostListResponse(
        Guid Id,
        string Title,
        string AuthorName,
        string AuthorEmail,
        Guid AuthorId,
        string VerificationStatus,
        double? ConfidenceScore,
        string ModerationStatus,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        int InteractionCount,
        string? OrganizationName
    );
}
