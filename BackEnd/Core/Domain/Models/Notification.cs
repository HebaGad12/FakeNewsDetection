using System;

namespace Domain.Models
{
    public class Notification
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; } = false;

        // FK → the user who RECEIVES this notification
        public Guid UserId { get; set; }
        public User? User { get; set; }

        // Optional: store who triggered it (e.g. the follower)
        public Guid? ActorId { get; set; }
        public User? Actor { get; set; }

        // Type tag so the front-end can render the right icon
        // e.g. "follow", "post", "donation"
        public string Type { get; set; } = "general";
    }
}