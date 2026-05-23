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
        private readonly IFollowRepository _follows;

        public PostReportsController(
            IPostRepository posts,
            IInteractionRepository interactions,
            IUserRepository users,
            IFollowRepository follows)                 // ← NEW
        {
            _posts = posts;
            _interactions = interactions;
            _users = users;
            _follows = follows;                        // ← NEW
        }

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private string? GetRole() => User.FindFirstValue(ClaimTypes.Role);

        // ── GET /api/reports/posts ─────────────────────────────────────────
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
                targetPosts = allPosts;
            else if (role == "Organization")
                targetPosts = allPosts.Where(p => p.OrganizationId == callerId);
            else if (role == "Journalist")
                targetPosts = allPosts.Where(p => p.AuthorId == callerId);
            else
                return Forbid();

            var allUsers = await _users.GetAllAsync();
            var userDict = allUsers.ToDictionary(u => u.Id);

            var result = new List<PostReportSummary>();

            foreach (var p in targetPosts.OrderByDescending(p => p.CreatedAt))
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

                // ── NEW: follower count and article count for the post author ──
                var authorFollowers  = await _follows.GetFollowersAsync(p.AuthorId);
                var authorPostCount  = allPosts.Count(ap => ap.AuthorId == p.AuthorId
                                           && ap.ModerationStatus == ModerationStatus.Approved);
                // ──────────────────────────────────────────────────────────────

                result.Add(new PostReportSummary(
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
                    reports,
                    TotalFollowers: authorFollowers.Count(),   // ← NEW
                    TotalArticles:  authorPostCount            // ← NEW
                ));
            }

            return Ok(result);
        }

        // ── GET /api/reports/posts/{postId} ───────────────────────────────
        [HttpGet("posts/{postId}")]
        public async Task<ActionResult<PostReportSummary>> GetPostReport(Guid postId)
        {
            var callerId = GetUserId();
            var role = GetRole();

            var caller = await _users.GetByIdAsync(callerId);
            if (caller is null) return Unauthorized();

            var post = await _posts.GetByIdAsync(postId);
            if (post is null) return NotFound("Post not found.");

            if (role == "Journalist" && post.AuthorId != callerId)
                return Forbid();

            if (role == "Organization" && post.OrganizationId != callerId)
                return Forbid();

            var allUsers = await _users.GetAllAsync();
            var userDict = allUsers.ToDictionary(u => u.Id);
            var allPosts = await _posts.GetAllAsync();

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


            var authorFollowers = await _follows.GetFollowersAsync(post.AuthorId);
            var authorPostCount = allPosts.Count(ap => ap.AuthorId == post.AuthorId
                                       && ap.ModerationStatus == ModerationStatus.Approved);

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
                reports,
                TotalFollowers: authorFollowers.Count(),   // ← NEW
                TotalArticles:  authorPostCount            // ← NEW
            ));
        }
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record ReportDetail(
        Guid     Id,
        string   ReporterName,
        string   ReporterRole,
        string   Reason,
        DateTime ReportedAt
    );

    public record PostReportSummary(
        Guid             PostId,
        string           Title,
        string           AuthorName,
        Guid             AuthorId,
        string           OrganizationName,
        string           ModerationStatus,
        string           VerificationStatus,
        DateTime         CreatedAt,
        int              Likes,
        int              Comments,
        int              TotalReports,
        List<ReportDetail> Reports,
        int              TotalFollowers,   // ← NEW (replaces Description)
        int              TotalArticles     // ← NEW
    );
}