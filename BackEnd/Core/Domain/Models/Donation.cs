using System;

namespace Domain.Models
{
    public class Donation
    {
        public Guid Id { get; set; }
        public Guid SenderId { get; set; }
        public User Sender { get; set; } = null!;
        public Guid RecipientId { get; set; }
        public User Recipient { get; set; } = null!;
        public decimal Amount { get; set; }
        public string? Message { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}