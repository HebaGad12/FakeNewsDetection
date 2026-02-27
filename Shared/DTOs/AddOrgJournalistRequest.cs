using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.DTOs
{
    public record AddOrgJournalistRequest(
        string Name,
        string Email,
        string Password,
        string LicenceNumber
    );
}
