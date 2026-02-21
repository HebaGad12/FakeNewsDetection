using Domain.Contracts;
using Domain.Enums;
using Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Services.Utilities;
using ServicesAbstraction;
using Shared.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Presentation.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly ITokenService _tokens;

        // Add to constructor field
        private readonly IOrganizationRepository _organizations;

        // Update constructor
        public AuthController(IUserRepository users, ITokenService tokens, IOrganizationRepository organizations)
        {
            _users = users;
            _tokens = tokens;
            _organizations = organizations;
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

            if (req.Role == Role.Organization && string.IsNullOrWhiteSpace(req.OrganizationName))
                return BadRequest("Organization name is required when registering as an Organization manager.");

            // Auto-create the organization if registering as org manager
            Guid? organizationId = null;
            if (req.Role == Role.Organization)
            {
                var org = new Organization
                {
                    Id = Guid.NewGuid(),
                    Name = req.OrganizationName!,
                    Email = req.Email,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                await _organizations.AddAsync(org);
                organizationId = org.Id;
            }

            bool isIndependentJournalist = req.Role == Role.Journalist && organizationId is null;

            var user = new User
            {
                Id = Guid.NewGuid(),
                Name = req.Name,
                Email = req.Email,
                PasswordHash = PasswordHasher.Hash(req.Password),
                Role = req.Role,
                OrganizationId = organizationId,
                JournalistExternalId = req.JournalistId,
                IsActive = true,
                RegistrationStatus = isIndependentJournalist
                    ? RegistrationStatus.Pending
                    : RegistrationStatus.Approved,
                CreatedAt = DateTime.UtcNow
            };

            await _users.AddAsync(user);

            if (isIndependentJournalist)
                return Accepted(new
                {
                    message = "Registration submitted. Pending admin review.",
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

            if (user.RegistrationStatus == Domain.Enums.RegistrationStatus.Pending)
                return Unauthorized("Your account is pending admin approval. Please wait for verification.");

            if (user.RegistrationStatus == Domain.Enums.RegistrationStatus.Rejected)
                return Unauthorized($"Your registration was rejected. Reason: {user.RejectionReason ?? "No reason provided."}");

            var ok = PasswordHasher.Verify(req.Password, user.PasswordHash);
            if (!ok)
                return Unauthorized("Invalid credentials.");

            var token = _tokens.CreateToken(user);

            return Ok(new AuthResponse(
                token,
                user.Id,
                user.Name,
                user.Email,
                user.Role.ToString()
            ));
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