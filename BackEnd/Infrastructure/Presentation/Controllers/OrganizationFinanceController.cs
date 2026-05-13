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
    [Route("api/organizations/{orgUserId:guid}/finance")]
    [Authorize(Roles = "Organization")]
    public class OrganizationFinanceController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly IWalletRepository _wallets;

        public OrganizationFinanceController(IUserRepository users, IWalletRepository wallets)
        {
            _users = users;
            _wallets = wallets;
        }

        private Guid GetCallerId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private async Task<(User? orgUser, ActionResult? error)> ResolveOrgUser(Guid orgUserId)
        {
            var caller = await _users.GetByIdAsync(GetCallerId());
            if (caller is null) return (null, Unauthorized());

            if (caller.Id != orgUserId) return (null, Forbid());
            if (caller.Role != Role.Organization) return (null, Forbid());

            return (caller, null);
        }

        private async Task<User?> ResolveJournalistAsync(Guid orgUserId, Guid userId)
        {
            var user = await _users.GetByIdAsync(userId);
            if (user is null) return null;
            if (user.OrganizationId != orgUserId) return null;
            if (user.Role != Role.Journalist) return null;
            return user;
        }

        [HttpGet("wallets")]
        public async Task<ActionResult<IEnumerable<OrgFinanceWalletResponse>>> GetTeamWallets(Guid orgUserId)
        {
            var (_, error) = await ResolveOrgUser(orgUserId);
            if (error is not null) return error;

            var allUsers = await _users.GetAllAsync();
            var journalists = allUsers
                .Where(u => u.OrganizationId == orgUserId && u.Role == Role.Journalist)
                .OrderBy(u => u.Name)
                .ToList();

            var result = new List<OrgFinanceWalletResponse>();

            foreach (var journalist in journalists)
            {
                var wallet = await _wallets.GetOrCreateAsync(journalist.Id);
                var transactionCount = (await _wallets.GetTransactionsByUserIdAsync(journalist.Id)).Count();
                result.Add(new OrgFinanceWalletResponse(
                    wallet.Id,
                    journalist.Id,
                    journalist.Name,
                    journalist.Email,
                    journalist.JournalistExternalId ?? string.Empty,
                    journalist.Role.ToString(),
                    journalist.IsActive,
                    wallet.Balance,
                    wallet.UpdatedAt,
                    transactionCount
                ));
            }

            return Ok(result.OrderByDescending(item => item.Balance));
        }

        [HttpGet("wallets/{userId:guid}/transactions")]
        public async Task<ActionResult<IEnumerable<OrgWalletTransactionResponse>>> GetTransactions(Guid orgUserId, Guid userId)
        {
            var (_, error) = await ResolveOrgUser(orgUserId);
            if (error is not null) return error;

            var journalist = await ResolveJournalistAsync(orgUserId, userId);
            if (journalist is null) return NotFound("Journalist not found in this organization.");

            var transactions = await _wallets.GetTransactionsByUserIdAsync(userId);
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

        [HttpPost("adjust")]
        public async Task<ActionResult> AdjustBalance(Guid orgUserId, [FromBody] OrgFinanceAdjustRequest request)
        {
            if (request.Amount == 0)
                return BadRequest("Amount cannot be zero.");

            var (_, error) = await ResolveOrgUser(orgUserId);
            if (error is not null) return error;

            var journalist = await ResolveJournalistAsync(orgUserId, request.UserId);
            if (journalist is null) return NotFound("Journalist not found in this organization.");

            var wallet = await _wallets.GetOrCreateAsync(request.UserId);
            var isTopUp = request.Amount > 0;

            if (isTopUp)
            {
                wallet.Balance += request.Amount;
                await _wallets.UpdateAsync(wallet);

                await _wallets.AddTransactionAsync(new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    WalletId = wallet.Id,
                    Amount = request.Amount,
                    Type = WalletTransactionType.OrganizationTopUp,
                    Description = request.Description ?? "Organization top-up",
                    ActorId = orgUserId,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                var deduction = Math.Abs(request.Amount);

                if (wallet.Balance < deduction)
                    return BadRequest($"User's balance ({wallet.Balance:F2}) is less than the deduction amount ({deduction:F2}).");

                wallet.Balance -= deduction;
                await _wallets.UpdateAsync(wallet);

                await _wallets.AddTransactionAsync(new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    WalletId = wallet.Id,
                    Amount = -deduction,
                    Type = WalletTransactionType.OrganizationDeduction,
                    Description = request.Description ?? "Organization deduction",
                    ActorId = orgUserId,
                    CreatedAt = DateTime.UtcNow
                });
            }

            var updatedWallet = await _wallets.GetByUserIdAsync(request.UserId);
            return Ok(new
            {
                Message = isTopUp ? "Balance topped up successfully" : "Balance deducted successfully",
                UserId = request.UserId,
                UserName = journalist.Name,
                NewBalance = updatedWallet!.Balance
            });
        }
    }
}