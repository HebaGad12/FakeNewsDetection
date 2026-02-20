using Domain.Enums;
using System;

namespace Domain.Models
{
    public class WalletTransaction
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public Wallet Wallet { get; set; } = null!;
        public decimal Amount { get; set; }
        public WalletTransactionType Type { get; set; }
        public string? Description { get; set; }
        /// <summary>For admin top-up/deduction, this is the admin's UserId. For donations, it's the sender's UserId.</summary>
        public Guid? ActorId { get; set; }
        public User? Actor { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}