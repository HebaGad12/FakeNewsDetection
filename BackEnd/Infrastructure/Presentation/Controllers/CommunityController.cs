using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Persistence;
using Persistence.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using ServicesAbstraction;
using System.Text;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CommunityController : ControllerBase
    {
        private readonly ICommunityRepository _communities;
        private readonly IWebHostEnvironment _env;
        private readonly IToxicityService _toxicity;

        public CommunityController(
            ICommunityRepository communities,
            IWebHostEnvironment env,
            IToxicityService toxicity)
        {
            _communities = communities;
            _env         = env;
            _toxicity    = toxicity;
        }

        private Guid GetCurrentUserId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // ── POST /api/community/create ────────────────────────────────────
        [HttpPost("create")]
        public async Task<IActionResult> CreateCommunity(
            [FromForm] CreateCommunityDto dto,
            IFormFile? image)
        {
            var userId = GetCurrentUserId();

            string? imageUrl = null;
            try
            {
                imageUrl = await CommunityRepository.SaveImageAsync(image, _env);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new ApiResponse<string> { Success = false, Message = ex.Message });
            }

            var community = new Community
            {
                Id          = Guid.NewGuid(),
                Name        = dto.Name,
                Description = dto.Description,
                IsOpen      = dto.IsOpen,
                ImageUrl    = imageUrl,
                CreatedAt   = DateTime.UtcNow
            };

            var result = await _communities.AddAsync(community, userId);

            if (!result.Success)
                return StatusCode(403, result);

            return Ok(result);
        }

        // ── GET /api/community/{communityId} ──────────────────────────────
        [HttpGet("{communityId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCommunity(Guid communityId)
        {
            var community = await _communities.GetByIdAsync(communityId);
            if (community == null) return NotFound("Community not found.");

            var dto = new CommunityDto(
                community.Id,
                community.Name,
                community.Description,
                community.IsOpen,
                community.ImageUrl,
                community.CreatedBy,
                community.Creator.Name,
                community.Creator.Role.ToString()
            );

            return Ok(dto);
        }

        // ── POST /api/community/{communityId}/join ────────────────────────
        [HttpPost("{communityId}/join")]
        public async Task<IActionResult> JoinCommunity(Guid communityId)
        {
            var userId = GetCurrentUserId();
            var result = await _communities.JoinAsync(communityId, userId);
            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        // ── DELETE /api/community/{communityId}/leave ─────────────────────
        [HttpDelete("{communityId}/leave")]
        public async Task<IActionResult> LeaveCommunity(Guid communityId)
        {
            var userId = GetCurrentUserId();
            var result = await _communities.LeaveAsync(communityId, userId);
            if (!result.Success)
                return result.Message!.Contains("not found") ? NotFound(result) : BadRequest(result);
            return Ok(result);
        }

        // ── GET /api/community/{communityId}/members ──────────────────────
        [HttpGet("{communityId}/members")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMembers(Guid communityId)
        {
            var members = await _communities.GetMembersAsync(communityId);
            return Ok(members);
        }

        // ── GET /api/community/{communityId}/posts ────────────────────────
        [HttpGet("{communityId}/posts")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCommunityPosts(Guid communityId)
        {
            var posts = await _communities.GetPostsAsync(communityId);
            return Ok(posts);
        }

        // ── POST /api/community/{communityId}/posts/create ────────────────
        [HttpPost("{communityId}/posts/create")]
        public async Task<IActionResult> CreatePost(
            Guid communityId,
            [FromForm] string content,
            List<IFormFile>? mediaFiles)
        {
            var userId = GetCurrentUserId();

            if (await _toxicity.IsToxicAsync(content))
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Your post contains toxic or inappropriate language and cannot be published."
                });

            var mediaPaths = new List<string>();
            if (mediaFiles != null && mediaFiles.Any())
            {
                var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads", "posts");
                Directory.CreateDirectory(uploadsFolder);

                var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "video/mp4" };

                foreach (var file in mediaFiles)
                {
                    if (!allowedTypes.Contains(file.ContentType))
                        return BadRequest(new ApiResponse<string>
                        {
                            Success = false,
                            Message = $"File type {file.ContentType} is not allowed."
                        });

                    if (file.Length > 20 * 1024 * 1024)
                        return BadRequest(new ApiResponse<string>
                        {
                            Success = false,
                            Message = "Each file must be less than 20MB."
                        });

                    var ext      = Path.GetExtension(file.FileName).ToLower();
                    var fileName = $"{Guid.NewGuid()}{ext}";
                    var filePath = Path.Combine(uploadsFolder, fileName);

                    using var stream = new FileStream(filePath, FileMode.Create);
                    await file.CopyToAsync(stream);

                    mediaPaths.Add($"/uploads/posts/{fileName}");
                }
            }

            var dto    = new CreatePostDto(userId, content, mediaPaths.Any() ? mediaPaths : null);
            var result = await _communities.CreatePostAsync(communityId, dto);
            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        // ── POST /api/community/{communityId}/members/{targetUserId}/ban ──
        [HttpPost("{communityId}/members/{targetUserId}/ban")]
        public async Task<IActionResult> BanUser(Guid communityId, Guid targetUserId)
        {
            var requesterId = GetCurrentUserId();
            var result      = await _communities.BanUserAsync(communityId, requesterId, targetUserId);
            if (!result.Success)
                return result.Message!.Contains("not found") ? NotFound(result) : StatusCode(403, result);
            return Ok(result);
        }

        // ── DELETE /api/community/{communityId}/posts/{postId} ────────────
        [HttpDelete("{communityId}/posts/{postId}")]
        public async Task<IActionResult> DeletePost(Guid communityId, Guid postId)
        {
            var requesterId = GetCurrentUserId();
            var result      = await _communities.DeletePostAsync(communityId, requesterId, postId);
            if (!result.Success)
                return result.Message!.Contains("not found") ? NotFound(result) : StatusCode(403, result);
            return Ok(result);
        }

        // ── POST /api/community/{communityId}/members/{targetUserId}/unban ─
        [HttpPost("{communityId}/members/{targetUserId}/unban")]
        public async Task<IActionResult> UnbanUser(Guid communityId, Guid targetUserId)
        {
            var requesterId = GetCurrentUserId();
            var result      = await _communities.UnbanUserAsync(communityId, requesterId, targetUserId);
            if (!result.Success)
                return result.Message!.Contains("not found") ? NotFound(result) : StatusCode(403, result);
            return Ok(result);
        }

        // ── GET /api/community/{communityId}/members/{targetUserId}/status ─
        [HttpGet("{communityId}/members/{targetUserId}/status")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserStatus(Guid communityId, Guid targetUserId)
        {
            var result = await _communities.GetUserStatusAsync(communityId, targetUserId);
            if (!result.Success) return NotFound(result);
            return Ok(result);
        }

        // ── GET /api/community/all ─────────────────────────────────────────
        [HttpGet("all")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllCommunities()
        {
            var communities = await _communities.GetAllAsync();
            return Ok(communities);
        }

        // ── GET /api/community/by-journalist/{journalistId} ───────────────
        [HttpGet("by-journalist/{journalistId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetByJournalist(Guid journalistId)
        {
            var communities = await _communities.GetByCreatorAsync(journalistId);
            return Ok(communities);
        }

        // ── GET /api/community/search?query=xxx ───────────────────────────
        [HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> Search([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Search query cannot be empty."
                });

            var results = await _communities.SearchByNameAsync(query);
            return Ok(results);
        }

        // ─────────────────────────────────────────────────────────────────────
        // NEW ── GET /api/community/mine
        // Returns all communities the authenticated user has joined.
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Get all communities the current authenticated user is a member of
        /// (including communities they created).
        /// Returns the same CommunityDto shape used everywhere else.
        /// </summary>
        [HttpGet("mine")]
        public async Task<IActionResult> GetMyCommunities()
        {
            var userId = GetCurrentUserId();
            var result = await _communities.GetByMemberAsync(userId);
            return Ok(result);
        }
    }
}