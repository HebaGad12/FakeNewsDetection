using Domain.Contracts;
using Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Persistence.Repositories
{
    public class OrganizationWalletRepository : IOrganizationWalletRepository
    {
        private readonly AppDbContext _context;
        public OrganizationWalletRepository(AppDbContext context) => _context = context;

        public async Task<OrganizationWallet?> GetByOrganizationIdAsync(Guid organizationId) =>
            await _context.OrganizationWallets
                .Include(w => w.Transactions)
                .FirstOrDefaultAsync(w => w.OrganizationId == organizationId);

        public async Task<OrganizationWallet> GetOrCreateAsync(Guid organizationId)
        {
            var wallet = await GetByOrganizationIdAsync(organizationId);
            if (wallet != null) return wallet;

            wallet = new OrganizationWallet
            {
                Id = Guid.NewGuid(),
                OrganizationId = organizationId,
                Balance = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.OrganizationWallets.AddAsync(wallet);
            await _context.SaveChangesAsync();
            return wallet;
        }

        public async Task UpdateAsync(OrganizationWallet wallet)
        {
            wallet.UpdatedAt = DateTime.UtcNow;
            _context.OrganizationWallets.Update(wallet);
            await _context.SaveChangesAsync();
        }

        public async Task AddTransactionAsync(OrganizationWalletTransaction transaction)
        {
            await _context.OrganizationWalletTransactions.AddAsync(transaction);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<OrganizationWalletTransaction>> GetTransactionsByOrgIdAsync(Guid organizationId)
        {
            var wallet = await _context.OrganizationWallets
                .Include(w => w.Transactions)
                    .ThenInclude(t => t.Actor)
                .FirstOrDefaultAsync(w => w.OrganizationId == organizationId);

            return wallet?.Transactions.OrderByDescending(t => t.CreatedAt) ?? Enumerable.Empty<OrganizationWalletTransaction>();
        }
    }
}