using Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Persistence
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Post> Posts => Set<Post>();
        public DbSet<PostMedia> PostMediaItems => Set<PostMedia>();
        public DbSet<Interaction> Interactions => Set<Interaction>();
        public DbSet<Follow> Follows => Set<Follow>();
        public DbSet<ModerationAction> ModerationActions => Set<ModerationAction>();
        public DbSet<LiveSession> LiveSessions => Set<LiveSession>();
        public DbSet<Wallet> Wallets => Set<Wallet>();
        public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
        public DbSet<Donation> Donations => Set<Donation>();


        protected override void OnModelCreating(ModelBuilder b)
        {
            base.OnModelCreating(b);

            // ===================== USER =====================

            b.Entity<User>().HasIndex(u => u.Email).IsUnique();
            b.Entity<User>().Property(u => u.Name).HasMaxLength(200);
            b.Entity<User>().Property(u => u.Email).HasMaxLength(200);
            b.Entity<User>().Property(u => u.License).HasMaxLength(500);

            // Self-reference (Journalist belongs to Organization)
            b.Entity<User>()
                .HasOne(u => u.Organization)
                .WithMany(o => o.OrgMembers)
                .HasForeignKey(u => u.OrganizationId)
                .OnDelete(DeleteBehavior.NoAction); // IMPORTANT: prevent cascade cycles


            // ===================== POST =====================

            b.Entity<Post>().HasIndex(p => p.CreatedAt);
            b.Entity<Post>().Property(p => p.Title).HasMaxLength(300);

            // Proper string[] conversion with ValueComparer
            var tagsConverter = new ValueConverter<string[], string>(
                v => string.Join(",", v),
                v => string.IsNullOrWhiteSpace(v)
                    ? Array.Empty<string>()
                    : v.Split(',', StringSplitOptions.RemoveEmptyEntries)
            );

            var tagsComparer = new ValueComparer<string[]>(
                (c1, c2) =>
                    (c1 == null && c2 == null) ||
                    (c1 != null && c2 != null && c1.SequenceEqual(c2)),
                c => c == null
                    ? 0
                    : c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                c => c == null
                    ? Array.Empty<string>()
                    : c.ToArray()
            );

            b.Entity<Post>()
                .Property(p => p.Tags)
                .HasConversion(tagsConverter)
                .Metadata.SetValueComparer(tagsComparer);

            b.Entity<Post>()
                .HasOne(p => p.Author)
                .WithMany(u => u.Posts)
                .HasForeignKey(p => p.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);

            b.Entity<Post>()
                .HasOne(p => p.OrganizationUser)
                .WithMany()
                .HasForeignKey(p => p.OrganizationId)
                .OnDelete(DeleteBehavior.NoAction);


            // ===================== POST MEDIA =====================

            b.Entity<PostMedia>().ToTable("PostMedia");
            b.Entity<PostMedia>().HasKey(m => m.Id);

            b.Entity<PostMedia>()
                .Property(m => m.Path)
                .HasMaxLength(1000)
                .IsRequired();

            b.Entity<PostMedia>()
                .Property(m => m.MediaType)
                .HasMaxLength(20)
                .IsRequired();

            b.Entity<PostMedia>()
                .HasOne(m => m.Post)
                .WithMany(p => p.Media)
                .HasForeignKey(m => m.PostId)
                .OnDelete(DeleteBehavior.Cascade);


            // ===================== INTERACTION =====================

            b.Entity<Interaction>()
                .HasOne(i => i.Post)
                .WithMany(p => p.Interactions)
                .HasForeignKey(i => i.PostId)
                .OnDelete(DeleteBehavior.Restrict);

            b.Entity<Interaction>()
                .HasIndex(i => new { i.PostId, i.UserId, i.Type });

            b.Entity<Interaction>()
                .Property(i => i.Content)
                .HasMaxLength(2000);


            // ===================== FOLLOW =====================

            b.Entity<Follow>().HasKey(f => new { f.FollowerId, f.FolloweeId });
            b.Entity<Follow>().HasIndex(f => f.CreatedAt);

            b.Entity<Follow>()
                .HasOne(f => f.Follower)
                .WithMany(u => u.Followees)
                .HasForeignKey(f => f.FollowerId)
                .OnDelete(DeleteBehavior.Restrict);

            b.Entity<Follow>()
                .HasOne(f => f.Followee)
                .WithMany(u => u.Followers)
                .HasForeignKey(f => f.FolloweeId)
                .OnDelete(DeleteBehavior.Restrict);


            // ===================== WALLET =====================

            b.Entity<Wallet>()
                .HasOne(w => w.User)
                .WithMany()
                .HasForeignKey(w => w.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            b.Entity<Wallet>()
                .HasIndex(w => w.UserId)
                .IsUnique();

            b.Entity<Wallet>()
                .Property(w => w.Balance)
                .HasColumnType("decimal(18,2)");


            // ===================== WALLET TRANSACTION =====================

            b.Entity<WalletTransaction>()
                .HasOne(t => t.Wallet)
                .WithMany(w => w.Transactions)
                .HasForeignKey(t => t.WalletId)
                .OnDelete(DeleteBehavior.Restrict);

            b.Entity<WalletTransaction>()
                .HasOne(t => t.Actor)
                .WithMany()
                .HasForeignKey(t => t.ActorId)
                .OnDelete(DeleteBehavior.SetNull);

            b.Entity<WalletTransaction>()
                .Property(t => t.Amount)
                .HasColumnType("decimal(18,2)");

            b.Entity<WalletTransaction>()
                .Property(t => t.Description)
                .HasMaxLength(500);


            // ===================== DONATION =====================

            b.Entity<Donation>()
                .HasOne(d => d.Sender)
                .WithMany()
                .HasForeignKey(d => d.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            b.Entity<Donation>()
                .HasOne(d => d.Recipient)
                .WithMany()
                .HasForeignKey(d => d.RecipientId)
                .OnDelete(DeleteBehavior.Restrict);

            b.Entity<Donation>()
                .Property(d => d.Amount)
                .HasColumnType("decimal(18,2)");

            b.Entity<Donation>()
                .Property(d => d.Message)
                .HasMaxLength(500);


        }
    }
}