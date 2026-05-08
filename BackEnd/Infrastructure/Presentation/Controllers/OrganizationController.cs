using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.VisualBasic;
using Presentation.SignalR_Hubs;
using Shared.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    [ApiController]
    [Route("api/organizations")]
    [Authorize(Roles = "Organization")]
    public class OrganizationController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly IPostRepository _posts;
        private readonly IInteractionRepository _interactions;
        private readonly IFollowRepository _follows;
        private readonly IWalletRepository _wallets;
        private readonly INotificationRepository _notifications;
        private readonly IHubContext<NotificationHub> _hub;

        public OrganizationController(
            IUserRepository users,
            IPostRepository posts,
            IInteractionRepository interactions,
            IFollowRepository follows,
            IWalletRepository wallets,
            INotificationRepository notifications,
            IHubContext<NotificationHub> hub)
        {
            _users = users;
            _posts = posts;
            _interactions = interactions;
            _follows = follows;
            _wallets = wallets;
            _notifications = notifications;
            _hub = hub;
        }

        private Guid GetCallerId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private async Task<(User? orgUser, ActionResult? error)>
            ResolveOrgUser(Guid orgUserId)
        {
            var caller = await _users.GetByIdAsync(GetCallerId());
            if (caller is null) return (null, Unauthorized());

            if (caller.Id != orgUserId)
                return (null, Forbid());

            if (caller.Role != Role.Organization)
                return (null, Forbid());

            return (caller, null);
        }

        [HttpGet("me")]
        public async Task<ActionResult<OrgProfileResponse>> MyOrganization()
        {
            var callerId = GetCallerId();
            var caller = await _users.GetByIdAsync(callerId);
            if (caller is null) return Unauthorized();

            var followers = await _follows.GetFollowersAsync(callerId);
            var posts = await _posts.GetAllAsync();
            var wallet = await _wallets.GetOrCreateAsync(callerId);

            return Ok(new OrgProfileResponse(
                caller.Id,
                caller.Name,
                caller.Email,
                caller.Profile,
                caller.IsActive,
                caller.CreatedAt,
                followers.Count(),
                posts.Count(p => p.OrganizationId == callerId),
                wallet.Balance
            ));
        }

        [HttpPost("{orgUserId}/journalists")]
        public async Task<ActionResult> AddJournalist(Guid orgUserId, [FromBody] AddOrgJournalistRequest req)
        {
            var (orgUser, err) = await ResolveOrgUser(orgUserId);
            if (err is not null) return err;

            if (string.IsNullOrWhiteSpace(req.LicenceNumber))
                return BadRequest("Licence number is required.");

            var all = await _users.GetAllAsync();
            if (all.Any(u => u.Email == req.Email))
                return Conflict("Email already registered.");

            var journalist = new User
            {
                Id = Guid.NewGuid(),
                Name = req.Name,
                Email = req.Email,
                PasswordHash = Services.Utilities.PasswordHasher.Hash(req.Password),
                Role = Role.Journalist,
                OrganizationId = orgUserId,
                JournalistExternalId = req.LicenceNumber,
                IsActive = true,
                RegistrationStatus = RegistrationStatus.Approved,
                CreatedAt = DateTime.UtcNow
            };

            await _users.AddAsync(journalist);

            return Ok(new
            {
                Message = $"Journalist '{journalist.Name}' added to organization and is immediately active.",
                JournalistId = journalist.Id,
                RegistrationStatus = journalist.RegistrationStatus.ToString()
            });
        }

        [HttpGet("{orgUserId}/journalists")]
        public async Task<ActionResult<IEnumerable<OrgJournalistResponse>>> GetJournalists(Guid orgUserId)
        {
            var (orgUser, err) = await ResolveOrgUser(orgUserId);
            if (err is not null) return err;

            var all = await _users.GetAllAsync();
            var journalists = all
                .Where(u => u.OrganizationId == orgUserId && u.Role == Role.Journalist)
                .OrderBy(u => u.Name)
                .Select(u => new OrgJournalistResponse(
                    u.Id,
                    u.Name,
                    u.Email,
                    u.JournalistExternalId ?? "",
                    u.IsActive,
                    u.RegistrationStatus.ToString(),
                    u.CreatedAt
                ));

            return Ok(journalists);
        }

        [HttpPatch("{orgUserId}/journalists/{journalistId}/status")]
        public async Task<ActionResult> SetJournalistStatus(
            Guid orgUserId, Guid journalistId, [FromBody] OrgSetStatusRequest req)
        {
            var (orgUser, err) = await ResolveOrgUser(orgUserId);
            if (err is not null) return err;

            var journalist = await _users.GetByIdAsync(journalistId);
            if (journalist is null || journalist.OrganizationId != orgUserId)
                return NotFound("Journalist not found in this organization.");

            journalist.IsActive = req.IsActive;
            await _users.UpdateAsync(journalist);

            return Ok(new
            {
                Message = $"Journalist '{journalist.Name}' has been {(req.IsActive ? "activated" : "deactivated")}."
            });
        }

        [HttpGet("{orgUserId}/posts")]
        public async Task<ActionResult<IEnumerable<OrgPostResponse>>> GetPosts(
            Guid orgUserId, [FromQuery] string? status = null)
        {
            var (orgUser, err) = await ResolveOrgUser(orgUserId);
            if (err is not null) return err;

            var allPosts = await _posts.GetAllAsync();
            var orgPosts = allPosts.Where(p => p.OrganizationId == orgUserId);

            if (!string.IsNullOrWhiteSpace(status) &&
                Enum.TryParse<ModerationStatus>(status, true, out var statusEnum))
            {
                orgPosts = orgPosts.Where(p => p.ModerationStatus == statusEnum);
            }

            orgPosts = orgPosts.OrderByDescending(p => p.CreatedAt);

            var response = new List<OrgPostResponse>();
            var allUsers = await _users.GetAllAsync();

            foreach (var p in orgPosts)
            {
                var author = allUsers.FirstOrDefault(u => u.Id == p.AuthorId);
                var interactions = await _interactions.GetByPostAsync(p.Id);

                response.Add(new OrgPostResponse(
                    p.Id,
                    p.Title,
                    p.Content,
                    p.Tags,
                    author?.Name ?? "Unknown",
                    author?.Id ?? Guid.Empty,
                    p.ModerationStatus.ToString(),
                    p.VerificationStatus.ToString(),
                    p.ModerationNotes,
                    p.CreatedAt,
                    p.UpdatedAt,
                    interactions.Count(i => i.Type == InteractionType.Like),
                    interactions.Count(i => i.Type == InteractionType.Comment)
                ));
            }

            return Ok(response);
        }

        [HttpPatch("{orgUserId}/posts/{postId}/review")]
        public async Task<ActionResult> ReviewPost(
            Guid orgUserId, Guid postId, [FromBody] OrgReviewPostRequest req)
        {
            var (orgUser, err) = await ResolveOrgUser(orgUserId);
            if (err is not null) return err;

            var post = await _posts.GetByIdAsync(postId);
            if (post is null || post.OrganizationId != orgUserId)
                return NotFound("Post not found in this organization.");

            if (post.ModerationStatus != ModerationStatus.Pending)
                return BadRequest($"Post is already '{post.ModerationStatus}'. Only pending posts can be reviewed.");

            post.ModerationStatus = req.Approve
                ? ModerationStatus.Approved
                : ModerationStatus.Removed;

            post.ModerationNotes = req.Notes;
            post.UpdatedAt = DateTime.UtcNow;

            await _posts.UpdateAsync(post);

            // ── Notify journalist: post reviewed ─────────────────────────
            var reviewOutcome = req.Approve ? "approved" : "rejected";
            var nReview = new Domain.Models.Notification
            {
                UserId = post.AuthorId,
                ActorId = orgUserId,
                Type = req.Approve ? "post_approved" : "post_rejected",
                Title = req.Approve ? "Post approved" : "Post rejected",
                Message = req.Approve
                    ? $"Your post '{ post.Title }' has been approved and is now public."
                    : $"Your post '{ post.Title}' was rejected. Notes: {req.Notes ?? "No notes provided."}"
            };
        await _notifications.AddAsync(nReview);
        await _hub.Clients.Group($"user:{post.AuthorId}")
                .SendAsync("ReceiveNotification", new
                {
                    nReview.Id, nReview.Title, nReview.Message,
                    nReview.Type, nReview.IsRead, nReview.CreatedAt,
                    ActorId = orgUserId
    });
            // ─────────────────────────────────────────────────────────────

            return Ok(new
            {
                Message = $"Post '{post.Title}' has been {(req.Approve ? "approved and is now public" : "rejected")}.",
                ModerationStatus = post.ModerationStatus.ToString()
});
        }

        [HttpPatch("{orgUserId}/posts/{postId}/status")]
