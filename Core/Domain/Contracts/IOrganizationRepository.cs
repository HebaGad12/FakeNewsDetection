using Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Contracts
{
    public interface IOrganizationRepository
    {
        Task<Organization?> GetByIdAsync(Guid id);
        Task<IEnumerable<Organization>> GetAllAsync();
        Task AddAsync(Organization org);
        Task UpdateAsync(Organization org);
        Task DeleteAsync(Guid id);
    }
}
