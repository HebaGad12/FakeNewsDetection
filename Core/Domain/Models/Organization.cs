using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Models
{
    public class Organization
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string? Profile { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<Post> Posts { get; set; } = new List<Post>();
        public ICollection<User> Users { get; set; } = new List<User>();
        public ICollection<OrganizationFollow> Followers { get; set; } = new List<OrganizationFollow>();
        public OrganizationWallet? Wallet { get; set; }
    }
}