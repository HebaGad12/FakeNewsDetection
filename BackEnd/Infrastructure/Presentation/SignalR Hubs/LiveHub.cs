using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Persistence;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Presentation.SignalR_Hubs
{
    public class LiveHub : Hub
    {
        private readonly AppDbContext _context;
        private static readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, byte>> LiveViewers = new();
        private static readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, byte>> ConnectionLiveMap = new();

        public LiveHub(AppDbContext context)
        {
            _context = context;
        }

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

                if (!isJournalistSelf)
                {
                    var viewers = LiveViewers.GetOrAdd(liveId, _ => new ConcurrentDictionary<string, byte>());
                    viewers[Context.ConnectionId] = 1;

                    var joinedLives = ConnectionLiveMap.GetOrAdd(
                        Context.ConnectionId,
                        _ => new ConcurrentDictionary<Guid, byte>());
                    joinedLives[liveId] = 1;

                    await Clients.Group(journalistId.ToString()).SendAsync("ViewerJoined", liveId.ToString());
                    await Clients.Group(journalistId.ToString())
                        .SendAsync("ViewerCountUpdated", liveId.ToString(), viewers.Count);
                }
            }
        }
        public async Task SendComment(Guid liveId, string comment)
        {
            var senderName = Context.User?.FindFirstValue(ClaimTypes.Name)
                ?? Context.User?.FindFirstValue("name")
                ?? Context.User?.FindFirstValue("unique_name");

            if (string.IsNullOrWhiteSpace(senderName))
            {
                var senderIdValue = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (Guid.TryParse(senderIdValue, out var senderId))
                {
                    senderName = await _context.Users
                        .AsNoTracking()
                        .Where(u => u.Id == senderId)
                        .Select(u => u.Name)
                        .FirstOrDefaultAsync();
                }
            }

            if (string.IsNullOrWhiteSpace(senderName))
            {
                senderName = "Viewer";
            }

            await Clients.OthersInGroup(liveId.ToString()).SendAsync("ReceiveComment", senderName, comment);
        }
        public async Task SendOffer(Guid liveId, string offer)
        {
            await Clients.Group(liveId.ToString()).SendAsync("ReceiveOffer", offer);
        }

        public async Task SendAnswer(Guid liveId, string answer)
        {
            await Clients.Group(liveId.ToString()).SendAsync("ReceiveAnswer", answer);
        }

        public async Task SendIceCandidate(Guid liveId, string candidate)
        {
            await Clients.Group(liveId.ToString()).SendAsync("ReceiveIceCandidate", candidate);
        }

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
                        {
                            LiveViewers.TryRemove(liveId, out _);
                        }

                        var journalistId = await _context.LiveSessions
                            .Where(l => l.Id == liveId)
                            .Select(l => l.JournalistId)
                            .FirstOrDefaultAsync();

                        if (journalistId != Guid.Empty)
                        {
                            await Clients.Group(journalistId.ToString())
                                .SendAsync("ViewerCountUpdated", liveId.ToString(), viewers.Count);
                        }
                    }
                }
            }

            await base.OnDisconnectedAsync(exception);
        }
    }

}
