using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Presentation.SignalR_Hubs;
using Shared.DTOs;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    /// <summary>
    /// All task-management endpoints available to the Organization role.
    /// Base route: api/organizations/tasks
    /// </summary>
    [ApiController]
    [Route("api/organizations/tasks")]
    [Authorize(Roles = "Organization")]
    public class OrganizationTaskController : ControllerBase
    {
        private readonly IOrganizationTaskRepository _tasks;
        private readonly IUserRepository _users;
        private readonly INotificationRepository _notifications;
        private readonly IHubContext<NotificationHub> _hub;

        public OrganizationTaskController(
            IOrganizationTaskRepository tasks,
            IUserRepository users,
            INotificationRepository notifications,
            IHubContext<NotificationHub> hub)
        {
            _tasks = tasks;
            _users = users;
            _notifications = notifications;
            _hub = hub;
        }

        private Guid GetCallerId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // ════════════════════════════════════════════════════════════════════
        //  CREATE TASK
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// POST api/organizations/tasks
        /// Create a new task and assign it to one of the org's journalists.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<OrganizationTaskResponse>> CreateTask(
            [FromBody] CreateTaskRequest req)
        {
            var orgId = GetCallerId();
            var org = await _users.GetByIdAsync(orgId);
            if (org is null) return Unauthorized();

            // Verify the journalist belongs to this org
            var journalist = await _users.GetByIdAsync(req.AssignedJournalistId);
            if (journalist is null || journalist.OrganizationId != orgId)
                return BadRequest("Journalist is not a member of your organization.");

            if (req.Deadline <= DateTime.UtcNow)
                return BadRequest("Deadline must be in the future.");

            if (string.IsNullOrWhiteSpace(req.Title))
                return BadRequest("Task title is required.");

            var task = new OrganizationTask
            {
                Title = req.Title.Trim(),
                Description = req.Description?.Trim() ?? string.Empty,
                Priority = req.Priority,
                Deadline = req.Deadline,
                OrganizationId = orgId,
                AssignedJournalistId = req.AssignedJournalistId,
                Status = OrganizationTaskStatus.Pending
            };

            await _tasks.AddAsync(task);
            await _tasks.SaveChangesAsync();

            // ── Notify journalist in real-time ───────────────────────────────
            var notification = new Notification
            {
                UserId = req.AssignedJournalistId,
                ActorId = orgId,
                Title = "New Task Assigned",
                Message = $"{org.Name} assigned you a new task: \"{task.Title}\"",
                Type = "task_assigned"
            };
            await _notifications.AddAsync(notification);
            await _tasks.SaveChangesAsync();

            await _hub.Clients
                .Group($"user:{req.AssignedJournalistId}")
                .SendAsync("ReceiveNotification", new
                {
                    notification.Id,
                    notification.Title,
                    notification.Message,
                    notification.Type,
                    notification.CreatedAt,
                    TaskId = task.Id
                });

            return CreatedAtAction(
                nameof(GetTask),
                new { taskId = task.Id },
                MapToResponse(task, org, journalist));
        }

        // ════════════════════════════════════════════════════════════════════
        //  LIST ORG TASKS
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// GET api/organizations/tasks
        /// Returns all tasks created by the calling organization.
        /// Optional query: ?status=Pending&priority=High&journalistId=...
        /// </summary>
        [HttpGet]
        public async Task<ActionResult> GetMyTasks(
            [FromQuery] OrganizationTaskStatus? status,
            [FromQuery] TaskPriority? priority,
            [FromQuery] Guid? journalistId)
        {
            var orgId = GetCallerId();
            var tasks = await _tasks.GetByOrganizationAsync(orgId);

            if (status.HasValue)
                tasks = tasks.Where(t => t.Status == status.Value);
            if (priority.HasValue)
                tasks = tasks.Where(t => t.Priority == priority.Value);
            if (journalistId.HasValue)
                tasks = tasks.Where(t => t.AssignedJournalistId == journalistId.Value);

            var results = tasks.Select(t =>
                MapToResponse(t, t.Organization!, t.AssignedJournalist!));

            return Ok(results);
        }

        // ════════════════════════════════════════════════════════════════════
        //  GET SINGLE TASK
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// GET api/organizations/tasks/{taskId}
        /// </summary>
        [HttpGet("{taskId:guid}")]
        public async Task<ActionResult<OrganizationTaskResponse>> GetTask(Guid taskId)
        {
            var orgId = GetCallerId();
            var task = await _tasks.GetByIdAsync(taskId);

            if (task is null) return NotFound();
            if (task.OrganizationId != orgId) return Forbid();

            return Ok(MapToResponse(task, task.Organization!, task.AssignedJournalist!));
        }

        // ════════════════════════════════════════════════════════════════════
        //  UPDATE TASK (title / description / priority / deadline)
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// PUT api/organizations/tasks/{taskId}
        /// Orgs can edit tasks that are still Pending or Accepted.
        /// </summary>
        [HttpPut("{taskId:guid}")]
        public async Task<ActionResult<OrganizationTaskResponse>> UpdateTask(
            Guid taskId,
            [FromBody] UpdateTaskRequest req)
        {
            var orgId = GetCallerId();
            var org = await _users.GetByIdAsync(orgId);
            var task = await _tasks.GetByIdAsync(taskId);

            if (task is null) return NotFound();
            if (task.OrganizationId != orgId) return Forbid();

            var editableStatuses = new[]
            {
                OrganizationTaskStatus.Pending,
                OrganizationTaskStatus.Accepted
            };
            if (!editableStatuses.Contains(task.Status))
                return BadRequest("Task can only be edited while Pending or Accepted.");

            if (req.Title is not null)
                task.Title = req.Title.Trim();
            if (req.Description is not null)
                task.Description = req.Description.Trim();
            if (req.Priority.HasValue)
                task.Priority = req.Priority.Value;
            if (req.Deadline.HasValue)
            {
                if (req.Deadline.Value <= DateTime.UtcNow)
                    return BadRequest("Deadline must be in the future.");
                task.Deadline = req.Deadline.Value;
            }

            task.UpdatedAt = DateTime.UtcNow;
            await _tasks.SaveChangesAsync();

            // Notify journalist of the edit
            await SendTaskNotificationAsync(
                recipientId: task.AssignedJournalistId,
                actorId: orgId,
                title: "Task Updated",
                message: $"{org!.Name} updated task \"{task.Title}\".",
                type: "task_updated",
                taskId: task.Id);

            return Ok(MapToResponse(task, task.Organization!, task.AssignedJournalist!));
        }

        // ════════════════════════════════════════════════════════════════════
        //  DELETE TASK
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// DELETE api/organizations/tasks/{taskId}
        /// Only allowed when the task is still Pending.
        /// </summary>
        [HttpDelete("{taskId:guid}")]
        public async Task<ActionResult> DeleteTask(Guid taskId)
        {
            var orgId = GetCallerId();
            var task = await _tasks.GetByIdAsync(taskId);

            if (task is null) return NotFound();
            if (task.OrganizationId != orgId) return Forbid();

            if (task.Status != OrganizationTaskStatus.Pending)
                return BadRequest("Only Pending tasks can be deleted. Cancel the task first.");

            // Soft-cancel instead of hard delete to preserve audit trail
            task.Status = OrganizationTaskStatus.Cancelled;
            task.UpdatedAt = DateTime.UtcNow;
            await _tasks.SaveChangesAsync();

            await SendTaskNotificationAsync(
                recipientId: task.AssignedJournalistId,
                actorId: orgId,
                title: "Task Cancelled",
                message: $"Task \"{task.Title}\" has been cancelled.",
                type: "task_cancelled",
                taskId: task.Id);

            return NoContent();
        }

        // ════════════════════════════════════════════════════════════════════
        //  ORG STATUS UPDATES (Approve / Reject / Request Revision)
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// PATCH api/organizations/tasks/{taskId}/status
        /// Organization can Approve, Reject, NeedsRevision, Complete, or Cancel.
        /// </summary>
        [HttpPatch("{taskId:guid}/status")]
        public async Task<ActionResult<OrganizationTaskResponse>> UpdateStatus(
            Guid taskId,
            [FromBody] UpdateTaskStatusRequest req)
        {
            var orgId = GetCallerId();
            var org = await _users.GetByIdAsync(orgId);
            var task = await _tasks.GetByIdAsync(taskId);

            if (task is null) return NotFound();
            if (task.OrganizationId != orgId) return Forbid();

            // Only validate that the new status is a defined enum value
            if (!Enum.IsDefined(typeof(OrganizationTaskStatus), req.NewStatus))
                return BadRequest($"Invalid status value: {(int)req.NewStatus}.");

            task.Status = req.NewStatus;
            task.UpdatedAt = DateTime.UtcNow;
            await _tasks.SaveChangesAsync();

            var (notifTitle, notifMsg, notifType) = BuildStatusNotification(req.NewStatus, task.Title, org!.Name);
            await SendTaskNotificationAsync(
                recipientId: task.AssignedJournalistId,
                actorId: orgId,
                title: notifTitle,
                message: notifMsg,
                type: notifType,
                taskId: task.Id);

            return Ok(MapToResponse(task, task.Organization!, task.AssignedJournalist!));
        }

        // ════════════════════════════════════════════════════════════════════
        //  ADD COMMENT / REVIEW NOTE
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// POST api/organizations/tasks/{taskId}/comments
        /// </summary>
        [HttpPost("{taskId:guid}/comments")]
        public async Task<ActionResult> AddComment(
            Guid taskId,
            [FromBody] AddTaskCommentRequest req)
        {
            var orgId = GetCallerId();
            var org = await _users.GetByIdAsync(orgId);
            var task = await _tasks.GetByIdAsync(taskId);

            if (task is null) return NotFound();
            if (task.OrganizationId != orgId) return Forbid();

            if (string.IsNullOrWhiteSpace(req.Content))
                return BadRequest("Comment cannot be empty.");

            var comment = new TaskComment
            {
                TaskId = taskId,
                AuthorId = orgId,
                Content = req.Content.Trim()
            };

            await _tasks.AddCommentAsync(comment);
            await _tasks.SaveChangesAsync();

            // Notify journalist
            await SendTaskNotificationAsync(
                recipientId: task.AssignedJournalistId,
                actorId: orgId,
                title: "New Review Note",
                message: $"{org!.Name} left a comment on task \"{task.Title}\".",
                type: "task_comment",
                taskId: task.Id);

            return Ok(new TaskCommentResponse(
                comment.Id,
                comment.Content,
                orgId,
                org!.Name,
                comment.CreatedAt));
        }

        // ════════════════════════════════════════════════════════════════════
        //  DASHBOARD ANALYTICS
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// GET api/organizations/tasks/dashboard
        /// Returns aggregate task stats and journalist performance metrics.
        /// </summary>
        [HttpGet("dashboard")]
        public async Task<ActionResult<TaskDashboardResponse>> GetDashboard()
        {
            var orgId = GetCallerId();
            var stats = await _tasks.GetDashboardStatsAsync(orgId);
            var performance = await _tasks.GetJournalistPerformanceAsync(orgId);

            return Ok(new TaskDashboardResponse(
                stats.TotalActive,
                stats.Completed,
                stats.PendingReview,
                stats.Cancelled,
                stats.TotalTasks,
                performance.Select(p => new JournalistPerformanceResponse(
                    p.JournalistId,
                    p.JournalistName,
                    p.TotalAssigned,
                    p.Completed,
                    p.InProgress,
                    p.PendingReview,
                    p.CompletionRate))));
        }

        // ════════════════════════════════════════════════════════════════════
        //  PRIVATE HELPERS
        // ════════════════════════════════════════════════════════════════════

        private static (bool valid, string error) ValidateOrgStatusTransition(
            OrganizationTaskStatus current,
            OrganizationTaskStatus next)
        {
            return (current, next) switch
            {
                // From SubmittedForReview an org can approve, reject, or request revision
                (OrganizationTaskStatus.SubmittedForReview, OrganizationTaskStatus.Approved) => (true, ""),
                (OrganizationTaskStatus.SubmittedForReview, OrganizationTaskStatus.Rejected) => (true, ""),
                (OrganizationTaskStatus.SubmittedForReview, OrganizationTaskStatus.NeedsRevision) => (true, ""),
                // Once approved, org can mark as completed
                (OrganizationTaskStatus.Approved, OrganizationTaskStatus.Completed) => (true, ""),
                // Org can cancel any non-terminal task
                (OrganizationTaskStatus.Pending, OrganizationTaskStatus.Cancelled) => (true, ""),
                (OrganizationTaskStatus.Accepted, OrganizationTaskStatus.Cancelled) => (true, ""),
                (OrganizationTaskStatus.InProgress, OrganizationTaskStatus.Cancelled) => (true, ""),
                _ => (false, $"Invalid status transition from {current} to {next} for an Organization.")
            };
        }

        private static (string title, string message, string type) BuildStatusNotification(
            OrganizationTaskStatus status,
            string taskTitle,
            string orgName)
        {
            return status switch
            {
                OrganizationTaskStatus.Approved => ("Task Approved", $"{orgName} approved your submission for \"{taskTitle}\".", "task_approved"),
                OrganizationTaskStatus.Rejected => ("Task Rejected", $"{orgName} rejected task \"{taskTitle}\".", "task_rejected"),
                OrganizationTaskStatus.NeedsRevision => ("Revision Requested", $"{orgName} requested revisions on \"{taskTitle}\". Check the comments.", "task_revision"),
                OrganizationTaskStatus.Completed => ("Task Completed", $"Task \"{taskTitle}\" has been marked as completed.", "task_completed"),
                OrganizationTaskStatus.Cancelled => ("Task Cancelled", $"Task \"{taskTitle}\" has been cancelled.", "task_cancelled"),
                _ => ("Task Updated", $"Task \"{taskTitle}\" status changed to {status}.", "task_updated")
            };
        }

        private async Task SendTaskNotificationAsync(
            Guid recipientId, Guid actorId,
            string title, string message, string type, Guid taskId)
        {
            var notification = new Notification
            {
                UserId = recipientId,
                ActorId = actorId,
                Title = title,
                Message = message,
                Type = type
            };
            await _notifications.AddAsync(notification);
            await _tasks.SaveChangesAsync();

            await _hub.Clients
                .Group($"user:{recipientId}")
                .SendAsync("ReceiveNotification", new
                {
                    notification.Id,
                    notification.Title,
                    notification.Message,
                    notification.Type,
                    notification.CreatedAt,
                    TaskId = taskId
                });
        }

        private static OrganizationTaskResponse MapToResponse(
            OrganizationTask task,
            User org,
            User journalist)
        {
            return new OrganizationTaskResponse(
                task.Id,
                task.Title,
                task.Description,
                task.Priority,
                task.Status,
                task.Deadline,
                task.CreatedAt,
                task.UpdatedAt,
                org.Id,
                org.Name,
                journalist.Id,
                journalist.Name,
                task.Comments.OrderBy(c => c.CreatedAt).Select(c => new TaskCommentResponse(
                    c.Id,
                    c.Content,
                    c.AuthorId,
                    c.Author?.Name ?? "Unknown",
                    c.CreatedAt))
            );
        }
    }
}