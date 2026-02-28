using Domain.Enums;
using Domain.Models;
using Services.Utilities;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Persistence
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(AppDbContext ctx)
        {
            if (!ctx.Users.Any(u => u.Role == Role.Admin))
            {           
                var admin = new User
                {
                    Id = Guid.NewGuid(),
                    Name = "System Admin",
                    Email = "admin@newsverify.local",
                    PasswordHash = PasswordHasher.Hash("Admin#12345"),
                    Role = Role.Admin,
                    IsActive = true,
                    OrganizationId = null, 
                    JournalistExternalId = null,  
                    CreatedAt = DateTime.UtcNow
                };
            ctx.Users.Add(admin);
            await ctx.SaveChangesAsync();
            }
        }
    }
}

