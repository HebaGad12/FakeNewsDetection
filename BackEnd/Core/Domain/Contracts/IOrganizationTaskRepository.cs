using Domain.Enums;
using Domain.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface IOrganizationTaskRepository
    {
        // ── Queries ──────────────────────────────────────────────────────────

        /// <summary>Returns all tasks created by the given organization (with comments).</summary>
        Task<IEnumerable<OrganizationTask>> GetByOrganizationAsync(Guid organizationId);

        /// <summary>Returns all tasks assigned to the given journalist (with comments).</summary>
        Task<IEnumerable<OrganizationTask>> GetByJournalistAsync(Guid journalistId);

        /// <summary>Returns a single task with its comments and related users.</summary>
        Task<OrganizationTask?> GetByIdAsync(Guid taskId);

        // ── Analytics ────────────────────────────────────────────────────────

        /// <summary>Returns task-level dashboard stats for an organization.</summary>
        Task<TaskDashboardStats> GetDashboardStatsAsync(Guid organizationId);

        /// <summary>Returns per-journalist performance metrics for an organization.</summary>
        Task<IEnumerable<JournalistTaskPerformance>> GetJournalistPerformanceAsync(Guid organizationId);

        // ── Commands ─────────────────────────────────────────────────────────

        Task AddAsync(OrganizationTask task);
        Task AddCommentAsync(TaskComment comment);
        Task SaveChangesAsync();
    }

    // ── Lightweight analytics projections (not persisted) ────────────────────

    public record TaskDashboardStats(
        int TotalActive,
        int Completed,
        int PendingReview,
        int Cancelled,
        int TotalTasks
    );

    public record JournalistTaskPerformance(
        Guid JournalistId,
        string JournalistName,
        int TotalAssigned,
        int Completed,
        int InProgress,
        int PendingReview,
        double CompletionRate   // 0–100
    );
}