using Domain.Contracts;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Persistence.Repositories
{
    public class MembershipRepository : IMembershipRepository
    {
        private readonly AppDbContext _db;

        public MembershipRepository(AppDbContext db) => _db = db;

        public async Task<List<string>> GetActiveCommunityIdsAsync(Guid userId) =>
            await _db.Memberships
                .Where(m => m.UserId == userId && !m.IsBanned)
                .Select(m => m.CommunityId.ToString())
                .ToListAsync();
    }
}