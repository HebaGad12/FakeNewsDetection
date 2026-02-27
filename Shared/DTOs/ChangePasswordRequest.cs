namespace Shared.DTOs
{
    public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
}
