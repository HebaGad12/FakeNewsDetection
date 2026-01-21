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

    public class PostRepository : IPostRepository
    {
        private readonly AppDbContext _context;
        public PostRepository(AppDbContext context) => _context = context;

        public async Task<Post?> GetByIdAsync(Guid id) =>
            await _context.Posts
                .Include(p => p.Interactions)
                .Include(p => p.Author)
                .Include(p => p.Organization)
                .FirstOrDefaultAsync(p => p.Id == id);

        public async Task<IEnumerable<Post>> GetAllAsync() =>
            await _context.Posts
                .Include(p => p.Author)
                .Include(p => p.Organization)
                .Include(p => p.Interactions)
                .ToListAsync();

        public async Task<IEnumerable<Post>> GetByAuthorAsync(Guid authorId) =>
            await _context.Posts
                .Where(p => p.AuthorId == authorId)
                .Include(p => p.Author)
                .Include(p => p.Organization)
                .Include(p => p.Interactions)
                .ToListAsync();

        public async Task AddAsync(Post post)
        {
            if (post.Id == Guid.Empty)
                post.Id = Guid.NewGuid(); 

            if (post.CreatedAt == default)
                post.CreatedAt = DateTime.UtcNow;

            await _context.Posts.AddAsync(post);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Post post)
        {
            post.UpdatedAt = DateTime.UtcNow;
            _context.Posts.Update(post);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var post = await _context.Posts.FindAsync(id);
            if (post != null)
            {
                _context.Posts.Remove(post);
                await _context.SaveChangesAsync();
            }
        }
    }



}
