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
        public Organization? Organization { get; set; } 
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<Post> Posts { get; set; } = new List<Post>();
        public ICollection<Interaction> Interactions { get; set; } = new List<Interaction>();
        public ICollection<ModerationAction> ModerationActions { get; set; } = new List<ModerationAction>();
        public ICollection<Follow> Followers { get; set; } = new List<Follow>();
        public ICollection<Follow> Followees { get; set; } = new List<Follow>();
    }

}
