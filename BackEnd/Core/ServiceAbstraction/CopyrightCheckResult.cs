namespace ServicesAbstraction
{
    public record CopyrightCheckResult(bool IsDuplicate, List<CopyrightMatch> Matches);

    public record CopyrightMatch(string Id, double Similarity, string Path);

    /// <summary>
    /// Calls the Python image copyright detection API.
    /// </summary>
    public interface IImageCopyrightService
    {
        /// <summary>
        /// Checks whether the image at the given server path is a copyright violation.
        /// </summary>
        Task<CopyrightCheckResult> CheckAsync(string imagePath);

        /// <summary>
        /// Registers an image in the vector store after it has been saved.
        /// </summary>
        Task StoreAsync(string imagePath, string imageId);

        /// <summary>
        /// Removes an image from the vector store using its stored ID.
        /// </summary>
        Task RemoveAsync(string imageId);
    }
}