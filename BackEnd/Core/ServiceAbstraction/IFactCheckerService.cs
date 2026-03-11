using Domain.Enums;

namespace ServicesAbstraction
{
    public record FactCheckResult(FactCheckVerdict Verdict, string Analysis);

    /// <summary>
    /// Calls the Python fact-checker API to verify an article's content.
    /// </summary>
    public interface IFactCheckerService
    {
        Task<FactCheckResult> CheckAsync(string articleText);
    }
}