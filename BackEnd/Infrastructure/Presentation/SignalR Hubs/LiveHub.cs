using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Presentation.SignalR_Hubs
{
    public class LiveHub : Hub
    {
        public async Task FollowJournalist(Guid journalistId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, journalistId.ToString());
        }
        public async Task SendComment(Guid liveId, string comment)
        {
            await Clients.Group(liveId.ToString()).SendAsync("ReceiveComment", comment);
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
    }

}
