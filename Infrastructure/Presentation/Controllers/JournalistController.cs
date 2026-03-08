using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs;
using System;
using System.Collections.Generic;
using System.IO;
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
        private readonly IPostMediaRepository _mediaRepo;
        private readonly IWebHostEnvironment _env;

        public JournalistController(
            IUserRepository users,
            IPostRepository posts,
            IFollowRepository follows,
            IPostMediaRepository mediaRepo,
            IWebHostEnvironment env)
        {
            _users = users;
            _posts = posts;
            _follows = follows;
            _mediaRepo = mediaRepo;
            _env = env;
        }

        private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        private string GetUserName() => User.FindFirstValue(ClaimTypes.Name) ?? GetUserId().ToString("N");

        // ── Profile ──

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

        [HttpPut("edit")]
        public async Task<ActionResult> EditProfile([FromBody] JournalistEditProfileRequest req)
        {
            var journalist = await _users.GetByIdAsync(GetUserId());
            if (journalist is null) return NotFound("Journalist not found");

            if (req.Name != null) journalist.Name = req.Name;
            if (req.Email != null) journalist.Email = req.Email;

            await _users.UpdateAsync(journalist);
            return Ok(new { journalist.Id, journalist.Name, journalist.Email });
        }

        // ── Posts ──

        [HttpPost("posts")]
        public async Task<ActionResult> CreatePost([FromBody] JournalistCreatePostRequest req)
        {
            var journalist = await _users.GetByIdAsync(GetUserId());
            if (journalist is null) return NotFound("Journalist not found");

            var postId = Guid.NewGuid();
            var post = new Post
            {
                Id = postId,
                Title = req.Title,
                Content = req.Content,
                AuthorId = journalist.Id,
                OrganizationId = journalist.OrganizationId,
                CreatedAt = DateTime.UtcNow,
                Tags = req.Tags.ToArray(),
                ModerationStatus = journalist.OrganizationId == null
                    ? ModerationStatus.Approved
                    : ModerationStatus.Pending
            };

            await _posts.AddAsync(post);

            // ── Attach media from temp storage ──
            if (req.Media != null && req.Media.Count > 0)
            {
                var journalistUsername = SanitizePathSegment(journalist.Name);
                var mediaList = new List<PostMedia>();

                foreach (var attachment in req.Media)
                {
                    var tempDir = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", "temp");
                    var tempFiles = Directory.Exists(tempDir)
                        ? Directory.GetFiles(tempDir, $"{attachment.TempId}*")
                        : Array.Empty<string>();

                    if (tempFiles.Length == 0) continue;

                    var tempFile = tempFiles[0];
                    var extension = Path.GetExtension(tempFile);
                    var storedFileName = $"{attachment.TempId}{extension}";

                    var destRelative = Path.Combine(journalistUsername, postId.ToString("N"), "images", storedFileName)
                        .Replace('\\', '/');
                    var destFull = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", destRelative);
                    Directory.CreateDirectory(Path.GetDirectoryName(destFull)!);
                    System.IO.File.Move(tempFile, destFull);

                    mediaList.Add(new PostMedia
                    {
                        Id = Guid.NewGuid(),
                        PostId = postId,
                        FileName = storedFileName,
                        OriginalFileName = storedFileName,
                        FilePath = destRelative,
                        Copyright = attachment.Copyright,
                        DisplayOrder = attachment.DisplayOrder,
                        SizeBytes = new FileInfo(destFull).Length,
                        UploadedAt = DateTime.UtcNow
                    });
                }

                if (mediaList.Count > 0)
                    await _mediaRepo.AddRangeAsync(mediaList);
            }

            return Ok(new
            {
                PostId = post.Id,
                ModerationStatus = post.ModerationStatus.ToString(),
                MediaCount = req.Media?.Count ?? 0
            });
        }

        [HttpGet("posts")]
        public async Task<ActionResult<IEnumerable<JournalistPostResponse>>> MyPosts()
        {
            var userId = GetUserId();
            var posts = await _posts.GetByAuthorAsync(userId);
            var allUsers = await _users.GetAllAsync();

            var dto = posts.Select(p =>
            {
                string orgName = "Independent";
                if (p.OrganizationId.HasValue)
                {
                    var orgUser = allUsers.FirstOrDefault(u => u.Id == p.OrganizationId.Value);
                    orgName = orgUser?.Name ?? "Unknown";
                }
                return new JournalistPostResponse(
                    p.Id, p.Title, p.Content, p.CreatedAt,
                    p.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0,
                    p.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0,
                    p.Interactions?.Count(i => i.Type == InteractionType.Report) ?? 0,
                    orgName,
                    p.ModerationStatus.ToString()
                );
            });

            return Ok(dto);
        }

        [HttpDelete("posts/{postId}")]
        public async Task<ActionResult> DeletePost(Guid postId)
        {
            var userId = GetUserId();
            var post = await _posts.GetByIdAsync(postId);
            if (post == null || post.AuthorId != userId)
                return NotFound("Post not found or not owned by you");

            var mediaList = await _mediaRepo.GetByPostIdAsync(postId);
            foreach (var m in mediaList)
            {
                var fullPath = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", m.FilePath.TrimStart('/'));
                if (System.IO.File.Exists(fullPath))
                    System.IO.File.Delete(fullPath);
            }

            await _posts.DeleteAsync(post.Id);
            return NoContent();
        }

        [HttpPost("posts/{postId}/report")]
        public async Task<ActionResult> Report(Guid postId, [FromBody] JournalistReportRequest req)
        {
            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");
            return Ok(new { Message = "Use the unified endpoint POST /api/posts/{postId}/report" });
        }

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

        // ── Follow / Unfollow ──

        [HttpPost("follow/{targetId}")]
        public async Task<ActionResult> Follow(Guid targetId)
        {
            var userId = GetUserId();
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

        // ── Helpers ──

        private static string SanitizePathSegment(string name)
        {
            var invalid = Path.GetInvalidFileNameChars();
            var clean = new string(name.Where(c => !invalid.Contains(c) && c != ' ').ToArray());
            return string.IsNullOrEmpty(clean) ? "journalist" : clean.ToLowerInvariant();
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
}