using Domain.Contracts;
using Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Persistence.Repositories
{
    public class OrganizationFollowRepository : IOrganizationFollowRepository
    {
        private readonly AppDbContext _context;
        public OrganizationFollowRepository(AppDbContext context) => _context = context;

        public async Task<IEnumerable<OrganizationFollow>> GetFollowersAsync(Guid organizationId) =>
            await _context.OrganizationFollows
                .Include(f => f.Follower)
                .Where(f => f.OrganizationId == organizationId)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();

        public async Task<OrganizationFollow?> GetAsync(Guid followerId, Guid organizationId) =>
            await _context.OrganizationFollows
                .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.OrganizationId == organizationId);

        public async Task AddAsync(OrganizationFollow follow)
        {
            await _context.OrganizationFollows.AddAsync(follow);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveAsync(Guid followerId, Guid organizationId)
        {
            var follow = await _context.OrganizationFollows
                .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.OrganizationId == organizationId);

            if (follow != null)
            {
                _context.OrganizationFollows.Remove(follow);
                await _context.SaveChangesAsync();
            }
        }
    }
}