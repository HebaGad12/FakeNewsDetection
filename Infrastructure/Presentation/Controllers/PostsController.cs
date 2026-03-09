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
    /// <summary>
    /// Unified posts controller: like, comment, get all posts with comments.
    /// All authenticated users (Regular, Journalist, Organization) use these shared endpoints.
    /// </summary>
    [ApiController]
    [Route("api/posts")]
    [Authorize]
    public class PostsController : ControllerBase
    {
        private readonly IPostRepository _posts;
        private readonly IInteractionRepository _interactions;
        private readonly IUserRepository _users;
        private readonly IPostMediaRepository _media;

        public PostsController(
            IPostRepository posts,
            IInteractionRepository interactions,
            IUserRepository users,
            IPostMediaRepository media)
        {
            _posts = posts;
            _interactions = interactions;
            _users = users;
            _media = media;
        }

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // ─────────────────────────────────────────
        // GET ALL POSTS WITH COMMENTS
        // ─────────────────────────────────────────

        /// <summary>
        /// Returns all approved posts with their comments, interactions, and media.
        /// </summary>
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
                    p.Id,
                    p.Title,
                    p.Content,
                    p.Tags,
                    author?.Name ?? "Unknown",
                    p.AuthorId,
                    orgName,
                    p.CreatedAt,
                    p.UpdatedAt,
                    p.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0,
                    comments,
                    mediaDtos
                ));
            }

            return Ok(result);
        }

        // ─────────────────────────────────────────
        // LIKE  (all authenticated users)
        // ─────────────────────────────────────────

        [HttpPost("{postId}/like")]
        public async Task<ActionResult> Like(Guid postId)
        {
            var userId = GetUserId();

            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found.");

            // Check duplicate like
            var existing = await _interactions.GetByUserAsync(userId);
            if (existing.Any(i => i.PostId == postId && i.Type == InteractionType.Like))
                return Conflict("You have already liked this post.");

            await _interactions.AddAsync(new Interaction
            {
                Id = Guid.NewGuid(),
                PostId = postId,
                UserId = userId,
                Type = InteractionType.Like,
                CreatedAt = DateTime.UtcNow
            });

            post = await _posts.GetByIdAsync(postId);
            var likesCount = post?.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0;
            return Ok(new { Likes = likesCount });
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
            var likesCount = post?.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0;
            return Ok(new { Likes = likesCount });
        }

        // ─────────────────────────────────────────
        // COMMENT  (all authenticated users)
        // ─────────────────────────────────────────

        [HttpPost("{postId}/comment")]
        public async Task<ActionResult> Comment(Guid postId, [FromBody] CommentRequestDto req)
        {
            var userId = GetUserId();

            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found.");

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

            post = await _posts.GetByIdAsync(postId);
            var commentsCount = post?.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0;
            return Ok(new { CommentId = interaction.Id, Comments = commentsCount });
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

    // ─────────────────────────────────────────
    // Response DTOs (inline for simplicity)
    // ─────────────────────────────────────────

    public record CommentDto(
        Guid Id,
        string AuthorName,
        string AuthorRole,
        string Content,
        DateTime CreatedAt
    );

    public record PostWithCommentsResponse(
        Guid Id,
        string Title,
        string Content,
        string[] Tags,
        string AuthorName,
        Guid AuthorId,
        string OrganizationName,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        int LikesCount,
        List<CommentDto> Comments,
        List<Shared.DTOs.MediaDto> Media
    );

    public record CommentRequestDto(string Content);
}
