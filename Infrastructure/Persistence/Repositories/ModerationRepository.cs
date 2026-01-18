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
    public class ModerationRepository : IModerationRepository
    {
        private readonly AppDbContext _context;
        public ModerationRepository(AppDbContext context) => _context = context;

        public async Task<IEnumerable<ModerationAction>> GetByPostAsync(Guid postId) =>
            await _context.ModerationActions.Where(m => m.PostId == postId).ToListAsync();

        public async Task<IEnumerable<ModerationAction>> GetByActorAsync(Guid actorId) =>
            await _context.ModerationActions.Where(m => m.ActorId == actorId).ToListAsync();

        public async Task AddAsync(ModerationAction action)
        {
            await _context.ModerationActions.AddAsync(action);
            await _context.SaveChangesAsync();
        }
    }

}
