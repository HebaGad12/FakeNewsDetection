using Domain.Contracts;
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

        public AuthController(IUserRepository users, ITokenService tokens)
        {
            _users = users;
            _tokens = tokens;
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

            // Both independent journalists AND org managers start as Pending
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
                return Accepted(new
                {
                    message = "Registration submitted successfully. Your account is pending admin review.",
                    userId = user.Id
                });

            var token = _tokens.CreateToken(user);
            return Ok(new AuthResponse(token, user.Id, user.Name, user.Email, user.Role.ToString()));
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
        {
            var user = (await _users.GetAllAsync()).FirstOrDefault(u => u.Email == req.Email);
            if (user is null || !user.IsActive)
                return Unauthorized("Invalid credentials.");

            if (user.RegistrationStatus == RegistrationStatus.Pending)
                return Unauthorized("Your account is pending admin approval. Please wait for verification.");

            if (user.RegistrationStatus == RegistrationStatus.Rejected)
                return Unauthorized($"Your registration was rejected. Reason: {user.RejectionReason ?? "No reason provided."}");

            var ok = PasswordHasher.Verify(req.Password, user.PasswordHash);
            if (!ok)
                return Unauthorized("Invalid credentials.");

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
            return Ok(new
            {
                user.Id,
                user.Name,
                user.Email,
                Role = user.Role.ToString(),
            });
        }
    }
}
