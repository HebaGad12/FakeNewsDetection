using Domain.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface IPostMediaRepository
    {
        Task<IEnumerable<PostMedia>> GetByPostIdAsync(Guid postId);
        Task<PostMedia?> GetByIdAsync(Guid mediaId);
        Task AddAsync(PostMedia media);
        Task AddRangeAsync(IEnumerable<PostMedia> mediaList);
        Task UpdateAsync(PostMedia media);
        Task DeleteAsync(Guid mediaId);
        Task DeleteByPostIdAsync(Guid postId);
    }
}
