using Domain.Contracts;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    /// <summary>
    /// Public-facing profile and search endpoints.
    /// Any authenticated user (Regular, Journalist, Organization) can call these.
    /// </summary>
    [ApiController]
    [Route("api/profiles")]
    [Authorize]
    public class PublicProfileController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly IPostRepository _posts;
        private readonly IFollowRepository _follows;
        private readonly IPostMediaRepository _media;

        public PublicProfileController(
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

        // ─────────────────────────────────────────────────────────────────────
        // GET  api/profiles/{id}
        // Returns the public profile of a journalist OR organization by their
        // user ID, including all their approved posts with media.
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Get public profile (journalist or organization) by user ID.
        /// Returns account details + all approved articles with media.
        /// </summary>
        [HttpGet("{id:guid}")]
        public async Task<ActionResult> GetProfile(Guid id)
        {
            var user = await _users.GetByIdAsync(id);
            if (user is null)
                return NotFound("User not found.");

            if (user.Role != Role.Journalist && user.Role != Role.Organization)
                return BadRequest("Profiles are only available for journalists and organizations.");

            if (!user.IsActive)
                return NotFound("This account is not active.");

            var followers = await _follows.GetFollowersAsync(id);
            var authorPosts = await _posts.GetByAuthorAsync(id);

            // For organizations, also include posts made by their journalists
            IEnumerable<Domain.Models.Post> allPosts;
            if (user.Role == Role.Organization)
            {
                var allPostsList = await _posts.GetAllAsync();
                allPosts = allPostsList.Where(p =>
                    p.AuthorId == id || p.OrganizationId == id);
            }
            else
            {
                allPosts = authorPosts;
            }

            // Only show approved posts to the public
            var approvedPosts = allPosts
                .Where(p => p.ModerationStatus == ModerationStatus.Approved)
                .OrderByDescending(p => p.CreatedAt)
                .ToList();

            var postDtos = new List<PublicPostDto>();
            foreach (var p in approvedPosts)
            {
                var mediaItems = await _media.GetByPostIdAsync(p.Id);
                postDtos.Add(new PublicPostDto(
                    p.Id,
                    p.Title,
                    p.Content,
                    p.Tags,
                    p.CreatedAt,
                    p.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0,
                    p.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0,
                    p.VerificationStatus.ToString(),
                    p.ConfidenceScore,
                    mediaItems.Select(m => new MediaDto(
                        m.Id, m.Path, m.MediaType, m.IsCopyrighted, m.UploadedAt
                    )).ToList()
                ));
            }

            if (user.Role == Role.Journalist)
            {
                string orgName = "Independent";
                if (user.OrganizationId.HasValue)
                {
                    var org = await _users.GetByIdAsync(user.OrganizationId.Value);
                    orgName = org?.Name ?? "Unknown";
                }

                return Ok(new JournalistPublicProfileResponse(
                    user.Id,
                    user.Name,
                    "Journalist",
                    orgName,
                    followers.Count(),
                    postDtos.Count,
                    user.CreatedAt,
                    postDtos
                ));
            }
            else // Organization
            {
                var members = await _users.GetOrgMembersAsync(id);

                return Ok(new OrganizationPublicProfileResponse(
                    user.Id,
                    user.Name,
                    "Organization",
                    user.Profile,
                    followers.Count(),
                    postDtos.Count,
                    members.Count(),
                    user.CreatedAt,
                    postDtos
                ));
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET  api/profiles/search?q=CNN&role=Organization&page=1&pageSize=10
        // Search journalists and/or organizations by name.
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Search for journalists and/or organizations by name.
        /// </summary>
        /// <param name="q">Name search term (case-insensitive, partial match)</param>
        /// <param name="role">Filter by role: "Journalist", "Organization", or omit for both</param>
        /// <param name="page">Page number, starting at 1 (default: 1)</param>
        /// <param name="pageSize">Results per page, max 50 (default: 20)</param>
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<ProfileSearchResult>>> Search(
            [FromQuery] string? q = null,
            [FromQuery] string? role = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 1;
            if (pageSize > 50) pageSize = 50;

            var allUsers = await _users.GetAllAsync();

            // Only journalists and organizations are searchable
            var query = allUsers
                .Where(u => u.IsActive)
                .Where(u => u.Role == Role.Journalist || u.Role == Role.Organization);

            // Optional role filter
            if (!string.IsNullOrWhiteSpace(role))
            {
                if (Enum.TryParse<Role>(role, ignoreCase: true, out var parsedRole))
                    query = query.Where(u => u.Role == parsedRole);
                else
                    return BadRequest($"Invalid role filter '{role}'. Use 'Journalist' or 'Organization'.");
            }

            // Optional name search
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                query = query.Where(u => u.Name.ToLower().Contains(term));
            }

            // Order alphabetically then paginate
            var paged = query
                .OrderBy(u => u.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            var results = new List<ProfileSearchResult>();
            foreach (var u in paged)
            {
                string? orgName = null;
                if (u.Role == Role.Journalist && u.OrganizationId.HasValue)
                {
                    var org = await _users.GetByIdAsync(u.OrganizationId.Value);
                    orgName = org?.Name;
                }

                var followers = await _follows.GetFollowersAsync(u.Id);
                var posts = await _posts.GetByAuthorAsync(u.Id);

                results.Add(new ProfileSearchResult(
                    u.Id,
                    u.Name,
                    u.Role.ToString(),
                    u.Role == Role.Journalist ? (orgName ?? "Independent") : null,
                    u.Role == Role.Organization ? u.Profile : null,
                    followers.Count(),
                    posts.Count(p => p.ModerationStatus == ModerationStatus.Approved),
                    u.CreatedAt
                ));
            }

            return Ok(new
            {
                Page = page,
                PageSize = pageSize,
                Total = query.Count(),
                Results = results
            });
        }
    }
}