using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Presentation.SignalR_Hubs;
using Shared.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    [ApiController]
    [Route("api/user")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly IPostRepository _posts;
        private readonly IInteractionRepository _interactions;
        private readonly IModerationRepository _moderations;
        private readonly IFollowRepository _follows;

        private readonly IWebHostEnvironment _env;

        private readonly INotificationRepository _notifications; // ← NEW
        private readonly IHubContext<NotificationHub> _hub;      // ← NEW

        public UserController(
            IUserRepository users,
            IPostRepository posts,
            IInteractionRepository interactions,
            IModerationRepository moderations,
            IFollowRepository follows,
             IWebHostEnvironment env,
            INotificationRepository notifications, // ← NEW
            IHubContext<NotificationHub> hub)      // ← NEW
        {
            _users = users;
            _posts = posts;
            _interactions = interactions;
            _moderations = moderations;
            _follows = follows;
 
            _env = env;
            _notifications = notifications; // ← NEW
            _hub = hub;                     // ← NEW
        }

        private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet("me")]
        public async Task<ActionResult<RegularUserResponse>> Me()
        {
            var user = await _users.GetByIdAsync(GetUserId());
            if (user is null) return NotFound("User not found");

            return Ok(new RegularUserResponse(
                user.Id, user.Name, user.Email,
                user.Role.ToString(),
                user.Followers?.Count ?? 0,
                user.Followees?.Count ?? 0
            ));
        }

        /// <summary>
        /// Edit profile — supports updating Name, Email, and Profile bio in one call.
        /// Any field left null is not changed.
        /// </summary>
        [HttpPut("edit")]
        public async Task<ActionResult> EditProfile([FromBody] EditProfileRequest req)
        {
            var user = await _users.GetByIdAsync(GetUserId());
            if (user is null) return NotFound("User not found");

            if (req.Name != null) user.Name = req.Name;
            if (req.Email != null) user.Email = req.Email;
            if (req.Profile != null) user.Profile = req.Profile;

            await _users.UpdateAsync(user);
            return Ok(new { user.Id, user.Name, user.Email, user.Profile });
        }

        [HttpGet("overview")]
        public async Task<ActionResult<UserOverviewResponse>> Overview()
        {
            var uid = GetUserId();
            var interactions = await _interactions.GetByUserAsync(uid);
            var likes = interactions.Count(i => i.Type == InteractionType.Like);
            var comments = interactions.Count(i => i.Type == InteractionType.Comment);
            var reports = interactions.Count(i => i.Type == InteractionType.Report);

            var moderations = await _moderations.GetByActorAsync(uid);
            var helpfulReports = moderations.Count(m => m.Action == ModerationActionType.Keep);

            var followees = await _follows.GetFolloweesAsync(uid);
            var followingJournalists = followees.Count(f => f.Followee.Role == Role.Journalist);

            return Ok(new UserOverviewResponse(likes, comments, reports, helpfulReports, followingJournalists));
        }

        [HttpGet("following")]
        public async Task<ActionResult<IEnumerable<FollowingResponse>>> Following()
        {
            var followees = await _follows.GetFolloweesAsync(GetUserId());

            var dto = followees.Select(f => new FollowingResponse(
                f.Followee.Id, f.Followee.Name, f.Followee.Role.ToString(),
                f.Followee.Organization?.Name,
                f.Followee.Followers?.Count ?? 0,
                f.Followee.Posts?.Count ?? 0,
                f.Followee.CreatedAt
            ));

            return Ok(dto);
        }

        /// <summary>
        /// Follow a journalist or organization. Returns 409 if already following.
        /// </summary>
        [HttpPost("follow/{targetId}")]
        public async Task<ActionResult> Follow(Guid targetId)
        {
            var userId = GetUserId();

            if (userId == targetId)
                return BadRequest("You cannot follow yourself.");

            var targetUser = await _users.GetByIdAsync(targetId);
            if (targetUser == null) return NotFound("User not found");
            if (targetUser.Role != Role.Journalist && targetUser.Role != Role.Organization)
                return BadRequest("You can only follow journalists or organizations.");

            var existing = await _follows.GetAsync(userId, targetId);
            if (existing is not null)
                return Conflict("You are already following this user.");

            await _follows.AddAsync(new Follow
            {
                FollowerId = userId,
                FolloweeId = targetId,
                CreatedAt = DateTime.UtcNow
            });

            // ── Notify the journalist/org being followed ──────────────────────
            var followerName = User.FindFirstValue(ClaimTypes.Name)
                            ?? User.FindFirstValue("name")
                            ?? User.FindFirstValue("unique_name")
                            ?? "Someone";

            var notification = new Notification
            {
                UserId = targetId,   // journalist/org receives it
                ActorId = userId,     // the follower is the actor
                Type = "follow",
                Title = "New Follower",
                Message = $"{followerName} started following you."
            };

            await _notifications.AddAsync(notification);

            await _hub.Clients
                .Group($"user:{targetId}")
                .SendAsync("ReceiveNotification", new
                {
                    notification.Id,
                    notification.Title,
                    notification.Message,
                    notification.Type,
                    notification.IsRead,
                    notification.CreatedAt,
                    ActorId = userId,
                    ActorName = followerName
                });
            // ─────────────────────────────────────────────────────────────────

            targetUser = await _users.GetByIdAsync(targetId);
            return Ok(new { Followers = targetUser?.Followers?.Count ?? 0 });
        }

        [HttpDelete("unfollow/{targetId}")]
        public async Task<ActionResult> Unfollow(Guid targetId)
        {
            var userId = GetUserId();
            await _follows.RemoveAsync(userId, targetId);

            var targetUser = await _users.GetByIdAsync(targetId);
            if (targetUser == null) return NotFound("User not found");
            return Ok(new { Followers = targetUser.Followers?.Count ?? 0 });
        }

        /// <summary>
        /// Report a post. Any authenticated user can report.
        /// </summary>
        [HttpPost("posts/{postId}/report")]
        public async Task<ActionResult> Report(Guid postId, [FromBody] ReportRequest req)
        {
            var userId = GetUserId();

            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            await _interactions.AddAsync(new Interaction
            {
                Id = Guid.NewGuid(),
                PostId = postId,
                UserId = userId,
                Type = InteractionType.Report,
                Content = req.Reason,
                CreatedAt = DateTime.UtcNow
            });

            post = await _posts.GetByIdAsync(postId);
            return Ok(new { Reports = post?.Interactions?.Count(i => i.Type == InteractionType.Report) ?? 0 });
        }

        public record ReportRequest(string Reason);

        [HttpGet("activity")]
        public async Task<ActionResult<IEnumerable<UserActivityResponse>>> Activity()
        {
            var interactions = await _interactions.GetByUserAsync(GetUserId());
            var dto = interactions.Select(a => new UserActivityResponse(
                a.PostId,
                a.Type.ToString(),
                a.Post?.Title ?? "Unknown Post",
                a.CreatedAt
            ));
            return Ok(dto);
        }

        [HttpPost("{userId}/upload-picture")]
        public async Task<IActionResult> UploadProfilePicture(Guid userId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var uploadsPath = Path.Combine(_env.ContentRootPath, "Media", "Uploads", "Users", userId.ToString());
            Directory.CreateDirectory(uploadsPath);

            var filePath = Path.Combine(uploadsPath, file.FileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }
            return Ok(new { Message = "Profile picture uploaded successfully", Path = filePath });
        }

        [HttpGet("{userId}/picture/{fileName}")]
        public IActionResult GetProfilePicture(Guid userId, string fileName)
        {
            var filePath = Path.Combine(_env.ContentRootPath, "Media", "Uploads", "Users", userId.ToString(), fileName);

            if (!System.IO.File.Exists(filePath))
                return NotFound("File not found.");

            var imageBytes = System.IO.File.ReadAllBytes(filePath);
            return File(imageBytes, "image/jpeg");
        }
    }
}