using Domain.Enums;
using System;

namespace Domain.Models
{
    public class OrganizationWalletTransaction
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public OrganizationWallet Wallet { get; set; } = null!;
        public decimal Amount { get; set; }
        public WalletTransactionType Type { get; set; }
        public string? Description { get; set; }
        public Guid? ActorId { get; set; }  
        public User? Actor { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}