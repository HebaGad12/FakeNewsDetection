using Domain.Contracts;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    /// <summary>
    /// Handles image uploads for posts.
    /// Phase 1: Upload images one-by-one → get back tempId per image.
    /// Phase 2: When creating a post, attach tempIds + copyright + displayOrder.
    /// Phase 3: Reorder or delete individual images after post creation.
    /// </summary>
    [ApiController]
    [Route("api/media")]
    [Authorize(Roles = "Journalist")]
    public class MediaController : ControllerBase
    {
        private readonly IPostMediaRepository _mediaRepo;
        private readonly IPostRepository _posts;
        private readonly IWebHostEnvironment _env;

        // Allowed MIME types for images
        private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
        };

        private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

        public MediaController(
            IPostMediaRepository mediaRepo,
            IPostRepository posts,
            IWebHostEnvironment env)
        {
            _mediaRepo = mediaRepo;
            _posts = posts;
            _env = env;
        }

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private string GetJournalistUsername() =>
            User.FindFirstValue(ClaimTypes.Name) ?? GetUserId().ToString("N");

        // ──────────────────────────────────────────────────────────────────
        // POST api/media/upload
        // Upload a single image to temp storage. Returns a tempId.
        // ──────────────────────────────────────────────────────────────────

        [HttpPost("upload")]
        public async Task<ActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            if (file.Length > MaxFileSizeBytes)
                return BadRequest(new { message = $"File exceeds 10 MB limit." });

            if (!AllowedMimeTypes.Contains(file.ContentType))
                return BadRequest(new { message = $"File type '{file.ContentType}' is not allowed. Use JPEG, PNG, WebP, or GIF." });

            var tempId = Guid.NewGuid().ToString("N");
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (string.IsNullOrEmpty(extension)) extension = ".jpg";

            var tempDir = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", "temp");
            Directory.CreateDirectory(tempDir);

            var storedFileName = $"{tempId}{extension}";
            var tempPath = Path.Combine(tempDir, storedFileName);

            using (var stream = new FileStream(tempPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return Ok(new
            {
                tempId,
                originalFileName = file.FileName,
                sizeBytes = file.Length,
                mimeType = file.ContentType,
                previewUrl = $"/uploads/temp/{storedFileName}"
            });
        }

        // ──────────────────────────────────────────────────────────────────
        // DELETE api/media/{mediaId}
        // Remove a single image from a post the journalist owns.
        // Also deletes the physical file.
        // ──────────────────────────────────────────────────────────────────

        [HttpDelete("{mediaId}")]
        public async Task<ActionResult> DeleteMedia(Guid mediaId)
        {
            var media = await _mediaRepo.GetByIdAsync(mediaId);
            if (media == null) return NotFound(new { message = "Media not found." });

            var post = await _posts.GetByIdAsync(media.PostId);
            if (post == null || post.AuthorId != GetUserId())
                return Forbid();

            // Delete physical file
            var fullPath = Path.Combine(_env.WebRootPath ?? "wwwroot", media.FilePath.TrimStart('/'));
            if (System.IO.File.Exists(fullPath))
                System.IO.File.Delete(fullPath);

            await _mediaRepo.DeleteAsync(mediaId);
            return NoContent();
        }

        // ──────────────────────────────────────────────────────────────────
        // PATCH api/media/posts/{postId}/reorder
        // Update display order of images for a post.
        // ──────────────────────────────────────────────────────────────────

        [HttpPatch("posts/{postId}/reorder")]
        public async Task<ActionResult> Reorder(Guid postId, [FromBody] List<MediaReorderItem> items)
        {
            var post = await _posts.GetByIdAsync(postId);
            if (post == null || post.AuthorId != GetUserId())
                return NotFound(new { message = "Post not found or not owned by you." });

            var mediaList = await _mediaRepo.GetByPostIdAsync(postId);
            var mediaDict = mediaList.ToDictionary(m => m.Id);

            foreach (var item in items)
            {
                if (mediaDict.TryGetValue(item.MediaId, out var media))
                {
                    media.DisplayOrder = item.DisplayOrder;
                    await _mediaRepo.UpdateAsync(media);
                }
            }

            return Ok(new { message = "Display order updated." });
        }

        // ──────────────────────────────────────────────────────────────────
        // GET api/media/posts/{postId}
        // Get all media for a post (ordered by DisplayOrder).
        // ──────────────────────────────────────────────────────────────────

        [HttpGet("posts/{postId}")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<PostMediaDto>>> GetPostMedia(Guid postId)
        {
            var mediaList = await _mediaRepo.GetByPostIdAsync(postId);
            var dto = mediaList.Select(m => new PostMediaDto(
                m.Id,
                $"/uploads/{m.FilePath}",
                m.OriginalFileName,
                m.Copyright,
                m.DisplayOrder,
                m.SizeBytes,
                m.UploadedAt
            ));
            return Ok(dto);
        }
    }

    // ── DTOs ──
    public record PostMediaDto(
        Guid Id,
        string Url,
        string OriginalFileName,
        string? Copyright,
        int DisplayOrder,
        long SizeBytes,
        DateTime UploadedAt
    );

    public record MediaReorderItem(Guid MediaId, int DisplayOrder);

    /// <summary>
    /// Used in JournalistCreatePostRequest to reference uploaded temp images.
    /// </summary>
    public record PostMediaAttachment(
        string TempId,
        string? Copyright,
        int DisplayOrder
    );
}