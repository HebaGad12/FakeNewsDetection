using System.ComponentModel.DataAnnotations;

namespace Shared.DTOs
{
    public record ReviewJournalistRequest(
        [Required] bool Approve,
        string? RejectionReason   // required when Approve == false
    );
}