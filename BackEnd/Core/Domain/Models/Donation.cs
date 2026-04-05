using System;

namespace Domain.Models
{
    public class Donation
    {
        public Guid Id { get; set; }

        /// <summary>Null when the sender's account has been deleted.</summary>
        public Guid? SenderId { get; set; }
        public User? Sender { get; set; }

        /// <summary>Null when the recipient's account has been deleted.</summary>
        public Guid? RecipientId { get; set; }
        public User? Recipient { get; set; }

        public decimal Amount { get; set; }
        public string? Message { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}