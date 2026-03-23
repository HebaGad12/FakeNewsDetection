using System.Collections.Generic;
 
namespace Shared.DTOs
{
    /// <summary>
    /// Used when a journalist creates a new article via multipart/form-data.
    /// Images are uploaded as actual IFormFile objects, not paths.
    /// Tags are passed as a comma-separated string.
    /// IsCopyrightedFlags is a parallel list matching the order of uploaded files.
    /// </summary>
    public class JournalistCreatePostRequest
    {
        public string Title { get; set; } = "";
        public string Content { get; set; } = "";
 
        /// <summary>
        /// Comma-separated tags, e.g. "politics,economy,health"
        /// </summary>
        public string Tags { get; set; } = "";
 
        /// <summary>
        /// Optional copyright flags for each uploaded image, in the same order as the files.
        /// Defaults to false for any index not provided.
        /// </summary>
        public List<bool>? IsCopyrightedFlags { get; set; }
    }
}
 