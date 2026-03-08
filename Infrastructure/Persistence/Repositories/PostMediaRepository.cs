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

        public async Task<PostMedia?> GetByIdAsync(Guid id) =>
            await _context.PostMedia.FirstOrDefaultAsync(m => m.Id == id);

        public async Task<IEnumerable<PostMedia>> GetByPostIdAsync(Guid postId) =>
            await _context.PostMedia
                .Where(m => m.PostId == postId)
                .OrderBy(m => m.DisplayOrder)
                .ToListAsync();

        public async Task AddAsync(PostMedia media)
        {
            if (media.Id == Guid.Empty) media.Id = Guid.NewGuid();
            media.UploadedAt = DateTime.UtcNow;
            await _context.PostMedia.AddAsync(media);
            await _context.SaveChangesAsync();
        }

        public async Task AddRangeAsync(IEnumerable<PostMedia> mediaList)
        {
            var list = mediaList.ToList();
            foreach (var m in list)
            {
                if (m.Id == Guid.Empty) m.Id = Guid.NewGuid();
                m.UploadedAt = DateTime.UtcNow;
            }
            await _context.PostMedia.AddRangeAsync(list);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(PostMedia media)
        {
            _context.PostMedia.Update(media);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var media = await _context.PostMedia.FindAsync(id);
            if (media != null)
            {
                _context.PostMedia.Remove(media);
                await _context.SaveChangesAsync();
            }
        }

        public async Task DeleteByPostIdAsync(Guid postId)
        {
            var items = await _context.PostMedia.Where(m => m.PostId == postId).ToListAsync();
            if (items.Any())
            {
                _context.PostMedia.RemoveRange(items);
                await _context.SaveChangesAsync();
            }
        }
    }
}