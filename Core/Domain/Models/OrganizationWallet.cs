using System;
using System.Collections.Generic;

namespace Domain.Models
{
    public class OrganizationWallet
    {
        public Guid Id { get; set; }
        public Guid OrganizationId { get; set; }
        public Organization Organization { get; set; } = null!;
        public decimal Balance { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<OrganizationWalletTransaction> Transactions { get; set; } = new List<OrganizationWalletTransaction>();
    }
}