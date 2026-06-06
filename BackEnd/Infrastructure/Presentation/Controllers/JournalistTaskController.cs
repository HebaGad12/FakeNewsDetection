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
    /// All task-management endpoints available to the Journalist role.
    /// Base route: api/journalists/tasks
    /// </summary>
    [ApiController]
    [Route("api/journalists/tasks")]
    [Authorize(Roles = "Journalist")]
    public class JournalistTaskController : ControllerBase
    {
        private readonly IOrganizationTaskRepository _tasks;
        private readonly IUserRepository _users;
        private readonly INotificationRepository _notifications;
        private readonly IHubContext<NotificationHub> _hub;
        private readonly IPostRepository _posts;

        public JournalistTaskController(
            IOrganizationTaskRepository tasks,
            IUserRepository users,
            INotificationRepository notifications,
            IHubContext<NotificationHub> hub,
            IPostRepository posts)
        {
            _tasks = tasks;
            _users = users;
            _notifications = notifications;
            _hub = hub;
            _posts = posts;
        }

        private Guid GetCallerId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // ════════════════════════════════════════════════════════════════════
        //  LIST MY TASKS
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// GET api/journalists/tasks
        /// Returns all tasks assigned to the calling journalist.
        /// Optional: ?status=InProgress&priority=High
        /// </summary>
        [HttpGet]
        public async Task<ActionResult> GetMyTasks(
            [FromQuery] OrganizationTaskStatus? status,
            [FromQuery] TaskPriority? priority)
        {
            var journalistId = GetCallerId();
            var tasks = await _tasks.GetByJournalistAsync(journalistId);

            if (status.HasValue)
                tasks = tasks.Where(t => t.Status == status.Value);
            if (priority.HasValue)
                tasks = tasks.Where(t => t.Priority == priority.Value);

            var results = tasks.Select(t =>
                MapToResponse(t, t.Organization!, t.AssignedJournalist!));

            return Ok(results);
        }

        // ════════════════════════════════════════════════════════════════════
        //  GET SINGLE TASK
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// GET api/journalists/tasks/{taskId}
        /// </summary>
        [HttpGet("{taskId:guid}")]
        public async Task<ActionResult<OrganizationTaskResponse>> GetTask(Guid taskId)
        {
            var journalistId = GetCallerId();
            var task = await _tasks.GetByIdAsync(taskId);

            if (task is null) return NotFound();
            if (task.AssignedJournalistId != journalistId) return Forbid();

            return Ok(MapToResponse(task, task.Organization!, task.AssignedJournalist!));
        }

        // ════════════════════════════════════════════════════════════════════
        //  JOURNALIST STATUS UPDATES
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// PATCH api/journalists/tasks/{taskId}/status
        /// Journalists can Accept, start InProgress, SubmitForReview, or Resubmit after revision.
        /// </summary>
        [HttpPatch("{taskId:guid}/status")]
        public async Task<ActionResult<OrganizationTaskResponse>> UpdateStatus(
            Guid taskId,
            [FromBody] UpdateTaskStatusRequest req)
        {
            var journalistId = GetCallerId();
            var journalist = await _users.GetByIdAsync(journalistId);
            var task = await _tasks.GetByIdAsync(taskId);

            if (task is null) return NotFound();
            if (task.AssignedJournalistId != journalistId) return Forbid();

            var (valid, error) = ValidateJournalistStatusTransition(task.Status, req.NewStatus);
            if (!valid) return BadRequest(error);

            task.Status = req.NewStatus;
            task.UpdatedAt = DateTime.UtcNow;
            await _tasks.SaveChangesAsync();

            // Notify organization
            await SendTaskNotificationAsync(
                recipientId: task.OrganizationId,
                actorId: journalistId,
                title: BuildNotificationTitle(req.NewStatus),
                message: BuildNotificationMessage(req.NewStatus, task.Title, journalist!.Name),
                type: $"task_{req.NewStatus.ToString().ToLower()}",
                taskId: task.Id);

            return Ok(MapToResponse(task, task.Organization!, task.AssignedJournalist!));
        }

        // ════════════════════════════════════════════════════════════════════
        //  ADD COMMENT
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// POST api/journalists/tasks/{taskId}/comments
        /// Journalist can comment on their own tasks.
        /// </summary>
        [HttpPost("{taskId:guid}/comments")]
        public async Task<ActionResult> AddComment(
            Guid taskId,
            [FromBody] AddTaskCommentRequest req)
        {
            var journalistId = GetCallerId();
            var journalist = await _users.GetByIdAsync(journalistId);
            var task = await _tasks.GetByIdAsync(taskId);

            if (task is null) return NotFound();
            if (task.AssignedJournalistId != journalistId) return Forbid();

            if (string.IsNullOrWhiteSpace(req.Content))
                return BadRequest("Comment cannot be empty.");

            var comment = new TaskComment
            {
                TaskId = taskId,
                AuthorId = journalistId,
                Content = req.Content.Trim()
            };

            await _tasks.AddCommentAsync(comment);
            await _tasks.SaveChangesAsync();

            // Notify organization
            await SendTaskNotificationAsync(
                recipientId: task.OrganizationId,
                actorId: journalistId,
                title: "New Comment on Task",
                message: $"{journalist!.Name} commented on task \"{task.Title}\".",
                type: "task_comment",
                taskId: task.Id);

            return Ok(new TaskCommentResponse(
                comment.Id,
                comment.Content,
                journalistId,
                journalist!.Name,
                comment.CreatedAt));
        }

        // ════════════════════════════════════════════════════════════════════
        //  DRAFT POSTS FOR A TASK
        // ════════════════════════════════════════════════════════════════════

        /// <summary>
        /// GET api/journalists/tasks/{taskId}/drafts
        /// Returns all draft posts the calling journalist has saved for a task.
        /// </summary>
        [HttpGet("{taskId:guid}/drafts")]
        public async Task<ActionResult> GetDrafts(Guid taskId)
        {
            var journalistId = GetCallerId();
            var task = await _tasks.GetByIdAsync(taskId);

            if (task is null) return NotFound("Task not found.");
            if (task.AssignedJournalistId != journalistId) return Forbid();

            var drafts = await _posts.GetDraftsByTaskAsync(taskId, journalistId);

            var result = drafts.Select(p => new
            {
                p.Id,
                p.Title,
                p.Content,
                p.Tags,
                p.IsDraft,
                p.CreatedAt,
                p.UpdatedAt,
                MediaCount = p.Media?.Count ?? 0
            });

            return Ok(result);
        }

        /// <summary>
        /// PUT api/journalists/tasks/{taskId}/drafts/{postId}
        /// Edit a draft post linked to a task (only while task is Accepted or InProgress).
        /// </summary>
        [HttpPut("{taskId:guid}/drafts/{postId:guid}")]
        public async Task<ActionResult> EditDraft(
            Guid taskId,
            Guid postId,
            [FromBody] UpdateDraftRequest req)
        {
            var journalistId = GetCallerId();
            var task = await _tasks.GetByIdAsync(taskId);

            if (task is null) return NotFound("Task not found.");
            if (task.AssignedJournalistId != journalistId) return Forbid();

            var editableStatuses = new[]
            {
                OrganizationTaskStatus.Accepted,
                OrganizationTaskStatus.InProgress,
                OrganizationTaskStatus.NeedsRevision
            };
            if (!editableStatuses.Contains(task.Status))
                return BadRequest($"Drafts can only be edited while the task is Accepted, InProgress, or NeedsRevision. Current status: {task.Status}.");

            var post = await _posts.GetByIdAsync(postId);

            if (post is null) return NotFound("Draft post not found.");
            if (post.AuthorId != journalistId) return Forbid();
            if (post.TaskId != taskId) return BadRequest("This post does not belong to the specified task.");
            if (!post.IsDraft) return BadRequest("This post has already been published and cannot be edited as a draft.");

            if (req.Title is not null)
                post.Title = req.Title.Trim();
            if (req.Content is not null)
                post.Content = req.Content.Trim();
            if (req.Tags is not null)
                post.Tags = req.Tags
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(t => t.Trim())
                    .Where(t => !string.IsNullOrEmpty(t))
                    .ToArray();
            if (req.PublishNow == true)
                post.IsDraft = false;

            await _posts.UpdateAsync(post);

            return Ok(new
            {
                post.Id,
                post.Title,
                post.Content,
                post.Tags,
                post.IsDraft,
                post.UpdatedAt
            });
        }

        // ════════════════════════════════════════════════════════════════════
        //  PRIVATE HELPERS
        // ════════════════════════════════════════════════════════════════════

        private static (bool valid, string error) ValidateJournalistStatusTransition(
            OrganizationTaskStatus current,
            OrganizationTaskStatus next)
        {
            return (current, next) switch
            {
                (OrganizationTaskStatus.Pending, OrganizationTaskStatus.Accepted) => (true, ""),
                (OrganizationTaskStatus.Accepted, OrganizationTaskStatus.InProgress) => (true, ""),
                (OrganizationTaskStatus.InProgress, OrganizationTaskStatus.SubmittedForReview) => (true, ""),
                // After revision is requested, journalist resubmits
                (OrganizationTaskStatus.NeedsRevision, OrganizationTaskStatus.SubmittedForReview) => (true, ""),
                _ => (false, $"Invalid status transition from {current} to {next} for a Journalist.")
            };
        }

        private static string BuildNotificationTitle(OrganizationTaskStatus status) => status switch
        {
            OrganizationTaskStatus.Accepted => "Task Accepted",
            OrganizationTaskStatus.InProgress => "Task In Progress",
            OrganizationTaskStatus.SubmittedForReview => "Task Submitted for Review",
            _ => "Task Updated"
        };

        private static string BuildNotificationMessage(
            OrganizationTaskStatus status,
            string taskTitle,
            string journalistName)
        {
            return status switch
            {
                OrganizationTaskStatus.Accepted => $"{journalistName} accepted task \"{taskTitle}\".",
                OrganizationTaskStatus.InProgress => $"{journalistName} started working on \"{taskTitle}\".",
                OrganizationTaskStatus.SubmittedForReview => $"{journalistName} submitted \"{taskTitle}\" for review.",
                _ => $"{journalistName} updated task \"{taskTitle}\" to {status}."
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