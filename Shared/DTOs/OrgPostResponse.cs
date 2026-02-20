using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record OrgPostResponse(
        Guid Id,
        string Title,
        string Content,
        string[] Tags,
        string AuthorName,
        Guid AuthorId,
        string ModerationStatus,
        string VerificationStatus,
        string? ModerationNotes,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        int Likes,
        int Comments
    );
}