public async Task<ActionResult> SetPostStatus(
            Guid orgUserId, Guid postId, [FromBody] OrgSetStatusRequest req)
{
    var (orgUser, err) = await ResolveOrgUser(orgUserId);
    if (err is not null) return err;

    var post = await _posts.GetByIdAsync(postId);
    if (post is null || post.OrganizationId != orgUserId)
        return NotFound("Post not found in this organization.");

    post.ModerationStatus = req.IsActive ? ModerationStatus.Approved : ModerationStatus.Removed;
    post.UpdatedAt = DateTime.UtcNow;
    await _posts.UpdateAsync(post);

    return Ok(new
    {
        Message = $"Post '{post.Title}' has been {(req.IsActive ? "activated (approved)" : "deactivated (removed)")}."
    });
}

[HttpGet("{orgUserId}/followers")]
public async Task<ActionResult<IEnumerable<OrgFollowerResponse>>> GetFollowers(Guid orgUserId)
{
    var (orgUser, err) = await ResolveOrgUser(orgUserId);
    if (err is not null) return err;

    var followers = await _follows.GetFollowersAsync(orgUserId);
    var allUsers = await _users.GetAllAsync();
    var userDict = allUsers.ToDictionary(u => u.Id);

    var dto = followers.Select(f =>
    {
        userDict.TryGetValue(f.FollowerId, out var follower);
        return new OrgFollowerResponse(
            f.FollowerId,
            follower?.Name ?? "Unknown",
            follower?.Email ?? "Unknown",
            follower?.Role.ToString() ?? "Unknown",
            f.CreatedAt
        );
    });

    return Ok(dto);
}

