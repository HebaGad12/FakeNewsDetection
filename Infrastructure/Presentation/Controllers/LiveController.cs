using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Persistence;
using Presentation.SignalR_Hubs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Presentation.Controllers
{

    [ApiController]
    [Route("api/[controller]")]
    public class LiveController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<LiveHub> _hubContext;

        public LiveController(AppDbContext context, IHubContext<LiveHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpPost("start-live")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult> StartLive()
        {
            var journalistId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var live = new LiveSession
            {
                Id = Guid.NewGuid(),
                JournalistId = journalistId,
                StartedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.LiveSessions.Add(live);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.Group(journalistId.ToString())
                .SendAsync("LiveStarted", live.Id);

            return Ok(new { Message = "Live started", LiveId = live.Id });
        }

        [HttpGet("join-live/{journalistId}")]
        [Authorize(Roles = "User,Journalist")]
        public async Task<ActionResult> JoinLive(Guid journalistId)
        {
            var live = await _context.LiveSessions
                .FirstOrDefaultAsync(l => l.JournalistId == journalistId && l.IsActive);

            if (live == null) return NotFound("No active live session");

            return Ok(new { LiveId = live.Id, JournalistId = journalistId });
        }

        [HttpPost("end-live/{liveId}")]
        [Authorize(Roles = "Journalist")]
        public async Task<ActionResult> EndLive(Guid liveId)
        {
            var live = await _context.LiveSessions.FindAsync(liveId);
            if (live == null) return NotFound("Live not found");

            var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            if (live.JournalistId != currentUserId)
            {
                return Forbid("Only the owner of the live can end it");
            }

            live.IsActive = false;
            await _context.SaveChangesAsync();

            await _hubContext.Clients.Group(live.JournalistId.ToString())
                .SendAsync("LiveEnded", live.Id);

            return Ok(new { Message = "Live ended" });
        }

    }


}
