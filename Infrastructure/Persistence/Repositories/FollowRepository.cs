using Domain.Contracts;
using Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Persistence.Repositories
{
    public class FollowRepository : IFollowRepository
    {
        private readonly AppDbContext _context;
        public FollowRepository(AppDbContext context) => _context = context;

        public async Task<IEnumerable<Follow>> GetFollowersAsync(Guid userId) =>
            await _context.Follows
                .Include(f => f.Follower)
                .Where(f => f.FolloweeId == userId)
                .ToListAsync();

        public async Task<IEnumerable<Follow>> GetFolloweesAsync(Guid userId) =>
            await _context.Follows
                .Include(f => f.Followee)
                .Where(f => f.FollowerId == userId)
                .ToListAsync();

        public async Task AddAsync(Follow follow)
        {
            await _context.Follows.AddAsync(follow);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveAsync(Guid followerId, Guid followeeId)
        {
            var follow = await _context.Follows
                .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FolloweeId == followeeId);

            if (follow != null)
            {
                _context.Follows.Remove(follow);
                await _context.SaveChangesAsync();
            }
        }
    }

}
