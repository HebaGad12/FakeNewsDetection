namespace ServicesAbstraction
{
    public record CopyrightCheckResult(bool IsDuplicate, List<CopyrightMatch> Matches);

    /// <summary>
    /// A single copyright match returned by the Python API.
    /// IsWebMatch=true  → match came from a web search (the image exists publicly on the internet).
    /// IsWebMatch=false → match came from the local vector DB (another user on this platform registered it).
    /// </summary>
    public record CopyrightMatch(string Source, double Similarity, string Path, bool IsWebMatch = false);

    /// <summary>
    /// Calls the Python image copyright detection API.
    /// </summary>
    public interface IImageCopyrightService
    {
        /// <summary>
        /// Checks whether the uploaded image bytes are a copyright violation (local DB only).
        /// </summary>
        Task<CopyrightCheckResult> CheckAsync(byte[] imageBytes, string fileName);

        /// <summary>
        /// Registers an image in the vector store after checking both local DB and the web.
        /// Rejects if either check finds a duplicate.
        /// </summary>
        Task<CopyrightCheckResult> StoreAsync(byte[] imageBytes, string fileName, string imageId);

        /// <summary>
        /// Removes an image from the vector store using its stored ID.
        /// </summary>
        Task RemoveAsync(string imageId);
    }
}