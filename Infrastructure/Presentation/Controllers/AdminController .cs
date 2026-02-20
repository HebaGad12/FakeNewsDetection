using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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
    [Route("api/admin")]
    [Authorize(Policy = "AdminOnly")]
    public class AdminController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly IPostRepository _posts;
        private readonly IInteractionRepository _interactions;
        private readonly IModerationRepository _moderations;
        private readonly IFollowRepository _follows;
        private readonly IOrganizationRepository _organizations;

        public AdminController(
            IUserRepository users,
            IPostRepository posts,
            IInteractionRepository interactions,
            IModerationRepository moderations,
            IFollowRepository follows,
            IOrganizationRepository organizations)
        {
            _users = users;
            _posts = posts;
            _interactions = interactions;
            _moderations = moderations;
            _follows = follows;
            _organizations = organizations;
        }

        #region Dashboard & Statistics


        [HttpGet("dashboard/stats")]
        public async Task<ActionResult<AdminDashboardStatsResponse>> GetDashboardStats()
        {
            var allUsers = await _users.GetAllAsync();
            var allPosts = await _posts.GetAllAsync();

            var stats = new AdminDashboardStatsResponse(
                TotalUsers: allUsers.Count(),
                ActiveUsers: allUsers.Count(u => u.IsActive),
                InactiveUsers: allUsers.Count(u => !u.IsActive),
                TotalPosts: allPosts.Count(),
                PendingPosts: allPosts.Count(p => p.ModerationStatus == ModerationStatus.Pending),
                ApprovedPosts: allPosts.Count(p => p.ModerationStatus == ModerationStatus.Approved),
                RejectedPosts: allPosts.Count(p => p.ModerationStatus == ModerationStatus.Removed),
                FlaggedPosts: allPosts.Count(p => p.ModerationStatus == ModerationStatus.Flagged),
                VerifiedPosts: allPosts.Count(p => p.VerificationStatus == VerificationStatus.Trusted),
                FakePosts: allPosts.Count(p => p.VerificationStatus == VerificationStatus.Fake),
                MisleadingPosts: allPosts.Count(p => p.VerificationStatus == VerificationStatus.Suspicious),
                UnknownPosts: allPosts.Count(p => p.VerificationStatus == VerificationStatus.Unknown),
                TotalJournalists: allUsers.Count(u => u.Role == Role.Journalist),
                TotalOrganizations: allUsers.Count(u => u.Role == Role.Organization),
                TotalRegularUsers: allUsers.Count(u => u.Role == Role.Regular),
                TotalAdmins: allUsers.Count(u => u.Role == Role.Admin),
                PendingJournalistRequests: allUsers.Count(u => u.Role == Role.Journalist && u.OrganizationId == null && u.RegistrationStatus == Domain.Enums.RegistrationStatus.Pending),
                RejectedJournalistRequests: allUsers.Count(u => u.Role == Role.Journalist && u.OrganizationId == null && u.RegistrationStatus == Domain.Enums.RegistrationStatus.Rejected)
            );

            return Ok(stats);
        }

        #endregion

        #region User Management


        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<AdminUserListResponse>>> GetAllUsers(
            [FromQuery] string? role = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var allUsers = await _users.GetAllAsync();
            var allPosts = await _posts.GetAllAsync();
            var allOrganizations = await _organizations.GetAllAsync();

            var query = allUsers.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<Role>(role, true, out var roleEnum))
            {
                query = query.Where(u => u.Role == roleEnum);
            }

            if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }

            query = query.OrderByDescending(u => u.CreatedAt);

            var totalCount = query.Count();
            var users = query
                .Skip((page - 1) * pageSize)
                .Take(pageSize);

            var response = new List<AdminUserListResponse>();

            foreach (var u in users)
            {
                var followers = await _follows.GetFollowersAsync(u.Id);
                var followees = await _follows.GetFolloweesAsync(u.Id);

                response.Add(new AdminUserListResponse(
                    Id: u.Id,
                    Name: u.Name,
                    Email: u.Email,
                    Role: u.Role.ToString(),
                    IsActive: u.IsActive,
                    CreatedAt: u.CreatedAt,
                    OrganizationId: u.OrganizationId,
                    OrganizationName: u.OrganizationId.HasValue
                        ? allOrganizations.FirstOrDefault(o => o.Id == u.OrganizationId.Value)?.Name
                        : null,
                    PostCount: allPosts.Count(p => p.AuthorId == u.Id),
                    FollowerCount: followers.Count(),
                    FollowingCount: followees.Count()
                ));
            }

            Response.Headers.Append("X-Total-Count", totalCount.ToString());
            Response.Headers.Append("X-Page", page.ToString());
            Response.Headers.Append("X-Page-Size", pageSize.ToString());

            return Ok(response);
        }


        [HttpGet("users/{id}")]
        public async Task<ActionResult<AdminUserDetailResponse>> GetUserById(Guid id)
        {
            var user = await _users.GetByIdAsync(id);
            if (user is null)
                return NotFound("User not found");

            var followers = await _follows.GetFollowersAsync(id);
            var followees = await _follows.GetFolloweesAsync(id);
            var allPosts = await _posts.GetAllAsync();
            var allOrganizations = await _organizations.GetAllAsync();

            var userPosts = allPosts.Where(p => p.AuthorId == id).ToList();

            var totalLikes = 0;
            var totalComments = 0;
            var totalInteractions = 0;

            foreach (var post in userPosts)
            {
                var postInteractions = await _interactions.GetByPostAsync(post.Id);
                totalLikes += postInteractions.Count(i => i.Type == InteractionType.Like);
                totalComments += postInteractions.Count(i => i.Type == InteractionType.Comment);
                totalInteractions += postInteractions.Count();
            }

            var moderations = await _moderations.GetByActorAsync(id);

            var response = new AdminUserDetailResponse(
                Id: user.Id,
                Name: user.Name,
                Email: user.Email,
                Role: user.Role.ToString(),
                IsActive: user.IsActive,
                CreatedAt: user.CreatedAt,
                OrganizationId: user.OrganizationId,
                OrganizationName: user.OrganizationId.HasValue
                    ? allOrganizations.FirstOrDefault(o => o.Id == user.OrganizationId.Value)?.Name
                    : null,
                JournalistExternalId: user.JournalistExternalId,
                PostCount: userPosts.Count,
                FollowerCount: followers.Count(),
                FollowingCount: followees.Count(),
                TotalLikesReceived: totalLikes,
                TotalCommentsReceived: totalComments,
                TotalInteractions: totalInteractions,
                ModerationActionsCount: moderations.Count()
            );

            return Ok(response);
        }


        [HttpPatch("users/{id}/status")]
        public async Task<ActionResult> UpdateUserStatus(Guid id, UpdateUserStatusRequest request)
        {
            var user = await _users.GetByIdAsync(id);
            if (user is null)
                return NotFound("User not found");

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (id.ToString() == currentUserId && !request.IsActive)
                return BadRequest("You cannot deactivate your own account");

            user.IsActive = request.IsActive;
            await _users.UpdateAsync(user);

            return Ok(new { message = $"User {(request.IsActive ? "activated" : "deactivated")} successfully" });
        }


        [HttpDelete("users/{id}")]
        public async Task<ActionResult> DeleteUser(Guid id)
        {
            var user = await _users.GetByIdAsync(id);
            if (user is null)
                return NotFound("User not found");

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (id.ToString() == currentUserId)
                return BadRequest("You cannot delete your own account");

            await _users.DeleteAsync(id);

            return Ok(new { message = "User deleted successfully" });
        }

        #endregion

        #region Post Management

        [HttpGet("posts")]
        public async Task<ActionResult<IEnumerable<AdminPostListResponse>>> GetAllPosts(
            [FromQuery] string? moderationStatus = null,
            [FromQuery] string? verificationStatus = null,
            [FromQuery] Guid? authorId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var allPosts = await _posts.GetAllAsync();
            var allUsers = await _users.GetAllAsync();
            var allOrganizations = await _organizations.GetAllAsync();

            var query = allPosts.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(moderationStatus) &&
                Enum.TryParse<ModerationStatus>(moderationStatus, true, out var modStatusEnum))
            {
                query = query.Where(p => p.ModerationStatus == modStatusEnum);
            }

            if (!string.IsNullOrWhiteSpace(verificationStatus) &&
                Enum.TryParse<VerificationStatus>(verificationStatus, true, out var verStatusEnum))
            {
                query = query.Where(p => p.VerificationStatus == verStatusEnum);
            }

            if (authorId.HasValue)
            {
                query = query.Where(p => p.AuthorId == authorId.Value);
            }

            query = query.OrderByDescending(p => p.CreatedAt);

            var totalCount = query.Count();
            var posts = query
                .Skip((page - 1) * pageSize)
                .Take(pageSize);

            var response = new List<AdminPostListResponse>();

            foreach (var p in posts)
            {
                var author = allUsers.FirstOrDefault(u => u.Id == p.AuthorId);
                var org = p.OrganizationId.HasValue
                    ? allOrganizations.FirstOrDefault(o => o.Id == p.OrganizationId.Value)
                    : null;

                var interactions = await _interactions.GetByPostAsync(p.Id);

                response.Add(new AdminPostListResponse(
                    Id: p.Id,
                    Title: p.Title,
                    AuthorName: author?.Name ?? "Unknown",
                    AuthorEmail: author?.Email ?? "Unknown",
                    AuthorId: p.AuthorId,
                    VerificationStatus: p.VerificationStatus.ToString(),
                    ConfidenceScore: p.ConfidenceScore,
                    ModerationStatus: p.ModerationStatus.ToString(),
                    CreatedAt: p.CreatedAt,
                    UpdatedAt: p.UpdatedAt,
                    InteractionCount: interactions.Count(),
                    OrganizationName: org?.Name
                ));
            }

            Response.Headers.Append("X-Total-Count", totalCount.ToString());
            Response.Headers.Append("X-Page", page.ToString());
            Response.Headers.Append("X-Page-Size", pageSize.ToString());

            return Ok(response);
        }


        [HttpGet("posts/{id}")]
        public async Task<ActionResult<AdminPostDetailResponse>> GetPostById(Guid id)
        {
            var post = await _posts.GetByIdAsync(id);
            if (post is null)
                return NotFound("Post not found");

            var author = await _users.GetByIdAsync(post.AuthorId);
            var postInteractions = await _interactions.GetByPostAsync(id);
            var allOrganizations = await _organizations.GetAllAsync();
            var org = post.OrganizationId.HasValue
                ? allOrganizations.FirstOrDefault(o => o.Id == post.OrganizationId.Value)
                : null;

            var response = new AdminPostDetailResponse(
                Id: post.Id,
                Title: post.Title,
                Content: post.Content,
                Tags: post.Tags,
                AuthorId: post.AuthorId,
                AuthorName: author?.Name ?? "Unknown",
                AuthorEmail: author?.Email ?? "Unknown",
                AuthorRole: author?.Role.ToString() ?? "Unknown",
                OrganizationId: post.OrganizationId,
                OrganizationName: org?.Name,
                VerificationStatus: post.VerificationStatus.ToString(),
                ConfidenceScore: post.ConfidenceScore,
                CommunityCredibilityPercent: post.CommunityCredibilityPercent,
                ModerationStatus: post.ModerationStatus.ToString(),
                ModerationNotes: post.ModerationNotes,
                CreatedAt: post.CreatedAt,
                UpdatedAt: post.UpdatedAt,
                LikeCount: postInteractions.Count(i => i.Type == InteractionType.Like),
                CommentCount: postInteractions.Count(i => i.Type == InteractionType.Comment),
                ShareCount: postInteractions.Count(i => i.Type == InteractionType.Share),
                ReportCount: postInteractions.Count(i => i.Type == InteractionType.Report),
                TotalInteractions: postInteractions.Count()
            );

            return Ok(response);
        }


        [HttpPatch("posts/{id}/moderation")]
        public async Task<ActionResult> UpdatePostModeration(Guid id, UpdatePostModerationRequest request)
        {
            var post = await _posts.GetByIdAsync(id);
            if (post is null)
                return NotFound("Post not found");

            if (!Enum.TryParse<ModerationStatus>(request.ModerationStatus, true, out var moderationStatus))
                return BadRequest("Invalid moderation status");

            post.ModerationStatus = moderationStatus;
            post.ModerationNotes = request.ModerationNotes;
            post.UpdatedAt = DateTime.UtcNow;

            await _posts.UpdateAsync(post);

            var moderationAction = new ModerationAction
            {
                Id = Guid.NewGuid(),
                PostId = id,
                ActionType = moderationStatus switch
                {
                    ModerationStatus.Approved => ModerationActionType.Keep,
                    ModerationStatus.Removed => ModerationActionType.Remove,
                    ModerationStatus.Flagged => ModerationActionType.Keep,
                    ModerationStatus.UnderReview => ModerationActionType.Keep,
                    _ => ModerationActionType.Keep
                },
                CreatedAt = DateTime.UtcNow
            };

            await _moderations.AddAsync(moderationAction);

            return Ok(new { message = "Post moderation updated successfully" });
        }


        [HttpPatch("posts/{id}/verification")]
        public async Task<ActionResult> UpdatePostVerification(Guid id, UpdatePostVerificationRequest request)
        {
            var post = await _posts.GetByIdAsync(id);
            if (post is null)
                return NotFound("Post not found");

            if (!Enum.TryParse<VerificationStatus>(request.VerificationStatus, true, out var verificationStatus))
                return BadRequest("Invalid verification status");

            post.VerificationStatus = verificationStatus;
            post.ConfidenceScore = request.ConfidenceScore;
            post.UpdatedAt = DateTime.UtcNow;

            await _posts.UpdateAsync(post);

            return Ok(new { message = "Post verification updated successfully" });
        }


        [HttpDelete("posts/{id}")]
        public async Task<ActionResult> DeletePost(Guid id)
        {
            var post = await _posts.GetByIdAsync(id);
            if (post is null)
                return NotFound("Post not found");

            await _posts.DeleteAsync(id);

            return Ok(new { message = "Post deleted successfully" });
        }

        #endregion

        #region Independent Journalist Verification

        /// <summary>
        /// Returns all independent journalists whose registration is still pending admin review.
        /// </summary>
        [HttpGet("journalists/pending")]
        public async Task<ActionResult<IEnumerable<PendingJournalistResponse>>> GetPendingJournalists()
        {
            var allUsers = await _users.GetAllAsync();

            var pending = allUsers
                .Where(u => u.Role == Role.Journalist
                         && u.OrganizationId == null
                         && u.RegistrationStatus == Domain.Enums.RegistrationStatus.Pending)
                .OrderBy(u => u.CreatedAt)
                .Select(u => new PendingJournalistResponse(
                    u.Id,
                    u.Name,
                    u.Email,
                    u.JournalistExternalId ?? "",
                    u.CreatedAt
                ));

            return Ok(pending);
        }

        /// <summary>
        /// Approve or reject a pending independent journalist.
        /// PATCH /api/admin/journalists/{id}/review
        /// Body: { "approve": true }   OR   { "approve": false, "rejectionReason": "..." }
        /// </summary>
        [HttpPatch("journalists/{id}/review")]
        public async Task<ActionResult> ReviewJournalist(Guid id, ReviewJournalistRequest request)
        {
            var user = await _users.GetByIdAsync(id);
            if (user is null)
                return NotFound("User not found.");

            if (user.Role != Role.Journalist || user.OrganizationId != null)
                return BadRequest("This endpoint is only for independent journalists.");

            if (user.RegistrationStatus != Domain.Enums.RegistrationStatus.Pending)
                return BadRequest($"Journalist registration is already '{user.RegistrationStatus}'. Only pending requests can be reviewed.");

            if (request.Approve)
            {
                user.RegistrationStatus = Domain.Enums.RegistrationStatus.Approved;
                user.RejectionReason = null;
                await _users.UpdateAsync(user);
                return Ok(new { message = $"Journalist '{user.Name}' has been approved and can now log in." });
            }
            else
            {
                if (string.IsNullOrWhiteSpace(request.RejectionReason))
                    return BadRequest("A rejection reason is required when rejecting a journalist.");

                user.RegistrationStatus = Domain.Enums.RegistrationStatus.Rejected;
                user.RejectionReason = request.RejectionReason;
                await _users.UpdateAsync(user);
                return Ok(new { message = $"Journalist '{user.Name}' has been rejected." });
            }
        }

        /// <summary>
        /// Returns all rejected independent journalists (for audit / appeal purposes).
        /// </summary>
        [HttpGet("journalists/rejected")]
        public async Task<ActionResult<IEnumerable<object>>> GetRejectedJournalists()
        {
            var allUsers = await _users.GetAllAsync();

            var rejected = allUsers
                .Where(u => u.Role == Role.Journalist
                         && u.OrganizationId == null
                         && u.RegistrationStatus == Domain.Enums.RegistrationStatus.Rejected)
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    JournalistId = u.JournalistExternalId,
                    u.RejectionReason,
                    RegisteredAt = u.CreatedAt
                });

            return Ok(rejected);
        }

        /// <summary>
        /// Re-opens a rejected journalist's application back to Pending,
        /// allowing the admin to re-evaluate after an appeal.
        /// </summary>
        [HttpPatch("journalists/{id}/reopen")]
        public async Task<ActionResult> ReopenJournalistApplication(Guid id)
        {
            var user = await _users.GetByIdAsync(id);
            if (user is null)
                return NotFound("User not found.");

            if (user.Role != Role.Journalist || user.OrganizationId != null)
                return BadRequest("This endpoint is only for independent journalists.");

            if (user.RegistrationStatus != Domain.Enums.RegistrationStatus.Rejected)
                return BadRequest("Only rejected applications can be re-opened.");

            user.RegistrationStatus = Domain.Enums.RegistrationStatus.Pending;
            user.RejectionReason = null;
            await _users.UpdateAsync(user);

            return Ok(new { message = $"Journalist '{user.Name}' application re-opened for review." });
        }

        #endregion

        #region Reports & Analytics


        [HttpGet("reports/posts-by-moderation")]
        public async Task<ActionResult<object>> GetPostsByModerationStatus()
        {
            var allPosts = await _posts.GetAllAsync();

            var report = new
            {
                Pending = allPosts.Count(p => p.ModerationStatus == ModerationStatus.Pending),
                Approved = allPosts.Count(p => p.ModerationStatus == ModerationStatus.Approved),
                UnderReview = allPosts.Count(p => p.ModerationStatus == ModerationStatus.UnderReview),
                Flagged = allPosts.Count(p => p.ModerationStatus == ModerationStatus.Flagged),
                Removed = allPosts.Count(p => p.ModerationStatus == ModerationStatus.Removed)
            };

            return Ok(report);
        }


        [HttpGet("reports/posts-by-verification")]
        public async Task<ActionResult<object>> GetPostsByVerificationStatus()
        {
            var allPosts = await _posts.GetAllAsync();

            var report = new
            {
                Unknown = allPosts.Count(p => p.VerificationStatus == VerificationStatus.Unknown),
                Trusted = allPosts.Count(p => p.VerificationStatus == VerificationStatus.Trusted),
                Suspicious = allPosts.Count(p => p.VerificationStatus == VerificationStatus.Suspicious),
                Fake = allPosts.Count(p => p.VerificationStatus == VerificationStatus.Fake)
            };

            return Ok(report);
        }


        [HttpGet("reports/users-by-role")]
        public async Task<ActionResult<object>> GetUsersByRole()
        {
            var allUsers = await _users.GetAllAsync();

            var report = new
            {
                Regular = allUsers.Count(u => u.Role == Role.Regular),
                Journalist = allUsers.Count(u => u.Role == Role.Journalist),
                Organization = allUsers.Count(u => u.Role == Role.Organization),
                Admin = allUsers.Count(u => u.Role == Role.Admin),
                Active = allUsers.Count(u => u.IsActive),
                Inactive = allUsers.Count(u => !u.IsActive)
            };

            return Ok(report);
        }

        #endregion
    }
}