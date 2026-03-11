using System;

namespace Shared.DTOs
{
    /// <summary>
    /// Returned in every API response that includes post media.
    /// </summary>
    public record MediaDto(
        Guid MediaId,
        string Path,
        string MediaType,
        bool IsCopyrighted,
        DateTime UploadedAt
    );
}
