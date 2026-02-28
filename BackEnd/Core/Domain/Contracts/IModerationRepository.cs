using Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface IModerationRepository
    {
        Task<IEnumerable<ModerationAction>> GetByPostAsync(Guid postId);
        Task<IEnumerable<ModerationAction>> GetByActorAsync(Guid actorId);
        Task AddAsync(ModerationAction action);
    }
}
