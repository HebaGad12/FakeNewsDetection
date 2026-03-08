using System;

namespace Domain.Models
{
    public class PostMedia
    {
        public Guid Id { get; set; }
        public Guid PostId { get; set; }
        public Post Post { get; set; } = null!;
        public string FileName { get; set; } = "";           
        public string OriginalFileName { get; set; } = "";   
        public string FilePath { get; set; } = "";           
        public string? Copyright { get; set; }               
        public int DisplayOrder { get; set; }                
        public long SizeBytes { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
