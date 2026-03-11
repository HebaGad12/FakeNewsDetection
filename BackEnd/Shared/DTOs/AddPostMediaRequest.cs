using System.Collections.Generic;

namespace Shared.DTOs
{
    /// <summary>
    /// Request body for adding media to an existing post.
    /// The journalist supplies file paths (already uploaded to storage)
    /// plus optional copyright flags for images.
    /// </summary>
    public record AddPostMediaRequest(List<MediaItemRequest> MediaItems);

    /// <summary>
    /// A single media item within the upload request.
    /// </summary>
    /// <param name="Path">
    ///     Relative or absolute path of the file on the server / CDN.
    ///     Example: "uploads/posts/abc123/photo.jpg"
    /// </param>
    /// <param name="MediaType">
    ///     "image" or "video". Only "image" items may set IsCopyrighted = true.
    /// </param>
    /// <param name="IsCopyrighted">
    ///     Meaningful only when MediaType is "image".
    ///     Set to true if the journalist declares the image is copyrighted.
    /// </param>
    public record MediaItemRequest(
        string Path,
        string MediaType,
        bool IsCopyrighted = false
    );
}
