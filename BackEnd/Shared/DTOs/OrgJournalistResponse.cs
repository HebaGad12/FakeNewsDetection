using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record OrgJournalistResponse(
        Guid Id,
        string Name,
        string Email,
        string LicenceNumber,
        bool IsActive,
        string RegistrationStatus,
        DateTime CreatedAt
    );
}
