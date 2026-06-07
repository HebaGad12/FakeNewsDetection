using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Persistence;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Presentation.SignalR_Hubs
{
    public class LiveHub : Hub
    {
        private readonly AppDbContext _context;

        // liveId → set of viewer connectionIds
        private static readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, byte>> LiveViewers = new();

        // connectionId → set of liveIds (so we can clean up on disconnect)
        private static readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, byte>> ConnectionLiveMap = new();

        // liveId → broadcaster connectionId (so viewers can route answers/ICE to the right person)
        private static readonly ConcurrentDictionary<Guid, string> LiveBroadcasterConnection = new();

        public LiveHub(AppDbContext context)
        {
            _context = context;
        }

        // =====================================================================
        // FollowJournalist — called by BOTH the journalist (self) and viewers
        // =====================================================================
        public async Task FollowJournalist(Guid journalistId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, journalistId.ToString());

            var activeLiveIds = await _context.LiveSessions
                .Where(l => l.JournalistId == journalistId && l.IsActive)
                .Select(l => l.Id)
                .ToListAsync();

            var callerIdValue = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            var isJournalistSelf = Guid.TryParse(callerIdValue, out var callerId)
                && callerId == journalistId;

            foreach (var liveId in activeLiveIds)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, liveId.ToString());

                if (isJournalistSelf)
                {
                    // Track the broadcaster's own connection so viewers can address it directly
                    LiveBroadcasterConnection[liveId] = Context.ConnectionId;
                }
                else
                {
                    // Register viewer
                    var viewers = LiveViewers.GetOrAdd(liveId, _ => new ConcurrentDictionary<string, byte>());
                    viewers[Context.ConnectionId] = 1;

                    var joinedLives = ConnectionLiveMap.GetOrAdd(
                        Context.ConnectionId,
                        _ => new ConcurrentDictionary<Guid, byte>());
                    joinedLives[liveId] = 1;

                    // Notify journalist: include the viewer's connectionId so the broadcaster
                    // can create a dedicated RTCPeerConnection for this viewer.
                    await Clients.Group(journalistId.ToString())
                        .SendAsync("ViewerJoined", liveId.ToString(), Context.ConnectionId);

                    await Clients.Group(journalistId.ToString())
                        .SendAsync("ViewerCountUpdated", liveId.ToString(), viewers.Count);
                }
            }
        }

        // =====================================================================
        // SendOffer — broadcaster → specific viewer only
        // The broadcaster passes the target viewerConnectionId so we route precisely.
        // =====================================================================
        public async Task SendOffer(Guid liveId, string offer, string viewerConnectionId)
        {
            // Register the broadcaster's connection for this live session
            LiveBroadcasterConnection[liveId] = Context.ConnectionId;

            if (!string.IsNullOrWhiteSpace(viewerConnectionId))
            {
                // Route offer to the specific viewer only
                await Clients.Client(viewerConnectionId).SendAsync("ReceiveOffer", offer);
            }
            else
            {
                // Fallback: broadcast to group (initial offer before any viewer has joined)
                await Clients.OthersInGroup(liveId.ToString()).SendAsync("ReceiveOffer", offer);
            }
        }

        // =====================================================================
        // SendAnswer — viewer → broadcaster only (not the entire group)
        // =====================================================================
        public async Task SendAnswer(Guid liveId, string answer)
        {
            // Route to the broadcaster's specific connection
            if (LiveBroadcasterConnection.TryGetValue(liveId, out var broadcasterConnId))
            {
                // Include the viewer's connection ID so broadcaster knows who answered
                await Clients.Client(broadcasterConnId)
                    .SendAsync("ReceiveAnswer", answer, Context.ConnectionId);
            }
        }

        // =====================================================================
        // SendIceCandidate — bidirectional but targeted
        // Viewers send to the broadcaster; broadcaster sends to specific viewer.
        // =====================================================================
        public async Task SendIceCandidate(Guid liveId, string candidate, string? targetConnectionId = null)
        {
            if (!string.IsNullOrWhiteSpace(targetConnectionId))
            {
                // Broadcaster → specific viewer
                await Clients.Client(targetConnectionId).SendAsync("ReceiveIceCandidate", candidate);
            }
            else if (LiveBroadcasterConnection.TryGetValue(liveId, out var broadcasterConnId))
            {
                // Viewer → broadcaster, include sender's connection ID
                await Clients.Client(broadcasterConnId)
                    .SendAsync("ReceiveIceCandidate", candidate, Context.ConnectionId);
            }
        }

        // =====================================================================
        // SendComment — broadcast to entire live group
        // =====================================================================
        public async Task SendComment(Guid liveId, string comment)
        {
            var senderIdValue = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            var senderName = Context.User?.FindFirstValue(ClaimTypes.Name)
                ?? Context.User?.FindFirstValue("name")
                ?? Context.User?.FindFirstValue("unique_name");

            if (string.IsNullOrWhiteSpace(senderName))
            {
                if (Guid.TryParse(senderIdValue, out var senderGuid))
                {
                    senderName = await _context.Users
                        .AsNoTracking()
                        .Where(u => u.Id == senderGuid)
                        .Select(u => u.Name)
                        .FirstOrDefaultAsync();
                }
            }

            if (string.IsNullOrWhiteSpace(senderName))
                senderName = "User";

            await Clients.Group(liveId.ToString())
                .SendAsync("ReceiveComment", senderIdValue ?? string.Empty, senderName, comment);
        }

        // =====================================================================
        // Disconnect cleanup
        // =====================================================================
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (ConnectionLiveMap.TryRemove(Context.ConnectionId, out var lives))
            {
                foreach (var liveId in lives.Keys)
                {
                    if (LiveViewers.TryGetValue(liveId, out var viewers))
                    {
                        viewers.TryRemove(Context.ConnectionId, out _);
                        if (viewers.IsEmpty)
                            LiveViewers.TryRemove(liveId, out _);

                        var journalistId = await _context.LiveSessions
                            .Where(l => l.Id == liveId)
                            .Select(l => l.JournalistId)
                            .FirstOrDefaultAsync();

                        if (journalistId != Guid.Empty)
                        {
                            await Clients.Group(journalistId.ToString())
                                .SendAsync("ViewerCountUpdated", liveId.ToString(), viewers.Count);

                            // Notify broadcaster to clean up the peer connection for this viewer
                            await Clients.Group(journalistId.ToString())
                                .SendAsync("ViewerLeft", liveId.ToString(), Context.ConnectionId);
                        }
                    }
                }
            }

            // Remove broadcaster mapping if this was the broadcaster
            foreach (var kvp in LiveBroadcasterConnection)
            {
                if (kvp.Value == Context.ConnectionId)
                    LiveBroadcasterConnection.TryRemove(kvp.Key, out _);
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}
