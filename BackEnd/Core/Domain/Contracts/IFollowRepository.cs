using Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface IFollowRepository
    {
        Task<IEnumerable<Follow>> GetFollowersAsync(Guid userId);
        Task<IEnumerable<Follow>> GetFolloweesAsync(Guid userId);
        Task<Follow?> GetAsync(Guid followerId, Guid followeeId);
        Task AddAsync(Follow follow);
        Task RemoveAsync(Guid followerId, Guid followeeId);
    }

}
