using Domain.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface INotificationRepository
    {
        Task<IEnumerable<Notification>> GetByUserAsync(Guid userId);
        Task<Notification?> GetByIdAsync(Guid id);
        Task AddAsync(Notification notification);
        Task MarkAsReadAsync(Guid id);
        Task<int> GetUnreadCountAsync(Guid userId);
    }
}