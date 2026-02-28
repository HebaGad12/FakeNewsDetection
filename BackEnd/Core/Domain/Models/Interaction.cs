using Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Models
{
    public class Interaction
    {
        public Guid Id { get; set; }
        public Guid PostId { get; set; }
        public Post Post { get; set; }      
        public Guid UserId { get; set; }
        public User User { get; set; }     
        public InteractionType Type { get; set; }
        public string? Content { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

}
