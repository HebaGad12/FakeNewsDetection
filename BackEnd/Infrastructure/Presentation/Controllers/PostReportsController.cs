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
    /// <summary>
    /// Unified post reports API.
    ///
    /// Access rules:
    ///  - Admin: can see all posts + reports from all journalists (independent and org)
    ///  - Organization: can see reports for posts belonging to their organization
    ///    (including org journalist reports)
    ///  - Independent Journalist: can see reports for their own posts
    ///  - Organization Journalist: can see reports for their own posts
    /// </summary>
    [ApiController]
    [Route("api/reports")]
    [Authorize]
    public class PostReportsController : ControllerBase
    {
        private readonly IPostRepository _posts;
        private readonly IInteractionRepository _interactions;
        private readonly IUserRepository _users;

        public PostReportsController(
            IPostRepository posts,
            IInteractionRepository interactions,
            IUserRepository users)
        {
            _posts = posts;
            _interactions = interactions;
            _users = users;
        }

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private string? GetRole() => User.FindFirstValue(ClaimTypes.Role);

        /// <summary>
        /// Get post reports.
        /// - Admin → all posts
        /// - Organization → posts belonging to their org
        /// - Journalist (independent or org) → their own posts
        /// </summary>
        [HttpGet("posts")]
        public async Task<ActionResult<IEnumerable<PostReportSummary>>> GetPostReports()
        {
            var callerId = GetUserId();
            var role = GetRole();

            var caller = await _users.GetByIdAsync(callerId);
            if (caller is null) return Unauthorized();

            var allPosts = await _posts.GetAllAsync();
            IEnumerable<Post> targetPosts;

            if (role == "Admin")
            {
                // Admin sees every post
                targetPosts = allPosts;
            }
            else if (role == "Organization")
            {
                // Organization sees posts that belong to them
                targetPosts = allPosts.Where(p => p.OrganizationId == callerId);
            }
            else if (role == "Journalist")
            {
                // Journalist (independent or org) sees only their own posts
                targetPosts = allPosts.Where(p => p.AuthorId == callerId);
            }
            else
            {
                return Forbid();
            }

            var allUsers = await _users.GetAllAsync();
            var userDict = allUsers.ToDictionary(u => u.Id);

            var result = targetPosts
                .OrderByDescending(p => p.CreatedAt)
                .Select(p =>
                {
                    var interactions = p.Interactions ?? new List<Interaction>();
                    var reports = interactions
                        .Where(i => i.Type == InteractionType.Report)
                        .Select(i =>
                        {
                            userDict.TryGetValue(i.UserId, out var reporter);
                            return new ReportDetail(
                                i.Id,
                                reporter?.Name ?? "Anonymous",
                                reporter?.Role.ToString() ?? "Unknown",
                                i.Content ?? "",
                                i.CreatedAt
                            );
                        }).ToList();

                    userDict.TryGetValue(p.AuthorId, out var author);
                    string orgName = "Independent";
                    if (p.OrganizationId.HasValue && userDict.TryGetValue(p.OrganizationId.Value, out var org))
                        orgName = org.Name;

                    return new PostReportSummary(
                        p.Id,
                        p.Title,
                        author?.Name ?? "Unknown",
                        p.AuthorId,
                        orgName,
                        p.ModerationStatus.ToString(),
                        p.VerificationStatus.ToString(),
                        p.CreatedAt,
                        interactions.Count(i => i.Type == InteractionType.Like),
                        interactions.Count(i => i.Type == InteractionType.Comment),
                        reports.Count,
                        reports
                    );
                })
                .ToList();

            return Ok(result);
        }

        /// <summary>
        /// Get detailed report for a single post.
        /// Same access rules as GetPostReports.
        /// </summary>
        [HttpGet("posts/{postId}")]
        public async Task<ActionResult<PostReportSummary>> GetPostReport(Guid postId)
        {
            var callerId = GetUserId();
            var role = GetRole();

            var caller = await _users.GetByIdAsync(callerId);
            if (caller is null) return Unauthorized();

            var post = await _posts.GetByIdAsync(postId);
            if (post is null) return NotFound("Post not found.");

            // Access check
            if (role == "Journalist" && post.AuthorId != callerId)
                return Forbid();

            if (role == "Organization" && post.OrganizationId != callerId)
                return Forbid();

            var allUsers = await _users.GetAllAsync();
            var userDict = allUsers.ToDictionary(u => u.Id);

            var interactions = post.Interactions ?? new List<Interaction>();
            var reports = interactions
                .Where(i => i.Type == InteractionType.Report)
                .Select(i =>
                {
                    userDict.TryGetValue(i.UserId, out var reporter);
                    return new ReportDetail(
                        i.Id,
                        reporter?.Name ?? "Anonymous",
                        reporter?.Role.ToString() ?? "Unknown",
                        i.Content ?? "",
                        i.CreatedAt
                    );
                }).ToList();

            userDict.TryGetValue(post.AuthorId, out var author);
            string orgName = "Independent";
            if (post.OrganizationId.HasValue && userDict.TryGetValue(post.OrganizationId.Value, out var org))
                orgName = org.Name;

            return Ok(new PostReportSummary(
                post.Id,
                post.Title,
                author?.Name ?? "Unknown",
                post.AuthorId,
                orgName,
                post.ModerationStatus.ToString(),
                post.VerificationStatus.ToString(),
                post.CreatedAt,
                interactions.Count(i => i.Type == InteractionType.Like),
                interactions.Count(i => i.Type == InteractionType.Comment),
                reports.Count,
                reports
            ));
        }
    }

    public record ReportDetail(
        Guid Id,
        string ReporterName,
        string ReporterRole,
        string Reason,
        DateTime ReportedAt
    );

    public record PostReportSummary(
        Guid PostId,
        string Title,
        string AuthorName,
        Guid AuthorId,
        string OrganizationName,
        string ModerationStatus,
        string VerificationStatus,
        DateTime CreatedAt,
        int Likes,
        int Comments,
        int TotalReports,
        List<ReportDetail> Reports
    );
}
