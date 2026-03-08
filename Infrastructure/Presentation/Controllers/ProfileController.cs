using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    // ════════════════════════════════════════════════════════════════
    // PROFILES — Public profiles for journalists and organisations
    // ════════════════════════════════════════════════════════════════

    /// <summary>
    /// Public profile endpoints. Any user (including anonymous) can view
    /// journalist and organisation profiles, including their published posts.
    /// </summary>
    [ApiController]
    [Route("api/profiles")]
    public class ProfileController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly IPostRepository _posts;
        private readonly IFollowRepository _follows;
        private readonly IPostMediaRepository _mediaRepo;

        public ProfileController(
            IUserRepository users,
            IPostRepository posts,
            IFollowRepository follows,
            IPostMediaRepository mediaRepo)
        {
            _users = users;
            _posts = posts;
            _follows = follows;
            _mediaRepo = mediaRepo;
        }

        // ──────────────────────────────────────────────────────────────
        // GET api/profiles/journalist/{journalistId}
        // Public journalist profile with all their approved posts + media
        // ──────────────────────────────────────────────────────────────

        [HttpGet("journalist/{journalistId}")]
        [AllowAnonymous]
        public async Task<ActionResult<JournalistPublicProfileResponse>> GetJournalistProfile(Guid journalistId)
        {
            var journalist = await _users.GetByIdAsync(journalistId);
            if (journalist is null || journalist.Role != Role.Journalist)
                return NotFound(new { message = "Journalist not found." });

            string orgName = "Independent";
            if (journalist.OrganizationId.HasValue)
            {
                var org = await _users.GetByIdAsync(journalist.OrganizationId.Value);
                orgName = org?.Name ?? "Unknown";
            }

            var allPosts = await _posts.GetByAuthorAsync(journalistId);
            var approvedPosts = allPosts
                .Where(p => p.ModerationStatus == ModerationStatus.Approved)
                .OrderByDescending(p => p.CreatedAt)
                .ToList();

            var postDtos = new List<PublicPostDto>();
            foreach (var p in approvedPosts)
            {
                var media = await _mediaRepo.GetByPostIdAsync(p.Id);
                postDtos.Add(new PublicPostDto(
                    p.Id,
                    p.Title,
                    p.Content,
                    p.Tags,
                    p.CreatedAt,
                    p.UpdatedAt,
                    p.VerificationStatus.ToString(),
                    p.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0,
                    p.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0,
                    media.Select(m => new PostMediaDto(
                        m.Id,
                        $"/uploads/{m.FilePath}",
                        m.OriginalFileName,
                        m.Copyright,
                        m.DisplayOrder,
                        m.SizeBytes,
                        m.UploadedAt
                    )).ToList()
                ));
            }

            var followers = await _follows.GetFollowersAsync(journalistId);

            return Ok(new JournalistPublicProfileResponse(
                journalist.Id,
                journalist.Name,
                journalist.Role.ToString(),
                orgName,
                journalist.Profile,
                journalist.CreatedAt,
                followers.Count(),
                postDtos.Count,
                postDtos
            ));
        }

        // ──────────────────────────────────────────────────────────────
        // GET api/profiles/organization/{orgId}
        // Public organisation profile with approved posts from all their journalists
        // ──────────────────────────────────────────────────────────────

        [HttpGet("organization/{orgId}")]
        [AllowAnonymous]
        public async Task<ActionResult<OrgPublicProfileResponse>> GetOrganizationProfile(Guid orgId)
        {
            var org = await _users.GetByIdAsync(orgId);
            if (org is null || org.Role != Role.Organization)
                return NotFound(new { message = "Organization not found." });

            var allPosts = await _posts.GetAllAsync();
            var orgPosts = allPosts
                .Where(p => p.OrganizationId == orgId && p.ModerationStatus == ModerationStatus.Approved)
                .OrderByDescending(p => p.CreatedAt)
                .ToList();

            var allUsers = await _users.GetAllAsync();

            var postDtos = new List<OrgPublicPostDto>();
            foreach (var p in orgPosts)
            {
                var author = allUsers.FirstOrDefault(u => u.Id == p.AuthorId);
                var media = await _mediaRepo.GetByPostIdAsync(p.Id);

                postDtos.Add(new OrgPublicPostDto(
                    p.Id,
                    p.Title,
                    p.Content,
                    p.Tags,
                    author?.Name ?? "Unknown",
                    p.AuthorId,
                    p.CreatedAt,
                    p.UpdatedAt,
                    p.VerificationStatus.ToString(),
                    p.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0,
                    p.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0,
                    media.Select(m => new PostMediaDto(
                        m.Id,
                        $"/uploads/{m.FilePath}",
                        m.OriginalFileName,
                        m.Copyright,
                        m.DisplayOrder,
                        m.SizeBytes,
                        m.UploadedAt
                    )).ToList()
                ));
            }

            var followers = await _follows.GetFollowersAsync(orgId);
            var journalists = allUsers
                .Where(u => u.OrganizationId == orgId && u.Role == Role.Journalist && u.IsActive)
                .Select(u => new OrgJournalistSummaryDto(u.Id, u.Name))
                .ToList();

            return Ok(new OrgPublicProfileResponse(
                org.Id,
                org.Name,
                org.Profile,
                org.CreatedAt,
                followers.Count(),
                orgPosts.Count,
                journalists,
                postDtos
            ));
        }
    }

    // ════════════════════════════════════════════════════════════════
    // SEARCH — Search journalists and organisations by name
    // ════════════════════════════════════════════════════════════════

    [ApiController]
    [Route("api/search")]
    public class SearchController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly IPostRepository _posts;
        private readonly IFollowRepository _follows;

        public SearchController(
            IUserRepository users,
            IPostRepository posts,
            IFollowRepository follows)
        {
            _users = users;
            _posts = posts;
            _follows = follows;
        }

        // ──────────────────────────────────────────────────────────────
        // GET api/search/users?q=ahmed&role=Journalist
        // Search users by name or username. Filter by role optionally.
        // Accessible to anyone including anonymous.
        // ──────────────────────────────────────────────────────────────

        [HttpGet("users")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<UserSearchResultDto>>> SearchUsers(
            [FromQuery] string q,
            [FromQuery] string? role = null)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
                return BadRequest(new { message = "Search query must be at least 2 characters." });

            var query = q.Trim().ToLowerInvariant();
            var all = await _users.GetAllAsync();

            // Only journalists and organisations are searchable (not Regular users or Admins)
            var searchable = all.Where(u =>
                (u.Role == Role.Journalist || u.Role == Role.Organization) &&
                u.IsActive &&
                u.RegistrationStatus == RegistrationStatus.Approved
            );

            // Filter by role if provided
            if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<Role>(role, true, out var roleEnum))
                searchable = searchable.Where(u => u.Role == roleEnum);

            // Match on name (case-insensitive, partial match)
            var matched = searchable
                .Where(u => u.Name.ToLowerInvariant().Contains(query))
                .OrderBy(u => u.Name)
                .ToList();

            var results = new List<UserSearchResultDto>();
            foreach (var u in matched)
            {
                var followers = await _follows.GetFollowersAsync(u.Id);
                var posts = await _posts.GetByAuthorAsync(u.Id);
                var approvedPostCount = u.Role == Role.Journalist
                    ? posts.Count(p => p.ModerationStatus == ModerationStatus.Approved)
                    : (await _posts.GetAllAsync()).Count(p => p.OrganizationId == u.Id && p.ModerationStatus == ModerationStatus.Approved);

                string? orgName = null;
                if (u.Role == Role.Journalist && u.OrganizationId.HasValue)
                {
                    var org = await _users.GetByIdAsync(u.OrganizationId.Value);
                    orgName = org?.Name;
                }

                results.Add(new UserSearchResultDto(
                    u.Id,
                    u.Name,
                    u.Role.ToString(),
                    orgName,
                    u.Profile,
                    u.CreatedAt,
                    followers.Count(),
                    approvedPostCount
                ));
            }

            return Ok(new
            {
                query = q,
                totalResults = results.Count,
                results
            });
        }
    }

    // ════════════════════════════════════════════════════════════════
    // Response DTOs
    // ════════════════════════════════════════════════════════════════

    public record PublicPostDto(
        Guid Id,
        string Title,
        string Content,
        string[] Tags,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        string VerificationStatus,
        int Likes,
        int Comments,
        List<PostMediaDto> Media
    );

    public record OrgPublicPostDto(
        Guid Id,
        string Title,
        string Content,
        string[] Tags,
        string AuthorName,
        Guid AuthorId,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        string VerificationStatus,
        int Likes,
        int Comments,
        List<PostMediaDto> Media
    );

    public record JournalistPublicProfileResponse(
        Guid Id,
        string Name,
        string Role,
        string OrgName,
        string? Bio,
        DateTime JoinedAt,
        int Followers,
        int PostCount,
        List<PublicPostDto> Posts
    );

    public record OrgPublicProfileResponse(
        Guid Id,
        string Name,
        string? Bio,
        DateTime JoinedAt,
        int Followers,
        int PostCount,
        List<OrgJournalistSummaryDto> Journalists,
        List<OrgPublicPostDto> Posts
    );

    public record OrgJournalistSummaryDto(Guid Id, string Name);

    public record UserSearchResultDto(
        Guid Id,
        string Name,
        string Role,
        string? OrgName,
        string? Bio,
        DateTime JoinedAt,
        int Followers,
        int PostCount
    );
}