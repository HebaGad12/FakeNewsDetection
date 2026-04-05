using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ServicesAbstraction;
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
        private readonly IPostMediaRepository _media;
        private readonly IToxicityService _toxicity;
        private readonly IFactCheckerService _factChecker;
        private readonly IImageCopyrightService _copyright;

        // Allowed image MIME types
        private static readonly string[] AllowedImageTypes =
            { "image/jpeg", "image/png", "image/webp", "image/gif" };

        // Allowed video MIME types
        private static readonly string[] AllowedVideoTypes =
            { "video/mp4", "video/webm", "video/ogg", "video/quicktime" };

        // Map MIME type → file extension
        private static readonly Dictionary<string, string> MimeToExt = new()
        {
            ["image/jpeg"]      = ".jpg",
            ["image/png"]       = ".png",
            ["image/webp"]      = ".webp",
            ["image/gif"]       = ".gif",
            ["video/mp4"]       = ".mp4",
            ["video/webm"]      = ".webm",
            ["video/ogg"]       = ".ogv",
            ["video/quicktime"] = ".mov",
        };

        public JournalistController(
            IUserRepository users,
            IPostRepository posts,
            IFollowRepository follows,
            IPostMediaRepository media,
            IToxicityService toxicity,
            IFactCheckerService factChecker,
            IImageCopyrightService copyright)
        {
            _users = users;
            _posts = posts;
            _follows = follows;
            _media = media;
            _toxicity = toxicity;
            _factChecker = factChecker;
            _copyright = copyright;
        }

        private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        /// <summary>
        /// Saves an uploaded image file to media/posts/{mediaId}{ext} and returns the
        /// relative URL path that gets stored in the database.
        /// </summary>
        private async Task<(string relativePath, string absolutePath)> SaveMediaFileAsync(
            IFormFile file, Guid mediaId)
        {
            var ext = MimeToExt.TryGetValue(file.ContentType.ToLower(), out var e) ? e
                      : Path.GetExtension(file.FileName).ToLower();

            var fileName    = $"{mediaId}{ext}";
            var absoluteDir = Path.Combine(Directory.GetCurrentDirectory(), "media", "posts");
            Directory.CreateDirectory(absoluteDir);

            var absolutePath = Path.Combine(absoluteDir, fileName);
            var relativePath = $"media/posts/{fileName}";   // stored in DB & returned to client

            await using var stream = new FileStream(absolutePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return (relativePath, absolutePath);
        }

        private static string ResolveAbsolutePath(string mediaPath)
        {
            var trimmed = mediaPath.Trim();
            if (Path.IsPathRooted(trimmed))
                return Path.GetFullPath(trimmed);

            var normalized = trimmed
                .Replace("/", Path.DirectorySeparatorChar.ToString())
                .TrimStart(Path.DirectorySeparatorChar);

            return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), normalized));
        }

        /// <summary>
        /// Checks whether an image at <paramref name="absolutePath"/> violates copyright,
        /// but ignores any matches that are already owned by <paramref name="requesterId"/>.
        ///
        /// This prevents the image owner from being blocked when they re-upload or reuse
        /// one of their own previously copyrighted images.
        /// </summary>
        private async Task<CopyrightCheckResult> CheckCopyrightExcludingOwnerAsync(
            string absolutePath, Guid requesterId)
        {
            var result = await _copyright.CheckAsync(absolutePath);

            if (!result.IsDuplicate)
                return result;

            // Filter out matches that belong to the current user.
            // CopyrightMatch.Id is the PostMedia.Id (Guid stored as string) of the
            // registered image.  We resolve each match to its owner via the media
            // repository and the post it belongs to.
            var thirdPartyMatches = new List<CopyrightMatch>();

            foreach (var match in result.Matches)
            {
                if (!Guid.TryParse(match.Id, out var matchedMediaId))
                {
                    // Unrecognised ID format — treat as third-party to stay safe.
                    thirdPartyMatches.Add(match);
                    continue;
                }

                var matchedMedia = await _media.GetByIdAsync(matchedMediaId);
                if (matchedMedia is null)
                {
                    // The entry is in the vector store but no longer in the DB
                    // (e.g. the original post was deleted but cleanup failed).
                    // Safe to ignore — it cannot be enforced.
                    continue;
                }

                var matchedPost = await _posts.GetByIdAsync(matchedMedia.PostId);
                if (matchedPost is null || matchedPost.AuthorId != requesterId)
                {
                    // Belongs to a different journalist → real violation.
                    thirdPartyMatches.Add(match);
                }
                // else: same journalist owns the matching entry → skip (not a violation).
            }

            return new CopyrightCheckResult(thirdPartyMatches.Count > 0, thirdPartyMatches);
        }

        // ── Profile ────────────────────────────────────────────────────────

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

            if (req.Name  != null) journalist.Name  = req.Name;
            if (req.Email != null) journalist.Email = req.Email;

            await _users.UpdateAsync(journalist);
            return Ok(new { journalist.Id, journalist.Name, journalist.Email });
        }

        // ── Posts ──────────────────────────────────────────────────────────

        /// <summary>
        /// Creates a new post. Accepts multipart/form-data with:
        ///   - Title        (string)
        ///   - Content      (string)
        ///   - Tags         (comma-separated string, e.g. "politics,economy")
        ///   - images       (one or more IFormFile — optional)
        ///   - IsCopyrightedFlags  (list of bool, parallel to images — optional)
        /// Images are saved to media/posts/{mediaId}.ext on disk.
        /// The database stores the relative path (e.g. "media/posts/abc.jpg").
        /// </summary>
        [HttpPost("posts")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult> CreatePost(
            [FromForm] JournalistCreatePostRequest req,
            [FromForm] List<IFormFile>? images)
        {
            var journalist = await _users.GetByIdAsync(GetUserId());
            if (journalist is null) return NotFound("Journalist not found");

            // ── Validate uploaded files (before doing any heavy work) ───────
            if (images != null && images.Count > 0)
            {
                const long maxImageSize = 5   * 1024 * 1024; // 5 MB
                const long maxVideoSize = 100 * 1024 * 1024; // 100 MB
                foreach (var file in images)
                {
                    var ct      = file.ContentType?.ToLower() ?? "";
                    bool isImage = AllowedImageTypes.Contains(ct);
                    bool isVideo = AllowedVideoTypes.Contains(ct);

                    if (!isImage && !isVideo)
                        return BadRequest(
                            $"File '{file.FileName}' has an unsupported type '{file.ContentType}'. " +
                            "Allowed images: JPEG, PNG, WebP, GIF. Allowed videos: MP4, WebM, OGG, MOV.");

                    var sizeLimit = isVideo ? maxVideoSize : maxImageSize;
                    if (file.Length > sizeLimit)
                        return BadRequest(
                            $"File '{file.FileName}' exceeds the {(isVideo ? "100 MB video" : "5 MB image")} size limit.");
                }
            }

            // ── Toxicity check ──────────────────────────────────────────────
            var textToCheck = $"{req.Title} {req.Content}";
            if (await _toxicity.IsToxicAsync(textToCheck))
                return BadRequest(new
                {
                    Error   = "ToxicContent",
                    Message = "Your article contains toxic language. Please revise before publishing."
                });

            // ── Fact-check ──────────────────────────────────────────────────
            var factCheck = await _factChecker.CheckAsync($"{req.Title}\n\n{req.Content}");
            if (factCheck.Verdict == FactCheckVerdict.False)
                return BadRequest(new
                {
                    Error    = "FailedFactCheck",
                    Message  = "Your article did not pass fact-checking and cannot be published.",
                    Analysis = factCheck.Analysis
                });

            var verificationStatus = factCheck.Verdict == FactCheckVerdict.True
                ? VerificationStatus.Trusted
                : VerificationStatus.Unknown;

            // ── Build post ──────────────────────────────────────────────────
            var tags = (req.Tags ?? "")
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            // Organisation journalists need approval before going public;
            // independent journalists publish immediately.
            var moderationStatus = journalist.OrganizationId.HasValue
                ? ModerationStatus.Pending
                : ModerationStatus.Approved;

            var post = new Post
            {
                Id                 = Guid.NewGuid(),
                Title              = req.Title,
                Content            = req.Content,
                AuthorId           = journalist.Id,
                OrganizationId     = journalist.OrganizationId,
                CreatedAt          = DateTime.UtcNow,
                Tags               = tags,
                VerificationStatus = verificationStatus,
                ModerationStatus   = moderationStatus
            };

            // ── Save media files, build PostMedia entities ──────────────────
            var mediaEntities = new List<PostMedia>();

            if (images != null && images.Count > 0)
            {
                for (int i = 0; i < images.Count; i++)
                {
                    var file    = images[i];
                    var mediaId = Guid.NewGuid();
                    var ct      = file.ContentType?.ToLower() ?? "";
                    bool isImage = AllowedImageTypes.Contains(ct);

                    var (relativePath, absolutePath) = await SaveMediaFileAsync(file, mediaId);

                    if (isImage)
                    {
                        // Copyright check: images only.
                        // Ownership-aware: matches owned by this journalist are excluded
                        // so that an author is never blocked from reusing their own images.
                        var check = await CheckCopyrightExcludingOwnerAsync(absolutePath, journalist.Id);
                        if (check.IsDuplicate)
                        {
                            System.IO.File.Delete(absolutePath);
                            return BadRequest(new
                            {
                                Error   = "CopyrightViolation",
                                Message = $"Image '{file.FileName}' is copyrighted by another user and cannot be used.",
                                Matches = check.Matches
                            });
                        }
                    }

                    // Videos are never copyrighted; images use the caller-supplied flag.
                    var isCopyrighted = isImage
                                        && req.IsCopyrightedFlags != null
                                        && i < req.IsCopyrightedFlags.Count
                                        && req.IsCopyrightedFlags[i];

                    mediaEntities.Add(new PostMedia
                    {
                        Id            = mediaId,
                        PostId        = post.Id,
                        Path          = relativePath,
                        MediaType     = isImage ? "image" : "video",
                        IsCopyrighted = isCopyrighted
                    });
                }
            }

            // ── Persist ─────────────────────────────────────────────────────
            await _posts.AddAsync(post);

            if (mediaEntities.Count > 0)
            {
                await _media.AddRangeAsync(mediaEntities);

                // Register copyrighted images in the vector store
                foreach (var entity in mediaEntities.Where(e => e.IsCopyrighted))
                    await _copyright.StoreAsync(
                        ResolveAbsolutePath(entity.Path), entity.Id.ToString());
            }

            return Ok(new
            {
                PostId             = post.Id,
                ModerationStatus   = post.ModerationStatus.ToString(),
                VerificationStatus = post.VerificationStatus.ToString(),
                MediaCount         = mediaEntities.Count
            });
        }

        [HttpDelete("posts/{postId}")]
        public async Task<ActionResult> DeletePost(Guid postId)
        {
            var userId = GetUserId();
            var post   = await _posts.GetByIdAsync(postId);
            if (post == null || post.AuthorId != userId)
                return NotFound("Post not found or not owned by you");

            var mediaItems = await _media.GetByPostIdAsync(post.Id);
            foreach (var media in mediaItems)
            {
                // Remove from copyright vector store
                if (media.MediaType == "image" && media.IsCopyrighted)
                    await _copyright.RemoveAsync(media.Id.ToString());

                // Delete file from disk
                var absolutePath = ResolveAbsolutePath(media.Path);
                if (System.IO.File.Exists(absolutePath))
                    System.IO.File.Delete(absolutePath);
            }

            await _posts.DeleteAsync(post.Id);
            return NoContent();
        }

        [HttpGet("posts")]
        public async Task<ActionResult<IEnumerable<JournalistPostResponse>>> MyPosts()
        {
            var userId   = GetUserId();
            var posts    = await _posts.GetByAuthorAsync(userId);
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
                // Return the stored relative path — the client constructs the full URL
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

        // ── Media management ───────────────────────────────────────────────

        /// <summary>
        /// Adds one or more images or videos to an existing post via multipart/form-data:
        ///   - images              (one or more IFormFile — images and/or videos)
        ///   - IsCopyrightedFlags  (parallel list of bool for images — ignored for videos)
        /// Videos always have IsCopyrighted = false; no copyright check is run on them.
        /// </summary>
        [HttpPost("posts/{postId}/media")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<IEnumerable<MediaDto>>> AddMedia(
            Guid postId,
            [FromForm] AddPostMediaRequest req,
            [FromForm] List<IFormFile>? images)
        {
            if (images == null || !images.Any())
                return BadRequest("At least one file is required.");

            var post = await _posts.GetByIdAsync(postId);
            if (post == null || post.AuthorId != GetUserId())
                return NotFound("Post not found or not owned by you.");

            // Validate files
            const long maxImageSize = 5   * 1024 * 1024; // 5 MB
            const long maxVideoSize = 100 * 1024 * 1024; // 100 MB
            foreach (var file in images)
            {
                var ct      = file.ContentType?.ToLower() ?? "";
                bool isImg  = AllowedImageTypes.Contains(ct);
                bool isVid  = AllowedVideoTypes.Contains(ct);

                if (!isImg && !isVid)
                    return BadRequest(
                        $"File '{file.FileName}' has unsupported type '{file.ContentType}'. " +
                        "Allowed images: JPEG, PNG, WebP, GIF. Allowed videos: MP4, WebM, OGG, MOV.");

                var sizeLimit = isVid ? maxVideoSize : maxImageSize;
                if (file.Length > sizeLimit)
                    return BadRequest(
                        $"File '{file.FileName}' exceeds the {(isVid ? "100 MB video" : "5 MB image")} size limit.");
            }

            var requesterId = GetUserId();
            var entities    = new List<PostMedia>();

            for (int i = 0; i < images.Count; i++)
            {
                var file    = images[i];
                var mediaId = Guid.NewGuid();
                var ct      = file.ContentType?.ToLower() ?? "";
                bool isImage = AllowedImageTypes.Contains(ct);

                var (relativePath, absolutePath) = await SaveMediaFileAsync(file, mediaId);

                if (isImage)
                {
                    // Copyright check: images only.
                    // Ownership-aware: matches owned by this journalist are excluded
                    // so that an author is never blocked from reusing their own images.
                    var check = await CheckCopyrightExcludingOwnerAsync(absolutePath, requesterId);
                    if (check.IsDuplicate)
                    {
                        System.IO.File.Delete(absolutePath);
                        return BadRequest(new
                        {
                            Error   = "CopyrightViolation",
                            Message = $"Image '{file.FileName}' is copyrighted by another user and cannot be used.",
                            Matches = check.Matches
                        });
                    }
                }

                // Videos are never copyrighted; images use the caller-supplied flag.
                var isCopyrighted = isImage
                                    && req.IsCopyrightedFlags != null
                                    && i < req.IsCopyrightedFlags.Count
                                    && req.IsCopyrightedFlags[i];

                entities.Add(new PostMedia
                {
                    Id            = mediaId,
                    PostId        = postId,
                    Path          = relativePath,
                    MediaType     = isImage ? "image" : "video",
                    IsCopyrighted = isCopyrighted
                });
            }

            await _media.AddRangeAsync(entities);

            foreach (var entity in entities.Where(e => e.IsCopyrighted))
                await _copyright.StoreAsync(ResolveAbsolutePath(entity.Path), entity.Id.ToString());

            var dtos = entities.Select(m => new MediaDto(
                m.Id, m.Path, m.MediaType, m.IsCopyrighted, m.UploadedAt)).ToList();

            return Ok(dtos);
        }

        [HttpDelete("posts/{postId}/media/{mediaId}")]
        public async Task<ActionResult> DeleteMedia(Guid postId, Guid mediaId)
        {
            var post = await _posts.GetByIdAsync(postId);
            if (post == null || post.AuthorId != GetUserId())
                return NotFound("Post not found or not owned by you.");

            var item = await _media.GetByIdAsync(mediaId);
            if (item == null || item.PostId != postId)
                return NotFound("Media item not found on this post.");

            if (item.MediaType == "image" && item.IsCopyrighted)
                await _copyright.RemoveAsync(item.Id.ToString());

            // Delete file from disk
            var absolutePath = ResolveAbsolutePath(item.Path);
            if (System.IO.File.Exists(absolutePath))
                System.IO.File.Delete(absolutePath);

            await _media.DeleteAsync(mediaId);
            return NoContent();
        }

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

            if (req.IsCopyrighted && !item.IsCopyrighted)
            {
                // Ownership-aware check: the journalist should not be blocked by their
                // own previously registered copies of this image.
                var check = await CheckCopyrightExcludingOwnerAsync(
                    ResolveAbsolutePath(item.Path), GetUserId());
                if (check.IsDuplicate)
                    return BadRequest(new
                    {
                        Error   = "CopyrightViolation",
                        Message = "This image is already copyrighted by another user and cannot be marked as yours.",
                        Matches = check.Matches
                    });

                await _copyright.StoreAsync(ResolveAbsolutePath(item.Path), item.Id.ToString());
            }
            else if (!req.IsCopyrighted && item.IsCopyrighted)
            {
                await _copyright.RemoveAsync(item.Id.ToString());
            }

            item.IsCopyrighted = req.IsCopyrighted;
            await _media.UpdateAsync(item);

            return Ok(new MediaDto(item.Id, item.Path, item.MediaType, item.IsCopyrighted, item.UploadedAt));
        }

        // ── Follow / Unfollow ──────────────────────────────────────────────

        [HttpPost("follow/{targetId}")]
        public async Task<ActionResult> Follow(Guid targetId)
        {
            var userId = GetUserId();

            if (userId == targetId)
                return BadRequest("You cannot follow yourself.");

            var existing = await _follows.GetAsync(userId, targetId);
            if (existing is not null)
                return Conflict("You are already following this user.");

            await _follows.AddAsync(new Follow
            {
                FollowerId = userId,
                FolloweeId = targetId,
                CreatedAt  = DateTime.UtcNow
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

        // ── Post report ────────────────────────────────────────────────────

        [HttpGet("posts/{postId}/report")]
        public async Task<ActionResult> GetPostReport(Guid postId)
        {
            var userId     = GetUserId();
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

        [HttpPost("posts/{postId}/report")]
        public async Task<ActionResult> Report(Guid postId, [FromBody] JournalistReportRequest req)
        {
            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            return Ok(new { Message = "Use the unified endpoint POST /api/posts/{postId}/report" });
        }
    }

    // ── Inline DTOs ───────────────────────────────────────────────────────────

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