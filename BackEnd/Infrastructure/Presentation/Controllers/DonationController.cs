using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
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
    [Route("api/donations")]
    [Authorize]
    public class DonationController : ControllerBase
    {
        private readonly IDonationRepository _donations;
        private readonly IWalletRepository _wallets;
        private readonly IUserRepository _users;
        private readonly INotificationRepository _notifications;
        private readonly IHubContext<NotificationHub> _hub;

        public DonationController(
            IDonationRepository donations,
            IWalletRepository wallets,
            IUserRepository users,
            INotificationRepository notifications,
            IHubContext<NotificationHub> hub)
        {
            _donations = donations;
            _wallets = wallets;
            _users = users;
            _notifications = notifications;
            _hub = hub;
        }

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

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
                t.Id, t.Amount, t.Type.ToString(),
                t.Description, t.Actor?.Name, t.CreatedAt));

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

            if (recipient.Role != Role.Regular && recipient.Role != Role.Journalist && recipient.Role != Role.Organization)
                return BadRequest("Donations can only be sent to Regular users, Journalists, or Organizations.");

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

            // ── Notify recipient (deposit) ─────────────────────────────────
            var nRecipient = new Notification
            {
                UserId = request.RecipientId,
                ActorId = senderId,
                Type = "donation_received",
                Title = "Donation received",
                Message = $"{sender.Name} donated {request.Amount:F2} EGP to your wallet."
            };
            await _notifications.AddAsync(nRecipient);
            await _hub.Clients.Group($"user:{request.RecipientId}")
                .SendAsync("ReceiveNotification", new
                {
                    nRecipient.Id,
                    nRecipient.Title,
                    nRecipient.Message,
                    nRecipient.Type,
                    nRecipient.IsRead,
                    nRecipient.CreatedAt,
                    ActorId = senderId,
                    ActorName = sender.Name
                });

            // ── Notify sender (withdrawal confirmation) ────────────────────
            var nSender = new Notification
            {
                UserId = senderId,
                ActorId = request.RecipientId,
                Type = "donation_sent",
                Title = "Donation sent",
                Message = $"You successfully sent {request.Amount:F2} EGP to {recipient.Name}."
            };
            await _notifications.AddAsync(nSender);
            await _hub.Clients.Group($"user:{senderId}")
                .SendAsync("ReceiveNotification", new
                {
                    nSender.Id,
                    nSender.Title,
                    nSender.Message,
                    nSender.Type,
                    nSender.IsRead,
                    nSender.CreatedAt,
                    ActorId = request.RecipientId,
                    ActorName = recipient.Name
                });
            // ─────────────────────────────────────────────────────────────

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
            var donations = await _donations.GetSentByUserAsync(GetUserId());
            return Ok(donations.Select(MapDonation));
        }

        [HttpGet("received")]
        public async Task<ActionResult<IEnumerable<DonationResponse>>> ReceivedDonations()
        {
            var donations = await _donations.GetReceivedByUserAsync(GetUserId());
            return Ok(donations.Select(MapDonation));
        }

        [HttpGet("all")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<ActionResult<IEnumerable<DonationResponse>>> AllDonations()
        {
            var donations = await _donations.GetAllAsync();
            return Ok(donations.Select(MapDonation));
        }

        private static DonationResponse MapDonation(Donation d) => new(
            d.Id, d.SenderId, d.Sender?.Name ?? "Deleted User",
            d.RecipientId, d.Recipient?.Name ?? "Deleted User",
            d.Amount, d.Message, d.CreatedAt);
    }
}