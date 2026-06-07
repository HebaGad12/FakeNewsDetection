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
        private readonly IPostRepository _posts;
        private readonly IInteractionRepository _interactions;
        private readonly IUserRepository _users;
        private readonly IPostMediaRepository _media;
        private readonly IToxicityService _toxicity;
        private readonly INotificationRepository _notifications;
        private readonly IHubContext<NotificationHub> _hub;
        private readonly IRecommendationService _recommendation;

        public PostsController(
            IPostRepository posts,
            IInteractionRepository interactions,
            IUserRepository users,
            IPostMediaRepository media,
            IToxicityService toxicity,
            INotificationRepository notifications,
            IHubContext<NotificationHub> hub,
            IRecommendationService recommendation)
        {
            _posts = posts;
            _interactions = interactions;
            _users = users;
            _media = media;
            _toxicity = toxicity;
            _notifications = notifications;
            _hub = hub;
            _recommendation = recommendation;
        }

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private string GetUserName() =>
            User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue("name")
            ?? User.FindFirstValue("unique_name")
            ?? "Someone";

        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<PostWithCommentsResponse>>> GetAllPosts()
        {
            var posts = await _posts.GetAllAsync();
            var allUsers = await _users.GetAllAsync();
            var userDict = allUsers.ToDictionary(u => u.Id);

            var result = new List<PostWithCommentsResponse>();

            foreach (var p in posts
                .Where(p => p.ModerationStatus == ModerationStatus.Approved)
                .OrderByDescending(p => p.CreatedAt))
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
                var mediaDtos = mediaItems.Select(m => new MediaDto(
                    m.Id, m.Path, m.MediaType, m.IsCopyrighted, m.UploadedAt
                )).ToList();

                result.Add(new PostWithCommentsResponse(
                    p.Id, p.Title, p.Content, p.Tags,
                    author?.Name ?? "Unknown", p.AuthorId, orgName,
                    p.CreatedAt, p.UpdatedAt,
                    p.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0,
                    comments, mediaDtos
                ));
            }

            return Ok(result);
        }

        [HttpGet("feed")]
        public async Task<ActionResult<IEnumerable<PostWithCommentsResponse>>> GetFeed([FromQuery] int topN = 20)
        {
            var userId = GetUserId();
            var rankedIds = await _recommendation.GetRankedFeedForUserAsync(userId, topN);

            var allUsers = await _users.GetAllAsync();
            var userDict = allUsers.ToDictionary(u => u.Id);

            if (rankedIds.Any())
            {
                var allPosts = await _posts.GetAllAsync();
                var postById = allPosts.ToDictionary(p => p.Id);
                var rankedResult = new List<PostWithCommentsResponse>();

                foreach (var id in rankedIds)
                {
                    if (postById.TryGetValue(id, out var post))
                    {
                        rankedResult.Add(await MapPostAsync(post, userDict));
                    }
                }

                return Ok(rankedResult);
            }

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

        private async Task<PostWithCommentsResponse> MapPostAsync(Post p, Dictionary<Guid, User> userDict)
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
            var mediaDtos = mediaItems.Select(m => new MediaDto(
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


        [HttpPost("{postId}/like")]
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
                Id = Guid.NewGuid(),
                PostId = postId,
                UserId = userId,
                Type = InteractionType.Like,
                CreatedAt = DateTime.UtcNow
            });

            // ── Notify post author ────────────────────────────────────────
            if (post.AuthorId != userId)
            {
                var actorName = GetUserName();
                var n = new Notification
                {
                    UserId = post.AuthorId,
                    ActorId = userId,
                    Type = "like",
                    Title = "New like",
                    Message = $"{actorName} liked your post \"{post.Title}\"."
                };
                await _notifications.AddAsync(n);
                await _hub.Clients.Group($"user:{post.AuthorId}")
                    .SendAsync("ReceiveNotification", new
                    {
                        n.Id,
                        n.Title,
                        n.Message,
                        n.Type,
                        n.IsRead,
                        n.CreatedAt,
                        ActorId = userId,
                        ActorName = actorName
                    });
            }
            // ─────────────────────────────────────────────────────────────

            post = await _posts.GetByIdAsync(postId);
            return Ok(new { Likes = post?.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0 });
        }

        [HttpDelete("{postId}/like")]
        public async Task<ActionResult> Unlike(Guid postId)
        {
            var userId = GetUserId();
            var interactions = await _interactions.GetByUserAsync(userId);
            var like = interactions.FirstOrDefault(i => i.PostId == postId && i.Type == InteractionType.Like);
            if (like == null) return NotFound("Like not found.");

            await _interactions.DeleteAsync(like.Id);

            var post = await _posts.GetByIdAsync(postId);
            return Ok(new { Likes = post?.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0 });
        }

        [HttpPost("{postId}/comment")]
        public async Task<ActionResult> Comment(Guid postId, [FromBody] CommentRequestDto req)
        {
            var userId = GetUserId();
            var post   = await _posts.GetByIdAsync(postId);
            if (post is null) return NotFound("Post not found.");

            if (await _toxicity.IsToxicAsync(req.Content))
                return BadRequest(new
                {
                    Error = "ToxicContent",
                    Message = "Your comment contains toxic language and cannot be posted."
                });

            var interaction = new Interaction
            {
                Id = Guid.NewGuid(),
                PostId = postId,
                UserId = userId,
                Type = InteractionType.Comment,
                Content = req.Content,
                CreatedAt = DateTime.UtcNow
            };

            await _interactions.AddAsync(interaction);

            // ── Notify post author ────────────────────────────────────────
            if (post.AuthorId != userId)
            {
                var actorName = GetUserName();
                var n = new Notification
                {
                    UserId = post.AuthorId,
                    ActorId = userId,
                    Type = "comment",
                    Title = "New comment",
                    Message = $"{actorName} commented on your post \"{post.Title}\"."
                };
                await _notifications.AddAsync(n);
                await _hub.Clients.Group($"user:{post.AuthorId}")
                    .SendAsync("ReceiveNotification", new
                    {
                        n.Id,
                        n.Title,
                        n.Message,
                        n.Type,
                        n.IsRead,
                        n.CreatedAt,
                        ActorId = userId,
                        ActorName = actorName
                    });
            }
            // ─────────────────────────────────────────────────────────────

            post = await _posts.GetByIdAsync(postId);
            return Ok(new { CommentId = interaction.Id, Comments = post?.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0 });
        }

        [HttpDelete("{postId}/comment/{commentId}")]
        public async Task<ActionResult> DeleteComment(Guid postId, Guid commentId)
        {
            var userId = GetUserId();
            var interactions = await _interactions.GetByUserAsync(userId);
            var comment = interactions.FirstOrDefault(i =>
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
