// FILE: BackEnd/FakeNewsDetection.web/Services/NewsApiSeederService.cs

using Domain.Enums;
using Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Persistence;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using SmartReader;

namespace Presentation   
{
    public class NewsDataResponse
    {
        [JsonPropertyName("status")]  public string Status { get; set; } = "";
        [JsonPropertyName("results")] public List<NewsDataArticle> Results { get; set; } = new();
    }

    public class NewsDataArticle
    {
        [JsonPropertyName("article_id")]  public string ArticleId     { get; set; } = "";
        [JsonPropertyName("title")]       public string? Title         { get; set; }
        [JsonPropertyName("description")] public string? Description   { get; set; }
        [JsonPropertyName("content")]     public string? Content       { get; set; }
        [JsonPropertyName("link")]        public string? Link          { get; set; }
        [JsonPropertyName("source_name")] public string? SourceName    { get; set; }
        [JsonPropertyName("category")]    public List<string>? Category { get; set; }
        [JsonPropertyName("pubDate")]     public string? PubDate       { get; set; }
        [JsonPropertyName("image_url")]   public string? ImageUrl      { get; set; }
    }

    public class NewsApiSeederService : IHostedService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<NewsApiSeederService> _logger;

        public NewsApiSeederService(IServiceProvider services, ILogger<NewsApiSeederService> logger)
        {
            _services = services;
            _logger   = logger;
        }

        public async Task StartAsync(CancellationToken ct)
        {
            try
            {
                using var scope = _services.CreateScope();
                var seeder = scope.ServiceProvider.GetRequiredService<NewsApiSeeder>();
                await seeder.SeedAsync(ct);
            }
            catch (Exception ex) { _logger.LogError(ex, "NewsApiSeeder failed."); }
        }

        public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
    }

    public class NewsApiSeeder
    {
        private readonly AppDbContext    _db;
        private readonly HttpClient      _http;
        private readonly IConfiguration  _config;
        private readonly ILogger<NewsApiSeeder> _logger;

        private static readonly string[] Topics =
            { "politics", "technology", "science", "health", "world" };

        public NewsApiSeeder(AppDbContext db, HttpClient http,
                             IConfiguration config, ILogger<NewsApiSeeder> logger)
        {
            _db = db; _http = http; _config = config; _logger = logger;
        }

        public async Task SeedAsync(CancellationToken ct = default)
        {
            var apiKey = _config["NewsApi:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("NewsApi:ApiKey not set — skipping seed.");
                return;
            }

            var bot = await EnsureNewsBotAsync(ct);
            int total = 0;

            // ADD THIS — tracks titles seen in this run
            var seenTitles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var topic in Topics)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    var articles = await FetchAsync(apiKey, topic, ct);
                    total += await SaveAsync(articles, bot, topic, seenTitles, ct); // pass it here
                    await Task.Delay(500, ct);
                }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed topic '{T}'", topic); }
            }

            _logger.LogInformation("NewsApiSeeder: {N} new posts added.", total);
        }
        private async Task<List<NewsDataArticle>> FetchAsync(string key, string topic, CancellationToken ct)
        {
            var url = $"https://newsdata.io/api/1/latest" +
                      $"?apikey={key}&q={Uri.EscapeDataString(topic)}&language=en&size=10";
            var res = await _http.GetFromJsonAsync<NewsDataResponse>(url, ct);
            return res?.Status == "success"
                ? res.Results.Where(a => !string.IsNullOrWhiteSpace(a.Title)).ToList()
                : new();
        }

        private async Task<int> SaveAsync(List<NewsDataArticle> articles,
                                  User bot, string topic,
                                  HashSet<string> seenTitles, 
                                  CancellationToken ct)
        {
            int count = 0;
            foreach (var a in articles)
            {
                if (ct.IsCancellationRequested) break;
                var title = (a.Title ?? "").Trim();

                // ADD THIS — skip if seen in this run OR already in DB
                if (!seenTitles.Add(title)) continue;
                if (await _db.Posts.AnyAsync(p => p.Title == title, ct)) continue;


                var post = new Post
                {
                    Id = Guid.NewGuid(), AuthorId = bot.Id,
                    Title   = title.Length > 300 ? title[..297] + "..." : title,
                    Content = await BuildContentAsync(a, ct),
                    Tags    = BuildTags(a, topic),
                    CreatedAt         = ParseDate(a.PubDate),
                    ModerationStatus  = ModerationStatus.Approved,
                    VerificationStatus = VerificationStatus.Unknown,
                    IsDraft = false
                };
                _db.Posts.Add(post);

                if (!string.IsNullOrWhiteSpace(a.ImageUrl))
                    _db.PostMediaItems.Add(new PostMedia
                    {
                        Id = Guid.NewGuid(), PostId = post.Id,
                        Path = a.ImageUrl,  MediaType = "image",
                        IsCopyrighted = false, UploadedAt = post.CreatedAt
                    });
                count++;
            }
            if (count > 0) await _db.SaveChangesAsync(ct);
            return count;
        }

        private async Task<User> EnsureNewsBotAsync(CancellationToken ct)
        {
            const string email = "newsbot@truthtrack.internal";
            var bot = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
            if (bot != null) return bot;

            bot = new User
            {
                Id = Guid.NewGuid(), Name = "TruthTrack NewsBot", Email = email,
                PasswordHash = "NOT_A_REAL_ACCOUNT", Role = Role.Journalist,
                IsActive = true, RegistrationStatus = RegistrationStatus.Approved,
                CreatedAt = DateTime.UtcNow
            };
            _db.Users.Add(bot);
            await _db.SaveChangesAsync(ct);
            return bot;
        }

        private async Task<string> BuildContentAsync(NewsDataArticle a, CancellationToken ct)
        {
            if (!string.IsNullOrWhiteSpace(a.Link))
            {
                try
                {
                    var article = await Reader.ParseArticleAsync(a.Link);

                    if (article.IsReadable && !string.IsNullOrWhiteSpace(article.TextContent))
                    {
                        var clean = System.Text.RegularExpressions.Regex.Replace(
                            article.TextContent.Trim(), @"\s{2,}", " ");

                        return clean + $"\n\n[Source: {a.SourceName ?? "Unknown"} — {a.Link}]";
                    }
                }
                catch { /* blocked or timeout, use fallback */ }
            }

            var body = a.Description ?? a.Title ?? "No content available.";
            if (!string.IsNullOrWhiteSpace(a.Link))
                body += $"\n\n[Source: {a.SourceName ?? "Unknown"} — {a.Link}]";
            return body;
        }

        private static string[] BuildTags(NewsDataArticle a, string fallback)
        {
            var tags = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { fallback };
            if (a.Category != null)
                foreach (var c in a.Category)
                    if (!string.IsNullOrWhiteSpace(c)) tags.Add(c.ToLower());
            if (!string.IsNullOrWhiteSpace(a.SourceName)) tags.Add(a.SourceName.ToLower());
            return tags.Take(10).ToArray();
        }

        private static DateTime ParseDate(string? d) =>
            DateTime.TryParse(d, out var dt) ? dt.ToUniversalTime() : DateTime.UtcNow;
    }
}