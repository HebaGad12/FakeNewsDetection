using Domain.Contracts;
using Domain.Enums;
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
                .Include(p => p.OrganizationUser)
                .Include(p => p.ModerationActions)
                .FirstOrDefaultAsync(p => p.Id == id);

        public async Task<IEnumerable<Post>> GetAllAsync() =>
            await _context.Posts
                .Include(p => p.Author)
                .Include(p => p.OrganizationUser)
                .Include(p => p.Interactions)
                .ToListAsync();

        // ✅ FIX: Purpose-built feed query.
        //   - Filters Approved + non-draft IN SQL (not in C# after loading everything)
        //   - Includes Media in the same query → eliminates the N+1 per-post media lookup
        //   - Paginates with Take() in SQL → never loads 100s of posts you won't show
        public async Task<List<Post>> GetFeedPostsAsync(int take = 100) =>
            await _context.Posts
                .Where(p => p.ModerationStatus == ModerationStatus.Approved && !p.IsDraft)
                .Include(p => p.Author)
                .Include(p => p.OrganizationUser)
                .Include(p => p.Interactions)
                .Include(p => p.Media)           // ← loaded here, no separate query per post
                .OrderByDescending(p => p.CreatedAt)
                .Take(take)
                .ToListAsync();

        public async Task<IEnumerable<Post>> GetByAuthorAsync(Guid authorId) =>
            await _context.Posts
                .Where(p => p.AuthorId == authorId)
                .Include(p => p.Author)
                .Include(p => p.OrganizationUser)
                .Include(p => p.Interactions)
                .ToListAsync();

        public async Task<IEnumerable<Post>> GetDraftsByTaskAsync(Guid taskId, Guid authorId) =>
            await _context.Posts
                .Where(p => p.TaskId == taskId && p.AuthorId == authorId && p.IsDraft)
                .Include(p => p.Author)
                .Include(p => p.Media)
                .OrderByDescending(p => p.UpdatedAt)
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
            var post = await _context.Posts
                .Include(p => p.Interactions)
                .Include(p => p.ModerationActions)
                .Include(p => p.Media)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (post != null)
            {
                if (post.Interactions.Count > 0)
                    _context.Interactions.RemoveRange(post.Interactions);

                if (post.ModerationActions.Count > 0)
                    _context.ModerationActions.RemoveRange(post.ModerationActions);

                if (post.Media.Count > 0)
                    _context.PostMediaItems.RemoveRange(post.Media);

                _context.Posts.Remove(post);
                await _context.SaveChangesAsync();
            }
        }
    }
}