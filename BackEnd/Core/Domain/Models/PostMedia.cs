using System;

namespace Domain.Models
{
    /// <summary>
    /// Represents a media file (image or video) attached to a post.
    /// Only images support the IsCopyrighted flag.
    /// </summary>
    public class PostMedia
    {
        public Guid Id { get; set; }

        public Guid PostId { get; set; }
        public Post Post { get; set; } = null!;

        /// <summary>Relative or absolute path where the file is stored on disk / CDN.</summary>
        public string Path { get; set; } = "";

        /// <summary>Media type: "image" or "video".</summary>
        public string MediaType { get; set; } = "image";

        /// <summary>
        /// Meaningful only when MediaType == "image".
        /// When true the journalist has flagged this image as copyrighted.
        /// </summary>
        public bool IsCopyrighted { get; set; } = false;

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
