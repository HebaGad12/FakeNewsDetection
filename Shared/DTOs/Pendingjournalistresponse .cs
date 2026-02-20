namespace Shared.DTOs
{
    public record PendingJournalistResponse(
        Guid Id,
        string Name,
        string Email,
        string JournalistExternalId,
        DateTime RegisteredAt
    );
}