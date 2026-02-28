using Domain.Contracts;
using Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Persistence.Repositories
{
    public class WalletRepository : IWalletRepository
    {
        private readonly AppDbContext _context;
        public WalletRepository(AppDbContext context) => _context = context;

        public async Task<Wallet?> GetByUserIdAsync(Guid userId) =>
            await _context.Wallets
                .Include(w => w.Transactions)
                .FirstOrDefaultAsync(w => w.UserId == userId);

        public async Task<Wallet> GetOrCreateAsync(Guid userId)
        {
            var wallet = await GetByUserIdAsync(userId);
            if (wallet != null) return wallet;

            wallet = new Wallet
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Balance = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.Wallets.AddAsync(wallet);
            await _context.SaveChangesAsync();
            return wallet;
        }

        public async Task UpdateAsync(Wallet wallet)
        {
            wallet.UpdatedAt = DateTime.UtcNow;
            _context.Wallets.Update(wallet);
            await _context.SaveChangesAsync();
        }

        public async Task AddTransactionAsync(WalletTransaction transaction)
        {
            await _context.WalletTransactions.AddAsync(transaction);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<WalletTransaction>> GetTransactionsByUserIdAsync(Guid userId)
        {
            var wallet = await _context.Wallets
                .Include(w => w.Transactions)
                    .ThenInclude(t => t.Actor)
                .FirstOrDefaultAsync(w => w.UserId == userId);

            return wallet?.Transactions.OrderByDescending(t => t.CreatedAt) ?? Enumerable.Empty<WalletTransaction>();
        }
    }
}