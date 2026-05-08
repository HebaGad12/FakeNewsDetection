using Domain.Contracts;
using Microsoft.AspNetCore.SignalR;
using Presentation.SignalR_Hubs;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Utilities;
using ServicesAbstraction;
using Shared.DTOs;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly ITokenService _tokens;
        private readonly IUserRepository _usersRepo;
        private readonly INotificationRepository _notifications;
        private readonly IHubContext<NotificationHub> _hub;

        public AuthController(IUserRepository users, ITokenService tokens, INotificationRepository notifications, IHubContext<NotificationHub> hub)
        {
            _users = users;
            _tokens = tokens;
            _notifications = notifications;
            _hub = hub;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest req)
        {
            var existing = (await _users.GetAllAsync()).FirstOrDefault(u => u.Email == req.Email);
            if (existing is not null)
                return Conflict("Email already exists.");

            if (req.Role == Role.Journalist && string.IsNullOrWhiteSpace(req.JournalistId))
                return BadRequest("Journalist ID is required.");

            if (req.Role == Role.Organization && string.IsNullOrWhiteSpace(req.OrganizationLicense))
                return BadRequest("Organization license is required when registering as an Organization manager.");

            bool isPending = (req.Role == Role.Journalist) || (req.Role == Role.Organization);

            var user = new User
            {
                Id = Guid.NewGuid(),
                Name = req.Name,
                Email = req.Email,
                PasswordHash = PasswordHasher.Hash(req.Password),
                Role = req.Role,
                OrganizationId = null,
                JournalistExternalId = req.JournalistId,
                License = req.OrganizationLicense,
                IsActive = true,
                RegistrationStatus = isPending ? RegistrationStatus.Pending : RegistrationStatus.Approved,
                CreatedAt = DateTime.UtcNow
            };

            await _users.AddAsync(user);

            if (isPending)
            {
                // ── Notify admin: new pending registration ───────────────
                var allUsers = await _users.GetAllAsync();
                var admin = allUsers.FirstOrDefault(u => u.Role == Role.Admin);
                if (admin is not null)
                {
                    var roleLabel = user.Role == Role.Journalist ? "journalist" : "organization";
                    var nAdmin = new Domain.Models.Notification
                    {
                        UserId = admin.Id,
                        ActorId = user.Id,
                        Type = "pending_registration",
                        Title = "New registration pending",
                        Message = $"{user.Name} registered as a {roleLabel} and is awaiting your review."
                    };
                    await _notifications.AddAsync(nAdmin);
                    await _hub.Clients.Group($"user:{admin.Id}")
                        .SendAsync("ReceiveNotification", new
                        {
                            nAdmin.Id,
                            nAdmin.Title,
                            nAdmin.Message,
                            nAdmin.Type,
                            nAdmin.IsRead,
                            nAdmin.CreatedAt,
                            ActorId = user.Id,
                            ActorName = user.Name
                        });
                }
                // ────────────────────────────────────────────────────────

                return Accepted(new
                {
                    message = "Registration submitted successfully. Your account is pending admin review.",
                    userId = user.Id
                });
            }

            var token = _tokens.CreateToken(user);
            return Ok(new AuthResponse(token, user.Id, user.Name, user.Email, user.Role.ToString()));
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
        {
            var user = (await _users.GetAllAsync()).FirstOrDefault(u => u.Email == req.Email);

            // Validate password first (do not reveal whether email exists)
            if (user is null || !PasswordHasher.Verify(req.Password, user.PasswordHash))
                return Unauthorized("Invalid credentials.");

            // Pending approval
            if (user.RegistrationStatus == RegistrationStatus.Pending)
                return Unauthorized("Your account is pending admin approval. Please wait for verification.");

            // Registration rejected
            if (user.RegistrationStatus == RegistrationStatus.Rejected)
                return Unauthorized($"Your registration was rejected. Reason: {user.RejectionReason ?? "No reason provided."}");

            // FIX: Deactivated accounts show a clear deactivated message (not "invalid credentials")
            if (!user.IsActive)
                return Unauthorized("Your account has been deactivated. Please contact your organization or support.");

            var token = _tokens.CreateToken(user);
            return Ok(new AuthResponse(token, user.Id, user.Name, user.Email, user.Role.ToString()));
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<object>> Me()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();

            var user = await _users.GetByIdAsync(Guid.Parse(userId));
            if (user is null) return NotFound();
            return Ok(new { user.Id, user.Name, user.Email, Role = user.Role.ToString() });
        }

        /// <summary>
        /// Change password for the currently authenticated user.
        /// </summary>
        [HttpPut("change-password")]
        [Authorize]
        public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();

            var user = await _users.GetByIdAsync(Guid.Parse(userId));
            if (user is null) return NotFound("User not found.");

            if (!PasswordHasher.Verify(req.CurrentPassword, user.PasswordHash))
                return BadRequest("Current password is incorrect.");

            if (req.NewPassword.Length < 6)
                return BadRequest("New password must be at least 6 characters.");

            user.PasswordHash = PasswordHasher.Hash(req.NewPassword);
            await _users.UpdateAsync(user);

            return Ok(new { Message = "Password changed successfully." });
        }
    }
}