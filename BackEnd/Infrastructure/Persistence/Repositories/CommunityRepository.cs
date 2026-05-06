using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Shared.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Persistence.Repositories
{

    public class CommunityRepository : ICommunityRepository
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public CommunityRepository(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

    
        public static async Task<string?> SaveImageAsync(IFormFile? image, IWebHostEnvironment env)
        {
            if (image == null || image.Length == 0) return null;

            var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowedTypes.Contains(image.ContentType))
                throw new InvalidOperationException("Only jpg, png, webp images are allowed.");

            if (image.Length > 5 * 1024 * 1024) 
                throw new InvalidOperationException("Image must be less than 5MB.");

            var uploadsFolder = Path.Combine(env.WebRootPath, "uploads", "communities");
            Directory.CreateDirectory(uploadsFolder);

            var ext = Path.GetExtension(image.FileName).ToLower();
            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await image.CopyToAsync(stream);

            return $"/uploads/communities/{fileName}";
        }

        public async Task<ApiResponse<CommunityDto>> AddAsync(Community community, Guid createdByUserId)
        {
            var creator = await _context.Users.FindAsync(createdByUserId);
            if (creator == null)
                return new ApiResponse<CommunityDto> { Success = false, Message = "User not found." };

            if (creator.Role != Role.Journalist && creator.Role != Role.Organization)
                return new ApiResponse<CommunityDto> { Success = false, Message = "Only journalists or organizations can create communities." };

            community.CreatedBy = createdByUserId;

            _context.Communities.Add(community);

            _context.Memberships.Add(new Membership
            {
                UserId = createdByUserId,
                CommunityId = community.Id,
                Role = "Admin",
                JoinedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return new ApiResponse<CommunityDto>
            {
                Success = true,
                Message = "Community created successfully.",
                Data = new CommunityDto(
                    community.Id,
                    community.Name,
                    community.Description,
                    community.IsOpen,
                    community.ImageUrl,
                    creator.Id,
                    creator.Name,
                    creator.Role.ToString()
                )
            };
        }

        public async Task<Community?> GetByIdAsync(Guid id) =>
            await _context.Communities
                .Include(c => c.Creator)
                .Include(c => c.Members)
                    .ThenInclude(m => m.User)
                .Include(c => c.Posts)
                    .ThenInclude(p => p.Author)
                        .ThenInclude(a => a.Organization)
                .Include(c => c.Posts)
                    .ThenInclude(p => p.Media)
                .FirstOrDefaultAsync(c => c.Id == id);

    
        public async Task<ApiResponse<string>> JoinAsync(Guid communityId, Guid userId)
        {
            var community = await _context.Communities.FindAsync(communityId);
            if (community == null)
                return new ApiResponse<string> { Success = false, Message = "Community not found." };

            if (!community.IsOpen)
                return new ApiResponse<string> { Success = false, Message = "Community is closed." };

            var exists = await _context.Memberships
                .AnyAsync(m => m.UserId == userId && m.CommunityId == communityId);
            if (exists)
                return new ApiResponse<string> { Success = false, Message = "Already a member." };

            _context.Memberships.Add(new Membership
            {
                UserId = userId,
                CommunityId = communityId,
                Role = "Member",
                JoinedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return new ApiResponse<string> { Success = true, Message = "Joined successfully." };
        }

    
        public async Task<IEnumerable<MemberDto>> GetMembersAsync(Guid communityId)
        {
            var members = await _context.Memberships
                .Where(m => m.CommunityId == communityId)
                .Include(m => m.User)
                .ToListAsync();

            return members.Select(m => new MemberDto(
                m.UserId,
                m.User.Name,
                m.Role,
                m.JoinedAt
            ));
        }

        public async Task<IEnumerable<PostDto>> GetPostsAsync(Guid communityId)
        {
            var posts = await _context.Posts
                .Where(p => p.CommunityId == communityId)
                .Include(p => p.Author)
                    .ThenInclude(a => a.Organization)
                .Include(p => p.Media)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return posts.Select(p => new PostDto(
                p.Id,
                p.Content,
                p.AuthorId,
                p.Author.Name,
                p.Author.Role.ToString(),
                p.Author.OrganizationId,
                p.Author.Organization?.Name,
                p.CreatedAt,
                p.Media.Select(m => m.Path).ToList()
            ));
        }

      
        public async Task<bool> IsMemberAsync(Guid communityId, Guid userId) =>
            await _context.Memberships
                .AnyAsync(m => m.CommunityId == communityId && m.UserId == userId);

    
        public async Task<ApiResponse<PostDto>> CreatePostAsync(Guid communityId, CreatePostDto dto)
        {
            var isMember = await IsMemberAsync(communityId, dto.UserId);
            if (!isMember)
                return new ApiResponse<PostDto> { Success = false, Message = "You must be a member to post." };

            var author = await _context.Users
                .Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.Id == dto.UserId);

            if (author == null)
                return new ApiResponse<PostDto> { Success = false, Message = "User not found." };

            var post = new Post
            {
                Id = Guid.NewGuid(),
                AuthorId = dto.UserId,
                CommunityId = communityId,
                Content = dto.Content,
                CreatedAt = DateTime.UtcNow,
                OrganizationId = author.OrganizationId
            };

            _context.Posts.Add(post);

            if (dto.MediaPaths != null && dto.MediaPaths.Any())
            {
                foreach (var path in dto.MediaPaths)
                {
                    _context.PostMediaItems.Add(new PostMedia
                    {
                        Id = Guid.NewGuid(),
                        PostId = post.Id,
                        Path = path,
                        MediaType = "image",
                        UploadedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();

            return new ApiResponse<PostDto>
            {
                Success = true,
                Message = "Post created successfully.",
                Data = new PostDto(
                    post.Id,
                    post.Content,
                    author.Id,
                    author.Name,
                    author.Role.ToString(),
                    author.OrganizationId,
                    author.Organization?.Name,
                    post.CreatedAt,
                    dto.MediaPaths
                )
            };
        }

    }
}
