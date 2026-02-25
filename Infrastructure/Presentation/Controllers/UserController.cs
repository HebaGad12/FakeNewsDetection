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
using System.Text;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    [ApiController]
    [Route("api/user")]
    public class UserController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly IPostRepository _posts;
        private readonly IInteractionRepository _interactions;
        private readonly IModerationRepository _moderations;
        private readonly IFollowRepository _follows;

        public UserController(
            IUserRepository users,
            IPostRepository posts,
            IInteractionRepository interactions,
            IModerationRepository moderations,
            IFollowRepository follows)
        {
            _users = users;
            _posts = posts;
            _interactions = interactions;
            _moderations = moderations;
            _follows = follows;
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<RegularUserResponse>> Me()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();

            var user = await _users.GetByIdAsync(Guid.Parse(userId));
            if (user is null) return NotFound("User not found");

            var dto = new RegularUserResponse(
                user.Id,
                user.Name,
                user.Email,
                user.Role.ToString(),
                user.Followers?.Count ?? 0,
                user.Followees?.Count ?? 0
            );

            return Ok(dto);
        }

        [HttpPut("edit")]
        [Authorize]
        public async Task<ActionResult> EditProfile([FromBody] EditProfileRequest req)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();

            var user = await _users.GetByIdAsync(Guid.Parse(userId));
            if (user is null) return NotFound("User not found");

            user.Name = req.Name ?? user.Name;
            await _users.UpdateAsync(user);

            return NoContent();
        }

        [HttpGet("overview")]
        [Authorize]
        public async Task<ActionResult<UserOverviewResponse>> Overview()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();

            var uid = Guid.Parse(userId);

            var interactions = await _interactions.GetByUserAsync(uid);
            var likes = interactions.Count(i => i.Type == InteractionType.Like);
            var comments = interactions.Count(i => i.Type == InteractionType.Comment);
            var reports = interactions.Count(i => i.Type == InteractionType.Report);

            var moderations = await _moderations.GetByActorAsync(uid);
            var helpfulReports = moderations.Count(m => m.Action == ModerationActionType.Keep);

            var followees = await _follows.GetFolloweesAsync(uid);
            var followingJournalists = followees.Count(f => f.Followee.Role == Role.Journalist);

            var dto = new UserOverviewResponse(likes, comments, reports, helpfulReports, followingJournalists);

            return Ok(dto);
        }

        [HttpGet("following")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<FollowingResponse>>> Following()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();

            var followees = await _follows.GetFolloweesAsync(Guid.Parse(userId));

            var dto = followees.Select(f => new FollowingResponse(
                f.Followee.Id,
                f.Followee.Name,
                f.Followee.Role.ToString(),
                f.Followee.Organization?.Name,
                f.Followee.Followers?.Count ?? 0,
                f.Followee.Posts?.Count ?? 0,
                f.Followee.CreatedAt
            ));

            return Ok(dto);
        }

        [HttpPost("follow/{targetId}")]
        [Authorize]
        public async Task<ActionResult> Follow(Guid targetId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var targetUser = await _users.GetByIdAsync(targetId);
            if (targetUser == null) return NotFound("User not found");
            if (targetUser.Role != Role.Journalist && targetUser.Role != Role.Organization)
                return BadRequest("You can only follow journalists or organizations.");

            await _follows.AddAsync(new Follow
            {
                FollowerId = userId,
                FolloweeId = targetId,
                CreatedAt = DateTime.UtcNow
            });

            var followersCount = targetUser.Followers?.Count ?? 0;
            return Ok(new { Followers = followersCount });
        }

        [HttpDelete("unfollow/{targetId}")]
        [Authorize]
        public async Task<ActionResult> Unfollow(Guid targetId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            await _follows.RemoveAsync(userId, targetId);

            var targetUser = await _users.GetByIdAsync(targetId);
            if (targetUser == null) return NotFound("User not found");

            var followersCount = targetUser.Followers?.Count ?? 0;
            return Ok(new { Followers = followersCount });
        }

        [HttpPost("posts/{postId}/like")]
        [Authorize]
        public async Task<ActionResult> Like(Guid postId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            var interaction = new Interaction
            {
                PostId = postId,
                UserId = userId,
                Type = InteractionType.Like,
                CreatedAt = DateTime.UtcNow
            };

            await _interactions.AddAsync(interaction);

            post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            var likesCount = post.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0;
            return Ok(new { Likes = likesCount });
        }

        [HttpDelete("posts/{postId}/unlike")]
        [Authorize]
        public async Task<ActionResult> Unlike(Guid postId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var interactions = await _interactions.GetByUserAsync(userId);
            var like = interactions.FirstOrDefault(i => i.PostId == postId && i.Type == InteractionType.Like);

            if (like != null)
                await _interactions.DeleteAsync(like.Id);

            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            var likesCount = post.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0;
            return Ok(new { Likes = likesCount });
        }

        [HttpPost("posts/{postId}/comment")]
        [Authorize]
        public async Task<ActionResult> Comment(Guid postId, [FromBody] CommentRequest req)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            var interaction = new Interaction
            {
                PostId = postId,
                UserId = userId,
                Type = InteractionType.Comment,
                Content = req.Content,
                CreatedAt = DateTime.UtcNow
            };

            await _interactions.AddAsync(interaction);

            post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            var commentsCount = post.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0;
            return Ok(new { Comments = commentsCount });
        }

        public record CommentRequest(string Content);

        [HttpDelete("posts/{postId}/comment/{commentId}")]
        [Authorize(Roles = "Regular")]
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
        [Authorize]
        public async Task<ActionResult> Report(Guid postId, [FromBody] ReportRequest req)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            var interaction = new Interaction
            {
                PostId = postId,
                UserId = userId,
                Type = InteractionType.Report,
                Content = req.Reason,
                CreatedAt = DateTime.UtcNow
            };

            await _interactions.AddAsync(interaction);

            post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            var reportsCount = post.Interactions?.Count(i => i.Type == InteractionType.Report) ?? 0;
            return Ok(new { Reports = reportsCount });
        }

        public record ReportRequest(string Reason);

        [HttpGet("activity")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<UserActivityResponse>>> Activity()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();

            var interactions = await _interactions.GetByUserAsync(Guid.Parse(userId));

            var dto = interactions.Select(a => new UserActivityResponse(
                a.Type.ToString(),
                a.Post?.Title ?? "Unknown Post",
                a.CreatedAt
            ));

            return Ok(dto);
        }
    }
}