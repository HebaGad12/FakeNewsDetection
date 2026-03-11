namespace ServicesAbstraction
{
    /// <summary>
    /// Calls the Python toxicity model to check whether a piece of text is toxic.
    /// </summary>
    public interface IToxicityService
    {
        /// <summary>
        /// Returns true if the text is classified as toxic.
        /// </summary>
        Task<bool> IsToxicAsync(string text);
    }
}