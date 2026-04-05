using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record DonationResponse(
        Guid Id,
        Guid? SenderId,
        string SenderName,
        Guid? RecipientId,
        string RecipientName,
        decimal Amount,
        string? Message,
        DateTime CreatedAt
    );
}