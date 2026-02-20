using Domain.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface IDonationRepository
    {
        Task AddAsync(Donation donation);
        Task<IEnumerable<Donation>> GetSentByUserAsync(Guid senderId);
        Task<IEnumerable<Donation>> GetReceivedByUserAsync(Guid recipientId);
        Task<IEnumerable<Donation>> GetAllAsync();
    }
}