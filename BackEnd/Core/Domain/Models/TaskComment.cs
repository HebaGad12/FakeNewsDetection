using System;

namespace Domain.Models
{
    /// <summary>
    /// A comment or review note left on a task by either the Organization or the Journalist.
    /// </summary>
    public class TaskComment
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ── Who wrote this comment ───────────────────────────────────────────
        public Guid AuthorId { get; set; }
        public User? Author { get; set; }

        // ── The task this comment belongs to ────────────────────────────────
        public Guid TaskId { get; set; }
        public OrganizationTask? Task { get; set; }
    }
}