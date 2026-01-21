using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    [ApiController]
    [Route("api/journalist")]
    public class JournalistController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly IPostRepository _posts;
        private readonly IInteractionRepository _interactions;
        private readonly IOrganizationRepository _organizations;
        private readonly IFollowRepository _follows;
        private readonly IModerationRepository _moderations;

        public JournalistController(
            IUserRepository users,
            IPostRepository posts,
            IInteractionRepository interactions,
            IOrganizationRepository organizations,
            IFollowRepository follows,
            IModerationRepository moderations)
        {
            _users = users;
            _posts = posts;
            _interactions = interactions;
            _organizations = organizations;
            _follows = follows;
            _moderations = moderations;
        }

        [HttpGet("me")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult<JournalistResponse>> Me()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();

            var journalist = await _users.GetByIdAsync(Guid.Parse(userId));
            if (journalist is null) return NotFound("Journalist not found");

            var dto = new JournalistResponse(
                journalist.Id,
                journalist.Name,
                journalist.Email,
                journalist.Role.ToString(),
                journalist.Organization?.Name ?? "Independent",
                journalist.Followers?.Count ?? 0,
                journalist.Posts?.Count ?? 0,
                journalist.CreatedAt
            );

            return Ok(dto);
        }

        [HttpPut("edit")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult> EditProfile([FromBody] JournalistEditProfileRequest req)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();

            var journalist = await _users.GetByIdAsync(Guid.Parse(userId));
            if (journalist is null) return NotFound("Journalist not found");

            journalist.Name = req.Name ?? journalist.Name;
            journalist.OrganizationId = req.OrganizationId;

            await _users.UpdateAsync(journalist);
            return NoContent();
        }

        [HttpPost("posts")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult> CreatePost([FromBody] JournalistCreatePostRequest req)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var journalist = await _users.GetByIdAsync(userId);
            if (journalist is null) return NotFound("Journalist not found");

            var post = new Post
            {
                Id = Guid.NewGuid(),
                Title = req.Title,
                Content = req.Content,
                AuthorId = journalist.Id,
                OrganizationId = journalist.OrganizationId,
                CreatedAt = DateTime.UtcNow,
                Tags = req.Tags.ToArray(),
                ModerationStatus = journalist.OrganizationId == null ? ModerationStatus.Approved : ModerationStatus.Pending
            };

            await _posts.AddAsync(post);
            return Ok(new { PostId = post.Id, ModerationStatus = post.ModerationStatus.ToString() });
        }

        [HttpDelete("posts/{postId}")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult> DeletePost(Guid postId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var post = await _posts.GetByIdAsync(postId);
            if (post == null || post.AuthorId != userId) return NotFound("Post not found or not owned by you");

            await _posts.DeleteAsync(post.Id);
            return NoContent();
        }

        [HttpGet("posts")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult<IEnumerable<JournalistPostResponse>>> MyPosts()
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var posts = await _posts.GetByAuthorAsync(userId);

            var dto = posts.Select(p => new JournalistPostResponse(
                p.Id,
                p.Title,
                p.Content,
                p.CreatedAt,
                p.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0,
                p.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0,
                p.Interactions?.Count(i => i.Type == InteractionType.Report) ?? 0,
                p.Organization?.Name ?? "Independent",
                p.ModerationStatus.ToString()
            ));

            return Ok(dto);
        }

        [HttpPost("posts/{postId}/like")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult> Like(Guid postId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            var interaction = new Interaction
            {
                Id = Guid.NewGuid(),
                PostId = postId,
                UserId = userId,
                Type = InteractionType.Like,
                CreatedAt = DateTime.UtcNow
            };

            await _interactions.AddAsync(interaction);
            return Ok(new { Message = "Liked" });
        }

        [HttpDelete("posts/{postId}/unlike")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult> Unlike(Guid postId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var interactions = await _interactions.GetByUserAsync(userId);
            var like = interactions.FirstOrDefault(i => i.PostId == postId && i.Type == InteractionType.Like);
            if (like == null) return NotFound("Like not found");

            await _interactions.DeleteAsync(like.Id);
            return NoContent();
        }

        [HttpPost("posts/{postId}/comment")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult> Comment(Guid postId, [FromBody] JournalistCommentRequest req)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

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
            return Ok(new { Message = "Comment added", CommentId = interaction.Id });
        }

        [HttpDelete("posts/{postId}/comment/{commentId}")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult> DeleteComment(Guid postId, Guid commentId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var interactions = await _interactions.GetByUserAsync(userId);
            var comment = interactions.FirstOrDefault(i => i.Id == commentId && i.PostId == postId && i.Type == InteractionType.Comment);
            if (comment == null) return NotFound("Comment not found or not owned by you");

            await _interactions.DeleteAsync(comment.Id);
            return NoContent();
        }

        [HttpPost("posts/{postId}/report")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult> Report(Guid postId, [FromBody] JournalistReportRequest req)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            var interaction = new Interaction
            {
                Id = Guid.NewGuid(),
                PostId = postId,
                UserId = userId,
                Type = InteractionType.Report,
                Content = req.Reason,
                CreatedAt = DateTime.UtcNow
            };

            await _interactions.AddAsync(interaction);
            return Ok(new { Message = "Reported" });
        }
        [HttpPost("follow/{targetId}")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult> Follow(Guid targetId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var follow = new Follow
            {
                FollowerId = userId,
                FolloweeId = targetId,
                CreatedAt = DateTime.UtcNow
            };

            await _follows.AddAsync(follow);
            return Ok(new { Message = "Followed successfully" });
        }

        [HttpDelete("unfollow/{targetId}")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult> Unfollow(Guid targetId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            await _follows.RemoveAsync(userId, targetId);
            return Ok(new { Message = "Unfollowed successfully" });
        }

        [HttpGet("following")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult<IEnumerable<JournalistFollowingResponse>>> Following()
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var followees = await _follows.GetFolloweesAsync(userId);

            var dto = followees.Select(f => new JournalistFollowingResponse(
                f.FolloweeId,
                f.Followee?.Name ?? "Unknown",
                f.Followee?.Role.ToString() ?? "Unknown",
                f.Followee?.Followers?.Count ?? 0
            ));

            return Ok(dto);
        }

        [HttpGet("followers")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult<IEnumerable<JournalistFollowerResponse>>> Followers()
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var followers = await _follows.GetFollowersAsync(userId);

            var dto = followers.Select(f => new JournalistFollowerResponse(
                f.FollowerId,
                f.Follower?.Name ?? "Unknown",
                f.Follower?.Role.ToString() ?? "Unknown",
                f.Follower?.Followers?.Count ?? 0
            ));

            return Ok(dto);
        }
        public record JournalistResponse(Guid Id, string Name, string Email, string Role, string? Organization, int Followers, int Posts, DateTime CreatedAt); public record JournalistEditProfileRequest(string? Name, Guid? OrganizationId); public record JournalistCreatePostRequest(string Title, string Content, List<string> Tags); public record JournalistPostResponse(Guid Id, string Title, string Content, DateTime CreatedAt, int Likes, int Comments, int Reports, string Organization, string ModerationStatus); public record JournalistActivityResponse(string Title, int Likes, int Comments, int Reports, string Organization, string ModerationStatus); public record JournalistCommentRequest(string Content); public record JournalistReportRequest(string Reason); public record JournalistFollowingResponse(Guid Id, string Name, string Role, int Followers); public record JournalistFollowerResponse(Guid Id, string Name, string Role, int Followers);
    }
}