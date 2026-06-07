using Domain.Contracts;
using Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Persistence.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _context;
        public UserRepository(AppDbContext context) => _context = context;

        public async Task<User?> GetByIdAsync(Guid id) =>
            await _context.Users
                .Include(u => u.Organization)
                .Include(u => u.Posts)
                .Include(u => u.Followers)
                .FirstOrDefaultAsync(u => u.Id == id);

        public async Task<IEnumerable<User>> GetAllAsync() =>
            await _context.Users.ToListAsync();

        public async Task AddAsync(User user)
        {
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Removes all data owned by or referencing a single user, then removes the user.
        /// Covers every FK that points at Users to avoid constraint violations.
        /// SaveChangesAsync is NOT called here — the caller does one final commit.
        /// </summary>
        private async Task DeleteUserDataAsync(Guid userId)
        {
            var user = await _context.Users
                .Include(u => u.Posts)
                    .ThenInclude(p => p.Interactions)
                .Include(u => u.Posts)
                    .ThenInclude(p => p.ModerationActions)
                .Include(u => u.Posts)
                    .ThenInclude(p => p.Media)
                .Include(u => u.Followees)
                .Include(u => u.Followers)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) return;

            // 1. Posts authored by this user (delete children first)
            foreach (var post in user.Posts.ToList())
            {
                if (post.Interactions.Any())
                    _context.Interactions.RemoveRange(post.Interactions);

                if (post.ModerationActions.Any())
                    _context.ModerationActions.RemoveRange(post.ModerationActions);

                if (post.Media.Any())
                    _context.PostMediaItems.RemoveRange(post.Media);

                _context.Posts.Remove(post);
            }

            // 2. Follow rows (both directions)
            if (user.Followees.Any())
                _context.Follows.RemoveRange(user.Followees);

            if (user.Followers.Any())
                _context.Follows.RemoveRange(user.Followers);

            // 3. Interactions this user made on other people's posts
            var otherInteractions = await _context.Interactions
                .Where(i => i.UserId == userId)
                .ToListAsync();
            if (otherInteractions.Any())
                _context.Interactions.RemoveRange(otherInteractions);

            // 4. ModerationActions performed by this user (as actor) on other posts
            var modActions = await _context.ModerationActions
                .Where(m => m.ActorId == userId)
                .ToListAsync();
            if (modActions.Any())
                _context.ModerationActions.RemoveRange(modActions);

            // 5. Null out SenderId / RecipientId on donations — preserve financial history
            var donationsAsSender = await _context.Donations
                .Where(d => d.SenderId == userId)
                .ToListAsync();
            foreach (var d in donationsAsSender)
                d.SenderId = null;

            var donationsAsRecipient = await _context.Donations
                .Where(d => d.RecipientId == userId)
                .ToListAsync();
            foreach (var d in donationsAsRecipient)
                d.RecipientId = null;

            // 6. Wallet + its transactions (WalletTransactions.ActorId is nullable — null it out first)
            var wallet = await _context.Wallets
                .Include(w => w.Transactions)
                .FirstOrDefaultAsync(w => w.UserId == userId);

            if (wallet != null)
            {
                // Null out ActorId on any transaction that references this user as actor
                var actorTxns = await _context.WalletTransactions
                    .Where(t => t.ActorId == userId)
                    .ToListAsync();
                foreach (var txn in actorTxns)
                    txn.ActorId = null;

                if (wallet.Transactions.Any())
                    _context.WalletTransactions.RemoveRange(wallet.Transactions);

                _context.Wallets.Remove(wallet);
            }

            // 7. Live sessions owned by this user
            var liveSessions = await _context.LiveSessions
                .Where(s => s.JournalistId == userId)
                .ToListAsync();
            if (liveSessions.Any())
                _context.LiveSessions.RemoveRange(liveSessions);

            // 8. Notifications — two cases:
            //    a) This user is the RECEIVER  → delete the notification entirely
            //    b) This user is the ACTOR     → null out ActorId (preserve the notification for the receiver)
            var receivedNotifications = await _context.Notifications
                .Where(n => n.UserId == userId)
                .ToListAsync();
            if (receivedNotifications.Any())
                _context.Notifications.RemoveRange(receivedNotifications);

            var actorNotifications = await _context.Notifications
                .Where(n => n.ActorId == userId)
                .ToListAsync();
            foreach (var n in actorNotifications)
                n.ActorId = null;

            // 9. Finally remove the user
            _context.Users.Remove(user);
        }

        public async Task DeleteAsync(Guid id)
        {
            // If this is an organisation, delete all its journalists first
            var orgMemberIds = await _context.Users
                .Where(u => u.OrganizationId == id)
                .Select(u => u.Id)
                .ToListAsync();

            foreach (var memberId in orgMemberIds)
                await DeleteUserDataAsync(memberId);

            // Delete the user (or organisation) themselves
            await DeleteUserDataAsync(id);

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<User>> GetOrgMembersAsync(Guid organizationUserId) =>
            await _context.Users
                .Where(u => u.OrganizationId == organizationUserId)
                .ToListAsync();
    }
}