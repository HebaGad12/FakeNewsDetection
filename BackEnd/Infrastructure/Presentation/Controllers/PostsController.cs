// ─────────────────────────────────────────────────────────────────────────────
// FILE: Infrastructure/Presentation/Controllers/PostsController.cs
//
// CHANGE: One new endpoint added at the bottom:
//   GET /api/posts/by-task/{taskId}
//   → returns the post linked to a given OrganizationTask ID (if any)
//
// Everything else is identical to your existing PostsController.
// ─────────────────────────────────────────────────────────────────────────────

using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    [ApiController]
    [Route("api/posts")]
    [Authorize]
    public class PostsController : ControllerBase
    {
        private readonly IPostRepository _posts;
        private readonly IInteractionRepository _interactions;
        private readonly IUserRepository _users;
        private readonly IPostMediaRepository _media;
        private readonly IModerationRepository _moderation;

        public PostsController(
            IPostRepository posts,
            IInteractionRepository interactions,
            IUserRepository users,
            IPostMediaRepository media,
            IModerationRepository moderation)
        {
            _posts        = posts;
            _interactions = interactions;
            _users        = users;
            _media        = media;
            _moderation   = moderation;
        }

        private Guid   GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        private string GetRole()   => User.FindFirstValue(ClaimTypes.Role) ?? "";

        // ── GET /api/posts ────────────────────────────────────────────────
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<object>>> GetAll()
        {
            var posts    = await _posts.GetAllAsync();
            var allUsers = await _users.GetAllAsync();
            var userDict = allUsers.ToDictionary(u => u.Id);

            var approved = posts
                .Where(p => p.ModerationStatus == ModerationStatus.Approved)
                .OrderByDescending(p => p.CreatedAt);

            var result = new List<object>();
            foreach (var p in approved)
            {
                var mediaItems = await _media.GetByPostIdAsync(p.Id);
                userDict.TryGetValue(p.AuthorId, out var author);

                string orgName = "Independent";
                if (p.OrganizationId.HasValue && userDict.TryGetValue(p.OrganizationId.Value, out var org))
                    orgName = org.Name;

                result.Add(new
                {
                    p.Id,
                    p.Title,
                    p.Content,
                    p.Tags,
                    p.CreatedAt,
                    p.VerificationStatus,
                    p.ConfidenceScore,
                    AuthorId           = p.AuthorId,
                    AuthorName         = author?.Name ?? "Unknown",
                    OrganizationName   = orgName,
                    Likes              = p.Interactions?.Count(i => i.Type == InteractionType.Like)    ?? 0,
                    Comments           = p.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0,
                    Media              = mediaItems.Select(m => new MediaDto(
                                             m.Id, m.Path, m.MediaType, m.IsCopyrighted, m.UploadedAt))
                });
            }

            return Ok(result);
        }

        // ── GET /api/posts/{id} ───────────────────────────────────────────
        [HttpGet("{id:guid}")]
        [AllowAnonymous]
        public async Task<ActionResult<object>> GetById(Guid id)
        {
            var post = await _posts.GetByIdAsync(id);
            if (post is null || post.ModerationStatus != ModerationStatus.Approved)
                return NotFound("Post not found.");

            var allUsers   = await _users.GetAllAsync();
            var userDict   = allUsers.ToDictionary(u => u.Id);
            var mediaItems = await _media.GetByPostIdAsync(id);

            userDict.TryGetValue(post.AuthorId, out var author);
            string orgName = "Independent";
            if (post.OrganizationId.HasValue && userDict.TryGetValue(post.OrganizationId.Value, out var org))
                orgName = org.Name;

            return Ok(new
            {
                post.Id,
                post.Title,
                post.Content,
                post.Tags,
                post.CreatedAt,
                post.VerificationStatus,
                post.ConfidenceScore,
                post.CommunityCredibilityPercent,
                AuthorId         = post.AuthorId,
                AuthorName       = author?.Name ?? "Unknown",
                OrganizationName = orgName,
                Likes            = post.Interactions?.Count(i => i.Type == InteractionType.Like)    ?? 0,
                Comments         = post.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0,
                Media            = mediaItems.Select(m => new MediaDto(
                                       m.Id, m.Path, m.MediaType, m.IsCopyrighted, m.UploadedAt))
            });
        }

        // ── POST /api/posts/{postId}/like ─────────────────────────────────
        [HttpPost("{postId:guid}/like")]
        public async Task<ActionResult> Like(Guid postId)
        {
            var userId = GetUserId();
            var post   = await _posts.GetByIdAsync(postId);
            if (post is null) return NotFound("Post not found.");

            // ── use GetByPostAsync instead of the non-existent GetAsync ──
            var postInteractions = await _interactions.GetByPostAsync(postId);
            var existing = postInteractions
                .FirstOrDefault(i => i.UserId == userId && i.Type == InteractionType.Like);

            if (existing is not null)
            {
                await _interactions.DeleteAsync(existing.Id);
                return Ok(new { Message = "Like removed." });
            }

            await _interactions.AddAsync(new Interaction
            {
                PostId    = postId,
                UserId    = userId,
                Type      = InteractionType.Like,
                CreatedAt = DateTime.UtcNow
            });

            return Ok(new { Message = "Post liked." });
        }

        // ── POST /api/posts/{postId}/comment ──────────────────────────────
        [HttpPost("{postId:guid}/comment")]
        public async Task<ActionResult> Comment(Guid postId, [FromBody] JournalistCommentRequest req)
        {
            var userId = GetUserId();
            var post   = await _posts.GetByIdAsync(postId);
            if (post is null) return NotFound("Post not found.");

            if (string.IsNullOrWhiteSpace(req.Content))
                return BadRequest("Comment content cannot be empty.");

            await _interactions.AddAsync(new Interaction
            {
                PostId    = postId,
                UserId    = userId,
                Type      = InteractionType.Comment,
                Content   = req.Content,
                CreatedAt = DateTime.UtcNow
            });

            return Ok(new { Message = "Comment added." });
        }

        // ── POST /api/posts/{postId}/report ───────────────────────────────
        [HttpPost("{postId:guid}/report")]
        public async Task<ActionResult> Report(Guid postId, [FromBody] JournalistReportRequest req)
        {
            var userId = GetUserId();
            var post   = await _posts.GetByIdAsync(postId);
            if (post is null) return NotFound("Post not found.");

            await _interactions.AddAsync(new Interaction
            {
                PostId    = postId,
                UserId    = userId,
                Type      = InteractionType.Report,
                Content   = req.Reason,
                CreatedAt = DateTime.UtcNow
            });

            return Ok(new { Message = "Post reported." });
        }

        // ── GET /api/posts/by-author/{authorId} ───────────────────────────
        [HttpGet("by-author/{authorId:guid}")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<object>>> GetByAuthor(Guid authorId)
        {
            var posts    = await _posts.GetByAuthorAsync(authorId);
            var allUsers = await _users.GetAllAsync();
            var userDict = allUsers.ToDictionary(u => u.Id);

            var approved = posts
                .Where(p => p.ModerationStatus == ModerationStatus.Approved)
                .OrderByDescending(p => p.CreatedAt);

            var result = new List<object>();
            foreach (var p in approved)
            {
                var mediaItems = await _media.GetByPostIdAsync(p.Id);
                userDict.TryGetValue(p.AuthorId, out var author);

                string orgName = "Independent";
                if (p.OrganizationId.HasValue && userDict.TryGetValue(p.OrganizationId.Value, out var org))
                    orgName = org.Name;

                result.Add(new
                {
                    p.Id,
                    p.Title,
                    p.Content,
                    p.Tags,
                    p.CreatedAt,
                    p.VerificationStatus,
                    p.ConfidenceScore,
                    AuthorId         = p.AuthorId,
                    AuthorName       = author?.Name ?? "Unknown",
                    OrganizationName = orgName,
                    Likes            = p.Interactions?.Count(i => i.Type == InteractionType.Like)    ?? 0,
                    Comments         = p.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0,
                    Media            = mediaItems.Select(m => new MediaDto(
                                           m.Id, m.Path, m.MediaType, m.IsCopyrighted, m.UploadedAt))
                });
            }

            return Ok(result);
        }

        // ─────────────────────────────────────────────────────────────────────
        // NEW ── GET /api/posts/by-task/{taskId}
        //
        // Returns the single post that was written for a given task.
        // Every task that has been delivered should have exactly one post with a
        // matching TaskId.  If no post is linked yet, 404 is returned so the
        // front-end can show "No article submitted yet."
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Retrieve the post associated with a specific task ID.
        /// Returns 404 when the journalist has not yet submitted an article for that task.
        /// Accessible by any authenticated user (journalist checks their own submission,
        /// org checks the delivered article).
        /// </summary>
        [HttpGet("by-task/{taskId:guid}")]
        public async Task<ActionResult<object>> GetByTaskId(Guid taskId)
        {
            var allPosts = await _posts.GetAllAsync();

            // TaskId is nullable on Post — only posts submitted against a task have it set
            var post = allPosts.FirstOrDefault(p => p.TaskId == taskId);

            if (post is null)
                return NotFound(new { Message = "No article has been submitted for this task yet." });

            var allUsers   = await _users.GetAllAsync();
            var userDict   = allUsers.ToDictionary(u => u.Id);
            var mediaItems = await _media.GetByPostIdAsync(post.Id);

            userDict.TryGetValue(post.AuthorId, out var author);
            string orgName = "Independent";
            if (post.OrganizationId.HasValue && userDict.TryGetValue(post.OrganizationId.Value, out var org))
                orgName = org.Name;

            return Ok(new
            {
                post.Id,
                post.Title,
                post.Content,
                post.Tags,
                post.CreatedAt,
                post.UpdatedAt,
                post.VerificationStatus,
                post.ModerationStatus,
                post.ConfidenceScore,
                TaskId           = post.TaskId,         // echo back so the caller can confirm
                AuthorId         = post.AuthorId,
                AuthorName       = author?.Name ?? "Unknown",
                OrganizationName = orgName,
                Likes            = post.Interactions?.Count(i => i.Type == InteractionType.Like)    ?? 0,
                Comments         = post.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0,
                Media            = mediaItems.Select(m => new MediaDto(
                                       m.Id, m.Path, m.MediaType, m.IsCopyrighted, m.UploadedAt))
            });
        }
        // ─────────────────────────────────────────────────────────────────────
    }
}