[HttpGet("{orgUserId}/analytics")]
public async Task<ActionResult<OrgAnalyticsResponse>> GetAnalytics(Guid orgUserId)
{
    var (orgUser, err) = await ResolveOrgUser(orgUserId);
    if (err is not null) return err;

    var allPosts = await _posts.GetAllAsync();
    var orgPosts = allPosts.Where(p => p.OrganizationId == orgUserId).ToList();

    var followers = await _follows.GetFollowersAsync(orgUserId);
    var wallet = await _wallets.GetOrCreateAsync(orgUserId);

    var allUsers = await _users.GetAllAsync();
    var journalistCount = allUsers.Count(u => u.OrganizationId == orgUserId && u.Role == Role.Journalist);
    var activeJournalistCount = allUsers.Count(u => u.OrganizationId == orgUserId && u.Role == Role.Journalist && u.IsActive);

    int totalLikes = 0, totalComments = 0, totalReports = 0;

    foreach (var p in orgPosts)
    {
        var interactions = await _interactions.GetByPostAsync(p.Id);
        totalLikes += interactions.Count(i => i.Type == InteractionType.Like);
        totalComments += interactions.Count(i => i.Type == InteractionType.Comment);
        totalReports += interactions.Count(i => i.Type == InteractionType.Report);
    }

    return Ok(new OrgAnalyticsResponse(
        orgUserId,
        orgUser!.Name,
        TotalPosts: orgPosts.Count,
        PendingPosts: orgPosts.Count(p => p.ModerationStatus == ModerationStatus.Pending),
        ApprovedPosts: orgPosts.Count(p => p.ModerationStatus == ModerationStatus.Approved),
        RejectedPosts: orgPosts.Count(p => p.ModerationStatus == ModerationStatus.Removed),
        TotalFollowers: followers.Count(),
        JournalistCount: journalistCount,
        ActiveJournalistCount: activeJournalistCount,
        TotalLikesReceived: totalLikes,
        TotalCommentsReceived: totalComments,
        TotalReportsReceived: totalReports,
        WalletBalance: wallet.Balance
    ));
}

[HttpGet("{orgUserId}/wallet")]
public async Task<ActionResult<OrgWalletResponse>> GetWallet(Guid orgUserId)
{
    var (orgUser, err) = await ResolveOrgUser(orgUserId);
    if (err is not null) return err;

    var wallet = await _wallets.GetOrCreateAsync(orgUserId);
    return Ok(new OrgWalletResponse(wallet.Id, orgUserId, orgUser!.Name, wallet.Balance, wallet.UpdatedAt));
}

[HttpGet("{orgUserId}/wallet/transactions")]
public async Task<ActionResult<IEnumerable<OrgWalletTransactionResponse>>> GetWalletTransactions(Guid orgUserId)
{
    var (orgUser, err) = await ResolveOrgUser(orgUserId);
    if (err is not null) return err;

    var transactions = await _wallets.GetTransactionsByUserIdAsync(orgUserId);

    var dto = transactions.Select(t => new OrgWalletTransactionResponse(
        t.Id,
        t.Amount,
        t.Type.ToString(),
        t.Description,
        t.Actor?.Name,
        t.CreatedAt
    ));

    return Ok(dto);
}
    }

}