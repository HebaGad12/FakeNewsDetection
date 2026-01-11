using Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
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

        protected override void OnModelCreating(ModelBuilder b)
        {
            
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
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries));

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

       
            b.Entity<Interaction>().HasIndex(i => new { i.PostId, i.UserId, i.Type });
            b.Entity<Interaction>().Property(i => i.Content).HasMaxLength(2000);

     
            b.Entity<Follow>().HasKey(f => new { f.FollowerId, f.FolloweeId });
            b.Entity<Follow>().HasIndex(f => f.CreatedAt);

       
            b.Entity<ModerationAction>().HasIndex(m => new { m.PostId, m.CreatedAt });
        }
    }
}
