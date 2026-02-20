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
    [Route("api/donations")]
    [Authorize]
    public class DonationController : ControllerBase
    {
        private readonly IDonationRepository _donations;
        private readonly IWalletRepository _wallets;
        private readonly IUserRepository _users;

        public DonationController(
            IDonationRepository donations,
            IWalletRepository wallets,
            IUserRepository users)
        {
            _donations = donations;
            _wallets = wallets;
            _users = users;
        }

        [HttpGet("my-wallet")]
        public async Task<ActionResult<WalletResponse>> MyWallet()
        {
            var userId = GetUserId();
            var user = await _users.GetByIdAsync(userId);
            if (user is null) return Unauthorized();

            var wallet = await _wallets.GetOrCreateAsync(userId);
            return Ok(new WalletResponse(wallet.Id, user.Id, user.Name, wallet.Balance, wallet.UpdatedAt));
        }

        [HttpGet("my-wallet/transactions")]
        public async Task<ActionResult<IEnumerable<WalletTransactionResponse>>> MyTransactions()
        {
            var userId = GetUserId();
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


        [HttpPost("send")]
        [Authorize(Roles = "Regular,Journalist")]
        public async Task<ActionResult> SendDonation([FromBody] SendDonationRequest request)
        {
            if (request.Amount <= 0)
                return BadRequest("Donation amount must be greater than zero.");

            var senderId = GetUserId();

            if (senderId == request.RecipientId)
                return BadRequest("You cannot donate to yourself.");

            var sender = await _users.GetByIdAsync(senderId);
            if (sender is null) return Unauthorized();

            var recipient = await _users.GetByIdAsync(request.RecipientId);
            if (recipient is null) return NotFound("Recipient not found.");

            if (recipient.Role != Role.Regular && recipient.Role != Role.Journalist)
                return BadRequest("Donations can only be sent to Regular users or Journalists.");

            var senderWallet = await _wallets.GetOrCreateAsync(senderId);
            if (senderWallet.Balance < request.Amount)
                return BadRequest($"Insufficient wallet balance. Your balance: {senderWallet.Balance:F2}");

            var recipientWallet = await _wallets.GetOrCreateAsync(request.RecipientId);

            senderWallet.Balance -= request.Amount;
            recipientWallet.Balance += request.Amount;

            await _wallets.UpdateAsync(senderWallet);
            await _wallets.UpdateAsync(recipientWallet);

            var donation = new Donation
            {
                Id = Guid.NewGuid(),
                SenderId = senderId,
                RecipientId = request.RecipientId,
                Amount = request.Amount,
                Message = request.Message,
                CreatedAt = DateTime.UtcNow
            };
            await _donations.AddAsync(donation);

            await _wallets.AddTransactionAsync(new WalletTransaction
            {
                Id = Guid.NewGuid(),
                WalletId = senderWallet.Id,
                Amount = -request.Amount,
                Type = WalletTransactionType.DonationSent,
                Description = request.Message ?? $"Donation to {recipient.Name}",
                ActorId = request.RecipientId,
                CreatedAt = DateTime.UtcNow
            });

            await _wallets.AddTransactionAsync(new WalletTransaction
            {
                Id = Guid.NewGuid(),
                WalletId = recipientWallet.Id,
                Amount = request.Amount,
                Type = WalletTransactionType.DonationReceived,
                Description = request.Message ?? $"Donation from {sender.Name}",
                ActorId = senderId,
                CreatedAt = DateTime.UtcNow
            });

            return Ok(new
            {
                Message = "Donation sent successfully",
                DonationId = donation.Id,
                Amount = request.Amount,
                RecipientName = recipient.Name,
                NewBalance = senderWallet.Balance
            });
        }


        [HttpGet("sent")]
        public async Task<ActionResult<IEnumerable<DonationResponse>>> SentDonations()
        {
            var userId = GetUserId();
            var donations = await _donations.GetSentByUserAsync(userId);
            return Ok(donations.Select(MapDonation));
        }

        [HttpGet("received")]
        public async Task<ActionResult<IEnumerable<DonationResponse>>> ReceivedDonations()
        {
            var userId = GetUserId();
            var donations = await _donations.GetReceivedByUserAsync(userId);
            return Ok(donations.Select(MapDonation));
        }

        [HttpGet("all")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<ActionResult<IEnumerable<DonationResponse>>> AllDonations()
        {
            var donations = await _donations.GetAllAsync();
            return Ok(donations.Select(MapDonation));
        }

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private static DonationResponse MapDonation(Donation d) => new(
            d.Id,
            d.SenderId,
            d.Sender?.Name ?? "Unknown",
            d.RecipientId,
            d.Recipient?.Name ?? "Unknown",
            d.Amount,
            d.Message,
            d.CreatedAt
        );
    }
}