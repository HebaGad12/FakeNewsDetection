using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
        private readonly IOrganizationRepository _organizations;
        private readonly IOrganizationFollowRepository _orgFollows;
        private readonly IOrganizationWalletRepository _orgWallets;
        private readonly IWalletRepository _wallets;

        public OrganizationController(
            IUserRepository users,
            IPostRepository posts,
            IInteractionRepository interactions,
            IFollowRepository follows,
            IOrganizationRepository organizations,
            IOrganizationFollowRepository orgFollows,
            IOrganizationWalletRepository orgWallets,
            IWalletRepository wallets)
        {
            _users = users;
            _posts = posts;
            _interactions = interactions;
            _follows = follows;
            _organizations = organizations;
            _orgFollows = orgFollows;
            _orgWallets = orgWallets;
            _wallets = wallets;
        }

        private Guid GetCallerId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private async Task<(User? caller, Organization? org, ActionResult? error)>
            ResolveCallerAndOrg(Guid orgId)
        {
            var caller = await _users.GetByIdAsync(GetCallerId());
            if (caller is null) return (null, null, Unauthorized());

            var org = await _organizations.GetByIdAsync(orgId);
            if (org is null) return (null, null, NotFound("Organization not found."));

            if (caller.OrganizationId != orgId)
                return (null, null, Forbid());   

            return (caller, org, null);
        }


        [HttpGet("me")]
        public async Task<ActionResult<OrgProfileResponse>> MyOrganization()
        {
            var caller = await _users.GetByIdAsync(GetCallerId());
            if (caller is null) return Unauthorized();
            if (caller.OrganizationId is null) return BadRequest("You are not linked to any organization.");

            var org = await _organizations.GetByIdAsync(caller.OrganizationId.Value);
            if (org is null) return NotFound("Organization not found.");

            var followers = await _orgFollows.GetFollowersAsync(org.Id);
            var posts = await _posts.GetAllAsync();
            var wallet = await _orgWallets.GetOrCreateAsync(org.Id);

            return Ok(new OrgProfileResponse(
                org.Id,
                org.Name,
                org.Email,
                org.Profile,
                org.IsActive,
                org.CreatedAt,
                followers.Count(),
                posts.Count(p => p.OrganizationId == org.Id),
                wallet.Balance
            ));
        }

        [HttpPost("{orgId}/journalists")]
        public async Task<ActionResult> AddJournalist(Guid orgId, [FromBody] AddOrgJournalistRequest req)
        {
            var (caller, org, err) = await ResolveCallerAndOrg(orgId);
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
                OrganizationId = orgId,
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

        [HttpGet("{orgId}/journalists")]
        public async Task<ActionResult<IEnumerable<OrgJournalistResponse>>> GetJournalists(Guid orgId)
        {
            var (caller, org, err) = await ResolveCallerAndOrg(orgId);
            if (err is not null) return err;

            var all = await _users.GetAllAsync();
            var journalists = all
                .Where(u => u.OrganizationId == orgId && u.Role == Role.Journalist)
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

        [HttpPatch("{orgId}/journalists/{journalistId}/status")]
        public async Task<ActionResult> SetJournalistStatus(
            Guid orgId, Guid journalistId, [FromBody] OrgSetStatusRequest req)
        {
            var (caller, org, err) = await ResolveCallerAndOrg(orgId);
            if (err is not null) return err;

            var journalist = await _users.GetByIdAsync(journalistId);
            if (journalist is null || journalist.OrganizationId != orgId)
                return NotFound("Journalist not found in this organization.");

            journalist.IsActive = req.IsActive;
            await _users.UpdateAsync(journalist);

            return Ok(new
            {
                Message = $"Journalist '{journalist.Name}' has been {(req.IsActive ? "activated" : "deactivated")}."
            });
        }

        [HttpGet("{orgId}/posts")]
        public async Task<ActionResult<IEnumerable<OrgPostResponse>>> GetPosts(
            Guid orgId, [FromQuery] string? status = null)
        {
            var (caller, org, err) = await ResolveCallerAndOrg(orgId);
            if (err is not null) return err;

            var allPosts = await _posts.GetAllAsync();
            var orgPosts = allPosts.Where(p => p.OrganizationId == orgId);

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

 
        [HttpPatch("{orgId}/posts/{postId}/review")]
        public async Task<ActionResult> ReviewPost(
            Guid orgId, Guid postId, [FromBody] OrgReviewPostRequest req)
        {
            var (caller, org, err) = await ResolveCallerAndOrg(orgId);
            if (err is not null) return err;

            var post = await _posts.GetByIdAsync(postId);
            if (post is null || post.OrganizationId != orgId)
                return NotFound("Post not found in this organization.");

            if (post.ModerationStatus != ModerationStatus.Pending)
                return BadRequest($"Post is already '{post.ModerationStatus}'. Only pending posts can be reviewed.");

            post.ModerationStatus = req.Approve
                ? ModerationStatus.Approved
                : ModerationStatus.Removed;

            post.ModerationNotes = req.Notes;
            post.UpdatedAt = DateTime.UtcNow;

            await _posts.UpdateAsync(post);

            return Ok(new
            {
                Message = $"Post '{post.Title}' has been {(req.Approve ? "approved and is now public" : "rejected")}.",
                ModerationStatus = post.ModerationStatus.ToString()
            });
        }


        [HttpPatch("{orgId}/posts/{postId}/status")]
        public async Task<ActionResult> SetPostStatus(
            Guid orgId, Guid postId, [FromBody] OrgSetStatusRequest req)
        {
            var (caller, org, err) = await ResolveCallerAndOrg(orgId);
            if (err is not null) return err;

            var post = await _posts.GetByIdAsync(postId);
            if (post is null || post.OrganizationId != orgId)
                return NotFound("Post not found in this organization.");

            post.ModerationStatus = req.IsActive ? ModerationStatus.Approved : ModerationStatus.Removed;
            post.UpdatedAt = DateTime.UtcNow;
            await _posts.UpdateAsync(post);

            return Ok(new
            {
                Message = $"Post '{post.Title}' has been {(req.IsActive ? "activated (approved)" : "deactivated (removed)")}."
            });
        }


        [HttpGet("{orgId}/followers")]
        public async Task<ActionResult<IEnumerable<OrgFollowerResponse>>> GetFollowers(Guid orgId)
        {
            var (caller, org, err) = await ResolveCallerAndOrg(orgId);
            if (err is not null) return err;

            var followers = await _orgFollows.GetFollowersAsync(orgId);

            var dto = followers.Select(f => new OrgFollowerResponse(
                f.FollowerId,
                f.Follower?.Name ?? "Unknown",
                f.Follower?.Email ?? "Unknown",
                f.Follower?.Role.ToString() ?? "Unknown",
                f.CreatedAt
            ));

            return Ok(dto);
        }

        [HttpGet("{orgId}/analytics")]
        public async Task<ActionResult<OrgAnalyticsResponse>> GetAnalytics(Guid orgId)
        {
            var (caller, org, err) = await ResolveCallerAndOrg(orgId);
            if (err is not null) return err;

            var allPosts = await _posts.GetAllAsync();
            var orgPosts = allPosts.Where(p => p.OrganizationId == orgId).ToList();

            var followers = await _orgFollows.GetFollowersAsync(orgId);
            var wallet = await _orgWallets.GetOrCreateAsync(orgId);

            var allUsers = await _users.GetAllAsync();
            var journalistCount = allUsers.Count(u => u.OrganizationId == orgId && u.Role == Role.Journalist);
            var activeJournalistCount = allUsers.Count(u => u.OrganizationId == orgId && u.Role == Role.Journalist && u.IsActive);

            int totalLikes = 0, totalComments = 0, totalReports = 0;

            foreach (var p in orgPosts)
            {
                var interactions = await _interactions.GetByPostAsync(p.Id);
                totalLikes += interactions.Count(i => i.Type == InteractionType.Like);
                totalComments += interactions.Count(i => i.Type == InteractionType.Comment);
                totalReports += interactions.Count(i => i.Type == InteractionType.Report);
            }

            return Ok(new OrgAnalyticsResponse(
                orgId,
                org!.Name,
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


        [HttpGet("{orgId}/wallet")]
        public async Task<ActionResult<OrgWalletResponse>> GetWallet(Guid orgId)
        {
            var (caller, org, err) = await ResolveCallerAndOrg(orgId);
            if (err is not null) return err;

            var wallet = await _orgWallets.GetOrCreateAsync(orgId);
            return Ok(new OrgWalletResponse(wallet.Id, orgId, org!.Name, wallet.Balance, wallet.UpdatedAt));
        }

        [HttpGet("{orgId}/wallet/transactions")]
        public async Task<ActionResult<IEnumerable<OrgWalletTransactionResponse>>> GetWalletTransactions(Guid orgId)
        {
            var (caller, org, err) = await ResolveCallerAndOrg(orgId);
            if (err is not null) return err;

            var transactions = await _orgWallets.GetTransactionsByOrgIdAsync(orgId);

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

    [ApiController]
    [Route("api/organizations")]
    [Authorize]
    public class OrganizationPublicController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly IOrganizationRepository _organizations;
        private readonly IOrganizationFollowRepository _orgFollows;
        private readonly IOrganizationWalletRepository _orgWallets;
        private readonly IWalletRepository _wallets;

        public OrganizationPublicController(
            IUserRepository users,
            IOrganizationRepository organizations,
            IOrganizationFollowRepository orgFollows,
            IOrganizationWalletRepository orgWallets,
            IWalletRepository wallets)
        {
            _users = users;
            _organizations = organizations;
            _orgFollows = orgFollows;
            _orgWallets = orgWallets;
            _wallets = wallets;
        }

        private Guid GetCallerId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpPost("{orgId}/follow")]
        public async Task<ActionResult> Follow(Guid orgId)
        {
            var callerId = GetCallerId();
            var org = await _organizations.GetByIdAsync(orgId);
            if (org is null) return NotFound("Organization not found.");

            var existing = await _orgFollows.GetAsync(callerId, orgId);
            if (existing is not null) return Conflict("Already following this organization.");

            await _orgFollows.AddAsync(new OrganizationFollow
            {
                FollowerId = callerId,
                OrganizationId = orgId,
                CreatedAt = DateTime.UtcNow
            });

            return Ok(new { Message = $"Now following {org.Name}." });
        }

        [HttpDelete("{orgId}/follow")]
        public async Task<ActionResult> Unfollow(Guid orgId)
        {
            var callerId = GetCallerId();
            await _orgFollows.RemoveAsync(callerId, orgId);
            return Ok(new { Message = "Unfollowed successfully." });
        }


        [HttpPost("{orgId}/donate")]
        [Authorize(Roles = "Regular,Journalist")]
        public async Task<ActionResult> DonateToOrg(Guid orgId, [FromBody] OrgDonationRequest req)
        {
            if (req.Amount <= 0)
                return BadRequest("Donation amount must be greater than zero.");

            var callerId = GetCallerId();
            var sender = await _users.GetByIdAsync(callerId);
            if (sender is null) return Unauthorized();

            var org = await _organizations.GetByIdAsync(orgId);
            if (org is null) return NotFound("Organization not found.");
            if (!org.IsActive) return BadRequest("Cannot donate to an inactive organization.");

            var senderWallet = await _wallets.GetOrCreateAsync(callerId);
            if (senderWallet.Balance < req.Amount)
                return BadRequest($"Insufficient balance. Your balance: {senderWallet.Balance:F2}");

            var orgWallet = await _orgWallets.GetOrCreateAsync(orgId);

            senderWallet.Balance -= req.Amount;
            await _wallets.UpdateAsync(senderWallet);

            await _wallets.AddTransactionAsync(new WalletTransaction
            {
                Id = Guid.NewGuid(),
                WalletId = senderWallet.Id,
                Amount = -req.Amount,
                Type = WalletTransactionType.DonationSent,
                Description = req.Message ?? $"Donation to organization {org.Name}",
                ActorId = null,
                CreatedAt = DateTime.UtcNow
            });

            orgWallet.Balance += req.Amount;
            await _orgWallets.UpdateAsync(orgWallet);

            await _orgWallets.AddTransactionAsync(new OrganizationWalletTransaction
            {
                Id = Guid.NewGuid(),
                WalletId = orgWallet.Id,
                Amount = req.Amount,
                Type = WalletTransactionType.DonationReceived,
                Description = req.Message ?? $"Donation from {sender.Name}",
                ActorId = callerId,
                CreatedAt = DateTime.UtcNow
            });

            return Ok(new
            {
                Message = $"Donation of {req.Amount:F2} sent to {org.Name} successfully.",
                NewBalance = senderWallet.Balance
            });
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<OrgPublicListResponse>>> ListOrganizations()
        {
            var orgs = await _organizations.GetAllAsync();

            var dto = orgs
                .Where(o => o.IsActive)
                .OrderBy(o => o.Name)
                .Select(o => new OrgPublicListResponse(o.Id, o.Name, o.Profile, o.CreatedAt));

            return Ok(dto);
        }
    }


}