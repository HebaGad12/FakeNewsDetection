using Domain.Contracts;
using Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Persistence.Repositories
{
    public class DonationRepository : IDonationRepository
    {
        private readonly AppDbContext _context;
        public DonationRepository(AppDbContext context) => _context = context;

        public async Task AddAsync(Donation donation)
        {
            await _context.Donations.AddAsync(donation);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Donation>> GetSentByUserAsync(Guid senderId) =>
            await _context.Donations
                .Include(d => d.Recipient)
                .Where(d => d.SenderId == senderId)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

        public async Task<IEnumerable<Donation>> GetReceivedByUserAsync(Guid recipientId) =>
            await _context.Donations
                .Include(d => d.Sender)
                .Where(d => d.RecipientId == recipientId)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

        public async Task<IEnumerable<Donation>> GetAllAsync() =>
            await _context.Donations
                .Include(d => d.Sender)
                .Include(d => d.Recipient)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();
    }
}