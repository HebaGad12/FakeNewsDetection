using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record OrgWalletResponse(
        Guid WalletId,
        Guid OrganizationId,
        string OrganizationName,
        decimal Balance,
        DateTime UpdatedAt
    );
}
