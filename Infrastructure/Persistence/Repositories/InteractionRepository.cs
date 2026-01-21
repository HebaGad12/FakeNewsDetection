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
    public class InteractionRepository : IInteractionRepository
    {
        private readonly AppDbContext _context;
        public InteractionRepository(AppDbContext context) => _context = context;

        public async Task<IEnumerable<Interaction>> GetByPostAsync(Guid postId) =>
            await _context.Interactions
                .Where(i => i.PostId == postId)
                .Include(i => i.User)
                .Include(i => i.Post)
                .ToListAsync();

        public async Task<IEnumerable<Interaction>> GetByUserAsync(Guid userId) =>
            await _context.Interactions
                .Where(i => i.UserId == userId)
                .Include(i => i.Post)
                .ToListAsync();

        public async Task AddAsync(Interaction interaction)
        {
            await _context.Interactions.AddAsync(interaction);
            await _context.SaveChangesAsync();
        }

    
        public async Task DeleteAsync(Guid id)
        {
            var interaction = await _context.Interactions.FindAsync(id);
            if (interaction != null)
            {
                _context.Interactions.Remove(interaction);
                await _context.SaveChangesAsync();
            }
        }
    }


}
