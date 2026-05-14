using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Persistence;
using Presentation.SignalR_Hubs;
using ServicesAbstraction;
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
        private readonly IPostRepository         _posts;
        private readonly IInteractionRepository  _interactions;
        private readonly IUserRepository         _users;
        private readonly IPostMediaRepository    _media;
        private readonly IToxicityService        _toxicity;
        private readonly INotificationRepository _notifications;
        private readonly IHubContext<NotificationHub> _hub;
        private readonly IRecommendationService  _recommendation;  // ← NEW
        private readonly IFollowRepository       _follows;          // ← NEW
        private readonly AppDbContext            _db;               // ← NEW (for memberships)

        public PostsController(
            IPostRepository          posts,
            IInteractionRepository   interactions,
            IUserRepository          users,
            IPostMediaRepository     media,
            IToxicityService         toxicity,
            INotificationRepository  notifications,
            IHubContext<NotificationHub> hub,
            IRecommendationService   recommendation,   // ← NEW
            IFollowRepository        follows,           // ← NEW
            AppDbContext             db)                // ← NEW
        {
            _posts          = posts;
            _interactions   = interactions;
            _users          = users;
            _media          = media;
            _toxicity       = toxicity;
            _notifications  = notifications;
            _hub            = hub;
            _recommendation = recommendation;   // ← NEW
            _follows        = follows;           // ← NEW
            _db             = db;               // ← NEW
        }

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private string GetUserName() =>
            User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue("name")
            ?? User.FindFirstValue("unique_name")
            ?? "Someone";

        // ── Helper: map a Post to PostWithCommentsResponse ───────────────────
        private async Task<PostWithCommentsResponse> MapPostAsync(
            Post p,
            Dictionary<Guid, User> userDict)
        {
            var comments = p.Interactions?
                .Where(i => i.Type == InteractionType.Comment)
                .OrderBy(i => i.CreatedAt)
                .Select(i =>
                {
                    userDict.TryGetValue(i.UserId, out var commenter);
                    return new CommentDto(
                        i.Id,
                        commenter?.Name ?? "Unknown",
                        commenter?.Role.ToString() ?? "Unknown",
                        i.Content ?? "",
                        i.CreatedAt
                    );
                }).ToList() ?? new();

            userDict.TryGetValue(p.AuthorId, out var author);

            string orgName = "Independent";
            if (p.OrganizationId.HasValue && userDict.TryGetValue(p.OrganizationId.Value, out var org))
                orgName = org.Name;

            var mediaItems = await _media.GetByPostIdAsync(p.Id);
            var mediaDtos  = mediaItems.Select(m => new MediaDto(
                m.Id, m.Path, m.MediaType, m.IsCopyrighted, m.UploadedAt
            )).ToList();

            return new PostWithCommentsResponse(
                p.Id, p.Title, p.Content, p.Tags,
                author?.Name ?? "Unknown", p.AuthorId, orgName,
                p.CreatedAt, p.UpdatedAt,
                p.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0,
                comments, mediaDtos
            );
        }

        // ════════════════════════════════════════════════════════════════════
        // GET /api/posts
        // Original endpoint — returns all approved posts ordered by date.
        // ════════════════════════════════════════════════════════════════════
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<PostWithCommentsResponse>>> GetAllPosts()
        {
            var posts    = await _posts.GetAllAsync();
            var allUsers = await _users.GetAllAsync();
            var userDict = allUsers.ToDictionary(u => u.Id);

            var result = new List<PostWithCommentsResponse>();

            foreach (var p in posts
                .Where(p => p.ModerationStatus == ModerationStatus.Approved)
                .OrderByDescending(p => p.CreatedAt))
            {
                result.Add(await MapPostAsync(p, userDict));
            }

            return Ok(result);
        }

        // ════════════════════════════════════════════════════════════════════
        // GET /api/posts/feed?topN=20
        // NEW — personalised ranked feed for the authenticated user.
        //
        // Returns posts ranked by:
        //   - Content similarity to what the user liked/shared/commented on
        //   - Recency (news decays fast — half-life 7 days)
        //   - Community membership boost (+0.30)
        //   - Followed-author boost      (+0.20)
        //   - Media preference boost     (+0.10)
        //
        // Cold-start: new users with no interactions get newest posts.
        // Fallback:   if Python service is down, returns newest posts.
        // ════════════════════════════════════════════════════════════════════
        [HttpGet("feed")]
        public async Task<ActionResult<IEnumerable<PostWithCommentsResponse>>> GetFeed(
            [FromQuery] int topN = 20)
        {
            var userId = GetUserId();

            // ── 1. Load ranked post IDs from Python recommender ───────────
            var rankedIds = await _recommendation.GetRankedFeedForUserAsync(userId, topN);

            var allUsers = await _users.GetAllAsync();
            var userDict = allUsers.ToDictionary(u => u.Id);

            // ── 2. If recommendation returned results, fetch in ranked order
            if (rankedIds.Any())
            {
                // Load all posts in one query, then reorder by ranked position
                var allPosts   = await _posts.GetAllAsync();
                var postById   = allPosts.ToDictionary(p => p.Id);

                var result = new List<PostWithCommentsResponse>();
                foreach (var id in rankedIds)
                {
                    if (postById.TryGetValue(id, out var post))
                        result.Add(await MapPostAsync(post, userDict));
                }

                return Ok(result);
            }

            // ── 3. Fallback: Python is down or user has no interactions ───
            //       Return newest approved posts (same as GetAllPosts but limited)
            var fallbackPosts = await _posts.GetAllAsync();
            var fallbackResult = new List<PostWithCommentsResponse>();

            foreach (var p in fallbackPosts
                .Where(p => p.ModerationStatus == ModerationStatus.Approved)
                .OrderByDescending(p => p.CreatedAt)
                .Take(topN))
            {
                fallbackResult.Add(await MapPostAsync(p, userDict));
            }

            return Ok(fallbackResult);
        }

        // ════════════════════════════════════════════════════════════════════
        // POST /api/posts/{postId}/like   — unchanged
        // ════════════════════════════════════════════════════════════════════
        [HttpPost("{postId}/like")]
        public async Task<ActionResult> Like(Guid postId)
        {
            var userId = GetUserId();

            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found.");

            var existing = await _interactions.GetByUserAsync(userId);
            if (existing.Any(i => i.PostId == postId && i.Type == InteractionType.Like))
                return Conflict("You have already liked this post.");

            await _interactions.AddAsync(new Interaction
            {
                Id        = Guid.NewGuid(),
                PostId    = postId,
                UserId    = userId,
                Type      = InteractionType.Like,
                CreatedAt = DateTime.UtcNow
            });

            if (post.AuthorId != userId)
            {
                var actorName = GetUserName();
                var n = new Notification
                {
                    UserId  = post.AuthorId,
                    ActorId = userId,
                    Type    = "like",
                    Title   = "New like",
                    Message = $"{actorName} liked your post \"{post.Title}\"."
                };
                await _notifications.AddAsync(n);
                await _hub.Clients.Group($"user:{post.AuthorId}")
                    .SendAsync("ReceiveNotification", new
                    {
                        n.Id, n.Title, n.Message, n.Type, n.IsRead, n.CreatedAt,
                        ActorId   = userId,
                        ActorName = actorName
                    });
            }

            post = await _posts.GetByIdAsync(postId);
            return Ok(new { Likes = post?.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0 });
        }

        // ════════════════════════════════════════════════════════════════════
        // DELETE /api/posts/{postId}/like   — unchanged
        // ════════════════════════════════════════════════════════════════════
        [HttpDelete("{postId}/like")]
        public async Task<ActionResult> Unlike(Guid postId)
        {
            var userId       = GetUserId();
            var interactions = await _interactions.GetByUserAsync(userId);
            var like         = interactions.FirstOrDefault(i => i.PostId == postId && i.Type == InteractionType.Like);
            if (like == null) return NotFound("Like not found.");

            await _interactions.DeleteAsync(like.Id);

            var post = await _posts.GetByIdAsync(postId);
            return Ok(new { Likes = post?.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0 });
        }

        // ════════════════════════════════════════════════════════════════════
        // POST /api/posts/{postId}/comment   — unchanged
        // ════════════════════════════════════════════════════════════════════
        [HttpPost("{postId}/comment")]
        public async Task<ActionResult> Comment(Guid postId, [FromBody] CommentRequestDto req)
        {
            var userId = GetUserId();

            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found.");

            if (await _toxicity.IsToxicAsync(req.Content))
                return BadRequest(new
                {
                    Error   = "ToxicContent",
                    Message = "Your comment contains toxic language and cannot be posted."
                });

            var interaction = new Interaction
            {
                Id        = Guid.NewGuid(),
                PostId    = postId,
                UserId    = userId,
                Type      = InteractionType.Comment,
                Content   = req.Content,
                CreatedAt = DateTime.UtcNow
            };

            await _interactions.AddAsync(interaction);

            if (post.AuthorId != userId)
            {
                var actorName = GetUserName();
                var n = new Notification
                {
                    UserId  = post.AuthorId,
                    ActorId = userId,
                    Type    = "comment",
                    Title   = "New comment",
                    Message = $"{actorName} commented on your post \"{post.Title}\"."
                };
                await _notifications.AddAsync(n);
                await _hub.Clients.Group($"user:{post.AuthorId}")
                    .SendAsync("ReceiveNotification", new
                    {
                        n.Id, n.Title, n.Message, n.Type, n.IsRead, n.CreatedAt,
                        ActorId   = userId,
                        ActorName = actorName
                    });
            }

            post = await _posts.GetByIdAsync(postId);
            return Ok(new
            {
                CommentId = interaction.Id,
                Comments  = post?.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0
            });
        }

        // ════════════════════════════════════════════════════════════════════
        // DELETE /api/posts/{postId}/comment/{commentId}   — unchanged
        // ════════════════════════════════════════════════════════════════════
        [HttpDelete("{postId}/comment/{commentId}")]
        public async Task<ActionResult> DeleteComment(Guid postId, Guid commentId)
        {
            var userId       = GetUserId();
            var interactions = await _interactions.GetByUserAsync(userId);
            var comment      = interactions.FirstOrDefault(i =>
                i.Id == commentId && i.PostId == postId && i.Type == InteractionType.Comment);

            if (comment == null) return NotFound("Comment not found or not owned by you.");
            await _interactions.DeleteAsync(comment.Id);
            return NoContent();
        }
    }

    public record CommentDto(Guid Id, string AuthorName, string AuthorRole, string Content, DateTime CreatedAt);

    public record PostWithCommentsResponse(
        Guid Id, string Title, string Content, string[] Tags,
        string AuthorName, Guid AuthorId, string OrganizationName,
        DateTime CreatedAt, DateTime? UpdatedAt,
        int LikesCount, List<CommentDto> Comments, List<MediaDto> Media);

    public record CommentRequestDto(string Content);
}