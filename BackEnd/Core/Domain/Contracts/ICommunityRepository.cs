using Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace Domain.Contracts
{
    public interface ICommunityRepository
    {
        Task<ApiResponse<CommunityDto>> AddAsync(Community community, Guid createdByUserId);
        Task<Community?> GetByIdAsync(Guid id);
        Task<ApiResponse<string>> JoinAsync(Guid communityId, Guid userId);
        Task<IEnumerable<MemberDto>> GetMembersAsync(Guid communityId);
        Task<IEnumerable<PostDto>> GetPostsAsync(Guid communityId);
        Task<ApiResponse<PostDto>> CreatePostAsync(Guid communityId, CreatePostDto dto);
        Task<bool> IsMemberAsync(Guid communityId, Guid userId);
        Task<ApiResponse<string>> BanUserAsync(Guid communityId, Guid requesterId, Guid targetUserId);
        Task<ApiResponse<string>> UnbanUserAsync(Guid communityId, Guid requesterId, Guid targetUserId);
        Task<ApiResponse<MemberStatusDto>> GetUserStatusAsync(Guid communityId, Guid targetUserId);
        Task<ApiResponse<string>> DeletePostAsync(Guid communityId, Guid requesterId, Guid postId);
        Task<ApiResponse<string>> LeaveAsync(Guid communityId, Guid userId);
        Task<IEnumerable<CommunityDto>> GetAllAsync();
        Task<IEnumerable<CommunityDto>> GetByCreatorAsync(Guid creatorId);
        Task<IEnumerable<CommunityDto>> SearchByNameAsync(string query);
    }

 public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public T? Data { get; set; }
    }

    public record CreateCommunityDto(
        string Name,
        string Description,
        bool IsOpen
    );

    public record CommunityDto(
        Guid Id,
        string Name,
        string Description,
        bool IsOpen,
        string? ImageUrl,
        Guid CreatedBy,
        string CreatorName,
        string CreatorRole
    );

    public record MemberDto(
        Guid Id,
        string Name,
        string Role,
        DateTime JoinedAt,
        bool IsBanned
    );

    public record CreatePostDto(
        Guid UserId,
        string Content,
        List<string>? MediaPaths
    );

    public record MemberStatusDto(
        string Status
    );

    public record CommentDto(
        Guid Id,
        Guid AuthorId,
        string AuthorName,
        string AuthorRole,
        string Content,
        DateTime CreatedAt
    );

    public record PostDto(
        Guid Id,
        string Content,
        Guid AuthorId,
        string AuthorName,
        string AuthorRole,
        Guid? AuthorOrgId,
        string? AuthorOrgName,
        DateTime CreatedAt,
        List<string>? MediaPaths,
        int TotalLikes,
        List<CommentDto> Comments
    );
}