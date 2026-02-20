using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record SendDonationRequest(
        Guid RecipientId,
        decimal Amount,
        string? Message
    );
}