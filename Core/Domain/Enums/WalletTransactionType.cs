namespace Domain.Enums
{
    public enum WalletTransactionType
    {
        AdminTopUp,       // Admin adds balance
        AdminDeduction,   // Admin deducts balance
        DonationSent,     // User/Journalist sent a donation
        DonationReceived  // User/Journalist received a donation
    }
}