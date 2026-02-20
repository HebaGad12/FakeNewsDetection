using Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Emit;
using System.Text;
using System.Threading.Tasks;

namespace Persistence
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Organization> Organizations => Set<Organization>();
        public DbSet<Post> Posts => Set<Post>();
        public DbSet<Interaction> Interactions => Set<Interaction>();
        public DbSet<Follow> Follows => Set<Follow>();
        public DbSet<ModerationAction> ModerationActions => Set<ModerationAction>();
        public DbSet<LiveSession> LiveSessions { get; set; }
        public DbSet<Wallet> Wallets => Set<Wallet>();
        public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
        public DbSet<Donation> Donations => Set<Donation>();

        protected override void OnModelCreating(ModelBuilder b)
        {
            base.OnModelCreating(b);


            b.Entity<User>().HasIndex(u => u.Email).IsUnique();
            b.Entity<User>().Property(u => u.Name).HasMaxLength(200);
            b.Entity<User>().Property(u => u.Email).HasMaxLength(200);


            b.Entity<Organization>().Property(o => o.Name).HasMaxLength(200);
            b.Entity<Organization>().Property(o => o.Email).HasMaxLength(200);


            b.Entity<Post>().HasIndex(p => p.CreatedAt);
            b.Entity<Post>().Property(p => p.Title).HasMaxLength(300);
            b.Entity<Post>().Property(p => p.Tags)
      .HasConversion(
          v => string.Join(",", v),
          v => v.Split(',', StringSplitOptions.RemoveEmptyEntries)
      );


            b.Entity<Interaction>().HasOne<Post>().WithMany(p => p.Interactions).HasForeignKey(i => i.PostId).OnDelete(DeleteBehavior.Restrict);

            b.Entity<Post>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(p => p.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);


            b.Entity<Post>()
           .HasOne<Organization>()
           .WithMany()
           .HasForeignKey(p => p.OrganizationId)
           .OnDelete(DeleteBehavior.SetNull);

            b.Entity<Interaction>()
           .HasOne(i => i.Post)
           .WithMany(p => p.Interactions)
           .HasForeignKey(i => i.PostId)
           .OnDelete(DeleteBehavior.Restrict);


            b.Entity<User>()
           .HasOne(u => u.Organization)
           .WithMany(o => o.Users)
           .HasForeignKey(u => u.OrganizationId)
           .OnDelete(DeleteBehavior.SetNull);


            b.Entity<Post>()
                .HasOne<Organization>()
                .WithMany()
                .HasForeignKey(p => p.OrganizationId)
                .OnDelete(DeleteBehavior.SetNull);

            b.Entity<Interaction>().HasIndex(i => new { i.PostId, i.UserId, i.Type });
            b.Entity<Interaction>().Property(i => i.Content).HasMaxLength(2000);

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

            b.Entity<ModerationAction>().HasIndex(m => new { m.PostId, m.CreatedAt });
            b.Entity<Post>().HasOne(p => p.Author).WithMany(u => u.Posts).HasForeignKey(p => p.AuthorId);
            b.Entity<Post>().HasOne(p => p.Organization).WithMany(o => o.Posts).HasForeignKey(p => p.OrganizationId);

            // Wallet
            b.Entity<Wallet>().HasOne(w => w.User).WithMany().HasForeignKey(w => w.UserId).OnDelete(DeleteBehavior.Cascade);
            b.Entity<Wallet>().HasIndex(w => w.UserId).IsUnique();
            b.Entity<Wallet>().Property(w => w.Balance).HasColumnType("decimal(18,2)");

            // WalletTransaction
            b.Entity<WalletTransaction>().HasOne(t => t.Wallet).WithMany(w => w.Transactions).HasForeignKey(t => t.WalletId).OnDelete(DeleteBehavior.NoAction);
            b.Entity<WalletTransaction>().HasOne(t => t.Actor).WithMany().HasForeignKey(t => t.ActorId).OnDelete(DeleteBehavior.SetNull);
            b.Entity<WalletTransaction>().Property(t => t.Amount).HasColumnType("decimal(18,2)");
            b.Entity<WalletTransaction>().Property(t => t.Description).HasMaxLength(500);

            // Donation
            b.Entity<Donation>().HasOne(d => d.Sender).WithMany().HasForeignKey(d => d.SenderId).OnDelete(DeleteBehavior.Restrict);
            b.Entity<Donation>().HasOne(d => d.Recipient).WithMany().HasForeignKey(d => d.RecipientId).OnDelete(DeleteBehavior.Restrict);
            b.Entity<Donation>().Property(d => d.Amount).HasColumnType("decimal(18,2)");
            b.Entity<Donation>().Property(d => d.Message).HasMaxLength(500);
            b.Entity<Donation>().HasIndex(d => d.SenderId);
            b.Entity<Donation>().HasIndex(d => d.RecipientId);
        }

    }
}