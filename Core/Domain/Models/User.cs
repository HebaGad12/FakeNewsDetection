using Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string PasswordHash { get; set; } = "";
        public Role Role { get; set; }
        public bool IsActive { get; set; } = true;
        public string? JournalistExternalId { get; set; }
        public Guid? OrganizationId { get; set; } 
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
