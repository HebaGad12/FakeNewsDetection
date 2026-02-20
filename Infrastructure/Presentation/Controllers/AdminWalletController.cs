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
    [Route("api/admin/wallets")]
    [Authorize(Policy = "AdminOnly")]
    public class AdminWalletController : ControllerBase
    {
        private readonly IWalletRepository _wallets;
        private readonly IUserRepository _users;

        public AdminWalletController(IWalletRepository wallets, IUserRepository users)
        {
            _wallets = wallets;
            _users = users;
        }

        /// <summary>GET all wallets (admin overview)</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<WalletResponse>>> GetAllWallets()
        {
            var users = await _users.GetAllAsync();
            var result = new List<WalletResponse>();

            foreach (var user in users)
            {
                var wallet = await _wallets.GetOrCreateAsync(user.Id);
                result.Add(new WalletResponse(wallet.Id, user.Id, user.Name, wallet.Balance, wallet.UpdatedAt));
            }

            return Ok(result.OrderByDescending(w => w.Balance));
        }

        /// <summary>GET wallet of a specific user</summary>
        [HttpGet("{userId}")]
        public async Task<ActionResult<WalletResponse>> GetUserWallet(Guid userId)
        {
            var user = await _users.GetByIdAsync(userId);
            if (user is null) return NotFound("User not found");

            var wallet = await _wallets.GetOrCreateAsync(userId);
            return Ok(new WalletResponse(wallet.Id, user.Id, user.Name, wallet.Balance, wallet.UpdatedAt));
        }

        /// <summary>GET transaction history of a user's wallet</summary>
        [HttpGet("{userId}/transactions")]
        public async Task<ActionResult<IEnumerable<WalletTransactionResponse>>> GetTransactions(Guid userId)
        {
            var user = await _users.GetByIdAsync(userId);
            if (user is null) return NotFound("User not found");

            var transactions = await _wallets.GetTransactionsByUserIdAsync(userId);
            var dto = transactions.Select(t => new WalletTransactionResponse(
                t.Id,
                t.Amount,
                t.Type.ToString(),
                t.Description,
                t.Actor?.Name,
                t.CreatedAt
            ));

            return Ok(dto);
        }

        /// <summary>
        /// Adjust a user's balance directly.
        /// Positive Amount = top-up (admin adds balance to user).
        /// Negative Amount = deduction (admin removes balance from user).
        /// Admin does NOT need a wallet — balance is created or removed directly.
        /// </summary>
        [HttpPost("adjust")]
        public async Task<ActionResult> AdjustBalance([FromBody] AdminAdjustBalanceRequest request)
        {
            if (request.Amount == 0)
                return BadRequest("Amount cannot be zero.");

            var adminId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var targetUser = await _users.GetByIdAsync(request.UserId);
            if (targetUser is null) return NotFound("User not found");

            var targetWallet = await _wallets.GetOrCreateAsync(request.UserId);

            bool isTopUp = request.Amount > 0;

            if (isTopUp)
            {
                // Admin creates balance directly into user's wallet
                targetWallet.Balance += request.Amount;
                await _wallets.UpdateAsync(targetWallet);

                await _wallets.AddTransactionAsync(new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    WalletId = targetWallet.Id,
                    Amount = request.Amount,
                    Type = WalletTransactionType.AdminTopUp,
                    Description = request.Description ?? "Admin top-up",
                    ActorId = adminId,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                // Admin removes balance from user's wallet
                decimal deduction = Math.Abs(request.Amount);

                if (targetWallet.Balance < deduction)
                    return BadRequest($"User's balance ({targetWallet.Balance:F2}) is less than the deduction amount ({deduction:F2}).");

                targetWallet.Balance -= deduction;
                await _wallets.UpdateAsync(targetWallet);

                await _wallets.AddTransactionAsync(new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    WalletId = targetWallet.Id,
                    Amount = -deduction,
                    Type = WalletTransactionType.AdminDeduction,
                    Description = request.Description ?? "Admin deduction",
                    ActorId = adminId,
                    CreatedAt = DateTime.UtcNow
                });
            }

            var updatedWallet = await _wallets.GetByUserIdAsync(request.UserId);
            return Ok(new
            {
                Message = isTopUp ? "Balance topped up successfully" : "Balance deducted successfully",
                UserId = request.UserId,
                UserName = targetUser.Name,
                NewBalance = updatedWallet!.Balance
            });
        }
    }
}