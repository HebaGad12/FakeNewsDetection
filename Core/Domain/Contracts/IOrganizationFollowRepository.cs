using Domain.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface IOrganizationFollowRepository
    {
        Task<IEnumerable<OrganizationFollow>> GetFollowersAsync(Guid organizationId);
        Task<OrganizationFollow?> GetAsync(Guid followerId, Guid organizationId);
        Task AddAsync(OrganizationFollow follow);
        Task RemoveAsync(Guid followerId, Guid organizationId);
    }
}