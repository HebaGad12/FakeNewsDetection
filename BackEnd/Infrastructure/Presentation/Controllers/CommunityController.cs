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

        public CommunityController(ICommunityRepository communities, IWebHostEnvironment env)
        {
            _communities = communities;
            _env = env;
        }

        private Guid GetCurrentUserId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

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
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Description = dto.Description,
                IsOpen = dto.IsOpen,
                ImageUrl = imageUrl, 
                CreatedAt = DateTime.UtcNow
            };

            var result = await _communities.AddAsync(community, userId);

            if (!result.Success)
                return StatusCode(403, result);

            return Ok(result);
        }

      
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

    
        [HttpPost("{communityId}/join")]
        public async Task<IActionResult> JoinCommunity(Guid communityId)
        {
            var userId = GetCurrentUserId();
            var result = await _communities.JoinAsync(communityId, userId);
            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

       
        [HttpGet("{communityId}/members")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMembers(Guid communityId)
        {
            var members = await _communities.GetMembersAsync(communityId);
            return Ok(members);
        }

  
        [HttpGet("{communityId}/posts")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCommunityPosts(Guid communityId)
        {
            var posts = await _communities.GetPostsAsync(communityId);
            return Ok(posts);
        }

       
        [HttpPost("{communityId}/posts/create")]
        public async Task<IActionResult> CreatePost(
            Guid communityId,
            [FromForm] string content,
            List<IFormFile>? mediaFiles) 
        {
            var userId = GetCurrentUserId();

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

                    var ext = Path.GetExtension(file.FileName).ToLower();
                    var fileName = $"{Guid.NewGuid()}{ext}";
                    var filePath = Path.Combine(uploadsFolder, fileName);

                    using var stream = new FileStream(filePath, FileMode.Create);
                    await file.CopyToAsync(stream);

                    mediaPaths.Add($"/uploads/posts/{fileName}");
                }
            }

            var dto = new CreatePostDto(userId, content, mediaPaths.Any() ? mediaPaths : null);

            var result = await _communities.CreatePostAsync(communityId, dto);
            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }


    }
}