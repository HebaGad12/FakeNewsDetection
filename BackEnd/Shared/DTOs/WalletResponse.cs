using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record WalletResponse(
        Guid WalletId,
        Guid UserId,
        string UserName,
        decimal Balance,
        DateTime UpdatedAt
    );
}