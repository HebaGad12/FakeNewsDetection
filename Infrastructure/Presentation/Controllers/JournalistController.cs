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
    [Route("api/journalist")]
    [Authorize(Roles = "Journalist")]
    public class JournalistController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly IPostRepository _posts;
        private readonly IFollowRepository _follows;
        private readonly IPostMediaRepository _media;

        public JournalistController(
            IUserRepository users,
            IPostRepository posts,
            IFollowRepository follows,
            IPostMediaRepository media)
        {
            _users = users;
            _posts = posts;
            _follows = follows;
            _media = media;
        }

        private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet("me")]
        public async Task<ActionResult<JournalistResponse>> Me()
        {
            var journalist = await _users.GetByIdAsync(GetUserId());
            if (journalist is null) return NotFound("Journalist not found");

            string orgName = "Independent";
            if (journalist.OrganizationId.HasValue)
            {
                var orgUser = await _users.GetByIdAsync(journalist.OrganizationId.Value);
                orgName = orgUser?.Name ?? "Unknown";
            }

            return Ok(new JournalistResponse(
                journalist.Id, journalist.Name, journalist.Email,
                journalist.Role.ToString(), orgName,
                journalist.Followers?.Count ?? 0,
                journalist.Posts?.Count ?? 0,
                journalist.CreatedAt
            ));
        }

        /// <summary>
        /// Edit journalist profile. Only Name and Email can be changed.
        /// OrganizationId is intentionally excluded — it is managed by the organization.
        /// </summary>
        [HttpPut("edit")]
        public async Task<ActionResult> EditProfile([FromBody] JournalistEditProfileRequest req)
        {
            var journalist = await _users.GetByIdAsync(GetUserId());
            if (journalist is null) return NotFound("Journalist not found");

            if (req.Name  != null) journalist.Name  = req.Name;
            if (req.Email != null) journalist.Email = req.Email;
            // OrganizationId is NOT changed here — journalists cannot change their own org

            await _users.UpdateAsync(journalist);
            return Ok(new { journalist.Id, journalist.Name, journalist.Email });
        }

        // ── Posts ──

        /// <summary>
        /// Create a new article. Optionally include media items in the same request.
        /// Media paths are stored as-is — upload the files first, then pass their paths here.
        /// IsCopyrighted is only applied to items where MediaType == "image".
        /// </summary>
        [HttpPost("posts")]
        public async Task<ActionResult> CreatePost([FromBody] JournalistCreatePostRequest req)
        {
            var journalist = await _users.GetByIdAsync(GetUserId());
            if (journalist is null) return NotFound("Journalist not found");

            var post = new Post
            {
                Id             = Guid.NewGuid(),
                Title          = req.Title,
                Content        = req.Content,
                AuthorId       = journalist.Id,
                OrganizationId = journalist.OrganizationId,
                CreatedAt      = DateTime.UtcNow,
                Tags           = req.Tags.ToArray(),
                ModerationStatus = journalist.OrganizationId == null
                    ? ModerationStatus.Approved
                    : ModerationStatus.Pending
            };

            await _posts.AddAsync(post);

            // Attach media items if provided
            if (req.Media != null && req.Media.Count > 0)
            {
                var mediaEntities = req.Media.Select(m => new PostMedia
                {
                    Id            = Guid.NewGuid(),
                    PostId        = post.Id,
                    Path          = m.Path.Trim(),
                    MediaType     = m.MediaType.ToLower(),
                    IsCopyrighted = m.MediaType.ToLower() == "image" && m.IsCopyrighted
                }).ToList();

                await _media.AddRangeAsync(mediaEntities);
            }

            return Ok(new { PostId = post.Id, ModerationStatus = post.ModerationStatus.ToString() });
        }

        [HttpDelete("posts/{postId}")]
        public async Task<ActionResult> DeletePost(Guid postId)
        {
            var userId = GetUserId();
            var post = await _posts.GetByIdAsync(postId);
            if (post == null || post.AuthorId != userId)
                return NotFound("Post not found or not owned by you");

            await _posts.DeleteAsync(post.Id);
            return NoContent();
        }

        [HttpGet("posts")]
        public async Task<ActionResult<IEnumerable<JournalistPostResponse>>> MyPosts()
        {
            var userId = GetUserId();
            var posts = await _posts.GetByAuthorAsync(userId);
            var allUsers = await _users.GetAllAsync();

            var result = new List<JournalistPostResponse>();

            foreach (var p in posts)
            {
                string orgName = "Independent";
                if (p.OrganizationId.HasValue)
                {
                    var orgUser = allUsers.FirstOrDefault(u => u.Id == p.OrganizationId.Value);
                    orgName = orgUser?.Name ?? "Unknown";
                }

                var mediaItems = await _media.GetByPostIdAsync(p.Id);
                var mediaDtos = mediaItems.Select(m => new MediaDto(
                    m.Id, m.Path, m.MediaType, m.IsCopyrighted, m.UploadedAt
                )).ToList();

                result.Add(new JournalistPostResponse(
                    p.Id, p.Title, p.Content, p.CreatedAt,
                    p.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0,
                    p.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0,
                    p.Interactions?.Count(i => i.Type == InteractionType.Report) ?? 0,
                    orgName,
                    p.ModerationStatus.ToString(),
                    mediaDtos
                ));
            }

            return Ok(result);
        }

        // ── Media management (nested under the article) ──

        /// <summary>
        /// Add one or more media items to an existing article.
        /// POST api/journalist/posts/{postId}/media
        /// Body: { "mediaItems": [ { "path": "...", "mediaType": "image", "isCopyrighted": true } ] }
        /// </summary>
        [HttpPost("posts/{postId}/media")]
        public async Task<ActionResult<IEnumerable<MediaDto>>> AddMedia(
            Guid postId,
            [FromBody] AddPostMediaRequest req)
        {
            if (req.MediaItems == null || !req.MediaItems.Any())
                return BadRequest("At least one media item is required.");

            var post = await _posts.GetByIdAsync(postId);
            if (post == null || post.AuthorId != GetUserId())
                return NotFound("Post not found or not owned by you.");

            var allowedTypes = new[] { "image", "video" };
            var invalidTypes = req.MediaItems
                .Where(m => !allowedTypes.Contains(m.MediaType.ToLower()))
                .Select(m => m.MediaType).Distinct().ToList();

            if (invalidTypes.Any())
                return BadRequest($"Unsupported media type(s): {string.Join(", ", invalidTypes)}. Allowed: image, video.");

            var entities = req.MediaItems.Select(m => new PostMedia
            {
                Id            = Guid.NewGuid(),
                PostId        = postId,
                Path          = m.Path.Trim(),
                MediaType     = m.MediaType.ToLower(),
                IsCopyrighted = m.MediaType.ToLower() == "image" && m.IsCopyrighted
            }).ToList();

            await _media.AddRangeAsync(entities);

            var dtos = entities.Select(m => new MediaDto(
                m.Id, m.Path, m.MediaType, m.IsCopyrighted, m.UploadedAt)).ToList();

            return Ok(dtos);
        }

        /// <summary>
        /// Remove a single media item from an article.
        /// DELETE api/journalist/posts/{postId}/media/{mediaId}
        /// </summary>
        [HttpDelete("posts/{postId}/media/{mediaId}")]
        public async Task<ActionResult> DeleteMedia(Guid postId, Guid mediaId)
        {
            var post = await _posts.GetByIdAsync(postId);
            if (post == null || post.AuthorId != GetUserId())
                return NotFound("Post not found or not owned by you.");

            var item = await _media.GetByIdAsync(mediaId);
            if (item == null || item.PostId != postId)
                return NotFound("Media item not found on this post.");

            await _media.DeleteAsync(mediaId);
            return NoContent();
        }

        /// <summary>
        /// Toggle the copyright flag on a single image.
        /// PATCH api/journalist/posts/{postId}/media/{mediaId}/copyright
        /// Body: { "isCopyrighted": true }
        /// Returns 400 if the media item is not an image.
        /// </summary>
        [HttpPatch("posts/{postId}/media/{mediaId}/copyright")]
        public async Task<ActionResult<MediaDto>> SetCopyright(
            Guid postId,
            Guid mediaId,
            [FromBody] SetCopyrightRequest req)
        {
            var post = await _posts.GetByIdAsync(postId);
            if (post == null || post.AuthorId != GetUserId())
                return NotFound("Post not found or not owned by you.");

            var item = await _media.GetByIdAsync(mediaId);
            if (item == null || item.PostId != postId)
                return NotFound("Media item not found on this post.");

            if (item.MediaType != "image")
                return BadRequest("Copyright can only be set on image media items.");

            item.IsCopyrighted = req.IsCopyrighted;
            await _media.UpdateAsync(item);

            return Ok(new MediaDto(item.Id, item.Path, item.MediaType, item.IsCopyrighted, item.UploadedAt));
        }

        // ── Report post (journalist-specific; like/comment now at api/posts/{id}/like|comment) ──

        [HttpPost("posts/{postId}/report")]
        public async Task<ActionResult> Report(Guid postId, [FromBody] JournalistReportRequest req)
        {
            var userId = GetUserId();
            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            // NOTE: Like and Comment are now unified at POST api/posts/{postId}/like|comment
            // This endpoint remains for the report action which is journalist-specific here.
            return Ok(new { Message = "Use the unified endpoint POST /api/posts/{postId}/report" });
        }

        // ── Follow / Unfollow ──

        /// <summary>
        /// Follow a user. Returns 409 if already following.
        /// </summary>
        [HttpPost("follow/{targetId}")]
        public async Task<ActionResult> Follow(Guid targetId)
        {
            var userId = GetUserId();

            // FIX: Prevent duplicate follows
            var existing = await _follows.GetAsync(userId, targetId);
            if (existing is not null)
                return Conflict("You are already following this user.");

            await _follows.AddAsync(new Follow
            {
                FollowerId = userId,
                FolloweeId = targetId,
                CreatedAt = DateTime.UtcNow
            });

            return Ok(new { Message = "Followed successfully" });
        }

        [HttpDelete("unfollow/{targetId}")]
        public async Task<ActionResult> Unfollow(Guid targetId)
        {
            await _follows.RemoveAsync(GetUserId(), targetId);
            return Ok(new { Message = "Unfollowed successfully" });
        }

        [HttpGet("following")]
        public async Task<ActionResult<IEnumerable<JournalistFollowingResponse>>> Following()
        {
            var followees = await _follows.GetFolloweesAsync(GetUserId());
            var dto = followees.Select(f => new JournalistFollowingResponse(
                f.FolloweeId,
                f.Followee?.Name ?? "Unknown",
                f.Followee?.Role.ToString() ?? "Unknown",
                f.Followee?.Followers?.Count ?? 0
            ));
            return Ok(dto);
        }

        [HttpGet("followers")]
        public async Task<ActionResult<IEnumerable<JournalistFollowerResponse>>> Followers()
        {
            var followers = await _follows.GetFollowersAsync(GetUserId());
            var dto = followers.Select(f => new JournalistFollowerResponse(
                f.FollowerId,
                f.Follower?.Name ?? "Unknown",
                f.Follower?.Role.ToString() ?? "Unknown",
                f.Follower?.Followers?.Count ?? 0
            ));
            return Ok(dto);
        }

        // ── Post report analytics (for journalist's own posts) ──

        /// <summary>
        /// Report analytics for a journalist's own post.
        /// Independent journalists see their own post reports.
        /// Organization journalists also see their posts, if approved by org.
        /// </summary>
        [HttpGet("posts/{postId}/report")]
        public async Task<ActionResult> GetPostReport(Guid postId)
        {
            var userId = GetUserId();
            var journalist = await _users.GetByIdAsync(userId);
            if (journalist is null) return NotFound("Journalist not found");

            var post = await _posts.GetByIdAsync(postId);
            if (post == null || post.AuthorId != userId)
                return NotFound("Post not found or not owned by you");

            var interactions = post.Interactions ?? new List<Interaction>();

            return Ok(new PostReportResponse(
                post.Id,
                post.Title,
                post.ModerationStatus.ToString(),
                interactions.Count(i => i.Type == InteractionType.Like),
                interactions.Count(i => i.Type == InteractionType.Comment),
                interactions.Count(i => i.Type == InteractionType.Report),
                interactions
                    .Where(i => i.Type == InteractionType.Report)
                    .Select(i => i.Content ?? "")
                    .ToList()
            ));
        }
    }

    public record PostReportResponse(
        Guid PostId,
        string Title,
        string ModerationStatus,
        int Likes,
        int Comments,
        int Reports,
        List<string> ReportReasons
    );

    public record SetCopyrightRequest(bool IsCopyrighted);
}
