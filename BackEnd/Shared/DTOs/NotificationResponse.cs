using System;

namespace Shared.DTOs
{
    public record NotificationResponse(
        Guid Id,
        string Title,
        string Message,
        string Type,
        bool IsRead,
        DateTime CreatedAt,
        Guid? ActorId,
        string? ActorName
    );

    public record CreateNotificationRequest(
        Guid UserId,
        string Title,
        string Message,
        string Type = "general"
    );
}