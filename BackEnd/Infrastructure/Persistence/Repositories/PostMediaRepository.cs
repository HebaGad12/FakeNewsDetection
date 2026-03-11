using Domain.Contracts;
using Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Persistence.Repositories
{
    public class PostMediaRepository : IPostMediaRepository
    {
        private readonly AppDbContext _context;

        public PostMediaRepository(AppDbContext context) => _context = context;

        public async Task<IEnumerable<PostMedia>> GetByPostIdAsync(Guid postId) =>
            await _context.PostMediaItems
                .Where(m => m.PostId == postId)
                .OrderBy(m => m.UploadedAt)
                .ToListAsync();

        public async Task<PostMedia?> GetByIdAsync(Guid mediaId) =>
            await _context.PostMediaItems.FindAsync(mediaId);

        public async Task AddAsync(PostMedia media)
        {
            if (media.Id == Guid.Empty)
                media.Id = Guid.NewGuid();

            media.UploadedAt = DateTime.UtcNow;
            await _context.PostMediaItems.AddAsync(media);
            await _context.SaveChangesAsync();
        }

        public async Task AddRangeAsync(IEnumerable<PostMedia> mediaList)
        {
            var now = DateTime.UtcNow;
            foreach (var m in mediaList)
            {
                if (m.Id == Guid.Empty) m.Id = Guid.NewGuid();
                m.UploadedAt = now;
            }

            await _context.PostMediaItems.AddRangeAsync(mediaList);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(PostMedia media)
        {
            _context.PostMediaItems.Update(media);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid mediaId)
        {
            var media = await _context.PostMediaItems.FindAsync(mediaId);
            if (media != null)
            {
                _context.PostMediaItems.Remove(media);
                await _context.SaveChangesAsync();
            }
        }

        public async Task DeleteByPostIdAsync(Guid postId)
        {
            var items = await _context.PostMediaItems
                .Where(m => m.PostId == postId)
                .ToListAsync();

            if (items.Any())
            {
                _context.PostMediaItems.RemoveRange(items);
                await _context.SaveChangesAsync();
            }
        }
    }
}
