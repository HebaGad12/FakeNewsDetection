namespace Domain.Enums
{
    public enum RegistrationStatus
    {
        Approved,   // default for all non-independent journalists
        Pending,    // independent journalist awaiting admin review
        Rejected    // admin rejected the journalist's request
    }
}