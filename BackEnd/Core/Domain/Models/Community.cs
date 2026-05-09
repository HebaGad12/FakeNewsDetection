using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Models
{
    public class Community
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsOpen { get; set; } = true;
        public string? ImageUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Guid CreatedBy { get; set; }
        [ForeignKey("CreatedBy")]
        [InverseProperty("CommunitiesCreated")]
        public User Creator { get; set; } = null!; 

        public ICollection<Membership> Members { get; set; } = new List<Membership>();
        public ICollection<Post> Posts { get; set; } = new List<Post>();
    }

}
