using Domain.Contracts;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
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

            // Add CORS policy for frontend
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    policy.WithOrigins("http://localhost:8080")
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

            builder.Services.AddDbContext<AppDbContext>(opts =>
               opts.UseSqlServer(builder.Configuration.GetConnectionString("Ezzat")));

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                var cfg = builder.Configuration.GetSection("Jwt");
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = cfg["Issuer"],
                    ValidAudience = cfg["Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(cfg["Key"]!))
                };
            });

            builder.Services.AddControllers()
                .AddApplicationPart(typeof(Presentation.Controllers.AdminController).Assembly);
            builder.Services.AddAuthorization(options =>
            {
                options.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
                options.AddPolicy("JournalistOnly", p => p.RequireRole("Journalist"));
                options.AddPolicy("OrgOnly", p => p.RequireRole("Organization"));
            });
            builder.Services.AddScoped<ITokenService, TokenService>();
            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IFollowRepository, FollowRepository>();
            builder.Services.AddScoped<IPostRepository, PostRepository>();
            builder.Services.AddScoped<IPostMediaRepository, PostMediaRepository>();
            builder.Services.AddScoped<IInteractionRepository, InteractionRepository>();
            builder.Services.AddScoped<IModerationRepository, ModerationRepository>();
            builder.Services.AddScoped<IWalletRepository, WalletRepository>();
            builder.Services.AddScoped<IDonationRepository, DonationRepository>();

            // ── Python Services ──────────────────────────────────────────────
            var pythonUrl = builder.Configuration["PythonApi:BaseUrl"] ?? "http://localhost:8000";

            builder.Services.AddHttpClient<IToxicityService, ToxicityService>(client =>
            {
                client.BaseAddress = new Uri(pythonUrl);
                client.Timeout = TimeSpan.FromSeconds(10);
            });

            builder.Services.AddHttpClient<IFactCheckerService, FactCheckerService>(client =>
            {
                client.BaseAddress = new Uri(pythonUrl);
                client.Timeout = TimeSpan.FromSeconds(30); // fact-checking takes longer
            });

            builder.Services.AddHttpClient<IImageCopyrightService, ImageCopyrightService>(client =>
            {
                client.BaseAddress = new Uri(pythonUrl);
                client.Timeout = TimeSpan.FromSeconds(15);
            });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.AddSecurityDefinition(
                    "Bearer",
                    new OpenApiSecurityScheme
                    {
                        In = ParameterLocation.Header,
                        Description = "Please enter JWT with Bearer into field",
                        Name = "Authorization",
                        Type = SecuritySchemeType.Http,
                        BearerFormat = "JWT",
                        Scheme = "Bearer",
                    }
                );
                c.AddSecurityRequirement(
                    new OpenApiSecurityRequirement
                    {
                        {
                            new OpenApiSecurityScheme
                            {
                                Reference = new OpenApiReference
                                {
                                    Type = ReferenceType.SecurityScheme,
                                    Id = "Bearer",
                                },
                            },
                            new string[] { }
                        },
                    }
                );
            });
            builder.Services.AddSignalR();
            var app = builder.Build();

            using (var scope = app.Services.CreateScope())
            {
                var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await DbSeeder.SeedAsync(ctx);
            }

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseCors("AllowFrontend");
            app.UseHttpsRedirection();
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapHub<LiveHub>("/livehub");
            app.Run();
        }
    }
}