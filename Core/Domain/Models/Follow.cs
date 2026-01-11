using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Models
{
    public class Follow
    {
        public Guid FollowerId { get; set; }
        public Guid FolloweeId { get; set; } 
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
