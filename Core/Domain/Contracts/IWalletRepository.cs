using Domain.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface IWalletRepository
    {
        Task<Wallet?> GetByUserIdAsync(Guid userId);
        Task<Wallet> GetOrCreateAsync(Guid userId);
        Task UpdateAsync(Wallet wallet);
        Task AddTransactionAsync(WalletTransaction transaction);
        Task<IEnumerable<WalletTransaction>> GetTransactionsByUserIdAsync(Guid userId);
    }
}