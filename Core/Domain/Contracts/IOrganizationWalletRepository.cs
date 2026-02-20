using Domain.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface IOrganizationWalletRepository
    {
        Task<OrganizationWallet?> GetByOrganizationIdAsync(Guid organizationId);
        Task<OrganizationWallet> GetOrCreateAsync(Guid organizationId);
        Task UpdateAsync(OrganizationWallet wallet);
        Task AddTransactionAsync(OrganizationWalletTransaction transaction);
        Task<IEnumerable<OrganizationWalletTransaction>> GetTransactionsByOrgIdAsync(Guid organizationId);
    }
}