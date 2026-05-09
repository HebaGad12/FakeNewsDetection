using Domain.Enums;
using System;
using System.Collections.Generic;

namespace Domain.Models
{
    /// <summary>
    /// Represents a task assigned by an Organization to one of its Journalists.
    /// </summary>
    public class OrganizationTask
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public TaskPriority Priority { get; set; } = TaskPriority.Medium;
        public OrganizationTaskStatus Status { get; set; } = OrganizationTaskStatus.Pending;

        public DateTime Deadline { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ── Organization that created this task ──────────────────────────────
        public Guid OrganizationId { get; set; }
        public User? Organization { get; set; }

        // ── Journalist the task is assigned to ──────────────────────────────
        public Guid AssignedJournalistId { get; set; }
        public User? AssignedJournalist { get; set; }

        // ── Comments / review notes ──────────────────────────────────────────
        public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
    }
}