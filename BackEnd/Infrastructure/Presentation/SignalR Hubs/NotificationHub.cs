using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Presentation.SignalR_Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        // Each authenticated user joins their own private group named by their UserId.
        // This lets us push to a specific user from any service/controller.
        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(userId))
            {
                // Personal room: "user:{guid}"
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user:{userId}");
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}