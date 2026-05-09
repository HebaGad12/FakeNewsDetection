using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Persistence.Repositories
{
    public class OrganizationTaskRepository : IOrganizationTaskRepository
    {
        private readonly AppDbContext _db;

        public OrganizationTaskRepository(AppDbContext db)
        {
            _db = db;
        }

        // ── Queries ──────────────────────────────────────────────────────────

        public async Task<IEnumerable<OrganizationTask>> GetByOrganizationAsync(Guid organizationId)
        {
            return await _db.OrganizationTasks
                .Include(t => t.AssignedJournalist)
                .Include(t => t.Organization)
                .Include(t => t.Comments)
                    .ThenInclude(c => c.Author)
                .Where(t => t.OrganizationId == organizationId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<OrganizationTask>> GetByJournalistAsync(Guid journalistId)
        {
            return await _db.OrganizationTasks
                .Include(t => t.Organization)
                .Include(t => t.AssignedJournalist)
                .Include(t => t.Comments)
                    .ThenInclude(c => c.Author)
                .Where(t => t.AssignedJournalistId == journalistId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
        }

        public async Task<OrganizationTask?> GetByIdAsync(Guid taskId)
        {
            return await _db.OrganizationTasks
                .Include(t => t.Organization)
                .Include(t => t.AssignedJournalist)
                .Include(t => t.Comments)
                    .ThenInclude(c => c.Author)
                .FirstOrDefaultAsync(t => t.Id == taskId);
        }

        // ── Analytics ────────────────────────────────────────────────────────

        public async Task<TaskDashboardStats> GetDashboardStatsAsync(Guid organizationId)
        {
            var tasks = await _db.OrganizationTasks
                .Where(t => t.OrganizationId == organizationId)
                .ToListAsync();

            var activeStatuses = new[]
            {
                OrganizationTaskStatus.Accepted,
                OrganizationTaskStatus.InProgress,
                OrganizationTaskStatus.NeedsRevision
            };

            return new TaskDashboardStats(
                TotalActive: tasks.Count(t => activeStatuses.Contains(t.Status)),
                Completed: tasks.Count(t => t.Status == OrganizationTaskStatus.Completed),
                PendingReview: tasks.Count(t => t.Status == OrganizationTaskStatus.SubmittedForReview),
                Cancelled: tasks.Count(t => t.Status == OrganizationTaskStatus.Cancelled),
                TotalTasks: tasks.Count
            );
        }

        public async Task<IEnumerable<JournalistTaskPerformance>> GetJournalistPerformanceAsync(Guid organizationId)
        {
            var tasks = await _db.OrganizationTasks
                .Include(t => t.AssignedJournalist)
                .Where(t => t.OrganizationId == organizationId)
                .ToListAsync();

            return tasks
                .GroupBy(t => new { t.AssignedJournalistId, t.AssignedJournalist!.Name })
                .Select(g =>
                {
                    var total = g.Count();
                    var completed = g.Count(t => t.Status == OrganizationTaskStatus.Completed);
                    return new JournalistTaskPerformance(
                        JournalistId: g.Key.AssignedJournalistId,
                        JournalistName: g.Key.Name,
                        TotalAssigned: total,
                        Completed: completed,
                        InProgress: g.Count(t => t.Status == OrganizationTaskStatus.InProgress),
                        PendingReview: g.Count(t => t.Status == OrganizationTaskStatus.SubmittedForReview),
                        CompletionRate: total == 0 ? 0 : Math.Round((double)completed / total * 100, 1)
                    );
                })
                .ToList();
        }

        // ── Commands ─────────────────────────────────────────────────────────

        public async Task AddAsync(OrganizationTask task)
        {
            await _db.OrganizationTasks.AddAsync(task);
        }

        public async Task AddCommentAsync(TaskComment comment)
        {
            await _db.TaskComments.AddAsync(comment);
        }

        public async Task SaveChangesAsync()
        {
            await _db.SaveChangesAsync();
        }
    }
}