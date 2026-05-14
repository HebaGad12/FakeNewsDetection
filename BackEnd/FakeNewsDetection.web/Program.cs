using Domain.Contracts;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Persistence;
using Persistence.Repositories;
using Presentation.SignalR_Hubs;
using Services;
using ServicesAbstraction;
using System.Text;

namespace FakeNewsDetection.web
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // ── CORS ─────────────────────────────────────────────────────────
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    policy.WithOrigins(
                              "http://localhost:8080",
                              "http://localhost:5173",
                              "http://localhost:5174")
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

            // ── Database ─────────────────────────────────────────────────────
            builder.Services.AddDbContext<AppDbContext>(opts =>
               opts.UseSqlServer(builder.Configuration.GetConnectionString("docker")));

            // ── Authentication ───────────────────────────────────────────────
            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                var cfg = builder.Configuration.GetSection("Jwt");
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer           = true,
                    ValidateAudience         = true,
                    ValidateLifetime         = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer              = cfg["Issuer"],
                    ValidAudience            = cfg["Audience"],
                    IssuerSigningKey         = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(cfg["Key"]!))
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;

                        if (!string.IsNullOrWhiteSpace(accessToken)
                            && (path.StartsWithSegments("/livehub")
                                || path.StartsWithSegments("/notificationhub")))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            });

            // ── MVC / Controllers ────────────────────────────────────────────
            builder.Services.AddControllers()
                .AddApplicationPart(typeof(Presentation.Controllers.AdminController).Assembly);

            builder.Services.AddAuthorization(options =>
            {
                options.AddPolicy("AdminOnly",      p => p.RequireRole("Admin"));
                options.AddPolicy("JournalistOnly", p => p.RequireRole("Journalist"));
                options.AddPolicy("OrgOnly",        p => p.RequireRole("Organization"));
            });

            // ── Repositories ─────────────────────────────────────────────────
            builder.Services.AddScoped<ITokenService, TokenService>();
            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IFollowRepository, FollowRepository>();
            builder.Services.AddScoped<IPostRepository, PostRepository>();
            builder.Services.AddScoped<IPostMediaRepository, PostMediaRepository>();
            builder.Services.AddScoped<IInteractionRepository, InteractionRepository>();
            builder.Services.AddScoped<IModerationRepository, ModerationRepository>();
            builder.Services.AddScoped<IWalletRepository, WalletRepository>();
            builder.Services.AddScoped<IDonationRepository, DonationRepository>();
            builder.Services.AddScoped<ICommunityRepository, CommunityRepository>();
            builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
            builder.Services.AddScoped<IOrganizationTaskRepository, OrganizationTaskRepository>();
            builder.Services.AddScoped<IMembershipRepository, MembershipRepository>();
            // ── Python AI Services ───────────────────────────────────────────
            var pythonUrl = builder.Configuration["PythonApi:BaseUrl"] ?? "http://localhost:8000";

            builder.Services.AddHttpClient<IToxicityService, ToxicityService>(client =>
            {
                client.BaseAddress = new Uri(pythonUrl);
                client.Timeout     = TimeSpan.FromSeconds(10);
            });

            builder.Services.AddHttpClient<IFactCheckerService, FactCheckerService>(client =>
            {
                client.BaseAddress = new Uri(pythonUrl);
                client.Timeout     = TimeSpan.FromSeconds(30);
            });

            builder.Services.AddHttpClient<IImageCopyrightService, ImageCopyrightService>(client =>
            {
                client.BaseAddress = new Uri(pythonUrl);
                client.Timeout     = TimeSpan.FromSeconds(15);
            });

            // ── Recommendation Service ────────────────────────────────────────
            // Needs HttpClient (to call Python) + AppDbContext (for Memberships),
            // so it is registered in two steps: typed HttpClient first, then Scoped.
            builder.Services.AddHttpClient<RecommendationService>(client =>
            {
                client.BaseAddress = new Uri(pythonUrl);
                client.Timeout     = TimeSpan.FromSeconds(30);
            });
            builder.Services.AddScoped<IRecommendationService, RecommendationService>();

            // ── Swagger ──────────────────────────────────────────────────────
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    In           = ParameterLocation.Header,
                    Description  = "Please enter JWT with Bearer into field",
                    Name         = "Authorization",
                    Type         = SecuritySchemeType.Http,
                    BearerFormat = "JWT",
                    Scheme       = "Bearer",
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id   = "Bearer",
                            },
                        },
                        new string[] { }
                    },
                });
            });

            builder.Services.AddSignalR();

            // ────────────────────────────────────────────────────────────────
            var app = builder.Build();

            // ── Seed database ────────────────────────────────────────────────
            using (var scope = app.Services.CreateScope())
            {
                var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await ctx.Database.MigrateAsync();
                await DbSeeder.SeedAsync(ctx);
            }

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseCors("AllowFrontend");

            app.UseStaticFiles();

            var mediaDir = Path.Combine(Directory.GetCurrentDirectory(), "media");
            Directory.CreateDirectory(mediaDir);

            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(mediaDir),
                RequestPath  = "/media"
            });

            app.UseHttpsRedirection();
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapHub<LiveHub>("/livehub");
            app.MapHub<NotificationHub>("/notificationhub");
            app.Run();
        }
    }
}