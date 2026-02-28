using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Models
{
    public class LiveSession
    {
        public Guid Id { get; set; }
        public Guid JournalistId { get; set; }
        public User Journalist { get; set; }
        public DateTime StartedAt { get; set; }
        public bool IsActive { get; set; }
    }

}
