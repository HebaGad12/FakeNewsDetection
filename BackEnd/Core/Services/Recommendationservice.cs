// RecommendationService.cs
// Place in: Core/Services/
// Follows the exact same pattern as ToxicityService.cs

using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using ServicesAbstraction;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Services
{
    /// <summary>
    /// Calls the Python FastAPI recommendation endpoint at POST /recommend/feed.
    /// Assembles all required data from the database and returns ranked post IDs.
    /// </summary>
    public class RecommendationService : IRecommendationService
    {
        private readonly HttpClient            _http;
        private readonly IPostRepository       _posts;
        private readonly IInteractionRepository _interactions;
        private readonly IFollowRepository     _follows;

        private readonly IMembershipRepository _memberships;


        public RecommendationService(
        HttpClient                   http,
        IPostRepository              posts,
        IInteractionRepository       interactions,
        IFollowRepository            follows,
        IMembershipRepository        memberships)  // ← new param
    {
        _http         = http;
        _posts        = posts;
        _interactions = interactions;
        _follows      = follows;
        _memberships  = memberships;           // ← new line
    }

        /// <summary>
        /// Builds the recommendation request from the DB and calls Python.
        /// </summary>
        public async Task<List<string>> GetRankedFeedAsync(RecommendRequest request)
        {
            try
            {
                var response = await _http.PostAsJsonAsync("/recommend/feed", new PythonRecommendRequest
                {
                    CandidatePosts   = request.CandidatePosts.Select(MapPost).ToList(),
                    UserInteractions = request.UserInteractions.Select(MapInteraction).ToList(),
                    UserContext      = MapContext(request.UserContext),
                    TopN             = request.TopN,
                });

                if (!response.IsSuccessStatusCode)
                    return new List<string>(); // fail gracefully

                var result = await response.Content.ReadFromJsonAsync<PythonRecommendResponse>();
                return result?.RankedPostIds ?? new List<string>();
            }
            catch
            {
                // Python service unreachable — fail open, return empty (caller falls back to default feed)
                return new List<string>();
            }
        }

        /// <summary>
        /// Convenience method: loads everything from DB for a given user and calls Python.
        /// Use this from your PostsController / FeedController.
        /// </summary>
        public async Task<List<Guid>> GetRankedFeedForUserAsync(Guid userId, int topN = 20)
        {
            // 1. Load all approved posts (ModerationStatus.Approved)
            var allPosts = (await _posts.GetAllAsync())
                .Where(p => p.ModerationStatus == ModerationStatus.Approved)
                .ToList();

            // 2. Load user's interaction history
            var userInteractions = (await _interactions.GetByUserAsync(userId)).ToList();

            // 3. Load who the user follows
            var followees = (await _follows.GetFolloweesAsync(userId))
                .Select(f => f.FolloweeId.ToString())
                .ToList();

            // 4. Load communities the user is a member of (and not banned from)
            var communityIds = await _memberships.GetActiveCommunityIdsAsync(userId);


            // 5. Map to DTOs
            var candidatePosts = allPosts.Select(p => new RecommendPostData(
                Id:          p.Id.ToString(),
                Title:       p.Title,
                Content:     p.Content,
                Tags:        p.Tags,
                CommunityId: p.CommunityId?.ToString(),
                AuthorId:    p.AuthorId.ToString(),
                CreatedAt:   p.CreatedAt.ToString("O"),   // ISO-8601
                HasMedia:    p.Media.Any()
            )).ToList();

            var interactions = userInteractions.Select(i => new RecommendInteractionData(
                PostId: i.PostId.ToString(),
                Type:   i.Type.ToString()               // enum.ToString() = "Like", "Share", etc.
            )).ToList();

            var context = new RecommendUserContext(
                CommunityIds: communityIds,
                FolloweeIds:  followees
            );

            var request = new RecommendRequest(
                CandidatePosts:   candidatePosts,
                UserInteractions: interactions,
                UserContext:      context,
                TopN:             topN
            );

            var rankedStringIds = await GetRankedFeedAsync(request);

            // Parse back to Guids in ranked order
            return rankedStringIds
                .Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty)
                .Where(g => g != Guid.Empty)
                .ToList();
        }

        // ── Mapping helpers ──────────────────────────────────────────────────

        private static PythonPostData MapPost(RecommendPostData p) => new()
        {
            Id          = p.Id,
            Title       = p.Title,
            Content     = p.Content,
            Tags        = p.Tags,
            CommunityId = p.CommunityId,
            AuthorId    = p.AuthorId,
            CreatedAt   = p.CreatedAt,
            HasMedia    = p.HasMedia,
        };

        private static PythonInteractionData MapInteraction(RecommendInteractionData i) => new()
        {
            PostId = i.PostId,
            Type   = i.Type,
        };

        private static PythonUserContext MapContext(RecommendUserContext c) => new()
        {
            CommunityIds = c.CommunityIds,
            FolloweeIds  = c.FolloweeIds,
        };

        // ── Private JSON shapes (match grad.py Pydantic models exactly) ──────

        private class PythonPostData
        {
            [JsonPropertyName("id")]           public string   Id          { get; set; } = "";
            [JsonPropertyName("title")]        public string   Title       { get; set; } = "";
            [JsonPropertyName("content")]      public string   Content     { get; set; } = "";
            [JsonPropertyName("tags")]         public string[] Tags        { get; set; } = [];
            [JsonPropertyName("community_id")] public string?  CommunityId { get; set; }
            [JsonPropertyName("author_id")]    public string   AuthorId    { get; set; } = "";
            [JsonPropertyName("created_at")]   public string   CreatedAt   { get; set; } = "";
            [JsonPropertyName("has_media")]    public bool     HasMedia    { get; set; }
        }

        private class PythonInteractionData
        {
            [JsonPropertyName("post_id")] public string PostId { get; set; } = "";
            [JsonPropertyName("type")]    public string Type   { get; set; } = "";
        }

        private class PythonUserContext
        {
            [JsonPropertyName("community_ids")] public List<string> CommunityIds { get; set; } = [];
            [JsonPropertyName("followee_ids")]  public List<string> FolloweeIds  { get; set; } = [];
        }

        private class PythonRecommendRequest
        {
            [JsonPropertyName("candidate_posts")]   public List<PythonPostData>        CandidatePosts   { get; set; } = [];
            [JsonPropertyName("user_interactions")] public List<PythonInteractionData> UserInteractions { get; set; } = [];
            [JsonPropertyName("user_context")]      public PythonUserContext           UserContext      { get; set; } = new();
            [JsonPropertyName("top_n")]             public int                         TopN             { get; set; } = 20;
        }

        private class PythonRecommendResponse
        {
            [JsonPropertyName("ranked_post_ids")]   public List<string> RankedPostIds     { get; set; } = [];
            [JsonPropertyName("total_candidates")]  public int          TotalCandidates   { get; set; }
            [JsonPropertyName("total_interactions")]public int          TotalInteractions { get; set; }
        }
    }
}