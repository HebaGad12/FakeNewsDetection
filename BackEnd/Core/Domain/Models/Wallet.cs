using System;

namespace Domain.Models
{
    public class Wallet
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
        public decimal Balance { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<WalletTransaction> Transactions { get; set; } = new List<WalletTransaction>();
    }
}
