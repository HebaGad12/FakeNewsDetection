using Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface IInteractionRepository
    {
        Task<IEnumerable<Interaction>> GetByPostAsync(Guid postId);
        Task<IEnumerable<Interaction>> GetByUserAsync(Guid userId);
        Task AddAsync(Interaction interaction);
        Task DeleteAsync(Guid id);
    }
}
