using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface IMembershipRepository
    {
        /// <summary>Returns IDs of communities the user is an active (non-banned) member of.</summary>
        Task<List<string>> GetActiveCommunityIdsAsync(Guid userId);
    }
}