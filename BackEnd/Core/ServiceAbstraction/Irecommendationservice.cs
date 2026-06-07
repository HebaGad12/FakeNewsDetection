// IRecommendationService.cs
// Place in: Core/ServiceAbstraction/
// Follows the exact same pattern as IToxicityService.cs

namespace ServicesAbstraction
{
    // ── Request DTOs (mirror grad.py Pydantic models) ────────────────────────

    public record RecommendPostData(
        string Id,
        string Title,
        string Content,
        string[] Tags,
        string? CommunityId,
        string AuthorId,
        string CreatedAt,       // ISO-8601 UTC string
        bool HasMedia
    );

    public record RecommendInteractionData(
        string PostId,
        string Type             // "Like" | "Share" | "Comment" | "Report"
    );

    public record RecommendUserContext(
        List<string> CommunityIds,
        List<string> FolloweeIds
    );

    public record RecommendRequest(
        List<RecommendPostData> CandidatePosts,
        List<RecommendInteractionData> UserInteractions,
        RecommendUserContext UserContext,
        int TopN = 20
    );

    // ── Response DTO ─────────────────────────────────────────────────────────

    public record RecommendResponse(
        List<string> RankedPostIds,
        int TotalCandidates,
        int TotalInteractions
    );

    // ── Interface ────────────────────────────────────────────────────────────

    /// <summary>
    /// Calls the Python Content-Based Filtering recommendation endpoint at POST /recommend/feed.
    /// Returns an ordered list of post IDs ranked for the given user.
    /// </summary>
   public interface IRecommendationService
    {
        /// <summary>
        /// Returns ranked post IDs for a user's feed.
        /// Falls back to an empty list if the Python service is unreachable.
        /// </summary>
        Task<List<string>> GetRankedFeedAsync(RecommendRequest request);

        /// <summary>
        /// Convenience method: loads everything from DB for a given user and calls Python.
        /// Returns ranked post Guids in order. Falls back to empty list on failure.
        /// </summary>
        Task<List<Guid>> GetRankedFeedForUserAsync(Guid userId, int topN = 20);  // ← ADD THIS
    }
}