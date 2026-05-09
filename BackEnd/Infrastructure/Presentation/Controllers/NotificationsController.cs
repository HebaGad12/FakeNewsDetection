using Domain.Contracts;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Presentation.SignalR_Hubs;
using Shared.DTOs;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationRepository _notifications;
        private readonly IHubContext<NotificationHub> _hub;

        public NotificationsController(
            INotificationRepository notifications,
            IHubContext<NotificationHub> hub)
        {
            _notifications = notifications;
            _hub = hub;
        }

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // ── GET /api/notifications ────────────────────────────────────────────
        // Returns all notifications for the authenticated user (newest first).
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetUserId();
            var items = await _notifications.GetByUserAsync(userId);

            var dto = items.Select(n => new NotificationResponse(
                n.Id,
                n.Title,
                n.Message,
                n.Type,
                n.IsRead,
                n.CreatedAt,
                n.ActorId,
                n.Actor?.Name
            ));

            return Ok(dto);
        }

        // ── GET /api/notifications/unread-count ───────────────────────────────
        [HttpGet("unread-count")]
        public async Task<IActionResult> UnreadCount()
        {
            var count = await _notifications.GetUnreadCountAsync(GetUserId());
            return Ok(new { Count = count });
        }

        // ── POST /api/notifications ───────────────────────────────────────────
        // Creates a notification and broadcasts it via SignalR to the target user.
        // Typically called internally (or by Admin); not usually called by end-users.
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateNotificationRequest req)
        {
            var notification = new Notification
            {
                UserId = req.UserId,
                Title = req.Title,
                Message = req.Message,
                Type = req.Type,
                ActorId = GetUserId()
            };

            await _notifications.AddAsync(notification);
            await BroadcastToUser(notification);

            return CreatedAtAction(nameof(GetAll), new { }, MapToDto(notification));
        }

        // ── PUT /api/notifications/{id}/read ─────────────────────────────────
        [HttpPut("{id:guid}/read")]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var n = await _notifications.GetByIdAsync(id);
            if (n is null) return NotFound();
            if (n.UserId != GetUserId()) return Forbid();

            await _notifications.MarkAsReadAsync(id);
            return Ok(new { Message = "Marked as read" });
        }

        // ─────────────────────────────────────────────────────────────────────
        // Internal helpers
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Pushes the notification payload to the target user's SignalR group.
        /// The client listens for the "ReceiveNotification" event.
        /// </summary>
        internal async Task BroadcastToUser(Notification n)
        {
            await _hub.Clients
                .Group($"user:{n.UserId}")
                .SendAsync("ReceiveNotification", MapToDto(n));
        }

        private static NotificationResponse MapToDto(Notification n) =>
            new(n.Id, n.Title, n.Message, n.Type, n.IsRead, n.CreatedAt, n.ActorId, n.Actor?.Name);
    }
}