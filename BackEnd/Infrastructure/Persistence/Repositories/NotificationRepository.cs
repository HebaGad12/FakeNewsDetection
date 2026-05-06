using Domain.Contracts;
using Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Persistence.Repositories
{
    public class NotificationRepository : INotificationRepository  
    {
        private readonly AppDbContext _context;
        public NotificationRepository(AppDbContext context) => _context = context;

        public async Task<IEnumerable<Notification>> GetByUserAsync(Guid userId) =>
            await _context.Notifications
                .Include(n => n.Actor)
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

        public async Task<Notification?> GetByIdAsync(Guid id) =>
            await _context.Notifications
                .Include(n => n.Actor)
                .FirstOrDefaultAsync(n => n.Id == id);

        public async Task AddAsync(Notification notification)
        {
            await _context.Notifications.AddAsync(notification);
            await _context.SaveChangesAsync();
        }

        public async Task MarkAsReadAsync(Guid id)
        {
            var n = await _context.Notifications.FindAsync(id);
            if (n is not null)
            {
                n.IsRead = true;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<int> GetUnreadCountAsync(Guid userId) =>
            await _context.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);
    }
}