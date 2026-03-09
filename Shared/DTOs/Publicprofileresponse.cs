using System;
using System.Collections.Generic;

namespace Shared.DTOs
{
    /// <summary>
    /// A single post shown inside a public profile — only approved posts, no internal moderation notes.
    /// </summary>
    public record PublicPostDto(
        Guid Id,
        string Title,
        string Content,
        string[] Tags,
        DateTime CreatedAt,
        int Likes,
        int Comments,
        string VerificationStatus,
        double? ConfidenceScore,
        List<MediaDto> Media
    );

    /// <summary>
    /// Public profile for a Journalist — visible to any authenticated user.
    /// </summary>
    public record JournalistPublicProfileResponse(
        Guid Id,
        string Name,
        string Role,           // always "Journalist"
        string? Organization,  // org name, or "Independent"
        int Followers,
        int TotalPosts,
        DateTime MemberSince,
        List<PublicPostDto> Posts
    );

    /// <summary>
    /// Public profile for an Organization — visible to any authenticated user.
    /// </summary>
    public record OrganizationPublicProfileResponse(
        Guid Id,
        string Name,
        string Role,           // always "Organization"
        string? Bio,           // Profile field
        int Followers,
        int TotalPosts,
        int TotalJournalists,
        DateTime MemberSince,
        List<PublicPostDto> Posts
    );

    /// <summary>
    /// Single search result row — works for both Journalist and Organization.
    /// </summary>
    public record ProfileSearchResult(
        Guid Id,
        string Name,
        string Role,           // "Journalist" | "Organization"
        string? Organization,  // journalist's org name, null for orgs
        string? Bio,           // org profile bio, null for journalists
        int Followers,
        int TotalPosts,
        DateTime MemberSince
    );
}