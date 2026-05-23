// ─────────────────────────────────────────────────────────────────────────────
// FILE: Shared/DTOs/OrgEditProfileRequest.cs   (NEW FILE)
// ─────────────────────────────────────────────────────────────────────────────
namespace Shared.DTOs
{
    /// <summary>
    /// All fields are optional — only non-null values are applied.
    /// </summary>
    public class OrgEditProfileRequest
    {
        /// <summary>New display name for the organization.</summary>
        public string? Name { get; set; }

        /// <summary>New login email.</summary>
        public string? Email { get; set; }

        /// <summary>
        /// Bio / about text shown on the public profile.
        /// Pass an empty string to clear it.
        /// </summary>
        public string? Profile { get; set; }
    }
}