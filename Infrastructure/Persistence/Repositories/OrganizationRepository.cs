using Domain.Contracts;
using Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Persistence.Repositories
{
    public class OrganizationRepository : IOrganizationRepository
    {
        private readonly AppDbContext _context;
        public OrganizationRepository(AppDbContext context) => _context = context;

        public async Task<Organization?> GetByIdAsync(Guid id) =>
            await _context.Organizations.FindAsync(id);

        public async Task<IEnumerable<Organization>> GetAllAsync() =>
            await _context.Organizations.ToListAsync();

        public async Task AddAsync(Organization org)
        {
            await _context.Organizations.AddAsync(org);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Organization org)
        {
            _context.Organizations.Update(org);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var org = await _context.Organizations.FindAsync(id);
            if (org != null)
            {
                _context.Organizations.Remove(org);
                await _context.SaveChangesAsync();
            }
        }
    }

}
