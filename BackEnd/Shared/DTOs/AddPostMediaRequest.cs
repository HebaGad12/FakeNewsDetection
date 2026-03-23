using System.Collections.Generic;

namespace Shared.DTOs
{
    /// <summary>
    /// Request for adding media to an existing post via multipart/form-data.
    /// The frontend sends the actual image files, not paths.
    /// IsCopyrightedFlags is a parallel list matching the order of uploaded files.
    /// </summary>
    public class AddPostMediaRequest
    {
        /// <summary>
        /// Optional copyright flags for each uploaded image, in the same order as the files.
        /// Defaults to false for any index not provided.
        /// </summary>
        public List<bool>? IsCopyrightedFlags { get; set; }
    }
}