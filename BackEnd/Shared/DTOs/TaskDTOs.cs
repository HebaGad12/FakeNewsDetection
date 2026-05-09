using Domain.Enums;
using System;
using System.Collections.Generic;

namespace Shared.DTOs
{
    // ── Requests ─────────────────────────────────────────────────────────────

    /// <summary>Organization → create a new task for a journalist.</summary>
    public record CreateTaskRequest(
        string Title,
        string Description,
        Guid AssignedJournalistId,
        TaskPriority Priority,
        DateTime Deadline
    );

    /// <summary>Organization → edit an existing task (only while Pending/Accepted).</summary>
    public record UpdateTaskRequest(
        string? Title,
        string? Description,
        TaskPriority? Priority,
        DateTime? Deadline
    );

    /// <summary>Generic status-update body used by both Organization and Journalist endpoints.</summary>
    public record UpdateTaskStatusRequest(
        OrganizationTaskStatus NewStatus
    );

    /// <summary>Post a comment or review note on a task.</summary>
    public record AddTaskCommentRequest(
        string Content
    );

    // ── Responses ────────────────────────────────────────────────────────────

    public record TaskCommentResponse(
        Guid Id,
        string Content,
        Guid AuthorId,
        string AuthorName,
        DateTime CreatedAt
    );

    public record OrganizationTaskResponse(
        Guid Id,
        string Title,
        string Description,
        TaskPriority Priority,
        OrganizationTaskStatus Status,
        DateTime Deadline,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        Guid OrganizationId,
        string OrganizationName,
        Guid AssignedJournalistId,
        string AssignedJournalistName,
        IEnumerable<TaskCommentResponse> Comments
    );

    // ── Dashboard / Analytics ─────────────────────────────────────────────────

    public record TaskDashboardResponse(
        int TotalActive,
        int Completed,
        int PendingReview,
        int Cancelled,
        int TotalTasks,
        IEnumerable<JournalistPerformanceResponse> JournalistPerformance
    );

    public record JournalistPerformanceResponse(
        Guid JournalistId,
        string JournalistName,
        int TotalAssigned,
        int Completed,
        int InProgress,
        int PendingReview,
        double CompletionRate
    );
}