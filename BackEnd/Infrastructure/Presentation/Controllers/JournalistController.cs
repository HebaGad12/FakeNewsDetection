using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Presentation.SignalR_Hubs;
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
        private readonly INotificationRepository _notifications; // ← NEW
        private readonly IHubContext<NotificationHub> _hub;      // ← NEW

        // Allowed image MIME types
        private static readonly string[] AllowedImageTypes =
            { "image/jpeg", "image/png", "image/webp", "image/gif" };

        // Allowed video MIME types
        private static readonly string[] AllowedVideoTypes =
            { "video/mp4", "video/webm", "video/ogg", "video/quicktime" };

        // Map MIME type → file extension
        private static readonly Dictionary<string, string> MimeToExt = new()
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp",
            ["image/gif"] = ".gif",
            ["video/mp4"] = ".mp4",
            ["video/webm"] = ".webm",
            ["video/ogg"] = ".ogv",
            ["video/quicktime"] = ".mov",
        };

        public JournalistController(
            IUserRepository users,
            IPostRepository posts,
            IFollowRepository follows,
            IPostMediaRepository media,
            IToxicityService toxicity,
            IFactCheckerService factChecker,
            IImageCopyrightService copyright,
            INotificationRepository notifications, // ← NEW
            IHubContext<NotificationHub> hub)       // ← NEW
        {
            _users = users;
            _posts = posts;
            _follows = follows;
            _media = media;
            _toxicity = toxicity;
            _factChecker = factChecker;
            _copyright = copyright;
            _notifications = notifications; // ← NEW
            _hub = hub;           // ← NEW
        }

        private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        /// <summary>
        /// Saves an uploaded file to media/posts/{mediaId}{ext} and returns
        /// the relative URL path stored in the database.
        /// </summary>
        private async Task<string> SaveMediaFileAsync(IFormFile file, Guid mediaId)
        {
            var ext = MimeToExt.TryGetValue(file.ContentType.ToLower(), out var e) ? e
                      : Path.GetExtension(file.FileName).ToLower();

            var fileName = $"{mediaId}{ext}";
            var absoluteDir = Path.Combine(Directory.GetCurrentDirectory(), "media", "posts");
            Directory.CreateDirectory(absoluteDir);

            var absolutePath = Path.Combine(absoluteDir, fileName);
            var relativePath = $"media/posts/{fileName}";

            await using var stream = new FileStream(absolutePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return relativePath;
        }

        /// <summary>
        /// Checks whether the image bytes violate copyright, but ignores any matches
        /// already owned by <paramref name="requesterId"/> (so journalists can reuse
        /// their own previously registered images without being blocked).
        /// Returns third-party matches enriched with the post that owns each matched image.
        /// </summary>
        private async Task<LocalCopyrightCheckResult> CheckCopyrightExcludingOwnerAsync(
            byte[] imageBytes, string fileName, Guid requesterId)
        {
            var result = await _copyright.CheckAsync(imageBytes, fileName);

            if (!result.IsDuplicate)
                return new LocalCopyrightCheckResult(false, new List<LocalCopyrightMatch>());

            var thirdPartyMatches = new List<LocalCopyrightMatch>();

            foreach (var match in result.Matches)
            {
                if (!Guid.TryParse(match.Source, out var matchedMediaId))
                {
                    // Source is not a GUID — could be a web result or a non-UUID local ID like "855".
                    // Trust the IsWebMatch flag set by ImageCopyrightService.
                    thirdPartyMatches.Add(new LocalCopyrightMatch(match.Similarity, null, IsWebMatch: match.IsWebMatch));
                    continue;
                }

                var matchedMedia = await _media.GetByIdAsync(matchedMediaId);
                if (matchedMedia is null)
                    continue; // orphaned entry — safe to ignore

                var matchedPost = await _posts.GetByIdAsync(matchedMedia.PostId);
                if (matchedPost is null || matchedPost.AuthorId != requesterId)
                {
                    // Different journalist → real violation — attach post data
                    var allUsers  = await _users.GetAllAsync();
                    var author    = allUsers.FirstOrDefault(u => u.Id == matchedPost?.AuthorId);
                    var mediaItems = await _media.GetByPostIdAsync(matchedPost!.Id);
                    var mediaDtos  = mediaItems.Select(m => new MediaDto(
                        m.Id, m.Path, m.MediaType, m.IsCopyrighted, m.UploadedAt)).ToList();

                    string orgName = "Independent";
                    if (matchedPost.OrganizationId.HasValue)
                    {
                        var org = allUsers.FirstOrDefault(u => u.Id == matchedPost.OrganizationId.Value);
                        orgName = org?.Name ?? "Unknown";
                    }

                    var postDto = new JournalistPostResponse(
                        matchedPost.Id,
                        matchedPost.Title,
                        matchedPost.Content,
                        matchedPost.CreatedAt,
                        matchedPost.Interactions?.Count(i => i.Type == InteractionType.Like) ?? 0,
                        matchedPost.Interactions?.Count(i => i.Type == InteractionType.Comment) ?? 0,
                        matchedPost.Interactions?.Count(i => i.Type == InteractionType.Report) ?? 0,
                        orgName,
                        matchedPost.ModerationStatus.ToString(),
                        mediaDtos
                    );

                    thirdPartyMatches.Add(new LocalCopyrightMatch(match.Similarity, postDto));
                }
                // else: same journalist owns it → skip
            }

            return new LocalCopyrightCheckResult(thirdPartyMatches.Count > 0, thirdPartyMatches);
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

            if (req.Name != null) journalist.Name = req.Name;
            if (req.Email != null) journalist.Email = req.Email;

            await _users.UpdateAsync(journalist);
            return Ok(new { journalist.Id, journalist.Name, journalist.Email });
        }

        // ── Posts ──────────────────────────────────────────────────────────

        /// <summary>
        /// Creates a new post. Accepts multipart/form-data with:
        ///   - Title               (string)
        ///   - Content             (string)
        ///   - Tags                (comma-separated string, e.g. "politics,economy")
        ///   - images              (one or more IFormFile — optional)
        ///   - IsCopyrightedFlags  (list of bool, parallel to images — optional)
        ///
        /// For each image:
        ///   - Always checked against the local DB (regardless of IsCopyrighted flag).
        ///   - If IsCopyrighted=true: also checked against the web before being stored
        ///     in the copyright vector DB.
        ///   - If IsCopyrighted=false: only the local DB check is performed.
        /// </summary>
        [HttpPost("posts")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult> CreatePost(
            [FromForm] JournalistCreatePostRequest req,
            [FromForm] List<IFormFile>? images)
        {
            var journalist = await _users.GetByIdAsync(GetUserId());
            if (journalist is null) return NotFound("Journalist not found");

            // ── Validate uploaded files ─────────────────────────────────────
            if (images != null && images.Count > 0)
            {
                const long maxImageSize = 5 * 1024 * 1024; // 5 MB
                const long maxVideoSize = 100 * 1024 * 1024; // 100 MB
                foreach (var file in images)
                {
                    var ct = file.ContentType?.ToLower() ?? "";
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
                    Error = "ToxicContent",
                    Message = "Your article contains toxic language. Please revise before publishing."
                });

            // ── Fact-check ──────────────────────────────────────────────────
            var factCheck = await _factChecker.CheckAsync($"{req.Title}\n\n{req.Content}");
            if (factCheck.Verdict == FactCheckVerdict.False)
                return BadRequest(new
                {
                    Error = "FailedFactCheck",
                    Message = "Your article did not pass fact-checking and cannot be published.",
                    Analysis = factCheck.Analysis
                });

            var verificationStatus = factCheck.Verdict == FactCheckVerdict.True
                ? VerificationStatus.Trusted
                : VerificationStatus.Unknown;

            // ── Build post ──────────────────────────────────────────────────
            var tags = (req.Tags ?? "")
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            var moderationStatus = journalist.OrganizationId.HasValue
                ? ModerationStatus.Pending
                : ModerationStatus.Approved;

            var post = new Post
            {
                Id = Guid.NewGuid(),
                Title = req.Title,
                Content = req.Content,
                AuthorId = journalist.Id,
                OrganizationId = journalist.OrganizationId,
                CreatedAt = DateTime.UtcNow,
                Tags = tags,
                VerificationStatus = verificationStatus,
                ModerationStatus = moderationStatus,
                IsDraft = req.IsDraft,        // ← ADD THIS
                TaskId = req.TaskId           // ← ADD THIS
            };

            // ── Process media files ─────────────────────────────────────────
            var mediaEntities = new List<PostMedia>();

            if (images != null && images.Count > 0)
            {
                for (int i = 0; i < images.Count; i++)
                {
                    var file    = images[i];
                    var mediaId = Guid.NewGuid();
                    var ct      = file.ContentType?.ToLower() ?? "";
                    bool isImage = AllowedImageTypes.Contains(ct);

                    // Read bytes once — needed for copyright checks before saving
                    byte[] imageBytes = Array.Empty<byte>();
                    if (isImage)
                    {
                        using var ms = new MemoryStream();
                        await file.CopyToAsync(ms);
                        imageBytes = ms.ToArray();
                    }

                    if (isImage)
                    {
                        // Always check local DB first (check_web=false).
                        // Ownership-aware: journalist's own registered images are excluded.
                        var check = await CheckCopyrightExcludingOwnerAsync(
                            imageBytes, file.FileName, journalist.Id);

                        if (check.IsDuplicate)
                        {
                            bool isWebViolation = check.Matches.Any(m => m.IsWebMatch);
                            return BadRequest(new
                            {
                                Error   = "CopyrightViolation",
                                Message = isWebViolation
                                    ? $"Image '{file.FileName}' was found on the web and cannot be claimed as original content."
                                    : $"Image '{file.FileName}' is already registered by another user on this platform and cannot be reused.",
                                Matches = check.Matches
                            });
                        }
                    }

                    // Determine IsCopyrighted flag for this image
                    var isCopyrighted = isImage
                                        && req.IsCopyrightedFlags != null
                                        && i < req.IsCopyrightedFlags.Count
                                        && req.IsCopyrightedFlags[i];

                    // Save file to disk
                    var relativePath = isImage
                        ? await SaveBytesAsync(imageBytes, file.FileName, mediaId)
                        : await SaveMediaFileAsync(file, mediaId);

                    mediaEntities.Add(new PostMedia
                    {
                        Id = mediaId,
                        PostId = post.Id,
                        Path = relativePath,
                        MediaType = isImage ? "image" : "video",
                        IsCopyrighted = isCopyrighted
                    });

                    // If copyrighted: store in vector DB with web check (check_web=true).
                    // Returns IsDuplicate=true if the web check finds a match — block the post.
                    if (isCopyrighted)
                    {
                        var storeResult = await _copyright.StoreAsync(imageBytes, file.FileName, mediaId.ToString());
                        if (storeResult.IsDuplicate)
                            return BadRequest(new
                            {
                                Error   = "CopyrightViolation",
                                Message = $"Image '{file.FileName}' was found on the web and cannot be claimed as original content.",
                                Matches = storeResult.Matches
                            });
                    }
                }
            }

            // ── Persist ─────────────────────────────────────────────────────
            await _posts.AddAsync(post);

            // -- Notify org: new post pending review
            if (journalist.OrganizationId.HasValue)
            {
                var orgId = journalist.OrganizationId.Value;
                var nOrg = new Notification
                {
                    UserId = orgId,
                    ActorId = journalist.Id,
                    Type = "post_pending_review",
                    Title = "New post pending review",
                    Message = $"{journalist.Name} submitted \"{post.Title}\" for review."
                };
                await _notifications.AddAsync(nOrg);
                await _hub.Clients.Group($"user:{orgId}")
                    .SendAsync("ReceiveNotification", new
                    {
                        nOrg.Id,
                        nOrg.Title,
                        nOrg.Message,
                        nOrg.Type,
                        nOrg.IsRead,
                        nOrg.CreatedAt,
                        ActorId = journalist.Id,
                        ActorName = journalist.Name
                    });
            }

            if (mediaEntities.Count > 0)
                await _media.AddRangeAsync(mediaEntities);

            return Ok(new
            {
                PostId = post.Id,
                ModerationStatus = post.ModerationStatus.ToString(),
                VerificationStatus = post.VerificationStatus.ToString(),
                MediaCount = mediaEntities.Count
            });
        }

        [HttpDelete("posts/{postId}")]
        public async Task<ActionResult> DeletePost(Guid postId)
        {
            var userId = GetUserId();
            var post = await _posts.GetByIdAsync(postId);
            if (post == null || post.AuthorId != userId)
                return NotFound("Post not found or not owned by you");

            var mediaItems = await _media.GetByPostIdAsync(post.Id);
            foreach (var media in mediaItems)
            {
                if (media.MediaType == "image" && media.IsCopyrighted)
                    await _copyright.RemoveAsync(media.Id.ToString());

                var absolutePath = Path.GetFullPath(
                    Path.Combine(Directory.GetCurrentDirectory(),
                        media.Path.Replace("/", Path.DirectorySeparatorChar.ToString()).TrimStart(Path.DirectorySeparatorChar)));

                if (System.IO.File.Exists(absolutePath))
                    System.IO.File.Delete(absolutePath);
            }

            await _posts.DeleteAsync(post.Id);
            return NoContent();
        }

        [HttpGet("posts")]
        public async Task<ActionResult<IEnumerable<JournalistPostResponse>>> MyPosts()
        {
            var userId = GetUserId();
            var posts = await _posts.GetByAuthorAsync(userId);
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
        /// Adds one or more images or videos to an existing post via multipart/form-data.
        /// For each image:
        ///   - Always checked against local DB (check_web=false).
        ///   - If IsCopyrighted=true: also stored with web check (check_web=true).
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
            var entities = new List<PostMedia>();

            for (int i = 0; i < images.Count; i++)
            {
                var file    = images[i];
                var mediaId = Guid.NewGuid();
                var ct      = file.ContentType?.ToLower() ?? "";
                bool isImage = AllowedImageTypes.Contains(ct);

                byte[] imageBytes = Array.Empty<byte>();
                if (isImage)
                {
                    using var ms = new MemoryStream();
                    await file.CopyToAsync(ms);
                    imageBytes = ms.ToArray();
                }

                if (isImage)
                {
                    var check = await CheckCopyrightExcludingOwnerAsync(
                        imageBytes, file.FileName, requesterId);

                    if (check.IsDuplicate)
                    {
                        bool isWebViolation = check.Matches.Any(m => m.IsWebMatch);
                        return BadRequest(new
                        {
                            Error   = "CopyrightViolation",
                            Message = isWebViolation
                                ? $"Image '{file.FileName}' was found on the web and cannot be claimed as original content."
                                : $"Image '{file.FileName}' is already registered by another user on this platform and cannot be reused.",
                            Matches = check.Matches
                        });
                    }
                }

                var isCopyrighted = isImage
                                    && req.IsCopyrightedFlags != null
                                    && i < req.IsCopyrightedFlags.Count
                                    && req.IsCopyrightedFlags[i];

                var relativePath = isImage
                    ? await SaveBytesAsync(imageBytes, file.FileName, mediaId)
                    : await SaveMediaFileAsync(file, mediaId);

                entities.Add(new PostMedia
                {
                    Id = mediaId,
                    PostId = postId,
                    Path = relativePath,
                    MediaType = isImage ? "image" : "video",
                    IsCopyrighted = isCopyrighted
                });

                if (isCopyrighted)
                {
                    var storeResult = await _copyright.StoreAsync(imageBytes, file.FileName, mediaId.ToString());
                    if (storeResult.IsDuplicate)
                        return BadRequest(new
                        {
                            Error   = "CopyrightViolation",
                            Message = $"Image '{file.FileName}' was found on the web and cannot be claimed as original content.",
                            Matches = storeResult.Matches
                        });
                }
            }

            await _media.AddRangeAsync(entities);

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

            var absolutePath = Path.GetFullPath(
                Path.Combine(Directory.GetCurrentDirectory(),
                    item.Path.Replace("/", Path.DirectorySeparatorChar.ToString()).TrimStart(Path.DirectorySeparatorChar)));

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
                // Read the saved image from disk to run the copyright checks
                var absolutePath = Path.GetFullPath(
                    Path.Combine(Directory.GetCurrentDirectory(),
                        item.Path.Replace("/", Path.DirectorySeparatorChar.ToString()).TrimStart(Path.DirectorySeparatorChar)));

                var imageBytes = await System.IO.File.ReadAllBytesAsync(absolutePath);
                var fileName   = Path.GetFileName(absolutePath);

                // Ownership-aware local check first
                var check = await CheckCopyrightExcludingOwnerAsync(
                    imageBytes, fileName, GetUserId());

                if (check.IsDuplicate)
                {
                    bool isWebViolation = check.Matches.Any(m => m.IsWebMatch);
                    return BadRequest(new
                    {
                        Error   = "CopyrightViolation",
                        Message = isWebViolation
                            ? "This image was found on the web and cannot be claimed as original content."
                            : "This image is already registered by another user on this platform and cannot be marked as yours.",
                        Matches = check.Matches
                    });
                }

                // Store with web check (check_web=true)
                var storeResult = await _copyright.StoreAsync(imageBytes, fileName, item.Id.ToString());
                if (storeResult.IsDuplicate)
                    return BadRequest(new
                    {
                        Error   = "CopyrightViolation",
                        Message = "This image was found on the web and cannot be claimed as original content.",
                        Matches = storeResult.Matches
                    });
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
                CreatedAt = DateTime.UtcNow
            });

            // ── Notify the journalist being followed ──────────────────────────
            var followerName = User.FindFirstValue(ClaimTypes.Name)
                            ?? User.FindFirstValue("name")
                            ?? User.FindFirstValue("unique_name")
                            ?? "Someone";

            var notification = new Notification
            {
                UserId = targetId,   // journalist receives it
                ActorId = userId,     // the follower is the actor
                Type = "follow",
                Title = "New Follower",
                Message = $"{followerName} started following you."
            };

            await _notifications.AddAsync(notification);

            // Real-time push to the journalist's personal SignalR group
            await _hub.Clients
                .Group($"user:{targetId}")
                .SendAsync("ReceiveNotification", new
                {
                    notification.Id,
                    notification.Title,
                    notification.Message,
                    notification.Type,
                    notification.IsRead,
                    notification.CreatedAt,
                    ActorId = userId,
                    ActorName = followerName
                });
            // ─────────────────────────────────────────────────────────────────

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

        [HttpPost("posts/{postId}/report")]
        public async Task<ActionResult> Report(Guid postId, [FromBody] JournalistReportRequest req)
        {
            var post = await _posts.GetByIdAsync(postId);
            if (post == null) return NotFound("Post not found");

            return Ok(new { Message = "Use the unified endpoint POST /api/posts/{postId}/report" });
        }

        // ── Private helpers ────────────────────────────────────────────────

        /// <summary>Saves pre-read image bytes to disk (used when bytes were read for copyright check).</summary>
        private static async Task<string> SaveBytesAsync(byte[] bytes, string originalFileName, Guid mediaId)
        {
            var ext = Path.GetExtension(originalFileName).ToLower();
            if (string.IsNullOrEmpty(ext)) ext = ".jpg";

            var fileName    = $"{mediaId}{ext}";
            var absoluteDir = Path.Combine(Directory.GetCurrentDirectory(), "media", "posts");
            Directory.CreateDirectory(absoluteDir);

            var absolutePath = Path.Combine(absoluteDir, fileName);
            await System.IO.File.WriteAllBytesAsync(absolutePath, bytes);

            return $"media/posts/{fileName}";
        }
    }

    // ── Local copyright check result types ───────────────────────────────────

    /// <summary>A single copyright match. IsWebMatch=true means it came from a web search, not the local DB.</summary>
    public record LocalCopyrightMatch(double Similarity, JournalistPostResponse? Post, bool IsWebMatch = false);

    /// <summary>Result of the ownership-aware local copyright check.</summary>
    public record LocalCopyrightCheckResult(bool IsDuplicate, List<LocalCopyrightMatch> Matches);

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