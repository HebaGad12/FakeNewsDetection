using Domain.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface IPostMediaRepository
    {
        Task<PostMedia?> GetByIdAsync(Guid id);
        Task<IEnumerable<PostMedia>> GetByPostIdAsync(Guid postId);
        Task AddAsync(PostMedia media);
        Task AddRangeAsync(IEnumerable<PostMedia> mediaList);
        Task UpdateAsync(PostMedia media);
        Task DeleteAsync(Guid id);
        Task DeleteByPostIdAsync(Guid postId);
    }
}